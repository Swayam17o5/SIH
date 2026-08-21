import React, { useRef, useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'
import { Box, Typography, Slider, IconButton, Tooltip, Chip } from '@mui/material'
import {
  RestartAlt as ResetIcon,
  HelpOutline as HelpIcon,
  ThreeDRotation as RotateIcon,
  Warning as WarningIcon
} from '@mui/icons-material'
import { buildTerrainGeometry } from '../../lib/dem/buildTerrainGeometry'

const Dem3DViewer = ({ mesh3d, siteName, onTerrainComputed }) => {
  const containerRef = useRef(null)
  const [exaggeration, setExaggeration] = useState(2.0)
  const [autoRotate, setAutoRotate] = useState(true)
  const [steepInfo, setSteepInfo] = useState(null)
  const [isDragging, setIsDragging] = useState(false)

  // Internal Three.js references
  const stateRef = useRef({
    scene: null,
    camera: null,
    renderer: null,
    terrainMesh: null,
    markerMesh: null,
    animId: null,
    spherical: {
      radius: 160,
      theta: Math.PI / 4,
      phi: Math.PI / 3.2
    },
    target: new THREE.Vector3(0, 15, 0),
    isPointerDown: false,
    prevPointer: { x: 0, y: 0 },
    autoRotateSpeed: 0.003
  })

  // Update Camera position from spherical coordinates
  const updateCameraPosition = useCallback(() => {
    const { camera, spherical, target } = stateRef.current
    if (!camera) return

    spherical.phi = Math.max(0.1, Math.min(Math.PI / 2.05, spherical.phi))
    spherical.radius = Math.max(50, Math.min(350, spherical.radius))

    const x = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta)
    const y = spherical.radius * Math.cos(spherical.phi)
    const z = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta)

    camera.position.set(target.x + x, target.y + y, target.z + z)
    camera.lookAt(target)
  }, [])

  // Build or rebuild terrain mesh
  const buildMesh = useCallback((currentMesh3d, currentExaggeration) => {
    const { scene, terrainMesh, markerMesh } = stateRef.current
    if (!scene) return

    // Clean up previous terrain mesh
    if (terrainMesh) {
      if (terrainMesh.geometry) terrainMesh.geometry.dispose()
      if (terrainMesh.material) {
        if (Array.isArray(terrainMesh.material)) {
          terrainMesh.material.forEach(m => m.dispose())
        } else {
          terrainMesh.material.dispose()
        }
      }
      scene.remove(terrainMesh)
      stateRef.current.terrainMesh = null
    }

    // Clean up previous marker mesh
    if (markerMesh) {
      if (markerMesh.geometry) markerMesh.geometry.dispose()
      if (markerMesh.material) markerMesh.material.dispose()
      scene.remove(markerMesh)
      stateRef.current.markerMesh = null
    }

    if (!currentMesh3d || !currentMesh3d.elevations) return

    // Build geometry using pure function (Single source of truth for slope & terrain)
    const terrainResult = buildTerrainGeometry(currentMesh3d, {
      exaggeration: currentExaggeration,
      terrainSize: 100
    })

    const { geometry, steepPoint3D, maxSlope, minElevation, maxElevation, riskLevel } = terrainResult

    setSteepInfo(steepPoint3D)

    // Notify parent with unified terrain metrics
    if (onTerrainComputed) {
      onTerrainComputed({
        max_slope_deg: maxSlope,
        min_elevation: minElevation,
        max_elevation: maxElevation,
        elevation_range: Math.round((maxElevation - minElevation) * 10) / 10,
        risk_level: riskLevel,
        steep_point: steepPoint3D
      })
    }

    // Terrain material with vertex colors
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.75,
      metalness: 0.1,
      flatShading: false,
      side: THREE.DoubleSide
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    scene.add(mesh)
    stateRef.current.terrainMesh = mesh

    // Create Pulsing Steepest Face Hazard Ring
    if (steepPoint3D) {
      const ringGeo = new THREE.RingGeometry(2.5, 4.0, 32)
      ringGeo.rotateX(-Math.PI / 2)
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xef4444,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
      })
      const ringMesh = new THREE.Mesh(ringGeo, ringMat)
      ringMesh.position.set(steepPoint3D.x, steepPoint3D.y + 0.8, steepPoint3D.z)
      scene.add(ringMesh)
      stateRef.current.markerMesh = ringMesh
    }
  }, [onTerrainComputed])

  // Initialize Three.js scene
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth || 600
    const height = container.clientHeight || 500

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0f1d)
    scene.fog = new THREE.FogExp2(0x0a0f1d, 0.0035)

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000)
    stateRef.current.camera = camera
    stateRef.current.scene = scene

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1

    container.replaceChildren(renderer.domElement)
    stateRef.current.renderer = renderer

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65)
    scene.add(ambientLight)

    const mainSun = new THREE.DirectionalLight(0xfff7ed, 1.2)
    mainSun.position.set(80, 140, 60)
    mainSun.castShadow = true
    scene.add(mainSun)

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.45)
    fillLight.position.set(-80, 60, -80)
    scene.add(fillLight)

    buildMesh(mesh3d, exaggeration)
    updateCameraPosition()

    let clock = new THREE.Clock()
    const animate = () => {
      const delta = clock.getDelta()
      const elapsedTime = clock.getElapsedTime()

      if (autoRotate && !stateRef.current.isPointerDown) {
        stateRef.current.spherical.theta += stateRef.current.autoRotateSpeed
        updateCameraPosition()
      }

      if (stateRef.current.markerMesh) {
        const pulse = 1 + Math.sin(elapsedTime * 4) * 0.25
        stateRef.current.markerMesh.scale.set(pulse, 1, pulse)
        stateRef.current.markerMesh.material.opacity = 0.6 + Math.sin(elapsedTime * 4) * 0.35
      }

      renderer.render(scene, camera)
      stateRef.current.animId = requestAnimationFrame(animate)
    }
    animate()

    const handleResize = () => {
      if (!container || !renderer || !camera) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }

    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      if (stateRef.current.animId) {
        cancelAnimationFrame(stateRef.current.animId)
      }
      if (stateRef.current.terrainMesh) {
        if (stateRef.current.terrainMesh.geometry) stateRef.current.terrainMesh.geometry.dispose()
        if (stateRef.current.terrainMesh.material) stateRef.current.terrainMesh.material.dispose()
      }
      if (stateRef.current.markerMesh) {
        if (stateRef.current.markerMesh.geometry) stateRef.current.markerMesh.geometry.dispose()
        if (stateRef.current.markerMesh.material) stateRef.current.markerMesh.material.dispose()
      }
      if (renderer) {
        renderer.dispose()
        if (renderer.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement)
        }
      }
    }
  }, []) // Mount once

  // Rebuild mesh whenever mesh3d, siteName, or exaggeration changes
  useEffect(() => {
    buildMesh(mesh3d, exaggeration)
  }, [mesh3d, siteName, exaggeration, buildMesh])

  // Custom pointer orbit controls
  const handlePointerDown = (e) => {
    stateRef.current.isPointerDown = true
    stateRef.current.prevPointer = { x: e.clientX, y: e.clientY }
    setIsDragging(true)
  }

  const handlePointerMove = (e) => {
    if (!stateRef.current.isPointerDown) return

    const deltaX = e.clientX - stateRef.current.prevPointer.x
    const deltaY = e.clientY - stateRef.current.prevPointer.y

    stateRef.current.prevPointer = { x: e.clientX, y: e.clientY }

    const rotSpeed = 0.007
    stateRef.current.spherical.theta -= deltaX * rotSpeed
    stateRef.current.spherical.phi -= deltaY * rotSpeed

    updateCameraPosition()
  }

  const handlePointerUp = () => {
    stateRef.current.isPointerDown = false
    setIsDragging(false)
  }

  const handleWheel = (e) => {
    e.preventDefault()
    const zoomSpeed = 0.08
    stateRef.current.spherical.radius += e.deltaY * zoomSpeed
    updateCameraPosition()
  }

  const handleResetCamera = () => {
    stateRef.current.spherical = {
      radius: 160,
      theta: Math.PI / 4,
      phi: Math.PI / 3.2
    }
    updateCameraPosition()
  }

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 520,
        backgroundColor: '#0a0f1d',
        borderRadius: 2,
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none'
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
    >
      <Box ref={containerRef} sx={{ width: '100%', height: '100%', minHeight: 520 }} />

      {/* Steep Face Hazard Badge Overlay */}
      {steepInfo && (
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: 2,
            p: 1.5,
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            pointerEvents: 'auto'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <WarningIcon sx={{ color: '#ef4444', fontSize: '1.2rem' }} />
            <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 700 }}>
              Critical Slope Detected
            </Typography>
            <Chip
              label={`${steepInfo.slopeDeg}°`}
              size="small"
              sx={{
                backgroundColor: steepInfo.slopeDeg >= 45 ? '#ef4444' : steepInfo.slopeDeg >= 30 ? '#f97316' : '#eab308',
                color: 'white',
                fontWeight: 700,
                height: 22
              }}
            />
          </Box>
          <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
            Elevation: <strong style={{ color: 'white' }}>{steepInfo.elevation}m</strong> | Highlighted by red pulsing ring
          </Typography>
        </Box>
      )}

      {/* Top Right Controls: Auto-Rotate & Reset */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          display: 'flex',
          gap: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(6px)',
          borderRadius: 2,
          p: 0.5,
          border: '1px solid #334155',
          pointerEvents: 'auto'
        }}
      >
        <Tooltip title={autoRotate ? 'Pause Rotation' : 'Auto-Rotate'}>
          <IconButton
            size="small"
            onClick={() => setAutoRotate(prev => !prev)}
            sx={{
              color: autoRotate ? '#3b82f6' : '#94a3b8',
              backgroundColor: autoRotate ? 'rgba(59, 130, 246, 0.15)' : 'transparent'
            }}
          >
            <RotateIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Reset View Angle">
          <IconButton size="small" onClick={handleResetCamera} sx={{ color: '#94a3b8' }}>
            <ResetIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Bottom Floating Bar: Vertical Exaggeration Slider */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: 520,
          backgroundColor: 'rgba(15, 23, 42, 0.90)',
          backdropFilter: 'blur(8px)',
          border: '1px solid #334155',
          borderRadius: 3,
          px: 2.5,
          py: 1.2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
          pointerEvents: 'auto'
        }}
      >
        <Typography variant="caption" sx={{ color: '#cbd5e1', fontWeight: 600, minWidth: 100 }}>
          Relief: {exaggeration.toFixed(1)}x
        </Typography>

        <Slider
          size="small"
          min={1.0}
          max={3.5}
          step={0.1}
          value={exaggeration}
          onChange={(e, val) => setExaggeration(val)}
          sx={{
            color: '#3b82f6',
            '& .MuiSlider-thumb': {
              boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)'
            }
          }}
        />

        <Tooltip title="Drag with mouse to rotate orbit. Scroll to zoom in/out.">
          <Box sx={{ display: 'flex', alignItems: 'center', color: '#64748b', cursor: 'help' }}>
            <HelpIcon fontSize="small" />
          </Box>
        </Tooltip>
      </Box>
    </Box>
  )
}

export default Dem3DViewer
