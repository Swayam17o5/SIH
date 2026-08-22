import React, { useState, useEffect } from 'react'
import { Card, CardContent, Typography, Box, Stack, Chip, Divider, Slider } from '@mui/material'
import { BarChart3 as BarChartIcon, HelpCircle as HelpIcon, ShieldAlert as ShieldIcon } from 'lucide-react'
import { apiRequest } from '../../config/api'

const DemXaiBreakdownCard = ({ selectedDEM, riskScore, riskLevel }) => {
  const [xaiData, setXaiData] = useState(null)
  const [whatIfSlopeOffset, setWhatIfSlopeOffset] = useState(0)

  useEffect(() => {
    const fetchDemXai = async () => {
      try {
        const data = await apiRequest(`/api/xai/dem-explain/${selectedDEM || 'bailadila_iron_mine'}`)
        setXaiData(data)
      } catch (err) {
        console.error('Failed to fetch DEM XAI breakdown:', err)
      }
    }
    fetchDemXai()
  }, [selectedDEM])

  if (!xaiData) return null

  const simulatedScore = Math.max(10, Math.min(99, (xaiData.total_risk_score + whatIfSlopeOffset * 2.2).toFixed(1)))
  const simulatedLevel = simulatedScore > 70 ? 'Critical' : simulatedScore > 42 ? 'High' : 'Moderate'
  const simulatedColor = simulatedScore > 70 ? '#ef4444' : simulatedScore > 42 ? '#f97316' : '#eab308'

  return (
    <Card sx={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 2, mb: 2.5 }}>
      <CardContent sx={{ p: 2.5 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BarChartIcon style={{ color: '#a855f7', width: 20, height: 20 }} />
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 700, fontSize: '1rem' }}>
              XAI 3D Terrain Risk Attribution & What-If Simulator
            </Typography>
          </Box>
          <Chip
            label="Factor Decomposition"
            size="small"
            sx={{ backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', fontWeight: 700, fontSize: '0.68rem', border: '1px solid rgba(168, 85, 247, 0.4)' }}
          />
        </Box>

        <Typography variant="caption" sx={{ color: '#94a3b8', mb: 2, display: 'block', fontSize: '0.76rem' }}>
          Deconstructing the total <strong>{xaiData.total_risk_score}/100</strong> terrain risk score into exact geomorphological factor components:
        </Typography>

        {/* Factor Attribution Bars */}
        <Stack spacing={1.25} sx={{ mb: 2.5 }}>
          {xaiData.factor_attributions.map((item, idx) => (
            <Box key={idx} sx={{ p: 1.25, backgroundColor: '#0f172a', borderRadius: 1.5, border: '1px solid #334155' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="body2" sx={{ color: 'white', fontWeight: 600, fontSize: '0.78rem' }}>
                  {item.factor}
                </Typography>
                <Typography variant="caption" sx={{ color: item.color, fontWeight: 800, fontSize: '0.8rem' }}>
                  +{item.points} / {item.max_points} pts
                </Typography>
              </Box>

              <Box sx={{ backgroundColor: 'rgba(51, 65, 85, 0.4)', height: 6, borderRadius: 4, overflow: 'hidden', mb: 0.5 }}>
                <Box
                  sx={{
                    width: `${(item.points / item.max_points) * 100}%`,
                    height: '100%',
                    backgroundColor: item.color,
                    borderRadius: 4
                  }}
                />
              </Box>

              <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.68rem', display: 'block' }}>
                {item.description}
              </Typography>
            </Box>
          ))}
        </Stack>

        <Divider sx={{ borderColor: '#334155', my: 2 }} />

        {/* Counterfactual What-If Simulation Slider */}
        <Box sx={{ p: 1.75, backgroundColor: 'rgba(15, 23, 42, 0.8)', borderRadius: 2, border: '1px solid #334155' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2" sx={{ color: '#38bdf8', fontWeight: 700, fontSize: '0.82rem' }}>
              🔮 Counterfactual What-If Bench Slope Angle Simulator
            </Typography>
            <Chip
              label={`${simulatedScore}/100 (${simulatedLevel})`}
              size="small"
              sx={{ backgroundColor: `${simulatedColor}20`, color: simulatedColor, fontWeight: 800, height: 20, fontSize: '0.68rem', border: `1px solid ${simulatedColor}` }}
            />
          </Box>

          <Typography variant="caption" sx={{ color: '#94a3b8', mb: 1.5, display: 'block', fontSize: '0.72rem' }}>
            Simulate the effect of regrading or steepening bench slope angles on terrain risk score:
          </Typography>

          <Box sx={{ px: 1 }}>
            <Slider
              value={whatIfSlopeOffset}
              min={-15}
              max={10}
              step={1}
              onChange={(e, val) => setWhatIfSlopeOffset(val)}
              valueLabelDisplay="auto"
              valueLabelFormat={val => `${val > 0 ? '+' : ''}${val}° Slope`}
              sx={{
                color: simulatedColor,
                '& .MuiSlider-thumb': { boxShadow: `0 0 10px ${simulatedColor}` }
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
            <Typography variant="caption" sx={{ color: '#10b981', fontSize: '0.68rem' }}>
              -15° (Regraded Bench)
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.68rem' }}>
              0° (Current)
            </Typography>
            <Typography variant="caption" sx={{ color: '#ef4444', fontSize: '0.68rem' }}>
              +10° (Steepened Highwall)
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

export default DemXaiBreakdownCard
