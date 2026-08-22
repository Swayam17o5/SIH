import logging
from typing import List
from .models import ZoneDeformationHistory, HotspotGeoJSON, HotspotFeature, HotspotGeometry, HotspotProperties

logger = logging.getLogger(__name__)

def generate_hotspots_geojson(zone_histories: List[ZoneDeformationHistory]) -> HotspotGeoJSON:
    """
    Generate a GeoJSON FeatureCollection of hot spots based on calculated zone histories
    
    Args:
        zone_histories: List of ZoneDeformationHistory objects
        
    Returns:
        HotspotGeoJSON object containing GeoJSON Features
    """
    features = []
    
    for history in zone_histories:
        # Create GeoJSON Feature for each active zone
        geom = HotspotGeometry(
            coordinates=[history.longitude, history.latitude]
        )
        
        # Last observation timestamp
        last_date = "N/A"
        if history.observations:
            last_date = history.observations[-1].timestamp
            
        props = HotspotProperties(
            zone_id=history.zone_id,
            zone_name=history.zone_name,
            velocity_mm_per_day=history.latest_velocity_mm_per_day,
            acceleration_mm_per_day_sq=history.latest_acceleration_mm_per_day_sq,
            cumulative_deformation_mm=history.cumulative_deformation_mm,
            coherence=history.mean_coherence,
            trend=history.trend,
            severity=history.severity,
            last_update=last_date
        )
        
        feature = HotspotFeature(
            geometry=geom,
            properties=props
        )
        features.append(feature)
        
    return HotspotGeoJSON(features=features)
