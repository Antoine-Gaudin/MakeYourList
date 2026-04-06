import { useState } from 'react'
import { useProject } from '../contexts/ProjectContext'
import { useAuth } from '../contexts/AuthContext'
import { Users, X, Mail, UserPlus, Shield, Eye, Edit3, Crown, Trash2, Loader2 } from 'lucide-react'
import { cn } from '../lib/utils'

const roleLabels = { owner: 'Propriétaire', editor: 'Éditeur', viewer: 'Lecteur' }
const roleIcons = { owner: Crown, editor: Edit3, viewer: Eye }

export default function InviteMembers({ onClose, showUpgradeModal }) {
  const { user } = useAuth()
  const { members, myRole, inviteMember, updateMemberRole, removeMember } = useProject()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('viewer')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const canManage = myRole === 'owner' || myRole === 'editor'

  const handleInvite = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Adresse email invalide.')
      return
    }
    setLoading(true)
    setError('')
    setSuccess('')
    const { error: err } = await inviteMember(email.trim(), role)
    if (err) {
      if (err.message?.includes('Limite') && showUpgradeModal) {
        showUpgradeModal('Limite de membres atteinte sur votre plan actuel.')
      } else {
        setError(err.message)
      }
    }
    else { setSuccess(`${email} a été invité !`); setEmail('') }
    setLoading(false)
  }

  const handleRoleChange = async (memberId, newRole) => {
    if (!['viewer', 'editor'].includes(newRole)) return
    await updateMemberRole(memberId, newRole)
  }

  const handleRemove = async (memberId, name) => {
    if (!confirm(`Retirer ${name} du projet ?`)) return
    await removeMember(memberId)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[250] animate-in" onClick={onClose}>
      <div className="bg-card/95 backdrop-blur-xl border border-white/10 rounded-2xl max-w-[500px] w-[92%] overflow-hidden animate-slide-up" style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 80px rgba(139,92,246,0.1)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg" style={{ boxShadow: '0 4px 15px rgba(245,158,11,0.4)' }}>
              <Users size={18} />
            </div>
            <div>
              <h3 className="text-lg font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">Membres</h3>
              <p className="text-xs text-muted-foreground">{members.length} membre{members.length > 1 ? 's' : ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent bg-transparent border-none cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* Members list */}
        <div className="p-4 max-h-[300px] overflow-y-auto">
          {members.map(m => {
            const RoleIcon = roleIcons[m.role] || Eye
            const isMe = m.user_id === user?.id
            return (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-accent/50 transition-colors group">
                <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary text-sm font-bold">
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
                      onClick={() => handleRemove(m.id, m.display_name || m.email)}
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
          <form onSubmit={handleInvite} className="px-6 py-5 border-t border-border">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              <UserPlus size={12} className="inline mr-1.5" />
              Inviter un membre
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email@exemple.com"
                  required
                  className="w-full bg-input border border-border rounded-xl py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary transition-colors"
                />
              </div>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="bg-input border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none cursor-pointer"
              >
                <option value="viewer">Lecteur</option>
                <option value="editor">Éditeur</option>
              </select>
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25 border-none rounded-xl px-4 py-2.5 text-sm font-semibold cursor-pointer hover:shadow-violet-500/40 hover:brightness-110 disabled:opacity-50 transition-all"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <><UserPlus size={14} /> Inviter</>}
              </button>
            </div>
            {error && <p className="text-sm text-destructive mt-2">{error}</p>}
            {success && <p className="text-sm text-success mt-2">{success}</p>}
          </form>
        )}
      </div>
    </div>
  )
}
