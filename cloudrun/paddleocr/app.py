import ipaddress
import logging
import os
import socket
import tempfile
import threading
import time
from contextlib import asynccontextmanager
from io import BytesIO
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from PIL import Image, ImageOps, UnidentifiedImageError


MAX_DOWNLOAD_BYTES = int(os.getenv("OCR_MAX_IMAGE_BYTES", str(8 * 1024 * 1024)))
MAX_IMAGE_PIXELS = int(os.getenv("OCR_MAX_IMAGE_PIXELS", str(24_000_000)))
MAX_IMAGE_SIDE = int(os.getenv("OCR_MAX_IMAGE_SIDE", "2560"))
MIN_SCORE = float(os.getenv("OCR_MIN_SCORE", "0.35"))
CPU_THREADS = int(os.getenv("OCR_CPU_THREADS", "4"))
DETECTION_MODEL = os.getenv("OCR_DETECTION_MODEL", "PP-OCRv5_mobile_det")
RECOGNITION_MODEL = os.getenv("OCR_RECOGNITION_MODEL", "PP-OCRv5_mobile_rec")
ALLOWED_HOST_SUFFIXES = tuple(
    item.strip().lower()
    for item in os.getenv(
        "OCR_ALLOWED_IMAGE_HOST_SUFFIXES",
        ".tcb.qcloud.la,.tcb.qcloud.com,.cloudstatic.cn,.myqcloud.com",
    ).split(",")
    if item.strip()
)

Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("pour-notes-ocr")

_ocr = None
_model_lock = threading.Lock()
_inference_lock = threading.Lock()


@asynccontextmanager
async def lifespan(_: FastAPI):
    started = time.perf_counter()
    await run_in_threadpool(get_ocr)
    logger.info(
        "PaddleOCR models ready in %.2fs (det=%s, rec=%s)",
        time.perf_counter() - started,
        DETECTION_MODEL,
        RECOGNITION_MODEL,
    )
    yield


app = FastAPI(title="Pour Notes PaddleOCR", version="1.2.0", lifespan=lifespan)


class OcrRequest(BaseModel):
    image_url: str = Field(alias="imageUrl", min_length=12, max_length=4096)


