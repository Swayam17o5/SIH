#!/usr/bin/env python3
"""
Test Suite for FastAPI DEM Endpoints
====================================
Tests:
- GET /api/dem/files
- GET /api/dem/analyze/{dem_id} (for multiple mines, multiple layers)
- GET /api/dem/compare (for 2 and 3 mines)
- Error handling (invalid ID, invalid layer)
"""

import sys
import json
from pathlib import Path

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

backend_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_api_dem_endpoints():
    print("=" * 70)
    print("🧪 TESTING FASTAPI DEM ANALYSIS ENDPOINTS")
    print("=" * 70)

    # 1. Test /api/dem/files
    print("\n1. Testing GET /api/dem/files...")
    resp = client.get("/api/dem/files")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    files_data = resp.json()
    files = files_data.get("files", [])
    print(f"   ✅ Returned {len(files)} registered DEM mines.")
    assert len(files) == 16, f"Expected 16 mines, got {len(files)}"
    
    # Check Indian and International breakdown
    indian = [f for f in files if f.get("country") == "India"]
    intl = [f for f in files if f.get("country") != "India"]
    print(f"   🇮🇳 Indian mines: {len(indian)}")
    print(f"   🌍 International mines: {len(intl)}")
    assert len(indian) == 6, f"Expected 6 Indian mines, got {len(indian)}"
    assert len(intl) == 10, f"Expected 10 International mines, got {len(intl)}"

    # 2. Test /api/dem/analyze/{dem_id} with different layers
    test_mines = ["bailadila_iron_mine", "chuquicamata", "bingham_canyon", "grasberg"]
    layers = ["elevation", "slope", "hillshade", "contours"]

    print("\n2. Testing GET /api/dem/analyze/{dem_id} across layers...")
    for mine_id in test_mines:
        for layer in layers:
            resp = client.get(f"/api/dem/analyze/{mine_id}?layer={layer}")
            assert resp.status_code == 200, f"Expected 200 for {mine_id} ({layer}), got {resp.status_code}"
            data = resp.json()
            assert data["dem_id"] == mine_id
            assert data["layer"] == layer
            assert data["image_url"].startswith("data:image/png;base64,")
            stats = data["statistics"]
            assert "min_elevation" in stats
            assert "max_elevation" in stats
            assert "mean_slope_deg" in stats
            assert "max_slope_deg" in stats
            assert "roughness_tri" in stats
            assert "curvature" in stats
            assert "mesh3d" in data
            print(f"   ✅ {mine_id} ({layer:<9}): Elev={stats['min_elevation']:.0f}-{stats['max_elevation']:.0f}m, Slope={stats['mean_slope_deg']:.1f}° (Max {stats['max_slope_deg']:.1f}°), TRI={stats['roughness_tri']:.2f}m")

    # 3. Test /api/dem/compare
    print("\n3. Testing GET /api/dem/compare with 3 mines...")
    resp = client.get("/api/dem/compare?ids=bailadila_iron_mine&ids=malanjkhand_copper_mine&ids=chuquicamata")
    assert resp.status_code == 200, f"Expected 200 for compare, got {resp.status_code}"
    comp_data = resp.json()
    comparisons = comp_data.get("comparisons", [])
    assert len(comparisons) == 3, f"Expected 3 comparisons, got {len(comparisons)}"
    print("   ✅ Returned 3-way comparison matrix:")
    for comp in comparisons:
        stats = comp["statistics"]
        src = comp["source_info"]
        print(f"      - {src['name']} ({src['country']}): Elev Range={stats['elevation_range']}m, Mean Slope={stats['mean_slope_deg']}°, TRI={stats['roughness_tri']}m")

    # 4. Test error cases
    print("\n4. Testing API Error Cases...")
    resp = client.get("/api/dem/analyze/non_existent_mine")
    assert resp.status_code == 404, f"Expected 404 for unknown mine, got {resp.status_code}"
    print("   ✅ Unknown mine returned HTTP 404")

    resp = client.get("/api/dem/analyze/bailadila_iron_mine?layer=invalid_layer")
    assert resp.status_code == 422, f"Expected 422 for invalid layer, got {resp.status_code}"
    print("   ✅ Invalid layer returned HTTP 422")

    print("\n" + "=" * 70)
    print("🎉 ALL FASTAPI DEM ENDPOINT TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)
    return True


if __name__ == "__main__":
    test_api_dem_endpoints()
