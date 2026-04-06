import { useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { Check, Crown, GraduationCap, Zap, ArrowLeft, Loader2, Shield, CreditCard, Lock, Clock, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useSubscription } from '../contexts/SubscriptionContext'
import { usePageMeta } from '../hooks/usePageMeta'
import { cn } from '../lib/utils'
import Footer from './Footer'
import { PRICE_IDS } from '../lib/constants'

const PLAN_DETAILS = {
  student: {
    name: 'Étudiant',
    price: 2.49,
    icon: <GraduationCap size={24} />,
    color: '#4dabf7',
    gradient: 'from-sky-500 to-blue-600',
    shadowColor: 'shadow-sky-500/25',
    description: 'Toute la puissance de Make Your List au prix d\'un café par mois.',
    features: [
      'Jusqu\'à 5 projets',
      '15 listes de tâches',
      'Notes illimitées',
      '5 tableaux Kanban',
      '500 Mo de pièces jointes',
      'Accès API complet',
      'Jusqu\'à 3 membres',
    ],
  },
  pro: {
    name: 'Pro',
    price: 7,
    icon: <Crown size={24} />,
    color: '#8b5cf6',
    gradient: 'from-violet-500 to-purple-600',
    shadowColor: 'shadow-violet-500/25',
    description: 'Pour les freelances et équipes qui veulent tout débloquer, sans limite.',
    features: [
      'Tout le plan Étudiant',
      'Projets & listes illimités',
      '5 Go de pièces jointes',
      'Membres illimités',
      'Export des données',
    ],
  },
}

export default function CheckoutPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const planId = searchParams.get('plan')
  const plan = PLAN_DETAILS[planId]
  const priceId = PRICE_IDS[planId]
  const { plan: currentPlan } = useSubscription()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  usePageMeta({
    title: plan ? `S'abonner — ${plan.name}` : 'Abonnement',
    description: plan ? `Confirmez votre abonnement au plan ${plan.name}.` : 'Choisissez votre abonnement.',
    path: '/abonnement',
  })

  if (!plan) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-6 py-20 text-center">
          <h1 className="text-xl font-bold mb-3">Plan introuvable</h1>
          <p className="text-sm text-muted-foreground mb-6">Le plan demandé n'existe pas ou n'est pas disponible.</p>
          <Link to="/tarifs" className="text-sm text-primary hover:underline no-underline">Voir les tarifs</Link>
        </div>
      </div>
    )
  }

  if (currentPlan === planId) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-6 py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 mx-auto mb-4">
            <Check size={28} />
          </div>
          <h1 className="text-xl font-bold mb-3">Vous êtes déjà abonné au plan {plan.name}</h1>
          <p className="text-sm text-muted-foreground mb-6">Votre abonnement est actif. Vous pouvez utiliser toutes les fonctionnalités de votre plan.</p>
          <Link to="/taches" className="text-sm text-primary hover:underline no-underline">Retour à l'application</Link>
        </div>
      </div>
    )
  }

  const handleCheckout = async () => {
    if (!priceId) {
      setError('Ce plan n\'est pas encore disponible. Revenez bientôt !')
      return
    }
    if (!planId || !['student', 'pro'].includes(planId)) {
      setError('Plan invalide.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        navigate(`/connexion?plan=${planId}`)
        return
      }
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ planId }),
        }
      )
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'Erreur lors de la création de la session de paiement.')
        setLoading(false)
        return
      }
      if (data?.url) {
        window.location.href = data.url
      } else {
        setError('Impossible de créer la session de paiement. Réessayez.')
        setLoading(false)
      }
    } catch (err) {
      console.error('Checkout error:', err)
      setError('Erreur de connexion. Vérifiez votre connexion internet.')
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[680px] mx-auto px-6 py-14 relative noise-overlay">

        {/* Aurora background */}
        <div className="aurora-bg" style={{ opacity: 0.5 }}><div className="aurora-orb" /></div>
        <div className="grid-pattern absolute inset-0 pointer-events-none" />

        {/* Back link */}
        <Link to="/tarifs" className="relative z-10 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground no-underline transition-colors mb-10">
          <ArrowLeft size={14} />
          Retour aux tarifs
        </Link>

        {/* Header */}
        <div className="text-center mb-10 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/10 text-xs font-medium mb-5 backdrop-blur-sm">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400"><path d="M5.5 12.5 L9.5 16.5 L18.5 6.5"/></svg>
            <span className="text-foreground/70">Dernière étape avant l'accès complet</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3 leading-tight">
            Confirmez votre <span className="animated-gradient-text">abonnement</span>
          </h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">{plan.description}</p>
        </div>

        {/* Main card */}
        <div className="relative z-10 glow-border card-shimmer breathe-glow mb-8">
          <div className="relative rounded-2xl bg-gradient-to-b from-white/[0.06] to-card p-7 z-10">

            {/* Plan header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: plan.color + '20', color: plan.color }}>
                {plan.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2.5 mb-0.5">
                  <h2 className="text-xl font-bold">Plan {plan.name}</h2>
                  <span className="text-[0.6rem] px-2.5 py-0.5 rounded-full font-bold bg-gradient-to-r from-violet-500 to-purple-600 text-white">
                    RECOMMANDÉ
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Sans engagement · Annulable à tout moment</p>
              </div>
            </div>

            {/* Price block */}
            <div className="rounded-xl bg-white/[0.04] border border-white/10 p-5 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wider font-semibold">Abonnement mensuel</div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-extrabold">{plan.price}€</span>
                    <span className="text-sm text-muted-foreground">/mois</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wider font-semibold">Facturation</div>
                  <div className="text-sm font-bold">Mensuelle</div>
                  <div className="text-[0.65rem] text-emerald-400 font-medium mt-0.5">Sans engagement</div>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="mb-6">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3.5">Tout ce qui est inclus</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                {plan.features.map(f => (
                  <div key={f} className="flex items-center gap-2.5 text-[0.8rem]">
                    <div className="w-4.5 h-4.5 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                      <Check size={11} className="text-emerald-400" />
                    </div>
                    <span className="text-foreground/80">{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Divider + Total + CTA */}
            <div className="border-t border-white/10 pt-6">
              {/* Total */}
              <div className="flex items-center justify-between mb-5 px-1">
                <span className="text-sm font-bold">Total aujourd'hui</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold">{plan.price}€</span>
                  <span className="text-xs text-muted-foreground">TTC</span>
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={handleCheckout}
                disabled={loading}
                className={cn(
                  "w-full py-4 rounded-xl font-bold text-sm border-none cursor-pointer transition-all duration-200 flex items-center justify-center gap-2.5",
                  `bg-gradient-to-r ${plan.gradient} text-white shadow-lg ${plan.shadowColor} hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0`,
                  "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                )}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Redirection vers Stripe...
                  </>
                ) : (
                  <>
                    <Lock size={15} />
                    Procéder au paiement sécurisé
                    <ArrowRight size={15} />
                  </>
                )}
              </button>

              {/* Error */}
              {error && (
                <div className="mt-4 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 text-center">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Trust badges */}
        <div className="relative z-10 grid grid-cols-3 gap-4 mb-10">
          {[
            { icon: <Shield size={18} />, color: '#22c55e', label: 'Paiement sécurisé', sub: 'Chiffrement SSL via Stripe' },
            { icon: <Clock size={18} />, color: '#f59e0b', label: 'Annulable à tout moment', sub: 'Sans engagement' },
            { icon: <Zap size={18} />, color: '#8b5cf6', label: 'Activation instantanée', sub: 'Accès immédiat' },
          ].map(item => (
            <div key={item.label} className="flex flex-col items-center text-center p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:border-white/20 transition-all">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5" style={{ background: item.color + '20', color: item.color }}>
                {item.icon}
              </div>
              <div className="text-xs font-semibold mb-0.5">{item.label}</div>
              <div className="text-[0.6rem] text-muted-foreground">{item.sub}</div>
            </div>
          ))}
        </div>

        {/* Stripe badge */}
        <div className="relative z-10 flex items-center justify-center gap-2 text-[0.65rem] text-muted-foreground/50 mb-4">
          <CreditCard size={12} />
          <span>Paiement traité par Stripe · Vos données bancaires ne transitent jamais par nos serveurs</span>
        </div>

      </div>
      <Footer />
    </div>
  )
}
