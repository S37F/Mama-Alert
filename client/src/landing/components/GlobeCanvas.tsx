import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const ALERT_LATLON: [number, number][] = [
  [20, 77],
  [7.9, -1],
  [9, 8],
  [9, 40],
  [24, 90],
  [21, 96],
  [-2.5, 23],
  [15, 30],
  [-17, -65],
  [-6, 145],
]

function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  const x = -radius * Math.sin(phi) * Math.cos(theta)
  const z = radius * Math.sin(phi) * Math.sin(theta)
  const y = radius * Math.cos(phi)
  return new THREE.Vector3(x, y, z)
}

/** Simplified continent / large-island coasts (lat, lon °). Decorative only. */
const LAND_OUTLINES: [number, number][][] = [
  // Greenland
  [
    [83.5, -32],
    [82, -25],
    [78, -20],
    [72, -22],
    [68, -30],
    [66, -42],
    [68, -52],
    [72, -58],
    [78, -56],
    [83.5, -32],
  ],
  // North America (Alaska → Canada → contiguous US rough → Mexico)
  [
    [71, -156],
    [70, -140],
    [68, -110],
    [60, -85],
    [50, -65],
    [45, -60],
    [43, -66],
    [40, -74],
    [35, -121],
    [32, -117],
    [27, -114],
    [22, -109],
    [18, -95],
    [20, -87],
    [26, -82],
    [30, -85],
    [40, -74],
    [47, -68],
    [52, -58],
    [58, -64],
    [60, -80],
    [55, -100],
    [60, -140],
    [65, -168],
    [71, -156],
  ],
  // Caribbean & Central America hint
  [
    [23, -82],
    [20, -87],
    [15, -90],
    [10, -85],
    [9, -80],
    [12, -72],
    [18, -77],
    [23, -82],
  ],
  // South America
  [
    [12, -72],
    [6, -52],
    [1, -38],
    [-8, -35],
    [-18, -40],
    [-28, -48],
    [-38, -58],
    [-48, -66],
    [-52, -75],
    [-48, -74],
    [-38, -65],
    [-25, -48],
    [-12, -38],
    [0, -48],
    [8, -60],
    [12, -72],
  ],
  // Scandinavia & Western Europe
  [
    [71, 28],
    [70, 8],
    [65, 2],
    [58, 4],
    [52, 5],
    [48, -5],
    [44, -2],
    [43, 3],
    [48, 10],
    [55, 12],
    [62, 16],
    [68, 22],
    [71, 28],
  ],
  // Mediterranean / Southern Europe
  [
    [44, 8],
    [42, 3],
    [40, 0],
    [38, 0],
    [37, 15],
    [40, 18],
    [44, 8],
  ],
  // Africa
  [
    [37, -9],
    [35, -6],
    [30, -10],
    [24, -16],
    [16, -17],
    [10, -16],
    [5, -5],
    [2, 10],
    [-5, 20],
    [-12, 32],
    [-20, 35],
    [-28, 32],
    [-34, 20],
    [-32, 18],
    [-26, 20],
    [-18, 32],
    [-10, 38],
    [-5, 40],
    [0, 42],
    [6, 48],
    [12, 44],
    [20, 38],
    [28, 34],
    [32, 32],
    [35, 28],
    [37, 15],
    [37, -9],
  ],
  // Middle East / South Asia arc
  [
    [42, 28],
    [38, 35],
    [32, 35],
    [28, 33],
    [25, 55],
    [22, 68],
    [20, 72],
    [24, 78],
    [30, 75],
    [35, 70],
    [38, 62],
    [42, 55],
    [42, 28],
  ],
  // East Asia & Sea of Japan
  [
    [52, 125],
    [48, 130],
    [42, 132],
    [38, 129],
    [35, 129],
    [33, 129],
    [36, 130],
    [40, 132],
    [45, 135],
    [50, 140],
    [52, 145],
    [50, 155],
    [45, 142],
    [42, 135],
    [45, 130],
    [52, 125],
  ],
  // Southeast Asia archipelago (simplified)
  [
    [20, 92],
    [12, 98],
    [6, 100],
    [2, 104],
    [-2, 110],
    [-6, 115],
    [-8, 120],
    [-6, 128],
    [0, 125],
    [6, 118],
    [12, 110],
    [18, 102],
    [20, 92],
  ],
  // Australia
  [
    [-11, 130],
    [-15, 125],
    [-22, 114],
    [-32, 115],
    [-38, 140],
    [-36, 150],
    [-28, 154],
    [-18, 150],
    [-11, 142],
    [-11, 130],
  ],
  // New Zealand
  [
    [-34, 173],
    [-37, 175],
    [-42, 175],
    [-46, 168],
    [-42, 166],
    [-37, 168],
    [-34, 173],
  ],
]

const OUTLINE_RADIUS = 2.018

function pushPolylineSegments(coords: [number, number][], radius: number, maxSegmentDeg: number, acc: number[]) {
  for (let i = 0; i < coords.length - 1; i++) {
    const pa = coords[i]
    const pb = coords[i + 1]
    if (!pa || !pb) continue
    const [la, loa] = pa
    const [lb, lob] = pb
    let dLon = lob - loa
    if (dLon > 180) dLon -= 360
    if (dLon < -180) dLon += 360
    const dLat = lb - la
    const dist = Math.hypot(dLat, dLon)
    const steps = Math.max(1, Math.ceil(dist / maxSegmentDeg))
    for (let s = 0; s < steps; s++) {
      const t0 = s / steps
      const t1 = (s + 1) / steps
      const lat0 = la + dLat * t0
      const lon0 = loa + dLon * t0
      const lat1 = la + dLat * t1
      const lon1 = loa + dLon * t1
      const p0 = latLonToVector3(lat0, lon0, radius)
      const p1 = latLonToVector3(lat1, lon1, radius)
      acc.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z)
    }
  }
}

