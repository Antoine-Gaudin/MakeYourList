import { X, GraduationCap, Crown, Check, Loader2, Sparkles, Zap, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { useSubscription } from '../contexts/SubscriptionContext'
import { supabase } from '../lib/supabase'
import { PRICE_IDS } from '../lib/constants'

const PLANS = [
  {
    id: 'student',
    name: 'Étudiant',
    price: '2,49',
    icon: <GraduationCap size={22} />,
    color: '#4dabf7',
    gradient: 'from-blue-500 to-cyan-500',
    features: [
      { text: '5 projets', detail: 'au lieu de 1' },
      { text: '15 listes', detail: 'au lieu de 3' },
      { text: '5 tableaux Kanban', detail: 'au lieu de 1' },
      { text: '500 Mo de pièces jointes', detail: 'au lieu de 50 Mo' },
      { text: 'Accès API complet', detail: 'automatisez tout' },
      { text: "Jusqu'à 3 membres", detail: 'collaborez' },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '7',
    icon: <Crown size={22} />,
    color: '#8b5cf6',
    gradient: 'from-violet-500 to-purple-600',
    popular: true,
    features: [
      { text: 'Tout le plan Étudiant', detail: 'inclus' },
      { text: 'Tout illimité', detail: 'sans restriction' },
      { text: '5 Go de pièces jointes', detail: 'stockage massif' },
      { text: 'Export des données', detail: 'JSON, CSV' },
    ],
  },
]

export default function UpgradeModal({ onClose, reason }) {
  const { plan } = useSubscription()
  const [loading, setLoading] = useState(null)
  const [error, setError] = useState(null)

  const handleCheckout = async (planId) => {
    if (!PRICE_IDS[planId]) { setError("Ce plan n'est pas encore disponible."); return }
    setLoading(planId)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setError('Vous devez être connecté.'); setLoading(null); return }
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({ planId }),
        }
      )
      const data = await res.json()
      if (data?.url) { window.location.href = data.url }
      else { setError('Impossible de creer la session.'); setLoading(null) }
    } catch { setError('Erreur réseau.'); setLoading(null) }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <div
        className="relative w-full max-w-2xl bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Glow effects */}
        <div className="absolute -top-32 -left-32 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ background: '#4dabf7' }} />
        <div className="absolute -bottom-32 -right-32 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ background: '#8b5cf6' }} />

        {/* Close */}
        <button
          className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent bg-transparent border-none cursor-pointer z-20"
          onClick={onClose}
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="relative z-10 px-8 pt-8 pb-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/15 text-violet-400 text-xs font-semibold mb-4">
            <Sparkles size={12} />
            Offre supérieure disponible
          </div>
          <h2 className="text-2xl font-extrabold mb-1">Passez au niveau supérieur</h2>
          {reason && <p className="text-sm text-muted-foreground leading-relaxed max-w-md">{reason}</p>}
          {error && <p className="text-sm text-destructive mt-3 bg-destructive/10 px-4 py-2.5 rounded-xl">{error}</p>}
        </div>

        {/* Plans grid */}
        <div className="relative z-10 px-8 pt-5 pb-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
          {PLANS.map(p => {
            const isCurrent = p.id === plan
            const hasPriceId = !!PRICE_IDS[p.id]
            const isLoading = loading === p.id

            return (
              <div
                key={p.id}
                className="relative flex flex-col rounded-2xl border p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                onClick={() => !isCurrent && hasPriceId && !isLoading && handleCheckout(p.id)}
                style={{
                  borderColor: isCurrent ? p.color + '50' : p.popular ? p.color + '30' : 'var(--border)',
                  background: p.popular ? `linear-gradient(135deg, ${p.color}08, ${p.color}04)` : undefined,
                  boxShadow: p.popular ? `0 0 40px ${p.color}10` : undefined,
                }}
              >
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[0.6rem] font-bold text-white" style={{ background: `linear-gradient(135deg, ${p.color}, ${p.color}cc)` }}>
                    POPULAIRE
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-11 h-11 rounded-xl bg-gradient-to-br ${p.gradient} flex items-center justify-center text-white shadow-lg`}
                    style={{ boxShadow: `0 6px 24px ${p.color}35` }}
                  >
                    {p.icon}
                  </div>
                  <div>
                    <div className="font-bold text-base">{p.name}</div>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-xl font-extrabold" style={{ color: p.color }}>{p.price}€</span>
                      <span className="text-xs text-muted-foreground">/mois</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 flex-1 mb-5">
                  {p.features.map(f => (
                    <div key={f.text} className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ background: p.color + '18' }}>
                        <Check size={11} style={{ color: p.color }} />
                      </div>
                      <span className="text-sm font-medium">{f.text}</span>
                      <span className="text-[0.65rem] text-muted-foreground ml-auto hidden sm:block">{f.detail}</span>
                    </div>
                  ))}
                </div>

                <button
                  disabled={isCurrent || isLoading || !hasPriceId}
                  onClick={() => handleCheckout(p.id)}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all border-none ${isCurrent ? '' : hasPriceId ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                  style={
                    isCurrent
                      ? { background: p.color + '15', color: p.color }
                      : hasPriceId
                        ? { background: `linear-gradient(135deg, ${p.color}, ${p.color}dd)`, color: '#fff', boxShadow: `0 6px 20px ${p.color}30` }
                        : { background: 'var(--accent)', color: 'var(--muted-foreground)' }
                  }
                >
                  {isCurrent ? (
                    <><Check size={14} /> Plan actuel</>
                  ) : isLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : hasPriceId ? (
                    <><Zap size={14} /> S'abonner <ArrowRight size={14} /></>
                  ) : (
                    'Bientôt disponible'
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}