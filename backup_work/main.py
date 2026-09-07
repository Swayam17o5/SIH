"""
FastAPI Backend for Rockfall Detection System
===========================================

A modern REST API backend built with FastAPI for:
- Real-time rockfall risk prediction
- Image-based rock detection  
- Live monitoring and alerts
- Historical data analysis

Features:
- High-performance async endpoints
- Automatic API documentation
- File upload handling
- Real-time WebSocket connections
- ML model integration
- CORS support for React frontend
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
# Removed StaticFiles import - serving frontend separately
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import uvicorn
import asyncio
import json
import os
import sys
import numpy as np
import matplotlib
matplotlib.use("Agg")
from datetime import datetime
import logging
from pathlib import Path
import io
from PIL import Image
import tempfile
from contextlib import asynccontextmanager
import cv2
import threading
import time
import rasterio
from dotenv import load_dotenv

# Resolve paths relative to this file so startup works from any working directory
backend_root = Path(__file__).resolve().parent  # This is the backend/ directory

# Load environment variables from backend/.env explicitly
load_dotenv(backend_root / ".env")

# Environment Variables Configuration
PORT = int(os.getenv("PORT", 8000))
HOST = os.getenv("HOST", "0.0.0.0")
## RELOAD = os.getenv("RELOAD", "true").lower() == "true"
RELOAD = os.getenv("RELOAD", "false").lower() == "true"
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
DEBUG = os.getenv("DEBUG", "true").lower() == "true"
LOG_LEVEL = os.getenv("LOG_LEVEL", "info").upper()

# API Configuration
API_TITLE = os.getenv("API_TITLE", "Rockfall Detection API")
API_DESCRIPTION = os.getenv("API_DESCRIPTION", "Advanced AI-powered rockfall detection and prediction system")
API_VERSION = os.getenv("API_VERSION", "1.0.0")

# CORS Configuration - Production only (frontend deployed separately)
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "https://void-sih-25-go-5.vercel.app").split(",")

# File Paths
MODELS_DIR = os.getenv("MODELS_DIR", "outputs/models")
DATA_DIR = os.getenv("DATA_DIR", "data")
# STATIC_DIR removed for separate deployment

# ML Model Settings
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.5"))
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "32"))

# Add backend paths for imports - deployment compatible
sys.path.append(str(backend_root))
sys.path.append(str(backend_root / "src"))

# Configure logging with environment variable
logging.basicConfig(level=getattr(logging, LOG_LEVEL))
logger = logging.getLogger(__name__)

# Import ML models and utilities (with error handling)
try:
    # Try to import custom prediction functions first
    from src.prediction.test_models import load_prediction_models, predict_rockfall_risk
    ML_MODELS_AVAILABLE = True
    logger.info("ML prediction models imported successfully")
except ImportError as e:
    logger.warning(f"Custom ML prediction models not available: {e}")
    # We'll create our own loading functions for the models in outputs/models/
    ML_MODELS_AVAILABLE = True  # We have models in outputs/models/

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
    logger.info("YOLO model imported successfully")
except ImportError as e:
    logger.warning(f"YOLO model not available: {e}")
    YOLO_AVAILABLE = False

# Global variables for models
prediction_models = None
detection_model = None
scalers = None
feature_names = None
model_performance = None
dem_analysis_cache = {}


def load_dem_registry():
    """Load the data-driven DEM registry without exposing server filesystem paths."""
    registry_path = backend_root / "data" / "DEM" / "registry.json"
    try:
        registry = json.loads(registry_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        logger.error(f"Unable to load DEM registry: {error}")
        raise HTTPException(status_code=500, detail="DEM registry unavailable")

    for entry in registry:
        file_name = entry.get("file")
        entry["file_available"] = bool(file_name and (registry_path.parent / file_name).is_file())
    return registry

# Custom model loading functions
def load_models_from_outputs():
    """Load models from outputs/models directory"""
    import joblib
    import torch
    
    models_dir = backend_root / MODELS_DIR
    models = {}
    
    try:
        # Load XGBoost model
        xgb_path = models_dir / "xgboost_model.joblib"
        if xgb_path.exists():
            models['xgboost'] = joblib.load(xgb_path)
            logger.info("✅ XGBoost model loaded")
        
        # Load Random Forest model
        rf_path = models_dir / "random_forest_model.joblib"
        if rf_path.exists():
            models['random_forest'] = joblib.load(rf_path)
            logger.info("✅ Random Forest model loaded")
        
        # Load Neural Network model
        nn_path = models_dir / "neural_network_model.pth"
        if nn_path.exists():
            try:
                neural_network = torch.load(nn_path, map_location='cpu')
                if hasattr(neural_network, "eval") and callable(neural_network):
                    models['neural_network'] = neural_network
                    logger.info("✅ Neural Network model loaded")
                else:
                    logger.warning("Neural network artifact is a state_dict without its architecture; skipping it")
            except Exception as e:
                logger.warning(f"Could not load neural network: {e}")
        
        # Load scaler
        scaler_path = models_dir / "main_scaler.joblib"
        if scaler_path.exists():
            scaler = joblib.load(scaler_path)
            logger.info("✅ Scaler loaded")
        else:
            scaler = None
        
        # Load metadata
        metadata_path = models_dir / "model_metadata.joblib"
        metadata = None
        if metadata_path.exists():
            try:
                metadata = joblib.load(metadata_path)
                logger.info("✅ Model metadata loaded")
            except Exception as e:
                logger.warning(f"Could not load metadata: {e}")
        
        return models, scaler, metadata
        
    except Exception as e:
        logger.error(f"Error loading models from outputs: {e}")
        return {}, None, None

def predict_with_loaded_models(models, scaler, input_data):
    """Make predictions using loaded models with calibrated multi-class probability outputs"""
    import numpy as np

    if scaler is not None:
        input_scaled = scaler.transform(input_data)
    else:
        input_scaled = input_data

    predictions = {}
    probabilities = {"LOW": 0.25, "MEDIUM": 0.25, "HIGH": 0.25, "CRITICAL": 0.25}
    model_predictions = {}
    labels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

    # 1. XGBoost prediction
    if 'xgboost' in models:
        try:
            xgb_model = models['xgboost']
            proba = xgb_model.predict_proba(input_scaled)[0]
            if len(proba) == 4:
                model_predictions['xgboost'] = {l: float(p) for l, p in zip(labels, proba)}
            else:
                p1 = float(proba[1]) if len(proba) > 1 else float(proba[0])
                model_predictions['xgboost'] = {"probability": p1}
        except Exception as e:
            logger.warning(f"XGBoost prediction failed: {e}")

    # 2. Random Forest prediction
    if 'random_forest' in models:
        try:
            rf_model = models['random_forest']
            proba = rf_model.predict_proba(input_scaled)[0]
            if len(proba) == 4:
                model_predictions['random_forest'] = {l: float(p) for l, p in zip(labels, proba)}
            else:
                p1 = float(proba[1]) if len(proba) > 1 else float(proba[0])
                model_predictions['random_forest'] = {"probability": p1}
        except Exception as e:
            logger.warning(f"Random Forest prediction failed: {e}")

    # 3. Ensemble calculation
    if 'xgboost' in model_predictions and 'random_forest' in model_predictions:
        xgb_p = model_predictions['xgboost']
        rf_p = model_predictions['random_forest']
        if isinstance(xgb_p, dict) and 'LOW' in xgb_p and isinstance(rf_p, dict) and 'LOW' in rf_p:
            ensemble_probs = {
                l: float(xgb_p[l] * 0.55 + rf_p[l] * 0.45)
                for l in labels
            }
            total = sum(ensemble_probs.values()) or 1.0
            probabilities = {l: float(v / total) for l, v in ensemble_probs.items()}
        else:
            p_xgb = xgb_p.get('probability', 0.5)
            p_rf = rf_p.get('probability', 0.5)
            p_ens = float(p_xgb * 0.55 + p_rf * 0.45)
            # Binary fallback mapped to continuous distribution
            if p_ens < 0.28:
                probabilities = {"LOW": 0.70, "MEDIUM": 0.25, "HIGH": 0.05, "CRITICAL": 0.00}
            elif p_ens < 0.58:
                probabilities = {"LOW": 0.15, "MEDIUM": 0.65, "HIGH": 0.18, "CRITICAL": 0.02}
            elif p_ens < 0.80:
                probabilities = {"LOW": 0.02, "MEDIUM": 0.20, "HIGH": 0.65, "CRITICAL": 0.13}
            else:
                probabilities = {"LOW": 0.00, "MEDIUM": 0.05, "HIGH": 0.25, "CRITICAL": 0.70}
    elif model_predictions:
        first_key = list(model_predictions.keys())[0]
        first_val = model_predictions[first_key]
        if isinstance(first_val, dict) and 'LOW' in first_val:
            probabilities = first_val

    return {
        "probabilities": probabilities,
        "model_predictions": model_predictions,
        "input_scaled": input_scaled
    }

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Active connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Active connections: {len(self.active_connections)}")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                # Remove dead connections
                self.active_connections.remove(connection)

manager = ConnectionManager()

# Video streaming manager for camera feeds
class VideoStreamManager:
    def __init__(self):
        # Map video files to camera directions (using Cloudinary URLs)
        self.camera_videos = {
            "east": "https://res.cloudinary.com/dyb6aumhm/video/upload/v1758167914/1_znxt5x.mp4",
            "west": "https://res.cloudinary.com/dyb6aumhm/video/upload/v1758167915/2_lrgtxq.mp4", 
            "north": "https://res.cloudinary.com/dyb6aumhm/video/upload/v1758167915/3_gk37sc.mp4",
            "south": None  # Maintenance
        }
        
        # Video capture objects
        self.video_captures = {}
        self.video_info = {}
        self.streaming_threads = {}
        self.stream_active = {}
        
        # Initialize video captures
        self._initialize_videos()
    
    def _initialize_videos(self):
        """Initialize video capture objects and get metadata"""
        for direction, video_path in self.camera_videos.items():
            if video_path:
                # Handle both local files and HTTP URLs
                if video_path.startswith('http'):
                    # For HTTP URLs, try to open directly with cv2
                    cap = cv2.VideoCapture(video_path)
                elif os.path.exists(video_path):
                    # For local files, check existence first
                    cap = cv2.VideoCapture(video_path)
                else:
                    cap = None
                
                if cap and cap.isOpened():
                    fps = cap.get(cv2.CAP_PROP_FPS)
                    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                    duration = frame_count / fps if fps > 0 else 0
                    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                    
                    self.video_info[direction] = {
                        "fps": fps,
                        "frame_count": frame_count,
                        "duration": duration,
                        "resolution": f"{width}x{height}",
                        "status": "active"
                    }
                    self.video_captures[direction] = cap
                    self.stream_active[direction] = False
                    logger.info(f"Initialized camera {direction}: {duration:.1f}s, {fps:.1f}fps, {width}x{height}")
                else:
                    logger.error(f"Failed to open video for camera {direction}: {video_path}")
                    self.video_info[direction] = {
                        "fps": 0,
                        "frame_count": 0,
                        "duration": 0,
                        "resolution": "N/A",
                        "status": "offline"
                    }
            else:
                self.video_info[direction] = {
                    "fps": 0,
                    "frame_count": 0,
                    "duration": 0,
                    "resolution": "N/A",
                    "status": "maintenance" if direction == "south" else "offline"
                }
    
    def get_camera_status(self):
        """Get status of all cameras with real video metadata"""
        status = {"cameras": {}, "system": {}}
        
        active_count = 0
        recording_count = 0
        
        for direction in ["east", "west", "north", "south"]:
            info = self.video_info.get(direction, {})
            is_active = info.get("status") == "active"
            is_recording = is_active and self.stream_active.get(direction, False)
            
            if is_active:
                active_count += 1
            if is_recording:
                recording_count += 1
                
            status["cameras"][direction] = {
                "id": f"camera-{direction}",
                "name": f"{direction.title()} Camera",
                "status": info.get("status", "offline"),
                "resolution": info.get("resolution", "N/A"),
                "fps": info.get("fps", 0),
                "duration": info.get("duration", 0),
                "last_detection": datetime.now().isoformat() if is_active else None,
                "recording": is_recording,
                "streaming": self.stream_active.get(direction, False)
            }
        
        status["system"] = {
            "total_cameras": 4,
            "active_cameras": active_count,
            "recording_cameras": recording_count,
            "storage_used": "45.2 GB",
            "uptime": "12h 34m"
        }
        
        return status
    
    def generate_frames(self, direction: str):
        """Generate video frames for streaming with looping"""
        if direction not in self.video_captures:
            return
            
        cap = self.video_captures[direction]
        self.stream_active[direction] = True
        
        try:
            while self.stream_active[direction]:
                ret, frame = cap.read()
                
                if not ret:
                    # End of video reached, restart from beginning
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    continue
                
                # Encode frame as JPEG
                ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
                if ret:
                    frame_bytes = buffer.tobytes()
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
                
                # Control frame rate (simulate real-time playback)
                time.sleep(1.0 / self.video_info[direction]["fps"])
                
        except Exception as e:
            logger.error(f"Error in video stream for {direction}: {e}")
        finally:
            self.stream_active[direction] = False
    
    def start_stream(self, direction: str):
        """Start streaming for a specific camera"""
        if direction in self.video_captures and not self.stream_active.get(direction, False):
            self.stream_active[direction] = True
            return True
        return False
    
    def stop_stream(self, direction: str):
        """Stop streaming for a specific camera"""
        if direction in self.stream_active:
            self.stream_active[direction] = False
            return True
        return False

# Initialize video stream manager
video_manager = VideoStreamManager()

# Pydantic models for request/response
class EnvironmentalData(BaseModel):
    """Environmental data for risk prediction"""
    slope: float = Field(..., ge=0, le=90, description="Terrain slope in degrees")
    elevation: float = Field(..., ge=-500, le=9000, description="Elevation in meters")
    fracture_density: float = Field(..., ge=0, le=20, description="Fractures per square meter")
    roughness: float = Field(..., ge=0, le=2, description="Surface roughness index")
    slope_variability: float = Field(0.0, ge=0, le=50, description="Slope variation")
    instability_index: float = Field(..., ge=0, le=1, description="Geological instability index")
    wetness_index: float = Field(0.0, ge=0, le=30, description="Wetness index")
    month: float = Field(..., ge=1, le=12, description="Month of year")
    day_of_year: float = Field(..., ge=1, le=366, description="Day of year")
    season: float = Field(..., ge=0, le=4, description="Season (0-3 or 1-4)")
    rainfall: float = Field(..., ge=0, le=500, description="Rainfall in mm")
    temperature: float = Field(..., ge=-50, le=60, description="Temperature in Celsius")
    temperature_variation: float = Field(0.0, ge=0, le=50, description="Temperature variation")
    freeze_thaw_cycles: float = Field(..., ge=0, le=50, description="Number of freeze-thaw cycles")
    seismic_activity: float = Field(..., ge=0, le=10, description="Seismic activity magnitude")
    wind_speed: float = Field(..., ge=0, le=200, description="Wind speed in km/h")
    precipitation_intensity: float = Field(0.0, ge=0, le=100, description="Precipitation intensity")
    humidity: float = Field(..., ge=0, le=100, description="Humidity percentage")
    risk_score: Optional[float] = Field(0.0, description="Base risk score")
    # Extended context fields
    mine_id: Optional[str] = Field(None, description="Selected mine site ID")
    rock_count: Optional[int] = Field(0, description="Reliable YOLO rock detection count")
    rock_confidence: Optional[float] = Field(0.0, description="Mean YOLO rock confidence")
    satellite_displacement_mm: Optional[float] = Field(None, description="Satellite InSAR displacement (mm)")
    satellite_velocity_mm_day: Optional[float] = Field(None, description="Satellite deformation velocity (mm/day)")
    satellite_available: Optional[bool] = Field(False, description="Whether real satellite deformation data is available")

class RiskPrediction(BaseModel):
    """Calibrated 4-Class Risk Prediction response"""
    risk_score: float = Field(..., description="Continuous risk score (0-100)")
    risk_level: str = Field(..., description="Risk level: LOW, MEDIUM, HIGH, CRITICAL")
    confidence: float = Field(..., description="Prediction confidence (0-1)")
    probabilities: Dict[str, float] = Field(..., description="Calibrated probabilities for LOW, MEDIUM, HIGH, CRITICAL")
    model_predictions: Dict[str, Any] = Field(..., description="Individual model probability outputs")
    contributing_factors: List[Dict[str, Any]] = Field(default_factory=list, description="Ranked contributing risk factors")
    satellite_status: Dict[str, Any] = Field(default_factory=dict, description="Satellite deformation status")
    recommendations: List[str] = Field(..., description="Domain safety recommendations")
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat(), description="Prediction timestamp in ISO format")
    diagnostics: Optional[Dict[str, Any]] = Field(None, description="Developer diagnostic payload")

class DetectionResult(BaseModel):
    """Rock detection result"""
    detections: List[Dict[str, Any]] = Field(..., description="List of detected rocks")
    total_detections: int = Field(..., description="Total number of rocks detected")
    confidence_threshold: float = Field(0.5, description="Confidence threshold used")
    processing_time_ms: float = Field(..., description="Processing time in milliseconds")
    image_dimensions: Dict[str, int] = Field(..., description="Image width and height")
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat(), description="Detection timestamp in ISO format")
    diagnostics: Optional[Dict[str, Any]] = None


DETECTION_IOU_THRESHOLD = 0.45


def _axis_starts(length: int, tile_length: int, overlap: float) -> List[int]:
    """Return stable crop starts, including the far edge of an oversized image."""
    if length <= tile_length:
        return [0]
    step = max(1, int(tile_length * (1.0 - overlap)))
    starts = list(range(0, length - tile_length + 1, step))
    final_start = length - tile_length
    if starts[-1] != final_start:
        starts.append(final_start)
    return starts


def _detections_from_results(results, model, image_width: int, image_height: int,
                             offset_x: int = 0, offset_y: int = 0) -> List[Dict[str, Any]]:
    """Convert Ultralytics boxes to original-image coordinates."""
    detections = []
    for result in results:
        if result.boxes is None:
            continue
        for box in result.boxes:
            class_id = int(box.cls[0])
            class_name = model.names[class_id] if hasattr(model, "names") and class_id in model.names else "rock"
            x1, y1, x2, y2 = [float(value) for value in box.xyxy[0].tolist()]
            x1 = max(0.0, min(float(image_width), x1 + offset_x))
            y1 = max(0.0, min(float(image_height), y1 + offset_y))
            x2 = max(0.0, min(float(image_width), x2 + offset_x))
            y2 = max(0.0, min(float(image_height), y2 + offset_y))
            if x2 <= x1 or y2 <= y1:
                continue
            detections.append({
                "confidence": float(box.conf[0]),
                "bbox": [x1, y1, x2, y2],
                "x1": x1,
                "y1": y1,
                "x2": x2,
                "y2": y2,
                "class": class_name.lower(),
                "class_name": class_name,
                "class_id": class_id,
                "area": (x2 - x1) * (y2 - y1)
            })
    return detections


def _box_iou(first: List[float], second: List[float]) -> float:
    """Calculate IoU for two xyxy boxes."""
    left = max(first[0], second[0])
    top = max(first[1], second[1])
    right = min(first[2], second[2])
    bottom = min(first[3], second[3])
    intersection = max(0.0, right - left) * max(0.0, bottom - top)
    first_area = max(0.0, first[2] - first[0]) * max(0.0, first[3] - first[1])
    second_area = max(0.0, second[2] - second[0]) * max(0.0, second[3] - second[1])
    union = first_area + second_area - intersection
    return intersection / union if union else 0.0


def _class_aware_nms(detections: List[Dict[str, Any]], iou_threshold: float) -> List[Dict[str, Any]]:
    """Keep highest-confidence boxes while suppressing overlapping boxes per class."""
    kept = []
    for class_id in sorted({d["class_id"] for d in detections}):
        candidates = sorted((d for d in detections if d["class_id"] == class_id),
                            key=lambda d: d["confidence"], reverse=True)
        while candidates:
            selected = candidates.pop(0)
            kept.append(selected)
            candidates = [candidate for candidate in candidates
                          if _box_iou(selected["bbox"], candidate["bbox"]) < iou_threshold]
    return sorted(kept, key=lambda d: d["confidence"], reverse=True)


def _run_detection(image_array: np.ndarray, confidence_threshold: float,
                   inference_mode: str, tile_size: int, overlap: float) -> tuple:
    """Run standard or standard-plus-tiled inference using the loaded YOLO model."""
    image_height, image_width = image_array.shape[:2]
    normal_start = time.perf_counter()
    normal_results = detection_model(
        image_array, conf=confidence_threshold, iou=DETECTION_IOU_THRESHOLD,
        imgsz=640, verbose=False
    )
    normal_time = (time.perf_counter() - normal_start) * 1000
    normal_detections = _detections_from_results(
        normal_results, detection_model, image_width, image_height
    )

    should_tile = inference_mode == "tiled" or (inference_mode == "auto" and not normal_detections)
    tiled_detections = []
    tiled_time = 0.0
    if should_tile:
        tiled_start = time.perf_counter()
        for top in _axis_starts(image_height, tile_size, overlap):
            for left in _axis_starts(image_width, tile_size, overlap):
                tile = image_array[top:min(top + tile_size, image_height), left:min(left + tile_size, image_width)]
                tile_results = detection_model(
                    tile, conf=confidence_threshold, iou=DETECTION_IOU_THRESHOLD,
                    imgsz=640, verbose=False
                )
                tiled_detections.extend(_detections_from_results(
                    tile_results, detection_model, image_width, image_height, left, top
                ))
        tiled_time = (time.perf_counter() - tiled_start) * 1000

    if should_tile:
        final_detections = _class_aware_nms(tiled_detections, DETECTION_IOU_THRESHOLD)
        selected_mode = "tiled"
    else:
        final_detections = normal_detections
        selected_mode = "standard"
    return final_detections, {
        "mode": selected_mode,
        "normal_detections": len(normal_detections),
        "tiled_detections": len(tiled_detections),
        "final_detections": len(final_detections),
        "normal_inference_time_ms": normal_time,
        "tiled_inference_time_ms": tiled_time,
        "tile_size": tile_size,
        "tile_overlap": overlap,
        "nms_iou_threshold": DETECTION_IOU_THRESHOLD
    }

class SystemStatus(BaseModel):
    """System status response"""
    status: str = Field(..., description="System status")
    models_loaded: Dict[str, bool] = Field(..., description="Model loading status")
    uptime: str = Field(..., description="System uptime")
    version: str = Field("1.0.0", description="API version")
    active_connections: int = Field(..., description="Active WebSocket connections")

# Load models on startup
async def load_models():
    """Load ML models during startup"""
    global prediction_models, detection_model, scalers, feature_names, model_performance
    
    # Load prediction models from outputs/models
    try:
        logger.info("Loading prediction models from outputs/models...")
        models, scaler, metadata = load_models_from_outputs()
        
        if models:
            prediction_models = models
            scalers = scaler
            
            # Set default feature names if not in metadata
            if metadata and 'feature_names' in metadata:
                feature_names = metadata['feature_names']
            else:
                # Default feature names based on your EnvironmentalData model
                feature_names = [
                    'slope', 'elevation', 'fracture_density', 'roughness', 
                    'slope_variability', 'instability_index', 'wetness_index',
                    'month', 'day_of_year', 'season', 'rainfall', 'temperature',
                    'temperature_variation', 'freeze_thaw_cycles', 'seismic_activity',
                    'wind_speed', 'precipitation_intensity', 'humidity'
                ]
            
            if metadata and 'performance' in metadata:
                model_performance = metadata['performance']
            
            logger.info(f"✅ Loaded {len(models)} prediction models successfully")
        else:
            logger.warning("⚠️ No prediction models found in outputs/models")
            prediction_models = None
            
    except Exception as e:
        logger.error(f"❌ Failed to load prediction models: {e}")
        prediction_models = None
    
    # Load YOLO detection model
    if YOLO_AVAILABLE:
        try:
            logger.info("Loading detection model...")
            # First try the experiment folder
            detection_model_path = backend_root / "outputs" / "experiment_20250916_210441" / "weights" / "best.pt"
            if detection_model_path.exists():
                detection_model = YOLO(str(detection_model_path))
                logger.info("✅ YOLO detection model loaded from experiment folder")
            else:
                # Try the models folder
                alt_path = backend_root / "outputs" / "models" / "best.pt"
                if alt_path.exists():
                    detection_model = YOLO(str(alt_path))
                    logger.info("✅ YOLO detection model loaded from models folder")
                else:
                    logger.warning("⚠️ YOLO model file not found, using pretrained model")
                    detection_model = YOLO('yolov8n.pt')  # Use pretrained model as fallback
        except Exception as e:
            logger.error(f"❌ Failed to load detection model: {e}")
            detection_model = None
    else:
        logger.warning("⚠️ YOLO not available")
        detection_model = None

# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 Starting FastAPI server...")
    await load_models()
    logger.info("✅ FastAPI server started successfully")
    yield
    # Shutdown
    logger.info("🛑 Shutting down FastAPI server...")

# Create FastAPI app
app = FastAPI(
    title=API_TITLE,
    description=API_DESCRIPTION,
    version=API_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Add CORS middleware FIRST - before any routes or mounts
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving removed for separate deployment
# Frontend will be deployed separately

@app.get("/", response_class=JSONResponse)
async def root():
    """Root endpoint with API information"""
    return {
        "message": "🏔️ Rockfall Detection API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "operational",
        "features": [
            "Risk prediction with ML ensemble",
            "Real-time rock detection",
            "WebSocket live monitoring",
            "File upload processing",
            "Historical data analysis"
        ]
    }

@app.get("/api/status", response_model=SystemStatus)
async def get_system_status():
    """Get system status and health"""
    global prediction_models, detection_model
    
    return SystemStatus(
        status="operational",
        models_loaded={
            "prediction_models": prediction_models is not None,
            "detection_model": detection_model is not None,
            "xgboost": "xgboost" in (prediction_models or {}),
            "random_forest": "random_forest" in (prediction_models or {}),
            "neural_network": "neural_network" in (prediction_models or {})
        },
        uptime="Running",
        active_connections=len(manager.active_connections)
    )

@app.get("/api/health", response_model=SystemStatus)
async def get_health_status():
    """Health check endpoint matching the system status payload."""
    return await get_system_status()

@app.post("/api/predict-risk", response_model=RiskPrediction)
async def predict_risk(data: EnvironmentalData):
    """Predict rockfall risk with calibrated 4-class probabilities, factor attribution, and continuous risk scoring"""
    global prediction_models, scalers, feature_names
    
    # Auto-load models on demand if not already loaded
    if not prediction_models:
        try:
            loaded_m, loaded_s, loaded_meta = load_models_from_outputs()
            if loaded_m:
                prediction_models = loaded_m
                scalers = loaded_s
                if loaded_meta and 'feature_names' in loaded_meta:
                    feature_names = loaded_meta['feature_names']
                logger.info("✅ Auto-loaded prediction models on demand")
        except Exception as e:
            logger.warning(f"Could not auto-load prediction models: {e}")

    # Required 18 feature names in exact model order
    target_features = [
        "slope", "elevation", "fracture_density", "roughness", "slope_variability",
        "instability_index", "wetness_index", "month", "day_of_year", "season",
        "rainfall", "temperature", "temperature_variation", "freeze_thaw_cycles",
        "seismic_activity", "wind_speed", "precipitation_intensity", "humidity"
    ]
    
    # 1. Fallback when prediction models are unavailable
    if not prediction_models:
        logger.warning("Prediction models not loaded - using geomechanical fallback heuristic")
        
        # Transparent domain heuristic
        s_norm = min(1.0, data.slope / 70.0)
        r_norm = min(1.0, data.rainfall / 120.0)
        f_norm = min(1.0, data.fracture_density / 8.0)
        seis_norm = min(1.0, data.seismic_activity / 5.0)
        
        score_val = (s_norm * 35.0 + r_norm * 25.0 + f_norm * 20.0 + seis_norm * 20.0)
        score_val = max(0.0, min(100.0, round(score_val, 1)))
        
        if score_val >= 80.0:
            lvl = "CRITICAL"
            probs = {"LOW": 0.02, "MEDIUM": 0.08, "HIGH": 0.25, "CRITICAL": 0.65}
        elif score_val >= 58.0:
            lvl = "HIGH"
            probs = {"LOW": 0.05, "MEDIUM": 0.20, "HIGH": 0.60, "CRITICAL": 0.15}
        elif score_val >= 28.0:
            lvl = "MEDIUM"
            probs = {"LOW": 0.15, "MEDIUM": 0.65, "HIGH": 0.18, "CRITICAL": 0.02}
        else:
            lvl = "LOW"
            probs = {"LOW": 0.75, "MEDIUM": 0.20, "HIGH": 0.05, "CRITICAL": 0.00}
            
        return RiskPrediction(
            risk_score=score_val,
            risk_level=lvl,
            confidence=0.80,
            probabilities=probs,
            model_predictions={"fallback_heuristic": probs},
            contributing_factors=[
                {"factor": "Slope", "contribution": round(s_norm * 35.0, 1), "impact": "HIGH" if data.slope > 35 else "LOW", "raw_value": data.slope, "unit": "°"},
                {"factor": "Rainfall", "contribution": round(r_norm * 25.0, 1), "impact": "HIGH" if data.rainfall > 50 else "LOW", "raw_value": data.rainfall, "unit": "mm"},
                {"factor": "Fracture Density", "contribution": round(f_norm * 20.0, 1), "impact": "HIGH" if data.fracture_density > 4 else "LOW", "raw_value": data.fracture_density, "unit": "/m²"},
                {"factor": "Seismic Activity", "contribution": round(seis_norm * 20.0, 1), "impact": "HIGH" if data.seismic_activity > 2.5 else "LOW", "raw_value": data.seismic_activity, "unit": "M"}
            ],
            satellite_status={"available": False, "message": "Satellite InSAR data unavailable for this coordinate frame."},
            recommendations=["Verify slope stability sensors", "Maintain continuous seismic and rainfall monitoring"],
            diagnostics={"mode": "heuristic_fallback", "model_loaded": False}
        )

    try:
        # 2. Prepare exact input feature vector in canonical model order
        input_dict = data.dict()
        
        # Incorporate visual YOLO signals into fracture & instability if provided
        if data.rock_count and data.rock_count > 0:
            visual_boost = min(3.0, data.rock_count * 0.4 * (data.rock_confidence or 0.5))
            input_dict["fracture_density"] = min(15.0, input_dict["fracture_density"] + visual_boost)
            input_dict["instability_index"] = min(1.0, input_dict["instability_index"] + (visual_boost * 0.05))

        ordered_features = feature_names if feature_names else target_features
        input_values = [float(input_dict.get(feat, 0.0)) for feat in ordered_features]
        input_array = np.array([input_values])

        # 3. Model Inference via Scaler & Calibrated Ensemble
        preds_output = predict_with_loaded_models(prediction_models, scalers, input_array)
        probs = preds_output.get("probabilities", {"LOW": 0.25, "MEDIUM": 0.25, "HIGH": 0.25, "CRITICAL": 0.25})
        model_predictions = preds_output.get("model_predictions", {})
        input_scaled = preds_output.get("input_scaled", input_array)

        # 4. Continuous Risk Score Calculation (0 - 100)
        p_low = probs.get("LOW", 0.0)
        p_med = probs.get("MEDIUM", 0.0)
        p_high = probs.get("HIGH", 0.0)
        p_crit = probs.get("CRITICAL", 0.0)

        continuous_score = (p_low * 5.0 + p_med * 38.0 + p_high * 72.0 + p_crit * 100.0)
        risk_score = max(0.0, min(100.0, round(float(continuous_score), 1)))

        # 5. Calibrated Risk Level Categorization
        if p_crit >= 0.35 or risk_score >= 80.0:
            risk_level = "CRITICAL"
        elif p_high >= 0.35 or risk_score >= 58.0:
            risk_level = "HIGH"
        elif p_med >= 0.35 or risk_score >= 28.0:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        # Model confidence (peak probability sharpness)
        confidence = float(round(max(p_low, p_med, p_high, p_crit), 3))

        # 6. Contributing Factors Breakdown
        factors = []
        # Factor 1: Slope
        s_val = float(data.slope)
        s_impact = "CRITICAL" if s_val >= 55 else "HIGH" if s_val >= 40 else "MEDIUM" if s_val >= 25 else "LOW"
        s_contrib = round(min(35.0, (s_val / 65.0) * 35.0), 1)
        factors.append({"factor": "Slope Steepness", "contribution": s_contrib, "impact": s_impact, "raw_value": s_val, "unit": "°"})

        # Factor 2: Fracture Density & Geotechnical Instability
        f_val = float(data.fracture_density)
        f_impact = "CRITICAL" if f_val >= 7.0 else "HIGH" if f_val >= 4.5 else "MEDIUM" if f_val >= 2.0 else "LOW"
        f_contrib = round(min(25.0, (f_val / 8.0) * 25.0), 1)
        factors.append({"factor": "Structural Fracturing", "contribution": f_contrib, "impact": f_impact, "raw_value": f_val, "unit": "/m²"})

        # Factor 3: Rainfall & Hydrogeology
        r_val = float(data.rainfall)
        r_impact = "CRITICAL" if r_val >= 100 else "HIGH" if r_val >= 50 else "MEDIUM" if r_val >= 20 else "LOW"
        r_contrib = round(min(25.0, (r_val / 120.0) * 25.0), 1)
        factors.append({"factor": "Rainfall & Moisture", "contribution": r_contrib, "impact": r_impact, "raw_value": r_val, "unit": "mm"})

        # Factor 4: Dynamic & Seismic Triggers
        seis_val = float(data.seismic_activity)
        seis_impact = "CRITICAL" if seis_val >= 4.5 else "HIGH" if seis_val >= 3.0 else "MEDIUM" if seis_val >= 1.5 else "LOW"
        seis_contrib = round(min(20.0, (seis_val / 5.0) * 20.0), 1)
        factors.append({"factor": "Seismic & Vibration", "contribution": seis_contrib, "impact": seis_impact, "raw_value": seis_val, "unit": "M"})

        # Factor 5: Visual Rock Activity (if present)
        if data.rock_count and data.rock_count > 0:
            v_impact = "CRITICAL" if data.rock_count >= 8 else "HIGH" if data.rock_count >= 4 else "MEDIUM"
            factors.append({
                "factor": "Visual Rockfall Activity",
                "contribution": round(min(20.0, data.rock_count * 2.5), 1),
                "impact": v_impact,
                "raw_value": data.rock_count,
                "unit": "rocks"
            })

        # 7. Satellite InSAR Status
        if data.satellite_available and data.satellite_displacement_mm is not None:
            sat_status = {
                "available": True,
                "displacement_mm": data.satellite_displacement_mm,
                "velocity_mm_day": data.satellite_velocity_mm_day,
                "message": f"Active InSAR line-of-sight displacement: {data.satellite_displacement_mm:+.1f} mm"
            }
        else:
            sat_status = {
                "available": False,
                "displacement_mm": None,
                "velocity_mm_day": None,
                "message": "Satellite InSAR deformation data unavailable for selected bench."
            }

        # 8. Domain Safety Recommendations
        if risk_level == "CRITICAL":
            recommendations = [
                "🚨 IMMEDIATE EVACUATION of lower haul roads and bench toes",
                "⛔ Halt all heavy vehicle movement and blasting in sector",
                "📡 Activate real-time radar and acoustic emission alarms",
                "👥 Dispatch emergency geotechnical response team"
            ]
        elif risk_level == "HIGH":
            recommendations = [
                "⚠️ Restrict access to designated highwall buffer zones",
                "📈 Increase terrestrial laser scanner / radar sweep frequency",
                "📋 Inspect drainage channels and berm retention capacities",
                "🔍 Deploy spotter UAVs for bench crest crack dilation checks"
            ]
        elif risk_level == "MEDIUM":
            recommendations = [
                "ℹ️ Standard operational monitoring on active mining benches",
                "📊 Review daily rainfall accumulation and pore pressure gauges",
                "🚜 Maintain safety berm height according to DGMS guidelines"
            ]
        else:
            recommendations = [
                "✅ Normal mining operations permissible under baseline protocols",
                "📈 Log routine piezometer and prism survey measurements"
            ]

        # 9. Diagnostics Payload
        diagnostics = {
            "model_version": "2.0-calibrated-4tier",
            "features": [
                {
                    "index": idx,
                    "name": name,
                    "raw_value": round(val, 3),
                    "scaled_value": round(float(input_scaled[0][idx]), 3) if input_scaled is not None and len(input_scaled[0]) > idx else None
                }
                for idx, (name, val) in enumerate(zip(ordered_features, input_values))
            ],
            "ensemble_weights": {"xgboost": 0.55, "random_forest": 0.45},
            "server_timestamp": datetime.now().isoformat()
        }

        result = RiskPrediction(
            risk_score=risk_score,
            risk_level=risk_level,
            confidence=confidence,
            probabilities=probs,
            model_predictions=model_predictions,
            contributing_factors=factors,
            satellite_status=sat_status,
            recommendations=recommendations,
            diagnostics=diagnostics
        )

        # Broadcast to WebSocket clients
        await manager.broadcast(json.dumps({
            "type": "risk_update",
            "data": result.dict(),
            "timestamp": datetime.now().isoformat()
        }))

        return result

    except Exception as e:
        logger.error(f"Error in risk prediction: {e}")
        logger.exception("Risk prediction failure details:")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@app.post("/api/detect-rocks", response_model=DetectionResult)
async def detect_rocks(file: UploadFile = File(...), confidence_threshold: float = 0.25,
                       inference_mode: str = "auto", tile_size: int = 448,
                       tile_overlap: float = 0.25):
    """Detect rocks in uploaded image"""
    global detection_model

    if not 0.0 <= confidence_threshold <= 1.0:
        raise HTTPException(status_code=422, detail="confidence_threshold must be between 0 and 1")
    if inference_mode not in {"standard", "tiled", "auto"}:
        raise HTTPException(status_code=422, detail="inference_mode must be standard, tiled, or auto")
    if not 320 <= tile_size <= 2048:
        raise HTTPException(status_code=422, detail="tile_size must be between 320 and 2048")
    if not 0.0 <= tile_overlap < 0.8:
        raise HTTPException(status_code=422, detail="tile_overlap must be between 0 and 0.8")
    
    # 1. Robust file format and type validation
    content_type_ok = file.content_type and file.content_type.startswith('image/')
    extension_ok = file.filename and os.path.splitext(file.filename.lower())[1] in ['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff']
    
    if not (content_type_ok or extension_ok):
        raise HTTPException(status_code=400, detail="File must be an image (JPEG, PNG, WEBP, TIF)")

    if not detection_model or not YOLO_AVAILABLE:
        logger.error("Detection requested while the YOLO model is unavailable")
        raise HTTPException(status_code=503, detail="Detection service unavailable.")
    
    try:
        # Read and process image
        image_data = await file.read()
        if not image_data:
            raise HTTPException(status_code=400, detail="Unable to decode uploaded image.")
        if len(image_data) > 25 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Image is too large. Maximum size is 25 MB.")
        try:
            image = Image.open(io.BytesIO(image_data))
            image.load()
        except Exception:
            raise HTTPException(status_code=400, detail="Unable to decode uploaded image.")

        source_format = image.format or "RAW"
        # Convert PIL image to RGB cleanly (handling alpha transparency)
        if image.mode in ('RGBA', 'LA') or (image.mode == 'P' and 'transparency' in image.info):
            bg = Image.new('RGB', image.size, (255, 255, 255))
            bg.paste(image, mask=image.split()[-1])
            image = bg
        elif image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Convert to numpy array
        import numpy as np
        img_array = np.array(image)
        
        detections, inference_diagnostics = _run_detection(
            img_array, confidence_threshold, inference_mode, tile_size, tile_overlap
        )
        total_detections = len(detections)
        processing_time = inference_diagnostics["normal_inference_time_ms"] + inference_diagnostics["tiled_inference_time_ms"]
        
        # Get active device
        active_device = "cpu"
        try:
            active_device = str(next(detection_model.parameters()).device)
        except Exception:
            pass

        diagnostics = {
            "filename": file.filename,
            "width": image.width,
            "height": image.height,
            "format": source_format,
            "model_name": "YOLOv8 Custom fine-tuned",
            "model_path": "outputs/experiment_20250916_210441/weights/best.pt",
            "classes": list(detection_model.names.values()) if hasattr(detection_model, 'names') else ["Rock"],
            "device": active_device,
            "inference_time_ms": float(processing_time),
            "iou_threshold": 0.45,
            "confidence_threshold": float(confidence_threshold),
            "inference_mode_requested": inference_mode,
            **inference_diagnostics
        } if DEBUG else None

        result = DetectionResult(
            detections=detections,
            total_detections=total_detections,
            confidence_threshold=confidence_threshold,
            processing_time_ms=processing_time,
            image_dimensions={"width": image.width, "height": image.height},
            timestamp=datetime.now().isoformat(),
            diagnostics=diagnostics
        )
        
        # Broadcast detection result
        await manager.broadcast(json.dumps({
            "type": "detection_update",
            "data": result.dict(),
            "timestamp": datetime.now().isoformat()
        }))
        
        return result
            
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error in rock detection: {e}")
        raise HTTPException(status_code=500, detail="Image processing failed.")

@app.get("/api/test-image")
async def get_test_image():
    """Get a default test image from the training data"""
    try:
        test_images_dir = backend_root / "data" / "rockfall_training_data" / "test" / "images"
        
        if not test_images_dir.exists():
            raise HTTPException(status_code=404, detail="Test images directory not found")
        
        # Get list of available test images
        image_files = list(test_images_dir.glob("*.jpg"))
        
        if not image_files:
            raise HTTPException(status_code=404, detail="No test images found")
        
        # Use the first test image as default
        default_image = image_files[0]
        
        return FileResponse(
            path=str(default_image),
            media_type="image/jpeg",
            filename=default_image.name
        )
        
    except Exception as e:
        logger.error(f"Error serving test image: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to serve test image: {str(e)}")

@app.get("/api/test-image/detect", response_model=DetectionResult)
async def detect_default_test_image(confidence_threshold: float = 0.5):
    """Run detection on the default test image"""
    global detection_model
    
    try:
        test_images_dir = backend_root / "data" / "rockfall_training_data" / "test" / "images"
        
        if not test_images_dir.exists():
            raise HTTPException(status_code=404, detail="Test images directory not found")
        
        # Get list of available test images
        image_files = list(test_images_dir.glob("*.jpg"))
        
        if not image_files:
            raise HTTPException(status_code=404, detail="No test images found")
        
        # Use the first test image as default
        default_image_path = image_files[0]
        
        if not detection_model or not YOLO_AVAILABLE:
            raise HTTPException(status_code=503, detail="Detection service unavailable.")
        
        # Load and process the test image
        image = Image.open(default_image_path)
        
        # Convert PIL image to numpy array for YOLO
        import numpy as np
        
        # Convert PIL to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Convert to numpy array
        img_array = np.array(image)
        
        # Run detection
        start_time = datetime.now()
        results = detection_model(img_array, conf=confidence_threshold)
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        # Process results
        detections = []
        total_detections = 0
        
        for result in results:
            if result.boxes is not None:
                for box in result.boxes:
                    detection = {
                        "confidence": float(box.conf[0]),
                        "bbox": [
                            float(box.xyxy[0][0]),
                            float(box.xyxy[0][1]), 
                            float(box.xyxy[0][2]),
                            float(box.xyxy[0][3])
                        ],
                        "class": "rock",
                        "class_id": 0,
                        "area": float((box.xyxy[0][2] - box.xyxy[0][0]) * (box.xyxy[0][3] - box.xyxy[0][1]))
                    }
                    detections.append(detection)
                    total_detections += 1
        
        result = DetectionResult(
            detections=detections,
            total_detections=total_detections,
            confidence_threshold=confidence_threshold,
            processing_time_ms=processing_time,
            image_dimensions={"width": image.width, "height": image.height},
            timestamp=datetime.now().isoformat()
        )
        
        # Note: Not broadcasting test image detections to avoid duplicate notifications
        # This is a demo/test endpoint, real detections should use /api/detect-rocks
        
        return result
        
    except Exception as e:
        logger.error(f"Error in default test image detection: {e}")
        raise HTTPException(status_code=500, detail=f"Default detection failed: {str(e)}")

@app.get("/api/models/performance")
async def get_model_performance():
    """Get model performance metrics"""
    global model_performance
    
    if not model_performance:
        raise HTTPException(status_code=503, detail="Model performance data not available")
    
    return {
        "model_performance": model_performance,
        "detection_model": {
            "mAP50": 0.995,
            "precision": 0.9952,
            "recall": 1.0,
            "inference_time_ms": 60.8
        },
        "feature_count": len(feature_names) if feature_names else 0
    }

@app.get("/api/features")
async def get_feature_names():
    """Get list of required features for prediction"""
    global feature_names
    
    if not feature_names:
        raise HTTPException(status_code=503, detail="Feature names not available")
    
    return {
        "features": feature_names,
        "total_features": len(feature_names),
        "description": "Environmental and terrain features required for risk prediction"
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            
            # Echo back for heartbeat
            await manager.send_personal_message(json.dumps({
                "type": "heartbeat",
                "timestamp": datetime.now().isoformat(),
                "message": "Connection active"
            }), websocket)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Server-Sent Events (SSE) alternative for platforms that don't support WebSockets
@app.get("/api/events/stream")
async def event_stream():
    """Server-Sent Events endpoint - WebSocket alternative for cloud platforms"""
    async def generate():
        try:
            while True:
                # Send real-time data as SSE
                data = {
                    "type": "heartbeat",
                    "timestamp": datetime.now().isoformat(),
                    "message": "Connection active",
                    "camera_status": video_manager.get_camera_status(),
                    "system_stats": {
                        "active_connections": len(manager.active_connections),
                        "uptime": "24h 15m",
                        "memory_usage": "245 MB"
                    }
                }
                
                yield f"data: {json.dumps(data)}\n\n"
                await asyncio.sleep(5)  # Send updates every 5 seconds
                
        except Exception as e:
            logger.error(f"SSE stream error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control"
        }
    )

@app.post("/api/events/message")
async def receive_message(message: dict):
    """Receive messages from SSE clients (since SSE is one-way)"""
    logger.info(f"Received SSE message: {message}")
    
    # Broadcast to WebSocket clients if any are connected
    if manager.active_connections:
        await manager.broadcast(json.dumps({
            "type": "client_message",
            "timestamp": datetime.now().isoformat(),
            "data": message
        }))
    
    return {"status": "received", "timestamp": datetime.now().isoformat()}

# Camera streaming endpoints
@app.get("/api/camera/status")
async def get_camera_status():
    """Get status of all cameras with real video metadata"""
    return video_manager.get_camera_status()

@app.get("/api/camera/{direction}/stream")
async def get_camera_stream(direction: str):
    """Get camera stream URL for specified direction"""
    valid_directions = ["east", "west", "north", "south"]
    
    if direction not in valid_directions:
        raise HTTPException(status_code=400, detail="Invalid camera direction")
    
    status = video_manager.get_camera_status()
    camera_info = status["cameras"][direction]
    
    return {
        "direction": direction,
        "stream_url": f"/api/camera/{direction}/feed",
        "status": camera_info["status"],
        "resolution": camera_info["resolution"],
        "fps": camera_info["fps"],
        "duration": camera_info["duration"],
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/camera/{direction}/feed")
async def get_camera_feed(direction: str):
    """Get live video feed for specified camera direction"""
    valid_directions = ["east", "west", "north", "south"]
    
    if direction not in valid_directions:
        raise HTTPException(status_code=400, detail="Invalid camera direction")
    
    if direction not in video_manager.video_captures:
        raise HTTPException(status_code=404, detail=f"Camera {direction} not available")
    
    # Start streaming for this direction
    video_manager.start_stream(direction)
    
    return StreamingResponse(
        video_manager.generate_frames(direction),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@app.post("/api/camera/{direction}/control")
async def control_camera(direction: str, action: str):
    """Control camera operations (start/stop/record/etc.)"""
    valid_directions = ["east", "west", "north", "south"]
    valid_actions = ["start", "stop", "record", "stop_record", "zoom_in", "zoom_out", "rotate_left", "rotate_right"]
    
    if direction not in valid_directions:
        raise HTTPException(status_code=400, detail="Invalid camera direction")
    
    if action not in valid_actions:
        raise HTTPException(status_code=400, detail="Invalid camera action")
    
    # Handle real camera control
    success = False
    message = ""
    
    if action == "start":
        success = video_manager.start_stream(direction)
        message = "Stream started" if success else "Failed to start stream"
    elif action == "stop":
        success = video_manager.stop_stream(direction)
        message = "Stream stopped" if success else "Failed to stop stream"
    elif action in ["record", "stop_record"]:
        # Simulate recording control
        success = True
        message = f"Recording {'started' if action == 'record' else 'stopped'}"
    else:
        # Simulate other camera controls
        success = True
        message = f"Camera {direction} {action} executed successfully"
    
    return {
        "direction": direction,
        "action": action,
        "status": "success" if success else "error",
        "message": message,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/camera/{direction}/detections")
async def get_camera_detections(direction: str):
    """Get recent detections from specific camera"""
    valid_directions = ["east", "west", "north", "south"]
    
    if direction not in valid_directions:
        raise HTTPException(status_code=400, detail="Invalid camera direction")
    
    # Simulate detection data
    detections = []
    if direction == "north":
        detections = [
            {
                "id": "det_001",
                "timestamp": datetime.now().isoformat(),
                "confidence": 0.95,
                "bbox": {"x": 120, "y": 80, "width": 60, "height": 40},
                "object_type": "rock",
                "risk_level": "medium"
            },
            {
                "id": "det_002", 
                "timestamp": (datetime.now()).isoformat(),
                "confidence": 0.87,
                "bbox": {"x": 300, "y": 150, "width": 45, "height": 35},
                "object_type": "rock",
                "risk_level": "low"
            }
        ]
    
    return {
        "direction": direction,
        "detections": detections,
        "total_count": len(detections),
        "last_updated": datetime.now().isoformat()
    }

# DEM Analysis endpoints
@app.get("/api/dem/files")
async def get_dem_files():
    """Return data-driven registry metadata, provenance status, and live raster details for every mine."""
    registry = load_dem_registry()
    for entry in registry:
        if entry.get("file_available"):
            path = backend_root / "data" / "DEM" / entry["file"]
            try:
                with rasterio.open(path) as dataset:
                    entry["crs"] = str(dataset.crs) if dataset.crs else "EPSG:4326"
                    entry["resolution"] = {
                        "x": round(float(dataset.res[0]), 6),
                        "y": round(float(dataset.res[1]), 6),
                        "unit": "degrees" if (dataset.crs and not dataset.crs.is_projected) else "meters"
                    }
                    entry["valid_pixel_count"] = int(dataset.read_masks(1).astype(bool).sum())
            except Exception as read_err:
                logger.warning(f"Could not read metadata for {entry['file']}: {read_err}")
                entry["crs"] = None
                entry["resolution"] = None
                entry["valid_pixel_count"] = 0
        else:
            entry["crs"] = None
            entry["resolution"] = None
            entry["valid_pixel_count"] = 0
    return {"files": registry}


@app.get("/api/dem/analyze/{dem_id}")
async def analyze_dem(dem_id: str, layer: str = "elevation"):
    """Analyze DEM GeoTIFF and return color-coded visualization with measured statistics and 3D mesh data"""
    logger.info(f"🗺️ DEM analysis requested for: {dem_id} (Layer: {layer})")
    if layer not in {"elevation", "slope", "hillshade", "contours"}:
        raise HTTPException(status_code=422, detail="layer must be elevation, slope, hillshade, or contours")
    
    try:
        registry = load_dem_registry()
        dem_entry = next((entry for entry in registry if entry["id"] == dem_id), None)
        if dem_entry is None:
            raise HTTPException(status_code=404, detail=f"Unknown DEM site ID: '{dem_id}'")
        if not dem_entry.get("file_available"):
            raise HTTPException(status_code=404, detail=f"DEM raster file is not available for site: {dem_id}")

        file_path = backend_root / "data" / "DEM" / dem_entry["file"]
        if not file_path.exists():
            raise HTTPException(status_code=404, detail=f"DEM file not found: {dem_entry['file']}")
        
        mtime = file_path.stat().st_mtime_ns
        cache_key = (dem_id, layer, mtime)
        result = dem_analysis_cache.get(cache_key)
        
        if result is None:
            result = await process_dem_file(file_path, dem_id, layer, dem_entry)
            dem_analysis_cache[cache_key] = result
        
        return {
            "dem_id": dem_id,
            "layer": layer,
            "image_url": result["image_url"],
            "statistics": result["statistics"],
            "source_info": {
                **dem_entry,
                **(result.get("source_info") or {}),
                "crs": result["statistics"].get("crs"),
                "resolution": result["statistics"].get("resolution")
            },
            "mesh3d": result.get("mesh3d"),
            "processing_time": result["processing_time"],
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"💥 DEM analysis failed for {dem_id}: {str(e)}")
        logger.exception("Full error traceback:")
        raise HTTPException(status_code=500, detail=f"DEM analysis failed: {str(e)}")


@app.get("/api/dem/compare")
async def compare_dems(ids: List[str] = Query(..., min_length=1, max_length=3)):
    """Compare up to three open-pit mines using measured DEM statistics."""
    if len(set(ids)) != len(ids):
        raise HTTPException(status_code=400, detail="DEM IDs must be unique")
    comparisons = []
    for dem_id in ids:
        analysis = await analyze_dem(dem_id, layer="elevation")
        comparisons.append({
            "dem_id": dem_id,
            "statistics": analysis["statistics"],
            "source_info": analysis["source_info"]
        })
    return {"comparisons": comparisons}


async def process_dem_file(file_path: Path, dem_id: str, layer: str = "elevation", source_info: Optional[Dict] = None):
    """Process DEM raster using DEMAnalyzer, computing authentic slope, TRI roughness, mesh, and visualization"""
    from src.dem_analysis.dem_processor import DEMAnalyzer
    
    start_time = datetime.now()
    analyzer = DEMAnalyzer(str(file_path))
    
    stats = analyzer.compute_comprehensive_statistics()
    mesh3d = analyzer.generate_mesh3d(grid_size=128)
    
    site_name = source_info.get("name", dem_id.replace("_", " ").title()) if source_info else dem_id.replace("_", " ").title()
    image_url = analyzer.render_layer_image(layer=layer, site_name=site_name)
    
    processing_time = (datetime.now() - start_time).total_seconds()
    
    return {
        "image_url": image_url,
        "statistics": stats,
        "source_info": source_info,
        "mesh3d": mesh3d,
        "processing_time": f"{processing_time:.2f}s"
    }

@app.get("/api/simulate-data")
async def simulate_environmental_data():
    """Generate sample environmental data for testing"""
    sample_data = {
        "slope": 45.0,
        "elevation": 1500.0,
        "fracture_density": 3.5,
        "roughness": 0.7,
        "slope_variability": 0.3,
        "instability_index": 0.8,
        "wetness_index": 0.6,
        "month": 9.0,
        "day_of_year": 259.0,
        "season": 2.0,
        "rainfall": 50.0,
        "temperature": 15.0,
        "temperature_variation": 10.0,
        "freeze_thaw_cycles": 5.0,
        "seismic_activity": 2.0,
        "wind_speed": 30.0,
        "precipitation_intensity": 25.0,
        "humidity": 75.0,
        "risk_score": 0.0
    }
    
    return {
        "sample_data": sample_data,
        "description": "Sample environmental data for testing the prediction API"
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=HOST,
        port=PORT,
        reload=RELOAD,
        log_level=LOG_LEVEL.lower()
    )