import numpy as np
import logging
from typing import List, Dict, Any, Tuple
from .models import DeformationObservation, ZoneDeformationHistory
from .config import MONITORING_ZONES

logger = logging.getLogger(__name__)

# Severity Thresholds (mm/day)
VELOCITY_THRESHOLD_CREEP = 0.1      # mm/day (Start of slow creep)
VELOCITY_THRESHOLD_MODERATE = 0.3   # mm/day (Moderate movement)
VELOCITY_THRESHOLD_HIGH = 0.6       # mm/day (High risk movement)
VELOCITY_THRESHOLD_CRITICAL = 1.2   # mm/day (Severe/critical movement)

ACCELERATION_THRESHOLD_ACCEL = 0.01  # mm/day^2

def analyze_timeseries(zone_id: str, observations: List[DeformationObservation]) -> ZoneDeformationHistory:
    """
    Perform time-series calculation for a single zone over a series of sorted observations.
    
    Args:
        zone_id: ID of the zone
        observations: List of all parsed observations for this zone
        
    Returns:
        ZoneDeformationHistory containing calculated velocity, acceleration, and severity
    """
    zone_info = MONITORING_ZONES[zone_id]
    
    # Sort observations by timestamp
    from datetime import datetime
    
    def parse_dt(ts: str) -> datetime:
        try:
            return datetime.strptime(ts, "%Y-%m-%d")
        except ValueError:
            return datetime.fromisoformat(ts)
            
    sorted_obs = sorted(observations, key=lambda o: parse_dt(o.timestamp))
    
    # Filter out invalid observations (low coherence) for math calculations
    valid_obs = [o for o in sorted_obs if o.quality == "good"]
    
    # Fallback to all observations if no good coherence, but mark it
    if not valid_obs:
        valid_obs = sorted_obs
        
    # Calculate cumulative values, velocities, and accelerations
    cumulative_mm = 0.0
    processed_obs = []
    
    for i, obs in enumerate(sorted_obs):
        # Accumulate deformation
        # In InSAR, each pair observation represents displacement *between* ref and sec dates.
        # So cumulative is the running sum of consecutive displacements.
        cumulative_mm += obs.deformation_mm
        
        # Calculate velocity and acceleration
        vel = obs.velocity_mm_per_day
        accel = 0.0
        
        if i > 0:
            # Time delta between previous observation and this one
            dt_prev = parse_dt(sorted_obs[i-1].timestamp)
            dt_curr = parse_dt(obs.timestamp)
            days = max(1, (dt_curr - dt_prev).days)
            
            # Acceleration = Change in velocity / time
            vel_prev = sorted_obs[i-1].velocity_mm_per_day
            accel = (vel - vel_prev) / days
            
        # Create updated observation with rolling cumulative values
        updated_obs = DeformationObservation(
            zone_id=obs.zone_id,
            timestamp=obs.timestamp,
            latitude=obs.latitude,
            longitude=obs.longitude,
            deformation_mm=cumulative_mm, # store cumulative
            velocity_mm_per_day=vel,
            coherence=obs.coherence,
            quality=obs.quality,
            source=obs.source,
            hyp3_job_id=obs.hyp3_job_id
        )
        processed_obs.append(updated_obs)

    # Get latest metrics
    latest_vel = 0.0
    latest_accel = 0.0
    mean_coherence = 1.0
    
    if processed_obs:
        latest_vel = processed_obs[-1].velocity_mm_per_day
        mean_coherence = float(np.mean([o.coherence for o in processed_obs]))
        
        if len(processed_obs) > 1:
            # Recalculate acceleration at the very end
            dt_prev = parse_dt(processed_obs[-2].timestamp)
            dt_curr = parse_dt(processed_obs[-1].timestamp)
            days = max(1, (dt_curr - dt_prev).days)
            latest_accel = (processed_obs[-1].velocity_mm_per_day - processed_obs[-2].velocity_mm_per_day) / days
            
    # Classify trend
    # stable: velocity below creep threshold
    # creeping: velocity above creep threshold, but acceleration is low/stable
    # accelerating: velocity above creep and positive acceleration
    trend = "stable"
    abs_vel = abs(latest_vel)
    
    if abs_vel > VELOCITY_THRESHOLD_CREEP:
        if latest_accel > ACCELERATION_THRESHOLD_ACCEL:
            trend = "accelerating"
        else:
            trend = "creeping"
            
    # Classify Severity Tier
    severity = "low"
    if abs_vel >= VELOCITY_THRESHOLD_CRITICAL:
        severity = "critical"
    elif abs_vel >= VELOCITY_THRESHOLD_HIGH:
        severity = "high"
    elif abs_vel >= VELOCITY_THRESHOLD_MODERATE:
        severity = "moderate"
    else:
        severity = "low"

    return ZoneDeformationHistory(
        zone_id=zone_id,
        zone_name=zone_info["name"],
        latitude=zone_info["latitude"],
        longitude=zone_info["longitude"],
        description=zone_info["description"],
        observations=processed_obs,
        latest_velocity_mm_per_day=latest_vel,
        latest_acceleration_mm_per_day_sq=latest_accel,
        cumulative_deformation_mm=cumulative_mm,
        trend=trend,
        severity=severity,
        mean_coherence=mean_coherence
    )
