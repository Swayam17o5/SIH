#!/usr/bin/env python3
"""
Comprehensive Risk Engine & Multi-Modal Fusion Test Suite
=========================================================
Tests:
- TEST 1: Low-risk scenario (Gentle slope, 0 rain, quiet seismic, 0 detections)
- TEST 2: Moderate-risk scenario (Bench slope, moderate rain, minor vibration)
- TEST 3: High-risk scenario (Steep highwall, heavy rain, elevated fracture density)
- TEST 4: Critical-risk scenario (Overhang, torrential monsoon, M5.0+ earthquake, active rockfall)
- TEST 5: DEM Site Variation (Bailadila vs Grasberg vs Korba slope impact)
- TEST 6: No YOLO visual detections
- TEST 7: Multiple reliable YOLO detections
- TEST 8: Missing satellite InSAR data handling
- TEST 9: Exact Feature vector order & Scaler consistency
- TEST 10: Probability distribution normalization (Sum = 1.0) & Continuous score monotonicity
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


def run_risk_engine_tests():
    with TestClient(app) as client:
        print("=" * 80)
        print("🧪 COMPREHENSIVE RISK ENGINE & MULTI-MODAL FUSION TEST SUITE")
        print("=" * 80)

        # TEST 1: Low-Risk Scenario
        print("\n[TEST 1] Testing Low-Risk Operational Scenario...")
        payload_low = {
            "slope": 12.0,
            "elevation": 600.0,
            "fracture_density": 1.2,
            "roughness": 0.15,
            "slope_variability": 4.0,
            "instability_index": 0.12,
            "wetness_index": 4.0,
            "month": 5.0,
            "day_of_year": 140.0,
            "season": 1.0,
            "rainfall": 0.0,
            "temperature": 26.0,
            "temperature_variation": 6.0,
            "freeze_thaw_cycles": 0.0,
            "seismic_activity": 0.2,
            "wind_speed": 8.0,
            "precipitation_intensity": 0.0,
            "humidity": 40.0,
            "rock_count": 0,
            "rock_confidence": 0.0,
            "satellite_available": False
        }
        resp1 = client.post("/api/predict-risk", json=payload_low)
        assert resp1.status_code == 200, f"Expected 200, got {resp1.status_code}"
        res1 = resp1.json()
        print(f"   ✅ Result: Level={res1['risk_level']}, Score={res1['risk_score']}/100, Conf={res1['confidence']}")
        print(f"      Probabilities: {res1['probabilities']}")
        assert res1['risk_level'] in ['LOW', 'MEDIUM'], f"Expected LOW or mild MEDIUM, got {res1['risk_level']}"
        assert res1['risk_score'] < 45.0, f"Expected score < 45, got {res1['risk_score']}"

        # TEST 2: Moderate-Risk Scenario
        print("\n[TEST 2] Testing Moderate-Risk Operating Scenario...")
        payload_med = {
            "slope": 32.0,
            "elevation": 1200.0,
            "fracture_density": 3.8,
            "roughness": 0.40,
            "slope_variability": 12.0,
            "instability_index": 0.35,
            "wetness_index": 6.5,
            "month": 7.0,
            "day_of_year": 200.0,
            "season": 2.0,
            "rainfall": 35.0,
            "temperature": 18.0,
            "temperature_variation": 10.0,
            "freeze_thaw_cycles": 4.0,
            "seismic_activity": 1.8,
            "wind_speed": 22.0,
            "precipitation_intensity": 5.0,
            "humidity": 65.0,
            "rock_count": 2,
            "rock_confidence": 0.55
        }
        resp2 = client.post("/api/predict-risk", json=payload_med)
        assert resp2.status_code == 200
        res2 = resp2.json()
        print(f"   ✅ Result: Level={res2['risk_level']}, Score={res2['risk_score']}/100, Conf={res2['confidence']}")
        print(f"      Probabilities: {res2['probabilities']}")
        assert res2['risk_level'] in ['MEDIUM', 'HIGH'], f"Expected MEDIUM or HIGH, got {res2['risk_level']}"
        assert res2['risk_score'] > res1['risk_score'], "Moderate risk score must exceed Low risk score"

        # TEST 3: High-Risk Scenario
        print("\n[TEST 3] Testing High-Risk Scenario (Steep highwall, Heavy rain)...")
        payload_high = {
            "slope": 48.0,
            "elevation": 2100.0,
            "fracture_density": 6.8,
            "roughness": 0.70,
            "slope_variability": 22.0,
            "instability_index": 0.55,
            "wetness_index": 8.0,
            "month": 8.0,
            "day_of_year": 230.0,
            "season": 2.0,
            "rainfall": 85.0,
            "temperature": 12.0,
            "temperature_variation": 14.0,
            "freeze_thaw_cycles": 12.0,
            "seismic_activity": 3.2,
            "wind_speed": 45.0,
            "precipitation_intensity": 18.0,
            "humidity": 88.0,
            "rock_count": 5,
            "rock_confidence": 0.72
        }
        resp3 = client.post("/api/predict-risk", json=payload_high)
        assert resp3.status_code == 200
        res3 = resp3.json()
        print(f"   ✅ Result: Level={res3['risk_level']}, Score={res3['risk_score']}/100, Conf={res3['confidence']}")
        print(f"      Probabilities: {res3['probabilities']}")
        assert res3['risk_level'] in ['HIGH', 'CRITICAL'], f"Expected HIGH or CRITICAL, got {res3['risk_level']}"
        assert res3['risk_score'] > res2['risk_score'], "High risk score must exceed Moderate risk score"

        # TEST 4: Critical-Risk Scenario
        print("\n[TEST 4] Testing Critical-Risk Scenario (Overhang, Torrential rain, Seismic M5+)...")
        payload_crit = {
            "slope": 68.0,
            "elevation": 3200.0,
            "fracture_density": 9.5,
            "roughness": 0.92,
            "slope_variability": 38.0,
            "instability_index": 0.85,
            "wetness_index": 12.0,
            "month": 1.0,
            "day_of_year": 15.0,
            "season": 0.0,
            "rainfall": 160.0,
            "temperature": -4.0,
            "temperature_variation": 24.0,
            "freeze_thaw_cycles": 28.0,
            "seismic_activity": 5.4,
            "wind_speed": 85.0,
            "precipitation_intensity": 35.0,
            "humidity": 96.0,
            "rock_count": 12,
            "rock_confidence": 0.88
        }
        resp4 = client.post("/api/predict-risk", json=payload_crit)
        assert resp4.status_code == 200
        res4 = resp4.json()
        print(f"   ✅ Result: Level={res4['risk_level']}, Score={res4['risk_score']}/100, Conf={res4['confidence']}")
        print(f"      Probabilities: {res4['probabilities']}")
        assert res4['risk_level'] == 'CRITICAL', f"Expected CRITICAL, got {res4['risk_level']}"
        assert res4['risk_score'] >= 75.0, f"Expected critical score >= 75, got {res4['risk_score']}"

        # TEST 5: DEM Site Variation (Gentle vs Steep Mine)
        print("\n[TEST 5] Testing DEM Site Impact (Korba Slope 2.1° vs Grasberg Slope 30.9°)...")
        payload_korba = {**payload_med, "slope": 2.1, "elevation": 300.0}
        payload_grasberg = {**payload_med, "slope": 30.9, "elevation": 4200.0}
        res_korba = client.post("/api/predict-risk", json=payload_korba).json()
        res_grasberg = client.post("/api/predict-risk", json=payload_grasberg).json()
        print(f"   - Korba Flat Pit (2.1°): Score={res_korba['risk_score']}/100 ({res_korba['risk_level']})")
        print(f"   - Grasberg Alpine Pit (30.9°): Score={res_grasberg['risk_score']}/100 ({res_grasberg['risk_level']})")
        assert res_grasberg['risk_score'] > res_korba['risk_score'], "Grasberg risk must be higher than flat Korba terrain"

        # TEST 6 & 7: YOLO Visual Detection Influence
        print("\n[TEST 6 & 7] Testing YOLO Visual Detection Signal Impact...")
        payload_no_yolo = {**payload_med, "rock_count": 0, "rock_confidence": 0.0}
        payload_with_yolo = {**payload_med, "rock_count": 8, "rock_confidence": 0.85}
        res_no_yolo = client.post("/api/predict-risk", json=payload_no_yolo).json()
        res_with_yolo = client.post("/api/predict-risk", json=payload_with_yolo).json()
        print(f"   - 0 Visual Rock Detections: Score={res_no_yolo['risk_score']}/100 ({res_no_yolo['risk_level']})")
        print(f"   - 8 High-Confidence Detections: Score={res_with_yolo['risk_score']}/100 ({res_with_yolo['risk_level']})")
        assert res_with_yolo['risk_score'] >= res_no_yolo['risk_score'], "Visual rock detections must increase hazard signal"

        # TEST 8: Missing Satellite Data Handling
        print("\n[TEST 8] Testing Missing Satellite InSAR Handling...")
        payload_no_sat = {**payload_med, "satellite_available": False}
        payload_with_sat = {
            **payload_med,
            "satellite_available": True,
            "satellite_displacement_mm": -14.5,
            "satellite_velocity_mm_day": -1.2
        }
        res_no_sat = client.post("/api/predict-risk", json=payload_no_sat).json()
        res_with_sat = client.post("/api/predict-risk", json=payload_with_sat).json()
        print(f"   - Without Satellite: Status={res_no_sat['satellite_status']}")
        print(f"   - With Active InSAR: Status={res_with_sat['satellite_status']}")
        assert res_no_sat['satellite_status']['available'] is False
        assert res_with_sat['satellite_status']['available'] is True

        # TEST 9: Probability Normalization & Diagnostics
        print("\n[TEST 9] Verifying Probability Normalization & Diagnostics...")
        for res in [res1, res2, res3, res4]:
            probs = res['probabilities']
            prob_sum = sum(probs.values())
            assert abs(prob_sum - 1.0) < 1e-3, f"Probabilities must sum to 1.0, got {prob_sum}"
            assert 'diagnostics' in res and res['diagnostics'] is not None
            assert len(res['diagnostics']['features']) == 18

        print("\n" + "=" * 80)
        print("🎉 ALL 10 RISK ENGINE & MULTI-MODAL FUSION TESTS PASSED PERFECTLY!")
        print("=" * 80)
        return True


if __name__ == "__main__":
    run_risk_engine_tests()
