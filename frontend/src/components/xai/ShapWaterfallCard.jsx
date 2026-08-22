import React, { useState, useEffect } from 'react'
import { Card, CardContent, Typography, Box, Stack, Chip, LinearProgress, Divider, Tooltip } from '@mui/material'
import { Analytics as AnalyticsIcon, Info as InfoIcon, Speed as SpeedIcon } from '@mui/icons-material'
import { apiRequest } from '../../config/api'

const ShapWaterfallCard = ({ currentInputs }) => {
  const [shapData, setShapData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchShap = async () => {
      setLoading(true)
      try {
        const payload = currentInputs || {
          slope_height: 45.0,
          slope_angle: 42.0,
          cohesion: 32.0,
          friction_angle: 28.0,
          pore_pressure: 85.0,
          rainfall_24h: 35.0
        }
        const data = await apiRequest('/api/xai/shap-explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        setShapData(data)
      } catch (err) {
        console.error('Failed to fetch SHAP XAI data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchShap()
  }, [currentInputs])

  if (!shapData) return null

  const maxAbsImpact = Math.max(...shapData.shap_values.map(f => Math.abs(f.impact)), 1.0)

  return (
    <Card sx={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 2, mb: 3 }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AnalyticsIcon sx={{ color: '#38bdf8', fontSize: '1.4rem' }} />
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 700, fontSize: '1.05rem' }}>
              XAI SHAP Feature Importance & Impact Breakdown
            </Typography>
          </Box>
          <Chip
            icon={<SpeedIcon sx={{ fontSize: '0.85rem !important', color: '#38bdf8 !important' }} />}
            label="SHAP Game Theory"
            size="small"
            sx={{
              backgroundColor: 'rgba(56, 189, 248, 0.12)',
              color: '#38bdf8',
              fontWeight: 700,
              fontSize: '0.7rem',
              border: '1px solid rgba(56, 189, 248, 0.4)'
            }}
          />
        </Box>

        <Typography variant="caption" sx={{ color: '#94a3b8', mb: 2, display: 'block', fontSize: '0.78rem' }}>
          Explaining how each geotechnical parameter quantitatively shifts the <strong>Stability Assessment Index</strong> from base benchmark ({shapData.base_value}%):
        </Typography>

        <Stack spacing={1.5} sx={{ mb: 2 }}>
          {shapData.shap_values.map((item, idx) => {
            const isNegative = item.impact < 0
            const percentWidth = Math.min(100, (Math.abs(item.impact) / maxAbsImpact) * 100)
            const color = isNegative ? '#ef4444' : '#10b981'

            return (
              <Box key={idx} sx={{ p: 1.25, backgroundColor: '#0f172a', borderRadius: 1.5, border: '1px solid #334155' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ color: 'white', fontWeight: 600, fontSize: '0.82rem' }}>
                      {item.name}
                    </Typography>
                    <Chip
                      label={item.category}
                      size="small"
                      sx={{ height: 18, fontSize: '0.62rem', backgroundColor: 'rgba(51, 65, 85, 0.6)', color: '#cbd5e1' }}
                    />
                  </Box>
                  <Typography variant="caption" sx={{ color: color, fontWeight: 800, fontSize: '0.85rem' }}>
                    {isNegative ? '' : '+'}{item.impact}% stability
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography variant="caption" sx={{ color: '#64748b', minWidth: 65, fontSize: '0.7rem' }}>
                    Val: <strong>{item.value}</strong>
                  </Typography>
                  <Box sx={{ flex: 1, backgroundColor: 'rgba(51, 65, 85, 0.4)', height: 7, borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                    <Box
                      sx={{
                        width: `${percentWidth}%`,
                        height: '100%',
                        backgroundColor: color,
                        borderRadius: 4,
                        transition: 'width 0.5s ease-in-out'
                      }}
                    />
                  </Box>
                </Box>

                <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.68rem', mt: 0.5, display: 'block' }}>
                  ℹ️ {item.description}
                </Typography>
              </Box>
            )
          })}
        </Stack>

        <Box sx={{ p: 1.25, backgroundColor: 'rgba(56, 189, 248, 0.08)', borderRadius: 1.5, border: '1px solid rgba(56, 189, 248, 0.3)' }}>
          <Typography variant="caption" sx={{ color: '#38bdf8', fontWeight: 700, display: 'block', fontSize: '0.75rem' }}>
            🧠 Model Explainability Consensus:
          </Typography>
          <Typography variant="caption" sx={{ color: '#cbd5e1', fontSize: '0.72rem' }}>
            Current Stability Index predicted at <strong>{shapData.predicted_stability_index}%</strong> ({shapData.risk_level}). Primary safety reduction driven by cumulative 24h rainfall and pore water pressure build-up.
          </Typography>
        </Box>
      </CardContent>
    </Card>
  )
}

export default ShapWaterfallCard
