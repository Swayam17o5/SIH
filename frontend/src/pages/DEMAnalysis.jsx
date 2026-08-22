import React, { useState, useEffect, useCallback } from 'react'
import { apiRequest } from '../config/api'
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
  CircularProgress,
  Alert
} from '@mui/material'
import {
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Science as ScienceIcon,
  Public as PublicIcon
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import DemViewToggle from '../components/dem/DemViewToggle'
import Dem3DViewer from '../components/dem/Dem3DViewer'
import DemStatsPanel from '../components/dem/DemStatsPanel'

const DEMAnalysis = () => {
  const [selectedDEM, setSelectedDEM] = useState('bailadila_iron_mine')
  const [demData, setDemData] = useState(null)
  const [computedMetrics, setComputedMetrics] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [viewMode, setViewMode] = useState('3d') // '3d' | '2d'
  const [zoomLevel, setZoomLevel] = useState(1)
  const [imageLoaded, setImageLoaded] = useState(false)

  // Available DEM files with explicit, honest source classifications
  const demFiles = [
    {
      id: 'bailadila_iron_mine',
      name: 'Bailadila Iron Ore Mine',
      location: 'Chhattisgarh, India',
      source_type: 'synthetic',
      source: 'Geologically Representative Demo Data',
      is_real_data: false,
      crs: 'EPSG:32644 (UTM 44N)',
      resolution: '15m grid',
      disclaimer: 'Terrain is representative demo data and should not be interpreted as live mine measurements.',
      description: 'Geologically representative open-pit iron ore model featuring steep highwalls, quarry benches, and waste dumps.'
    },
    {
      id: 'malanjkhand_copper_mine',
      name: 'Malanjkhand Copper Mine',
      location: 'Madhya Pradesh, India',
      source_type: 'synthetic',
      source: 'Geologically Representative Demo Data',
      is_real_data: false,
      crs: 'EPSG:32644 (UTM 44N)',
      resolution: '15m grid',
      disclaimer: 'Terrain is representative demo data and should not be interpreted as live mine measurements.',
      description: 'Geologically representative open-cast copper pit model with multi-tier concentric bench geometry.'
    },
    {
      id: 'chuquicamata',
      name: 'Chuquicamata Copper Mine',
      location: 'Atacama, Chile',
      source_type: 'verified_dem',
      source: 'SRTM 30m / USGS OpenTopography Satellite Raster',
      is_real_data: true,
      crs: 'EPSG:4326 (WGS84)',
      resolution: '~21m (0.0002°)',
      disclaimer: null,
      description: 'Satellite-derived DEM raster of Chuquicamata open-pit mine (USGS/SRTM).'
    },
    {
      id: 'bingham_canyon',
      name: 'Bingham Canyon Mine',
      location: 'Utah, USA',
      source_type: 'verified_dem',
      source: 'USGS 3DEP / SRTM Satellite Raster',
      is_real_data: true,
      crs: 'EPSG:4326 (WGS84)',
      resolution: '~25m (0.0003°)',
      disclaimer: null,
      description: 'Satellite-derived DEM raster of Bingham Canyon open-pit mine (USGS 3DEP).'
    },
    {
      id: 'grasberg',
      name: 'Grasberg Mine',
      location: 'Papua, Indonesia',
      source_type: 'verified_dem',
      source: 'SRTM / ALOS PALSAR Satellite Raster',
      is_real_data: true,
      crs: 'EPSG:4326 (WGS84)',
      resolution: '~15m (0.00013°)',
      disclaimer: null,
      description: 'Satellite-derived DEM raster of high-altitude Grasberg mining complex (SRTM/ALOS).'
    }
  ]

  // Fetch DEM data when selectedDEM changes
  const fetchDEMData = useCallback(async () => {
    setLoading(true)
    setError(null)
    setImageLoaded(false)
    setComputedMetrics(null)

    try {
      const data = await apiRequest(`/api/dem/analyze/${selectedDEM}`)
      setDemData(data)
    } catch (err) {
      console.error(`❌ DEM fetch failed for ${selectedDEM}:`, err)
      setError(err.message || 'Failed to load DEM dataset')
      setDemData(null)
    } finally {
      setLoading(false)
    }
  }, [selectedDEM])

  useEffect(() => {
    if (selectedDEM) {
      fetchDEMData()
    }
  }, [selectedDEM, fetchDEMData])

  const handleDEMChange = (event) => {
    const newSiteId = event.target.value
    setSelectedDEM(newSiteId)
  }

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.2, 3))
  }

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 1.2, 0.5))
  }

  const handleDownload = () => {
    if (demData && demData.image_url) {
      const link = document.createElement('a')
      link.href = demData.image_url
      link.download = `${selectedDEM}_elevation_map.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const activeSite = demFiles.find(f => f.id === selectedDEM)

  // Merged statistics object ensuring single source of truth for slope and multi-factor metrics
  const mergedStatistics = {
    ...(demData?.statistics || {}),
    ...(computedMetrics || {})
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', color: 'white', p: { xs: 2, md: 3 } }}>
      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <span>🏔️</span> 3D Digital Elevation Model (DEM) Analysis
            </Typography>
            <DemViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
          </Box>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Client-side interactive 3D terrain mesh viewer with multi-factor geomorphological risk assessment & slope hazard detection.
          </Typography>
        </Box>
      </motion.div>

      {/* Site Selector Bar */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={5}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ color: 'text.secondary' }}>Select DEM Mining Site</InputLabel>
                  <Select
                    value={selectedDEM}
                    label="Select DEM Mining Site"
                    onChange={(e) => setSelectedDEM(e.target.value)}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          backgroundColor: '#0f172a',
                          border: '1px solid #334155',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.7)',
                          '& .MuiMenuItem-root': {
                            py: 1.25,
                            px: 2,
                            borderBottom: '1px solid rgba(51, 65, 85, 0.4)',
                            '&:hover': {
                              backgroundColor: 'rgba(59, 130, 246, 0.15)'
                            },
                            '&.Mui-selected': {
                              backgroundColor: 'rgba(59, 130, 246, 0.25) !important'
                            }
                          }
                        }
                      }
                    }}
                    sx={{
                      color: 'white',
                      backgroundColor: 'background.default',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'var(--border-primary)'
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main'
                      }
                    }}
                  >
                    {demFiles.map((file) => (
                      <MenuItem
                        key={file.id}
                        value={file.id}
                        onClick={() => setSelectedDEM(file.id)}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pointerEvents: 'none' }}>
                          <Box sx={{ pointerEvents: 'none' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'white' }}>
                              {file.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                              {file.location}
                            </Typography>
                          </Box>
                          <Chip
                            icon={file.is_real_data ? <PublicIcon sx={{ fontSize: '0.8rem !important' }} /> : <ScienceIcon sx={{ fontSize: '0.8rem !important' }} />}
                            label={file.is_real_data ? 'Verified DEM' : 'Demo Data'}
                            size="small"
                            sx={{
                              ml: 1.5,
                              fontSize: '0.68rem',
                              height: 20,
                              backgroundColor: file.is_real_data ? 'rgba(13, 148, 136, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                              color: file.is_real_data ? 'secondary.main' : 'warning.main',
                              border: '1px solid currentColor',
                              pointerEvents: 'none'
                            }}
                          />
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={fetchDEMData}
                    disabled={!selectedDEM || loading}
                    sx={{ color: 'primary.main', borderColor: 'var(--border-primary)', '&:hover': { borderColor: 'primary.main', backgroundColor: 'rgba(234, 88, 12, 0.08)' } }}
                  >
                    Reload
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={handleDownload}
                    disabled={!demData}
                    sx={{ color: 'success.main', borderColor: 'var(--border-primary)', '&:hover': { borderColor: 'success.main', backgroundColor: 'rgba(13, 148, 136, 0.08)' } }}
                  >
                    Export 2D Map
                  </Button>
                </Box>
              </Grid>

              <Grid item xs={12} md={3}>
                {activeSite && (
                  <Box sx={{ textAlign: { md: 'right', xs: 'left' } }}>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      Selected Site
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#e2e8f0', fontWeight: 600 }}>
                      {activeSite.name}
                    </Typography>
                  </Box>
                )}
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Terrain Viewer Section (3D or 2D) */}
        <Grid item xs={12} lg={8}>
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <Card sx={{ minHeight: 600 }}>
              <CardContent sx={{ p: 2 }}>
                {/* Header inside viewer card */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, fontSize: '1.05rem' }}>
                    {viewMode === '3d' ? '3D Interactive Terrain Mesh' : '2D Color-Coded Heatmap Map'}
                  </Typography>

                  {viewMode === '2d' && demData && (
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={handleZoomOut}
                        sx={{ minWidth: 36, px: 1, color: 'text.secondary', borderColor: 'var(--border-primary)' }}
                      >
                        <ZoomOutIcon fontSize="small" />
                      </Button>
                      <Chip
                        label={`${Math.round(zoomLevel * 100)}%`}
                        size="small"
                        sx={{ backgroundColor: 'var(--border-primary)', color: 'text.primary' }}
                      />
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={handleZoomIn}
                        sx={{ minWidth: 36, px: 1, color: 'text.secondary', borderColor: 'var(--border-primary)' }}
                      >
                        <ZoomInIcon fontSize="small" />
                      </Button>
                    </Box>
                  )}
                </Box>

                {/* Viewport container */}
                <Box
                  sx={{
                    width: '100%',
                    height: 540,
                    backgroundColor: 'background.default',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {loading && (
                    <Box sx={{ textAlign: 'center' }}>
                      <CircularProgress sx={{ color: 'primary.main', mb: 2 }} />
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Processing DEM grid & calculating multi-factor slopes...
                      </Typography>
                    </Box>
                  )}

                  {error && (
                    <Alert severity="error" sx={{ maxWidth: 450 }}>
                      {error}
                    </Alert>
                  )}

                  {/* 3D Viewer Mode */}
                  {!loading && !error && viewMode === '3d' && demData && (
                    <Dem3DViewer
                      key={selectedDEM}
                      mesh3d={demData.mesh3d}
                      siteName={activeSite?.name}
                      onTerrainComputed={setComputedMetrics}
                    />
                  )}

                  {/* 2D Fallback Mode */}
                  {!loading && !error && viewMode === '2d' && demData && (
                    <Box
                      sx={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transform: `scale(${zoomLevel})`,
                        transition: 'transform 0.25s ease'
                      }}
                    >
                      <img
                        src={demData.image_url}
                        alt={`${selectedDEM} elevation map`}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          borderRadius: 8,
                          opacity: imageLoaded ? 1 : 0,
                          transition: 'opacity 0.3s ease'
                        }}
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setError('Failed to load elevation map image')}
                      />
                      {!imageLoaded && (
                        <Box sx={{ position: 'absolute' }}>
                          <CircularProgress sx={{ color: '#3b82f6' }} />
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        {/* Right-Hand Statistics & Slope Ramp Panel */}
        <Grid item xs={12} lg={4}>
          <DemStatsPanel
            statistics={mergedStatistics}
            selectedFile={selectedDEM}
            demFiles={demFiles}
            sourceInfo={demData?.source_info}
          />
        </Grid>
      </Grid>
    </Box>
  )
}

export default DEMAnalysis