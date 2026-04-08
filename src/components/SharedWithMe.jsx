import { useState } from 'react'
import { useProject } from '../contexts/ProjectContext'
import { useAuth } from '../contexts/AuthContext'
import { Users, Eye, Edit3, Crown, Clock, FolderOpen, ArrowRight, StickyNote, FileText, Columns3, Send, Trash2, ChevronDown, Loader2, Search, X, Mail, UserPlus, Check, Link2, Copy, Ban, Power, Infinity as InfinityIcon, Pencil, PenTool } from 'lucide-react'
import { cn } from '../lib/utils'

const roleLabels = { owner: 'Propriétaire', editor: 'Éditeur', viewer: 'Lecteur' }
const roleColors = { editor: '#60a5fa', viewer: '#a78bfa' }
const roleIcons = { editor: Edit3, viewer: Eye }
const itemTypeLabels = { note: 'Note', list: 'Liste', kanban: 'Kanban', diagram: 'Schéma' }
const itemTypeIcons = { note: StickyNote, list: FileText, kanban: Columns3, diagram: PenTool }
const itemTypeColors = { note: '#3b82f6', list: '#8b5cf6', kanban: '#f59e0b', diagram: '#14b8a6' }

// Format a timestamp as a relative "expires in" / "expired" string
const formatExpiry = (ts) => {
  if (!ts) return { label: 'Illimité', tone: 'neutral' }
  const diff = ts - Date.now()
  if (diff <= 0) return { label: 'Expiré', tone: 'expired' }
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  if (days >= 1) return { label: `Expire dans ${days}j`, tone: days <= 1 ? 'warn' : 'ok' }
  if (hours >= 1) return { label: `Expire dans ${hours}h`, tone: 'warn' }
  return { label: `Expire dans ${mins}min`, tone: 'warn' }
}

