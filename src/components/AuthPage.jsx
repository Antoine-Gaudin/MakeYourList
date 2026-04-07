import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { usePageMeta } from '../hooks/usePageMeta'
import {
  Mail, Lock, User, ArrowRight, Eye, EyeOff,
  CheckSquare, StickyNote, Columns3, Share2, Zap, Shield, Code2,
  Star, Layers, FolderKanban, ChevronRight, Play, ArrowDown,
  Rocket, Globe, MousePointerClick, TrendingUp, Clock, Heart, Check, Download,
  Smartphone, Menu, X
} from 'lucide-react'
import PricingPage from './PricingPage'
import FeaturesPage from './FeaturesPage'
import FeatureDetailPage, { FEATURE_KEYS } from './FeatureDetailPage'
import MyProjectsPage from './MyProjectsPage'
import Footer from './Footer'
import { MentionsLegales, Confidentialite, CGU } from './LegalPages'

const ROUTE_MAP = {
  '/': 'landing',
  '/decouvrir': 'features',
  '/tarifs': 'pricing',
  '/projets': 'projects',
  '/connexion': 'login',
  '/inscription': 'signup',
  '/mentions-legales': 'mentions-legales',
  '/confidentialite': 'confidentialite',
  '/cgu': 'cgu',
  '/abonnement': 'checkout',
}
const ROUTE_MAP_REVERSE = Object.fromEntries(Object.entries(ROUTE_MAP).map(([k, v]) => [v, k]))

function pageFromPath(pathname) {
  if (ROUTE_MAP[pathname]) return ROUTE_MAP[pathname]
  const featureMatch = pathname.match(/^\/fonctionnalite\/([a-z-]+)$/)
  if (featureMatch) return `feature-${featureMatch[1]}`
  return 'landing'
}

function pathFromPage(page) {
  if (ROUTE_MAP_REVERSE[page]) return ROUTE_MAP_REVERSE[page]
  if (page.startsWith('feature-')) return `/fonctionnalite/${page.replace('feature-', '')}`
  return '/'
}

