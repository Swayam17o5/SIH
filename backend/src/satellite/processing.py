import os
import glob
import logging
import numpy as np
try:
    import rasterio
    HAS_RASTERIO = True
except ImportError:
    HAS_RASTERIO = False
    rasterio = None

from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
from .config import MONITORING_ZONES, AOI_CONFIG
from .models import DeformationObservation

logger = logging.getLogger(__name__)

# Constants for Sentinel-1 InSAR processing (C-band)
SENTINEL_WAVELENGTH_MM = 55.462  # 5.5462 cm
PHASE_TO_DISPLACEMENT_FACTOR = -(SENTINEL_WAVELENGTH_MM / (4.0 * np.pi))  # ~ -4.413 mm per radian

def latlon_to_pixel(raster: Any, lat: float, lon: float) -> Tuple[int, int]:
    """Convert latitude/longitude coordinates to pixel x/y indices inside the raster"""
    if not HAS_RASTERIO or raster is None:
        return 0, 0
    row, col = raster.index(lon, lat)
    return int(row), int(col)

def extract_point_value(raster: Any, lat: float, lon: float, band: int = 1) -> Optional[float]:
    """Extract cell value at specific lat/lon coordinate from a raster band"""
    if not HAS_RASTERIO or raster is None:
        return None
    try:
        row, col = latlon_to_pixel(raster, lat, lon)
        if 0 <= row < raster.height and 0 <= col < raster.width:
            val = float(raster.read(band)[row, col])
            if raster.nodata is not None and val == raster.nodata:
                return None
            if np.isnan(val):
                return None
            return val
    except Exception as e:
        logger.error(f"Error extracting raster coordinate ({lat}, {lon}): {e}")
    return None

class InSARProcessor:
    """Processes HyP3 InSAR GAMMA GeoTIFF outputs using rasterio"""
    
    def __init__(self, product_dir: Path):
        self.product_dir = Path(product_dir)
        self.unw_phase_path = self._find_file("*_unw_phase.tif")
        self.coherence_path = self._find_file("*_corr.tif")
        self.metadata = self._parse_metadata()

    def _find_file(self, pattern: str) -> Optional[Path]:
        """Find a file inside the product directory matching the pattern"""
        matches = list(self.product_dir.glob(pattern))
        if not matches:
            # Try recursive glob
            matches = list(self.product_dir.glob("**/ " + pattern))
        if matches:
            return matches[0]
        return None

    def _parse_metadata(self) -> Dict[str, Any]:
        """Extract timestamps and metadata from folder name or file names"""
        meta = {
            "reference_date": None,
            "secondary_date": None,
            "days_interval": 12, # default
            "hyp3_job_id": self.product_dir.name
        }
        
        # HyP3 product folders are usually named like:
        # S1AA_YYYYMMDD_YYYYMMDD_... or similar.
        # Let's extract date pairs
        import re
        folder_name = self.product_dir.name
        # Match YYYYMMDD dates
        dates = re.findall(r"\d{8}", folder_name)
        if len(dates) >= 2:
            try:
                ref_dt = datetime_from_str(dates[0])
                sec_dt = datetime_from_str(dates[1])
                # Ensure they are sorted (ref is earlier)
                dates_sorted = sorted([ref_dt, sec_dt])
                meta["reference_date"] = dates_sorted[0].strftime("%Y-%m-%d")
                meta["secondary_date"] = dates_sorted[1].strftime("%Y-%m-%d")
                
                delta = dates_sorted[1] - dates_sorted[0]
                meta["days_interval"] = max(1, delta.days)
            except Exception as e:
                logger.warning(f"Could not parse dates from folder name {folder_name}: {e}")
                
        return meta

    def is_valid_product(self) -> bool:
        """Check if unwrapped phase and coherence rasters exist"""
        return self.unw_phase_path is not None and self.unw_phase_path.exists()

    def process_zone_observations(self) -> List[DeformationObservation]:
        """
        Extract deformation and coherence for each configured zone in config.py
        
        Returns:
            List of DeformationObservation models
        """
        observations = []
        if not self.is_valid_product():
            logger.warning(f"InSAR product {self.product_dir} is invalid or incomplete.")
            return observations

        # Open both rasters
        try:
            with rasterio.open(self.unw_phase_path) as unw_src, rasterio.open(self.coherence_path) as corr_src:
                
                # Check for same CRS or coordinate system
                for zone_id, zone_info in MONITORING_ZONES.items():
                    lat = zone_info["latitude"]
                    lon = zone_info["longitude"]
                    
                    unw_phase_val = extract_point_value(unw_src, lat, lon)
                    coherence_val = extract_point_value(corr_src, lat, lon)
                    
                    if unw_phase_val is None or coherence_val is None:
                        # Skip if coordinate falls outside raster or is nodata
                        continue
                        
                    # Convert unwrapped phase to displacement in mm
                    displacement_mm = unw_phase_val * PHASE_TO_DISPLACEMENT_FACTOR
                    
                    # Calculate velocity for this pair (displacement over the days interval)
                    days = self.metadata["days_interval"]
                    velocity_day = displacement_mm / days
                    
                    # Quality assessment based on coherence threshold (standard threshold: 0.3)
                    quality = "good"
                    if coherence_val < 0.3:
                        quality = "low_coherence"
                    
                    # Create Pydantic observation model
                    obs = DeformationObservation(
                        zone_id=zone_id,
                        timestamp=self.metadata["secondary_date"] or "2026-08-22",
                        latitude=lat,
                        longitude=lon,
                        deformation_mm=displacement_mm,
                        velocity_mm_per_day=velocity_day,
                        coherence=coherence_val,
                        quality=quality,
                        source="hyp3_insar_gamma",
                        hyp3_job_id=self.metadata["hyp3_job_id"]
                    )
                    observations.append(obs)
                    
        except Exception as e:
            logger.error(f"Error reading InSAR rasters: {e}")
            
        return observations

def datetime_from_str(date_str: str) -> Any:
    """Parse YYYYMMDD date string"""
    from datetime import datetime
    return datetime.strptime(date_str, "%Y%m%d")
