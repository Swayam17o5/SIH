import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'

// Create dark theme for Material-UI
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#42c9d0',
      light: '#6fe0dd',
      dark: '#1e9b89',
    },
    secondary: {
      main: '#6fe0dd',
      light: '#a1f2ef',
      dark: '#2ba4ab',
    },
    error: {
      main: '#d84620',
      light: '#ff6f2b',
      dark: '#be123c',
    },
    warning: {
      main: '#ffb020',
      light: '#ffc760',
      dark: '#b45309',
    },
    success: {
      main: '#42c9d0',
      light: '#6fe0dd',
      dark: '#1e9b89',
    },
    background: {
      default: '#050708',
      paper: '#0b1215',
    },
    text: {
      primary: '#f8fafc',
      secondary: '#94a3b8',
    },
  },
  typography: {
    fontFamily: '"Outfit", "Inter", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 800,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h3: {
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h4: {
      fontWeight: 650,
      letterSpacing: '-0.01em',
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 4,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#0b1215',
          border: '1px solid #263338',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 4,
          fontWeight: 600,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          fontFamily: '"Space Mono", monospace',
          fontWeight: 600,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#0b1215',
          borderBottom: '1px solid #263338',
        },
      },
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#12141a',
              color: '#f8fafc',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            },
            success: {
              iconTheme: {
                primary: '#0d9488',
                secondary: '#f8fafc',
              },
            },
            error: {
              iconTheme: {
                primary: '#e11d48',
                secondary: '#f8fafc',
              },
            },
          }}
        />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)