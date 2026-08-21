// Simplified API Configuration - environment-driven backend URLs

// Static configuration from environment variables
const config = {
  // Backend URLs (local development defaults; override via Vite env vars)
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  WS_BASE_URL: import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000',
  SSE_BASE_URL: import.meta.env.VITE_SSE_BASE_URL || 'http://localhost:8000',
  
  // Application Settings
  APP_TITLE: import.meta.env.VITE_APP_TITLE || 'Rockfall Detection System',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  ENVIRONMENT: import.meta.env.VITE_ENVIRONMENT || 'production',
  
  // Feature Flags
  ENABLE_LIVE_MONITORING: import.meta.env.VITE_ENABLE_LIVE_MONITORING === 'true',
  ENABLE_DEM_ANALYSIS: import.meta.env.VITE_ENABLE_DEM_ANALYSIS === 'true',
  ENABLE_RISK_ASSESSMENT: import.meta.env.VITE_ENABLE_RISK_ASSESSMENT === 'true',
  ENABLE_DEBUG_MODE: import.meta.env.VITE_ENABLE_DEBUG_MODE === 'true',
  
  // UI Configuration
  DEFAULT_THEME: import.meta.env.VITE_DEFAULT_THEME || 'light',
  ENABLE_DARK_MODE: import.meta.env.VITE_ENABLE_DARK_MODE === 'true',
  AUTO_REFRESH_INTERVAL: parseInt(import.meta.env.VITE_AUTO_REFRESH_INTERVAL) || 5000,
  
  // Camera Configuration
  CAMERA_REFRESH_RATE: parseInt(import.meta.env.VITE_CAMERA_REFRESH_RATE) || 30,
  ENABLE_CAMERA_CONTROLS: import.meta.env.VITE_ENABLE_CAMERA_CONTROLS === 'true',
  MAX_CAMERA_RESOLUTION: import.meta.env.VITE_MAX_CAMERA_RESOLUTION || '1920x1080',
  
  // External APIs
  MAPBOX_TOKEN: import.meta.env.VITE_MAPBOX_TOKEN,
  GOOGLE_MAPS_API_KEY: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  
  // Development Settings
  ENABLE_MOCK_DATA: import.meta.env.VITE_ENABLE_MOCK_DATA === 'true',
  API_TIMEOUT: parseInt(import.meta.env.VITE_API_TIMEOUT) || 30000,
  DEBUG_WEBSOCKET: import.meta.env.VITE_DEBUG_WEBSOCKET === 'true'
}

// Simple URL generation functions
export const getApiUrl = (endpoint) => {
  const baseUrl = config.API_BASE_URL
  return `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`
}

export const getWsUrl = (endpoint) => {
  const baseUrl = config.WS_BASE_URL
  return `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`
}

export const getSseUrl = (endpoint) => {
  const baseUrl = config.SSE_BASE_URL
  return `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`
}

// Utility functions for consistency
export const getCurrentBackendInfo = () => {
  return {
    apiUrl: config.API_BASE_URL,
    wsUrl: config.WS_BASE_URL,
    isDeployed: true,
    status: 'connected'
  }
}

// Simplified fetch wrapper with proper error handling
export const apiRequest = async (endpoint, options = {}) => {
  // Always log DEM requests for debugging
  const isDEMRequest = endpoint.includes('/dem')
  
  if (config.ENABLE_DEBUG_MODE || isDEMRequest) {
    console.log(`🌐 API Request: ${endpoint}`)
  }
  
  const url = getApiUrl(endpoint)
  
  if (config.ENABLE_DEBUG_MODE || isDEMRequest) {
    console.log(`🔗 Request URL: ${url}`)
  }
  
  try {
    const response = await fetch(url, {
      timeout: config.API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    })
    
    if (config.ENABLE_DEBUG_MODE) {
      console.log(`� Response status: ${response.status} ${response.statusText}`)
    }
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    if (config.ENABLE_DEBUG_MODE || isDEMRequest) {
      console.log(`✅ API success, data:`, data)
    }
    
    return data
  } catch (error) {
    console.error(`❌ API error for ${endpoint}:`, error)
    throw error
  }
}

export default config