import logging
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
from .models import SatelliteStatus, ZoneDeformationHistory, HotspotGeoJSON, DeformationObservation
from .service import SatelliteService
from .config import AOI_CONFIG, SATELLITE_MODE
from .hyp3_client import HyP3Client

logger = logging.getLogger(__name__)

router = APIRouter()
service = SatelliteService()

@router.get("/status", response_model=SatelliteStatus)
async def get_satellite_status():
    """Get the status of the satellite InSAR deformation system"""
    logger.info("🛰️ Satellite status endpoint requested")
    return service.get_status()

@router.get("/scenes", response_model=List[Dict[str, Any]])
async def get_cached_scenes():
    """List all Sentinel-1 interferograms loaded in cache"""
    logger.info("🛰️ Satellite scenes endpoint requested")
    return service.list_cached_scenes()

@router.get("/deformation", response_model=List[ZoneDeformationHistory])
async def get_deformation_summary():
    """Get cumulative deformation and timeseries summary for all zones"""
    logger.info("🛰️ Satellite deformation summary requested")
    return service.get_all_zone_histories()

@router.get("/hotspots", response_model=HotspotGeoJSON)
async def get_hotspots_geojson():
    """Get geocoded hotspot zones as a GeoJSON FeatureCollection"""
    logger.info("🛰️ Satellite GeoJSON hotspots requested")
    return service.get_hotspots()

@router.get("/timeseries/{zone_id}", response_model=ZoneDeformationHistory)
async def get_zone_timeseries(zone_id: str):
    """Get full displacement time-series dataset for a single monitoring zone"""
    logger.info(f"🛰️ Satellite timeseries requested for zone: {zone_id}")
    history = service.get_zone_history(zone_id)
    if not history:
        raise HTTPException(status_code=404, detail=f"Monitoring zone '{zone_id}' not found.")
    return history

@router.get("/mine/{mine_id}")
async def get_mine_aoi_config(mine_id: str):
    """Get the AOI boundary and Sentinel-1 configuration for a mine"""
    logger.info(f"🛰️ Satellite mine config requested for mine: {mine_id}")
    if mine_id != AOI_CONFIG["id"]:
        raise HTTPException(
            status_code=404, 
            detail=f"Mine '{mine_id}' is not configured for satellite monitoring. Only '{AOI_CONFIG['id']}' is supported."
        )
    return AOI_CONFIG

@router.post("/analyze")
async def trigger_live_analysis():
    """Trigger a live analysis check or run job fetcher in live mode"""
    logger.info("🛰️ Satellite live trigger analyze endpoint called")
    
    if SATELLITE_MODE != "live":
        return {
            "success": False,
            "message": "Live mode is not enabled. SATELLITE_MODE is currently set to 'demo'.",
            "provider": "Sentinel-1 (HyP3)"
        }
        
    client = HyP3Client()
    if not client.is_operational():
        return {
            "success": False,
            "message": "HyP3 API client is not operational. Check Earthdata credentials and network connection.",
            "provider": "Sentinel-1 (HyP3)"
        }
        
    # In live mode, we would check status or submit jobs
    # For this endpoint, we'll return successful connection check
    return {
        "success": True,
        "message": "HyP3 client is online and operational. Waiting for job scheduler triggers.",
        "provider": "Sentinel-1 (HyP3)"
    }
