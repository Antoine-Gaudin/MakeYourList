import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Plus, Trash2, Calendar, X, Check, Circle, Clock,
  Star, Columns3, MoreHorizontal, Eye, EyeOff,
  Search, Filter, StickyNote,
  AlertCircle, CheckSquare, Edit3,
  FolderOpen, FolderPlus, Folder, ChevronRight, Import, ListChecks,
  ArrowLeft, LayoutGrid, Link2, Unlink, Download, Share2, FileText
} from 'lucide-react'
import { cn } from '../lib/utils'
import ShareButton from './ShareButton'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useProject } from '../contexts/ProjectContext'
import { PRIORITIES, TAG_COLORS } from '../lib/constants'

const DEFAULT_COLUMNS = [
  { id: 'todo', label: 'A faire', color: '#a78bfa' },
  { id: 'doing', label: 'En cours', color: '#60a5fa' },
  { id: 'done', label: 'Terminee', color: '#4ade80' },
]

const COLUMN_COLORS = ['#a78bfa', '#60a5fa', '#4ade80', '#f87171', '#facc15', '#fb923c', '#2dd4bf', '#c084fc', '#f472b6', '#94a3b8']

const NOTE_COLORS = ['#8b5cf6', '#f87171', '#4ade80', '#facc15', '#60a5fa', '#c084fc', '#fb923c', '#2dd4bf']

// Map kanban column IDs to task statuses (built-in columns map directly)
const BUILTIN_STATUS = { todo: 'todo', doing: 'doing', done: 'done' }

