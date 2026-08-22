import React, { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Paper,
  Slider,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material'
import {
  Assessment as AssessmentIcon,
  CheckCircle as CheckIcon,
  Thunderstorm as StormIcon,
  AcUnit as FreezeIcon,
  WbSunny as SunIcon,
  ShowChart as ChartIcon,
  CalendarMonth as CalendarIcon,
  WaterDrop as WaterIcon,
  Thermostat as TempIcon,
  Terrain as TerrainIcon,
  Air as WindIcon
} from '@mui/icons-material'
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts'
import toast from 'react-hot-toast'

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

// 3 Main Seasons: Summer, Monsoon, Winter
const seasons = [
  { value: 0, label: 'Summer (Dry Heat / Low Rain: March - July)' },
  { value: 1, label: 'Monsoon (Heavy Rain / High Moisture: August - October)' },
  { value: 2, label: 'Winter (Cold / Freeze-Thaw: November - February)' }
]

// 3 Realistic Seasonal Environmental Profiles
const SEASON_CONSTRAINTS = {
  0: {
    // Summer: Rainfall starts at 0, high temperature, low humidity & wetness, freeze-thaw near 0
    name: 'Summer (Dry Heat)',
    badgeColor: '#fbbf24',
    rainfall: { min: 0, max: 20, default: 0, unit: 'mm/h' },
    precipitation_intensity: { min: 0, max: 3, default: 1, unit: 'scale 1-10' },
    humidity: { min: 15, max: 45, default: 25, unit: '%' },
    wetness_index: { min: 0.0, max: 2.5, default: 1.0, unit: 'index' },
    temperature: { min: 30, max: 50, default: 38, unit: '°C' },
    temperature_variation: { min: 8, max: 22, default: 15, unit: '°C' },
    freeze_thaw_cycles: { min: 0, max: 1, default: 0, unit: 'cycles' }
  },
  1: {
    // Monsoon: High rainfall, precipitation intensity, humidity and wetness, moderate temp, freeze-thaw near 0
    name: 'Monsoon (Heavy Rain)',
    badgeColor: '#38bdf8',
    rainfall: { min: 30, max: 160, default: 95, unit: 'mm/h' },
    precipitation_intensity: { min: 5, max: 10, default: 9, unit: 'scale 1-10' },
    humidity: { min: 70, max: 100, default: 90, unit: '%' },
    wetness_index: { min: 5.0, max: 10.0, default: 8.2, unit: 'index' },
    temperature: { min: 22, max: 34, default: 27, unit: '°C' },
    temperature_variation: { min: 2, max: 8, default: 4, unit: '°C' },
    freeze_thaw_cycles: { min: 0, max: 1, default: 0, unit: 'cycles' }
  },
  2: {
    // Winter: Low temperature, higher freeze-thaw cycles, low rainfall
    name: 'Winter (Freeze-Thaw)',
    badgeColor: '#818cf8',
    rainfall: { min: 0, max: 25, default: 8, unit: 'mm/h' },
    precipitation_intensity: { min: 0, max: 4, default: 2, unit: 'scale 1-10' },
    humidity: { min: 35, max: 70, default: 52, unit: '%' },
    wetness_index: { min: 1.0, max: 5.0, default: 2.8, unit: 'index' },
    temperature: { min: -25, max: 12, default: -8, unit: '°C' },
    temperature_variation: { min: 6, max: 20, default: 12, unit: '°C' },
    freeze_thaw_cycles: { min: 8, max: 40, default: 22, unit: 'cycles' }
  }
}

const RiskAssessment = () => {
  const currentMonth = new Date().getMonth() + 1
  const deriveSeasonFromMonth = (m) => {
    if (m >= 3 && m <= 7) return 0 // Summer
    if (m >= 8 && m <= 10) return 1 // Monsoon
    return 2 // Winter (Nov, Dec, Jan, Feb)
  }

  const initialSeason = deriveSeasonFromMonth(currentMonth)
  const initialConstraints = SEASON_CONSTRAINTS[initialSeason]

  // All 19 Environmental & Geotechnical Factors
  const [formData, setFormData] = useState({
    // Calendar Context (3)
    month: currentMonth,
    day_of_year: Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000),
    season: initialSeason,

    // Hydrology & Weather (4)
    rainfall: initialConstraints.rainfall.default,
    precipitation_intensity: initialConstraints.precipitation_intensity.default,
    humidity: initialConstraints.humidity.default,
    wetness_index: initialConstraints.wetness_index.default,

    // Thermal & Freeze-Thaw (3)
    temperature: initialConstraints.temperature.default,
    temperature_variation: initialConstraints.temperature_variation.default,
    freeze_thaw_cycles: initialConstraints.freeze_thaw_cycles.default,

    // Geological Structure (6)
    slope: 42,
    elevation: 1200,
    fracture_density: 3.2,
    roughness: 0.65,
    slope_variability: 0.35,
    instability_index: 0.55,

    // Disturbances (2)
    seismic_activity: 1.8,
    wind_speed: 22,

    // Payload score placeholder (1)
    risk_score: 0.0
  })

  const activeConstraints = SEASON_CONSTRAINTS[formData.season]

  // Multi-Factor Risk & Dynamic Color Score Calculator
  const calculateMetrics = (data, constraints) => {
    const slopeScore = (data.slope / 75) * 100
    const rainScore = (data.rainfall / constraints.rainfall.max) * 100
    const fracScore = (data.fracture_density / 6.0) * 100
    const seismicScore = (data.seismic_activity / 5.0) * 100
    const freezeScore = (data.freeze_thaw_cycles / Math.max(1, constraints.freeze_thaw_cycles.max)) * 100
    const instabilityScore = (data.instability_index / 1.0) * 100
    const wetnessScore = (data.wetness_index / constraints.wetness_index.max) * 100

    const seasonMult = data.season === 1 ? 1.20 : data.season === 2 ? 1.15 : 1.0

    const rawScore = (
      slopeScore * 0.28 +
      rainScore * 0.22 +
      fracScore * 0.18 +
      instabilityScore * 0.12 +
      seismicScore * 0.10 +
      freezeScore * 0.06 +
      wetnessScore * 0.04
    ) * seasonMult

    const totalScore = Math.min(Math.round(rawScore), 99)

    // Dynamic Risk Theme Colors: Green (#34d399 Low), Yellow (#fbbf24 Medium), Red (#f43f5e High)
    const riskLevel = totalScore > 65 ? 'HIGH' : totalScore > 35 ? 'MEDIUM' : 'LOW'
    const color = totalScore > 65 ? '#f43f5e' : totalScore > 35 ? '#fbbf24' : '#34d399'

    // Bar chart dataset with dynamic color per risk level
    const barData = [
      { name: 'Slope Incline', value: Math.round(slopeScore), color: color },
      { name: 'Rainfall Rate', value: Math.round(rainScore), color: color },
      { name: 'Fracture Density', value: Math.round(fracScore), color: color },
      { name: 'Instability Index', value: Math.round(instabilityScore), color: color },
      { name: 'Seismic ML', value: Math.round(seismicScore), color: color },
      { name: 'Freeze-Thaw', value: Math.round(freezeScore), color: color }
    ]

    // Radar chart dataset
    const radarData = [
      { factor: 'Slope Angle', score: Math.round(slopeScore) },
      { factor: 'Rainfall', score: Math.round(rainScore) },
      { factor: 'Fractures', score: Math.round(fracScore) },
      { factor: 'Instability', score: Math.round(instabilityScore) },
      { factor: 'Seismic ML', score: Math.round(seismicScore) },
      { factor: 'Freeze-Thaw', score: Math.round(freezeScore) }
    ]

    const recommendations = totalScore > 65 ? [
      'Deploy immediate wire-mesh scaling on highwall bench perimeter',
      'Evacuate heavy excavation machinery from 120m quarry depth',
      'Increase automated LiDAR scanning frequency to 15-minute intervals',
      'Issue emergency siren alert for pit workers'
    ] : totalScore > 35 ? [
      'Inspect highwall bench drainage channels for water buildup',
      'Maintain standard 30-minute automated LiDAR telemetry scans',
      'Restrict heavy haul truck traffic speed to 20 km/h'
    ] : [
      'All 19 geotechnical parameters within safe operational bounds',
      'Routine daily geotechnical inspection schedule active'
    ]

    return { totalScore, riskLevel, color, barData, radarData, recommendations }
  }

  const [metrics, setMetrics] = useState(() => calculateMetrics(formData, initialConstraints))

  // Apply seasonal constraints to weather factors
  const applySeasonConstraints = (newSeason, currentData) => {
    const c = SEASON_CONSTRAINTS[newSeason]
    const updated = {
      ...currentData,
      season: newSeason,
      rainfall: c.rainfall.default,
      precipitation_intensity: c.precipitation_intensity.default,
      humidity: c.humidity.default,
      wetness_index: c.wetness_index.default,
      temperature: c.temperature.default,
      temperature_variation: c.temperature_variation.default,
      freeze_thaw_cycles: c.freeze_thaw_cycles.default
    }
    setMetrics(calculateMetrics(updated, c))
    return updated
  }

  const handleMonthChange = (newMonth) => {
    const derivedSeason = deriveSeasonFromMonth(newMonth)
    setFormData(prev => applySeasonConstraints(derivedSeason, { ...prev, month: newMonth }))
    toast.success(`📅 Month set to ${months[newMonth - 1]}: Auto-loaded ${SEASON_CONSTRAINTS[derivedSeason].name}`)
  }

  const handleSeasonChange = (newSeason) => {
    setFormData(prev => applySeasonConstraints(newSeason, prev))
    toast.success(`🌤️ Switched to ${SEASON_CONSTRAINTS[newSeason].name}`)
  }

  const handleFactorChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value }
      setMetrics(calculateMetrics(updated, SEASON_CONSTRAINTS[prev.season]))
      return updated
    })
  }

  const applyPreset = (presetType) => {
    let presetSeason = 0
    let presetMonth = 6
    if (presetType === 'monsoon') {
      presetSeason = 1
      presetMonth = 8
    } else if (presetType === 'freeze') {
      presetSeason = 2
      presetMonth = 1
    }

    const c = SEASON_CONSTRAINTS[presetSeason]
    const updated = {
      ...formData,
      month: presetMonth,
      season: presetSeason,
      rainfall: c.rainfall.default,
      precipitation_intensity: c.precipitation_intensity.default,
      humidity: c.humidity.default,
      wetness_index: c.wetness_index.default,
      temperature: c.temperature.default,
      temperature_variation: c.temperature_variation.default,
      freeze_thaw_cycles: c.freeze_thaw_cycles.default,
      slope: presetType === 'monsoon' ? 54 : presetType === 'freeze' ? 48 : 32,
      fracture_density: presetType === 'monsoon' ? 4.5 : presetType === 'freeze' ? 3.8 : 1.8
    }

    setFormData(updated)
    setMetrics(calculateMetrics(updated, c))
    toast.success(`⚡ Loaded ${presetType.toUpperCase()} Profile`)
  }

  return (
    <Box sx={{ pb: 4 }}>
      {/* Header Banner */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#f8fafc', mb: 0.5 }}>
            Geotechnical Risk Assessment (Summer, Monsoon, Winter)
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
            Selecting Summer, Monsoon, or Winter automatically updates environmental defaults & ranges while theme colors adapt to calculated risk level.
          </Typography>
        </Box>

        {/* 3 Season Preset Quick Switches */}
        <ButtonGroup variant="outlined" size="small">
          <Button startIcon={<SunIcon />} onClick={() => applyPreset('summer')} sx={{ borderColor: 'rgba(251, 191, 36, 0.4)', color: '#fbbf24' }}>
            Summer
          </Button>
          <Button startIcon={<StormIcon />} onClick={() => applyPreset('monsoon')} sx={{ borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38bdf8' }}>
            Monsoon
          </Button>
          <Button startIcon={<FreezeIcon />} onClick={() => applyPreset('freeze')} sx={{ borderColor: 'rgba(129, 140, 248, 0.4)', color: '#818cf8' }}>
            Winter
          </Button>
        </ButtonGroup>
      </Box>

      {/* SECTION 1: CALENDAR CONTEXT (3 SEASONS: SUMMER, MONSOON, WINTER) */}
      <Paper sx={{ p: 2.5, mb: 3, bgcolor: 'rgba(15, 23, 42, 0.85)', border: `1px solid ${metrics.color}`, borderRadius: '12px', transition: 'all 0.3s ease' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ color: metrics.color, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, transition: 'color 0.3s ease' }}>
            <CalendarIcon /> 1. Calendar Context (3 Seasons: Summer, Monsoon, Winter)
          </Typography>
          <Chip label={`Active Profile: ${activeConstraints.name}`} size="small" sx={{ bgcolor: `${metrics.color}25`, color: metrics.color, border: `1px solid ${metrics.color}`, fontWeight: 800, transition: 'all 0.3s ease' }} />
        </Box>

        <Grid container spacing={3}>
          {/* Factor 1: Month */}
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 1, fontWeight: 600 }}>
              Factor 1: Calendar Month
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                value={formData.month}
                onChange={(e) => handleMonthChange(e.target.value)}
                sx={{ color: '#fff', border: `1px solid ${metrics.color}60`, bgcolor: 'rgba(9, 13, 22, 0.8)', transition: 'all 0.3s ease' }}
              >
                {months.map((m, idx) => (
                  <MenuItem key={idx} value={idx + 1}>{m}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Factor 2: Season (Summer, Monsoon, Winter) */}
          <Grid item xs={12} sm={5}>
            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 1, fontWeight: 600 }}>
              Factor 2: Season Selector (Summer, Monsoon, Winter)
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                value={formData.season}
                onChange={(e) => handleSeasonChange(e.target.value)}
                sx={{ color: '#fff', border: `1px solid ${metrics.color}60`, bgcolor: 'rgba(9, 13, 22, 0.8)', transition: 'all 0.3s ease' }}
              >
                {seasons.map((s) => (
                  <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Factor 3: Day of Year */}
          <Grid item xs={12} sm={3}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>Factor 3: Day of Year</Typography>
              <Typography variant="caption" className="mono-font" sx={{ color: metrics.color, fontWeight: 700 }}>Day {formData.day_of_year}</Typography>
            </Box>
            <Slider min={1} max={365} value={formData.day_of_year} onChange={(e, val) => handleFactorChange('day_of_year', val)} size="small" sx={{ color: metrics.color }} />
          </Grid>
        </Grid>
      </Paper>

      {/* SECTION 2: PRECIPITATION & HYDROLOGY */}
      <Paper sx={{ p: 2.5, mb: 3, bgcolor: 'rgba(15, 23, 42, 0.8)', border: `1px solid ${metrics.color}50`, borderRadius: '12px', transition: 'border-color 0.3s ease' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ color: metrics.color, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, transition: 'color 0.3s ease' }}>
            <WaterIcon /> 2. Precipitation & Hydrology ({activeConstraints.name})
          </Typography>
          <Chip label={`Rainfall starts at ${activeConstraints.rainfall.default} mm/h`} size="small" sx={{ bgcolor: `${metrics.color}15`, color: metrics.color, border: `1px solid ${metrics.color}`, fontWeight: 700 }} />
        </Box>

        <Grid container spacing={3}>
          {/* Factor 4: Rainfall Rate */}
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(9, 13, 22, 0.7)', border: '1px solid rgba(30, 41, 59, 0.8)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>Factor 4: Rainfall Rate</Typography>
                <Typography variant="caption" className="mono-font" sx={{ color: metrics.color, fontWeight: 700 }}>{formData.rainfall} mm/h</Typography>
              </Box>
              <Slider min={activeConstraints.rainfall.min} max={activeConstraints.rainfall.max} value={formData.rainfall} onChange={(e, val) => handleFactorChange('rainfall', val)} sx={{ color: metrics.color }} />
              <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>Valid: {activeConstraints.rainfall.min} - {activeConstraints.rainfall.max} mm/h</Typography>
            </Box>
          </Grid>

          {/* Factor 5: Precipitation Intensity */}
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(9, 13, 22, 0.7)', border: '1px solid rgba(30, 41, 59, 0.8)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>Factor 5: Precip. Intensity</Typography>
                <Typography variant="caption" className="mono-font" sx={{ color: metrics.color, fontWeight: 700 }}>{formData.precipitation_intensity} / 10</Typography>
              </Box>
              <Slider min={activeConstraints.precipitation_intensity.min} max={activeConstraints.precipitation_intensity.max} value={formData.precipitation_intensity} onChange={(e, val) => handleFactorChange('precipitation_intensity', val)} sx={{ color: metrics.color }} />
              <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>Valid: {activeConstraints.precipitation_intensity.min} - {activeConstraints.precipitation_intensity.max}</Typography>
            </Box>
          </Grid>

          {/* Factor 6: Humidity */}
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(9, 13, 22, 0.7)', border: '1px solid rgba(30, 41, 59, 0.8)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>Factor 6: Humidity (%)</Typography>
                <Typography variant="caption" className="mono-font" sx={{ color: metrics.color, fontWeight: 700 }}>{formData.humidity}%</Typography>
              </Box>
              <Slider min={activeConstraints.humidity.min} max={activeConstraints.humidity.max} value={formData.humidity} onChange={(e, val) => handleFactorChange('humidity', val)} sx={{ color: metrics.color }} />
              <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>Valid: {activeConstraints.humidity.min} - {activeConstraints.humidity.max}%</Typography>
            </Box>
          </Grid>

          {/* Factor 7: Wetness Index */}
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(9, 13, 22, 0.7)', border: '1px solid rgba(30, 41, 59, 0.8)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>Factor 7: Wetness Index</Typography>
                <Typography variant="caption" className="mono-font" sx={{ color: metrics.color, fontWeight: 700 }}>{formData.wetness_index}</Typography>
              </Box>
              <Slider min={activeConstraints.wetness_index.min} max={activeConstraints.wetness_index.max} step={0.1} value={formData.wetness_index} onChange={(e, val) => handleFactorChange('wetness_index', val)} sx={{ color: metrics.color }} />
              <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>Valid: {activeConstraints.wetness_index.min} - {activeConstraints.wetness_index.max}</Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* SECTION 3: THERMAL & FREEZE-THAW */}
      <Paper sx={{ p: 2.5, mb: 3, bgcolor: 'rgba(15, 23, 42, 0.8)', border: `1px solid ${metrics.color}50`, borderRadius: '12px', transition: 'border-color 0.3s ease' }}>
        <Typography variant="h6" sx={{ color: metrics.color, fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1, transition: 'color 0.3s ease' }}>
          <TempIcon /> 3. Thermal & Freeze-Thaw ({activeConstraints.name})
        </Typography>

        <Grid container spacing={3}>
          {/* Factor 8: Temperature */}
          <Grid item xs={12} sm={4}>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(9, 13, 22, 0.7)', border: '1px solid rgba(30, 41, 59, 0.8)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>Factor 8: Temperature (°C)</Typography>
                <Typography variant="caption" className="mono-font" sx={{ color: metrics.color, fontWeight: 700 }}>{formData.temperature}°C</Typography>
              </Box>
              <Slider min={activeConstraints.temperature.min} max={activeConstraints.temperature.max} value={formData.temperature} onChange={(e, val) => handleFactorChange('temperature', val)} sx={{ color: metrics.color }} />
              <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>Valid: {activeConstraints.temperature.min} - {activeConstraints.temperature.max}°C</Typography>
            </Box>
          </Grid>

          {/* Factor 9: Temp Variation */}
          <Grid item xs={12} sm={4}>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(9, 13, 22, 0.7)', border: '1px solid rgba(30, 41, 59, 0.8)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>Factor 9: Temp Delta (°C)</Typography>
                <Typography variant="caption" className="mono-font" sx={{ color: metrics.color, fontWeight: 700 }}>{formData.temperature_variation}°C</Typography>
              </Box>
              <Slider min={activeConstraints.temperature_variation.min} max={activeConstraints.temperature_variation.max} value={formData.temperature_variation} onChange={(e, val) => handleFactorChange('temperature_variation', val)} sx={{ color: metrics.color }} />
              <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>Valid: {activeConstraints.temperature_variation.min} - {activeConstraints.temperature_variation.max}°C</Typography>
            </Box>
          </Grid>

          {/* Factor 10: Freeze-Thaw Cycles */}
          <Grid item xs={12} sm={4}>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(9, 13, 22, 0.7)', border: '1px solid rgba(30, 41, 59, 0.8)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>Factor 10: Freeze-Thaw Cycles</Typography>
                <Typography variant="caption" className="mono-font" sx={{ color: metrics.color, fontWeight: 700 }}>{formData.freeze_thaw_cycles} cycles</Typography>
              </Box>
              <Slider min={activeConstraints.freeze_thaw_cycles.min} max={activeConstraints.freeze_thaw_cycles.max} value={formData.freeze_thaw_cycles} onChange={(e, val) => handleFactorChange('freeze_thaw_cycles', val)} sx={{ color: metrics.color }} />
              <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>Valid: {activeConstraints.freeze_thaw_cycles.min} - {activeConstraints.freeze_thaw_cycles.max} cycles</Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* SECTION 4: GEOLOGICAL STRUCTURE (6 FACTORS) */}
      <Paper sx={{ p: 2.5, mb: 3, bgcolor: 'rgba(15, 23, 42, 0.8)', border: `1px solid ${metrics.color}50`, borderRadius: '12px', transition: 'border-color 0.3s ease' }}>
        <Typography variant="h6" sx={{ color: metrics.color, fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1, transition: 'color 0.3s ease' }}>
          <TerrainIcon /> 4. Geological & Geotechnical Structure (6 Parameters - Independent)
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={4}>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(9, 13, 22, 0.7)', border: '1px solid rgba(30, 41, 59, 0.8)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>Factor 11: Slope Incline (°)</Typography>
                <Typography variant="caption" className="mono-font" sx={{ color: metrics.color, fontWeight: 700 }}>{formData.slope}°</Typography>
              </Box>
              <Slider min={10} max={75} value={formData.slope} onChange={(e, val) => handleFactorChange('slope', val)} sx={{ color: metrics.color }} />
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(9, 13, 22, 0.7)', border: '1px solid rgba(30, 41, 59, 0.8)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>Factor 12: Elevation (m)</Typography>
                <Typography variant="caption" className="mono-font" sx={{ color: metrics.color, fontWeight: 700 }}>{formData.elevation}m</Typography>
              </Box>
              <Slider min={300} max={4000} step={50} value={formData.elevation} onChange={(e, val) => handleFactorChange('elevation', val)} sx={{ color: metrics.color }} />
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(9, 13, 22, 0.7)', border: '1px solid rgba(30, 41, 59, 0.8)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>Factor 13: Fractures (/m²)</Typography>
                <Typography variant="caption" className="mono-font" sx={{ color: metrics.color, fontWeight: 700 }}>{formData.fracture_density} /m²</Typography>
              </Box>
              <Slider min={0.5} max={6.0} step={0.1} value={formData.fracture_density} onChange={(e, val) => handleFactorChange('fracture_density', val)} sx={{ color: metrics.color }} />
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(9, 13, 22, 0.7)', border: '1px solid rgba(30, 41, 59, 0.8)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>Factor 14: Surface Roughness</Typography>
                <Typography variant="caption" className="mono-font" sx={{ color: metrics.color, fontWeight: 700 }}>{formData.roughness}</Typography>
              </Box>
              <Slider min={0.1} max={1.0} step={0.05} value={formData.roughness} onChange={(e, val) => handleFactorChange('roughness', val)} sx={{ color: metrics.color }} />
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(9, 13, 22, 0.7)', border: '1px solid rgba(30, 41, 59, 0.8)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>Factor 15: Slope Variability</Typography>
                <Typography variant="caption" className="mono-font" sx={{ color: metrics.color, fontWeight: 700 }}>{formData.slope_variability}</Typography>
              </Box>
              <Slider min={0.1} max={1.0} step={0.05} value={formData.slope_variability} onChange={(e, val) => handleFactorChange('slope_variability', val)} sx={{ color: metrics.color }} />
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(9, 13, 22, 0.7)', border: '1px solid rgba(30, 41, 59, 0.8)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>Factor 16: Instability Index</Typography>
                <Typography variant="caption" className="mono-font" sx={{ color: metrics.color, fontWeight: 700 }}>{formData.instability_index}</Typography>
              </Box>
              <Slider min={0.0} max={1.0} step={0.05} value={formData.instability_index} onChange={(e, val) => handleFactorChange('instability_index', val)} sx={{ color: metrics.color }} />
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* SECTION 5: DISTURBANCES & DYNAMIC RISK GAUGE */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2.5, height: '100%', bgcolor: 'rgba(15, 23, 42, 0.8)', border: `1px solid ${metrics.color}50`, borderRadius: '12px', transition: 'border-color 0.3s ease' }}>
            <Typography variant="h6" sx={{ color: metrics.color, fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1, transition: 'color 0.3s ease' }}>
              <WindIcon /> 5. Disturbances (2 Parameters - Independent)
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(9, 13, 22, 0.7)', border: '1px solid rgba(30, 41, 59, 0.8)' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>Factor 17: Seismic Tremor</Typography>
                    <Typography variant="caption" className="mono-font" sx={{ color: metrics.color, fontWeight: 700 }}>{formData.seismic_activity} ML</Typography>
                  </Box>
                  <Slider min={0.0} max={5.0} step={0.1} value={formData.seismic_activity} onChange={(e, val) => handleFactorChange('seismic_activity', val)} sx={{ color: metrics.color }} />
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(9, 13, 22, 0.7)', border: '1px solid rgba(30, 41, 59, 0.8)' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>Factor 18: Wind Speed</Typography>
                    <Typography variant="caption" className="mono-font" sx={{ color: metrics.color, fontWeight: 700 }}>{formData.wind_speed} km/h</Typography>
                  </Box>
                  <Slider min={0} max={100} value={formData.wind_speed} onChange={(e, val) => handleFactorChange('wind_speed', val)} sx={{ color: metrics.color }} />
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Factor 19: Output Risk Dial */}
        <Grid item xs={12} md={5}>
          <Card className="glass-card" sx={{ height: '100%', border: `1px solid ${metrics.color}60`, transition: 'border-color 0.3s ease' }}>
            <CardContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: '12px',
                  bgcolor: 'rgba(15, 23, 42, 0.85)',
                  border: `2px solid ${metrics.color}`,
                  boxShadow: `0 0 25px ${metrics.color}40`,
                  textAlign: 'center',
                  transition: 'all 0.3s ease',
                  mb: 2
                }}
              >
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, display: 'block', mb: 0.5 }}>
                  FACTOR 19: CALCULATED SLOPE FAILURE PROBABILITY
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 800, color: metrics.color, letterSpacing: '-0.02em', transition: 'color 0.3s ease' }}>
                  {metrics.totalScore}%
                </Typography>
                <Chip
                  label={`${metrics.riskLevel} RISK LEVEL (${activeConstraints.name})`}
                  sx={{
                    mt: 1,
                    bgcolor: `${metrics.color}25`,
                    color: metrics.color,
                    border: `1px solid ${metrics.color}`,
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    transition: 'all 0.3s ease'
                  }}
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ color: '#f8fafc', fontWeight: 700, mb: 0.5 }}>
                  Safety Protocol Response:
                </Typography>
                <List disablePadding>
                  {metrics.recommendations.map((rec, idx) => (
                    <ListItem key={idx} sx={{ px: 0, py: 0.4 }}>
                      <ListItemIcon sx={{ minWidth: 22 }}>
                        <CheckIcon sx={{ color: metrics.color, fontSize: 14 }} />
                      </ListItemIcon>
                      <ListItemText primary={rec} primaryTypographyProps={{ fontSize: '0.75rem', color: '#94a3b8' }} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* SECTION 6: INTERACTIVE ANALYTICS GRAPHS */}
      <Grid container spacing={3}>
        {/* Dynamic Risk Bar Chart */}
        <Grid item xs={12} md={6}>
          <Card className="glass-card" sx={{ border: `1px solid ${metrics.color}40`, transition: 'border-color 0.3s ease' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ChartIcon sx={{ color: metrics.color }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#f8fafc' }}>
                    Factor Intensity Bar Graph
                  </Typography>
                </Box>
                <Chip
                  label={`COLOR: ${metrics.riskLevel} RISK`}
                  size="small"
                  sx={{ bgcolor: `${metrics.color}20`, color: metrics.color, border: `1px solid ${metrics.color}`, fontWeight: 700 }}
                />
              </Box>

              <Box sx={{ width: '100%', height: 270 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(30, 41, 59, 0.6)" />
                    <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#090d16', borderColor: metrics.color, color: '#fff' }}
                      formatter={(val) => [`${val}% Intensity`, 'Factor Load']}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {metrics.barData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={metrics.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Multi-Axis Radar Chart */}
        <Grid item xs={12} md={6}>
          <Card className="glass-card" sx={{ border: `1px solid ${metrics.color}40`, transition: 'border-color 0.3s ease' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <AssessmentIcon sx={{ color: metrics.color }} />
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#f8fafc' }}>
                  Risk Footprint Radar
                </Typography>
              </Box>

              <Box sx={{ width: '100%', height: 270 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={metrics.radarData}>
                    <PolarGrid stroke="rgba(30, 41, 59, 0.8)" />
                    <PolarAngleAxis dataKey="factor" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" />
                    <Radar name="Risk Index" dataKey="score" stroke={metrics.color} fill={metrics.color} fillOpacity={0.45} />
                  </RadarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

export default RiskAssessment