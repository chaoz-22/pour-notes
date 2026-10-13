#!/usr/bin/env python3
"""Run a small, local PaddleOCR check against coffee label images."""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

from paddleocr import PaddleOCR


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: paddleocr-smoke-test.py IMAGE [IMAGE ...]", file=sys.stderr)
        return 2

    images = [Path(value).expanduser().resolve() for value in sys.argv[1:]]
    missing = [str(path) for path in images if not path.is_file()]
    if missing:
        print(f"missing image(s): {', '.join(missing)}", file=sys.stderr)
        return 2

    started = time.perf_counter()
    ocr = PaddleOCR(
        text_detection_model_name="PP-OCRv5_mobile_det",
        text_recognition_model_name="PP-OCRv5_mobile_rec",
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
    )
    model_seconds = time.perf_counter() - started

    output = []
    for image in images:
        image_started = time.perf_counter()
        results = list(ocr.predict(str(image)))
        lines = []
        for result in results:
            texts = result.get("rec_texts", [])
            scores = result.get("rec_scores", [])
            lines.extend(
                {
                    "text": str(text),
                    "score": round(float(score), 4),
                }
                for text, score in zip(texts, scores)
            )
        output.append(
            {
                "image": str(image),
                "seconds": round(time.perf_counter() - image_started, 3),
                "lines": lines,
            }
        )

    print(
        json.dumps(
            {
                "modelInitSeconds": round(model_seconds, 3),
                "results": output,
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
