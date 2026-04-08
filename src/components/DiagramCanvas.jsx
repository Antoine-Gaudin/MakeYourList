import { useState, useCallback, useRef, useEffect, useMemo } from 'react'

function useIsDark() {
  const [isDark, setIsDark] = useState(() => document.documentElement.getAttribute('data-theme') !== 'light')
  useEffect(() => {
    const obs = new MutationObserver(() => setIsDark(document.documentElement.getAttribute('data-theme') !== 'light'))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])
  return isDark
}
import { createPortal } from 'react-dom'
import {
  ReactFlow,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  NodeResizer,
  Panel,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import getStroke from 'perfect-freehand'
import ShareButton from './ShareButton'
import { buildHtmlPreviewUrl } from './HtmlPreviewPage'
import { supabase } from '../lib/supabase'
import { cn } from '../lib/utils'
import { useSubscription } from '../contexts/SubscriptionContext'
import {
  Plus, Trash2, Search, ArrowLeft, FolderPlus, MoreHorizontal,
  Square, Circle, Triangle, Type, Minus, Pencil, MousePointer,
  Image as ImageIcon, Download, Undo2, Redo2, ZoomIn, ZoomOut,
  Palette, Save, PenTool, Hexagon, Diamond, Star as StarIcon,
  ChevronDown, FolderOpen, Edit3, X, Move, Hash, Share2, Check,
  StickyNote, FileText, CheckSquare, Import, Clock, Calendar, List, Paperclip, File,
  Folder, ChevronRight,
} from 'lucide-react'

const isHtmlAtt = (att) => {
  if (!att) return false
  const ft = att.file_type || att.fileType || ''
  if (ft === 'text/html') return true
  const name = att.file_name || att.fileName || ''
  const ext = name.split('.').pop()?.toLowerCase()
  return ext === 'html' || ext === 'htm'
}
const formatFileSize = (bytes) => {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' o'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko'
  return (bytes / (1024 * 1024)).toFixed(1) + ' Mo'
}

// ============== ANIMATED DOTS BACKGROUND ==============
const WAVE_COLORS = [
  [139, 92, 246],  // violet
  [6, 182, 212],   // cyan
  [244, 114, 182], // rose
  [52, 211, 153],  // emerald
  [251, 146, 60],  // amber
  [96, 165, 250],  // blue
  [249, 115, 22],  // orange
  [167, 139, 250], // lavender
]

function AnimatedDots({ isDark }) {
  const canvasRef = useRef(null)
  const { getViewport } = useReactFlow()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return
    const ctx = canvas.getContext('2d')
    let animId
    let w = 0, h = 0
    const dpr = window.devicePixelRatio || 1

    const resize = () => {
      w = parent.clientWidth
      h = parent.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(parent)

    const GAP = 20
    const WAVE_INTERVAL = 420000 // 7min between waves
    const WAVE_TRAVEL_MS = 8000 // wave crosses screen in 8s
    const WW = 350 // wave width in px

    const draw = (time) => {
      if (!w || !h) { animId = requestAnimationFrame(draw); return }
      const { x: vpX, y: vpY, zoom } = getViewport()
      ctx.clearRect(0, 0, w, h)

      const gap = GAP * zoom
      if (gap < 4) { animId = requestAnimationFrame(draw); return }

      const ox = ((vpX % gap) + gap) % gap
      const oy = ((vpY % gap) + gap) % gap
      const baseR = Math.max(0.8, 1.5 * Math.min(zoom, 3))

      // Wave timing: one wave every WAVE_INTERVAL
      const maxD = w + h
      const totalTravel = maxD + WW * 2
      const timeInCycle = time % WAVE_INTERVAL
      const travelProgress = timeInCycle / WAVE_TRAVEL_MS
      const waveActive = travelProgress <= 1.0
      const wf = waveActive ? travelProgress * totalTravel - WW : -9999

      // Pick color for this wave
      const waveIndex = Math.floor(time / WAVE_INTERVAL) % WAVE_COLORS.length
      const [pr, pg_, pb] = WAVE_COLORS[waveIndex]

      // Base colors
      const br = isDark ? 74 : 176, bgg = isDark ? 74 : 176, bb = isDark ? 106 : 200
      const ba = isDark ? 0.5 : 0.45

      for (let x = ox; x <= w; x += gap) {
        for (let y = oy; y <= h; y += gap) {
          let s = 0
          if (waveActive) {
            const wobble = Math.sin(y * 0.012 + time * 0.0008) * 80 + Math.sin(x * 0.009 + time * 0.0006) * 50
            const d = Math.abs((x + y + wobble) - wf)
            const t = Math.max(0, 1 - d / WW)
            s = t * t * (3 - 2 * t)
          }

          const r = br + (pr - br) * s
          const g = bgg + (pg_ - bgg) * s
          const b = bb + (pb - bb) * s
          const a = ba + (1.0 - ba) * s
          const sz = baseR + s * baseR * 0.7

          ctx.globalAlpha = a
          ctx.fillStyle = `rgb(${r|0},${g|0},${b|0})`
          ctx.beginPath()
          ctx.arc(x, y, sz, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.globalAlpha = 1
      animId = requestAnimationFrame(draw)
    }

    animId = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(animId); ro.disconnect() }
  }, [isDark, getViewport])

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  )
}

// ============== COLORS ==============
const SHAPE_COLORS = ['#8b5cf6','#f87171','#4ade80','#facc15','#60a5fa','#c084fc','#fb923c','#2dd4bf','#f472b6','#a3a3a3']
const DIAGRAM_COLORS = ['#8b5cf6','#f87171','#4ade80','#facc15','#60a5fa','#c084fc','#fb923c','#2dd4bf']

// ============== CUSTOM NODES ==============
function ShapeNode({ data, selected }) {
  const shape = data.shape || 'rectangle'
  const color = data.color || '#8b5cf6'
  const label = data.label || ''

  const renderShape = () => {
    const fill = color + '25'
    const stroke = color
    if (shape === 'circle') {
      return (
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <ellipse cx="50" cy="50" rx="48" ry="48" fill={fill} stroke={stroke} strokeWidth={2} />
        </svg>
      )
    }
    if (shape === 'diamond') {
      return (
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polygon points="50,2 98,50 50,98 2,50" fill={fill} stroke={stroke} strokeWidth={2} />
        </svg>
      )
    }
    if (shape === 'hexagon') {
      return (
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polygon points="25,2 75,2 98,50 75,98 25,98 2,50" fill={fill} stroke={stroke} strokeWidth={2} />
        </svg>
      )
    }
    if (shape === 'triangle') {
      return (
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polygon points="50,2 98,98 2,98" fill={fill} stroke={stroke} strokeWidth={2} />
        </svg>
      )
    }
    // rectangle
    return (
      <div
        className={cn('w-full h-full rounded-xl border-2', selected && 'shadow-lg ring-2 ring-primary/30')}
        style={{ backgroundColor: fill, borderColor: stroke }}
      />
    )
  }

  return (
    <>
      <NodeResizer isVisible={selected} minWidth={60} minHeight={40} lineClassName="!border-primary" handleClassName="!w-2.5 !h-2.5 !bg-primary !border-2 !border-white !rounded-full" />
      <div className="w-full h-full relative" style={{ minWidth: 60, minHeight: 40 }}>
        {renderShape()}
        <div className="absolute inset-0 flex items-center justify-center text-sm font-medium pointer-events-none" style={{ color }}>
          {label}
        </div>
      </div>
    </>
  )
}

function TextNode({ data, selected }) {
  return (
    <>
      <NodeResizer isVisible={selected} minWidth={120} minHeight={40} lineClassName="!border-primary" handleClassName="!w-2.5 !h-2.5 !bg-primary !border-2 !border-white !rounded-full" />
      <div className="w-full h-full px-3 py-2 text-sm rounded-lg border border-transparent" style={{
        color: data.color || '#ffffff',
        fontSize: data.fontSize || 14,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        minWidth: 120,
        minHeight: 40,
        backgroundColor: selected ? 'rgba(255,255,255,0.05)' : 'transparent',
      }}>
        {data.label || 'Double-cliquez pour éditer'}
      </div>
    </>
  )
}

function ImageNode({ data, selected }) {
  return (
    <>
      <NodeResizer isVisible={selected} minWidth={60} minHeight={60} lineClassName="!border-primary" handleClassName="!w-2.5 !h-2.5 !bg-primary !border-2 !border-white !rounded-full" />
      <div className={cn('w-full h-full rounded-xl overflow-hidden border-2 border-border', selected && 'ring-2 ring-primary/30')}>
        {data.src ? <img src={data.src} alt={data.label || ''} className="w-full h-full object-contain" /> : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-card/60"><ImageIcon size={24} /></div>
        )}
      </div>
    </>
  )
}

function FreehandNode({ data, selected }) {
  const points = data.points || []
  if (!points.length) return null
  const stroke = getStroke(points, { size: data.strokeWidth || 3, thinning: 0.5, smoothing: 0.5, streamline: 0.5 })
  const pathData = stroke.reduce((acc, [x, y], i) => acc + `${i === 0 ? 'M' : 'L'} ${x} ${y}`, '') + ' Z'
  return (
    <>
      <NodeResizer isVisible={selected} lineClassName="!border-primary" handleClassName="!w-2.5 !h-2.5 !bg-primary !border-2 !border-white !rounded-full" />
      <svg className="w-full h-full overflow-visible" style={{ minWidth: 20, minHeight: 20 }}>
        <path d={pathData} fill={data.color || '#8b5cf6'} opacity={0.8} />
      </svg>
    </>
  )
}

