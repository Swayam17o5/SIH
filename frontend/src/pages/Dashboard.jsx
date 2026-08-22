import React, { useState, useEffect } from 'react'
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Button
} from '@mui/material'
import {
  TrendingUp as TrendingUpIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  PhotoCamera as CameraIcon,
  Assessment as AssessmentIcon,
  WaterDrop as WaterDropIcon,
  Thermostat as ThermostatIcon,
  Terrain as TerrainIcon,
  Timeline as VibrationIcon,
  Shield as ShieldIcon
} from '@mui/icons-material'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { motion } from 'framer-motion'
import GeologicalSlopeMonitor from '../components/GeologicalSlopeMonitor'
import GeologicalRiskGauge from '../components/GeologicalRiskGauge'

const Dashboard = ({ systemStatus, connectionStatus, lastMessage, setCurrentPage }) => {
  const [recentActivities, setRecentActivities] = useState([])
  const [riskTrends, setRiskTrends] = useState([])
  const [detectionStats, setDetectionStats] = useState({
    totalDetections: 0,
    averageConfidence: 0,
    processedImages: 0
  })
  const [environmentalData, setEnvironmentalData] = useState({
    rainfall: 0,
    temperature: 0,
    fractureDensity: 0,
    seismicActivity: 0,
    currentRisk: 0, // Now a number (percentage)
    riskLevel: 'LOW', // String for risk level
    riskScore: 0
  })
  
  // Mock data for demonstration
  useEffect(() => {
    const mockRiskData = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      risk: Math.random() * 0.8,
      detections: Math.floor(Math.random() * 5)
    }))
    setRiskTrends(mockRiskData)
    
    const mockActivities = [
      { time: '14:30', type: 'detection', message: 'Rock detected with 95% confidence', severity: 'info' },
      { time: '14:15', type: 'risk', message: 'Risk level increased to MEDIUM', severity: 'warning' },
      { time: '13:45', type: 'system', message: 'All models loaded successfully', severity: 'success' },
      { time: '13:30', type: 'detection', message: '3 rocks detected in sector A', severity: 'info' },
    ]
    setRecentActivities(mockActivities)
    
    // Simulate environmental data updates
    const updateEnvironmentalData = () => {
      const baseRainfall = 15 + Math.random() * 20
      const baseTemp = 18 + Math.random() * 12
      const baseFracture = 1.5 + Math.random() * 2
      const baseSeismic = Math.random() * 3
      const riskScore = (baseRainfall / 35 + baseFracture / 3.5 + baseSeismic / 3) / 3
      
      setEnvironmentalData({
        rainfall: baseRainfall,
        temperature: baseTemp,
        fractureDensity: baseFracture,
        seismicActivity: baseSeismic,
        currentRisk: riskScore * 100, // Convert to percentage
        riskLevel: riskScore > 0.7 ? 'HIGH' : riskScore > 0.4 ? 'MEDIUM' : 'LOW',
        riskScore: riskScore
      })
    }
    
    updateEnvironmentalData()
    const interval = setInterval(updateEnvironmentalData, 10000) // Update every 10 seconds
    
    return () => clearInterval(interval)
  }, [])
  
  // Update stats based on real WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage)
        
        if (data.type === 'detection_update') {
          setDetectionStats(prev => ({
            totalDetections: prev.totalDetections + data.data.total_detections,
            averageConfidence: data.data.detections.length > 0 
              ? data.data.detections.reduce((sum, det) => sum + det.confidence, 0) / data.data.detections.length
              : prev.averageConfidence,
            processedImages: prev.processedImages + 1
          }))
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error)
      }
    }
  }, [lastMessage])
  
  const getStatusIcon = (status) => {
    switch (status) {
      case 'operational':
        return <CheckCircleIcon sx={{ color: 'var(--status-success)' }} />
      case 'warning':
        return <WarningIcon sx={{ color: 'var(--status-warning)' }} />
      case 'error':
        return <ErrorIcon sx={{ color: 'var(--status-danger)' }} />
      default:
        return <WarningIcon sx={{ color: '#6b7280' }} />
    }
  }
  
  const getActivityIcon = (type) => {
    switch (type) {
      case 'detection':
        return <CameraIcon sx={{ color: 'var(--accent-primary)' }} />
      case 'risk':
        return <AssessmentIcon sx={{ color: 'var(--status-orange)' }} />
      case 'system':
        return <SecurityIcon sx={{ color: 'var(--status-success)' }} />
      default:
        return <CheckCircleIcon sx={{ color: '#6b7280' }} />
    }
  }
  
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'success': return 'var(--status-success)'
      case 'warning': return 'var(--status-warning)'
      case 'error': return 'var(--status-danger)'
      default: return 'var(--accent-primary)'
    }
  }
  
  return (
    <Box>
      {/* Cinematic Hero Header */}
      <Box sx={{ 
        mb: 5, 
        p: { xs: 3, md: 5 }, 
        position: 'relative', 
        borderRadius: '4px', 
        border: '1px solid var(--border-primary)', 
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #070c0e 0%, #050708 100%)',
        minHeight: '280px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        boxShadow: 'var(--shadow-card)'
      }}>
        {/* Layered Technical Mine Contour Overlay */}
        <Box sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          opacity: 0.12,
          pointerEvents: 'none',
          backgroundImage: `
            radial-gradient(ellipse at center, rgba(66, 201, 208, 0.08) 0%, transparent 80%),
            repeating-linear-gradient(0deg, rgba(66, 201, 208, 0.02) 0px, rgba(66, 201, 208, 0.02) 1px, transparent 1px, transparent 8px),
            repeating-linear-gradient(90deg, rgba(66, 201, 208, 0.02) 0px, rgba(66, 201, 208, 0.02) 1px, transparent 1px, transparent 8px)
          `,
          maskImage: 'linear-gradient(to bottom, black 40%, transparent 95%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 95%)'
        }} />
        
        {/* Mountain slope profile technical blueprint background */}
        <Box sx={{ 
          position: 'absolute', 
          right: 0, 
          top: 0, 
          bottom: 0, 
          width: { xs: '100%', md: '50%' }, 
          height: '100%', 
          backgroundImage: 'url(/images/mine_slope_profile.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.28, 
          pointerEvents: 'none',
          maskImage: 'linear-gradient(to right, transparent 0%, black 85%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 85%)'
        }} />
        
        <Box sx={{ position: 'relative', zIndex: 1, maxWidth: '650px' }}>
          <Typography variant="caption" sx={{ 
            fontFamily: 'var(--font-mono)', 
            color: 'var(--accent-primary)', 
            fontWeight: 'bold', 
            letterSpacing: '2px',
            textTransform: 'uppercase',
            display: 'inline-block',
            mb: 1.5
          }}>
            AI-POWERED ROCKFALL DETECTION & EARLY WARNING
          </Typography>
          
          <Typography variant="h3" component="h1" sx={{ 
            fontWeight: 900, 
            mb: 2, 
            color: 'text.primary', 
            fontFamily: 'var(--font-sans)',
            letterSpacing: '-1px'
          }}>
            ROCKGUARD AI
          </Typography>
          
          <Typography variant="h6" sx={{ 
            fontFamily: 'var(--font-sans)', 
            color: 'text.secondary', 
            mb: 3, 
            fontWeight: 400,
            lineHeight: 1.4
          }}>
            See the slope. Before it moves.
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Paper 
                component="button"
                onClick={() => setCurrentPage && setCurrentPage('live-monitoring')}
                sx={{ 
                  px: 3, 
                  py: 1.2, 
                  backgroundColor: 'var(--accent-primary)', 
                  color: '#050708', 
                  fontWeight: 'bold', 
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.85rem',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  boxShadow: '0 4px 14px rgba(66, 201, 208, 0.3)',
                  transition: 'background-color 0.2s ease',
                  '&:hover': {
                    backgroundColor: 'var(--accent-secondary)'
                  }
                }}
              >
                START LIVE MONITORING
              </Paper>
            </motion.div>
            
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Paper 
                component="button"
                onClick={() => setCurrentPage && setCurrentPage('dem-analysis')}
                sx={{ 
                  px: 3, 
                  py: 1.2, 
                  backgroundColor: 'transparent', 
                  color: 'var(--accent-primary)', 
                  fontWeight: 'bold', 
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.85rem',
                  border: '1px solid var(--accent-primary)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(66, 201, 208, 0.05)'
                  }
                }}
              >
                VIEW RISK MAP
              </Paper>
            </motion.div>
          </Box>
        </Box>
      </Box>
      
      {/* Sensor Analytics Telemetry Widgets */}
      <Grid container spacing={3} sx={{ mb: 5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="hud-card" sx={{ borderLeft: '3px solid var(--accent-primary) !important' }}>
              <CardContent sx={{ pb: '12px !important' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" sx={{ fontFamily: 'var(--font-mono)', color: 'text.secondary', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                    GPS DISPLACEMENT
                  </Typography>
                  <TerrainIcon sx={{ color: 'var(--accent-primary)', fontSize: 18 }} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'text.primary' }}>
                  18.7 mm
                </Typography>
                <Typography variant="caption" sx={{ fontFamily: 'var(--font-mono)', color: 'var(--status-warning)', display: 'block', fontWeight: 'bold' }}>
                  ↑ 4.2 mm/hr
                </Typography>
                {/* Telemetry sparkline */}
                <svg width="100%" height="24" style={{ marginTop: '8px', overflow: 'visible' }}>
                  <path d="M 0,20 L 30,18 L 60,22 L 90,14 L 120,12 L 150,5 L 180,8" fill="none" stroke="var(--accent-primary)" strokeWidth="1.5" opacity="0.8" />
                </svg>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="hud-card" sx={{ borderLeft: '3px solid var(--status-warning) !important' }}>
              <CardContent sx={{ pb: '12px !important' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" sx={{ fontFamily: 'var(--font-mono)', color: 'text.secondary', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                    VIBRATION
                  </Typography>
                  <VibrationIcon sx={{ color: 'var(--status-warning)', fontSize: 18 }} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'text.primary' }}>
                  0.82 g
                </Typography>
                <Typography variant="caption" sx={{ fontFamily: 'var(--font-mono)', color: 'var(--status-warning)', display: 'block', fontWeight: 'bold' }}>
                  ELEVATED
                </Typography>
                {/* Telemetry sparkline */}
                <svg width="100%" height="24" style={{ marginTop: '8px', overflow: 'visible' }}>
                  <path d="M 0,20 L 30,22 L 60,18 L 90,10 L 120,20 L 150,8 L 180,12" fill="none" stroke="var(--status-warning)" strokeWidth="1.5" opacity="0.8" />
                </svg>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="hud-card" sx={{ borderLeft: '3px solid var(--status-orange) !important' }}>
              <CardContent sx={{ pb: '12px !important' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" sx={{ fontFamily: 'var(--font-mono)', color: 'text.secondary', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                    RAINFALL
                  </Typography>
                  <WaterDropIcon sx={{ color: 'var(--status-orange)', fontSize: 18 }} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'text.primary' }}>
                  18 mm/hr
                </Typography>
                <Typography variant="caption" sx={{ fontFamily: 'var(--font-mono)', color: 'var(--status-orange)', display: 'block', fontWeight: 'bold' }}>
                  HEAVY
                </Typography>
                {/* Telemetry sparkline */}
                <svg width="100%" height="24" style={{ marginTop: '8px', overflow: 'visible' }}>
                  <path d="M 0,20 L 30,19 L 60,15 L 90,8 L 120,6 L 150,10 L 180,5" fill="none" stroke="var(--status-orange)" strokeWidth="1.5" opacity="0.8" />
                </svg>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="hud-card" sx={{ borderLeft: '3px solid var(--status-success) !important' }}>
              <CardContent sx={{ pb: '12px !important' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" sx={{ fontFamily: 'var(--font-mono)', color: 'text.secondary', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                    SENSORS
                  </Typography>
                  <SecurityIcon sx={{ color: 'var(--status-success)', fontSize: 18 }} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'text.primary' }}>
                  24 / 28
                </Typography>
                <Typography variant="caption" sx={{ fontFamily: 'var(--font-mono)', color: 'var(--status-success)', display: 'block', fontWeight: 'bold' }}>
                  ONLINE
                </Typography>
                {/* Telemetry sparkline */}
                <svg width="100%" height="24" style={{ marginTop: '8px', overflow: 'visible' }}>
                  <path d="M 0,10 L 30,10 L 60,10 L 90,10 L 120,10 L 150,10 L 180,10" fill="none" stroke="var(--status-success)" strokeWidth="1.5" opacity="0.8" />
                </svg>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>
      
      {/* Real-time Slope & Risk Assessment Visuals */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 800, color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)', letterSpacing: '1px', textTransform: 'uppercase' }}>
        GEOLOGICAL STABILITY ANALYSIS
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} lg={8}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <GeologicalSlopeMonitor
              riskScore={environmentalData.currentRisk}
              rainfall={environmentalData.rainfall}
              seismicActivity={environmentalData.seismicActivity}
            />
          </motion.div>
        </Grid>
        <Grid item xs={12} lg={4}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <GeologicalRiskGauge riskScore={environmentalData.currentRisk} />
          </motion.div>
        </Grid>
      </Grid>

      <Typography variant="h6" sx={{ mb: 2, fontWeight: 800, color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)', letterSpacing: '1px', textTransform: 'uppercase' }}>
        ENVIRONMENTAL SENSOR INGESTION
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6} lg={3}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card 
              className="hud-card"
              sx={{ 
                height: '100%',
                borderLeft: '3px solid var(--accent-primary) !important',
                transition: 'all 0.3s ease',
                '&:hover': { 
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 24px rgba(66, 201, 208, 0.12)',
                  borderColor: 'var(--accent-secondary) !important'
                }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Precipitation Influx
                  </Typography>
                  <WaterDropIcon sx={{ fontSize: 24, color: 'var(--accent-primary)' }} />
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, color: '#f8fafc' }}>
                  {environmentalData.rainfall.toFixed(1)} <Typography component="span" variant="h6" color="text.secondary">mm</Typography>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Land saturation metric
                </Typography>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
        
        <Grid item xs={12} md={6} lg={3}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
          >
            <Card 
              className="hud-card"
              sx={{ 
                height: '100%',
                borderLeft: '3px solid var(--status-warning) !important',
                transition: 'all 0.3s ease',
                '&:hover': { 
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 24px rgba(255, 176, 32, 0.12)',
                  borderColor: 'var(--status-warning) !important'
                }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Thermal Ambient
                  </Typography>
                  <ThermostatIcon sx={{ fontSize: 24, color: 'var(--status-warning)' }} />
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, color: '#f8fafc' }}>
                  {environmentalData.temperature.toFixed(1)} <Typography component="span" variant="h6" color="text.secondary">°C</Typography>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Freeze-thaw cycle driver
                </Typography>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
        
        <Grid item xs={12} md={6} lg={3}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card 
              className="hud-card"
              sx={{ 
                height: '100%',
                borderLeft: '3px solid var(--status-success) !important',
                transition: 'all 0.3s ease',
                '&:hover': { 
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 24px rgba(66, 201, 208, 0.12)',
                  borderColor: 'var(--status-success) !important'
                }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Fracture Density
                  </Typography>
                  <TerrainIcon sx={{ fontSize: 24, color: 'var(--status-success)' }} />
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, color: '#f8fafc' }}>
                  {environmentalData.fractureDensity.toFixed(2)} <Typography component="span" variant="h6" color="text.secondary">/m²</Typography>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Structural shear lines
                </Typography>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
        
        <Grid item xs={12} md={6} lg={3}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
          >
            <Card 
              className="hud-card"
              sx={{ 
                height: '100%',
                borderLeft: '3px solid var(--status-danger) !important',
                transition: 'all 0.3s ease',
                '&:hover': { 
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 24px rgba(216, 70, 32, 0.12)',
                  borderColor: 'var(--status-danger) !important'
                }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Seismic Velocity
                  </Typography>
                  <VibrationIcon sx={{ fontSize: 24, color: 'var(--status-danger)' }} />
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, color: '#f8fafc' }}>
                  {environmentalData.seismicActivity.toFixed(1)} <Typography component="span" variant="h6" color="text.secondary">Gal</Typography>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Ground micro-tremors
                </Typography>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>
      
      {/* Charts Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} lg={8}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="hud-card">
              <CardContent>
                <Typography variant="h6" component="div" sx={{ mb: 3 }}>
                  Risk Trends (24 Hours)
                </Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={riskTrends}>
                      <defs>
                        <linearGradient id="cyanGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.35}/>
                          <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                      <XAxis dataKey="hour" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0b1215', 
                          border: '1px solid var(--border-primary)',
                          borderRadius: '4px'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="risk" 
                        stroke="var(--accent-primary)" 
                        fill="url(#cyanGradient)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
        
        <Grid item xs={12} lg={4}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="hud-card" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ position: 'relative', overflow: 'hidden', height: 160, borderBottom: '1px solid var(--border-primary)' }}>
                <Box 
                  component="img"
                  src="/images/mine_3d_twin.png"
                  alt="Mine 3D Twin"
                  sx={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
                />
                <Box sx={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  backgroundColor: 'rgba(5, 7, 8, 0.85)',
                  px: 1.5,
                  py: 0.5,
                  borderRadius: '4px',
                  border: '1px solid var(--border-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <span className="neon-dot" style={{ color: 'var(--status-orange)', animation: 'activeWarningPulse 2s infinite ease-in-out' }} />
                  <Typography variant="caption" sx={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold', color: 'var(--status-orange)', fontSize: '0.65rem' }}>
                    SECTOR B HAZARD
                  </Typography>
                </Box>
              </Box>
              <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, color: 'text.primary', fontFamily: 'var(--font-mono)' }}>
                  STRIKE PIT OPERATIONS
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.75rem', lineHeight: 1.4 }}>
                  Landslide monitoring array active on Sector B-17 excavation benches. Continuous lidar scanning updates every 24h.
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, pb: 1.5, borderBottom: '1px solid var(--border-primary)' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'bold', fontSize: '0.7rem' }}>
                    TELEMETRY CONNECTION
                  </Typography>
                  <Chip 
                    label={connectionStatus}
                    color={connectionStatus === 'Connected' ? 'success' : 'warning'}
                    size="small"
                    variant="outlined"
                    sx={{ height: 18, fontSize: '0.65rem', fontFamily: 'var(--font-mono)' }}
                  />
                </Box>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {Object.entries(systemStatus?.models_loaded || {}).map(([model, loaded]) => (
                    <Chip 
                      key={model}
                      label={model.replace('_', ' ').toUpperCase()}
                      color={loaded ? 'success' : 'default'}
                      variant="outlined"
                      size="small"
                      sx={{ height: 18, fontSize: '0.55rem', fontFamily: 'var(--font-mono)', borderColor: loaded ? 'rgba(66, 201, 208, 0.3)' : 'rgba(255, 255, 255, 0.1)' }}
                    />
                  ))}
                </Box>
                
                <Box sx={{ mt: 'auto' }}>
                  <Button 
                    variant="contained" 
                    fullWidth 
                    size="small"
                    onClick={() => setCurrentPage && setCurrentPage('dem-analysis')}
                    sx={{ 
                      backgroundColor: 'transparent',
                      border: '1px solid var(--accent-primary)',
                      color: 'var(--accent-primary)',
                      fontFamily: 'var(--font-sans)',
                      fontWeight: 'bold',
                      fontSize: '0.75rem',
                      '&:hover': {
                        backgroundColor: 'rgba(66, 201, 208, 0.08)',
                        borderColor: 'var(--accent-primary)'
                      }
                    }}
                  >
                    LAUNCH 3D DIGITAL TWIN
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>
      
      {/* Geological Rock Strata Stability Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65 }}
      >
        <Card className="hud-card" sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" component="div" sx={{ mb: 3, fontWeight: 700, letterSpacing: '-0.2px', fontFamily: 'var(--font-sans)' }}>
              GEOLOGICAL STRATA ANALYSIS
            </Typography>
            <Grid container spacing={2}>
              {[
                { name: 'COLLUVIUM OVERBURDEN', type: 'Unconsolidated Soil/Rock', depth: '0 - 8m', stability: '18%', risk: 'CRITICAL', color: 'var(--status-danger)' },
                { name: 'WEATHERED SANDSTONE', type: 'Fractured Sedimentary', depth: '8 - 20m', stability: '45%', risk: 'HIGH', color: 'var(--status-orange)' },
                { name: 'SHALE & SILTSTONE', type: 'Interbedded Stratum', depth: '20 - 58m', stability: '72%', risk: 'MODERATE', color: 'var(--status-warning)' },
                { name: 'CRYSTALLINE GNEISS', type: 'Competent Metamorphic Base', depth: '58m+', stability: '94%', risk: 'STABLE', color: 'var(--status-success)' }
              ].map((stratum, i) => (
                <Grid item xs={12} sm={6} md={3} key={i}>
                  <Box sx={{ p: 2, borderRadius: '4px', border: '1px solid var(--border-primary)', backgroundColor: 'rgba(5, 7, 8, 0.4)' }}>
                    <Typography variant="caption" sx={{ fontFamily: 'var(--font-mono)', color: stratum.color, fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                      {stratum.risk} RISK • {stratum.stability} STABILITY
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'text.primary', mb: 0.5 }}>
                      {stratum.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Layer: {stratum.type}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Depth Array: {stratum.depth}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Activities Incident Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Card className="hud-card" sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" component="div" sx={{ mb: 3, fontWeight: 700, letterSpacing: '-0.2px' }}>
              INCIDENT TIMELINE
            </Typography>
            
            <Box sx={{ pl: 2.5, position: 'relative', borderLeft: '1px solid var(--border-primary)', ml: 2, my: 2 }}>
              {recentActivities.map((activity, index) => {
                const bulletColor = activity.severity === 'success' ? 'var(--status-success)' : activity.severity === 'warning' ? 'var(--status-warning)' : 'var(--status-danger)';
                return (
                  <Box key={index} sx={{ 
                    position: 'relative', 
                    mb: 3.5, 
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      left: '-25px',
                      top: '5px',
                      width: '9px',
                      height: '9px',
                      borderRadius: '50%',
                      backgroundColor: bulletColor,
                      boxShadow: `0 0 6px ${bulletColor}`,
                      border: '2px solid var(--bg-secondary)',
                      zIndex: 2
                    }
                  }}>
                    <Typography variant="caption" sx={{ fontFamily: 'var(--font-mono)', color: 'text.secondary', display: 'inline-block', mr: 2, fontWeight: 'bold' }}>
                      {activity.time}
                    </Typography>
                    <Typography variant="body2" component="span" sx={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--accent-primary)', mr: 1.5 }}>
                      {activity.type === 'detection' ? 'ROCK_DETECTION' : activity.type === 'risk' ? 'RISK_UPDATE' : 'SYSTEM_UPDATE'}
                    </Typography>
                    <Typography variant="body2" component="span" sx={{ color: 'text.primary', fontWeight: 500 }}>
                      {activity.message}
                    </Typography>
                  </Box>
                )
              })}
            </Box>
          </CardContent>
        </Card>
      </motion.div>
    </Box>
  )
}

export default Dashboard