def _host_is_allowed(hostname: str) -> bool:
    host = hostname.rstrip(".").lower()
    if not host or not any(host == suffix.lstrip(".") or host.endswith(suffix) for suffix in ALLOWED_HOST_SUFFIXES):
        return False
    try:
        addresses = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
    except socket.gaierror:
        return False
    for address in addresses:
        ip = ipaddress.ip_address(address[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
            return False
    return True


def _validate_image_url(image_url: str) -> str:
    parsed = urlparse(image_url)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise HTTPException(status_code=400, detail="图片地址无效")
    if not _host_is_allowed(parsed.hostname):
        raise HTTPException(status_code=400, detail="图片地址不属于允许的云存储域名")
    return image_url


async def _download_image(image_url: str) -> bytes:
    timeout = httpx.Timeout(30.0, connect=10.0)
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
        try:
            async with client.stream("GET", image_url) as response:
                if response.status_code != 200:
                    raise HTTPException(status_code=400, detail="无法读取云存储中的照片")
                content_type = response.headers.get("content-type", "").split(";", 1)[0].lower()
                if content_type and content_type not in {
                    "image/jpeg",
                    "image/png",
                    "image/webp",
                    "application/octet-stream",
                }:
                    raise HTTPException(status_code=400, detail="不支持该图片格式")
                declared_size = int(response.headers.get("content-length") or 0)
                if declared_size > MAX_DOWNLOAD_BYTES:
                    raise HTTPException(status_code=413, detail="照片超过 8MB，请使用压缩照片")
                chunks = []
                total = 0
                async for chunk in response.aiter_bytes():
                    total += len(chunk)
                    if total > MAX_DOWNLOAD_BYTES:
                        raise HTTPException(status_code=413, detail="照片超过 8MB，请使用压缩照片")
                    chunks.append(chunk)
                return b"".join(chunks)
        except HTTPException:
            raise
        except httpx.HTTPError as error:
            raise HTTPException(status_code=400, detail="下载照片失败") from error


def _prepare_image(image_bytes: bytes, output_path: Path) -> None:
    try:
        with Image.open(BytesIO(image_bytes)) as source:
            source.verify()
        with Image.open(BytesIO(image_bytes)) as source:
            image = ImageOps.exif_transpose(source).convert("RGB")
            if image.width * image.height > MAX_IMAGE_PIXELS:
                raise HTTPException(status_code=413, detail="照片分辨率过高，请使用压缩照片")
            image.thumbnail((MAX_IMAGE_SIDE, MAX_IMAGE_SIDE), Image.Resampling.LANCZOS)
            image.save(output_path, format="JPEG", quality=92, optimize=True)
    except HTTPException:
        raise
    except (Image.DecompressionBombError, UnidentifiedImageError, OSError) as error:
        raise HTTPException(status_code=400, detail="照片文件已损坏或格式不受支持") from error


def get_ocr():
    global _ocr
    if _ocr is not None:
        return _ocr
    with _model_lock:
        if _ocr is None:
            from paddleocr import PaddleOCR

            _ocr = PaddleOCR(
                text_detection_model_name=DETECTION_MODEL,
                # The general mobile recognizer keeps mixed-language support
                # while reducing CPU latency and memory use. Set the
                # OCR_RECOGNITION_MODEL environment variable to
                # PP-OCRv5_server_rec when maximum accuracy is preferred.
                text_recognition_model_name=RECOGNITION_MODEL,
                use_doc_orientation_classify=False,
                use_doc_unwarping=False,
                use_textline_orientation=False,
                device="cpu",
                # PaddlePaddle 3.3.x can fail inside the oneDNN/MKLDNN PIR
                # executor on Linux CPU containers. The standard Paddle CPU
                # kernels are slower but considerably more portable.
                enable_mkldnn=False,
                cpu_threads=CPU_THREADS,
            )
    return _ocr


def _as_list(value: Any) -> list:
    if value is None:
        return []
    if hasattr(value, "tolist"):
        return value.tolist()
    if isinstance(value, (list, tuple)):
        return list(value)
    return []


def _recognize(image_path: Path) -> tuple[list[str], list[float]]:
    with _inference_lock:
        results = get_ocr().predict(str(image_path))
    lines: list[str] = []
    scores: list[float] = []
    for result in results:
        texts = _as_list(result.get("rec_texts"))
        confidences = _as_list(result.get("rec_scores"))
        for index, text in enumerate(texts):
            normalized = str(text or "").strip()
            score = float(confidences[index]) if index < len(confidences) else 1.0
            if normalized and score >= MIN_SCORE:
                lines.append(normalized)
                scores.append(round(score, 4))
    return lines, scores


@app.get("/")
@app.get("/health")
def health() -> dict:
    return {
        "ok": True,
        "service": "pour-notes-paddleocr",
        "version": app.version,
        "modelLoaded": _ocr is not None,
        "mkldnn": False,
        "cpuThreads": CPU_THREADS,
        "detectionModel": DETECTION_MODEL,
        "recognitionModel": RECOGNITION_MODEL,
    }


@app.post("/v1/ocr")
async def recognize(request: OcrRequest) -> dict:
    image_url = _validate_image_url(request.image_url)
    image_bytes = await _download_image(image_url)
    with tempfile.TemporaryDirectory(prefix="pour-notes-ocr-") as temp_dir:
        image_path = Path(temp_dir) / "input.jpg"
        await run_in_threadpool(_prepare_image, image_bytes, image_path)
        try:
            lines, scores = await run_in_threadpool(_recognize, image_path)
        except HTTPException:
            raise
        except Exception as error:
            logger.exception(
                "PaddleOCR inference failed (bytes=%d, prepared_bytes=%d)",
                len(image_bytes),
                image_path.stat().st_size if image_path.exists() else 0,
            )
            raise HTTPException(status_code=500, detail="PaddleOCR 识别失败") from error
    if not lines:
        raise HTTPException(status_code=422, detail="没有识别到清晰文字，请靠近标签重新拍摄")
    return {"ok": True, "lines": lines, "scores": scores}
