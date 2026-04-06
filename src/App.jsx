import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import TodoList from './components/TodoList'
import Notes from './components/Notes'
import KanbanBoard from './components/KanbanBoard'
import AuthPage from './components/AuthPage'
import ProjectSelector from './components/ProjectSelector'
import UserProfile from './components/UserProfile'
import UpgradeModal from './components/UpgradeModal'
import LoginUpgradeModal from './components/LoginUpgradeModal'
import ErrorBoundary from './components/ErrorBoundary'
import { MentionsLegales, Confidentialite, CGU } from './components/LegalPages'
import CheckoutPage from './components/CheckoutPage'
import ApiDocs from './components/ApiDocs'
import SharedView from './components/SharedView'
import InvitationBanner from './components/InvitationBanner'
import SharedWithMe from './components/SharedWithMe'
import SharedItemView from './components/SharedItemView'
import InvitationsPage from './components/InvitationsPage'
import Loader from './components/Loader'

import { useAuth } from './contexts/AuthContext'
import { useProject } from './contexts/ProjectContext'
import { useSubscription } from './contexts/SubscriptionContext'
import { useSupabaseData } from './hooks/useSupabaseData'
import { useAppRouter } from './hooks/useAppRouter'
import { CheckSquare, StickyNote, Menu, Search, X, Star, FileText, Columns3, Check, Info, AlertTriangle, XCircle, LogOut, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, FolderKanban, WifiOff, Zap, Copy, Crown, GraduationCap, ArrowRight, Activity, Code2, Clock, Plus, Trash2, Paperclip, Edit3, Eye, BarChart3, Filter, Settings, Users, Share2, Mail } from 'lucide-react'
import { cn } from './lib/utils'

function timeAgo(ts) {
  const diff = Date.now() - ts
  if (diff < 60000) return "a l'instant"
  if (diff < 3600000) return `il y a ${Math.floor(diff / 60000)} min`
  if (diff < 86400000) return `il y a ${Math.floor(diff / 3600000)}h`
  return new Date(ts).toLocaleDateString('fr-FR')
}

