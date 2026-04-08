import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useProject } from '../contexts/ProjectContext'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'

export function useSupabaseData() {
  const { user } = useAuth()
  const { activeProjectId } = useProject()
  const { limits } = useSubscription()
  const [lists, setLists] = useState([])
  const [allTodos, setAllTodos] = useState([])
  const [notes, setNotes] = useState([])
  const [kanbanBoards, setKanbanBoards] = useState([])
  const [folders, setFolders] = useState([])
  const [attachments, setAttachments] = useState([])
  const [activityLog, setActivityLog] = useState([])
  const [shareLinks, setShareLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const lastProjectId = useRef(activeProjectId)

  // ======== FETCH ALL DATA ========
  const fetchAll = useCallback(async () => {
    if (!activeProjectId) {
      lastProjectId.current = null
      setLists([]); setAllTodos([]); setNotes([]); setKanbanBoards([]); setFolders([]); setAttachments([]); setActivityLog([]); setShareLinks([])
      setLoading(false)
      return
    }
    lastProjectId.current = activeProjectId
    setLoading(true)

    const [listsRes, tasksRes, notesRes, kanbanBoardsRes, foldersRes, attachmentsRes, activityRes, shareLinksRes] = await Promise.all([
      supabase.from('lists').select('*').eq('project_id', activeProjectId).order('position'),
      supabase.from('tasks').select('*, subtasks(*)').eq('project_id', activeProjectId).order('position'),
      supabase.from('notes').select('*').eq('project_id', activeProjectId).order('created_at', { ascending: false }),
      supabase.from('kanban_boards').select('*').eq('project_id', activeProjectId).order('position'),
      supabase.from('folders').select('*').eq('project_id', activeProjectId).order('created_at'),
      supabase.from('attachments').select('*').eq('project_id', activeProjectId).order('created_at', { ascending: false }),
      supabase.from('activity_log').select('*').eq('project_id', activeProjectId).order('created_at', { ascending: false }).limit(100),
      supabase.from('share_links').select('*').eq('project_id', activeProjectId).order('created_at', { ascending: false }),
    ])

    setLists((listsRes.data || []).map(l => ({ id: l.id, name: l.name, color: l.color || null, folderId: l.folder_id || null, linkedNoteId: l.linked_note_id || null, kanbanStatus: l.kanban_status || null, kanbanBoardId: l.kanban_board_id || null, kanbanLabels: l.kanban_labels || [] })))

    setAllTodos((tasksRes.data || []).map(t => ({
      id: t.id, listId: t.list_id, text: t.text, status: t.status, priority: t.priority,
      dueDate: t.due_date, notes: t.notes || '', tags: t.tags || [], starred: t.starred,
      onKanban: t.on_kanban, kanbanCol: t.kanban_col, kanbanBoardId: t.kanban_board_id,
      linkedNoteId: t.linked_note_id || null,
      createdAt: new Date(t.created_at).getTime(),
      subtasks: (t.subtasks || []).map(s => ({ id: s.id, text: s.text, done: s.done })),
    })))

    setNotes((notesRes.data || []).map(n => ({
      id: n.id, title: n.title || '', content: n.content || '', color: n.color,
      pinned: n.pinned, starred: n.starred, folder: n.folder_id || null,
      kanbanStatus: n.kanban_status, kanbanBoardId: n.kanban_board_id,
      kanbanLabels: n.kanban_labels || [],
      createdAt: new Date(n.created_at).getTime(),
      updatedAt: new Date(n.updated_at).getTime(),
    })))

    setKanbanBoards((kanbanBoardsRes.data || []).map(b => ({
      id: b.id, name: b.name, columns: b.columns || [],
      labels: b.labels || [],
      folderId: b.folder_id || null,
      position: b.position, createdAt: new Date(b.created_at).getTime(),
      updatedAt: new Date(b.updated_at).getTime(),
    })))

    setFolders((foldersRes.data || []).map(f => ({
      id: f.id, name: f.name, type: f.type || 'note',
    })))

    setAttachments((attachmentsRes.data || []).map(a => ({
      id: a.id, itemType: a.item_type, itemId: a.item_id,
      fileName: a.file_name, fileSize: a.file_size, fileType: a.file_type,
      storagePath: a.storage_path, createdAt: new Date(a.created_at).getTime(),
    })))

    setActivityLog((activityRes.data || []).map(a => ({
      id: a.id, type: a.type, text: a.text,
      timestamp: new Date(a.created_at).getTime(),
    })))

    setShareLinks((shareLinksRes.data || []).map(s => ({
      id: s.id, itemType: s.item_type, itemId: s.item_id, token: s.token,
      isActive: s.is_active, label: s.label || null,
      expiresAt: s.expires_at ? new Date(s.expires_at).getTime() : null,
      createdAt: s.created_at ? new Date(s.created_at).getTime() : null,
      createdBy: s.created_by,
    })))

    setLoading(false)
  }, [activeProjectId])

  useEffect(() => { fetchAll() }, [fetchAll])

  useEffect(() => {
    if (!user) {
      lastProjectId.current = null
      setLists([]); setAllTodos([]); setNotes([]); setKanbanBoards([]); setFolders([]); setAttachments([]); setActivityLog([]); setShareLinks([])
      setLoading(false)
    }
  }, [user])

  // ======== REALTIME SUBSCRIPTIONS (debounced) ========
  const fetchTimerRef = useRef(null)
  const debouncedFetchAll = useCallback(() => {
    if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current)
    fetchTimerRef.current = setTimeout(() => fetchAll(), 300)
  }, [fetchAll])

  useEffect(() => {
    if (!activeProjectId) return
    const channel = supabase
      .channel(`project-${activeProjectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${activeProjectId}` }, debouncedFetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lists', filter: `project_id=eq.${activeProjectId}` }, debouncedFetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes', filter: `project_id=eq.${activeProjectId}` }, debouncedFetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kanban_boards', filter: `project_id=eq.${activeProjectId}` }, debouncedFetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'folders', filter: `project_id=eq.${activeProjectId}` }, debouncedFetchAll)
      .subscribe()
    return () => {
      if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current)
      supabase.removeChannel(channel)
    }
  }, [activeProjectId, debouncedFetchAll])

  // ======== MUTATORS: LISTS ========
  const setListsDB = useCallback(async (updaterOrValue) => {
    const newLists = typeof updaterOrValue === 'function' ? updaterOrValue(lists) : updaterOrValue
    setLists(newLists)
  }, [lists])

  const addList = useCallback(async (name, folderId = null) => {
    const { data, error } = await supabase.from('lists').insert({
      project_id: activeProjectId, name, folder_id: folderId, position: lists.length,
    }).select().single()
    if (error) { console.error('addList failed:', error); return null }
    setLists(prev => [...prev, { id: data.id, name: data.name, color: data.color || null, folderId: data.folder_id || null, linkedNoteId: data.linked_note_id || null, kanbanStatus: data.kanban_status || null, kanbanBoardId: data.kanban_board_id || null }])
    return data
  }, [activeProjectId, lists.length])

  const updateList = useCallback(async (id, updates) => {
    const dbUpdates = {}
    if (updates.name !== undefined) dbUpdates.name = updates.name
    if (updates.linkedNoteId !== undefined) dbUpdates.linked_note_id = updates.linkedNoteId
    if (updates.kanbanStatus !== undefined) dbUpdates.kanban_status = updates.kanbanStatus
    if (updates.kanbanBoardId !== undefined) dbUpdates.kanban_board_id = updates.kanbanBoardId
    if (updates.kanbanLabels !== undefined) dbUpdates.kanban_labels = updates.kanbanLabels
    if (updates.color !== undefined) dbUpdates.color = updates.color
    setLists(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l))
    const { error } = await supabase.from('lists').update(dbUpdates).eq('id', id)
    if (error) { console.error('updateList failed:', error); fetchAll() }
  }, [fetchAll])

  const deleteList = useCallback(async (id) => {
    setLists(prev => prev.filter(l => l.id !== id))
    setAllTodos(prev => prev.filter(t => t.listId !== id))
    const { error } = await supabase.from('lists').delete().eq('id', id)
    if (error) { console.error('deleteList failed:', error); fetchAll() }
  }, [fetchAll])

  // ======== MUTATORS: TASKS ========
  const addTodo = useCallback(async (todo) => {
    const { data, error } = await supabase.from('tasks').insert({
      project_id: activeProjectId, list_id: todo.listId, text: todo.text,
      status: todo.status || 'todo', priority: todo.priority || 'medium',
      due_date: todo.dueDate || null, notes: todo.notes || '', tags: todo.tags || [],
      starred: todo.starred || false, on_kanban: todo.onKanban || false,
      kanban_col: todo.kanbanCol || null, kanban_board_id: todo.kanbanBoardId || null,
      linked_note_id: todo.linkedNoteId || null,
      position: Date.now(), created_by: user?.id,
    }).select('*, subtasks(*)').single()
    if (!error) {
      setAllTodos(prev => [...prev, {
        id: data.id, listId: data.list_id, text: data.text, status: data.status,
        priority: data.priority, dueDate: data.due_date, notes: data.notes || '',
        tags: data.tags || [], starred: data.starred, onKanban: data.on_kanban,
        kanbanCol: data.kanban_col, kanbanBoardId: data.kanban_board_id,
        linkedNoteId: data.linked_note_id || null,
        createdAt: new Date(data.created_at).getTime(), subtasks: [],
      }])
    }
    return data
  }, [activeProjectId, user?.id])

  const updateTodo = useCallback(async (id, updates) => {
    const dbUpdates = {}
    if (updates.text !== undefined) dbUpdates.text = updates.text
    if (updates.status !== undefined) dbUpdates.status = updates.status
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags
    if (updates.starred !== undefined) dbUpdates.starred = updates.starred
    if (updates.onKanban !== undefined) dbUpdates.on_kanban = updates.onKanban
    if (updates.kanbanCol !== undefined) dbUpdates.kanban_col = updates.kanbanCol
    if (updates.kanbanBoardId !== undefined) dbUpdates.kanban_board_id = updates.kanbanBoardId
    if (updates.listId !== undefined) dbUpdates.list_id = updates.listId
    if (updates.linkedNoteId !== undefined) dbUpdates.linked_note_id = updates.linkedNoteId
    dbUpdates.updated_at = new Date().toISOString()
    setAllTodos(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
    const { error } = await supabase.from('tasks').update(dbUpdates).eq('id', id)
    if (error) { console.error('updateTodo failed:', error); fetchAll() }
  }, [fetchAll])

  const deleteTodo = useCallback(async (id) => {
    setAllTodos(prev => prev.filter(t => t.id !== id))
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) { console.error('deleteTodo failed:', error); fetchAll() }
  }, [fetchAll])

  // ======== MUTATORS: SUBTASKS ========
  const addSubtask = useCallback(async (taskId, text) => {
    const { data } = await supabase.from('subtasks').insert({ task_id: taskId, text, done: false }).select().single()
    if (data) {
      setAllTodos(prev => prev.map(t => t.id === taskId ? {
        ...t, subtasks: [...(t.subtasks || []), { id: data.id, text: data.text, done: false }]
      } : t))
    }
    return data
  }, [])

  const updateSubtask = useCallback(async (taskId, subId, updates) => {
    setAllTodos(prev => prev.map(t => t.id === taskId ? {
      ...t, subtasks: (t.subtasks || []).map(s => s.id === subId ? { ...s, ...updates } : s)
    } : t))
    const { error } = await supabase.from('subtasks').update(updates).eq('id', subId)
    if (error) { console.error('updateSubtask failed:', error); fetchAll() }
  }, [fetchAll])

  const deleteSubtask = useCallback(async (taskId, subId) => {
    setAllTodos(prev => prev.map(t => t.id === taskId ? {
      ...t, subtasks: (t.subtasks || []).filter(s => s.id !== subId)
    } : t))
    const { error } = await supabase.from('subtasks').delete().eq('id', subId)
    if (error) { console.error('deleteSubtask failed:', error); fetchAll() }
  }, [fetchAll])

  // ======== MUTATORS: NOTES ========
  const addNote = useCallback(async (note) => {
    const { data } = await supabase.from('notes').insert({
      project_id: activeProjectId, title: note.title || '', content: note.content || '',
      color: note.color || '#8b5cf6', folder_id: note.folder === 'all' ? null : (note.folder || null),
      pinned: note.pinned || false, starred: note.starred || false,
      kanban_status: note.kanbanStatus || null, kanban_board_id: note.kanbanBoardId || null,
      created_by: user?.id,
    }).select().single()
    if (data) {
      const mapped = {
        id: data.id, title: data.title, content: data.content, color: data.color,
        pinned: data.pinned, starred: data.starred, folder: data.folder_id || null,
        kanbanStatus: data.kanban_status, kanbanBoardId: data.kanban_board_id,
        createdAt: new Date(data.created_at).getTime(),
        updatedAt: new Date(data.updated_at).getTime(),
      }
      setNotes(prev => [mapped, ...prev])
      return mapped
    }
    return null
  }, [activeProjectId, user?.id])

  const updateNote = useCallback(async (id, updates) => {
    const dbUpdates = { updated_at: new Date().toISOString() }
    if (updates.title !== undefined) dbUpdates.title = updates.title
    if (updates.content !== undefined) dbUpdates.content = updates.content
    if (updates.color !== undefined) dbUpdates.color = updates.color
    if (updates.pinned !== undefined) dbUpdates.pinned = updates.pinned
    if (updates.starred !== undefined) dbUpdates.starred = updates.starred
    if (updates.kanbanStatus !== undefined) dbUpdates.kanban_status = updates.kanbanStatus
    if (updates.kanbanBoardId !== undefined) dbUpdates.kanban_board_id = updates.kanbanBoardId
    if (updates.kanbanLabels !== undefined) dbUpdates.kanban_labels = updates.kanbanLabels
    if (updates.folder !== undefined) dbUpdates.folder_id = updates.folder
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n))
    const { error } = await supabase.from('notes').update(dbUpdates).eq('id', id)
    if (error) { console.error('updateNote failed:', error); fetchAll() }
  }, [fetchAll])

  const deleteNote = useCallback(async (id) => {
    setNotes(prev => prev.filter(n => n.id !== id))
    setAllTodos(prev => prev.map(t => t.linkedNoteId === id ? { ...t, linkedNoteId: null } : t))
    await supabase.from('tasks').update({ linked_note_id: null }).eq('linked_note_id', id)
    await supabase.from('lists').update({ linked_note_id: null }).eq('linked_note_id', id)
    const { error } = await supabase.from('notes').delete().eq('id', id)
    if (error) { console.error('deleteNote failed:', error); fetchAll() }
  }, [fetchAll])

  // ======== MUTATORS: KANBAN BOARDS ========
  const addKanbanBoard = useCallback(async (name) => {
    const { data, error } = await supabase.from('kanban_boards').insert({
      project_id: activeProjectId, name, position: Date.now(),
      created_by: user?.id,
    }).select().single()
    if (!error) setKanbanBoards(prev => [...prev, {
      id: data.id, name: data.name, columns: data.columns || [],
      position: data.position, createdAt: new Date(data.created_at).getTime(),
      updatedAt: new Date(data.updated_at).getTime(),
    }])
    return data
  }, [activeProjectId, user?.id])

  const updateKanbanBoard = useCallback(async (id, updates) => {
    const dbUpdates = {}
    if (updates.name !== undefined) dbUpdates.name = updates.name
    if (updates.columns !== undefined) dbUpdates.columns = updates.columns
    if (updates.labels !== undefined) dbUpdates.labels = updates.labels
    if (updates.position !== undefined) dbUpdates.position = updates.position
    dbUpdates.updated_at = new Date().toISOString()
    setKanbanBoards(prev => prev.map(b => b.id === id ? { ...b, ...updates, updatedAt: Date.now() } : b))
    const { error } = await supabase.from('kanban_boards').update(dbUpdates).eq('id', id)
    if (error) { console.error('updateKanbanBoard failed:', error); fetchAll() }
  }, [fetchAll])

  const deleteKanbanBoard = useCallback(async (id) => {
    setKanbanBoards(prev => prev.filter(b => b.id !== id))
    const { error } = await supabase.from('kanban_boards').delete().eq('id', id)
    if (error) { console.error('deleteKanbanBoard failed:', error); fetchAll(); return }
    await supabase.from('tasks').update({ kanban_board_id: null }).eq('kanban_board_id', id)
    await supabase.from('notes').update({ kanban_board_id: null }).eq('kanban_board_id', id)
    setAllTodos(prev => prev.map(t => t.kanbanBoardId === id ? { ...t, kanbanBoardId: null } : t))
    setNotes(prev => prev.map(n => n.kanbanBoardId === id ? { ...n, kanbanBoardId: null } : n))
  }, [fetchAll])

  // ======== MUTATORS: FOLDERS ========
  const addFolder = useCallback(async (name, type = 'note') => {
    const { data, error } = await supabase.from('folders').insert({
      project_id: activeProjectId, name, type,
    }).select().single()
    if (!error && data) {
      setFolders(prev => [...prev, { id: data.id, name: data.name, type: data.type || type }])
    }
    return data
  }, [activeProjectId])

  const deleteFolder = useCallback(async (id, type = 'note') => {
    setFolders(prev => prev.filter(f => f.id !== id))
    if (type === 'note') {
      setNotes(prev => prev.map(n => n.folder === id ? { ...n, folder: null } : n))
    }
    const { error } = await supabase.from('folders').delete().eq('id', id)
    if (error) { console.error('deleteFolder failed:', error); fetchAll() }
  }, [fetchAll])

  const updateFolder = useCallback(async (id, updates) => {
    const dbUpdates = {}
    if (updates.name !== undefined) dbUpdates.name = updates.name
    setFolders(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f))
    const { error } = await supabase.from('folders').update(dbUpdates).eq('id', id)
    if (error) { console.error('updateFolder failed:', error); fetchAll() }
  }, [fetchAll])

  // ======== ATTACHMENTS ========
  const totalStorageUsed = attachments.reduce((sum, a) => sum + (a.fileSize || 0), 0)

  const uploadAttachment = useCallback(async (itemType, itemId, file) => {
    if (!activeProjectId || !user) return { error: 'Non connecté' }
    const MAX_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_SIZE) return { error: 'Fichier trop volumineux (max 10 Mo)' }
    const quotaBytes = (limits.storageMB || 50) * 1024 * 1024
    if (totalStorageUsed + file.size > quotaBytes) {
      return { error: `Quota de stockage dépassé (${limits.storageMB || 50} Mo). Passez à un plan supérieur pour plus d'espace.`, quotaExceeded: true }
    }
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${activeProjectId}/${itemType}/${itemId}/${Date.now()}_${safeName}`
    const { error: uploadError } = await supabase.storage.from('attachments').upload(path, file)
    if (uploadError) return { error: uploadError.message }
    const { data, error } = await supabase.from('attachments').insert({
      project_id: activeProjectId, item_type: itemType, item_id: itemId,
      file_name: file.name, file_size: file.size, file_type: file.type || 'application/octet-stream',
      storage_path: path, created_by: user.id,
    }).select().single()
    if (error) return { error: error.message }
    setAttachments(prev => [{
      id: data.id, itemType: data.item_type, itemId: data.item_id,
      fileName: data.file_name, fileSize: data.file_size, fileType: data.file_type,
      storagePath: data.storage_path, createdAt: new Date(data.created_at).getTime(),
    }, ...prev])
    return data
  }, [activeProjectId, user, limits, totalStorageUsed])

  const deleteAttachment = useCallback(async (id, storagePath) => {
    setAttachments(prev => prev.filter(a => a.id !== id))
    await supabase.storage.from('attachments').remove([storagePath])
    const { error } = await supabase.from('attachments').delete().eq('id', id)
    if (error) { console.error('deleteAttachment failed:', error); fetchAll() }
  }, [fetchAll])

  const getAttachmentUrl = useCallback((storagePath) => {
    const { data } = supabase.storage.from('attachments').getPublicUrl(storagePath)
    return data?.publicUrl || ''
  }, [])

  // ======== ACTIVITY LOG ========
  const logActivity = useCallback(async (type, text) => {
    if (!activeProjectId || !user) return
    try {
      const { data } = await supabase.from('activity_log').insert({
        project_id: activeProjectId, user_id: user.id, type, text,
      }).select().single()
      if (data) {
        setActivityLog(prev => [{
          id: data.id, type: data.type, text: data.text,
          timestamp: new Date(data.created_at).getTime(),
        }, ...prev].slice(0, 100))
      }
    } catch (e) {
      console.error('logActivity failed:', e)
    }
  }, [activeProjectId, user])

  const clearOldActivity = useCallback(async (daysOld = 7) => {
    if (!activeProjectId) return
    const cutoff = new Date(Date.now() - daysOld * 86400000).toISOString()
    await supabase.from('activity_log').delete().eq('project_id', activeProjectId).lt('created_at', cutoff)
    setActivityLog(prev => prev.filter(a => a.timestamp >= Date.now() - daysOld * 86400000))
  }, [activeProjectId])

  // ======== SHARE LINKS ========
  // opts: { ttlDays?: number, expiresAt?: Date|string|null, label?: string }
  const createShareLink = useCallback(async (itemType, itemId, opts = {}) => {
    if (!activeProjectId || !user) return null
    const arr = new Uint8Array(32)
    crypto.getRandomValues(arr)
    const token = Array.from(arr, b => b.toString(16).padStart(2, '0')).join('')
    let expiresAt = null
    if (opts.expiresAt) {
      expiresAt = opts.expiresAt instanceof Date ? opts.expiresAt.toISOString() : new Date(opts.expiresAt).toISOString()
    } else if (typeof opts.ttlDays === 'number' && opts.ttlDays > 0) {
      expiresAt = new Date(Date.now() + opts.ttlDays * 86400000).toISOString()
    }
    const { data, error } = await supabase.from('share_links').insert({
      project_id: activeProjectId, item_type: itemType, item_id: itemId,
      token, created_by: user.id, is_active: true,
      expires_at: expiresAt, label: opts.label?.trim() || null,
    }).select().single()
    if (error) { console.error('createShareLink failed:', error); return null }
    setShareLinks(prev => [{
      id: data.id, itemType: data.item_type, itemId: data.item_id, token: data.token,
      isActive: data.is_active, label: data.label || null,
      expiresAt: data.expires_at ? new Date(data.expires_at).getTime() : null,
      createdAt: data.created_at ? new Date(data.created_at).getTime() : null,
      createdBy: data.created_by,
    }, ...prev])
    return token
  }, [activeProjectId, user])

  const revokeShareLink = useCallback(async (id) => {
    setShareLinks(prev => prev.map(s => s.id === id ? { ...s, isActive: false } : s))
    const { error } = await supabase.from('share_links').update({ is_active: false }).eq('id', id)
    if (error) { console.error('revokeShareLink failed:', error); fetchAll() }
  }, [fetchAll])

  const reactivateShareLink = useCallback(async (id) => {
    setShareLinks(prev => prev.map(s => s.id === id ? { ...s, isActive: true } : s))
    const { error } = await supabase.from('share_links').update({ is_active: true }).eq('id', id)
    if (error) { console.error('reactivateShareLink failed:', error); fetchAll() }
  }, [fetchAll])

  const deleteShareLink = useCallback(async (id) => {
    setShareLinks(prev => prev.filter(s => s.id !== id))
    const { error } = await supabase.from('share_links').delete().eq('id', id)
    if (error) { console.error('deleteShareLink failed:', error); fetchAll() }
  }, [fetchAll])

  const updateShareLink = useCallback(async (id, updates) => {
    const dbUpdates = {}
    if (updates.label !== undefined) dbUpdates.label = updates.label?.trim() || null
    if (updates.expiresAt !== undefined) {
      dbUpdates.expires_at = updates.expiresAt
        ? (updates.expiresAt instanceof Date ? updates.expiresAt.toISOString() : new Date(updates.expiresAt).toISOString())
        : null
    }
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive
    setShareLinks(prev => prev.map(s => s.id === id ? {
      ...s,
      ...(updates.label !== undefined ? { label: updates.label?.trim() || null } : {}),
      ...(updates.expiresAt !== undefined ? { expiresAt: updates.expiresAt ? new Date(updates.expiresAt).getTime() : null } : {}),
      ...(updates.isActive !== undefined ? { isActive: updates.isActive } : {}),
    } : s))
    const { error } = await supabase.from('share_links').update(dbUpdates).eq('id', id)
    if (error) { console.error('updateShareLink failed:', error); fetchAll() }
  }, [fetchAll])

  return {
    lists, allTodos, notes, kanbanBoards, folders, attachments, activityLog, loading,
    addList, updateList, deleteList, setLists: setListsDB,
    addTodo, updateTodo, deleteTodo, setAllTodos,
    addSubtask, updateSubtask, deleteSubtask,
    addNote, updateNote, deleteNote, setNotes,
    addKanbanBoard, updateKanbanBoard, deleteKanbanBoard,
    addFolder, deleteFolder, updateFolder, setFolders,
    uploadAttachment, deleteAttachment, getAttachmentUrl, totalStorageUsed,
    logActivity, clearOldActivity,
    shareLinks, createShareLink, revokeShareLink, reactivateShareLink, deleteShareLink, updateShareLink,
    refreshAll: fetchAll,
  }
}
