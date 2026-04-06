import { useState, useEffect } from 'react'
import { useProject } from '../contexts/ProjectContext'
import { useAuth } from '../contexts/AuthContext'
import { useSupabaseData } from '../hooks/useSupabaseData'
import {
  Mail, Users, Check, X, Loader2, UserPlus, Shield, Eye, Edit3, Crown,
  Trash2, StickyNote, FileText, Columns3, FolderOpen, Send, Clock
} from 'lucide-react'
import { cn } from '../lib/utils'

const roleLabels = { owner: 'Propriétaire', editor: 'Éditeur', viewer: 'Lecteur' }
const roleIcons = { owner: Crown, editor: Edit3, viewer: Eye }
const itemTypeLabels = { note: 'Note', list: 'Liste', kanban: 'Kanban' }
const itemTypeIcons = { note: StickyNote, list: FileText, kanban: Columns3 }
const itemTypeColors = { note: '#3b82f6', list: '#8b5cf6', kanban: '#f59e0b' }

export default function InvitationsPage({ showUpgradeModal }) {
  const { user } = useAuth()
  const {
    activeProject, members, myRole, pendingInvitations,
    inviteMember, updateMemberRole, removeMember,
    acceptInvitation, declineInvitation,
    shareItemWithUser, unshareItem, getItemShares
  } = useProject()
  const { notes, lists, kanbanBoards } = useSupabaseData()

  // Invite member state
  const [invEmail, setInvEmail] = useState('')
  const [invRole, setInvRole] = useState('viewer')
  const [invLoading, setInvLoading] = useState(false)
  const [invError, setInvError] = useState('')
  const [invSuccess, setInvSuccess] = useState('')

  // Share item state
  const [shareEmail, setShareEmail] = useState('')
  const [shareRole, setShareRole] = useState('viewer')
  const [shareItemType, setShareItemType] = useState('note')
  const [shareItemId, setShareItemId] = useState('')
  const [shareLoading, setShareLoading] = useState(false)
  const [shareError, setShareError] = useState('')
  const [shareSuccess, setShareSuccess] = useState('')

  // Sent shares state
  const [sentShares, setSentShares] = useState([])
  const [sentLoading, setSentLoading] = useState(false)

  // Pending invitation processing state
  const [processing, setProcessing] = useState({})
  const [invitationError, setInvitationError] = useState(null)

  const canManage = myRole === 'owner' || myRole === 'editor'

  // Build shareable items list
  const shareableItems = (() => {
    const items = []
    if (shareItemType === 'note') {
      notes.forEach(n => items.push({ id: n.id, name: n.title || 'Note sans titre' }))
    } else if (shareItemType === 'list') {
      lists.forEach(l => items.push({ id: l.id, name: l.name || 'Liste sans titre' }))
    } else if (shareItemType === 'kanban') {
      kanbanBoards.forEach(b => items.push({ id: b.id, name: b.name || 'Tableau sans titre' }))
    }
    return items
  })()

  // Reset item selection when type changes
  useEffect(() => {
    setShareItemId('')
  }, [shareItemType])

  // Fetch sent shares for current project items
  useEffect(() => {
    const loadSentShares = async () => {
      if (!activeProject) return
      setSentLoading(true)
      const allShares = []
      for (const note of notes) {
        const shares = await getItemShares('note', note.id)
        shares.forEach(s => allShares.push({ ...s, itemName: note.title || 'Note sans titre', itemType: 'note' }))
      }
      for (const list of lists) {
        const shares = await getItemShares('list', list.id)
        shares.forEach(s => allShares.push({ ...s, itemName: list.name || 'Liste sans titre', itemType: 'list' }))
      }
      for (const board of kanbanBoards) {
        const shares = await getItemShares('kanban', board.id)
        shares.forEach(s => allShares.push({ ...s, itemName: board.name || 'Tableau sans titre', itemType: 'kanban' }))
      }
      setSentShares(allShares)
      setSentLoading(false)
    }
    loadSentShares()
  }, [activeProject, notes, lists, kanbanBoards, getItemShares])

  const handleInviteMember = async (e) => {
    e.preventDefault()
    if (!invEmail.trim()) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invEmail.trim())) {
      setInvError('Adresse email invalide.')
      return
    }
    setInvLoading(true)
    setInvError('')
    setInvSuccess('')
    const { error: err } = await inviteMember(invEmail.trim(), invRole)
    if (err) {
      if (err.message?.includes('Limite') && showUpgradeModal) {
        showUpgradeModal('Limite de membres atteinte sur votre plan actuel.')
      } else {
        setInvError(err.message)
      }
    } else {
      setInvSuccess(`${invEmail} a été invité !`)
      setInvEmail('')
    }
    setInvLoading(false)
  }

  const handleShareItem = async (e) => {
    e.preventDefault()
    if (!shareEmail.trim() || !shareItemId) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shareEmail.trim())) {
      setShareError('Adresse email invalide.')
      return
    }
    setShareLoading(true)
    setShareError('')
    setShareSuccess('')
    const { error: err } = await shareItemWithUser(shareItemType, shareItemId, shareEmail.trim(), shareRole)
    if (err) {
      setShareError(err.message)
    } else {
      const itemName = shareableItems.find(i => i.id === shareItemId)?.name || 'Élément'
      setShareSuccess(`${itemName} partagé avec ${shareEmail} !`)
      setShareEmail('')
      setShareItemId('')
      // Refresh sent shares
      const shares = await getItemShares(shareItemType, shareItemId)
      setSentShares(prev => {
        const filtered = prev.filter(s => !(s.itemType === shareItemType && s.item_id === shareItemId))
        return [...filtered, ...shares.map(s => ({ ...s, itemName: itemName, itemType: shareItemType }))]
      })
    }
    setShareLoading(false)
  }

  const handleUnshare = async (shareId, itemType, itemId) => {
    if (!confirm('Retirer cet accès ?')) return
    await unshareItem(shareId)
    setSentShares(prev => prev.filter(s => s.id !== shareId))
  }

  const handleAccept = async (inv) => {
    setProcessing(p => ({ ...p, [inv.id]: 'accepting' }))
    setInvitationError(null)
    try {
      const result = await acceptInvitation(inv.id)
      if (result?.error) setInvitationError(result.error.message || "Erreur lors de l'acceptation")
    } catch (e) { setInvitationError(e.message || 'Erreur inattendue') }
    setProcessing(p => ({ ...p, [inv.id]: null }))
  }

  const handleDecline = async (inv) => {
    setProcessing(p => ({ ...p, [inv.id]: 'declining' }))
    setInvitationError(null)
    try {
      const result = await declineInvitation(inv.id)
      if (result?.error) setInvitationError(result.error.message || 'Erreur lors du refus')
    } catch (e) { setInvitationError(e.message || 'Erreur inattendue') }
    setProcessing(p => ({ ...p, [inv.id]: null }))
  }

  const handleRoleChange = async (memberId, newRole) => {
    if (!['viewer', 'editor'].includes(newRole)) return
    await updateMemberRole(memberId, newRole)
  }

  const handleRemoveMember = async (memberId, name) => {
    if (!confirm(`Retirer ${name} du projet ?`)) return
    await removeMember(memberId)
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto page-transition">
      {/* Header */}
      <div className="px-10 pt-14 pb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400 text-xs font-semibold mb-5">
          <Mail size={12} /> INVITATIONS & PARTAGE
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">
          Invitations & <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">Partage</span>
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Gérez vos invitations reçues, les membres de votre projet et le partage d'éléments
        </p>
      </div>

      <div className="px-10 pb-10 flex-1 flex flex-col gap-10">

        {/* ─── Section 1: Invitations reçues ─── */}
        {pendingInvitations && pendingInvitations.length > 0 && (
          <section>
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              <Mail size={14} className="text-amber-400" /> Invitations reçues
              <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[0.65rem] font-bold normal-case tracking-normal">
                {pendingInvitations.length}
              </span>
            </h3>
            {invitationError && (
              <div className="px-4 py-2 mb-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive">
                {invitationError}
              </div>
            )}
            <div className="flex flex-col gap-3">
              {pendingInvitations.map(inv => (
                <div key={inv.id} className="flex items-center gap-3 px-5 py-4 bg-card/80 backdrop-blur-sm border border-amber-500/20 rounded-2xl animate-in">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: (inv.project?.color || '#8b5cf6') + '20', color: inv.project?.color || '#8b5cf6' }}>
                    <FolderOpen size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">{inv.project?.name || 'Projet'}</div>
                    <div className="text-[0.7rem] text-muted-foreground">
                      Rôle : <span className="font-medium capitalize">{inv.role === 'viewer' ? 'Lecteur' : inv.role === 'editor' ? 'Éditeur' : inv.role}</span>
                      {inv.inviter && <span> · par {inv.inviter.display_name || inv.inviter.email}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border-none cursor-pointer transition-all bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:brightness-110 disabled:opacity-50"
                      onClick={() => handleAccept(inv)}
                      disabled={!!processing[inv.id]}
                    >
                      {processing[inv.id] === 'accepting' ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      Accepter
                    </button>
                    <button
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border-none cursor-pointer transition-all bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:opacity-50"
                      onClick={() => handleDecline(inv)}
                      disabled={!!processing[inv.id]}
                    >
                      {processing[inv.id] === 'declining' ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                      Refuser
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── Section 2: Membres du projet ─── */}
        {activeProject && (
          <section>
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              <Users size={14} className="text-orange-400" /> Membres du projet
              <span className="ml-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[0.65rem] font-bold normal-case tracking-normal">
                {members.length}
              </span>
            </h3>
            <div className="bg-card/60 backdrop-blur-sm border border-white/8 rounded-2xl overflow-hidden">
              {/* Member list */}
              <div className="divide-y divide-white/5">
                {members.map(m => {
                  const RoleIcon = roleIcons[m.role] || Eye
                  const isMe = m.user_id === user?.id
                  return (
                    <div key={m.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-accent/30 transition-colors group">
                      <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                        {(m.display_name || m.email || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {m.display_name || 'Utilisateur'} {isMe && <span className="text-xs text-muted-foreground">(vous)</span>}
                        </div>
                        <div className="text-[0.65rem] text-muted-foreground truncate">{m.email}</div>
                      </div>
                      {canManage && !isMe && m.role !== 'owner' ? (
                        <div className="flex items-center gap-1">
                          <select
                            value={m.role}
                            onChange={e => handleRoleChange(m.id, e.target.value)}
                            className="bg-input border border-border rounded-lg px-2 py-1.5 text-xs text-foreground outline-none cursor-pointer"
                          >
                            <option value="viewer">Lecteur</option>
                            <option value="editor">Éditeur</option>
                          </select>
                          <button
                            onClick={() => handleRemoveMember(m.id, m.display_name || m.email)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 bg-transparent border-none cursor-pointer opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ) : (
                        <span className={cn(
                          "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg",
                          m.role === 'owner' && "bg-warning/10 text-warning",
                          m.role === 'editor' && "bg-primary/10 text-primary",
                          m.role === 'viewer' && "bg-muted-foreground/10 text-muted-foreground"
                        )}>
                          <RoleIcon size={12} /> {roleLabels[m.role]}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Invite form */}
              {canManage && (
                <form onSubmit={handleInviteMember} className="px-5 py-4 border-t border-white/8 bg-white/[0.02]">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <UserPlus size={12} /> Inviter un membre
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="email"
                        value={invEmail}
                        onChange={e => setInvEmail(e.target.value)}
                        placeholder="email@exemple.com"
                        required
                        className="w-full bg-input border border-border rounded-xl py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary transition-colors"
                      />
                    </div>
                    <select
                      value={invRole}
                      onChange={e => setInvRole(e.target.value)}
                      className="bg-input border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none cursor-pointer"
                    >
                      <option value="viewer">Lecteur</option>
                      <option value="editor">Éditeur</option>
                    </select>
                    <button
                      type="submit"
                      disabled={invLoading || !invEmail.trim()}
                      className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25 border-none rounded-xl px-4 py-2.5 text-sm font-semibold cursor-pointer hover:shadow-violet-500/40 hover:brightness-110 disabled:opacity-50 transition-all"
                    >
                      {invLoading ? <Loader2 size={14} className="animate-spin" /> : <><UserPlus size={14} /> Inviter</>}
                    </button>
                  </div>
                  {invError && <p className="text-sm text-destructive mt-2">{invError}</p>}
                  {invSuccess && <p className="text-sm text-emerald-400 mt-2">{invSuccess}</p>}
                </form>
              )}
            </div>
          </section>
        )}

        {/* ─── Section 3: Partager un élément ─── */}
        {activeProject && canManage && (
          <section>
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              <Send size={14} className="text-blue-400" /> Partager un élément
            </h3>
            <div className="bg-card/60 backdrop-blur-sm border border-white/8 rounded-2xl p-5">
              <form onSubmit={handleShareItem} className="flex flex-col gap-4">
                <div className="grid grid-cols-[1fr_2fr] gap-3">
                  {/* Type selector */}
                  <div>
                    <label className="text-[0.65rem] text-muted-foreground uppercase tracking-wider block mb-1.5">Type</label>
                    <select
                      value={shareItemType}
                      onChange={e => setShareItemType(e.target.value)}
                      className="w-full bg-input border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none cursor-pointer"
                    >
                      <option value="note">Note</option>
                      <option value="list">Liste</option>
                      <option value="kanban">Kanban</option>
                    </select>
                  </div>
                  {/* Item selector */}
                  <div>
                    <label className="text-[0.65rem] text-muted-foreground uppercase tracking-wider block mb-1.5">Élément</label>
                    <select
                      value={shareItemId}
                      onChange={e => setShareItemId(e.target.value)}
                      className="w-full bg-input border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none cursor-pointer"
                    >
                      <option value="">— Sélectionner —</option>
                      {shareableItems.map(item => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="email"
                      value={shareEmail}
                      onChange={e => setShareEmail(e.target.value)}
                      placeholder="email du destinataire"
                      required
                      className="w-full bg-input border border-border rounded-xl py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <select
                    value={shareRole}
                    onChange={e => setShareRole(e.target.value)}
                    className="bg-input border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none cursor-pointer"
                  >
                    <option value="viewer">Lecteur</option>
                    <option value="editor">Éditeur</option>
                  </select>
                  <button
                    type="submit"
                    disabled={shareLoading || !shareEmail.trim() || !shareItemId}
                    className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25 border-none rounded-xl px-4 py-2.5 text-sm font-semibold cursor-pointer hover:shadow-blue-500/40 hover:brightness-110 disabled:opacity-50 transition-all"
                  >
                    {shareLoading ? <Loader2 size={14} className="animate-spin" /> : <><Send size={14} /> Partager</>}
                  </button>
                </div>
                {shareError && <p className="text-sm text-destructive mt-1">{shareError}</p>}
                {shareSuccess && <p className="text-sm text-emerald-400 mt-1">{shareSuccess}</p>}
              </form>
            </div>
          </section>
        )}

        {/* ─── Section 4: Partages envoyés ─── */}
        {activeProject && sentShares.length > 0 && (
          <section>
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              <Shield size={14} className="text-emerald-400" /> Partages envoyés
              <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[0.65rem] font-bold normal-case tracking-normal">
                {sentShares.length}
              </span>
            </h3>
            <div className="bg-card/60 backdrop-blur-sm border border-white/8 rounded-2xl overflow-hidden divide-y divide-white/5">
              {sentShares.map(share => {
                const TypeIcon = itemTypeIcons[share.itemType] || FileText
                const typeColor = itemTypeColors[share.itemType] || '#8b5cf6'
                return (
                  <div key={share.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-accent/30 transition-colors group">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: typeColor + '15', color: typeColor }}>
                      <TypeIcon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{share.itemName}</div>
                      <div className="text-[0.65rem] text-muted-foreground truncate">
                        {share.user_email || 'Utilisateur'} · {roleLabels[share.role] || share.role}
                      </div>
                    </div>
                    {share.created_at && (
                      <div className="text-[0.6rem] text-muted-foreground/60 flex items-center gap-1 shrink-0 max-sm:hidden">
                        <Clock size={10} />
                        {new Date(share.created_at).toLocaleDateString('fr-FR')}
                      </div>
                    )}
                    {canManage && (
                      <button
                        onClick={() => handleUnshare(share.id, share.itemType, share.item_id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 bg-transparent border-none cursor-pointer opacity-0 group-hover:opacity-100 transition-all shrink-0"
                        title="Retirer l'accès"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Empty state when no project */}
        {!activeProject && (!pendingInvitations || pendingInvitations.length === 0) && (
          <div className="flex flex-col items-center justify-center gap-4 py-24">
            <div className="w-20 h-20 rounded-2xl bg-amber-500/5 flex items-center justify-center empty-icon">
              <Mail size={40} className="text-amber-400/40" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-muted-foreground mb-1">Aucune invitation</p>
              <p className="text-sm text-muted-foreground/60">Sélectionnez un projet pour gérer les membres et les partages</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
