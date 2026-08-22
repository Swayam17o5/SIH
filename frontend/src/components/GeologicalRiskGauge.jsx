import React from 'react'
import { Box, Typography, Card, CardContent } from '@mui/material'
import { motion } from 'framer-motion'
import { Shield as ShieldIcon, Warning as WarningIcon } from '@mui/icons-material'

const GeologicalRiskGauge = ({ riskScore: rawRiskScore = 35 }) => {
  const riskScore = Number.isNaN(Number(rawRiskScore)) ? 35 : Number(rawRiskScore)
  // Convert score 0-100 to angle (e.g. -90 deg to 90 deg for a semi-circle)
  const score = Math.max(0, Math.min(100, riskScore))
  const rotationAngle = -90 + (score / 100) * 180

  const getRiskStatus = () => {
    if (score > 70) {
      return {
        label: 'SEVERE INSTABILITY',
        desc: 'Immediate landslide danger. evacuation suggested.',
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

  // SVG parameters for circular meter path
  const radius = 80
  const circumference = 2 * Math.PI * radius
  // Half circle stroke-dasharray (semi-circle = circumference / 2)
  const strokeDashoffset = circumference - (score / 100) * (circumference / 2)

  return (
    <Card className="glass-card" sx={{ height: '100%', border: '1px solid var(--border-primary)' }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ alignSelf: 'flex-start', mb: 2 }}>
          STABILITY ASSESSMENT INDEX
        </Typography>

        {/* Semi-circular dial */}
        <Box sx={{ position: 'relative', width: 220, height: 130, mb: 1, overflow: 'hidden' }}>
          <svg width="220" height="220" style={{ position: 'absolute', top: 0, left: 0 }}>
            <defs>
              {/* Dial gradient */}
              <linearGradient id="dialGlow" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--status-success)" />
                <stop offset="40%" stopColor="var(--status-warning)" />
                <stop offset="75%" stopColor="var(--status-orange)" />
                <stop offset="100%" stopColor="var(--status-danger)" />
              </linearGradient>
              {/* Shadow filter */}
              <filter id="dialShadow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={status.color} floodOpacity="0.4" />
              </filter>
            </defs>

            {/* Gray background track */}
            <circle
              cx="110"
              cy="110"
              r={radius}
              fill="none"
              stroke="var(--border-primary)"
              strokeWidth="10"
              strokeDasharray={`${circumference / 2} ${circumference}`}
              transform="rotate(180 110 110)"
              strokeLinecap="round"
            />

            {/* Glowing active track */}
            <circle
              cx="110"
              cy="110"
              r={radius}
              fill="none"
              stroke="url(#dialGlow)"
              strokeWidth="10"
              strokeDasharray={`${circumference / 2} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(180 110 110)"
              strokeLinecap="round"
              filter="url(#dialShadow)"
              style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />

            {/* Center anchor pin */}
            <circle cx="110" cy="110" r="8" fill="var(--bg-primary)" stroke="var(--border-primary)" strokeWidth="2" />
            <circle cx="110" cy="110" r="3" fill={status.color} />

            {/* NEEDLE INDICATOR */}
            <g
              transform={`rotate(${rotationAngle} 110 110)`}
              style={{ transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <polygon
                points="108,110 110,25 112,110"
                fill={status.color}
                style={{ filter: 'drop-shadow(0px 2px 3px rgba(0,0,0,0.5))' }}
              />
            </g>
          </svg>

          {/* Value Display */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              textAlign: 'center'
            }}
          >
            <Typography variant="h3" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>
              {score.toFixed(1)}%
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
              Rockfall Risk
            </Typography>
          </Box>
        </Box>

        {/* Status card details */}
        <Box
          sx={{
            width: '100%',
            backgroundColor: status.bg,
            borderRadius: 3,
            p: 2,
            border: `1px solid ${status.color}20`,
            textAlign: 'center',
            mt: 2
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 0.5 }}>
            {score > 40 ? <WarningIcon sx={{ color: status.color, fontSize: 18 }} /> : <ShieldIcon sx={{ color: status.color, fontSize: 18 }} />}
            <Typography variant="body1" sx={{ color: status.color, fontWeight: 700, fontSize: '0.95rem' }}>
              {status.label}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
            {status.desc}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  )
}

export default GeologicalRiskGauge