function KanbanBoard({ lists, allTodos, setAllTodos, notes, setNotes,
  dbUpdateTodo, dbAddTodo, dbUpdateNote, dbAddNote, dbDeleteTodo, dbDeleteNote,
  kanbanBoards, dbAddKanbanBoard, dbUpdateKanbanBoard, dbDeleteKanbanBoard,
  kanbanFolders, dbAddFolder, dbDeleteFolder,
  createShareLink, logActivity,
  urlBoardId, onNavigate, showUpgradeModal, showToast }) {
  const { canCreateKanbanBoard, plan, limits, isFree } = useSubscription()
  const { myRole } = useProject()
  const canEdit = myRole === 'owner' || myRole === 'editor'
  // Folder navigation state
  const [currentFolderId, setCurrentFolderId] = useState(null)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  // Browser / board view state
  const [viewMode, setViewMode] = useState('browser') // 'browser' | 'board'
  const [selectedBoardId, setSelectedBoardId] = useState(null)
  const [showNewBoard, setShowNewBoard] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const [editingBoardId, setEditingBoardId] = useState(null)
  const [editBoardName, setEditBoardName] = useState('')

  const [columns, setColumns] = useState(DEFAULT_COLUMNS)
  const columnsInitRef = useRef(false)
  const columnsTimerRef = useRef(null)
  const [dragItem, setDragItem] = useState(null)
  const [dragOverCol, setDragOverCol] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)
  const [addingIn, setAddingIn] = useState(null)
  const [newText, setNewText] = useState('')
  const [newPriority, setNewPriority] = useState('medium')
  const [newList, setNewList] = useState(null)
  const [newNoteColor, setNewNoteColor] = useState('#8b5cf6')
  const [collapsed, setCollapsed] = useState({})
  const [cardMenu, setCardMenu] = useState(null)
  const [lastDroppedId, setLastDroppedId] = useState(null)
  const [compact, setCompact] = useState(false)
  const [showKanbanExportMenu, setShowKanbanExportMenu] = useState(false)
  const [shareUrl, setShareUrl] = useState(null)
  const [shareLoading, setShareLoading] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [showSharePopup, setShowSharePopup] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterList, setFilterList] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [openCardId, setOpenCardId] = useState(null)
  const [openCardType, setOpenCardType] = useState(null)
  // Column management
  const [showAddColumn, setShowAddColumn] = useState(false)
  const [newColName, setNewColName] = useState('')
  const [newColColor, setNewColColor] = useState('#94a3b8')
  const [editingCol, setEditingCol] = useState(null)
  const [editColName, setEditColName] = useState('')
  const [editColColor, setEditColColor] = useState('')
  const [dragCol, setDragCol] = useState(null)
  const [dragOverColId, setDragOverColId] = useState(null)
  // Import modal
  const [importModal, setImportModal] = useState(null) // { colId } when open
  const [importTab, setImportTab] = useState('tasks') // 'tasks' | 'notes'
  const [importSearch, setImportSearch] = useState('')
  const [expandedList, setExpandedList] = useState(null) // listId when a folder is open
  // Link note picker
  const [linkPicker, setLinkPicker] = useState(null) // taskId when open
  const [linkSearch, setLinkSearch] = useState('')
  // Link task picker (for notes)
  const [taskLinkPicker, setTaskLinkPicker] = useState(null) // noteId when open
  const [taskLinkSearch, setTaskLinkSearch] = useState('')
  // Drag-drop link target (task dragged onto note or vice versa)
  const [dropLinkTarget, setDropLinkTarget] = useState(null) // { id, type } of hovered card

  // Touch DnD support
  const touchDragRef = useRef(null)

  const handleTouchStart = useCallback((e, item) => {
    const touch = e.touches[0]
    touchDragRef.current = { item, startX: touch.clientX, startY: touch.clientY, moved: false }
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (!touchDragRef.current) return
    const touch = e.touches[0]
    const dx = touch.clientX - touchDragRef.current.startX
    const dy = touch.clientY - touchDragRef.current.startY
    if (!touchDragRef.current.moved && Math.abs(dx) + Math.abs(dy) > 10) {
      touchDragRef.current.moved = true
      setDragItem(touchDragRef.current.item)
      setCardMenu(null)
    }
    if (!touchDragRef.current.moved) return
    e.preventDefault()
    const el = document.elementFromPoint(touch.clientX, touch.clientY)
    const col = el?.closest('[data-col-id]')
    if (col) setDragOverCol(col.dataset.colId)
    // Detect cross-type card under finger
    const card = el?.closest('[data-card-id]')
    if (card && touchDragRef.current.item) {
      const cardType = card.dataset.cardType
      const cardId = card.dataset.cardId
      if (cardType && cardId && cardType !== touchDragRef.current.item.type) {
        touchDragRef.current.crossTarget = { type: cardType, id: cardId }
        setDropLinkTarget({ id: cardId, type: cardType })
        return
      }
    }
    touchDragRef.current.crossTarget = null
    setDropLinkTarget(null)
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (!touchDragRef.current?.moved || !dragItem) {
      resetDrag()
      touchDragRef.current = null
      return
    }
    // Cross-type touch drop → link
    const cross = touchDragRef.current.crossTarget
    if (cross && dragItem.type !== cross.type) {
      const taskId = dragItem.type === 'task' ? dragItem.id : cross.id
      const noteId = dragItem.type === 'note' ? dragItem.id : cross.id
      const task = allTodos.find(t => t.id === taskId)
      const note = notes.find(n => n.id === noteId)
      if (task && note && canEdit) {
        updateTask(taskId, { linkedNoteId: noteId })
        logActivity('task_link', `Note "${note.title || 'Sans titre'}" liee a "${task.text || ''}"`)
        if (showToast) showToast(`Tâche liée à la note "${note.title || 'Sans titre'}"`)
      }
      setLastDroppedId(dragItem.id); setTimeout(() => setLastDroppedId(null), 400)
      resetDrag()
      touchDragRef.current = null
      return
    }
    // Normal column drop
    if (!dragOverCol) { resetDrag(); touchDragRef.current = null; return }
    const fakeEvent = { preventDefault() {}, stopPropagation() {} }
    handleDrop(fakeEvent, dragOverCol)
    touchDragRef.current = null
  }, [dragItem, dragOverCol, allTodos, notes, canEdit])

  // === Board browser helpers ===
  const selectedBoard = (kanbanBoards || []).find(b => b.id === selectedBoardId)
  const openBoard = (id) => {
    setSelectedBoardId(id)
    setViewMode('board')
    const board = (kanbanBoards || []).find(b => b.id === id)
    if (board && board.columns && board.columns.length > 0) {
      setColumns(board.columns)
    } else {
      setColumns(DEFAULT_COLUMNS)
    }
    if (onNavigate) onNavigate({ boardId: id })
  }
  const goToBrowser = () => { setViewMode('browser'); setOpenCardId(null); setOpenCardType(null); if (onNavigate) onNavigate({}) }

  // Sync URL state to component state
  useEffect(() => {
    if (urlBoardId) {
      if (urlBoardId !== selectedBoardId) {
        const board = (kanbanBoards || []).find(b => b.id === urlBoardId)
        if (board) {
          setSelectedBoardId(urlBoardId)
          setViewMode('board')
          setColumns(board.columns?.length > 0 ? board.columns : DEFAULT_COLUMNS)
        }
      }
    } else {
      setViewMode('browser')
      setSelectedBoardId(null)
    }
  }, [urlBoardId])

  // Persist columns to DB when they change (board view only, skip initial mount, debounced)
  useEffect(() => {
    if (selectedBoardId && columns.length > 0 && viewMode === 'board') {
      if (!columnsInitRef.current) { columnsInitRef.current = true; return }
      clearTimeout(columnsTimerRef.current)
      columnsTimerRef.current = setTimeout(() => {
        dbUpdateKanbanBoard(selectedBoardId, { columns })
      }, 400)
    } else {
      columnsInitRef.current = false
    }
    return () => clearTimeout(columnsTimerRef.current)
  }, [columns])

  // Board CRUD
  const createBoard = async () => {
    if (!canEdit || !newBoardName.trim()) return
    if (!canCreateKanbanBoard(kanbanBoards.length)) {
      showUpgradeModal?.(`Limite de ${limits.kanbanBoards} tableau${limits.kanbanBoards > 1 ? 'x' : ''} Kanban atteinte sur le plan ${plan === 'free' ? 'Free' : plan === 'student' ? 'Étudiant' : 'Pro'}.`)
      return
    }
    const data = await dbAddKanbanBoard(newBoardName.trim(), null)
    if (data) {
      setNewBoardName('')
      setShowNewBoard(false)
    }
  }
  const renameBoard = async (id) => {
    if (!canEdit || !editBoardName.trim()) { setEditingBoardId(null); return }
    await dbUpdateKanbanBoard(id, { name: editBoardName.trim() })
    setEditingBoardId(null)
    setEditBoardName('')
  }
  const deleteBoard = async (id) => {
    if (!canEdit) return
    if (!window.confirm('Supprimer ce board ? Les cartes seront retirées du kanban.')) return
    // Reset orphaned tasks and notes before deleting the board
    allTodos.filter(t => t.onKanban && t.kanbanBoardId === id).forEach(t => updateTask(t.id, { onKanban: false, kanbanCol: undefined, kanbanBoardId: null }))
    notes.filter(n => n.kanbanStatus && n.kanbanBoardId === id).forEach(n => updateNote(n.id, { kanbanStatus: undefined, kanbanBoardId: null }))
    await dbDeleteKanbanBoard(id)
    if (selectedBoardId === id) { setSelectedBoardId(null); setViewMode('browser') }
  }

  // Folder CRUD & navigation
  const createFolder = async () => {
    if (!canEdit || !newFolderName.trim()) return
    if (dbAddFolder) await dbAddFolder(newFolderName.trim(), 'kanban')
    setNewFolderName('')
    setShowNewFolder(false)
  }
  const enterFolder = (folderId) => { setCurrentFolderId(folderId) }
  const goToRoot = () => { setCurrentFolderId(null) }

  useEffect(() => {
    const keyHandler = (e) => {
      if (e.key === 'Escape') {
        if (linkPicker) { setLinkPicker(null); setLinkSearch(''); return }
        if (importModal) { setImportModal(null); return }
        if (addingIn) { setAddingIn(null); setNewText(''); return }
        if (cardMenu) { setCardMenu(null); return }
        if (editingCol) { setEditingCol(null); return }
        if (openCardId) { setOpenCardId(null); setOpenCardType(null); return }
      }
    }
    const clickHandler = () => { if (cardMenu) setCardMenu(null) }
    window.addEventListener('keydown', keyHandler)
    window.addEventListener('click', clickHandler)
    return () => { window.removeEventListener('keydown', keyHandler); window.removeEventListener('click', clickHandler) }
  }, [cardMenu, addingIn, openCardId, editingCol])

  // Helpers
  const updateTask = (id, updates) => { if (!canEdit) return; dbUpdateTodo(id, updates) }
  const deleteTask = (id) => { if (!canEdit) return; dbDeleteTodo(id) }
  const cycleStatus = (id) => {
    if (!canEdit) return
    const task = allTodos.find(t => t.id === id)
    const builtinCols = columns.filter(c => BUILTIN_STATUS[c.id])
    const idx = builtinCols.findIndex(c => c.id === task.status)
    const next = builtinCols[(idx + 1) % builtinCols.length]?.id || 'todo'
    updateTask(id, { status: next })
    // status cycled
  }
  const isOverdue = (d) => d && new Date(d) < new Date(new Date().toDateString())
  const updateNote = (id, updates) => { if (!canEdit) return; dbUpdateNote(id, updates) }
  const deleteNote = (id) => { if (!canEdit) return; dbDeleteNote(id) }

  // Get column ID for a task (only if explicitly on kanban)
  const getTaskCol = (t) => t.onKanban ? (t.kanbanCol || t.status || 'todo') : null
  const getNoteCol = (n) => n.kanbanStatus

  // Build set of note IDs linked to tasks (to hide them from standalone note cards)
  const linkedNoteIds = new Set(allTodos.filter(t => t.linkedNoteId).map(t => t.linkedNoteId))

  // Build cards for a column
  const buildCards = (colId) => {
    const cards = []
    if (filterType !== 'notes') {
      allTodos.forEach(t => {
        if (!t.onKanban) return
        if (selectedBoardId && t.kanbanBoardId !== selectedBoardId) return
        if (getTaskCol(t) !== colId) return
        if (filterList !== 'all' && t.listId !== filterList) return
        if (search) {
          const q = search.toLowerCase()
          if (!t.text.toLowerCase().includes(q) && !(t.notes || '').toLowerCase().includes(q) && !(t.tags || []).some(tag => tag.toLowerCase().includes(q))) return
        }
        cards.push({ id: t.id, type: 'task', data: t, linkedNote: t.linkedNoteId ? notes.find(n => n.id === t.linkedNoteId) : null })
      })
    }
    if (filterType !== 'tasks') {
      notes.forEach(n => {
        if (linkedNoteIds.has(n.id)) return // hide notes already linked to a task
        if (selectedBoardId && n.kanbanBoardId !== selectedBoardId) return
        if (getNoteCol(n) !== colId) return
        if (search) {
          const q = search.toLowerCase()
          if (!(n.title || '').toLowerCase().includes(q) && !(n.content || '').toLowerCase().includes(q)) return
        }
        cards.push({ id: n.id, type: 'note', data: n })
      })
    }
    return cards
  }

  // Drag & Drop
  const handleCardDragOver = (e, colId, index, cardType, cardId) => {
    e.preventDefault(); e.stopPropagation()
    // Cross-type: task over note or note over task → link mode
    if (dragItem && cardType && dragItem.type !== cardType && dragItem.id !== cardId) {
      setDropLinkTarget({ id: cardId, type: cardType })
      setDropTarget(null)
      return
    }
    setDropLinkTarget(null)
    const rect = e.currentTarget.getBoundingClientRect()
    const insertIndex = e.clientY < rect.top + rect.height / 2 ? index : index + 1
    setDropTarget({ colId, index: insertIndex })
    setDragOverCol(colId)
  }
  const handleCardDrop = (e, cardType, cardId) => {
    e.preventDefault(); e.stopPropagation()
    if (!canEdit || !dragItem) { resetDrag(); return }
    // Cross-type drop: link task ↔ note
    if (dragItem.type !== cardType) {
      const taskId = dragItem.type === 'task' ? dragItem.id : cardId
      const noteId = dragItem.type === 'note' ? dragItem.id : cardId
      const task = allTodos.find(t => t.id === taskId)
      const note = notes.find(n => n.id === noteId)
      if (task && note) {
        updateTask(taskId, { linkedNoteId: noteId })
        logActivity('task_link', `Note "${note.title || 'Sans titre'}" liee a "${task.text || ''}"`)
        if (showToast) showToast(`Tâche liée à la note "${note.title || 'Sans titre'}"`)
      }
      setLastDroppedId(dragItem.id); setTimeout(() => setLastDroppedId(null), 400)
      resetDrag()
      return
    }
    // Same type: just reorder in column
    resetDrag()
  }
  const handleDrop = (e, colId) => {
    e.preventDefault(); e.stopPropagation()
    if (!canEdit || !dragItem) { resetDrag(); return }
    if (dragItem.type === 'task') {
      const isBuiltin = !!BUILTIN_STATUS[colId]
      updateTask(dragItem.id, isBuiltin ? { status: colId, kanbanCol: undefined } : { kanbanCol: colId })
      const task = allTodos.find(t => t.id === dragItem.id)
      // card dropped
    } else {
      updateNote(dragItem.id, { kanbanStatus: colId })
    }
    setLastDroppedId(dragItem.id); setTimeout(() => setLastDroppedId(null), 400)
    resetDrag()
  }
  const resetDrag = () => { setDragItem(null); setDragOverCol(null); setDropTarget(null); setDropLinkTarget(null) }

  // Add new card
  const addCard = async (colId) => {
    if (!canEdit || !newText.trim()) return
    try {
      if (addingIn?.mode === 'new-task') {
        const listId = newList || lists[0]?.id
        if (!listId) {
          showToast?.('Creez d\'abord une liste dans la section Taches')
          return
        }
        const isBuiltin = !!BUILTIN_STATUS[colId]
        const newTodo = { listId, text: newText.trim(), status: isBuiltin ? colId : 'todo', priority: newPriority, dueDate: null, notes: '', tags: [], starred: false, onKanban: true, kanbanCol: isBuiltin ? null : colId, kanbanBoardId: selectedBoardId }
        const data = await dbAddTodo(newTodo)
        if (!data) {
          showToast?.('Erreur lors de la creation de la tache')
          return
        }
        setLastDroppedId(data.id)
      } else {
        const newNote = { title: newText.trim(), content: '', color: newNoteColor, folder: 'all', pinned: false, starred: false, kanbanStatus: colId, kanbanBoardId: selectedBoardId }
        const created = await dbAddNote(newNote)
        if (!created) {
          showToast?.('Erreur lors de la creation de la note')
          return
        }
        setLastDroppedId(created.id)
      }
      setNewText(''); setNewPriority('medium')
      setTimeout(() => setLastDroppedId(null), 400)
    } catch (err) {
      console.error('addCard error:', err)
      showToast?.('Erreur lors de la creation')
    }
  }

  const moveToColumn = (cardId, cardType, newColId) => {
    if (!canEdit) return
    if (cardType === 'task') {
      const isBuiltin = !!BUILTIN_STATUS[newColId]
      updateTask(cardId, isBuiltin ? { status: newColId, kanbanCol: undefined } : { kanbanCol: newColId })
    } else {
      updateNote(cardId, { kanbanStatus: newColId })
    }
    setCardMenu(null)
  }

  const removeFromKanban = (noteId) => { if (!canEdit) return; updateNote(noteId, { kanbanStatus: undefined }); setCardMenu(null) }
  const removeTaskFromKanban = (taskId) => { if (!canEdit) return; updateTask(taskId, { onKanban: false, kanbanCol: undefined }); setCardMenu(null) }

  // Link / unlink note helpers
  const linkNote = (taskId, noteId) => { if (!canEdit) return; updateTask(taskId, { linkedNoteId: noteId }); setLinkPicker(null); setLinkSearch('') }
  const unlinkNote = (taskId) => { if (!canEdit) return; const task = allTodos.find(t => t.id === taskId); const note = task?.linkedNoteId ? notes.find(n => n.id === task.linkedNoteId) : null; updateTask(taskId, { linkedNoteId: null }); logActivity('task_unlink', `Note "${note?.title || 'Sans titre'}" deliee de "${task?.text || ''}"`) }

  // Column management
  const addColumn = () => {
    if (!canEdit || !newColName.trim()) return
    const id = `col-${Date.now()}`
    setColumns([...columns, { id, label: newColName.trim(), color: newColColor }])
    setNewColName(''); setShowAddColumn(false)
  }
  const deleteColumn = (colId) => {
    if (!canEdit) return
    // Move items back: tasks to todo, notes remove kanbanStatus
    allTodos.filter(t => getTaskCol(t) === colId).forEach(t => updateTask(t.id, { status: 'todo', kanbanCol: undefined }))
    notes.filter(n => getNoteCol(n) === colId).forEach(n => updateNote(n.id, { kanbanStatus: undefined }))
    setColumns(columns.filter(c => c.id !== colId))
    setEditingCol(null)
  }
  const saveColumnEdit = () => {
    if (!editColName.trim()) { setEditingCol(null); return }
    setColumns(columns.map(c => c.id === editingCol ? { ...c, label: editColName.trim(), color: editColColor } : c))
    setEditingCol(null)
  }
  const handleColDragStart = (e, colId) => { setDragCol(colId); e.dataTransfer.effectAllowed = 'move' }
  const handleColDragOver = (e, colId) => { e.preventDefault(); if (dragCol && dragCol !== colId) setDragOverColId(colId) }
  const handleColDrop = (e, colId) => {
    e.preventDefault()
    if (!dragCol || dragCol === colId) { setDragCol(null); setDragOverColId(null); return }
    const arr = [...columns]
    const from = arr.findIndex(c => c.id === dragCol)
    const to = arr.findIndex(c => c.id === colId)
    const [moved] = arr.splice(from, 1)
    arr.splice(to, 0, moved)
    setColumns(arr); setDragCol(null); setDragOverColId(null)
  }

  // Counts (scoped to selected board)
  const kanbanTasks = allTodos.filter(t => t.onKanban && (!selectedBoardId || t.kanbanBoardId === selectedBoardId))
  const totalTasks = kanbanTasks.length
  const doneTasks = kanbanTasks.filter(t => t.status === 'done').length
  const kanbanNotes = notes.filter(n => n.kanbanStatus && (!selectedBoardId || n.kanbanBoardId === selectedBoardId))
  const totalItems = totalTasks + kanbanNotes.length
  const doneItems = doneTasks + kanbanNotes.filter(n => n.kanbanStatus === 'done').length
  const pct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0

  // === Kanban Export / Share ===
  const buildKanbanExportHtml = (board, cols, forPrint = false) => {
    const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    const printOverride = forPrint ? `
      body { background: #fff !important; color: #1a1a1a !important; }
      .col-card { background: #f8fafc !important; border-color: #e2e8f0 !important; }
      h1.title { color: #0f172a !important; }
      .meta, .stat-label { color: #64748b !important; }
      .stat-value { color: #0f172a !important; }
      .progress-track { background: #e2e8f0 !important; }
      .item-card { background: #fff !important; border-color: #e2e8f0 !important; }
      .item-text { color: #1e293b !important; }
      .footer { color: #94a3b8 !important; border-color: #e2e8f0 !important; }
      .footer a { color: #6d28d9 !important; }
    ` : ''

    const colsHtml = cols.map(col => {
      const colTasks = kanbanTasks.filter(t => {
        const cId = BUILTIN_STATUS[col.id] ? (t.status === col.id ? col.id : null) : (t.kanbanColumn === col.id ? col.id : null)
        return cId === col.id
      })
      const colNotes = kanbanNotes.filter(n => {
        if (BUILTIN_STATUS[col.id]) return n.kanbanStatus === col.id
        return n.kanbanColumn === col.id
      })
      const colCount = colTasks.length + colNotes.length

      const itemsHtml = [
        ...colTasks.map(t => {
          const prioConfig = t.priority === 'high' ? { color: '#ef4444', label: 'Haute' } : t.priority === 'low' ? { color: '#22c55e', label: 'Basse' } : null
          const subtasks = t.subtasks || []
          const subsDone = subtasks.filter(s => s.done).length
          const tags = t.tags || []
          const isOverdue = t.dueDate && t.status !== 'done' && new Date(t.dueDate) < new Date(new Date().toDateString())
          const prioHtml = prioConfig ? `<span class="badge" style="background:${prioConfig.color}14;color:${prioConfig.color}">${prioConfig.label}</span>` : ''
          const dateHtml = t.dueDate ? `<span class="badge${isOverdue ? ' overdue' : ''}">${new Date(t.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>` : ''
          const tagsHtml = tags.map(tag => `<span class="badge tag">${tag}</span>`).join('')
          const subsHtml = subtasks.length > 0 ? `<span class="badge">${subsDone}/${subtasks.length} sous-tâches</span>` : ''
          const notesHtml = t.notes ? `<p class="item-note">${t.notes}</p>` : ''
          return `<div class="item-card task-card">
            <div class="item-type-badge task-type">Tâche</div>
            <p class="item-text${t.status === 'done' ? ' done' : ''}">${t.starred ? '<span class="star">★</span> ' : ''}${t.text}</p>
            <div class="item-badges">${prioHtml}${dateHtml}${subsHtml}${tagsHtml}</div>
            ${notesHtml}
          </div>`
        }),
        ...colNotes.map(n => {
          return `<div class="item-card note-card" style="border-left-color:${n.color || '#8b5cf6'}">
            <div class="item-type-badge note-type">Note</div>
            <p class="item-text">${n.title || 'Sans titre'}</p>
            ${n.content ? `<p class="item-note">${n.content.substring(0, 120)}${n.content.length > 120 ? '…' : ''}</p>` : ''}
          </div>`
        })
      ].join('')

      return `<div class="col-card">
        <div class="col-header">
          <span class="col-dot" style="background:${col.color}"></span>
          <span class="col-name">${col.label}</span>
          <span class="col-count">${colCount}</span>
        </div>
        <div class="col-items">${itemsHtml || '<p class="empty-col">Aucun élément</p>'}</div>
      </div>`
    }).join('')

    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${board?.name || 'Kanban'} — Make Your List</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, sans-serif; background: #09090b; color: #e4e4e7; line-height: 1.6; min-height: 100vh; }
  .page { max-width: 1100px; margin: 0 auto; padding: 56px 36px 40px; }
  .badge-brand {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 14px; border-radius: 20px;
    font-size: 10px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase;
    background: linear-gradient(135deg, #7c3aed20, #8b5cf615);
    color: #a78bfa; text-decoration: none;
    border: 1px solid #7c3aed25; margin-bottom: 20px;
  }
  .badge-brand::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #8b5cf6; box-shadow: 0 0 8px #8b5cf680; }
  h1.title { font-size: 32px; font-weight: 800; color: #fafafa; letter-spacing: -0.8px; margin-bottom: 16px; }
  .stats-row { display: flex; align-items: center; gap: 20px; margin-bottom: 16px; flex-wrap: wrap; }
  .stat-big { display: flex; align-items: baseline; gap: 6px; }
  .stat-value { font-size: 28px; font-weight: 800; color: #fafafa; }
  .stat-label { font-size: 13px; color: #71717a; font-weight: 500; }
  .stat-pills { display: flex; gap: 10px; }
  .stat-pill { display: flex; align-items: center; gap: 5px; font-size: 11px; color: #a1a1aa; font-weight: 500; }
  .stat-dot { width: 7px; height: 7px; border-radius: 50%; }
  .progress-track { width: 100%; height: 10px; background: #18181b; border-radius: 10px; overflow: hidden; border: 1px solid #27272a; }
  .progress-fill { height: 100%; border-radius: 10px; background: linear-gradient(90deg, #7c3aed, #8b5cf6, #a78bfa); transition: width 0.5s ease; }
  .divider { height: 1px; background: linear-gradient(90deg, transparent, #27272a, transparent); margin: 28px 0 32px; }

  .columns-grid { display: grid; grid-template-columns: repeat(${cols.length}, 1fr); gap: 16px; }
  @media (max-width: 768px) { .columns-grid { grid-template-columns: 1fr; } }


  .col-card {
    background: rgba(255,255,255,0.02); border: 1px solid #ffffff0a; border-radius: 16px;
    padding: 16px; min-height: 200px;
  }
  .col-header { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #ffffff08; }
  .col-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .col-name { font-size: 14px; font-weight: 700; color: #fafafa; flex: 1; }
  .col-count { font-size: 11px; color: #71717a; background: #ffffff0a; padding: 2px 8px; border-radius: 8px; font-weight: 600; }

  .item-card { padding: 12px; margin-bottom: 8px; border: 1px solid #ffffff0a; border-radius: 12px; background: rgba(255,255,255,0.015); border-left: 3px solid #ffffff10; }
  .item-card:hover { background: rgba(255,255,255,0.03); }
  .task-card { border-left-color: #a78bfa40; }
  .note-card { border-left-color: #60a5fa40; }
  .item-type-badge { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
  .task-type { color: #a78bfa; }
  .note-type { color: #60a5fa; }
  .item-text { font-size: 13.5px; font-weight: 600; color: #e4e4e7; line-height: 1.5; }
  .item-text.done { text-decoration: line-through; opacity: 0.38; }
  .star { color: #facc15; }
  .item-badges { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
  .badge { display: inline-flex; align-items: center; gap: 3px; font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 6px; background: #ffffff0a; color: #a1a1aa; }
  .badge.overdue { background: #ef444418; color: #f87171; }
  .badge.tag { background: #8b5cf612; color: #a78bfa; }
  .item-note { margin-top: 6px; font-size: 11.5px; color: #52525b; font-style: italic; line-height: 1.5; }
  .empty-col { text-align: center; color: #3f3f46; font-size: 12px; padding: 32px 0; }

  .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #ffffff08; text-align: center; font-size: 11px; color: #3f3f46; }
  .footer a { color: #8b5cf6; text-decoration: none; font-weight: 600; }

  @media (prefers-color-scheme: light) {
    body { background: #fafafa; color: #1a1a1a; }
    h1.title { color: #0f172a; }
    .stat-value { color: #0f172a; }
    .stat-label, .stat-pill { color: #64748b; }
    .progress-track { background: #e2e8f0; border-color: #e2e8f0; }
    .divider { background: linear-gradient(90deg, transparent, #e2e8f0, transparent); }
    .col-card { background: #f8fafc; border-color: #e2e8f020; }
    .col-header { border-color: #e2e8f0; }
    .col-name { color: #0f172a; }
    .item-card { background: #fff; border-color: #e2e8f040; }
    .item-text { color: #1e293b; }
    .item-note { color: #94a3b8; }
    .footer { border-color: #e2e8f0; color: #94a3b8; }
  }
  @media print {
    body { background: white; color: #1a1a1a; }
    .col-card { page-break-inside: avoid; background: #fafafa; border-color: #e5e7eb; }
    .item-card { border-color: #e5e7eb; background: #fff; }
    .progress-track { border-color: #e5e7eb; background: #f1f5f9; }
  }
  ${printOverride}
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <a href="${window.location.origin}" class="badge-brand">MAKE YOUR LIST</a>
    <h1 class="title">${board?.name || 'Kanban'}</h1>
    <div class="stats-row">
      <div class="stat-big"><span class="stat-value">${pct}%</span><span class="stat-label">complété</span></div>
      <div class="stat-pills">
        <span class="stat-pill"><span class="stat-dot" style="background:#a78bfa"></span>${totalTasks} tâche${totalTasks > 1 ? 's' : ''}</span>
        <span class="stat-pill"><span class="stat-dot" style="background:#60a5fa"></span>${kanbanNotes.length} note${kanbanNotes.length > 1 ? 's' : ''}</span>
        <span class="stat-pill"><span class="stat-dot" style="background:#4ade80"></span>${doneItems} terminé${doneItems > 1 ? 's' : ''}</span>
      </div>
    </div>
    <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
  </div>
  <div class="divider"></div>
  <div class="columns-grid">${colsHtml}</div>
  <div class="footer">Exporté le ${date} depuis <a href="${window.location.origin}">Make Your List</a></div>
</div>
</body>
</html>`
  }

  const exportKanbanHtml = () => {
    if (!selectedBoard) return
    const html = buildKanbanExportHtml(selectedBoard, columns)
    const b = new Blob([html], { type: 'text/html' })
    const u = URL.createObjectURL(b)
    const a = document.createElement('a')
    a.href = u; a.download = `${selectedBoard.name || 'kanban'}.html`; a.click()
    URL.revokeObjectURL(u)
  }

  const exportKanbanPdf = () => {
    if (isFree || !selectedBoard) return
    const html = buildKanbanExportHtml(selectedBoard, columns, true)
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1200px;height:800px;'
    document.body.appendChild(iframe)
    iframe.contentDocument.open()
    iframe.contentDocument.write(html)
    iframe.contentDocument.close()
    iframe.onload = () => { iframe.contentWindow.print(); setTimeout(() => document.body.removeChild(iframe), 1000) }
  }

  const exportKanbanWord = () => {
    if (isFree || !selectedBoard) return
    const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

    const colsWordHtml = columns.map(col => {
      const colTasks = kanbanTasks.filter(t => {
        const cId = BUILTIN_STATUS[col.id] ? (t.status === col.id ? col.id : null) : (t.kanbanColumn === col.id ? col.id : null)
        return cId === col.id
      })
      const colNotes = kanbanNotes.filter(n => {
        if (BUILTIN_STATUS[col.id]) return n.kanbanStatus === col.id
        return n.kanbanColumn === col.id
      })

      const itemsHtml = [
        ...colTasks.map(t => {
          const prioLabel = t.priority === 'high' ? ' · Priorité haute' : t.priority === 'low' ? ' · Priorité basse' : ''
          const dueStr = t.dueDate ? ` · ${new Date(t.dueDate).toLocaleDateString('fr-FR')}` : ''
          const subtasks = t.subtasks || []
          const subsDone = subtasks.filter(s => s.done).length
          const subsStr = subtasks.length > 0 ? ` · ${subsDone}/${subtasks.length} sous-tâches` : ''
          const tags = t.tags || []
          const tagsStr = tags.length > 0 ? ` · ${tags.join(', ')}` : ''
          return `<tr>
            <td style="width:6px;background:${col.color};padding:0;"></td>
            <td style="padding:8px 10px;border-bottom:1px solid #eee;">
              <p style="margin:0;font-size:11pt;font-weight:bold;color:#222;${t.status === 'done' ? 'text-decoration:line-through;color:#999;' : ''}">${t.starred ? '★ ' : ''}${t.text}</p>
              <p style="margin:2px 0 0;font-size:8.5pt;color:#999;">Tâche${prioLabel}${dueStr}${subsStr}${tagsStr}</p>
              ${t.notes ? `<p style="margin:2px 0 0;font-size:8.5pt;color:#bbb;font-style:italic;">${t.notes}</p>` : ''}
            </td>
          </tr>`
        }),
        ...colNotes.map(n => `<tr>
            <td style="width:6px;background:${n.color || '#60a5fa'};padding:0;"></td>
            <td style="padding:8px 10px;border-bottom:1px solid #eee;">
              <p style="margin:0;font-size:11pt;font-weight:bold;color:#222;">${n.title || 'Sans titre'}</p>
              <p style="margin:2px 0 0;font-size:8.5pt;color:#999;">Note</p>
              ${n.content ? `<p style="margin:2px 0 0;font-size:8.5pt;color:#bbb;font-style:italic;">${n.content.substring(0, 120)}${n.content.length > 120 ? '…' : ''}</p>` : ''}
            </td>
          </tr>`)
      ].join('')

      return `<div style="margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;margin-bottom:4px;">
          <tr>
            <td style="padding:6px 0;">
              <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${col.color};margin-right:6px;vertical-align:middle;"></span>
              <span style="font-size:13pt;font-weight:bold;color:#111;">${col.label}</span>
              <span style="font-size:9pt;color:#999;margin-left:8px;">${colTasks.length + colNotes.length} éléments</span>
            </td>
          </tr>
        </table>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;">
          ${itemsHtml || '<tr><td style="padding:16px;text-align:center;color:#ccc;font-size:10pt;">Aucun élément</td></tr>'}
        </table>
      </div>`
    }).join('')

    const wordHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${selectedBoard.name || 'Kanban'}</title>
<style>
  body { font-family: Calibri, Arial, sans-serif; color: #1a1a1a; line-height: 1.5; padding: 48px; }
  .header { margin-bottom: 28px; padding-bottom: 16px; border-bottom: 2px solid #8b5cf6; }
  h1.title { font-size: 28pt; color: #111; margin-bottom: 6px; }
  .meta { font-size: 10pt; color: #888; }
  .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 8pt; color: #aaa; text-align: center; }
</style></head>
<body>
  <div class="header">
    <p style="font-size:9pt;font-weight:bold;color:#8b5cf6;letter-spacing:1px;margin-bottom:10px;">MAKE YOUR LIST</p>
    <h1 class="title">${selectedBoard.name || 'Kanban'}</h1>
    <div class="meta">${doneItems}/${totalItems} terminé${totalItems > 1 ? 's' : ''} · ${pct}% · ${totalTasks} tâche${totalTasks > 1 ? 's' : ''} · ${kanbanNotes.length} note${kanbanNotes.length > 1 ? 's' : ''} · Exporté le ${date}</div>
  </div>
  ${colsWordHtml}
  <div class="footer">Exporté depuis Make Your List</div>
</body></html>`
    const b = new Blob(['\ufeff' + wordHtml], { type: 'application/msword' })
    const u = URL.createObjectURL(b)
    const a = document.createElement('a')
    a.href = u; a.download = `${selectedBoard.name || 'kanban'}.doc`; a.click()
    URL.revokeObjectURL(u)
  }

  const handleShareKanban = async () => {
    if (!selectedBoard || shareLoading) return
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
      return
    }
    setShareLoading(true)
    const token = await createShareLink('kanban', selectedBoard.id)
    if (token) {
      const url = `${window.location.origin}/share/${token}`
      setShareUrl(url)
      setShowSharePopup(true)
      navigator.clipboard.writeText(url)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
      logActivity('share_link', `Lien de partage créé pour le kanban "${selectedBoard.name}"`)
    }
    setShareLoading(false)
  }

  // Reset share/export state when changing board
  useEffect(() => { setShareUrl(null); setShowSharePopup(false); setShareCopied(false); setShowKanbanExportMenu(false) }, [selectedBoardId])

  const openTask = openCardType === 'task' ? allTodos.find(t => t.id === openCardId) : null
  const openNote = openCardType === 'note' ? notes.find(n => n.id === openCardId) : null

  // === Mini card preview for pickers ===
  const TaskMiniCard = ({ t, onClick }) => {
    const prio = PRIORITIES.find(p => p.value === t.priority)
    const list = lists.find(l => l.id === t.listId)
    const tags = t.tags || []
    const subtasks = t.subtasks || []
    const subsDone = subtasks.filter(s => s.done).length
    const overdue = t.status !== 'done' && isOverdue(t.dueDate)
    return (
      <button className="flex gap-2.5 w-full px-3 py-2.5 bg-card/80 backdrop-blur-sm border border-white/10 hover:border-violet-500/30 rounded-xl cursor-pointer text-left transition-all duration-150 hover:shadow-sm group/pick" onClick={onClick}>
        <div className="w-1 rounded-full shrink-0 self-stretch" style={{ background: prio?.color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={cn("text-[0.78rem] font-medium leading-snug truncate", t.status === 'done' && "line-through text-muted-foreground/60")}>{t.text}</span>
            {t.starred && <Star size={9} className="text-warning fill-warning shrink-0" />}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {list && <span className="text-[0.58rem] text-muted-foreground/60 bg-muted/50 px-1.5 py-px rounded">{list.name}</span>}
            {t.dueDate && <span className={cn("inline-flex items-center gap-0.5 text-[0.58rem]", overdue ? "text-destructive" : "text-muted-foreground/50")}><Calendar size={8} />{new Date(t.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>}
            {subtasks.length > 0 && <span className="text-[0.58rem] text-muted-foreground/50">{subsDone}/{subtasks.length}</span>}
            {tags.slice(0, 2).map(tagName => { const tc = TAG_COLORS.find(x => x.name === tagName); return <span key={tagName} className="text-[0.5rem] px-1.5 py-px rounded-lg font-semibold" style={{ background: (tc?.color || '#8b5cf6') + '15', color: tc?.color || '#8b5cf6' }}>{tagName}</span> })}
            {tags.length > 2 && <span className="text-[0.5rem] text-muted-foreground/40">+{tags.length - 2}</span>}
          </div>
        </div>
        <Plus size={14} className="text-muted-foreground/30 group-hover/pick:text-primary shrink-0 mt-0.5 transition-colors" />
      </button>
    )
  }

  const NoteMiniCard = ({ n, onClick }) => (
    <button className="flex gap-2.5 w-full px-3 py-2.5 bg-card/80 backdrop-blur-sm border border-white/10 hover:border-violet-500/30 rounded-xl cursor-pointer text-left transition-all duration-150 hover:shadow-sm group/pick" onClick={onClick}>
      <div className="w-6 h-6 rounded-lg shrink-0 flex items-center justify-center mt-0.5" style={{ background: n.color + '20', color: n.color }}><StickyNote size={11} /></div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[0.78rem] font-medium truncate">{n.title || 'Sans titre'}</span>
          {n.starred && <Star size={9} className="text-warning fill-warning shrink-0" />}
        </div>
        {n.content && <p className="text-[0.6rem] text-muted-foreground/50 leading-snug mt-0.5 line-clamp-2">{n.content.slice(0, 80)}</p>}
      </div>
      <Plus size={14} className="text-muted-foreground/30 group-hover/pick:text-primary shrink-0 mt-0.5 transition-colors" />
    </button>
  )

  // === Browser view ===
  if (viewMode === 'browser') {
    const folders = kanbanFolders || []
    const boards = (kanbanBoards || [])
    const currentFolder = folders.find(f => f.id === currentFolderId)
    const foldersHere = currentFolderId ? [] : folders
    const boardsHere = currentFolderId
      ? boards.filter(b => b.folderId === currentFolderId)
      : boards.filter(b => !b.folderId)

    return (
      <div className="flex-1 flex flex-col overflow-hidden page-transition relative">
        <div className="px-8 pt-10 pb-2 max-md:px-4 max-md:pt-6 shrink-0 relative z-1">
          <div className="flex items-center gap-5 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-lg dash-header-icon" style={{ boxShadow: '0 8px 30px rgba(59,130,246,0.35), 0 0 50px rgba(59,130,246,0.12)' }}><Columns3 size={24} /></div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Kanban</h1>
              <p className="text-sm text-muted-foreground mt-1">Gérez vos boards kanban</p>
            </div>
          </div>

          {/* Breadcrumb */}
          {currentFolderId && (
            <div className="flex items-center gap-1.5 text-sm mb-5">
              <button className="inline-flex items-center gap-1 bg-transparent border-none text-muted-foreground cursor-pointer text-sm hover:text-primary transition-colors duration-150" onClick={goToRoot}><Columns3 size={13} /> Kanban</button>
              <ChevronRight size={12} className="text-muted-foreground/40" />
              <span className="text-foreground font-medium">{currentFolder?.name}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3 flex-wrap mb-6">
            {showNewBoard ? (
              <div className="flex items-center gap-2 bg-card/80 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2 animate-scale-in">
                <input className="px-3 py-1.5 bg-input border border-white/10 rounded-lg text-foreground text-sm outline-none focus:border-violet-500 focus:shadow-[0_0_20px_rgba(139,92,246,0.15)]" value={newBoardName} onChange={e => setNewBoardName(e.target.value)} placeholder="Nom du board..." autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') createBoard(); if (e.key === 'Escape') { setShowNewBoard(false); setNewBoardName('') } }} />
                <button className="px-3 py-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25 border-none rounded-lg text-xs cursor-pointer font-semibold btn-glow disabled:opacity-40" disabled={!newBoardName.trim()} onClick={createBoard}>Creer</button>
                <button className="px-3 py-1.5 bg-white/[0.06] border border-white/10 hover:bg-white/[0.12] rounded-lg text-muted-foreground text-xs cursor-pointer hover:text-foreground" onClick={() => { setShowNewBoard(false); setNewBoardName('') }}>Annuler</button>
              </div>
            ) : (
              <button className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25 border-none rounded-xl text-sm cursor-pointer font-semibold btn-glow transition-all duration-150 hover:shadow-lg hover:shadow-violet-500/30"
                onClick={() => { setShowNewBoard(true); setNewBoardName('') }}>
                <Plus size={16} /> Nouveau board
              </button>
            )}

            {showNewFolder ? (
              <div className="flex items-center gap-2 bg-card/80 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2 animate-scale-in">
                <input className="px-3 py-1.5 bg-input border border-white/10 rounded-lg text-foreground text-sm outline-none focus:border-violet-500 focus:shadow-[0_0_20px_rgba(139,92,246,0.15)]" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Nom du dossier..." autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderName('') } }} />
                <button className="px-3 py-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25 border-none rounded-lg text-xs cursor-pointer font-semibold btn-glow disabled:opacity-40" disabled={!newFolderName.trim()} onClick={createFolder}>Creer</button>
                <button className="px-3 py-1.5 bg-white/[0.06] border border-white/10 hover:bg-white/[0.12] rounded-lg text-muted-foreground text-xs cursor-pointer hover:text-foreground" onClick={() => { setShowNewFolder(false); setNewFolderName('') }}>Annuler</button>
              </div>
            ) : (
              !currentFolderId && (
                <button className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.06] border border-white/10 hover:bg-white/[0.12] rounded-xl text-sm text-muted-foreground cursor-pointer transition-all duration-150 hover:text-foreground"
                  onClick={() => { setShowNewFolder(true); setNewFolderName('') }}>
                  <FolderPlus size={16} /> Nouveau dossier
                </button>
              )
            )}
          </div>
        </div>

        {/* Grid content */}
        <div className="flex-1 overflow-y-auto px-8 pb-8 max-md:px-4">
          {/* Folders */}
          {foldersHere.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Dossiers</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {foldersHere.map(f => {
                  const boardCount = boards.filter(b => b.folderId === f.id).length
                  return (
                    <div key={f.id} className="group flex items-center gap-3 px-4 py-3.5 border border-white/10 rounded-2xl cursor-pointer board-card-hover hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/8"
                      style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 6%, var(--color-card)), var(--color-card))' }}
                      onClick={() => enterFolder(f.id)}>
                      <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform duration-200"><Folder size={20} /></div>
                      <div className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold truncate">{f.name}</span>
                        <span className="text-xs text-muted-foreground">{boardCount} board{boardCount !== 1 ? 's' : ''}</span>
                      </div>
                      <ChevronRight size={16} className="text-muted-foreground/30 group-hover:text-primary transition-colors" />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Back to root button when inside a folder */}
          {currentFolderId && (
            <button className="flex items-center gap-2 mb-4 px-3 py-2 bg-transparent border-none text-primary cursor-pointer text-sm hover:underline" onClick={goToRoot}>
              <ArrowLeft size={14} /> Retour
            </button>
          )}

          {/* Boards */}
          {boardsHere.length > 0 ? (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Boards</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {boardsHere.map(b => {
                  const boardCols = b.columns || DEFAULT_COLUMNS
                  const boardTasks = allTodos.filter(t => t.onKanban && t.kanbanBoardId === b.id).length
                  const boardNotes = notes.filter(n => n.kanbanStatus && n.kanbanBoardId === b.id).length
                  const cardCount = boardTasks + boardNotes

                  return (
                    <div key={b.id} className="group relative border border-white/10 rounded-2xl cursor-pointer board-card-hover hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/8"
                      style={{ background: `linear-gradient(145deg, ${boardCols[0]?.color || '#8b5cf6'}10, var(--color-card) 60%)` }}
                      onClick={() => { if (editingBoardId !== b.id) openBoard(b.id) }}>
                      {/* Columns preview bar */}
                      <div className="flex gap-0.5 px-4 pt-4 pb-2">
                        {boardCols.slice(0, 5).map((c, ci) => (
                          <div key={ci} className="flex-1 h-2 rounded-full transition-all duration-300 group-hover:h-2.5" style={{ background: `linear-gradient(180deg, ${c.color}80, ${c.color}40)` }} />
                        ))}
                        {boardCols.length > 5 && <div className="flex-1 h-2 rounded-full bg-muted" />}
                      </div>

                      <div className="px-4 pb-4">
                        {editingBoardId === b.id ? (
                          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            <input className="flex-1 px-2 py-1 bg-input border border-white/10 rounded-lg text-foreground text-sm outline-none focus:border-violet-500 focus:shadow-[0_0_20px_rgba(139,92,246,0.15)]" value={editBoardName} onChange={e => setEditBoardName(e.target.value)} autoFocus
                              onKeyDown={e => { if (e.key === 'Enter') renameBoard(b.id); if (e.key === 'Escape') setEditingBoardId(null) }} />
                            <button className="px-2 py-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25 border-none rounded-lg text-[0.65rem] cursor-pointer font-semibold" onClick={() => renameBoard(b.id)}>OK</button>
                            <button className="px-2 py-1 bg-white/[0.06] border border-white/10 hover:bg-white/[0.12] rounded-lg text-muted-foreground text-[0.65rem] cursor-pointer" onClick={() => setEditingBoardId(null)}>X</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <LayoutGrid size={14} className="text-primary/60 shrink-0" />
                            <span className="text-sm font-semibold truncate flex-1">{b.name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>{boardCols.length} colonne{boardCols.length !== 1 ? 's' : ''}</span>
                          <span>{cardCount} carte{cardCount !== 1 ? 's' : ''}</span>
                        </div>
                      </div>

                      {/* Context menu button */}
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <div className="relative">
                          <button className="flex items-center justify-center w-7 h-7 bg-white/[0.06] border border-white/10 hover:bg-white/[0.12] rounded-lg text-muted-foreground cursor-pointer hover:text-foreground transition-all duration-150"
                            onClick={(e) => { e.stopPropagation(); setCardMenu(cardMenu === `board-${b.id}` ? null : `board-${b.id}`) }}>
                            <MoreHorizontal size={14} />
                          </button>
                          {cardMenu === `board-${b.id}` && (
                            <div className="absolute right-0 top-full mt-1 z-50 bg-card/80 backdrop-blur-sm border border-white/10 rounded-xl shadow-xl shadow-black/20 py-1.5 min-w-[160px] animate-scale-in">
                              <button className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none text-foreground cursor-pointer text-xs hover:bg-accent transition-colors duration-150 text-left" onClick={() => { setEditingBoardId(b.id); setEditBoardName(b.name); setCardMenu(null) }}>
                                <Edit3 size={11} /> Renommer
                              </button>
                              <ShareButton itemType="kanban" itemId={b.id} createShareLink={createShareLink} className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none text-foreground cursor-pointer text-xs hover:bg-accent transition-colors duration-150 text-left" />
                              <button className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none text-destructive cursor-pointer text-xs hover:bg-destructive/10 transition-colors duration-150 text-left" onClick={() => { deleteBoard(b.id); setCardMenu(null) }}>
                                <Trash2 size={11} /> Supprimer
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            foldersHere.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/40">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/15 flex items-center justify-center mb-4 text-blue-400/50"><Columns3 size={28} /></div>
                <span className="text-sm mb-1">{currentFolderId ? 'Aucun board dans ce dossier' : 'Aucun board kanban'}</span>
                <span className="text-xs">Creez votre premier board pour commencer</span>
              </div>
            )
          )}
        </div>
      </div>
    )
  }

  // === Board view ===
  return (
    <div className="flex h-full flex-1">
      <div className="flex-1 flex flex-col overflow-hidden page-transition relative">
        {/* Header */}
        <div className="px-8 pt-10 pb-2 max-md:px-4 max-md:pt-6 shrink-0 relative z-1">
          <div className="flex items-center gap-5 mb-6">
            <button className="w-14 h-14 rounded-2xl bg-blue-500/15 flex items-center justify-center text-blue-400 border-none cursor-pointer hover:bg-blue-500/25 hover:scale-105 transition-all duration-200" style={{ boxShadow: '0 4px 20px rgba(96, 165, 250, 0.15)' }} onClick={goToBrowser} title="Retour"><ArrowLeft size={24} /></button>
            <div className="flex-1">
              <div className="flex items-center gap-1.5 text-sm mb-1">
                <button className="inline-flex items-center gap-1 bg-transparent border-none text-muted-foreground cursor-pointer text-sm hover:text-primary transition-colors duration-150" onClick={goToBrowser}><Columns3 size={13} /> Kanban</button>
                <ChevronRight size={12} className="text-muted-foreground/40" />
                <span className="text-foreground font-medium">{selectedBoard?.name || 'Board'}</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">{selectedBoard?.name || 'Kanban'}</h1>
            </div>
            <div className="flex items-center gap-2.5 max-sm:hidden">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CheckSquare size={13} className="text-primary/60" /> {doneTasks}/{totalTasks}
                <span className="text-border mx-1">|</span>
                <StickyNote size={13} className="text-blue-400/60" /> {kanbanNotes.length}
              </div>
              <div className="w-28 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full progress-gradient rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-sm font-semibold text-primary counter-animate">{pct}%</span>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3.5 py-2 bg-input border border-white/10 rounded-xl text-muted-foreground transition-all duration-150 focus-within:border-violet-500/50 focus-within:shadow-[0_0_20px_rgba(139,92,246,0.15)]">
              <Search size={14} />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="bg-transparent border-none text-foreground text-sm outline-none w-36" />
              {search && <button className="flex bg-transparent border-none text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => setSearch('')}><X size={13} /></button>}
            </div>
            <div className="flex gap-0.5 bg-muted/60 rounded-xl p-0.5 border border-white/10">
              {[{ v: 'all', label: 'Tout' }, { v: 'tasks', label: 'Taches', icon: <CheckSquare size={12} /> }, { v: 'notes', label: 'Notes', icon: <StickyNote size={12} /> }].map(f => (
                <button key={f.v} className={cn("flex items-center gap-1.5 px-3 py-1.5 bg-transparent border-none cursor-pointer text-xs rounded-lg transition-all duration-150", filterType === f.v ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground")}
                  onClick={() => setFilterType(f.v)}>{f.icon} {f.label}</button>
              ))}
            </div>
            <button className={cn("flex items-center gap-2 px-3.5 py-2 bg-white/[0.06] border border-white/10 hover:bg-white/[0.12] rounded-xl text-sm text-muted-foreground cursor-pointer transition-all duration-150 hover:text-foreground", showFilters && "border-violet-500/40 text-violet-400")}
              onClick={() => setShowFilters(!showFilters)}><Filter size={14} /> Filtres {filterList !== 'all' && <span className="w-2 h-2 rounded-lg bg-violet-500" />}</button>
            <div className="flex-1" />

            {/* Export menu */}
            <div className="relative shrink-0">
              <button className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.06] border border-white/10 hover:bg-white/[0.12] rounded-xl text-xs text-muted-foreground cursor-pointer transition-all duration-150 hover:text-foreground" onClick={() => setShowKanbanExportMenu(!showKanbanExportMenu)} title="Exporter"><Download size={13} /> Export</button>
              {showKanbanExportMenu && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-card/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden z-50 animate-scale-in py-1" style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}>
                  <button className="flex items-center gap-2.5 w-full px-3.5 py-2.5 bg-transparent border-none text-foreground cursor-pointer text-xs text-left hover:bg-accent transition-colors" onClick={() => { exportKanbanHtml(); setShowKanbanExportMenu(false) }}>
                    <span className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400 shrink-0"><FileText size={13} /></span>
                    <div><div className="font-medium">HTML</div><div className="text-[0.6rem] text-muted-foreground">Gratuit — page web stylée</div></div>
                  </button>
                  <button className={cn("flex items-center gap-2.5 w-full px-3.5 py-2.5 bg-transparent border-none cursor-pointer text-xs text-left transition-colors", isFree ? "text-muted-foreground/50 cursor-not-allowed" : "text-foreground hover:bg-accent")} onClick={() => { if (!isFree) { exportKanbanPdf(); setShowKanbanExportMenu(false) } }}>
                    <span className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", isFree ? "bg-white/5 text-muted-foreground/30" : "bg-red-500/15 text-red-400")}><FileText size={13} /></span>
                    <div><div className="font-medium flex items-center gap-1.5">PDF {isFree && <span className="text-[0.55rem] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400 font-semibold">ÉTUDIANT+</span>}</div><div className="text-[0.6rem] text-muted-foreground">Impression / enregistrer en PDF</div></div>
                  </button>
                  <button className={cn("flex items-center gap-2.5 w-full px-3.5 py-2.5 bg-transparent border-none cursor-pointer text-xs text-left transition-colors", isFree ? "text-muted-foreground/50 cursor-not-allowed" : "text-foreground hover:bg-accent")} onClick={() => { if (!isFree) { exportKanbanWord(); setShowKanbanExportMenu(false) } }}>
                    <span className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", isFree ? "bg-white/5 text-muted-foreground/30" : "bg-blue-500/15 text-blue-400")}><FileText size={13} /></span>
                    <div><div className="font-medium flex items-center gap-1.5">Word {isFree && <span className="text-[0.55rem] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400 font-semibold">ÉTUDIANT+</span>}</div><div className="text-[0.6rem] text-muted-foreground">Document .doc compatible Word</div></div>
                  </button>
                </div>
              )}
            </div>

            {/* Share button */}
            <div className="relative shrink-0">
              <button className={cn("flex items-center gap-1.5 px-3 py-2 bg-white/[0.06] border border-white/10 hover:bg-white/[0.12] rounded-xl text-xs cursor-pointer transition-all duration-150", shareUrl ? "text-emerald-400 border-emerald-500/30" : "text-muted-foreground hover:text-foreground")} onClick={handleShareKanban} title="Partager un lien">
                {shareLoading ? <span className="animate-spin block w-3.5 h-3.5 border-2 border-muted-foreground/30 border-t-primary rounded-full" /> : shareCopied ? <Check size={13} /> : <Share2 size={13} />}
                Partager
              </button>
              {showSharePopup && shareUrl && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-card/95 backdrop-blur-xl border border-white/10 rounded-xl p-3 z-50 animate-scale-in" style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}>
                  <div className="text-[0.65rem] font-semibold text-muted-foreground mb-2">Lien de partage</div>
                  <div className="flex items-center gap-2">
                    <input type="text" readOnly value={shareUrl} className="flex-1 px-2 py-1.5 bg-input border border-white/10 rounded-lg text-[0.65rem] text-foreground outline-none min-w-0" onClick={e => e.target.select()} />
                    <button className="px-2.5 py-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white border-none rounded-lg text-[0.65rem] font-semibold cursor-pointer shadow-sm" onClick={() => { navigator.clipboard.writeText(shareUrl); setShareCopied(true); setTimeout(() => setShareCopied(false), 2000) }}>{shareCopied ? '✓ Copié' : 'Copier'}</button>
                  </div>
                  <button className="mt-2 text-[0.6rem] text-muted-foreground/60 bg-transparent border-none cursor-pointer hover:text-foreground transition-colors" onClick={() => setShowSharePopup(false)}>Fermer</button>
                </div>
              )}
            </div>

            <button className={cn("flex items-center gap-1.5 px-3 py-2 bg-white/[0.06] border border-white/10 hover:bg-white/[0.12] rounded-xl text-xs text-muted-foreground cursor-pointer transition-all duration-150 hover:text-foreground", compact && "bg-violet-500/15 text-violet-400 border-violet-500/30")}
              onClick={() => setCompact(!compact)}>{compact ? <Eye size={13} /> : <EyeOff size={13} />} {compact ? 'Detaille' : 'Compact'}</button>
          </div>

          {showFilters && (
            <div className="flex items-center gap-3 mt-3 p-3 bg-card/80 backdrop-blur-sm border border-white/10 rounded-xl animate-slide-up flex-wrap">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Liste:</span>
              <select className="px-3 py-1.5 bg-input border border-white/10 rounded-lg text-foreground text-xs outline-none cursor-pointer focus:border-violet-500" value={filterList} onChange={e => setFilterList(e.target.value)}>
                <option value="all">Toutes</option>
                {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              {filterList !== 'all' && <button className="ml-auto text-xs text-primary cursor-pointer bg-transparent border-none hover:underline" onClick={() => setFilterList('all')}>Reinitialiser</button>}
            </div>
          )}
        </div>

        {/* Kanban columns */}
        <div className="flex gap-4 flex-1 overflow-x-auto overflow-y-hidden px-8 pb-6 pt-4 max-md:px-4">
          {columns.map(col => {
            const cards = buildCards(col.id)
            const isCollapsed = collapsed[col.id]
            const isDropT = dragOverCol === col.id && dragItem
            const isCustom = !BUILTIN_STATUS[col.id]

            if (isCollapsed) {
              return (
                <div key={col.id} className={cn("w-12 shrink-0 border border-white/10 rounded-2xl flex flex-col items-center py-4 cursor-pointer transition-all duration-200 hover:border-violet-500/20", dragOverColId === col.id && "border-violet-500/50")}
                  style={{ background: `linear-gradient(180deg, ${col.color}10, transparent)` }}
                  onClick={() => setCollapsed({ ...collapsed, [col.id]: false })}
                  draggable onDragStart={e => handleColDragStart(e, col.id)} onDragOver={e => handleColDragOver(e, col.id)} onDrop={e => handleColDrop(e, col.id)} onDragEnd={() => { setDragCol(null); setDragOverColId(null) }}>
                  <span className="w-3 h-3 rounded-full mb-3" style={{ background: col.color }} />
                  <span className="text-[0.65rem] font-bold text-muted-foreground [writing-mode:vertical-lr] tracking-widest uppercase">{col.label}</span>
                  <span className="mt-3 text-[0.65rem] text-muted-foreground bg-muted w-6 h-6 rounded-full flex items-center justify-center font-semibold">{cards.length}</span>
                </div>
              )
            }

            return (
              <div key={col.id}
                data-col-id={col.id}
                className={cn(
                  "flex-1 min-w-[290px] max-w-[420px] border border-white/10 rounded-2xl flex flex-col transition-all duration-200 kanban-col-tinted",
                  isDropT && "kanban-drop-active border-violet-500/60",
                  dragOverColId === col.id && dragCol && "border-violet-500/50"
                )}
                style={{ '--col-tint': col.color + '0A', background: `linear-gradient(180deg, ${col.color}08 0%, var(--color-card)15 100%)` }}
                onDragOver={e => { e.preventDefault(); if (dragItem) setDragOverCol(col.id); if (dragCol) handleColDragOver(e, col.id) }}
                onDrop={e => { if (dragItem) handleDrop(e, col.id); if (dragCol) handleColDrop(e, col.id) }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) { setDragOverCol(null); setDropTarget(null); setDragOverColId(null) } }}
              >
                {/* Column header */}
                {editingCol === col.id ? (
                  <div className="px-3 py-2.5 border-b border-white/10 rounded-t-2xl animate-scale-in flex flex-col gap-2" style={{ background: col.color + '08' }}>
                    <input className="w-full px-2.5 py-1.5 bg-input border border-white/10 rounded-lg text-foreground text-sm outline-none focus:border-violet-500 focus:shadow-[0_0_20px_rgba(139,92,246,0.15)]" value={editColName} onChange={e => setEditColName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveColumnEdit(); if (e.key === 'Escape') setEditingCol(null) }} autoFocus />
                    <div className="flex gap-1.5 flex-wrap">
                      {COLUMN_COLORS.map(c => (
                        <button key={c} className={cn("w-5 h-5 rounded-full border-2 cursor-pointer transition-all duration-150 hover:scale-110", editColColor === c ? "scale-110 shadow-sm" : "opacity-50")}
                          style={{ background: editColColor === c ? c : c + '30', borderColor: c }} onClick={() => setEditColColor(c)} />
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 justify-end">
                      {isCustom && <button className="px-2.5 py-1 bg-transparent border border-destructive/30 rounded-lg text-destructive text-[0.65rem] cursor-pointer hover:bg-destructive hover:text-white transition-all duration-150" onClick={() => deleteColumn(col.id)}>Supprimer</button>}
                      <button className="px-2.5 py-1 bg-white/[0.06] border border-white/10 hover:bg-white/[0.12] rounded-lg text-muted-foreground text-[0.65rem] cursor-pointer hover:text-foreground" onClick={() => setEditingCol(null)}>Annuler</button>
                      <button className="px-2.5 py-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25 border-none rounded-lg text-[0.65rem] cursor-pointer font-semibold" onClick={saveColumnEdit}>OK</button>
                    </div>
                  </div>
                ) : (
                  <div className={cn("flex items-center gap-2.5 px-4 py-3 border-b font-semibold text-sm rounded-t-2xl select-none cursor-grab")} style={{ borderBottomColor: col.color + '40', background: `linear-gradient(135deg, ${col.color}18, ${col.color}08)` }}
                    draggable onDragStart={e => handleColDragStart(e, col.id)} onDragEnd={() => { setDragCol(null); setDragOverColId(null) }}>
                    <span className="w-3 h-3 rounded-full" style={{ background: col.color, boxShadow: `0 0 10px ${col.color}50, 0 0 3px ${col.color}30` }} />
                    <span className="text-[0.82rem]">{col.label}</span>
                    {isCustom && <span className="text-[0.55rem] text-muted-foreground/40 bg-muted/50 px-1.5 py-px rounded">custom</span>}
                    <span className="ml-auto flex items-center gap-1">
                      <span className="text-[0.7rem] text-muted-foreground bg-muted/80 px-2.5 py-0.5 rounded-lg font-semibold counter-animate">{cards.length}</span>
                      <button className="flex items-center justify-center w-6 h-6 bg-transparent border-none text-muted-foreground/40 cursor-pointer rounded-lg hover:text-foreground hover:bg-muted transition-all duration-150"
                        onClick={() => { setEditingCol(col.id); setEditColName(col.label); setEditColColor(col.color) }} title="Modifier"><Edit3 size={11} /></button>
                      <button className="flex items-center justify-center w-6 h-6 bg-transparent border-none text-muted-foreground/40 cursor-pointer rounded-lg hover:text-foreground hover:bg-muted transition-all duration-150"
                        onClick={() => setCollapsed({ ...collapsed, [col.id]: true })} title="Replier"><EyeOff size={12} /></button>
                    </span>
                  </div>
                )}

                {/* Column body */}
                <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-1.5 kanban-column-body min-h-[100px]">
                  {cards.length === 0 && !dragItem && (
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/40">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2" style={{ background: col.color + '12', color: col.color + '80' }}>
                        {col.id === 'done' ? <Check size={18} /> : col.id === 'doing' ? <Clock size={18} /> : <Circle size={18} />}
                      </div>
                      <span className="text-xs">Aucun element</span>
                    </div>
                  )}
                  {cards.length === 0 && dragItem && (
                    <div className={cn("kanban-empty-zone flex items-center justify-center py-10 text-muted-foreground/40 text-xs", isDropT && "active")}>Deposez ici</div>
                  )}

                  {cards.map((card, i) => {
                    const menuId = `${card.type}-${card.id}`
                    const isBeingDragged = dragItem?.id === card.id && dragItem?.type === card.type
                    const showDropBefore = dropTarget?.colId === col.id && dropTarget?.index === i && dragItem && !(dragItem.id === card.id && dragItem.type === card.type)
                    const isSelected = openCardId === card.id && openCardType === card.type

                    if (card.type === 'task') {
                      const todo = card.data
                      const prio = PRIORITIES.find(p => p.value === todo.priority)
                      const overdue = todo.status !== 'done' && isOverdue(todo.dueDate)
                      const subtasks = todo.subtasks || []
                      const subsDone = subtasks.filter(s => s.done).length
                      const tags = todo.tags || []
                      const list = lists.find(l => l.id === todo.listId)
                      const lnote = card.linkedNote

                      return (
                        <div key={menuId}>
                          {showDropBefore && <div className="kanban-drop-indicator h-0 mb-1" />}
                          <div className={cn("group relative border border-white/10 rounded-xl cursor-pointer transition-all duration-150 hover:border-violet-500/30 hover:shadow-md hover:shadow-violet-500/5 hover:-translate-y-px", `priority-bar-${todo.priority}`, isSelected && "border-violet-500/50 shadow-lg shadow-violet-500/10 active-card-glow", isBeingDragged && "kanban-dragging", lastDroppedId === todo.id && "kanban-card-drop", dropLinkTarget?.id === todo.id && dropLinkTarget?.type === 'task' && "border-cyan-500/60 bg-cyan-500/[0.08] ring-1 ring-cyan-500/30 scale-[1.02]", compact ? "px-3 py-2" : "px-3.5 py-3")}
                            data-card-id={todo.id} data-card-type="task"
                            style={{ animationDelay: `${i * 40}ms` }}
                            draggable onDragStart={e => { setCardMenu(null); setDragItem({ id: todo.id, type: 'task' }); e.dataTransfer.effectAllowed = 'move' }} onDragOver={e => handleCardDragOver(e, col.id, i, 'task', todo.id)} onDrop={e => handleCardDrop(e, 'task', todo.id)} onDragLeave={() => setDropLinkTarget(null)} onDragEnd={resetDrag}
                            onTouchStart={e => handleTouchStart(e, { id: todo.id, type: 'task' })} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
                            onClick={() => { setOpenCardId(todo.id); setOpenCardType('task') }}>
                            {dropLinkTarget?.id === todo.id && dropLinkTarget?.type === 'task' && (
                              <div className="absolute inset-0 flex items-center justify-center bg-cyan-500/10 rounded-xl z-10 pointer-events-none">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 backdrop-blur-sm text-cyan-400 text-xs font-semibold rounded-lg border border-cyan-500/30"><Link2 size={12} /> Lier la note</span>
                              </div>
                            )}
                            <div className="flex items-start gap-2.5">
                              <button className="flex items-center justify-center w-6 h-6 rounded-full border-2 cursor-pointer shrink-0 transition-all duration-150 hover:scale-115 mt-0.5"
                                style={{ background: col.color + '20', color: col.color, borderColor: col.color + '50', boxShadow: `0 0 8px ${col.color}15` }}
                                onClick={e => { e.stopPropagation(); cycleStatus(todo.id) }}>
                                {todo.status === 'done' ? <Check size={11} /> : todo.status === 'doing' ? <Clock size={11} /> : <Circle size={11} />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className={cn("text-[0.82rem] font-medium leading-snug break-words flex-1", todo.status === 'done' && "line-through text-muted-foreground/60")}>{todo.text}</span>
                                  {lnote && <span className="inline-flex items-center gap-0.5 text-[0.5rem] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 shrink-0"><Link2 size={8} /> Liee</span>}
                                </div>
                                {!compact && (
                                  <>
                                    {list && <span className="inline-flex items-center gap-1 text-[0.6rem] text-muted-foreground/70 bg-muted/60 px-1.5 py-0.5 rounded mt-1.5"><CheckSquare size={8} /> {list.name}</span>}
                                    {tags.length > 0 && <div className="flex flex-wrap gap-1 mt-1.5">{tags.map(tagName => { const tc = TAG_COLORS.find(t => t.name === tagName); return <span key={tagName} className="text-[0.6rem] px-2 py-0.5 rounded-lg font-semibold" style={{ background: (tc?.color || '#8b5cf6') + '15', color: tc?.color || '#8b5cf6' }}>{tagName}</span> })}</div>}
                                    <div className="flex items-center gap-2 flex-wrap mt-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: prio?.color }} />
                                      {todo.starred && <Star size={10} className="text-warning shrink-0 fill-warning" />}
                                      {todo.dueDate && <span className={cn("inline-flex items-center gap-1 text-[0.65rem]", overdue ? "text-destructive font-semibold" : "text-muted-foreground")}><Calendar size={10} />{new Date(todo.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>}
                                      {subtasks.length > 0 && <span className="inline-flex items-center gap-1 text-[0.65rem] text-muted-foreground"><Check size={10} /> {subsDone}/{subtasks.length}<span className="inline-block w-10 h-1 bg-muted rounded-full overflow-hidden"><span className="block h-full rounded-full bg-success/70 transition-all" style={{ width: `${(subsDone / subtasks.length) * 100}%` }} /></span></span>}
                                    </div>
                                  </>
                                )}
                                {compact && <div className="flex items-center gap-1.5 mt-1"><span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: prio?.color }} />{todo.starred && <Star size={9} className="text-warning fill-warning" />}{todo.dueDate && <Calendar size={9} className={cn(overdue ? "text-destructive" : "text-muted-foreground/60")} />}{subtasks.length > 0 && <span className="text-[0.6rem] text-muted-foreground">{subsDone}/{subtasks.length}</span>}</div>}
                              </div>
                              <div className="flex flex-col items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
                                <button className="flex items-center justify-center w-6 h-6 bg-transparent border-none text-muted-foreground/50 cursor-pointer rounded-md hover:bg-muted hover:text-foreground transition-all duration-150" onClick={e => { e.stopPropagation(); setCardMenu(cardMenu === menuId ? null : menuId) }}><MoreHorizontal size={13} /></button>
                                <button className="flex items-center justify-center w-6 h-6 bg-transparent border-none text-muted-foreground/30 cursor-pointer rounded-md hover:text-destructive hover:bg-destructive/10 transition-all duration-150" onClick={e => { e.stopPropagation(); deleteTask(todo.id) }}><Trash2 size={11} /></button>
                              </div>
                            </div>
                            {/* Linked note preview */}
                            {lnote && !compact && (
                              <div className="mt-2 pt-2 border-t border-white/8">
                                <div className="flex items-start gap-2">
                                  <div className="w-5 h-5 rounded-md shrink-0 flex items-center justify-center mt-0.5" style={{ background: lnote.color + '20', color: lnote.color }}><StickyNote size={10} /></div>
                                  <div className="flex-1 min-w-0">
                                    <span className="text-[0.7rem] font-medium truncate block">{lnote.title || 'Sans titre'}</span>
                                    {lnote.content && <p className="text-[0.6rem] text-muted-foreground/50 leading-snug mt-0.5 line-clamp-1">{lnote.content.slice(0, 60)}</p>}
                                  </div>
                                </div>
                              </div>
                            )}
                            {cardMenu === menuId && (
                              <div className="absolute right-0 top-full mt-1 z-50 bg-card/80 backdrop-blur-sm border border-white/10 rounded-xl shadow-xl shadow-black/20 py-1.5 min-w-[170px] animate-scale-in" onClick={e => e.stopPropagation()}>
                                <div className="px-3 py-1.5 text-[0.65rem] text-muted-foreground/60 uppercase tracking-wider font-semibold">Deplacer vers</div>
                                {columns.filter(c => c.id !== col.id).map(c => (
                                  <button key={c.id} className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none text-foreground cursor-pointer text-xs hover:bg-accent transition-colors duration-150 text-left" onClick={() => moveToColumn(todo.id, 'task', c.id)}>
                                    <span className="w-2 h-2 rounded-full" style={{ background: c.color }} /> {c.label}
                                  </button>
                                ))}
                                <div className="h-px bg-white/10 mx-2 my-1" />
                                <button className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none cursor-pointer text-xs hover:bg-accent transition-colors duration-150 text-left" onClick={() => { updateTask(todo.id, { starred: !todo.starred }); setCardMenu(null) }}>
                                  <Star size={11} className={todo.starred ? "text-warning fill-warning" : "text-muted-foreground"} /> {todo.starred ? 'Retirer favori' : 'Favori'}
                                </button>
                                <div className="h-px bg-white/10 mx-2 my-1" />
                                {todo.linkedNoteId ? (
                                  <button className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none text-muted-foreground cursor-pointer text-xs hover:bg-accent transition-colors duration-150 text-left" onClick={() => { unlinkNote(todo.id); setCardMenu(null) }}><Unlink size={11} /> Delier la note</button>
                                ) : (
                                  <button className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none text-cyan-400 cursor-pointer text-xs hover:bg-accent transition-colors duration-150 text-left" onClick={() => { setLinkPicker(todo.id); setLinkSearch(''); setCardMenu(null) }}><Link2 size={11} /> Lier une note</button>
                                )}
                                <button className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none text-muted-foreground cursor-pointer text-xs hover:bg-accent transition-colors duration-150 text-left" onClick={() => removeTaskFromKanban(todo.id)}><X size={11} /> Retirer du kanban</button>
                                <button className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none text-destructive cursor-pointer text-xs hover:bg-destructive/10 transition-colors duration-150 text-left" onClick={() => { deleteTask(todo.id); setCardMenu(null) }}><Trash2 size={11} /> Supprimer definitivement</button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    }

                    // NOTE CARD
                    const note = card.data
                    return (
                      <div key={menuId}>
                        {showDropBefore && <div className="kanban-drop-indicator h-0 mb-1" />}
                        <div className={cn("group relative border border-white/10 rounded-xl cursor-pointer transition-all duration-150 hover:border-violet-500/30 hover:shadow-md hover:shadow-violet-500/5 kanban-note-card", isSelected && "border-violet-500/50 shadow-lg shadow-violet-500/10 active-card-glow", isBeingDragged && "kanban-dragging", lastDroppedId === note.id && "kanban-card-drop", dropLinkTarget?.id === note.id && dropLinkTarget?.type === 'note' && "border-cyan-500/60 bg-cyan-500/[0.08] ring-1 ring-cyan-500/30 scale-[1.02]", compact ? "px-3 py-2" : "px-3.5 py-3")}
                          data-card-id={note.id} data-card-type="note"
                          style={{ borderLeftColor: note.color, background: `linear-gradient(135deg, ${note.color}0A, var(--color-card))`, animationDelay: `${i * 40}ms` }}
                          draggable onDragStart={e => { setCardMenu(null); setDragItem({ id: note.id, type: 'note' }); e.dataTransfer.effectAllowed = 'move' }} onDragOver={e => handleCardDragOver(e, col.id, i, 'note', note.id)} onDrop={e => handleCardDrop(e, 'note', note.id)} onDragLeave={() => setDropLinkTarget(null)} onDragEnd={resetDrag}
                          onTouchStart={e => handleTouchStart(e, { id: note.id, type: 'note' })} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
                          onClick={() => { setOpenCardId(note.id); setOpenCardType('note') }}>
                          {dropLinkTarget?.id === note.id && dropLinkTarget?.type === 'note' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-cyan-500/10 rounded-xl z-10 pointer-events-none">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 backdrop-blur-sm text-cyan-400 text-xs font-semibold rounded-lg border border-cyan-500/30"><Link2 size={12} /> Lier la tâche</span>
                            </div>
                          )}
                          <div className="flex items-start gap-2.5">
                            <div className="w-6 h-6 rounded-lg shrink-0 mt-0.5 flex items-center justify-center" style={{ background: note.color + '20', color: note.color }}><StickyNote size={12} /></div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5"><span className="text-[0.55rem] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: note.color + '15', color: note.color }}>Note</span>{note.starred && <Star size={9} className="text-warning fill-warning" />}</div>
                              <span className="block text-[0.82rem] font-medium leading-snug break-words mt-1">{note.title || 'Sans titre'}</span>
                              {!compact && note.content && <p className="text-[0.7rem] text-muted-foreground/60 leading-snug mt-1 line-clamp-2">{note.content.slice(0, 100)}</p>}
                            </div>
                            <div className="flex flex-col items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
                              <button className="flex items-center justify-center w-6 h-6 bg-transparent border-none text-muted-foreground/50 cursor-pointer rounded-md hover:bg-muted hover:text-foreground transition-all duration-150" onClick={e => { e.stopPropagation(); setCardMenu(cardMenu === menuId ? null : menuId) }}><MoreHorizontal size={13} /></button>
                              <button className="flex items-center justify-center w-6 h-6 bg-transparent border-none text-muted-foreground/30 cursor-pointer rounded-md hover:text-destructive hover:bg-destructive/10 transition-all duration-150" onClick={e => { e.stopPropagation(); deleteNote(note.id) }}><Trash2 size={11} /></button>
                            </div>
                          </div>
                          {cardMenu === menuId && (
                            <div className="absolute right-0 top-full mt-1 z-50 bg-card/80 backdrop-blur-sm border border-white/10 rounded-xl shadow-xl shadow-black/20 py-1.5 min-w-[170px] animate-scale-in" onClick={e => e.stopPropagation()}>
                              <div className="px-3 py-1.5 text-[0.65rem] text-muted-foreground/60 uppercase tracking-wider font-semibold">Deplacer vers</div>
                              {columns.filter(c => c.id !== col.id).map(c => (
                                <button key={c.id} className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none text-foreground cursor-pointer text-xs hover:bg-accent transition-colors duration-150 text-left" onClick={() => moveToColumn(note.id, 'note', c.id)}>
                                  <span className="w-2 h-2 rounded-full" style={{ background: c.color }} /> {c.label}
                                </button>
                              ))}
                              <div className="h-px bg-white/10 mx-2 my-1" />
                              <button className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none cursor-pointer text-xs hover:bg-accent transition-colors duration-150 text-left" onClick={() => { updateNote(note.id, { starred: !note.starred }); setCardMenu(null) }}>
                                <Star size={11} className={note.starred ? "text-warning fill-warning" : "text-muted-foreground"} /> {note.starred ? 'Retirer favori' : 'Favori'}
                              </button>
                              <div className="h-px bg-white/10 mx-2 my-1" />
                              {(() => { const noteTasks = allTodos.filter(t => t.linkedNoteId === note.id); return noteTasks.length > 0 ? (
                                <button className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none text-muted-foreground cursor-pointer text-xs hover:bg-accent transition-colors duration-150 text-left" onClick={() => { noteTasks.forEach(t => updateTask(t.id, { linkedNoteId: null })); setCardMenu(null); if (showToast) showToast(`${noteTasks.length} tâche${noteTasks.length > 1 ? 's' : ''} délié${noteTasks.length > 1 ? 'es' : 'e'}`) }}>
                                  <Unlink size={11} /> Délier {noteTasks.length} tâche{noteTasks.length > 1 ? 's' : ''}
                                </button>
                              ) : (
                                <button className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none text-cyan-400 cursor-pointer text-xs hover:bg-accent transition-colors duration-150 text-left" onClick={() => { setTaskLinkPicker(note.id); setTaskLinkSearch(''); setCardMenu(null) }}>
                                  <Link2 size={11} /> Lier une tâche
                                </button>
                              ) })()}
                              <button className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none text-muted-foreground cursor-pointer text-xs hover:bg-accent transition-colors duration-150 text-left" onClick={() => removeFromKanban(note.id)}><X size={11} /> Retirer du kanban</button>
                              <button className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none text-destructive cursor-pointer text-xs hover:bg-destructive/10 transition-colors duration-150 text-left" onClick={() => { deleteNote(note.id); setCardMenu(null) }}><Trash2 size={11} /> Supprimer definitivement</button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Column footer */}
                <div className="px-2.5 py-2.5 border-t border-white/10 shrink-0">
                  {/* MENU */}
                  {addingIn?.status === col.id && addingIn.mode === 'menu' && (
                    <div className="kanban-add-card flex flex-col gap-0.5">
                      <div className="text-[0.6rem] text-muted-foreground/50 uppercase tracking-wider font-semibold px-2 py-1">Creer</div>
                      <button className="flex items-center gap-2.5 w-full px-3 py-2 bg-transparent border-none text-foreground cursor-pointer text-xs hover:bg-accent rounded-lg transition-colors duration-150 text-left" onClick={() => setAddingIn({ status: col.id, mode: 'new-task' })}>
                        <div className="w-5 h-5 rounded-md bg-violet-500/15 flex items-center justify-center text-violet-400"><CheckSquare size={10} /></div> Nouvelle tache
                      </button>
                      <button className="flex items-center gap-2.5 w-full px-3 py-2 bg-transparent border-none text-foreground cursor-pointer text-xs hover:bg-accent rounded-lg transition-colors duration-150 text-left" onClick={() => setAddingIn({ status: col.id, mode: 'new-note' })}>
                        <div className="w-5 h-5 rounded-md bg-blue-500/15 flex items-center justify-center text-blue-400"><StickyNote size={10} /></div> Nouvelle note
                      </button>
                      <div className="h-px bg-white/10 my-0.5" />
                      <button className="flex items-center gap-2.5 w-full px-3 py-2 bg-transparent border-none text-foreground cursor-pointer text-xs hover:bg-accent rounded-lg transition-colors duration-150 text-left" onClick={() => { setImportModal({ colId: col.id }); setImportTab('tasks'); setImportSearch(''); setExpandedList(null); setAddingIn(null) }}>
                        <div className="w-5 h-5 rounded-md bg-primary/15 flex items-center justify-center text-primary"><Import size={10} /></div> Importer existant
                      </button>
                      <button className="mt-1 px-2.5 py-1 bg-white/[0.06] border border-white/10 hover:bg-white/[0.12] rounded-lg text-muted-foreground text-[0.65rem] cursor-pointer hover:text-foreground transition-colors duration-150 self-end" onClick={() => setAddingIn(null)}>Annuler</button>
                    </div>
                  )}

                  {/* NEW TASK / NOTE */}
                  {addingIn?.status === col.id && (addingIn.mode === 'new-task' || addingIn.mode === 'new-note') && (
                    <div className="kanban-add-card flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {addingIn.mode === 'new-task' ? <><CheckSquare size={12} className="text-violet-400" /> Nouvelle tache</> : <><StickyNote size={12} className="text-blue-400" /> Nouvelle note</>}
                        <button className="ml-auto text-[0.6rem] text-primary cursor-pointer bg-transparent border-none hover:underline" onClick={() => setAddingIn({ status: col.id, mode: 'menu' })}>Retour</button>
                      </div>
                      <textarea value={newText} onChange={e => setNewText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addCard(col.id) }; if (e.key === 'Escape') { setAddingIn(null); setNewText('') } }}
                        placeholder={addingIn.mode === 'new-task' ? "Titre de la tache..." : "Titre de la note..."} autoFocus rows={2}
                        className="w-full px-3 py-2.5 bg-input border border-white/10 rounded-xl text-foreground text-sm outline-none resize-none font-[inherit] leading-snug focus:border-violet-500 focus:shadow-[0_0_20px_rgba(139,92,246,0.15)] transition-colors duration-150 glow-ring" />
                      <div className="flex items-center gap-2 flex-wrap">
                        {addingIn.mode === 'new-task' && <>
                          <div className="flex gap-1">{PRIORITIES.map(p => <button key={p.value} className={cn("w-5 h-5 rounded-full border-2 transition-all duration-150 cursor-pointer hover:scale-110", newPriority === p.value ? "scale-110 shadow-sm" : "opacity-50")} style={{ background: newPriority === p.value ? p.color + '30' : 'transparent', borderColor: p.color }} onClick={() => setNewPriority(p.value)} title={p.label} />)}</div>
                          {lists.length > 1 && <select className="px-2 py-1 bg-input border border-white/10 rounded-lg text-foreground text-[0.65rem] outline-none cursor-pointer focus:border-violet-500" value={newList || lists[0]?.id} onChange={e => setNewList(e.target.value)}>{lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>}
                        </>}
                        {addingIn.mode === 'new-note' && <div className="flex gap-1">{NOTE_COLORS.slice(0, 6).map(c => <button key={c} className={cn("w-5 h-5 rounded-full border-2 transition-all duration-150 cursor-pointer hover:scale-110", newNoteColor === c ? "scale-110 shadow-sm" : "opacity-50")} style={{ background: newNoteColor === c ? c + '40' : c + '20', borderColor: c }} onClick={() => setNewNoteColor(c)} />)}</div>}
                        <div className="flex-1" />
                        <button className="px-2.5 py-1 bg-white/[0.06] border border-white/10 hover:bg-white/[0.12] rounded-lg text-muted-foreground text-[0.65rem] cursor-pointer hover:text-foreground" onClick={() => { setAddingIn(null); setNewText('') }}>Annuler</button>
                        <button className="px-2.5 py-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25 border-none rounded-lg text-[0.65rem] cursor-pointer font-semibold btn-glow disabled:opacity-40" disabled={!newText.trim()} onClick={() => addCard(col.id)}>Ajouter</button>
                      </div>
                    </div>
                  )}


                  {(!addingIn || addingIn.status !== col.id) && (
                    <button className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border border-transparent rounded-xl text-muted-foreground/50 cursor-pointer text-xs transition-all duration-150 hover:bg-accent/50 hover:text-muted-foreground hover:border-white/10"
                      onClick={() => { setAddingIn({ status: col.id, mode: 'menu' }); setNewText(''); setNewPriority('medium'); setNewList(lists[0]?.id); setNewNoteColor('#8b5cf6') }}>
                      <Plus size={14} /> Ajouter une carte
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {/* Add column button */}
          {showAddColumn ? (
            <div className="w-[280px] shrink-0 bg-card/80 backdrop-blur-sm border border-white/10 rounded-2xl p-4 flex flex-col gap-3 animate-scale-in">
              <input className="w-full px-3 py-2 bg-input border border-white/10 rounded-xl text-foreground text-sm outline-none focus:border-violet-500 focus:shadow-[0_0_20px_rgba(139,92,246,0.15)]" value={newColName} onChange={e => setNewColName(e.target.value)} placeholder="Nom de la colonne..." autoFocus
                onKeyDown={e => { if (e.key === 'Enter') addColumn(); if (e.key === 'Escape') { setShowAddColumn(false); setNewColName('') } }} />
              <div className="flex gap-1.5 flex-wrap">
                {COLUMN_COLORS.map(c => (
                  <button key={c} className={cn("w-6 h-6 rounded-full border-2 cursor-pointer transition-all duration-150 hover:scale-110", newColColor === c ? "scale-110 shadow-sm" : "opacity-50")}
                    style={{ background: newColColor === c ? c : c + '30', borderColor: c }} onClick={() => setNewColColor(c)} />
                ))}
              </div>
              <div className="flex gap-2 justify-end">
                <button className="px-3 py-1.5 bg-white/[0.06] border border-white/10 hover:bg-white/[0.12] rounded-lg text-muted-foreground text-xs cursor-pointer hover:text-foreground" onClick={() => { setShowAddColumn(false); setNewColName('') }}>Annuler</button>
                <button className="px-3 py-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25 border-none rounded-lg text-xs cursor-pointer font-semibold btn-glow disabled:opacity-40" disabled={!newColName.trim()} onClick={addColumn}>Creer</button>
              </div>
            </div>
          ) : (
            <button className="w-12 shrink-0 bg-card/20 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center py-4 cursor-pointer transition-all duration-200 hover:bg-card/40 hover:border-violet-500/30 text-muted-foreground/40 hover:text-violet-400/60"
              onClick={() => { setShowAddColumn(true); setNewColName(''); setNewColColor('#94a3b8') }}>
              <Plus size={18} />
              <span className="text-[0.6rem] font-semibold [writing-mode:vertical-lr] tracking-widest uppercase mt-2">Colonne</span>
            </button>
          )}
        </div>
      </div>

      {/* Import modal */}
      {importModal && (() => {
        const colId = importModal.colId
        const col = columns.find(c => c.id === colId)
        const q = importSearch.toLowerCase()

        // Tasks grouped by list (folders) — only tasks NOT already on kanban
        const taskGroups = lists.map(l => ({
          ...l,
          tasks: allTodos.filter(t => t.listId === l.id && !t.onKanban).filter(t => !q || t.text.toLowerCase().includes(q) || (t.notes || '').toLowerCase().includes(q) || (t.tags || []).some(tag => tag.toLowerCase().includes(q)))
        })).filter(l => l.tasks.length > 0)
        const totalAvailTasks = taskGroups.reduce((s, g) => s + g.tasks.length, 0)

        // Notes not yet on kanban
        const availNotes = notes.filter(n => !n.kanbanStatus).filter(n => !q || (n.title || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q))

        const importTask = (t) => {
          const isB = !!BUILTIN_STATUS[colId]
          updateTask(t.id, isB ? { status: colId, kanbanCol: undefined, onKanban: true, kanbanBoardId: selectedBoardId } : { kanbanCol: colId, onKanban: true, kanbanBoardId: selectedBoardId })
          setLastDroppedId(t.id); setTimeout(() => setLastDroppedId(null), 400)
          if (colId === 'done') logActivity('task_done', `Tache "${t.text}" terminee`)
        }
        const importAllList = (g) => {
          g.tasks.forEach(t => { const isB = !!BUILTIN_STATUS[colId]; updateTask(t.id, isB ? { status: colId, kanbanCol: undefined, onKanban: true, kanbanBoardId: selectedBoardId } : { kanbanCol: colId, onKanban: true, kanbanBoardId: selectedBoardId }) })
          logActivity('task_move', `${g.tasks.length} taches importees`)
        }
        const importNote = (n) => {
          updateNote(n.id, { kanbanStatus: colId, kanbanBoardId: selectedBoardId })
          setLastDroppedId(n.id); setTimeout(() => setLastDroppedId(null), 400)
          logActivity('note_move', `Note "${n.title || 'Sans titre'}" ajoutee au kanban`)
        }

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={() => setImportModal(null)}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div className="relative w-full max-w-[640px] max-h-[80vh] bg-card/80 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl shadow-black/30 flex flex-col animate-scale-in mx-4" onClick={e => e.stopPropagation()}>
              {/* Modal header */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10 shrink-0">
                <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center text-primary"><Import size={18} /></div>
                <div className="flex-1">
                  <h2 className="text-base font-bold">Importer dans "{col?.label}"</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Parcourez vos taches et notes pour les ajouter a cette colonne</p>
                </div>
                <button className="flex items-center justify-center w-8 h-8 bg-transparent border-none text-muted-foreground cursor-pointer rounded-lg hover:bg-accent hover:text-foreground transition-colors" onClick={() => setImportModal(null)}><X size={16} /></button>
              </div>

              {/* Tabs + Search */}
              <div className="flex items-center gap-3 px-6 py-3 border-b border-white/10 shrink-0">
                <div className="flex gap-0.5 bg-muted/60 rounded-xl p-0.5 border border-white/10">
                  <button className={cn("flex items-center gap-1.5 px-4 py-2 bg-transparent border-none cursor-pointer text-xs rounded-lg transition-all duration-150", importTab === 'tasks' ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground")}
                    onClick={() => setImportTab('tasks')}><CheckSquare size={12} /> Taches <span className="ml-0.5 text-[0.6rem] opacity-70">({totalAvailTasks})</span></button>
                  <button className={cn("flex items-center gap-1.5 px-4 py-2 bg-transparent border-none cursor-pointer text-xs rounded-lg transition-all duration-150", importTab === 'notes' ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground")}
                    onClick={() => setImportTab('notes')}><StickyNote size={12} /> Notes <span className="ml-0.5 text-[0.6rem] opacity-70">({availNotes.length})</span></button>
                </div>
                <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-input border border-white/10 rounded-xl text-muted-foreground focus-within:border-violet-500/50 focus-within:shadow-[0_0_20px_rgba(139,92,246,0.15)] transition-colors">
                  <Search size={13} />
                  <input type="text" value={importSearch} onChange={e => setImportSearch(e.target.value)} placeholder="Rechercher..." autoFocus className="bg-transparent border-none text-foreground text-sm outline-none flex-1" />
                  {importSearch && <button className="flex bg-transparent border-none text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => setImportSearch('')}><X size={12} /></button>}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-5 min-h-0">
                {importTab === 'tasks' && (
                  <div className="flex flex-col gap-1">
                    {taskGroups.map(g => {
                      const isOpen = expandedList === g.id || !!importSearch
                      return (
                        <div key={g.id} className="rounded-xl border border-white/10 overflow-hidden">
                          {/* Folder header */}
                          <button className="flex items-center gap-3 w-full px-4 py-3 bg-secondary/40 border-none cursor-pointer text-left transition-all duration-150 hover:bg-secondary/70"
                            onClick={() => setExpandedList(isOpen && !importSearch ? null : g.id)}>
                            <ChevronRight size={14} className={cn("text-muted-foreground transition-transform duration-200", isOpen && "rotate-90")} />
                            <FolderOpen size={15} className="text-primary/60" />
                            <span className="text-sm font-semibold flex-1">{g.name}</span>
                            <span className="text-[0.65rem] text-muted-foreground bg-muted px-2.5 py-0.5 rounded-lg font-semibold">{g.tasks.length} tache{g.tasks.length > 1 ? 's' : ''}</span>
                            <button className="text-[0.65rem] text-primary cursor-pointer bg-primary/10 border-none hover:bg-primary/20 px-2.5 py-1 rounded-lg font-semibold transition-colors"
                              onClick={e => { e.stopPropagation(); importAllList(g) }}>Tout ajouter</button>
                          </button>
                          {/* Tasks in folder */}
                          {isOpen && (
                            <div className="flex flex-col gap-1 p-2 bg-card/50">
                              {g.tasks.map(t => <TaskMiniCard key={t.id} t={t} onClick={() => importTask(t)} />)}
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {taskGroups.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-14 text-muted-foreground/40">
                        <ListChecks size={32} className="mb-3 opacity-40" />
                        <span className="text-sm">{importSearch ? 'Aucune tache correspondante' : 'Toutes les taches sont deja dans cette colonne'}</span>
                      </div>
                    )}
                  </div>
                )}

                {importTab === 'notes' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {availNotes.map(n => <NoteMiniCard key={n.id} n={n} onClick={() => importNote(n)} />)}
                    {availNotes.length === 0 && (
                      <div className="col-span-2 flex flex-col items-center justify-center py-14 text-muted-foreground/40">
                        <StickyNote size={32} className="mb-3 opacity-40" />
                        <span className="text-sm">{notes.length === 0 ? 'Aucune note creee' : importSearch ? 'Aucune note correspondante' : 'Toutes les notes sont deja sur le kanban'}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-3 border-t border-white/10 shrink-0 bg-secondary/30 rounded-b-2xl">
                <span className="text-xs text-muted-foreground">Colonne cible: <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: col?.color }}><span className="w-2 h-2 rounded-full" style={{ background: col?.color }} />{col?.label}</span></span>
                <button className="px-4 py-2 bg-white/[0.06] border border-white/10 hover:bg-white/[0.12] rounded-xl text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors font-medium" onClick={() => setImportModal(null)}>Fermer</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Detail panel */}
      {(openTask || openNote) && (
        <div className="w-[380px] bg-card/80 backdrop-blur-sm border-l border-white/10 flex flex-col overflow-y-auto shrink-0 max-lg:w-[320px] max-md:fixed max-md:top-0 max-md:right-0 max-md:w-full max-md:h-screen max-md:z-90 animate-slide-right">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-secondary/50">
            <div className="flex items-center gap-2">
              {openTask && <span className="text-[0.6rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-violet-500/15 text-violet-400">Tache</span>}
              {openNote && <span className="text-[0.6rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded" style={{ background: openNote.color + '15', color: openNote.color }}>Note</span>}
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Detail</h3>
            </div>
            <button className="flex items-center justify-center w-8 h-8 bg-transparent border-none text-muted-foreground cursor-pointer rounded-lg hover:bg-accent hover:text-foreground transition-colors duration-150" onClick={() => { setOpenCardId(null); setOpenCardType(null) }}><X size={16} /></button>
          </div>

          {openTask && (
            <div className="p-5 space-y-5 flex-1">
              <input className="w-full px-0 py-1 bg-transparent border-none border-b-2 border-white/10 text-foreground text-lg font-bold outline-none focus:border-violet-500" value={openTask.text} onChange={e => updateTask(openTask.id, { text: e.target.value })} />
              <div>
                <label className="block text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">Colonne</label>
                <div className="flex gap-1.5 flex-wrap">
                  {columns.map(c => (
                    <button key={c.id} className={cn("flex items-center gap-1.5 px-3 py-2 bg-white/[0.06] border border-white/10 rounded-xl text-muted-foreground cursor-pointer text-xs transition-all duration-150", getTaskCol(openTask) === c.id && "font-semibold")}
                      style={getTaskCol(openTask) === c.id ? { background: c.color + '12', color: c.color, borderColor: c.color + '40' } : {}}
                      onClick={() => { const isB = !!BUILTIN_STATUS[c.id]; updateTask(openTask.id, isB ? { status: c.id, kanbanCol: undefined } : { kanbanCol: c.id }); if (c.id === 'done') logActivity('task_done', `Tache "${openTask.text}" terminee`) }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: c.color }} /> {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">Priorite</label>
                <div className="flex gap-1.5">{PRIORITIES.map(p => <button key={p.value} className={cn("flex items-center gap-1.5 px-3 py-2 bg-white/[0.06] border border-white/10 rounded-xl text-muted-foreground cursor-pointer text-xs transition-all duration-150 flex-1 justify-center", openTask.priority === p.value && "font-semibold")} style={openTask.priority === p.value ? { background: p.color + '15', color: p.color, borderColor: p.color + '40' } : {}} onClick={() => updateTask(openTask.id, { priority: p.value })}>{p.label}</button>)}</div>
              </div>
              <div>
                <label className="block text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">Liste</label>
                <select className="w-full px-3 py-2 bg-input border border-white/10 rounded-xl text-foreground text-sm outline-none focus:border-violet-500 focus:shadow-[0_0_20px_rgba(139,92,246,0.15)] cursor-pointer" value={openTask.listId} onChange={e => updateTask(openTask.id, { listId: e.target.value })}>{lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
              </div>
              <div>
                <label className="block text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">Tags</label>
                <div className="flex flex-wrap gap-1.5">{TAG_COLORS.map(t => { const active = (openTask.tags || []).includes(t.name); return <button key={t.name} className={cn("flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer transition-all duration-150", active ? "border-current" : "border-white/10 text-muted-foreground hover:border-current")} style={active ? { background: t.color + '15', color: t.color, borderColor: t.color + '40' } : { color: t.color }} onClick={() => { const tags = openTask.tags || []; updateTask(openTask.id, { tags: tags.includes(t.name) ? tags.filter(x => x !== t.name) : [...tags, t.name] }) }}><span className="w-2 h-2 rounded-full" style={{ background: t.color }} /> {t.name}</button> })}</div>
              </div>
              <div>
                <label className="block text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">Echeance</label>
                <div className="flex items-center gap-2 flex-wrap">
                  <input type="date" className="px-3 py-2 bg-input border border-white/10 rounded-xl text-foreground text-sm outline-none focus:border-violet-500 focus:shadow-[0_0_20px_rgba(139,92,246,0.15)] [color-scheme:dark] cursor-pointer" value={openTask.dueDate || ''} onChange={e => updateTask(openTask.id, { dueDate: e.target.value || null })} />
                  {openTask.dueDate && <button className="px-2.5 py-1.5 bg-white/[0.06] border border-white/10 hover:bg-white/[0.12] rounded-lg text-muted-foreground cursor-pointer text-xs hover:text-foreground" onClick={() => updateTask(openTask.id, { dueDate: null })}>Retirer</button>}
                  {openTask.dueDate && isOverdue(openTask.dueDate) && openTask.status !== 'done' && <span className="inline-flex items-center gap-1 text-xs text-destructive font-semibold"><AlertCircle size={12} /> En retard</span>}
                </div>
              </div>
              <div>
                <label className="block text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">Notes</label>
                <textarea className="w-full px-3 py-2.5 bg-input border border-white/10 rounded-xl text-foreground text-sm leading-relaxed outline-none resize-y font-[inherit] min-h-20 focus:border-violet-500 focus:shadow-[0_0_20px_rgba(139,92,246,0.15)] placeholder:text-muted-foreground/40" value={openTask.notes} onChange={e => updateTask(openTask.id, { notes: e.target.value })} placeholder="Ajoutez des notes..." rows={3} />
              </div>
              {/* Linked note section */}
              <div>
                <label className="block text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">Note liee</label>
                {(() => {
                  const ln = openTask.linkedNoteId ? notes.find(n => n.id === openTask.linkedNoteId) : null
                  if (ln) return (
                    <div className="bg-card/60 border border-cyan-500/20 rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: ln.color + '20', color: ln.color }}><StickyNote size={12} /></div>
                        <span className="text-sm font-semibold flex-1 truncate">{ln.title || 'Sans titre'}</span>
                        <button className="flex items-center gap-1 px-2 py-1 bg-transparent border border-white/10 rounded-lg text-muted-foreground text-[0.65rem] cursor-pointer hover:bg-accent hover:text-foreground transition-colors" onClick={() => unlinkNote(openTask.id)}><Unlink size={10} /> Delier</button>
                      </div>
                      <textarea className="w-full px-3 py-2 bg-input border border-white/10 rounded-lg text-foreground text-sm leading-relaxed outline-none resize-y font-[inherit] min-h-24 focus:border-violet-500 placeholder:text-muted-foreground/40" value={ln.content} onChange={e => updateNote(ln.id, { content: e.target.value })} placeholder="Contenu de la note..." rows={4} />
                    </div>
                  )
                  return (
                    <button className="flex items-center gap-2 px-3 py-2.5 w-full bg-white/[0.04] border border-dashed border-white/15 rounded-xl text-muted-foreground/60 cursor-pointer text-xs hover:bg-accent/30 hover:text-foreground hover:border-cyan-500/30 transition-all duration-150" onClick={() => { setLinkPicker(openTask.id); setLinkSearch('') }}>
                      <Link2 size={13} className="text-cyan-400/60" /> Lier une note existante...
                    </button>
                  )
                })()}
              </div>
            </div>
          )}

          {openNote && (
            <div className="p-5 space-y-5 flex-1">
              <input className="w-full px-0 py-1 bg-transparent border-none border-b-2 border-white/10 text-foreground text-lg font-bold outline-none focus:border-violet-500" value={openNote.title || ''} onChange={e => updateNote(openNote.id, { title: e.target.value })} placeholder="Titre" />
              <div>
                <label className="block text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">Colonne</label>
                <div className="flex gap-1.5 flex-wrap">{columns.map(c => <button key={c.id} className={cn("flex items-center gap-1.5 px-3 py-2 bg-white/[0.06] border border-white/10 rounded-xl text-muted-foreground cursor-pointer text-xs transition-all duration-150", openNote.kanbanStatus === c.id && "font-semibold")} style={openNote.kanbanStatus === c.id ? { background: c.color + '15', color: c.color, borderColor: c.color + '40' } : {}} onClick={() => updateNote(openNote.id, { kanbanStatus: c.id })}><span className="w-2 h-2 rounded-full" style={{ background: c.color }} /> {c.label}</button>)}</div>
              </div>
              <div>
                <label className="block text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">Couleur</label>
                <div className="flex gap-2">{NOTE_COLORS.map(c => <button key={c} className={cn("w-7 h-7 rounded-full border-2 cursor-pointer transition-all duration-150 hover:scale-110", openNote.color === c ? "scale-110 shadow-md" : "opacity-60")} style={{ background: openNote.color === c ? c : c + '40', borderColor: c }} onClick={() => updateNote(openNote.id, { color: c })} />)}</div>
              </div>
              <div>
                <label className="block text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">Contenu</label>
                <textarea className="w-full px-3 py-2.5 bg-input border border-white/10 rounded-xl text-foreground text-sm leading-relaxed outline-none resize-y font-[inherit] min-h-40 focus:border-violet-500 focus:shadow-[0_0_20px_rgba(139,92,246,0.15)] placeholder:text-muted-foreground/40" value={openNote.content} onChange={e => updateNote(openNote.id, { content: e.target.value })} placeholder="Ecrivez votre note..." rows={8} />
              </div>
              {/* Linked tasks section */}
              <div>
                <label className="block text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">Tâches liées</label>
                {(() => {
                  const noteTasks = allTodos.filter(t => t.linkedNoteId === openNote.id)
                  return (
                    <div className="flex flex-col gap-1.5">
                      {noteTasks.map(t => {
                        const prio = PRIORITIES.find(p => p.value === t.priority)
                        return (
                          <div key={t.id} className="flex items-center gap-2 px-3 py-2 bg-card/60 border border-cyan-500/20 rounded-xl group/lt">
                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: prio?.color }} />
                            <span className={cn("text-xs flex-1 truncate", t.status === 'done' && "line-through text-muted-foreground/60")}>{t.text}</span>
                            <button className="flex items-center gap-1 px-1.5 py-0.5 bg-transparent border-none text-muted-foreground/40 cursor-pointer text-[0.6rem] rounded hover:bg-accent hover:text-foreground opacity-0 group-hover/lt:opacity-100 transition-all" onClick={() => updateTask(t.id, { linkedNoteId: null })}><Unlink size={9} /></button>
                          </div>
                        )
                      })}
                      <button className="flex items-center gap-2 px-3 py-2.5 w-full bg-white/[0.04] border border-dashed border-white/15 rounded-xl text-muted-foreground/60 cursor-pointer text-xs hover:bg-accent/30 hover:text-foreground hover:border-cyan-500/30 transition-all duration-150" onClick={() => { setTaskLinkPicker(openNote.id); setTaskLinkSearch('') }}>
                        <Link2 size={13} className="text-cyan-400/60" /> Lier une tâche existante...
                      </button>
                    </div>
                  )
                })()}
              </div>
              <button className={cn("flex items-center gap-1.5 px-3 py-2 bg-white/[0.06] border border-white/10 hover:bg-white/[0.12] rounded-xl cursor-pointer text-xs transition-all duration-150", openNote.starred ? "text-warning border-warning/30" : "text-muted-foreground hover:text-foreground")} onClick={() => updateNote(openNote.id, { starred: !openNote.starred })}>
                <Star size={12} className={openNote.starred ? "fill-warning" : ""} /> {openNote.starred ? 'Favori' : 'Ajouter aux favoris'}
              </button>
            </div>
          )}

          <div className="px-5 py-3 mt-auto border-t border-white/10 bg-secondary/30 flex items-center justify-between">
            <span className="text-[0.7rem] text-muted-foreground">{openTask && `Creee le ${new Date(openTask.createdAt).toLocaleDateString('fr-FR')}`}{openNote && `Modifiee ${new Date(openNote.updatedAt).toLocaleDateString('fr-FR')}`}</span>
            <button className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-transparent border border-destructive/30 rounded-lg text-destructive/80 cursor-pointer text-xs transition-all duration-150 hover:bg-destructive hover:text-white hover:border-destructive"
              onClick={() => { if (openTask) deleteTask(openTask.id); if (openNote) deleteNote(openNote.id); setOpenCardId(null); setOpenCardType(null) }}><Trash2 size={12} /> Supprimer definitivement</button>
          </div>
        </div>
      )}

      {/* Link note picker modal */}
      {linkPicker && (() => {
        const task = allTodos.find(t => t.id === linkPicker)
        if (!task) return null
        const lq = linkSearch.toLowerCase()
        const hiddenCount = notes.filter(n => linkedNoteIds.has(n.id)).length
        const availableNotes = notes.filter(n => {
          if (linkedNoteIds.has(n.id)) return false
          if (lq && !(n.title || '').toLowerCase().includes(lq) && !(n.content || '').toLowerCase().includes(lq)) return false
          return true
        })
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={() => setLinkPicker(null)}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div className="relative w-full max-w-[480px] max-h-[70vh] bg-card/80 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl shadow-black/30 flex flex-col animate-scale-in mx-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10 shrink-0">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/15 flex items-center justify-center text-cyan-400"><Link2 size={18} /></div>
                <div className="flex-1">
                  <h2 className="text-base font-bold">Lier une note</h2>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">a "{task.text}"</p>
                </div>
                <button className="flex items-center justify-center w-8 h-8 bg-transparent border-none text-muted-foreground cursor-pointer rounded-lg hover:bg-accent hover:text-foreground transition-colors" onClick={() => setLinkPicker(null)}><X size={16} /></button>
              </div>
              <div className="px-6 py-3 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2 px-3 py-2 bg-input border border-white/10 rounded-xl text-muted-foreground focus-within:border-violet-500/50 transition-colors">
                  <Search size={13} />
                  <input type="text" value={linkSearch} onChange={e => setLinkSearch(e.target.value)} placeholder="Rechercher une note..." autoFocus className="bg-transparent border-none text-foreground text-sm outline-none flex-1" />
                  {linkSearch && <button className="flex bg-transparent border-none text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => setLinkSearch('')}><X size={12} /></button>}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 min-h-0">
                <div className="flex flex-col gap-1.5">
                  {availableNotes.map(n => <NoteMiniCard key={n.id} n={n} onClick={() => linkNote(linkPicker, n.id)} />)}
                  {availableNotes.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-14 text-muted-foreground/40">
                      <StickyNote size={32} className="mb-3 opacity-40" />
                      <span className="text-sm">{notes.length === 0 ? 'Aucune note creee' : linkSearch ? 'Aucune note correspondante' : 'Toutes les notes sont deja liees'}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between px-6 py-3 border-t border-white/10 shrink-0 bg-secondary/30 rounded-b-2xl">
                {hiddenCount > 0 && <span className="text-[0.65rem] text-muted-foreground/50">{hiddenCount} note{hiddenCount > 1 ? 's' : ''} masquée{hiddenCount > 1 ? 's' : ''} (déjà liée{hiddenCount > 1 ? 's' : ''})</span>}
                {hiddenCount === 0 && <span />}
                <button className="px-4 py-2 bg-white/[0.06] border border-white/10 hover:bg-white/[0.12] rounded-xl text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors font-medium" onClick={() => setLinkPicker(null)}>Annuler</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Link task picker modal (for notes) */}
      {taskLinkPicker && (() => {
        const note = notes.find(n => n.id === taskLinkPicker)
        if (!note) return null
        const tq = taskLinkSearch.toLowerCase()
        const availableTasks = allTodos.filter(t => {
          if (t.linkedNoteId) return false
          if (tq && !t.text.toLowerCase().includes(tq)) return false
          return true
        })
        const hiddenTaskCount = allTodos.filter(t => t.linkedNoteId).length
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={() => setTaskLinkPicker(null)}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div className="relative w-full max-w-[480px] max-h-[70vh] bg-card/80 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl shadow-black/30 flex flex-col animate-scale-in mx-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10 shrink-0">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/15 flex items-center justify-center text-cyan-400"><Link2 size={18} /></div>
                <div className="flex-1">
                  <h2 className="text-base font-bold">Lier une tâche</h2>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">à "{note.title || 'Sans titre'}"</p>
                </div>
                <button className="flex items-center justify-center w-8 h-8 bg-transparent border-none text-muted-foreground cursor-pointer rounded-lg hover:bg-accent hover:text-foreground transition-colors" onClick={() => setTaskLinkPicker(null)}><X size={16} /></button>
              </div>
              <div className="px-6 py-3 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2 px-3 py-2 bg-input border border-white/10 rounded-xl text-muted-foreground focus-within:border-violet-500/50 transition-colors">
                  <Search size={13} />
                  <input type="text" value={taskLinkSearch} onChange={e => setTaskLinkSearch(e.target.value)} placeholder="Rechercher une tâche..." autoFocus className="bg-transparent border-none text-foreground text-sm outline-none flex-1" />
                  {taskLinkSearch && <button className="flex bg-transparent border-none text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => setTaskLinkSearch('')}><X size={12} /></button>}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 min-h-0">
                <div className="flex flex-col gap-1.5">
                  {availableTasks.map(t => <TaskMiniCard key={t.id} t={t} onClick={() => { updateTask(t.id, { linkedNoteId: taskLinkPicker }); setTaskLinkPicker(null); setTaskLinkSearch(''); logActivity('task_link', `Tache "${t.text}" liee a la note "${note.title || 'Sans titre'}"`) }} />)}
                  {availableTasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-14 text-muted-foreground/40">
                      <CheckSquare size={32} className="mb-3 opacity-40" />
                      <span className="text-sm">{allTodos.length === 0 ? 'Aucune tâche créée' : taskLinkSearch ? 'Aucune tâche correspondante' : 'Toutes les tâches sont déjà liées'}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between px-6 py-3 border-t border-white/10 shrink-0 bg-secondary/30 rounded-b-2xl">
                {hiddenTaskCount > 0 && <span className="text-[0.65rem] text-muted-foreground/50">{hiddenTaskCount} tâche{hiddenTaskCount > 1 ? 's' : ''} masquée{hiddenTaskCount > 1 ? 's' : ''} (déjà liée{hiddenTaskCount > 1 ? 's' : ''})</span>}
                {hiddenTaskCount === 0 && <span />}
                <button className="px-4 py-2 bg-white/[0.06] border border-white/10 hover:bg-white/[0.12] rounded-xl text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors font-medium" onClick={() => setTaskLinkPicker(null)}>Annuler</button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

export default KanbanBoard
