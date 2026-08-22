import React, { useState, useEffect, useCallback } from 'react'
import { apiRequest } from '../config/api'
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  LinearProgress,
} from '@mui/material'
import {
  SettingsInputAntenna as AntennaIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Timeline as TimelineIcon,
  Explore as ExploreIcon,
  Speed as SpeedIcon,
  QueryStats as StatsIcon,
  NotificationsActive as AlertIcon,
  CheckCircle as CheckCircleIcon,
  CloudUpload as UploadIcon,
} from '@mui/icons-material'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

const SatelliteMonitoring = () => {
  const [status, setStatus] = useState(null)
  const [scenes, setScenes] = useState([])
  const [deformationData, setDeformationData] = useState([])
  const [selectedZone, setSelectedZone] = useState('zone_03') // North Highwall default since it's the critical one
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState(null)

  // Fetch all satellite status and observations
  const fetchSatelliteData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Parallel fetches for general status, cached scenes list, and deformation histories
      const [statusData, scenesData, deformationData] = await Promise.all([
        apiRequest('/api/satellite/status'),
        apiRequest('/api/satellite/scenes'),
        apiRequest('/api/satellite/deformation'),
      ])

      setStatus(statusData)
      setScenes(scenesData)
      setDeformationData(deformationData)
    } catch (err) {
      console.error('❌ InSAR Satellite fetch failed:', err)
      setError(err.message || 'Failed to fetch satellite monitoring data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSatelliteData()
  }, [fetchSatelliteData])

  // Get history details of the selected zone
  const currentZoneData = deformationData.find((z) => z.zone_id === selectedZone)

  // Handle triggering live Sentinel-1 analysis
  const handleTriggerAnalysis = async () => {
    setAnalyzing(true)
    const toastId = toast.loading('🛰️ Querying NASA ASF HyP3 for Sentinel-1 acquisitions...')
    try {
      const response = await apiRequest('/api/satellite/analyze', {
        method: 'POST',
      })
      if (response.success) {
        toast.success(response.message || 'Sentinel-1 connection operational. Cache is up to date.', { id: toastId })
      } else {
        toast.error(response.message || 'Failed to run live analysis.', { id: toastId })
      }
      // Refresh to grab any new scenes
      fetchSatelliteData()
    } catch (err) {
      console.error('❌ Analyze trigger failed:', err)
      toast.error(err.message || 'Error communicating with InSAR endpoint.', { id: toastId })
    } finally {
      setAnalyzing(false)
    }
  }

  // Formatting helpers
  const formatDisplacement = (val) => {
    if (val === undefined || val === null) return 'N/A'
    return `${val.toFixed(2)} mm`
  }

  const formatVelocity = (val) => {
    if (val === undefined || val === null) return 'N/A'
    return `${val.toFixed(3)} mm/day`
  }

  const formatAcceleration = (val) => {
    if (val === undefined || val === null) return 'N/A'
    return `${val.toFixed(3)} mm/day²`
  }

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'var(--status-danger)'
      case 'high':
        return 'var(--status-orange)'
      case 'moderate':
        return 'var(--status-warning)'
      case 'low':
      default:
        return 'var(--status-success)'
    }
  }

  const getTrendIcon = (trend) => {
    switch (trend?.toLowerCase()) {
      case 'accelerating':
        return '🚨 Accelerating (Critical)'
      case 'creeping':
        return '⚠️ Slow Creep (Warning)'
      case 'stable':
      default:
        return '✅ Stable Structure'
    }
  }

  // Map zone relative locations on a visual pit bench representation
  // Bingham Canyon center is lat: 40.5335, lon: -112.1408
  // We scale lat/lon offsets to fit our SVG layout beautifully (500x500 px box)
  const mapCenter = { lat: 40.5335, lon: -112.1408 }
  const scaleX = 14000 // Map degrees to SVG pixels
  const scaleY = 14000

  const getZoneSvgCoords = (lat, lon) => {
    const dx = lon - mapCenter.lon
    const dy = lat - mapCenter.lat
    // SVG coordinates: Center is 250, 250
    // x increases to the right, y increases downwards (so subtract dy)
    const x = 250 + dx * scaleX
    const y = 250 - dy * scaleY
    return { x, y }
  }

  if (loading && !status) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh', gap: 2 }}>
        <CircularProgress size={50} sx={{ color: 'var(--accent-primary)' }} />
        <Typography variant="h6" sx={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
          Decoding InSAR Interferograms & Raster Metadata...
        </Typography>
      </Box>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      {/* Title Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ color: '#fff', fontFamily: 'var(--font-sans)', fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AntennaIcon sx={{ color: 'var(--accent-primary)', fontSize: 36 }} />
            Sentinel-1 InSAR Deformation Monitoring
          </Typography>
          <Typography variant="body1" sx={{ color: '#94a3b8' }}>
            Millimeter-level ground subsidence and geological displacement monitoring using Sentinel-1 InSAR coherence analysis.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            onClick={fetchSatelliteData}
            startIcon={<RefreshIcon />}
            sx={{
              borderColor: 'var(--border-primary)',
              color: '#cbd5e1',
              '&:hover': { borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' },
            }}
          >
            Refresh Data
          </Button>
          <Button
            variant="contained"
            onClick={handleTriggerAnalysis}
            disabled={analyzing}
            startIcon={analyzing ? <CircularProgress size={20} color="inherit" /> : <UploadIcon />}
            sx={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--bg-primary)',
              fontWeight: 600,
              '&:hover': { backgroundColor: 'var(--accent-secondary)' },
            }}
          >
            {analyzing ? 'Checking HyP3...' : 'Query Sentinel-1'}
          </Button>
        </Box>
      </Box>

      {/* System Status HUD */}
      {status && (
        <Card sx={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', mb: 4, boxShadow: 'var(--shadow-card)' }}>
          <CardContent sx={{ py: '16px !important' }}>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748b', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 1 }}>
                    System Status
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Chip
                      icon={<CheckCircleIcon style={{ color: 'var(--bg-primary)', fontSize: 16 }} />}
                      label={status.available ? 'Active' : 'Offline'}
                      sx={{
                        backgroundColor: status.available ? 'var(--status-success)' : 'var(--status-danger)',
                        color: 'var(--bg-primary)',
                        fontWeight: 700,
                        height: 24,
                      }}
                    />
                    <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500 }}>
                      Mode: {status.mode.toUpperCase()}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748b', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 1 }}>
                    Data Source & Provider
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#fff', fontWeight: 600, mt: 0.5 }}>
                    {status.provider}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748b', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 1 }}>
                    Scenes Cached / History
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'var(--accent-primary)', fontWeight: 700, mt: 0.5 }}>
                    {status.scenes_cached} InSAR Pairs
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748b', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 1 }}>
                    Last Acquisition Pair
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#fff', fontWeight: 600, mt: 0.5 }}>
                    {status.last_observation || 'No acquisitions loaded'}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 4, background: 'rgba(216, 70, 32, 0.1)', border: '1px solid var(--status-danger)', color: '#fff' }}>
          {error}
        </Alert>
      )}

      {/* Main Grid Workspace */}
      <Grid container spacing={4}>
        {/* Left Side: Topographical Mini-Map / SVG Bench Layout */}
        <Grid item xs={12} lg={6}>
          <Card
            sx={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" sx={{ color: '#fff', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <ExploreIcon sx={{ color: 'var(--accent-primary)' }} />
                Open-Pit Topographical Monitoring Zones
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3 }}>
                Click on a monitoring zone indicator inside the Bingham Canyon Pit to analyze timeseries deformation.
              </Typography>

              {/* Interactive SVG Geological Map */}
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: 420,
                  border: '1px solid var(--border-primary)',
                  backgroundColor: '#070c0e',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Geological Scanline HUD overlay */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '2px',
                    backgroundColor: 'rgba(66, 201, 208, 0.25)',
                    boxShadow: '0 0 10px var(--accent-primary)',
                    animation: 'scanLineMove 8s infinite linear',
                    pointerEvents: 'none',
                  }}
                />

                <svg width="100%" height="100%" viewBox="0 0 500 500" style={{ pointerEvents: 'auto' }}>
                  {/* Outer Concentric Pit Benches Design */}
                  <ellipse cx="250" cy="250" rx="220" ry="190" fill="none" stroke="rgba(38, 51, 56, 0.4)" strokeWidth="6" />
                  <ellipse cx="250" cy="250" rx="190" ry="160" fill="none" stroke="rgba(38, 51, 56, 0.6)" strokeWidth="4" />
                  <ellipse cx="250" cy="250" rx="160" ry="135" fill="none" stroke="rgba(38, 51, 56, 0.8)" strokeWidth="3" />
                  <ellipse cx="250" cy="250" rx="130" ry="110" fill="none" stroke="rgba(66, 201, 208, 0.15)" strokeWidth="2" strokeDasharray="5,5" />
                  <ellipse cx="250" cy="250" rx="100" ry="85" fill="none" stroke="rgba(66, 201, 208, 0.25)" strokeWidth="1.5" />
                  <ellipse cx="250" cy="250" rx="70" ry="60" fill="none" stroke="rgba(66, 201, 208, 0.35)" strokeWidth="1" />
                  <ellipse cx="250" cy="250" rx="40" ry="32" fill="#0c191c" stroke="rgba(66, 201, 208, 0.5)" strokeWidth="1" />

                  {/* Cardinal directions */}
                  <text x="250" y="30" fill="rgba(66, 201, 208, 0.5)" fontSize="11" fontFamily="var(--font-mono)" textAnchor="middle">N (HIGHWALL)</text>
                  <text x="250" y="480" fill="rgba(66, 201, 208, 0.5)" fontSize="11" fontFamily="var(--font-mono)" textAnchor="middle">S (WASTE HEAP)</text>
                  <text x="460" y="254" fill="rgba(66, 201, 208, 0.5)" fontSize="11" fontFamily="var(--font-mono)">E</text>
                  <text x="20" y="254" fill="rgba(66, 201, 208, 0.5)" fontSize="11" fontFamily="var(--font-mono)">W</text>

                  {/* Render Monitoring Zones */}
                  {deformationData.map((zone) => {
                    const { x, y } = getZoneSvgCoords(zone.latitude, zone.longitude)
                    const isSelected = zone.zone_id === selectedZone
                    const riskColor = getSeverityColor(zone.severity)

                    return (
                      <g
                        key={zone.zone_id}
                        transform={`translate(${x}, ${y})`}
                        onClick={() => setSelectedZone(zone.zone_id)}
                        style={{ cursor: 'pointer' }}
                      >
                        {/* Interactive Ripple Ring for Selected / High Severity */}
                        {(isSelected || zone.severity === 'critical' || zone.severity === 'high') && (
                          <circle
                            r="18"
                            fill="none"
                            stroke={riskColor}
                            strokeWidth="1.5"
                            className="pulse"
                            opacity={isSelected ? 0.9 : 0.5}
                          />
                        )}

                        {/* Outer interactive hover boundary */}
                        <circle r="12" fill="rgba(0,0,0,0.1)" stroke="none" />

                        {/* Center Node dot */}
                        <circle
                          r="7"
                          fill={isSelected ? '#fff' : riskColor}
                          stroke={isSelected ? riskColor : 'var(--bg-primary)'}
                          strokeWidth="2.5"
                        />

                        {/* Text Label offset to top/bottom depending on zone */}
                        <text
                          y={y > 250 ? 20 : -14}
                          fill={isSelected ? 'var(--accent-primary)' : '#cbd5e1'}
                          fontSize="10"
                          fontWeight={isSelected ? 700 : 500}
                          fontFamily="var(--font-sans)"
                          textAnchor="middle"
                          style={{
                            textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          {zone.zone_name}
                        </text>
                      </g>
                    )
                  })}
                </svg>

                {/* Coordinate HUD footer info */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 8,
                    left: 8,
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    color: '#64748b',
                    pointerEvents: 'none',
                  }}
                >
                  CENTER: lat={mapCenter.lat}, lon={mapCenter.lon} (WGS84)
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Side: Detailed Metrics & Timeseries Analysis */}
        <Grid item xs={12} lg={6}>
          <Grid container spacing={3}>
            {/* Zone Information & Status Details */}
            {currentZoneData && (
              <Grid item xs={12}>
                <Card sx={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-card)' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                          {currentZoneData.zone_name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                          ZONE ID: {currentZoneData.zone_id} | GPS: {currentZoneData.latitude.toFixed(5)}°, {currentZoneData.longitude.toFixed(5)}°
                        </Typography>
                      </Box>
                      <Chip
                        label={getTrendIcon(currentZoneData.trend)}
                        sx={{
                          backgroundColor: 'rgba(15, 23, 42, 0.6)',
                          borderColor: getSeverityColor(currentZoneData.severity),
                          borderWidth: '1.5px',
                          borderStyle: 'solid',
                          color: '#fff',
                          fontWeight: 600,
                        }}
                      />
                    </Box>

                    <Typography variant="body2" sx={{ color: '#cbd5e1', mb: 3 }}>
                      {currentZoneData.description}
                    </Typography>

                    {/* Metric Cards Grid */}
                    <Grid container spacing={2}>
                      <Grid item xs={6} md={3}>
                        <Paper sx={{ p: 1.5, background: 'rgba(15, 23, 42, 0.4)', border: '1px solid var(--border-primary)', textAlign: 'center' }}>
                          <Typography variant="caption" sx={{ color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                            <TimelineIcon sx={{ fontSize: 14 }} /> Cumulative
                          </Typography>
                          <Typography variant="h6" sx={{ color: getSeverityColor(currentZoneData.severity), fontWeight: 700, mt: 0.5 }}>
                            {formatDisplacement(currentZoneData.cumulative_deformation_mm)}
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Paper sx={{ p: 1.5, background: 'rgba(15, 23, 42, 0.4)', border: '1px solid var(--border-primary)', textAlign: 'center' }}>
                          <Typography variant="caption" sx={{ color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                            <SpeedIcon sx={{ fontSize: 14 }} /> Velocity
                          </Typography>
                          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mt: 0.5 }}>
                            {formatVelocity(currentZoneData.latest_velocity_mm_per_day)}
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Paper sx={{ p: 1.5, background: 'rgba(15, 23, 42, 0.4)', border: '1px solid var(--border-primary)', textAlign: 'center' }}>
                          <Typography variant="caption" sx={{ color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                            <StatsIcon sx={{ fontSize: 14 }} /> Acceleration
                          </Typography>
                          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mt: 0.5 }}>
                            {formatAcceleration(currentZoneData.latest_acceleration_mm_per_day_sq)}
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Paper sx={{ p: 1.5, background: 'rgba(15, 23, 42, 0.4)', border: '1px solid var(--border-primary)', textAlign: 'center' }}>
                          <Typography variant="caption" sx={{ color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                            <AlertIcon sx={{ fontSize: 14 }} /> Coherence (Mean)
                          </Typography>
                          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mt: 0.5 }}>
                            {currentZoneData.mean_coherence.toFixed(2)}
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Time-Series Line Area Chart */}
            <Grid item xs={12}>
              <Card sx={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-card)' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ color: '#fff', mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TimelineIcon sx={{ color: 'var(--accent-primary)' }} />
                    InSAR Ground Displacement History (60-Day Window)
                  </Typography>

                  <Box sx={{ width: '100%', height: 260 }}>
                    {currentZoneData && currentZoneData.observations && currentZoneData.observations.length > 0 ? (
                      <ResponsiveContainer>
                        <AreaChart
                          data={currentZoneData.observations}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="colorDeform" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={getSeverityColor(currentZoneData.severity)} stopOpacity={0.4} />
                              <stop offset="95%" stopColor={getSeverityColor(currentZoneData.severity)} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38, 51, 56, 0.4)" vertical={false} />
                          <XAxis
                            dataKey="timestamp"
                            tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                            stroke="rgba(38, 51, 56, 0.4)"
                          />
                          <YAxis
                            tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                            stroke="rgba(38, 51, 56, 0.4)"
                            label={{
                              value: 'Displacement (mm)',
                              angle: -90,
                              position: 'insideLeft',
                              style: { fill: '#64748b', fontSize: 11, fontFamily: 'var(--font-sans)', textAnchor: 'middle' },
                              offset: 0,
                            }}
                          />
                          <Tooltip
                            contentStyle={{
                              background: 'var(--bg-secondary)',
                              border: '1px solid var(--border-primary)',
                              borderRadius: '4px',
                              color: '#fff',
                              fontFamily: 'var(--font-sans)',
                            }}
                            labelStyle={{ color: '#64748b', fontWeight: 600, fontFamily: 'var(--font-mono)' }}
                          />
                          <Area
                            type="monotone"
                            dataKey="deformation_mm"
                            stroke={getSeverityColor(currentZoneData.severity)}
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill="url(#colorDeform)"
                            name="Cumulative Displacement"
                            unit=" mm"
                          />
                          {/* Baseline Reference Line */}
                          <ReferenceLine y={0} stroke="#64748b" strokeWidth={1} strokeDasharray="3 3" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                          No observations processed for this sector.
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Cached Sentinel-1 Scenes Table */}
      {scenes && scenes.length > 0 && (
        <Card sx={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', mt: 4, boxShadow: 'var(--shadow-card)' }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: '#fff', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <StatsIcon sx={{ color: 'var(--accent-primary)' }} />
              Processed Sentinel-1 SLC Interferograms (Cache Directory)
            </Typography>
            <TableContainer component={Paper} sx={{ background: 'transparent', border: 'none', boxShadow: 'none' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ borderBottom: '1px solid var(--border-primary)' }}>
                    <TableCell sx={{ color: '#64748b', fontWeight: 600, fontFamily: 'var(--font-sans)' }}>Job / Scene ID</TableCell>
                    <TableCell sx={{ color: '#64748b', fontWeight: 600, fontFamily: 'var(--font-sans)' }}>Reference Date</TableCell>
                    <TableCell sx={{ color: '#64748b', fontWeight: 600, fontFamily: 'var(--font-sans)' }}>Secondary Date</TableCell>
                    <TableCell sx={{ color: '#64748b', fontWeight: 600, fontFamily: 'var(--font-sans)' }} align="right">Days Interval</TableCell>
                    <TableCell sx={{ color: '#64748b', fontWeight: 600, fontFamily: 'var(--font-sans)' }}>Sensor / Beam Mode</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {scenes.map((scene) => (
                    <TableRow key={scene.job_id} sx={{ borderBottom: '1px solid rgba(38, 51, 56, 0.4)', '&:hover': { background: 'rgba(66, 201, 208, 0.05)' } }}>
                      <TableCell sx={{ color: '#fff', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{scene.job_id}</TableCell>
                      <TableCell sx={{ color: '#cbd5e1', fontSize: 13 }}>{scene.reference_date}</TableCell>
                      <TableCell sx={{ color: '#cbd5e1', fontSize: 13 }}>{scene.secondary_date}</TableCell>
                      <TableCell sx={{ color: 'var(--accent-primary)', fontWeight: 600, fontSize: 13 }} align="right">
                        {scene.days_interval} days
                      </TableCell>
                      <TableCell sx={{ color: '#64748b', fontSize: 12 }}>Sentinel-1 C-Band (IW SLC)</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </motion.div>
  )
}

export default SatelliteMonitoring