export default function AuthPage() {
  const { signIn, signUp, user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const page = pageFromPath(location.pathname)
  const setPage = (p) => { navigate(pathFromPage(p)) }

  // Scroll en haut à chaque changement de page
  useEffect(() => { window.scrollTo(0, 0) }, [location.pathname])

  // PWA install prompt
  const [canInstall, setCanInstall] = useState(!!window.__pwaInstallPrompt)
  useEffect(() => {
    const handler = () => setCanInstall(true)
    window.addEventListener('pwa-install-available', handler)
    return () => window.removeEventListener('pwa-install-available', handler)
  }, [])
  const handleInstall = async () => {
    const prompt = window.__pwaInstallPrompt
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') { window.__pwaInstallPrompt = null; setCanInstall(false) }
  }

  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  // Fermer le menu mobile à chaque changement de page
  useEffect(() => { setMobileNavOpen(false) }, [location.pathname])

  const userDisplayName = profile?.display_name || user?.email?.split('@')[0] || ''
  const avatarUrl = profile?.avatar_url

  // Si non connecté et page checkout → rediriger vers inscription avec le plan
  useEffect(() => {
    if (page === 'checkout') {
      const plan = new URLSearchParams(location.search).get('plan')
      navigate(`/inscription${plan ? `?plan=${plan}` : ''}`, { replace: true })
    }
  }, [page, location.search, navigate])

  const SEO = {
    landing: { title: 'Productivité multipliée', description: 'Tâches, Kanban, notes et collaboration temps réel — tout réuni dans un seul espace de travail gratuit.', path: '/' },
    login: { title: 'Connexion', description: 'Connectez-vous à Make Your List pour retrouver vos projets, tâches et notes.', path: '/connexion' },
    signup: { title: 'Créer un compte', description: 'Créez votre compte Make Your List gratuitement en 30 secondes. Sans carte bancaire.', path: '/inscription' },
  }
  const seo = SEO[page] || SEO.landing
  usePageMeta(seo)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const searchParams = new URLSearchParams(location.search)
  const pendingPlan = searchParams.get('plan')
  const emailConfirmed = searchParams.get('confirmed') === 'true'

  useEffect(() => {
    if (emailConfirmed && page === 'login') {
      setSuccess('Email confirmé ! Vous pouvez maintenant vous connecter.')
    }
  }, [emailConfirmed, page])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (page === 'login') {
        sessionStorage.setItem('ws_just_logged_in', '1')
        const { error } = await signIn(email, password)
        if (error) { sessionStorage.removeItem('ws_just_logged_in'); setError(error.message?.includes('Invalid login') ? 'Email ou mot de passe incorrect.' : 'Erreur de connexion.'); setLoading(false); return }
        if (pendingPlan) { navigate(`/abonnement?plan=${encodeURIComponent(pendingPlan)}`); setLoading(false); return }
      } else {
        if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères'); setLoading(false); return }
        const { error } = await signUp(email, password, displayName || email.split('@')[0])
        if (error) { setError(error.message?.includes('already registered') ? 'Cet email est déjà utilisé.' : 'Erreur lors de l\'inscription.'); setLoading(false); return }
        setSuccess('Compte créé ! Vérifiez votre email pour confirmer.')
        setTimeout(() => {
          navigate(`/connexion${pendingPlan ? `?plan=${encodeURIComponent(pendingPlan)}` : ''}`)
        }, 2000)
      }
    } catch (err) {
      setError('Erreur de connexion. Vérifiez votre réseau.')
    }
    setLoading(false)
  }



  const features = [
    { icon: <CheckSquare size={24} />, title: 'Listes de tâches', desc: 'Organisez tout avec des listes puissantes : priorités, tags, sous-tâches, pièces jointes et dates limites.', color: '#8b5cf6', gradient: 'from-violet-500 to-purple-600', slug: 'listes' },
    { icon: <Columns3 size={24} />, title: 'Tableaux Kanban', desc: 'Glissez-déposez vos tâches entre colonnes personnalisables. Votre workflow, visible en un coup d\'œil.', color: '#3b82f6', gradient: 'from-blue-500 to-cyan-500', slug: 'kanban' },
    { icon: <StickyNote size={24} />, title: 'Notes', desc: 'Éditeur riche avec 8 couleurs, dossiers, liaison avec vos tâches et compteur de mots intégré.', color: '#10b981', gradient: 'from-emerald-500 to-teal-500', slug: 'notes' },
    { icon: <Share2 size={24} />, title: 'Partage', desc: 'Partagez vos listes et notes par lien public ou invitez par email avec des rôles (propriétaire, éditeur, lecteur).', color: '#f59e0b', gradient: 'from-amber-500 to-orange-500', slug: 'partage' },
    { icon: <Download size={24} />, title: 'Export de notes', desc: 'Exportez vos notes en HTML, PDF ou Word (.doc). Le format HTML est gratuit, PDF et Word dès le plan Pro.', color: '#ec4899', gradient: 'from-pink-500 to-rose-500', slug: 'export' },
    { icon: <Code2 size={24} />, title: 'API REST', desc: 'Intégrez vos données partout : API complète avec clé personnelle, documentation interactive et exemples cURL.', color: '#14b8a6', gradient: 'from-teal-500 to-cyan-500', slug: 'api' }
  ]

  const stats = [
    { value: '100%', label: 'Gratuit pour démarrer', icon: <Rocket size={20} /> },
    { value: '∞', label: 'Projets illimités (Pro)', icon: <FolderKanban size={20} /> },
    { value: '6', label: 'Outils intégrés', icon: <Layers size={20} /> },
    { value: '3', label: 'Formats d\'export', icon: <Download size={20} /> }
  ]

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">

      {/* ═══ NAVBAR ═══ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 no-underline" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5.5 12.5 L9.5 16.5 L18.5 6.5"/></svg>
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">Make Your List</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden sm:flex items-center gap-3">
            <Link to="/decouvrir" className={`px-4 py-2 text-sm font-medium no-underline transition-colors ${page === 'features' || page.startsWith('feature-') ? 'text-violet-400' : 'text-muted-foreground hover:text-foreground'}`}>Découvrir</Link>
            <Link to="/tarifs" className={`px-4 py-2 text-sm font-medium no-underline transition-colors ${page === 'pricing' ? 'text-violet-400' : 'text-muted-foreground hover:text-foreground'}`}>Tarifs</Link>
            {user ? (
              <>
                <Link to="/taches" className="px-4 py-2 text-sm font-medium no-underline text-muted-foreground hover:text-foreground transition-colors">Mon app</Link>
                <div className="flex items-center gap-2.5 pl-2 border-l border-white/10">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover border border-white/10" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                      {userDisplayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm font-medium text-foreground">{userDisplayName}</span>
                </div>
              </>
            ) : (
              <>
                <Link to="/connexion" className={`px-5 py-2 text-sm font-medium no-underline transition-colors ${page === 'login' ? 'text-violet-400' : 'text-muted-foreground hover:text-foreground'}`}>Connexion</Link>
                <Link to="/inscription" className="px-5 py-2.5 text-sm font-semibold bg-gradient-to-r from-violet-500 to-purple-600 text-white no-underline rounded-xl shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all hover:scale-105">Commencer gratuitement</Link>
              </>
            )}
          </div>

          {/* Mobile: avatar (si connecté) + hamburger */}
          <div className="flex sm:hidden items-center gap-3">
            {user && profile?.avatar_url && (
              <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover border border-white/10" />
            )}
            <button
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.06] border border-white/10 text-foreground cursor-pointer"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              aria-label="Menu"
            >
              {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileNavOpen && (
          <div className="sm:hidden border-t border-white/5 bg-background/95 backdrop-blur-xl">
            <div className="px-4 py-4 flex flex-col gap-1">
              <Link to="/decouvrir" className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium no-underline transition-colors ${page === 'features' || page.startsWith('feature-') ? 'bg-violet-500/15 text-violet-400' : 'text-muted-foreground hover:bg-white/[0.06] hover:text-foreground'}`} onClick={() => setMobileNavOpen(false)}>
                <Layers size={16} /> Découvrir
              </Link>
              <Link to="/tarifs" className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium no-underline transition-colors ${page === 'pricing' ? 'bg-violet-500/15 text-violet-400' : 'text-muted-foreground hover:bg-white/[0.06] hover:text-foreground'}`} onClick={() => setMobileNavOpen(false)}>
                <Zap size={16} /> Tarifs
              </Link>
              {user ? (
                <>
                  <Link to="/taches" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium no-underline text-muted-foreground hover:bg-white/[0.06] hover:text-foreground transition-colors" onClick={() => setMobileNavOpen(false)}>
                    <CheckSquare size={16} /> Mon application
                  </Link>
                  <div className="mt-2 pt-3 border-t border-white/10 flex items-center gap-3 px-4 py-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {userDisplayName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-foreground truncate">{userDisplayName}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="h-px bg-white/10 my-1" />
                  <Link to="/connexion" className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium no-underline transition-colors ${page === 'login' ? 'bg-violet-500/15 text-violet-400' : 'text-muted-foreground hover:bg-white/[0.06] hover:text-foreground'}`} onClick={() => setMobileNavOpen(false)}>
                    <Mail size={16} /> Connexion
                  </Link>
                  <Link to="/inscription" className="flex items-center justify-center gap-2 px-4 py-3 mt-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white no-underline rounded-xl text-sm font-semibold shadow-lg shadow-violet-500/25" onClick={() => setMobileNavOpen(false)}>
                    <Rocket size={16} /> Commencer gratuitement
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {page === 'features' && <div className="pt-16"><FeaturesPage onNavigate={(p) => { if (p === 'pricing') setPage('pricing'); else if (p === 'features') setPage('features'); else if (p === 'projects') setPage('projects'); else { setPage('landing'); } }} /></div>}
      {page === 'pricing' && <div className="pt-16"><PricingPage onNavigate={(p) => { if (p === 'features') setPage('features'); else if (p === 'pricing') setPage('pricing'); else if (p === 'projects') setPage('projects'); else { setPage('landing'); } }} /></div>}
      {page === 'projects' && <div className="pt-16"><MyProjectsPage onNavigate={(p) => { if (p === 'features') setPage('features'); else if (p === 'pricing') setPage('pricing'); else if (p === 'projects') setPage('projects'); else { setPage('landing'); } }} /></div>}
      {page.startsWith('feature-') && <div className="pt-16"><FeatureDetailPage featureKey={page.replace('feature-', '')} onNavigate={(p) => { if (p === 'features') setPage('features'); else if (p === 'pricing') setPage('pricing'); else if (p === 'projects') setPage('projects'); else if (p.startsWith('feature-')) setPage(p); else { setPage('landing'); } }} /></div>}

      {page === 'mentions-legales' && <div className="pt-16"><MentionsLegales /></div>}
      {page === 'confidentialite' && <div className="pt-16"><Confidentialite /></div>}
      {page === 'cgu' && <div className="pt-16"><CGU /></div>}

      {(page === 'login' || page === 'signup') && (
      <div className="pt-16 min-h-screen relative overflow-hidden noise-overlay">
        <div className="aurora-bg"><div className="aurora-orb" /></div>
        <div className="grid-pattern absolute inset-0 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-6 py-16">
          {/* Floating decorative elements */}
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute rounded-full bg-violet-500/10 blur-2xl pointer-events-none" style={{
              width: `${60 + i * 40}px`, height: `${60 + i * 40}px`,
              top: `${10 + (i * 17) % 80}%`, left: `${5 + (i * 23) % 90}%`,
              animation: `float ${6 + i * 1.5}s ease-in-out infinite`, animationDelay: `${i * 0.8}s`,
            }} />
          ))}

          {pendingPlan && (
            <div className="relative z-10 mb-6 px-5 py-3 bg-violet-500/10 border border-violet-500/25 rounded-xl text-center max-w-md">
              <p className="text-sm text-violet-300">
                {page === 'login' ? 'Connectez-vous' : 'Creez votre compte'} pour continuer vers l'abonnement <strong className="text-violet-200">{pendingPlan === 'student' ? 'Etudiant' : pendingPlan === 'pro' ? 'Pro' : pendingPlan}</strong>
              </p>
            </div>
          )}

          <div className="text-center mb-10 relative z-10">
            <div className="inline-flex items-center gap-3 mb-6 cursor-pointer" onClick={() => { setPage('landing'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-violet-500/30">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5.5 12.5 L9.5 16.5 L18.5 6.5"/></svg>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">Make Your List</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold mb-3">
              {page === 'login' ? (
                <>Bon retour sur <span className="animated-gradient-text">Make Your List</span></>
              ) : (
                <>Rejoignez <span className="animated-gradient-text">Make Your List</span> gratuitement</>
              )}
            </h1>
            <p className="text-muted-foreground text-base max-w-md mx-auto">
              {page === 'login'
                ? 'Connectez-vous pour retrouver vos projets, tâches et notes.'
                : 'Créez votre compte en 30 secondes. Gratuit, sans carte bancaire.'}
            </p>
          </div>

          <div className="w-full max-w-[440px] relative z-10">
            <div className="absolute -inset-8 bg-gradient-to-br from-violet-500/20 via-pink-500/10 to-blue-500/15 rounded-3xl blur-3xl" />
            <div className="glow-border glow-border-always relative z-10">
              <form onSubmit={handleSubmit} className="bg-card/90 backdrop-blur-xl rounded-2xl p-8 relative z-10">

                {page === 'signup' && (
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Nom</label>
                    <div className="relative"><User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Votre nom" className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-3 px-10 text-sm text-foreground outline-none focus:border-violet-500 focus:bg-white/[0.08] focus:shadow-[0_0_20px_rgba(139,92,246,0.15)] transition-all" />
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Email</label>
                  <div className="relative"><Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@exemple.com" required className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-3 px-10 text-sm text-foreground outline-none focus:border-violet-500 focus:bg-white/[0.08] focus:shadow-[0_0_20px_rgba(139,92,246,0.15)] transition-all" />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Mot de passe</label>
                  <div className="relative"><Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={8} className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-3 px-10 text-sm text-foreground outline-none focus:border-violet-500 focus:bg-white/[0.08] focus:shadow-[0_0_20px_rgba(139,92,246,0.15)] transition-all" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                  </div>
                </div>

                {error && <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">{error}</div>}
                {success && <div className="mb-4 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm text-emerald-400">{success}</div>}

                <button type="submit" disabled={loading} className="pulse-glow w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white border-none rounded-xl py-3.5 text-sm font-semibold cursor-pointer shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>{page === 'login' ? 'Se connecter' : "S'inscrire gratuitement"}<ArrowRight size={16} /></>}
                </button>

                <p className="text-center text-sm text-muted-foreground mt-5">
                  {page === 'login' ? "Pas encore de compte ? " : "Déjà un compte ? "}
                  <button type="button" onClick={() => { navigate(`${page === 'login' ? '/inscription' : '/connexion'}${pendingPlan ? `?plan=${pendingPlan}` : ''}`); setError(''); setSuccess('') }} className="text-violet-400 font-semibold bg-transparent border-none cursor-pointer hover:underline">{page === 'login' ? "S'inscrire" : "Se connecter"}</button>
                </p>
              </form>
            </div>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-10 relative z-10">
            {[
              { icon: <Shield size={14} />, text: 'Données sécurisées' },
              { icon: <Zap size={14} />, text: 'Accès instantané' },
              { icon: <Heart size={14} />, text: 'Gratuit pour toujours' },
            ].map((b, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground/70">
                <span className="text-violet-400">{b.icon}</span> {b.text}
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {page === 'landing' && (
      <>
      {/* ═══ HERO ═══ */}
      <section className="relative pt-20 pb-16 md:pt-32 md:pb-24 px-6 overflow-hidden noise-overlay">
        <div className="aurora-bg"><div className="aurora-orb" /></div>
        <div className="grid-pattern absolute inset-0 pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Twinkle dots */}
          <div className="absolute top-10 left-[10%] w-2 h-2 rounded-full bg-violet-400" style={{ animation: 'twinkle 3s ease infinite' }} />
          <div className="absolute top-32 right-[15%] w-1.5 h-1.5 rounded-full bg-pink-400" style={{ animation: 'twinkle 4s ease infinite 1s' }} />
          <div className="absolute bottom-20 left-[20%] w-2 h-2 rounded-full bg-blue-400" style={{ animation: 'twinkle 3.5s ease infinite 0.5s' }} />
          <div className="absolute bottom-32 right-[25%] w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation: 'twinkle 5s ease infinite 2s' }} />

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.06] border border-white/10 text-sm font-medium mb-8 backdrop-blur-sm">
            <div className="flex -space-x-2">
              {['#8b5cf6','#ec4899','#3b82f6','#10b981'].map((c,i) => (
                <div key={i} className="w-6 h-6 rounded-full border-2 border-background flex items-center justify-center text-[8px] text-white font-bold" style={{ background: c, zIndex: 4-i }}>{['A','M','T','S'][i]}</div>
              ))}
            </div>
            <span className="text-foreground/70">Rejoignez les premiers utilisateurs</span>
            <ArrowRight size={14} className="text-violet-400" />
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6">
            <span className="text-foreground">Votre productivité,</span><br />
            <span className="animated-gradient-text">multipliée par 10</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-4 leading-relaxed">
            Tâches, Kanban, notes, collaboration temps réel — tout réuni dans un seul espace de travail.{' '}
            <span className="text-foreground font-semibold">Gratuit pour commencer, puissant pour grandir.</span>
          </p>

          <p className="text-sm text-muted-foreground/60 mb-10 flex items-center justify-center gap-4">
            <span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-400" /> Sans carte bancaire</span>
            <span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-400" /> Setup en 30 secondes</span>
            <span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-400" /> Annulez quand vous voulez</span>
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <Link to="/inscription" className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white no-underline rounded-2xl text-base font-semibold pulse-glow transition-all hover:scale-105 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
              <Rocket size={20} /> Démarrer gratuitement <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/decouvrir" className="flex items-center gap-2 px-6 py-4 bg-white/[0.06] text-foreground no-underline border border-white/10 rounded-2xl text-base font-medium hover:bg-white/[0.12] hover:border-white/20 transition-all backdrop-blur-sm">
              <Play size={18} className="text-violet-400" /> Voir en action
            </Link>
            {canInstall && (
              <button onClick={handleInstall} className="flex items-center gap-2 px-6 py-4 bg-gradient-to-r from-emerald-500/15 to-teal-500/15 text-emerald-400 border border-emerald-500/25 rounded-2xl text-base font-medium hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all backdrop-blur-sm">
                <Smartphone size={18} /> Installer l'app
              </button>
            )}
          </div>

          {/* Mockup — FLOATING + ANIMATED GLOW BORDER */}
          <div className="relative max-w-4xl mx-auto float-slow">
            <div className="absolute -inset-8 bg-gradient-to-r from-violet-500/25 via-pink-500/15 to-blue-500/25 rounded-3xl blur-3xl opacity-60" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-20 pointer-events-none" />
            <div className="glow-border glow-border-always relative z-10">
              <div className="rounded-2xl bg-card/90 backdrop-blur-sm overflow-hidden shadow-2xl">
                <div className="flex items-center gap-2 px-4 py-3 bg-white/[0.04] border-b border-white/10">
                  <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500/80" /><div className="w-3 h-3 rounded-full bg-yellow-500/80" /><div className="w-3 h-3 rounded-full bg-green-500/80" /></div>
                  <div className="flex-1 flex justify-center"><div className="px-4 py-1 rounded-lg bg-white/[0.06] text-xs text-muted-foreground">makeyourlist.app</div></div>
                </div>
                <div className="flex h-[340px]">
                  <div className="w-52 bg-white/[0.02] border-r border-white/8 p-4 flex flex-col gap-2 shrink-0 max-sm:hidden">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center"><FolderKanban size={12} className="text-white" /></div>
                      <span className="text-xs font-bold text-foreground">Mon projet</span>
                    </div>
                    {['Tâches','Kanban','Notes','Favoris'].map((item,i) => (
                      <div key={item} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs ${i === 0 ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium shadow-md shadow-violet-500/20' : 'text-muted-foreground hover:bg-white/5'}`}>
                        {[<CheckSquare size={13} key="cs" />,<Columns3 size={13} key="c3" />,<StickyNote size={13} key="sn" />,<Star size={13} key="st" />][i]}{item}
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 p-5">
                    <div className="flex items-center justify-between mb-5">
                      <div><div className="text-sm font-bold text-foreground">Mes tâches</div><div className="text-[0.65rem] text-muted-foreground">3 en cours · 2 terminées</div></div>
                      <div className="px-3 py-1.5 rounded-lg bg-violet-500/20 text-violet-400 text-xs font-semibold border border-violet-500/20">+ Nouvelle</div>
                    </div>
                    {[
                      { text: 'Finaliser le design', status: 'done', color: '#10b981' },
                      { text: 'Réunion équipe marketing', status: 'progress', color: '#3b82f6' },
                      { text: 'Déployer la v2.0', status: 'progress', color: '#f59e0b' },
                      { text: 'Écrire la documentation', status: 'todo', color: '#8b5cf6' },
                    ].map((task,i) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1.5 bg-white/[0.03] border border-white/6 hover:border-white/12 transition-colors">
                        <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center shrink-0 ${task.status === 'done' ? 'bg-emerald-500 border-emerald-500' : 'border-white/20'}`}>{task.status === 'done' && <span className="text-white text-[8px]">✓</span>}</div>
                        <span className={`text-xs flex-1 ${task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{task.text}</span>
                        <div className="w-2 h-2 rounded-full" style={{ background: task.color }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-center mt-16 relative z-10"><ArrowDown size={20} className="text-violet-400/40 animate-bounce" /></div>
      </section>

      {/* ═══ STATS ═══ */}
      <section className="py-14 border-y border-white/6 relative spotlight">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 relative z-10">
          {stats.map((stat,i) => (
            <div key={i} className="text-center group">
              <div className="flex items-center justify-center gap-2 text-violet-400 mb-2 group-hover:scale-125 transition-transform duration-300">{stat.icon}</div>
              <div className="text-2xl font-extrabold text-foreground">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ APPLICATION MOBILE ═══ */}
      <section className="py-16 md:py-28 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/[0.03] to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/25 text-blue-400 text-xs font-semibold mb-5"><Smartphone size={12} /> APPLICATION MOBILE</div>
              <h2 className="text-3xl md:text-4xl font-extrabold mb-5">Emportez votre workspace <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">partout avec vous</span></h2>
              <p className="text-muted-foreground text-base mb-8 leading-relaxed">Installez Make Your List en un tap depuis votre navigateur. <strong className="text-foreground">Aucun store, aucun téléchargement lourd.</strong> L'app fonctionne même hors-ligne.</p>
              <div className="flex flex-col gap-3 mb-8">
                {['Installation instantanée depuis le navigateur','Fonctionne hors-ligne avec synchronisation','Notifications et mises à jour automatiques','Compatible iOS, Android et Desktop'].map((item,i) => (
                  <div key={i} className="flex items-center gap-3 text-sm"><div className="w-6 h-6 rounded-lg bg-blue-500/15 flex items-center justify-center text-blue-400 shrink-0"><Check size={14} /></div><span className="text-foreground/80">{item}</span></div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                {canInstall ? (
                  <button onClick={handleInstall} className="group flex items-center gap-3 px-7 py-3.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-2xl text-sm font-semibold transition-all hover:scale-105 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                    <Download size={18} /> Installer l'application
                  </button>
                ) : (
                  <Link to="/fonctionnalite/mobile" className="group flex items-center gap-3 px-7 py-3.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white no-underline rounded-2xl text-sm font-semibold transition-all hover:scale-105 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                    <Smartphone size={18} /> En savoir plus
                  </Link>
                )}
              </div>
            </div>
            <div className="relative float-slow" style={{ animationDelay: '1.5s' }}>
              <div className="absolute -inset-6 bg-gradient-to-br from-blue-500/20 to-cyan-500/15 rounded-3xl blur-3xl" />
              <div className="glow-border glow-border-always relative z-10">
                <div className="rounded-2xl bg-card/80 backdrop-blur-sm p-6">
                  <div className="mx-auto w-56 relative">
                    <div className="rounded-[2rem] border-4 border-white/15 bg-background overflow-hidden shadow-2xl">
                      <div className="h-6 bg-white/[0.04] flex items-center justify-center"><div className="w-16 h-1.5 rounded-full bg-white/10" /></div>
                      <div className="p-3 space-y-2">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5.5 12.5 L9.5 16.5 L18.5 6.5"/></svg>
                          </div>
                          <span className="text-[0.6rem] font-bold text-foreground">Make Your List</span>
                          <div className="ml-auto w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center"><User size={10} className="text-violet-400" /></div>
                        </div>
                        {['Design system v2','Préparer la démo','Brief client final'].map((t,i) => (
                          <div key={i} className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-white/[0.04] border border-white/8">
                            <div className={`w-3.5 h-3.5 rounded-md border-2 flex items-center justify-center shrink-0 ${i === 2 ? 'border-emerald-400 bg-emerald-400' : 'border-white/20'}`}>
                              {i === 2 && <Check size={8} className="text-white" />}
                            </div>
                            <span className={`text-[0.55rem] ${i === 2 ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{t}</span>
                          </div>
                        ))}
                        <div className="flex gap-1.5 mt-2">
                          {[{l:'Tâches',a:true},{l:'Kanban',a:false},{l:'Notes',a:false}].map((tab,i) => (
                            <div key={i} className={`flex-1 text-center py-1.5 rounded-lg text-[0.5rem] font-medium ${tab.a ? 'bg-violet-500/20 text-violet-400' : 'text-muted-foreground/50'}`}>{tab.l}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="absolute -right-8 top-8 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/20 text-[0.55rem] text-emerald-400 font-semibold shadow-lg">Hors-ligne ✓</div>
                    <div className="absolute -left-6 bottom-16 px-2.5 py-1 rounded-lg bg-violet-500/15 border border-violet-500/20 text-[0.55rem] text-violet-400 font-semibold shadow-lg">PWA</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" className="py-16 md:py-28 px-6 relative spotlight noise-overlay">
        <div className="aurora-bg" style={{ opacity: 0.5 }}><div className="aurora-orb" /></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/10 text-emerald-400 text-xs font-semibold mb-5 backdrop-blur-sm"><Layers size={12} /> TOUT-EN-UN</div>
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4">6 outils puissants, <span className="animated-gradient-text">une seule app</span></h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">Fini les 10 onglets ouverts. Tout est réuni dans Make Your List.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f,i) => (
              <Link key={i} to={`/fonctionnalite/${f.slug}`} className="glow-border card-shimmer group no-underline" style={{ animationDelay: `${i*0.1}s` }}>
                <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-7 h-full relative z-10 transition-all duration-300 group-hover:-translate-y-1">
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: `radial-gradient(400px circle at 50% 0%, ${f.color}12, transparent)` }} />
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.gradient} flex items-center justify-center text-white mb-5 shadow-lg relative z-10`} style={{ boxShadow: `0 8px 30px ${f.color}40` }}>{f.icon}</div>
                  <h3 className="text-lg font-bold text-foreground mb-2 relative z-10">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed relative z-10">{f.desc}</p>
                  <div className="mt-4 flex items-center gap-1 text-xs font-medium relative z-10 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: f.color }}>En savoir plus <ArrowRight size={12} /></div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ KANBAN SHOWCASE ═══ */}
      <section className="py-16 md:py-28 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/[0.04] via-transparent to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/25 text-blue-400 text-xs font-semibold mb-5"><Columns3 size={12} /> VUE KANBAN</div>
              <h2 className="text-3xl md:text-4xl font-extrabold mb-5">Votre workflow, <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">enfin visible</span></h2>
              <p className="text-muted-foreground text-base mb-8 leading-relaxed">Passez d'une vue liste à une vue Kanban en un clic. <strong className="text-foreground">Tout est fluide, tout est intuitif.</strong></p>
              <div className="flex flex-col gap-3">
                {['Drag & drop naturel et réactif','Filtres et tri avancés','Tags et priorités colorés','Mélangez tâches et notes'].map((item,i) => (
                  <div key={i} className="flex items-center gap-3 text-sm"><div className="w-6 h-6 rounded-lg bg-blue-500/15 flex items-center justify-center text-blue-400 shrink-0"><Check size={14} /></div><span className="text-foreground/80">{item}</span></div>
                ))}
              </div>
            </div>
            <div className="relative float-slow">
              <div className="absolute -inset-6 bg-gradient-to-br from-blue-500/20 to-cyan-500/15 rounded-3xl blur-3xl" />
              <div className="glow-border glow-border-always relative z-10">
                <div className="rounded-2xl bg-card/80 backdrop-blur-sm p-5">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { title: 'A faire', color: '#8b5cf6', tasks: ['Maquettes UI','Brief client'] },
                      { title: 'En cours', color: '#3b82f6', tasks: ['Intégration API','Tests unitaires'] },
                      { title: 'Terminé', color: '#10b981', tasks: ['Design system','Setup projet'] },
                    ].map((col,ci) => (
                      <div key={ci} className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 px-2 py-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: col.color, boxShadow: `0 0 12px ${col.color}60` }} />
                          <span className="text-xs font-bold text-foreground">{col.title}</span>
                        </div>
                        {col.tasks.map((task,ti) => (
                          <div key={ti} className="px-3 py-3 bg-white/[0.04] rounded-xl border border-white/6 text-xs text-foreground/80">{task}</div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ COLLAB SHOWCASE ═══ */}
      <section className="py-16 md:py-28 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-500/[0.03] to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="order-2 lg:order-1 relative float-slow" style={{ animationDelay: '1s' }}>
              <div className="absolute -inset-6 bg-gradient-to-br from-amber-500/20 to-orange-500/15 rounded-3xl blur-3xl" />
              <div className="glow-border glow-border-always relative z-10">
                <div className="rounded-2xl bg-card/80 backdrop-blur-sm p-6">
                  <div className="flex items-center gap-3 mb-5"><div className="text-sm font-bold text-foreground">Membres du projet</div><span className="text-[0.6rem] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold ml-auto">3 en ligne</span></div>
                  {[
                    { name: 'Antoine G.', email: 'antoine@email.com', role: 'Propriétaire', color: '#8b5cf6', letter: 'A' },
                    { name: 'Marie L.', email: 'marie@email.com', role: 'Éditeur', color: '#ec4899', letter: 'M' },
                    { name: 'Thomas R.', email: 'thomas@email.com', role: 'Lecteur', color: '#3b82f6', letter: 'T' },
                  ].map((member,i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-3 rounded-xl mb-1.5 hover:bg-white/[0.04] transition-colors">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: member.color }}>{member.letter}</div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-card" />
                      </div>
                      <div className="flex-1 min-w-0"><div className="text-xs font-medium text-foreground">{member.name}</div><div className="text-[0.6rem] text-muted-foreground">{member.email}</div></div>
                      <span className="text-[0.6rem] font-semibold px-2 py-1 rounded-md bg-white/6 text-muted-foreground">{member.role}</span>
                    </div>
                  ))}
                  <div className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-white/12 text-xs text-muted-foreground cursor-pointer hover:border-violet-500/30 hover:text-violet-400 transition-colors"><Share2 size={14} /> Inviter un membre...</div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400 text-xs font-semibold mb-5"><Share2 size={12} /> PARTAGE</div>
              <h2 className="text-3xl md:text-4xl font-extrabold mb-5">Travaillez <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">ensemble, en temps réel</span></h2>
              <p className="text-muted-foreground text-base mb-8 leading-relaxed">Invitez votre équipe par email, attribuez des rôles précis. <strong className="text-foreground">Synchronisation instantanée.</strong></p>
              <div className="flex flex-col gap-3">
                {['Invitation par email en 1 clic','Rôles : Propriétaire, Éditeur, Lecteur','Synchronisation temps réel','Journal d\'activité partagé'].map((item,i) => (
                  <div key={i} className="flex items-center gap-3 text-sm"><div className="w-6 h-6 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400 shrink-0"><Check size={14} /></div><span className="text-foreground/80">{item}</span></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ TRUST STRIP ═══ */}
      <section className="py-14 md:py-24 px-6 relative spotlight">
        <div className="absolute inset-0 border-y border-white/6 pointer-events-none" />
        <div className="aurora-bg" style={{ opacity: 0.4 }}><div className="aurora-orb" /></div>
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-3">Conçu pour être <span className="animated-gradient-text">fiable et rapide</span></h2>
            <p className="text-muted-foreground">Les fondations sur lesquelles vous pouvez compter.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: <Shield size={28} />, title: 'Sécurisé', desc: 'Données chiffrées TLS, hébergement européen, Row Level Security sur chaque table.', color: '#10b981', gradient: 'from-emerald-500/15 to-teal-500/5' },
              { icon: <Globe size={28} />, title: 'Partout avec vous', desc: 'Desktop, tablette, mobile. Installez la PWA et travaillez même hors-ligne.', color: '#3b82f6', gradient: 'from-blue-500/15 to-cyan-500/5' },
              { icon: <MousePointerClick size={28} />, title: 'Zéro friction', desc: 'Interface pensée pour la vitesse. Raccourcis clavier, actions par lot, recherche globale.', color: '#f59e0b', gradient: 'from-amber-500/15 to-orange-500/5' },
            ].map((item,i) => (
              <div key={i} className="glow-border card-shimmer">
                <div className={`flex flex-col items-center text-center rounded-2xl bg-gradient-to-br ${item.gradient} p-8 h-full relative z-10 transition-all hover:-translate-y-1`}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: item.color + '20', color: item.color, boxShadow: `0 0 30px ${item.color}25` }}>{item.icon}</div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA FINAL ═══ */}
      <section className="py-16 md:py-28 px-6 relative noise-overlay">
        <div className="aurora-bg"><div className="aurora-orb" /></div>
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold mb-4">Prêt à <span className="animated-gradient-text">passer au niveau supérieur</span> ?</h2>
          <p className="text-muted-foreground text-lg mb-10">Créez votre compte en 30 secondes. <strong className="text-foreground">C'est gratuit, pour toujours.</strong></p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/inscription" className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white no-underline rounded-2xl text-base font-semibold pulse-glow transition-all hover:scale-105 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
              <Rocket size={20} /> S'inscrire gratuitement <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/connexion" className="flex items-center gap-2 px-6 py-4 bg-white/[0.06] text-foreground no-underline border border-white/10 rounded-2xl text-base font-medium hover:bg-white/[0.12] hover:border-white/20 transition-all backdrop-blur-sm">
              <Mail size={18} className="text-violet-400" /> Se connecter
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 mt-8">
            {[
              { icon: <Shield size={14} />, text: 'Données sécurisées' },
              { icon: <Zap size={14} />, text: 'Accès instantané' },
              { icon: <Heart size={14} />, text: 'Gratuit pour toujours' },
            ].map((b, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground/70">
                <span className="text-violet-400">{b.icon}</span> {b.text}
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
      </>
      )}
    </div>
  )
}
