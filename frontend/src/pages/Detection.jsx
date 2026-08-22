import React, { useState, useRef, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Alert,
  Paper,
  Stack
} from '@mui/material'
import {
  FlightTakeoff as DroneIcon,
  PlayArrow as PlayIcon
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { apiRequest, getApiUrl } from '../config/api'

const Detection = () => {
  const [previewUrl, setPreviewUrl] = useState(null)
  const [detectionResults, setDetectionResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showDemo, setShowDemo] = useState(false)
  const [imageDisplayDimensions, setImageDisplayDimensions] = useState({ 
    width: 0, 
    height: 0, 
    naturalWidth: 0, 
    naturalHeight: 0 
  })
  const [demoLoaded, setDemoLoaded] = useState(false)
  
  const imageRef = useRef(null)

  // Load demo detection on component mount
  useEffect(() => {
    if (!demoLoaded) {
      loadDemoDetection()
    }
  }, [])

  const loadDemoDetection = async () => {
    if (demoLoaded) {
      console.log('� Demo already loaded, skipping...')
      return
    }
    
    console.log('�🔍 Loading demo detection...')
    setDemoLoaded(true)
    
    try {
      // Try to load default test image from backend
      console.log('📸 Fetching test image from /api/test-image')
      const imageUrl = getApiUrl('/api/test-image')
      const imageResponse = await fetch(imageUrl)
      console.log('📸 Image response status:', imageResponse.status)
      
      if (imageResponse.ok) {
        const imageBlob = await imageResponse.blob()
        const imageObjectUrl = URL.createObjectURL(imageBlob)
        console.log('📸 Test image loaded successfully:', imageObjectUrl)
        
        // Get detection results for the test image
        console.log('🎯 Fetching detection results from /api/test-image/detect')
        const detectionResults = await apiRequest('/api/test-image/detect?confidence_threshold=0.5')
        console.log('🎯 Detection results:', detectionResults)
          setShowDemo(true)
        setDetectionResults(detectionResults)
        setPreviewUrl(imageObjectUrl)
        console.log('✅ Demo detection loaded successfully!')
        return
      } else {
        console.error('❌ Image API failed:', imageResponse.statusText)
      }
      
      // Fallback to old demo if new endpoints aren't available
      console.log('🔄 Trying fallback demo...')
      const response = await fetch('/demo_detection_results.json')
      if (response.ok) {
        const demoResults = await response.json()
        setShowDemo(true)
        setPreviewUrl('/demo_detection.jpg')
        setDetectionResults(demoResults)
        console.log('✅ Fallback demo loaded')
      } else {
        console.log('❌ Fallback demo not available')
      }
    } catch (error) {
      console.error('❌ Demo detection error:', error)
      setDemoLoaded(false) // Reset flag on error so it can be retried
    }
  }

  const tryDemoDetection = () => {
    setShowDemo(true)
    setDemoLoaded(false) // Reset flag to allow reload
    loadDemoDetection()
    setError(null)
  }

  const handleImageLoad = () => {
    if (imageRef.current) {
      const { clientWidth, clientHeight, naturalWidth, naturalHeight } = imageRef.current
      setImageDisplayDimensions({ 
        width: clientWidth, 
        height: clientHeight,
        naturalWidth,
        naturalHeight
      })
      console.log('📐 Image loaded:', {
        displayed: { width: clientWidth, height: clientHeight },
        natural: { width: naturalWidth, height: naturalHeight }
      })
    }
  }

  const renderBoundingBoxes = () => {
    if (!detectionResults || !detectionResults.detections || !detectionResults.image_dimensions || 
        imageDisplayDimensions.width === 0 || imageDisplayDimensions.height === 0) {
      console.log('⚠️ Bounding boxes not rendered:', {
        hasDetectionResults: !!detectionResults,
        hasDetections: !!detectionResults?.detections,
        hasImageDimensions: !!detectionResults?.image_dimensions,
        displayDimensions: imageDisplayDimensions
      })
      return null
    }

    const { image_dimensions } = detectionResults
    
    // Calculate the actual displayed image size accounting for object-fit: contain
    const containerWidth = imageDisplayDimensions.width
    const containerHeight = imageDisplayDimensions.height
    const imageAspectRatio = image_dimensions.width / image_dimensions.height
    const containerAspectRatio = containerWidth / containerHeight
    
    let displayedImageWidth, displayedImageHeight, offsetX = 0, offsetY = 0
    
    if (imageAspectRatio > containerAspectRatio) {
      // Image is wider than container - fit to width
      displayedImageWidth = containerWidth
      displayedImageHeight = containerWidth / imageAspectRatio
      offsetY = (containerHeight - displayedImageHeight) / 2
    } else {
      // Image is taller than container - fit to height
      displayedImageHeight = containerHeight
      displayedImageWidth = containerHeight * imageAspectRatio
      offsetX = (containerWidth - displayedImageWidth) / 2
    }
    
    const scaleX = displayedImageWidth / image_dimensions.width
    const scaleY = displayedImageHeight / image_dimensions.height

    console.log('🎯 Rendering bounding boxes:', {
      originalImageSize: image_dimensions,
      containerSize: { width: containerWidth, height: containerHeight },
      displayedImageSize: { width: displayedImageWidth, height: displayedImageHeight },
      offsets: { x: offsetX, y: offsetY },
      scaleFactors: { scaleX, scaleY },
      detectionsCount: detectionResults.detections.length
    })

    return (
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {detectionResults.detections.map((detection, index) => {
          const [x1, y1, x2, y2] = detection.bbox
          const scaledX = (x1 * scaleX) + offsetX
          const scaledY = (y1 * scaleY) + offsetY
          const scaledWidth = (x2 - x1) * scaleX
          const scaledHeight = (y2 - y1) * scaleY
          const boxColor = confidence > 80 ? 'var(--status-success)' : confidence > 60 ? 'var(--status-warning)' : 'var(--status-danger)'
          const textWidth = confidence.length * 8 + 35

          console.log(`🎯 Detection ${index + 1}:`, {
            originalBbox: [x1, y1, x2, y2],
            scaledBbox: [scaledX, scaledY, scaledX + scaledWidth, scaledY + scaledHeight],
            confidence: confidence + '%'
          })

          return (
            <g key={index}>
              {/* Bounding box rectangle with glow effect */}
              <rect
                x={scaledX}
                y={scaledY}
                width={scaledWidth}
                height={scaledHeight}
                fill="none"
                stroke={boxColor}
                strokeWidth="3"
                strokeDasharray="8,4"
                filter="url(#glow)"
                className="detection-box"
              />
              {/* Corner markers */}
              <circle cx={scaledX} cy={scaledY} r="4" fill={boxColor} />
              <circle cx={scaledX + scaledWidth} cy={scaledY} r="4" fill={boxColor} />
              <circle cx={scaledX} cy={scaledY + scaledHeight} r="4" fill={boxColor} />
              <circle cx={scaledX + scaledWidth} cy={scaledY + scaledHeight} r="4" fill={boxColor} />
              
              {/* Confidence label background */}
              <rect
                x={scaledX}
                y={scaledY - 28}
                width={textWidth}
                height="24"
                fill={boxColor}
                rx="12"
                style={{
                  opacity: 0.95
                }}
              />
              {/* Confidence label text */}
              <text
                x={scaledX + 6}
                y={scaledY - 10}
                fill="white"
                fontSize="11"
                fontWeight="bold"
                fontFamily="Arial, sans-serif"
              >
                🪨 {confidence}%
              </text>
            </g>
          )
        })}
      </svg>
    )
  }
  
  return (
    <Box>
      <style>
        {`
          @keyframes detectPulse {
            0% { stroke-opacity: 1; }
            50% { stroke-opacity: 0.6; }
            100% { stroke-opacity: 1; }
          }
          .detection-box {
            animation: detectPulse 2s infinite;
          }
        `}
      </style>
      
      {/* Drone-themed Header */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <Box sx={{ 
          mb: 4, 
          p: 3,
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)',
          borderRadius: 3,
          border: '1px solid rgba(59, 130, 246, 0.2)'
        }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <motion.div
              animate={{ 
                rotate: [0, 5, -5, 0],
                scale: [1, 1.1, 1] 
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity,
                repeatType: "reverse" 
              }}
            >
              <DroneIcon sx={{ 
                fontSize: 48, 
                color: '#3b82f6'
              }} />
            </motion.div>
            <Box>
              <Typography variant="h3" component="h1" sx={{ 
                fontWeight: 800, 
                background: 'linear-gradient(45deg, #3b82f6, #10b981)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 0.5
              }}>
                🚁 Drone Rock Detection
              </Typography>
            </Box>
          </Stack>
          
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            🎯 Advanced aerial surveillance system for real-time rockfall detection
          </Typography>
          
          <Button
            variant="contained"
            size="large"
            onClick={tryDemoDetection}
            startIcon={<PlayIcon />}
            sx={{
              background: 'linear-gradient(45deg, #3b82f6, #10b981)',
              color: 'white',
              fontWeight: 700,
              px: 4,
              py: 1.5
            }}
          >
            🚀 Try Live Demo Detection
          </Button>
        </Box>
      </motion.div>
      
      <Grid container spacing={3}>
        {/* Demo Section */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ 
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: 3
          }}>
            <CardContent>
              <Typography variant="h6" component="div" sx={{ mb: 3, fontWeight: 700 }}>
                🎯 Live Drone Detection Demo
              </Typography>
              
              <Paper
                variant="outlined"
                sx={{
                  p: 4,
                  textAlign: 'center',
                  borderStyle: 'dashed',
                  borderWidth: 2,
                  borderColor: showDemo ? '#10b981' : '#475569',
                  backgroundColor: showDemo ? 'rgba(16, 185, 129, 0.1)' : 'rgba(15, 23, 42, 0.5)',
                  borderRadius: 3
                }}
              >
                {showDemo ? (
                  <div>
                    <Typography variant="h6" sx={{ mb: 1, color: '#10b981', fontWeight: 700 }}>
                      🎯 Drone Surveillance Active
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Real-time aerial rock detection in progress
                    </Typography>
                  </div>
                ) : (
                  <div>
                    <DroneIcon sx={{ fontSize: 48, color: '#64748b', mb: 2 }} />
                    <Typography variant="h6" sx={{ mb: 1 }}>
                      � AI Detection Demo
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Click below to see rock detection in action
                    </Typography>
                  </div>
                )}
              </Paper>
              
              {/* Preview */}
              {previewUrl && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                    🎯 Live Drone Feed with AI Detection
                  </Typography>
                  
                  <Box sx={{ 
                    position: 'relative',
                    border: '3px solid #10b981',
                    borderRadius: 2,
                    overflow: 'hidden'
                  }}>
                    <img
                      ref={imageRef}
                      src={previewUrl}
                      alt="Demo Detection"
                      onLoad={handleImageLoad}
                      style={{
                        width: '100%',
                        maxHeight: '400px',
                        objectFit: 'contain',
                        display: 'block'
                      }}
                    />
                    
                    {/* Bounding boxes overlay */}
                    {detectionResults && renderBoundingBoxes()}
                    
                    {detectionResults && (
                      <Box sx={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        color: 'white',
                        px: 2,
                        py: 1,
                        borderRadius: 1
                      }}>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>
                          🔴 LIVE DETECTION ACTIVE
                        </Typography>
                      </Box>
                    )}

                    {/* Detection stats overlay */}
                    {detectionResults && detectionResults.detections && detectionResults.detections.length > 0 && (
                      <Box sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        backgroundColor: 'rgba(16, 185, 129, 0.9)',
                        color: 'white',
                        px: 2,
                        py: 1,
                        borderRadius: 1
                      }}>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>
                          🪨 {detectionResults.total_detections} Rocks Detected
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                    <Button
                      variant="outlined"
                      onClick={tryDemoDetection}
                      startIcon={<PlayIcon />}
                      sx={{
                        borderColor: '#10b981',
                        color: '#10b981',
                        '&:hover': {
                          borderColor: '#059669',
                          backgroundColor: 'rgba(16, 185, 129, 0.1)'
                        }
                      }}
                    >
                      � Reload Demo
                    </Button>
                  </Box>
                </Box>
              )}
              
              {!previewUrl && (
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                  <Button
                    variant="contained"
                    onClick={tryDemoDetection}
                    startIcon={<PlayIcon />}
                    sx={{
                      background: 'linear-gradient(45deg, #10b981, #059669)',
                      color: 'white',
                      fontWeight: 700,
                      px: 4,
                      py: 1.5
                    }}
                  >
                    🎯 Start Demo Detection
                  </Button>
                </Box>
              )}
              
              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        {/* Results Section */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: 'fit-content' }}>
            <CardContent>
              <Typography variant="h6" component="div" sx={{ fontWeight: 700, mb: 3 }}>
                🎯 AI Detection Results
              </Typography>
              
              {detectionResults ? (
                <Box>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Paper sx={{ 
                        p: 3, 
                        textAlign: 'center', 
                        backgroundColor: 'background.default',
                        border: '1px solid var(--border-primary)',
                        borderRadius: 1
                      }}>
                        <Typography variant="h3" sx={{ 
                          fontWeight: 800, 
                          color: 'primary.main',
                          fontFamily: 'var(--font-mono)'
                        }}>
                          {detectionResults.total_detections}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                          🪨 Rocks Detected
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper sx={{ 
                        p: 3, 
                        textAlign: 'center', 
                        backgroundColor: 'background.default',
                        border: '1px solid var(--border-primary)',
                        borderRadius: 1
                      }}>
                        <Typography variant="h3" sx={{ 
                          fontWeight: 800, 
                          color: 'success.main',
                          fontFamily: 'var(--font-mono)'
                        }}>
                          {detectionResults.detections && detectionResults.detections.length > 0 
                            ? (detectionResults.detections.reduce((sum, det) => sum + det.confidence, 0) / detectionResults.detections.length * 100).toFixed(1)
                            : 0}%
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                          🎯 Detection Confidence
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                  
                  {/* Detection Legend */}
                  {detectionResults.detections && detectionResults.detections.length > 0 && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                        🎯 Detection Legend
                      </Typography>
                      <Grid container spacing={1}>
                        <Grid item xs={4}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ 
                              width: 16, 
                              height: 16, 
                              borderRadius: 0.5, 
                              backgroundColor: 'var(--status-success)' 
                            }} />
                            <Typography variant="caption" color="text.secondary">
                              High (80%+)
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={4}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ 
                              width: 16, 
                              height: 16, 
                              borderRadius: 0.5, 
                              backgroundColor: 'var(--status-warning)' 
                            }} />
                            <Typography variant="caption" color="text.secondary">
                              Medium (60-80%)
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={4}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ 
                              width: 16, 
                              height: 16, 
                              borderRadius: 0.5, 
                              backgroundColor: 'var(--status-danger)' 
                            }} />
                            <Typography variant="caption" color="text.secondary">
                              Low (&lt;60%)
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>
                  )}
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 6, opacity: 0.7 }}>
                  <DroneIcon sx={{ fontSize: 64, color: '#64748b', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                    🚁 Drone Ready for Analysis
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Upload an aerial image or try the demo to see AI-powered rock detection
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

export default Detection
