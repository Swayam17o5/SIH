#!/usr/bin/env python3
"""
DEM (Digital Elevation Model) Analysis Module
============================================

This module provides rigorous terrain analysis for rockfall risk assessment using DEM GeoTIFF files.
Features:
- DEM file loading, CRS validation, and NoData masking
- Geodetic resolution normalization (ground meters)
- Slope calculation (degrees 0-90°) using Sobel / spatial finite differences
- Terrain Ruggedness Index (TRI) and roughness calculation
- Aspect and curvature analysis
- Multi-layer visualization generation (Elevation, Slope, Hillshade, Contours)
- Multi-factor geomorphic risk assessment
"""

import os
import sys
import io
import base64
import math
import numpy as np
import pandas as pd
import rasterio
import rasterio.features
from rasterio.windows import Window
from rasterio.crs import CRS
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.colors as colors
from matplotlib.colors import LinearSegmentedColormap
from matplotlib.patches import Rectangle
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
from scipy import ndimage
import warnings
warnings.filterwarnings('ignore')


class DEMAnalyzer:
    """Analyze DEM files for rockfall risk assessment with true geodetic scaling"""
    
    def __init__(self, dem_path: str = None):
        self.dem_path = dem_path
        self.dem_data = None
        self.transform = None
        self.crs = None
        self.bounds = None
        self.metadata = {}
        self.cell_size_m = 30.0
        self.cell_size_x_m = 30.0
        self.cell_size_y_m = 30.0
        
        # Risk assessment parameters
        self.risk_thresholds = {
            'slope_low': 20.0,       # degrees - gentle/stable
            'slope_medium': 35.0,    # degrees - moderate hazard
            'slope_high': 48.0,      # degrees - critical rockfall zone
            'roughness_tri': 10.0,   # meters - high local relief
        }
        
        if dem_path:
            self.load_dem(dem_path)
    
    def load_dem(self, dem_path: str):
        """
        Load DEM file, extract metadata, handle NoData, and calculate true physical cell size in meters
        """
        try:
            with rasterio.open(dem_path) as src:
                raw_data = src.read(1).astype(np.float64)
                self.transform = src.transform
                self.crs = src.crs
                self.bounds = src.bounds
                nodata_val = src.nodata
                
                # Handle NoData and abnormal sensor spikes
                if nodata_val is not None:
                    raw_data = np.where(raw_data == nodata_val, np.nan, raw_data)
                raw_data = np.where((raw_data < -500.0) | (raw_data > 9000.0), np.nan, raw_data)
                
                self.dem_data = raw_data
                
                # Calculate physical pixel size in meters
                if src.crs and src.crs.is_projected:
                    self.cell_size_x_m = abs(float(src.res[0]))
                    self.cell_size_y_m = abs(float(src.res[1]))
                else:
                    # Geographic WGS84 - convert degree spacing to meters using latitude
                    mid_lat = (src.bounds.top + src.bounds.bottom) / 2.0
                    deg_to_m_lat = 111132.0
                    deg_to_m_lon = 111132.0 * math.cos(math.radians(mid_lat))
                    res_x_deg = abs(src.transform[0])
                    res_y_deg = abs(src.transform[4])
                    self.cell_size_x_m = max(5.0, res_x_deg * deg_to_m_lon)
                    self.cell_size_y_m = max(5.0, res_y_deg * deg_to_m_lat)
                
                self.cell_size_m = (self.cell_size_x_m + self.cell_size_y_m) / 2.0
                
                valid_mask = ~np.isnan(self.dem_data)
                valid_pixels = int(np.sum(valid_mask))
                
                self.metadata = {
                    'width': src.width,
                    'height': src.height,
                    'count': src.count,
                    'dtype': str(src.dtypes[0]) if hasattr(src, 'dtypes') else 'float32',
                    'crs': str(src.crs) if src.crs else 'EPSG:4326',
                    'nodata': nodata_val,
                    'cell_size_m': round(self.cell_size_m, 2),
                    'cell_size_x_m': round(self.cell_size_x_m, 2),
                    'cell_size_y_m': round(self.cell_size_y_m, 2),
                    'valid_pixel_count': valid_pixels,
                    'min_elevation': float(np.nanmin(self.dem_data)) if valid_pixels > 0 else 0.0,
                    'max_elevation': float(np.nanmax(self.dem_data)) if valid_pixels > 0 else 0.0,
                    'mean_elevation': float(np.nanmean(self.dem_data)) if valid_pixels > 0 else 0.0,
                }
                
            self.dem_path = dem_path
            return self.metadata
            
        except Exception as e:
            raise RuntimeError(f"Error loading DEM {dem_path}: {e}")
    
    def calculate_slope(self) -> np.ndarray:
        """
        Calculate true geodetic slope from DEM in degrees (0 - 90°)
        """
        if self.dem_data is None:
            raise ValueError("No DEM data loaded")
        
        # Fill NaN with mean for derivative computation
        valid_mask = ~np.isnan(self.dem_data)
        fill_val = np.nanmean(self.dem_data) if np.any(valid_mask) else 0.0
        dem_filled = np.where(valid_mask, self.dem_data, fill_val)
        
        # Spatial gradients in ground meters: dz/dx and dz/dy
        grad_y, grad_x = np.gradient(dem_filled, self.cell_size_y_m, self.cell_size_x_m)
        grad_mag = np.sqrt(grad_x**2 + grad_y**2)
        slope_rad = np.arctan(grad_mag)
        slope_deg = np.degrees(slope_rad)
        
        # Mask original NaN areas
        slope_deg = np.where(valid_mask, slope_deg, np.nan)
        return slope_deg
    
    def calculate_aspect(self) -> np.ndarray:
        """
        Calculate aspect (compass direction of slope 0-360°) from DEM
        """
        if self.dem_data is None:
            raise ValueError("No DEM data loaded")
        
        valid_mask = ~np.isnan(self.dem_data)
        fill_val = np.nanmean(self.dem_data) if np.any(valid_mask) else 0.0
        dem_filled = np.where(valid_mask, self.dem_data, fill_val)
        
        grad_y, grad_x = np.gradient(dem_filled, self.cell_size_y_m, self.cell_size_x_m)
        # Azimuth: 0=North, 90=East, 180=South, 270=West
        aspect_rad = np.arctan2(-grad_x, grad_y)
        aspect_deg = np.degrees(aspect_rad)
        aspect_deg = np.where(aspect_deg < 0, aspect_deg + 360.0, aspect_deg)
        aspect_deg = np.where(valid_mask, aspect_deg, np.nan)
        return aspect_deg
    
    def calculate_roughness_tri(self) -> np.ndarray:
        """
        Calculate Terrain Ruggedness Index (TRI):
        Mean absolute elevation difference between center cell and 8 surrounding cells (in meters).
        """
        if self.dem_data is None:
            raise ValueError("No DEM data loaded")
        
        valid_mask = ~np.isnan(self.dem_data)
        fill_val = np.nanmean(self.dem_data) if np.any(valid_mask) else 0.0
        dem_filled = np.where(valid_mask, self.dem_data, fill_val)
        
        # TRI kernel: difference from 3x3 uniform mean
        local_mean = ndimage.uniform_filter(dem_filled, size=3)
        tri = np.abs(dem_filled - local_mean)
        tri = np.where(valid_mask, tri, np.nan)
        return tri
    
    def calculate_curvature(self) -> Dict[str, np.ndarray]:
        """
        Calculate surface curvature (Laplacian / profile curvature)
        """
        if self.dem_data is None:
            raise ValueError("No DEM data loaded")
        
        valid_mask = ~np.isnan(self.dem_data)
        fill_val = np.nanmean(self.dem_data) if np.any(valid_mask) else 0.0
        dem_filled = np.where(valid_mask, self.dem_data, fill_val)
        
        grad_y, grad_x = np.gradient(dem_filled, self.cell_size_y_m, self.cell_size_x_m)
        d2x, _ = np.gradient(grad_x, self.cell_size_y_m, self.cell_size_x_m)
        _, d2y = np.gradient(grad_y, self.cell_size_y_m, self.cell_size_x_m)
        laplacian = d2x + d2y
        laplacian = np.where(valid_mask, laplacian, np.nan)
        return {'total_curvature': laplacian}
    
    def compute_comprehensive_statistics(self) -> Dict[str, Any]:
        """
        Extract complete geomorphology metrics from authentic raster data
        """
        slope_grid = self.calculate_slope()
        aspect_grid = self.calculate_aspect()
        tri_grid = self.calculate_roughness_tri()
        curvature_dict = self.calculate_curvature()
        curv_grid = curvature_dict['total_curvature']
        
        valid_dem = self.dem_data[~np.isnan(self.dem_data)]
        valid_slope = slope_grid[~np.isnan(slope_grid)]
        valid_tri = tri_grid[~np.isnan(tri_grid)]
        valid_curv = curv_grid[~np.isnan(curv_grid)]
        
        min_elev = float(np.min(valid_dem))
        max_elev = float(np.max(valid_dem))
        mean_elev = float(np.mean(valid_dem))
        std_elev = float(np.std(valid_dem))
        elev_range = max_elev - min_elev
        
        min_slope = float(np.min(valid_slope))
        max_slope = float(np.max(valid_slope))
        mean_slope = float(np.mean(valid_slope))
        median_slope = float(np.median(valid_slope))
        std_slope = float(np.std(valid_slope))
        
        area_gt_30 = float(np.mean(valid_slope > 30.0) * 100.0)
        area_gt_40 = float(np.mean(valid_slope > 40.0) * 100.0)
        area_gt_48 = float(np.mean(valid_slope > 48.0) * 100.0)
        
        mean_tri = float(np.mean(valid_tri))
        mean_curv = float(np.mean(np.abs(valid_curv)))
        
        # Multi-Factor Geomorphic Risk Index (0 - 100)
        f_slope = min(40.0, (mean_slope / 30.0) * 20.0 + (area_gt_30 / 20.0) * 10.0 + (area_gt_48 / 4.0) * 10.0)
        f_relief = min(30.0, (elev_range / 1200.0) * 20.0 + (mean_tri / 15.0) * 10.0)
        f_highwall = min(20.0, ((max_slope - 15.0) / 60.0) * 20.0 if max_slope > 15.0 else 0.0)
        f_curv = min(10.0, (mean_curv / 0.005) * 10.0)
        
        total_risk_score = round(f_slope + f_relief + f_highwall + f_curv, 1)
        
        if total_risk_score >= 70.0 or area_gt_48 >= 6.0:
            risk_class = "Critical"
        elif total_risk_score >= 42.0 or area_gt_30 >= 10.0:
            risk_class = "High"
        elif total_risk_score >= 22.0 or area_gt_30 >= 3.0:
            risk_class = "Moderate"
        else:
            risk_class = "Low"
            
        # Terrain morphology classification
        if elev_range > 1000:
            terrain_type = "Mountainous High-Relief Open Pit"
        elif elev_range > 500:
            terrain_type = "Deep Quarry / Terraced Pit"
        elif elev_range > 100:
            terrain_type = "Open-Cast Bench Pit"
        else:
            terrain_type = "Low-Relief Excavation"
            
        # Steepest point coordinates
        steep_idx = np.unravel_index(np.nanargmax(slope_grid), slope_grid.shape)
        steep_r, steep_c = int(steep_idx[0]), int(steep_idx[1])
        
        h, w = slope_grid.shape
        steep_point = {
            "row": steep_r,
            "col": steep_c,
            "x_norm": round((steep_c / (w - 1)) - 0.5, 4),
            "y_norm": round((steep_r / (h - 1)) - 0.5, 4),
            "z_elevation": round(float(self.dem_data[steep_r, steep_c]), 1),
            "slope_deg": round(float(slope_grid[steep_r, steep_c]), 1)
        }
        
        valid_pixel_count = len(valid_dem)
        area_m2 = valid_pixel_count * (self.cell_size_m ** 2)
        
        return {
            "min_elevation": round(min_elev, 1),
            "max_elevation": round(max_elev, 1),
            "mean_elevation": round(mean_elev, 1),
            "std_elevation": round(std_elev, 1),
            "elevation_range": round(elev_range, 1),
            "min_slope_deg": round(min_slope, 1),
            "max_slope_deg": round(max_slope, 1),
            "mean_slope_deg": round(mean_slope, 1),
            "median_slope_deg": round(median_slope, 1),
            "std_slope_deg": round(std_slope, 1),
            "slope_area_gt_30": round(area_gt_30, 1),
            "slope_area_gt_40": round(area_gt_40, 1),
            "slope_area_gt_48": round(area_gt_48, 1),
            "roughness_tri": round(mean_tri, 2),
            "curvature": round(mean_curv, 4),
            "risk_score": total_risk_score,
            "risk_level": risk_class,
            "terrain_type": terrain_type,
            "crs": self.metadata.get("crs"),
            "resolution": {
                "x_m": round(self.cell_size_x_m, 1),
                "y_m": round(self.cell_size_y_m, 1),
                "unit": "meters"
            },
            "valid_pixel_count": valid_pixel_count,
            "area_m2": round(area_m2, 2),
            "area_km2": round(area_m2 / 1_000_000.0, 3),
            "steep_point": steep_point
        }

    def generate_mesh3d(self, grid_size: int = 128) -> Dict[str, Any]:
        """
        Downsample raster to uniform NxN grid for WebGL 3D client rendering
        """
        valid_mask = ~np.isnan(self.dem_data)
        fill_val = np.nanmean(self.dem_data) if np.any(valid_mask) else 0.0
        dem_filled = np.where(valid_mask, self.dem_data, fill_val)
        
        h, w = dem_filled.shape
        grid3d = ndimage.zoom(dem_filled, (grid_size / h, grid_size / w), order=1)
        
        # Calculate slope on resampled 3D grid
        dx, dy = np.gradient(grid3d, self.cell_size_m * (w / grid_size))
        grad_mag = np.sqrt(dx**2 + dy**2)
        slope_grid = np.degrees(np.arctan(grad_mag))
        
        steep_idx = np.unravel_index(np.argmax(slope_grid), slope_grid.shape)
        steep_r, steep_c = int(steep_idx[0]), int(steep_idx[1])
        
        steep_point = {
            "row": steep_r,
            "col": steep_c,
            "x_norm": round((steep_c / (grid_size - 1)) - 0.5, 4),
            "y_norm": round((steep_r / (grid_size - 1)) - 0.5, 4),
            "z_elevation": round(float(grid3d[steep_r, steep_c]), 1),
            "slope_deg": round(float(slope_grid[steep_r, steep_c]), 1)
        }
        
        return {
            "width": grid_size,
            "height": grid_size,
            "cellSizeMeters": round(self.cell_size_m * (w / grid_size), 2),
            "elevations": np.round(grid3d, 2).tolist(),
            "slopes": np.round(slope_grid, 2).tolist(),
            "steepPoint": steep_point
        }

    def render_layer_image(self, layer: str = "elevation", site_name: str = "DEM Site") -> str:
        """
        Render 2D visualization image (Elevation, Slope, Hillshade, Contours) and return as Base64 Data URL
        """
        valid_mask = ~np.isnan(self.dem_data)
        fill_val = np.nanmean(self.dem_data) if np.any(valid_mask) else 0.0
        dem_filled = np.where(valid_mask, self.dem_data, fill_val)
        
        # Color palette for elevation
        elevation_colors = [
            '#1b4d3e',  # Dark Forest Green
            '#2e8b57',  # Sea Green
            '#8fbc8f',  # Light Green  
            '#e6c229',  # Gold/Yellow
            '#d97706',  # Amber
            '#b45309',  # Brown
            '#f8fafc'   # Snow White (summit)
        ]
        terrain_cmap = LinearSegmentedColormap.from_list('terrain', elevation_colors, N=256)
        
        # Slope calculation
        grad_y, grad_x = np.gradient(dem_filled, self.cell_size_y_m, self.cell_size_x_m)
        slope_deg = np.degrees(np.arctan(np.sqrt(grad_x**2 + grad_y**2)))
        
        plt.style.use('dark_background')
        fig, ax = plt.subplots(figsize=(10, 8), dpi=100)
        fig.patch.set_facecolor('#0b1329')
        ax.set_facecolor('#0b1329')
        
        if layer == "slope":
            vis_data = slope_deg
            vis_cmap = "inferno"
            cbar_label = "Slope Angle (degrees °)"
            im = ax.imshow(vis_data, cmap=vis_cmap, aspect='equal', interpolation='bilinear', vmin=0, vmax=60)
        elif layer == "hillshade":
            slope_rad = np.arctan(np.sqrt(grad_x**2 + grad_y**2))
            aspect_rad = np.arctan2(-grad_x, grad_y)
            # Solar illumination from NW (315° azim, 45° altitude)
            azimuth = np.radians(315.0)
            altitude = np.radians(45.0)
            shaded = np.sin(altitude) * np.cos(slope_rad) + np.cos(altitude) * np.sin(slope_rad) * np.cos(azimuth - aspect_rad)
            vis_data = (shaded - np.nanmin(shaded)) / (np.nanmax(shaded) - np.nanmin(shaded) + 1e-6) * 255.0
            vis_cmap = "gray"
            cbar_label = "Hillshade Illumination"
            im = ax.imshow(vis_data, cmap=vis_cmap, aspect='equal', interpolation='bilinear')
        elif layer == "contours":
            vis_data = dem_filled
            vis_cmap = terrain_cmap
            cbar_label = "Elevation (meters)"
            im = ax.imshow(vis_data, cmap=vis_cmap, aspect='equal', interpolation='bilinear')
            # 12 contour levels
            min_e, max_e = np.nanmin(dem_filled), np.nanmax(dem_filled)
            if max_e > min_e:
                levels = np.linspace(min_e, max_e, 12)
                ax.contour(dem_filled, levels=levels, colors="white", linewidths=0.6, alpha=0.75)
        else: # Elevation
            vis_data = dem_filled
            vis_cmap = terrain_cmap
            cbar_label = "Elevation (meters above sea level)"
            im = ax.imshow(vis_data, cmap=vis_cmap, aspect='equal', interpolation='bilinear')
            
        cbar = plt.colorbar(im, ax=ax, shrink=0.82, aspect=22, pad=0.03)
        cbar.set_label(cbar_label, color='#e2e8f0', fontsize=11, fontweight='bold')
        cbar.ax.tick_params(colors='#cbd5e1', labelsize=9)
        cbar.outline.set_edgecolor('#334155')
        
        ax.set_title(f"{site_name} — {layer.capitalize()} Map", color='white', fontsize=15, fontweight='bold', pad=15)
        ax.axis('off')
        
        # Informational overlay badge
        min_e = np.nanmin(dem_filled)
        max_e = np.nanmax(dem_filled)
        mean_s = np.nanmean(slope_deg)
        max_s = np.nanmax(slope_deg)
        
        stats_text = (
            f"Elevation: {min_e:.1f}m - {max_e:.1f}m\n"
            f"Mean Slope: {mean_s:.1f}° | Max: {max_s:.1f}°\n"
            f"Resolution: {self.cell_size_m:.1f}m"
        )
        props = dict(boxstyle='round,pad=0.6', facecolor='#0f172a', alpha=0.88, edgecolor='#334155')
        ax.text(0.02, 0.98, stats_text, transform=ax.transAxes, fontsize=9.5,
                verticalalignment='top', color='#38bdf8', bbox=props, fontweight='bold', fontfamily='sans-serif')
        
        plt.tight_layout()
        
        img_buffer = io.BytesIO()
        plt.savefig(img_buffer, format='png', facecolor='#0b1329', bbox_inches='tight', dpi=100)
        img_buffer.seek(0)
        plt.close(fig)
        
        img_base64 = base64.b64encode(img_buffer.getvalue()).decode('utf-8')
        return f"data:image/png;base64,{img_base64}"