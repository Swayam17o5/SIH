import React from 'react'
import { Box, ButtonGroup, Button } from '@mui/material'
import { ViewInAr as View3DIcon, Layers as View2DIcon } from '@mui/icons-material'

const DemViewToggle = ({ viewMode, onViewModeChange }) => {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
      <ButtonGroup
        variant="outlined"
        size="small"
        sx={{
          backgroundColor: '#0f172a',
          p: 0.5,
          borderRadius: 2,
          border: '1px solid #334155',
          '& .MuiButtonGroup-grouped': {
            border: 'none',
            borderRadius: '6px !important',
            mx: 0.25,
            px: 2,
            py: 0.75,
            fontWeight: 600,
            textTransform: 'none',
            fontSize: '0.85rem'
          }
        }}
      >
        <Button
          onClick={() => onViewModeChange('3d')}
          startIcon={<View3DIcon sx={{ fontSize: '1.1rem' }} />}
          sx={{
            backgroundColor: viewMode === '3d' ? '#3b82f6' : 'transparent',
            color: viewMode === '3d' ? '#ffffff' : '#94a3b8',
            '&:hover': {
              backgroundColor: viewMode === '3d' ? '#2563eb' : 'rgba(59, 130, 246, 0.1)',
              color: 'white'
            }
          }}
        >
          3D Interactive Mesh
        </Button>
        <Button
          onClick={() => onViewModeChange('2d')}
          startIcon={<View2DIcon sx={{ fontSize: '1.1rem' }} />}
          sx={{
            backgroundColor: viewMode === '2d' ? '#3b82f6' : 'transparent',
            color: viewMode === '2d' ? '#ffffff' : '#94a3b8',
            '&:hover': {
              backgroundColor: viewMode === '2d' ? '#2563eb' : 'rgba(59, 130, 246, 0.1)',
              color: 'white'
            }
          }}
        >
          2D Heatmap Map
        </Button>
      </ButtonGroup>
    </Box>
  )
}

export default DemViewToggle
