"""
FastAPI Routes

Exposes the food nutrition analysis pipeline as an HTTP API.

Endpoints
---------
GET  /                          Health check
POST /api/analyze               Analyze a meal image (multipart form)
POST /api/cv-only               Run CV analysis only (no Gemini)
GET  /api/generate-aruco/{id}   Generate & return an ArUco marker PNG
"""

import io
import os
import tempfile

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from loguru import logger

from ..pipeline import FoodNutritionPipeline
from ..cv_layer.aruco_detector import ArUcoDetector
from ..cv_layer.cv_pipeline import CVPipeline

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="SeeFood – Food Nutrition Analysis API",
    description=(
        "AI-powered nutritional analysis using YOLOv8 computer vision "
        "and Google Gemini. Upload a meal photo to receive calorie and "
        "macro-nutrient estimates."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lazy-initialise the pipeline (avoids long startup times during import)
_pipeline: "Optional[FoodNutritionPipeline]" = None
_cv_only_pipeline: "Optional[CVPipeline]" = None


def _get_pipeline() -> FoodNutritionPipeline:
    global _pipeline
    if _pipeline is None:
        _pipeline = FoodNutritionPipeline()
    return _pipeline


def _get_cv_pipeline() -> CVPipeline:
    global _cv_only_pipeline
    if _cv_only_pipeline is None:
        _cv_only_pipeline = CVPipeline()
    return _cv_only_pipeline


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _save_upload_to_temp(upload: UploadFile) -> str:
    """Save an uploaded file to a temporary path and return that path."""
    suffix = os.path.splitext(upload.filename or "image.jpg")[1] or ".jpg"
    contents = await upload.read()
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(contents)
        return tmp.name


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/", summary="Health check")
def health():
    return {"status": "ok", "service": "SeeFood Food Nutrition Analysis API"}


@app.post("/api/analyze", summary="Analyze a meal image")
async def analyze(
    image: UploadFile = File(..., description="Meal photo (JPEG, PNG, or WebP)"),
    include_annotated: str = Form("false", description="Reserved – not yet used"),
):
    """
    Accept a meal photo and return AI-generated nutritional information.

    Supported image formats: JPEG, PNG, WebP, GIF.

    The response shape is:
    ```json
    {
        "nutrition": {
            "food_items": [...],
            "totals": { "calories": N, "protein_g": N, "carbohydrates_g": N, "fat_g": N },
            "analysis_notes": "..."
        },
        "cv_analysis": {
            "has_scale_reference": false,
            "pixels_per_cm": null,
            "food_items": [...]
        }
    }
    ```
    """
    tmp_path = None
    try:
        # Validate MIME type
        allowed_types = {"image/jpeg", "image/png", "image/webp", "image/gif"}
        content_type = (image.content_type or "").lower()
        if content_type not in allowed_types:
            raise HTTPException(
                status_code=415,
                detail=f"Unsupported file type '{content_type}'. Allowed: JPEG, PNG, WebP, GIF.",
            )

        tmp_path = await _save_upload_to_temp(image)
        pipeline = _get_pipeline()
        result = pipeline.analyze(image_path=tmp_path)

        if not result.success:
            raise HTTPException(status_code=500, detail=result.error or "Analysis failed.")

        return {
            "nutrition": result.nutrition_data,
            "cv_analysis": result.cv_data,
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Unhandled error in /api/analyze")
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except OSError:
                pass


@app.post("/api/cv-only", summary="Run CV analysis only (no Gemini)")
async def cv_only(
    image: UploadFile = File(..., description="Meal photo"),
):
    """
    Run ArUco marker detection and YOLOv8 food detection without calling Gemini.

    Useful for testing the computer-vision stack in isolation.
    """
    tmp_path = None
    try:
        tmp_path = await _save_upload_to_temp(image)
        cv_data = _get_cv_pipeline().analyze(tmp_path)
        return {"cv_analysis": cv_data}

    except Exception as exc:
        logger.exception("Unhandled error in /api/cv-only")
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except OSError:
                pass


@app.get("/api/generate-aruco/{marker_id}", summary="Generate an ArUco marker PNG")
def generate_aruco(marker_id: int):
    """
    Generate an ArUco marker image for printing.

    * marker_id: integer 0–49
    * Returns a PNG image

    Print the marker at exactly **5 cm × 5 cm** and place it next to your
    food when taking photos for accurate size measurements.
    """
    if not (0 <= marker_id <= 49):
        raise HTTPException(status_code=400, detail="marker_id must be between 0 and 49.")

    import cv2

    marker_img = ArUcoDetector.generate_marker(marker_id, size_pixels=400)

    # Add a white border for easier printing
    bordered = cv2.copyMakeBorder(marker_img, 20, 20, 20, 20, cv2.BORDER_CONSTANT, value=255)

    ok, buffer = cv2.imencode(".png", bordered)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to encode marker image.")

    return Response(content=bytes(buffer), media_type="image/png")
