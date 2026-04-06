import { useState, useRef, useEffect } from 'react'
import {
  Plus, Trash2, Search, Calendar, X, Tag, Check, Circle, GripVertical,
  List, Clock, FileText, AlertCircle, Star, StarOff,
  LayoutList, Columns3, Link2, ChevronRight, MoreHorizontal, ArrowRight, ArrowLeft,
  Sparkles, Eye, EyeOff, Paperclip, File, Image, Upload, Folder, FolderPlus, Copy, Move
} from 'lucide-react'
import { cn } from '../lib/utils'
import { useProject } from '../contexts/ProjectContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import ShareButton from './ShareButton'

const STATUSES = [
  { value: 'todo', label: 'A faire', color: '#a78bfa', bgClass: 'bg-violet-500/15', textClass: 'text-violet-400' },
  { value: 'doing', label: 'En cours', color: '#60a5fa', bgClass: 'bg-blue-500/15', textClass: 'text-blue-400' },
  { value: 'done', label: 'Terminee', color: '#4ade80', bgClass: 'bg-emerald-500/15', textClass: 'text-emerald-400' },
]

const PRIORITIES = [
  { value: 'low', label: 'Basse', color: '#4ade80' },
  { value: 'medium', label: 'Moyenne', color: '#facc15' },
  { value: 'high', label: 'Haute', color: '#f87171' },
]

const TAG_COLORS = [
  { name: 'Travail', color: '#60a5fa' },
  { name: 'Personnel', color: '#4ade80' },
  { name: 'Urgent', color: '#f87171' },
  { name: 'Idee', color: '#c084fc' },
  { name: 'Achat', color: '#facc15' },
  { name: 'Sante', color: '#2dd4bf' },
]

