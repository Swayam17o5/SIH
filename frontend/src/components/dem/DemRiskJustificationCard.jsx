import React from 'react'
import { Card, CardContent, Typography, Box, Stack, Chip, Grid } from '@mui/material'

const DemRiskJustificationCard = ({ statistics }) => {
  if (!statistics) return null

  const maxSlope = statistics?.max_slope_deg ?? statistics?.steep_point?.slope_deg ?? 0
  const areaGt30 = statistics?.slope_area_gt_30 ?? statistics?.slopeAreaGt30 ?? 0
  const areaGt48 = statistics?.slope_area_gt_48 ?? statistics?.slopeAreaGt48 ?? 0
  const riskScore = statistics?.risk_score ?? statistics?.riskScore ?? 0
  const riskLabel = statistics?.risk_level || 'Moderate'

  let riskBadgeColor = '#42c9d0'
  if (riskLabel === 'Critical') riskBadgeColor = '#ef4444'
  else if (riskLabel === 'High') riskBadgeColor = '#f97316'
  else if (riskLabel === 'Moderate') riskBadgeColor = '#eab308'

  return (
    <Card sx={{ backgroundColor: '#1e293b', border: `1px solid ${riskBadgeColor}50`, borderRadius: 2, mt: 3, boxShadow: `0 8px 25px ${riskBadgeColor}15` }}>
      <CardContent sx={{ p: 2.5 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h6" sx={{ color: riskBadgeColor, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, fontSize: '1rem' }}>
            <span>{riskLabel === 'Critical' ? '🚨' : riskLabel === 'High' ? '⚠️' : 'ℹ️'}</span>
            GEOLOGICAL RISK ANALYSIS & JUSTIFICATION
          </Typography>
          <Chip
            label={`${riskScore}/100 Risk Score (${riskLabel} Risk)`}
            size="small"
            sx={{
              backgroundColor: riskBadgeColor,
              color: 'white',
              fontWeight: 800,
              fontSize: '0.75rem'
            }}
          />
        </Box>

        <Typography variant="body2" sx={{ color: '#cbd5e1', mb: 2, fontSize: '0.82rem' }}>
          Key geological factors triggering the <strong>{riskLabel} Risk</strong> classification for this mining terrain:
        </Typography>

        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          {/* 1. Critical Highwall Face Area */}
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 1.5, backgroundColor: '#0f172a', borderRadius: 1.5, border: '1px solid rgba(239, 68, 68, 0.3)', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="body1" sx={{ color: '#ef4444', fontWeight: 800 }}>🛑</Typography>
                <Typography variant="subtitle2" sx={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.82rem' }}>
                  Highwall Face Area ({areaGt48 > 0 ? `${areaGt48}% > 48°` : 'Steep Sector Identified'})
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: '#cbd5e1', fontSize: '0.75rem', display: 'block' }}>
                {areaGt48 > 0 
                  ? `${areaGt48}% of pit surface exceeds 48° (critical threshold >2%), creating active planar slip planes & cliff overhangs.`
                  : `Steep highwall sectors create localized shear stress along bench faces.`}
              </Typography>
            </Box>
          </Grid>

          {/* 2. Extreme Peak Slope Angle */}
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 1.5, backgroundColor: '#0f172a', borderRadius: 1.5, border: '1px solid rgba(249, 115, 22, 0.3)', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="body1" sx={{ color: '#f97316', fontWeight: 800 }}>⚡</Typography>
                <Typography variant="subtitle2" sx={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.82rem' }}>
                  Peak Slope Angle ({maxSlope}°)
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: '#cbd5e1', fontSize: '0.75rem', display: 'block' }}>
                Maximum slope angle reaches {maxSlope}°, {maxSlope >= 38 ? 'exceeding the natural stable angle of repose (35° – 38°)' : 'approaching bench stability limit'}.
              </Typography>
            </Box>
          </Grid>

          {/* 3. High Steep Surface Ratio */}
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 1.5, backgroundColor: '#0f172a', borderRadius: 1.5, border: '1px solid rgba(234, 179, 8, 0.3)', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="body1" sx={{ color: '#eab308', fontWeight: 800 }}>⛰️</Typography>
                <Typography variant="subtitle2" sx={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.82rem' }}>
                  Steep Surface Ratio ({areaGt30}% &gt; 30°)
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: '#cbd5e1', fontSize: '0.75rem', display: 'block' }}>
                {areaGt30}% of total quarry surface is steeper than 30°, accelerating potential bench displacement under moisture influx.
              </Typography>
            </Box>
          </Grid>

          {/* 4. Vertical Relief Energy */}
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 1.5, backgroundColor: '#0f172a', borderRadius: 1.5, border: '1px solid rgba(59, 130, 246, 0.3)', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="body1" sx={{ color: '#60a5fa', fontWeight: 800 }}>📉</Typography>
                <Typography variant="subtitle2" sx={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.82rem' }}>
                  Vertical Relief Energy ({statistics?.elevation_range || 250}m)
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: '#cbd5e1', fontSize: '0.75rem', display: 'block' }}>
                Elevation span of {statistics?.elevation_range || 250}m provides gravitational potential kinetic energy during rock movements.
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Recommended Geotechnical Protocol */}
        <Box sx={{ p: 1.5, backgroundColor: '#0f172a', borderRadius: 1.5, border: '1px solid rgba(56, 189, 248, 0.3)', mb: 2.5 }}>
          <Typography variant="caption" sx={{ color: '#38bdf8', fontWeight: 700, display: 'block', fontSize: '0.78rem', mb: 0.25 }}>
            🛡️ Recommended Geotechnical Safety Protocol:
          </Typography>
          <Typography variant="caption" sx={{ color: '#cbd5e1', fontSize: '0.75rem' }}>
            Restrict personnel access near sector highwalls. Maintain continuous radar displacement scanning, micro-seismic monitoring, and high-definition drone thermal surveys.
          </Typography>
        </Box>

        {/* Slope Hazard Ramp Legend */}
        <Box sx={{ p: 1.5, backgroundColor: '#0f172a', borderRadius: 1.5, border: '1px solid #334155' }}>
          <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 700, mb: 1.25, fontSize: '0.85rem' }}>
            🎨 Slope Hazard Ramp Legend
          </Typography>
          <Grid container spacing={1.5}>
            <Grid item xs={6} sm={3}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 14, height: 14, backgroundColor: '#42c9d0', borderRadius: 0.75, flexShrink: 0 }} />
                <Box>
                  <Typography variant="caption" sx={{ color: 'white', fontWeight: 700, display: 'block', fontSize: '0.75rem' }}>
                    Gentle (&lt; 20°)
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.68rem' }}>
                    Quarry floors, haul roads
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 14, height: 14, backgroundColor: '#ffb020', borderRadius: 0.75, flexShrink: 0 }} />
                <Box>
                  <Typography variant="caption" sx={{ color: 'white', fontWeight: 700, display: 'block', fontSize: '0.75rem' }}>
                    Moderate (20°–35°)
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.68rem' }}>
                    Graded ramps, terraces
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 14, height: 14, backgroundColor: '#ff6f2b', borderRadius: 0.75, flexShrink: 0 }} />
                <Box>
                  <Typography variant="caption" sx={{ color: 'white', fontWeight: 700, display: 'block', fontSize: '0.75rem' }}>
                    Steep Face (35°–48°)
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.68rem' }}>
                    Highwalls, bench slopes
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 14, height: 14, backgroundColor: '#d84620', borderRadius: 0.75, flexShrink: 0 }} />
                <Box>
                  <Typography variant="caption" sx={{ color: 'white', fontWeight: 700, display: 'block', fontSize: '0.75rem' }}>
                    Critical (&gt; 48°)
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.68rem' }}>
                    Active hazard overhangs
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  )
}

export default DemRiskJustificationCard
