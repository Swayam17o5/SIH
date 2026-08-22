import React, { useState } from 'react'
import { apiRequest } from '../config/api'
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Paper,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  LinearProgress
} from '@mui/material'
import {
  Assessment as AssessmentIcon,
  Terrain as TerrainIcon,
  WaterDrop as WaterIcon,
  Air as WindIcon,
  Thermostat as TempIcon,
  Speed as SpeedIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon
} from '@mui/icons-material'
import { motion } from 'framer-motion'

const RiskAssessment = () => {
  const [formData, setFormData] = useState({
    slope: 30,
    elevation: 1000,
    fracture_density: 2.5,
    roughness: 0.5,
    slope_variability: 0.3,
    instability_index: 0.4,
    wetness_index: 0.2,
    month: new Date().getMonth() + 1,
    day_of_year: Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000),
    season: Math.floor((new Date().getMonth()) / 3),
    rainfall: 50,
    temperature: 20,
    temperature_variation: 5,
    freeze_thaw_cycles: 10,
    seismic_activity: 2,
    wind_speed: 10,
    precipitation_intensity: 5,
    humidity: 60,
    risk_score: 0.0
  })
  
  const [riskResults, setRiskResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [assessmentHistory, setAssessmentHistory] = useState([])
  
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }
  
  const handleAssessment = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const results = await apiRequest('/api/predict-risk', {
        method: 'POST',
        body: JSON.stringify(formData),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      setRiskResults(results)
      
      // Add to history
      const newAssessment = {
        id: Date.now(),
        timestamp: new Date().toLocaleString(),
        risk_level: results.risk_level,
        risk_score: results.risk_score,
        confidence: results.confidence,
        recommendations: results.recommendations,
        data: formData
      }
      
      setAssessmentHistory(prev => [newAssessment, ...prev.slice(0, 9)]) // Keep last 10
      
    } catch (err) {
      setError('Failed to assess risk. Please check your input values and try again.')
      console.error('Risk assessment error:', err)
    } finally {
      setLoading(false)
    }
  }
  
  const getRiskColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'low': return 'var(--status-success)'
      case 'medium': return 'var(--status-warning)'
      case 'high': return 'var(--status-danger)'
      case 'critical': return 'var(--status-danger)'
      default: return 'text.secondary'
    }
  }
  
  const getRiskIcon = (level) => {
    switch (level?.toLowerCase()) {
      case 'low': return <CheckIcon color="success" />
      case 'medium': return <WarningIcon color="warning" />
      case 'high': return <ErrorIcon color="error" />
      case 'critical': return <ErrorIcon color="error" />
      default: return <AssessmentIcon sx={{ color: 'text.secondary' }} />
    }
  }
  
  const resetForm = () => {
    setFormData({
      slope: 30,
      elevation: 1000,
      fracture_density: 2.5,
      roughness: 0.5,
      slope_variability: 0.3,
      instability_index: 0.4,
      wetness_index: 0.2,
      month: new Date().getMonth() + 1,
      day_of_year: Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000),
      season: Math.floor((new Date().getMonth()) / 3),
      rainfall: 50,
      temperature: 20,
      temperature_variation: 5,
      freeze_thaw_cycles: 10,
      seismic_activity: 2,
      wind_speed: 10,
      precipitation_intensity: 5,
      humidity: 60,
      risk_score: 0.0
    })
    setRiskResults(null)
    setError(null)
  }
  
  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
          Risk Assessment
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Evaluate environmental conditions to predict rockfall risk probability
        </Typography>
      </Box>
      
      <Grid container spacing={3}>
        {/* Input Form */}
        <Grid item xs={12} lg={8}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="glass-card">
              <CardContent>
                <Typography variant="h6" component="div" sx={{ mb: 3 }}>
                  Environmental Parameters
                </Typography>
                
                <Grid container spacing={3}>
                  {/* Geological Factors */}
                  <Grid item xs={12}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <TerrainIcon sx={{ mr: 1, color: 'secondary.main' }} />
                        Geological Factors
                      </Typography>
                      <Divider sx={{ borderColor: 'var(--border-primary)' }} />
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography gutterBottom>
                      Slope: {formData.slope}°
                    </Typography>
                    <Slider
                      value={formData.slope}
                      onChange={(e, value) => handleInputChange('slope', value)}
                      min={0}
                      max={90}
                      valueLabelDisplay="auto"
                      color="primary"
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography gutterBottom>
                      Elevation: {formData.elevation}m
                    </Typography>
                    <Slider
                      value={formData.elevation}
                      onChange={(e, value) => handleInputChange('elevation', value)}
                      min={0}
                      max={5000}
                      valueLabelDisplay="auto"
                      color="primary"
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Fracture Density (per m²)"
                      type="number"
                      value={formData.fracture_density}
                      onChange={(e) => handleInputChange('fracture_density', parseFloat(e.target.value) || 0)}
                      inputProps={{ step: 0.1, min: 0, max: 10 }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography gutterBottom>
                      Surface Roughness: {formData.roughness}
                    </Typography>
                    <Slider
                      value={formData.roughness}
                      onChange={(e, value) => handleInputChange('roughness', value)}
                      min={0}
                      max={1}
                      step={0.1}
                      valueLabelDisplay="auto"
                      color="primary"
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography gutterBottom>
                      Slope Variability: {formData.slope_variability}
                    </Typography>
                    <Slider
                      value={formData.slope_variability}
                      onChange={(e, value) => handleInputChange('slope_variability', value)}
                      min={0}
                      max={1}
                      step={0.1}
                      valueLabelDisplay="auto"
                      color="primary"
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography gutterBottom>
                      Instability Index: {formData.instability_index}
                    </Typography>
                    <Slider
                      value={formData.instability_index}
                      onChange={(e, value) => handleInputChange('instability_index', value)}
                      min={0}
                      max={1}
                      step={0.1}
                      valueLabelDisplay="auto"
                      color="primary"
                    />
                  </Grid>
                  
                  {/* Environmental Factors */}
                  <Grid item xs={12}>
                    <Box sx={{ mb: 2, mt: 3 }}>
                      <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <WaterIcon sx={{ mr: 1, color: 'secondary.main' }} />
                        Meteorological Factors
                      </Typography>
                      <Divider sx={{ borderColor: 'var(--border-primary)' }} />
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Rainfall (mm)"
                      type="number"
                      value={formData.rainfall}
                      onChange={(e) => handleInputChange('rainfall', parseFloat(e.target.value) || 0)}
                      inputProps={{ min: 0, max: 500 }}
                      InputProps={{
                        endAdornment: <WaterIcon color="secondary" />
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Temperature (°C)"
                      type="number"
                      value={formData.temperature}
                      onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value) || 0)}
                      inputProps={{ min: -50, max: 50 }}
                      InputProps={{
                        endAdornment: <TempIcon color="warning" />
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Temperature Variation (°C)"
                      type="number"
                      value={formData.temperature_variation}
                      onChange={(e) => handleInputChange('temperature_variation', parseFloat(e.target.value) || 0)}
                      inputProps={{ min: 0, max: 50 }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Humidity (%)"
                      type="number"
                      value={formData.humidity}
                      onChange={(e) => handleInputChange('humidity', parseFloat(e.target.value) || 0)}
                      inputProps={{ min: 0, max: 100 }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography gutterBottom>
                      Wetness Index: {formData.wetness_index}
                    </Typography>
                    <Slider
                      value={formData.wetness_index}
                      onChange={(e, value) => handleInputChange('wetness_index', value)}
                      min={0}
                      max={1}
                      step={0.1}
                      valueLabelDisplay="auto"
                      color="secondary"
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Precipitation Intensity (mm/h)"
                      type="number"
                      value={formData.precipitation_intensity}
                      onChange={(e) => handleInputChange('precipitation_intensity', parseFloat(e.target.value) || 0)}
                      inputProps={{ min: 0, max: 100 }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Freeze-Thaw Cycles"
                      type="number"
                      value={formData.freeze_thaw_cycles}
                      onChange={(e) => handleInputChange('freeze_thaw_cycles', parseFloat(e.target.value) || 0)}
                      inputProps={{ min: 0, max: 50 }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Wind Speed (km/h)"
                      type="number"
                      value={formData.wind_speed}
                      onChange={(e) => handleInputChange('wind_speed', parseFloat(e.target.value) || 0)}
                      inputProps={{ min: 0, max: 200 }}
                      InputProps={{
                        endAdornment: <WindIcon color="action" />
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Seismic Activity (Magnitude)"
                      type="number"
                      value={formData.seismic_activity}
                      onChange={(e) => handleInputChange('seismic_activity', parseFloat(e.target.value) || 0)}
                      inputProps={{ min: 0, max: 10, step: 0.1 }}
                    />
                  </Grid>
                  
                  {/* Temporal Factors */}
                  <Grid item xs={12}>
                    <Box sx={{ mb: 2, mt: 3 }}>
                      <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <SpeedIcon sx={{ mr: 1, color: 'secondary.main' }} />
                        Triggering Factors
                      </Typography>
                      <Divider sx={{ borderColor: 'var(--border-primary)' }} />
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Month"
                      type="number"
                      value={formData.month}
                      onChange={(e) => handleInputChange('month', parseFloat(e.target.value) || 1)}
                      inputProps={{ min: 1, max: 12 }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Day of Year"
                      type="number"
                      value={formData.day_of_year}
                      onChange={(e) => handleInputChange('day_of_year', parseFloat(e.target.value) || 1)}
                      inputProps={{ min: 1, max: 366 }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>Season</InputLabel>
                      <Select
                        value={formData.season}
                        onChange={(e) => handleInputChange('season', e.target.value)}
                        label="Season"
                      >
                        <MenuItem value={0}>Spring</MenuItem>
                        <MenuItem value={1}>Summer</MenuItem>
                        <MenuItem value={2}>Autumn</MenuItem>
                        <MenuItem value={3}>Winter</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  {/* Action Buttons */}
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                      <Button
                        variant="contained"
                        onClick={handleAssessment}
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={20} /> : <AssessmentIcon />}
                        sx={{ flex: 1 }}
                      >
                        {loading ? 'Assessing...' : 'Assess Risk'}
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={resetForm}
                        disabled={loading}
                      >
                        Reset
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
                
                {/* Error Display */}
                {error && (
                  <Alert severity="error" sx={{ mt: 3 }}>
                    {error}
                  </Alert>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
        
        {/* Results Section */}
        <Grid item xs={12} lg={4}>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="glass-card" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" component="div" sx={{ mb: 3 }}>
                  Risk Assessment Results
                </Typography>
                
                {riskResults ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    {/* Risk Level */}
                    <Paper 
                      sx={{ 
                        p: 3, 
                        textAlign: 'center', 
                        mb: 3,
                        backgroundColor: `${getRiskColor(riskResults.risk_level)}20`,
                        border: `2px solid ${getRiskColor(riskResults.risk_level)}`
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                        {getRiskIcon(riskResults.risk_level)}
                      </Box>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: getRiskColor(riskResults.risk_level), mb: 1 }}>
                        {riskResults.risk_level?.toUpperCase()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Risk Level
                      </Typography>
                    </Paper>
                    
                    {/* Probability and Confidence */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                      <Grid item xs={6}>
                        <Paper sx={{ p: 2, textAlign: 'center', border: '1px solid var(--border-primary)', backgroundColor: 'background.default' }}>
                          <Typography variant="h5" sx={{ fontWeight: 600, color: 'primary.main', fontFamily: 'var(--font-mono)' }}>
                            {(riskResults.risk_score * 100).toFixed(1)}%
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Probability
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6}>
                        <Paper sx={{ p: 2, textAlign: 'center', border: '1px solid var(--border-primary)', backgroundColor: 'background.default' }}>
                          <Typography variant="h5" sx={{ fontWeight: 600, color: 'success.main', fontFamily: 'var(--font-mono)' }}>
                            {(riskResults.confidence * 100).toFixed(1)}%
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Confidence
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                    
                    {/* Contributing Factors */}
                    {riskResults.contributing_factors && riskResults.contributing_factors.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" sx={{ mb: 2 }}>
                          Key Risk Factors:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {riskResults.contributing_factors.map((factor, index) => (
                            <Chip
                              key={index}
                              label={factor.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              size="small"
                              sx={{
                                backgroundColor: getRiskColor(riskResults.risk_level),
                                color: 'white'
                              }}
                            />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </motion.div>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <AssessmentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="body1" color="text.secondary">
                      Configure parameters and click "Assess Risk" to see results
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
        
        {/* Assessment History */}
        {assessmentHistory.length > 0 && (
          <Grid item xs={12}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="glass-card">
                <CardContent>
                  <Typography variant="h6" component="div" sx={{ mb: 3 }}>
                    Assessment History
                  </Typography>
                  
                  <List>
                    {assessmentHistory.map((assessment, index) => (
                      <React.Fragment key={assessment.id}>
                        <ListItem>
                          <ListItemIcon>
                            {getRiskIcon(assessment.risk_level)}
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography variant="subtitle1">
                                  {assessment.risk_level?.toUpperCase()} Risk
                                </Typography>
                                <Chip
                                  label={`${(assessment.risk_score * 100).toFixed(1)}%`}
                                  size="small"
                                  sx={{
                                    backgroundColor: getRiskColor(assessment.risk_level),
                                    color: 'white'
                                  }}
                                />
                              </Box>
                            }
                            secondary={
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                  {assessment.timestamp}
                                </Typography>
                                <LinearProgress
                                  variant="determinate"
                                  value={assessment.confidence * 100}
                                  sx={{ mt: 1, height: 4, borderRadius: 2 }}
                                />
                                <Typography variant="caption" color="text.secondary">
                                  Confidence: {(assessment.confidence * 100).toFixed(1)}%
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < assessmentHistory.length - 1 && (
                          <Divider variant="inset" component="li" sx={{ borderColor: '#334155' }} />
                        )}
                      </React.Fragment>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        )}
      </Grid>
    </Box>
  )
}

export default RiskAssessment