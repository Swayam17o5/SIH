import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from .config import HYP3_CACHE_DIR, SATELLITE_MODE, MONITORING_ZONES
from .models import SatelliteStatus, ZoneDeformationHistory, DeformationObservation
from .processing import InSARProcessor
from .timeseries import analyze_timeseries
from .hotspots import generate_hotspots_geojson

logger = logging.getLogger(__name__)

class SatelliteService:
    """Orchestrates Cache-First reading of Sentinel-1 InSAR products and live trigger API fallbacks"""
    
    def __init__(self):
        self.cache_dir = Path(HYP3_CACHE_DIR)
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def get_status(self) -> SatelliteStatus:
        """Fetch general status of the InSAR satellite system"""
        try:
            scenes = self.list_cached_scenes()
            num_scenes = len(scenes)
            
            # Find latest observation date
            latest_obs_date = None
            histories = self.get_all_zone_histories()
            
            all_timestamps = []
            for h in histories:
                for obs in h.observations:
                    all_timestamps.append(obs.timestamp)
            
            if all_timestamps:
                latest_obs_date = max(all_timestamps)
                
            available = num_scenes > 0
            
            return SatelliteStatus(
                available=available,
                mode=SATELLITE_MODE,
                provider="Sentinel-1 (HyP3 GAMMA)",
                last_observation=latest_obs_date,
                scenes_cached=num_scenes,
                message="Operational" if available else "No InSAR scenes found in local cache. Please run the fetch script."
            )
        except Exception as e:
            logger.error(f"Error checking satellite status: {e}")
            return SatelliteStatus(
                available=False,
                mode=SATELLITE_MODE,
                provider="Sentinel-1 (HyP3)",
                last_observation=None,
                scenes_cached=0,
                message=f"Status check failed: {str(e)}"
            )

    def list_cached_scenes(self) -> List[Dict[str, Any]]:
        """List metadata of all geocoded InSAR products downloaded to the cache directory"""
        scenes = []
        if not self.cache_dir.exists():
            return scenes
            
        # Each folder in the cache directory is an unzipped HyP3 product
        for folder in self.cache_dir.iterdir():
            if folder.is_dir():
                processor = InSARProcessor(folder)
                if processor.is_valid_product():
                    scenes.append({
                        "job_id": processor.metadata["hyp3_job_id"],
                        "reference_date": processor.metadata["reference_date"],
                        "secondary_date": processor.metadata["secondary_date"],
                        "days_interval": processor.metadata["days_interval"],
                        "folder_name": folder.name
                    })
        
        # Sort chronologically by secondary date
        from datetime import datetime
        def get_sec_date(s):
            d = s["secondary_date"]
            return datetime.strptime(d, "%Y-%m-%d") if d else datetime.min
            
        return sorted(scenes, key=get_sec_date)

    def get_all_observations(self) -> List[DeformationObservation]:
        """Extract observations from all cached products"""
        all_obs = []
        if not self.cache_dir.exists():
            return all_obs
            
        for folder in self.cache_dir.iterdir():
            if folder.is_dir():
                processor = InSARProcessor(folder)
                if processor.is_valid_product():
                    observations = processor.process_zone_observations()
                    all_obs.extend(observations)
                    
        return all_obs

    def get_all_zone_histories(self) -> List[ZoneDeformationHistory]:
        """Compute the complete time-series history for all zones"""
        all_obs = self.get_all_observations()
        histories = []
        
        if not all_obs:
            return histories
            
        # Group observations by zone_id
        obs_by_zone = {}
        for zone_id in MONITORING_ZONES.keys():
            obs_by_zone[zone_id] = []
            
        for obs in all_obs:
            if obs.zone_id in obs_by_zone:
                obs_by_zone[obs.zone_id].append(obs)
                
        # Calculate timeseries for each zone
        for zone_id, zone_obs in obs_by_zone.items():
            if zone_obs:
                history = analyze_timeseries(zone_id, zone_obs)
                histories.append(history)
            else:
                # Return empty history for zone
                zone_info = MONITORING_ZONES[zone_id]
                histories.append(
                    ZoneDeformationHistory(
                        zone_id=zone_id,
                        zone_name=zone_info["name"],
                        latitude=zone_info["latitude"],
                        longitude=zone_info["longitude"],
                        description=zone_info["description"],
                        observations=[],
                        latest_velocity_mm_per_day=0.0,
                        latest_acceleration_mm_per_day_sq=0.0,
                        cumulative_deformation_mm=0.0,
                        trend="stable",
                        severity="low",
                        mean_coherence=1.0
                    )
                )
                
        return histories

    def get_zone_history(self, zone_id: str) -> Optional[ZoneDeformationHistory]:
        """Get the time-series history for a single zone"""
        if zone_id not in MONITORING_ZONES:
            return None
            
        histories = self.get_all_zone_histories()
        for h in histories:
            if h.zone_id == zone_id:
                return h
        return None

    def get_hotspots(self) -> Any:
        """Fetch geocoded hotspots in GeoJSON format"""
        histories = self.get_all_zone_histories()
        return generate_hotspots_geojson(histories)
