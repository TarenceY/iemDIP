# Food Detection & Nutrition Estimation System

AI-powered system that detects food in images, estimates volume using ArUco markers, and provides accurate nutrition values via Google Gemini.

## Architecture

```
Image from User
    ↓
┌───▼────────────────────────────────────────┐
│  COMPUTER VISION LAYER (Local/Fast)        │
│  • OpenCV ArUco Detection → Size reference │
│  • YOLOv8 Food Detection → Food location   │
│  Outputs: "Apple detected, 8.2cm diameter" │
└───┬────────────────────────────────────────┘
    ↓
┌───▼────────────────────────────────────────┐
│  LANGUAGE/REASONING LAYER (Cloud/Smart)    │
│  • Google Gemini API                       │
│  • Input: Image + CV metadata              │
│  • Output: Nutrition data                  │
└───┬────────────────────────────────────────┘
    ↓
Nutrition Result
```

## Project Structure

```
ai_model/
├── main.py                 # Entry point (CLI & server)
├── requirements.txt        # Python dependencies
├── .env.example           # Environment variables template
├── config/
│   └── config.yaml        # Configuration settings
├── src/
│   ├── __init__.py
│   ├── pipeline.py        # Main orchestration pipeline
│   ├── cv_layer/          # Computer Vision modules
│   │   ├── __init__.py
│   │   ├── aruco_detector.py   # ArUco marker detection
│   │   ├── food_detector.py    # YOLOv8 food detection
│   │   └── cv_pipeline.py      # CV pipeline orchestration
│   ├── gemini_layer/      # Gemini AI module
│   │   ├── __init__.py
│   │   └── gemini_client.py    # Gemini API integration
│   └── api/               # REST API
│       ├── __init__.py
│       └── routes.py      # FastAPI endpoints
└── models/                # Model weights (download separately)
```

## Setup

### 1. Install Dependencies

```bash
cd ai_model
pip install -r requirements.txt
```

### 2. Configure API Key

Create a `.env` file:

```bash
cp .env.example .env
# Edit .env and add your Gemini API key
```

Get your Gemini API key from: https://makersuite.google.com/app/apikey

### 3. Generate ArUco Marker (for accurate measurements)

Print the marker at exactly **5cm × 5cm** and place it next to your food when taking photos.

## Usage

### Command Line

```bash
# Analyze a food image
python main.py analyze path/to/food_image.jpg

# Analyze with custom output directory
python main.py analyze food.jpg --output ./results
```

### API Server

```bash
# Start the server
python main.py server --port 8000

# Or with auto-reload for development
python main.py server --reload
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/api/analyze` | POST | Analyze food image |
| `/api/cv-only` | POST | CV analysis only (no Gemini) |
| `/api/generate-aruco/{id}` | GET | Generate ArUco marker |

### API Example

```python
import requests

# Analyze a food image
with open("food.jpg", "rb") as f:
    response = requests.post(
        "http://localhost:8000/api/analyze",
        files={"image": f},
        data={"include_annotated": True}
    )

result = response.json()
print(result["nutrition"])
```

### Python SDK

```python
from src.pipeline import FoodNutritionPipeline

# Initialize pipeline
pipeline = FoodNutritionPipeline(
    gemini_api_key="your-api-key"  # Or set GEMINI_API_KEY env var
)

# Analyze an image
result = pipeline.analyze("path/to/food.jpg")

if result.success:
    print(f"Total Calories: {result.nutrition_data['totals']['calories']}")
    for item in result.nutrition_data['food_items']:
        print(f"  - {item['food_name']}: {item['calories']} cal")
```

## How It Works

### 1. ArUco Marker Detection
- Detects ArUco markers in the image
- Calculates pixels-per-centimeter ratio
- Enables accurate real-world measurements

### 2. YOLOv8 Food Detection
- Identifies food items in the image
- Provides bounding boxes and confidence scores
- Calculates dimensions using ArUco scale factor

### 3. Gemini Analysis
- Receives image + CV metadata
- Identifies specific food items
- Estimates portion sizes based on measurements
- Returns detailed nutrition breakdown

## Output Example

```json
{
  "nutrition": {
    "food_items": [
      {
        "food_name": "Apple (Red Delicious)",
        "serving_size": "1 medium apple (182g)",
        "calories": 95,
        "protein_g": 0.5,
        "carbohydrates_g": 25,
        "fat_g": 0.3,
        "fiber_g": 4.4,
        "sugar_g": 19,
        "confidence": "high"
      }
    ],
    "totals": {
      "calories": 95,
      "protein_g": 0.5,
      "carbohydrates_g": 25,
      "fat_g": 0.3
    }
  },
  "cv_analysis": {
    "has_scale_reference": true,
    "pixels_per_cm": 45.2,
    "food_items": [
      {
        "name": "apple",
        "diameter_cm": 8.2,
        "confidence": 0.94
      }
    ]
  }
}
```

## Configuration

Edit `config/config.yaml` to customize:

- ArUco marker settings
- YOLO model parameters
- Gemini model selection
- API server settings

## Tips for Best Results

1. **Use ArUco Marker**: Place a 5cm ArUco marker next to your food for accurate measurements
2. **Good Lighting**: Ensure even lighting without harsh shadows
3. **Top-Down Photo**: Take photos from directly above the food
4. **Clear Background**: Use a plain, contrasting background
5. **Single Meal**: Photograph one meal/plate at a time

## License

MIT License
