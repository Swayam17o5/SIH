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
  ListSubheader,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Divider,
  Paper
} from '@mui/material'
import {
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Science as ScienceIcon,
  Public as PublicIcon,
  CompareArrows as CompareIcon,
  Layers as LayersIcon,
  Close as CloseIcon,
  Terrain as TerrainIcon,
  Speed as SpeedIcon,
  CheckCircle as CheckCircleIcon
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
  const [layer, setLayer] = useState('elevation') // 'elevation' | 'slope' | 'hillshade' | 'contours'
  const [zoomLevel, setZoomLevel] = useState(1)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [demFiles, setDemFiles] = useState([])
  const [comparisonIds, setComparisonIds] = useState(['bailadila_iron_mine', 'chuquicamata', 'bingham_canyon'])
  const [comparisonData, setComparisonData] = useState(null)
  const [compareModalOpen, setCompareModalOpen] = useState(false)
  const [compareLoading, setCompareLoading] = useState(false)

  // Load DEM registry metadata on mount
  useEffect(() => {
    apiRequest('/api/dem/files')
      .then(data => {
        const files = data.files || []
        setDemFiles(files)
        if (files.length > 0 && !selectedDEM) {
          setSelectedDEM(files[0].id)
        }
      })
      .catch(err => setError(err.message || 'Failed to load DEM registry'))
  }, [])

  // Fetch DEM data when selectedDEM or layer changes
  const fetchDEMData = useCallback(async () => {
    if (!selectedDEM) return
    setLoading(true)
    setError(null)
    setImageLoaded(false)
    setComputedMetrics(null)

    try {
      const data = await apiRequest(`/api/dem/analyze/${selectedDEM}?layer=${layer}`)
      setDemData(data)
    } catch (err) {
      console.error(`❌ DEM fetch failed for ${selectedDEM}:`, err)
      setError(err.message || 'Failed to load DEM dataset')
      setDemData(null)
    } finally {
      setLoading(false)
    }
  }, [selectedDEM, layer])

  useEffect(() => {
    if (selectedDEM) {
      fetchDEMData()
    }
  }, [selectedDEM, fetchDEMData])

  const handleDEMChange = (event) => {
    const newSiteId = event.target.value
    setSelectedDEM(newSiteId)
  }

  const layerOptions = [
    { id: 'elevation', label: 'Elevation', icon: '🏔️', desc: 'Hypsometric color-relief terrain map' },
    { id: 'slope', label: 'Slope', icon: '📐', desc: 'Slope gradient in degrees (0° - 60°+)' },
    { id: 'hillshade', label: 'Hillshade', icon: '☀️', desc: 'Solar-illuminated 3D shaded relief' },
    { id: 'contours', label: 'Contours', icon: '〰️', desc: 'Topographic contour lines' }
  ]

  const handleOpenCompare = async () => {
    setCompareModalOpen(true)
    if (comparisonIds.length >= 2) {
      await fetchComparison(comparisonIds)
    }
  }

  const fetchComparison = async (ids) => {
    setCompareLoading(true)
    try {
      const query = ids.map(id => `ids=${encodeURIComponent(id)}`).join('&')
      const result = await apiRequest(`/api/dem/compare?${query}`)
      setComparisonData(result)
    } catch (err) {
      setError(err.message || 'Failed to compare DEMs')
    } finally {
      setCompareLoading(false)
    }
  }

  const handleComparisonSelectionChange = async (event) => {
    const newIds = event.target.value.slice(0, 3)
    setComparisonIds(newIds)
    if (newIds.length >= 2) {
      await fetchComparison(newIds)
    }
  }

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev * 1.25, 3.5))
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev / 1.25, 0.5))

  const handleDownload = () => {
    if (demData && demData.image_url) {
      const link = document.createElement('a')
      link.href = demData.image_url
      link.download = `${selectedDEM}_${layer}_map.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const activeSite = demFiles.find(f => f.id === selectedDEM)
  const indianMines = demFiles.filter(f => f.country === 'India')
  const internationalMines = demFiles.filter(f => f.country !== 'India')

  // Merged statistics object
  const mergedStatistics = {
    ...(demData?.statistics || {}),
    ...(computedMetrics || {})
  }

  const isRealData = activeSite?.is_real_data !== false && activeSite?.source_type !== 'synthetic'

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#070d1e', color: 'white', p: { xs: 2, md: 3 } }}>
      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 1 }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 1.5, fontSize: { xs: '1.4rem', md: '1.85rem' } }}>
                <span>🏔️</span> Multi-Mine DEM Terrain Analysis Engine
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5 }}>
                Authentic 30m satellite elevation models (Copernicus DEM / USGS 3DEP / SRTM) with geodetic slope gradients, TRI roughness, and 3D WebGL mesh analysis.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Button
                variant="contained"
                startIcon={<CompareIcon />}
                onClick={handleOpenCompare}
                sx={{
                  backgroundColor: '#0284c7',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  textTransform: 'none',
                  px: 2,
                  '&:hover': { backgroundColor: '#0369a1' }
                }}
              >
                Compare DEMs
              </Button>
              <DemViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
            </Box>
          </Box>
        </Box>
      </motion.div>

      {/* Control Bar: Mine Selector + Layer Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <Card sx={{ mb: 3, backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
          <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
            <Grid container spacing={2} alignItems="center">
              {/* Mine Selection Dropdown with OptGroups */}
              <Grid item xs={12} md={5}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ color: '#94a3b8' }}>Select Open-Pit Mining Site</InputLabel>
                  <Select
                    value={selectedDEM}
                    label="Select Open-Pit Mining Site"
                    onChange={handleDEMChange}
                    sx={{
                      color: 'white',
                      backgroundColor: '#070d1e',
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: '#334155' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#0ea5e9' }
                    }}
                  >
                    <ListSubheader sx={{ backgroundColor: '#0b1329', color: '#38bdf8', fontWeight: 700, fontSize: '0.78rem' }}>
                      🇮🇳 INDIAN OPEN-PIT MINES ({indianMines.length})
                    </ListSubheader>
                    {indianMines.map((file) => (
                      <MenuItem key={file.id} value={file.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'white' }}>
                              {file.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                              {file.region}, {file.country}
                            </Typography>
                          </Box>
                          <Chip
                            icon={file.is_real_data ? <PublicIcon sx={{ fontSize: '0.75rem !important' }} /> : <ScienceIcon sx={{ fontSize: '0.75rem !important' }} />}
                            label={file.is_real_data ? 'REAL DEM' : 'SYNTHETIC'}
                            size="small"
                            sx={{
                              ml: 1.5,
                              fontSize: '0.65rem',
                              height: 18,
                              backgroundColor: file.is_real_data ? 'rgba(6, 182, 212, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                              color: file.is_real_data ? '#06b6d4' : '#eab308',
                              border: `1px solid ${file.is_real_data ? '#06b6d460' : '#eab30860'}`
                            }}
                          />
                        </Box>
                      </MenuItem>
                    ))}

                    <ListSubheader sx={{ backgroundColor: '#0b1329', color: '#f59e0b', fontWeight: 700, fontSize: '0.78rem' }}>
                      🌍 INTERNATIONAL OPEN-PIT MINES ({internationalMines.length})
                    </ListSubheader>
                    {internationalMines.map((file) => (
                      <MenuItem key={file.id} value={file.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'white' }}>
                              {file.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                              {file.region}, {file.country}
                            </Typography>
                          </Box>
                          <Chip
                            icon={file.is_real_data ? <PublicIcon sx={{ fontSize: '0.75rem !important' }} /> : <ScienceIcon sx={{ fontSize: '0.75rem !important' }} />}
                            label={file.is_real_data ? 'REAL DEM' : 'SYNTHETIC'}
                            size="small"
                            sx={{
                              ml: 1.5,
                              fontSize: '0.65rem',
                              height: 18,
                              backgroundColor: file.is_real_data ? 'rgba(6, 182, 212, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                              color: file.is_real_data ? '#06b6d4' : '#eab308',
                              border: `1px solid ${file.is_real_data ? '#06b6d460' : '#eab30860'}`
                            }}
                          />
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Action Buttons */}
              <Grid item xs={12} md={3}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={fetchDEMData}
                    disabled={!selectedDEM || loading}
                    sx={{ color: '#38bdf8', borderColor: '#334155', '&:hover': { borderColor: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.08)' } }}
                  >
                    Reload
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={handleDownload}
                    disabled={!demData}
                    sx={{ color: '#10b981', borderColor: '#334155', '&:hover': { borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.08)' } }}
                  >
                    Export 2D Map
                  </Button>
                </Box>
              </Grid>

              {/* Active Site Provenance Status Badge */}
              <Grid item xs={12} md={4}>
                {activeSite && (
                  <Box sx={{ p: 1, backgroundColor: '#070d1e', borderRadius: 1.5, border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                        Source: <span style={{ color: '#38bdf8', fontWeight: 600 }}>{activeSite.source}</span>
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                        Resolution: <strong>{activeSite.resolution_m || '30m'}</strong> | {activeSite.region}, {activeSite.country}
                      </Typography>
                    </Box>
                    <Chip
                      icon={<CheckCircleIcon sx={{ fontSize: '0.85rem !important' }} />}
                      label={isRealData ? 'REAL DATA' : 'SYNTHETIC'}
                      size="small"
                      sx={{
                        backgroundColor: isRealData ? 'rgba(6, 182, 212, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                        color: isRealData ? '#06b6d4' : '#eab308',
                        fontWeight: 700,
                        fontSize: '0.68rem',
                        border: `1px solid ${isRealData ? '#06b6d470' : '#eab30870'}`
                      }}
                    />
                  </Box>
                )}
              </Grid>

              {/* Layer Selection Bar */}
              <Grid item xs={12}>
                <Divider sx={{ my: 0.5, borderColor: '#1e293b' }} />
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', mt: 1 }}>
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <LayersIcon sx={{ fontSize: '1rem', color: '#0ea5e9' }} /> Visualization Layers:
                  </Typography>
                  {layerOptions.map((opt) => (
                    <Tooltip key={opt.id} title={opt.desc} arrow>
                      <Button
                        size="small"
                        variant={layer === opt.id ? 'contained' : 'outlined'}
                        onClick={() => setLayer(opt.id)}
                        sx={{
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          textTransform: 'none',
                          backgroundColor: layer === opt.id ? '#0ea5e9' : 'transparent',
                          color: layer === opt.id ? 'white' : '#cbd5e1',
                          borderColor: layer === opt.id ? '#0ea5e9' : '#334155',
                          '&:hover': {
                            backgroundColor: layer === opt.id ? '#0284c7' : 'rgba(14, 165, 233, 0.1)',
                            borderColor: '#0ea5e9'
                          }
                        }}
                      >
                        {opt.icon} {opt.label}
                      </Button>
                    </Tooltip>
                  ))}
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content Grid: Viewer on Left, Statistics Panel on Right */}
      <Grid container spacing={3}>
        {/* Terrain Viewer (3D WebGL or 2D High-Res Raster) */}
        <Grid item xs={12} lg={8}>
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <Card sx={{ minHeight: 600, backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
              <CardContent sx={{ p: 2.5 }}>
                {/* Viewport Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TerrainIcon sx={{ color: '#0ea5e9' }} />
                    {viewMode === '3d' ? `3D Interactive Surface Mesh — ${activeSite?.name}` : `2D ${layer.toUpperCase()} Raster Heatmap — ${activeSite?.name}`}
                  </Typography>

                  {viewMode === '2d' && demData && (
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={handleZoomOut}
                        sx={{ minWidth: 36, px: 1, color: '#94a3b8', borderColor: '#334155' }}
                      >
                        <ZoomOutIcon fontSize="small" />
                      </Button>
                      <Chip
                        label={`${Math.round(zoomLevel * 100)}%`}
                        size="small"
                        sx={{ backgroundColor: '#1e293b', color: '#e2e8f0', fontWeight: 600 }}
                      />
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={handleZoomIn}
                        sx={{ minWidth: 36, px: 1, color: '#94a3b8', borderColor: '#334155' }}
                      >
                        <ZoomInIcon fontSize="small" />
                      </Button>
                    </Box>
                  )}
                </Box>

                {/* Viewport Container */}
                <Box
                  sx={{
                    width: '100%',
                    height: 540,
                    backgroundColor: '#070d1e',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    border: '1px solid #1e293b'
                  }}
                >
                  {loading && (
                    <Box sx={{ textAlign: 'center' }}>
                      <CircularProgress sx={{ color: '#0ea5e9', mb: 2 }} />
                      <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                        Processing DEM GeoTIFF & calculating slope derivatives...
                      </Typography>
                    </Box>
                  )}

                  {error && (
                    <Alert severity="error" sx={{ maxWidth: 480, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', border: '1px solid #ef4444' }}>
                      {error}
                    </Alert>
                  )}

                  {/* 3D WebGL Mesh Mode */}
                  {!loading && !error && viewMode === '3d' && demData && (
                    <Dem3DViewer
                      key={selectedDEM}
                      mesh3d={demData.mesh3d}
                      siteName={activeSite?.name}
                      onTerrainComputed={setComputedMetrics}
                    />
                  )}

                  {/* 2D Raster Map Mode */}
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
                        alt={`${selectedDEM} ${layer} map`}
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
                          <CircularProgress sx={{ color: '#0ea5e9' }} />
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

      {/* Multi-Mine DEM Comparison Modal */}
      <Dialog
        open={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#0f172a',
            color: 'white',
            border: '1px solid #334155',
            borderRadius: 2
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <CompareIcon sx={{ color: '#0ea5e9' }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Multi-Mine DEM Geomorphology Comparison
            </Typography>
          </Box>
          <IconButton onClick={() => setCompareModalOpen(false)} sx={{ color: '#94a3b8' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ py: 3 }}>
          <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2 }}>
            Select up to 3 open-pit mines to compare authentic measured elevation ranges, slope distributions, and terrain roughness derived from their DEM GeoTIFFs.
          </Typography>

          <FormControl fullWidth size="small" sx={{ mb: 3 }}>
            <InputLabel sx={{ color: '#94a3b8' }}>Select Mines to Compare (Max 3)</InputLabel>
            <Select
              multiple
              value={comparisonIds}
              onChange={handleComparisonSelectionChange}
              label="Select Mines to Compare (Max 3)"
              renderValue={(selected) => selected.map(id => demFiles.find(f => f.id === id)?.name || id).join('  |  ')}
              sx={{
                color: 'white',
                backgroundColor: '#070d1e',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#334155' }
              }}
            >
              {demFiles.map((file) => (
                <MenuItem key={file.id} value={file.id}>
                  {file.name} ({file.country}) {file.is_real_data ? '— Real' : '— Synthetic'}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {compareLoading && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress sx={{ color: '#0ea5e9', mb: 1 }} />
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                Analyzing selected DEMs...
              </Typography>
            </Box>
          )}

          {!compareLoading && comparisonData?.comparisons && (
            <Paper sx={{ backgroundColor: '#070d1e', border: '1px solid #1e293b', overflow: 'hidden' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#111c38' }}>
                    <TableCell sx={{ color: '#38bdf8', fontWeight: 700, fontSize: '0.85rem' }}>Geomorphology Metric</TableCell>
                    {comparisonData.comparisons.map((item) => (
                      <TableCell key={item.dem_id} sx={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.85rem' }}>
                        {item.source_info.name}
                        <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem' }}>
                          {item.source_info.region}, {item.source_info.country}
                        </Typography>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[
                    ['Data Source', (s, m) => m.source, ''],
                    ['Data Provenance', (s, m) => m.is_real_data ? '✅ REAL SATELLITE DEM' : '⚠️ SYNTHETIC DEM', ''],
                    ['Elevation Range', (s) => `${s.elevation_range}`, 'm'],
                    ['Min / Max Elevation', (s) => `${s.min_elevation} → ${s.max_elevation}`, 'm'],
                    ['Mean Elevation', (s) => `${s.mean_elevation}`, 'm'],
                    ['Mean Slope Angle', (s) => `${s.mean_slope_deg}`, '°'],
                    ['Maximum Slope Angle', (s) => `${s.max_slope_deg}`, '°'],
                    ['Area > 30° (Steep Highwalls)', (s) => `${s.slope_area_gt_30}`, '%'],
                    ['Area > 48° (Critical Hazard)', (s) => `${s.slope_area_gt_48}`, '%'],
                    ['Terrain Roughness (TRI)', (s) => `${s.roughness_tri}`, 'm'],
                    ['Mean Curvature', (s) => `${s.curvature}`, 'm⁻¹'],
                    ['Risk Classification', (s) => `${s.risk_level} (${s.risk_score}/100)`, ''],
                    ['Raster Resolution', (s, m) => `${m.resolution_m || '30m'}`, ''],
                    ['Total Surveyed Area', (s) => `${s.area_km2 || (s.area_m2 / 1e6).toFixed(2)}`, 'km²']
                  ].map(([label, accessor, unit], idx) => (
                    <TableRow key={idx} sx={{ '&:hover': { backgroundColor: '#0f172a' }, borderBottom: '1px solid #1e293b' }}>
                      <TableCell sx={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.8rem' }}>{label}</TableCell>
                      {comparisonData.comparisons.map((item) => (
                        <TableCell key={item.dem_id} sx={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.8rem' }}>
                          {accessor(item.statistics, item.source_info)} {unit}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}
        </DialogContent>

        <DialogActions sx={{ borderTop: '1px solid #1e293b', px: 3, py: 2 }}>
          <Button onClick={() => setCompareModalOpen(false)} sx={{ color: '#94a3b8' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default DEMAnalysis