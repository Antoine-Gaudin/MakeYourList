import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useProject } from '../contexts/ProjectContext'
import { Plus, Check, X, Trash2, Loader2, MoreVertical, Pencil } from 'lucide-react'
import { cn } from '../lib/utils'

export default function ProjectSelector({ onClose, forceOpen, showUpgradeModal }) {
  const { projects, activeProjectId, setActiveProjectId, createProject, updateProject, deleteProject } = useProject()
  const [showCreate, setShowCreate] = useState(forceOpen && projects.length === 0)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#8b5cf6')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [menuOpenId, setMenuOpenId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const menuRef = useRef(null)
  const btnRefs = useRef({})
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!menuOpenId) return
    const handle = (e) => { if (menuRef.current && !menuRef.current.contains(e.target) && !btnRefs.current[menuOpenId]?.contains(e.target)) setMenuOpenId(null) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [menuOpenId])

  const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6']

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    setLoading(true)
    setError('')
    const { error: err } = await createProject(newName.trim(), '', newColor)
    if (err) {
      if (err.message?.includes('Limite') && showUpgradeModal) {
        showUpgradeModal('Limite de projets atteinte sur votre plan actuel.')
      } else {
        setError(err.message)
      }
    }
    else { setShowCreate(false); setNewName(''); if (onClose) onClose() }
    setLoading(false)
  }

  const handleSelect = (id) => {
    setActiveProjectId(id)
    if (onClose) onClose()
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    setMenuOpenId(null)
    if (!confirm('Supprimer ce projet et toutes ses données ?')) return
    await deleteProject(id)
  }

  const startRename = (e, p) => {
    e.stopPropagation()
    setMenuOpenId(null)
    setEditingId(p.id)
    setEditName(p.name)
  }

  const confirmRename = async (id) => {
    if (editName.trim() && editName.trim() !== projects.find(p => p.id === id)?.name) {
      await updateProject(id, { name: editName.trim() })
    }
    setEditingId(null)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[250] animate-in" onClick={forceOpen ? undefined : onClose}>
      <div className="bg-card/95 backdrop-blur-xl border border-white/10 rounded-2xl max-w-[500px] w-[92%] overflow-hidden animate-slide-up" style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 80px rgba(139,92,246,0.1)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white shadow-lg" style={{ boxShadow: '0 4px 15px rgba(139,92,246,0.4)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5.5 12.5 L9.5 16.5 L18.5 6.5"/></svg>
            </div>
            <h3 className="text-lg font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">Projets</h3>
          </div>
          {!forceOpen && (
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent bg-transparent border-none cursor-pointer">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="p-4 max-h-[400px] overflow-y-auto">
          {projects.map(p => (
            <div
              key={p.id}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-150 group",
                p.id === activeProjectId ? "bg-primary/10 border border-primary/20" : "hover:bg-accent border border-transparent"
              )}
              onClick={() => handleSelect(p.id)}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: p.color || '#8b5cf6' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5.5 12.5 L9.5 16.5 L18.5 6.5"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                {editingId === p.id ? (
                  <input
                    className="w-full px-2 py-1 bg-input border border-primary rounded-lg text-foreground text-sm outline-none"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') confirmRename(p.id); if (e.key === 'Escape') setEditingId(null) }}
                    onBlur={() => confirmRename(p.id)}
                    onClick={e => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  <div className="text-sm font-medium truncate">{p.name}</div>
                )}
                <div className="text-[0.65rem] text-muted-foreground">{p.myRole === 'owner' ? 'Propriétaire' : p.myRole === 'editor' ? 'Éditeur' : 'Lecteur'}</div>
              </div>
              {p.id === activeProjectId && <Check size={16} className="text-primary shrink-0" />}
              {p.myRole === 'owner' && (
                <div className="relative">
                  <button
                    ref={el => btnRefs.current[p.id] = el}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent bg-transparent border-none cursor-pointer opacity-0 group-hover:opacity-100 transition-all"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (menuOpenId === p.id) { setMenuOpenId(null); return }
                      const rect = e.currentTarget.getBoundingClientRect()
                      setMenuPos({ top: rect.bottom + 4, left: rect.right })
                      setMenuOpenId(p.id)
                    }}
                  >
                    <MoreVertical size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}

          {projects.length === 0 && !showCreate && (
            <div className="text-center py-10">
              <p className="text-sm text-muted-foreground mb-4">Aucun projet. Créez votre premier projet !</p>
            </div>
          )}
        </div>

        {showCreate ? (
          <form onSubmit={handleCreate} className="px-6 py-5 border-t border-border">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Nom du projet"
              autoFocus
              className="w-full bg-input border border-border rounded-xl py-3 px-4 text-sm text-foreground outline-none focus:border-primary transition-colors mb-3"
            />
            <div className="flex gap-2 mb-4">
              {colors.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className="w-7 h-7 rounded-full cursor-pointer transition-all duration-150 flex items-center justify-center border-none p-0"
                  style={{ background: c, boxShadow: newColor === c ? `0 0 0 2px var(--background), 0 0 0 4px ${c}` : 'none', transform: newColor === c ? 'scale(1.15)' : 'scale(1)' }}
                >
                  {newColor === c && <Check size={14} className="text-white drop-shadow-sm" />}
                </button>
              ))}
            </div>
            {error && <p className="text-sm text-destructive mb-3">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={loading || !newName.trim()} className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25 border-none rounded-xl py-2.5 text-sm font-semibold cursor-pointer hover:shadow-violet-500/40 hover:brightness-110 disabled:opacity-50 transition-all">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <><Plus size={16} /> Créer</>}
              </button>
              {!forceOpen && (
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2.5 bg-accent text-foreground border-none rounded-xl text-sm cursor-pointer hover:bg-accent/80">
                  Annuler
                </button>
              )}
            </div>
          </form>
        ) : (
          <div className="px-6 py-4 border-t border-border">
            <button
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center justify-center gap-2 bg-transparent border border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary rounded-xl py-3 text-sm cursor-pointer transition-colors"
            >
              <Plus size={16} /> Nouveau projet
            </button>
          </div>
        )}
      </div>
      {menuOpenId && createPortal(
        <div ref={menuRef} className="fixed z-[300] bg-card border border-white/10 rounded-xl shadow-xl shadow-black/30 min-w-[160px] py-1 animate-scale-in" style={{ top: menuPos.top, left: menuPos.left, transform: 'translateX(-100%)' }}>
          <button
            className="flex items-center gap-2.5 w-full px-3.5 py-2 bg-transparent border-none text-sm text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer transition-colors text-left"
            onClick={(e) => startRename(e, projects.find(p => p.id === menuOpenId))}
          >
            <Pencil size={13} /> Renommer
          </button>
          <button
            className="flex items-center gap-2.5 w-full px-3.5 py-2 bg-transparent border-none text-sm text-destructive hover:bg-destructive/10 cursor-pointer transition-colors text-left"
            onClick={(e) => handleDelete(e, menuOpenId)}
          >
            <Trash2 size={13} /> Supprimer
          </button>
        </div>,
        document.body
      )}
    </div>
  )
}
