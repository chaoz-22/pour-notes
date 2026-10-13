FROM python:3.10-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PADDLE_PDX_MODEL_SOURCE=bos \
    PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK=True \
    FLAGS_use_mkldnn=0 \
    OCR_CPU_THREADS=2 \
    OCR_DETECTION_MODEL=PP-OCRv5_mobile_det \
    OCR_RECOGNITION_MODEL=PP-OCRv5_mobile_rec

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 libglib2.0-0 libgl1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY app.py ./

# Download the speed-oriented mixed-language mobile models during build.
# Runtime startup then loads only local weights before accepting OCR requests.
RUN python -c "from app import get_ocr; get_ocr()"

EXPOSE 8080

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
