import React, { useState, useEffect } from 'react'
import { Box, Typography, Card, CardContent, Grid, Button, Switch, FormControlLabel, Chip } from '@mui/material'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Terrain as TerrainIcon,
  PhotoCamera as CameraIcon,
  Sensors as SensorsIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Timeline as SeismicIcon
} from '@mui/icons-material'

const GeologicalSlopeMonitor = ({ riskScore: rawRiskScore = 30, rainfall: rawRainfall = 15, seismicActivity: rawSeismicActivity = 0.5 }) => {
  const riskScore = Number.isNaN(Number(rawRiskScore)) ? 30 : Number(rawRiskScore)
  const rainfall = Number.isNaN(Number(rawRainfall)) ? 15 : Number(rawRainfall)
  const seismicActivity = Number.isNaN(Number(rawSeismicActivity)) ? 0.5 : Number(rawSeismicActivity)

  const [isScanning, setIsScanning] = useState(true)
  const [boulders, setBoulders] = useState([])
  const [activeAlert, setActiveAlert] = useState(false)
  const [sensorStatus, setSensorStatus] = useState({
    cam1: 'active',
    seismic1: 'active',
    inclinometer1: 'active'
  })

  // Trigger simulated rockfalls based on risk score or manually
  const triggerSimulatedRockfall = () => {
    const id = Date.now()
    setBoulders((prev) => [...prev, { id, progress: 0, speed: 2 + Math.random() * 2 }])
    setActiveAlert(true)
    setTimeout(() => {
      setActiveAlert(false)
    }, 4000)
  }

  // Automatically trigger rockfalls occasionally if risk is medium/high
  useEffect(() => {
    let intervalTime = 12000
    if (riskScore > 70) intervalTime = 3000
    else if (riskScore > 40) intervalTime = 6000

    const interval = setInterval(() => {
      if (Math.random() * 100 < riskScore) {
        triggerSimulatedRockfall()
      }
    }, intervalTime)

    return () => clearInterval(interval)
  }, [riskScore])

  // Update boulder progression along the mountain slope path
  useEffect(() => {
    const frame = setInterval(() => {
      setBoulders((prev) =>
        prev
          .map((b) => ({ ...b, progress: b.progress + b.speed }))
          .filter((b) => b.progress < 100)
      )
    }, 50)
    return () => clearInterval(frame)
  }, [])

  // Calculate coordinates along a mountain slope path (y = f(x))
  // The path starts at top-right (x: 420, y: 50), goes down to (x: 280, y: 160), then (x: 180, y: 220), and ends at bottom-left (x: 50, y: 270)
  const getSlopeCoordinates = (progress) => {
    // progress is 0 to 100
    const pct = progress / 100
    
    // Linearly interpolate between 3 segments:
    // Seg 1: progress 0 - 40 (Top slope - steep)
    // Seg 2: progress 40 - 75 (Middle bench)
    // Seg 3: progress 75 - 100 (Bottom runout)
    if (pct < 0.4) {
      const segPct = pct / 0.4
      return {
        x: 420 - segPct * 140,
        y: 50 + segPct * 110
      }
    } else if (pct < 0.75) {
      const segPct = (pct - 0.4) / 0.35
      return {
        x: 280 - segPct * 100,
        y: 160 + segPct * 60
      }
    } else {
      const segPct = (pct - 0.75) / 0.25
      return {
        x: 180 - segPct * 130,
        y: 220 + segPct * 50
      }
    }
  }

  // Get current state details
  const getSafetyLevel = () => {
    if (riskScore > 70) return { label: 'CRITICAL HAZARD', color: 'var(--status-danger)', bg: 'rgba(225, 29, 72, 0.08)' }
    if (riskScore > 40) return { label: 'WARNING STATUS', color: 'var(--status-warning)', bg: 'rgba(245, 158, 11, 0.08)' }
    return { label: 'STABLE SLOPE', color: 'var(--status-success)', bg: 'rgba(13, 148, 136, 0.08)' }
  }

  const safety = getSafetyLevel()

  return (
    <Card className="glass-card" sx={{ border: '1px solid var(--border-primary)' }}>
      <CardContent>
        {/* Header telemetry area */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TerrainIcon sx={{ color: safety.color }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
              Real-time Geomorphological Slope Monitor
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <FormControlLabel
              control={<Switch checked={isScanning} onChange={() => setIsScanning(!isScanning)} size="small" />}
              label="Radar Scan"
              sx={{ color: 'text.secondary', '.MuiTypography-root': { fontSize: '0.85rem' } }}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={triggerSimulatedRockfall}
              sx={{
                borderColor: 'rgba(59, 130, 246, 0.5)',
                color: '#3b82f6',
                fontSize: '0.75rem',
                py: 0.5,
                '&:hover': {
                  borderColor: '#3b82f6',
                  backgroundColor: 'rgba(59, 130, 246, 0.05)'
                }
              }}
            >
              Simulate Rockfall
            </Button>
          </Box>
        </Box>

        {/* Hazard alert banner */}
        <AnimatePresence>
          {(activeAlert || riskScore > 70) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Box
                sx={{
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid #ef4444',
                  borderRadius: 2,
                  p: 1.5,
                  mb: 3,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  animation: 'pulse 1.5s infinite'
                }}
              >
                <WarningIcon sx={{ color: '#ef4444' }} />
                <Typography variant="body2" sx={{ color: '#fca5a5', fontWeight: 600 }}>
                  🚨 ALERT: SLOPE INSTABILITY DETECTED. MULTIPLE SEISMIC ANOMALIES & MOVEMENT SIGNALS IN SECTOR B.
                </Typography>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Telemetry & SVG grid */}
        <Grid container spacing={3}>
          {/* SVG Visualizer */}
          <Grid item xs={12} md={8}>
            <Box
              sx={{
                position: 'relative',
                background: 'radial-gradient(circle at 50% 50%, #172554 0%, #0f172a 100%)',
                border: '1px solid #1e293b',
                borderRadius: 3,
                overflow: 'hidden',
                boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8)'
              }}
            >
              {/* Scan overlay lines */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)',
                  backgroundSize: '16px 16px',
                  opacity: 0.4,
                  pointerEvents: 'none'
                }}
              />

              {/* Laser Scanning Beam */}
              {isScanning && (
                <Box
                  sx={{
                    position: 'absolute',
                    left: 0,
                    width: '100%',
                    height: '2px',
                    background: 'linear-gradient(90deg, rgba(34,197,94,0) 0%, rgba(34,197,94,0.8) 50%, rgba(34,197,94,0) 100%)',
                    boxShadow: '0 0 8px rgba(34,197,94,0.8)',
                    zIndex: 2,
                    animation: 'scanLineMove 4s ease-in-out infinite',
                    pointerEvents: 'none'
                  }}
                />
              )}

              {/* Vector SVG Mountain */}
              <svg viewBox="0 0 500 300" style={{ width: '100%', height: 'auto', display: 'block' }}>
                <defs>
                  {/* Mountain fill gradient */}
                  <linearGradient id="slopeGrad" x1="1" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--bg-secondary)" stopOpacity="1" />
                    <stop offset="100%" stopColor="var(--bg-primary)" stopOpacity="1" />
                  </linearGradient>
                  {/* Mountain wireframe border glow */}
                  <filter id="glow" x="-10%" y="-10%" width="120%" height="120%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Grid Axes Labeled */}
                <line x1="40" y1="270" x2="480" y2="270" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="40" y1="30" x2="40" y2="270" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
                <text x="470" y="285" fill="#64748b" fontSize="8" textAnchor="end">DISTANCE (M)</text>
                <text x="45" y="40" fill="#64748b" fontSize="8" transform="rotate(90 45 40)" textAnchor="start">ELEVATION (M)</text>

                {/* Sector Delineations */}
                <line x1="280" y1="270" x2="280" y2="160" stroke="rgba(148, 163, 184, 0.15)" strokeWidth="1" strokeDasharray="2 2" />
                <line x1="180" y1="270" x2="180" y2="220" stroke="rgba(148, 163, 184, 0.15)" strokeWidth="1" strokeDasharray="2 2" />
                <text x="350" y="260" fill="#475569" fontSize="10" fontWeight="600" textAnchor="middle">SECTOR A (UPPER)</text>
                <text x="230" y="260" fill="#475569" fontSize="10" fontWeight="600" textAnchor="middle">SECTOR B (MID)</text>
                <text x="110" y="260" fill="#475569" fontSize="10" fontWeight="600" textAnchor="middle">SECTOR C (RUNOUT)</text>

                {/* Solid Mountain Fill */}
                <path d="M 40,270 L 40,220 L 50,220 Q 90,220 180,220 L 280,160 L 420,50 L 480,50 L 480,270 Z" fill="url(#slopeGrad)" />

                {/* Neon Geological Contour Outline */}
                <path
                  d="M 40,220 Q 90,220 180,220 L 280,160 L 420,50 L 480,50"
                  fill="none"
                  stroke={safety.color}
                  strokeWidth="2"
                  filter="url(#glow)"
                  style={{ transition: 'stroke 0.5s ease' }}
                />

                {/* Bench contour steps */}
                <path d="M 40,150 L 140,150 L 220,110 L 320,50" fill="none" stroke="var(--border-primary)" strokeWidth="0.5" opacity="0.6" />
                <path d="M 40,90 L 100,90 L 180,50" fill="none" stroke="var(--border-primary)" strokeWidth="0.5" opacity="0.4" />

                {/* Rain simulation */}
                {rainfall > 5 && (
                  <g opacity="0.3">
                    {Array.from({ length: 15 }).map((_, i) => {
                      const rx = 100 + i * 25 + (Math.sin(i) * 10)
                      const ry = 20 + (i % 3) * 15
                      return (
                        <line
                          key={i}
                          x1={rx}
                          y1={ry}
                          x2={rx - 3}
                          y2={ry + 10}
                          stroke="#60a5fa"
                          strokeWidth="1"
                          style={{
                            animation: 'raindropFall 1s linear infinite',
                            animationDelay: `${(i % 5) * 0.2}s`
                          }}
                        />
                      )
                    })}
                  </g>
                )}

                {/* SENSOR NODES */}
                {/* Node 1: Inclinometer at the Peak */}
                <g transform="translate(420, 50)">
                  <circle r="6" fill="var(--accent-secondary)" className="pulse" style={{ animationDuration: '2s', opacity: 0.8 }} />
                  <circle r="3" fill="#ffffff" />
                  <line x1="0" y1="0" x2="0" y2="-12" stroke="var(--accent-secondary)" strokeWidth="1" />
                  <text x="10" y="-5" fill="var(--accent-secondary)" fontSize="8" fontWeight="600">INCL-01</text>
                </g>

                {/* Node 2: Camera at the Mid-Slope */}
                <g transform="translate(280, 160)">
                  <circle r="6" fill="#a78bfa" className="pulse" style={{ animationDuration: '1.5s', opacity: 0.8 }} />
                  <circle r="3" fill="#ffffff" />
                  <text x="10" y="12" fill="#a78bfa" fontSize="8" fontWeight="600">CAM-NODE-01</text>
                </g>

                {/* Node 3: Geophone Array at the Runout */}
                <g transform="translate(180, 220)">
                  <circle r="6" fill="var(--accent-primary)" className="pulse" style={{ animationDuration: '1.8s', opacity: 0.8 }} />
                  <circle r="3" fill="#ffffff" />
                  <text x="10" y="-8" fill="var(--accent-primary)" fontSize="8" fontWeight="600">GEO-ARRAY-02</text>
                </g>

                {/* BOULDERS (ROLLING SIMULATION) */}
                {boulders.map((b) => {
                  const coords = getSlopeCoordinates(b.progress)
                  return (
                    <g key={b.id} transform={`translate(${coords.x}, ${coords.y})`}>
                      {/* Dust trails */}
                      <circle r={4} fill="rgba(148, 163, 184, 0.4)" cx={-6} cy={-2} opacity={0.6} />
                      <circle r={2} fill="rgba(148, 163, 184, 0.2)" cx={-12} cy={-4} opacity={0.4} />
                      
                      {/* Boulder shape */}
                      <path
                        d="M -5,-3 L -2,-6 L 3,-5 L 5,-1 L 2,4 L -3,3 Z"
                        fill="#f87171"
                        stroke="#b91c1c"
                        strokeWidth="1"
                        style={{
                          transformOrigin: '0px 0px',
                          animation: 'spin 1s linear infinite'
                        }}
                      />
                      {/* Warning circle on rolling rock */}
                      <circle r="8" fill="none" stroke="#ef4444" strokeWidth="0.5" className="pulse" />
                    </g>
                  )
                })}
              </svg>
            </Box>
          </Grid>

          {/* Side Telemetry Details */}
          <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                SLOPE STABILITY METRICS
              </Typography>
              <Box
                sx={{
                  backgroundColor: safety.bg,
                  borderRadius: 2,
                  p: 2,
                  mb: 2.5,
                  border: `1px solid ${safety.color}30`,
                  textAlign: 'center',
                  transition: 'background-color 0.5s ease'
                }}
              >
                <Typography variant="body2" sx={{ color: '#94a3b8', mb: 0.5 }}>
                  CLASSIFICATION
                </Typography>
                <Typography variant="h6" sx={{ color: safety.color, fontWeight: 700, letterSpacing: '0.5px' }}>
                  {safety.label}
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box sx={{ borderLeft: `3px solid var(--accent-secondary)`, pl: 1.5, mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Peak Inclinometer
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                      0.04° / hr
                    </Typography>
                    <Chip label="Stable" color="success" size="small" variant="outlined" sx={{ height: 16, fontSize: '0.65rem', mt: 0.5 }} />
                  </Box>
                </Grid>
                
                <Grid item xs={6}>
                  <Box sx={{ borderLeft: `3px solid #a78bfa`, pl: 1.5, mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      YOLO Feed Status
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      Active <CheckCircleIcon sx={{ fontSize: 14, color: 'var(--status-success)' }} />
                    </Typography>
                    <Chip label="No Objects" color="success" size="small" variant="outlined" sx={{ height: 16, fontSize: '0.65rem', mt: 0.5 }} />
                  </Box>
                </Grid>
                
                <Grid item xs={6}>
                  <Box sx={{ borderLeft: `3px solid var(--accent-primary)`, pl: 1.5, mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Base Geophones
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                      {seismicActivity.toFixed(2)} Gal
                    </Typography>
                    <Chip
                      label={seismicActivity > 2.0 ? 'Elevated' : 'Quiet'}
                      color={seismicActivity > 2.0 ? 'warning' : 'success'}
                      size="small"
                      variant="outlined"
                      sx={{ height: 16, fontSize: '0.65rem', mt: 0.5 }}
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={6}>
                  <Box sx={{ borderLeft: `3px solid var(--status-warning)`, pl: 1.5, mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Saturation Level
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                      {(rainfall * 1.8).toFixed(1)}%
                    </Typography>
                    <Chip
                      label={rainfall > 30 ? 'Saturated' : 'Normal'}
                      color={rainfall > 30 ? 'warning' : 'success'}
                      size="small"
                      variant="outlined"
                      sx={{ height: 16, fontSize: '0.65rem', mt: 0.5 }}
                    />
                  </Box>
                </Grid>
              </Grid>
            </Box>

            {/* Seismic wave simulation */}
            <Box sx={{ mt: 'auto', pt: 2, borderTop: '1px solid var(--border-primary)' }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                <SeismicIcon sx={{ fontSize: 14 }} /> Real-time Geophone Telemetry
              </Typography>
              <Box sx={{ height: 40, width: '100%', overflow: 'hidden', position: 'relative' }}>
                <svg viewBox="0 0 200 40" style={{ width: '100%', height: '100%' }}>
                  <path
                    d={Array.from({ length: 40 })
                      .map((_, i) => {
                        const phase = Date.now() / 150
                        const baseAmp = seismicActivity > 2.0 ? 12 : 3
                        const amp = baseAmp + Math.sin(i * 0.5 - phase) * (baseAmp / 2) + (Math.random() * (baseAmp / 3))
                        const y = 20 + (i % 2 === 0 ? amp : -amp)
                        return `${i === 0 ? 'M' : 'L'} ${i * 5} ${y}`
                      })
                      .join(' ')}
                    fill="none"
                    stroke="var(--accent-primary)"
                    strokeWidth="1"
                    opacity="0.85"
                  />
                </svg>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default GeologicalSlopeMonitor
