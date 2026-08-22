#!/usr/bin/env python3
"""
DEM (Digital Elevation Model) Analysis Module
============================================

This module provides terrain analysis for rockfall risk assessment using DEM files.
Features:
- DEM file loading and processing
- Slope analysis and gradient calculation
- Terrain stability assessment
- Risk mapping and visualization
- Geological feature identification
"""

import os
import numpy as np
import pandas as pd
import rasterio
import rasterio.features
from rasterio.windows import Window
from rasterio.warp import calculate_default_transform, reproject, Resampling
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.colors as colors
from matplotlib.patches import Rectangle
import seaborn as sns
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from scipy import ndimage
from sklearn.cluster import DBSCAN
import warnings
warnings.filterwarnings('ignore')


class DEMAnalyzer:
    """Analyze DEM files for rockfall risk assessment"""
    
    def __init__(self, dem_path: str = None):
        """
        Initialize DEM analyzer
        
        Args:
            dem_path: Path to DEM file (.tif)
        """
        self.dem_path = dem_path
        self.dem_data = None
        self.transform = None
        self.crs = None
        self.bounds = None
        self.metadata = {}
        
        # Risk assessment parameters
        self.risk_thresholds = {
            'slope_low': 15,      # degrees - low risk threshold
            'slope_medium': 30,   # degrees - medium risk threshold  
            'slope_high': 45,     # degrees - high risk threshold
            'elevation_change': 50,  # meters - significant elevation change
            'roughness_threshold': 2.0,  # terrain roughness indicator
        }
        
        print("DEM Analyzer initialized")
        if dem_path:
            self.load_dem(dem_path)
    
    def load_dem(self, dem_path: str):
        """
        Load DEM file and extract metadata
        
        Args:
            dem_path: Path to DEM file
        """
        try:
            with rasterio.open(dem_path) as src:
                self.dem_data = src.read(1)  # Read first band
                self.transform = src.transform
                self.crs = src.crs
                self.bounds = src.bounds
                self.metadata = {
                    'width': src.width,
                    'height': src.height,
                    'count': src.count,
                    'dtype': str(src.dtypes[0]) if hasattr(src, 'dtypes') else 'float32',
                    'crs': str(src.crs),
                    'nodata': src.nodata
                }
            
            # Handle nodata values
            if self.metadata['nodata'] is not None:
                self.dem_data = np.where(
                    self.dem_data == self.metadata['nodata'], 
                    np.nan, 
                    self.dem_data
                )
            
            print(f"✅ DEM loaded successfully: {Path(dem_path).name}")
            print(f"   Size: {self.metadata['width']} x {self.metadata['height']}")
            print(f"   Elevation range: {np.nanmin(self.dem_data):.1f} - {np.nanmax(self.dem_data):.1f} m")
            print(f"   CRS: {self.metadata['crs']}")
            
            self.dem_path = dem_path
            
        except Exception as e:
            print(f"❌ Error loading DEM: {e}")
            raise
    
    def calculate_slope(self) -> np.ndarray:
        """
        Calculate slope from DEM in degrees
        
        Returns:
            Slope array in degrees
        """
        if self.dem_data is None:
            raise ValueError("No DEM data loaded")
        
        # Calculate gradients using Sobel operators
        grad_x = ndimage.sobel(self.dem_data, axis=1)
        grad_y = ndimage.sobel(self.dem_data, axis=0)
        
        # Calculate slope magnitude in radians, then convert to degrees
        slope_rad = np.arctan(np.sqrt(grad_x**2 + grad_y**2))
        slope_deg = np.degrees(slope_rad)
        
        return slope_deg
    
    def calculate_aspect(self) -> np.ndarray:
        """
        Calculate aspect (direction of slope) from DEM in degrees
        
        Returns:
            Aspect array in degrees (0-360)
        """
        if self.dem_data is None:
            raise ValueError("No DEM data loaded")
        
        # Calculate gradients
        grad_x = ndimage.sobel(self.dem_data, axis=1)
        grad_y = ndimage.sobel(self.dem_data, axis=0)
        
        # Calculate aspect in radians, then convert to degrees
        aspect_rad = np.arctan2(-grad_x, grad_y)
        aspect_deg = np.degrees(aspect_rad)
        
        # Convert to 0-360 range
        aspect_deg = np.where(aspect_deg < 0, aspect_deg + 360, aspect_deg)
        
        return aspect_deg
    
    def calculate_curvature(self) -> Dict[str, np.ndarray]:
        """
        Calculate terrain curvature (concavity/convexity)
        
        Returns:
            Dictionary with profile and plan curvature
        """
        if self.dem_data is None:
            raise ValueError("No DEM data loaded")
        
        # Calculate second derivatives
        dem_smooth = ndimage.gaussian_filter(self.dem_data, sigma=1)
        
        # First derivatives
        dz_dx = ndimage.sobel(dem_smooth, axis=1)
        dz_dy = ndimage.sobel(dem_smooth, axis=0)
        
        # Second derivatives
        d2z_dx2 = ndimage.sobel(dz_dx, axis=1)
        d2z_dy2 = ndimage.sobel(dz_dy, axis=0)
        d2z_dxdy = ndimage.sobel(dz_dx, axis=0)
        
        # Profile curvature (curvature in direction of maximum slope)
        p = dz_dx**2 + dz_dy**2
        profile_curvature = np.where(
            p != 0,
            (d2z_dx2 * dz_dx**2 + 2 * d2z_dxdy * dz_dx * dz_dy + d2z_dy2 * dz_dy**2) / 
            (p * np.sqrt(1 + p)),
            0
        )
        
        # Plan curvature (curvature perpendicular to direction of maximum slope)
        plan_curvature = np.where(
            p != 0,
            (d2z_dx2 * dz_dy**2 - 2 * d2z_dxdy * dz_dx * dz_dy + d2z_dy2 * dz_dx**2) / 
            (p * (1 + p)),
            0
        )
        
        return {
            'profile_curvature': profile_curvature,
            'plan_curvature': plan_curvature
        }
    
    def calculate_roughness(self, window_size: int = 3) -> np.ndarray:
        """
        Calculate terrain roughness index
        
        Args:
            window_size: Size of moving window for calculation
            
        Returns:
            Roughness array
        """
        if self.dem_data is None:
            raise ValueError("No DEM data loaded")
        
        # Calculate local standard deviation as roughness measure
        kernel = np.ones((window_size, window_size))
        local_mean = ndimage.convolve(self.dem_data, kernel) / (window_size**2)
        local_var = ndimage.convolve(self.dem_data**2, kernel) / (window_size**2) - local_mean**2
        roughness = np.sqrt(np.maximum(local_var, 0))
        
        return roughness
    
    def assess_rockfall_risk(self) -> Dict[str, np.ndarray]:
        """
        Assess rockfall risk based on terrain characteristics
        
        Returns:
            Dictionary with risk assessments and component maps
        """
        print("🔍 Calculating terrain characteristics...")
        
        # Calculate terrain derivatives
        slope = self.calculate_slope()
        aspect = self.calculate_aspect()
        curvature = self.calculate_curvature()
        roughness = self.calculate_roughness()
        
        print("📊 Assessing rockfall risk factors...")
        
        # 1. Slope-based risk (primary factor)
        slope_risk = np.zeros_like(slope)
        slope_risk = np.where(slope >= self.risk_thresholds['slope_high'], 3, slope_risk)  # High risk
        slope_risk = np.where(
            (slope >= self.risk_thresholds['slope_medium']) & 
            (slope < self.risk_thresholds['slope_high']), 2, slope_risk
        )  # Medium risk
        slope_risk = np.where(
            (slope >= self.risk_thresholds['slope_low']) & 
            (slope < self.risk_thresholds['slope_medium']), 1, slope_risk
        )  # Low risk
        
        # 2. Curvature-based risk (convex areas more prone to failure)
        profile_curvature = curvature['profile_curvature']
        curvature_risk = np.zeros_like(profile_curvature)
        curvature_risk = np.where(profile_curvature > 0.01, 1, curvature_risk)  # Convex areas
        curvature_risk = np.where(profile_curvature > 0.05, 2, curvature_risk)  # Highly convex
        
        # 3. Roughness-based risk (rough terrain indicates instability)
        roughness_risk = np.zeros_like(roughness)
        roughness_risk = np.where(
            roughness > self.risk_thresholds['roughness_threshold'], 1, roughness_risk
        )
        
        # 4. Aspect-based risk (certain orientations more susceptible)
        # South-facing slopes (135-225°) often have higher risk due to freeze-thaw cycles
        aspect_risk = np.zeros_like(aspect)
        south_facing = ((aspect >= 135) & (aspect <= 225))
        aspect_risk = np.where(south_facing, 1, aspect_risk)
        
        # 5. Combined risk assessment
        # Weight factors: slope (50%), curvature (25%), roughness (15%), aspect (10%)
        combined_risk = (
            slope_risk * 0.5 +
            curvature_risk * 0.25 +
            roughness_risk * 0.15 +
            aspect_risk * 0.10
        )
        
        # Normalize to 0-1 scale
        combined_risk = combined_risk / np.nanmax(combined_risk) if np.nanmax(combined_risk) > 0 else combined_risk
        
        # Classify final risk levels
        risk_classification = np.zeros_like(combined_risk)
        risk_classification = np.where(combined_risk >= 0.7, 3, risk_classification)  # High
        risk_classification = np.where(
            (combined_risk >= 0.4) & (combined_risk < 0.7), 2, risk_classification
        )  # Medium
        risk_classification = np.where(
            (combined_risk >= 0.2) & (combined_risk < 0.4), 1, risk_classification
        )  # Low
        
        results = {
            'slope': slope,
            'aspect': aspect,
            'profile_curvature': profile_curvature,
            'plan_curvature': curvature['plan_curvature'],
            'roughness': roughness,
            'slope_risk': slope_risk,
            'curvature_risk': curvature_risk,
            'roughness_risk': roughness_risk,
            'aspect_risk': aspect_risk,
            'combined_risk': combined_risk,
            'risk_classification': risk_classification
        }
        
        # Calculate statistics
        total_pixels = np.sum(~np.isnan(combined_risk))
        high_risk_pixels = np.sum(risk_classification == 3)
        medium_risk_pixels = np.sum(risk_classification == 2)
        low_risk_pixels = np.sum(risk_classification == 1)
        
        print(f"📈 Risk Assessment Summary:")
        print(f"   High risk areas: {high_risk_pixels/total_pixels*100:.1f}% ({high_risk_pixels} pixels)")
        print(f"   Medium risk areas: {medium_risk_pixels/total_pixels*100:.1f}% ({medium_risk_pixels} pixels)")
        print(f"   Low risk areas: {low_risk_pixels/total_pixels*100:.1f}% ({low_risk_pixels} pixels)")
        print(f"   Safe areas: {(total_pixels-high_risk_pixels-medium_risk_pixels-low_risk_pixels)/total_pixels*100:.1f}%")
        
        return results
    
    def identify_critical_zones(self, risk_results: Dict[str, np.ndarray], 
                              min_area: int = 100) -> List[Dict]:
        """
        Identify contiguous high-risk zones
        
        Args:
            risk_results: Results from assess_rockfall_risk()
            min_area: Minimum area (pixels) for critical zone
            
        Returns:
            List of critical zone information
        """
        risk_classification = risk_results['risk_classification']
        
        # Focus on high-risk areas
        high_risk_mask = (risk_classification == 3)
        
        # Label connected components
        labeled_zones, num_zones = ndimage.label(high_risk_mask)
        
        critical_zones = []
        
        for zone_id in range(1, num_zones + 1):
            zone_mask = (labeled_zones == zone_id)
            zone_size = np.sum(zone_mask)
            
            if zone_size >= min_area:
                # Calculate zone statistics
                zone_indices = np.where(zone_mask)
                zone_rows, zone_cols = zone_indices
                
                # Get bounding box
                min_row, max_row = np.min(zone_rows), np.max(zone_rows)
                min_col, max_col = np.min(zone_cols), np.max(zone_cols)
                
                # Calculate zone characteristics
                zone_slope = risk_results['slope'][zone_mask]
                zone_elevation = self.dem_data[zone_mask]
                
                zone_info = {
                    'zone_id': zone_id,
                    'area_pixels': zone_size,
                    'bounding_box': {
                        'min_row': int(min_row),
                        'max_row': int(max_row),
                        'min_col': int(min_col),
                        'max_col': int(max_col)
                    },
                    'statistics': {
                        'mean_slope': float(np.nanmean(zone_slope)),
                        'max_slope': float(np.nanmax(zone_slope)),
                        'mean_elevation': float(np.nanmean(zone_elevation)),
                        'elevation_range': float(np.nanmax(zone_elevation) - np.nanmin(zone_elevation))
                    },
                    'risk_level': 'HIGH',
                    'priority': 'IMMEDIATE' if zone_size > 500 else 'HIGH'
                }
                
                critical_zones.append(zone_info)
        
        # Sort by area (largest first)
        critical_zones.sort(key=lambda x: x['area_pixels'], reverse=True)
        
        print(f"🎯 Identified {len(critical_zones)} critical zones requiring immediate attention")
        
        return critical_zones
    
    def create_risk_visualization(self, risk_results: Dict[str, np.ndarray], 
                                critical_zones: List[Dict] = None,
                                save_path: str = None) -> str:
        """
        Create comprehensive risk visualization
        
        Args:
            risk_results: Results from assess_rockfall_risk()
            critical_zones: Results from identify_critical_zones()
            save_path: Path to save the plot
            
        Returns:
            Path to saved plot
        """
        fig, axes = plt.subplots(2, 3, figsize=(20, 12))
        fig.suptitle(f'Rockfall Risk Analysis - {Path(self.dem_path).stem}', fontsize=16)
        
        # Define color maps
        risk_colors = ['green', 'yellow', 'orange', 'red']
        risk_cmap = colors.ListedColormap(risk_colors)
        
        # Plot 1: Original DEM
        ax1 = axes[0, 0]
        dem_plot = ax1.imshow(self.dem_data, cmap='terrain', aspect='equal')
        ax1.set_title('Digital Elevation Model')
        ax1.set_xlabel('Pixel X')
        ax1.set_ylabel('Pixel Y')
        plt.colorbar(dem_plot, ax=ax1, label='Elevation (m)')
        
        # Plot 2: Slope
        ax2 = axes[0, 1]
        slope_plot = ax2.imshow(risk_results['slope'], cmap='Reds', aspect='equal')
        ax2.set_title('Slope (degrees)')
        ax2.set_xlabel('Pixel X')
        ax2.set_ylabel('Pixel Y')
        plt.colorbar(slope_plot, ax=ax2, label='Slope (°)')
        
        # Plot 3: Curvature
        ax3 = axes[0, 2]
        curvature_plot = ax3.imshow(risk_results['profile_curvature'], 
                                   cmap='RdBu_r', aspect='equal',
                                   vmin=-0.1, vmax=0.1)
        ax3.set_title('Profile Curvature')
        ax3.set_xlabel('Pixel X')
        ax3.set_ylabel('Pixel Y')
        plt.colorbar(curvature_plot, ax=ax3, label='Curvature')
        
        # Plot 4: Roughness
        ax4 = axes[1, 0]
        roughness_plot = ax4.imshow(risk_results['roughness'], cmap='viridis', aspect='equal')
        ax4.set_title('Terrain Roughness')
        ax4.set_xlabel('Pixel X')
        ax4.set_ylabel('Pixel Y')
        plt.colorbar(roughness_plot, ax=ax4, label='Roughness')
        
        # Plot 5: Combined Risk
        ax5 = axes[1, 1]
        risk_plot = ax5.imshow(risk_results['combined_risk'], cmap='Reds', aspect='equal')
        ax5.set_title('Combined Risk Score')
        ax5.set_xlabel('Pixel X')
        ax5.set_ylabel('Pixel Y')
        plt.colorbar(risk_plot, ax=ax5, label='Risk Score')
        
        # Plot 6: Risk Classification with Critical Zones
        ax6 = axes[1, 2]
        classification_plot = ax6.imshow(risk_results['risk_classification'], 
                                       cmap=risk_cmap, aspect='equal',
                                       vmin=0, vmax=3)
        ax6.set_title('Risk Classification')
        ax6.set_xlabel('Pixel X')
        ax6.set_ylabel('Pixel Y')
        
        # Add colorbar with custom labels
        cbar = plt.colorbar(classification_plot, ax=ax6, ticks=[0, 1, 2, 3])
        cbar.set_ticklabels(['Safe', 'Low Risk', 'Medium Risk', 'High Risk'])
        
        # Overlay critical zones
        if critical_zones:
            for i, zone in enumerate(critical_zones[:10]):  # Show top 10 zones
                bbox = zone['bounding_box']
                rect = Rectangle(
                    (bbox['min_col'], bbox['min_row']),
                    bbox['max_col'] - bbox['min_col'],
                    bbox['max_row'] - bbox['min_row'],
                    linewidth=2, edgecolor='white', facecolor='none'
                )
                ax6.add_patch(rect)
                
                # Add zone label
                center_x = (bbox['min_col'] + bbox['max_col']) // 2
                center_y = (bbox['min_row'] + bbox['max_row']) // 2
                ax6.text(center_x, center_y, str(i+1), 
                        ha='center', va='center', color='white', 
                        fontweight='bold', fontsize=10)
        
        plt.tight_layout()
        
        # Save plot
        if not save_path:
            output_dir = Path(__file__).parent.parent.parent / "outputs"
            output_dir.mkdir(exist_ok=True)
            dem_name = Path(self.dem_path).stem
            save_path = output_dir / f"risk_analysis_{dem_name}.png"
        
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        plt.close()
        
        return str(save_path)
    
    def generate_report(self, risk_results: Dict[str, np.ndarray], 
                       critical_zones: List[Dict] = None) -> Dict:
        """
        Generate comprehensive risk assessment report
        
        Args:
            risk_results: Results from assess_rockfall_risk()
            critical_zones: Results from identify_critical_zones()
            
        Returns:
            Comprehensive report dictionary
        """
        # Calculate overall statistics
        total_pixels = np.sum(~np.isnan(risk_results['combined_risk']))
        high_risk_pixels = np.sum(risk_results['risk_classification'] == 3)
        medium_risk_pixels = np.sum(risk_results['risk_classification'] == 2)
        low_risk_pixels = np.sum(risk_results['risk_classification'] == 1)
        safe_pixels = total_pixels - high_risk_pixels - medium_risk_pixels - low_risk_pixels
        
        # Slope statistics
        slope_mean = float(np.nanmean(risk_results['slope']))
        slope_max = float(np.nanmax(risk_results['slope']))
        slope_std = float(np.nanstd(risk_results['slope']))
        
        # Elevation statistics
        elev_mean = float(np.nanmean(self.dem_data))
        elev_range = float(np.nanmax(self.dem_data) - np.nanmin(self.dem_data))
        
        report = {
            'analysis_timestamp': pd.Timestamp.now().isoformat(),
            'dem_file': str(self.dem_path),
            'dem_metadata': self.metadata,
            'terrain_statistics': {
                'elevation_mean': elev_mean,
                'elevation_range': elev_range,
                'slope_mean': slope_mean,
                'slope_max': slope_max,
                'slope_std': slope_std
            },
            'risk_distribution': {
                'total_area_pixels': int(total_pixels),
                'high_risk': {
                    'pixels': int(high_risk_pixels),
                    'percentage': float(high_risk_pixels / total_pixels * 100)
                },
                'medium_risk': {
                    'pixels': int(medium_risk_pixels),
                    'percentage': float(medium_risk_pixels / total_pixels * 100)
                },
                'low_risk': {
                    'pixels': int(low_risk_pixels),
                    'percentage': float(low_risk_pixels / total_pixels * 100)
                },
                'safe': {
                    'pixels': int(safe_pixels),
                    'percentage': float(safe_pixels / total_pixels * 100)
                }
            },
            'critical_zones': critical_zones or [],
            'recommendations': self._generate_recommendations(
                risk_results, critical_zones, high_risk_pixels / total_pixels
            )
        }
        
        return report
    
    def _generate_recommendations(self, risk_results: Dict, critical_zones: List[Dict], 
                                high_risk_ratio: float) -> List[str]:
        """Generate recommendations based on analysis results"""
        recommendations = []
        
        if high_risk_ratio > 0.2:
            recommendations.append("URGENT: Over 20% of area classified as high risk - immediate assessment required")
        elif high_risk_ratio > 0.1:
            recommendations.append("HIGH PRIORITY: Significant high-risk areas identified - schedule detailed survey")
        
        if critical_zones:
            large_zones = [z for z in critical_zones if z['area_pixels'] > 1000]
            if large_zones:
                recommendations.append(f"CRITICAL: {len(large_zones)} large high-risk zones require immediate monitoring")
        
        # Slope-based recommendations
        max_slope = float(np.nanmax(risk_results['slope']))
        if max_slope > 60:
            recommendations.append("EXTREME SLOPES: Areas with >60° slopes present extreme rockfall risk")
        elif max_slope > 45:
            recommendations.append("STEEP TERRAIN: Monitor areas with >45° slopes for instability")
        
        # General recommendations
        recommendations.extend([
            "Install monitoring equipment in identified critical zones",
            "Implement regular visual inspections of high-risk areas",
            "Consider protective measures (barriers, netting) for critical infrastructure",
            "Develop evacuation procedures for high-risk zones",
            "Monitor weather conditions that may trigger rockfall events"
        ])
        
        return recommendations