function MarkerNode({ data }) {
  const color = data.color || '#8b5cf6'
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%',
      backgroundColor: color,
      border: '2px solid white',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: 12, fontWeight: 700,
      boxShadow: `0 0 0 2px ${color}`,
      pointerEvents: 'none',
      userSelect: 'none',
    }}>
      {data.label}
    </div>
  )
}

// --- Orthogonal routing ---
function orthoPath(sx, sy, ex, ey) {
  const dx = ex - sx, dy = ey - sy
  const adx = Math.abs(dx), ady = Math.abs(dy)
  if (ady < 5) return [[sx, sy], [ex, ey]]
  if (adx < 5) return [[sx, sy], [ex, ey]]
  if (adx >= ady) return [[sx, sy], [ex, sy], [ex, ey]]
  return [[sx, sy], [sx, ey], [ex, ey]]
}

function LineNode({ id, data, selected }) {
  const { setNodes, screenToFlowPosition } = useReactFlow()
  const containerRef = useRef(null)
  const [dims, setDims] = useState({ w: 100, h: 100 })
  const draggingRef = useRef(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) setDims({ w: width, h: height })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const { w, h } = dims
  const pad = 8
  const sx = data.flipX ? w - pad : pad
  const sy = data.flipY ? h - pad : pad
  const ex = data.flipX ? pad : w - pad
  const ey = data.flipY ? pad : h - pad

  const pts = orthoPath(sx, sy, ex, ey)
  const pointsStr = pts.map(p => p.join(',')).join(' ')

  const onEndpointDown = useCallback((end, e) => {
    e.stopPropagation()
    e.preventDefault()
    draggingRef.current = end

    const move = (ev) => {
      const fp = screenToFlowPosition({ x: ev.clientX, y: ev.clientY })
      setNodes(prev => prev.map(n => {
        if (n.id !== id) return n
        const nw = parseFloat(n.style?.width) || 2
        const nh = parseFloat(n.style?.height) || 2
        const csx = n.data.flipX ? n.position.x + nw : n.position.x
        const csy = n.data.flipY ? n.position.y + nh : n.position.y
        const cex = n.data.flipX ? n.position.x : n.position.x + nw
        const cey = n.data.flipY ? n.position.y : n.position.y + nh
        let nsx, nsy, nex, ney
        if (draggingRef.current === 'start') { nsx = fp.x; nsy = fp.y; nex = cex; ney = cey }
        else { nsx = csx; nsy = csy; nex = fp.x; ney = fp.y }
        return {
          ...n,
          position: { x: Math.min(nsx, nex), y: Math.min(nsy, ney) },
          data: { ...n.data, flipX: nex < nsx, flipY: ney < nsy },
          style: { ...n.style, width: Math.max(Math.round(Math.abs(nex - nsx)), 2), height: Math.max(Math.round(Math.abs(ney - nsy)), 2) },
        }
      }))
    }

    const up = () => {
      draggingRef.current = null
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
    }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }, [id, setNodes, screenToFlowPosition])

  return (
    <div ref={containerRef} className="w-full h-full relative" style={{ minWidth: 2, minHeight: 2, overflow: 'visible' }}>
      <svg className="absolute overflow-visible" style={{ inset: 0, width: '100%', height: '100%' }}>
        {selected && <polyline points={pointsStr} fill="none" stroke={data.color || '#8b5cf6'} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" opacity={0.2} />}
        <polyline points={pointsStr} fill="none" stroke={data.color || '#8b5cf6'} strokeWidth={data.thickness || 2} strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={pointsStr} fill="none" stroke="transparent" strokeWidth={16} />
      </svg>
      {selected && (
        <>
          <div className="nodrag nopan absolute rounded-full bg-primary border-2 border-white shadow cursor-grab z-10" style={{ left: sx - 7, top: sy - 7, width: 14, height: 14 }} onMouseDown={e => onEndpointDown('start', e)} />
          <div className="nodrag nopan absolute rounded-full bg-primary border-2 border-white shadow cursor-grab z-10" style={{ left: ex - 7, top: ey - 7, width: 14, height: 14 }} onMouseDown={e => onEndpointDown('end', e)} />
        </>
      )}
    </div>
  )
}

const nodeTypes = { shape: ShapeNode, text: TextNode, image: ImageNode, freehand: FreehandNode, polygon: PolygonNode, marker: MarkerNode, line: LineNode, noteRef: NoteRefNode, listRef: ListRefNode }

// ============== NOTE REF NODE ==============
function NoteRefNode({ data, selected }) {
  const color = data.color || '#8b5cf6'
  return (
    <>
      <NodeResizer isVisible={selected} minWidth={140} minHeight={36} lineClassName="!border-primary" handleClassName="!w-2.5 !h-2.5 !bg-primary !border-2 !border-white !rounded-full" />
      <div className="w-full h-full rounded-xl border-2 overflow-hidden cursor-pointer flex items-center gap-2 px-3 py-2" style={{ borderColor: color + '60', background: `linear-gradient(135deg, ${color}15, ${color}08)`, minWidth: 140 }}>
        <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ background: color + '25', color }}><StickyNote size={11} /></div>
        <span className="text-xs font-semibold truncate" style={{ color }}>{data.noteTitle || 'Note'}</span>
      </div>
    </>
  )
}

// ============== LIST REF NODE ==============
function ListRefNode({ data, selected }) {
  const color = data.color || '#60a5fa'
  const count = data.listTaskCount ?? 0
  return (
    <>
      <NodeResizer isVisible={selected} minWidth={140} minHeight={36} lineClassName="!border-primary" handleClassName="!w-2.5 !h-2.5 !bg-primary !border-2 !border-white !rounded-full" />
      <div className="w-full h-full rounded-xl border-2 overflow-hidden cursor-pointer flex items-center gap-2 px-3 py-2" style={{ borderColor: color + '50', background: `linear-gradient(135deg, ${color}10, transparent)`, minWidth: 140 }}>
        <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ background: color + '25', color }}><List size={11} /></div>
        <span className="text-xs font-semibold truncate" style={{ color }}>{data.listName || 'Liste'}</span>
        <span className="text-[0.55rem] px-1.5 py-0.5 rounded-full ml-auto shrink-0" style={{ background: color + '18', color }}>{count}</span>
      </div>
    </>
  )
}

// ============== POLYGON NODE ==============
function PolygonNode({ data, selected }) {
  const vertices = data.vertices || []
  if (vertices.length < 2) return null
  const isPath = data.mode === 'path'

  // Calculate bounding box for proper sizing
  const xs = vertices.map(v => v.x)
  const ys = vertices.map(v => v.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const w = Math.max(...xs) - minX || 1
  const h = Math.max(...ys) - minY || 1
  const pad = 10

  const svgW = w + pad * 2
  const svgH = h + pad * 2

  const pointsStr = vertices.map(v => `${v.x - minX + pad},${v.y - minY + pad}`).join(' ')

  return (
    <>
      <NodeResizer isVisible={selected} lineClassName="!border-primary" handleClassName="!w-2.5 !h-2.5 !bg-primary !border-2 !border-white !rounded-full" />
      <svg width={svgW} height={svgH} className="overflow-visible">
        {isPath ? (
          <>
            {selected && <polyline points={pointsStr} fill="none" stroke={data.color || '#8b5cf6'} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" opacity={0.2} />}
            <polyline points={pointsStr} fill="none" stroke={data.color || '#8b5cf6'} strokeWidth={data.thickness || 2} strokeLinecap="round" strokeLinejoin="round" />
            <polyline points={pointsStr} fill="none" stroke="transparent" strokeWidth={14} />
          </>
        ) : (
          <polygon points={pointsStr} fill={(data.color || '#8b5cf6') + '60'} stroke={data.color || '#8b5cf6'} strokeWidth={2} strokeLinejoin="round" />
        )}
      </svg>
    </>
  )
}

// ============== UNDO/REDO HOOK ==============
function useUndoRedo(nodes, edges, setNodes, setEdges, maxHistory = 50) {
  const past = useRef([])
  const future = useRef([])
  const skipRecord = useRef(false)

  const record = useCallback(() => {
    if (skipRecord.current) { skipRecord.current = false; return }
    past.current = [...past.current.slice(-(maxHistory - 1)), { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }]
    future.current = []
  }, [nodes, edges, maxHistory])

  const undo = useCallback(() => {
    if (!past.current.length) return
    const prev = past.current.pop()
    future.current.push({ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) })
    skipRecord.current = true
    setNodes(prev.nodes)
    setEdges(prev.edges)
  }, [nodes, edges, setNodes, setEdges])

  const redo = useCallback(() => {
    if (!future.current.length) return
    const next = future.current.pop()
    past.current.push({ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) })
    skipRecord.current = true
    setNodes(next.nodes)
    setEdges(next.edges)
  }, [nodes, edges, setNodes, setEdges])

  return { record, undo, redo, canUndo: past.current.length > 0, canRedo: future.current.length > 0 }
}

