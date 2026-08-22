import React from 'react'
import { Box, Typography, Card, CardContent } from '@mui/material'
import { motion } from 'framer-motion'
import { Shield as ShieldIcon, Warning as WarningIcon } from '@mui/icons-material'

const GeologicalRiskGauge = ({ riskScore: rawRiskScore = 35 }) => {
  const riskScore = Number.isNaN(Number(rawRiskScore)) ? 35 : Number(rawRiskScore)
  const score = Math.max(0, Math.min(100, riskScore))
  const rotationAngle = -90 + (score / 100) * 180

  const getRiskStatus = () => {
    if (score > 70) {
      return {
        label: 'SEVERE INSTABILITY',
        desc: 'Immediate landslide danger. Evacuation suggested.',
        color: 'var(--status-danger)',
        bg: 'rgba(225, 29, 72, 0.08)'
      }
    }
    if (score > 40) {
      return {
        label: 'MODERATE INSTABILITY',
        desc: 'Potential slope movement. Alert sensors active.',
        color: 'var(--status-warning)',
        bg: 'rgba(245, 158, 11, 0.08)'
      }
    }
    return {
      label: 'STABLE GEOLOGY',
      desc: 'All slope sections within safety parameters.',
      color: 'var(--status-success)',
      bg: 'rgba(13, 148, 136, 0.08)'
    }
  }

  const status = getRiskStatus()

  // SVG parameters: Meter center at (110, 80), radius 66
  const cx = 110
  const cy = 80
  const r = 66
  const pathLength = Math.PI * r // ~207.34

  // Arc path from left (44, 80) to right (176, 80)
  const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`
  const strokeDashoffset = pathLength * (1 - score / 100)

  return (
    <Card className="glass-card" sx={{ height: '100%', border: '1px solid var(--border-primary)' }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', height: '100%', p: 2.5 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ alignSelf: 'flex-start', mb: 1, fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
          STABILITY ASSESSMENT INDEX
        </Typography>

        {/* Semi-circular dial container */}
        <Box sx={{ position: 'relative', width: 220, height: 142, my: 0.5, display: 'flex', justifyContent: 'center' }}>
          <svg width="220" height="142" viewBox="0 0 220 142" style={{ overflow: 'visible' }}>
            <defs>
              {/* Dial gradient */}
              <linearGradient id="dialGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--status-success)" />
                <stop offset="45%" stopColor="var(--status-warning)" />
                <stop offset="75%" stopColor="var(--status-orange)" />
                <stop offset="100%" stopColor="var(--status-danger)" />
              </linearGradient>
              {/* Shadow filter */}
              <filter id="dialShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor={status.color} floodOpacity="0.5" />
              </filter>
            </defs>

            {/* Track Background */}
            <path
              d={arcPath}
              fill="none"
              stroke="#1e293b"
              strokeWidth="12"
              strokeLinecap="round"
            />

            {/* Active Colored Progress Arc */}
            <path
              d={arcPath}
              fill="none"
              stroke="url(#dialGlow)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={pathLength}
              strokeDashoffset={strokeDashoffset}
              filter="url(#dialShadow)"
              style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />

            {/* Inner Scale Markers */}
            <text x="24" y="94" fill="#64748b" fontSize="9" fontFamily="var(--font-mono)">0%</text>
            <text x="102" y="10" fill="#64748b" fontSize="9" fontFamily="var(--font-mono)">50%</text>
            <text x="184" y="94" fill="#64748b" fontSize="9" fontFamily="var(--font-mono)">100%</text>

            {/* NEEDLE INDICATOR - Sweeps in top half above pivot pin (cy = 80) */}
            <g
              transform={`rotate(${rotationAngle} ${cx} ${cy})`}
              style={{ transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <polygon
                points="108,80 110,20 112,80"
                fill={status.color}
                style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.6))' }}
              />
            </g>

            {/* Center Anchor Pin */}
            <circle cx={cx} cy={cy} r="6" fill="var(--bg-primary)" stroke="var(--border-primary)" strokeWidth="2" />
            <circle cx={cx} cy={cy} r="2.5" fill={status.color} />

            {/* Percentage Value Display - Positioned cleanly below pivot pin */}
            <text
              x={cx}
              y="108"
              textAnchor="middle"
              fill="#f8fafc"
              fontSize="24"
              fontWeight="800"
              fontFamily="var(--font-sans)"
            >
              {score.toFixed(1)}%
            </text>

            {/* Rockfall Risk Label - Positioned below score */}
            <text
              x={cx}
              y="126"
              textAnchor="middle"
              fill="#94a3b8"
              fontSize="9"
              fontWeight="700"
              letterSpacing="1.5"
              fontFamily="var(--font-mono)"
            >
              ROCKFALL RISK
            </text>
          </svg>
        </Box>

        {/* Status card details */}
        <Box
          sx={{
            width: '100%',
            backgroundColor: status.bg,
            borderRadius: '4px',
            p: 1.8,
            border: `1px solid ${status.color}30`,
            textAlign: 'center',
            mt: 0.5
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 0.5 }}>
            {score > 40 ? <WarningIcon sx={{ color: status.color, fontSize: 18 }} /> : <ShieldIcon sx={{ color: status.color, fontSize: 18 }} />}
            <Typography variant="body1" sx={{ color: status.color, fontWeight: 700, fontSize: '0.88rem', letterSpacing: '0.3px' }}>
              {status.label}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem' }}>
            {status.desc}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  )
}

export default GeologicalRiskGauge
