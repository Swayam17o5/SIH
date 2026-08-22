import React, { useState, useRef, useEffect, useCallback } from 'react'
import GradCamOverlayCard from '../components/xai/GradCamOverlayCard'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Alert,
  Paper,
  Stack,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Divider,
  CircularProgress,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Switch,
  FormControlLabel
} from '@mui/material'
import {
  CloudDone as ConnectedIcon,
  CloudOff as DisconnectedIcon,
  Memory as ModelIcon,
  UploadFile as UploadIcon,
  Videocam as CameraIcon,
  Photo as SampleIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  RestartAlt as ResetIcon,
  Send as SendIcon,
  Download as DownloadIcon,
  Description as ReportIcon,
  Delete as ClearIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  PlayArrow as PlayIcon
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { apiRequest, getApiUrl } from '../config/api'

const Detection = () => {
  // --- State Management ---
  const [activeTab, setActiveTab] = useState(0) // 0: Upload, 1: Live Feed, 2: Samples
  const [previewUrl, setPreviewUrl] = useState(null)
  const [selectedImageFile, setSelectedImageFile] = useState(null)
  const [detectionResults, setDetectionResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [inputDiagnostics, setInputDiagnostics] = useState(null)
  
  // Model Settings
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.5)
  const [inferenceMode, setInferenceMode] = useState('auto')
  const [tileSize, setTileSize] = useState(448)
  const [modelsLoaded, setModelsLoaded] = useState({
    detection_model: false,
    prediction_models: false
  })
  const [backendConnected, setBackendConnected] = useState(false)
  
  // Live Camera Feed Selection
  const [selectedCamera, setSelectedCamera] = useState('east')
  const [cameraStreamUrl, setCameraStreamUrl] = useState('')
  
  // Mine Zone & DEM selection
  const [demFiles, setDemFiles] = useState([])
  const [selectedDEM, setSelectedDEM] = useState('')
  const [selectedZone, setSelectedZone] = useState('North Wall')
  
  // Risk Engine integration
  const [sendingToRisk, setSendingToRisk] = useState(false)
  const [riskAssessmentResult, setRiskAssessmentResult] = useState(null)
  const [riskMessage, setRiskMessage] = useState(null)
  
  // History and Session tracking
  const [sessionHistory, setSessionHistory] = useState([])
  const [lastDetectionTime, setLastDetectionTime] = useState(null)
  
  // UI Display Control
  const [showBBoxes, setShowBBoxes] = useState(true)
  const [zoomLevel, setZoomLevel] = useState(1.0)
  const [imageDisplayDimensions, setImageDisplayDimensions] = useState({ 
    width: 0, 
    height: 0, 
    naturalWidth: 0, 
    naturalHeight: 0 
  })
  
  const imageRef = useRef(null)
  const fileInputRef = useRef(null)

  // Standard Zones for Open-Pit Mines
  const zoneOptions = [
    'North Wall',
    'South Highwall',
    'East Bench Sector A',
    'East Bench Sector B',
    'West Upper Bench',
    'Main Pit Floor',
    'Waste Dump Area'
  ]

  // --- Side Effects & Mount Logic ---
  useEffect(() => {
    fetchSystemStatus()
    fetchDemFiles()
  }, [])

  // Resolve Camera Stream URL when camera selection changes
  useEffect(() => {
    if (activeTab === 1) {
      setCameraStreamUrl(getApiUrl(`/api/camera/${selectedCamera}/feed`))
    }
  }, [selectedCamera, activeTab])

  // --- API Fetching Methods ---
  const fetchSystemStatus = async () => {
    try {
      const data = await apiRequest('/api/status')
      setBackendConnected(true)
      setModelsLoaded(data.models_loaded || {})
    } catch (err) {
      setBackendConnected(false)
      setModelsLoaded({ detection_model: false, prediction_models: false })
      console.warn('Backend unavailable or status check failed.')
    }
  }

  const fetchDemFiles = async () => {
    try {
      const data = await apiRequest('/api/dem/files')
      if (data && data.files) {
        setDemFiles(data.files)
        // Select first DEM file by default
        if (data.files.length > 0) {
          setSelectedDEM(data.files[0].id)
        }
      }
    } catch (err) {
      console.error('Failed to fetch DEM files:', err)
    }
  }

  // --- Image Handlers ---
  const handleImageLoad = () => {
    if (imageRef.current) {
      const { clientWidth, clientHeight, naturalWidth, naturalHeight } = imageRef.current
      setImageDisplayDimensions({ 
        width: clientWidth, 
        height: clientHeight,
        naturalWidth,
        naturalHeight
      })
    }
  }

  const selectImageFile = (file) => {
    if (!file) return
    const supportedExtensions = ['jpg', 'jpeg', 'png', 'webp']
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!file.type.startsWith('image/') || !supportedExtensions.includes(extension)) {
      setError('Unsupported format. Please upload a JPG, JPEG, PNG, or WEBP image.')
      return
    }
    if (file.size > 25 * 1024 * 1024) {
      setError('Image is too large. Please upload an image smaller than 25 MB.')
      return
    }

    const nextPreviewUrl = URL.createObjectURL(file)
    const previewImage = new Image()
    previewImage.onload = () => {
      const metadata = {
        filename: file.name,
        type: file.type || `image/${extension}`,
        size: file.size,
        width: previewImage.naturalWidth,
        height: previewImage.naturalHeight,
        format: extension.toUpperCase()
      }
      setInputDiagnostics(metadata)
      if (import.meta.env.DEV) console.debug('Selected file:', metadata)
    }
    previewImage.onerror = () => {
      URL.revokeObjectURL(nextPreviewUrl)
      setError('Unable to read the selected image.')
    }
    previewImage.src = nextPreviewUrl
    setSelectedImageFile(file)
    setPreviewUrl(nextPreviewUrl)
    setDetectionResults(null)
    setRiskAssessmentResult(null)
    setRiskMessage(null)
    setError(null)
  }

  const handleFileChange = (e) => {
    selectImageFile(e.target.files[0])
    e.target.value = ''
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    selectImageFile(e.dataTransfer.files[0])
  }

  const loadSample = async (type) => {
    setLoading(true)
    setError(null)
    setRiskAssessmentResult(null)
    setRiskMessage(null)
    
    try {
      if (type === 'backend') {
        // Fetch default test image from backend
        const imageUrl = getApiUrl('/api/test-image')
        const response = await fetch(imageUrl)
        if (response.ok) {
          const blob = await response.blob()
          setSelectedImageFile(new File([blob], 'R-102-test-image.jpg', { type: 'image/jpeg' }))
          setPreviewUrl(URL.createObjectURL(blob))
          setDetectionResults(null)
        } else {
          throw new Error('Backend test image unavailable')
        }
      } else {
        // Load the local image as a real upload so results always come from YOLO.
        const res = await fetch('/demo_detection.jpg')
        if (res.ok) {
          const blob = await res.blob()
          selectImageFile(new File([blob], 'demo_detection.jpg', { type: 'image/jpeg' }))
        } else {
          throw new Error('Local demo image missing')
        }
      }
    } catch (err) {
      setError(`Failed to load sample: ${err.message}`)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // --- Live Video Frame Capture ---
  const captureFrameFromStream = () => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      // Use local proxied URL to prevent CORS taint
      img.src = getApiUrl(`/api/camera/${selectedCamera}/feed`)
      
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth || img.width || 640
        canvas.height = img.naturalHeight || img.height || 480
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `camera_${selectedCamera}_snapshot.jpg`, { type: 'image/jpeg' })
            resolve({ file, previewUrl: URL.createObjectURL(blob) })
          } else {
            reject(new Error('Canvas blob generation failed'))
          }
        }, 'image/jpeg', 0.95)
      }
      
      img.onerror = () => {
        // Fallback: draw from DOM image element if loaded
        const domImg = document.getElementById(`live-feed-element-${selectedCamera}`)
        if (domImg && domImg.complete) {
          try {
            const canvas = document.createElement('canvas')
            canvas.width = domImg.naturalWidth || domImg.width || 640
            canvas.height = domImg.naturalHeight || domImg.height || 480
            const ctx = canvas.getContext('2d')
            ctx.drawImage(domImg, 0, 0, canvas.width, canvas.height)
            canvas.toBlob((blob) => {
              if (blob) {
                const file = new File([blob], `camera_${selectedCamera}_snapshot.jpg`, { type: 'image/jpeg' })
                resolve({ file, previewUrl: URL.createObjectURL(blob) })
              } else {
                reject(new Error('DOM Canvas blob generation failed'))
              }
            }, 'image/jpeg', 0.95)
          } catch (domErr) {
            reject(domErr)
          }
        } else {
          reject(new Error('Failed to load camera stream snapshot.'))
        }
      }
    })
  }

  // --- Run Rock Detection Inference ---
  const runDetection = async () => {
    setLoading(true)
    setError(null)
    setRiskAssessmentResult(null)
    setRiskMessage(null)

    let imageToUpload = selectedImageFile
    let currentPreview = previewUrl

    try {
      // 1. If camera mode, grab frame first
      if (activeTab === 1) {
        const capture = await captureFrameFromStream()
        imageToUpload = capture.file
        currentPreview = capture.previewUrl
        setPreviewUrl(currentPreview)
      }

      if (!imageToUpload) {
        throw new Error('Please upload an image, select a sample, or stream a camera feed first.')
      }

      // 2. Prepare Form Data
      const formData = new FormData()
      formData.append('file', imageToUpload)
      
      // 3. Make POST request
      const detectionParams = new URLSearchParams({
        confidence_threshold: String(confidenceThreshold),
        inference_mode: inferenceMode,
        tile_size: String(tileSize),
        tile_overlap: '0.25'
      })
      const response = await fetch(getApiUrl(`/api/detect-rocks?${detectionParams.toString()}`), {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        const detail = payload.detail || response.statusText
        if (response.status === 503) throw new Error('Detection service unavailable.')
        if (response.status === 400) throw new Error('Image processing failed.')
        throw new Error(detail)
      }

      const results = await response.json()
      setDetectionResults(results)
      
      const detectTime = new Date()
      setLastDetectionTime(detectTime.toLocaleTimeString())

      // 4. Append to Session History
      const sourceName = activeTab === 0 ? (selectedImageFile?.name || 'Uploaded File') :
                         activeTab === 1 ? `Camera Snapshot (${selectedCamera.toUpperCase()})` : 'Sample Image'
      
      const newHistoryLog = {
        id: `rock_${Date.now()}`,
        filename: sourceName,
        model: 'YOLOv8 Custom',
        rocksCount: results.total_detections,
        avgConfidence: results.total_detections > 0
          ? results.detections.reduce((sum, d) => sum + d.confidence, 0) / results.total_detections
          : 0,
        mine: demFiles.find(d => d.id === selectedDEM)?.name || 'Default Pit',
        zone: selectedZone,
        timestamp: detectTime.toLocaleTimeString(),
        status: 'Completed'
      }

      setSessionHistory(prev => [newHistoryLog, ...prev])

    } catch (err) {
      console.error('Detection failed:', err)
      setError(err.message === 'Detection service unavailable.'
        ? 'Detection service unavailable.'
        : err.message === 'Image processing failed.'
          ? 'Image processing failed.'
          : backendConnected
            ? `Detection failed: ${err.message}`
            : 'Detection service unavailable.')
    } finally {
      setLoading(false)
    }
  }

  // --- Integrate with Risk prediction engine ---
  const sendToRiskEngine = async () => {
    if (!detectionResults) return
    setSendingToRisk(true)
    setRiskMessage(null)
    setRiskAssessmentResult(null)

    try {
      // 1. Fetch DEM statistics for selected mine to gather slope, elevation and roughness
      let demStats = {
        mean_slope_deg: 35.0,
        mean_elevation: 1200.0,
        roughness_tri: 0.5,
        risk_score: 50.0
      }

      if (selectedDEM) {
        try {
          const demAnalysis = await apiRequest(`/api/dem/analyze/${selectedDEM}`)
          if (demAnalysis && demAnalysis.statistics) {
            demStats = demAnalysis.statistics
          }
        } catch (demErr) {
          console.warn('Failed to fetch DEM statistics, falling back to default terrain metrics.', demErr)
        }
      }

      // 2. Map Rock detections to fracture density & instability indices
      // Detections indicate higher rock fracturing and wall instability.
      const detectedCount = detectionResults.total_detections
      const avgConfidence = detectedCount > 0
        ? detectionResults.detections.reduce((sum, d) => sum + d.confidence, 0) / detectedCount
        : 0

      const calculatedInstability = Math.min(1.0, 
        (demStats.risk_score / 100) * 0.4 + (detectedCount * 0.1) + (avgConfidence * 0.15)
      )
      const calculatedFractures = Math.min(10.0, 2.0 + (detectedCount * 0.8))

      // 3. Assemble full EnvironmentalData model body
      const riskPayload = {
        slope: demStats.mean_slope_deg || demStats.max_slope_deg || 35.0,
        elevation: demStats.mean_elevation || 1200.0,
        fracture_density: calculatedFractures,
        roughness: Math.min(1.0, demStats.roughness_tri || 0.5),
        slope_variability: 0.4,
        instability_index: calculatedInstability,
        wetness_index: 0.3,
        month: new Date().getMonth() + 1,
        day_of_year: Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000),
        season: Math.floor((new Date().getMonth()) / 3),
        rainfall: 45.0, // mm
        temperature: 15.0,
        temperature_variation: 8.0,
        freeze_thaw_cycles: 5.0,
        seismic_activity: 2.0,
        wind_speed: 12.0,
        precipitation_intensity: 4.0,
        humidity: 65.0,
        risk_score: 0.0
      }

      // 4. Send payload to risk-assessment backend
      const result = await apiRequest('/api/predict-risk', {
        method: 'POST',
        body: JSON.stringify(riskPayload)
      })

      setRiskAssessmentResult(result)
      setRiskMessage({
        type: 'success',
        text: 'Visual detection signal successfully sent to Risk Assessment.'
      })

    } catch (err) {
      console.error('Error sending detection features to risk engine:', err)
      setRiskMessage({
        type: 'error',
        text: 'Unable to send detection to Risk Engine. Check developer tools for logs.'
      })
    } finally {
      setSendingToRisk(false)
    }
  }

  // --- Action Methods ---
  const clearWorkbench = () => {
    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setSelectedImageFile(null)
    setDetectionResults(null)
    setInputDiagnostics(null)
    setRiskAssessmentResult(null)
    setRiskMessage(null)
    setError(null)
    setZoomLevel(1.0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const downloadResultsJson = () => {
    if (!detectionResults) return
    const blob = new Blob([JSON.stringify(detectionResults, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rock_detection_${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const generateTextReport = () => {
    if (!detectionResults) return
    const mineName = demFiles.find(d => d.id === selectedDEM)?.name || 'N/A'
    const timestamp = new Date().toLocaleString()
    const detectedCount = detectionResults.total_detections
    const avgConfidence = detectedCount > 0
      ? (detectionResults.detections.reduce((sum, d) => sum + d.confidence, 0) / detectedCount * 100).toFixed(1)
      : '0.0'

    const reportContent = `========================================================
🏔️ AI ROCKFALL DETECTION WORKBENCH REPORT
========================================================
Report Generated: ${timestamp}
Active Model: YOLOv8 Custom Object Detector
Model Status: Operational
--------------------------------------------------------
SATELLITE/SITE MAPPING
Selected Mine: ${mineName}
Target Zone: ${selectedZone}
--------------------------------------------------------
VISUAL ANALYSIS SUMMARY
Total Detected Rocks: ${detectedCount}
Average Confidence: ${avgConfidence}%
Processing Time: ${(detectionResults.processing_time_ms / 1000).toFixed(2)}s
Confidence Threshold: ${confidenceThreshold}
--------------------------------------------------------
RISK ENGINE INTEGRATION
Fitted Risk Model: Multiclass Ensemble Predictor
Overall Zone Risk Score: ${riskAssessmentResult ? `${(riskAssessmentResult.risk_score * 100).toFixed(1)}%` : 'N/A'}
Overall Zone Risk Level: ${riskAssessmentResult ? riskAssessmentResult.risk_level.toUpperCase() : 'N/A'}
--------------------------------------------------------
RECOMMENDED ACTIONS:
${riskAssessmentResult ? riskAssessmentResult.recommendations.map(r => `- ${r}`).join('\n') : '- Pending overall risk engine evaluation'}
========================================================`

    const blob = new Blob([reportContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rockfall_report_${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // --- Helper Math to draw Bounding Boxes ---
  const renderBoundingBoxes = () => {
    if (!detectionResults || !detectionResults.detections || !detectionResults.image_dimensions || 
        imageDisplayDimensions.width === 0 || imageDisplayDimensions.height === 0 || !showBBoxes) {
      return null
    }

    const { image_dimensions } = detectionResults
    
    // Fit image size accounting for object-fit: contain inside viewport
    const containerWidth = imageDisplayDimensions.width
    const containerHeight = imageDisplayDimensions.height
    const imageAspectRatio = image_dimensions.width / image_dimensions.height
    const containerAspectRatio = containerWidth / containerHeight
    
    let displayedImageWidth, displayedImageHeight, offsetX = 0, offsetY = 0
    
    if (imageAspectRatio > containerAspectRatio) {
      displayedImageWidth = containerWidth
      displayedImageHeight = containerWidth / imageAspectRatio
      offsetY = (containerHeight - displayedImageHeight) / 2
    } else {
      displayedImageHeight = containerHeight
      displayedImageWidth = containerHeight * imageAspectRatio
      offsetX = (containerWidth - displayedImageWidth) / 2
    }
    
    const scaleX = displayedImageWidth / image_dimensions.width
    const scaleY = displayedImageHeight / image_dimensions.height

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
        {detectionResults.detections.map((detection, index) => {
          const [x1, y1, x2, y2] = detection.bbox
          
          // Scaled offset positions
          const scaledX = (x1 * scaleX) + offsetX
          const scaledY = (y1 * scaleY) + offsetY
          const scaledWidth = (x2 - x1) * scaleX
          const scaledHeight = (y2 - y1) * scaleY
          const confidence = (detection.confidence * 100).toFixed(1)
          
          // Color based on confidence levels
          const boxColor = detection.confidence >= 0.8 ? '#10b981' : detection.confidence >= 0.6 ? '#f59e0b' : '#ef4444'
          const labelWidth = confidence.length * 8 + 35

          return (
            <g key={index}>
              {/* Bounding Box */}
              <rect
                x={scaledX}
                y={scaledY}
                width={scaledWidth}
                height={scaledHeight}
                fill="none"
                stroke={boxColor}
                strokeWidth="2.5"
                strokeDasharray="4,2"
              />
              {/* Label Tag */}
              <rect
                x={scaledX}
                y={scaledY - 22 < 0 ? scaledY + 2 : scaledY - 22}
                width={labelWidth}
                height="20"
                fill={boxColor}
                rx="3"
                style={{ opacity: 0.9 }}
              />
              <text
                x={scaledX + 5}
                y={scaledY - 22 < 0 ? scaledY + 16 : scaledY - 7}
                fill="#ffffff"
                fontSize="10.5"
                fontWeight="bold"
                fontFamily="Outfit, Roboto, sans-serif"
              >
                Rock {confidence}%
              </text>
            </g>
          )
        })}
      </svg>
    )
  }

  // --- Visual Risk Levels Calculations ---
  const getVisualRiskDetails = () => {
    if (!detectionResults) return { level: 'LOW', score: 0, color: '#10b981' }
    
    const count = detectionResults.total_detections
    let level = 'LOW'
    let color = '#10b981' // green
    
    if (count >= 8) {
      level = 'HIGH'
      color = '#ef4444' // red
    } else if (count >= 4) {
      level = 'MEDIUM'
      color = '#f59e0b' // orange
    }
    
    return { level, count, color }
  }

  const getConfidenceStats = () => {
    if (!detectionResults || detectionResults.total_detections === 0) {
      return { high: 0, medium: 0, low: 0, avg: 0 }
    }
    
    let high = 0
    let medium = 0
    let low = 0
    let sum = 0
    
    detectionResults.detections.forEach(d => {
      sum += d.confidence
      if (d.confidence >= 0.8) high++
      else if (d.confidence >= 0.6) medium++
      else low++
    })
    
    return {
      high,
      medium,
      low,
      avg: (sum / detectionResults.total_detections * 100).toFixed(1)
    }
  }

  const confStats = getConfidenceStats()
  const visualRisk = getVisualRiskDetails()

  return (
    <Box sx={{ color: 'text.primary' }}>
      
      {/* HEADER */}
      <Box sx={{ 
        mb: 4, 
        p: 3, 
        borderRadius: 2, 
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(30, 41, 59, 0.4)',
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 2
      }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800, color: 'white', mb: 0.5 }}>
            AI Rockfall Detection
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Computer vision module for detecting visible rockfall activity
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" gap={1}>
          <Chip
            icon={backendConnected ? <ConnectedIcon style={{ color: '#10b981' }} /> : <DisconnectedIcon style={{ color: '#ef4444' }} />}
            label={backendConnected ? "Backend: Online" : "Backend: Offline"}
            variant="outlined"
            size="small"
            sx={{ borderColor: backendConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)' }}
          />
          <Chip
            icon={<ModelIcon style={{ color: modelsLoaded.detection_model ? '#10b981' : '#ef4444' }} />}
            label={modelsLoaded.detection_model ? "Detector YOLOv8: Active" : "Detector YOLOv8: Offline"}
            variant="outlined"
            size="small"
            sx={{ borderColor: modelsLoaded.detection_model ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)' }}
          />
          {lastDetectionTime && (
            <Chip
              label={`Last Detection: ${lastDetectionTime}`}
              variant="outlined"
              size="small"
              sx={{ color: 'text.secondary', borderColor: 'rgba(255,255,255,0.08)' }}
            />
          )}
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} action={
          <IconButton size="small" aria-label="refresh" color="inherit" onClick={fetchSystemStatus}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        }>
          {error}
        </Alert>
      )}

      {/* WORKBENCH GRID */}
      <Grid container spacing={3}>
        
        {/* LEFT COLUMN: Model & Inputs */}
        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            
            {/* SECTION 1 — MODEL SELECTION */}
            <Card className="glass-card" sx={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: 'white', fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center' }}>
                  <ModelIcon sx={{ mr: 1, color: '#3b82f6' }} /> Select Detection Model
                </Typography>
                
                <FormControl fullWidth size="small" sx={{ mb: 3 }}>
                  <InputLabel id="model-select-label" sx={{ color: 'text.secondary' }}>Model</InputLabel>
                  <Select
                    labelId="model-select-label"
                    value="yolov8_custom"
                    label="Model"
                    disabled
                    sx={{ color: 'white' }}
                  >
                    <MenuItem value="yolov8_custom">YOLOv8 Custom (Fine-tuned)</MenuItem>
                  </Select>
                </FormControl>

                <Box sx={{ p: 2, borderRadius: 1, background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <Typography variant="subtitle2" sx={{ color: 'white', mb: 1.5, fontWeight: 600 }}>Model Specifications</Typography>
                  <Grid container spacing={1.5} sx={{ '& .MuiTypography-body2': { color: 'text.secondary' } }}>
                    <Grid item xs={6}>
                      <Typography variant="caption">Type</Typography>
                      <Typography variant="body2" sx={{ color: 'white !important', fontWeight: 600 }}>Object Detection</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption">Classes</Typography>
                      <Typography variant="body2" sx={{ color: 'white !important', fontWeight: 600 }}>Rock / Boulder</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption">Input Size</Typography>
                      <Typography variant="body2" sx={{ color: 'white !important', fontWeight: 600 }}>640 × 640</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption">Status</Typography>
                      <Typography variant="body2" sx={{ 
                        color: modelsLoaded.detection_model ? '#10b981 !important' : '#ef4444 !important',
                        fontWeight: 600 
                      }}>
                        {modelsLoaded.detection_model ? 'LOADED' : 'UNAVAILABLE'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>

                <Box sx={{ mt: 3 }}>
                  <Typography gutterBottom sx={{ color: 'text.secondary', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Confidence Threshold</span>
                    <strong style={{ color: 'white' }}>{(confidenceThreshold * 100).toFixed(0)}%</strong>
                  </Typography>
                  <Slider
                    value={confidenceThreshold}
                    min={0.1}
                    max={1.0}
                    step={0.05}
                    onChange={(e, val) => setConfidenceThreshold(val)}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(v) => `${(v * 100).toFixed(0)}%`}
                    sx={{ color: '#3b82f6' }}
                  />
                </Box>

                <FormControl fullWidth size="small" sx={{ mt: 2 }}>
                  <InputLabel id="inference-mode-label" sx={{ color: 'text.secondary' }}>Inference Mode</InputLabel>
                  <Select
                    labelId="inference-mode-label"
                    value={inferenceMode}
                    label="Inference Mode"
                    onChange={(e) => setInferenceMode(e.target.value)}
                    sx={{ color: 'white' }}
                  >
                    <MenuItem value="standard">Standard</MenuItem>
                    <MenuItem value="tiled">Small Object / Tiled</MenuItem>
                    <MenuItem value="auto">Auto</MenuItem>
                  </Select>
                </FormControl>

                {inferenceMode !== 'standard' && (
                  <FormControl fullWidth size="small" sx={{ mt: 2 }}>
                    <InputLabel id="tile-size-label" sx={{ color: 'text.secondary' }}>Tile Size</InputLabel>
                    <Select
                      labelId="tile-size-label"
                      value={tileSize}
                      label="Tile Size"
                      onChange={(e) => setTileSize(e.target.value)}
                      sx={{ color: 'white' }}
                    >
                      <MenuItem value={320}>320 px</MenuItem>
                      <MenuItem value={448}>448 px</MenuItem>
                      <MenuItem value={640}>640 px</MenuItem>
                    </Select>
                  </FormControl>
                )}
              </CardContent>
            </Card>

            {/* SECTION 2 — INPUTS PANEL */}
            <Card className="glass-card" sx={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Box sx={{ borderBottom: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
                <Tabs 
                  value={activeTab} 
                  onChange={(e, val) => {
                    setActiveTab(val)
                    setError(null)
                  }}
                  variant="fullWidth"
                  sx={{
                    '& .MuiTab-root': { color: 'text.secondary', py: 1.5, minHeight: 48 },
                    '& .Mui-selected': { color: '#3b82f6 !important' },
                    '& .MuiTabs-indicator': { backgroundColor: '#3b82f6' }
                  }}
                >
                  <Tab icon={<UploadIcon fontSize="small" />} label="Upload" />
                  <Tab icon={<CameraIcon fontSize="small" />} label="Camera" />
                  <Tab icon={<SampleIcon fontSize="small" />} label="Samples" />
                </Tabs>
              </Box>
              <CardContent sx={{ pt: 2.5 }}>
                
                {/* TAB 0: UPLOAD FILE */}
                {activeTab === 0 && (
                  <Box>
                    <Box
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      sx={{
                        p: 4,
                        border: '2px dashed rgba(255,255,255,0.15)',
                        borderRadius: 2,
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: 'rgba(30, 41, 59, 0.3)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          borderColor: '#3b82f6',
                          background: 'rgba(59, 130, 246, 0.05)'
                        }
                      }}
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        style={{ display: 'none' }} 
                        accept="image/*"
                      />
                      <UploadIcon sx={{ fontSize: 40, color: '#64748b', mb: 1.5 }} />
                      <Typography variant="body1" sx={{ color: 'white', fontWeight: 600, mb: 0.5 }}>
                        Upload Rockfall Image
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Drag & drop an image here or browse files
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary', opacity: 0.6 }}>
                        Supported formats: JPG, JPEG, PNG, WEBP
                      </Typography>
                    </Box>

                    {selectedImageFile && (
                      <Box sx={{ mt: 2, p: 1.5, borderRadius: 1, background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ overflow: 'hidden' }}>
                          <Typography variant="body2" noWrap sx={{ color: 'white', fontWeight: 600 }}>{selectedImageFile.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{(selectedImageFile.size / 1024).toFixed(0)} KB</Typography>
                        </Box>
                        <Button size="small" color="error" onClick={clearWorkbench} startIcon={<ClearIcon />}>
                          Remove
                        </Button>
                      </Box>
                    )}
                  </Box>
                )}

                {/* TAB 1: LIVE STREAM FEED */}
                {activeTab === 1 && (
                  <Stack spacing={2}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="camera-select-label" sx={{ color: 'text.secondary' }}>Camera Source</InputLabel>
                      <Select
                        labelId="camera-select-label"
                        value={selectedCamera}
                        onChange={(e) => setSelectedCamera(e.target.value)}
                        label="Camera Source"
                        sx={{ color: 'white' }}
                      >
                        <MenuItem value="east">East Camera (Surveillance)</MenuItem>
                        <MenuItem value="west">West Camera (Surveillance)</MenuItem>
                        <MenuItem value="north">North Camera (Surveillance)</MenuItem>
                      </Select>
                    </FormControl>

                    <Box sx={{ 
                      position: 'relative', 
                      borderRadius: 1, 
                      overflow: 'hidden', 
                      aspectRatio: '16/9', 
                      background: 'black',
                      border: '1px solid rgba(255,255,255,0.08)'
                    }}>
                      <img 
                        id={`live-feed-element-${selectedCamera}`}
                        src={cameraStreamUrl} 
                        alt={`${selectedCamera} camera stream`} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <Box sx={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        background: 'rgba(0,0,0,0.6)',
                        px: 1,
                        py: 0.2,
                        borderRadius: 0.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block' }}></span>
                        <Typography variant="caption" sx={{ color: 'white', fontWeight: 700 }}>LIVE FEED</Typography>
                      </Box>
                    </Box>

                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<CameraIcon />}
                      onClick={runDetection}
                      disabled={loading}
                      sx={{ borderColor: 'rgba(255,255,255,0.15)', color: 'white' }}
                    >
                      Capture Snapshot & Detect
                    </Button>
                  </Stack>
                )}

                {/* TAB 2: SAMPLES */}
                {activeTab === 2 && (
                  <Stack spacing={2}>
                    <Typography variant="caption" color="text.secondary">Select an authentic local or server sample image to evaluate:</Typography>
                    
                    <Grid container spacing={1.5}>
                      <Grid item xs={6}>
                        <Paper 
                          onClick={() => loadSample('backend')}
                          sx={{ 
                            p: 1.5, 
                            cursor: 'pointer', 
                            textAlign: 'center', 
                            background: 'rgba(30, 41, 59, 0.4)', 
                            border: '1px solid rgba(255,255,255,0.08)',
                            '&:hover': { background: 'rgba(59, 130, 246, 0.1)', borderColor: '#3b82f6' }
                          }}
                        >
                          <SampleIcon sx={{ mb: 1, color: '#3b82f6' }} />
                          <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>Server Sample</Typography>
                          <Typography variant="caption" color="text.secondary">Default TIF Frame</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6}>
                        <Paper 
                          onClick={() => loadSample('local')}
                          sx={{ 
                            p: 1.5, 
                            cursor: 'pointer', 
                            textAlign: 'center', 
                            background: 'rgba(30, 41, 59, 0.4)', 
                            border: '1px solid rgba(255,255,255,0.08)',
                            '&:hover': { background: 'rgba(59, 130, 246, 0.1)', borderColor: '#3b82f6' }
                          }}
                        >
                          <SampleIcon sx={{ mb: 1, color: '#10b981' }} />
                          <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>Demo Fallback</Typography>
                          <Typography variant="caption" color="text.secondary">Local JPG File</Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                  </Stack>
                )}

                {previewUrl && activeTab !== 1 && (
                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    onClick={runDetection}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PlayIcon />}
                    sx={{
                      mt: 3,
                      background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)',
                      color: 'white',
                      fontWeight: 700
                    }}
                  >
                    {loading ? 'Running AI detection...' : 'Run Detection'}
                  </Button>
                )}

              </CardContent>
            </Card>

          </Stack>
        </Grid>

        {/* RIGHT COLUMN: Result Viewer, Stats, and Risk Engine */}
        <Grid item xs={12} lg={8}>
          <Stack spacing={3}>
            
            {/* SECTION 3 — RESULT VIEWER */}
            <Card className="glass-card" sx={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                  <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>
                    🎯 Detection Viewer
                  </Typography>
                  {detectionResults && (
                    <Stack direction="row" spacing={1} alignItems="center">
                      {detectionResults.diagnostics?.mode === 'tiled' && (
                        <Chip label="Small-object tiled inference" size="small" color="info" variant="outlined" />
                      )}
                      <FormControlLabel
                        control={
                          <Switch 
                            checked={showBBoxes} 
                            onChange={(e) => setShowBBoxes(e.target.checked)} 
                            size="small"
                            sx={{
                              '& .MuiSwitch-switchBase.Mui-checked': { color: '#3b82f6' },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#3b82f6' }
                            }}
                          />
                        }
                        label={<span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Boxes</span>}
                        sx={{ m: 0 }}
                      />
                      <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                      <IconButton size="small" onClick={() => setZoomLevel(prev => Math.min(3.0, prev + 0.25))} title="Zoom In" sx={{ color: 'white' }}>
                        <ZoomInIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => setZoomLevel(prev => Math.max(1.0, prev - 0.25))} title="Zoom Out" sx={{ color: 'white' }}>
                        <ZoomOutIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => setZoomLevel(1.0)} title="Reset Scale" sx={{ color: 'white' }}>
                        <ResetIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  )}
                </Box>

                <Paper
                  sx={{
                    position: 'relative',
                    aspectRatio: '16/10',
                    background: 'rgba(15,23,42,0.6)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    overflow: 'hidden',
                    borderRadius: 1
                  }}
                >
                  {previewUrl ? (
                    <Box 
                      sx={{ 
                        position: 'relative', 
                        width: '100%', 
                        height: '100%',
                        transform: `scale(${zoomLevel})`,
                        transition: 'transform 0.2s ease-out',
                        transformOrigin: 'center center',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}
                    >
                      <img
                        ref={imageRef}
                        src={previewUrl}
                        alt="Detection workbench target"
                        onLoad={handleImageLoad}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          display: 'block'
                        }}
                      />
                      {detectionResults && renderBoundingBoxes()}
                    </Box>
                  ) : (
                    <Box sx={{ textAlign: 'center', opacity: 0.5, p: 4 }}>
                      <SampleIcon sx={{ fontSize: 60, color: '#64748b', mb: 2 }} />
                      <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                        No Image Loaded
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                        Upload an image or select a sample/camera feed to begin rock detection.
                      </Typography>
                    </Box>
                  )}

                  {detectionResults && detectionResults.total_detections === 0 && !loading && (
                    <Alert severity="info" sx={{ position: 'absolute', left: 16, right: 16, bottom: 16 }}>
                      No rock detections above the selected confidence threshold ({(confidenceThreshold * 100).toFixed(0)}%).
                    </Alert>
                  )}

                  {loading && (
                    <Box sx={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, bottom: 0,
                      background: 'rgba(15,23,42,0.8)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: 2,
                      zIndex: 10
                    }}>
                      <CircularProgress size={40} sx={{ color: '#3b82f6' }} />
                      <Typography sx={{ color: 'white', fontWeight: 600 }}>Running AI detection...</Typography>
                    </Box>
                  )}
                </Paper>
              </CardContent>
            </Card>

            {/* SECTION 4 — DETECTION STATISTICS */}
            {detectionResults && (
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Paper sx={{ p: 2.5, textAlign: 'center', background: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#3b82f6' }}>
                      {detectionResults.total_detections}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Total Rocks</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Paper sx={{ p: 2.5, textAlign: 'center', background: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#10b981' }}>
                      {confStats.high}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">High Confidence (&ge;80%)</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Paper sx={{ p: 2.5, textAlign: 'center', background: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#f59e0b' }}>
                      {confStats.avg}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Average Confidence</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Paper sx={{ p: 2.5, textAlign: 'center', background: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: 'white' }}>
                      {(detectionResults.processing_time_ms / 1000).toFixed(2)}s
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Inference Time</Typography>
                  </Paper>
                </Grid>
              </Grid>
            )}

            {/* XAI Grad-CAM Visual Heatmap Section */}
            {detectionResults && (
              <GradCamOverlayCard detection={detectionResults} />
            )}

            {import.meta.env.DEV && (inputDiagnostics || detectionResults?.diagnostics) && (
              <Card className="glass-card" sx={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 700, mb: 1.5 }}>Diagnostics</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Input: {(inputDiagnostics || detectionResults.diagnostics).filename || 'uploaded image'} ({(inputDiagnostics || detectionResults.diagnostics).width || detectionResults?.image_dimensions?.width} x {(inputDiagnostics || detectionResults.diagnostics).height || detectionResults?.image_dimensions?.height}, {(inputDiagnostics || detectionResults.diagnostics).format || 'image'})
                  </Typography>
                  {detectionResults?.diagnostics && (
                    <Typography variant="body2" color="text.secondary">
                      Model: {detectionResults.diagnostics.model_name} | Mode: {detectionResults.diagnostics.mode} | Standard: {detectionResults.diagnostics.normal_detections} | Tiled: {detectionResults.diagnostics.tiled_detections} | Final: {detectionResults.diagnostics.final_detections} | Confidence: {(detectionResults.confidence_threshold * 100).toFixed(0)}% | NMS IoU: {detectionResults.diagnostics.nms_iou_threshold} | Device: {detectionResults.diagnostics.device}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            )}

            {/* SPLIT PANELS: SUMMARY + ASSIGNMENT */}
            {detectionResults && (
              <Grid container spacing={3}>
                
                {/* SECTION 5 — DETECTION SUMMARY */}
                <Grid item xs={12} md={6}>
                  <Card className="glass-card" sx={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <CardContent>
                      <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 700, mb: 2 }}>
                        Visual Detection Risk Summary
                      </Typography>
                      
                      <Stack spacing={1.5} sx={{ '& .MuiTypography-body2': { color: 'text.secondary' } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">Detection Density</Typography>
                          <Typography variant="body2" sx={{ color: 'white !important', fontWeight: 600 }}>
                            {detectionResults.total_detections === 0 ? 'None' : detectionResults.total_detections >= 8 ? 'High' : detectionResults.total_detections >= 4 ? 'Medium' : 'Low'}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">High-Confidence Detections (&ge;80%)</Typography>
                          <Typography variant="body2" sx={{ color: 'white !important' }}>{confStats.high}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">Medium-Confidence Detections (60-79%)</Typography>
                          <Typography variant="body2" sx={{ color: 'white !important' }}>{confStats.medium}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">Low-Confidence Detections (&lt;60%)</Typography>
                          <Typography variant="body2" sx={{ color: 'white !important' }}>{confStats.low}</Typography>
                        </Box>
                        
                        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'white !important' }}>Visual Detection Risk</Typography>
                          <Chip 
                            label={visualRisk.level} 
                            size="small"
                            sx={{ 
                              backgroundColor: visualRisk.color, 
                              color: 'white', 
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              px: 1
                            }} 
                          />
                        </Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.6, fontSize: '0.7rem' }}>
                          *Visual detection risk represents only the visible rock/debris objects observed by computer vision. It is not the overall geomorphic mine risk.
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                {/* SECTION 6 — ASSIGN TO MINE ZONE */}
                <Grid item xs={12} md={6}>
                  <Card className="glass-card" sx={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <CardContent>
                      <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 700, mb: 2 }}>
                        Assign Detection to Mine Zone
                      </Typography>
                      
                      <Stack spacing={2.5}>
                        <FormControl fullWidth size="small">
                          <InputLabel id="dem-select-label" sx={{ color: 'text.secondary' }}>Target Site / Mine</InputLabel>
                          <Select
                            labelId="dem-select-label"
                            value={selectedDEM}
                            onChange={(e) => setSelectedDEM(e.target.value)}
                            label="Target Site / Mine"
                            sx={{ color: 'white' }}
                          >
                            {demFiles.map((dem) => (
                              <MenuItem key={dem.id} value={dem.id}>
                                {dem.name} ({dem.location})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        <FormControl fullWidth size="small">
                          <InputLabel id="zone-select-label" sx={{ color: 'text.secondary' }}>Target Sector Zone</InputLabel>
                          <Select
                            labelId="zone-select-label"
                            value={selectedZone}
                            onChange={(e) => setSelectedZone(e.target.value)}
                            label="Target Sector Zone"
                            sx={{ color: 'white' }}
                          >
                            {zoneOptions.map((zone) => (
                              <MenuItem key={zone} value={zone}>{zone}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        <Box sx={{ p: 1.5, borderRadius: 0.5, border: '1px dashed rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.03)' }}>
                          <Typography variant="caption" color="text.secondary">Mapped Target Association:</Typography>
                          <Typography variant="body2" sx={{ color: 'white', fontWeight: 600, mt: 0.5 }}>
                            {demFiles.find(d => d.id === selectedDEM)?.name || 'Select Site'} — {selectedZone}
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

              </Grid>
            )}

            {/* SECTION 7 — SEND TO RISK ENGINE */}
            {detectionResults && (
              <Card className="glass-card" sx={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 700, mb: 1 }}>
                    Risk Engine Integration
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Visual rock detections represent one key signal. Fuse this visual threat with static geomorphic slope, roughness, and weather datasets inside the prediction models.
                  </Typography>

                  {/* Flow chart layout */}
                  <Grid container spacing={1} alignItems="center" sx={{ mb: 3, textAlign: 'center' }}>
                    <Grid item xs={3}>
                      <Paper sx={{ py: 1, background: 'rgba(30, 41, 59, 0.5)' }}>
                        <Typography variant="caption" sx={{ color: '#3b82f6', fontWeight: 700 }}>Visual Detections</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={1}>
                      <Typography sx={{ color: 'text.secondary' }}>&rarr;</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Paper sx={{ py: 1, background: 'rgba(30, 41, 59, 0.5)' }}>
                        <Typography variant="caption" sx={{ color: '#8b5cf6', fontWeight: 700 }}>Geomorphic DEM Features</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={1}>
                      <Typography sx={{ color: 'text.secondary' }}>&rarr;</Typography>
                    </Grid>
                    <Grid item xs={3}>
                      <Paper sx={{ py: 1, background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16,185,129,0.3)' }}>
                        <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 700 }}>Zone-level Risk</Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  <Button
                    variant="contained"
                    onClick={sendToRiskEngine}
                    disabled={sendingToRisk}
                    startIcon={sendingToRisk ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                    sx={{
                      background: 'linear-gradient(45deg, #10b981, #059669)',
                      color: 'white',
                      fontWeight: 700
                    }}
                  >
                    {sendingToRisk ? 'Fusing datasets & evaluating...' : 'Send to Risk Engine'}
                  </Button>

                  {riskMessage && (
                    <Alert severity={riskMessage.type} sx={{ mt: 2 }}>
                      {riskMessage.text}
                    </Alert>
                  )}

                  {/* Risk prediction outputs */}
                  {riskAssessmentResult && (
                    <Box sx={{ mt: 3, p: 2.5, borderRadius: 1.5, background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <Typography variant="subtitle2" sx={{ color: 'white', mb: 2, fontWeight: 700 }}>
                        Fused Risk Evaluation Result
                      </Typography>
                      
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', justifycontent: 'center', alignItems: 'center' }}>
                          <Paper sx={{ 
                            p: 2, 
                            width: '100%', 
                            textAlign: 'center', 
                            backgroundColor: riskAssessmentResult.risk_level === 'HIGH' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            border: riskAssessmentResult.risk_level === 'HIGH' ? '1px solid #ef4444' : '1px solid #f59e0b'
                          }}>
                            <Typography variant="h5" sx={{ 
                              fontWeight: 800, 
                              color: riskAssessmentResult.risk_level === 'HIGH' ? '#ef4444' : '#f59e0b' 
                            }}>
                              {riskAssessmentResult.risk_level?.toUpperCase()}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">Overall Risk Level</Typography>
                          </Paper>
                        </Grid>
                        
                        <Grid item xs={6} md={4}>
                          <Paper sx={{ p: 2, textAlign: 'center' }}>
                            <Typography variant="h6" sx={{ color: '#3b82f6', fontWeight: 700 }}>
                              {(riskAssessmentResult.risk_score * 100).toFixed(1)}%
                            </Typography>
                            <Typography variant="caption" color="text.secondary">Fused Probability</Typography>
                          </Paper>
                        </Grid>

                        <Grid item xs={6} md={4}>
                          <Paper sx={{ p: 2, textAlign: 'center' }}>
                            <Typography variant="h6" sx={{ color: '#10b981', fontWeight: 700 }}>
                              {(riskAssessmentResult.confidence * 100).toFixed(1)}%
                            </Typography>
                            <Typography variant="caption" color="text.secondary">Engine Confidence</Typography>
                          </Paper>
                        </Grid>
                      </Grid>

                      <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 1 }}>
                          🛡️ Early Warning Recommendations:
                        </Typography>
                        <ul style={{ margin: 0, paddingLeft: 18, color: '#cbd5e1', fontSize: '0.85rem' }}>
                          {riskAssessmentResult.recommendations.map((rec, i) => (
                            <li key={i} style={{ marginBottom: 4 }}>{rec}</li>
                          ))}
                        </ul>
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}

            {/* SECTION 9 — ACTIONS PANEL */}
            {detectionResults && (
              <Card className="glass-card" sx={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <CardContent sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={downloadResultsJson}
                    sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.15)', flex: 1, minWidth: 150 }}
                  >
                    Download Results
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<ReportIcon />}
                    onClick={generateTextReport}
                    sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.15)', flex: 1, minWidth: 150 }}
                  >
                    Generate Report
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<ClearIcon />}
                    onClick={clearWorkbench}
                    sx={{ flex: 1, minWidth: 150 }}
                  >
                    Clear Results
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* SECTION 8 — SESSION HISTORY */}
            <Card className="glass-card" sx={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: 'white', fontWeight: 700, mb: 1 }}>
                  Session Detection History
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                  *History logs are stored in memory for the current session only.
                </Typography>

                {sessionHistory.length > 0 ? (
                  <TableContainer component={Paper} sx={{ background: 'rgba(30, 41, 59, 0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <Table size="small" aria-label="session history table">
                      <TableHead sx={{ '& th': { color: 'text.secondary', fontWeight: 700 } }}>
                        <TableRow>
                          <TableCell>Source File</TableCell>
                          <TableCell>Model</TableCell>
                          <TableCell align="right">Rocks</TableCell>
                          <TableCell align="right">Confidence</TableCell>
                          <TableCell>Mine Site</TableCell>
                          <TableCell>Zone</TableCell>
                          <TableCell>Time</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody sx={{ '& td': { color: 'white' } }}>
                        {sessionHistory.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell component="th" scope="row" sx={{ fontWeight: 600 }}>{row.filename}</TableCell>
                            <TableCell>{row.model}</TableCell>
                            <TableCell align="right">{row.rocksCount}</TableCell>
                            <TableCell align="right">{(row.avgConfidence * 100).toFixed(1)}%</TableCell>
                            <TableCell>{row.mine}</TableCell>
                            <TableCell>{row.zone}</TableCell>
                            <TableCell>{row.timestamp}</TableCell>
                            <TableCell>
                              <Chip label={row.status} size="small" color="success" variant="outlined" sx={{ fontSize: '0.65rem', height: 18 }} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4, background: 'rgba(30, 41, 59, 0.1)', border: '1px dashed rgba(255,255,255,0.05)' }}>
                    <Typography variant="body2" color="text.secondary">No detections in this session yet.</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* HONESTY & PROTO-WARNING NOTICE */}
            <Box sx={{ display: 'flex', gap: 1.5, p: 2, borderRadius: 1, background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              <InfoIcon sx={{ color: '#f59e0b', fontSize: 20, mt: 0.2 }} />
              <Box>
                <Typography variant="caption" sx={{ color: '#f59e0b', fontWeight: 700, display: 'block' }}>
                  AI-Assisted Safety Decision Support Protocol
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5, lineHeight: 1.4 }}>
                  This platform is a technical prototype designed for AI-assisted rockfall risk assessment and visual threat highlighting. It does not guarantee prediction certainty, and is not intended to automate final mine evacuation orders. All computer vision threat classifications must be validated by trained geotechnical safety engineers.
                </Typography>
              </Box>
            </Box>

          </Stack>
        </Grid>

      </Grid>
    </Box>
  )
}

export default Detection