def main():
    """Main function for testing DEM analysis"""
    import argparse
    
    parser = argparse.ArgumentParser(description='DEM Rockfall Risk Analysis')
    parser.add_argument('--dem', type=str, required=True,
                       help='Path to DEM file (.tif)')
    parser.add_argument('--output', type=str, default=None,
                       help='Output directory for results')
    parser.add_argument('--min-zone-size', type=int, default=100,
                       help='Minimum size for critical zones (pixels)')
    
    args = parser.parse_args()
    
    try:
        # Initialize analyzer
        analyzer = DEMAnalyzer(args.dem)
        
        # Perform risk assessment
        print("\n🔍 Performing rockfall risk assessment...")
        risk_results = analyzer.assess_rockfall_risk()
        
        # Identify critical zones
        print("\n🎯 Identifying critical zones...")
        critical_zones = analyzer.identify_critical_zones(risk_results, args.min_zone_size)
        
        # Create visualization
        print("\n📊 Creating risk visualization...")
        plot_path = analyzer.create_risk_visualization(risk_results, critical_zones)
        print(f"   Visualization saved: {plot_path}")
        
        # Generate report
        print("\n📋 Generating comprehensive report...")
        report = analyzer.generate_report(risk_results, critical_zones)
        
        # Save report
        output_dir = Path(args.output) if args.output else Path(__file__).parent.parent.parent / "outputs"
        output_dir.mkdir(exist_ok=True)
        
        dem_name = Path(args.dem).stem
        report_path = output_dir / f"risk_report_{dem_name}.json"
        
        import json
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        print(f"   Report saved: {report_path}")
        
        # Print summary
        print(f"\n📈 Analysis Summary:")
        print(f"   DEM: {Path(args.dem).name}")
        print(f"   High risk areas: {report['risk_distribution']['high_risk']['percentage']:.1f}%")
        print(f"   Critical zones: {len(critical_zones)}")
        print(f"   Max slope: {report['terrain_statistics']['slope_max']:.1f}°")
        
        if critical_zones:
            print(f"\n🚨 Critical Zones (Top 5):")
            for i, zone in enumerate(critical_zones[:5]):
                print(f"   Zone {i+1}: {zone['area_pixels']} pixels, "
                      f"max slope {zone['statistics']['max_slope']:.1f}°")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())