"""
Synthetic Data Generator for Rockfall Prediction
==============================================

This module generates realistic synthetic training data for rockfall prediction
based on terrain features and environmental triggers.

Key Features:
- Critical terrain features (slope, fracture density, instability index, etc.)
- Environmental triggers (rainfall, freeze-thaw cycles, seismic activity, etc.)
- Realistic correlations between features
- Configurable data generation parameters
"""

import sys
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
import random
from scipy import stats
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings('ignore')

@dataclass
class DataGenerationConfig:
    """Configuration for synthetic data generation"""
    n_samples: int = 10000
    start_date: str = "2020-01-01"
    end_date: str = "2024-12-31"
    random_seed: int = 42
    
    # Terrain feature ranges
    slope_range: Tuple[float, float] = (0, 90)  # degrees
    elevation_range: Tuple[float, float] = (100, 3000)  # meters
    fracture_density_range: Tuple[float, float] = (0, 10)  # fractures per m²
    roughness_range: Tuple[float, float] = (0, 1)  # normalized roughness
    
    # Environmental ranges
    rainfall_range: Tuple[float, float] = (0, 200)  # mm per day
    temperature_range: Tuple[float, float] = (-30, 45)  # Celsius
    wind_speed_range: Tuple[float, float] = (0, 120)  # km/h
    seismic_magnitude_range: Tuple[float, float] = (0, 7)  # Richter scale

