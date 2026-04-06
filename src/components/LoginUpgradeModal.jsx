import { X, GraduationCap, Crown, Check, Sparkles, Zap, ArrowRight, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PRICE_IDS } from '../lib/constants'

const NEXT_PLAN = {
  free: {
    id: 'student',
    name: 'Étudiant',
    price: '2,49',
    icon: <GraduationCap size={24} />,
    color: '#4dabf7',
    gradient: 'from-blue-500 to-cyan-500',
    tagline: 'Passez au niveau supérieur',
    description: 'Débloquez plus de projets, de listes et la collaboration pour donner vie à vos idées.',
    features: [
      { text: '5 projets', detail: 'au lieu de 1' },
      { text: '15 listes', detail: 'au lieu de 3' },
      { text: '5 tableaux Kanban', detail: 'au lieu de 1' },
      { text: '500 Mo de pièces jointes', detail: 'au lieu de 50 Mo' },
      { text: 'Accès API complet', detail: 'automatisez tout' },
      { text: 'Jusqu\'à 3 membres', detail: 'collaborez ensemble' },
    ],
  },
  student: {
    id: 'pro',
    name: 'Pro',
    price: '7',
    icon: <Crown size={24} />,
    color: '#8b5cf6',
    gradient: 'from-violet-500 to-purple-600',
    tagline: 'Passez en mode illimité',
    description: 'Plus aucune limite. Export, membres illimités et support prioritaire.',
    features: [
      { text: 'Projets illimités', detail: 'sans restriction' },
      { text: 'Listes illimitées', detail: 'organisez sans compter' },
      { text: 'Membres illimités', detail: 'toute l\'équipe' },
      { text: '5 Go de pièces jointes', detail: 'stockage massif' },
      { text: 'Export des données', detail: 'JSON, CSV' },
      { text: 'Support prioritaire', detail: 'réponse rapide' },
    ],
  },
}

export default function LoginUpgradeModal({ onClose }) {
  const { plan } = useSubscription()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const next = NEXT_PLAN[plan]
  if (!next) { onClose(); return null }

  const handleUpgrade = async () => {
    if (!PRICE_IDS[next.id]) {
      navigate(`/abonnement?plan=${next.id}`)
      onClose()
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setError('Session expirée.'); setLoading(false); return }
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ planId: next.id }),
        }
      )
      const data = await res.json()
      if (data?.url) { window.location.href = data.url }
      else { setError('Impossible de créer la session.'); setLoading(false) }
    } catch { setError('Erreur réseau.'); setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <div
        className="relative w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Glow background */}
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl opacity-30 pointer-events-none" style={{ background: next.color }} />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ background: next.color }} />

        {/* Close */}
        <button
          className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer bg-transparent border-none z-10"
          onClick={onClose}
        >
          <X size={18} />
        </button>

        {/* Content */}
        <div className="relative z-10 px-7 pt-8 pb-7">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-5" style={{ background: next.color + '18', color: next.color }}>
            <Sparkles size={12} />
            {next.tagline}
          </div>

          {/* Plan icon + name */}
          <div className="flex items-center gap-4 mb-4">
            <div
              className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${next.gradient} flex items-center justify-center text-white shadow-lg`}
              style={{ boxShadow: `0 8px 32px ${next.color}40` }}
            >
              {next.icon}
            </div>
            <div>
              <h2 className="text-xl font-extrabold">Plan {next.name}</h2>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-extrabold" style={{ color: next.color }}>{next.price}€</span>
                <span className="text-sm text-muted-foreground">/mois</span>
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{next.description}</p>

          {/* Features */}
          <div className="flex flex-col gap-2.5 mb-7">
            {next.features.map(f => (
              <div key={f.text} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ background: next.color + '18' }}>
                  <Check size={12} style={{ color: next.color }} />
                </div>
                <span className="text-sm font-medium">{f.text}</span>
                <span className="text-xs text-muted-foreground ml-auto">{f.detail}</span>
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-destructive mb-3 bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}

          {/* CTA */}
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-white border-none cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed bg-gradient-to-r ${next.gradient}`}
            style={{ boxShadow: `0 8px 24px ${next.color}35` }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : (
              <>
                <Zap size={16} />
                Passer au plan {next.name}
                <ArrowRight size={16} />
              </>
            )}
          </button>

          {/* Dismiss */}
          <button
            onClick={onClose}
            className="w-full mt-3 py-2.5 rounded-xl text-xs font-medium text-muted-foreground bg-transparent border border-border hover:bg-accent hover:text-foreground transition-all cursor-pointer"
          >
            Peut-être plus tard
          </button>
        </div>
      </div>
    </div>
  )
}
