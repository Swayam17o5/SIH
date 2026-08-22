from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class DeformationObservation(BaseModel):
    zone_id: str = Field(..., description="Unique identifier of the monitoring zone")
    timestamp: str = Field(..., description="Timestamp of the observation (ISO format or YYYY-MM-DD)")
    latitude: float = Field(..., description="Latitude coordinate of the zone centroid")
    longitude: float = Field(..., description="Longitude coordinate of the zone centroid")
    deformation_mm: float = Field(..., description="Cumulative displacement in mm")
    velocity_mm_per_day: float = Field(..., description="Deformation velocity in mm per day")
    coherence: float = Field(..., description="Coherence value from InSAR process (0.0 to 1.0)")
    quality: str = Field("good", description="Observation quality: 'good', 'low_coherence', 'invalid'")
    source: str = Field("hyp3_insar_gamma", description="Data provider source")
    hyp3_job_id: str = Field(..., description="Associated HyP3 Job ID")

class ZoneDeformationHistory(BaseModel):
    zone_id: str
    zone_name: str
    latitude: float
    longitude: float
    description: str
    observations: List[DeformationObservation]
    latest_velocity_mm_per_day: float
    latest_acceleration_mm_per_day_sq: float
    cumulative_deformation_mm: float
    trend: str = Field("stable", description="'stable', 'creeping', or 'accelerating'")
    severity: str = Field("low", description="'low', 'moderate', 'high', 'critical'")
    mean_coherence: float

class SatelliteStatus(BaseModel):
    available: bool = Field(..., description="Whether satellite monitoring feature is active")
    mode: str = Field(..., description="Operating mode: 'demo' or 'live'")
    provider: str = Field("Sentinel-1 (HyP3 GAMMA)", description="Data provider details")
    last_observation: Optional[str] = Field(None, description="Timestamp of the latest processed pair")
    scenes_cached: int = Field(0, description="Number of unique InSAR scene pairs cached locally")
    message: Optional[str] = Field(None, description="Status status message or error info")

class HotspotGeometry(BaseModel):
    type: str = "Point"
    coordinates: List[float] = Field(..., description="[longitude, latitude]")

class HotspotProperties(BaseModel):
    zone_id: str
    zone_name: str
    velocity_mm_per_day: float
    acceleration_mm_per_day_sq: float
    cumulative_deformation_mm: float
    coherence: float
    trend: str
    severity: str
    last_update: str

class HotspotFeature(BaseModel):
    type: str = "Feature"
    geometry: HotspotGeometry
    properties: HotspotProperties

class HotspotGeoJSON(BaseModel):
    type: str = "FeatureCollection"
    features: List[HotspotFeature]
