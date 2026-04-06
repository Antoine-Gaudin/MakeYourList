import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useNavigate } from 'react-router-dom'
import { User, Mail, Save, Loader2, X, Eye, EyeOff, Lock, Sun, Moon, Crown, GraduationCap, Zap, ChevronUp, ArrowRight, Camera, Paperclip, HardDrive, Key, Copy, Check, RefreshCw, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { cn } from '../lib/utils'

const PLAN_CONFIG = {
  free: { name: 'Free', icon: Zap, color: '#9899b3', bg: '#9899b3' },
  student: { name: 'Étudiant', icon: GraduationCap, color: '#4dabf7', bg: '#4dabf7' },
  pro: { name: 'Pro', icon: Crown, color: '#8b5cf6', bg: '#8b5cf6' },
}

const UPGRADE_OPTIONS = {
  free: [
    { id: 'student', name: 'Étudiant', price: '2,49€/mois', icon: GraduationCap, color: '#4dabf7', desc: '5 projets, API, 3 membres…' },
    { id: 'pro', name: 'Pro', price: '7€/mois', icon: Crown, color: '#8b5cf6', desc: 'Tout illimité, export, support prioritaire' },
  ],
  student: [
    { id: 'pro', name: 'Pro', price: '7€/mois', icon: Crown, color: '#8b5cf6', desc: 'Membres illimités, export, support prioritaire' },
  ],
  pro: [],
}

export default function UserProfile({ onClose, theme, toggleTheme, totalStorageUsed = 0 }) {
  const { user, profile, updateProfile } = useAuth()
  const { plan: currentPlan, limits } = useSubscription()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)

  const planConfig = PLAN_CONFIG[currentPlan] || PLAN_CONFIG.free
  const PlanIcon = planConfig.icon
  const upgradeOptions = UPGRADE_OPTIONS[currentPlan] || []

  // Avatar upload
  const [avatarUploading, setAvatarUploading] = useState(false)

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (!file.type.startsWith('image/')) return
    if (file.size > 2 * 1024 * 1024) return // max 2MB

    setAvatarUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `avatars/${user.id}.${ext}`
      // Remove old avatar if exists
      await supabase.storage.from('attachments').remove([path])
      const { error: uploadError } = await supabase.storage.from('attachments').upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path)
      // Add cache-buster to force refresh
      const avatarUrl = urlData.publicUrl + '?t=' + Date.now()
      await updateProfile({ avatar_url: avatarUrl })
    } catch (err) {
      console.error('Avatar upload failed:', err)
    }
    setAvatarUploading(false)
  }

  // Password change
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  // Cancel subscription
  const [canceling, setCanceling] = useState(false)
  const [cancelError, setCancelError] = useState('')

  const handleCancelSubscription = async () => {
    if (!confirm('Êtes-vous sûr de vouloir annuler votre abonnement ? Vous passerez au plan Free.')) return
    setCanceling(true)
    setCancelError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cancel-subscription`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })
      const result = await res.json()
      if (!res.ok) {
        setCancelError(result.error || 'Erreur lors de l\'annulation')
      }
    } catch {
      setCancelError('Erreur réseau')
    }
    setCanceling(false)
  }

  // API Key
  const [apiKey, setApiKey] = useState('')
  const [apiKeyVisible, setApiKeyVisible] = useState(false)
  const [apiKeyCopied, setApiKeyCopied] = useState(false)
  const [apiKeyRegenerating, setApiKeyRegenerating] = useState(false)

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('api_key').eq('id', user.id).single().then(({ data }) => {
        if (data?.api_key) setApiKey(data.api_key)
      })
    }
  }, [user])

  const handleCopyApiKey = async () => {
    await navigator.clipboard.writeText(apiKey)
    setApiKeyCopied(true)
    setTimeout(() => setApiKeyCopied(false), 2000)
  }

  const handleRegenerateApiKey = async () => {
    if (!confirm('Régénérer votre clé API ? L\'ancienne clé cessera de fonctionner immédiatement.')) return
    setApiKeyRegenerating(true)
    const { data, error } = await supabase.rpc('regenerate_api_key')
    if (!error && data) {
      setApiKey(data)
    }
    setApiKeyRegenerating(false)
  }

  const handleSaveProfile = async () => {
    const sanitized = displayName.trim().slice(0, 100)
    if (!sanitized) return
    setSaving(true)
    try {
      await updateProfile({ display_name: sanitized })
      setDisplayName(sanitized)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      // Profile update error handled silently
    }
    setSaving(false)
  }

  const handleChangePassword = async () => {
    setPasswordError('')
    if (newPassword.length < 8) {
      setPasswordError('Le mot de passe doit faire au moins 8 caractères.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas.')
      return
    }
    setPasswordSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordSaving(false)
    if (error) {
      setPasswordError(error.message)
    } else {
      setPasswordSuccess(true)
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordSection(false)
      setTimeout(() => setPasswordSuccess(false), 3000)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[200] animate-in" onClick={onClose}>
      <div className="bg-card/95 backdrop-blur-xl border border-white/10 rounded-2xl max-w-[500px] w-[92%] overflow-hidden animate-slide-up" style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 80px rgba(139,92,246,0.1)' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-lg" style={{ boxShadow: '0 4px 15px rgba(139,92,246,0.4)' }}>
              <User size={18} />
            </div>
            <h3 className="text-lg font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">Mon compte</h3>
          </div>
          <button
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent bg-transparent border-none cursor-pointer transition-colors"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-6 flex flex-col gap-6">
          {/* Avatar + email + plan badge */}
          <div className="flex items-center gap-4">
            <label className="relative w-14 h-14 rounded-full shrink-0 cursor-pointer group" title="Changer la photo de profil">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-14 h-14 rounded-full object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xl font-bold">
                  {(profile?.display_name || user?.email || '?')[0].toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {avatarUploading ? <Loader2 size={18} className="text-white animate-spin" /> : <Camera size={18} className="text-white" />}
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={avatarUploading} />
            </label>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-base font-semibold">{profile?.display_name || 'Utilisateur'}</span>
                <div className="relative">
                  <button
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6rem] font-bold border-none cursor-pointer transition-all duration-200 hover:scale-105",
                      upgradeOptions.length > 0 && "hover:brightness-110"
                    )}
                    style={{ background: planConfig.bg + '20', color: planConfig.color }}
                    onClick={() => upgradeOptions.length > 0 && setShowUpgrade(!showUpgrade)}
                    title={upgradeOptions.length > 0 ? "Voir les plans supérieurs" : "Plan actuel"}
                  >
                    <PlanIcon size={10} />
                    {planConfig.name}
                    {upgradeOptions.length > 0 && (
                      <ChevronUp size={9} className={cn("transition-transform duration-200", showUpgrade ? "rotate-180" : "")} />
                    )}
                  </button>

                  {/* Upgrade popover */}
                  {showUpgrade && upgradeOptions.length > 0 && (
                    <div
                      className="absolute left-0 top-full mt-2 w-64 bg-card/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden z-50 animate-in"
                      style={{ boxShadow: '0 15px 40px rgba(0,0,0,0.4), 0 0 40px rgba(139,92,246,0.08)' }}
                    >
                      <div className="px-3.5 pt-3 pb-2">
                        <div className="text-[0.6rem] font-semibold text-muted-foreground uppercase tracking-widest">Passer au niveau supérieur</div>
                      </div>
                      {upgradeOptions.map(opt => {
                        const OptIcon = opt.icon
                        return (
                          <button
                            key={opt.id}
                            className="w-full flex items-center gap-3 px-3.5 py-3 bg-transparent border-none cursor-pointer text-left transition-all hover:bg-white/[0.05] group"
                            onClick={() => {
                              onClose()
                              navigate(`/abonnement?plan=${opt.id}`)
                            }}
                          >
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: opt.color + '20', color: opt.color }}>
                              <OptIcon size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">{opt.name}</span>
                                <span className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full" style={{ background: opt.color + '20', color: opt.color }}>{opt.price}</span>
                              </div>
                              <div className="text-[0.65rem] text-muted-foreground">{opt.desc}</div>
                            </div>
                            <ArrowRight size={13} className="text-muted-foreground/30 group-hover:text-foreground/60 transition-colors shrink-0" />
                          </button>
                        )
                      })}
                      <div className="px-3.5 pb-3 pt-1">
                        <button
                          className="w-full py-2 rounded-lg text-[0.65rem] font-semibold bg-transparent border border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20 cursor-pointer transition-all"
                          onClick={() => {
                            onClose()
                            navigate('/tarifs')
                          }}
                        >
                          Comparer tous les plans
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail size={12} />
                <span className="truncate">{user?.email}</span>
              </div>
            </div>
          </div>

          {/* Display name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Nom d'affichage
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Votre nom"
                className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
              />
              <button
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border-none cursor-pointer transition-all duration-150",
                  saved ? "bg-emerald-500/15 text-emerald-400" : "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:brightness-110"
                )}
                onClick={handleSaveProfile}
                disabled={saving || !displayName.trim()}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Save size={14} /> : <Save size={14} />}
                {saved ? 'Sauvegardé' : 'Sauvegarder'}
              </button>
            </div>
          </div>

          {/* Password section */}
          <div>
            <button
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer transition-colors"
              onClick={() => setShowPasswordSection(!showPasswordSection)}
            >
              <Lock size={14} />
              {showPasswordSection ? 'Annuler le changement' : 'Changer le mot de passe'}
            </button>

            {showPasswordSection && (
              <div className="mt-3 flex flex-col gap-3">
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Nouveau mot de passe"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirmer le mot de passe"
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                />
                {passwordError && (
                  <p className="text-xs text-destructive">{passwordError}</p>
                )}
                <button
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border-none cursor-pointer bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:brightness-110 transition-all duration-150"
                  onClick={handleChangePassword}
                  disabled={passwordSaving || !newPassword}
                >
                  {passwordSaving ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                  Changer le mot de passe
                </button>
              </div>
            )}

            {passwordSuccess && (
              <p className="mt-2 text-xs text-emerald-400">Mot de passe modifié avec succès.</p>
            )}
          </div>

          {/* Theme toggle */}
          <div className="flex items-center justify-between py-3 px-4 bg-background/50 border border-border rounded-xl">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? <Moon size={16} className="text-violet-400" /> : <Sun size={16} className="text-amber-400" />}
              <div>
                <div className="text-sm font-medium">{theme === 'dark' ? 'Mode sombre' : 'Mode clair'}</div>
                <div className="text-[0.65rem] text-muted-foreground">Changer l'apparence de l'application</div>
              </div>
            </div>
            <button
              className="w-11 h-6 rounded-full relative cursor-pointer border-none transition-colors duration-200"
              style={{ background: theme === 'dark' ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : '#d1d5db' }}
              onClick={toggleTheme}
            >
              <div className={cn(
                "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-200 flex items-center justify-center",
                theme === 'dark' ? "left-[22px]" : "left-0.5"
              )}>
                {theme === 'dark' ? <Moon size={10} className="text-violet-500" /> : <Sun size={10} className="text-amber-500" />}
              </div>
            </button>
          </div>

          {/* Storage usage */}
          {limits?.storageMB && (
            <div className="py-3 px-4 bg-background/50 border border-border rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <HardDrive size={16} className="text-amber-400" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Stockage pièces jointes</div>
                  <div className="text-[0.65rem] text-muted-foreground">Espace utilisé pour vos fichiers</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span className="flex items-center gap-1.5"><Paperclip size={11} /> Utilisé</span>
                <span className="font-semibold text-foreground">{totalStorageUsed < 1048576 ? (totalStorageUsed / 1024).toFixed(1) + ' Ko' : (totalStorageUsed / (1024 * 1024)).toFixed(1) + ' Mo'} / {limits.storageMB >= 1000 ? (limits.storageMB / 1000) + ' Go' : limits.storageMB + ' Mo'}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (totalStorageUsed / (limits.storageMB * 1024 * 1024)) * 100)}%`,
                    background: (totalStorageUsed / (limits.storageMB * 1024 * 1024)) > 0.9 ? 'linear-gradient(90deg, #ef4444, #dc2626)' : (totalStorageUsed / (limits.storageMB * 1024 * 1024)) > 0.7 ? 'linear-gradient(90deg, #f59e0b, #d97706)' : 'linear-gradient(90deg, #8b5cf6, #7c3aed)'
                  }}
                />
              </div>
              <div className="text-[0.6rem] text-muted-foreground/50 mt-1.5">
                {Math.round((totalStorageUsed / (limits.storageMB * 1024 * 1024)) * 100)}% utilisé — Plan {PLAN_CONFIG[currentPlan]?.name || 'Free'}
              </div>
              {totalStorageUsed >= limits.storageMB * 1024 * 1024 && (
                <div className="mt-2.5 px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-[0.7rem] text-destructive font-medium leading-snug">
                    Vous avez dépassé la limite de {limits.storageMB} Mo. Supprimez des pièces jointes ou{' '}
                    <button className="underline font-bold bg-transparent border-none text-destructive cursor-pointer p-0 text-[0.7rem]" onClick={() => { onClose(); navigate(`/abonnement?plan=${currentPlan === 'free' ? 'student' : 'pro'}`) }}>
                      passez à l'offre supérieure
                    </button>.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* API Key */}
          <div className="py-3 px-4 bg-background/50 border border-border rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <Key size={16} className="text-emerald-400" />
              <div className="flex-1">
                <div className="text-sm font-medium">Clé API</div>
                <div className="text-[0.65rem] text-muted-foreground">Utilisez cette clé pour accéder à l'API REST</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-background border border-border rounded-lg px-3 py-2 font-mono text-xs text-foreground/80 overflow-hidden select-all">
                {apiKeyVisible ? apiKey : apiKey ? '•'.repeat(32) + apiKey.slice(-8) : '—'}
              </div>
              <button
                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent bg-transparent border-none cursor-pointer transition-colors"
                onClick={() => setApiKeyVisible(!apiKeyVisible)}
                title={apiKeyVisible ? 'Masquer' : 'Afficher'}
              >
                {apiKeyVisible ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button
                className={cn(
                  "w-8 h-8 flex items-center justify-center rounded-lg bg-transparent border-none cursor-pointer transition-colors",
                  apiKeyCopied ? "text-emerald-400" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
                onClick={handleCopyApiKey}
                disabled={!apiKey}
                title="Copier"
              >
                {apiKeyCopied ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <button
                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent bg-transparent border-none cursor-pointer transition-colors"
                onClick={handleRegenerateApiKey}
                disabled={apiKeyRegenerating}
                title="Régénérer"
              >
                {apiKeyRegenerating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              </button>
            </div>
          </div>

          {/* Cancel subscription */}
          {currentPlan !== 'free' && (
            <div className="py-3 px-4 bg-background/50 border border-border rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <XCircle size={16} className="text-destructive" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Annuler mon abonnement</div>
                  <div className="text-[0.65rem] text-muted-foreground">Vous repasserez au plan Free immédiatement</div>
                </div>
              </div>
              {cancelError && (
                <p className="text-xs text-destructive mb-2">{cancelError}</p>
              )}
              <button
                className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-[0.75rem] font-semibold border border-destructive/30 text-destructive bg-destructive/10 hover:bg-destructive/20 cursor-pointer transition-all"
                onClick={handleCancelSubscription}
                disabled={canceling}
              >
                {canceling ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                {canceling ? 'Annulation en cours…' : 'Résilier mon abonnement'}
              </button>
            </div>
          )}

          {/* Account info */}
          <div className="pt-3 border-t border-border">
            <div className="text-[0.65rem] text-muted-foreground/50">
              Compte créé le {user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : '—'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