// ============== EDITOR COMPONENT ==============
function DiagramEditorInner({ diagram, onSave, onBack, onRename, createShareLink, notes, allTodos, lists, attachments, getAttachmentUrl }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(diagram.data?.nodes || [])
  const [edges, setEdges, onEdgesChange] = useEdgesState(diagram.data?.edges || [])
  const [tool, setTool] = useState('select') // select | shape | text | freehand | polygon | line
  const [shapeType, setShapeType] = useState('rectangle')
  const [currentColor, setCurrentColor] = useState('#8b5cf6')
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showShapePicker, setShowShapePicker] = useState(false)
  const [editingLabel, setEditingLabel] = useState(null)
  const [editingNodeType, setEditingNodeType] = useState(null) // 'text' | 'shape' | etc.
  const [labelValue, setLabelValue] = useState('')
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawingPoints, setDrawingPoints] = useState([])
  const [hasUnsaved, setHasUnsaved] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(diagram.name)
  const [ctrlPressed, setCtrlPressed] = useState(false)
  const [lineThickness, setLineThickness] = useState(2)
  const [polygonMode, setPolygonMode] = useState('fill') // 'fill' | 'path'
  const [isPanning, setIsPanning] = useState(false)
  const [showSharePopup, setShowSharePopup] = useState(false)
  const [shareUrl, setShareUrl] = useState(null)
  const [shareCopied, setShareCopied] = useState(false)
  const [shareLoading, setShareLoading] = useState(false)
  const [showImportPicker, setShowImportPicker] = useState(false)
  const [importTab, setImportTab] = useState('notes') // 'notes' | 'lists'
  const [importSearch, setImportSearch] = useState('')
  const [previewItem, setPreviewItem] = useState(null) // { type: 'note'|'list', data }
  const shareRef = useRef(null)
  const sharePopupRef = useRef(null)
  const [polygonPoints, setPolygonPoints] = useState([]) // [{x,y,num}]
  const [shapeDragStart, setShapeDragStart] = useState(null) // {fx,fy,sx,sy} flow + screen coords
  const [shapeDragCurrent, setShapeDragCurrent] = useState(null) // {fx,fy,sx,sy}
  const saveTimerRef = useRef(null)
  const reactFlowWrapper = useRef(null)
  const shapePickerBtnRef = useRef(null)
  const colorPickerBtnRef = useRef(null)
  const { screenToFlowPosition, getViewport, setViewport } = useReactFlow()
  const isPanningRef = useRef(false)
  const panStartRef = useRef({ x: 0, y: 0, vx: 0, vy: 0 })
  const isDark = useIsDark()
  const { record, undo, redo } = useUndoRedo(nodes, edges, setNodes, setEdges)

  // Track Ctrl key for pan
  useEffect(() => {
    const down = (e) => { if (e.key === 'Control') setCtrlPressed(true) }
    const up = (e) => { if (e.key === 'Control') setCtrlPressed(false) }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', () => setCtrlPressed(false))
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  // Ctrl+drag pan — document-level, prioritaire sur tout
  useEffect(() => {
    const wrapper = reactFlowWrapper.current
    const onDown = (e) => {
      if (!e.ctrlKey) return
      if (!wrapper || !wrapper.contains(e.target)) return
      e.preventDefault()
      e.stopPropagation()
      const vp = getViewport()
      isPanningRef.current = true
      setIsPanning(true)
      panStartRef.current = { x: e.clientX, y: e.clientY, vx: vp.x, vy: vp.y }
    }
    const onMove = (e) => {
      if (!isPanningRef.current) return
      e.preventDefault()
      e.stopPropagation()
      const vp = getViewport()
      setViewport({ x: panStartRef.current.vx + (e.clientX - panStartRef.current.x), y: panStartRef.current.vy + (e.clientY - panStartRef.current.y), zoom: vp.zoom })
    }
    const onUp = () => { isPanningRef.current = false; setIsPanning(false) }
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('pointermove', onMove, true)
    document.addEventListener('pointerup', onUp, true)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('pointermove', onMove, true)
      document.removeEventListener('pointerup', onUp, true)
    }
  }, [getViewport, setViewport, setIsPanning])

  // Share link
  const handleShareDiagram = async () => {
    if (showSharePopup) { setShowSharePopup(false); return }
    if (!createShareLink) return
    setShowSharePopup(true)
    setShareLoading(true)
    try {
      const token = await createShareLink('diagram', diagram.id)
      if (token) {
        const url = `${window.location.origin}/share/${token}`
        setShareUrl(url)
        try { await navigator.clipboard.writeText(url); setShareCopied(true); setTimeout(() => setShareCopied(false), 2000) } catch {}
      }
    } catch (err) { console.error('Share error:', err) }
    setShareLoading(false)
  }

  useEffect(() => {
    if (!showSharePopup) return
    const handler = (e) => {
      if (shareRef.current?.contains(e.target)) return
      if (sharePopupRef.current?.contains(e.target)) return
      setShowSharePopup(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showSharePopup])

  // Debounced auto-save
  useEffect(() => {
    if (!hasUnsaved) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      const vp = getViewport()
      onSave(diagram.id, { data: { nodes, edges, viewport: vp } })
      setHasUnsaved(false)
    }, 1000)
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [nodes, edges, hasUnsaved, diagram.id, onSave, getViewport])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); redo() }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return
        const selectedNodes = nodes.filter(n => n.selected)
        const selectedEdges = edges.filter(e => e.selected)
        if (selectedNodes.length || selectedEdges.length) {
          record()
          const nodeIds = new Set(selectedNodes.map(n => n.id))
          setNodes(prev => prev.filter(n => !nodeIds.has(n.id)))
          setEdges(prev => prev.filter(e => !e.selected && !nodeIds.has(e.source) && !nodeIds.has(e.target)))
          setHasUnsaved(true)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [nodes, edges, undo, redo, record, setNodes, setEdges])

  const onPaneClick = useCallback((event) => {
    if (tool === 'select' || tool === 'line' || ctrlPressed) return
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
    if (tool === 'polygon') {
      // Place numbered point
      const num = polygonPoints.length + 1
      setPolygonPoints(prev => [...prev, { x: position.x, y: position.y, num }])
      // Show numbered marker as a temporary shape node
      const markerId = `polymarker_${Date.now()}`
      setNodes(prev => [...prev, {
        id: markerId, type: 'marker', position: { x: position.x - 14, y: position.y - 14 },
        data: { label: String(num), color: currentColor },
        style: { width: 28, height: 28 },
        draggable: false,
        selectable: false,
        _polygonMarker: true,
      }])
      return
    }
    // Text tool: click to place
    // Shape and text tools: handled by drag (onShapeDragStart/Move/Up)
  }, [tool, currentColor, screenToFlowPosition, record, setNodes, ctrlPressed, polygonPoints])

  // Shape/text drag-to-create
  const onShapeDragStart = useCallback((e) => {
    if ((tool !== 'shape' && tool !== 'text' && tool !== 'line') || e.ctrlKey) return
    const fpos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    const rect = reactFlowWrapper.current?.getBoundingClientRect()
    const sx = e.clientX - (rect?.left || 0)
    const sy = e.clientY - (rect?.top || 0)
    setShapeDragStart({ fx: fpos.x, fy: fpos.y, sx, sy })
    setShapeDragCurrent({ fx: fpos.x, fy: fpos.y, sx, sy })
  }, [tool, screenToFlowPosition])

  const onShapeDragMove = useCallback((e) => {
    if (!shapeDragStart) return
    const fpos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    const rect = reactFlowWrapper.current?.getBoundingClientRect()
    const sx = e.clientX - (rect?.left || 0)
    const sy = e.clientY - (rect?.top || 0)
    setShapeDragCurrent({ fx: fpos.x, fy: fpos.y, sx, sy })
  }, [shapeDragStart, screenToFlowPosition])

  const onShapeDragUp = useCallback(() => {
    if (!shapeDragStart || !shapeDragCurrent) { setShapeDragStart(null); setShapeDragCurrent(null); return }
    const x = Math.min(shapeDragStart.fx, shapeDragCurrent.fx)
    const y = Math.min(shapeDragStart.fy, shapeDragCurrent.fy)
    const w = Math.abs(shapeDragCurrent.fx - shapeDragStart.fx)
    const h = Math.abs(shapeDragCurrent.fy - shapeDragStart.fy)
    setShapeDragStart(null)
    setShapeDragCurrent(null)
    if (tool === 'line') {
      if (Math.sqrt(w * w + h * h) < 10) return
      const dx = shapeDragCurrent.fx - shapeDragStart.fx
      const dy = shapeDragCurrent.fy - shapeDragStart.fy
      record()
      setNodes(prev => [...prev, {
        id: `node_${Date.now()}`, type: 'line',
        position: { x, y },
        data: { color: currentColor, thickness: lineThickness, flipX: dx < 0, flipY: dy < 0 },
        style: { width: Math.max(Math.round(w), 2), height: Math.max(Math.round(h), 2) },
      }])
      setHasUnsaved(true)
      return
    }
    if (w < 10 || h < 10) return
    record()
    if (tool === 'text') {
      const newNode = {
        id: `node_${Date.now()}`, type: 'text',
        position: { x, y },
        data: { label: '', color: currentColor },
        style: { width: Math.round(w), height: Math.round(h) },
      }
      setNodes(prev => [...prev, newNode])
    } else {
      const newNode = {
        id: `node_${Date.now()}`, type: 'shape',
        position: { x, y },
        data: { label: '', shape: shapeType, color: currentColor },
        style: { width: Math.round(w), height: Math.round(h) },
      }
      setNodes(prev => [...prev, newNode])
    }
    setHasUnsaved(true)
  }, [shapeDragStart, shapeDragCurrent, tool, shapeType, currentColor, lineThickness, record, setNodes])

  const onNodeDoubleClick = useCallback((_, node) => {
    if (node.type === 'noteRef') {
      const note = (notes || []).find(n => n.id === node.data.noteId)
      if (note) setPreviewItem({ type: 'note', data: note })
      return
    }
    if (node.type === 'listRef') {
      const list = (lists || []).find(l => l.id === node.data.listId)
      if (list) {
        const tasks = (allTodos || []).filter(t => t.listId === list.id)
        setPreviewItem({ type: 'list', data: list, tasks })
      }
      return
    }
    setEditingLabel(node.id)
    setEditingNodeType(node.type)
    setLabelValue(node.data.label || '')
  }, [notes, allTodos, lists])

  const submitLabel = useCallback(() => {
    if (editingLabel) {
      record()
      setNodes(prev => prev.map(n => n.id === editingLabel ? { ...n, data: { ...n.data, label: labelValue } } : n))
      setHasUnsaved(true)
      setEditingLabel(null)
      setEditingNodeType(null)
    }
  }, [editingLabel, labelValue, record, setNodes])

  // Finalize polygon: remove markers, create polygon node
  const finalizePolygon = useCallback(() => {
    const minPts = polygonMode === 'path' ? 2 : 3
    if (polygonPoints.length < minPts) {
      setNodes(prev => prev.filter(n => !n._polygonMarker))
      setPolygonPoints([])
      return
    }
    record()
    setNodes(prev => prev.filter(n => !n._polygonMarker))
    const xs = polygonPoints.map(p => p.x)
    const ys = polygonPoints.map(p => p.y)
    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    const w = Math.max(...xs) - minX
    const h = Math.max(...ys) - minY
    const pad = 10

    const newNode = {
      id: `polygon_${Date.now()}`, type: 'polygon',
      position: { x: minX - pad, y: minY - pad },
      data: {
        vertices: polygonPoints.map(p => ({ x: p.x, y: p.y })),
        color: currentColor,
        ...(polygonMode === 'path' ? { mode: 'path', thickness: lineThickness } : {}),
      },
      style: { width: w + pad * 2, height: h + pad * 2 },
    }
    setNodes(prev => [...prev, newNode])
    setPolygonPoints([])
    setHasUnsaved(true)
  }, [polygonPoints, currentColor, polygonMode, lineThickness, record, setNodes])

  // Freehand drawing
  const onPaneMouseDown = useCallback((e) => {
    if (tool !== 'freehand' || ctrlPressed) return
    setIsDrawing(true)
    const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    setDrawingPoints([[ pos.x, pos.y, 0.5 ]])
  }, [tool, screenToFlowPosition, ctrlPressed])

  const onPaneMouseMove = useCallback((e) => {
    if (!isDrawing || tool !== 'freehand' || ctrlPressed) return
    const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    setDrawingPoints(prev => [...prev, [ pos.x, pos.y, 0.5 ]])
  }, [isDrawing, tool, screenToFlowPosition, ctrlPressed])

  const onPaneMouseUp = useCallback(() => {
    if (!isDrawing || tool !== 'freehand') return
    setIsDrawing(false)
    if (drawingPoints.length < 3) { setDrawingPoints([]); return }
    record()
    const xs = drawingPoints.map(p => p[0])
    const ys = drawingPoints.map(p => p[1])
    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    const normalized = drawingPoints.map(p => [p[0] - minX, p[1] - minY, p[2]])
    const newNode = {
      id: `freehand_${Date.now()}`, type: 'freehand',
      position: { x: minX, y: minY },
      data: { points: normalized, color: currentColor, strokeWidth: 3 },
      style: { width: Math.max(...xs) - minX + 10, height: Math.max(...ys) - minY + 10 },
    }
    setNodes(prev => [...prev, newNode])
    setDrawingPoints([])
    setHasUnsaved(true)
  }, [isDrawing, tool, drawingPoints, currentColor, record, setNodes])

  // Image import
  const importImage = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = e.target.files[0]
      if (!file) return
      if (file.size > 2 * 1024 * 1024) { alert('Image trop volumineuse (max 2 Mo)'); return }
      const reader = new FileReader()
      reader.onload = (ev) => {
        record()
        const newNode = {
          id: `img_${Date.now()}`, type: 'image',
          position: { x: 100, y: 100 },
          data: { src: ev.target.result, label: file.name },
          style: { width: 200, height: 200 },
        }
        setNodes(prev => [...prev, newNode])
        setHasUnsaved(true)
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }, [record, setNodes])

  const shapes = [
    { id: 'rectangle', icon: <Square size={16} />, label: 'Rectangle' },
    { id: 'circle', icon: <Circle size={16} />, label: 'Cercle' },
    { id: 'diamond', icon: <Diamond size={16} />, label: 'Losange' },
    { id: 'hexagon', icon: <Hexagon size={16} />, label: 'Hexagone' },
    { id: 'triangle', icon: <Triangle size={16} />, label: 'Triangle' },
  ]

  const tools = [
    { id: 'select', icon: <MousePointer size={16} />, label: 'Sélection' },
    { id: 'shape', icon: <Square size={16} />, label: 'Forme' },
    { id: 'text', icon: <Type size={16} />, label: 'Texte' },
    { id: 'freehand', icon: <PenTool size={16} />, label: 'Dessin libre' },
    { id: 'line', icon: <Minus size={16} />, label: 'Ligne droite' },
    { id: 'polygon', icon: <Hash size={16} />, label: 'Polygone (numéros)' },
  ]

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card/60 backdrop-blur-sm shrink-0">
        <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground bg-transparent border-none cursor-pointer" onClick={onBack}>
          <ArrowLeft size={18} />
        </button>
        {editingName ? (
          <input
            autoFocus className="text-sm font-semibold bg-transparent border border-primary/30 rounded-lg px-2 py-1 outline-none text-foreground w-48"
            value={nameValue}
            onChange={e => setNameValue(e.target.value)}
            onBlur={() => { if (nameValue.trim()) { onRename(diagram.id, nameValue.trim()); setEditingName(false) } }}
            onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') { setNameValue(diagram.name); setEditingName(false) } }}
          />
        ) : (
          <span className="text-sm font-semibold cursor-pointer hover:text-primary transition-colors" onClick={() => setEditingName(true)}>{diagram.name}</span>
        )}
        {hasUnsaved && <span className="text-[0.6rem] text-warning font-medium px-2 py-0.5 rounded-full bg-warning/15">Non sauvegardé</span>}
        <div className="flex-1" />

        {/* Tools */}
        <div className="flex items-center gap-0.5 bg-card border border-border rounded-xl px-1 py-0.5">
          {tools.map(t => (
            <button key={t.id}
              className={cn("w-8 h-8 flex items-center justify-center rounded-lg border-none cursor-pointer transition-all",
                tool === t.id ? "bg-primary text-primary-foreground shadow-sm" : "bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
              onClick={() => { if (tool === 'polygon' && t.id !== 'polygon') { setNodes(prev => prev.filter(n => !n._polygonMarker)); setPolygonPoints([]) } setTool(t.id) }} title={t.label}
            >{t.icon}</button>
          ))}
        </div>

        {/* Shape picker */}
        {tool === 'shape' && (
          <div className="relative" onMouseDown={e => e.stopPropagation()}>
            <button ref={shapePickerBtnRef} className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-card border border-border text-sm text-foreground cursor-pointer hover:bg-accent" onClick={() => setShowShapePicker(!showShapePicker)}>
              {shapes.find(s => s.id === shapeType)?.icon} <ChevronDown size={12} />
            </button>
            {showShapePicker && createPortal(
              <div style={{ position:'fixed', inset:0, zIndex:99999 }}
                onClick={() => setShowShapePicker(false)}
                onMouseDown={e => { e.stopPropagation(); }}
              >
                <div
                  style={{
                    position:'absolute',
                    top: (shapePickerBtnRef.current?.getBoundingClientRect().bottom || 100) + 4,
                    left: shapePickerBtnRef.current?.getBoundingClientRect().left || 100,
                    backgroundColor:'#1e1e2e', border:'1px solid #444', borderRadius:12,
                    padding:6, minWidth:160, boxShadow:'0 8px 32px rgba(0,0,0,0.6)',
                  }}
                  onClick={e => e.stopPropagation()}
                  onMouseDown={e => e.stopPropagation()}
                >
                  {shapes.map(s => (
                    <button key={s.id}
                      style={{
                        display:'flex', alignItems:'center', gap:8,
                        padding:'8px 12px', borderRadius:8, fontSize:14,
                        border:'none', cursor:'pointer', width:'100%', textAlign:'left',
                        backgroundColor: shapeType === s.id ? 'rgba(139,92,246,0.2)' : 'transparent',
                        color: shapeType === s.id ? '#a78bfa' : '#e2e2e2',
                        fontWeight: shapeType === s.id ? 600 : 400,
                      }}
                      onMouseEnter={e => { if (shapeType !== s.id) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)' }}
                      onMouseLeave={e => { if (shapeType !== s.id) e.currentTarget.style.backgroundColor = 'transparent' }}
                      onClick={e => { e.stopPropagation(); setShapeType(s.id); setShowShapePicker(false) }}
                    >{s.icon} {s.label}</button>
                  ))}
                </div>
              </div>,
              document.body
            )}
          </div>
        )}

        {/* Thickness picker */}
        {tool === 'line' && (
          <div className="flex items-center gap-0.5 bg-card border border-border rounded-xl px-1 py-0.5">
            {[1, 2, 3, 5, 8].map(t => (
              <button key={t} title={`${t}px`}
                className={cn('px-2 h-8 rounded-lg text-xs border-none cursor-pointer transition-all',
                  lineThickness === t ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:bg-accent'
                )}
                onClick={() => setLineThickness(t)}
              >{t}px</button>
            ))}
          </div>
        )}

        {/* Color picker */}
        <div className="relative" onMouseDown={e => e.stopPropagation()}>
          <button ref={colorPickerBtnRef} className="w-8 h-8 flex items-center justify-center rounded-lg border border-border cursor-pointer hover:ring-2 hover:ring-primary/30" style={{ backgroundColor: currentColor + '30' }} onClick={() => setShowColorPicker(!showColorPicker)} title="Couleur">
            <Palette size={14} style={{ color: currentColor }} />
          </button>
          {showColorPicker && createPortal(
            <div style={{ position:'fixed', inset:0, zIndex:99999 }}
              onClick={() => setShowColorPicker(false)}
              onMouseDown={e => e.stopPropagation()}
            >
              <div
                style={{
                  position:'absolute',
                  top: (colorPickerBtnRef.current?.getBoundingClientRect().bottom || 100) + 4,
                  right: window.innerWidth - (colorPickerBtnRef.current?.getBoundingClientRect().right || 200),
                  backgroundColor:'#1e1e2e', border:'1px solid #444', borderRadius:12,
                  padding:10, width:190, boxShadow:'0 8px 32px rgba(0,0,0,0.6)',
                  display:'flex', flexWrap:'wrap', gap:6,
                }}
                onClick={e => e.stopPropagation()}
                onMouseDown={e => e.stopPropagation()}
              >
                {SHAPE_COLORS.map(c => (
                  <button key={c}
                    style={{
                      width:28, height:28, borderRadius:8, border: currentColor === c ? '2px solid white' : '2px solid transparent',
                      backgroundColor: c, cursor:'pointer', transition:'transform 0.1s',
                      transform: currentColor === c ? 'scale(1.1)' : 'scale(1)',
                      boxShadow: currentColor === c ? '0 2px 8px rgba(0,0,0,0.4)' : 'none',
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'}
                    onMouseLeave={e => e.currentTarget.style.transform = currentColor === c ? 'scale(1.1)' : 'scale(1)'}
                    onClick={e => {
                      e.stopPropagation()
                      setCurrentColor(c)
                      setShowColorPicker(false)
                      // Appliquer aux noeuds sélectionnés
                      const selected = nodes.filter(n => n.selected && !n._polygonMarker)
                      if (selected.length > 0) {
                        record()
                        setNodes(prev => prev.map(n =>
                          n.selected && !n._polygonMarker ? { ...n, data: { ...n.data, color: c } } : n
                        ))
                        setHasUnsaved(true)
                      }
                    }}
                  />
                ))}
              </div>
            </div>,
            document.body
          )}
        </div>

        <div className="w-px h-6 bg-border mx-1" />
        <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground bg-transparent border-none cursor-pointer" onClick={importImage} title="Importer image"><ImageIcon size={16} /></button>
        <button className={cn("w-8 h-8 flex items-center justify-center rounded-lg border-none cursor-pointer transition-all", showImportPicker ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:bg-accent")} onClick={() => { setShowImportPicker(!showImportPicker); setImportSearch('') }} title="Importer note / tâche"><Import size={16} /></button>
        <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground bg-transparent border-none cursor-pointer disabled:opacity-30" onClick={undo} title="Annuler (Ctrl+Z)"><Undo2 size={16} /></button>
        <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground bg-transparent border-none cursor-pointer disabled:opacity-30" onClick={redo} title="Rétablir (Ctrl+Y)"><Redo2 size={16} /></button>

        {createShareLink && (
          <div className="relative" ref={shareRef}>
            <button className={cn("p-1.5 bg-transparent border-none cursor-pointer rounded-lg transition-all", shareUrl ? "text-emerald-400" : "text-muted-foreground hover:text-foreground")} onClick={handleShareDiagram} title="Partager un lien">
              {shareLoading ? <span className="animate-spin block w-3.5 h-3.5 border-2 border-muted-foreground/30 border-t-primary rounded-full" /> : shareCopied ? <Check size={14} /> : <Share2 size={14} />}
            </button>
            {showSharePopup && createPortal(
              <div style={{ position: 'fixed', inset: 0, zIndex: 99999 }} onClick={() => setShowSharePopup(false)}>
                <div ref={sharePopupRef} className="absolute w-64 bg-card/95 backdrop-blur-xl border border-white/10 rounded-xl p-3 animate-scale-in"
                  style={{ top: shareRef.current?.getBoundingClientRect().bottom + 4, right: window.innerWidth - (shareRef.current?.getBoundingClientRect().right || 0), boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}
                  onClick={e => e.stopPropagation()}
                >
                  <div className="text-[0.65rem] font-semibold text-foreground mb-1.5">Lien de partage</div>
                  {shareLoading && !shareUrl ? (
                    <div className="flex items-center gap-2 py-2 text-[0.65rem] text-muted-foreground">
                      <span className="animate-spin block w-3 h-3 border-2 border-muted-foreground/30 border-t-primary rounded-full" /> Création du lien...
                    </div>
                  ) : shareUrl ? (
                    <>
                      <div className="flex items-center gap-1.5">
                        <input type="text" readOnly value={shareUrl} className="flex-1 px-2 py-1.5 bg-input border border-white/10 rounded-lg text-[0.65rem] text-foreground outline-none" onClick={e => e.target.select()} />
                        <button className="px-2 py-1.5 bg-primary/15 text-primary border-none rounded-lg cursor-pointer text-[0.65rem] font-medium hover:bg-primary/25 transition-colors" onClick={() => { navigator.clipboard.writeText(shareUrl); setShareCopied(true); setTimeout(() => setShareCopied(false), 2000) }}>Copier</button>
                      </div>
                      <div className="flex items-center gap-1 mt-2 text-[0.6rem] text-muted-foreground">
                        <Share2 size={9} /> Visible par toute personne ayant le lien
                      </div>
                    </>
                  ) : (
                    <div className="text-[0.65rem] text-red-400 py-1">Erreur lors de la création du lien</div>
                  )}
                </div>
              </div>,
              document.body
            )}
          </div>
        )}

        {/* Polygon mode toggle */}
        {tool === 'polygon' && (
          <>
            <div className="flex items-center bg-card border border-border rounded-lg overflow-hidden">
              <button className={cn('px-2 py-1 text-[0.65rem] border-none cursor-pointer transition-all', polygonMode === 'fill' ? 'bg-primary text-primary-foreground font-semibold' : 'bg-transparent text-muted-foreground hover:bg-accent')} onClick={() => setPolygonMode('fill')}>Rempli</button>
              <button className={cn('px-2 py-1 text-[0.65rem] border-none cursor-pointer transition-all', polygonMode === 'path' ? 'bg-primary text-primary-foreground font-semibold' : 'bg-transparent text-muted-foreground hover:bg-accent')} onClick={() => setPolygonMode('path')}>Tracé</button>
            </div>
          </>
        )}

        {/* Polygon controls */}
        {tool === 'polygon' && polygonPoints.length > 0 && (
          <>
            <div className="w-px h-6 bg-border mx-1" />
            <span className="text-[0.65rem] text-muted-foreground">{polygonPoints.length} point(s)</span>
            {polygonPoints.length >= (polygonMode === 'path' ? 2 : 3) && (
              <button className="px-3 py-1.5 rounded-lg text-xs bg-emerald-500 text-white border-none cursor-pointer hover:bg-emerald-600 font-semibold" onClick={finalizePolygon}>
                {polygonMode === 'path' ? 'Valider tracé' : 'Valider polygone'}
              </button>
            )}
            <button className="px-2 py-1.5 rounded-lg text-xs bg-transparent border border-border text-muted-foreground cursor-pointer hover:bg-accent" onClick={() => { setNodes(prev => prev.filter(n => !n._polygonMarker)); setPolygonPoints([]) }}>
              Annuler
            </button>
          </>
        )}

        {/* Ctrl indicator */}
        {ctrlPressed && <span className="text-[0.6rem] text-primary font-medium px-2 py-0.5 rounded-full bg-primary/15">Déplacement</span>}
      </div>

      {/* Canvas */}
      <div className="flex-1 relative" ref={reactFlowWrapper}
        style={{ cursor: isPanning ? 'grabbing' : ctrlPressed ? 'grab' : undefined }}
        onMouseDown={(e) => { if (e.ctrlKey) { const vp = getViewport(); isPanningRef.current = true; panStartRef.current = { x: e.clientX, y: e.clientY, vx: vp.x, vy: vp.y }; return; } if (tool === 'freehand') onPaneMouseDown(e); else onShapeDragStart(e) }}
        onMouseMove={(e) => { if (isPanningRef.current) { const vp = getViewport(); setViewport({ x: panStartRef.current.vx + (e.clientX - panStartRef.current.x), y: panStartRef.current.vy + (e.clientY - panStartRef.current.y), zoom: vp.zoom }); return; } if (tool === 'freehand') onPaneMouseMove(e); else onShapeDragMove(e) }}
        onMouseUp={(e) => { isPanningRef.current = false; if (tool === 'freehand') onPaneMouseUp(e); else onShapeDragUp(e) }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={(changes) => { onNodesChange(changes); setHasUnsaved(true) }}
          onEdgesChange={(changes) => { onEdgesChange(changes); setHasUnsaved(true) }}
          onPaneClick={onPaneClick}
          onNodeDoubleClick={onNodeDoubleClick}
          nodeTypes={nodeTypes}
          panOnDrag={false}
          selectionOnDrag={tool === 'select'}
          panOnScroll={false}
          zoomOnScroll={true}
          defaultViewport={diagram.data?.viewport || { x: 0, y: 0, zoom: 1 }}
          fitView={!diagram.data?.viewport}
          deleteKeyCode={null}
          className="bg-background"
          defaultEdgeOptions={{ type: 'smoothstep', animated: false, style: { stroke: '#6b7280', strokeWidth: 2 } }}
          minZoom={0.1}
          maxZoom={4}
          proOptions={{ hideAttribution: true }}
        >
          <Controls position="bottom-left" className="!bg-card !border-border !rounded-xl !shadow-lg [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground [&>button]:hover:!bg-accent" />
          <MiniMap
            position="bottom-right"
            className="!bg-card/80 !border-border !rounded-xl !shadow-lg"
            nodeColor={(n) => n.data?.color || '#8b5cf6'}
            maskColor="rgba(0,0,0,0.3)"
          />
          <AnimatedDots isDark={isDark} />
        </ReactFlow>

        {/* Freehand draw overlay */}
        {tool === 'freehand' && isDrawing && drawingPoints.length > 1 && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-50">
            <polyline
              points={drawingPoints.map(p => `${p[0]},${p[1]}`).join(' ')}
              fill="none" stroke={currentColor} strokeWidth={3} opacity={0.6}
            />
          </svg>
        )}

        {/* Shape/text drag preview */}
        {shapeDragStart && shapeDragCurrent && (() => {
          const left = Math.min(shapeDragStart.sx, shapeDragCurrent.sx)
          const top = Math.min(shapeDragStart.sy, shapeDragCurrent.sy)
          const w = Math.abs(shapeDragCurrent.sx - shapeDragStart.sx)
          const h = Math.abs(shapeDragCurrent.sy - shapeDragStart.sy)
          if (w < 5 && h < 5) return null
          if (tool === 'line') {
            const x1 = shapeDragStart.sx
            const y1 = shapeDragStart.sy
            const x2 = shapeDragCurrent.sx
            const y2 = shapeDragCurrent.sy
            const lPts = orthoPath(x1, y1, x2, y2)
            const lStr = lPts.map(p => p.join(',')).join(' ')
            return (
              <svg className="absolute inset-0 pointer-events-none z-50 overflow-visible" style={{ width: '100%', height: '100%' }}>
                <polyline points={lStr} fill="none" stroke={currentColor} strokeWidth={lineThickness} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 4" opacity={0.8} />
              </svg>
            )
          }
          const isText = tool === 'text'
          return (
            <div className="absolute pointer-events-none z-50" style={{
              left, top, width: w, height: h,
              border: `2px dashed ${isText ? '#94a3b8' : currentColor}`,
              backgroundColor: isText ? 'rgba(255,255,255,0.04)' : currentColor + '15',
              borderRadius: !isText && shapeType === 'circle' ? '50%' : !isText && shapeType === 'diamond' ? '8px' : '8px',
              transform: !isText && shapeType === 'diamond' ? 'rotate(45deg)' : undefined,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isText && <span style={{ fontSize: 11, color: '#94a3b8', pointerEvents: 'none' }}>Zone de texte</span>}
            </div>
          )
        })()}

        {/* Import picker modal */}
        {showImportPicker && createPortal(
          <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowImportPicker(false)}>
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-[420px] max-h-[70vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                <Import size={16} className="text-primary" />
                <span className="text-sm font-semibold text-foreground">Importer dans le schéma</span>
                <div className="flex-1" />
                <button className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground bg-transparent border-none cursor-pointer" onClick={() => setShowImportPicker(false)}><X size={14} /></button>
              </div>
              <div className="flex border-b border-border">
                <button className={cn("flex-1 px-4 py-2 text-xs font-medium border-none cursor-pointer transition-all", importTab === 'notes' ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'bg-transparent text-muted-foreground hover:text-foreground')} onClick={() => setImportTab('notes')}>
                  <StickyNote size={12} className="inline mr-1.5" />Notes ({(notes || []).length})
                </button>
                <button className={cn("flex-1 px-4 py-2 text-xs font-medium border-none cursor-pointer transition-all", importTab === 'lists' ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'bg-transparent text-muted-foreground hover:text-foreground')} onClick={() => setImportTab('lists')}>
                  <List size={12} className="inline mr-1.5" />Listes ({(lists || []).length})
                </button>
              </div>
              <div className="px-3 pt-3">
                <input type="text" placeholder="Rechercher..." className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary" value={importSearch} onChange={e => setImportSearch(e.target.value)} autoFocus />
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1" style={{ maxHeight: '45vh' }}>
                {importTab === 'notes' && (() => {
                  const filtered = (notes || []).filter(n => !importSearch || (n.title || '').toLowerCase().includes(importSearch.toLowerCase()) || (n.content || '').toLowerCase().includes(importSearch.toLowerCase()))
                  if (!filtered.length) return <div className="text-xs text-muted-foreground py-6 text-center">{importSearch ? 'Aucun résultat' : 'Aucune note'}</div>
                  return filtered.map(note => (
                    <button key={note.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left bg-transparent border-none cursor-pointer hover:bg-accent transition-colors w-full group" onClick={() => {
                      record()
                      const vp = getViewport()
                      const cx = (-vp.x + (reactFlowWrapper.current?.clientWidth || 400) / 2) / vp.zoom
                      const cy = (-vp.y + (reactFlowWrapper.current?.clientHeight || 300) / 2) / vp.zoom
                      const noteAtts = (attachments || []).filter(a => a.itemType === 'note' && a.itemId === note.id).map(a => ({ fileName: a.fileName, fileSize: a.fileSize, fileType: a.fileType, storagePath: a.storagePath }))
                      setNodes(prev => [...prev, {
                        id: `noteref_${Date.now()}`, type: 'noteRef',
                        position: { x: cx - 100, y: cy - 20 },
                        data: { noteId: note.id, noteTitle: note.title || 'Sans titre', noteContent: note.content || '', color: note.color || '#8b5cf6', attachments: noteAtts },
                        style: { width: 200, height: 'auto' },
                      }])
                      setHasUnsaved(true)
                      setShowImportPicker(false)
                    }}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: (note.color || '#8b5cf6') + '20' }}><StickyNote size={13} style={{ color: note.color || '#8b5cf6' }} /></div>
                      <span className="text-xs font-medium text-foreground truncate">{note.title || 'Sans titre'}</span>
                    </button>
                  ))
                })()}
                {importTab === 'lists' && (() => {
                  const filtered = (lists || []).filter(l => !importSearch || (l.name || '').toLowerCase().includes(importSearch.toLowerCase()))
                  if (!filtered.length) return <div className="text-xs text-muted-foreground py-6 text-center">{importSearch ? 'Aucun résultat' : 'Aucune liste'}</div>
                  return filtered.map(list => {
                    const taskCount = (allTodos || []).filter(t => t.listId === list.id).length
                    return (
                      <button key={list.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left bg-transparent border-none cursor-pointer hover:bg-accent transition-colors w-full group" onClick={() => {
                        record()
                        const vp = getViewport()
                        const cx = (-vp.x + (reactFlowWrapper.current?.clientWidth || 400) / 2) / vp.zoom
                        const cy = (-vp.y + (reactFlowWrapper.current?.clientHeight || 300) / 2) / vp.zoom
                        const listTasks = (allTodos || []).filter(t => t.listId === list.id)
                        const tasksSnapshot = listTasks.map(t => ({ id: t.id, text: t.text, status: t.status || 'todo', dueDate: t.dueDate || null }))
                        const listAtts = listTasks.flatMap(task => (attachments || []).filter(a => a.itemType === 'task' && a.itemId === task.id).map(a => ({ fileName: a.fileName, fileSize: a.fileSize, fileType: a.fileType, storagePath: a.storagePath, taskId: task.id, taskText: task.text })))
                        setNodes(prev => [...prev, {
                          id: `listref_${Date.now()}`, type: 'listRef',
                          position: { x: cx - 100, y: cy - 20 },
                          data: { listId: list.id, listName: list.name || 'Liste', listTaskCount: taskCount, tasks: tasksSnapshot, color: '#60a5fa', attachments: listAtts },
                          style: { width: 200, height: 'auto' },
                        }])
                        setHasUnsaved(true)
                        setShowImportPicker(false)
                      }}>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-blue-500/15"><List size={13} className="text-blue-400" /></div>
                        <span className="text-xs font-medium text-foreground truncate flex-1">{list.name || 'Sans nom'}</span>
                        <span className="text-[0.6rem] text-muted-foreground">{taskCount} tâche{taskCount !== 1 ? 's' : ''}</span>
                      </button>
                    )
                  })
                })()}
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Preview popup for noteRef / taskRef */}
        {previewItem && createPortal(
          <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setPreviewItem(null)}>
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-[480px] max-h-[70vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
              {previewItem.type === 'note' && (() => {
                const note = previewItem.data
                const color = note.color || '#8b5cf6'
                const noteAtts = (attachments || []).filter(a => a.itemType === 'note' && a.itemId === note.id)
                return (
                  <>
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-border" style={{ background: color + '10' }}>
                      <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: color + '25' }}><StickyNote size={13} style={{ color }} /></div>
                      <span className="text-sm font-semibold text-foreground flex-1 truncate">{note.title || 'Sans titre'}</span>
                      <button className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground bg-transparent border-none cursor-pointer" onClick={() => setPreviewItem(null)}><X size={14} /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto px-5 py-4 prose prose-sm prose-invert max-w-none text-sm text-foreground" style={{ maxHeight: '55vh' }} dangerouslySetInnerHTML={{ __html: note.content || '<p class="text-muted-foreground">Aucun contenu</p>' }} />
                    {noteAtts.length > 0 && (
                      <div className="px-4 py-3 border-t border-border flex flex-col gap-1.5">
                        <div className="text-[0.65rem] font-semibold text-muted-foreground flex items-center gap-1"><Paperclip size={10} />Pièces jointes ({noteAtts.length})</div>
                        {noteAtts.map(att => {
                          const href = isHtmlAtt(att) ? buildHtmlPreviewUrl(att.storagePath, att.fileName) : getAttachmentUrl(att.storagePath)
                          return (
                            <a key={att.id} href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-accent/50 hover:bg-accent transition-colors no-underline">
                              {att.fileType?.startsWith('image/') ? <ImageIcon size={12} className="text-emerald-400 shrink-0" /> : <File size={12} className="text-blue-400 shrink-0" />}
                              <span className="text-xs text-foreground truncate flex-1">{att.fileName}</span>
                              <span className="text-[0.55rem] text-muted-foreground shrink-0">{formatFileSize(att.fileSize)}</span>
                            </a>
                          )
                        })}
                      </div>
                    )}
                  </>
                )
              })()}
              {previewItem.type === 'list' && (() => {
                const list = previewItem.data
                const tasks = previewItem.tasks || []
                const doneCount = tasks.filter(t => t.status === 'done').length
                const STATUS_COLORS_MAP = { todo: '#a78bfa', doing: '#60a5fa', done: '#4ade80' }
                return (
                  <>
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-blue-500/5">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center bg-blue-500/20"><List size={13} className="text-blue-400" /></div>
                      <span className="text-sm font-semibold text-foreground flex-1 truncate">{list.name || 'Liste'}</span>
                      <span className="text-[0.65rem] text-muted-foreground">{doneCount}/{tasks.length} terminée{doneCount !== 1 ? 's' : ''}</span>
                      <button className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground bg-transparent border-none cursor-pointer" onClick={() => setPreviewItem(null)}><X size={14} /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-1" style={{ maxHeight: '55vh' }}>
                      {tasks.length === 0 && <div className="text-xs text-muted-foreground/50 py-4 text-center">Aucune tâche dans cette liste</div>}
                      {tasks.map(task => {
                        const sc = STATUS_COLORS_MAP[task.status] || '#a78bfa'
                        const taskAtts = (attachments || []).filter(a => a.itemType === 'task' && a.itemId === task.id)
                        return (
                          <div key={task.id} className="flex flex-col rounded-lg hover:bg-accent/50 transition-colors">
                            <div className="flex items-center gap-2 px-2 py-1.5">
                              <div className="w-4 h-4 rounded-full flex items-center justify-center border-2 shrink-0" style={{ background: sc + '20', borderColor: sc + '50', color: sc }}>
                                {task.status === 'done' ? <Check size={8} /> : task.status === 'doing' ? <Clock size={8} /> : null}
                              </div>
                              <span className={cn("text-xs flex-1 truncate", task.status === 'done' && 'line-through text-muted-foreground/50')}>{task.text}</span>
                              {taskAtts.length > 0 && <Paperclip size={10} className="text-muted-foreground/50 shrink-0" />}
                              {task.dueDate && <span className="text-[0.55rem] text-muted-foreground/50"><Calendar size={8} className="inline mr-0.5" />{new Date(task.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>}
                            </div>
                            {taskAtts.length > 0 && (
                              <div className="flex flex-wrap gap-1 px-8 pb-1.5">
                                {taskAtts.map(att => {
                                  const href = isHtmlAtt(att) ? buildHtmlPreviewUrl(att.storagePath, att.fileName) : getAttachmentUrl(att.storagePath)
                                  return (
                                    <a key={att.id} href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent/60 hover:bg-accent text-[0.6rem] text-foreground no-underline transition-colors">
                                      {att.fileType?.startsWith('image/') ? <ImageIcon size={9} className="text-emerald-400" /> : <File size={9} className="text-blue-400" />}
                                      <span className="truncate max-w-[120px]">{att.fileName}</span>
                                    </a>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </>
                )
              })()}
            </div>
          </div>,
          document.body
        )}

        {/* Label edit dialog */}
        {editingLabel && (
          <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/30" onClick={() => setEditingLabel(null)}>
            <div className="bg-card border border-border rounded-xl p-4 shadow-2xl min-w-[250px]" onClick={e => e.stopPropagation()}>
              <label className="text-xs font-semibold text-muted-foreground mb-2 block">Texte du noeud</label>
              <textarea autoFocus rows={editingNodeType === 'text' ? 5 : 2} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary resize-y min-h-[36px]"
                value={labelValue} onChange={e => setLabelValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitLabel(); if (e.key === 'Escape') setEditingLabel(null) }}
              />
              <p className="text-[0.6rem] text-muted-foreground mt-1">Ctrl+Entrée pour valider</p>
              <div className="flex justify-end gap-2 mt-3">
                <button className="px-3 py-1.5 rounded-lg text-xs bg-transparent border border-border text-foreground cursor-pointer hover:bg-accent" onClick={() => setEditingLabel(null)}>Annuler</button>
                <button className="px-3 py-1.5 rounded-lg text-xs bg-primary text-primary-foreground border-none cursor-pointer hover:opacity-90" onClick={submitLabel}>OK</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function DiagramEditor(props) {
  return (
    <ReactFlowProvider>
      <DiagramEditorInner {...props} />
    </ReactFlowProvider>
  )
}

// ============== BROWSER COMPONENT (list of diagrams + folders) ==============
export default function DiagramCanvas({
  diagrams, folders, setFolders,
  dbAddDiagram, dbUpdateDiagram, dbDeleteDiagram,
  dbAddFolder, dbDeleteFolder, dbUpdateFolder,
  createShareLink, logActivity,
  notes, allTodos, lists,
  attachments, getAttachmentUrl,
  urlDiagramId, urlFolderId, onNavigate,
  showUpgradeModal, showToast,
}) {
  const [viewMode, setViewMode] = useState('browser')
  const [selectedDiagramId, setSelectedDiagramId] = useState(null)
  const [currentFolderId, setCurrentFolderId] = useState(null)
  const [search, setSearch] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [cardMenu, setCardMenu] = useState(null)
  const [folderMenu, setFolderMenu] = useState(null)
  const [editingDiagramId, setEditingDiagramId] = useState(null)
  const [editDiagramName, setEditDiagramName] = useState('')
  const [editingFolderId, setEditingFolderId] = useState(null)
  const [editFolderName, setEditFolderName] = useState('')
  const { canCreateDiagram, plan, limits } = useSubscription()

  const diagramFolders = useMemo(() => folders.filter(f => f.type === 'diagram'), [folders])

  // URL-driven navigation
  useEffect(() => {
    if (urlDiagramId) {
      const d = diagrams.find(x => x.id === urlDiagramId)
      if (d) { setSelectedDiagramId(d.id); setViewMode('editor') }
    } else {
      if (viewMode === 'editor') { setViewMode('browser'); setSelectedDiagramId(null) }
    }
  }, [urlDiagramId, diagrams])

  useEffect(() => {
    if (urlFolderId) setCurrentFolderId(urlFolderId)
  }, [urlFolderId])

  const selectedDiagram = useMemo(() => diagrams.find(d => d.id === selectedDiagramId), [diagrams, selectedDiagramId])

  const filteredDiagrams = useMemo(() => {
    let d = diagrams
    if (currentFolderId) d = d.filter(x => x.folderId === currentFolderId)
    else d = d.filter(x => !x.folderId)
    if (search) d = d.filter(x => x.name.toLowerCase().includes(search.toLowerCase()))
    return d
  }, [diagrams, currentFolderId, search])

  const openDiagram = (id) => {
    setSelectedDiagramId(id)
    setViewMode('editor')
    onNavigate?.({ diagramId: id })
  }

  const backToBrowser = () => {
    setViewMode('browser')
    setSelectedDiagramId(null)
    onNavigate?.({})
  }

  const createDiagram = async () => {
    if (!canCreateDiagram(diagrams.length)) {
      showUpgradeModal?.(`Limite de ${limits.diagrams} schéma${limits.diagrams > 1 ? 's' : ''} atteinte sur le plan ${plan === 'free' ? 'Free' : plan === 'student' ? 'Étudiant' : 'Pro'}. Passez à l'offre supérieure pour créer plus de schémas.`)
      return
    }
    const data = await dbAddDiagram('Sans titre', currentFolderId)
    if (data) {
      logActivity?.('diagram_created', `Schéma créé : Sans titre`)
      openDiagram(data.id)
    }
  }

  const createFolder = async () => {
    if (!newFolderName.trim()) return
    const result = await dbAddFolder(newFolderName.trim(), 'diagram')
    if (!result) {
      showToast?.('Erreur lors de la création du dossier', 'error')
      return
    }
    setNewFolderName('')
    setShowNewFolder(false)
  }

  const renameDiagram = async (id) => {
    if (!editDiagramName.trim()) return
    await dbUpdateDiagram(id, { name: editDiagramName.trim() })
    setEditingDiagramId(null)
  }

  const renameFolder = async (id) => {
    if (!editFolderName.trim()) return
    await dbUpdateFolder(id, { name: editFolderName.trim() })
    setEditingFolderId(null)
  }

  const handleDeleteDiagram = async (id, name) => {
    await dbDeleteDiagram(id)
    logActivity?.('diagram_deleted', `Schéma supprimé : ${name}`)
    showToast?.('Schéma supprimé', 'info')
    setCardMenu(null)
  }

  // Click outside to close menus
  useEffect(() => {
    if (!cardMenu && !folderMenu) return
    const handler = () => { setCardMenu(null); setFolderMenu(null) }
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [cardMenu, folderMenu])

  // Editor mode
  if (viewMode === 'editor' && selectedDiagram) {
    return (
      <DiagramEditor
        diagram={selectedDiagram}
        onSave={(id, updates) => dbUpdateDiagram(id, updates)}
        onBack={backToBrowser}
        onRename={(id, name) => dbUpdateDiagram(id, { name })}
        createShareLink={createShareLink}
        notes={notes} allTodos={allTodos} lists={lists}
        attachments={attachments} getAttachmentUrl={getAttachmentUrl}
      />
    )
  }

  // Browser mode
  const currentFolderObj = diagramFolders.find(f => f.id === currentFolderId)
  const goToRoot = () => { setCurrentFolderId(null); onNavigate?.({}); setSearch('') }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto page-transition relative">
      <div className="px-4 sm:px-10 pt-8 sm:pt-14 pb-4 relative z-1">
        {/* Title */}
        <div className="flex items-center gap-5 mb-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white shadow-lg dash-header-icon" style={{ boxShadow: '0 8px 30px rgba(20,184,166,0.35), 0 0 50px rgba(20,184,166,0.12)' }}><PenTool size={24} /></div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">Mes Schémas</h1>
            <p className="text-sm text-muted-foreground mt-1.5">Créez des diagrammes, schémas et flowcharts visuels</p>
          </div>
        </div>

        {/* Actions bar */}
        <div className="flex items-center gap-4 mb-8 flex-wrap">
          <div className="flex items-center gap-3 px-5 py-2.5 bg-input border border-white/10 rounded-2xl text-muted-foreground transition-all duration-150 focus-within:border-teal-500 focus-within:shadow-[0_0_20px_rgba(20,184,166,0.15)]">
            <Search size={16} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="bg-transparent border-none text-foreground text-sm outline-none w-40" />
            {search && <button className="flex bg-transparent border-none text-muted-foreground cursor-pointer hover:text-foreground transition-colors duration-150" onClick={() => setSearch('')}><X size={14} /></button>}
          </div>
          <div className="flex-1" />
          {!currentFolderId && <button className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-white/[0.06] border border-white/10 rounded-2xl text-sm text-muted-foreground cursor-pointer transition-all duration-150 hover:text-foreground hover:bg-white/[0.12]" onClick={() => setShowNewFolder(!showNewFolder)}><FolderPlus size={16} /> <span className="max-sm:hidden">Dossier</span></button>}
          <button className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/25 border-none rounded-2xl text-sm cursor-pointer font-semibold btn-glow" onClick={createDiagram}><Plus size={16} /> <span className="max-sm:hidden">Nouveau schéma</span></button>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <button className="inline-flex items-center gap-1.5 bg-transparent border-none text-muted-foreground cursor-pointer text-sm hover:text-primary transition-colors duration-150" onClick={goToRoot}><PenTool size={14} /> Schémas</button>
          {currentFolderObj && <><ChevronRight size={13} className="text-muted-foreground/40" /><span className="inline-flex items-center gap-1.5 text-foreground font-medium"><Folder size={14} /> {currentFolderObj.name}</span></>}
        </div>
      </div>

      <div className="px-4 sm:px-10 pb-6 sm:pb-10 pt-4 flex-1">
        {showNewFolder && !currentFolderId && (
          <div className="flex items-center gap-2 mb-5 animate-slide-up">
            <input type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderName('') } }} placeholder="Nom du dossier..." autoFocus className="flex-1 px-4 py-2.5 bg-input border border-white/10 rounded-xl text-foreground text-sm outline-none focus:border-teal-500 focus:shadow-[0_0_20px_rgba(20,184,166,0.15)] glow-ring" />
            <button className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/25 border-none rounded-2xl text-sm cursor-pointer font-semibold disabled:opacity-40 btn-glow" onClick={createFolder} disabled={!newFolderName.trim()}>Créer</button>
            <button className="px-5 py-2.5 bg-white/[0.06] border border-white/10 rounded-2xl text-sm text-muted-foreground cursor-pointer hover:text-foreground hover:bg-white/[0.12] transition-colors duration-150" onClick={() => { setShowNewFolder(false); setNewFolderName('') }}>Annuler</button>
          </div>
        )}

        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-5 relative">
          {/* Folders */}
          {!currentFolderId && diagramFolders.map((f, i) => {
            const count = diagrams.filter(d => d.folderId === f.id).length
            return (
              <div key={f.id}
                className="relative flex flex-col items-center gap-4 p-7 bg-card/80 backdrop-blur-sm border border-white/10 rounded-2xl cursor-pointer card-hover card-gradient-hover group stagger-item transition-all duration-200"
                style={{ animationDelay: `${i * 0.04}s` }}
                onClick={() => { setCurrentFolderId(f.id); onNavigate?.({ folderId: f.id }) }}
              >
                <div className="w-16 h-16 rounded-2xl bg-teal-500/15 flex items-center justify-center text-teal-400 group-hover:bg-teal-500/25 transition-colors duration-150 shadow-sm"><Folder size={30} /></div>
                {editingFolderId === f.id ? (
                  <input className="w-full text-center px-2 py-1 bg-input border border-teal-500 rounded-lg text-foreground text-sm outline-none" value={editFolderName} onChange={e => setEditFolderName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') renameFolder(f.id); if (e.key === 'Escape') setEditingFolderId(null) }} onBlur={() => renameFolder(f.id)} onClick={e => e.stopPropagation()} autoFocus />
                ) : (
                  <span className="text-sm font-semibold text-center">{f.name}</span>
                )}
                <span className="text-xs text-muted-foreground">{count} schéma{count !== 1 ? 's' : ''}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 max-md:opacity-100 transition-opacity duration-150 absolute top-3 right-3">
                  <div className="relative">
                    <button className="flex bg-transparent border-none text-muted-foreground/40 cursor-pointer p-1.5 rounded-lg hover:text-foreground hover:bg-white/[0.08] transition-colors duration-150" onClick={e => { e.stopPropagation(); setFolderMenu(folderMenu === f.id ? null : f.id) }}><MoreHorizontal size={15} /></button>
                    {folderMenu === f.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={e => { e.stopPropagation(); setFolderMenu(null) }} />
                        <div className="absolute right-0 top-full mt-1 w-40 bg-card/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden z-50 py-1" style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}>
                          <button className="w-full flex items-center gap-2.5 px-3 py-2 bg-transparent border-none text-sm text-muted-foreground cursor-pointer hover:bg-white/[0.06] hover:text-foreground transition-colors text-left" onClick={e => { e.stopPropagation(); setEditingFolderId(f.id); setEditFolderName(f.name); setFolderMenu(null) }}>
                            <Type size={14} /> Renommer
                          </button>
                          <button className="w-full flex items-center gap-2.5 px-3 py-2 bg-transparent border-none text-sm text-destructive cursor-pointer hover:bg-destructive/10 transition-colors text-left" onClick={e => { e.stopPropagation(); dbDeleteFolder(f.id, 'diagram'); setFolderMenu(null) }}>
                            <Trash2 size={14} /> Supprimer
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Diagram cards */}
          {filteredDiagrams.map((d, i) => {
            const cardIdx = (!currentFolderId ? diagramFolders.length : 0) + i
            return (
              <div key={d.id}
                className="relative flex flex-col items-center gap-4 p-7 bg-card/80 backdrop-blur-sm border border-white/10 rounded-2xl cursor-pointer card-hover card-gradient-hover group stagger-item transition-all duration-200 overflow-hidden"
                style={{ animationDelay: `${cardIdx * 0.04}s` }}
                onClick={() => openDiagram(d.id)}
              >
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center transition-colors duration-150 shadow-sm bg-white/[0.04] text-muted-foreground">
                  <PenTool size={30} />
                </div>
                {editingDiagramId === d.id ? (
                  <input className="w-full text-center px-2 py-1 bg-input border border-teal-500 rounded-lg text-foreground text-sm outline-none" value={editDiagramName} onChange={e => setEditDiagramName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') renameDiagram(d.id); if (e.key === 'Escape') setEditingDiagramId(null) }} onBlur={() => renameDiagram(d.id)} onClick={e => e.stopPropagation()} autoFocus />
                ) : (
                  <span className="text-sm font-semibold text-center">{d.name}</span>
                )}
                <span className="text-xs text-muted-foreground">{d.data?.nodes?.length || 0} éléments</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 max-md:opacity-100 transition-opacity duration-150 absolute top-3 right-3">
                  <div className="relative">
                    <button className="flex bg-transparent border-none text-muted-foreground/40 cursor-pointer p-1.5 rounded-lg hover:text-foreground hover:bg-white/[0.08] transition-colors duration-150" onClick={e => { e.stopPropagation(); setCardMenu(cardMenu === d.id ? null : d.id) }}><MoreHorizontal size={15} /></button>
                    {cardMenu === d.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={e => { e.stopPropagation(); setCardMenu(null) }} />
                        <div className="absolute right-0 top-full mt-1 w-44 bg-card/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden z-50 py-1" style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}>
                          <button className="w-full flex items-center gap-2.5 px-3 py-2 bg-transparent border-none text-sm text-muted-foreground cursor-pointer hover:bg-white/[0.06] hover:text-foreground transition-colors text-left" onClick={e => { e.stopPropagation(); setEditingDiagramId(d.id); setEditDiagramName(d.name); setCardMenu(null) }}>
                            <Type size={14} /> Renommer
                          </button>
                          <ShareButton itemType="diagram" itemId={d.id} itemName={d.name} createShareLink={createShareLink} className="w-full flex items-center gap-2.5 px-3 py-2 bg-transparent border-none text-sm text-muted-foreground cursor-pointer hover:bg-white/[0.06] hover:text-foreground transition-colors text-left" />
                          <button className="w-full flex items-center gap-2.5 px-3 py-2 bg-transparent border-none text-sm text-destructive cursor-pointer hover:bg-destructive/10 transition-colors text-left" onClick={e => { e.stopPropagation(); handleDeleteDiagram(d.id, d.name) }}>
                            <Trash2 size={14} /> Supprimer
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Empty state */}
        {filteredDiagrams.length === 0 && (!currentFolderId ? diagramFolders.length === 0 : true) && (
          <div className="flex flex-col items-center justify-center gap-4 py-24">
            <div className="w-20 h-20 rounded-2xl bg-primary/5 flex items-center justify-center empty-icon"><PenTool size={40} /></div>
            <div className="text-center">
              <p className="text-lg font-medium text-muted-foreground mb-1">{currentFolderId ? 'Dossier vide' : 'Aucun schéma'}</p>
              <p className="text-sm text-muted-foreground/60 mb-4">Créez votre premier schéma pour visualiser vos idées</p>
              <button className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/25 border-none rounded-2xl text-sm cursor-pointer font-semibold btn-glow" onClick={createDiagram}>
                <Plus size={15} /> Créer un schéma
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
