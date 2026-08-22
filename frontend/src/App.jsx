import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import config, { apiRequest, getCurrentBackendInfo } from './config/api'
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Container, 
  Box, 
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  IconButton,
  Badge,
  Chip,
  useMediaQuery,
  useTheme,
  Button
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  PhotoCamera as CameraIcon,
  Assessment as AssessmentIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Videocam as VideocamIcon,
  Terrain as TerrainIcon
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

// Import page components
import Dashboard from './pages/Dashboard'
import Detection from './pages/Detection'
import RiskAssessment from './pages/RiskAssessment'
import Settings from './pages/Settings'
import LiveMonitoring from './pages/LiveMonitoring'
import DEMAnalysis from './pages/DEMAnalysis'

// WebSocket hook for real-time updates
import useWebSocket from './hooks/useWebSocket'

const drawerWidth = 0

function App() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [systemStatus, setSystemStatus] = useState({
    status: 'loading',
    models_loaded: {},
    active_connections: 0
  })
  
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  
  // WebSocket connection for real-time updates
  const { connectionStatus, lastMessage, currentUrl, reconnect, isConnected } = useWebSocket('/ws')
  
  // Handle drawer toggle
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }
  
  // Navigation items
  const navigationItems = [
    {
      text: 'Overview',
      icon: <DashboardIcon />,
      path: 'dashboard',
      color: 'var(--accent-primary)'
    },
    {
      text: 'Live Monitoring',
      icon: <VideocamIcon />,
      path: 'live-monitoring',
      color: 'var(--accent-primary)'
    },
    {
      text: 'Risk Map',
      icon: <TerrainIcon />,
      path: 'dem-analysis',
      color: 'var(--accent-primary)'
    },
    {
      text: 'AI Prediction',
      icon: <CameraIcon />,
      path: 'detection',
      color: 'var(--accent-primary)'
    },
    {
      text: 'Analytics',
      icon: <AssessmentIcon />,
      path: 'risk-assessment',
      color: 'var(--accent-primary)'
    },
    {
      text: 'Settings',
      icon: <SettingsIcon />,
      path: 'settings',
      color: 'var(--accent-primary)'
    }
  ]
  
  // Fetch system status
  useEffect(() => {
    const fetchSystemStatus = async () => {
      try {
        const data = await apiRequest('/api/status')
        console.log('🔄 System status received:', data)
        console.log('📊 Models loaded:', data.models_loaded)
        setSystemStatus(data)
      } catch (error) {
        console.error('Failed to fetch system status:', error)
        // Don't show toast error for status checks as they happen frequently
      }
    }
    
    fetchSystemStatus()
    const interval = setInterval(fetchSystemStatus, 30000) // Update every 30s
    
    return () => clearInterval(interval)
  }, [])
  
  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage)
        
        switch (data.type) {
          case 'risk_update':
            if (data.data.risk_level === 'HIGH') {
              toast.error(`🚨 HIGH RISK DETECTED: ${data.data.risk_score.toFixed(3)}`, {
                duration: 8000,
              })
            }
            break
            
          case 'detection_update':
            if (data.data.total_detections > 0) {
              toast.success(`🏔️ Detected ${data.data.total_detections} rocks`, {
                duration: 4000,
              })
            }
            break
            
          case 'heartbeat':
            // Connection is alive
            break
            
          default:
            console.log('Unknown message type:', data.type)
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }
  }, [lastMessage])
  
  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'operational': return 'success'
      case 'loading': return 'warning'
      case 'error': return 'error'
      default: return 'default'
    }
  }
  
  // Get connection status icon
  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'Connected':
        return <CheckCircleIcon sx={{ color: '#10b981', fontSize: 20 }} />
      case 'Connecting':
        return <WarningIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
      default:
        return <WarningIcon sx={{ color: '#ef4444', fontSize: 20 }} />
    }
  }
  
  // Drawer content
  const drawerContent = (
    <Box className="contour-bg" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 3, borderBottom: '1px solid var(--border-primary)' }}>
        <Typography variant="h6" component="div" sx={{ 
          fontWeight: 900,
          color: '#f8fafc',
          mb: 0.5,
          letterSpacing: '0.5px',
          fontFamily: 'var(--font-sans)',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          ROCKGUARD AI
        </Typography>
        <Typography variant="caption" sx={{ fontFamily: 'var(--font-mono)', color: 'text.secondary', fontSize: '0.62rem', display: 'block', mb: 1.5, letterSpacing: '1px' }}>
          MINE INTELLIGENCE
        </Typography>
        <div className="hazard-border" />
      </Box>
      
      {/* System Status */}
      <Box sx={{ p: 2, display: { xs: 'none', md: 'block' } }}>
        <Box sx={{ p: 1.5, borderRadius: '4px', border: '1px solid var(--border-primary)', backgroundColor: 'background.default' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span className="neon-dot" style={{ color: connectionStatus === 'Connected' ? 'var(--status-success)' : 'var(--status-warning)' }} />
            <Typography variant="caption" sx={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
              {connectionStatus === 'Connected' ? 'SYSTEM ONLINE' : 'SYSTEM OFFLINE'}
            </Typography>
          </Box>
        </Box>
      </Box>
      
      {/* Navigation */}
      <List sx={{ flex: 1, py: 1 }}>
        {navigationItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={currentPage === item.path}
              onClick={() => {
                setCurrentPage(item.path)
                if (isMobile) setMobileOpen(false)
              }}
              sx={{
                mx: 1,
                borderRadius: '4px',
                mb: 0.5,
                borderLeft: currentPage === item.path ? '3px solid var(--accent-primary)' : '3px solid transparent',
                backgroundColor: currentPage === item.path ? 'rgba(66, 201, 208, 0.04) !important' : 'transparent',
                transition: 'all 0.2s ease',
                '&.Mui-selected': {
                  backgroundColor: 'rgba(66, 201, 208, 0.05) !important',
                  '&:hover': {
                    backgroundColor: 'rgba(66, 201, 208, 0.08) !important',
                  }
                }
              }}
            >
              <ListItemIcon sx={{ 
                color: currentPage === item.path ? 'primary.main' : 'text.secondary',
                minWidth: 40 
              }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text}
                primaryTypographyProps={{
                  fontSize: '0.85rem',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: currentPage === item.path ? 700 : 500,
                  color: currentPage === item.path ? 'primary.main' : 'text.primary',
                  letterSpacing: '0.2px'
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      
      {/* Footer */}
      <Box sx={{ p: 2, borderTop: '1px solid #334155' }}>
        <Typography variant="caption" color="text.secondary" display="block">
          v1.0.0 • Models Ready
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {Object.values(systemStatus.models_loaded || {}).filter(Boolean).length} / {Object.keys(systemStatus.models_loaded || {}).length} models loaded
        </Typography>
      </Box>
    </Box>
  )
  
  // Render current page component
  const renderCurrentPage = () => {
    const pageProps = {
      systemStatus,
      connectionStatus,
      lastMessage,
      setCurrentPage
    }
    
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard {...pageProps} />
      case 'live-monitoring':
        return <LiveMonitoring {...pageProps} />
      case 'dem-analysis':
        return <DEMAnalysis {...pageProps} />
      case 'detection':
        return <Detection {...pageProps} />
      case 'risk-assessment':
        return <RiskAssessment {...pageProps} />
      case 'settings':
        return <Settings {...pageProps} />
      default:
        return <Dashboard {...pageProps} />
    }
  }
  
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          background: 'rgba(11, 18, 21, 0.92) !important',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border-primary)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
        }}
      >
        <Toolbar 
          disableGutters
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            px: { xs: 1.5, sm: 2, md: 3 },
            minHeight: { xs: 56, md: 64 },
            width: '100%',
            overflow: 'hidden'
          }}
        >
          {/* Brand Logo & Mobile Menu Toggle */}
          <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, mr: { xs: 1, lg: 2 } }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 1, display: { lg: 'none' }, color: 'var(--accent-primary)' }}
            >
              <MenuIcon />
            </IconButton>

            <Typography 
              noWrap 
              component="div" 
              onClick={() => setCurrentPage('dashboard')}
              sx={{ 
                fontSize: { xs: '1.05rem', sm: '1.2rem', md: '1.3rem', lg: '1.4rem' }, 
                fontWeight: 900, 
                fontFamily: 'var(--font-sans)', 
                color: '#f8fafc', 
                display: 'flex', 
                alignItems: 'center', 
                gap: { xs: 1, sm: 1.2 },
                cursor: 'pointer',
                letterSpacing: '0.5px',
                userSelect: 'none',
                flexShrink: 0
              }}
            >
              ROCKGUARD AI
              <span 
                className="neon-dot" 
                style={{ 
                  display: 'inline-block', 
                  width: 8, 
                  height: 8, 
                  borderRadius: '50%', 
                  backgroundColor: connectionStatus === 'Connected' ? 'var(--status-success)' : 'var(--status-warning)', 
                  boxShadow: `0 0 10px ${connectionStatus === 'Connected' ? 'var(--status-success)' : 'var(--status-warning)'}` 
                }} 
              />
            </Typography>
          </Box>

          {/* Centered Horizontal Navigation Tabs - Shown on Laptops & Desktops (>= 1200px / lg) */}
          <Box sx={{ 
            display: { xs: 'none', lg: 'flex' }, 
            alignItems: 'center',
            justifyContent: 'center',
            gap: { lg: 0.8, xl: 1.2 }, 
            flexShrink: 0,
            py: 0.5
          }}>
            {navigationItems.map((item) => {
              const isActive = currentPage === item.path
              return (
                <Button
                  key={item.path}
                  onClick={() => setCurrentPage(item.path)}
                  sx={{
                    color: isActive ? 'var(--accent-primary)' : 'text.secondary',
                    fontFamily: 'var(--font-mono)',
                    fontSize: { lg: '0.74rem', xl: '0.82rem' },
                    fontWeight: isActive ? 700 : 600,
                    letterSpacing: '0.2px',
                    px: { lg: 1.2, xl: 2 },
                    py: 0.6,
                    borderRadius: '4px',
                    border: isActive ? '1px solid var(--accent-primary)' : '1px solid transparent',
                    background: isActive ? 'rgba(66, 201, 208, 0.08)' : 'transparent',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    minWidth: 'auto',
                    transition: 'all 0.2s ease',
                    boxShadow: isActive ? '0 0 12px rgba(66, 201, 208, 0.15)' : 'none',
                    '&:hover': {
                      color: 'var(--accent-primary)',
                      background: 'rgba(66, 201, 208, 0.12)',
                      borderColor: isActive ? 'var(--accent-primary)' : 'rgba(66, 201, 208, 0.3)'
                    }
                  }}
                  startIcon={React.cloneElement(item.icon, { 
                    sx: { 
                      fontSize: '16px !important', 
                      color: isActive ? 'var(--accent-primary)' : 'inherit' 
                    } 
                  })}
                >
                  {item.text.toUpperCase()}
                </Button>
              )
            })}
          </Box>
          
          {/* Right Side: Coordinates & Status Badges */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5, lg: 2 }, flexShrink: 0, ml: 'auto' }}>
            {/* Full Coordinates display - Only on Ultrawide screens (>= 1536px / xl) */}
            <Box sx={{ display: { xs: 'none', xl: 'flex' }, alignItems: 'center', gap: 2, flexShrink: 0 }}>
              <Typography sx={{ fontFamily: 'var(--font-mono)', color: 'text.secondary', letterSpacing: '0.2px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                LAT: 20.3541° N | LON: 81.2847° E
              </Typography>
              <Typography sx={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                ELEV: 842m
              </Typography>
            </Box>

            {/* Micro elevation badge on Large screens (1200px - 1535px / lg) */}
            <Box sx={{ display: { xs: 'none', lg: 'flex', xl: 'none' }, alignItems: 'center', flexShrink: 0 }}>
              <Typography sx={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                ELEV: 842m
              </Typography>
            </Box>

            <IconButton color="inherit" size="small" sx={{ color: 'text.secondary', '&:hover': { color: '#fff' }, flexShrink: 0 }}>
              <Badge badgeContent={systemStatus?.active_connections || 0} color="error">
                <NotificationsIcon sx={{ fontSize: { xs: 20, sm: 22 } }} />
              </Badge>
            </IconButton>
            
            <Chip 
              label={connectionStatus}
              color={connectionStatus === 'Connected' ? 'success' : 'warning'}
              variant="outlined"
              size="small"
              sx={{ 
                borderColor: connectionStatus === 'Connected' ? 'rgba(66, 201, 208, 0.4)' : 'rgba(255, 176, 32, 0.4)',
                color: connectionStatus === 'Connected' ? 'var(--status-success)' : 'var(--status-warning)',
                fontSize: { xs: '0.68rem', sm: '0.72rem' },
                fontFamily: 'var(--font-mono)',
                fontWeight: 'bold',
                height: { xs: 24, sm: 26 },
                px: { xs: 0.5, sm: 0.8 },
                flexShrink: 0
              }}
            />
          </Box>
        </Toolbar>
      </AppBar>
      
      {/* Mobile / Tablet Drawer Navigation */}
      <Box component="nav">
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', lg: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: 260, 
              backgroundColor: 'var(--bg-secondary)', 
              borderColor: 'var(--border-primary)',
              boxShadow: '10px 0 30px rgba(0,0,0,0.8)'
            },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>
      
      {/* Main Content */}
      <Box
        component="main"
        className="geological-grid telemetry-grid-bg"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div className="scanline" />
        <Toolbar />
        <Container maxWidth="xl" sx={{ py: 3, position: 'relative', zIndex: 1 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderCurrentPage()}
            </motion.div>
          </AnimatePresence>
        </Container>
      </Box>
    </Box>
  )
}

export default App