import { useState, useEffect } from 'react'
import { Check, X, Crown, GraduationCap, Zap, ChevronDown, Shield, Sparkles, ArrowRight, Lock, Loader2 } from 'lucide-react'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { cn } from '../lib/utils'
import Footer from './Footer'
import { usePageMeta } from '../hooks/usePageMeta'
import { Link, useNavigate } from 'react-router-dom'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    icon: <Zap size={22} />,
    color: '#9899b3',
    description: 'Parfait pour découvrir Make Your List et organiser vos premières tâches.',
    features: [
      { text: '1 projet', included: true },
      { text: '3 listes de tâches', included: true },
      { text: 'Notes illimitées', included: true },
      { text: '1 tableau Kanban', included: true },
      { text: '50 Mo de pièces jointes', included: true },
      { text: 'Recherche globale', included: true },
      { text: 'Thème clair / sombre', included: true },
      { text: 'Mode hors-ligne (PWA)', included: true },
      { text: 'Actions par lot', included: true },
      { text: 'Schémas (canvas)', included: false },
      { text: 'Collaboration', included: false },
      { text: 'Accès API', included: false },
      { text: 'Export en masse', included: false },
    ],
  },
  {
    id: 'student',
    name: 'Étudiant',
    price: 2.49,
    icon: <GraduationCap size={22} />,
    color: '#4dabf7',
    popular: true,
    description: 'Toute la puissance de Make Your List au prix d\'un café par mois.',

    features: [
      { text: 'Jusqu\'à 5 projets', included: true },
      { text: '15 listes de tâches', included: true },
      { text: 'Notes illimitées', included: true },
      { text: '5 tableaux Kanban', included: true },
      { text: '1 schéma (canvas)', included: true },
      { text: '500 Mo de pièces jointes', included: true },
      { text: 'Accès API complet', included: true },

      { text: 'Jusqu\'à 3 membres', included: true },
      { text: 'Export en masse', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 7,
    icon: <Crown size={22} />,
    color: '#8b5cf6',
    description: 'Pour les freelances et équipes qui veulent tout débloquer, sans limite.',
    features: [
      { text: 'Tout le plan Étudiant', included: true, bold: true },
      { text: 'Projets & listes illimités', included: true },
      { text: '5 Go de pièces jointes', included: true },
      { text: 'Membres illimités', included: true },
      { text: 'Schémas illimités', included: true },
      { text: 'Export en masse', included: true },
    ],
  },
]

const COMPARISON_ROWS = [
  { label: 'Projets', free: '1', student: '5', pro: 'Illimité' },
  { label: 'Listes de tâches', free: '3', student: '15', pro: 'Illimité' },
  { label: 'Tableaux Kanban', free: '1', student: '5', pro: 'Illimité' },
  { label: 'Schémas (canvas)', free: '—', student: '1', pro: 'Illimité' },
  { label: 'Notes', free: 'Illimité', student: 'Illimité', pro: 'Illimité' },
  { label: 'Membres par projet', free: '1', student: '3', pro: 'Illimité' },
  { label: 'Pièces jointes', free: '50 Mo', student: '500 Mo', pro: '5 Go' },
  { label: 'Accès API', free: false, student: true, pro: true },
  { label: 'Mode hors-ligne (PWA)', free: true, student: true, pro: true },
  { label: 'Actions par lot', free: true, student: true, pro: true },
  { label: 'Export en masse', free: false, student: false, pro: true },
]

const FAQ = [
  {
    q: 'Est-ce que le plan Free est vraiment gratuit, sans piège ?',
    a: 'Oui. Le plan Free n\'a pas de limite dans le temps. Vous pouvez l\'utiliser aussi longtemps que vous voulez. Les seules limites sont sur le nombre de projets (1), listes (3) et tableaux Kanban (1). Notes illimitées, en revanche.',
  },
  {
    q: 'Comment fonctionne l\'offre Étudiant ?',
    a: 'Le plan Étudiant est disponible à 2,49€/mois. Vous profitez de 5 projets, 15 listes, 5 tableaux Kanban et jusqu\'à 3 membres.',
  },
  {
    q: 'Puis-je changer de plan à tout moment ?',
    a: 'Oui, vous pouvez upgrader ou downgrader votre plan à tout moment. Le changement prend effet immédiatement. En cas de downgrade, vous gardez l\'accès jusqu\'à la fin de la période payée.',
  },
  {
    q: 'Mes données sont-elles en sécurité ?',
    a: 'Vos données sont stockées sur Supabase (infrastructure PostgreSQL managée), hébergé en Europe (eu-west). Les connexions sont chiffrées (TLS), et les accès protégés par Row Level Security : personne ne peut voir vos données sauf vous et les membres que vous invitez.',
  },
  {
    q: 'L\'application fonctionne-t-elle hors-ligne ?',
    a: 'Oui. Make Your List est une PWA que vous pouvez installer sur mobile ou desktop. En mode hors-ligne, vous pouvez consulter vos données. La synchronisation se fait automatiquement quand la connexion revient.',
  },
  {
    q: 'Que se passe-t-il si je dépasse les limites de mon plan ?',
    a: 'Vous ne perdez jamais vos données existantes. Simplement, vous ne pourrez pas créer de nouveaux projets, listes ou boards au-delà de la limite. Un message vous invitera à passer au plan supérieur.',
  },
  {
    q: 'Qu\'est-ce que l\'outil Schéma ?',
    a: 'L\'outil Schéma vous permet de créer des diagrammes et visuels (formes, zones de texte, flèches) pour structurer vos projets ou idées. Le plan Étudiant inclut 1 schéma, le plan Pro en propose en illimité.',
  },
]

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={cn("border rounded-xl overflow-hidden transition-all", open ? "border-violet-500/30 bg-violet-500/[0.03]" : "border-border hover:border-primary/20")}>
      <button
        className="w-full flex items-center justify-between px-5 py-4 bg-transparent border-none cursor-pointer text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm font-semibold text-foreground pr-4">{q}</span>
        <ChevronDown size={16} className={cn("text-muted-foreground shrink-0 transition-transform duration-200", open && "rotate-180 text-violet-400")} />
      </button>
      <div className={cn("grid transition-all duration-200", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden">
          <p className="px-5 pb-4 pt-0 text-sm text-muted-foreground leading-relaxed m-0">{a}</p>
        </div>
      </div>
    </div>
  )
}

const MODAL_PLANS = {
  student: { name: 'Plan Étudiant', price: '2,49€', color: '#4dabf7', bg: 'rgba(77,171,247,0.12)', icon: <GraduationCap size={14} /> },
  pro: { name: 'Plan Pro', price: '7€', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', icon: <Crown size={14} /> },
}

function AuthModal({ planId, onClose }) {
  const [tab, setTab] = useState('signup')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const plan = MODAL_PLANS[planId]

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const redirectToCheckout = async (session) => {
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ planId }),
      }
    )
    const data = await res.json()
    if (data?.url) window.location.href = data.url
    else throw new Error(data?.error || 'Erreur lors de la création du paiement')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      // Save pending plan BEFORE auth — component may unmount on auth state change
      sessionStorage.setItem('pending_checkout_plan', planId)

      if (tab === 'signup') {
        if (password.length < 8) { setError('Le mot de passe doit faire au moins 8 caractères.'); setLoading(false); sessionStorage.removeItem('pending_checkout_plan'); return }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email, password,
          options: { data: { display_name: name || undefined } }
        })
        if (signUpError) { sessionStorage.removeItem('pending_checkout_plan'); throw signUpError }
        if (data.session) {
          await redirectToCheckout(data.session)
        } else {
          sessionStorage.removeItem('pending_checkout_plan')
          setError('Vérifiez votre email pour confirmer votre compte, puis connectez-vous ici.')
          setTab('login')
          setLoading(false)
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) { sessionStorage.removeItem('pending_checkout_plan'); throw signInError }
        // Try redirect — if component unmounts, PricingPage will pick it up from sessionStorage
        await redirectToCheckout(data.session)
      }
    } catch (err) {
      setError(err.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect.' : err.message)
      setLoading(false)
    }
  }

  if (!plan) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="relative w-full max-w-[480px] rounded-2xl border border-border bg-card overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/5 border border-border flex items-center justify-center text-muted-foreground hover:bg-white/10 hover:text-foreground cursor-pointer transition-all z-10">
          <X size={16} />
        </button>

        {/* Header */}
        <div className="px-7 pt-7 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-4" style={{ background: plan.bg, color: plan.color }}>
            {plan.icon}
            <span>{plan.name}</span>
          </div>
          <h2 className="text-xl font-bold mb-1.5">Dernière étape</h2>
          <p className="text-sm text-muted-foreground">Créez votre compte pour accéder au paiement sécurisé</p>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-7 pt-6 pb-0">
          {/* Tabs */}
          <div className="flex gap-0 mb-5 p-0.5 rounded-[10px]" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <button type="button" onClick={() => setTab('signup')} className={cn("flex-1 py-2.5 text-center text-[13px] font-semibold rounded-lg border-none cursor-pointer transition-all", tab === 'signup' ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:text-foreground")}> S'inscrire</button>
            <button type="button" onClick={() => setTab('login')} className={cn("flex-1 py-2.5 text-center text-[13px] font-semibold rounded-lg border-none cursor-pointer transition-all", tab === 'login' ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:text-foreground")}>Se connecter</button>
          </div>

          {tab === 'signup' && (
            <div className="mb-3.5">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Nom</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre nom" className="w-full rounded-[10px] border border-border bg-white/[0.04] px-3.5 py-3 text-sm text-foreground outline-none transition-all focus:border-primary focus:bg-white/[0.06] placeholder:text-muted-foreground/50" style={{ boxShadow: 'none' }} />
            </div>
          )}
          <div className="mb-3.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" className="w-full rounded-[10px] border border-border bg-white/[0.04] px-3.5 py-3 text-sm text-foreground outline-none transition-all focus:border-primary focus:bg-white/[0.06] placeholder:text-muted-foreground/50" style={{ boxShadow: 'none' }} />
          </div>
          <div className="mb-1">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Mot de passe</label>
            <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full rounded-[10px] border border-border bg-white/[0.04] px-3.5 py-3 text-sm text-foreground outline-none transition-all focus:border-primary focus:bg-white/[0.06] placeholder:text-muted-foreground/50" style={{ boxShadow: 'none' }} />
          </div>

          {error && <p className="text-xs text-red-400 mt-3 mb-0">{error}</p>}
        </form>

        {/* Footer */}
        <div className="px-7 pt-4 pb-6 flex flex-col gap-2">
          <div className="flex items-center justify-between px-4 py-3.5 rounded-xl border border-border" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <span className="text-[13px] font-semibold">Total aujourd'hui</span>
            <div><span className="text-xl font-extrabold">{plan.price}</span><span className="text-[11px] text-muted-foreground ml-1">TTC</span></div>
          </div>
          <button onClick={handleSubmit} disabled={loading} className="w-full py-3.5 rounded-xl font-semibold text-sm border-none cursor-pointer bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:-translate-y-0.5 transition-all active:translate-y-0 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
            {loading ? 'Redirection...' : tab === 'signup' ? 'S\'inscrire et payer' : 'Se connecter et payer'}
          </button>
          <div className="flex items-center justify-center gap-4 pt-3">
            {[
              { icon: <Shield size={12} />, label: 'SSL Stripe' },
              { icon: <Zap size={12} />, label: 'Sans engagement' },
              { icon: <Sparkles size={12} />, label: 'Accès immédiat' },
            ].map(t => (
              <span key={t.label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50">{t.icon}{t.label}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PricingPage({ onNavigate }) {
  const { plan: currentPlan } = useSubscription()
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [modalPlan, setModalPlan] = useState(null)
  const [checkoutLoading, setCheckoutLoading] = useState(null)
  const [pendingRedirect, setPendingRedirect] = useState(() => {
    // If user just logged in from modal, show loading immediately (no flash of pricing page)
    return !!sessionStorage.getItem('pending_checkout_plan')
  })

  const displayName = profile?.display_name || user?.email?.split('@')[0] || ''

  const callStripeCheckout = async (planId, session) => {
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ planId }),
      }
    )
    const data = await res.json()
    if (data?.url) window.location.href = data.url
    else throw new Error(data?.error || 'Erreur lors de la création du paiement')
  }

  const handleSubscribe = async (planId) => {
    if (user) {
      setCheckoutLoading(planId)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { setModalPlan(planId); setCheckoutLoading(null); return }
        await callStripeCheckout(planId, session)
      } catch (err) {
        alert(err.message)
        setCheckoutLoading(null)
        setPendingRedirect(false)
      }
    } else {
      setModalPlan(planId)
    }
  }

  // Auto-trigger checkout if user just logged in from the modal
  useEffect(() => {
    const pendingPlan = sessionStorage.getItem('pending_checkout_plan')
    if (user && pendingPlan && ['student', 'pro'].includes(pendingPlan)) {
      sessionStorage.removeItem('pending_checkout_plan')
      setPendingRedirect(true)
      handleSubscribe(pendingPlan)
    } else {
      setPendingRedirect(false)
    }
  }, [user])

  usePageMeta({
    title: 'Tarifs',
    description: 'Découvrez les tarifs de Make Your List : gratuit pour démarrer, Pro pour aller plus loin. Sans engagement, annulez quand vous voulez.',
    path: '/tarifs',
  })

  // Full-screen loading when redirecting to Stripe after login
  if (pendingRedirect) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-violet-500 mx-auto mb-4" />
          <p className="text-lg font-semibold mb-1">Redirection vers le paiement...</p>
          <p className="text-sm text-muted-foreground">Vous allez être redirigé vers Stripe</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1100px] mx-auto px-6 py-14 relative noise-overlay">

        {/* Aurora background */}
        <div className="aurora-bg" style={{ opacity: 0.6 }}><div className="aurora-orb" /></div>
        <div className="grid-pattern absolute inset-0 pointer-events-none" />

        {/* ── Hero ── */}
        <div className="text-center mb-16 relative z-10">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/[0.06] border border-white/10 text-sm font-medium mb-6 backdrop-blur-sm">
            <Sparkles size={14} className="text-violet-400" />
            <span className="text-foreground/70">Des tarifs transparents, sans mauvaise surprise</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-5 leading-tight">
            Choisissez le plan<br />
            <span className="animated-gradient-text">qui vous correspond</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
            Commencez gratuitement, passez Pro quand vous êtes prêt.{' '}
            <strong className="text-foreground">Aucun engagement, annulez quand vous voulez.</strong>
          </p>
        </div>


        {/* ── Plans grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-20 pt-4 relative z-10">
          {PLANS.map(p => {
            const isCurrent = p.id === currentPlan
            const price = p.price
            const period = '/mois'

            return (
              <div
                key={p.id}
                className={cn(
                  "glow-border card-shimmer relative",
                  p.popular && 'breathe-glow scale-[1.03] z-10 overflow-visible',
                )}
              >
              <div
                className={cn(
                  "relative flex flex-col rounded-2xl p-6 h-full z-10 transition-all duration-200",
                  p.popular
                    ? 'bg-gradient-to-b from-violet-500/[0.08] to-card'
                    : 'bg-card/80',
                  isCurrent && 'ring-2 ring-primary/40',
                  'hover:-translate-y-0.5'
                )}
              >
                {p.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs font-bold shadow-lg shadow-violet-500/40 whitespace-nowrap z-20">
                    Le plus populaire
                  </div>
                )}

                {/* Icon + Name */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: p.color + '20', color: p.color }}>
                    {p.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight">{p.name}</h3>
                    {p.badge && (
                      <span className="text-[0.6rem] px-2 py-0.5 rounded-full font-semibold" style={{ background: p.color + '20', color: p.color }}>
                        {p.badge}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-[0.8rem] text-muted-foreground mb-5 leading-relaxed">{p.description}</p>

                {/* Price */}
                <div className="mb-5">
                  {price === 0 ? (
                    <div className="text-3xl font-extrabold">0€</div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold">{price}€</span>
                      <span className="text-muted-foreground text-sm">{period}</span>
                    </div>
                  )}
                  {price === 0 && (
                    <div className="text-xs text-emerald-400 mt-1 font-medium">Pour toujours, sans carte bancaire</div>
                  )}
                </div>

                {/* CTA */}
                <button
                  disabled={isCurrent || checkoutLoading === p.id}
                  onClick={() => { if (price > 0 && !isCurrent) handleSubscribe(p.id); else if (price === 0 && !isCurrent) navigate(user ? '/taches' : '/inscription') }}
                  className={cn(
                    "w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 mb-6 border cursor-pointer",
                    isCurrent
                      ? 'bg-success/10 text-success border-success/30 cursor-default'
                      : p.popular
                        ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white border-transparent shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:-translate-y-0.5 active:translate-y-0'
                        : 'bg-white/[0.05] text-foreground border-white/15 hover:border-violet-500/40 hover:text-violet-400 hover:bg-violet-500/[0.05]'
                  )}
                >
                  {checkoutLoading === p.id ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : isCurrent ? '✓ Plan actuel' : price === 0 ? 'Commencer gratuitement' : 'S\'abonner'}
                </button>

                {/* Features */}
                <div className="flex flex-col gap-2.5 flex-1">
                  {p.features.map(f => (
                    <div key={f.text} className="flex items-start gap-2.5 text-[0.8rem]">
                      {f.included ? (
                        <div className="w-4 h-4 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0 mt-0.5">
                          <Check size={10} className="text-emerald-400" />
                        </div>
                      ) : (
                        <X size={14} className="text-muted-foreground/25 shrink-0 mt-0.5" />
                      )}
                      <span className={cn(f.included ? 'text-foreground/80' : 'text-muted-foreground/35', f.bold && 'font-semibold text-violet-400')}>{f.text}</span>
                    </div>
                  ))}
                </div>
              </div>
              </div>
            )
          })}
        </div>

        {/* ── Comparison table ── */}
        <div className="mb-20 relative z-10">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold tracking-tight mb-2">Comparaison détaillée</h2>
            <p className="text-muted-foreground text-sm">Voyez exactement ce que chaque plan inclut.</p>
          </div>
          <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/[0.02]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left px-5 py-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Fonctionnalité</th>
                    {['Free', 'Étudiant', 'Pro'].map(name => (
                      <th key={name} className="text-center px-4 py-4 font-bold text-sm">{name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row, i) => (
                    <tr key={row.label} className={cn("border-b border-white/5 transition-colors hover:bg-white/[0.03]", i === COMPARISON_ROWS.length - 1 && 'border-b-0')}>
                      <td className="px-5 py-3.5 font-medium text-foreground">{row.label}</td>
                      {['free', 'student', 'pro'].map(planKey => {
                        const val = row[planKey]
                        return (
                          <td key={planKey} className="text-center px-4 py-3.5">
                            {val === true ? <div className="inline-flex w-5 h-5 rounded-full bg-emerald-500/15 items-center justify-center"><Check size={12} className="text-emerald-400" /></div> :
                             val === false ? <X size={16} className="inline text-muted-foreground/20" /> :
                             <span className={cn("font-semibold", val === 'Illimité' && 'text-violet-400')}>{val}</span>}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Étudiant highlight ── */}
        <div className="mb-20 relative z-10">
          <div className="relative rounded-2xl border border-[#4dabf7]/30 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#4dabf7]/10 via-[#4dabf7]/5 to-transparent pointer-events-none" />
            <div className="relative p-8 md:p-10">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-[#4dabf7]/20 flex items-center justify-center shrink-0">
                  <GraduationCap size={32} className="text-[#4dabf7]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">Étudiant ? Profitez de -75% sur le Pro</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                    Toutes les fonctionnalités pour seulement <strong className="text-foreground">2,49€/mois</strong>.
                    Organisez vos cours, projets et révisions sans vous ruiner.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {['5 projets', '15 listes', 'API complète', 'Jusqu\'à 3 membres'].map(item => (
                      <span key={item} className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4dabf7] bg-[#4dabf7]/10 px-3 py-1.5 rounded-full border border-[#4dabf7]/20">
                        <Check size={12} /> {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Trust / Security ── */}
        <div className="mb-20 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: <Shield size={22} />, color: '#22c55e', gradient: 'from-emerald-500/10 to-teal-500/5', title: 'Données sécurisées', desc: 'Hébergement en Europe (PostgreSQL managé), connexions chiffrées TLS, Row Level Security sur chaque table.' },
              { icon: <Zap size={22} />, color: '#f59e0b', gradient: 'from-amber-500/10 to-orange-500/5', title: 'Pas d\'engagement', desc: 'Changez de plan ou annulez à tout moment. Vos données restent accessibles même après un downgrade.' },
              { icon: <Sparkles size={22} />, color: '#8b5cf6', gradient: 'from-violet-500/10 to-purple-500/5', title: 'Mises à jour continues', desc: 'Nouvelles fonctionnalités régulières. Vous bénéficiez automatiquement de chaque amélioration.' },
            ].map(item => (
              <div key={item.title} className={`rounded-2xl border border-white/10 bg-gradient-to-br ${item.gradient} p-6 hover:border-white/20 transition-all hover:-translate-y-0.5`}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: item.color + '20', color: item.color }}>
                  {item.icon}
                </div>
                <h4 className="font-bold mb-1.5">{item.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── FAQ ── */}
        <div className="mb-16 relative z-10">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold tracking-tight mb-2">Questions fréquentes</h2>
            <p className="text-muted-foreground text-sm">Tout ce que vous devez savoir avant de choisir.</p>
          </div>
          <div className="max-w-[720px] mx-auto flex flex-col gap-3">
            {FAQ.map(item => <FaqItem key={item.q} q={item.q} a={item.a} />)}
          </div>
        </div>

        {/* ── CTA bottom ── */}
        <div className="relative z-10 text-center rounded-2xl border border-violet-500/25 overflow-hidden p-6 md:p-10">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-pink-500/5 to-amber-500/5 pointer-events-none" />
          <div className="relative">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Prêt à <span className="animated-gradient-text">transformer votre productivité</span> ?</h2>
            <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
              Commencez avec le plan gratuit. Aucune carte bancaire requise.
              Passez en Pro quand vous êtes prêt.
            </p>
            {onNavigate && (
              <Link
                to="/inscription"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold text-sm no-underline shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 hover:-translate-y-0.5 transition-all active:translate-y-0"
              >
                Commencer gratuitement <ArrowRight size={16} />
              </Link>
            )}
            <p className="text-xs text-muted-foreground mt-4">
              Plan actuel : <strong className="text-violet-400">{currentPlan === 'free' ? 'Free' : currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}</strong>
            </p>
          </div>
        </div>
      </div>
      {modalPlan && <AuthModal planId={modalPlan} onClose={() => setModalPlan(null)} />}
      <Footer />
    </div>
  )
}
