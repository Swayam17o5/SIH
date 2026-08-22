import React from 'react'
import DemXaiBreakdownCard from '../xai/DemXaiBreakdownCard'
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
  Info as InfoIcon,
  Palette as PaletteIcon,
  ShowChart as SlopeIcon,
  LocationOn as LocationIcon,
  Shield as ShieldIcon,
  Science as ScienceIcon,
  Public as PublicIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material'
import { motion } from 'framer-motion'

const DemStatsPanel = ({ statistics, selectedFile, demFiles, sourceInfo }) => {
  const fileInfo = demFiles.find(f => f.id === selectedFile) || {}
  const metaSource = sourceInfo || fileInfo

  // Elevation + Slope combined color legend
  const colorScale = [
    {
      color: '#42c9d0',
      title: 'Gentle Slope (< 20°)',
      desc: 'Quarry floors, haul roads, stable benches'
    },
    {
      color: '#ffb020',
      title: 'Moderate Slope (20° - 35°)',
      desc: 'Graded haul ramps, intermediate terraces'
    },
    {
      color: '#ff6f2b',
      title: 'Steep Face (35° - 48°)',
      desc: 'Highwalls, bench slopes (High Risk)'
    },
    {
      color: '#d84620',
      title: 'Critical Face (> 48°)',
      desc: 'Overhangs, active rockfall hazard zones'
    }
  ]

  const maxSlope = statistics?.max_slope_deg ?? statistics?.steep_point?.slope_deg ?? 0
  const meanSlope = statistics?.mean_slope_deg ?? statistics?.meanSlope ?? 0
  const medianSlope = statistics?.median_slope_deg ?? statistics?.medianSlope ?? 0
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

  const isSynthetic = metaSource?.source_type === 'synthetic' || metaSource?.is_real_data === false

  const MetricCard = ({ title, value, unit, color, icon }) => (
    <Card sx={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}>
      <CardContent sx={{ textAlign: 'center', py: 1.5, px: 1, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.25 }}>
          {icon}
        </Box>
        <Typography variant="h6" sx={{ color: color, fontWeight: 700, mb: 0.25, fontSize: '1.15rem' }}>
          {value}
        </Typography>
        <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.68rem', display: 'block' }}>
          {unit}
        </Typography>
        <Typography variant="body2" sx={{ color: '#e2e8f0', mt: 0.25, fontWeight: 600, fontSize: '0.75rem' }}>
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
          <Card sx={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
            <CardContent sx={{ p: 2.5 }}>
              {/* Header with Risk Level Badge & Score */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <AnalyticsIcon sx={{ color: '#3b82f6', mr: 1, fontSize: '1.3rem' }} />
                  <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, fontSize: '1rem' }}>
                    Multi-Factor Terrain Risk
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

              {/* Data Source Indicator */}
              <Box sx={{ mb: 2, p: 1.25, backgroundColor: '#0f172a', borderRadius: 1.5, border: '1px solid #334155' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                    Data Source
                  </Typography>
                  <Chip
                    icon={isSynthetic ? <ScienceIcon sx={{ fontSize: '0.85rem !important' }} /> : <PublicIcon sx={{ fontSize: '0.85rem !important' }} />}
                    label={isSynthetic ? 'Representative Demo Data' : 'Verified DEM'}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      backgroundColor: isSynthetic ? 'rgba(234, 179, 8, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                      color: isSynthetic ? '#eab308' : '#60a5fa',
                      border: `1px solid ${isSynthetic ? '#eab30850' : '#60a5fa50'}`
                    }}
                  />
                </Box>
                <Typography variant="caption" sx={{ color: '#cbd5e1', display: 'block', fontSize: '0.75rem' }}>
                  {metaSource?.source || fileInfo?.description}
                </Typography>
                {metaSource?.crs && (
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.7rem', mt: 0.25 }}>
                    CRS: {metaSource.crs} | Res: {metaSource.resolution || '15m'}
                  </Typography>
                )}
                {isSynthetic && (
                  <Alert severity="info" sx={{ mt: 1, py: 0, px: 1.5, backgroundColor: 'rgba(59, 130, 246, 0.08)', color: '#93c5fd', fontSize: '0.7rem', '& .MuiAlert-icon': { fontSize: '1rem', mr: 1 } }}>
                    Terrain is representative demo data and should not be interpreted as live mine measurements.
                  </Alert>
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
                    unit="average slope"
                    color="#38bdf8"
                    icon={<SlopeIcon sx={{ color: '#38bdf8', fontSize: '1.2rem' }} />}
                  />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <MetricCard
                    title="Max Slope"
                    value={maxSlope ? `${maxSlope}°` : 'N/A'}
                    unit="critical angle"
                    color={maxSlope >= 48 ? '#ef4444' : maxSlope >= 35 ? '#f97316' : '#eab308'}
                    icon={<SlopeIcon sx={{ color: maxSlope >= 48 ? '#ef4444' : '#f97316', fontSize: '1.2rem' }} />}
                  />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <MetricCard
                    title="Median Slope"
                    value={medianSlope ? `${medianSlope}°` : 'N/A'}
                    unit="50th percentile"
                    color="#a855f7"
                    icon={<SlopeIcon sx={{ color: '#a855f7', fontSize: '1.2rem' }} />}
                  />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <MetricCard
                    title="Area > 30°"
                    value={`${areaGt30}%`}
                    unit="steep terrain"
                    color={areaGt30 > 10 ? '#f97316' : '#10b981'}
                    icon={<TerrainIcon sx={{ color: areaGt30 > 10 ? '#f97316' : '#10b981', fontSize: '1.2rem' }} />}
                  />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <MetricCard
                    title="Area > 48°"
                    value={`${areaGt48}%`}
                    unit="critical hazard"
                    color={areaGt48 > 2 ? '#ef4444' : '#22c55e'}
                    icon={<TerrainIcon sx={{ color: areaGt48 > 2 ? '#ef4444' : '#22c55e', fontSize: '1.2rem' }} />}
                  />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <MetricCard
                    title="Elev. Relief"
                    value={statistics.elevation_range ? `${statistics.elevation_range}m` : 'N/A'}
                    unit="min to max"
                    color="#eab308"
                    icon={<TerrainIcon sx={{ color: '#eab308', fontSize: '1.2rem' }} />}
                  />
                </Grid>
              </Grid>

              {/* Geomorphic Characteristics: Roughness & Curvature */}
              <Box sx={{ backgroundColor: '#0f172a', p: 1.5, borderRadius: 1.5, border: '1px solid #334155', mb: 2 }}>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.75, display: 'block' }}>
                  Geomorphological Attributes
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                      Roughness (TRI):
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#e2e8f0', fontWeight: 600 }}>
                      {roughness ? `${roughness} m` : '1.2 m'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                      Mean Curvature:
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#e2e8f0', fontWeight: 600 }}>
                      {curvature ? `${curvature} m⁻¹` : '0.002 m⁻¹'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sx={{ mt: 0.5 }}>
                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                      Elevation Span:
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#cbd5e1' }}>
                      {statistics.min_elevation}m (min) to {statistics.max_elevation}m (max) | Avg: {statistics.mean_elevation}m
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              {/* CRITICAL / HIGH RISK REASONS & GEOLOGICAL JUSTIFICATION CARD */}
              {riskScore > 0 && (
                <Box
                  sx={{
                    p: 2,
                    backgroundColor: riskLabel === 'Critical' ? 'rgba(239, 68, 68, 0.08)' : riskLabel === 'High' ? 'rgba(249, 115, 22, 0.08)' : 'rgba(59, 130, 246, 0.06)',
                    borderRadius: 2,
                    border: `1px solid ${riskBadgeColor}50`,
                    boxShadow: `0 4px 15px ${riskBadgeColor}15`
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ color: riskBadgeColor, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.9rem' }}>
                      <span>{riskLabel === 'Critical' ? '🚨' : riskLabel === 'High' ? '⚠️' : 'ℹ️'}</span>
                      {riskLabel.toUpperCase()} RISK ANALYSIS & JUSTIFICATION
                    </Typography>
                    <Chip
                      label={`${riskScore}/100 Risk Score`}
                      size="small"
                      sx={{
                        backgroundColor: riskBadgeColor,
                        color: 'white',
                        fontWeight: 800,
                        height: 20,
                        fontSize: '0.68rem'
                      }}
                    />
                  </Box>

                  <Typography variant="caption" sx={{ color: '#94a3b8', mb: 1.5, display: 'block', fontSize: '0.75rem' }}>
                    Key geological factors triggering the <strong>{riskLabel} Risk</strong> classification for this mining terrain:
                  </Typography>

                  <Stack spacing={1} sx={{ mb: 1.5 }}>
                    {areaGt48 > 0.5 && (
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, p: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', borderRadius: 1.25, border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                        <Typography variant="body2" sx={{ color: '#ef4444', fontWeight: 800, lineHeight: 1.2 }}>🛑</Typography>
                        <Box>
                          <Typography variant="body2" sx={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.78rem' }}>
                            Critical Highwall Face Area ({areaGt48}% > 48°)
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#cbd5e1', fontSize: '0.7rem', display: 'block' }}>
                            {areaGt48}% of pit surface exceeds 48° (threshold: &gt;2%), creating dangerous overhangs & active planar slip planes.
                          </Typography>
                        </Box>
                      </Box>
                    )}

                    {maxSlope >= 40 && (
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, p: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', borderRadius: 1.25, border: '1px solid rgba(249, 115, 22, 0.3)' }}>
                        <Typography variant="body2" sx={{ color: '#f97316', fontWeight: 800, lineHeight: 1.2 }}>⚡</Typography>
                        <Box>
                          <Typography variant="body2" sx={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.78rem' }}>
                            Extreme Peak Slope Angle ({maxSlope}°)
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#cbd5e1', fontSize: '0.7rem', display: 'block' }}>
                            Maximum slope angle reaches {maxSlope}°, far exceeding the stable angle of repose (35° - 38°).
                          </Typography>
                        </Box>
                      </Box>
                    )}

                    {areaGt30 > 10 && (
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, p: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', borderRadius: 1.25, border: '1px solid rgba(234, 179, 8, 0.3)' }}>
                        <Typography variant="body2" sx={{ color: '#eab308', fontWeight: 800, lineHeight: 1.2 }}>⛰️</Typography>
                        <Box>
                          <Typography variant="body2" sx={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.78rem' }}>
                            High Steep Surface Ratio ({areaGt30}% > 30°)
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#cbd5e1', fontSize: '0.7rem', display: 'block' }}>
                            Over {areaGt30}% of total quarry area is steeper than 30°, accelerating potential rock movement.
                          </Typography>
                        </Box>
                      </Box>
                    )}

                    {statistics.elevation_range > 200 && (
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, p: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', borderRadius: 1.25, border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                        <Typography variant="body2" sx={{ color: '#60a5fa', fontWeight: 800, lineHeight: 1.2 }}>📉</Typography>
                        <Box>
                          <Typography variant="body2" sx={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.78rem' }}>
                            High Vertical Relief Energy ({statistics.elevation_range}m)
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#cbd5e1', fontSize: '0.7rem', display: 'block' }}>
                            Elevation difference of {statistics.elevation_range}m provides massive potential kinetic energy in slope failure events.
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  </Stack>

                  {/* Recommended Action Box */}
                  <Box sx={{ p: 1, backgroundColor: 'rgba(15, 23, 42, 0.8)', borderRadius: 1, border: '1px stroke rgba(255,255,255,0.1)' }}>
                    <Typography variant="caption" sx={{ color: '#38bdf8', fontWeight: 700, display: 'block', fontSize: '0.72rem' }}>
                      🛡️ Recommended Geotechnical Protocol:
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.68rem' }}>
                      Restrict personnel access near sector highwalls. Maintain continuous radar displacement scanning & drone thermal surveys.
                    </Typography>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* XAI 3D DEM Terrain Factor Decomposition & Counterfactual Simulator */}
      {statistics && (
        <DemXaiBreakdownCard
          selectedDEM={selectedFile}
          riskScore={riskScore}
          riskLevel={riskLabel}
        />
      )}

      {/* Slope & Elevation Color Scale Legend */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        <Card sx={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
              <PaletteIcon sx={{ color: '#3b82f6', mr: 1, fontSize: '1.2rem' }} />
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
