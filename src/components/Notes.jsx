import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Plus, Trash2, Search, Pin, PinOff, Download, Maximize2, Minimize2,
  Bold, Italic, Underline, Strikethrough, Heading1, Heading2, List, ListOrdered, Link2,
  AlignLeft, AlignCenter, AlignRight, Type, Palette, Highlighter, Undo2, Redo2, Share2, ExternalLink,
  X, FolderPlus, Folder, FileText, Copy, Star, StarOff, Move,
  Check, CheckSquare, Link, ChevronRight, Paperclip, File, Image, Upload
} from 'lucide-react'
import { cn } from '../lib/utils'
import { useProject } from '../contexts/ProjectContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import ShareButton from './ShareButton'
import DOMPurify from 'dompurify'

const COLORS = ['#8b5cf6', '#f87171', '#4ade80', '#facc15', '#60a5fa', '#c084fc', '#fb923c', '#2dd4bf']

const NOTE_TEMPLATES = [
  { id: 'blank', name: 'Note vide', icon: '📄', content: '' },
  { id: 'meeting', name: 'Compte-rendu', icon: '📋', content: '# Reunion\n\n**Date:** \n**Participants:** \n\n## Points abordes\n\n- \n\n## Decisions\n\n- \n\n## Actions\n\n- [ ] \n- [ ] ' },
  { id: 'daily', name: 'Daily Standup', icon: '☀️', content: '# Daily\n\n## Hier\n\n- \n\n## Aujourd\'hui\n\n- \n\n## Blocages\n\n- ' },
  { id: 'brainstorm', name: 'Brainstorm', icon: '💡', content: '# Brainstorm\n\n## Idees\n\n- \n\n## Pour\n\n- \n\n## Contre\n\n- \n\n## Prochaines etapes\n\n- [ ] ' },
  { id: 'checklist', name: 'Checklist', icon: '✅', content: '# Checklist\n\n- [ ] \n- [ ] \n- [ ] \n- [ ] \n- [ ] ' },
]

