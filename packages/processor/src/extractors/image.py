import io
import os
import numpy as np
import cv2
from PIL import Image
from google.cloud import vision


async def extract_image(content: bytes, filename: str) -> str:
    """
    Image/handwriting pipeline:
    1. OpenCV: deskew, denoise, enhance contrast
    2. Google Vision API: Hebrew + English OCR
    """
    # Step 1: OpenCV preprocessing
    enhanced = _preprocess_image(content)

    # Step 2: Google Vision OCR
    text = await _google_vision_ocr(enhanced)
    return text


def _preprocess_image(content: bytes) -> bytes:
    """Deskew, denoise, enhance contrast using OpenCV."""
    nparr = np.frombuffer(content, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        return content

    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Denoise
    denoised = cv2.fastNlMeansDenoising(gray, h=10)

    # Enhance contrast with CLAHE
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(denoised)

    # Sharpen
    kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
    sharpened = cv2.filter2D(enhanced, -1, kernel)

    # Deskew
    coords = np.column_stack(np.where(sharpened > 0))
    if len(coords) > 0:
        angle = cv2.minAreaRect(coords)[-1]
        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle
        if abs(angle) < 10:  # Only correct small skews
            h, w = sharpened.shape
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, angle, 1.0)
            sharpened = cv2.warpAffine(sharpened, M, (w, h), flags=cv2.INTER_CUBIC,
                                       borderMode=cv2.BORDER_REPLICATE)

    # Encode back to bytes
    _, buffer = cv2.imencode(".png", sharpened)
    return buffer.tobytes()


async def _google_vision_ocr(image_bytes: bytes) -> str:
    """Send image to Google Vision for Hebrew+English OCR."""
    client = vision.ImageAnnotatorClient()
    image = vision.Image(content=image_bytes)

    # Use DOCUMENT_TEXT_DETECTION for handwriting/mixed content
    response = client.document_text_detection(image=image)

    if response.error.message:
        raise RuntimeError(f"Google Vision error: {response.error.message}")

    return response.full_text_annotation.text if response.full_text_annotation else ""
