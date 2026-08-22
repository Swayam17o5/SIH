import * as THREE from 'three'

/**
 * Pure function to build 3D terrain geometry from DEM grid data with unified scientific geomorphic metrics
 * @param {Object} mesh3d - { width, height, cellSizeMeters, elevations, slopes, steepPoint }
 * @param {Object} options - { exaggeration: number, terrainSize: number }
 * @returns {Object} { geometry, steepPoint3D, maxSlope, meanSlope, medianSlope, stdSlope, slopeAreaGt30, slopeAreaGt40, slopeAreaGt48, minElevation, maxElevation, meanElevation, stdElevation, elevationRange, roughness, curvature, riskScore, riskLevel }
 */
export function buildTerrainGeometry(mesh3d, options = {}) {
  const { exaggeration = 2.0, terrainSize = 100 } = options

  if (!mesh3d || !mesh3d.elevations || !mesh3d.elevations.length) {
    return {
      geometry: new THREE.PlaneGeometry(terrainSize, terrainSize, 10, 10),
      steepPoint3D: { x: 0, y: 0, z: 0, slopeDeg: 0, elevation: 0, row: 0, col: 0 },
      maxSlope: 0,
      meanSlope: 0,
      medianSlope: 0,
      stdSlope: 0,
      slopeAreaGt30: 0,
      slopeAreaGt40: 0,
      slopeAreaGt48: 0,
      minElevation: 0,
      maxElevation: 0,
      meanElevation: 0,
      stdElevation: 0,
      elevationRange: 0,
      roughness: 0,
      curvature: 0,
      riskScore: 0,
      riskLevel: 'Low'
    }
  }

  const elevations = mesh3d.elevations
  const gridY = elevations.length // rows
  const gridX = elevations[0].length // cols
  const cellSize = Math.max(5.0, mesh3d.cellSizeMeters || 20.0)

  // 1. Elevation Statistics
  let minElev = Infinity
  let maxElev = -Infinity
  let sumElev = 0
  const totalCells = gridY * gridX

  for (let r = 0; r < gridY; r++) {
    for (let c = 0; c < gridX; c++) {
      const v = elevations[r][c]
      if (v < minElev) minElev = v
      if (v > maxElev) maxElev = v
      sumElev += v
    }
  }

  const meanElev = sumElev / totalCells
  let sumSqDiff = 0
  for (let r = 0; r < gridY; r++) {
    for (let c = 0; c < gridX; c++) {
      sumSqDiff += (elevations[r][c] - meanElev) ** 2
    }
  }
  const stdElev = Math.sqrt(sumSqDiff / totalCells)
  const elevRange = Math.max(1, maxElev - minElev)
  const baseRelief = terrainSize * 0.22

  // 2. Create PlaneGeometry on XZ plane
  const geometry = new THREE.PlaneGeometry(terrainSize, terrainSize, gridX - 1, gridY - 1)
  geometry.rotateX(-Math.PI / 2)

  const positions = geometry.attributes.position.array
  const vertexCount = positions.length / 3
  const colors = new Float32Array(vertexCount * 3)

  // 3. Compute per-vertex spatial finite-difference slopes, curvature, and TRI roughness
  let detectedMaxSlope = 0
  let steepestVertexIndex = 0
  const slopeArray = new Float64Array(vertexCount)
  let sumSlope = 0
  let countGt30 = 0
  let countGt40 = 0
  let countGt48 = 0
  let sumLaplacian = 0
  let sumTRI = 0

  for (let r = 0; r < gridY; r++) {
    for (let c = 0; c < gridX; c++) {
      const idx = r * gridX + c
      const elev = elevations[r][c]

      // Three.js vertex Y position
      const normalizedElev = (elev - minElev) / elevRange
      positions[idx * 3 + 1] = normalizedElev * baseRelief * exaggeration

      // Central difference gradient
      const rPrev = Math.max(0, r - 1)
      const rNext = Math.min(gridY - 1, r + 1)
      const cPrev = Math.max(0, c - 1)
      const cNext = Math.min(gridX - 1, c + 1)

      const distCols = (cNext - cPrev) * cellSize || cellSize
      const distRows = (rNext - rPrev) * cellSize || cellSize

      const dz_dx = (elevations[r][cNext] - elevations[r][cPrev]) / distCols
      const dz_dy = (elevations[rNext][c] - elevations[rPrev][c]) / distRows

      const gradMag = Math.sqrt(dz_dx * dz_dx + dz_dy * dz_dy)
      const slopeDeg = Math.atan(gradMag) * (180 / Math.PI)
      slopeArray[idx] = slopeDeg
      sumSlope += slopeDeg

      if (slopeDeg > 30.0) countGt30++
      if (slopeDeg > 40.0) countGt40++
      if (slopeDeg > 48.0) countGt48++

      if (slopeDeg > detectedMaxSlope) {
        detectedMaxSlope = slopeDeg
        steepestVertexIndex = idx
      }

      // Laplacian Curvature (d2z/dx2 + d2z/dy2)
      const d2z_dx2 = (elevations[r][cNext] - 2 * elev + elevations[r][cPrev]) / (cellSize * cellSize)
      const d2z_dy2 = (elevations[rNext][c] - 2 * elev + elevations[rPrev][c]) / (cellSize * cellSize)
      sumLaplacian += Math.abs(d2z_dx2 + d2z_dy2)

      // Local 3x3 Mean & TRI (Terrain Ruggedness Index)
      let localSum = 0
      let localCount = 0
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = Math.max(0, Math.min(gridY - 1, r + dr))
          const nc = Math.max(0, Math.min(gridX - 1, c + dc))
          localSum += elevations[nr][nc]
          localCount++
        }
      }
      const localMean = localSum / localCount
      sumTRI += Math.abs(elev - localMean)
    }
  }

  geometry.attributes.position.needsUpdate = true
  geometry.computeVertexNormals()

  // 4. Detailed Slope Statistics
  const meanSlope = sumSlope / totalCells
  const sortedSlopes = Float64Array.from(slopeArray).sort()
  const medianSlope = sortedSlopes[Math.floor(totalCells / 2)]

  let sumSqSlopeDiff = 0
  for (let i = 0; i < totalCells; i++) {
    sumSqSlopeDiff += (slopeArray[i] - meanSlope) ** 2
  }
  const stdSlope = Math.sqrt(sumSqSlopeDiff / totalCells)

  const slopeAreaGt30 = (countGt30 / totalCells) * 100
  const slopeAreaGt40 = (countGt40 / totalCells) * 100
  const slopeAreaGt48 = (countGt48 / totalCells) * 100
  const meanRoughness = sumTRI / totalCells
  const meanCurvature = sumLaplacian / totalCells

  // 5. Multi-Factor Geomorphological Terrain Risk Score (0 - 100)
  // Factor 1: Slope Distribution & High Slope Area (0-40 pts)
  const f_slope = Math.min(40.0, (meanSlope / 30.0) * 20.0 + (slopeAreaGt30 / 20.0) * 10.0 + (slopeAreaGt48 / 4.0) * 10.0)
  // Factor 2: Vertical Relief & Energy (0-30 pts)
  const f_relief = Math.min(30.0, (elevRange / 1200.0) * 20.0 + (meanRoughness / 15.0) * 10.0)
  // Factor 3: Highwall Sharpness (0-20 pts)
  const f_highwall = Math.min(20.0, detectedMaxSlope > 15 ? ((detectedMaxSlope - 15.0) / 60.0) * 20.0 : 0)
  // Factor 4: Curvature / Disruption (0-10 pts)
  const f_curv = Math.min(10.0, (meanCurvature / 0.005) * 10.0)

  const totalRiskScore = Math.round((f_slope + f_relief + f_highwall + f_curv) * 10) / 10

  let riskLevel = 'Low'
  if (totalRiskScore >= 70.0 || slopeAreaGt48 >= 6.0) {
    riskLevel = 'Critical'
  } else if (totalRiskScore >= 42.0 || slopeAreaGt30 >= 10.0) {
    riskLevel = 'High'
  } else if (totalRiskScore >= 22.0 || slopeAreaGt30 >= 3.0) {
    riskLevel = 'Moderate'
  } else {
    riskLevel = 'Low'
  }

  // 6. Slope-Driven Vertex Coloring
  const tempColor = new THREE.Color()
  for (let i = 0; i < vertexCount; i++) {
    const slope = slopeArray[i]

    if (slope < 20) {
      // Gentle slope (Stable): Turquoise
      const t = slope / 20.0
      tempColor.setRGB(
        0.26 - 0.09 * t,
        0.79 - 0.15 * t,
        0.82 - 0.15 * t
      )
    } else if (slope < 35) {
      // Moderate slope: Deep Turquoise to Amber
      const t = (slope - 20.0) / 15.0
      tempColor.setRGB(
        0.17 + 0.83 * t,
        0.64 + 0.05 * t,
        0.67 - 0.54 * t
      )
    } else if (slope < 48) {
      // Steep Face: Amber to Orange
      const t = (slope - 35.0) / 13.0
      tempColor.setRGB(
        1.0,
        0.69 - 0.25 * t,
        0.13 + 0.04 * t
      )
    } else {
      // Critical Hazard Face: Orange to Tectonic Crimson Red
      const t = Math.min(1.0, (slope - 48.0) / 25.0)
      tempColor.setRGB(
        1.0 - 0.15 * t,
        0.44 - 0.17 * t,
        0.17 - 0.04 * t
      )
    }

    colors[i * 3] = tempColor.r
    colors[i * 3 + 1] = tempColor.g
    colors[i * 3 + 2] = tempColor.b
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  // Steepest Point in Three.js coordinates
  const steepX = positions[steepestVertexIndex * 3]
  const steepY = positions[steepestVertexIndex * 3 + 1]
  const steepZ = positions[steepestVertexIndex * 3 + 2]
  const steepR = Math.floor(steepestVertexIndex / gridX)
  const steepC = steepestVertexIndex % gridX
  const steepElev = elevations[steepR] ? elevations[steepR][steepC] : minElev

  const steepPoint3D = {
    x: steepX,
    y: steepY,
    z: steepZ,
    slopeDeg: Math.round(detectedMaxSlope * 10) / 10,
    elevation: Math.round(steepElev * 10) / 10,
    row: steepR,
    col: steepC
  }

  return {
    geometry,
    steepPoint3D,
    maxSlope: Math.round(detectedMaxSlope * 10) / 10,
    meanSlope: Math.round(meanSlope * 10) / 10,
    medianSlope: Math.round(medianSlope * 10) / 10,
    stdSlope: Math.round(stdSlope * 10) / 10,
    slopeAreaGt30: Math.round(slopeAreaGt30 * 10) / 10,
    slopeAreaGt40: Math.round(slopeAreaGt40 * 10) / 10,
    slopeAreaGt48: Math.round(slopeAreaGt48 * 10) / 10,
    minElevation: Math.round(minElev * 10) / 10,
    maxElevation: Math.round(maxElev * 10) / 10,
    meanElevation: Math.round(meanElev * 10) / 10,
    stdElevation: Math.round(stdElev * 10) / 10,
    elevationRange: Math.round(elevRange * 10) / 10,
    roughness: Math.round(meanRoughness * 100) / 100,
    curvature: Math.round(meanCurvature * 10000) / 10000,
    riskScore: totalRiskScore,
    riskLevel
  }
}