function buildLandOutlineGeometry(): THREE.BufferGeometry {
  const positions: number[] = []
  for (const ring of LAND_OUTLINES) {
    pushPolylineSegments(ring, OUTLINE_RADIUS, 3.5, positions)
  }
  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  return geom
}

function disposeHierarchy(root: THREE.Object3D) {
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry?.dispose()
      const m = child.material
      if (Array.isArray(m)) m.forEach((x) => x.dispose())
      else m?.dispose()
    } else if (child instanceof THREE.LineSegments) {
      child.geometry?.dispose()
      const m = child.material as THREE.Material | THREE.Material[]
      if (Array.isArray(m)) m.forEach((x) => x.dispose())
      else m?.dispose()
    }
  })
}

export default function GlobeCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight || 600

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100)
    camera.position.z = 5.2

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)

    const spin = new THREE.Group()
    const tilt = new THREE.Group()
    spin.add(tilt)
    scene.add(spin)

    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(2, 64, 64),
      new THREE.MeshPhongMaterial({
        color: 0xfdfaf6,
        shininess: 5,
        specular: 0xe8d5bc,
      }),
    )
    tilt.add(globe)

    const wire = new THREE.Mesh(
      new THREE.SphereGeometry(2.008, 36, 36),
      new THREE.MeshBasicMaterial({
        color: 0xe8d5bc,
        wireframe: true,
        transparent: true,
        opacity: 0.14,
      }),
    )
    tilt.add(wire)

    const graticuleMat = new THREE.LineBasicMaterial({
      color: 0xd4c4b0,
      transparent: true,
      opacity: 0.35,
    })
    const graticuleGeom = new THREE.BufferGeometry()
    const grPoints: number[] = []
    for (let lat = -60; lat <= 60; lat += 30) {
      for (let lon = -180; lon < 180; lon += 6) {
        const a = latLonToVector3(lat, lon, 2.01)
        const b = latLonToVector3(lat, lon + 6, 2.01)
        grPoints.push(a.x, a.y, a.z, b.x, b.y, b.z)
      }
    }
    for (let lon = -150; lon <= 150; lon += 30) {
      for (let lat = -90; lat < 90; lat += 6) {
        const a = latLonToVector3(lat, lon, 2.01)
        const b = latLonToVector3(lat + 6, lon, 2.01)
        grPoints.push(a.x, a.y, a.z, b.x, b.y, b.z)
      }
    }
    graticuleGeom.setAttribute('position', new THREE.Float32BufferAttribute(grPoints, 3))
    const graticule = new THREE.LineSegments(graticuleGeom, graticuleMat)
    tilt.add(graticule)

    const outlineGeom = buildLandOutlineGeometry()
    const outlineMat = new THREE.LineBasicMaterial({
      color: 0x8b7355,
      transparent: true,
      opacity: 0.52,
    })
    const coastlines = new THREE.LineSegments(outlineGeom, outlineMat)
    tilt.add(coastlines)

    const ambient = new THREE.AmbientLight(0xfdf5e6, 0.6)
    scene.add(ambient)
    const dir = new THREE.DirectionalLight(0xffffff, 0.85)
    dir.position.set(4, 6, 5)
    scene.add(dir)

    const dotGroup = new THREE.Group()
    const terra = 0xc4522a
    const dotMeshes: THREE.Mesh[] = []
    const phases = ALERT_LATLON.map(() => Math.random() * Math.PI * 2)

    ALERT_LATLON.forEach(([lat, lon], i) => {
      const geom = new THREE.SphereGeometry(0.03, 12, 12)
      const mat = new THREE.MeshBasicMaterial({ color: terra })
      const mesh = new THREE.Mesh(geom, mat)
      mesh.position.copy(latLonToVector3(lat, lon, 2.05))
      mesh.userData.phase = phases[i]
      dotGroup.add(mesh)
      dotMeshes.push(mesh)
    })
    tilt.add(dotGroup)

    let visible = true
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e?.isIntersecting ?? false
      },
      { threshold: 0.08 },
    )
    io.observe(container)

    let targetTiltX = 0
    let targetTiltY = 0
    const onMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect()
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1
      targetTiltX = ny * 0.14
      targetTiltY = nx * 0.12
    }
    container.addEventListener('pointermove', onMove, { passive: true })

    const clock = new THREE.Clock()
    let raf = 0

    const animate = () => {
      raf = requestAnimationFrame(animate)

      if (!visible) {
        return
      }

      spin.rotation.y += 0.001
      tilt.rotation.x += (targetTiltX - tilt.rotation.x) * 0.05
      tilt.rotation.y += (targetTiltY - tilt.rotation.y) * 0.05

      const t = clock.getElapsedTime()
      dotMeshes.forEach((mesh) => {
        const phase = (mesh.userData.phase as number) + t * 2.2
        const pulse = 0.85 + 0.65 * (0.5 + 0.5 * Math.sin(phase))
        mesh.scale.setScalar(pulse)
      })

      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight || 600
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize, { passive: true })

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      container.removeEventListener('pointermove', onMove)
      io.disconnect()
      disposeHierarchy(scene)
      renderer.dispose()
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{
        width: '100%',
        height: 600,
        minHeight: 400,
        touchAction: 'none',
      }}
    />
  )
}