function sanitizeUrl(url) {
  try { const p = new URL(url, window.location.origin); if (['http:', 'https:', 'mailto:'].includes(p.protocol)) return url; return '#' }
  catch { if (/^[a-zA-Z0-9#/.]/.test(url) && !url.includes(':')) return url; return '#' }
}

function renderMarkdown(text) {
  if (!text) return ''
  if (text.length > 100000) return '<p>Contenu trop long pour l\'aperçu.</p>'
  let h = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  h = h.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-[var(--input)] p-4 rounded-xl my-3 overflow-x-auto font-mono text-sm whitespace-pre leading-relaxed border border-[var(--border-color)]"><code>$2</code></pre>')
  h = h.replace(/`([^`]+)`/g, '<code class="bg-[var(--input)] px-1.5 py-0.5 rounded-md text-sm font-mono text-[var(--primary)]">$1</code>')
  h = h.replace(/^### (.+)$/gm, '<h4 class="text-base font-semibold mt-3 mb-1">$1</h4>')
  h = h.replace(/^## (.+)$/gm, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>')
  h = h.replace(/^# (.+)$/gm, '<h2 class="text-xl font-bold mt-5 mb-2">$1</h2>')
  h = h.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  h = h.replace(/\*(.+?)\*/g, '<em>$1</em>')
  h = h.replace(/__(.+?)__/g, '<u>$1</u>')
  h = h.replace(/~~(.+?)~~/g, '<del class="opacity-50">$1</del>')
  h = h.replace(/^&gt; (.+)$/gm, '<blockquote class="border-l-2 border-[var(--primary)] pl-4 my-3 text-[var(--muted-foreground)] italic">$1</blockquote>')
  h = h.replace(/^(-{3,}|_{3,}|\*{3,})$/gm, '<hr class="border-none border-t border-[var(--border-color)] my-5" />')
  h = h.replace(/^- (.+)$/gm, '<li class="my-1">$1</li>')
  h = h.replace(/(<li.*<\/li>\n?)+/g, '<ul class="pl-5 my-2 list-disc">$&</ul>')
  h = h.replace(/^\d+\. (.+)$/gm, '<li class="my-1">$1</li>')
  h = h.replace(/\[x\]/g, '<input type="checkbox" checked disabled class="mr-2 accent-[var(--primary)]" />')
  h = h.replace(/\[ \]/g, '<input type="checkbox" disabled class="mr-2 accent-[var(--primary)]" />')
  h = h.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, l, u) => `<a href="${sanitizeUrl(u)}" target="_blank" rel="noopener noreferrer" class="text-[var(--primary)] underline underline-offset-2 hover:opacity-80">${l}</a>`)
  h = h.replace(/\n/g, '<br />')
  return h
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' o'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko'
  return (bytes / (1024 * 1024)).toFixed(1) + ' Mo'
}

function getFileIcon(fileType) {
  if (fileType?.startsWith('image/')) return <Image size={14} className="text-emerald-400" />
  return <File size={14} className="text-blue-400" />
}

function Notes({ notes, setNotes, folders, setFolders, lists, setLists, allTodos, setAllTodos, logActivity,
  dbAddNote, dbUpdateNote, dbDeleteNote, dbUpdateTodo, dbUpdateList, dbAddFolder, dbDeleteFolder,
  createShareLink,
  attachments = [], uploadAttachment, deleteAttachment, getAttachmentUrl, totalStorageUsed = 0,
  urlNoteId, urlFolderId, onNavigate, showUpgradeModal }) {
  const { myRole } = useProject()
  const { limits, isFree } = useSubscription()
  const canEdit = myRole === 'owner' || myRole === 'editor'
  const [selectedNote, setSelectedNote] = useState(null)
  const [viewMode, setViewMode] = useState('browser')
  const [search, setSearch] = useState('')
  const [fullscreen, setFullscreen] = useState(false)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [newNoteName, setNewNoteName] = useState('')
  const [currentFolderId, setCurrentFolderId] = useState(null)
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [editNoteName, setEditNoteName] = useState('')
  const [showTaskLinker, setShowTaskLinker] = useState(false)
  const [taskLinkerSearch, setTaskLinkerSearch] = useState('')
  const [showListLinker, setShowListLinker] = useState(false)
  const [listLinkerSearch, setListLinkerSearch] = useState('')
  const [uploading, setUploading] = useState(false)
  const [showTextColor, setShowTextColor] = useState(false)
  const [showHighlight, setShowHighlight] = useState(false)
  const editorRef = useRef(null)
  const titleRef = useRef(null)
  const fileInputRef = useRef(null)
  const activeColorRef = useRef(null)
  const debounceTimerRef = useRef(null)
  const titleDebounceRef = useRef(null)

  // Flush pending debounce before switching notes
  const contentDirtyRef = useRef(false)

  const flushDebounce = useCallback(() => {
    if (debounceTimerRef.current) { clearTimeout(debounceTimerRef.current); debounceTimerRef.current = null }
    if (titleDebounceRef.current) { clearTimeout(titleDebounceRef.current); titleDebounceRef.current = null }
    // Sync dirty content to state before leaving
    if (contentDirtyRef.current && editorRef.current && selectedNote) {
      const html = editorRef.current.innerHTML
      setNotes(prev => prev.map(n => n.id === selectedNote ? { ...n, content: html, updatedAt: Date.now() } : n))
      if (dbUpdateNote) dbUpdateNote(selectedNote, { content: html })
      contentDirtyRef.current = false
    }
  }, [selectedNote, dbUpdateNote, setNotes])

  const debouncedContentSave = useCallback((id, html) => {
    if (!canEdit) return
    contentDirtyRef.current = true
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      setNotes(prev => prev.map(n => n.id === id ? { ...n, content: html, updatedAt: Date.now() } : n))
      if (dbUpdateNote) dbUpdateNote(id, { content: html })
      contentDirtyRef.current = false
    }, 400)
  }, [canEdit, dbUpdateNote, setNotes])

  const debouncedTitleSave = useCallback((id, title) => {
    if (!canEdit) return
    setNotes(prev => prev.map(n => n.id === id ? { ...n, title, updatedAt: Date.now() } : n))
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current)
    titleDebounceRef.current = setTimeout(() => { if (dbUpdateNote) dbUpdateNote(id, { title }) }, 400)
  }, [canEdit, dbUpdateNote, setNotes])

  // Initialize editor content when switching notes
  useEffect(() => {
    const note = notes.find(n => n.id === selectedNote)
    if (!note || !editorRef.current) return
    const html = note.content.includes('<') ? note.content : renderMarkdown(note.content)
    editorRef.current.innerHTML = DOMPurify.sanitize(html, { ADD_TAGS: ['font'], ADD_ATTR: ['style', 'color'] })
  }, [selectedNote])

  const openNote = (id) => { flushDebounce(); setSelectedNote(id); setViewMode('editor'); if (onNavigate) onNavigate(currentFolderId ? { folderId: currentFolderId, noteId: id } : { noteId: id }) }
  const goToBrowser = () => { flushDebounce(); setViewMode('browser'); setFullscreen(false); if (onNavigate) onNavigate(currentFolderId ? { folderId: currentFolderId } : {}) }
  const enterFolder = (id) => { setCurrentFolderId(id); if (onNavigate) onNavigate({ folderId: id }) }
  const goToRoot = () => { setCurrentFolderId(null); if (onNavigate) onNavigate({}) }

  // Sync URL state to component state
  useEffect(() => {
    if (urlFolderId) setCurrentFolderId(urlFolderId)
    else setCurrentFolderId(null)

    if (urlNoteId) {
      setSelectedNote(urlNoteId)
      setViewMode('editor')
    } else if (urlFolderId) {
      setViewMode('browser')
      setSelectedNote(null)
    } else {
      setViewMode('browser')
      setSelectedNote(null)
    }
  }, [urlNoteId, urlFolderId])

  const addNote = useCallback(async (templateContent = '') => {
    if (!canEdit) return
    const noteData = { title: newNoteName.trim() || '', content: templateContent, color: COLORS[0], folder: currentFolderId || 'all', pinned: false, starred: false }
    if (dbAddNote) {
      const created = await dbAddNote(noteData)
      if (created) { setNewNoteName(''); setShowTemplatePicker(false); openNote(created.id); logActivity('note_created', `Note "${noteData.title || 'Sans titre'}" creee`); setTimeout(() => titleRef.current?.focus(), 50) }
    } else {
      const now = Date.now()
      setNotes(prev => [{ ...noteData, id: now, createdAt: now, updatedAt: now }, ...prev])
      setNewNoteName(''); setShowTemplatePicker(false); openNote(now)
      logActivity('note_created', `Note "${noteData.title || 'Sans titre'}" creee`)
      setTimeout(() => titleRef.current?.focus(), 50)
    }
  }, [newNoteName, currentFolderId, setNotes, logActivity, dbAddNote])

  const [selectedItems, setSelectedItems] = useState([])
  const [showMoveMenu, setShowMoveMenu] = useState(false)
  const clearSelection = () => { setSelectedItems([]); setShowMoveMenu(false) }

  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.key === 'n') { e.preventDefault(); setShowTemplatePicker(true) }
      if (e.ctrlKey && e.key === 'e' && selectedNote) { e.preventDefault(); setFullscreen(f => !f) }
      if (e.key === 'Escape') { if (selectedItems.length > 0) { clearSelection(); return } if (showExportMenu) setShowExportMenu(false); else if (showTemplatePicker) setShowTemplatePicker(false); else if (fullscreen) setFullscreen(false); else if (viewMode === 'editor') goToBrowser(); else if (currentFolderId) goToRoot() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedNote, fullscreen, viewMode, showTemplatePicker, selectedItems])

  const updateNote = (id, updates) => { if (!canEdit) return; setNotes(notes.map(n => n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n)); if (dbUpdateNote) dbUpdateNote(id, updates) }
  const deleteNote = (id) => { if (!canEdit) return; const n = notes.find(x => x.id === id); if (dbDeleteNote) dbDeleteNote(id); else setNotes(notes.filter(x => x.id !== id)); if (selectedNote === id) { setSelectedNote(null); setViewMode('browser') }; logActivity('note_delete', `Note "${n?.title || 'Sans titre'}" supprimee`) }
  const renameNoteBrowser = (id) => { if (!canEdit) return; if (editNoteName.trim()) updateNote(id, { title: editNoteName.trim() }); setEditingNoteId(null) }
  const duplicateNote = (note) => { if (!canEdit) return; if (dbAddNote) { dbAddNote({ title: `${note.title} (copie)`, content: note.content, color: note.color, folder: note.folder, pinned: false, starred: false }) } else { const now = Date.now(); setNotes([{ ...note, id: now, title: `${note.title} (copie)`, createdAt: now, updatedAt: now }, ...notes]) } }
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showSharePopup, setShowSharePopup] = useState(false)
  const [shareUrl, setShareUrl] = useState(null)
  const [shareCopied, setShareCopied] = useState(false)
  const [shareLoading, setShareLoading] = useState(false)
  const shareRef = useRef(null)

  const handleShareNote = async (noteId) => {
    if (showSharePopup) { setShowSharePopup(false); return }
    if (!createShareLink) return
    setShareLoading(true)
    const token = await createShareLink('note', noteId)
    if (token) {
      const url = `${window.location.origin}/share/${token}`
      setShareUrl(url)
      setShowSharePopup(true)
      await navigator.clipboard.writeText(url)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    }
    setShareLoading(false)
  }

  // Close share popup on click outside
  useEffect(() => {
    if (!showSharePopup) return
    const handler = (e) => { if (shareRef.current && !shareRef.current.contains(e.target)) setShowSharePopup(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showSharePopup])

  const buildExportHtml = (note, forPrint = false) => {
    const date = new Date(note.updatedAt || Date.now()).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    const printStyles = forPrint ? 'body { background: white; color: #1a1a1a; } .content { color: #374151; } .content h1, .content h2, .content h3, .content strong, h1.title { color: #111; } .badge { border: 1px solid #ddd; color: #555; } .badge::before { background: #555; } .footer { color: #999; } .footer a { color: #555; }' : ''
    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${note.title || 'Note'} — Make Your List</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f0f14; color: #e4e4e7; line-height: 1.8; min-height: 100vh; }
  .container { max-width: 720px; margin: 0 auto; padding: 60px 32px; }
  .header { margin-bottom: 40px; padding-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.08); }
  .badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; letter-spacing: 0.5px; background: ${note.color || '#8b5cf6'}18; color: ${note.color || '#8b5cf6'}; margin-bottom: 16px; text-decoration: none; }
  .badge::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: ${note.color || '#8b5cf6'}; }
  .badge:hover { opacity: 0.8; }
  h1.title { font-size: 28px; font-weight: 700; color: #fafafa; margin-bottom: 8px; letter-spacing: -0.5px; }
  .meta { font-size: 12px; color: #71717a; }
  .content { font-size: 15px; color: #d4d4d8; }
  .content h1 { font-size: 24px; font-weight: 700; color: #fafafa; margin: 32px 0 12px; }
  .content h2 { font-size: 20px; font-weight: 600; color: #fafafa; margin: 28px 0 10px; }
  .content h3 { font-size: 17px; font-weight: 600; color: #e4e4e7; margin: 24px 0 8px; }
  .content p { margin: 0 0 12px; }
  .content ul, .content ol { padding-left: 24px; margin: 8px 0 16px; }
  .content li { margin: 4px 0; }
  .content a { color: #8b5cf6; text-decoration: underline; text-underline-offset: 2px; }
  .content blockquote { border-left: 3px solid #8b5cf6; padding: 8px 16px; margin: 16px 0; color: #a1a1aa; font-style: italic; background: rgba(139,92,246,0.05); border-radius: 0 8px 8px 0; }
  .content strong { color: #fafafa; font-weight: 600; }
  .content code { background: #27272a; padding: 2px 6px; border-radius: 4px; font-size: 13px; font-family: 'JetBrains Mono', monospace; }
  .content pre { background: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 16px; overflow-x: auto; margin: 16px 0; }
  .content pre code { background: none; padding: 0; }
  .content img { max-width: 100%; border-radius: 8px; margin: 12px 0; }
  .content table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  .content th, .content td { border: 1px solid #27272a; padding: 8px 12px; text-align: left; font-size: 13px; }
  .content th { background: #1c1c22; font-weight: 600; color: #fafafa; }
  .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.06); text-align: center; font-size: 11px; color: #52525b; }
  .footer a { color: #8b5cf6; text-decoration: none; }
  @media print { body { background: white; color: #1a1a1a; } .content { color: #374151; } .content h1, .content h2, .content h3, .content strong, h1.title { color: #111; } .badge { border: 1px solid #ddd; } .footer { color: #999; } }
  @media (prefers-color-scheme: light) { body { background: #fafafa; color: #1a1a1a; } .header { border-color: #e5e5e5; } h1.title { color: #111; } .content { color: #374151; } .content h1, .content h2, .content h3, .content strong { color: #111; } .content blockquote { background: rgba(139,92,246,0.05); color: #6b7280; } .content code { background: #f3f4f6; } .content pre { background: #f9fafb; border-color: #e5e7eb; } .content th { background: #f3f4f6; color: #111; } .content th, .content td { border-color: #e5e7eb; } .meta { color: #9ca3af; } .footer { border-color: #e5e5e5; color: #9ca3af; } }
  ${printStyles}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <a href="${window.location.origin}" class="badge">MAKE YOUR LIST</a>
    <h1 class="title">${note.title || 'Sans titre'}</h1>
    <div class="meta">Dernière modification : ${date}</div>
  </div>
  <div class="content">${note.content}</div>
  <div class="footer">Exporté depuis <a href="${window.location.origin}">Make Your List</a></div>
</div>
</body>
</html>`
  }

  const exportHtml = (note) => {
    const html = buildExportHtml(note)
    const b = new Blob([html], { type: 'text/html' })
    const u = URL.createObjectURL(b)
    const a = document.createElement('a')
    a.href = u; a.download = `${note.title || 'note'}.html`; a.click()
    URL.revokeObjectURL(u)
  }

  const exportPdf = (note) => {
    if (isFree) return
    const html = buildExportHtml(note, true)
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:800px;height:600px;'
    document.body.appendChild(iframe)
    iframe.contentDocument.open()
    iframe.contentDocument.write(html)
    iframe.contentDocument.close()
    iframe.onload = () => { iframe.contentWindow.print(); setTimeout(() => document.body.removeChild(iframe), 1000) }
  }

  const exportWord = (note) => {
    if (isFree) return
    const date = new Date(note.updatedAt || Date.now()).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    const wordHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${note.title || 'Note'}</title>
<style>
  body { font-family: Calibri, Arial, sans-serif; color: #1a1a1a; line-height: 1.6; padding: 40px; }
  h1.title { font-size: 26pt; color: #111; margin-bottom: 4px; }
  .meta { font-size: 9pt; color: #888; margin-bottom: 30px; }
  .content { font-size: 11pt; }
  .content h1 { font-size: 20pt; color: #111; margin-top: 20px; }
  .content h2 { font-size: 16pt; color: #222; margin-top: 16px; }
  .content h3 { font-size: 13pt; color: #333; margin-top: 12px; }
  .content blockquote { border-left: 3px solid #8b5cf6; padding-left: 12px; color: #555; font-style: italic; }
  .content a { color: #8b5cf6; }
  .content code { font-family: Consolas, monospace; background: #f3f4f6; padding: 1px 4px; font-size: 10pt; }
  .content pre { background: #f3f4f6; padding: 12px; font-family: Consolas, monospace; font-size: 9pt; border: 1px solid #e5e7eb; }
  .content table { border-collapse: collapse; width: 100%; }
  .content th, .content td { border: 1px solid #ccc; padding: 6px 10px; font-size: 10pt; }
  .content th { background: #f3f4f6; font-weight: bold; }
  .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 8pt; color: #aaa; text-align: center; }
</style></head>
<body>
  <h1 class="title">${note.title || 'Sans titre'}</h1>
  <div class="meta">Dernière modification : ${date}</div>
  <div class="content">${note.content}</div>
  <div class="footer">Exporté depuis Make Your List</div>
</body></html>`
    const b = new Blob(['\ufeff' + wordHtml], { type: 'application/msword' })
    const u = URL.createObjectURL(b)
    const a = document.createElement('a')
    a.href = u; a.download = `${note.title || 'note'}.doc`; a.click()
    URL.revokeObjectURL(u)
  }

  // Browser drag-and-drop: notes into folders + reorder
  const [browserDragNote, setBrowserDragNote] = useState(null)
  const [browserDragOverFolder, setBrowserDragOverFolder] = useState(null)
  const [browserReorderTarget, setBrowserReorderTarget] = useState(null) // {id, side: 'before'|'after'}
  const [lassoRect, setLassoRect] = useState(null) // {x,y,w,h} screen coords
  const lassoStartRef = useRef(null)
  const gridRef = useRef(null)
  const itemRefsMap = useRef({}) // key -> DOM element
  const handleBrowserDragStart = (e, noteId) => {
    // If dragging a selected item, drag all selected notes; otherwise drag just this one
    const draggingIds = isSelected('note', noteId) ? selectedItems.filter(s => s.type === 'note').map(s => s.id) : [noteId]
    setBrowserDragNote(draggingIds)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', JSON.stringify(draggingIds))
    if (draggingIds.length > 1) {
      const badge = document.createElement('div')
      badge.textContent = `${draggingIds.length} fichiers`
      badge.style.cssText = 'padding:6px 14px;background:#7c3aed;color:#fff;border-radius:12px;font-size:13px;font-weight:600;position:absolute;top:-999px'
      document.body.appendChild(badge)
      e.dataTransfer.setDragImage(badge, 50, 18)
      setTimeout(() => badge.remove(), 0)
    }
  }
  const handleBrowserDragEnd = () => { setBrowserDragNote(null); setBrowserDragOverFolder(null); setBrowserReorderTarget(null) }
  const handleFolderDragOver = (e, folderId) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setBrowserDragOverFolder(folderId); setBrowserReorderTarget(null) }
  const handleFolderDragLeave = () => { setBrowserDragOverFolder(null) }
  const handleFolderDrop = (e, folderId) => {
    e.preventDefault(); if (!canEdit || !browserDragNote) return
    browserDragNote.forEach(id => updateNote(id, { folder: folderId }))
    setBrowserDragNote(null); setBrowserDragOverFolder(null); clearSelection()
  }
  const handleRootDrop = (e) => {
    e.preventDefault(); if (!canEdit || !browserDragNote || !currentFolderId) return
    browserDragNote.forEach(id => updateNote(id, { folder: 'all' }))
    setBrowserDragNote(null); setBrowserDragOverFolder(null); setBrowserReorderTarget(null); clearSelection()
  }

  // Reorder: drag note over another note
  const handleNoteDragOver = (e, noteId) => {
    e.preventDefault(); e.stopPropagation()
    if (!browserDragNote || browserDragNote.includes(noteId)) return
    const rect = e.currentTarget.getBoundingClientRect()
    const midX = rect.left + rect.width / 2
    setBrowserReorderTarget({ id: noteId, side: e.clientX < midX ? 'before' : 'after' })
    setBrowserDragOverFolder(null)
    e.dataTransfer.dropEffect = 'move'
  }
  const handleNoteDrop = (e, targetNoteId) => {
    e.preventDefault(); e.stopPropagation()
    if (!browserDragNote || browserDragNote.includes(targetNoteId)) { setBrowserReorderTarget(null); return }
    const draggedNotes = browserDragNote.map(id => notes.find(n => n.id === id)).filter(Boolean)
    const newNotes = notes.filter(n => !browserDragNote.includes(n.id))
    const targetIdx = newNotes.findIndex(n => n.id === targetNoteId)
    if (targetIdx < 0) { setBrowserReorderTarget(null); return }
    const insertIdx = browserReorderTarget?.side === 'after' ? targetIdx + 1 : targetIdx
    newNotes.splice(insertIdx, 0, ...draggedNotes)
    setNotes(newNotes)
    setBrowserDragNote(null); setBrowserReorderTarget(null); clearSelection()
  }

  // Multi-select helpers
  const lastClickedIdx = useRef(null)
  const isSelected = (type, id) => selectedItems.some(s => s.type === type && s.id === id)
  const getAllItems = () => [...visibleFolders.map(f => ({ type: 'folder', id: f.id })), ...visibleNotes.map(n => ({ type: 'note', id: n.id }))]

  // Rubber band / lasso selection
  const rectsIntersect = (a, b) => !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom)
  const handleGridMouseDown = (e) => {
    if (e.button !== 0) return
    // Don't start lasso if clicking on a card, button, or input
    if (e.target.closest('[data-lasso-item], button, input, a')) return
    e.preventDefault()
    clearSelection()
    lassoStartRef.current = { x: e.clientX, y: e.clientY }
    setLassoRect(null)
  }
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!lassoStartRef.current) return
      const start = lassoStartRef.current
      const x = Math.min(start.x, e.clientX)
      const y = Math.min(start.y, e.clientY)
      const w = Math.abs(e.clientX - start.x)
      const h = Math.abs(e.clientY - start.y)
      if (w < 5 && h < 5) return // ignore tiny drags
      setLassoRect({ x, y, w, h })
      // Find intersecting items
      const lassoBox = { left: x, top: y, right: x + w, bottom: y + h }
      const newSelected = []
      for (const [key, el] of Object.entries(itemRefsMap.current)) {
        if (!el) continue
        const r = el.getBoundingClientRect()
        if (rectsIntersect(lassoBox, r)) {
          const [type, id] = key.split(':')
          newSelected.push({ type, id })
        }
      }
      setSelectedItems(newSelected)
    }
    const handleMouseUp = () => {
      lassoStartRef.current = null
      setLassoRect(null)
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp) }
  }, [])

  const handleItemClick = (e, type, id) => {
    const all = getAllItems()
    const idx = all.findIndex(i => i.type === type && i.id === id)
    if (e.ctrlKey || e.metaKey) {
      // Ctrl+Click: toggle this item in selection
      e.preventDefault()
      e.stopPropagation()
      setSelectedItems(prev => isSelected(type, id) ? prev.filter(s => !(s.type === type && s.id === id)) : [...prev, { type, id }])
      lastClickedIdx.current = idx
      return
    }
    if (e.shiftKey && lastClickedIdx.current !== null) {
      // Shift+Click: range selection
      e.preventDefault()
      e.stopPropagation()
      const start = Math.min(lastClickedIdx.current, idx)
      const end = Math.max(lastClickedIdx.current, idx)
      setSelectedItems(all.slice(start, end + 1))
      return
    }
    // Normal click: select this item only
    setSelectedItems([{ type, id }])
    lastClickedIdx.current = idx
  }
  const handleItemDoubleClick = (e, type, id) => {
    e.stopPropagation()
    clearSelection()
    if (type === 'folder') enterFolder(id)
    else openNote(id)
  }
  const deleteSelected = () => {
    if (!canEdit) return
    selectedItems.filter(s => s.type === 'note').forEach(s => deleteNote(s.id))
    selectedItems.filter(s => s.type === 'folder').forEach(s => deleteFolder(s.id))
    clearSelection()
  }
  const moveSelectedToFolder = (folderId) => {
    if (!canEdit) return
    selectedItems.filter(s => s.type === 'note').forEach(s => updateNote(s.id, { folder: folderId || 'all' }))
    clearSelection()
  }
  const duplicateSelected = () => {
    if (!canEdit) return
    selectedItems.filter(s => s.type === 'note').forEach(s => {
      const n = notes.find(x => x.id === s.id)
      if (n) duplicateNote(n)
    })
    clearSelection()
  }

  const extractTasks = (note) => { const r = /^- \[ \] (.+)$/gm; const m = []; let x; while ((x = r.exec(note.content)) !== null) m.push(x[1].trim()); if (!m.length) return; const lid = lists[0]?.id; const now = Date.now(); m.forEach((t, i) => { setAllTodos(prev => [...prev, { id: now + i, listId: lid, text: t, status: 'todo', priority: 'medium', dueDate: null, notes: '', tags: [], createdAt: now + i, subtasks: [], starred: false, linkedNoteId: note.id }]) }); logActivity('task_created', `${m.length} tache${m.length > 1 ? 's' : ''} extraite${m.length > 1 ? 's' : ''} de "${note.title || 'Sans titre'}"`) }

  const handleFileUpload = async (e) => {
    if (!uploadAttachment || !selectedNote || !canEdit) return
    const storageQuotaExceeded = limits?.storageMB && totalStorageUsed >= limits.storageMB * 1024 * 1024
    if (storageQuotaExceeded) {
      showUpgradeModal?.(`Vous avez dépassé la limite de ${limits.storageMB} Mo de stockage. Supprimez des fichiers ou passez à l'offre supérieure.`)
      return
    }
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploading(true)
    let successCount = 0
    for (const file of files) {
      const result = await uploadAttachment('note', selectedNote, file)
      if (result?.quotaExceeded) { showUpgradeModal?.(result.error); break }
      else if (result?.error) { alert(result.error) }
      else if (result) { successCount++ }
    }
    setUploading(false)
    if (successCount > 0) logActivity('attachment_added', `${successCount} PJ ajoutee(s) a la note "${current?.title || 'Sans titre'}"`)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const noteAttachments = attachments.filter(a => a.itemType === 'note' && a.itemId === selectedNote)

  // Save/restore selection for toolbar actions that open popups
  const savedSelectionRef = useRef(null)
  const saveSelection = () => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) savedSelectionRef.current = sel.getRangeAt(0).cloneRange()
  }
  const restoreSelection = () => {
    if (savedSelectionRef.current) {
      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(savedSelectionRef.current)
    }
  }

  const execFormat = (command, value = null) => {
    restoreSelection()
    editorRef.current?.focus()
    document.execCommand(command, false, value)
    debouncedContentSave(selectedNote, editorRef.current?.innerHTML || '')
  }
  const setWritingColor = (color) => {
    activeColorRef.current = color
    restoreSelection()
    editorRef.current?.focus()
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0 && sel.isCollapsed) {
      // No text selected: insert zero-width space with the color to prime the cursor
      const span = document.createElement('font')
      span.setAttribute('color', color)
      span.appendChild(document.createTextNode('\u200B'))
      sel.getRangeAt(0).insertNode(span)
      // Place cursor inside the font element after the zero-width space
      const range = document.createRange()
      range.setStartAfter(span.firstChild)
      range.collapse(true)
      sel.removeAllRanges()
      sel.addRange(range)
    } else {
      document.execCommand('foreColor', false, color)
    }
    debouncedContentSave(selectedNote, editorRef.current?.innerHTML || '')
  }
  const handleEditorKeyDown = (e) => {
    if (e.ctrlKey && e.key === 'b') { e.preventDefault(); execFormat('bold') }
    if (e.ctrlKey && e.key === 'i') { e.preventDefault(); execFormat('italic') }
    if (e.ctrlKey && e.key === 'u') { e.preventDefault(); execFormat('underline') }
    if (e.ctrlKey && e.key === 'k') {
      e.preventDefault()
      const url = prompt('URL du lien :')
      if (url) execFormat('createLink', url)
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      execFormat('insertHTML', '&emsp;')
    }
  }
  const handleEditorInput = () => {
    debouncedContentSave(selectedNote, editorRef.current?.innerHTML || '')
  }

  const addFolder = async () => { if (!canEdit) return; if (!newFolderName.trim()) return; if (dbAddFolder) { await dbAddFolder(newFolderName.trim(), 'note') } else { setFolders([...folders, { id: `folder-${Date.now()}`, name: newFolderName.trim() }]) }; setNewFolderName(''); setShowNewFolder(false) }
  const deleteFolder = async (folderId) => { if (!canEdit) return; if (dbDeleteFolder) { await dbDeleteFolder(folderId, 'note') } else { setFolders(folders.filter(f => f.id !== folderId)); setNotes(notes.map(n => n.folder === folderId ? { ...n, folder: 'all' } : n)) } }

  const current = notes.find(n => n.id === selectedNote)
  const [wordCount, setWordCount] = useState(0)
  const [charCount, setCharCount] = useState(0)

  // Update counters on input and note switch
  useEffect(() => {
    const update = () => {
      const text = editorRef.current?.textContent || ''
      setWordCount(text.split(/\s+/).filter(Boolean).length)
      setCharCount(text.length)
    }
    update()
    const el = editorRef.current
    if (el) { el.addEventListener('input', update); return () => el.removeEventListener('input', update) }
  }, [selectedNote])
  const linkedTasks = current ? allTodos.filter(t => t.linkedNoteId === current.id) : []
  const linkedLists = current ? lists.filter(l => l.linkedNoteId === current.id) : []
  const currentFolderMeta = current ? folders.find(f => f.id === current.folder) : null
  const customFolders = folders.filter(f => f.id !== 'all')
  const filteredNotes = search ? notes.filter(n => (n.title || '').toLowerCase().includes(search.toLowerCase()) || (n.content || '').toLowerCase().includes(search.toLowerCase())) : notes
  const rootNotes = filteredNotes.filter(n => !n.folder || n.folder === 'all' || !customFolders.find(f => f.id === n.folder))
  const getNotesInFolder = (fid) => filteredNotes.filter(n => n.folder === fid)
  const currentFolderObj = currentFolderId ? customFolders.find(f => f.id === currentFolderId) : null
  const visibleFolders = currentFolderId ? [] : customFolders
  const visibleNotes = currentFolderId ? filteredNotes.filter(n => n.folder === currentFolderId) : rootNotes

  // Template picker
  const templatePicker = showTemplatePicker && (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-200 animate-in" onClick={() => setShowTemplatePicker(false)}>
      <div className="bg-card/80 backdrop-blur-sm border border-white/10 rounded-2xl p-8 max-w-[560px] w-[92%] max-h-[80vh] overflow-y-auto shadow-2xl shadow-black/30 animate-slide-up glow-ring" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-md bg-violet-500/15 flex items-center justify-center text-violet-400"><FileText size={18} /></div>
          <h3 className="text-lg font-bold">Nouvelle note</h3>
        </div>
        <input type="text" value={newNoteName} onChange={e => setNewNoteName(e.target.value)} placeholder="Nom de la note (optionnel)..." autoFocus
          onKeyDown={e => { if (e.key === 'Enter') addNote(''); if (e.key === 'Escape') setShowTemplatePicker(false) }}
          className="w-full px-4 py-3 bg-input border border-white/10 rounded-xl text-foreground text-sm outline-none mb-4 transition-all duration-150 focus:border-violet-500 focus:shadow-[0_0_20px_rgba(139,92,246,0.15)]" />
        <p className="text-xs text-muted-foreground mb-3 uppercase tracking-widest font-semibold">Choisir un modele</p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-3">
          {NOTE_TEMPLATES.map(t => (
            <button key={t.id} className="flex flex-col items-center gap-2.5 px-3 py-5 bg-muted border-2 border-white/10 rounded-2xl cursor-pointer transition-all duration-150 text-center template-hover hover:border-violet-500 hover:bg-accent" onClick={() => addNote(t.content)}>
              <span className="text-3xl">{t.icon}</span>
              <span className="text-xs font-semibold text-foreground">{t.name}</span>
            </button>
          ))}
        </div>
        <button className="mt-5 w-full py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-muted-foreground cursor-pointer text-sm font-medium transition-all duration-150 hover:text-foreground hover:bg-white/[0.12]" onClick={() => setShowTemplatePicker(false)}>Annuler</button>
      </div>
    </div>
  )

  // ===== BROWSER =====
  if (viewMode === 'browser') {
    return (
      <div className="flex-1 flex flex-col overflow-y-auto page-transition relative">
        {templatePicker}
        <div className="px-10 pt-14 pb-4 relative z-1">
          {/* Title */}
          <div className="flex items-center gap-5 mb-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-lg dash-header-icon" style={{ boxShadow: '0 8px 30px rgba(16,185,129,0.35), 0 0 50px rgba(16,185,129,0.12)' }}><FileText size={24} /></div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Mes Notes</h1>
              <p className="text-sm text-muted-foreground mt-1.5">Écrivez, organisez et retrouvez vos idées</p>
            </div>
          </div>

          {/* Actions bar */}
          <div className="flex items-center gap-4 mb-8 flex-wrap">
            <div className="flex items-center gap-3 px-5 py-2.5 bg-input border border-white/10 rounded-2xl text-muted-foreground transition-all duration-150 focus-within:border-violet-500 focus-within:shadow-[0_0_20px_rgba(139,92,246,0.15)]">
              <Search size={16} />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="bg-transparent border-none text-foreground text-sm outline-none w-40" />
              {search && <button className="flex bg-transparent border-none text-muted-foreground cursor-pointer hover:text-foreground transition-colors duration-150" onClick={() => setSearch('')}><X size={14} /></button>}
            </div>
            <div className="flex-1" />
            {!currentFolderId && <button className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-white/[0.06] border border-white/10 rounded-2xl text-sm text-muted-foreground cursor-pointer transition-all duration-150 hover:text-foreground hover:bg-white/[0.12]" onClick={() => setShowNewFolder(!showNewFolder)}><FolderPlus size={16} /> <span className="max-sm:hidden">Dossier</span></button>}
            <button className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25 border-none rounded-2xl text-sm cursor-pointer font-semibold btn-glow" onClick={() => setShowTemplatePicker(true)}><Plus size={16} /> <span className="max-sm:hidden">Nouvelle note</span></button>
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <button className="inline-flex items-center gap-1.5 bg-transparent border-none text-muted-foreground cursor-pointer text-sm hover:text-primary transition-colors duration-150" onClick={() => { goToRoot(); setSearch('') }}><FileText size={14} /> Notes</button>
            {currentFolderObj && <><ChevronRight size={13} className="text-muted-foreground/40" /><span className="inline-flex items-center gap-1.5 text-foreground font-medium"><Folder size={14} /> {currentFolderObj.name}</span></>}
          </div>
        </div>

        <div className="px-10 pb-10 pt-4 flex-1" onMouseDown={handleGridMouseDown}>
          {showNewFolder && !currentFolderId && (
            <div className="flex items-center gap-2 mb-5 animate-slide-up">
              <input type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addFolder(); if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderName('') } }} placeholder="Nom du dossier..." autoFocus className="flex-1 px-4 py-2.5 bg-input border border-white/10 rounded-xl text-foreground text-sm outline-none focus:border-violet-500 focus:shadow-[0_0_20px_rgba(139,92,246,0.15)] glow-ring" />
              <button className="px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25 border-none rounded-2xl text-sm cursor-pointer font-semibold disabled:opacity-40 btn-glow" onClick={addFolder} disabled={!newFolderName.trim()}>Creer</button>
              <button className="px-5 py-2.5 bg-white/[0.06] border border-white/10 rounded-2xl text-sm text-muted-foreground cursor-pointer hover:text-foreground hover:bg-white/[0.12] transition-colors duration-150" onClick={() => { setShowNewFolder(false); setNewFolderName('') }}>Annuler</button>
            </div>
          )}

          <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-5 relative" ref={gridRef}>
            {/* Lasso rectangle */}
            {lassoRect && (
              <div className="fixed border border-violet-500/50 bg-violet-500/10 rounded-sm pointer-events-none z-50" style={{ left: lassoRect.x, top: lassoRect.y, width: lassoRect.w, height: lassoRect.h }} />
            )}
            {visibleFolders.map((f, i) => {
              const count = getNotesInFolder(f.id).length
              const isOver = browserDragOverFolder === f.id
              const selected = isSelected('folder', f.id)
              return (
                <div key={f.id}
                  data-lasso-item
                  ref={el => { itemRefsMap.current[`folder:${f.id}`] = el }}
                  className={cn("relative flex flex-col items-center gap-4 p-7 bg-card/80 backdrop-blur-sm border rounded-2xl cursor-pointer card-hover card-gradient-hover group stagger-item transition-all duration-200", isOver ? "border-warning/60 bg-warning/[0.08] scale-[1.03] shadow-lg shadow-warning/10" : selected ? "border-violet-500/60 bg-violet-500/[0.06] ring-1 ring-violet-500/30" : "border-white/10")}
                  style={{ animationDelay: `${i * 0.04}s` }}
                  onClick={(e) => handleItemClick(e, 'folder', f.id)}
                  onDoubleClick={(e) => handleItemDoubleClick(e, 'folder', f.id)}
                  onDragOver={e => handleFolderDragOver(e, f.id)}
                  onDragLeave={handleFolderDragLeave}
                  onDrop={e => handleFolderDrop(e, f.id)}
                >
                  <div className={cn("w-16 h-16 rounded-2xl bg-warning/15 flex items-center justify-center text-warning group-hover:bg-warning/25 transition-colors duration-150 shadow-sm", isOver && "bg-warning/25")}><Folder size={30} /></div>
                  {(selectedItems.length > 0) && (
                    <div className={cn("absolute top-3 left-3 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-150", selected ? "bg-violet-500 border-violet-500" : "border-white/20 bg-black/20 opacity-0 group-hover:opacity-100")}>
                      {selected && <Check size={12} className="text-white" />}
                    </div>
                  )}
                  <span className="text-sm font-semibold text-center">{f.name}</span>
                  <span className="text-xs text-muted-foreground counter-animate">{count} note{count !== 1 ? 's' : ''}</span>
                  {isOver && <span className="text-[0.6rem] text-warning font-semibold">Déposer ici</span>}
                  <button className="absolute top-3 right-3 flex bg-transparent border-none text-muted-foreground/40 cursor-pointer p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-150 hover:text-destructive hover:bg-destructive/10" onClick={e => { e.stopPropagation(); deleteFolder(f.id) }}><Trash2 size={13} /></button>
                </div>
              )
            })}
            {visibleNotes.map((note, i) => {
              const noteIdx = visibleFolders.length + i
              const selected = isSelected('note', note.id)
              return (
              <div key={note.id}
                data-lasso-item
                ref={el => { itemRefsMap.current[`note:${note.id}`] = el }}
                className={cn("relative flex flex-col items-center gap-4 p-7 bg-card/80 backdrop-blur-sm border rounded-2xl cursor-pointer card-hover card-gradient-hover group note-color-bar stagger-item overflow-hidden", browserDragNote?.includes(note.id) && "opacity-50 scale-95", selected ? "border-violet-500/60 bg-violet-500/[0.06] ring-1 ring-violet-500/30" : "border-white/10")}
                style={{ animationDelay: `${noteIdx * 0.04}s`, boxShadow: browserReorderTarget?.id === note.id ? (browserReorderTarget.side === 'before' ? 'inset 3px 0 0 0 #8b5cf6' : 'inset -3px 0 0 0 #8b5cf6') : undefined }}
                onClick={(e) => handleItemClick(e, 'note', note.id)}
                onDoubleClick={(e) => handleItemDoubleClick(e, 'note', note.id)}
                draggable
                onDragStart={e => handleBrowserDragStart(e, note.id)}
                onDragEnd={handleBrowserDragEnd}
                onDragOver={e => handleNoteDragOver(e, note.id)}
                onDrop={e => handleNoteDrop(e, note.id)}
              >
                {/* Top color bar */}
                <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${note.color}40, ${note.color}15)` }} />
                {(selectedItems.length > 0) && (
                  <div className={cn("absolute top-3 left-3 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-150 z-10", selected ? "bg-violet-500 border-violet-500" : "border-white/20 bg-black/20 opacity-0 group-hover:opacity-100")}>
                    {selected && <Check size={12} className="text-white" />}
                  </div>
                )}
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center transition-colors duration-150 shadow-sm bg-white/[0.04] text-muted-foreground">
                  <FileText size={30} />
                </div>
                {editingNoteId === note.id ? (
                  <input className="w-full text-center px-2 py-1 bg-input border border-violet-500 rounded-lg text-foreground text-sm outline-none focus:shadow-[0_0_20px_rgba(139,92,246,0.15)]" value={editNoteName} onChange={e => setEditNoteName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') renameNoteBrowser(note.id); if (e.key === 'Escape') setEditingNoteId(null) }} onBlur={() => renameNoteBrowser(note.id)} onClick={e => e.stopPropagation()} autoFocus />
                ) : (
                  <span className="text-sm font-semibold text-center" style={{ color: note.color }} onDoubleClick={e => { e.stopPropagation(); setEditingNoteId(note.id); setEditNoteName(note.title) }}>{note.title || 'Sans titre'}</span>
                )}
                <span className="text-xs text-muted-foreground">{new Date(note.updatedAt).toLocaleDateString('fr-FR')}</span>
                {(() => { const lt = allTodos.filter(t => t.linkedNoteId === note.id).length; const ll = lists.filter(l => l.linkedNoteId === note.id).length; return (lt > 0 || ll > 0) ? (
                  <div className="flex items-center gap-2 text-[0.6rem] text-muted-foreground/70">
                    {lt > 0 && <span className="inline-flex items-center gap-0.5 text-primary" title={`${lt} tâche${lt > 1 ? 's' : ''} liée${lt > 1 ? 's' : ''}`}><Link2 size={9} />{lt} tâche{lt > 1 ? 's' : ''}</span>}
                    {ll > 0 && <span className="inline-flex items-center gap-0.5 text-blue-400" title={`${ll} liste${ll > 1 ? 's' : ''} liée${ll > 1 ? 's' : ''}`}><Link2 size={9} />{ll} liste{ll > 1 ? 's' : ''}</span>}
                  </div>
                ) : null })()}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute top-3 right-3">
                  <ShareButton itemType="note" itemId={note.id} createShareLink={createShareLink} />
                  <button className="flex bg-transparent border-none text-muted-foreground/40 cursor-pointer p-1.5 rounded-lg hover:text-destructive hover:bg-destructive/10 transition-colors duration-150" onClick={e => { e.stopPropagation(); deleteNote(note.id) }}><Trash2 size={13} /></button>
                </div>
              </div>
              )
            })}
          </div>

          {/* Floating action bar when items selected */}
          {selectedItems.length > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 bg-card/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl" style={{ boxShadow: '0 15px 50px rgba(0,0,0,0.5), 0 0 40px rgba(139,92,246,0.08)' }}>
              <span className="text-sm font-semibold text-violet-400 mr-2">{selectedItems.length} sélectionné{selectedItems.length > 1 ? 's' : ''}</span>
              <div className="w-px h-5 bg-white/10" />
              {selectedItems.some(s => s.type === 'note') && (
                <button className="inline-flex items-center gap-2 px-3 py-1.5 bg-transparent border-none text-sm text-muted-foreground cursor-pointer rounded-xl hover:bg-white/[0.06] hover:text-foreground transition-all" onClick={duplicateSelected}>
                  <Copy size={14} /> Dupliquer
                </button>
              )}
              {selectedItems.some(s => s.type === 'note') && customFolders.length > 0 && (
                <div className="relative">
                  <button className="inline-flex items-center gap-2 px-3 py-1.5 bg-transparent border-none text-sm text-muted-foreground cursor-pointer rounded-xl hover:bg-white/[0.06] hover:text-foreground transition-all" onClick={() => setShowMoveMenu(!showMoveMenu)}>
                    <Move size={14} /> Déplacer
                  </button>
                  {showMoveMenu && (
                    <div className="absolute bottom-full left-0 mb-2 w-48 bg-card/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden z-50 py-1" style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}>
                      {currentFolderId && (
                        <button className="w-full flex items-center gap-2 px-3 py-2 bg-transparent border-none text-sm text-muted-foreground cursor-pointer hover:bg-white/[0.06] hover:text-foreground transition-colors text-left" onClick={() => moveSelectedToFolder(null)}>
                          <ChevronRight size={13} className="rotate-180" /> Racine
                        </button>
                      )}
                      {customFolders.filter(f => f.id !== currentFolderId).map(f => (
                        <button key={f.id} className="w-full flex items-center gap-2 px-3 py-2 bg-transparent border-none text-sm text-muted-foreground cursor-pointer hover:bg-white/[0.06] hover:text-foreground transition-colors text-left" onClick={() => moveSelectedToFolder(f.id)}>
                          <Folder size={13} className="text-warning" /> {f.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button className="inline-flex items-center gap-2 px-3 py-1.5 bg-transparent border-none text-sm text-destructive cursor-pointer rounded-xl hover:bg-destructive/10 transition-all" onClick={deleteSelected}>
                <Trash2 size={14} /> Supprimer
              </button>
              <div className="w-px h-5 bg-white/10" />
              <button className="inline-flex items-center justify-center w-7 h-7 bg-transparent border-none text-muted-foreground cursor-pointer rounded-lg hover:bg-white/[0.06] hover:text-foreground transition-all" onClick={clearSelection} title="Annuler la sélection">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Drop zone to remove from folder */}
          {currentFolderId && browserDragNote && (
            <div
              className={cn("mt-5 flex items-center justify-center gap-2 py-4 border-2 border-dashed rounded-2xl transition-all duration-200 text-sm", browserDragOverFolder === 'root' ? "border-violet-500/60 bg-violet-500/[0.08] text-violet-400" : "border-white/15 text-muted-foreground/60")}
              onDragOver={e => { e.preventDefault(); setBrowserDragOverFolder('root') }}
              onDragLeave={() => setBrowserDragOverFolder(null)}
              onDrop={handleRootDrop}
            >
              <ChevronRight size={14} className="rotate-180" /> Sortir du dossier
            </div>
          )}

          {visibleFolders.length === 0 && visibleNotes.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 py-24">
              <div className="w-20 h-20 rounded-2xl bg-primary/5 flex items-center justify-center empty-icon"><FileText size={40} /></div>
              <div className="text-center">
                <p className="text-lg font-medium text-muted-foreground mb-1">{currentFolderId ? 'Dossier vide' : 'Aucune note'}</p>
                <p className="text-sm text-muted-foreground/60 mb-4">Commencez par creer votre premiere note</p>
                <button className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25 border-none rounded-2xl text-sm cursor-pointer font-semibold btn-glow" onClick={() => setShowTemplatePicker(true)}><Plus size={15} /> Creer une note</button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ===== EDITOR =====
  return (
    <div className={cn("flex h-full flex-1 relative", fullscreen && "fixed inset-0 z-100 bg-background")}>
      {templatePicker}
      <div className="flex-1 flex flex-col min-w-0 relative z-1">
        {current ? (
          <>
            <div className="flex items-center gap-1.5 text-sm px-6 pt-4 text-muted-foreground">
              <button className="inline-flex items-center gap-1 bg-transparent border-none text-muted-foreground cursor-pointer text-sm hover:text-primary transition-colors duration-150" onClick={goToBrowser}><FileText size={13} /> Notes</button>
              {currentFolderMeta && currentFolderMeta.id !== 'all' && <><ChevronRight size={12} className="text-muted-foreground/40" /><span className="inline-flex items-center gap-1"><Folder size={13} /> {currentFolderMeta.name}</span></>}
              <ChevronRight size={12} className="text-muted-foreground/40" />
              <span className="text-foreground font-medium truncate">{current.title || 'Sans titre'}</span>
            </div>

            {/* Title bar */}
            <div className="px-6 pt-4 pb-2 flex items-center gap-3">
              <input key={`title-${current.id}`} ref={titleRef} type="text" defaultValue={current.title} onChange={e => debouncedTitleSave(current.id, e.target.value)} placeholder="Titre de la note"
                className="flex-1 bg-transparent border-none text-2xl font-bold py-1 outline-none placeholder:text-muted-foreground/30 text-foreground" />
              <div className="flex items-center gap-0.5 shrink-0">
                {COLORS.map(c => (
                  <button key={c} className={cn("w-4 h-4 rounded-full border-2 cursor-pointer transition-all duration-150 hover:scale-125", current.color === c ? "border-white scale-110" : "border-transparent")}
                    style={{ background: c }} onMouseDown={e => { e.preventDefault(); saveSelection() }} onClick={() => { setWritingColor(c); updateNote(current.id, { color: c }) }} title="Couleur du texte" />
                ))}
                <div className="w-px h-4 bg-white/10 mx-1.5" />
                <button className={cn("p-1.5 bg-transparent border-none cursor-pointer rounded-lg transition-all text-muted-foreground hover:text-warning", current.starred && "text-warning")} onClick={() => updateNote(current.id, { starred: !current.starred })} title="Favori">
                  {current.starred ? <Star size={14} className="fill-warning" /> : <StarOff size={14} />}
                </button>
                <button className="p-1.5 bg-transparent border-none cursor-pointer rounded-lg transition-all text-muted-foreground hover:text-foreground" onClick={() => updateNote(current.id, { pinned: !current.pinned })} title="Épingler">
                  {current.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                </button>
                <select className="px-2 py-1 bg-input border border-white/10 rounded-lg text-[0.65rem] text-muted-foreground outline-none cursor-pointer" value={current.folder || ''} onChange={e => updateNote(current.id, { folder: e.target.value })}>
                  {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                <button className="p-1.5 bg-transparent border-none text-muted-foreground cursor-pointer rounded-lg hover:text-foreground" onClick={() => duplicateNote(current)} title="Dupliquer"><Copy size={14} /></button>
                <div className="relative">
                  <button className="p-1.5 bg-transparent border-none text-muted-foreground cursor-pointer rounded-lg hover:text-foreground" onClick={() => setShowExportMenu(!showExportMenu)} title="Exporter"><Download size={14} /></button>
                  {showExportMenu && (
                    <div className="absolute right-0 top-full mt-1 w-52 bg-card/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden z-50 animate-scale-in py-1" style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}>
                      <button className="flex items-center gap-2.5 w-full px-3.5 py-2.5 bg-transparent border-none text-foreground cursor-pointer text-xs text-left hover:bg-accent transition-colors" onClick={() => { exportHtml(current); setShowExportMenu(false) }}>
                        <span className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400 shrink-0"><FileText size={13} /></span>
                        <div><div className="font-medium">HTML</div><div className="text-[0.6rem] text-muted-foreground">Gratuit — page web stylée</div></div>
                      </button>
                      <button className={cn("flex items-center gap-2.5 w-full px-3.5 py-2.5 bg-transparent border-none cursor-pointer text-xs text-left transition-colors", isFree ? "text-muted-foreground/50 cursor-not-allowed" : "text-foreground hover:bg-accent")} onClick={() => { if (!isFree) { exportPdf(current); setShowExportMenu(false) } }}>
                        <span className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", isFree ? "bg-white/5 text-muted-foreground/30" : "bg-red-500/15 text-red-400")}><FileText size={13} /></span>
                        <div><div className="font-medium flex items-center gap-1.5">PDF {isFree && <span className="text-[0.55rem] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400 font-semibold">ÉTUDIANT+</span>}</div><div className="text-[0.6rem] text-muted-foreground">Impression / enregistrer en PDF</div></div>
                      </button>
                      <button className={cn("flex items-center gap-2.5 w-full px-3.5 py-2.5 bg-transparent border-none cursor-pointer text-xs text-left transition-colors", isFree ? "text-muted-foreground/50 cursor-not-allowed" : "text-foreground hover:bg-accent")} onClick={() => { if (!isFree) { exportWord(current); setShowExportMenu(false) } }}>
                        <span className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", isFree ? "bg-white/5 text-muted-foreground/30" : "bg-blue-500/15 text-blue-400")}><FileText size={13} /></span>
                        <div><div className="font-medium flex items-center gap-1.5">Word {isFree && <span className="text-[0.55rem] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400 font-semibold">ÉTUDIANT+</span>}</div><div className="text-[0.6rem] text-muted-foreground">Document .doc compatible Word</div></div>
                      </button>
                    </div>
                  )}
                </div>
                <div className="relative" ref={shareRef}>
                  <button className={cn("p-1.5 bg-transparent border-none cursor-pointer rounded-lg transition-all", shareUrl ? "text-emerald-400" : "text-muted-foreground hover:text-foreground")} onClick={() => handleShareNote(current.id)} title="Partager un lien">
                    {shareLoading ? <span className="animate-spin block w-3.5 h-3.5 border-2 border-muted-foreground/30 border-t-primary rounded-full" /> : shareCopied ? <Check size={14} /> : <Share2 size={14} />}
                  </button>
                  {showSharePopup && (
                    <div className="absolute right-0 top-full mt-1 w-64 bg-card/95 backdrop-blur-xl border border-white/10 rounded-xl p-3 z-50 animate-scale-in" style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}>
                      <div className="text-[0.65rem] font-semibold text-foreground mb-1.5">Lien de partage</div>
                      <div className="flex items-center gap-1.5">
                        <input type="text" readOnly value={shareUrl} className="flex-1 px-2 py-1.5 bg-input border border-white/10 rounded-lg text-[0.65rem] text-foreground outline-none" onClick={e => e.target.select()} />
                        <button className="px-2 py-1.5 bg-primary/15 text-primary border-none rounded-lg cursor-pointer text-[0.65rem] font-medium hover:bg-primary/25 transition-colors" onClick={() => { navigator.clipboard.writeText(shareUrl); setShareCopied(true); setTimeout(() => setShareCopied(false), 2000) }}>Copier</button>
                      </div>
                      <div className="flex items-center gap-1 mt-2 text-[0.6rem] text-muted-foreground">
                        <ExternalLink size={9} /> Visible par toute personne ayant le lien
                      </div>
                    </div>
                  )}
                </div>
                <button className="p-1.5 bg-transparent border-none text-muted-foreground cursor-pointer rounded-lg hover:text-foreground" onClick={() => setFullscreen(!fullscreen)} title="Plein écran">
                  {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>
              </div>
            </div>

            {/* Word-style toolbar */}
            <div className="flex items-center gap-0.5 px-4 py-1.5 border-y border-white/10 bg-secondary/30 flex-wrap">
              {/* Undo / Redo */}
              <button onMouseDown={e => { e.preventDefault(); saveSelection() }} onClick={() => { restoreSelection(); document.execCommand('undo') }} title="Annuler (Ctrl+Z)" className="flex items-center justify-center w-7 h-7 bg-transparent border-none text-muted-foreground cursor-pointer rounded transition-all hover:bg-accent hover:text-foreground"><Undo2 size={14} /></button>
              <button onMouseDown={e => { e.preventDefault(); saveSelection() }} onClick={() => { restoreSelection(); document.execCommand('redo') }} title="Rétablir (Ctrl+Y)" className="flex items-center justify-center w-7 h-7 bg-transparent border-none text-muted-foreground cursor-pointer rounded transition-all hover:bg-accent hover:text-foreground"><Redo2 size={14} /></button>

              <div className="w-px h-5 bg-white/10 mx-1" />

              {/* Font size */}
              <select onMouseDown={e => { e.stopPropagation(); saveSelection() }} onChange={e => { execFormat('fontSize', e.target.value); e.target.value = '' }} defaultValue="" title="Taille" className="px-1.5 py-0.5 bg-input border border-white/10 rounded text-[0.65rem] text-muted-foreground outline-none cursor-pointer w-14">
                <option value="" disabled>Taille</option>
                <option value="1">Petit</option>
                <option value="3">Normal</option>
                <option value="5">Grand</option>
                <option value="7">Très grand</option>
              </select>

              {/* Headings */}
              <select onMouseDown={e => { e.stopPropagation(); saveSelection() }} onChange={e => { execFormat('formatBlock', e.target.value); e.target.value = '' }} defaultValue="" title="Style" className="px-1.5 py-0.5 bg-input border border-white/10 rounded text-[0.65rem] text-muted-foreground outline-none cursor-pointer w-20 ml-0.5">
                <option value="" disabled>Style</option>
                <option value="p">Normal</option>
                <option value="h1">Titre 1</option>
                <option value="h2">Titre 2</option>
                <option value="h3">Titre 3</option>
                <option value="blockquote">Citation</option>
              </select>

              <div className="w-px h-5 bg-white/10 mx-1" />

              {/* Bold / Italic / Underline / Strikethrough */}
              <button onMouseDown={e => { e.preventDefault(); saveSelection() }} onClick={() => execFormat('bold')} title="Gras (Ctrl+B)" className="flex items-center justify-center w-7 h-7 bg-transparent border-none text-muted-foreground cursor-pointer rounded transition-all hover:bg-accent hover:text-foreground"><Bold size={14} /></button>
              <button onMouseDown={e => { e.preventDefault(); saveSelection() }} onClick={() => execFormat('italic')} title="Italique (Ctrl+I)" className="flex items-center justify-center w-7 h-7 bg-transparent border-none text-muted-foreground cursor-pointer rounded transition-all hover:bg-accent hover:text-foreground"><Italic size={14} /></button>
              <button onMouseDown={e => { e.preventDefault(); saveSelection() }} onClick={() => execFormat('underline')} title="Souligné (Ctrl+U)" className="flex items-center justify-center w-7 h-7 bg-transparent border-none text-muted-foreground cursor-pointer rounded transition-all hover:bg-accent hover:text-foreground"><Underline size={14} /></button>
              <button onMouseDown={e => { e.preventDefault(); saveSelection() }} onClick={() => execFormat('strikeThrough')} title="Barré" className="flex items-center justify-center w-7 h-7 bg-transparent border-none text-muted-foreground cursor-pointer rounded transition-all hover:bg-accent hover:text-foreground"><Strikethrough size={14} /></button>

              <div className="w-px h-5 bg-white/10 mx-1" />

              {/* Text color */}
              <div className="relative">
                <button onMouseDown={e => e.preventDefault()} onClick={() => { saveSelection(); setShowTextColor(!showTextColor); setShowHighlight(false) }} title="Couleur du texte" className="flex items-center justify-center w-7 h-7 bg-transparent border-none text-muted-foreground cursor-pointer rounded transition-all hover:bg-accent hover:text-foreground">
                  <Type size={14} />
                </button>
                {showTextColor && (
                  <div className="absolute top-full left-0 mt-1 p-2 bg-card/95 backdrop-blur-xl border border-white/10 rounded-xl z-50 grid grid-cols-6 gap-1.5" style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}>
                    {['#ffffff','#f87171','#fb923c','#facc15','#4ade80','#60a5fa','#c084fc','#f472b6','#2dd4bf','#a3a3a3','#ef4444','#000000'].map(c => (
                      <button key={c} onMouseDown={e => e.preventDefault()} onClick={() => { execFormat('foreColor', c); setShowTextColor(false) }} className="w-5 h-5 rounded border border-white/20 cursor-pointer hover:scale-125 transition-transform" style={{ background: c }} />
                    ))}
                  </div>
                )}
              </div>

              {/* Highlight color */}
              <div className="relative">
                <button onMouseDown={e => e.preventDefault()} onClick={() => { saveSelection(); setShowHighlight(!showHighlight); setShowTextColor(false) }} title="Surligner" className="flex items-center justify-center w-7 h-7 bg-transparent border-none text-muted-foreground cursor-pointer rounded transition-all hover:bg-accent hover:text-foreground">
                  <Highlighter size={14} />
                </button>
                {showHighlight && (
                  <div className="absolute top-full left-0 mt-1 p-2 bg-card/95 backdrop-blur-xl border border-white/10 rounded-xl z-50 grid grid-cols-6 gap-1.5" style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}>
                    {['transparent','#fef08a','#bbf7d0','#bfdbfe','#e9d5ff','#fecdd3','#fed7aa','#99f6e4','#fde68a','#e2e8f0','#fca5a5','#d9f99d'].map(c => (
                      <button key={c} onMouseDown={e => e.preventDefault()} onClick={() => { execFormat('hiliteColor', c); setShowHighlight(false) }} className={cn("w-5 h-5 rounded border cursor-pointer hover:scale-125 transition-transform", c === 'transparent' ? 'border-white/20 relative after:content-[\'\'] after:absolute after:inset-0 after:bg-[linear-gradient(135deg,transparent_45%,#f87171_45%,#f87171_55%,transparent_55%)]' : 'border-white/10')} style={{ background: c === 'transparent' ? 'white' : c }} />
                    ))}
                  </div>
                )}
              </div>

              <div className="w-px h-5 bg-white/10 mx-1" />

              {/* Alignment */}
              <button onMouseDown={e => { e.preventDefault(); saveSelection() }} onClick={() => execFormat('justifyLeft')} title="Aligner à gauche" className="flex items-center justify-center w-7 h-7 bg-transparent border-none text-muted-foreground cursor-pointer rounded transition-all hover:bg-accent hover:text-foreground"><AlignLeft size={14} /></button>
              <button onMouseDown={e => { e.preventDefault(); saveSelection() }} onClick={() => execFormat('justifyCenter')} title="Centrer" className="flex items-center justify-center w-7 h-7 bg-transparent border-none text-muted-foreground cursor-pointer rounded transition-all hover:bg-accent hover:text-foreground"><AlignCenter size={14} /></button>
              <button onMouseDown={e => { e.preventDefault(); saveSelection() }} onClick={() => execFormat('justifyRight')} title="Aligner à droite" className="flex items-center justify-center w-7 h-7 bg-transparent border-none text-muted-foreground cursor-pointer rounded transition-all hover:bg-accent hover:text-foreground"><AlignRight size={14} /></button>

              <div className="w-px h-5 bg-white/10 mx-1" />

              {/* Lists */}
              <button onMouseDown={e => { e.preventDefault(); saveSelection() }} onClick={() => execFormat('insertUnorderedList')} title="Liste à puces" className="flex items-center justify-center w-7 h-7 bg-transparent border-none text-muted-foreground cursor-pointer rounded transition-all hover:bg-accent hover:text-foreground"><List size={14} /></button>
              <button onMouseDown={e => { e.preventDefault(); saveSelection() }} onClick={() => execFormat('insertOrderedList')} title="Liste numérotée" className="flex items-center justify-center w-7 h-7 bg-transparent border-none text-muted-foreground cursor-pointer rounded transition-all hover:bg-accent hover:text-foreground"><ListOrdered size={14} /></button>

              <div className="w-px h-5 bg-white/10 mx-1" />

              {/* Link / Remove format */}
              <button onMouseDown={e => { e.preventDefault(); saveSelection() }} onClick={() => { const u = prompt('URL du lien :'); if (u) execFormat('createLink', u) }} title="Insérer un lien" className="flex items-center justify-center w-7 h-7 bg-transparent border-none text-muted-foreground cursor-pointer rounded transition-all hover:bg-accent hover:text-foreground"><Link2 size={14} /></button>
              <button onMouseDown={e => { e.preventDefault(); saveSelection() }} onClick={() => execFormat('removeFormat')} title="Effacer le formatage" className="flex items-center justify-center w-7 h-7 bg-transparent border-none text-muted-foreground cursor-pointer rounded transition-all hover:bg-accent hover:text-foreground"><X size={14} /></button>

              <div className="w-px h-5 bg-white/10 mx-1" />

              {/* Links: tasks, lists, attachments */}
              <button onMouseDown={e => e.preventDefault()} onClick={() => { setShowTaskLinker(!showTaskLinker); setTaskLinkerSearch(''); setShowListLinker(false) }} title={`Tâches liées (${linkedTasks.length})`} className={cn("flex items-center justify-center gap-0.5 h-7 px-1.5 bg-transparent border-none cursor-pointer rounded transition-all hover:bg-accent hover:text-foreground", linkedTasks.length > 0 ? "text-primary" : "text-muted-foreground")}>
                <CheckSquare size={14} />{linkedTasks.length > 0 && <span className="text-[0.6rem] font-bold">{linkedTasks.length}</span>}
              </button>
              <button onMouseDown={e => e.preventDefault()} onClick={() => { setShowListLinker(!showListLinker); setListLinkerSearch(''); setShowTaskLinker(false) }} title={`Listes liées (${linkedLists.length})`} className={cn("flex items-center justify-center gap-0.5 h-7 px-1.5 bg-transparent border-none cursor-pointer rounded transition-all hover:bg-accent hover:text-foreground", linkedLists.length > 0 ? "text-blue-400" : "text-muted-foreground")}>
                <List size={14} />{linkedLists.length > 0 && <span className="text-[0.6rem] font-bold">{linkedLists.length}</span>}
              </button>
              <button onMouseDown={e => e.preventDefault()} onClick={() => { if (canEdit) fileInputRef.current?.click() }} title={`Pièces jointes (${noteAttachments.length})`} className={cn("flex items-center justify-center gap-0.5 h-7 px-1.5 bg-transparent border-none cursor-pointer rounded transition-all hover:bg-accent hover:text-foreground", noteAttachments.length > 0 ? "text-amber-400" : "text-muted-foreground")}>
                <Paperclip size={14} />{noteAttachments.length > 0 && <span className="text-[0.6rem] font-bold">{noteAttachments.length}</span>}
              </button>
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
            </div>

            {/* Task linker popup */}
            {showTaskLinker && (
              <div className="relative">
                <div className="flex items-center gap-2 px-6 py-2 border-b border-white/10 bg-primary/3 flex-wrap text-xs text-muted-foreground">
                  <Link size={11} className="text-primary" />
                  {linkedTasks.map(t => (
                    <span key={t.id} className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[0.68rem] font-medium group/tag",
                      t.status === 'todo' && "bg-violet-500/15 text-violet-400",
                      t.status === 'doing' && "bg-blue-500/15 text-blue-400",
                      t.status === 'done' && "bg-emerald-500/15 text-emerald-400"
                    )}>
                      {t.text}
                      <button className="bg-transparent border-none cursor-pointer p-0 opacity-0 group-hover/tag:opacity-100 transition-opacity text-current hover:text-destructive" onClick={() => { setAllTodos(prev => prev.map(todo => todo.id === t.id ? { ...todo, linkedNoteId: null } : todo)); dbUpdateTodo(t.id, { linkedNoteId: null }) }} title="Délier"><X size={10} /></button>
                    </span>
                  ))}
                  <div className="relative ml-auto">
                    <input
                      type="text" value={taskLinkerSearch} onChange={e => setTaskLinkerSearch(e.target.value)}
                      placeholder="Rechercher une tâche..." autoFocus
                      className="w-48 px-3 py-1.5 bg-input border border-white/10 rounded-lg text-foreground text-xs outline-none focus:border-violet-500 transition-colors"
                    />
                    <div className="absolute right-0 top-full mt-1 w-72 bg-card/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden z-50 animate-scale-in" style={{ boxShadow: '0 15px 40px rgba(0,0,0,0.4)' }}>
                      <div className="max-h-48 overflow-y-auto px-1.5 py-1.5">
                        {allTodos
                          .filter(t => !t.linkedNoteId)
                          .filter(t => !taskLinkerSearch || t.text.toLowerCase().includes(taskLinkerSearch.toLowerCase()))
                          .slice(0, 20)
                          .map(t => (
                            <button key={t.id} className="flex items-center gap-2 w-full px-2.5 py-2 bg-transparent border-none text-foreground cursor-pointer rounded-lg text-xs text-left transition-colors hover:bg-accent" onClick={() => {
                              setAllTodos(prev => prev.map(todo => todo.id === t.id ? { ...todo, linkedNoteId: current.id } : todo))
                              dbUpdateTodo(t.id, { linkedNoteId: current.id })
                              setShowTaskLinker(false)
                              logActivity('task_link', `Tache "${t.text}" liee a la note "${current.title || 'Sans titre'}"`)
                            }}>
                              <CheckSquare size={12} className={cn(
                                t.status === 'todo' && "text-violet-400",
                                t.status === 'doing' && "text-blue-400",
                                t.status === 'done' && "text-emerald-400"
                              )} />
                              <span className="flex-1 truncate">{t.text}</span>
                              <span className="text-[0.55rem] text-muted-foreground/50">{lists.find(l => l.id === t.listId)?.name}</span>
                            </button>
                          ))}
                        {allTodos.filter(t => !t.linkedNoteId).filter(t => !taskLinkerSearch || t.text.toLowerCase().includes(taskLinkerSearch.toLowerCase())).length === 0 && (
                          <div className="text-center py-4 text-muted-foreground text-xs">Aucune tâche disponible</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* List linker popup */}
            {showListLinker && (
              <div className="relative">
                <div className="flex items-center gap-2 px-6 py-2 border-b border-white/10 bg-blue-500/3 flex-wrap text-xs text-muted-foreground">
                  <List size={11} className="text-blue-400" />
                  {linkedLists.map(l => (
                    <span key={l.id} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[0.68rem] font-medium bg-blue-500/15 text-blue-400 group/tag">
                      {l.name}
                      <button className="bg-transparent border-none cursor-pointer p-0 opacity-0 group-hover/tag:opacity-100 transition-opacity text-current hover:text-destructive" onClick={() => { if (dbUpdateList) { dbUpdateList(l.id, { linkedNoteId: null }); setLists(prev => prev.map(x => x.id === l.id ? { ...x, linkedNoteId: null } : x)) } }} title="Délier"><X size={10} /></button>
                    </span>
                  ))}
                  <div className="relative ml-auto">
                    <input
                      type="text" value={listLinkerSearch} onChange={e => setListLinkerSearch(e.target.value)}
                      placeholder="Rechercher une liste..." autoFocus
                      className="w-48 px-3 py-1.5 bg-input border border-white/10 rounded-lg text-foreground text-xs outline-none focus:border-violet-500 transition-colors"
                    />
                    <div className="absolute right-0 top-full mt-1 w-72 bg-card/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden z-50 animate-scale-in" style={{ boxShadow: '0 15px 40px rgba(0,0,0,0.4)' }}>
                      <div className="max-h-48 overflow-y-auto px-1.5 py-1.5">
                        {lists
                          .filter(l => !l.linkedNoteId)
                          .filter(l => !listLinkerSearch || l.name.toLowerCase().includes(listLinkerSearch.toLowerCase()))
                          .slice(0, 20)
                          .map(l => (
                            <button key={l.id} className="flex items-center gap-2 w-full px-2.5 py-2 bg-transparent border-none text-foreground cursor-pointer rounded-lg text-xs text-left transition-colors hover:bg-accent" onClick={() => {
                              if (dbUpdateList) {
                                dbUpdateList(l.id, { linkedNoteId: current.id })
                                setLists(prev => prev.map(x => x.id === l.id ? { ...x, linkedNoteId: current.id } : x))
                              }
                              setShowListLinker(false)
                              logActivity('task_link', `Liste "${l.name}" liée à la note "${current.title || 'Sans titre'}"`)
                            }}>
                              <List size={12} className="text-blue-400" />
                              <span className="flex-1 truncate">{l.name}</span>
                              <span className="text-[0.55rem] text-muted-foreground/50">{allTodos.filter(t => t.listId === l.id).length} tâches</span>
                            </button>
                          ))}
                        {lists.filter(l => !l.linkedNoteId).filter(l => !listLinkerSearch || l.name.toLowerCase().includes(listLinkerSearch.toLowerCase())).length === 0 && (
                          <div className="text-center py-4 text-muted-foreground text-xs">Aucune liste disponible</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Attachments panel (shown when there are attachments) */}
            {noteAttachments.length > 0 && (
              <div className="flex items-center gap-2 px-6 py-2 border-b border-white/10 bg-amber-500/3 flex-wrap text-xs text-muted-foreground">
                <Paperclip size={11} className="text-amber-400" />
                {noteAttachments.map(att => (
                  <span key={att.id} className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[0.68rem] font-medium bg-amber-500/10 text-amber-300 group/att">
                    {getFileIcon(att.fileType)}
                    <a href={getAttachmentUrl?.(att.storagePath)} target="_blank" rel="noopener noreferrer" className="hover:underline text-inherit truncate max-w-[120px]">{att.fileName}</a>
                    <span className="text-[0.55rem] text-muted-foreground/50">{formatFileSize(att.fileSize)}</span>
                    {canEdit && (
                      <button className="bg-transparent border-none cursor-pointer p-0 opacity-0 group-hover/att:opacity-100 transition-opacity text-current hover:text-destructive" onClick={() => deleteAttachment?.(att.id, att.storagePath)} title="Supprimer"><X size={10} /></button>
                    )}
                  </span>
                ))}
              </div>
            )}

            <div className="flex-1 flex overflow-hidden">
              <div
                ref={editorRef}
                contentEditable={canEdit}
                suppressContentEditableWarning
                onInput={handleEditorInput}
                onKeyDown={handleEditorKeyDown}
                data-placeholder="Commencez a ecrire..."
                className="flex-1 bg-transparent text-[0.88rem] leading-[1.8] px-6 py-5 outline-none overflow-y-auto text-foreground empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/25 [&>h1]:text-xl [&>h1]:font-bold [&>h1]:mt-4 [&>h1]:mb-2 [&>h2]:text-lg [&>h2]:font-bold [&>h2]:mt-3 [&>h2]:mb-1.5 [&>h3]:text-base [&>h3]:font-semibold [&>h3]:mt-2 [&>h3]:mb-1 [&>ul]:pl-5 [&>ul]:list-disc [&>ol]:pl-5 [&>ol]:list-decimal [&>blockquote]:border-l-2 [&>blockquote]:border-primary [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-muted-foreground [&_a]:text-primary [&_a]:underline"
              />
            </div>

            <div className="flex justify-between items-center px-6 py-2 text-[0.7rem] text-muted-foreground border-t border-white/10 bg-secondary/30">
              <div className="flex items-center gap-3">
                <span className="counter-animate">{wordCount} mots</span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                <span className="counter-animate">{charCount} caracteres</span>
              </div>
              <span>Modifiee {new Date(current.updatedAt).toLocaleString('fr-FR')}</span>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-primary/5 flex items-center justify-center empty-icon"><FileText size={40} /></div>
            <p className="text-muted-foreground">Note introuvable</p>
            <button className="px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25 border-none rounded-xl text-sm cursor-pointer font-medium btn-glow" onClick={goToBrowser}>Retour</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Notes
