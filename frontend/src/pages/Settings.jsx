import React, { useState, useEffect } from 'react'
import { apiRequest } from '../config/api'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Paper,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar
} from '@mui/material'
import {
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Update as UpdateIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  RestartAlt as RestartIcon,
  DeleteForever as DeleteIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon
} from '@mui/icons-material'
import { motion } from 'framer-motion'

const Settings = () => {
  const [settings, setSettings] = useState({
    notifications: {
      email_alerts: true,
      sound_alerts: false,
      desktop_notifications: true,
      risk_threshold: 0.7,
      detection_alerts: true
    },
    detection: {
      confidence_threshold: 0.5,
      max_detections: 100,
      auto_save_results: true,
      image_preprocessing: true,
      batch_processing: false
    },
    system: {
      auto_backup: true,
      backup_interval: 24,
      max_storage_gb: 50,
      log_level: 'INFO',
      api_rate_limit: 100
    },
    models: {
      auto_update: false,
      cache_predictions: true,
      gpu_acceleration: true,
      model_version: 'v1.0'
    }
  })
  
  const [systemInfo, setSystemInfo] = useState({
    version: '1.0.0',
    uptime: '2 days, 14 hours',
    memory_usage: 65,
    storage_usage: 32,
    last_backup: '2024-01-15 10:30:00',
    model_status: {
      yolo: 'loaded',
      risk_prediction: 'loaded',
      preprocessing: 'loaded'
    }
  })
  
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogType, setDialogType] = useState('')
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  
  useEffect(() => {
    loadSettings()
    loadSystemInfo()
  }, [])
  
  const loadSettings = async () => {
    try {
      // In a real app, this would fetch from the backend using apiRequest
      // const response = await apiRequest('/api/settings')
      // setSettings(response)
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }
  
  const loadSystemInfo = async () => {
    try {
      const data = await apiRequest('/api/status')
      setSystemInfo(prev => ({
        ...prev,
        model_status: data.models_loaded,
        memory_usage: Math.random() * 100, // Mock data
        storage_usage: Math.random() * 100
      }))
    } catch (error) {
      console.error('Failed to load system info:', error)
    }
  }
  
  const handleSettingChange = (category, setting, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: value
      }
    }))
  }
  
  const saveSettings = async () => {
    setLoading(true)
    try {
      // In a real app, this would save to the backend using apiRequest
      // await apiRequest('/api/settings', { method: 'POST', body: JSON.stringify(settings) })
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setMessage('Settings saved successfully!')
      setMessageType('success')
      setSnackbarOpen(true)
    } catch (error) {
      setMessage('Failed to save settings. Please try again.')
      setMessageType('error')
      setSnackbarOpen(true)
    } finally {
      setLoading(false)
    }
  }
  
  const handleSystemAction = async (action) => {
    setLoading(true)
    setDialogOpen(false)
    
    try {
      switch (action) {
        case 'restart':
          setMessage('System restart initiated...')
          break
        case 'backup':
          setMessage('Backup started...')
          break
        case 'clear_cache':
          setMessage('Cache cleared successfully!')
          break
        case 'update_models':
          setMessage('Model update started...')
          break
        default:
          setMessage('Action completed')
      }
      
      setMessageType('success')
      setSnackbarOpen(true)
      
      // Simulate system action
      await new Promise(resolve => setTimeout(resolve, 2000))
      
    } catch (error) {
      setMessage('Action failed. Please try again.')
      setMessageType('error')
      setSnackbarOpen(true)
    } finally {
      setLoading(false)
    }
  }
  
  const openDialog = (type) => {
    setDialogType(type)
    setDialogOpen(true)
  }
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'loaded': return 'var(--status-success)'
      case 'loading': return 'var(--status-warning)'
      case 'error': return 'var(--status-danger)'
      default: return 'text.secondary'
    }
  }
  
  const getStatusIcon = (status) => {
    switch (status) {
      case 'loaded': return <CheckIcon color="success" />
      case 'loading': return <UpdateIcon color="warning" />
      case 'error': return <ErrorIcon color="error" />
      default: return <MemoryIcon color="action" />
    }
  }
  
  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
          System Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Configure system parameters, notifications, and model settings
        </Typography>
      </Box>
      
      <Grid container spacing={3}>
        {/* System Information */}
        <Grid item xs={12} lg={4}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="glass-card" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" component="div" sx={{ mb: 3 }}>
                  System Information
                </Typography>
                
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Version"
                      secondary={systemInfo.version}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Uptime"
                      secondary={systemInfo.uptime}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Memory Usage"
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">{systemInfo.memory_usage.toFixed(1)}%</Typography>
                          </Box>
                          <Box sx={{ 
                            width: '100%', 
                            height: 8, 
                            backgroundColor: 'var(--border-primary)', 
                            borderRadius: 4,
                            overflow: 'hidden'
                          }}>
                            <Box sx={{ 
                              width: `${systemInfo.memory_usage}%`, 
                              height: '100%', 
                              backgroundColor: systemInfo.memory_usage > 80 ? 'error.main' : 'primary.main',
                              transition: 'width 0.3s ease'
                            }} />
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Storage Usage"
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">{systemInfo.storage_usage.toFixed(1)}%</Typography>
                          </Box>
                          <Box sx={{ 
                            width: '100%', 
                            height: 8, 
                            backgroundColor: 'var(--border-primary)', 
                            borderRadius: 4,
                            overflow: 'hidden'
                          }}>
                            <Box sx={{ 
                              width: `${systemInfo.storage_usage}%`, 
                              height: '100%', 
                              backgroundColor: systemInfo.storage_usage > 80 ? 'error.main' : 'success.main',
                              transition: 'width 0.3s ease'
                            }} />
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
            
            {/* Model Status */}
            <Card className="glass-card">
              <CardContent>
                <Typography variant="h6" component="div" sx={{ mb: 3 }}>
                  Model Status
                </Typography>
                
                <List>
                  {Object.entries(systemInfo.model_status).map(([model, status]) => (
                    <ListItem key={model}>
                      <ListItemIcon>
                        {getStatusIcon(status)}
                      </ListItemIcon>
                      <ListItemText
                        primary={model.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        secondary={status}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
        
        {/* Settings Configuration */}
        <Grid item xs={12} lg={8}>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            {/* Notification Settings */}
            <Card className="glass-card" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" component="div" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
                  <NotificationsIcon sx={{ mr: 1, color: 'primary.main' }} />
                  Notification Settings
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.notifications.email_alerts}
                          onChange={(e) => handleSettingChange('notifications', 'email_alerts', e.target.checked)}
                        />
                      }
                      label="Email Alerts"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.notifications.sound_alerts}
                          onChange={(e) => handleSettingChange('notifications', 'sound_alerts', e.target.checked)}
                        />
                      }
                      label="Sound Alerts"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.notifications.desktop_notifications}
                          onChange={(e) => handleSettingChange('notifications', 'desktop_notifications', e.target.checked)}
                        />
                      }
                      label="Desktop Notifications"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.notifications.detection_alerts}
                          onChange={(e) => handleSettingChange('notifications', 'detection_alerts', e.target.checked)}
                        />
                      }
                      label="Detection Alerts"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography gutterBottom>
                      Risk Threshold for Alerts: {(settings.notifications.risk_threshold * 100).toFixed(0)}%
                    </Typography>
                    <Slider
                      value={settings.notifications.risk_threshold}
                      onChange={(e, value) => handleSettingChange('notifications', 'risk_threshold', value)}
                      min={0}
                      max={1}
                      step={0.1}
                      valueLabelDisplay="auto"
                      valueLabelFormat={(value) => `${(value * 100).toFixed(0)}%`}
                      color="primary"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
            
            {/* Detection Settings */}
            <Card className="glass-card" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" component="div" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
                  <SecurityIcon sx={{ mr: 1, color: 'secondary.main' }} />
                  Detection Settings
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Typography gutterBottom>
                      Confidence Threshold: {(settings.detection.confidence_threshold * 100).toFixed(0)}%
                    </Typography>
                    <Slider
                      value={settings.detection.confidence_threshold}
                      onChange={(e, value) => handleSettingChange('detection', 'confidence_threshold', value)}
                      min={0}
                      max={1}
                      step={0.05}
                      valueLabelDisplay="auto"
                      valueLabelFormat={(value) => `${(value * 100).toFixed(0)}%`}
                      color="secondary"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Max Detections per Image"
                      type="number"
                      value={settings.detection.max_detections}
                      onChange={(e) => handleSettingChange('detection', 'max_detections', parseInt(e.target.value) || 0)}
                      inputProps={{ min: 1, max: 1000 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.detection.auto_save_results}
                          onChange={(e) => handleSettingChange('detection', 'auto_save_results', e.target.checked)}
                        />
                      }
                      label="Auto-save Results"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.detection.image_preprocessing}
                          onChange={(e) => handleSettingChange('detection', 'image_preprocessing', e.target.checked)}
                        />
                      }
                      label="Image Preprocessing"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
            
            {/* System Settings */}
            <Card className="glass-card" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" component="div" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
                  <MemoryIcon sx={{ mr: 1, color: 'success.main' }} />
                  System Settings
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.system.auto_backup}
                          onChange={(e) => handleSettingChange('system', 'auto_backup', e.target.checked)}
                        />
                      }
                      label="Auto Backup"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Backup Interval (hours)"
                      type="number"
                      value={settings.system.backup_interval}
                      onChange={(e) => handleSettingChange('system', 'backup_interval', parseInt(e.target.value) || 0)}
                      inputProps={{ min: 1, max: 168 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Max Storage (GB)"
                      type="number"
                      value={settings.system.max_storage_gb}
                      onChange={(e) => handleSettingChange('system', 'max_storage_gb', parseInt(e.target.value) || 0)}
                      inputProps={{ min: 1, max: 1000 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Log Level</InputLabel>
                      <Select
                        value={settings.system.log_level}
                        onChange={(e) => handleSettingChange('system', 'log_level', e.target.value)}
                        label="Log Level"
                      >
                        <MenuItem value="DEBUG">Debug</MenuItem>
                        <MenuItem value="INFO">Info</MenuItem>
                        <MenuItem value="WARNING">Warning</MenuItem>
                        <MenuItem value="ERROR">Error</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
            
            {/* Action Buttons */}
            <Card className="glass-card">
              <CardContent>
                <Typography variant="h6" component="div" sx={{ mb: 3 }}>
                  System Actions
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={saveSettings}
                      disabled={loading}
                      startIcon={<DownloadIcon />}
                      sx={{ mb: 2 }}
                    >
                      Save Settings
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => openDialog('backup')}
                      startIcon={<StorageIcon />}
                      sx={{ mb: 2 }}
                    >
                      Create Backup
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => openDialog('clear_cache')}
                      startIcon={<DeleteIcon />}
                      sx={{ mb: 2 }}
                    >
                      Clear Cache
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Button
                      fullWidth
                      variant="outlined"
                      color="warning"
                      onClick={() => openDialog('restart')}
                      startIcon={<RestartIcon />}
                      sx={{ mb: 2 }}
                    >
                      Restart System
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>
      
      {/* Confirmation Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>
          Confirm Action
        </DialogTitle>
        <DialogContent>
          <Typography>
            {dialogType === 'restart' && 'Are you sure you want to restart the system? This will temporarily interrupt all operations.'}
            {dialogType === 'backup' && 'Create a system backup now? This may take several minutes.'}
            {dialogType === 'clear_cache' && 'Clear all cached data? This will free up storage space but may slow down initial operations.'}
            {dialogType === 'update_models' && 'Update all models to the latest versions? This may take some time.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={() => handleSystemAction(dialogType)} 
            variant="contained"
            color={dialogType === 'restart' ? 'warning' : 'primary'}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={messageType}
          sx={{ width: '100%' }}
        >
          {message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default Settings