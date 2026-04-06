import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Share2, Check, Link2, X, Mail, UserPlus, Loader2, Eye, Edit3, Trash2 } from 'lucide-react'
import { useProject } from '../contexts/ProjectContext'
import { cn } from '../lib/utils'

export default function ShareButton({ itemType, itemId, createShareLink, className = '' }) {
  const { shareItemWithUser, getItemShares, unshareItem, myRole } = useProject()
  const [shareUrl, setShareUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const [tab, setTab] = useState('user')
  const popupRef = useRef(null)

  // User sharing state
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('viewer')
  const [shareLoading, setShareLoading] = useState(false)
  const [shareError, setShareError] = useState('')
  const [shareSuccess, setShareSuccess] = useState('')
  const [shares, setShares] = useState([])
  const [sharesLoading, setSharesLoading] = useState(false)

  const canManage = myRole === 'owner' || myRole === 'editor'

  // Close on outside click
  useEffect(() => {
    if (!showPopup) return
    const handler = (e) => {
      if (popupRef.current && popupRef.current.contains(e.target)) return
      if (btnRef.current && btnRef.current.contains(e.target)) return
      setShowPopup(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showPopup])

  // Load existing shares when popup opens
  useEffect(() => {
    if (!showPopup || !getItemShares) return
    const load = async () => {
      setSharesLoading(true)
      const data = await getItemShares(itemType, itemId)
      setShares(data || [])
      setSharesLoading(false)
    }
    load()
  }, [showPopup, itemType, itemId, getItemShares])

  const handleToggle = (e) => {
    e?.stopPropagation()
    setShowPopup(prev => !prev)
    setShareError('')
    setShareSuccess('')
  }

  const handleGenerateLink = async () => {
    setLoading(true)
    const token = await createShareLink(itemType, itemId)
    if (token) {
      setShareUrl(`${window.location.origin}/share/${token}`)
    }
    setLoading(false)
  }

  const copyToClipboard = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = shareUrl
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch { /* ignore */ }
    }
  }

  const handleShareUser = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setShareError('Adresse email invalide.')
      return
    }
    setShareLoading(true)
    setShareError('')
    setShareSuccess('')
    const { error: err } = await shareItemWithUser(itemType, itemId, email.trim(), role)
    if (err) {
      setShareError(err.message)
    } else {
      setShareSuccess(`Partagé avec ${email} !`)
      setEmail('')
      const data = await getItemShares(itemType, itemId)
      setShares(data || [])
    }
    setShareLoading(false)
  }

  const handleUnshare = async (shareId) => {
    await unshareItem(shareId)
    setShares(prev => prev.filter(s => s.id !== shareId))
  }

  const btnRef = useRef(null)
  const [popupPos, setPopupPos] = useState(null)

  // Recalculate popup position when it opens
  useEffect(() => {
    if (!showPopup || !btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const popupWidth = 320
    let left = rect.right - popupWidth
    if (left < 8) left = 8
    if (left + popupWidth > window.innerWidth - 8) left = window.innerWidth - popupWidth - 8
    setPopupPos({ top: rect.bottom + 8, left })
  }, [showPopup])

  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button
        ref={btnRef}
        className={className || "flex items-center justify-center w-7 h-7 bg-transparent border-none text-muted-foreground cursor-pointer hover:text-foreground transition-colors duration-150 rounded-lg hover:bg-white/5"}
        onClick={handleToggle}
        title="Partager"
      >
        <Share2 size={14} />
      </button>

      {showPopup && popupPos && createPortal(
        <div ref={popupRef} className="fixed z-[9999] bg-card border border-white/10 rounded-xl shadow-2xl shadow-black/30 min-w-[320px] animate-scale-in overflow-hidden" style={{ top: popupPos.top, left: popupPos.left }}>
          {/* Header + tabs */}
          <div className="flex items-center justify-between px-3 pt-3 pb-0">
            <span className="text-xs font-bold text-foreground">Partager</span>
            <button
              className="flex items-center justify-center w-5 h-5 bg-transparent border-none text-muted-foreground cursor-pointer hover:text-foreground rounded transition-colors"
              onClick={() => setShowPopup(false)}
            >
              <X size={12} />
            </button>
          </div>
          <div className="flex px-3 pt-2 gap-1">
            <button
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[0.7rem] font-semibold border-none cursor-pointer transition-all",
                tab === 'user' ? "bg-primary/15 text-primary" : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
              onClick={() => setTab('user')}
            >
              <UserPlus size={11} /> Utilisateur
            </button>
            <button
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[0.7rem] font-semibold border-none cursor-pointer transition-all",
                tab === 'link' ? "bg-primary/15 text-primary" : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
              onClick={() => setTab('link')}
            >
              <Link2 size={11} /> Lien public
            </button>
          </div>

          <div className="p-3">
            {/* User sharing tab */}
            {tab === 'user' && (
              <div className="flex flex-col gap-2.5">
                {canManage && (
                  <form onSubmit={handleShareUser} className="flex flex-col gap-2">
                    <div className="flex gap-1.5">
                      <div className="relative flex-1">
                        <Mail size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="email@exemple.com"
                          className="w-full bg-input border border-border rounded-lg py-1.5 pl-7 pr-2 text-xs text-foreground outline-none focus:border-primary transition-colors"
                        />
                      </div>
                      <select
                        value={role}
                        onChange={e => setRole(e.target.value)}
                        className="bg-input border border-border rounded-lg px-2 py-1.5 text-xs text-foreground outline-none cursor-pointer"
                      >
                        <option value="viewer">Lecteur</option>
                        <option value="editor">Éditeur</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={shareLoading || !email.trim()}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border-none text-xs font-semibold cursor-pointer transition-all bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:brightness-110 disabled:opacity-50"
                    >
                      {shareLoading ? <Loader2 size={12} className="animate-spin" /> : <><UserPlus size={12} /> Partager</>}
                    </button>
                    {shareError && <p className="text-[0.65rem] text-destructive">{shareError}</p>}
                    {shareSuccess && <p className="text-[0.65rem] text-emerald-400">{shareSuccess}</p>}
                  </form>
                )}
                {/* Existing shares */}
                {sharesLoading ? (
                  <div className="flex justify-center py-2"><Loader2 size={14} className="animate-spin text-muted-foreground" /></div>
                ) : shares.length > 0 ? (
                  <div className="flex flex-col gap-1 max-h-[150px] overflow-y-auto">
                    <div className="text-[0.6rem] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Accès ({shares.length})</div>
                    {shares.map(s => (
                      <div key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent/50 transition-colors group">
                        <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-primary text-[0.6rem] font-bold shrink-0">
                          {(s.user_email || '?')[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[0.7rem] font-medium truncate">{s.user_email}</div>
                        </div>
                        <span className="flex items-center gap-1 text-[0.6rem] text-muted-foreground">
                          {s.role === 'editor' ? <Edit3 size={9} /> : <Eye size={9} />}
                          {s.role === 'editor' ? 'Éditeur' : 'Lecteur'}
                        </span>
                        {canManage && (
                          <button
                            onClick={() => handleUnshare(s.id)}
                            className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 bg-transparent border-none cursor-pointer opacity-0 group-hover:opacity-100 transition-all shrink-0"
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[0.65rem] text-muted-foreground text-center py-1">Aucun partage utilisateur</p>
                )}
              </div>
            )}

            {/* Link tab */}
            {tab === 'link' && (
              <div>
                {shareUrl ? (
                  <>
                    <div className="flex items-center gap-2">
                      <input
                        className="flex-1 px-2.5 py-1.5 bg-input border border-border rounded-lg text-foreground text-xs outline-none font-mono truncate"
                        value={shareUrl}
                        readOnly
                        onClick={e => e.target.select()}
                      />
                      <button
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-none text-xs font-semibold cursor-pointer transition-all shrink-0",
                          copied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:brightness-110'
                        )}
                        onClick={copyToClipboard}
                      >
                        {copied ? <><Check size={12} /> Copié !</> : 'Copier'}
                      </button>
                    </div>
                    <p className="text-[0.6rem] text-muted-foreground mt-2">
                      Toute personne avec ce lien peut voir cet élément (lecture seule).
                    </p>
                  </>
                ) : (
                  <button
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-semibold cursor-pointer transition-all text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50"
                    onClick={handleGenerateLink}
                    disabled={loading}
                  >
                    {loading ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Link2 size={12} />}
                    Générer un lien public
                  </button>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