function App() {
  const location = useLocation()
  const appNavigate = useNavigate()
  const { user, profile, loading: authLoading, signOut } = useAuth()
  const { activeProject, projects, members, pendingInvitations, sharedItems, loading: projectLoading } = useProject()
  const { plan, isFree, canCreateList, canCreateKanbanBoard } = useSubscription()
  const {
    lists, allTodos, notes, kanbanBoards, folders, attachments, activityLog, loading: dataLoading,
    setLists, setAllTodos, setNotes, setFolders,
    addList, updateList, deleteList,
    addTodo, updateTodo, deleteTodo,
    addSubtask, updateSubtask, deleteSubtask,
    addNote, updateNote, deleteNote,
    addKanbanBoard, updateKanbanBoard, deleteKanbanBoard,
    addFolder, deleteFolder,
    uploadAttachment, deleteAttachment, getAttachmentUrl, totalStorageUsed,
    logActivity, clearOldActivity, createShareLink,
  } = useSupabaseData()
  const { tab: activeTab, notFound, listId: urlListId, taskId: urlTaskId, boardId: urlBoardId, noteId: urlNoteId, folderId: urlFolderId, apiSection: urlApiSection, json: jsonMode, goTo, replaceTo } = useAppRouter()
  const [theme, setTheme] = useState(() => localStorage.getItem('app_theme') || 'dark')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showGlobalSearch, setShowGlobalSearch] = useState(false)
  const [globalQuery, setGlobalQuery] = useState('')
  const searchInputRef = useRef(null)
  const [toasts, setToasts] = useState([])
  const toastIdRef = useRef(0)
  const [showProjectSelector, setShowProjectSelector] = useState(false)
  const [showUserProfile, setShowUserProfile] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [idCopied, setIdCopied] = useState(false)
  const [upgradeReason, setUpgradeReason] = useState(null)
  const [showSidebarUpgrade, setShowSidebarUpgrade] = useState(false)
  const [showLoginUpgrade, setShowLoginUpgrade] = useState(false)
  const [viewingSharedItem, setViewingSharedItem] = useState(null)
  const [activityPage, setActivityPage] = useState(1)
  const [autoCleanup, setAutoCleanup] = useState(() => {
    const stored = localStorage.getItem('activity_auto_cleanup')
    return stored === null ? true : stored === 'true'
  })
  const ACTIVITY_PER_PAGE = 20

  // Clear shared item view when leaving the shared tab
  useEffect(() => {
    if (activeTab !== 'shared') setViewingSharedItem(null)
  }, [activeTab])

  // Auto-cleanup: delete activity older than 7 days if enabled
  useEffect(() => {
    if (autoCleanup && clearOldActivity) {
      clearOldActivity(7)
    }
  }, [autoCleanup, clearOldActivity])

  // Reset page when switching to activity
  useEffect(() => {
    if (activeTab === 'activity') setActivityPage(1)
  }, [activeTab])

  const dismissToast = useCallback((id) => {
    setToasts(prev => {
      const toast = prev.find(t => t.id === id)
      if (toast?.timer) clearTimeout(toast.timer)
      return prev.map(t => t.id === id ? { ...t, exiting: true } : t)
    })
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 300)
  }, [])

  const showToast = useCallback((message, type = 'info', undoFn = null, duration = 4000) => {
    const id = ++toastIdRef.current
    const timer = setTimeout(() => dismissToast(id), duration)
    setToasts(prev => [...prev, { id, message, type, undoFn, timer, duration, createdAt: Date.now(), exiting: false }])
    return id
  }, [dismissToast])

  const undoToast = useCallback((id) => {
    const toast = toasts.find(t => t.id === id)
    if (toast?.undoFn) toast.undoFn()
    dismissToast(id)
  }, [toasts, dismissToast])

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('app_theme', theme) }, [theme])

  useEffect(() => {
    const goOnline = () => setIsOnline(true)
    const goOffline = () => setIsOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline) }
  }, [])

  // Show upgrade popup after login (flag set by AuthPage)
  useEffect(() => {
    if (user && sessionStorage.getItem('ws_just_logged_in')) {
      sessionStorage.removeItem('ws_just_logged_in')
      const t = setTimeout(() => setShowLoginUpgrade(true), 800)
      return () => clearTimeout(t)
    }
  }, [user])

  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key === '1') { e.preventDefault(); goTo('todos') }
      if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key === '2') { e.preventDefault(); goTo('kanban') }
      if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key === '3') { e.preventDefault(); goTo('notes') }
      if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key === '4') { e.preventDefault(); goTo('favorites') }
      if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key === '5') { e.preventDefault(); goTo('activity') }
      if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key === '6') { e.preventDefault(); goTo('api') }
      if (e.ctrlKey && e.shiftKey && e.key === 'F') { e.preventDefault(); setShowGlobalSearch(true) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [goTo])

  useEffect(() => {
    if (showGlobalSearch) setTimeout(() => searchInputRef.current?.focus(), 50)
  }, [showGlobalSearch])

  // Redirect authenticated users: only handle login/signup with plan param and root path
  useEffect(() => {
    if (!user || authLoading) return
    const plan = new URLSearchParams(location.search).get('plan')
    if (plan && ['/connexion', '/inscription'].includes(location.pathname)) {
      appNavigate(`/abonnement?plan=${plan}`, { replace: true })
    } else if (['/connexion', '/inscription'].includes(location.pathname)) {
      appNavigate('/taches', { replace: true })
    }
  }, [user, authLoading, location.pathname, location.search, appNavigate])



  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  const navigateTo = useCallback((type, id, listId) => {
    if (type === 'tache' || type === 'task') {
      goTo('todos', { listId, taskId: id })
    } else if (type === 'note') {
      goTo('notes', { noteId: id })
    }
    setShowGlobalSearch(false)
    setGlobalQuery('')
    setMobileMenuOpen(false)
  }, [goTo])

  // Shared view — public, no auth required
  if (location.pathname.startsWith('/share/')) {
    const token = location.pathname.split('/share/')[1]
    if (token) return <SharedView token={token} />
  }

  // Auth gate
  if (authLoading) return <Loader fullScreen />

  // Public pages — accessible whether logged in or not
  const publicPages = ['/', '/tarifs', '/decouvrir', '/connexion', '/inscription']
  const featurePageMatch = location.pathname.match(/^\/fonctionnalite\/[a-z-]+$/)
  if (!user || publicPages.includes(location.pathname) || featurePageMatch) {
    return <AuthPage />
  }

  // Legal pages & checkout — accessible when logged in too
  if (location.pathname === '/mentions-legales') return <MentionsLegales />
  if (location.pathname === '/confidentialite') return <Confidentialite />
  if (location.pathname === '/cgu') return <CGU />
  if (location.pathname === '/abonnement') return <CheckoutPage />

  // 404 — unknown route
  if (notFound) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center px-6">
        <div className="text-8xl font-black bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent mb-4">404</div>
        <h1 className="text-xl font-bold mb-2">Page introuvable</h1>
        <p className="text-sm text-muted-foreground mb-8">Cette page n'existe pas ou a ete deplacee.</p>
        <button onClick={() => goTo('todos')} className="px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white border-none rounded-xl text-sm font-semibold cursor-pointer shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:brightness-110 transition-all">
          Retour aux taches
        </button>
      </div>
    </div>
  )

  // Project gate — show popup even while loading
  if (projectLoading || !activeProject) {
    return (
      <Loader fullScreen />
    )
  }

  // JSON mode
  const fmtTask = (t) => ({ id: t.id, listId: t.listId, text: t.text, status: t.status, priority: t.priority, dueDate: t.dueDate, notes: t.notes, tags: t.tags, starred: t.starred, linkedNoteId: t.linkedNoteId, createdAt: t.createdAt, subtasks: t.subtasks })
  const fmtNote = (n, full) => {
    const base = { id: n.id, title: n.title || 'Sans titre', color: n.color, pinned: n.pinned, starred: n.starred, kanbanStatus: n.kanbanStatus || null, kanbanBoardId: n.kanbanBoardId || null, updatedAt: n.updatedAt }
    return full ? { ...base, content: n.content, createdAt: n.createdAt } : base
  }
  if (jsonMode) {
    let jsonData = {}
    if (activeTab === 'notes') {
      if (urlNoteId) {
        const note = notes.find(n => n.id === urlNoteId)
        jsonData = note ? fmtNote(note, true) : { error: 'Note not found' }
      } else {
        jsonData = { notes: notes.map(n => fmtNote(n, false)) }
      }
    } else if (activeTab === 'todos') {
      if (urlTaskId && urlListId) {
        const task = allTodos.find(t => t.id === urlTaskId)
        jsonData = task ? fmtTask(task) : { error: 'Task not found' }
      } else if (urlListId) {
        const list = lists.find(l => l.id === urlListId)
        const tasks = allTodos.filter(t => t.listId === urlListId)
        jsonData = { list: list ? { id: list.id, name: list.name } : { id: urlListId }, tasks: tasks.map(fmtTask) }
      } else {
        jsonData = { lists: lists.map(l => ({ id: l.id, name: l.name })), totalTasks: allTodos.length }
      }
    } else if (activeTab === 'kanban') {
      if (urlBoardId) {
        const board = (kanbanBoards || []).find(b => b.id === urlBoardId)
        if (!board) { jsonData = { error: 'Board not found' } } else {
          const boardTasks = allTodos.filter(t => t.kanbanBoardId === board.id && t.onKanban)
          const boardNotes = notes.filter(n => n.kanbanBoardId === board.id && n.kanbanStatus)
          jsonData = { id: board.id, name: board.name, columns: board.columns, tasks: boardTasks.map(fmtTask), notes: boardNotes.map(n => fmtNote(n, false)) }
        }
      } else {
        jsonData = { boards: (kanbanBoards || []).map(b => ({ id: b.id, name: b.name })) }
      }
    }
    return (
      <pre style={{ background: '#1e1e2e', color: '#cdd6f4', padding: '2rem', margin: 0, minHeight: '100vh', fontFamily: 'monospace', fontSize: '14px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.6 }}>
        {JSON.stringify(jsonData, null, 2)}
      </pre>
    )
  }

  const getGlobalResults = () => {
    if (!globalQuery.trim()) return []
    const q = globalQuery.toLowerCase()
    const results = []
    allTodos.forEach(t => {
      if (t.text.toLowerCase().includes(q) || (t.notes || '').toLowerCase().includes(q) || (t.tags || []).some(tag => tag.toLowerCase().includes(q))) {
        const list = lists.find(l => l.id === t.listId)
        results.push({ type: 'tache', id: t.id, listId: t.listId, text: t.text, preview: list ? list.name : '', tab: 'todos' })
      }
    })
    notes.forEach(n => {
      if ((n.title || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q)) {
        results.push({ type: 'note', id: n.id, text: n.title || 'Sans titre', preview: (n.content || '').slice(0, 60), tab: 'notes' })
      }
    })
    return results.slice(0, 20)
  }

  const starredNotes = notes.filter(n => n.starred)
  const starredTasks = allTodos.filter(t => t.starred)

  const tabs = [
    { id: 'todos', icon: <CheckSquare size={18} className="tab-icon-todos" />, label: 'Taches', kbd: '1' },
    { id: 'kanban', icon: <Columns3 size={18} className="tab-icon-kanban" />, label: 'Kanban', kbd: '2' },
    { id: 'notes', icon: <StickyNote size={18} className="tab-icon-notes" />, label: 'Notes', kbd: '3' },
    { id: 'favorites', icon: <Star size={18} className="tab-icon-favorites" />, label: 'Favoris', kbd: '4', count: starredTasks.length + starredNotes.length },
  ]

  const renderContent = () => {

    if (activeTab === 'favorites') return (
      <div className="flex-1 flex flex-col overflow-y-auto page-transition">
        <div className="px-10 pt-14 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400 text-xs font-semibold mb-5">
            <Star size={12} /> FAVORIS
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">
            Vos <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">favoris</span>
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">Vos tâches et notes favorites, toujours à portée de main</p>
        </div>
        <div className="px-10 pb-10 flex-1">
          {starredTasks.length > 0 && (
            <div className="mb-8">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                <CheckSquare size={14} /> Taches favorites
                <span className="ml-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[0.65rem] font-bold normal-case tracking-normal counter-animate">{starredTasks.length}</span>
              </h3>
              <div className="flex flex-col gap-2">
                {starredTasks.map((t, i) => {
                  const list = lists.find(l => l.id === t.listId)
                  return (
                    <div key={t.id} className="flex items-center gap-4 px-4 py-3.5 bg-card/80 backdrop-blur-sm border border-border rounded-xl cursor-pointer card-hover group stagger-item" style={{ animationDelay: `${i * 0.03}s` }} onClick={() => navigateTo('task', t.id, t.listId)}>
                      <div className="w-5 h-5 rounded-md bg-violet-500/15 flex items-center justify-center text-violet-400 group-hover:bg-violet-500/25 transition-colors duration-150">
                        <CheckSquare size={12} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={cn("block text-sm font-medium", t.status === 'done' && "line-through text-muted-foreground")}>{t.text}</span>
                        <span className="text-xs text-muted-foreground">{list?.name}</span>
                      </div>
                      <span className={cn(
                        "text-xs font-medium px-2.5 py-1 rounded-lg",
                        t.status === 'todo' && "bg-violet-500/15 text-violet-400",
                        t.status === 'doing' && "bg-blue-500/15 text-blue-400",
                        t.status === 'done' && "bg-emerald-500/15 text-emerald-400"
                      )}>
                        {t.status === 'todo' ? 'A faire' : t.status === 'doing' ? 'En cours' : 'Termine'}
                      </span>
                      <button className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-warning hover:bg-warning/15 bg-transparent border-none cursor-pointer transition-colors" onClick={e => { e.stopPropagation(); updateTodo(t.id, { starred: false }) }} title="Retirer des favoris">
                        <Star size={14} className="fill-warning" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {starredNotes.length > 0 && (
            <div className="mb-8">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                <StickyNote size={14} /> Notes favorites
                <span className="ml-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[0.65rem] font-bold normal-case tracking-normal counter-animate">{starredNotes.length}</span>
              </h3>
              <div className="flex flex-col gap-2">
                {starredNotes.map((n, i) => (
                  <div key={n.id} className="flex items-center gap-4 px-4 py-3.5 bg-card/80 backdrop-blur-sm border border-border rounded-xl cursor-pointer card-hover group stagger-item" style={{ animationDelay: `${i * 0.03}s` }} onClick={() => navigateTo('note', n.id)}>
                    <div className="w-5 h-5 rounded-md flex items-center justify-center transition-colors duration-150" style={{ background: n.color + '20', color: n.color }}>
                      <FileText size={12} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="block text-sm font-medium">{n.title || 'Sans titre'}</span>
                      <span className="text-xs text-muted-foreground truncate block">{(n.content || '').slice(0, 80)}</span>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(n.updatedAt)}</span>
                    <button className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-warning hover:bg-warning/15 bg-transparent border-none cursor-pointer transition-colors" onClick={e => { e.stopPropagation(); updateNote(n.id, { starred: false }) }} title="Retirer des favoris">
                      <Star size={14} className="fill-warning" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {starredTasks.length === 0 && starredNotes.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-5 py-24">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 flex items-center justify-center text-amber-400 empty-state-icon border border-amber-500/15">
                <Star size={36} />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-foreground/80 mb-1">Aucun favori</p>
                <p className="text-sm text-muted-foreground/60">Marquez des tâches ou notes avec l'étoile pour les retrouver ici</p>
              </div>
            </div>
          )}
        </div>
      </div>
    )

    return null
  }

  return (
    <div className="flex h-screen bg-background app-ambient overflow-hidden">
      <div className="app-ambient-orb" />
      {/* Mobile hamburger */}
      <button
        className="fixed top-3 left-3 z-60 w-10 h-10 items-center justify-center bg-card/80 backdrop-blur-lg border border-border rounded-xl text-foreground cursor-pointer hidden max-md:flex shadow-lg"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        <Menu size={20} />
      </button>

      {/* Sidebar */}
      <nav className={cn(
        "w-[260px] h-screen sidebar-bg border-r border-border flex flex-col shrink-0 z-50 sticky top-0",
        "max-md:fixed max-md:top-0 max-md:h-screen max-md:w-[280px] max-md:transition-all max-md:duration-200 max-md:ease-out",
        mobileMenuOpen ? "max-md:left-0 max-md:shadow-2xl" : "max-md:-left-[280px]"
      )}>
        {/* Sidebar header - project selector */}
        <div className="px-5 py-3 border-b border-border relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setShowProjectSelector(true)}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg dash-header-icon" style={{ background: `linear-gradient(135deg, ${activeProject?.color || '#8b5cf6'}, ${activeProject?.color || '#8b5cf6'}cc)`, boxShadow: `0 4px 20px ${activeProject?.color || '#8b5cf6'}50, 0 0 40px ${activeProject?.color || '#8b5cf6'}20` }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5.5 12.5 L9.5 16.5 L18.5 6.5"/></svg>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold truncate max-w-[130px]">{activeProject?.name}</span>
                  <ChevronDown size={14} className="text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                </div>
                {activeProject?.id && (
                  <div className="relative max-md:hidden">
                    <div
                      className="flex items-center gap-1.5 cursor-pointer group/id hover:bg-accent/50 rounded-md px-1 -mx-1 py-0.5 transition-colors"
                      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(activeProject.id); setIdCopied(true); setTimeout(() => setIdCopied(false), 2000) }}
                      title="Copier le Project ID"
                    >
                      <span className="text-[0.65rem] font-mono text-muted-foreground truncate max-w-[130px]">{activeProject.id}</span>
                      {idCopied
                        ? <Check size={11} className="shrink-0 text-emerald-400 transition-colors" />
                        : <Copy size={11} className="shrink-0 text-muted-foreground/50 group-hover/id:text-primary transition-colors" />
                      }
                    </div>
                    {idCopied && (
                      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 px-2.5 py-1 bg-emerald-500 text-white text-[0.6rem] font-semibold rounded-lg shadow-lg shadow-emerald-500/30 whitespace-nowrap animate-in fade-in slide-in-from-top-1 z-50">
                        Copie !
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>


        {/* Nav items */}
        <ul className="list-none px-4 py-3 flex flex-col gap-0.5 relative z-10 flex-1 overflow-y-auto">
          {/* MENU divider label */}
          <li className="px-4 pb-1 text-[0.55rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50 select-none">Menu</li>
          {tabs.map(tab => (
            <li
              key={tab.id}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer font-medium text-sm transition-all duration-150 sidebar-item",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 sidebar-active"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
              onClick={() => { goTo(tab.id); if (window.innerWidth < 768) setMobileMenuOpen(false) }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </li>
          ))}
          <li
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer font-medium text-sm transition-all duration-150 sidebar-item",
              activeTab === 'shared'
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 sidebar-active"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
            onClick={() => { goTo('shared'); if (window.innerWidth < 768) setMobileMenuOpen(false) }}
          >
            <Share2 size={18} className="text-blue-400" />
            <span>Partagé avec moi</span>
            {(projects.filter(p => p.myRole !== 'owner').length + sharedItems.length) > 0 && (
              <span className={cn(
                "ml-auto text-[0.65rem] min-w-[22px] text-center py-1 px-2.5 rounded-full font-bold counter-animate",
                activeTab === 'shared' ? "bg-white/20" : "bg-primary/15 text-primary"
              )}>{projects.filter(p => p.myRole !== 'owner').length + sharedItems.length}</span>
            )}
          </li>
        </ul>

        {/* Sidebar footer */}
        <div className="mt-auto px-4 py-3 border-t border-border flex flex-col gap-0.5 relative z-10">
          {/* OUTILS divider label */}
          <div className="px-4 pb-1 text-[0.55rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50 select-none">Outils</div>
          <button
            className={cn(
              "flex items-center gap-3 w-full px-4 py-2 bg-transparent border-none cursor-pointer text-sm rounded-xl transition-all duration-150 sidebar-item",
              activeTab === 'activity' ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 sidebar-active" : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
            onClick={() => { goTo('activity'); if (window.innerWidth < 768) setMobileMenuOpen(false) }}
          >
            <Activity size={16} className="text-emerald-400" />
            <span>Activité</span>
          </button>
          <button
            className={cn(
              "flex items-center gap-3 w-full px-4 py-2 bg-transparent border-none cursor-pointer text-sm rounded-xl transition-all duration-150 sidebar-item",
              activeTab === 'api' ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 sidebar-active" : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
            onClick={() => { goTo('api'); if (window.innerWidth < 768) setMobileMenuOpen(false) }}
          >
            <Code2 size={16} className="text-cyan-400" />
            <span>API</span>
          </button>
          <button
            className={cn(
              "flex items-center gap-3 w-full px-4 py-2 bg-transparent border-none cursor-pointer text-sm rounded-xl transition-all duration-150 sidebar-item",
              activeTab === 'invitations' ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 sidebar-active" : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
            onClick={() => { goTo('invitations'); if (window.innerWidth < 768) setMobileMenuOpen(false) }}
          >
            <Mail size={16} className="text-amber-400" />
            <span>Invitations</span>
            {(pendingInvitations.length + members.length - 1) > 0 && (
              <span className={cn(
                "ml-auto text-[0.6rem] min-w-[22px] text-center py-0.5 px-2 rounded-full font-bold",
                activeTab === 'invitations' ? "bg-white/20" : "bg-primary/15 text-primary"
              )}>{pendingInvitations.length > 0 ? pendingInvitations.length : members.length}</span>
            )}
          </button>
          <button className="flex items-center gap-3 w-full px-4 py-2 bg-transparent border-none text-muted-foreground cursor-pointer text-sm rounded-xl transition-all duration-150 hover:bg-accent hover:text-foreground sidebar-item" onClick={() => setShowGlobalSearch(true)}>
            <Search size={16} className="text-blue-400" />
            <span>Recherche</span>
            <kbd className="ml-auto text-[0.6rem] opacity-30 font-mono px-1.5 py-0.5 rounded-md bg-foreground/5 max-md:hidden">⌘⇧F</kbd>
          </button>
          {/* User section */}
          <div className="mt-1.5 pt-2 border-t border-border">
            <div className="flex items-center gap-2.5 px-3 py-1.5">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className="w-8 h-8 rounded-full object-cover cursor-pointer shadow-md shadow-violet-500/25 hover:shadow-lg hover:shadow-violet-500/40 hover:scale-110 transition-all"
                  onClick={() => setShowUserProfile(true)}
                  title="Mon compte"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold cursor-pointer shadow-md shadow-violet-500/25 hover:shadow-lg hover:shadow-violet-500/40 hover:scale-110 transition-all"
                  onClick={() => setShowUserProfile(true)}
                  title="Mon compte"
                >
                  {(profile?.display_name || user?.email || '?')[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setShowUserProfile(true)}>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-medium">{profile?.display_name || 'Utilisateur'}</span>
                  <div className="relative" onClick={e => e.stopPropagation()}>
                    <button
                      className="inline-flex items-center gap-0.5 px-1.5 py-px rounded-full text-[0.5rem] font-bold shrink-0 border-none cursor-pointer transition-all duration-200 hover:scale-105 hover:brightness-110"
                      style={{
                        background: (plan === 'pro' ? '#8b5cf6' : plan === 'student' ? '#4dabf7' : '#9899b3') + '20',
                        color: plan === 'pro' ? '#8b5cf6' : plan === 'student' ? '#4dabf7' : '#9899b3',
                      }}
                      onClick={() => plan !== 'pro' ? setShowSidebarUpgrade(!showSidebarUpgrade) : null}
                      title={plan !== 'pro' ? 'Changer de plan' : 'Plan actuel'}
                    >
                      {plan === 'pro' ? <Crown size={8} /> : plan === 'student' ? <GraduationCap size={8} /> : <Zap size={8} />}
                      {plan === 'pro' ? 'Pro' : plan === 'student' ? 'Étudiant' : 'Free'}
                      {plan !== 'pro' && <ChevronUp size={7} className={cn("transition-transform duration-200", showSidebarUpgrade && "rotate-180")} />}
                    </button>

                    {showSidebarUpgrade && plan !== 'pro' && (
                      <>
                      <div className="fixed inset-0 z-[199]" onClick={() => setShowSidebarUpgrade(false)} />
                      <div
                        className="fixed left-[18px] bottom-[70px] w-56 bg-card/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden z-[200] animate-in popup-shadow"
                      >
                        <div className="px-3 pt-2.5 pb-1.5">
                          <div className="text-[0.55rem] font-semibold text-muted-foreground uppercase tracking-widest">Passer au supérieur</div>
                        </div>
                        {plan === 'free' && (
                          <button
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-transparent border-none cursor-pointer text-left transition-all hover:bg-white/[0.05] group"
                            onClick={() => { setShowSidebarUpgrade(false); appNavigate('/abonnement?plan=student') }}
                          >
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#4dabf720', color: '#4dabf7' }}>
                              <GraduationCap size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold">Étudiant</span>
                                <span className="text-[0.55rem] font-bold px-1.5 py-px rounded-full" style={{ background: '#4dabf720', color: '#4dabf7' }}>2,49€/mois</span>
                              </div>
                              <div className="text-[0.6rem] text-muted-foreground">5 projets, API, 3 membres…</div>
                            </div>
                            <ArrowRight size={11} className="text-muted-foreground/30 group-hover:text-foreground/60 transition-colors shrink-0" />
                          </button>
                        )}
                        <button
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-transparent border-none cursor-pointer text-left transition-all hover:bg-white/[0.05] group"
                          onClick={() => { setShowSidebarUpgrade(false); appNavigate('/abonnement?plan=pro') }}
                        >
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#8b5cf620', color: '#8b5cf6' }}>
                            <Crown size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold">Pro</span>
                              <span className="text-[0.55rem] font-bold px-1.5 py-px rounded-full" style={{ background: '#8b5cf620', color: '#8b5cf6' }}>7€/mois</span>
                            </div>
                            <div className="text-[0.6rem] text-muted-foreground">{plan === 'free' ? 'Tout illimité, export, support' : 'Membres illimités, export, support'}</div>
                          </div>
                          <ArrowRight size={11} className="text-muted-foreground/30 group-hover:text-foreground/60 transition-colors shrink-0" />
                        </button>
                        <div className="px-3 pb-2.5 pt-1">
                          <button
                            className="w-full py-1.5 rounded-lg text-[0.6rem] font-semibold bg-transparent border border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20 cursor-pointer transition-all"
                            onClick={() => { setShowSidebarUpgrade(false); appNavigate('/tarifs') }}
                          >
                            Comparer les plans
                          </button>
                        </div>
                      </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-[0.65rem] text-muted-foreground truncate">{user?.email}</div>
              </div>
              <button
                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 bg-transparent border-none cursor-pointer transition-colors"
                onClick={() => { appNavigate('/connexion'); signOut() }}
                title="Déconnexion"
              >
                <LogOut size={14} />
              </button>
            </div>
            {/* Quick links */}

          </div>
          <InvitationBanner />
        </div>
      </nav>

      {mobileMenuOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 hidden max-md:block" onClick={() => setMobileMenuOpen(false)} />}

      <main className="flex-1 overflow-y-auto flex flex-col max-md:pt-14 relative">
        {!isOnline && (
          <div className="flex items-center justify-center gap-2 px-4 py-2 bg-warning/15 text-warning text-sm font-medium border-b border-warning/30 shrink-0">
            <WifiOff size={14} /> Mode hors-ligne — les modifications ne seront pas enregistrées tant que la connexion n'est pas rétablie
          </div>
        )}
        {/* Persistent tabs — always mounted, hidden via CSS to preserve state */}
        <div className={cn("flex-1 flex flex-col overflow-hidden", activeTab !== 'todos' && "hidden")}>
          <ErrorBoundary>
          <TodoList lists={lists} setLists={setLists} allTodos={allTodos} setAllTodos={setAllTodos}
            notes={notes} showToast={showToast}
            dbAddList={addList} dbUpdateList={updateList} dbDeleteList={deleteList}
            dbAddTodo={addTodo} dbUpdateTodo={updateTodo} dbDeleteTodo={deleteTodo}
            dbAddSubtask={addSubtask} dbUpdateSubtask={updateSubtask} dbDeleteSubtask={deleteSubtask}
            attachments={attachments} uploadAttachment={uploadAttachment} deleteAttachment={deleteAttachment}
            getAttachmentUrl={getAttachmentUrl} totalStorageUsed={totalStorageUsed}
            createShareLink={createShareLink} logActivity={logActivity}
            todoFolders={folders.filter(f => f.type === 'list')} setTodoFolders={setFolders}
            dbAddFolder={addFolder} dbDeleteFolder={deleteFolder}
            urlListId={activeTab === 'todos' ? urlListId : undefined}
            urlTaskId={activeTab === 'todos' ? urlTaskId : undefined}
            onNavigate={(params) => replaceTo('todos', params)}
            showUpgradeModal={(reason) => setUpgradeReason(reason)} />
          </ErrorBoundary>
        </div>
        <div className={cn("flex-1 flex flex-col overflow-hidden", activeTab !== 'kanban' && "hidden")}>
          <ErrorBoundary>
          <KanbanBoard lists={lists} allTodos={allTodos} setAllTodos={setAllTodos} notes={notes} setNotes={setNotes} showToast={showToast}
            dbUpdateTodo={updateTodo} dbAddTodo={addTodo} dbDeleteTodo={deleteTodo} dbUpdateNote={updateNote} dbAddNote={addNote} dbDeleteNote={deleteNote}
            kanbanBoards={kanbanBoards}
            kanbanFolders={folders.filter(f => f.type === 'kanban')} setKanbanFolders={setFolders}
            dbAddFolder={addFolder} dbDeleteFolder={deleteFolder}
            dbAddKanbanBoard={addKanbanBoard} dbUpdateKanbanBoard={updateKanbanBoard} dbDeleteKanbanBoard={deleteKanbanBoard}
            createShareLink={createShareLink} logActivity={logActivity}
            urlBoardId={activeTab === 'kanban' ? urlBoardId : undefined}
            onNavigate={(params) => replaceTo('kanban', params)}
            showUpgradeModal={(reason) => setUpgradeReason(reason)} />
          </ErrorBoundary>
        </div>
        <div className={cn("flex-1 flex flex-col overflow-hidden", activeTab !== 'notes' && "hidden")}>
          <ErrorBoundary>
          <Notes notes={notes} setNotes={setNotes}
            folders={folders.filter(f => f.type === 'note')} setFolders={setFolders}
            dbAddFolder={addFolder} dbDeleteFolder={deleteFolder}
            lists={lists} setLists={setLists} allTodos={allTodos} setAllTodos={setAllTodos}
            dbAddNote={addNote} dbUpdateNote={updateNote} dbDeleteNote={deleteNote} dbUpdateTodo={updateTodo} dbUpdateList={updateList}
            logActivity={logActivity} createShareLink={createShareLink}
            attachments={attachments} uploadAttachment={uploadAttachment} deleteAttachment={deleteAttachment}
            getAttachmentUrl={getAttachmentUrl} totalStorageUsed={totalStorageUsed}
            urlNoteId={activeTab === 'notes' ? urlNoteId : undefined}
            urlFolderId={activeTab === 'notes' ? urlFolderId : undefined}
            onNavigate={(params) => replaceTo('notes', params)}
            showUpgradeModal={(reason) => setUpgradeReason(reason)} />
          </ErrorBoundary>
        </div>
        {activeTab === 'favorites' && <ErrorBoundary>{renderContent()}</ErrorBoundary>}
        {activeTab === 'shared' && (
          <ErrorBoundary>
            {viewingSharedItem
              ? <SharedItemView item={viewingSharedItem} onBack={() => setViewingSharedItem(null)} />
              : <SharedWithMe onOpenProject={() => goTo('todos')} onOpenSharedItem={(item) => setViewingSharedItem(item)} />
            }
          </ErrorBoundary>
        )}
        {activeTab === 'invitations' && (
          <ErrorBoundary>
            <InvitationsPage showUpgradeModal={(reason) => setUpgradeReason(reason)} />
          </ErrorBoundary>
        )}
        {activeTab === 'activity' && (
          <ErrorBoundary>
            {(() => {
              const ACTIVITY_CONFIG = {
                task_added:      { icon: Plus,       color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', label: 'Tâche créée' },
                task_completed:  { icon: Check,      color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  label: 'Tâche terminée' },
                task_updated:    { icon: Edit3,      color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Tâche modifiée' },
                task_deleted:    { icon: Trash2,     color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  label: 'Tâche supprimée' },
                task_done:       { icon: Check,      color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  label: 'Tâche terminée' },
                task_created:    { icon: Plus,       color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', label: 'Tâche créée' },
                task_list:       { icon: FileText,   color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', label: 'Liste créée' },
                note_created:    { icon: Plus,       color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', label: 'Note créée' },
                note_updated:    { icon: Edit3,      color: '#06b6d4', bg: 'rgba(6,182,212,0.12)',  label: 'Note modifiée' },
                note_deleted:    { icon: Trash2,     color: '#f43f5e', bg: 'rgba(244,63,94,0.12)',  label: 'Note supprimée' },
                attachment_added:{ icon: Paperclip,  color: '#d97706', bg: 'rgba(217,119,6,0.12)',  label: 'Pièce jointe' },
                list_created:    { icon: FileText,   color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', label: 'Liste créée' },
                list_deleted:    { icon: Trash2,     color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  label: 'Liste supprimée' },
                share_created:   { icon: Eye,        color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Lien partagé' },
                subtask_added:   { icon: CheckSquare,color: '#a78bfa', bg: 'rgba(167,139,250,0.12)',label: 'Sous-tâche' },
                kanban_created:  { icon: Columns3,   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Board créé' },
              }
              const getConfig = (type) => ACTIVITY_CONFIG[type] || { icon: Activity, color: '#9899b3', bg: 'rgba(152,153,179,0.1)', label: type || 'Action' }

              // Pagination
              const totalPages = Math.max(1, Math.ceil(activityLog.length / ACTIVITY_PER_PAGE))
              const page = Math.min(activityPage, totalPages)
              const paginatedLog = activityLog.slice((page - 1) * ACTIVITY_PER_PAGE, page * ACTIVITY_PER_PAGE)

              // Group paginated items by date
              const now = new Date()
              const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
              const yesterdayStart = todayStart - 86400000
              const weekStart = todayStart - 6 * 86400000

              const groups = []
              const todayItems = paginatedLog.filter(e => e.timestamp >= todayStart)
              const yesterdayItems = paginatedLog.filter(e => e.timestamp >= yesterdayStart && e.timestamp < todayStart)
              const weekItems = paginatedLog.filter(e => e.timestamp >= weekStart && e.timestamp < yesterdayStart)
              const olderItems = paginatedLog.filter(e => e.timestamp < weekStart)
              if (todayItems.length) groups.push({ label: "Aujourd'hui", items: todayItems })
              if (yesterdayItems.length) groups.push({ label: 'Hier', items: yesterdayItems })
              if (weekItems.length) groups.push({ label: 'Cette semaine', items: weekItems })
              if (olderItems.length) groups.push({ label: 'Plus ancien', items: olderItems })

              // Stats (on full log)
              const allTodayItems = activityLog.filter(e => e.timestamp >= todayStart)
              const taskCount = activityLog.filter(e => e.type?.startsWith('task')).length
              const noteCount = activityLog.filter(e => e.type?.startsWith('note')).length

              return (
                <div className="flex-1 flex flex-col overflow-y-auto page-transition relative">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-emerald-500/[0.04] via-cyan-500/[0.02] to-transparent rounded-full blur-3xl pointer-events-none" />

                  <div className="px-10 pt-14 pb-4 relative z-1">
                    <div className="flex items-center gap-5 mb-8">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white shadow-lg dash-header-icon" style={{ boxShadow: '0 8px 30px rgba(16,185,129,0.35), 0 0 50px rgba(16,185,129,0.12)' }}>
                        <Activity size={24} />
                      </div>
                      <div className="flex-1">
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Activité</h1>
                        <p className="text-sm text-muted-foreground mt-1">Historique de vos actions récentes</p>
                      </div>
                    </div>

                    {/* Stats cards */}
                    {activityLog.length > 0 && (
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="relative overflow-hidden px-5 py-3.5 bg-card/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-emerald-500/[0.08] to-transparent rounded-bl-full" />
                          <div className="text-[0.6rem] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Aujourd'hui</div>
                          <div className="text-xl font-black bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">{allTodayItems.length}</div>
                        </div>
                        <div className="relative overflow-hidden px-5 py-3.5 bg-card/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-violet-500/[0.08] to-transparent rounded-bl-full" />
                          <div className="text-[0.6rem] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Tâches</div>
                          <div className="text-xl font-black bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">{taskCount}</div>
                        </div>
                        <div className="relative overflow-hidden px-5 py-3.5 bg-card/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-blue-500/[0.08] to-transparent rounded-bl-full" />
                          <div className="text-[0.6rem] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Notes</div>
                          <div className="text-xl font-black bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">{noteCount}</div>
                        </div>
                      </div>
                    )}

                    {/* Cleanup toggle */}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-card/40 border border-white/[0.05] rounded-xl mb-4">
                      <div className="flex items-center gap-2.5">
                        <Settings size={13} className="text-muted-foreground/60" />
                        <span className="text-xs text-muted-foreground">Nettoyage auto (supprime les entrées de +7 jours)</span>
                      </div>
                      <button
                        className="w-9 h-5 rounded-full relative cursor-pointer border-none transition-colors duration-200 shrink-0"
                        style={{ background: autoCleanup ? 'linear-gradient(135deg, #10b981, #059669)' : '#374151' }}
                        onClick={() => { const next = !autoCleanup; setAutoCleanup(next); localStorage.setItem('activity_auto_cleanup', String(next)) }}
                      >
                        <div className={cn(
                          "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200",
                          autoCleanup ? "left-[18px]" : "left-0.5"
                        )} />
                      </button>
                    </div>
                  </div>

                  <div className="px-10 pb-10 flex-1">
                    {activityLog.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-5 py-20">
                        <div className="relative">
                          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 flex items-center justify-center border border-white/[0.06]">
                            <Activity size={36} className="text-emerald-400/60" />
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white shadow-lg" style={{ boxShadow: '0 4px 15px rgba(16,185,129,0.4)' }}>
                            <Clock size={12} />
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-base font-semibold text-foreground mb-1">Aucune activité</p>
                          <p className="text-sm text-muted-foreground/60 max-w-[260px]">Vos actions apparaîtront ici automatiquement</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col gap-6">
                          {groups.map((group) => (
                            <div key={group.label}>
                              <div className="flex items-center gap-3 mb-3">
                                <span className="text-[0.6rem] font-bold uppercase tracking-[0.15em] text-muted-foreground whitespace-nowrap">{group.label}</span>
                                <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
                                <span className="text-[0.55rem] font-medium text-muted-foreground/40 tabular-nums">{group.items.length}</span>
                              </div>
                              <div className="relative ml-3">
                                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-border via-border/50 to-transparent" />
                                <div className="flex flex-col gap-px">
                                  {group.items.map((entry, i) => {
                                    const cfg = getConfig(entry.type)
                                    const Icon = cfg.icon
                                    return (
                                      <div key={entry.id} className="flex items-start gap-3.5 pl-0 pr-3 py-2 rounded-xl transition-all duration-200 hover:bg-card/80 relative group stagger-item" style={{ animationDelay: `${i * 0.02}s` }}>
                                        <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 mt-0.5 z-10 ring-[3px] ring-background transition-all duration-200 group-hover:scale-110" style={{ background: cfg.bg, color: cfg.color }}>
                                          <Icon size={10} strokeWidth={2.5} />
                                        </div>
                                        <div className="flex-1 min-w-0 flex items-start justify-between gap-3">
                                          <div className="min-w-0 flex-1">
                                            <span className="text-sm block leading-snug">{entry.text}</span>
                                            <span className="inline-flex items-center gap-1 text-[0.58rem] font-medium px-1.5 py-px rounded-md mt-0.5" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                                          </div>
                                          <span className="inline-flex items-center gap-1 text-[0.6rem] text-muted-foreground/40 shrink-0 mt-1 whitespace-nowrap tabular-nums">
                                            <Clock size={8} />
                                            {timeAgo(entry.timestamp)}
                                          </span>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                          <div className="flex items-center justify-center gap-2 mt-8 pt-6 border-t border-white/[0.05]">
                            <button
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card/60 border border-white/[0.08] rounded-xl text-xs text-muted-foreground cursor-pointer transition-all hover:bg-card hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                              disabled={page <= 1}
                              onClick={() => setActivityPage(p => Math.max(1, p - 1))}
                            >
                              <ChevronLeft size={13} /> Précédent
                            </button>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                                .reduce((acc, p, idx, arr) => {
                                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...')
                                  acc.push(p)
                                  return acc
                                }, [])
                                .map((p, i) =>
                                  p === '...' ? (
                                    <span key={`dots-${i}`} className="px-1 text-xs text-muted-foreground/30">…</span>
                                  ) : (
                                    <button
                                      key={p}
                                      className={cn(
                                        "w-8 h-8 rounded-lg text-xs font-medium border-none cursor-pointer transition-all duration-150",
                                        p === page
                                          ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/25"
                                          : "bg-card/60 text-muted-foreground hover:bg-card hover:text-foreground"
                                      )}
                                      onClick={() => setActivityPage(p)}
                                    >
                                      {p}
                                    </button>
                                  )
                                )}
                            </div>
                            <button
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card/60 border border-white/[0.08] rounded-xl text-xs text-muted-foreground cursor-pointer transition-all hover:bg-card hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                              disabled={page >= totalPages}
                              onClick={() => setActivityPage(p => Math.min(totalPages, p + 1))}
                            >
                              Suivant <ChevronRight size={13} />
                            </button>
                          </div>
                        )}

                        {/* Page info */}
                        <div className="text-center mt-3 text-[0.6rem] text-muted-foreground/30 tabular-nums">
                          {activityLog.length} entrée{activityLog.length !== 1 ? 's' : ''} au total — page {page}/{totalPages}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )
            })()}
          </ErrorBoundary>
        )}
        {activeTab === 'api' && (
          <ErrorBoundary>
            <ApiDocs section={urlApiSection} onNavigate={(s) => goTo('api', { apiSection: s })} />
          </ErrorBoundary>
        )}

      </main>

      {/* Toast notifications */}
      {toasts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
          {toasts.map(toast => {
            const icons = {
              success: <Check size={16} />,
              info: <Info size={16} />,
              warning: <AlertTriangle size={16} />,
              error: <XCircle size={16} />,
            }
            const iconColors = {
              success: 'text-success',
              info: 'text-primary',
              warning: 'text-warning',
              error: 'text-destructive',
            }
            const barColors = {
              success: 'bg-success',
              info: 'bg-primary',
              warning: 'bg-warning',
              error: 'bg-destructive',
            }
            return (
              <div
                key={toast.id}
                className={cn(
                  "pointer-events-auto min-w-[320px] max-w-[420px] rounded-xl border border-border overflow-hidden shadow-2xl shadow-black/30",
                  "bg-card/80 backdrop-blur-xl",
                  toast.exiting ? 'toast-exit' : 'toast-enter'
                )}
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className={cn("shrink-0", iconColors[toast.type] || iconColors.info)}>
                    {icons[toast.type] || icons.info}
                  </div>
                  <span className="flex-1 text-sm text-foreground">{toast.message}</span>
                  {toast.undoFn && (
                    <button
                      className="shrink-0 text-xs font-semibold text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg cursor-pointer border-none transition-colors duration-150"
                      onClick={() => undoToast(toast.id)}
                    >
                      Annuler
                    </button>
                  )}
                  <button
                    className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer border-none bg-transparent transition-colors duration-150"
                    onClick={() => dismissToast(toast.id)}
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="h-[2px] w-full bg-border/30">
                  <div
                    className={cn("h-full toast-progress", barColors[toast.type] || barColors.info)}
                    style={{ animationDuration: `${toast.duration}ms` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Global search modal */}
      {showGlobalSearch && (
        <div className="fixed inset-0 z-200 flex items-start justify-center pt-[10vh]" onClick={() => { setShowGlobalSearch(false); setGlobalQuery('') }}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md search-backdrop-in" />

          {/* Modal */}
          <div
            className="relative w-[94%] max-w-[580px] search-modal-in"
            onClick={e => e.stopPropagation()}
          >
            {/* Animated gradient border glow */}
            <div className="absolute -inset-[1px] rounded-2xl search-glow-border opacity-60" />
            <div className="absolute -inset-[30px] rounded-3xl search-ambient-glow opacity-30 blur-2xl" />

            {/* Card */}
            <div className="relative bg-card/95 backdrop-blur-2xl rounded-2xl overflow-hidden border border-white/[0.08] search-modal-card">

              {/* Search input area */}
              <div className="relative flex items-center gap-3 px-5 py-4">
                <div className="relative">
                  <Search size={20} className="text-violet-400 search-icon-pulse" />
                  <div className="absolute inset-0 blur-md bg-violet-500/30 rounded-full search-icon-pulse" />
                </div>
                <input
                  ref={searchInputRef} type="text"
                  placeholder="Rechercher tâches, notes, projets…"
                  value={globalQuery} onChange={e => setGlobalQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Escape') { setShowGlobalSearch(false); setGlobalQuery('') } }}
                  className="flex-1 bg-transparent border-none text-white text-base outline-none placeholder:text-white/25 font-medium tracking-wide"
                />
                <div className="flex items-center gap-1.5">
                  <kbd className="text-[0.55rem] text-white/25 font-mono px-2 py-1 rounded-md border border-white/[0.08] bg-white/[0.03] select-none backdrop-blur-sm">ESC</kbd>
                </div>
              </div>

              {/* Divider with glow */}
              <div className="relative h-px">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
              </div>

              {/* Results area */}
              <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
                {(() => {
                  const results = getGlobalResults()
                  const tasks = results.filter(r => r.type === 'tache')
                  const noteResults = results.filter(r => r.type === 'note')

                  if (!globalQuery) return (
                    <div className="flex flex-col items-center justify-center py-14 px-6 search-empty-in">
                      <div className="relative mb-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 flex items-center justify-center border border-white/[0.06]">
                          <Search size={24} className="text-violet-400/60" />
                        </div>
                        <div className="absolute -inset-3 rounded-3xl bg-violet-500/5 blur-xl" />
                      </div>
                      <p className="text-sm font-semibold text-white/50 mb-1">Recherche instantanée</p>
                      <p className="text-xs text-white/20">Tâches, notes, pièces jointes — tout en un seul endroit</p>
                      <div className="flex items-center gap-2 mt-4 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                        <kbd className="text-[0.6rem] font-mono text-violet-400/60 font-semibold">Ctrl</kbd>
                        <span className="text-white/15 text-xs">+</span>
                        <kbd className="text-[0.6rem] font-mono text-violet-400/60 font-semibold">Shift</kbd>
                        <span className="text-white/15 text-xs">+</span>
                        <kbd className="text-[0.6rem] font-mono text-violet-400/60 font-semibold">F</kbd>
                        <span className="text-[0.6rem] text-white/20 ml-1">depuis n'importe où</span>
                      </div>
                    </div>
                  )

                  if (results.length === 0) return (
                    <div className="flex flex-col items-center justify-center py-14 search-empty-in">
                      <div className="relative mb-4">
                        <div className="w-14 h-14 rounded-full bg-white/[0.03] flex items-center justify-center border border-white/[0.05]">
                          <Search size={20} className="text-white/15" />
                        </div>
                      </div>
                      <p className="text-sm font-medium text-white/40">Aucun résultat</p>
                      <p className="text-xs text-white/15 mt-1">Essayez d'autres mots-clés</p>
                    </div>
                  )

                  return (
                    <div className="py-2 px-2">
                      {tasks.length > 0 && (
                        <div className="mb-1">
                          <div className="flex items-center gap-2 px-3 py-2">
                            <div className="w-1 h-3 rounded-full bg-violet-500/60" />
                            <span className="text-[0.6rem] font-bold uppercase tracking-[0.15em] text-white/30">Tâches</span>
                            <span className="text-[0.55rem] font-bold px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400/60">{tasks.length}</span>
                          </div>
                          {tasks.map((r, i) => (
                            <div key={`t${i}`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 hover:bg-white/[0.04] group search-result-in" style={{ animationDelay: `${i * 30}ms` }} onClick={() => navigateTo(r.type, r.id, r.listId)}>
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br from-violet-500/15 to-purple-600/10 border border-violet-500/10 group-hover:border-violet-500/25 group-hover:shadow-lg group-hover:shadow-violet-500/10 transition-all duration-200">
                                <CheckSquare size={14} className="text-violet-400" />
                              </div>
                              <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                                <span className="text-[0.85rem] font-medium text-white/80 truncate group-hover:text-white transition-colors duration-150">{r.text}</span>
                                {r.preview && <span className="text-[0.7rem] text-white/25 truncate">{r.preview}</span>}
                              </div>
                              <ArrowRight size={13} className="text-white/0 group-hover:text-violet-400/50 transition-all duration-200 group-hover:translate-x-0.5 shrink-0" />
                            </div>
                          ))}
                        </div>
                      )}
                      {noteResults.length > 0 && (
                        <div className="mb-1">
                          <div className="flex items-center gap-2 px-3 py-2">
                            <div className="w-1 h-3 rounded-full bg-blue-500/60" />
                            <span className="text-[0.6rem] font-bold uppercase tracking-[0.15em] text-white/30">Notes</span>
                            <span className="text-[0.55rem] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400/60">{noteResults.length}</span>
                          </div>
                          {noteResults.map((r, i) => (
                            <div key={`n${i}`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 hover:bg-white/[0.04] group search-result-in" style={{ animationDelay: `${(tasks.length + i) * 30}ms` }} onClick={() => navigateTo(r.type, r.id, r.listId)}>
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br from-blue-500/15 to-cyan-600/10 border border-blue-500/10 group-hover:border-blue-500/25 group-hover:shadow-lg group-hover:shadow-blue-500/10 transition-all duration-200">
                                <FileText size={14} className="text-blue-400" />
                              </div>
                              <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                                <span className="text-[0.85rem] font-medium text-white/80 truncate group-hover:text-white transition-colors duration-150">{r.text}</span>
                                {r.preview && <span className="text-[0.7rem] text-white/25 truncate">{r.preview}</span>}
                              </div>
                              <ArrowRight size={13} className="text-white/0 group-hover:text-blue-400/50 transition-all duration-200 group-hover:translate-x-0.5 shrink-0" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>

              {/* Footer */}
              <div className="relative">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
                <div className="flex items-center justify-between px-4 py-2.5 text-[0.6rem] text-white/20">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-white/[0.04] font-mono text-white/30">↑</kbd><kbd className="px-1 py-0.5 rounded bg-white/[0.04] font-mono text-white/30">↓</kbd> naviguer</span>
                    <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] font-mono text-white/30">↵</kbd> ouvrir</span>
                  </div>
                  <span className="flex items-center gap-1">Fermer <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] font-mono text-white/30">Esc</kbd></span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Project selector modal */}
      {showProjectSelector && (
        <ProjectSelector onClose={() => setShowProjectSelector(false)} showUpgradeModal={(reason) => { setShowProjectSelector(false); setUpgradeReason(reason) }} />
      )}

      {/* User profile modal */}
      {showUserProfile && (
        <UserProfile onClose={() => setShowUserProfile(false)} theme={theme} toggleTheme={toggleTheme} totalStorageUsed={totalStorageUsed} />
      )}

      {/* Upgrade modal */}
      {upgradeReason && (
        <UpgradeModal onClose={() => setUpgradeReason(null)} reason={upgradeReason} />
      )}

      {/* Login upgrade popup for free users */}
      {showLoginUpgrade && (
        <LoginUpgradeModal onClose={() => setShowLoginUpgrade(false)} />
      )}

    </div>
  )
}

export default App