function TodoList({ lists, setLists, allTodos, setAllTodos, notes, showToast,
  dbAddList, dbUpdateList, dbDeleteList, dbAddTodo, dbUpdateTodo, dbDeleteTodo,
  dbAddSubtask, dbUpdateSubtask, dbDeleteSubtask,
  attachments = [], uploadAttachment, deleteAttachment, getAttachmentUrl, totalStorageUsed = 0,
  createShareLink, logActivity,
  todoFolders = [], setTodoFolders, dbAddFolder, dbDeleteFolder,
  urlListId, urlTaskId, onNavigate, showUpgradeModal }) {
  const { myRole } = useProject()
  const { limits } = useSubscription()
  const canEdit = myRole === 'owner' || myRole === 'editor'
  const atListLimit = limits.lists && lists.length >= limits.lists
  const [activeListId, setActiveListId] = useState(null)
  const [viewMode, setViewMode] = useState('browser')
  const [listViewMode, setListViewMode] = useState('list')
  const [currentFolderId, setCurrentFolderId] = useState(null)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  const [openTaskId, setOpenTaskId] = useState(null)
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [browserSearch, setBrowserSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [newListName, setNewListName] = useState('')
  const [showNewList, setShowNewList] = useState(false)
  const [editingListId, setEditingListId] = useState(null)
  const [editListName, setEditListName] = useState('')
  const [subInput, setSubInput] = useState('')
  const [showTagPicker, setShowTagPicker] = useState(false)
  const [dragId, setDragId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)
  const [dragOverStatus, setDragOverStatus] = useState(null)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
  const [showNotePicker, setShowNotePicker] = useState(false)
  const [notePickerSearch, setNotePickerSearch] = useState('')
  const [showListNotePicker, setShowListNotePicker] = useState(false)
  const [listNotePickerSearch, setListNotePickerSearch] = useState('')
  const [inlineEditId, setInlineEditId] = useState(null)
  const [inlineEditText, setInlineEditText] = useState('')
  const [customTagInput, setCustomTagInput] = useState('')
  const [showCustomTagInput, setShowCustomTagInput] = useState(false)
  // Kanban enhanced state
  const [kanbanDropTarget, setKanbanDropTarget] = useState(null) // { status, index }
  const [kanbanAddingIn, setKanbanAddingIn] = useState(null) // column status
  const [kanbanNewText, setKanbanNewText] = useState('')
  const [kanbanNewPriority, setKanbanNewPriority] = useState('medium')
  const [kanbanCollapsed, setKanbanCollapsed] = useState({})
  const [kanbanCardMenu, setKanbanCardMenu] = useState(null) // task id
  const [lastDroppedId, setLastDroppedId] = useState(null)
  const [kanbanCompact, setKanbanCompact] = useState(false)
  const inputRef = useRef(null)
  const kanbanAddRef = useRef(null)
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  // === Selection state (browser + task list) ===
  const [selectedBrowserItems, setSelectedBrowserItems] = useState([]) // [{type:'folder'|'list', id}]
  const [selectedTaskIds, setSelectedTaskIds] = useState([]) // task ids
  const browserLastIdx = useRef(null)
  const taskLastIdx = useRef(null)
  const browserGridRef = useRef(null)
  const browserItemRefsMap = useRef({})
  const [lassoRect, setLassoRect] = useState(null)
  const lassoStartRef = useRef(null)
  const [showBrowserMoveMenu, setShowBrowserMoveMenu] = useState(false)

  // === Browser drag-and-drop ===
  const [browserDragItems, setBrowserDragItems] = useState(null) // [{type, id}]
  const [browserDragOverFolder, setBrowserDragOverFolder] = useState(null)
  const [browserReorderTarget, setBrowserReorderTarget] = useState(null) // {id, side: 'before'|'after'}
  const handleBrowserDragStart = (e, type, id) => {
    const dragging = isBrowserSelected(type, id) ? selectedBrowserItems.filter(s => s.type === 'list') : [{ type, id }]
    if (dragging.length === 0) return
    setBrowserDragItems(dragging)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', JSON.stringify(dragging))
    if (dragging.length > 1) {
      const badge = document.createElement('div')
      badge.textContent = `${dragging.length} listes`
      badge.style.cssText = 'padding:6px 14px;background:#7c3aed;color:#fff;border-radius:12px;font-size:13px;font-weight:600;position:absolute;top:-999px'
      document.body.appendChild(badge)
      e.dataTransfer.setDragImage(badge, 50, 18)
      setTimeout(() => badge.remove(), 0)
    }
  }
  const handleBrowserDragEnd = () => { setBrowserDragItems(null); setBrowserDragOverFolder(null); setBrowserReorderTarget(null) }
  const handleFolderDragOver = (e, folderId) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setBrowserDragOverFolder(folderId); setBrowserReorderTarget(null) }
  const handleFolderDragLeave = () => { setBrowserDragOverFolder(null) }
  const handleFolderDrop = (e, folderId) => {
    e.preventDefault(); if (!canEdit || !browserDragItems) return
    browserDragItems.forEach(s => { if (s.type === 'list') dbUpdateList(s.id, { folderId }) })
    setBrowserDragItems(null); setBrowserDragOverFolder(null); clearBrowserSelection()
  }
  const handleRootDrop = (e) => {
    e.preventDefault(); if (!canEdit || !browserDragItems || !currentFolderId) return
    browserDragItems.forEach(s => { if (s.type === 'list') dbUpdateList(s.id, { folderId: null }) })
    setBrowserDragItems(null); setBrowserDragOverFolder(null); setBrowserReorderTarget(null); clearBrowserSelection()
  }

  // Reorder: drag list over another list
  const handleListDragOver = (e, listId) => {
    e.preventDefault(); e.stopPropagation()
    if (!browserDragItems || browserDragItems.some(s => s.id === listId)) return
    const rect = e.currentTarget.getBoundingClientRect()
    const midX = rect.left + rect.width / 2
    setBrowserReorderTarget({ id: listId, side: e.clientX < midX ? 'before' : 'after' })
    setBrowserDragOverFolder(null)
    e.dataTransfer.dropEffect = 'move'
  }
  const handleListDrop = (e, targetListId) => {
    e.preventDefault(); e.stopPropagation()
    if (!browserDragItems || browserDragItems.some(s => s.id === targetListId)) { setBrowserReorderTarget(null); return }
    const draggedIds = browserDragItems.map(s => s.id)
    const draggedLists = draggedIds.map(id => lists.find(l => l.id === id)).filter(Boolean)
    const newLists = lists.filter(l => !draggedIds.includes(l.id))
    const targetIdx = newLists.findIndex(l => l.id === targetListId)
    if (targetIdx < 0) { setBrowserReorderTarget(null); return }
    const insertIdx = browserReorderTarget?.side === 'after' ? targetIdx + 1 : targetIdx
    newLists.splice(insertIdx, 0, ...draggedLists)
    setLists(newLists)
    setBrowserDragItems(null); setBrowserReorderTarget(null); clearBrowserSelection()
  }

  const clearBrowserSelection = () => { setSelectedBrowserItems([]); setShowBrowserMoveMenu(false) }
  const clearTaskSelection = () => { setSelectedTaskIds([]) }
  const isBrowserSelected = (type, id) => selectedBrowserItems.some(s => s.type === type && s.id === id)
  const isTaskSelected = (id) => selectedTaskIds.includes(id)

  const openList = (id) => { setActiveListId(id); setViewMode('list'); setOpenTaskId(null); clearBrowserSelection(); if (onNavigate) onNavigate({ listId: id }) }
  const goToBrowser = () => { setViewMode('browser'); if (onNavigate) onNavigate({}) }
  const enterFolder = (id) => { setCurrentFolderId(id) }
  const goToRoot = () => { setCurrentFolderId(null) }

  useEffect(() => {
    if (urlListId) {
      setActiveListId(urlListId)
      setViewMode('list')
      if (urlTaskId) setOpenTaskId(urlTaskId)
      else setOpenTaskId(null)
    } else {
      setViewMode('browser')
      setActiveListId(null)
      setOpenTaskId(null)
    }
  }, [urlListId, urlTaskId])

  const activeList = lists.find(l => l.id === activeListId) || lists[0]
  const todos = activeListId ? allTodos.filter(t => t.listId === activeListId) : []
  const openTask = allTodos.find(t => t.id === openTaskId)
  const taskAttachments = openTaskId ? attachments.filter(a => a.itemType === 'task' && a.itemId === openTaskId) : []

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (selectedBrowserItems.length > 0) { clearBrowserSelection(); return }
        if (selectedTaskIds.length > 0) { clearTaskSelection(); return }
        if (kanbanAddingIn) { setKanbanAddingIn(null); setKanbanNewText(''); setKanbanNewPriority('medium'); return }
        if (kanbanCardMenu) { setKanbanCardMenu(null); return }
        if (openTaskId) { setOpenTaskId(null); setMobileDetailOpen(false); if (onNavigate) onNavigate({ listId: activeListId }) }
        else if (viewMode === 'list') goToBrowser()
        else if (currentFolderId) goToRoot()
      }
      if (e.key === 'k' && !e.ctrlKey && !e.metaKey && viewMode === 'list' && !openTaskId && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault()
        setListViewMode(v => v === 'list' ? 'kanban' : 'list')
      }
    }
    const clickHandler = () => { if (kanbanCardMenu) setKanbanCardMenu(null) }
    window.addEventListener('keydown', handler)
    window.addEventListener('click', clickHandler)
    return () => { window.removeEventListener('keydown', handler); window.removeEventListener('click', clickHandler) }
  }, [openTaskId, viewMode, kanbanCardMenu, kanbanAddingIn, selectedBrowserItems, selectedTaskIds])

  // Folder CRUD
  const addTodoFolder = async () => { if (!canEdit || !newFolderName.trim()) return; if (dbAddFolder) { await dbAddFolder(newFolderName.trim(), 'list') }; setNewFolderName(''); setShowNewFolder(false) }
  const deleteTodoFolder = async (id) => { if (!canEdit) return; const folder = todoFolders.find(f => f.id === id); if (dbDeleteFolder) { await dbDeleteFolder(id, 'list') }; if (currentFolderId === id) setCurrentFolderId(null); if (showToast && folder) showToast(`Dossier "${folder.name}" supprime`, 'success') }

  // All task CRUD functions
  const addList = async () => { if (!canEdit || !newListName.trim()) return; const name = newListName.trim(); setNewListName(''); setShowNewList(false); const data = await dbAddList(name, currentFolderId || null); if (data) { setActiveListId(data.id); openList(data.id); logActivity('list_created', `Liste "${name}" creee`) } }
  const deleteList = async (id) => { if (!canEdit || lists.length <= 1) return; const name = lists.find(l => l.id === id)?.name; if (activeListId === id) setActiveListId(lists.find(l => l.id !== id)?.id); await dbDeleteList(id); logActivity('list_deleted', `Liste "${name}" supprimee`); if (showToast) showToast(`Liste "${name}" supprimee`, 'success') }
  const renameList = async (id) => { if (!canEdit || !editListName.trim()) { setEditingListId(null); return }; await dbUpdateList(id, { name: editListName.trim() }); setEditingListId(null) }
  const addTodo = async () => { if (!canEdit || !input.trim()) return; const text = input.trim(); setInput(''); await dbAddTodo({ listId: activeListId, text, status: 'todo', priority: 'medium', dueDate: null, notes: '', tags: [], starred: false }); logActivity('task_created', `Tache "${text}" creee`) }
  const updateTask = (id, updates) => { if (!canEdit) return; setAllTodos(allTodos.map(t => t.id === id ? { ...t, ...updates } : t)); dbUpdateTodo(id, updates) }
  const deleteTask = (id) => { if (!canEdit) return; const task = allTodos.find(t => t.id === id); setAllTodos(allTodos.filter(t => t.id !== id)); if (openTaskId === id) { setOpenTaskId(null); setMobileDetailOpen(false) }; dbDeleteTodo(id); logActivity('task_deleted', `Tache "${task?.text}" supprimee`); if (showToast && task) showToast(`Tache "${task.text}" supprimee`, 'success') }
  const cycleStatus = (id) => { if (!canEdit) return; const task = allTodos.find(t => t.id === id); const idx = STATUSES.findIndex(s => s.value === task.status); const nextIdx = (idx + 1) % STATUSES.length; const next = STATUSES[nextIdx].value; updateTask(id, { status: next }); if (next === 'done') { logActivity('task_done', `Tache "${task.text}" terminee`); if (showToast) showToast('Tache terminee \u2713', 'success') } else if (showToast) { showToast(`Statut: ${STATUSES[nextIdx].label}`, 'info') } }
  const addSubtask = async (todoId) => { if (!canEdit || !subInput.trim()) return; const text = subInput.trim(); setSubInput(''); await dbAddSubtask(todoId, text); logActivity('subtask_added', `Sous-tache "${text}" ajoutee`) }
  const toggleSubtask = async (todoId, subId) => { if (!canEdit) return; const task = allTodos.find(t => t.id === todoId); const sub = (task.subtasks || []).find(s => s.id === subId); if (sub) await dbUpdateSubtask(subId, { done: !sub.done }) }
  const deleteSubtask = async (todoId, subId) => { if (!canEdit) return; await dbDeleteSubtask(todoId, subId) }
  const toggleTag = (todoId, tagName) => { if (!canEdit) return; const task = allTodos.find(t => t.id === todoId); const tags = task.tags || []; updateTask(todoId, { tags: tags.includes(tagName) ? tags.filter(t => t !== tagName) : [...tags, tagName] }) }
  const isOverdue = (d) => d && new Date(d) < new Date(new Date().toDateString())


  const handleDragStart = (e, id) => { if (!canEdit) return; setDragId(id); e.dataTransfer.effectAllowed = 'move' }
  const handleDragOver = (e, id) => {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    setDragOverId(e.clientY < midY ? `${id}:before` : `${id}:after`)
  }
  const handleDrop = (e, targetId) => {
    e.preventDefault()
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return }
    const c = [...allTodos]
    const di = c.findIndex(t => t.id === dragId)
    const ti = c.findIndex(t => t.id === targetId)
    if (di < 0 || ti < 0) { setDragId(null); setDragOverId(null); return }
    const [m] = c.splice(di, 1)
    const newTi = c.findIndex(t => t.id === targetId)
    const insertIdx = dragOverId === `${targetId}:after` ? newTi + 1 : newTi
    c.splice(insertIdx, 0, m)
    setAllTodos(c)
    setDragId(null); setDragOverId(null)
  }

  const handleKanbanDragOver = (e, status) => { e.preventDefault(); setDragOverStatus(status) }
  const handleKanbanDrop = (e, status) => { e.preventDefault(); if (dragId) { const task = allTodos.find(t => t.id === dragId); if (task && task.status !== status) { updateTask(dragId, { status }); if (status === 'done') logActivity('task_done', `Tache "${task.text}" terminee`) } }; setDragId(null); setDragOverStatus(null) }

  // Enhanced kanban drag - position-aware
  const handleKanbanCardDragOver = (e, status, index) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    const insertIndex = e.clientY < midY ? index : index + 1
    setKanbanDropTarget({ status, index: insertIndex })
    setDragOverStatus(status)
  }
  const handleKanbanEnhancedDrop = (e, status, targetIndex) => {
    e.preventDefault()
    e.stopPropagation()
    if (!dragId) { resetKanbanDrag(); return }
    const task = allTodos.find(t => t.id === dragId)
    if (!task) { resetKanbanDrag(); return }

    const updated = [...allTodos]
    const dragIdx = updated.findIndex(t => t.id === dragId)
    const [moved] = updated.splice(dragIdx, 1)
    moved.status = status

    // Find the right position to insert among tasks of this status in this list
    const columnTasks = updated.filter(t => t.listId === activeListId && t.status === status)
    const insertIdx = targetIndex !== undefined && targetIndex < columnTasks.length
      ? updated.indexOf(columnTasks[targetIndex])
      : (columnTasks.length > 0 ? updated.indexOf(columnTasks[columnTasks.length - 1]) + 1 : updated.length)
    updated.splice(insertIdx, 0, moved)
    setAllTodos(updated)
    setLastDroppedId(dragId)
    setTimeout(() => setLastDroppedId(null), 400)
    if (status === 'done' && task.status !== 'done')
    resetKanbanDrag()
  }
  const resetKanbanDrag = () => { setDragId(null); setDragOverId(null); setDragOverStatus(null); setKanbanDropTarget(null) }
  const addKanbanCard = async (status) => {
    if (!canEdit || !kanbanNewText.trim()) return
    const text = kanbanNewText.trim()
    setKanbanNewText('')
    setKanbanNewPriority('medium')
    const data = await dbAddTodo({ listId: activeListId, text, status, priority: kanbanNewPriority, dueDate: null, notes: '', tags: [], starred: false })
   
    if (data) { setLastDroppedId(data.id); setTimeout(() => setLastDroppedId(null), 400) }
  }
  const moveToColumn = (taskId, newStatus) => {
    const task = allTodos.find(t => t.id === taskId)
    if (task) { updateTask(taskId, { status: newStatus }); if (newStatus === 'done') logActivity('task_done', `Tache "${task.text}" terminee`) }
    setKanbanCardMenu(null)
  }

  const filtered = todos.filter(t => { if (filterStatus !== 'all' && t.status !== filterStatus) return false; if (search) { const q = search.toLowerCase(); return t.text.toLowerCase().includes(q) || (t.notes || '').toLowerCase().includes(q) || (t.tags || []).some(tag => tag.toLowerCase().includes(q)) }; return true })
  const counts = { all: todos.length, todo: todos.filter(t => t.status === 'todo').length, doing: todos.filter(t => t.status === 'doing').length, done: todos.filter(t => t.status === 'done').length }
  const openDetail = (id) => { setOpenTaskId(id); setMobileDetailOpen(true); if (onNavigate) onNavigate({ listId: activeListId, taskId: id }) }
  const linkedNote = openTask?.linkedNoteId ? notes.find(n => n.id === openTask.linkedNoteId) : null

  // === Browser selection handlers ===
  const rectsIntersect = (a, b) => !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom)
  const handleBrowserMouseDown = (e) => {
    if (e.button !== 0) return
    if (e.target.closest('[data-lasso-item], button, input, a')) return
    e.preventDefault()
    clearBrowserSelection()
    lassoStartRef.current = { x: e.clientX, y: e.clientY }
    setLassoRect(null)
  }
  useEffect(() => {
    if (viewMode !== 'browser') return
    const handleMouseMove = (e) => {
      if (!lassoStartRef.current) return
      const start = lassoStartRef.current
      const x = Math.min(start.x, e.clientX), y = Math.min(start.y, e.clientY)
      const w = Math.abs(e.clientX - start.x), h = Math.abs(e.clientY - start.y)
      if (w < 5 && h < 5) return
      setLassoRect({ x, y, w, h })
      const lassoBox = { left: x, top: y, right: x + w, bottom: y + h }
      const newSelected = []
      for (const [key, el] of Object.entries(browserItemRefsMap.current)) {
        if (!el) continue
        const r = el.getBoundingClientRect()
        if (rectsIntersect(lassoBox, r)) { const [type, id] = key.split(':'); newSelected.push({ type, id }) }
      }
      setSelectedBrowserItems(newSelected)
    }
    const handleMouseUp = () => { lassoStartRef.current = null; setLassoRect(null) }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp) }
  }, [viewMode])

  const handleBrowserItemClick = (e, type, id, allItems) => {
    const idx = allItems.findIndex(i => i.type === type && i.id === id)
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault(); e.stopPropagation()
      setSelectedBrowserItems(prev => isBrowserSelected(type, id) ? prev.filter(s => !(s.type === type && s.id === id)) : [...prev, { type, id }])
      browserLastIdx.current = idx; return
    }
    if (e.shiftKey && browserLastIdx.current !== null) {
      e.preventDefault(); e.stopPropagation()
      const start = Math.min(browserLastIdx.current, idx), end = Math.max(browserLastIdx.current, idx)
      setSelectedBrowserItems(allItems.slice(start, end + 1)); return
    }
    setSelectedBrowserItems([{ type, id }])
    browserLastIdx.current = idx
  }
  const handleBrowserItemDblClick = (e, type, id) => {
    e.stopPropagation(); clearBrowserSelection()
    if (type === 'folder') enterFolder(id)
    else openList(id)
  }
  const deleteBrowserSelected = () => {
    if (!canEdit) return
    selectedBrowserItems.filter(s => s.type === 'list').forEach(s => deleteList(s.id))
    selectedBrowserItems.filter(s => s.type === 'folder').forEach(s => deleteTodoFolder(s.id))
    clearBrowserSelection()
  }
  const moveBrowserSelectedToFolder = (folderId) => {
    if (!canEdit) return
    selectedBrowserItems.filter(s => s.type === 'list').forEach(s => dbUpdateList(s.id, { folderId: folderId || null }))
    clearBrowserSelection()
  }

  // === Task selection handlers ===
  const handleTaskClick = (e, todoId) => {
    const idx = filtered.findIndex(t => t.id === todoId)
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault(); e.stopPropagation()
      setSelectedTaskIds(prev => isTaskSelected(todoId) ? prev.filter(id => id !== todoId) : [...prev, todoId])
      taskLastIdx.current = idx; return
    }
    if (e.shiftKey && taskLastIdx.current !== null) {
      e.preventDefault(); e.stopPropagation()
      const start = Math.min(taskLastIdx.current, idx), end = Math.max(taskLastIdx.current, idx)
      setSelectedTaskIds(filtered.slice(start, end + 1).map(t => t.id)); return
    }
    setSelectedTaskIds([todoId])
    taskLastIdx.current = idx
  }
  const handleTaskDblClick = (e, todoId) => {
    e.stopPropagation(); clearTaskSelection()
    openDetail(todoId)
  }
  const deleteSelectedTasks = () => {
    if (!canEdit) return
    selectedTaskIds.forEach(id => deleteTask(id))
    clearTaskSelection()
  }
  const setSelectedTasksStatus = (status) => {
    if (!canEdit) return
    selectedTaskIds.forEach(id => updateTask(id, { status }))
    clearTaskSelection()
  }

  // === Task card ===
  const renderTaskCard = (todo, compact = false, index = 0) => {
    const st = STATUSES.find(s => s.value === todo.status)
    const prio = PRIORITIES.find(p => p.value === todo.priority)
    const overdue = todo.status !== 'done' && isOverdue(todo.dueDate)
    const subtasks = todo.subtasks || []
    const subsDone = subtasks.filter(s => s.done).length
    const tags = todo.tags || []
    const taskSelected = isTaskSelected(todo.id)

    return (
      <div key={todo.id}
        data-task-card
        className={cn(
          "flex items-center gap-3 px-4 py-3 bg-card/80 backdrop-blur-sm border rounded-xl cursor-pointer transition-all duration-150 group",
          "hover:border-primary/30 hover:bg-accent/50 hover:shadow-sm",
          taskSelected ? "border-violet-500/60 bg-violet-500/[0.06] ring-1 ring-violet-500/30" : openTaskId === todo.id ? "border-primary/50 bg-accent/60 shadow-md shadow-primary/5 active-card-glow" : "border-white/10",
          dragId === todo.id && "opacity-50 scale-[0.98]",
          compact && "px-3 py-2.5 rounded-lg",
          `priority-bar-${todo.priority}`,
          !compact && "stagger-item"
        )}
        style={!compact ? { animationDelay: `${index * 0.03}s`, boxShadow: dragOverId === `${todo.id}:before` ? 'inset 0 3px 0 0 #8b5cf6' : dragOverId === `${todo.id}:after` ? 'inset 0 -3px 0 0 #8b5cf6' : undefined } : undefined}
        onClick={(e) => handleTaskClick(e, todo.id)}
        onDoubleClick={(e) => handleTaskDblClick(e, todo.id)}
        draggable onDragStart={e => handleDragStart(e, todo.id)}
        onDragOver={compact ? undefined : e => handleDragOver(e, todo.id)}
        onDrop={compact ? undefined : e => handleDrop(e, todo.id)}
        onDragEnd={() => { setDragId(null); setDragOverId(null); setDragOverStatus(null) }}
      >
        {!compact && <div className="text-muted-foreground/30 cursor-grab shrink-0 flex opacity-0 group-hover:opacity-100 transition-opacity duration-150"><GripVertical size={14} /></div>}
        {!compact && selectedTaskIds.length > 0 && (
          <div className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-150 shrink-0", taskSelected ? "bg-violet-500 border-violet-500" : "border-white/20 bg-black/20")}>
            {taskSelected && <Check size={12} className="text-white" />}
          </div>
        )}
        <button className="flex items-center justify-center w-7 h-7 rounded-full border-2 cursor-pointer shrink-0 transition-all duration-150 hover:scale-110 hover:shadow-md" style={{ background: st.color + '12', color: st.color, borderColor: st.color + '60' }}
          onClick={e => { e.stopPropagation(); cycleStatus(todo.id) }}>
          {todo.status === 'done' ? <Check size={13} /> : todo.status === 'doing' ? <Clock size={13} /> : <Circle size={13} />}
        </button>
        <div className="flex-1 min-w-0">
          <span className={cn("block text-[0.85rem] font-medium break-words leading-snug", todo.status === 'done' && "line-through text-muted-foreground")}>{todo.text}</span>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            {!compact && <span className="text-[0.68rem] font-semibold" style={{ color: st.color }}>{st.label}</span>}
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: prio.color }} />
            {todo.starred && <Star size={10} className="text-warning shrink-0 fill-warning" />}
            {todo.linkedNoteId && <Link2 size={10} className="text-primary/60 shrink-0" />}
            {todo.dueDate && <span className={cn("inline-flex items-center gap-1 text-[0.68rem] text-muted-foreground", overdue && "text-destructive font-semibold")}><Calendar size={10} /> {new Date(todo.dueDate).toLocaleDateString('fr-FR')}</span>}
            {subtasks.length > 0 && <span className="text-[0.68rem] text-muted-foreground bg-muted px-1.5 py-px rounded-md">{subsDone}/{subtasks.length}</span>}
            {!compact && tags.length > 0 && tags.map(tagName => {
              const tc = TAG_COLORS.find(t => t.name === tagName)
              return <span key={tagName} className="text-[0.6rem] px-2 py-0.5 rounded-lg font-semibold" style={{ background: (tc?.color || '#8b5cf6') + '15', color: tc?.color || '#8b5cf6' }}>{tagName}</span>
            })}
          </div>
        </div>
        <button className="flex bg-transparent border-none text-muted-foreground/40 cursor-pointer p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-150 hover:text-destructive hover:bg-destructive/10" onClick={e => { e.stopPropagation(); deleteTask(todo.id) }}><Trash2 size={14} /></button>
      </div>
    )
  }

  // ===== BROWSER VIEW =====
  if (viewMode === 'browser') {
    const allFiltered = browserSearch ? lists.filter(l => l.name.toLowerCase().includes(browserSearch.toLowerCase())) : lists
    const currentFolderObj = currentFolderId ? todoFolders.find(f => f.id === currentFolderId) : null
    const visibleFolders = currentFolderId ? [] : (browserSearch ? [] : todoFolders)
    const visibleLists = currentFolderId ? allFiltered.filter(l => l.folderId === currentFolderId) : allFiltered.filter(l => !l.folderId || !todoFolders.find(f => f.id === l.folderId))
    const getListsInFolder = (fid) => lists.filter(l => l.folderId === fid)

    return (
      <div className="flex-1 flex flex-col overflow-y-auto page-transition relative">
        <div className="px-10 pt-14 pb-4 relative z-1">
          <div className="flex items-center gap-5 mb-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-lg dash-header-icon" style={{ boxShadow: '0 8px 30px rgba(139,92,246,0.35), 0 0 50px rgba(139,92,246,0.12)' }}><List size={24} /></div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">Mes Listes</h1>
              <p className="text-sm text-muted-foreground mt-1.5">Organisez vos tâches par listes et dossiers</p>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-8 flex-wrap">
            <div className="flex items-center gap-3 px-5 py-2.5 bg-input border border-white/10 rounded-2xl text-muted-foreground transition-all duration-150 focus-within:border-violet-500/50 focus-within:shadow-[0_0_20px_rgba(139,92,246,0.15)]">
              <Search size={16} />
              <input type="text" value={browserSearch} onChange={e => setBrowserSearch(e.target.value)} placeholder="Rechercher..." className="bg-transparent border-none text-foreground text-sm outline-none w-40" />
              {browserSearch && <button className="flex bg-transparent border-none text-muted-foreground cursor-pointer hover:text-foreground transition-colors duration-150" onClick={() => setBrowserSearch('')}><X size={14} /></button>}
            </div>
            <div className="flex-1" />
            {!currentFolderId && <button className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-white/[0.06] border border-white/10 rounded-2xl text-sm text-muted-foreground cursor-pointer transition-all duration-150 hover:text-foreground hover:bg-white/[0.12]" onClick={() => setShowNewFolder(!showNewFolder)}><FolderPlus size={16} /> <span className="max-sm:hidden">Dossier</span></button>}
            <button className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 border-none rounded-2xl text-sm text-white cursor-pointer font-semibold shadow-lg shadow-violet-500/25 btn-glow" onClick={() => atListLimit ? showUpgradeModal?.('lists') : setShowNewList(!showNewList)}><Plus size={16} /> <span className="max-sm:hidden">Nouvelle liste</span></button>
          </div>

          {/* Breadcrumb */}
          {currentFolderId && currentFolderObj && (
            <div className="flex items-center gap-1.5 text-sm mb-4">
              <button className={cn("inline-flex items-center gap-1 bg-transparent border-none text-muted-foreground cursor-pointer text-sm hover:text-primary transition-colors duration-150", browserDragOverFolder === 'root' && "text-warning font-semibold")} onClick={goToRoot} onDragOver={e => { e.preventDefault(); setBrowserDragOverFolder('root') }} onDragLeave={() => setBrowserDragOverFolder(null)} onDrop={handleRootDrop}><List size={13} /> Listes</button>
              <ChevronRight size={12} className="text-muted-foreground/40" />
              <span className="inline-flex items-center gap-1 text-foreground font-medium"><Folder size={13} /> {currentFolderObj.name}</span>
            </div>
          )}
        </div>

        <div className="px-10 pb-10 pt-4 flex-1" onMouseDown={handleBrowserMouseDown}>
          {showNewFolder && !currentFolderId && (
            <div className="flex items-center gap-2 mb-5 animate-slide-up">
              <input type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addTodoFolder(); if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderName('') } }} placeholder="Nom du dossier..." autoFocus className="flex-1 px-4 py-2.5 bg-input border border-white/10 rounded-xl text-foreground text-sm outline-none focus:border-violet-500 focus:shadow-[0_0_20px_rgba(139,92,246,0.15)] glow-ring" />
              <button className="px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 border-none rounded-2xl text-sm text-white cursor-pointer font-semibold shadow-lg shadow-violet-500/25 disabled:opacity-40 btn-glow" onClick={addTodoFolder} disabled={!newFolderName.trim()}>Creer</button>
              <button className="px-5 py-2.5 bg-white/[0.06] border border-white/10 rounded-2xl text-sm text-muted-foreground cursor-pointer hover:bg-white/[0.12] hover:text-foreground transition-colors duration-150" onClick={() => { setShowNewFolder(false); setNewFolderName('') }}>Annuler</button>
            </div>
          )}

          {showNewList && (
            <div className="flex items-center gap-2 mb-5 animate-slide-up">
              <input type="text" value={newListName} onChange={e => setNewListName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addList(); if (e.key === 'Escape') { setShowNewList(false); setNewListName('') } }} placeholder="Nom de la nouvelle liste..." autoFocus className="flex-1 px-4 py-2.5 bg-input border border-violet-500/40 rounded-xl text-foreground text-sm outline-none focus:border-violet-500 focus:shadow-[0_0_20px_rgba(139,92,246,0.15)] glow-ring" />
              <button className="px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 border-none rounded-2xl text-sm text-white cursor-pointer font-semibold shadow-lg shadow-violet-500/25 disabled:opacity-40 btn-glow" onClick={addList} disabled={!newListName.trim()}>Creer</button>
              <button className="px-5 py-2.5 bg-white/[0.06] border border-white/10 rounded-2xl text-sm text-muted-foreground cursor-pointer hover:bg-white/[0.12] hover:text-foreground transition-colors duration-150" onClick={() => { setShowNewList(false); setNewListName('') }}>Annuler</button>
            </div>
          )}

          {/* Section label */}
          {!currentFolderId && visibleFolders.length > 0 && <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4"><FileText size={12} /> Listes</p>}

          <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-5 relative" ref={browserGridRef}>
            {lassoRect && (
              <div className="fixed border border-violet-500/50 bg-violet-500/10 rounded-sm pointer-events-none z-50" style={{ left: lassoRect.x, top: lassoRect.y, width: lassoRect.w, height: lassoRect.h }} />
            )}
            {/* Folders */}
            {visibleFolders.map((f, i) => {
              const count = getListsInFolder(f.id).length
              const allItems = [...visibleFolders.map(x => ({ type: 'folder', id: x.id })), ...visibleLists.map(x => ({ type: 'list', id: x.id }))]
              const selected = isBrowserSelected('folder', f.id)
              return (
                <div key={f.id}
                  data-lasso-item
                  ref={el => { browserItemRefsMap.current[`folder:${f.id}`] = el }}
                  className={cn("relative flex flex-col items-center gap-4 p-7 bg-card/80 backdrop-blur-sm border rounded-2xl cursor-pointer card-hover card-gradient-hover group stagger-item transition-all duration-200", browserDragOverFolder === f.id ? "border-warning/60 bg-warning/[0.08] scale-[1.03] shadow-lg shadow-warning/10" : selected ? "border-violet-500/60 bg-violet-500/[0.06] ring-1 ring-violet-500/30" : "border-white/10")}
                  style={{ animationDelay: `${i * 0.04}s` }}
                  onClick={(e) => handleBrowserItemClick(e, 'folder', f.id, allItems)}
                  onDoubleClick={(e) => handleBrowserItemDblClick(e, 'folder', f.id)}
                  onDragOver={e => handleFolderDragOver(e, f.id)}
                  onDragLeave={handleFolderDragLeave}
                  onDrop={e => handleFolderDrop(e, f.id)}
                >
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/15 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/25 transition-colors duration-150 shadow-sm"><Folder size={30} /></div>
                  {(selectedBrowserItems.length > 0) && (
                    <div className={cn("absolute top-3 left-3 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-150", selected ? "bg-violet-500 border-violet-500" : "border-white/20 bg-black/20 opacity-0 group-hover:opacity-100")}>
                      {selected && <Check size={12} className="text-white" />}
                    </div>
                  )}
                  <span className="text-sm font-semibold text-center">{f.name}</span>
                  <span className="text-xs text-muted-foreground">{count} liste{count !== 1 ? 's' : ''}</span>
                  {browserDragOverFolder === f.id && <span className="text-[0.6rem] text-warning font-semibold">Déposer ici</span>}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute top-3 right-3">
                    <button className="flex bg-transparent border-none text-muted-foreground/40 cursor-pointer p-1.5 rounded-lg hover:text-destructive hover:bg-destructive/10 transition-colors duration-150" onClick={e => { e.stopPropagation(); deleteTodoFolder(f.id) }}><Trash2 size={13} /></button>
                  </div>
                </div>
              )
            })}

            {/* Lists */}
            {visibleLists.map((l, i) => {
              const count = allTodos.filter(t => t.listId === l.id).length
              const doneCount = allTodos.filter(t => t.listId === l.id && t.status === 'done').length
              const pct = count > 0 ? Math.round((doneCount / count) * 100) : 0
              const allItems = [...visibleFolders.map(x => ({ type: 'folder', id: x.id })), ...visibleLists.map(x => ({ type: 'list', id: x.id }))]
              const selected = isBrowserSelected('list', l.id)
              return (
                <div key={l.id}
                  data-lasso-item
                  ref={el => { browserItemRefsMap.current[`list:${l.id}`] = el }}
                  className={cn("relative flex flex-col items-center gap-4 p-7 bg-card/80 backdrop-blur-sm border rounded-2xl cursor-pointer card-hover card-gradient-hover group stagger-item transition-all duration-200", browserDragItems?.some(s => s.id === l.id) && "opacity-50 scale-95", selected ? "border-violet-500/60 bg-violet-500/[0.06] ring-1 ring-violet-500/30" : "border-white/10")}
                  style={{ animationDelay: `${(visibleFolders.length + i) * 0.04}s`, boxShadow: browserReorderTarget?.id === l.id ? (browserReorderTarget.side === 'before' ? 'inset 3px 0 0 0 #8b5cf6' : 'inset -3px 0 0 0 #8b5cf6') : undefined }}
                  onClick={(e) => handleBrowserItemClick(e, 'list', l.id, allItems)}
                  onDoubleClick={(e) => handleBrowserItemDblClick(e, 'list', l.id)}
                  draggable
                  onDragStart={e => handleBrowserDragStart(e, 'list', l.id)}
                  onDragEnd={handleBrowserDragEnd}
                  onDragOver={e => handleListDragOver(e, l.id)}
                  onDrop={e => handleListDrop(e, l.id)}
                >
                  <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center text-primary group-hover:bg-primary/25 transition-colors duration-150 shadow-sm"><FileText size={30} /></div>
                  {(selectedBrowserItems.length > 0) && (
                    <div className={cn("absolute top-3 left-3 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-150", selected ? "bg-violet-500 border-violet-500" : "border-white/20 bg-black/20 opacity-0 group-hover:opacity-100")}>
                      {selected && <Check size={12} className="text-white" />}
                    </div>
                  )}
                  {editingListId === l.id ? (
                    <input className="w-full text-center px-2 py-1 bg-input border border-primary rounded-lg text-foreground text-sm outline-none" value={editListName} onChange={e => setEditListName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') renameList(l.id); if (e.key === 'Escape') setEditingListId(null) }} onBlur={() => renameList(l.id)} onClick={e => e.stopPropagation()} autoFocus />
                  ) : (
                    <span className="text-sm font-semibold text-center" onDoubleClick={e => { e.stopPropagation(); setEditingListId(l.id); setEditListName(l.name) }}>{l.name}</span>
                  )}
                  <div className="w-full">
                    <div className="flex justify-between text-[0.68rem] text-muted-foreground mb-1.5"><span className="counter-animate">{doneCount}/{count}</span><span className="counter-animate">{pct}%</span></div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full progress-gradient rounded-full transition-all duration-500" style={{ width: `${pct}%` }} /></div>
                  </div>
                  {(() => { const ln = l.linkedNoteId ? notes.find(n => n.id === l.linkedNoteId) : null; return ln ? (
                    <span className="inline-flex items-center gap-1 text-[0.6rem] font-medium px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/8" style={{ color: ln.color }} title={`Note liée : ${ln.title || 'Sans titre'}`}>
                      <Link2 size={9} /><span className="max-w-[80px] truncate">{ln.title || 'Sans titre'}</span>
                    </span>
                  ) : null })()}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute top-3 right-3">
                    <ShareButton itemType="list" itemId={l.id} createShareLink={createShareLink} />
                    {lists.length > 1 && <button className="flex bg-transparent border-none text-muted-foreground/40 cursor-pointer p-1.5 rounded-lg hover:text-destructive hover:bg-destructive/10 transition-colors duration-150" onClick={e => { e.stopPropagation(); deleteList(l.id) }}><Trash2 size={13} /></button>}
                  </div>
                </div>
              )
            })}
          </div>

          {visibleFolders.length === 0 && visibleLists.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 py-24">
              <div className="w-20 h-20 rounded-2xl bg-primary/5 flex items-center justify-center empty-icon"><List size={40} /></div>
              <div className="text-center">
                <p className="text-lg font-medium text-muted-foreground mb-1">Aucune liste</p>
                <p className="text-sm text-muted-foreground/60 mb-4">Creez votre premiere liste pour commencer</p>
                <button className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 border-none rounded-2xl text-sm text-white cursor-pointer font-semibold shadow-lg shadow-violet-500/25 btn-glow" onClick={() => atListLimit ? showUpgradeModal?.('lists') : setShowNewList(true)}><Plus size={15} /> Creer une liste</button>
              </div>
            </div>
          )}

          {/* Browser floating action bar */}
          {selectedBrowserItems.length > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 bg-card/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl" style={{ boxShadow: '0 15px 50px rgba(0,0,0,0.5), 0 0 40px rgba(139,92,246,0.08)' }}>
              <span className="text-sm font-semibold text-violet-400 mr-2">{selectedBrowserItems.length} sélectionné{selectedBrowserItems.length > 1 ? 's' : ''}</span>
              <div className="w-px h-5 bg-white/10" />
              {selectedBrowserItems.some(s => s.type === 'list') && todoFolders.length > 0 && (
                <div className="relative">
                  <button className="inline-flex items-center gap-2 px-3 py-1.5 bg-transparent border-none text-sm text-muted-foreground cursor-pointer rounded-xl hover:bg-white/[0.06] hover:text-foreground transition-all" onClick={() => setShowBrowserMoveMenu(!showBrowserMoveMenu)}>
                    <Move size={14} /> Déplacer
                  </button>
                  {showBrowserMoveMenu && (
                    <div className="absolute bottom-full left-0 mb-2 w-48 bg-card/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden z-50 py-1" style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}>
                      {currentFolderId && (
                        <button className="w-full flex items-center gap-2 px-3 py-2 bg-transparent border-none text-sm text-muted-foreground cursor-pointer hover:bg-white/[0.06] hover:text-foreground transition-colors text-left" onClick={() => moveBrowserSelectedToFolder(null)}>
                          <ChevronRight size={13} className="rotate-180" /> Racine
                        </button>
                      )}
                      {todoFolders.filter(f => f.id !== currentFolderId).map(f => (
                        <button key={f.id} className="w-full flex items-center gap-2 px-3 py-2 bg-transparent border-none text-sm text-muted-foreground cursor-pointer hover:bg-white/[0.06] hover:text-foreground transition-colors text-left" onClick={() => moveBrowserSelectedToFolder(f.id)}>
                          <Folder size={13} /> {f.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button className="inline-flex items-center gap-2 px-3 py-1.5 bg-transparent border-none text-sm text-destructive cursor-pointer rounded-xl hover:bg-destructive/10 transition-all" onClick={deleteBrowserSelected}>
                <Trash2 size={14} /> Supprimer
              </button>
              <div className="w-px h-5 bg-white/10" />
              <button className="inline-flex items-center justify-center w-7 h-7 bg-transparent border-none text-muted-foreground cursor-pointer rounded-lg hover:bg-white/[0.06] hover:text-foreground transition-all" onClick={clearBrowserSelection}><X size={14} /></button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ===== LIST / KANBAN VIEW =====
  return (
    <div className="flex h-full flex-1 relative">
      <div className="flex-1 flex flex-col overflow-y-auto p-8 min-w-0 max-md:p-4 page-transition relative z-1" onClick={(e) => { if (!e.target.closest('[data-task-card]') && !e.target.closest('[data-detail-panel]') && !e.target.closest('button') && !e.target.closest('a') && !e.target.closest('input')) { clearTaskSelection(); if (openTaskId) { setOpenTaskId(null); setMobileDetailOpen(false); if (onNavigate) onNavigate({ listId: activeListId }) } } }}>
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm mb-5">
          <button className="inline-flex items-center gap-1 bg-transparent border-none text-muted-foreground cursor-pointer text-sm hover:text-primary transition-colors duration-150" onClick={goToBrowser}><List size={13} /> Taches</button>
          {activeList?.folderId && (() => { const f = (todoFolders || []).find(x => x.id === activeList.folderId); return f ? <><ChevronRight size={12} className="text-muted-foreground/40" /><button className="inline-flex items-center gap-1 bg-transparent border-none text-muted-foreground cursor-pointer text-sm hover:text-primary transition-colors duration-150" onClick={() => { goToBrowser(); enterFolder(f.id) }}><Folder size={13} /> {f.name}</button></> : null })()}
          <ChevronRight size={12} className="text-muted-foreground/40" />
          <span className="text-foreground font-medium">{activeList?.name}</span>
        </div>

        {/* Header toolbar — title, search, linked note, view toggle */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <input
            key={`list-title-${activeList?.id}`}
            type="text"
            defaultValue={activeList?.name}
            onBlur={e => { const v = e.target.value.trim(); if (v && v !== activeList?.name) dbUpdateList(activeList.id, { name: v }) }}
            onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
            className="text-2xl font-bold tracking-tight shrink-0 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/30 max-w-[300px]"
            placeholder="Nom de la liste"
            readOnly={!canEdit}
          />
          <span className="text-sm text-muted-foreground bg-muted px-2.5 py-0.5 rounded-lg counter-animate shrink-0">{counts.done}/{counts.all}</span>

          {/* Search — inline, grows to fill space */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-input border border-white/10 rounded-xl text-muted-foreground flex-1 min-w-[140px] transition-all duration-150 focus-within:border-violet-500/50 focus-within:shadow-[0_0_15px_rgba(139,92,246,0.1)]">
            <Search size={13} className="shrink-0" />
            <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 bg-transparent border-none text-foreground text-xs outline-none min-w-0" />
            {search && <button className="flex bg-transparent border-none text-muted-foreground cursor-pointer hover:text-foreground transition-colors duration-150 shrink-0" onClick={() => setSearch('')}><X size={12} /></button>}
          </div>

          {/* Linked note — compact icon button with popover */}
          {(() => {
            const listLinkedNote = activeList?.linkedNoteId ? notes.find(n => n.id === activeList.linkedNoteId) : null
            return (
              <div className="relative shrink-0">
                {listLinkedNote ? (
                  <button
                    className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[0.68rem] font-medium border border-white/10 bg-white/[0.03] cursor-pointer transition-colors hover:bg-accent/50 group/note"
                    style={{ color: listLinkedNote.color }}
                    onClick={() => { setShowListNotePicker(!showListNotePicker); setListNotePickerSearch('') }}
                    title={listLinkedNote.title || 'Note liée'}
                  >
                    <FileText size={11} />
                    <span className="max-w-[100px] truncate max-md:hidden">{listLinkedNote.title || 'Sans titre'}</span>
                    <X size={9} className="opacity-0 group-hover/note:opacity-100 transition-opacity hover:text-destructive" onClick={(e) => { e.stopPropagation(); dbUpdateList(activeList.id, { linkedNoteId: null }) }} />
                  </button>
                ) : (
                  <button
                    className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[0.65rem] text-muted-foreground/50 border border-white/8 bg-transparent cursor-pointer transition-all hover:text-foreground hover:border-white/15"
                    onClick={() => { setShowListNotePicker(!showListNotePicker); setListNotePickerSearch('') }}
                    title="Lier une note"
                  >
                    <Link2 size={11} />
                  </button>
                )}
                {showListNotePicker && (() => {
                  const q = listNotePickerSearch.toLowerCase()
                  const alreadyLinked = new Set(allTodos.filter(t => t.linkedNoteId && t.id !== openTask?.id).map(t => t.linkedNoteId)); const filteredNotes = notes.filter(n => !alreadyLinked.has(n.id) && (!q || (n.title || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q)))
                  return (
                    <div className="absolute right-0 top-full mt-1 w-72 bg-card/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden z-50 animate-scale-in" style={{ boxShadow: '0 15px 40px rgba(0,0,0,0.4)' }}>
                      <div className="p-2.5">
                        <input
                          type="text" value={listNotePickerSearch} onChange={e => setListNotePickerSearch(e.target.value)}
                          placeholder="Rechercher une note..." autoFocus
                          className="w-full px-3 py-2 bg-input border border-white/10 rounded-lg text-foreground text-xs outline-none focus:border-violet-500 transition-colors"
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto px-1.5 pb-1.5">
                        {filteredNotes.slice(0, 20).map(n => (
                          <button key={n.id} className="flex items-center gap-2 w-full px-2.5 py-2 bg-transparent border-none text-foreground cursor-pointer rounded-lg text-xs text-left transition-colors hover:bg-accent" onClick={() => {
                            dbUpdateList(activeList.id, { linkedNoteId: n.id })
                            setShowListNotePicker(false)
                            logActivity('task_link', `Note "${n.title || 'Sans titre'}" liee a la liste "${activeList.name}"`)
                          }}>
                            <FileText size={12} style={{ color: n.color }} />
                            <span className="flex-1 truncate">{n.title || 'Sans titre'}</span>
                            {n.content && <span className="text-[0.55rem] text-muted-foreground/40 truncate max-w-[80px]">{n.content.slice(0, 30)}</span>}
                          </button>
                        ))}
                        {filteredNotes.length === 0 && (
                          <div className="text-center py-4 text-muted-foreground text-xs">{notes.length === 0 ? 'Aucune note créée' : 'Aucun résultat'}</div>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>
            )
          })()}

          {/* View toggle */}
          <div className="flex gap-0.5 bg-muted/60 rounded-xl p-1 border border-white/10 shrink-0">
            <button className={cn("flex items-center gap-1.5 px-2.5 py-1.5 bg-transparent border-none cursor-pointer text-xs rounded-lg transition-all duration-150", listViewMode === 'list' ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25" : "text-muted-foreground hover:text-foreground")} onClick={() => setListViewMode('list')}><LayoutList size={14} /></button>
            <button className={cn("flex items-center gap-1.5 px-2.5 py-1.5 bg-transparent border-none cursor-pointer text-xs rounded-lg transition-all duration-150", listViewMode === 'kanban' ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25" : "text-muted-foreground hover:text-foreground")} onClick={() => setListViewMode('kanban')}><Columns3 size={14} /></button>
          </div>
        </div>

        {/* Add task + filter row */}
        <div className="flex gap-2 mb-4 items-center">
          <input ref={inputRef} type="text" placeholder="Ajouter une tache..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTodo()} className="flex-1 px-4 py-2.5 bg-card/80 backdrop-blur-sm border border-white/10 rounded-xl text-foreground text-sm outline-none transition-all duration-150 focus:border-violet-500 focus:shadow-[0_0_20px_rgba(139,92,246,0.15)]" />
          <button className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-violet-500 to-purple-600 border-none rounded-xl text-white cursor-pointer shrink-0 shadow-lg shadow-violet-500/25 btn-glow" onClick={addTodo}><Plus size={18} /></button>
        </div>

        {listViewMode === 'list' && (
          <>
            <div className="flex gap-1.5 mb-3 flex-wrap max-md:flex-nowrap max-md:overflow-x-auto max-md:pb-1">
              <button className={cn("flex items-center gap-1.5 px-3.5 py-1.5 bg-card/80 backdrop-blur-sm border border-white/10 rounded-lg text-muted-foreground cursor-pointer text-xs transition-all duration-150 shrink-0", filterStatus === 'all' && "bg-gradient-to-r from-violet-500 to-purple-600 border-violet-500 text-white shadow-sm shadow-violet-500/20 filter-pill-active")} onClick={() => setFilterStatus('all')}>
                Toutes <span className="text-[0.68rem] bg-foreground/8 px-1.5 py-px rounded-lg counter-animate">{counts.all}</span>
              </button>
              {STATUSES.map(s => (
                <button key={s.value} className={cn("flex items-center gap-1.5 px-3.5 py-1.5 bg-card/80 backdrop-blur-sm border border-white/10 rounded-lg text-muted-foreground cursor-pointer text-xs transition-all duration-150 shrink-0", filterStatus === s.value && `${s.bgClass} border-current ${s.textClass} filter-pill-active`)} onClick={() => setFilterStatus(s.value)}>
                  <span className="w-2 h-2 rounded-full" style={{ background: s.color }} /> {s.label} <span className="text-[0.68rem] bg-foreground/8 px-1.5 py-px rounded-lg counter-animate">{counts[s.value]}</span>
                </button>
              ))}
            </div>

            {todos.length > 0 && (
              <div className="relative h-2 bg-muted rounded-full mb-5 overflow-hidden">
                <div className="absolute left-0 top-0 h-full progress-gradient rounded-full transition-all duration-500" style={{ width: `${(counts.done / counts.all) * 100}%` }} />
                <div className="absolute h-full bg-blue-500/70 rounded-full transition-all duration-500" style={{ left: `${(counts.done / counts.all) * 100}%`, width: `${(counts.doing / counts.all) * 100}%` }} />
                <div className="absolute inset-0 progress-shimmer rounded-full" />
              </div>
            )}

            <div className="flex flex-col gap-1.5 flex-1">
              {filtered.map((todo, i) => renderTaskCard(todo, false, i))}
              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-3 py-16">
                  <p className="text-sm text-muted-foreground">{todos.length === 0 ? 'Aucune tache dans cette liste' : 'Aucun resultat pour ce filtre'}</p>
                  {todos.length === 0 && (
                    <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 border-none rounded-2xl text-sm text-white cursor-pointer font-semibold shadow-lg shadow-violet-500/25 btn-glow" onClick={() => inputRef.current?.focus()}>
                      <Plus size={15} /> Ajoutez votre premiere tache
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Task floating action bar */}
        {selectedTaskIds.length > 0 && listViewMode === 'list' && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 bg-card/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl" style={{ boxShadow: '0 15px 50px rgba(0,0,0,0.5), 0 0 40px rgba(139,92,246,0.08)' }}>
            <span className="text-sm font-semibold text-violet-400 mr-2">{selectedTaskIds.length} tâche{selectedTaskIds.length > 1 ? 's' : ''}</span>
            <div className="w-px h-5 bg-white/10" />
            <button className="inline-flex items-center gap-2 px-3 py-1.5 bg-transparent border-none text-sm text-emerald-400 cursor-pointer rounded-xl hover:bg-emerald-500/10 transition-all" onClick={() => setSelectedTasksStatus('done')}>
              <Check size={14} /> Terminer
            </button>
            <button className="inline-flex items-center gap-2 px-3 py-1.5 bg-transparent border-none text-sm text-destructive cursor-pointer rounded-xl hover:bg-destructive/10 transition-all" onClick={deleteSelectedTasks}>
              <Trash2 size={14} /> Supprimer
            </button>
            <div className="w-px h-5 bg-white/10" />
            <button className="inline-flex items-center justify-center w-7 h-7 bg-transparent border-none text-muted-foreground cursor-pointer rounded-lg hover:bg-white/[0.06] hover:text-foreground transition-all" onClick={clearTaskSelection}><X size={14} /></button>
          </div>
        )}

        {listViewMode === 'kanban' && (
          <div className="flex flex-col flex-1 gap-3 page-transition">
            {/* Kanban toolbar */}
            <div className="flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles size={13} className="text-primary" />
                <span>Glissez les cartes entre colonnes • <kbd className="px-1.5 py-0.5 bg-muted border border-white/10 rounded text-[0.65rem]">K</kbd> pour basculer</span>
              </div>
              <button
                className={cn("flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.06] border border-white/10 rounded-xl text-xs text-muted-foreground cursor-pointer transition-all duration-150 hover:bg-white/[0.12] hover:text-foreground", kanbanCompact && "bg-violet-500/15 text-violet-400 border-violet-500/30")}
                onClick={() => setKanbanCompact(!kanbanCompact)}
              >
                {kanbanCompact ? <Eye size={13} /> : <EyeOff size={13} />}
                {kanbanCompact ? 'Detaille' : 'Compact'}
              </button>
            </div>

            {/* Kanban board */}
            <div className="flex gap-4 flex-1 overflow-x-auto pb-3 -mx-2 px-2">
              {STATUSES.map(status => {
                const columnTasks = filtered.filter(t => t.status === status.value)
                const isCollapsed = kanbanCollapsed[status.value]
                const isDropTarget = dragOverStatus === status.value && dragId
                const isDragSource = dragId && allTodos.find(t => t.id === dragId)?.status === status.value

                if (isCollapsed) {
                  return (
                    <div key={status.value} className="w-12 shrink-0 bg-card/30 backdrop-blur-sm border border-white/10 rounded-2xl flex flex-col items-center py-4 cursor-pointer transition-all duration-200 hover:bg-card/60 hover:border-violet-500/20"
                      onClick={() => setKanbanCollapsed({ ...kanbanCollapsed, [status.value]: false })}>
                      <span className="w-3 h-3 rounded-full mb-3" style={{ background: status.color }} />
                      <span className="text-[0.65rem] font-bold text-muted-foreground [writing-mode:vertical-lr] tracking-widest uppercase">{status.label}</span>
                      <span className="mt-3 text-[0.65rem] text-muted-foreground bg-muted w-6 h-6 rounded-full flex items-center justify-center font-semibold">{columnTasks.length}</span>
                    </div>
                  )
                }

                return (
                  <div key={status.value}
                    className={cn(
                      "flex-1 min-w-[280px] max-w-[400px] bg-card/30 backdrop-blur-sm border border-white/10 rounded-2xl flex flex-col transition-all duration-200",
                      isDropTarget && !isDragSource && "kanban-drop-active border-primary/60",
                      isDropTarget && isDragSource && "border-primary/30"
                    )}
                    onDragOver={e => { e.preventDefault(); setDragOverStatus(status.value) }}
                    onDrop={e => handleKanbanEnhancedDrop(e, status.value, kanbanDropTarget?.status === status.value ? kanbanDropTarget.index : undefined)}
                    onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) { setDragOverStatus(null); setKanbanDropTarget(null) } }}
                  >
                    {/* Column header */}
                    <div className={cn("flex items-center gap-2.5 px-4 py-3 border-b font-semibold text-sm rounded-t-2xl select-none", `kanban-header-${status.value}`)} style={{ borderBottomColor: status.color + '30' }}>
                      <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ background: status.color, boxShadow: `0 0 8px ${status.color}40` }} />
                      <span className="text-[0.82rem]">{status.label}</span>
                      <span className="ml-auto flex items-center gap-1.5">
                        <span className="text-[0.7rem] text-muted-foreground bg-muted/80 px-2.5 py-0.5 rounded-lg font-semibold counter-animate">{columnTasks.length}</span>
                        <button
                          className="flex items-center justify-center w-6 h-6 bg-transparent border-none text-muted-foreground/40 cursor-pointer rounded-lg hover:text-foreground hover:bg-muted transition-all duration-150"
                          onClick={() => setKanbanCollapsed({ ...kanbanCollapsed, [status.value]: true })}
                          title="Replier"
                        >
                          <EyeOff size={12} />
                        </button>
                      </span>
                    </div>

                    {/* Column body - scrollable */}
                    <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-1.5 kanban-column-body min-h-[120px] max-h-[calc(100vh-340px)]">
                      {columnTasks.length === 0 && !dragId && (
                        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/40">
                          <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center mb-2">
                            {status.value === 'todo' ? <Circle size={18} /> : status.value === 'doing' ? <Clock size={18} /> : <Check size={18} />}
                          </div>
                          <span className="text-xs">Aucune tache</span>
                        </div>
                      )}
                      {columnTasks.length === 0 && dragId && (
                        <div className={cn("kanban-empty-zone flex items-center justify-center py-10 text-muted-foreground/40 text-xs", isDropTarget && "active")}>
                          <span>Deposez ici</span>
                        </div>
                      )}

                      {columnTasks.map((todo, i) => {
                        const st = STATUSES.find(s => s.value === todo.status)
                        const prio = PRIORITIES.find(p => p.value === todo.priority)
                        const overdue = todo.status !== 'done' && isOverdue(todo.dueDate)
                        const subtasks = todo.subtasks || []
                        const subsDone = subtasks.filter(s => s.done).length
                        const tags = todo.tags || []
                        const isBeingDragged = dragId === todo.id
                        const showDropIndicator = kanbanDropTarget?.status === status.value && kanbanDropTarget?.index === i && dragId && dragId !== todo.id
                        const showDropAfter = kanbanDropTarget?.status === status.value && kanbanDropTarget?.index === i + 1 && i === columnTasks.length - 1 && dragId && dragId !== todo.id

                        return (
                          <div key={todo.id}>
                            {showDropIndicator && <div className="kanban-drop-indicator h-0 mb-1" />}
                            <div
                              className={cn(
                                "group relative bg-card/80 backdrop-blur-sm border border-white/10 rounded-xl cursor-pointer transition-all duration-150",
                                "hover:border-primary/30 hover:shadow-md hover:shadow-primary/5",
                                `priority-bar-${todo.priority}`,
                                openTaskId === todo.id && "border-primary/50 shadow-lg shadow-primary/10 active-card-glow",
                                isBeingDragged && "kanban-dragging",
                                lastDroppedId === todo.id && "kanban-card-drop",
                                kanbanCompact ? "px-3 py-2" : "px-3.5 py-3"
                              )}
                              draggable
                              onDragStart={e => { setDragId(todo.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', todo.id) }}
                              onDragOver={e => handleKanbanCardDragOver(e, status.value, i)}
                              onDrop={e => handleKanbanEnhancedDrop(e, status.value, kanbanDropTarget?.index)}
                              onDragEnd={resetKanbanDrag}
                              onClick={() => openDetail(todo.id)}
                            >
                              {/* Card content */}
                              <div className="flex items-start gap-2.5">
                                <button
                                  className="flex items-center justify-center w-6 h-6 rounded-full border-2 cursor-pointer shrink-0 transition-all duration-150 hover:scale-110 mt-0.5"
                                  style={{ background: st.color + '12', color: st.color, borderColor: st.color + '60' }}
                                  onClick={e => { e.stopPropagation(); cycleStatus(todo.id) }}
                                >
                                  {todo.status === 'done' ? <Check size={11} /> : todo.status === 'doing' ? <Clock size={11} /> : <Circle size={11} />}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <span className={cn(
                                    "block text-[0.82rem] font-medium leading-snug break-words",
                                    todo.status === 'done' && "line-through text-muted-foreground/60"
                                  )}>{todo.text}</span>

                                  {!kanbanCompact && (
                                    <>
                                      {/* Tags */}
                                      {tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                          {tags.map(tagName => {
                                            const tc = TAG_COLORS.find(t => t.name === tagName)
                                            return <span key={tagName} className="text-[0.6rem] px-2 py-0.5 rounded-lg font-semibold" style={{ background: (tc?.color || '#8b5cf6') + '18', color: tc?.color || '#8b5cf6' }}>{tagName}</span>
                                          })}
                                        </div>
                                      )}

                                      {/* Meta row */}
                                      <div className="flex items-center gap-2 flex-wrap mt-2">
                                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: prio.color }} title={prio.label} />
                                        {todo.starred && <Star size={10} className="text-warning shrink-0 fill-warning" />}
                                        {todo.linkedNoteId && <Link2 size={10} className="text-primary/60 shrink-0" />}
                                        {todo.dueDate && (
                                          <span className={cn("inline-flex items-center gap-1 text-[0.65rem]", overdue ? "text-destructive font-semibold" : "text-muted-foreground")}>
                                            <Calendar size={10} />
                                            {new Date(todo.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                          </span>
                                        )}
                                        {subtasks.length > 0 && (
                                          <span className="inline-flex items-center gap-1 text-[0.65rem] text-muted-foreground">
                                            <Check size={10} />
                                            <span>{subsDone}/{subtasks.length}</span>
                                            {subtasks.length > 0 && (
                                              <span className="inline-block w-10 h-1 bg-muted rounded-full overflow-hidden">
                                                <span className="block h-full rounded-full bg-success/70 transition-all" style={{ width: `${(subsDone / subtasks.length) * 100}%` }} />
                                              </span>
                                            )}
                                          </span>
                                        )}
                                      </div>
                                    </>
                                  )}

                                  {kanbanCompact && (
                                    <div className="flex items-center gap-1.5 mt-1">
                                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: prio.color }} />
                                      {todo.starred && <Star size={9} className="text-warning fill-warning" />}
                                      {todo.dueDate && <Calendar size={9} className={cn(overdue ? "text-destructive" : "text-muted-foreground/60")} />}
                                      {subtasks.length > 0 && <span className="text-[0.6rem] text-muted-foreground">{subsDone}/{subtasks.length}</span>}
                                      {tags.length > 0 && <div className="flex gap-0.5 ml-auto">{tags.slice(0, 3).map(tagName => { const tc = TAG_COLORS.find(t => t.name === tagName); return <span key={tagName} className="w-2 h-2 rounded-full" style={{ background: tc?.color || '#8b5cf6' }} /> })}</div>}
                                    </div>
                                  )}
                                </div>

                                {/* Quick actions */}
                                <div className="flex flex-col items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
                                  <button className="relative flex items-center justify-center w-6 h-6 bg-transparent border-none text-muted-foreground/50 cursor-pointer rounded-md hover:bg-muted hover:text-foreground transition-all duration-150"
                                    onClick={e => { e.stopPropagation(); setKanbanCardMenu(kanbanCardMenu === todo.id ? null : todo.id) }}>
                                    <MoreHorizontal size={13} />
                                  </button>
                                  <button className="flex items-center justify-center w-6 h-6 bg-transparent border-none text-muted-foreground/30 cursor-pointer rounded-md hover:text-destructive hover:bg-destructive/10 transition-all duration-150"
                                    onClick={e => { e.stopPropagation(); deleteTask(todo.id) }}>
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </div>

                              {/* Card context menu */}
                              {kanbanCardMenu === todo.id && (
                                <div className="absolute right-0 top-full mt-1 z-50 bg-card/80 backdrop-blur-sm border border-white/10 rounded-xl shadow-xl shadow-black/20 py-1.5 min-w-[160px] animate-scale-in" onClick={e => e.stopPropagation()}>
                                  <div className="px-3 py-1.5 text-[0.65rem] text-muted-foreground/60 uppercase tracking-wider font-semibold">Deplacer vers</div>
                                  {STATUSES.filter(s => s.value !== todo.status).map(s => (
                                    <button key={s.value} className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none text-foreground cursor-pointer text-xs hover:bg-accent transition-colors duration-150 text-left"
                                      onClick={() => moveToColumn(todo.id, s.value)}>
                                      <ArrowRight size={11} style={{ color: s.color }} />
                                      <span>{s.label}</span>
                                    </button>
                                  ))}
                                  <div className="h-px bg-white/10 mx-2 my-1" />
                                  <button className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none cursor-pointer text-xs hover:bg-accent transition-colors duration-150 text-left"
                                    onClick={() => { updateTask(todo.id, { starred: !todo.starred }); setKanbanCardMenu(null) }}>
                                    <Star size={11} className={todo.starred ? "text-warning fill-warning" : "text-muted-foreground"} />
                                    <span>{todo.starred ? 'Retirer favori' : 'Favori'}</span>
                                  </button>
                                  <button className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none text-destructive cursor-pointer text-xs hover:bg-destructive/10 transition-colors duration-150 text-left"
                                    onClick={() => { deleteTask(todo.id); setKanbanCardMenu(null) }}>
                                    <Trash2 size={11} />
                                    <span>Supprimer</span>
                                  </button>
                                </div>
                              )}
                            </div>
                            {showDropAfter && <div className="kanban-drop-indicator h-0 mt-1" />}
                          </div>
                        )
                      })}
                    </div>

                    {/* Column footer - add card */}
                    <div className="px-2.5 py-2.5 border-t border-white/10">
                      {kanbanAddingIn === status.value ? (
                        <div className="kanban-add-card flex flex-col gap-2">
                          <textarea
                            ref={kanbanAddRef}
                            value={kanbanNewText}
                            onChange={e => setKanbanNewText(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addKanbanCard(status.value) }
                              if (e.key === 'Escape') { setKanbanAddingIn(null); setKanbanNewText(''); setKanbanNewPriority('medium') }
                            }}
                            placeholder="Titre de la tache..."
                            autoFocus
                            rows={2}
                            className="w-full px-3 py-2.5 bg-input border border-violet-500/40 rounded-xl text-foreground text-sm outline-none resize-none font-[inherit] leading-snug focus:border-violet-500 focus:shadow-[0_0_20px_rgba(139,92,246,0.15)] transition-colors duration-150 glow-ring"
                          />
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              {PRIORITIES.map(p => (
                                <button key={p.value}
                                  className={cn("w-5 h-5 rounded-full border-2 transition-all duration-150 cursor-pointer hover:scale-110", kanbanNewPriority === p.value ? "scale-110 shadow-sm" : "opacity-50")}
                                  style={{ background: kanbanNewPriority === p.value ? p.color + '30' : 'transparent', borderColor: p.color }}
                                  onClick={() => setKanbanNewPriority(p.value)}
                                  title={p.label}
                                />
                              ))}
                            </div>
                            <div className="flex-1" />
                            <button className="px-3 py-1.5 bg-white/[0.06] border border-white/10 rounded-lg text-muted-foreground text-xs cursor-pointer hover:bg-white/[0.12] hover:text-foreground transition-colors duration-150"
                              onClick={() => { setKanbanAddingIn(null); setKanbanNewText(''); setKanbanNewPriority('medium') }}>Annuler</button>
                            <button className="px-3 py-1.5 bg-gradient-to-r from-violet-500 to-purple-600 border-none rounded-lg text-white text-xs cursor-pointer font-semibold shadow-lg shadow-violet-500/25 btn-glow disabled:opacity-40"
                              disabled={!kanbanNewText.trim()} onClick={() => addKanbanCard(status.value)}>Ajouter</button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border border-transparent rounded-xl text-muted-foreground/50 cursor-pointer text-xs transition-all duration-150 hover:bg-white/[0.06] hover:text-muted-foreground hover:border-white/10"
                          onClick={() => { setKanbanAddingIn(status.value); setKanbanNewText(''); setKanbanNewPriority('medium') }}
                        >
                          <Plus size={14} /> Ajouter une carte
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {openTask && (
        <div data-detail-panel className={cn(
          "w-[400px] bg-card/80 backdrop-blur-sm border-l border-white/10 flex flex-col overflow-y-auto shrink-0",
          "max-lg:w-[340px]",
          "max-md:fixed max-md:top-0 max-md:right-[-100%] max-md:w-full max-md:h-screen max-md:z-90 max-md:transition-all max-md:duration-200 max-md:border-l-0",
          mobileDetailOpen && "max-md:right-0"
        )}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-secondary/50">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Detail</h3>
            <div className="flex items-center gap-1">
              <button className={cn("flex items-center justify-center w-8 h-8 bg-transparent border-none cursor-pointer rounded-lg transition-all duration-150", openTask.starred ? "text-warning" : "text-muted-foreground hover:bg-accent hover:text-foreground")} onClick={() => updateTask(openTask.id, { starred: !openTask.starred })}>
                {openTask.starred ? <Star size={16} className="fill-warning" /> : <StarOff size={16} />}
              </button>
              <button className="flex items-center justify-center w-8 h-8 bg-transparent border-none text-muted-foreground cursor-pointer rounded-lg hover:bg-accent hover:text-foreground transition-colors duration-150" onClick={() => { setOpenTaskId(null); setMobileDetailOpen(false) }}><X size={16} /></button>
            </div>
          </div>

          <div className="p-5 space-y-5">
            <input className="w-full px-0 py-1 bg-transparent border-none border-b-2 border-white/10 text-foreground text-lg font-bold outline-none transition-colors duration-150 focus:border-violet-500 focus:shadow-[0_0_20px_rgba(139,92,246,0.15)]" value={openTask.text} onChange={e => updateTask(openTask.id, { text: e.target.value })} placeholder="Titre" />

            {/* Status */}
            <div>
              <label className="block text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">Etat</label>
              <div className="flex gap-1.5">
                {STATUSES.map(s => (
                  <button key={s.value} className={cn("flex items-center gap-1.5 px-3 py-2 bg-white/[0.06] border border-white/10 rounded-xl text-muted-foreground cursor-pointer text-xs transition-all duration-150 flex-1 justify-center hover:bg-white/[0.12]", openTask.status === s.value && `${s.bgClass} ${s.textClass} border-current font-semibold`)}
                    onClick={() => { updateTask(openTask.id, { status: s.value }) }}>
                    {s.value === 'done' ? <Check size={13} /> : s.value === 'doing' ? <Clock size={13} /> : <Circle size={13} />} {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">Priorite</label>
              <div className="flex gap-1.5">
                {PRIORITIES.map(p => (
                  <button key={p.value} className={cn("flex items-center gap-1.5 px-3 py-2 bg-white/[0.06] border border-white/10 rounded-xl text-muted-foreground cursor-pointer text-xs transition-all duration-150 flex-1 justify-center hover:bg-white/[0.12]", openTask.priority === p.value && "font-semibold")}
                    style={openTask.priority === p.value ? { background: p.color + '12', color: p.color, borderColor: p.color + '40' } : {}}
                    onClick={() => updateTask(openTask.id, { priority: p.value })}>{p.label}</button>
                ))}
              </div>
            </div>

            {/* List */}
            <div>
              <label className="block text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">Liste</label>
              <select className="w-full px-3 py-2 bg-input border border-white/10 rounded-xl text-foreground text-sm outline-none focus:border-violet-500/50 focus:shadow-[0_0_20px_rgba(139,92,246,0.15)] cursor-pointer transition-colors duration-150" value={openTask.listId} onChange={e => updateTask(openTask.id, { listId: e.target.value })}>
                {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">Tags</label>
              <div className="flex flex-wrap gap-1.5 items-center">
                {(openTask.tags || []).map(tagName => {
                  const tc = TAG_COLORS.find(t => t.name === tagName)
                  return <span key={tagName} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border" style={{ background: (tc?.color || '#8b5cf6') + '15', color: tc?.color || '#8b5cf6', borderColor: (tc?.color || '#8b5cf6') + '25' }}>
                    {tagName} <button className="flex bg-transparent border-none text-inherit cursor-pointer p-0 opacity-60 hover:opacity-100 transition-opacity duration-150" onClick={() => toggleTag(openTask.id, tagName)}><X size={10} /></button>
                  </span>
                })}
                <button className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/[0.06] border border-white/10 rounded-lg text-muted-foreground cursor-pointer text-xs transition-all duration-150 hover:bg-white/[0.12] hover:text-foreground" onClick={() => setShowTagPicker(!showTagPicker)}><Tag size={11} /> Ajouter</button>
                {!showCustomTagInput && (
                  <button className="inline-flex items-center justify-center w-6 h-6 bg-white/[0.06] border border-white/10 rounded-lg text-muted-foreground cursor-pointer text-xs transition-all duration-150 hover:bg-white/[0.12] hover:text-violet-400" onClick={() => setShowCustomTagInput(true)} title="Tag personnalise"><Plus size={11} /></button>
                )}
                {showCustomTagInput && (
                  <div className="inline-flex items-center gap-1 animate-scale-in">
                    <input
                      type="text"
                      value={customTagInput}
                      onChange={e => setCustomTagInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && customTagInput.trim()) { toggleTag(openTask.id, customTagInput.trim()); setCustomTagInput(''); setShowCustomTagInput(false) }
                        if (e.key === 'Escape') { setCustomTagInput(''); setShowCustomTagInput(false) }
                      }}
                      onBlur={() => { if (customTagInput.trim()) { toggleTag(openTask.id, customTagInput.trim()) }; setCustomTagInput(''); setShowCustomTagInput(false) }}
                      placeholder="Nouveau tag..."
                      autoFocus
                      className="w-24 px-2 py-1 bg-input border border-violet-500/40 rounded-lg text-foreground text-xs outline-none focus:border-violet-500 focus:shadow-[0_0_20px_rgba(139,92,246,0.15)] transition-colors duration-150"
                    />
                  </div>
                )}
              </div>
              {showTagPicker && (
                <div className="flex flex-wrap gap-1.5 mt-2 p-2.5 bg-muted rounded-xl border border-white/10 animate-scale-in">
                  {TAG_COLORS.filter(t => !(openTask.tags || []).includes(t.name)).map(t => (
                    <button key={t.name} className="flex items-center gap-1.5 px-2.5 py-1 bg-transparent border border-white/10 rounded-lg cursor-pointer text-xs transition-all duration-150 hover:border-current" style={{ color: t.color }}
                      onClick={() => { toggleTag(openTask.id, t.name); setShowTagPicker(false) }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: t.color }} /> {t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Due date */}
            <div>
              <label className="block text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">Echeance</label>
              <div className="flex items-center gap-2 flex-wrap">
                <input type="date" className="px-3 py-2 bg-input border border-white/10 rounded-xl text-foreground text-sm outline-none focus:border-violet-500/50 focus:shadow-[0_0_20px_rgba(139,92,246,0.15)] [color-scheme:dark] cursor-pointer transition-colors duration-150" value={openTask.dueDate || ''} onChange={e => updateTask(openTask.id, { dueDate: e.target.value || null })} />
                {openTask.dueDate && <button className="px-2.5 py-1.5 bg-white/[0.06] border border-white/10 rounded-lg text-muted-foreground cursor-pointer text-xs hover:bg-white/[0.12] hover:text-foreground transition-colors duration-150" onClick={() => updateTask(openTask.id, { dueDate: null })}>Retirer</button>}
                {openTask.dueDate && isOverdue(openTask.dueDate) && openTask.status !== 'done' && <span className="inline-flex items-center gap-1 text-xs text-destructive font-semibold"><AlertCircle size={12} /> En retard</span>}
              </div>
            </div>

            {/* Linked note */}
            <div>
              <label className="flex items-center gap-1.5 text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5"><Link2 size={11} /> Note liee</label>
              {linkedNote ? (
                <div className="bg-muted border border-white/10 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                    <div className="flex items-center gap-1.5 text-xs font-semibold"><FileText size={13} style={{ color: linkedNote.color }} /><span>{linkedNote.title || 'Sans titre'}</span></div>
                    <button className="flex w-6 h-6 items-center justify-center bg-transparent border-none text-muted-foreground cursor-pointer rounded hover:text-destructive transition-colors duration-150" onClick={() => updateTask(openTask.id, { linkedNoteId: null })}><X size={12} /></button>
                  </div>
                  <div className="px-3 py-2 text-xs text-muted-foreground leading-relaxed max-h-16 overflow-hidden">{(linkedNote.content || '').slice(0, 120)}{(linkedNote.content || '').length > 120 ? '...' : ''}</div>
                </div>
              ) : (
                <>
                  <button className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white/[0.06] border border-white/10 rounded-lg text-muted-foreground cursor-pointer text-xs hover:bg-white/[0.12] hover:text-foreground transition-all duration-150" onClick={() => { setShowNotePicker(!showNotePicker); setNotePickerSearch('') }}><Link2 size={11} /> Lier une note</button>
                  {showNotePicker && (() => {
                    const q = notePickerSearch.toLowerCase()
                    const alreadyLinked = new Set(allTodos.filter(t => t.linkedNoteId && t.id !== openTask.id).map(t => t.linkedNoteId)); const filtered = notes.filter(n => !alreadyLinked.has(n.id) && (!q || (n.title || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q)))
                    return (
                      <div className="mt-2 bg-card/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden animate-scale-in" style={{ boxShadow: '0 15px 40px rgba(0,0,0,0.4)' }}>
                        <div className="p-2.5">
                          <input type="text" value={notePickerSearch} onChange={e => setNotePickerSearch(e.target.value)} placeholder="Rechercher une note..." autoFocus
                            className="w-full px-3 py-2 bg-input border border-white/10 rounded-lg text-foreground text-xs outline-none focus:border-violet-500 transition-colors" />
                        </div>
                        <div className="max-h-44 overflow-y-auto px-1.5 pb-1.5">
                          {filtered.length === 0 ? (
                            <div className="text-center py-4 text-muted-foreground text-xs">{notes.length === 0 ? 'Aucune note' : 'Aucun résultat'}</div>
                          ) : filtered.slice(0, 20).map(n => (
                            <button key={n.id} className="flex items-center gap-2 px-2.5 py-2 bg-transparent border-none text-foreground cursor-pointer rounded-lg text-xs text-left transition-colors duration-150 w-full hover:bg-accent" onClick={() => { updateTask(openTask.id, { linkedNoteId: n.id }); setShowNotePicker(false); logActivity('task_link', `Note "${n.title || 'Sans titre'}" liee a la tache "${openTask.text}"`) }}>
                              <FileText size={12} style={{ color: n.color }} />
                              <span className="flex-1 truncate">{n.title || 'Sans titre'}</span>
                              {n.content && <span className="text-[0.55rem] text-muted-foreground/40 truncate max-w-[80px]">{n.content.slice(0, 30)}</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                </>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">Notes</label>
              <textarea className="w-full px-3 py-2.5 bg-input border border-white/10 rounded-xl text-foreground text-sm leading-relaxed outline-none resize-y font-[inherit] min-h-20 focus:border-violet-500/50 focus:shadow-[0_0_20px_rgba(139,92,246,0.15)] placeholder:text-muted-foreground/40 transition-colors duration-150" value={openTask.notes} onChange={e => updateTask(openTask.id, { notes: e.target.value })} placeholder="Ajoutez des notes..." rows={3} />
            </div>

            {/* Subtasks */}
            <div>
              <label className="block text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">Sous-taches <span className="counter-animate">({(openTask.subtasks || []).filter(s => s.done).length}/{(openTask.subtasks || []).length})</span></label>
              {(openTask.subtasks || []).length > 0 && <div className="h-1 bg-muted rounded-full mb-3 overflow-hidden"><div className="h-full progress-gradient rounded-full transition-all duration-300" style={{ width: `${((openTask.subtasks || []).filter(s => s.done).length / (openTask.subtasks || []).length) * 100}%` }} /></div>}
              <div className="flex flex-col gap-0.5 mb-2">
                {(openTask.subtasks || []).map(sub => (
                  <div key={sub.id} className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors duration-150 group/sub hover:bg-muted">
                    <button className={cn("flex bg-transparent border-none cursor-pointer p-0 transition-colors duration-150", sub.done ? "text-success" : "text-muted-foreground hover:text-primary")} onClick={() => toggleSubtask(openTask.id, sub.id)}>{sub.done ? <Check size={14} /> : <Circle size={14} />}</button>
                    <span className={cn("flex-1", sub.done && "line-through text-muted-foreground")}>{sub.text}</span>
                    <button className="flex bg-transparent border-none text-muted-foreground/30 cursor-pointer p-0.5 opacity-0 group-hover/sub:opacity-100 hover:text-destructive transition-all duration-150" onClick={() => deleteSubtask(openTask.id, sub.id)}><X size={12} /></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input type="text" placeholder="Nouvelle sous-tache..." value={subInput} onChange={e => setSubInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addSubtask(openTask.id) }} className="flex-1 px-3 py-2 bg-input border border-white/10 rounded-xl text-foreground text-sm outline-none focus:border-violet-500/50 focus:shadow-[0_0_20px_rgba(139,92,246,0.15)] transition-colors duration-150" />
                <button className="px-3 py-2 bg-gradient-to-r from-violet-500 to-purple-600 border-none rounded-xl text-white cursor-pointer text-xs font-medium shadow-lg shadow-violet-500/25 btn-glow" onClick={() => addSubtask(openTask.id)}>Ajouter</button>
              </div>
            </div>

            {/* Attachments */}
            {uploadAttachment && (
              <div>
                <label className="flex items-center gap-1.5 text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">
                  <Paperclip size={11} /> Pièces jointes
                  {taskAttachments.length > 0 && <span className="text-primary counter-animate">({taskAttachments.length})</span>}
                </label>
                {taskAttachments.length > 0 && (
                  <div className="flex flex-col gap-1.5 mb-2.5">
                    {taskAttachments.map(a => (
                      <div key={a.id} className="flex items-center gap-2 px-2.5 py-2 bg-muted rounded-lg group/att">
                        {a.fileType?.startsWith('image/') ? <Image size={13} className="text-emerald-400 shrink-0" /> : <File size={13} className="text-blue-400 shrink-0" />}
                        <a href={getAttachmentUrl(a.storagePath)} target="_blank" rel="noopener noreferrer" className="flex-1 text-xs text-foreground truncate hover:text-primary transition-colors">{a.fileName}</a>
                        <span className="text-[0.6rem] text-muted-foreground shrink-0">{a.fileSize < 1024 ? a.fileSize + ' o' : a.fileSize < 1048576 ? (a.fileSize / 1024).toFixed(1) + ' Ko' : (a.fileSize / 1048576).toFixed(1) + ' Mo'}</span>
                        {canEdit && <button className="flex bg-transparent border-none text-muted-foreground/30 cursor-pointer p-0.5 opacity-0 group-hover/att:opacity-100 hover:text-destructive transition-all" onClick={() => deleteAttachment(a.id, a.storagePath)}><X size={11} /></button>}
                      </div>
                    ))}
                  </div>
                )}
                {canEdit && (
                  <>
                    <button className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white/[0.06] border border-white/10 rounded-lg text-muted-foreground cursor-pointer text-xs transition-all hover:bg-white/[0.12] hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed" onClick={() => fileInputRef.current?.click()} disabled={uploading || (limits?.storageMB && totalStorageUsed >= limits.storageMB * 1024 * 1024)}>
                      {uploading ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Upload size={11} />}
                      {uploading ? 'Envoi...' : 'Ajouter un fichier'}
                    </button>
                    <input ref={fileInputRef} type="file" multiple className="hidden" onChange={async (e) => {
                      const files = Array.from(e.target.files || [])
                      if (!files.length) return
                      setUploading(true)
                      for (const file of files) {
                        const result = await uploadAttachment('task', openTask.id, file)
                        if (result?.quotaExceeded) { showUpgradeModal?.(result.error); break }
                        else if (result?.error && showToast) showToast(result.error, 'error')
                      }
                      setUploading(false)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }} />
                  </>
                )}
                {limits?.storageMB && (
                  <div className="mt-2.5">
                    <div className="flex items-center justify-between text-[0.6rem] text-muted-foreground mb-1">
                      <span>Stockage</span>
                      <span>{(totalStorageUsed / (1024 * 1024)).toFixed(1)} / {limits.storageMB} Mo</span>
                    </div>
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all duration-300", totalStorageUsed >= limits.storageMB * 1024 * 1024 ? "bg-destructive" : "progress-gradient")} style={{ width: `${Math.min(100, (totalStorageUsed / (limits.storageMB * 1024 * 1024)) * 100)}%` }} />
                    </div>
                    {totalStorageUsed >= limits.storageMB * 1024 * 1024 && (
                      <p className="text-[0.65rem] text-destructive mt-1.5 leading-snug">
                        Quota dépassé. Supprimez des pièces jointes ou <button className="underline font-semibold bg-transparent border-none text-destructive cursor-pointer p-0 text-[0.65rem]" onClick={() => showUpgradeModal?.(`Vous avez dépassé la limite de ${limits.storageMB} Mo de stockage. Supprimez des fichiers ou passez à l'offre supérieure.`)}>passez à l'offre supérieure</button>.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="px-5 py-3 mt-auto border-t border-white/10 bg-secondary/30 flex items-center justify-between">
            <span className="text-[0.7rem] text-muted-foreground">Creee le {new Date(openTask.createdAt).toLocaleDateString('fr-FR')}</span>
            <button className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-transparent border border-destructive/30 rounded-lg text-destructive/80 cursor-pointer text-xs transition-all duration-150 hover:bg-destructive hover:text-white hover:border-destructive" onClick={() => deleteTask(openTask.id)}><Trash2 size={12} /> Supprimer</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default TodoList
