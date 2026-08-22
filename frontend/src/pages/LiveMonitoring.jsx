import React, { useState, useEffect, useRef } from 'react'
import { getApiUrl, apiRequest } from '../config/api'
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  IconButton,
  Button,
  FormControlLabel,
  Switch,
  Alert,
  Chip,
  Divider,
  Stack,
  Badge
} from '@mui/material'
import {
  Videocam as VideocamIcon,
  VideocamOff as VideocamOffIcon,
  Fullscreen as FullscreenIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  ErrorOutline as ErrorIcon,
  FiberManualRecord as RecordIcon,
  CameraAlt as CameraIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  RotateLeft as RotateLeftIcon,
  RotateRight as RotateRightIcon
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'

const LiveMonitoring = () => {
  // Camera feed states
  const [cameraFeeds, setCameraFeeds] = useState({
    east: {
      id: 'camera-east',
      name: 'East Camera',
      status: 'active',
      url: '',  // Will be resolved async
      lastUpdate: new Date(),
      resolution: '1920x1080',
      fps: 30,
      detections: 0,
      recording: false
    },
    west: {
      id: 'camera-west',
      name: 'West Camera',
      status: 'active',
      url: '',  // Will be resolved async
      lastUpdate: new Date(),
      resolution: '1920x1080',
      fps: 30,
      detections: 0,
      recording: false
    },
    north: {
      id: 'camera-north',
      name: 'North Camera',
      status: 'active',
      url: '',  // Will be resolved async
      lastUpdate: new Date(),
      resolution: '1920x1080',
      fps: 30,
      detections: 2,
      recording: true
    },
    south: {
      id: 'camera-south',
      name: 'South Camera',
      status: 'maintenance',
      url: '',  // Will be resolved async
      lastUpdate: new Date(Date.now() - 300000), // 5 minutes ago
      resolution: '1920x1080',
      fps: 0,
      detections: 0,
      recording: false
    }
  })

  // Resolve camera URLs on component mount
  useEffect(() => {
    const resolveCameraUrls = async () => {
      try {
        const urls = [
          getApiUrl('/api/camera/east/stream'),
          getApiUrl('/api/camera/west/stream'),
          getApiUrl('/api/camera/north/stream'),
          getApiUrl('/api/camera/south/stream')
        ]
        
        setCameraFeeds(prev => ({
          east: { ...prev.east, url: urls[0] },
          west: { ...prev.west, url: urls[1] },
          north: { ...prev.north, url: urls[2] },
          south: { ...prev.south, url: urls[3] }
        }))
      } catch (error) {
        console.error('Failed to resolve camera URLs:', error)
      }
    }
    
    resolveCameraUrls()
  }, [])

  const [selectedCamera, setSelectedCamera] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [fullscreenCamera, setFullscreenCamera] = useState(null)
  const [systemStats, setSystemStats] = useState({
    totalCameras: 4,
    activeCameras: 3,
    totalDetections: 2,
    storageUsed: '45.2 GB',
    uptime: '12h 34m'
  })

  const videoRefs = useRef({})

  // Simulate camera feed updates
  useEffect(() => {
    if (!autoRefresh) return

    const fetchCameraStatus = async () => {
      try {
        const data = await apiRequest('/api/camera/status')
        
        // Update camera feeds with real data from backend
        const directions = Object.keys(data.cameras)
        const feedUrls = directions.map(direction => getApiUrl(`/api/camera/${direction}/feed`))
        
        setCameraFeeds(prev => {
          const updated = { ...prev }
          directions.forEach((direction, index) => {
            if (updated[direction]) {
              const camera = data.cameras[direction]
              updated[direction] = {
                ...updated[direction],
                id: camera.id,
                name: camera.name,
                status: camera.status,
                resolution: camera.resolution,
                fps: camera.fps,
                recording: camera.recording,
                streaming: camera.streaming || false,
                duration: camera.duration || 0,
                detections: updated[direction].detections, // Keep existing detection count for UI
                lastUpdate: new Date(camera.last_detection || new Date()),
                url: feedUrls[index]
              }
            }
          })
          return updated
        })

        // Update system stats
        setSystemStats(prev => ({
          ...prev,
          totalCameras: data.system.total_cameras,
          activeCameras: data.system.active_cameras,
          storageUsed: data.system.storage_used,
          uptime: data.system.uptime
        }))
      } catch (error) {
        console.error('Failed to fetch camera status:', error)
      }
    }

    fetchCameraStatus()
    const interval = setInterval(fetchCameraStatus, 3000)

    return () => clearInterval(interval)
  }, [autoRefresh])

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'var(--status-success)'
      case 'inactive': return 'text.secondary'
      case 'maintenance': return 'var(--status-warning)'
      case 'error': return 'var(--status-danger)'
      default: return 'text.secondary'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircleIcon color="success" />
      case 'inactive': return <VideocamOffIcon sx={{ color: 'text.secondary' }} />
      case 'maintenance': return <WarningIcon color="warning" />
      case 'error': return <ErrorIcon color="error" />
      default: return <VideocamOffIcon sx={{ color: 'text.secondary' }} />
    }
  }

  const handleCameraControl = async (direction, action) => {
    try {
      const result = await apiRequest(`/api/camera/${direction}/control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      })
      
      console.log(`Camera ${direction}: ${action} - ${result.message}`)
      // Optionally show a success notification
    } catch (error) {
      console.error(`Camera control failed:`, error)
    }
  }

  const toggleRecording = async (direction) => {
    const currentlyRecording = cameraFeeds[direction].recording
    const action = currentlyRecording ? 'stop_record' : 'record'
    
    await handleCameraControl(direction, action)
    
    setCameraFeeds(prev => ({
      ...prev,
      [direction]: {
        ...prev[direction],
        recording: !prev[direction].recording
      }
    }))
  }

  const refreshCamera = async (direction) => {
    await handleCameraControl(direction, 'refresh')
    
    setCameraFeeds(prev => ({
      ...prev,
      [direction]: {
        ...prev[direction],
        lastUpdate: new Date()
      }
    }))
  }

  const enterFullscreen = (direction) => {
    setFullscreenCamera(direction)
  }

  const exitFullscreen = () => {
    setFullscreenCamera(null)
  }

  const CameraFeedCard = ({ direction, camera }) => (
    <Card 
      sx={{ 
        height: '100%',
        backgroundColor: 'background.paper',
        border: selectedCamera === direction ? '2px solid var(--accent-primary)' : '1px solid var(--border-primary)',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
        }
      }}
    >
      <CardContent sx={{ p: 2 }}>
        {/* Camera Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CameraIcon sx={{ color: getStatusColor(camera.status) }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'white' }}>
              {camera.name}
            </Typography>
            {camera.recording && (
              <RecordIcon sx={{ color: '#f44336', fontSize: 16, animation: 'blink 1s infinite' }} />
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip 
              size="small" 
              label={camera.status.toUpperCase()} 
              sx={{ 
                bgcolor: getStatusColor(camera.status), 
                color: 'white',
                fontWeight: 600,
                fontSize: '0.75rem'
              }} 
            />
            {getStatusIcon(camera.status)}
          </Box>
        </Box>

        {/* Video Feed Area */}
        <Box 
          sx={{ 
            width: '100%',
            aspectRatio: '16/9',
            backgroundColor: 'background.default',
            borderRadius: 2,
            mb: 2,
            position: 'relative',
            overflow: 'hidden',
            cursor: camera.status === 'active' ? 'pointer' : 'default'
          }}
          onClick={() => camera.status === 'active' && setSelectedCamera(direction)}
        >
          {camera.status === 'active' ? (
            <>
              {/* Real video feed */}
              <img
                src={camera.url}
                alt={`${direction} camera feed`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block'
                }}
                onError={(e) => {
                  // Fallback to simulated feed if video fails to load
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'flex'
                }}
                onLoad={(e) => {
                  // Hide fallback when video loads successfully
                  e.target.style.display = 'block'
                  if (e.target.nextSibling) {
                    e.target.nextSibling.style.display = 'none'
                  }
                }}
              />
              
              {/* Fallback simulated feed */}
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  background: `linear-gradient(45deg, 
                    ${direction === 'east' ? '#1e3a8a, #3b82f6' : 
                      direction === 'west' ? '#7c2d12, #ea580c' :
                      direction === 'north' ? '#14532d, #22c55e' :
                      '#7c2d12, #dc2626'})`,
                  display: 'none',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'absolute',
                  top: 0,
                  left: 0
                }}
              >
                <Typography variant="h6" sx={{ color: 'white', opacity: 0.8 }}>
                  🎥 Live Feed - {direction.toUpperCase()}
                </Typography>
              </Box>
                
              {/* Detection overlays */}
              {camera.detections > 0 && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 20,
                    left: 20,
                    border: '2px solid #f44336',
                    borderRadius: 1,
                    width: 80,
                    height: 60,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(244, 67, 54, 0.1)'
                  }}
                >
                  <Typography variant="caption" sx={{ color: '#f44336', fontWeight: 600 }}>
                    ROCK
                  </Typography>
                </Box>
              )}

              {/* Timestamp overlay */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 10,
                  right: 10,
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  padding: '4px 8px',
                  borderRadius: 1
                }}
              >
                <Typography variant="caption" sx={{ color: 'white' }}>
                  {camera.lastUpdate.toLocaleTimeString()}
                </Typography>
              </Box>

              {/* Recording indicator */}
              {camera.recording && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    backgroundColor: 'rgba(244, 67, 54, 0.9)',
                    padding: '4px 8px',
                    borderRadius: 1
                  }}
                >
                  <RecordIcon sx={{ fontSize: 12, color: 'white' }} />
                  <Typography variant="caption" sx={{ color: 'white', fontWeight: 600 }}>
                    REC
                  </Typography>
                </Box>
              )}
            </>
          ) : (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 2
              }}
            >
              <VideocamOffIcon sx={{ fontSize: 48, color: '#64748b' }} />
              <Typography variant="body2" sx={{ color: '#64748b', textAlign: 'center' }}>
                {camera.status === 'maintenance' ? 'Camera under maintenance' : 'Camera offline'}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Camera Info */}
        <Stack spacing={1} sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>Resolution:</Typography>
            <Typography variant="caption" sx={{ color: 'white' }}>{camera.resolution}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>FPS:</Typography>
            <Typography variant="caption" sx={{ color: 'white' }}>{camera.fps}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>Detections:</Typography>
            <Badge badgeContent={camera.detections} color="error">
              <Typography variant="caption" sx={{ color: 'white' }}>
                {camera.detections}
              </Typography>
            </Badge>
          </Box>
        </Stack>

        {/* Camera Controls */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <IconButton 
            size="small" 
            onClick={() => refreshCamera(direction)}
            sx={{ color: '#64748b', '&:hover': { color: '#3b82f6' } }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
          <IconButton 
            size="small" 
            onClick={() => toggleRecording(direction)}
            sx={{ color: camera.recording ? '#f44336' : '#64748b' }}
          >
            <RecordIcon fontSize="small" />
          </IconButton>
          <IconButton 
            size="small" 
            onClick={() => enterFullscreen(direction)}
            disabled={camera.status !== 'active'}
            sx={{ color: '#64748b', '&:hover': { color: '#3b82f6' } }}
          >
            <FullscreenIcon fontSize="small" />
          </IconButton>
          <IconButton 
            size="small" 
            sx={{ color: '#64748b', '&:hover': { color: '#3b82f6' } }}
          >
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  )

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', color: 'white', p: 3 }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 2, color: 'primary.main' }}>
            🎥 Live Camera Monitoring
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', mb: 1 }}>
            Real-time monitoring from four directional cameras with AI-powered rock detection
          </Typography>
          <Typography variant="body2" sx={{ color: 'secondary.main', mb: 3, fontWeight: 600 }}>
            ⚡ Powered by YOLOv8
          </Typography>
          
          {/* System Stats */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={2.4}>
              <Paper sx={{ p: 2, backgroundColor: 'background.paper', border: '1px solid var(--border-primary)', borderRadius: 1, textAlign: 'center' }}>
                <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                  {systemStats.activeCameras}/{systemStats.totalCameras}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Active Cameras
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Paper sx={{ p: 2, backgroundColor: 'background.paper', border: '1px solid var(--border-primary)', borderRadius: 1, textAlign: 'center' }}>
                <Typography variant="h6" sx={{ color: 'error.main', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                  {systemStats.totalDetections}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Active Detections
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Paper sx={{ p: 2, backgroundColor: 'background.paper', border: '1px solid var(--border-primary)', borderRadius: 1, textAlign: 'center' }}>
                <Typography variant="h6" sx={{ color: 'success.main', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                  {systemStats.storageUsed}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Storage Used
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Paper sx={{ p: 2, backgroundColor: 'background.paper', border: '1px solid var(--border-primary)', borderRadius: 1, textAlign: 'center' }}>
                <Typography variant="h6" sx={{ color: 'secondary.main', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                  {systemStats.uptime}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  System Uptime
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Paper sx={{ p: 2, backgroundColor: 'background.paper', border: '1px solid var(--border-primary)', borderRadius: 1, textAlign: 'center', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={autoRefresh} 
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Auto Refresh
                    </Typography>
                  }
                />
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </motion.div>

      {/* Camera Feeds Grid */}
      <Grid container spacing={3}>
        {Object.entries(cameraFeeds).map(([direction, camera], index) => (
          <Grid item xs={12} md={6} key={direction}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <CameraFeedCard direction={direction} camera={camera} />
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {fullscreenCamera && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.95)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20
            }}
            onClick={exitFullscreen}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              style={{ maxWidth: '90vw', maxHeight: '90vh' }}
              onClick={(e) => e.stopPropagation()}
            >
              <Card sx={{ backgroundColor: 'background.paper' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h5" sx={{ color: 'white' }}>
                      {cameraFeeds[fullscreenCamera].name} - Fullscreen View
                    </Typography>
                    <Button onClick={exitFullscreen} sx={{ color: 'white' }}>
                      Exit Fullscreen
                    </Button>
                  </Box>
                  <Box 
                    sx={{ 
                      width: '80vw',
                      height: '60vh',
                      backgroundColor: 'background.default',
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <img
                      src={cameraFeeds[fullscreenCamera]?.url || ''}
                      alt={`${fullscreenCamera} camera fullscreen feed`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        display: 'block'
                      }}
                      onError={(e) => {
                        // Fallback to placeholder if video fails to load
                        e.target.style.display = 'none'
                        e.target.nextSibling.style.display = 'flex'
                      }}
                      onLoad={(e) => {
                        // Hide fallback when video loads successfully
                        e.target.style.display = 'block'
                        if (e.target.nextSibling) {
                          e.target.nextSibling.style.display = 'none'
                        }
                      }}
                    />
                    
                    {/* Fallback content */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        display: 'none',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        gap: 2
                      }}
                    >
                      <Typography variant="h4" sx={{ color: 'white' }}>
                        🎥 {fullscreenCamera.toUpperCase()} CAMERA - FULLSCREEN
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#64748b' }}>
                        Loading video feed...
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom CSS for blinking animation */}
      <style jsx>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0.3; }
        }
      `}</style>
    </Box>
  )
}

export default LiveMonitoring