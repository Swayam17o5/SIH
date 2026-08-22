import React from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Divider,
  Stack,
  Chip,
  Alert
} from '@mui/material'
import {
  Terrain as TerrainIcon,
  Palette as PaletteIcon,
  ShowChart as SlopeIcon,
  LocationOn as LocationIcon,
  Shield as ShieldIcon,
  Science as ScienceIcon,
  Public as PublicIcon,
  Analytics as AnalyticsIcon,
  Layers as LayersIcon,
  Straighten as ResolutionIcon
} from '@mui/icons-material'
import { motion } from 'framer-motion'

const DemStatsPanel = ({ statistics, selectedFile, demFiles, sourceInfo }) => {
  const fileInfo = demFiles.find(f => f.id === selectedFile) || {}
  const metaSource = sourceInfo || fileInfo

  const colorScale = [
    {
      color: '#42c9d0',
      title: 'Gentle Slope (< 20°)',
      desc: 'Quarry floor, haul roads, stable pit benches'
    },
    {
      color: '#ffb020',
      title: 'Moderate Slope (20° - 35°)',
      desc: 'Graded haul ramps, intermediate terraces'
    },
    {
      color: '#ff6f2b',
      title: 'Steep Highwall (35° - 48°)',
      desc: 'Highwalls, bench slopes (High Hazard)'
    },
    {
      color: '#d84620',
      title: 'Critical Face (> 48°)',
      desc: 'Overhangs, high-risk active rockfall scarps'
    }
  ]

  const maxSlope = statistics?.max_slope_deg ?? statistics?.steep_point?.slope_deg ?? 0
  const meanSlope = statistics?.mean_slope_deg ?? statistics?.meanSlope ?? 0
  const medianSlope = statistics?.median_slope_deg ?? statistics?.medianSlope ?? 0
  const stdSlope = statistics?.std_slope_deg ?? 0
  const areaGt30 = statistics?.slope_area_gt_30 ?? statistics?.slopeAreaGt30 ?? 0
  const areaGt40 = statistics?.slope_area_gt_40 ?? statistics?.slopeAreaGt40 ?? 0
  const areaGt48 = statistics?.slope_area_gt_48 ?? statistics?.slopeAreaGt48 ?? 0
  const roughness = statistics?.roughness_tri ?? statistics?.roughness ?? 0
  const curvature = statistics?.curvature ?? 0
  const riskScore = statistics?.risk_score ?? statistics?.riskScore ?? 0

  let riskBadgeColor = '#42c9d0'
  let riskBadgeBg = 'rgba(66, 201, 208, 0.12)'
  let riskLabel = statistics?.risk_level || 'Moderate'

  if (riskLabel === 'Critical') {
    riskBadgeColor = '#d84620'
    riskBadgeBg = 'rgba(216, 70, 32, 0.15)'
  } else if (riskLabel === 'High') {
    riskBadgeColor = '#ff6f2b'
    riskBadgeBg = 'rgba(255, 111, 43, 0.15)'
  } else if (riskLabel === 'Moderate') {
    riskBadgeColor = '#ffb020'
    riskBadgeBg = 'rgba(255, 176, 32, 0.15)'
  } else {
    riskBadgeColor = '#42c9d0'
    riskBadgeBg = 'rgba(66, 201, 208, 0.12)'
    riskLabel = 'Low'
  }

  const isRealData = metaSource?.is_real_data !== false && metaSource?.source_type !== 'synthetic'

  const MetricCard = ({ title, value, unit, color, icon }) => (
    <Card sx={{ backgroundColor: '#0b1329', border: '1px solid #1e293b' }}>
      <CardContent sx={{ textAlign: 'center', py: 1.25, px: 1, '&:last-child': { pb: 1.25 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.25 }}>
          {icon}
        </Box>
        <Typography variant="h6" sx={{ color: color, fontWeight: 700, mb: 0.25, fontSize: '1.1rem' }}>
          {value}
        </Typography>
        <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.68rem', display: 'block' }}>
          {unit}
        </Typography>
        <Typography variant="body2" sx={{ color: '#e2e8f0', mt: 0.25, fontWeight: 600, fontSize: '0.73rem' }}>
          {title}
        </Typography>
      </CardContent>
    </Card>
  )

  return (
    <Stack spacing={2.5}>
      {/* Primary Multi-Factor Statistics Card */}
      {statistics && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card sx={{ backgroundColor: '#111c38', border: '1px solid #1e293b' }}>
            <CardContent sx={{ p: 2.5 }}>
              {/* Header with Risk Level Badge & Score */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <AnalyticsIcon sx={{ color: '#06b6d4', mr: 1, fontSize: '1.3rem' }} />
                  <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, fontSize: '1rem' }}>
                    Geomorphic Risk Index
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {riskScore > 0 && (
                    <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                      Score: {riskScore}/100
                    </Typography>
                  )}
                  <Chip
                    icon={<ShieldIcon sx={{ color: `${riskBadgeColor} !important`, fontSize: '0.9rem' }} />}
                    label={`${riskLabel} Risk`}
                    size="small"
                    sx={{
                      backgroundColor: riskBadgeBg,
                      color: riskBadgeColor,
                      fontWeight: 700,
                      border: `1px solid ${riskBadgeColor}60`
                    }}
                  />
                </Box>
              </Box>

              {/* Data Provenance & Location Box */}
              <Box sx={{ mb: 2, p: 1.5, backgroundColor: '#0b1329', borderRadius: 1.5, border: '1px solid #1e293b' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Mine Site & Provenance
                  </Typography>
                  <Chip
                    icon={isRealData ? <PublicIcon sx={{ fontSize: '0.85rem !important' }} /> : <ScienceIcon sx={{ fontSize: '0.85rem !important' }} />}
                    label={isRealData ? 'REAL DEM DATA' : 'SYNTHETIC DEM'}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      backgroundColor: isRealData ? 'rgba(6, 182, 212, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                      color: isRealData ? '#06b6d4' : '#eab308',
                      border: `1px solid ${isRealData ? '#06b6d470' : '#eab30870'}`
                    }}
                  />
                </Box>

                <Typography variant="body2" sx={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.85rem', mb: 0.25 }}>
                  {metaSource?.name || selectedFile}
                </Typography>

                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <LocationIcon sx={{ fontSize: '0.9rem', color: '#f97316' }} />
                  {metaSource?.region ? `${metaSource.region}, ${metaSource.country}` : metaSource?.country || 'Location Registered'}
                  {metaSource?.mine_type && ` • ${metaSource.mine_type}`}
                </Typography>

                <Divider sx={{ my: 1, borderColor: '#1e293b' }} />

                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                      DEM Source:
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#38bdf8', fontWeight: 600, display: 'block' }}>
                      {metaSource?.source || 'Copernicus / SRTM 30m'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                      Resolution & CRS:
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#cbd5e1', fontWeight: 600, display: 'block' }}>
                      {metaSource?.resolution_m || '30m'} • {statistics.crs || 'EPSG:4326'}
                    </Typography>
                  </Grid>
                </Grid>

                {metaSource?.disclaimer && (
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.75, fontStyle: 'italic', fontSize: '0.68rem' }}>
                    {metaSource.disclaimer}
                  </Typography>
                )}
              </Box>

              {/* Slope & Hazard Metrics Grid */}
              <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, mb: 1, display: 'block' }}>
                Slope Distribution & Relief
              </Typography>
              <Grid container spacing={1.25} sx={{ mb: 2 }}>
                <Grid item xs={6} sm={4}>
                  <MetricCard
                    title="Mean Slope"
                    value={meanSlope ? `${meanSlope}°` : 'N/A'}
                    unit="average gradient"
                    color="#38bdf8"
                    icon={<SlopeIcon sx={{ color: '#38bdf8', fontSize: '1.1rem' }} />}
                  />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <MetricCard
                    title="Max Slope"
                    value={maxSlope ? `${maxSlope}°` : 'N/A'}
                    unit="critical bench angle"
                    color={maxSlope >= 48 ? '#ef4444' : maxSlope >= 35 ? '#f97316' : '#eab308'}
                    icon={<SlopeIcon sx={{ color: maxSlope >= 48 ? '#ef4444' : '#f97316', fontSize: '1.1rem' }} />}
                  />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <MetricCard
                    title="Median Slope"
                    value={medianSlope ? `${medianSlope}°` : 'N/A'}
                    unit="50th percentile"
                    color="#a855f7"
                    icon={<SlopeIcon sx={{ color: '#a855f7', fontSize: '1.1rem' }} />}
                  />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <MetricCard
                    title="Area > 30°"
                    value={`${areaGt30}%`}
                    unit="steep terrain"
                    color={areaGt30 > 10 ? '#f97316' : '#10b981'}
                    icon={<TerrainIcon sx={{ color: areaGt30 > 10 ? '#f97316' : '#10b981', fontSize: '1.1rem' }} />}
                  />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <MetricCard
                    title="Area > 48°"
                    value={`${areaGt48}%`}
                    unit="critical rockfall risk"
                    color={areaGt48 > 2 ? '#ef4444' : '#22c55e'}
                    icon={<TerrainIcon sx={{ color: areaGt48 > 2 ? '#ef4444' : '#22c55e', fontSize: '1.1rem' }} />}
                  />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <MetricCard
                    title="Elev. Relief"
                    value={statistics.elevation_range ? `${statistics.elevation_range}m` : 'N/A'}
                    unit="min to max range"
                    color="#eab308"
                    icon={<TerrainIcon sx={{ color: '#eab308', fontSize: '1.1rem' }} />}
                  />
                </Grid>
              </Grid>

              {/* Geomorphic Characteristics: Roughness & Curvature */}
              <Box sx={{ backgroundColor: '#0b1329', p: 1.5, borderRadius: 1.5, border: '1px solid #1e293b' }}>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.75, display: 'block' }}>
                  Geomorphological Parameters
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                      Roughness (TRI):
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#e2e8f0', fontWeight: 600 }}>
                      {roughness ? `${roughness} m` : 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                      Mean Curvature:
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#e2e8f0', fontWeight: 600 }}>
                      {curvature ? `${curvature} m⁻¹` : 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sx={{ mt: 0.5 }}>
                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                      Elevation Span:
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#cbd5e1', fontSize: '0.8rem' }}>
                      {statistics.min_elevation}m (min) → {statistics.max_elevation}m (max) | Avg: {statistics.mean_elevation}m
                    </Typography>
                  </Grid>
                  {statistics.valid_pixel_count && (
                    <Grid item xs={12}>
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                        Raster Pixels: {statistics.valid_pixel_count.toLocaleString()} valid cells ({statistics.area_km2 || 'N/A'} km²)
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Slope & Elevation Color Scale Legend */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        <Card sx={{ backgroundColor: '#111c38', border: '1px solid #1e293b' }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
              <PaletteIcon sx={{ color: '#06b6d4', mr: 1, fontSize: '1.2rem' }} />
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, fontSize: '0.95rem' }}>
                Slope Hazard Ramp Legend
              </Typography>
            </Box>
            <Stack spacing={1}>
              {colorScale.map((item, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      backgroundColor: item.color,
                      borderRadius: 0.75,
                      flexShrink: 0,
                      boxShadow: `0 0 6px ${item.color}50`
                    }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ color: 'white', fontWeight: 600, fontSize: '0.8rem' }}>
                      {item.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.7rem' }}>
                      {item.desc}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </motion.div>
    </Stack>
  )
}

export default DemStatsPanel
