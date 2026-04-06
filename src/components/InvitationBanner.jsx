import { useState } from 'react'
import { useProject } from '../contexts/ProjectContext'
import { Mail, Check, X, Loader2, Users } from 'lucide-react'
import { cn } from '../lib/utils'

export default function InvitationBanner() {
  const { pendingInvitations, acceptInvitation, declineInvitation } = useProject()
  const [processing, setProcessing] = useState({})
  const [errorMsg, setErrorMsg] = useState(null)

  if (!pendingInvitations || pendingInvitations.length === 0) return null

  const handleAccept = async (inv) => {
    setProcessing(p => ({ ...p, [inv.id]: 'accepting' }))
    setErrorMsg(null)
    try {
      const result = await acceptInvitation(inv.id)
      if (result?.error) setErrorMsg(result.error.message || 'Erreur lors de l\'acceptation')
    } catch (e) { setErrorMsg(e.message || 'Erreur inattendue') }
    setProcessing(p => ({ ...p, [inv.id]: null }))
  }

  const handleDecline = async (inv) => {
    setProcessing(p => ({ ...p, [inv.id]: 'declining' }))
    setErrorMsg(null)
    try {
      const result = await declineInvitation(inv.id)
      if (result?.error) setErrorMsg(result.error.message || 'Erreur lors du refus')
    } catch (e) { setErrorMsg(e.message || 'Erreur inattendue') }
    setProcessing(p => ({ ...p, [inv.id]: null }))
  }

  return (
    <div className="px-4 py-3 flex flex-col gap-2">
      <div className="flex items-center gap-2 px-2 py-1">
        <Mail size={14} className="text-primary" />
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Invitations ({pendingInvitations.length})
        </span>
      </div>
      {errorMsg && (
        <div className="px-4 py-2 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive">
          {errorMsg}
        </div>
      )}
      {pendingInvitations.map(inv => (
        <div
          key={inv.id}
          className="flex items-center gap-3 px-4 py-3 bg-primary/5 border border-primary/20 rounded-xl animate-in"
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: (inv.project?.color || '#8b5cf6') + '20', color: inv.project?.color || '#8b5cf6' }}>
            <Users size={15} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{inv.project?.name || 'Projet'}</div>
            <div className="text-[0.7rem] text-muted-foreground">
              Role : <span className="font-medium capitalize">{inv.role === 'viewer' ? 'Lecteur' : inv.role === 'editor' ? 'Éditeur' : inv.role}</span>
              {inv.inviter && <span> · par {inv.inviter.display_name || inv.inviter.email}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border-none cursor-pointer transition-all duration-150",
                "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:brightness-110"
              )}
              onClick={() => handleAccept(inv)}
              disabled={!!processing[inv.id]}
            >
              {processing[inv.id] === 'accepting' ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              Accepter
            </button>
            <button
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border-none cursor-pointer transition-all duration-150",
                "bg-destructive/10 text-destructive hover:bg-destructive/20"
              )}
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
  )
}