const toDatetimeLocal = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function SharedWithMe({
  onOpenProject, onOpenSharedItem,
  shareLinks = [], notes = [], lists = [], kanbanBoards = [], diagrams = [],
  revokeShareLink, reactivateShareLink, deleteShareLink, updateShareLink,
  showToast,
}) {
  const { user } = useAuth()
  const { projects, setActiveProjectId, sharedItems, sentShares, updateShareRole, unshareItem, fetchSentShares, shareItemWithUser } = useProject()
  const [tab, setTab] = useState('received')
  const [roleLoading, setRoleLoading] = useState(null)
  const [openRoleMenu, setOpenRoleMenu] = useState(null)
  const [searchReceived, setSearchReceived] = useState('')
  const [searchSent, setSearchSent] = useState('')
  const [searchLinks, setSearchLinks] = useState('')
  const [linkFilter, setLinkFilter] = useState('all') // all | active | expired | revoked
  const [editingLink, setEditingLink] = useState(null) // { id, label, expiresAt, mode }
  const [addFormOpen, setAddFormOpen] = useState(null)
  const [addEmail, setAddEmail] = useState('')
  const [addRole, setAddRole] = useState('viewer')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState(null)
  const [addSuccess, setAddSuccess] = useState(null)

  const sharedProjects = projects.filter(p => p.myRole !== 'owner')

  const handleOpenProject = (project) => {
    setActiveProjectId(project.id)
    if (onOpenProject) onOpenProject()
  }

  const handleOpenItem = (item) => {
    if (onOpenSharedItem) onOpenSharedItem(item)
  }

  // Group sent shares by item
  const sentByItem = sentShares.reduce((acc, s) => {
    const key = `${s.item_type}:${s.item_id}`
    if (!acc[key]) acc[key] = { item_type: s.item_type, item_id: s.item_id, item_name: s.item_name, project_name: s.project_name, shares: [] }
    acc[key].shares.push(s)
    return acc
  }, {})
  const sentGroups = Object.values(sentByItem)

  const handleRoleChange = async (shareId, newRole) => {
    setRoleLoading(shareId)
    await updateShareRole(shareId, newRole)
    setOpenRoleMenu(null)
    setRoleLoading(null)
  }

  const handleUnshare = async (shareId) => {
    await unshareItem(shareId)
    fetchSentShares()
  }

  const handleAddPerson = async (itemType, itemId) => {
    if (!addEmail.trim()) return
    setAddLoading(true)
    setAddError(null)
    setAddSuccess(null)
    try {
      await shareItemWithUser(itemType, itemId, addEmail.trim(), addRole)
      await fetchSentShares()
      setAddSuccess('Partage envoyé !')
      setAddEmail('')
      setAddRole('viewer')
      setTimeout(() => { setAddSuccess(null); setAddFormOpen(null) }, 1500)
    } catch (err) {
      setAddError(err.message || 'Erreur lors du partage')
    } finally {
      setAddLoading(false)
    }
  }

  const toggleAddForm = (key) => {
    if (addFormOpen === key) {
      setAddFormOpen(null)
    } else {
      setAddFormOpen(key)
      setAddEmail('')
      setAddRole('viewer')
      setAddError(null)
      setAddSuccess(null)
    }
  }

  // Filter received items
  const q = searchReceived.toLowerCase().trim()
  const filteredProjects = q ? sharedProjects.filter(p => p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)) : sharedProjects
  const filteredItems = q ? sharedItems.filter(i => i.item_name?.toLowerCase().includes(q) || i.project_name?.toLowerCase().includes(q) || i.sharer_name?.toLowerCase().includes(q) || itemTypeLabels[i.item_type]?.toLowerCase().includes(q)) : sharedItems

  // Filter sent shares
  const qs = searchSent.toLowerCase().trim()
  const filteredSentGroups = qs ? sentGroups.filter(g => g.item_name?.toLowerCase().includes(qs) || g.project_name?.toLowerCase().includes(qs) || g.shares.some(s => s.user_name?.toLowerCase().includes(qs) || s.user_email?.toLowerCase().includes(qs))) : sentGroups

  const receivedCount = sharedProjects.length + sharedItems.length
  const sentCount = sentShares.length

  // ======== PUBLIC LINKS ========
  // Resolve linked item from local state for display
  const resolveLinkItem = (link) => {
    if (link.itemType === 'note') {
      const n = notes.find(x => x.id === link.itemId)
      return { name: n?.title || 'Note supprimée', exists: !!n, type: 'note' }
    }
    if (link.itemType === 'list') {
      const l = lists.find(x => x.id === link.itemId)
      return { name: l?.name || 'Liste supprimée', exists: !!l, type: 'list' }
    }
    if (link.itemType === 'kanban') {
      const b = kanbanBoards.find(x => x.id === link.itemId)
      return { name: b?.name || 'Kanban supprimé', exists: !!b, type: 'kanban' }
    }
    if (link.itemType === 'diagram') {
      const d = diagrams.find(x => x.id === link.itemId)
      return { name: d?.name || 'Schéma supprimé', exists: !!d, type: 'diagram' }
    }
    return { name: '—', exists: false, type: link.itemType }
  }

  const linkStatus = (link) => {
    if (!link.isActive) return 'revoked'
    if (link.expiresAt && link.expiresAt <= Date.now()) return 'expired'
    return 'active'
  }

  const enrichedLinks = shareLinks.map(l => ({ ...l, _item: resolveLinkItem(l), _status: linkStatus(l) }))
  const qL = searchLinks.toLowerCase().trim()
  const filteredLinks = enrichedLinks
    .filter(l => linkFilter === 'all' || l._status === linkFilter)
    .filter(l => !qL || l._item.name.toLowerCase().includes(qL) || (l.label || '').toLowerCase().includes(qL))

  // Group filtered links by item (itemType + itemId)
  const groupedLinks = (() => {
    const map = new Map()
    filteredLinks.forEach(l => {
      const key = `${l.itemType}:${l.itemId}`
      if (!map.has(key)) map.set(key, { itemType: l.itemType, itemId: l.itemId, _item: l._item, links: [] })
      map.get(key).links.push(l)
    })
    return [...map.values()]
  })()

  const linksCount = shareLinks.length
  const activeLinksCount = enrichedLinks.filter(l => l._status === 'active').length

  const copyLinkUrl = async (token) => {
    const url = `${window.location.origin}/share/${token}`
    try { await navigator.clipboard.writeText(url); showToast?.('Lien copié', 'success') }
    catch { showToast?.('Copie impossible', 'error') }
  }

  const handleRevokeLink = async (id) => {
    if (!revokeShareLink) return
    await revokeShareLink(id)
    showToast?.('Accès verrouillé', 'success')
  }
  const handleReactivateLink = async (id) => {
    if (!reactivateShareLink) return
    await reactivateShareLink(id)
    showToast?.('Lien réactivé', 'success')
  }
  const handleDeleteLink = async (id) => {
    if (!deleteShareLink) return
    if (!confirm('Supprimer définitivement ce lien ? Cette action est irréversible.')) return
    await deleteShareLink(id)
    showToast?.('Lien supprimé', 'success')
  }
  const openEditLink = (link) => {
    setEditingLink({
      id: link.id,
      label: link.label || '',
      expiresAt: link.expiresAt,
      mode: link.expiresAt ? 'custom' : 'unlimited',
    })
  }
  const saveEditLink = async () => {
    if (!editingLink || !updateShareLink) return
    let expiresAt = null
    if (editingLink.mode === 'custom') {
      expiresAt = editingLink.expiresAt ? new Date(editingLink.expiresAt) : null
    } else if (editingLink.mode === '1d') expiresAt = new Date(Date.now() + 86400000)
    else if (editingLink.mode === '7d') expiresAt = new Date(Date.now() + 7 * 86400000)
    else if (editingLink.mode === '30d') expiresAt = new Date(Date.now() + 30 * 86400000)
    // 'unlimited' keeps expiresAt = null
    await updateShareLink(editingLink.id, { label: editingLink.label, expiresAt })
    setEditingLink(null)
    showToast?.('Lien mis à jour', 'success')
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto page-transition">
      {/* Header */}
      <div className="px-10 pt-14 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/25 text-blue-400 text-xs font-semibold mb-5">
          <Users size={12} /> PARTAGES
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">
          Mes <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">partages</span>
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">Gérez vos éléments partagés</p>
      </div>

      {/* Tabs */}
      <div className="px-10 pb-6">
        <div className="flex gap-1 p-1 bg-muted/40 border border-white/8 rounded-xl w-fit">
          <button
            onClick={() => setTab('received')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border-none cursor-pointer transition-all duration-200",
              tab === 'received'
                ? "bg-card shadow-md shadow-black/10 text-foreground"
                : "bg-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Users size={14} />
            Partagé avec moi
            {receivedCount > 0 && (
              <span className={cn("px-2 py-0.5 rounded-full text-[0.6rem] font-bold", tab === 'received' ? "bg-primary/15 text-primary" : "bg-white/8 text-muted-foreground")}>{receivedCount}</span>
            )}
          </button>
          <button
            onClick={() => setTab('sent')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border-none cursor-pointer transition-all duration-200",
              tab === 'sent'
                ? "bg-card shadow-md shadow-black/10 text-foreground"
                : "bg-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Send size={14} />
            Partages envoyés
            {sentCount > 0 && (
              <span className={cn("px-2 py-0.5 rounded-full text-[0.6rem] font-bold", tab === 'sent' ? "bg-emerald-500/15 text-emerald-400" : "bg-white/8 text-muted-foreground")}>{sentCount}</span>
            )}
          </button>
          <button
            onClick={() => setTab('links')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border-none cursor-pointer transition-all duration-200",
              tab === 'links'
                ? "bg-card shadow-md shadow-black/10 text-foreground"
                : "bg-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Link2 size={14} />
            Liens publics
            {linksCount > 0 && (
              <span className={cn("px-2 py-0.5 rounded-full text-[0.6rem] font-bold", tab === 'links' ? "bg-violet-500/15 text-violet-400" : "bg-white/8 text-muted-foreground")}>{linksCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-10 pb-10 flex-1">
        {/* ════════ TAB: Partagé avec moi ════════ */}
        {tab === 'received' && (
          <>
            {/* Search bar */}
            {receivedCount > 0 && (
              <div className="relative mb-5">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                <input
                  type="text"
                  value={searchReceived}
                  onChange={e => setSearchReceived(e.target.value)}
                  placeholder="Rechercher un projet ou élément..."
                  className="w-full bg-muted/30 border border-white/8 rounded-xl py-2.5 pl-10 pr-9 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/40 focus:bg-muted/50 transition-all"
                />
                {searchReceived && (
                  <button onClick={() => setSearchReceived('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 bg-transparent border-none cursor-pointer transition-colors">
                    <X size={12} />
                  </button>
                )}
              </div>
            )}

            {receivedCount === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-24">
                <div className="w-20 h-20 rounded-2xl bg-blue-500/5 flex items-center justify-center empty-icon">
                  <Users size={40} className="text-blue-400/40" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium text-muted-foreground mb-1">Rien de partagé</p>
                  <p className="text-sm text-muted-foreground/60">Quand quelqu'un partagera un projet ou un élément avec vous, il apparaîtra ici</p>
                </div>
              </div>
            ) : (
              <>
                {filteredProjects.length === 0 && filteredItems.length === 0 && searchReceived ? (
                  <div className="text-center py-12">
                    <Search size={24} className="text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground/60">Aucun résultat pour "{searchReceived}"</p>
                  </div>
                ) : (
                  <>
                {/* Shared Projects */}
                {filteredProjects.length > 0 && (
                  <div className="mb-10">
                    <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                      <FolderOpen size={14} /> Projets
                      <span className="ml-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[0.65rem] font-bold normal-case tracking-normal">{filteredProjects.length}</span>
                    </h3>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
                      {filteredProjects.map(project => {
                        const RoleIcon = roleIcons[project.myRole] || Eye
                        const roleColor = roleColors[project.myRole] || '#a78bfa'
                        return (
                          <div
                            key={project.id}
                            className="relative flex flex-col gap-4 p-6 bg-card/80 backdrop-blur-sm border border-white/10 rounded-2xl cursor-pointer card-hover card-gradient-hover group transition-all duration-200 overflow-hidden"
                            onClick={() => handleOpenProject(project)}
                          >
                            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${project.color || '#8b5cf6'}80, ${project.color || '#8b5cf6'}20)` }} />
                            <div className="flex items-start gap-3">
                              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-lg" style={{ background: (project.color || '#8b5cf6') + '20', color: project.color || '#8b5cf6' }}>
                                <FolderOpen size={22} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-bold truncate">{project.name}</h3>
                                {project.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{project.description}</p>}
                              </div>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                <ArrowRight size={16} className="text-muted-foreground" />
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[0.7rem] font-semibold" style={{ background: roleColor + '15', color: roleColor }}>
                                <RoleIcon size={11} />
                                {roleLabels[project.myRole]}
                              </div>
                              {project.inviter && (
                                <span className="text-[0.68rem] text-muted-foreground">
                                  par <span className="font-medium text-foreground/70">{project.inviter.display_name || project.inviter.email}</span>
                                </span>
                              )}
                            </div>
                            {project.joinedAt && (
                              <div className="flex items-center gap-1.5 text-[0.65rem] text-muted-foreground/60">
                                <Clock size={10} />
                                Rejoint le {new Date(project.joinedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Shared Items */}
                {filteredItems.length > 0 && (
                  <div>
                    <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                      <FileText size={14} /> Éléments
                      <span className="ml-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[0.65rem] font-bold normal-case tracking-normal">{filteredItems.length}</span>
                    </h3>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
                      {filteredItems.map(item => {
                        const TypeIcon = itemTypeIcons[item.item_type] || FileText
                        const typeColor = itemTypeColors[item.item_type] || '#8b5cf6'
                        const RoleIcon = roleIcons[item.role] || Eye
                        const roleColor = roleColors[item.role] || '#a78bfa'
                        return (
                          <div
                            key={item.share_id}
                            className="relative flex flex-col gap-3 p-5 bg-card/80 backdrop-blur-sm border border-white/10 rounded-2xl cursor-pointer card-hover card-gradient-hover group transition-all duration-200 overflow-hidden"
                            onClick={() => handleOpenItem(item)}
                          >
                            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${item.project_color || typeColor}80, ${item.project_color || typeColor}20)` }} />
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: typeColor + '15', color: typeColor }}>
                                <TypeIcon size={18} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-bold truncate">{item.item_name}</h3>
                                <p className="text-[0.68rem] text-muted-foreground truncate mt-0.5">
                                  {itemTypeLabels[item.item_type]} · {item.project_name}
                                </p>
                              </div>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                <ArrowRight size={16} className="text-muted-foreground" />
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[0.7rem] font-semibold" style={{ background: roleColor + '15', color: roleColor }}>
                                <RoleIcon size={11} />
                                {roleLabels[item.role]}
                              </div>
                              <span className="text-[0.68rem] text-muted-foreground">
                                par <span className="font-medium text-foreground/70">{item.sharer_name}</span>
                              </span>
                            </div>
                            {item.shared_at && (
                              <div className="flex items-center gap-1.5 text-[0.65rem] text-muted-foreground/60">
                                <Clock size={10} />
                                {new Date(item.shared_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
                )}
              </>
            )}
          </>
        )}

        {/* ════════ TAB: Partages envoyés ════════ */}
        {tab === 'sent' && (
          <>
            {/* Search bar */}
            {sentCount > 0 && (
              <div className="relative mb-5">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                <input
                  type="text"
                  value={searchSent}
                  onChange={e => setSearchSent(e.target.value)}
                  placeholder="Rechercher un élément ou destinataire..."
                  className="w-full bg-muted/30 border border-white/8 rounded-xl py-2.5 pl-10 pr-9 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/40 focus:bg-muted/50 transition-all"
                />
                {searchSent && (
                  <button onClick={() => setSearchSent('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 bg-transparent border-none cursor-pointer transition-colors">
                    <X size={12} />
                  </button>
                )}
              </div>
            )}

            {sentGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-24">
                <div className="w-20 h-20 rounded-2xl bg-emerald-500/5 flex items-center justify-center empty-icon">
                  <Send size={40} className="text-emerald-400/40" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium text-muted-foreground mb-1">Aucun partage envoyé</p>
                  <p className="text-sm text-muted-foreground/60">Partagez un élément via le bouton de partage pour le voir ici</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {filteredSentGroups.length === 0 && searchSent ? (
                  <div className="text-center py-12">
                    <Search size={24} className="text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground/60">Aucun résultat pour "{searchSent}"</p>
                  </div>
                ) : filteredSentGroups.map(group => {
                  const TypeIcon = itemTypeIcons[group.item_type] || FileText
                  const typeColor = itemTypeColors[group.item_type] || '#8b5cf6'
                  return (
                    <div key={`${group.item_type}:${group.item_id}`} className="bg-card/60 backdrop-blur-sm border border-white/8 rounded-2xl">
                      {/* Item header */}
                      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/5">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: typeColor + '15', color: typeColor }}>
                          <TypeIcon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate">{group.item_name}</div>
                          <div className="text-[0.65rem] text-muted-foreground">{itemTypeLabels[group.item_type]}{group.project_name ? ` · ${group.project_name}` : ''}</div>
                        </div>
                        <span className="text-[0.65rem] text-muted-foreground/60 bg-muted/60 px-2 py-0.5 rounded-lg">{group.shares.length} {group.shares.length > 1 ? 'personnes' : 'personne'}</span>
                        <button
                          onClick={() => toggleAddForm(`${group.item_type}:${group.item_id}`)}
                          className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center border-none cursor-pointer transition-all shrink-0",
                            addFormOpen === `${group.item_type}:${group.item_id}`
                              ? "bg-primary/20 text-primary"
                              : "bg-muted/40 text-muted-foreground hover:bg-primary/15 hover:text-primary"
                          )}
                          title="Ajouter une personne"
                        >
                          <UserPlus size={13} />
                        </button>
                      </div>
                      {/* Recipients list */}
                      <div className="divide-y divide-white/5">
                        {group.shares.map(share => {
                          const RoleIcon = roleIcons[share.role] || Eye
                          const rColor = roleColors[share.role] || '#a78bfa'
                          return (
                            <div key={share.id} className="flex items-center gap-3 px-5 py-3 hover:bg-accent/30 transition-colors group/row">
                              <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-primary text-[0.65rem] font-bold shrink-0">
                                {(share.user_name || share.user_email || '?')[0].toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[0.78rem] font-medium truncate">{share.user_name || share.user_email}</div>
                                {share.user_name && share.user_name !== share.user_email && (
                                  <div className="text-[0.6rem] text-muted-foreground/60 truncate">{share.user_email}</div>
                                )}
                              </div>
                              {/* Role selector */}
                              <div className="relative z-10">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setOpenRoleMenu(openRoleMenu === share.id ? null : share.id) }}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[0.68rem] font-semibold border-none cursor-pointer transition-all hover:brightness-125"
                                  style={{ background: rColor + '15', color: rColor }}
                                  disabled={roleLoading === share.id}
                                >
                                  {roleLoading === share.id ? <Loader2 size={10} className="animate-spin" /> : <RoleIcon size={10} />}
                                  {roleLabels[share.role]}
                                  <ChevronDown size={10} className={cn("transition-transform", openRoleMenu === share.id && "rotate-180")} />
                                </button>
                                {openRoleMenu === share.id && (
                                  <>
                                    <div className="fixed inset-0 z-40" onClick={() => setOpenRoleMenu(null)} />
                                    <div className="absolute right-0 bottom-full mb-1 z-50 bg-card border border-white/10 rounded-xl shadow-xl shadow-black/30 min-w-[140px] animate-scale-in">
                                      {[{ value: 'viewer', label: 'Lecteur', icon: Eye, color: '#a78bfa' }, { value: 'editor', label: 'Éditeur', icon: Edit3, color: '#60a5fa' }].map(opt => (
                                        <button
                                          key={opt.value}
                                          onClick={(e) => { e.stopPropagation(); handleRoleChange(share.id, opt.value) }}
                                          className={cn(
                                            "w-full flex items-center gap-2 px-3 py-2 text-[0.72rem] font-medium border-none cursor-pointer transition-colors",
                                            share.role === opt.value ? "bg-accent/60 text-foreground" : "bg-transparent text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                                          )}
                                        >
                                          <opt.icon size={11} style={{ color: opt.color }} />
                                          {opt.label}
                                          {share.role === opt.value && <span className="ml-auto text-primary">✓</span>}
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                              {share.created_at && (
                                <div className="text-[0.6rem] text-muted-foreground/50 flex items-center gap-1 shrink-0 max-sm:hidden">
                                  <Clock size={9} />
                                  {new Date(share.created_at).toLocaleDateString('fr-FR')}
                                </div>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); handleUnshare(share.id) }}
                                className="w-6 h-6 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 bg-transparent border-none cursor-pointer opacity-0 group-hover/row:opacity-100 transition-all shrink-0"
                                title="Retirer l'accès"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                      {/* Inline add person form */}
                      {addFormOpen === `${group.item_type}:${group.item_id}` && (
                        <div className="px-5 py-3 border-t border-white/5 bg-muted/20">
                          {addSuccess ? (
                            <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium py-1">
                              <Check size={14} />
                              {addSuccess}
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                  <Mail size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                                  <input
                                    type="email"
                                    value={addEmail}
                                    onChange={e => setAddEmail(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddPerson(group.item_type, group.item_id)}
                                    placeholder="Email du destinataire..."
                                    className="w-full bg-muted/40 border border-white/8 rounded-lg py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/40 transition-all"
                                    autoFocus
                                  />
                                </div>
                                <select
                                  value={addRole}
                                  onChange={e => setAddRole(e.target.value)}
                                  className="bg-muted/40 border border-white/8 rounded-lg py-1.5 px-2 text-xs text-foreground outline-none focus:border-primary/40 cursor-pointer transition-all"
                                >
                                  <option value="viewer">Lecteur</option>
                                  <option value="editor">Éditeur</option>
                                </select>
                                <button
                                  onClick={() => handleAddPerson(group.item_type, group.item_id)}
                                  disabled={addLoading || !addEmail.trim()}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border-none cursor-pointer transition-all bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  {addLoading ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
                                  Ajouter
                                </button>
                              </div>
                              {addError && <p className="text-destructive text-[0.65rem] mt-1.5">{addError}</p>}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ════════ TAB: Liens publics ════════ */}
        {tab === 'links' && (
          <>
            {/* Search + filters */}
            {linksCount > 0 && (
              <div className="flex flex-col sm:flex-row gap-2 mb-5">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                  <input
                    type="text"
                    value={searchLinks}
                    onChange={e => setSearchLinks(e.target.value)}
                    placeholder="Rechercher un lien (nom, label)..."
                    className="w-full bg-muted/30 border border-white/8 rounded-xl py-2.5 pl-10 pr-9 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/40 focus:bg-muted/50 transition-all"
                  />
                  {searchLinks && (
                    <button onClick={() => setSearchLinks('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 bg-transparent border-none cursor-pointer transition-colors">
                      <X size={12} />
                    </button>
                  )}
                </div>
                <div className="flex gap-1 p-1 bg-muted/40 border border-white/8 rounded-xl">
                  {[
                    { k: 'all', label: 'Tous' },
                    { k: 'active', label: 'Actifs' },
                    { k: 'expired', label: 'Expirés' },
                    { k: 'revoked', label: 'Verrouillés' },
                  ].map(f => (
                    <button
                      key={f.k}
                      onClick={() => setLinkFilter(f.k)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[0.7rem] font-semibold border-none cursor-pointer transition-all",
                        linkFilter === f.k ? "bg-card shadow-sm text-foreground" : "bg-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >{f.label}</button>
                  ))}
                </div>
              </div>
            )}

            {linksCount === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-24">
                <div className="w-20 h-20 rounded-2xl bg-violet-500/5 flex items-center justify-center empty-icon">
                  <Link2 size={40} className="text-violet-400/40" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium text-muted-foreground mb-1">Aucun lien public</p>
                  <p className="text-sm text-muted-foreground/60">Utilisez le bouton de partage sur une note, liste ou kanban pour générer un lien.</p>
                </div>
              </div>
            ) : filteredLinks.length === 0 ? (
              <div className="text-center py-12">
                <Search size={24} className="text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground/60">Aucun lien ne correspond à ce filtre</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {/* Summary strip */}
                <div className="flex items-center gap-3 text-[0.7rem] text-muted-foreground mb-1">
                  <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {activeLinksCount} actif{activeLinksCount > 1 ? 's' : ''}</span>
                  <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-white/20" /> {linksCount - activeLinksCount} inactif{linksCount - activeLinksCount > 1 ? 's' : ''}</span>
                  <span className="text-muted-foreground/50">· portée : projet actif uniquement</span>
                </div>
                {groupedLinks.map(group => {
                  const TypeIcon = itemTypeIcons[group.itemType] || FileText
                  const typeColor = itemTypeColors[group.itemType] || '#8b5cf6'
                  const activeCount = group.links.filter(l => l._status === 'active').length
                  return (
                    <div key={`${group.itemType}:${group.itemId}`} className="bg-card/60 backdrop-blur-sm border border-white/8 rounded-2xl p-4 sm:p-5">
                      {/* Item header */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: typeColor + '15', color: typeColor }}>
                          <TypeIcon size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold truncate">{group._item.name}</span>
                            {!group._item.exists && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[0.6rem] font-bold bg-destructive/15 text-destructive">Item supprimé</span>
                            )}
                          </div>
                          <div className="text-[0.68rem] text-muted-foreground mt-0.5">
                            {itemTypeLabels[group.itemType]} · {group.links.length} lien{group.links.length > 1 ? 's' : ''}{activeCount > 0 && <> · <span className="text-emerald-400">{activeCount} actif{activeCount > 1 ? 's' : ''}</span></>}
                          </div>
                        </div>
                      </div>

                      {/* Links list */}
                      <div className="flex flex-col gap-2">
                        {group.links.map(link => {
                          const expiry = formatExpiry(link.expiresAt)
                          const status = link._status
                          const statusMeta = status === 'active'
                            ? { label: 'Actif', color: '#34d399', bg: '#34d39915' }
                            : status === 'expired'
                              ? { label: 'Expiré', color: '#f87171', bg: '#f8717115' }
                              : { label: 'Verrouillé', color: '#9ca3af', bg: '#9ca3af15' }
                          const url = `${window.location.origin}/share/${link.token}`
                          return (
                            <div key={link.id} className="bg-muted/30 border border-white/5 rounded-xl p-3">
                              {/* Label + status */}
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[0.6rem] font-bold" style={{ background: statusMeta.bg, color: statusMeta.color }}>
                                  {statusMeta.label}
                                </span>
                                {link.label && <span className="text-[0.7rem] font-medium text-foreground/80 truncate">{link.label}</span>}
                                <span className="inline-flex items-center gap-1 text-[0.62rem] text-muted-foreground ml-auto">
                                  {link.expiresAt ? <Clock size={9} /> : <InfinityIcon size={9} />}
                                  <span className={cn(
                                    expiry.tone === 'expired' && 'text-destructive',
                                    expiry.tone === 'warn' && 'text-amber-400',
                                  )}>{expiry.label}</span>
                                </span>
                              </div>
                              {/* URL */}
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  readOnly
                                  value={url}
                                  onClick={e => e.target.select()}
                                  className="flex-1 min-w-0 px-2.5 py-1.5 bg-input border border-white/8 rounded-lg text-[0.65rem] font-mono text-muted-foreground outline-none focus:border-primary/40"
                                />
                                <button
                                  onClick={() => copyLinkUrl(link.token)}
                                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[0.65rem] font-semibold border-none cursor-pointer bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
                                ><Copy size={10} />Copier</button>
                              </div>
                              {/* Actions */}
                              <div className="flex items-center justify-between gap-2 flex-wrap mt-2 pt-2 border-t border-white/5">
                                <span className="text-[0.6rem] text-muted-foreground/60">
                                  {link.createdAt && <>Créé le {new Date(link.createdAt).toLocaleDateString('fr-FR')}</>}
                                </span>
                                <div className="flex items-center gap-1">
                                  <button onClick={() => openEditLink(link)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[0.62rem] font-semibold border-none cursor-pointer bg-transparent text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"><Pencil size={9} />Modifier</button>
                                  {status === 'active' ? (
                                    <button onClick={() => handleRevokeLink(link.id)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[0.62rem] font-semibold border-none cursor-pointer bg-transparent text-amber-400 hover:bg-amber-500/10 transition-colors"><Ban size={9} />Verrouiller</button>
                                  ) : status === 'revoked' ? (
                                    <button onClick={() => handleReactivateLink(link.id)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[0.62rem] font-semibold border-none cursor-pointer bg-transparent text-emerald-400 hover:bg-emerald-500/10 transition-colors"><Power size={9} />Réactiver</button>
                                  ) : null}
                                  <button onClick={() => handleDeleteLink(link.id)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[0.62rem] font-semibold border-none cursor-pointer bg-transparent text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 size={9} />Supprimer</button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* Edit link dialog */}
        {editingLink && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setEditingLink(null)}>
            <div className="bg-card border border-white/10 rounded-2xl shadow-2xl p-5 w-[min(92vw,420px)]" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-2 mb-4">
                <Link2 size={14} className="text-primary" />
                <span className="text-sm font-semibold">Modifier le lien</span>
              </div>

              <label className="block text-[0.7rem] text-muted-foreground mb-1">Nom (optionnel)</label>
              <input
                type="text"
                value={editingLink.label}
                onChange={e => setEditingLink({ ...editingLink, label: e.target.value })}
                placeholder="Ex : Présentation client"
                className="w-full px-3 py-2 mb-4 bg-input border border-white/10 rounded-lg text-[0.8rem] text-foreground outline-none focus:border-primary/50"
              />

              <label className="block text-[0.7rem] text-muted-foreground mb-1.5">Durée de vie</label>
              <div className="grid grid-cols-2 gap-1.5 mb-3">
                {[
                  { k: '1d', label: '24 heures' },
                  { k: '7d', label: '7 jours' },
                  { k: '30d', label: '30 jours' },
                  { k: 'unlimited', label: 'Illimité' },
                ].map(opt => (
                  <button
                    key={opt.k}
                    onClick={() => setEditingLink({ ...editingLink, mode: opt.k })}
                    className={cn(
                      "px-3 py-2 rounded-lg text-[0.72rem] font-semibold border cursor-pointer transition-all",
                      editingLink.mode === opt.k
                        ? "bg-primary/15 text-primary border-primary/40"
                        : "bg-transparent text-muted-foreground border-white/10 hover:text-foreground hover:border-white/20"
                    )}
                  >{opt.label}</button>
                ))}
                <button
                  onClick={() => setEditingLink({ ...editingLink, mode: 'custom' })}
                  className={cn(
                    "col-span-2 px-3 py-2 rounded-lg text-[0.72rem] font-semibold border cursor-pointer transition-all",
                    editingLink.mode === 'custom'
                      ? "bg-primary/15 text-primary border-primary/40"
                      : "bg-transparent text-muted-foreground border-white/10 hover:text-foreground hover:border-white/20"
                  )}
                >Personnalisé</button>
              </div>
              {editingLink.mode === 'custom' && (
                <input
                  type="datetime-local"
                  value={toDatetimeLocal(editingLink.expiresAt)}
                  onChange={e => setEditingLink({ ...editingLink, expiresAt: e.target.value ? new Date(e.target.value).getTime() : null })}
                  className="w-full px-3 py-2 mb-2 bg-input border border-white/10 rounded-lg text-[0.8rem] text-foreground outline-none focus:border-primary/50"
                />
              )}

              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setEditingLink(null)}
                  className="px-3 py-1.5 bg-transparent border border-white/10 rounded-lg text-[0.75rem] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >Annuler</button>
                <button
                  onClick={saveEditLink}
                  className="px-3 py-1.5 bg-primary/15 text-primary border border-primary/30 rounded-lg text-[0.75rem] font-medium hover:bg-primary/25 transition-colors"
                >Enregistrer</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