class SyntheticDataGenerator:
    """Generates realistic synthetic data for rockfall prediction"""
    
    def __init__(self, config: DataGenerationConfig = None):
        self.config = config or DataGenerationConfig()
        np.random.seed(self.config.random_seed)
        random.seed(self.config.random_seed)
        
        # Initialize feature correlations and weights
        self._initialize_feature_relationships()
    
    def _initialize_feature_relationships(self):
        """Define realistic relationships between features and rockfall risk"""
        
        # Feature importance weights (more balanced distribution for better training)
        self.feature_weights = {
            'slope': 0.18,
            'fracture_density': 0.16,
            'rainfall': 0.14,
            'freeze_thaw_cycles': 0.12,
            'seismic_activity': 0.11,
            'instability_index': 0.10,
            'temperature_variation': 0.08,
            'wind_speed': 0.07,
            'roughness': 0.04
        }
        
        # Risk thresholds for different features
        self.risk_thresholds = {
            'slope': {'low': 30, 'medium': 45, 'high': 60},
            'fracture_density': {'low': 2, 'medium': 5, 'high': 8},
            'rainfall': {'low': 20, 'medium': 50, 'high': 100},
            'freeze_thaw_cycles': {'low': 5, 'medium': 15, 'high': 30},
            'seismic_activity': {'low': 2, 'medium': 4, 'high': 6},
            'temperature_variation': {'low': 10, 'medium': 20, 'high': 35}
        }
    
    def generate_terrain_features(self) -> pd.DataFrame:
        """Generate critical terrain features spanning all operational mine bench regimes"""
        n = self.config.n_samples
        terrain_data = {}
        
        # 1. Slope: Mixture distribution covering gentle quarry floors (0-20°), benches (20-40°), highwalls (40-60°), and scarps (60-85°)
        regimes = np.random.choice([0, 1, 2, 3], size=n, p=[0.30, 0.35, 0.25, 0.10])
        slope_samples = np.zeros(n)
        slope_samples[regimes == 0] = np.random.uniform(5.0, 20.0, size=(regimes == 0).sum())
        slope_samples[regimes == 1] = np.random.uniform(20.0, 40.0, size=(regimes == 1).sum())
        slope_samples[regimes == 2] = np.random.uniform(40.0, 60.0, size=(regimes == 2).sum())
        slope_samples[regimes == 3] = np.random.uniform(60.0, 85.0, size=(regimes == 3).sum())
        terrain_data['slope'] = np.clip(slope_samples, *self.config.slope_range)
        
        # 2. Elevation (affects freeze-thaw and lithostatic stress)
        terrain_data['elevation'] = np.random.normal(loc=1400, scale=650, size=n)
        terrain_data['elevation'] = np.clip(terrain_data['elevation'], *self.config.elevation_range)
        
        # 3. Fracture Density (correlated with slope and rock mass fatigue)
        base_fracture = np.random.uniform(0.5, 7.0, size=n)
        slope_influence = (terrain_data['slope'] / 90.0) * 3.0
        terrain_data['fracture_density'] = np.clip(base_fracture + slope_influence, *self.config.fracture_density_range)
        
        # 4. Roughness (TRI / surface irregularity)
        terrain_data['roughness'] = np.clip(np.random.beta(a=2.5, b=3.5, size=n), 0.05, 0.95)
        
        # 5. Slope Variability (local terrain complexity)
        terrain_data['slope_variability'] = np.clip(np.random.gamma(shape=2.5, scale=4.0, size=n), 0.5, 45.0)
        
        # 6. Instability Index (combined terrain assessment)
        instability = (
            (terrain_data['slope'] / 90.0) * 0.40 +
            (terrain_data['fracture_density'] / 10.0) * 0.30 +
            terrain_data['roughness'] * 0.20 +
            (terrain_data['slope_variability'] / 45.0) * 0.10
        )
        terrain_data['instability_index'] = np.clip(instability + np.random.normal(0, 0.04, n), 0.0, 1.0)
        
        # 7. Topographic Wetness Index (water accumulation)
        slope_radians = np.radians(terrain_data['slope'] + 0.1)
        contributing_area = np.random.lognormal(mean=5.0, sigma=0.8, size=n)
        terrain_data['wetness_index'] = np.clip(np.log(contributing_area / np.tan(slope_radians)), 0.5, 18.0)
        
        return pd.DataFrame(terrain_data)
    
    def generate_environmental_features(self) -> pd.DataFrame:
        """Generate environmental trigger features with diverse operational weather & seismic conditions"""
        n = self.config.n_samples
        
        start_date = pd.to_datetime(self.config.start_date)
        end_date = pd.to_datetime(self.config.end_date)
        dates = pd.date_range(start=start_date, end=end_date, periods=n)
        
        env_data = {'timestamp': dates}
        env_data['month'] = dates.month
        env_data['day_of_year'] = dates.dayofyear
        env_data['season'] = ((dates.month - 1) // 3) + 1
        
        # 1. Rainfall: mixture of dry/light (0-20mm), moderate (20-60mm), and heavy/monsoon storms (60-180mm)
        rain_regimes = np.random.choice([0, 1, 2], size=n, p=[0.45, 0.35, 0.20])
        rain_samples = np.zeros(n)
        rain_samples[rain_regimes == 0] = np.random.uniform(0.0, 20.0, size=(rain_regimes == 0).sum())
        rain_samples[rain_regimes == 1] = np.random.uniform(20.0, 70.0, size=(rain_regimes == 1).sum())
        rain_samples[rain_regimes == 2] = np.random.uniform(70.0, 180.0, size=(rain_regimes == 2).sum())
        env_data['rainfall'] = np.clip(rain_samples, *self.config.rainfall_range)
        
        # 2. Temperature & variation
        seasonal_temp = 18.0 + 14.0 * np.sin(2 * np.pi * env_data['day_of_year'] / 365.0)
        env_data['temperature'] = np.clip(seasonal_temp + np.random.normal(0, 4.0, n), *self.config.temperature_range)
        env_data['temperature_variation'] = np.clip(np.abs(np.random.normal(12.0, 5.0, n)), 1.0, 35.0)
        
        # 3. Freeze-Thaw Cycles
        freeze_thaw_base = np.where(
            env_data['season'].isin([1, 2]),
            np.random.poisson(lam=12, size=n),
            np.random.poisson(lam=3, size=n)
        )
        env_data['freeze_thaw_cycles'] = np.clip(freeze_thaw_base, 0, 45)
        
        # 4. Seismic Activity: mixture of quiet (0-1.5), blasting/minor tremors (1.5-3.5), and strong tremors (3.5-6.0)
        seis_regimes = np.random.choice([0, 1, 2], size=n, p=[0.60, 0.28, 0.12])
        seis_samples = np.zeros(n)
        seis_samples[seis_regimes == 0] = np.random.uniform(0.0, 1.5, size=(seis_regimes == 0).sum())
        seis_samples[seis_regimes == 1] = np.random.uniform(1.5, 3.8, size=(seis_regimes == 1).sum())
        seis_samples[seis_regimes == 2] = np.random.uniform(3.8, 6.5, size=(seis_regimes == 2).sum())
        env_data['seismic_activity'] = np.clip(seis_samples, *self.config.seismic_magnitude_range)
        
        # 5. Wind Speed
        env_data['wind_speed'] = np.clip(np.random.gamma(shape=2.5, scale=12.0, size=n), 2.0, 110.0)
        
        # 6. Precipitation Intensity (mm/h)
        env_data['precipitation_intensity'] = np.where(
            env_data['rainfall'] > 0,
            np.clip(env_data['rainfall'] / np.random.uniform(2.0, 12.0, n), 0.1, 40.0),
            0.0
        )
        
        # 7. Humidity
        env_data['humidity'] = np.clip(np.random.beta(a=5, b=3, size=n) * 100.0, 15.0, 98.0)
        
        return pd.DataFrame(env_data)
    
    def calculate_risk_score(self, terrain_df: pd.DataFrame, env_df: pd.DataFrame) -> np.ndarray:
        """
        Calculate rockfall risk score based on geomechanical and meteorological features.
        Preserves true physical relationships between triggers and hazard levels.
        """
        # 1. Slope risk factor (0 to 1 scale, non-linear steepness hazard)
        slope_rad = np.radians(terrain_df['slope'])
        slope_factor = np.sin(slope_rad) ** 1.5  # Rapid rise above 35 deg
        
        # 2. Geological structure factor
        fracture_factor = np.clip(terrain_df['fracture_density'] / 8.0, 0, 1.2)
        instability_factor = terrain_df['instability_index']
        roughness_factor = np.clip(terrain_df['roughness'], 0, 1)
        
        # 3. Meteorological trigger factor
        rain_factor = np.clip(env_df['rainfall'] / 120.0, 0, 1.5)
        freeze_thaw_factor = np.clip(env_df['freeze_thaw_cycles'] / 25.0, 0, 1.2)
        temp_var_factor = np.clip(env_df['temperature_variation'] / 25.0, 0, 1)
        
        # 4. Seismic & dynamic trigger factor
        seismic_factor = np.clip(env_df['seismic_activity'] / 5.0, 0, 1.5)
        wind_factor = np.clip(env_df['wind_speed'] / 80.0, 0, 1)
        
        # Base linear combination
        terrain_weight = 0.45
        weather_weight = 0.35
        seismic_weight = 0.20
        
        terrain_score = (
            slope_factor * 0.40 +
            fracture_factor * 0.30 +
            instability_factor * 0.20 +
            roughness_factor * 0.10
        )
        
        weather_score = (
            rain_factor * 0.55 +
            freeze_thaw_factor * 0.30 +
            temp_var_factor * 0.15
        )
        
        dynamic_score = (
            seismic_factor * 0.75 +
            wind_factor * 0.25
        )
        
        base_risk = (
            terrain_score * terrain_weight +
            weather_score * weather_weight +
            dynamic_score * seismic_weight
        )
        
        # Multiplicative non-linear compound triggers
        # (e.g. heavy rainfall or earthquake on steep fractured highwall creates critical failure)
        compound_trigger = (
            (slope_factor * rain_factor * 0.25) +
            (fracture_factor * seismic_factor * 0.20) +
            (freeze_thaw_factor * fracture_factor * 0.15)
        )
        
        final_risk = base_risk + compound_trigger
        
        # Small measurement noise
        final_risk += np.random.normal(0, 0.03, len(terrain_df))
        final_risk = np.clip(final_risk, 0.0, 1.0)
        
        return final_risk
    
    def generate_rockfall_events(self, risk_scores: np.ndarray) -> np.ndarray:
        """Generate binary rockfall events based on sigmoid risk probability"""
        n_samples = len(risk_scores)
        # Sigmoid transition for physical detachment probability
        probabilities = 1.0 / (1.0 + np.exp(-10.0 * (risk_scores - 0.45)))
        probabilities = np.clip(probabilities, 0.02, 0.98)
        events = np.random.binomial(1, probabilities)
        return events
    
    def generate_complete_dataset(self) -> pd.DataFrame:
        """Generate complete synthetic dataset with all features"""
        
        print("🏔️ Generating synthetic rockfall prediction dataset...")
        print(f"📊 Creating {self.config.n_samples:,} samples...")
        
        # Generate terrain features
        print("🗻 Generating terrain features...")
        terrain_df = self.generate_terrain_features()
        
        # Generate environmental features
        print("🌤️ Generating environmental features...")
        env_df = self.generate_environmental_features()
        
        # Combine datasets
        combined_df = pd.concat([terrain_df, env_df], axis=1)
        
        # Calculate risk scores
        print("⚠️ Calculating risk scores...")
        risk_scores = self.calculate_risk_score(terrain_df, env_df)
        combined_df['risk_score'] = risk_scores
        
        # Generate rockfall events
        print("💥 Generating rockfall events...")
        rockfall_events = self.generate_rockfall_events(risk_scores)
        combined_df['rockfall_event'] = rockfall_events
        
        # Add risk categories
        combined_df['risk_category'] = pd.cut(
            risk_scores, 
            bins=[0, 0.3, 0.6, 1.0], 
            labels=['Low', 'Medium', 'High']
        )
        
        print(f"✅ Dataset generated successfully!")
        print(f"📈 Risk distribution: {combined_df['risk_category'].value_counts().to_dict()}")
        print(f"💥 Rockfall events: {rockfall_events.sum():,} ({rockfall_events.mean()*100:.1f}%)")
        
        return combined_df
    
    def visualize_dataset(self, df: pd.DataFrame, save_path: str = None):
        """Create comprehensive visualizations of the synthetic dataset"""
        
        fig, axes = plt.subplots(3, 4, figsize=(20, 15))
        fig.suptitle('Synthetic Rockfall Prediction Dataset Analysis', fontsize=16, fontweight='bold')
        
        # 1. Risk Score Distribution
        axes[0,0].hist(df['risk_score'], bins=50, alpha=0.7, color='skyblue', edgecolor='black')
        axes[0,0].set_title('Risk Score Distribution')
        axes[0,0].set_xlabel('Risk Score')
        axes[0,0].set_ylabel('Frequency')
        
        # 2. Slope vs Risk Score
        scatter = axes[0,1].scatter(df['slope'], df['risk_score'], 
                                  c=df['rockfall_event'], cmap='coolwarm', alpha=0.6)
        axes[0,1].set_title('Slope vs Risk Score')
        axes[0,1].set_xlabel('Slope (degrees)')
        axes[0,1].set_ylabel('Risk Score')
        plt.colorbar(scatter, ax=axes[0,1])
        
        # 3. Rainfall vs Risk Score
        axes[0,2].scatter(df['rainfall'], df['risk_score'], 
                         c=df['rockfall_event'], cmap='coolwarm', alpha=0.6)
        axes[0,2].set_title('Rainfall vs Risk Score')
        axes[0,2].set_xlabel('Rainfall (mm)')
        axes[0,2].set_ylabel('Risk Score')
        
        # 4. Fracture Density Distribution
        axes[0,3].hist(df['fracture_density'], bins=30, alpha=0.7, color='lightcoral')
        axes[0,3].set_title('Fracture Density Distribution')
        axes[0,3].set_xlabel('Fracture Density (per m²)')
        axes[0,3].set_ylabel('Frequency')
        
        # 5. Seasonal Risk Patterns
        seasonal_risk = df.groupby('season')['risk_score'].mean()
        axes[1,0].bar(['Winter', 'Spring', 'Summer', 'Fall'], seasonal_risk.values, 
                     color=['lightblue', 'lightgreen', 'yellow', 'orange'])
        axes[1,0].set_title('Seasonal Risk Patterns')
        axes[1,0].set_ylabel('Average Risk Score')
        
        # 6. Temperature Variation Impact
        axes[1,1].scatter(df['temperature_variation'], df['risk_score'], 
                         alpha=0.5, color='purple')
        axes[1,1].set_title('Temperature Variation vs Risk')
        axes[1,1].set_xlabel('Temperature Variation (°C)')
        axes[1,1].set_ylabel('Risk Score')
        
        # 7. Seismic Activity Distribution
        axes[1,2].hist(df['seismic_activity'], bins=30, alpha=0.7, color='red')
        axes[1,2].set_title('Seismic Activity Distribution')
        axes[1,2].set_xlabel('Magnitude')
        axes[1,2].set_ylabel('Frequency')
        
        # 8. Instability Index vs Rockfall Events
        rockfall_yes = df[df['rockfall_event'] == 1]['instability_index']
        rockfall_no = df[df['rockfall_event'] == 0]['instability_index']
        axes[1,3].hist([rockfall_no, rockfall_yes], bins=30, alpha=0.7, 
                      label=['No Rockfall', 'Rockfall'], color=['blue', 'red'])
        axes[1,3].set_title('Instability Index vs Rockfall Events')
        axes[1,3].set_xlabel('Instability Index')
        axes[1,3].set_ylabel('Frequency')
        axes[1,3].legend()
        
        # 9. Feature Correlation Matrix
        corr_features = ['slope', 'fracture_density', 'rainfall', 'freeze_thaw_cycles', 
                        'seismic_activity', 'risk_score', 'rockfall_event']
        corr_matrix = df[corr_features].corr()
        im = axes[2,0].imshow(corr_matrix, cmap='coolwarm', aspect='auto')
        axes[2,0].set_title('Feature Correlation Matrix')
        axes[2,0].set_xticks(range(len(corr_features)))
        axes[2,0].set_yticks(range(len(corr_features)))
        axes[2,0].set_xticklabels(corr_features, rotation=45)
        axes[2,0].set_yticklabels(corr_features)
        plt.colorbar(im, ax=axes[2,0])
        
        # 10. Wind Speed vs Risk
        axes[2,1].scatter(df['wind_speed'], df['risk_score'], alpha=0.5, color='green')
        axes[2,1].set_title('Wind Speed vs Risk Score')
        axes[2,1].set_xlabel('Wind Speed (km/h)')
        axes[2,1].set_ylabel('Risk Score')
        
        # 11. Elevation vs Risk Score
        axes[2,2].scatter(df['elevation'], df['risk_score'], alpha=0.5, color='brown')
        axes[2,2].set_title('Elevation vs Risk Score')
        axes[2,2].set_xlabel('Elevation (m)')
        axes[2,2].set_ylabel('Risk Score')
        
        # 12. Risk Category Distribution
        risk_counts = df['risk_category'].value_counts()
        axes[2,3].pie(risk_counts.values, labels=risk_counts.index, autopct='%1.1f%%',
                     colors=['green', 'yellow', 'red'])
        axes[2,3].set_title('Risk Category Distribution')
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"📊 Visualization saved to: {save_path}")
        
        plt.show()
    
    def generate_feature_summary(self, df: pd.DataFrame) -> Dict:
        """Generate comprehensive summary of the synthetic dataset"""
        
        summary = {
            'dataset_overview': {
                'total_samples': len(df),
                'date_range': f"{df['timestamp'].min()} to {df['timestamp'].max()}",
                'rockfall_events': int(df['rockfall_event'].sum()),
                'rockfall_rate': f"{df['rockfall_event'].mean()*100:.2f}%"
            },
            'terrain_features': {},
            'environmental_features': {},
            'risk_analysis': {},
            'correlations': {}
        }
        
        # Terrain feature statistics
        terrain_features = ['slope', 'fracture_density', 'instability_index', 
                          'elevation', 'roughness', 'slope_variability', 'wetness_index']
        
        for feature in terrain_features:
            if feature in df.columns:
                summary['terrain_features'][feature] = {
                    'mean': f"{df[feature].mean():.2f}",
                    'std': f"{df[feature].std():.2f}",
                    'min': f"{df[feature].min():.2f}",
                    'max': f"{df[feature].max():.2f}",
                    'high_risk_correlation': f"{df[feature].corr(df['rockfall_event']):.3f}"
                }
        
        # Environmental feature statistics
        env_features = ['rainfall', 'freeze_thaw_cycles', 'seismic_activity', 
                       'temperature_variation', 'wind_speed', 'precipitation_intensity']
        
        for feature in env_features:
            if feature in df.columns:
                summary['environmental_features'][feature] = {
                    'mean': f"{df[feature].mean():.2f}",
                    'std': f"{df[feature].std():.2f}",
                    'min': f"{df[feature].min():.2f}",
                    'max': f"{df[feature].max():.2f}",
                    'high_risk_correlation': f"{df[feature].corr(df['rockfall_event']):.3f}"
                }
        
        # Risk analysis
        summary['risk_analysis'] = {
            'average_risk_score': f"{df['risk_score'].mean():.3f}",
            'high_risk_samples': f"{(df['risk_score'] > 0.7).sum():,} ({(df['risk_score'] > 0.7).mean()*100:.1f}%)",
            'medium_risk_samples': f"{((df['risk_score'] > 0.3) & (df['risk_score'] <= 0.7)).sum():,}",
            'low_risk_samples': f"{(df['risk_score'] <= 0.3).sum():,}",
            'risk_categories': df['risk_category'].value_counts().to_dict()
        }
        
        # Key correlations with rockfall events
        correlation_features = ['slope', 'fracture_density', 'rainfall', 'risk_score']
        correlations = {}
        for feature in correlation_features:
            if feature in df.columns:
                correlations[feature] = f"{df[feature].corr(df['rockfall_event']):.3f}"
        
        summary['correlations'] = correlations
        
        return summary


def main():
    """Demonstrate synthetic data generation"""
    
    # Configure data generation
    config = DataGenerationConfig(
        n_samples=5000,
        random_seed=42
    )
    
    # Create generator
    generator = SyntheticDataGenerator(config)
    
    # Generate dataset
    dataset = generator.generate_complete_dataset()
    
    # Save dataset
    output_path = "outputs/synthetic_training_data.csv"
    dataset.to_csv(output_path, index=False)
    print(f"💾 Dataset saved to: {output_path}")
    
    # Generate visualizations
    viz_path = "outputs/synthetic_data_analysis.png"
    generator.visualize_dataset(dataset, viz_path)
    
    # Generate summary
    summary = generator.generate_feature_summary(dataset)
    
    print("\n📊 DATASET SUMMARY")
    print("="*50)
    for category, data in summary.items():
        print(f"\n{category.upper().replace('_', ' ')}:")
        if isinstance(data, dict):
            for key, value in data.items():
                print(f"  {key}: {value}")
        else:
            print(f"  {data}")
    
    return dataset, summary


if __name__ == "__main__":
    dataset, summary = main()