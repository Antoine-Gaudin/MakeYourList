import { useState, useEffect, useRef } from 'react'
import { Copy, Check, Code2, FileJson, Key, Database, Lock, Eye, EyeOff, RefreshCw, Loader2, Sparkles, GraduationCap, Crown, ArrowRight, Zap } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useProject } from '../contexts/ProjectContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { supabase } from '../lib/supabase'
import { cn } from '../lib/utils'
import { PRICE_IDS } from '../lib/constants'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const BASE_API = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/api` : 'https://<projet>.supabase.co/functions/v1/api'

function CodeBlock({ code, lang = 'bash' }) {
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  return (
    <div className="relative group rounded-xl overflow-hidden border border-white/10 bg-[var(--input)] my-3">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-secondary/30">
        <span className="text-[0.65rem] font-mono text-muted-foreground uppercase tracking-wider">{lang}</span>
        <button className="flex items-center gap-1 text-[0.65rem] text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer transition-colors" onClick={copy}>
          {copied ? <><Check size={11} /> Copié</> : <><Copy size={11} /> Copier</>}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-[0.78rem] leading-relaxed font-mono whitespace-pre-wrap break-all"><code>{code}</code></pre>
    </div>
  )
}

function ParamTable({ params, hasPatch = true }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 my-3">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-secondary/40 border-b border-white/10">
            <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Param</th>
            <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Type</th>
            <th className="text-left px-3 py-2 font-semibold text-muted-foreground">POST</th>
            {hasPatch && <th className="text-left px-3 py-2 font-semibold text-muted-foreground">PATCH</th>}
            <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Description</th>
          </tr>
        </thead>
        <tbody>
          {params.map((p, i) => (
            <tr key={i} className={cn("border-b border-white/5", i % 2 === 0 ? "bg-transparent" : "bg-secondary/15")}>
              <td className="px-3 py-2 font-mono text-primary/90">{p.name}</td>
              <td className="px-3 py-2 text-muted-foreground">{p.type}</td>
              <td className="px-3 py-2">{p.post}</td>
              {hasPatch && <td className="px-3 py-2">{p.patch}</td>}
              <td className="px-3 py-2 text-muted-foreground">{p.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const SECTIONS = [
  { id: 'routes', label: 'Routes .json', icon: FileJson },
  { id: 'auth', label: 'Authentification', icon: Key },
  { id: 'rest', label: 'Requêtes REST', icon: Database },
  { id: 'lists', label: 'lists' },
  { id: 'tasks', label: 'tasks' },
  { id: 'subtasks', label: 'subtasks' },
  { id: 'notes', label: 'notes' },
  { id: 'kanban_boards', label: 'kanban_boards' },
  { id: 'folders', label: 'folders' },
  { id: 'attachments', label: 'attachments' },
  { id: 'activity_log', label: 'activity_log' },
  { id: 'share_links', label: 'share_links' },
]

const NEXT_PLAN = {
  free: {
    id: 'student', name: 'Étudiant', price: '2,49', icon: <GraduationCap size={24} />,
    color: '#4dabf7', gradient: 'from-blue-500 to-cyan-500',
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
    id: 'pro', name: 'Pro', price: '7', icon: <Crown size={24} />,
    color: '#8b5cf6', gradient: 'from-violet-500 to-purple-600',
    tagline: 'Passez en mode illimité',
    description: 'Plus aucune limite. Export, membres illimités et support prioritaire.',
    features: [
      { text: 'Projets illimités', detail: 'sans restriction' },
      { text: 'Listes illimitées', detail: 'organisez sans compter' },
      { text: 'Membres illimités', detail: 'toute l\'équipe' },
      { text: '5 Go de pièces jointes', detail: 'stockage massif' },
      { text: 'Export des données', detail: 'JSON, CSV' },
    ],
  },
}

function ApiDocs({ section, onNavigate }) {
  const { user } = useAuth()
  const { activeProject } = useProject()
  const { limits, plan } = useSubscription()
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const activeSection = section || 'routes'
  const [apiKey, setApiKey] = useState('')
  const [apiKeyVisible, setApiKeyVisible] = useState(false)
  const [apiKeyCopied, setApiKeyCopied] = useState(false)
  const [apiKeyRegenerating, setApiKeyRegenerating] = useState(false)
  const [copied, setCopied] = useState(null)
  const contentRef = useRef(null)

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
    if (!confirm('Régénérer votre clé API ? L\'ancienne cessera de fonctionner immédiatement.')) return
    setApiKeyRegenerating(true)
    const { data, error } = await supabase.rpc('regenerate_api_key')
    if (!error && data) setApiKey(data)
    setApiKeyRegenerating(false)
  }

  const copyText = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const scrollTo = (id) => {
    if (onNavigate) onNavigate(id)
  }

  const projectId = activeProject?.id || '<project_id>'
  const key = apiKey || '<votre_api_key>'
  const maskKey = (k) => k && k !== '<votre_api_key>' ? k.slice(0, 8) + '••••••••' + k.slice(-8) : k

  if (!limits.api) {
    const next = NEXT_PLAN[plan] || NEXT_PLAN.free

    const handleUpgradeCheckout = async () => {
      if (!PRICE_IDS[next.id]) return
      setCheckoutLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
            body: JSON.stringify({ planId: next.id }),
          }
        )
        const data = await res.json()
        if (data?.url) window.location.href = data.url
      } finally { setCheckoutLoading(false) }
    }

    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="relative w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl overflow-hidden">
          {/* Glow background */}
          <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl opacity-30 pointer-events-none" style={{ background: next.color }} />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ background: next.color }} />

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

            {/* CTA */}
            <button
              onClick={handleUpgradeCheckout}
              disabled={checkoutLoading}
              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-white border-none cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed bg-gradient-to-r ${next.gradient}`}
              style={{ boxShadow: `0 8px 24px ${next.color}35` }}
            >
              {checkoutLoading ? <Loader2 size={16} className="animate-spin" /> : (
                <>
                  <Zap size={16} />
                  Passer au plan {next.name}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Sidebar */}
      <nav className="w-52 shrink-0 border-r border-white/8 overflow-y-auto py-6 px-3 max-md:hidden">
        <div className="text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground/60 mb-3 px-2">Documentation</div>
        {SECTIONS.map(s => {
          const Icon = s.icon
          const isTable = !s.icon
          return (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className={cn(
                "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[0.75rem] bg-transparent border-none cursor-pointer transition-all duration-150 mb-0.5",
                activeSection === s.id
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                isTable && "pl-6"
              )}
            >
              {Icon && <Icon size={13} />}
              {isTable && <span className="text-muted-foreground/40">›</span>}
              <span className={cn(isTable && "font-mono text-[0.7rem]")}>{s.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" ref={contentRef}>
        <div className="max-w-[820px] mx-auto px-8 py-10 max-md:px-4">

          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
              <Code2 size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">API Reference</h1>
              <p className="text-sm text-muted-foreground">Make Your List — Documentation complète</p>
            </div>
          </div>

          {/* ===================== ROUTES .JSON ===================== */}
          {activeSection === 'routes' && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              <FileJson size={18} className="text-emerald-400" />
              <h2 className="text-lg font-bold">Routes .json</h2>
            </div>
            <div className="p-4 bg-emerald-500/5 border border-emerald-500/15 rounded-xl mb-6 text-sm text-muted-foreground leading-relaxed space-y-2">
              <p><strong className="text-foreground">C'est quoi ?</strong> Les routes <code className="px-1 py-0.5 bg-primary/10 text-primary rounded text-xs font-mono">.json</code> sont un raccourci pour visualiser vos données directement dans le navigateur. Pas besoin d'outil externe : ajoutez simplement <code className="px-1 py-0.5 bg-primary/10 text-primary rounded text-xs font-mono">.json</code> à la fin d'une URL de l'app.</p>
              <p><strong className="text-foreground">Exemple concret :</strong> Vous êtes sur <code className="text-xs font-mono">/taches</code> et voulez voir le JSON brut ? Tapez <code className="text-xs font-mono">/taches.json</code> dans la barre d'adresse. Pratique pour débugger ou vérifier vos données sans écrire de code.</p>
              <p><strong className="text-foreground">Attention :</strong> Ces routes affichent le JSON dans le navigateur (rendu côté client). Pour automatiser des scripts ou intégrer un outil tiers, utilisez plutôt l'API REST documentée dans les pages suivantes.</p>
            </div>
            <div className="overflow-x-auto rounded-xl border border-white/10 mb-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-secondary/40 border-b border-white/10">
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">URL</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Données retournées</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['/taches.json', 'Toutes les listes + tâches'],
                    ['/taches/dossier/{folderId}.json', 'Listes du dossier'],
                    ['/taches/liste/{listId}.json', 'Tâches de la liste'],
                    ['/taches/liste/{listId}/tache/{taskId}.json', 'Détail d\'une tâche'],
                    ['/kanban.json', 'Tous les boards kanban'],
                    ['/kanban/dossier/{folderId}.json', 'Boards du dossier'],
                    ['/kanban/board/{boardId}.json', 'Détail d\'un board'],
                    ['/notes.json', 'Toutes les notes'],
                    ['/notes/dossier/{folderId}.json', 'Notes du dossier'],
                    ['/notes/{noteId}.json', 'Détail d\'une note'],
                    ['/favoris.json', 'Éléments favoris'],
                    ['/activite.json', 'Journal d\'activité'],
                    ['/partages.json', 'Liens de partage'],
                  ].map(([url, desc], i) => (
                    <tr key={i} className={cn("border-b border-white/5", i % 2 === 0 ? "bg-transparent" : "bg-secondary/15")}>
                      <td className="px-3 py-2 font-mono text-primary/90">{url}</td>
                      <td className="px-3 py-2 text-muted-foreground">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-start gap-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
              <FileJson size={14} className="text-blue-400 shrink-0 mt-0.5" />
              <span className="text-[0.7rem] text-muted-foreground leading-relaxed">
                Ces routes sont un rendu <strong>client-side</strong> (l'app affiche le JSON dans le navigateur). Ce ne sont pas des endpoints REST. Pour les requêtes programmatiques, utilisez l'API REST ci-dessous.
              </span>
            </div>
          </section>
          )}

          {/* ===================== AUTHENTIFICATION ===================== */}
          {activeSection === 'auth' && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              <Key size={18} className="text-amber-400" />
              <h2 className="text-lg font-bold">Authentification</h2>
            </div>
            <div className="p-4 bg-amber-500/5 border border-amber-500/15 rounded-xl mb-6 text-sm text-muted-foreground leading-relaxed space-y-2">
              <p><strong className="text-foreground">Comment ça marche ?</strong> Contrairement à beaucoup d'APIs qui demandent des headers complexes (Bearer token, etc.), ici tout est simple : vous passez vos identifiants directement dans l'URL, comme des paramètres de recherche classiques.</p>
              <p><strong className="text-foreground">Deux clés à connaître :</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><code className="text-xs font-mono text-primary">apikey</code> — Votre clé personnelle unique (comme un mot de passe API). Trouvez-la dans Mon compte → Clé API.</li>
                <li><code className="text-xs font-mono text-primary">project_id</code> — L'identifiant de votre projet. Il sert à filtrer : vous ne voyez que les données du projet choisi.</li>
              </ul>
              <p><strong className="text-foreground">En pratique :</strong> Copiez votre clé API et votre Project ID ci-dessous, puis collez-les dans vos URLs. C'est tout !</p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/10 mb-6">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-secondary/40 border-b border-white/10">
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Paramètre</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Type</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Requis</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/5">
                    <td className="px-3 py-2 font-mono text-primary/90">apikey</td>
                    <td className="px-3 py-2 text-muted-foreground">string (64 hex)</td>
                    <td className="px-3 py-2 text-emerald-400 font-semibold">oui</td>
                    <td className="px-3 py-2 text-muted-foreground">Votre clé API personnelle (Mon compte → Clé API)</td>
                  </tr>
                  <tr className="bg-secondary/15">
                    <td className="px-3 py-2 font-mono text-primary/90">project_id</td>
                    <td className="px-3 py-2 text-muted-foreground">uuid</td>
                    <td className="px-3 py-2 text-emerald-400 font-semibold">oui</td>
                    <td className="px-3 py-2 text-muted-foreground">L'ID de votre projet (filtre les données retournées)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              <strong>Aucun header d'authentification requis.</strong> Tout passe dans l'URL. Les données sont automatiquement filtrées selon vos droits (projets, rôles).
            </p>

            {/* API Key display */}
            <div className="p-5 bg-card border border-white/10 rounded-2xl mb-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Votre clé API</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center px-3 py-2.5 bg-[var(--input)] border border-border rounded-xl font-mono text-xs overflow-hidden">
                      <code className="flex-1 truncate">{apiKeyVisible ? apiKey || '—' : maskKey(apiKey || '—')}</code>
                    </div>
                    <button onClick={() => setApiKeyVisible(!apiKeyVisible)} className="w-9 h-9 flex items-center justify-center bg-secondary border border-border rounded-xl cursor-pointer text-muted-foreground hover:text-foreground transition-colors" title={apiKeyVisible ? 'Masquer' : 'Afficher'}>
                      {apiKeyVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button onClick={handleCopyApiKey} disabled={!apiKey} className={cn("w-9 h-9 flex items-center justify-center bg-secondary border border-border rounded-xl cursor-pointer transition-colors", apiKeyCopied ? "text-emerald-400" : "text-muted-foreground hover:text-foreground")} title="Copier">
                      {apiKeyCopied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                    <button onClick={handleRegenerateApiKey} disabled={apiKeyRegenerating} className="w-9 h-9 flex items-center justify-center bg-secondary border border-border rounded-xl cursor-pointer text-muted-foreground hover:text-foreground transition-colors" title="Régénérer">
                      {apiKeyRegenerating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    </button>
                  </div>
                </div>

                {activeProject && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Project ID</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center px-3 py-2.5 bg-[var(--input)] border border-border rounded-xl font-mono text-xs">
                        <code>{activeProject.id}</code>
                      </div>
                      <button onClick={() => copyText(activeProject.id, 'project')} className="w-9 h-9 flex items-center justify-center bg-secondary border border-border rounded-xl cursor-pointer text-muted-foreground hover:text-foreground transition-colors" title="Copier">
                        {copied === 'project' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl mt-4">
                <Lock size={14} className="text-amber-400 shrink-0 mt-0.5" />
                <span className="text-[0.7rem] text-muted-foreground leading-relaxed">
                  Votre clé API est unique et secrète. Ne la partagez pas. Vous pouvez la régénérer à tout moment (l'ancienne cesse immédiatement de fonctionner).
                </span>
              </div>
            </div>

            <h3 className="text-sm font-bold mb-2 mt-6">Structure d'une URL</h3>
            <CodeBlock code={`${BASE_API}/<table>?apikey=<votre_api_key>&project_id=eq.<project_id>&<filtres>`} lang="url" />
          </section>
          )}

          {/* ===================== REQUÊTES REST ===================== */}
          {activeSection === 'rest' && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              <Database size={18} className="text-violet-400" />
              <h2 className="text-lg font-bold">Requêtes REST</h2>
            </div>
            <div className="p-4 bg-violet-500/5 border border-violet-500/15 rounded-xl mb-6 text-sm text-muted-foreground leading-relaxed space-y-2">
              <p><strong className="text-foreground">C'est quoi REST ?</strong> REST est un standard qui utilise les verbes HTTP pour interagir avec des données. Pensez-y comme un vocabulaire simple :</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>GET</strong> = Lire / récupérer des données (ne modifie rien)</li>
                <li><strong>POST</strong> = Créer une nouvelle ressource (ajouter une tâche, une note…)</li>
                <li><strong>PATCH</strong> = Modifier une ressource existante (changer le statut, le titre…)</li>
                <li><strong>DELETE</strong> = Supprimer une ressource</li>
              </ul>
              <p><strong className="text-foreground">Les filtres PostgREST :</strong> Pour cibler des données précises, ajoutez des filtres dans l'URL avec la syntaxe <code className="text-xs font-mono">colonne=opérateur.valeur</code>. Par exemple <code className="text-xs font-mono">status=eq.done</code> ne retourne que les tâches terminées.</p>
              <p><strong className="text-foreground">Testez avec curl :</strong> Les exemples ci-dessous utilisent <code className="text-xs font-mono">curl</code> (disponible sur Mac, Linux et Windows). Vous pouvez aussi utiliser Postman, Insomnia ou tout client HTTP.</p>
            </div>

            <h3 className="text-sm font-bold mb-2">GET — Lire des données</h3>
            <CodeBlock code={`# Lire toutes les tâches d'un projet\ncurl "${BASE_API}/tasks?apikey=${maskKey(key)}&project_id=eq.${projectId}&select=*,subtasks(*)"\n\n# Lire les notes\ncurl "${BASE_API}/notes?apikey=${maskKey(key)}&project_id=eq.${projectId}&select=*&order=created_at.desc"`} lang="bash" />

            <h3 className="text-sm font-bold mb-2 mt-6">POST — Créer une ressource</h3>
            <CodeBlock code={`curl -X POST "${BASE_API}/tasks?apikey=${maskKey(key)}" \\\n  -H "Content-Type: application/json" \\\n  -H "Prefer: return=representation" \\\n  -d '{"project_id":"${projectId}","list_id":"<list_id>","text":"Nouvelle tâche","status":"todo"}'`} lang="bash" />

            <h3 className="text-sm font-bold mb-2 mt-6">PATCH — Modifier une ressource</h3>
            <CodeBlock code={`curl -X PATCH "${BASE_API}/tasks?apikey=${maskKey(key)}&id=eq.<taskId>" \\\n  -H "Content-Type: application/json" \\\n  -H "Prefer: return=representation" \\\n  -d '{"status":"done","starred":true}'`} lang="bash" />

            <h3 className="text-sm font-bold mb-2 mt-6">DELETE — Supprimer une ressource</h3>
            <CodeBlock code={`curl -X DELETE "${BASE_API}/tasks?apikey=${maskKey(key)}&id=eq.<taskId>"`} lang="bash" />

            <h3 className="text-sm font-bold mb-2 mt-6">Opérateurs de filtre</h3>
            <div className="overflow-x-auto rounded-xl border border-white/10 mb-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-secondary/40 border-b border-white/10">
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Opérateur</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Signification</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Exemple</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['eq', 'Égal', 'status=eq.done'],
                    ['neq', 'Différent', 'status=neq.todo'],
                    ['gt / gte', 'Supérieur (ou égal)', 'position=gt.5'],
                    ['lt / lte', 'Inférieur (ou égal)', 'created_at=lt.2026-01-01'],
                    ['like', 'Pattern (% wildcard)', 'text=like.*urgent*'],
                    ['ilike', 'Pattern insensible casse', 'text=ilike.*urgent*'],
                    ['in', 'Dans une liste', 'status=in.(todo,doing)'],
                    ['is', 'Est null/true/false', 'due_date=is.null'],
                  ].map(([op, meaning, example], i) => (
                    <tr key={i} className={cn("border-b border-white/5", i % 2 === 0 ? "bg-transparent" : "bg-secondary/15")}>
                      <td className="px-3 py-2 font-mono text-primary/90">{op}</td>
                      <td className="px-3 py-2 text-muted-foreground">{meaning}</td>
                      <td className="px-3 py-2 font-mono text-muted-foreground/80 text-[0.7rem]">{example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          )}

          {/* ===================== TABLES ===================== */}

          {/* lists */}
          {activeSection === 'lists' && (
          <section className="mb-10">
            <h2 className="text-base font-bold font-mono mb-1 flex items-center gap-2">
              <Database size={14} className="text-muted-foreground" /> lists
            </h2>
            <p className="text-xs text-muted-foreground mb-3">Listes de tâches — <code className="text-primary/80">/functions/v1/api/lists</code></p>
            <div className="p-4 bg-secondary/30 border border-white/8 rounded-xl mb-4 text-sm text-muted-foreground leading-relaxed space-y-2">
              <p><strong className="text-foreground">À quoi ça sert ?</strong> Une <em>list</em> est un conteneur de tâches — c'est la "to-do list" classique. Dans l'app, c'est ce que vous voyez dans l'onglet Tâches : "Courses", "Travail", etc.</p>
              <p><strong className="text-foreground">Exemple :</strong> Pour créer une liste "Courses" → <code className="text-xs font-mono">POST /lists</code> avec <code className="text-xs font-mono">{'{'}&quot;name&quot;:&quot;Courses&quot;{'}'}</code>. Ensuite vous ajouterez des tâches dedans via la table <em>tasks</em>.</p>
            </div>
            <ParamTable params={[
              { name: 'name', type: 'string', post: 'requis', patch: 'oui', desc: 'Nom de la liste' },
              { name: 'folder_id', type: 'uuid / null', post: 'optionnel', patch: 'non', desc: 'Dossier parent' },
              { name: 'linked_note_id', type: 'uuid / null', post: 'non', patch: 'oui', desc: 'Note liée' },
              { name: 'position', type: 'integer', post: 'auto', patch: 'non', desc: "Ordre d'affichage" },
              { name: 'project_id', type: 'uuid', post: 'auto', patch: 'non', desc: 'Projet associé' },
            ]} />
            <p className="text-xs text-muted-foreground"><strong>DELETE</strong> : <code>?id=eq.&#123;id&#125;</code></p>
          </section>
          )}

          {/* tasks */}
          {activeSection === 'tasks' && (
          <section className="mb-10">
            <h2 className="text-base font-bold font-mono mb-1 flex items-center gap-2">
              <Database size={14} className="text-muted-foreground" /> tasks
            </h2>
            <p className="text-xs text-muted-foreground mb-3">Tâches — <code className="text-primary/80">/functions/v1/api/tasks</code></p>
            <div className="p-4 bg-secondary/30 border border-white/8 rounded-xl mb-4 text-sm text-muted-foreground leading-relaxed space-y-2">
              <p><strong className="text-foreground">À quoi ça sert ?</strong> C'est la table principale. Chaque tâche appartient à une <em>list</em> et possède un statut (<code className="text-xs font-mono">todo</code> → <code className="text-xs font-mono">doing</code> → <code className="text-xs font-mono">done</code>), une priorité, des tags, une date d'échéance, etc.</p>
              <p><strong className="text-foreground">Lien kanban :</strong> Une tâche peut aussi apparaître sur un board kanban si <code className="text-xs font-mono">on_kanban=true</code>. Le champ <code className="text-xs font-mono">kanban_col</code> détermine dans quelle colonne elle se trouve.</p>
              <p><strong className="text-foreground">Exemple :</strong> Marquer une tâche comme terminée → <code className="text-xs font-mono">PATCH /tasks?id=eq.xxx</code> avec <code className="text-xs font-mono">{'{'}&quot;status&quot;:&quot;done&quot;{'}'}</code></p>
            </div>
            <ParamTable params={[
              { name: 'list_id', type: 'uuid', post: 'requis', patch: 'oui', desc: 'Liste parente' },
              { name: 'text', type: 'string', post: 'requis', patch: 'oui', desc: 'Contenu de la tâche' },
              { name: 'status', type: 'string', post: 'défaut todo', patch: 'oui', desc: 'todo, doing, done' },
              { name: 'priority', type: 'string', post: 'défaut medium', patch: 'oui', desc: 'low, medium, high' },
              { name: 'due_date', type: 'date / null', post: 'optionnel', patch: 'oui', desc: "Date d'échéance" },
              { name: 'notes', type: 'string', post: 'défaut ""', patch: 'oui', desc: 'Notes / description' },
              { name: 'tags', type: 'jsonb (array)', post: 'défaut []', patch: 'oui', desc: 'Tags / étiquettes' },
              { name: 'starred', type: 'boolean', post: 'défaut false', patch: 'oui', desc: 'Favori' },
              { name: 'on_kanban', type: 'boolean', post: 'défaut false', patch: 'oui', desc: 'Visible sur un kanban' },
              { name: 'kanban_col', type: 'string / null', post: 'optionnel', patch: 'oui', desc: 'Colonne kanban' },
              { name: 'kanban_board_id', type: 'uuid / null', post: 'optionnel', patch: 'oui', desc: 'Board kanban associé' },
              { name: 'linked_note_id', type: 'uuid / null', post: 'optionnel', patch: 'oui', desc: 'Note liée' },
              { name: 'position', type: 'bigint', post: 'auto', patch: 'non', desc: "Ordre d'affichage" },
              { name: 'project_id', type: 'uuid', post: 'auto', patch: 'non', desc: 'Projet associé' },
              { name: 'created_by', type: 'uuid', post: 'auto', patch: 'non', desc: 'Créateur' },
            ]} />
            <p className="text-xs text-muted-foreground"><strong>DELETE</strong> : <code>?id=eq.&#123;id&#125;</code></p>
          </section>
          )}

          {/* subtasks */}
          {activeSection === 'subtasks' && (
          <section className="mb-10">
            <h2 className="text-base font-bold font-mono mb-1 flex items-center gap-2">
              <Database size={14} className="text-muted-foreground" /> subtasks
            </h2>
            <p className="text-xs text-muted-foreground mb-3">Sous-tâches — <code className="text-primary/80">/functions/v1/api/subtasks</code></p>
            <div className="p-4 bg-secondary/30 border border-white/8 rounded-xl mb-4 text-sm text-muted-foreground leading-relaxed space-y-2">
              <p><strong className="text-foreground">À quoi ça sert ?</strong> Les sous-tâches sont des étapes à cocher à l'intérieur d'une tâche. Par exemple, la tâche "Préparer la réunion" peut avoir les sous-tâches "Réserver la salle" et "Envoyer l'ordre du jour".</p>
              <p><strong className="text-foreground">Structure simple :</strong> Chaque subtask a un texte et un booléen <code className="text-xs font-mono">done</code>. Elles sont liées à une tâche via <code className="text-xs font-mono">task_id</code>.</p>
            </div>
            <ParamTable params={[
              { name: 'task_id', type: 'uuid', post: 'requis', patch: 'non', desc: 'Tâche parente' },
              { name: 'text', type: 'string', post: 'requis', patch: 'oui', desc: 'Contenu' },
              { name: 'done', type: 'boolean', post: 'défaut false', patch: 'oui', desc: 'Statut complété' },
            ]} />
            <p className="text-xs text-muted-foreground"><strong>DELETE</strong> : <code>?id=eq.&#123;id&#125;</code></p>
          </section>
          )}

          {/* notes */}
          {activeSection === 'notes' && (
          <section className="mb-10">
            <h2 className="text-base font-bold font-mono mb-1 flex items-center gap-2">
              <Database size={14} className="text-muted-foreground" /> notes
            </h2>
            <p className="text-xs text-muted-foreground mb-3">Notes — <code className="text-primary/80">/functions/v1/api/notes</code></p>
            <div className="p-4 bg-secondary/30 border border-white/8 rounded-xl mb-4 text-sm text-muted-foreground leading-relaxed space-y-2">
              <p><strong className="text-foreground">À quoi ça sert ?</strong> Les notes sont des blocs de texte libre (markdown supporté) avec une couleur personnalisable. Elles apparaissent dans l'onglet Notes de l'app, comme des post-it.</p>
              <p><strong className="text-foreground">Fonctionnalités :</strong> Une note peut être épinglée (<code className="text-xs font-mono">pinned</code>), mise en favori (<code className="text-xs font-mono">starred</code>), rangée dans un dossier, ou placée sur un board kanban.</p>
              <p><strong className="text-foreground">Liaison bidirectionnelle :</strong> Une note peut être liée à une tâche ou une liste via <code className="text-xs font-mono">linked_note_id</code> (côté task/list). Supprimer une note nettoie automatiquement ces liens.</p>
            </div>
            <ParamTable params={[
              { name: 'title', type: 'string', post: 'défaut ""', patch: 'oui', desc: 'Titre' },
              { name: 'content', type: 'string', post: 'défaut ""', patch: 'oui', desc: 'Contenu (texte/markdown)' },
              { name: 'color', type: 'string', post: 'défaut #8b5cf6', patch: 'oui', desc: 'Couleur hex' },
              { name: 'pinned', type: 'boolean', post: 'défaut false', patch: 'oui', desc: 'Épinglée' },
              { name: 'starred', type: 'boolean', post: 'défaut false', patch: 'oui', desc: 'Favoris' },
              { name: 'folder_id', type: 'uuid / null', post: 'optionnel', patch: 'oui', desc: 'Dossier parent' },
              { name: 'kanban_status', type: 'string / null', post: 'optionnel', patch: 'oui', desc: 'Statut kanban' },
              { name: 'kanban_board_id', type: 'uuid / null', post: 'optionnel', patch: 'oui', desc: 'Board kanban' },
              { name: 'project_id', type: 'uuid', post: 'auto', patch: 'non', desc: 'Projet associé' },
              { name: 'created_by', type: 'uuid', post: 'auto', patch: 'non', desc: 'Créateur' },
            ]} />
            <p className="text-xs text-muted-foreground"><strong>DELETE</strong> : <code>?id=eq.&#123;id&#125;</code> — nettoie aussi <code>linked_note_id</code> dans tasks et lists</p>
          </section>
          )}

          {/* kanban_boards */}
          {activeSection === 'kanban_boards' && (
          <section className="mb-10">
            <h2 className="text-base font-bold font-mono mb-1 flex items-center gap-2">
              <Database size={14} className="text-muted-foreground" /> kanban_boards
            </h2>
            <p className="text-xs text-muted-foreground mb-3">Tableaux kanban — <code className="text-primary/80">/functions/v1/api/kanban_boards</code></p>
            <div className="p-4 bg-secondary/30 border border-white/8 rounded-xl mb-4 text-sm text-muted-foreground leading-relaxed space-y-2">
              <p><strong className="text-foreground">À quoi ça sert ?</strong> Un board kanban est un tableau visuel avec des colonnes (par défaut : todo, doing, done). Les tâches et notes peuvent être glissées entre colonnes pour suivre leur avancement.</p>
              <p><strong className="text-foreground">Colonnes personnalisables :</strong> Le champ <code className="text-xs font-mono">columns</code> est un tableau JSON. Chaque colonne a un <code className="text-xs font-mono">id</code>, un <code className="text-xs font-mono">title</code> et une <code className="text-xs font-mono">color</code>. Vous pouvez ajouter, renommer ou réordonner les colonnes via PATCH.</p>
              <p><strong className="text-foreground">Lien avec tasks/notes :</strong> Les tâches avec <code className="text-xs font-mono">on_kanban=true</code> et les notes avec un <code className="text-xs font-mono">kanban_board_id</code> apparaissent sur ce board.</p>
            </div>
            <ParamTable params={[
              { name: 'name', type: 'string', post: 'requis', patch: 'oui', desc: 'Nom du board' },
              { name: 'columns', type: 'jsonb (array)', post: 'défaut serveur', patch: 'oui', desc: 'Définition des colonnes' },
              { name: 'position', type: 'bigint', post: 'auto', patch: 'oui', desc: "Ordre d'affichage" },
              { name: 'folder_id', type: 'uuid / null', post: 'non', patch: 'non', desc: 'Dossier parent (lecture seule)' },
              { name: 'project_id', type: 'uuid', post: 'auto', patch: 'non', desc: 'Projet associé' },
              { name: 'created_by', type: 'uuid', post: 'auto', patch: 'non', desc: 'Créateur' },
            ]} />
            <p className="text-xs text-muted-foreground"><strong>DELETE</strong> : <code>?id=eq.&#123;id&#125;</code> — nettoie <code>kanban_board_id</code> dans tasks et notes</p>
          </section>
          )}

          {/* folders */}
          {activeSection === 'folders' && (
          <section className="mb-10">
            <h2 className="text-base font-bold font-mono mb-1 flex items-center gap-2">
              <Database size={14} className="text-muted-foreground" /> folders
            </h2>
            <p className="text-xs text-muted-foreground mb-3">Dossiers — <code className="text-primary/80">/functions/v1/api/folders</code></p>
            <div className="p-4 bg-secondary/30 border border-white/8 rounded-xl mb-4 text-sm text-muted-foreground leading-relaxed space-y-2">
              <p><strong className="text-foreground">À quoi ça sert ?</strong> Les dossiers permettent d'organiser vos listes, notes et boards kanban en groupes. C'est l'arborescence que vous voyez dans la sidebar de chaque onglet.</p>
              <p><strong className="text-foreground">3 types :</strong> <code className="text-xs font-mono">list</code> (dossier de listes de tâches), <code className="text-xs font-mono">note</code> (dossier de notes) et <code className="text-xs font-mono">kanban</code> (dossier de boards). Le type détermine dans quel onglet le dossier apparaît.</p>
              <p><strong className="text-foreground">Pas de PATCH :</strong> Les dossiers ne sont pas modifiables via l'API (uniquement création et suppression).</p>
            </div>
            <ParamTable hasPatch={false} params={[
              { name: 'name', type: 'string', post: 'requis', desc: 'Nom du dossier' },
              { name: 'type', type: 'string', post: 'défaut note', desc: 'note, list, kanban' },
              { name: 'project_id', type: 'uuid', post: 'auto', desc: 'Projet associé' },
            ]} />
            <p className="text-xs text-muted-foreground"><strong>DELETE</strong> : <code>?id=eq.&#123;id&#125;</code> — nettoie <code>folder_id</code> dans les items</p>
          </section>
          )}

          {/* attachments */}
          {activeSection === 'attachments' && (
          <section className="mb-10">
            <h2 className="text-base font-bold font-mono mb-1 flex items-center gap-2">
              <Database size={14} className="text-muted-foreground" /> attachments
            </h2>
            <p className="text-xs text-muted-foreground mb-3">Pièces jointes — <code className="text-primary/80">/functions/v1/api/attachments</code></p>
            <div className="p-4 bg-secondary/30 border border-white/8 rounded-xl mb-4 text-sm text-muted-foreground leading-relaxed space-y-2">
              <p><strong className="text-foreground">À quoi ça sert ?</strong> Les pièces jointes sont des fichiers (images, PDF, etc.) liés à une tâche ou une note. Le fichier est stocké dans Supabase Storage, et cette table garde les métadonnées (nom, taille, type MIME).</p>
              <p><strong className="text-foreground">Limites :</strong> 10 Mo max par fichier. Le champ <code className="text-xs font-mono">storage_path</code> est généré automatiquement par le serveur.</p>
              <p><strong className="text-foreground">Suppression :</strong> Quand vous supprimez un attachment via l'API, le fichier physique est aussi supprimé du stockage.</p>
            </div>
            <ParamTable hasPatch={false} params={[
              { name: 'item_type', type: 'string', post: 'requis', desc: "Type d'item (task, note, etc.)" },
              { name: 'item_id', type: 'uuid', post: 'requis', desc: "ID de l'item parent" },
              { name: 'file_name', type: 'string', post: 'requis', desc: 'Nom du fichier' },
              { name: 'file_size', type: 'integer', post: 'requis', desc: 'Taille en octets (max 10 Mo)' },
              { name: 'file_type', type: 'string', post: 'défaut application/octet-stream', desc: 'MIME type' },
              { name: 'storage_path', type: 'string', post: 'auto', desc: 'Chemin dans le bucket' },
              { name: 'project_id', type: 'uuid', post: 'auto', desc: 'Projet associé' },
              { name: 'created_by', type: 'uuid', post: 'auto', desc: 'Créateur' },
            ]} />
            <p className="text-xs text-muted-foreground"><strong>DELETE</strong> : <code>?id=eq.&#123;id&#125;</code> + suppression du fichier dans Storage</p>
          </section>
          )}

          {/* activity_log */}
          {activeSection === 'activity_log' && (
          <section className="mb-10">
            <h2 className="text-base font-bold font-mono mb-1 flex items-center gap-2">
              <Database size={14} className="text-muted-foreground" /> activity_log
            </h2>
            <p className="text-xs text-muted-foreground mb-3">Journal d'activité — <code className="text-primary/80">/functions/v1/api/activity_log</code></p>
            <div className="p-4 bg-secondary/30 border border-white/8 rounded-xl mb-4 text-sm text-muted-foreground leading-relaxed space-y-2">
              <p><strong className="text-foreground">À quoi ça sert ?</strong> Le journal d'activité enregistre les actions effectuées dans un projet : création de tâches, modifications, suppressions, etc. C'est l'historique visible dans l'onglet Activité de l'app.</p>
              <p><strong className="text-foreground">Lecture seule en pratique :</strong> Les entrées sont généralement créées automatiquement par l'app. Vous pouvez les lire (GET) pour auditer l'activité ou les supprimer en masse pour nettoyer l'historique.</p>
            </div>
            <ParamTable hasPatch={false} params={[
              { name: 'type', type: 'string', post: 'requis', desc: "Type d'activité" },
              { name: 'text', type: 'string', post: 'requis', desc: 'Description' },
              { name: 'user_id', type: 'uuid', post: 'auto', desc: 'Utilisateur' },
              { name: 'project_id', type: 'uuid', post: 'auto', desc: 'Projet associé' },
            ]} />
            <p className="text-xs text-muted-foreground"><strong>DELETE</strong> : en masse → <code>?project_id=eq.&#123;id&#125;&created_at=lt.&#123;cutoff&#125;</code></p>
          </section>
          )}

          {/* share_links */}
          {activeSection === 'share_links' && (
          <section className="mb-10">
            <h2 className="text-base font-bold font-mono mb-1 flex items-center gap-2">
              <Database size={14} className="text-muted-foreground" /> share_links
            </h2>
            <p className="text-xs text-muted-foreground mb-3">Liens de partage — <code className="text-primary/80">/functions/v1/api/share_links</code></p>
            <div className="p-4 bg-secondary/30 border border-white/8 rounded-xl mb-4 text-sm text-muted-foreground leading-relaxed space-y-2">
              <p><strong className="text-foreground">À quoi ça sert ?</strong> Les liens de partage permettent de rendre une liste, un board ou une note accessible publiquement via un lien unique. La personne qui reçoit le lien peut voir le contenu sans avoir de compte.</p>
              <p><strong className="text-foreground">Sécurité :</strong> Chaque lien contient un <code className="text-xs font-mono">token</code> aléatoire de 64 caractères. Vous pouvez désactiver un lien à tout moment en passant <code className="text-xs font-mono">is_active</code> à <code className="text-xs font-mono">false</code>.</p>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Liens de partage — <code className="text-primary/80">/functions/v1/api/share_links</code></p>
            <ParamTable hasPatch={false} params={[
              { name: 'item_type', type: 'string', post: 'requis', desc: 'Type partagé' },
              { name: 'item_id', type: 'uuid', post: 'requis', desc: "ID de l'item" },
              { name: 'token', type: 'string', post: 'auto (64 hex)', desc: 'Token unique' },
              { name: 'is_active', type: 'boolean', post: 'défaut true', desc: 'Lien actif' },
              { name: 'project_id', type: 'uuid', post: 'auto', desc: 'Projet associé' },
              { name: 'created_by', type: 'uuid', post: 'auto', desc: 'Créateur' },
            ]} />
          </section>
          )}

          {/* Footer */}
          <div className="border-t border-border mt-6 pt-6 pb-4 text-center">
            <p className="text-xs text-muted-foreground">Make Your List API v1 — Propulsée par Supabase Edge Functions + PostgREST</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ApiDocs
