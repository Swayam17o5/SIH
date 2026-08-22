import os
from pathlib import Path
from dotenv import load_dotenv

# Resolve paths
backend_root = Path(__file__).resolve().parent.parent.parent
load_dotenv(backend_root / ".env")

# Satellite Mode: "demo" (reads from cache only) or "live" (interacts with HyP3 API)
SATELLITE_MODE = os.getenv("SATELLITE_MODE", "demo").lower()

# Earthdata Credentials (required for live mode)
EARTHDATA_USERNAME = os.getenv("EARTHDATA_USERNAME", "")
EARTHDATA_PASSWORD = os.getenv("EARTHDATA_PASSWORD", "")

# Cache Directory for HyP3 products
HYP3_CACHE_DIR = Path(os.getenv("HYP3_CACHE_DIR", str(backend_root / "data" / "satellite_cache")))
HYP3_CACHE_DIR.mkdir(parents=True, exist_ok=True)

# Area of Interest (AOI) configuration - Bingham Canyon Mine
# Note: Coordinate system is WGS84 (EPSG:4326)
AOI_CONFIG = {
    "id": "bingham_canyon",
    "name": "Bingham Canyon Mine",
    "location": "Utah, USA",
    "crs": "EPSG:4326",
    # Bounding Box: [left, bottom, right, top]
    "bbox": [-112.17965, 40.49576, -112.10196, 40.57134],
    "center": {"lat": 40.5335, "lon": -112.1408},
    # Sentinel-1 target tracking parameter (Ascending orbit path)
    "sentinel_track": 137,
    "associated_dem_id": "bingham_canyon"
}

# Monitoring Zones (Centroids in the AOI)
MONITORING_ZONES = {
    "zone_01": {
        "id": "zone_01",
        "name": "Main Pit East Wall",
        "latitude": 40.5312,
        "longitude": -112.1380,
        "description": "Steep eastern wall inside the primary copper extraction pit."
    },
    "zone_02": {
        "id": "zone_02",
        "name": "Main Pit West Wall",
        "latitude": 40.5348,
        "longitude": -112.1460,
        "description": "Western mining benches subject to active haulage traffic."
    },
    "zone_03": {
        "id": "zone_03",
        "name": "North Highwall Sector",
        "latitude": 40.5420,
        "longitude": -112.1410,
        "description": "High-elevation northern rim showing historical structural faults."
    },
    "zone_04": {
        "id": "zone_04",
        "name": "South Tailings Boundary",
        "latitude": 40.5180,
        "longitude": -112.1320,
        "description": "Boundary monitoring for secondary tailings storage/waste heaps."
    },
    "zone_05": {
        "id": "zone_05",
        "name": "Active Overburden Dump",
        "latitude": 40.5250,
        "longitude": -112.1520,
        "description": "Waste rock dumping zone with continuous active loading."
    }
}
