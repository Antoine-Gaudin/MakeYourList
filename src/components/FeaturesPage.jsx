import {
  CheckSquare, StickyNote, Columns3, Share2,
  ArrowRight, Crown, Star, Circle, Clock, Check,
  FileText, FolderOpen, GripVertical, Download,
  Rocket, Code2, Link2, Smartphone, User, WifiOff
} from 'lucide-react'
import Footer from './Footer'
import { usePageMeta } from '../hooks/usePageMeta'
import { Link } from 'react-router-dom'

export default function FeaturesPage({ onNavigate }) {
  const nav = (p) => { onNavigate?.(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  usePageMeta({
    title: 'Découvrir les fonctionnalités',
    description: 'Listes de tâches, Kanban, notes, collaboration temps réel — découvrez toutes les fonctionnalités de Make Your List.',
    path: '/decouvrir',
  })

  return (
    <div className="flex-1 overflow-y-auto">

      {/* ═══ HERO ═══ */}
      <section className="relative py-24 px-6 overflow-hidden noise-overlay">
        <div className="aurora-bg"><div className="aurora-orb" /></div>
        <div className="grid-pattern absolute inset-0 pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/[0.06] border border-white/10 text-sm font-medium mb-6 backdrop-blur-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400"><path d="M5.5 12.5 L9.5 16.5 L18.5 6.5"/></svg>
            <span className="text-foreground/70">Découvrir Make Your List en détail</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
            Tout ce dont vous avez besoin,{' '}
            <span className="animated-gradient-text">
              rien de superflu
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Listes de tâches, Kanban, notes, collaboration temps réel — chaque fonctionnalité est pensée pour vous faire <strong className="text-foreground">gagner du temps, pas en perdre</strong>.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 mt-8">
            {[
              { icon: <CheckSquare size={16} />, label: 'Tâches', color: '#8b5cf6' },
              { icon: <Columns3 size={16} />, label: 'Kanban', color: '#3b82f6' },
              { icon: <StickyNote size={16} />, label: 'Notes', color: '#10b981' },
              { icon: <Share2 size={16} />, label: 'Partage', color: '#f59e0b' },
              { icon: <Download size={16} />, label: 'Export', color: '#ec4899' },
              { icon: <Code2 size={16} />, label: 'API', color: '#14b8a6' },
              { icon: <Smartphone size={16} />, label: 'Mobile', color: '#3b82f6' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm font-medium" style={{ color: item.color }}>
                {item.icon} {item.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURE 1 — LISTES DE TÂCHES ═══ */}
      <section className="py-20 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-500/[0.04] to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/15 border border-violet-500/25 text-violet-400 text-xs font-semibold mb-5">
              <CheckSquare size={12} /> LISTES DE TÂCHES
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-5">
              Créez vos listes,{' '}
              <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">maîtrisez chaque détail</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              Chaque tâche a un statut, une priorité, des tags colorés, des sous-tâches et une date d'échéance.{' '}
              <strong className="text-foreground">Sélectionnez plusieurs tâches pour les modifier d'un coup.</strong>
            </p>
            <div className="flex flex-col gap-3">
              {['Statuts : A faire → En cours → Terminee', 'Priorités : Basse, Moyenne, Haute', 'Tags personnalisés : Travail, Urgent, Personnel…', 'Sous-tâches avec barre de progression', 'Actions par lot sur plusieurs tâches'].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className="w-5 h-5 rounded-md bg-violet-500/15 flex items-center justify-center text-violet-400 shrink-0">
                    <Check size={12} />
                  </div>
                  <span className="text-foreground/80">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mockup fidèle TodoList */}
          <div className="relative float-slow">
            <div className="absolute -inset-6 bg-gradient-to-br from-violet-500/20 to-purple-500/15 rounded-3xl blur-3xl" />
            <div className="glow-border glow-border-always relative z-10"><div className="rounded-2xl bg-card/80 backdrop-blur-sm overflow-hidden">
              <div className="flex h-[340px]">
                <div className="w-44 bg-white/[0.03] border-r border-white/10 p-3 flex flex-col gap-1 shrink-0">
                  <div className="text-[0.65rem] font-bold text-muted-foreground/50 uppercase tracking-wider mb-2 px-2">Mes listes</div>
                  {[
                    { name: 'Projet v2', count: 4, active: true },
                    { name: 'Perso', count: 2, active: false },
                    { name: 'Courses', count: 6, active: false },
                  ].map((l, i) => (
                    <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs ${l.active ? 'bg-violet-500/20 text-violet-400 font-semibold border border-violet-500/20' : 'text-muted-foreground'}`}>
                      <CheckSquare size={12} />
                      <span className="flex-1 truncate">{l.name}</span>
                      <span className="text-[0.55rem] opacity-50">{l.count}</span>
                    </div>
                  ))}
                  <div className="mt-2 border-t border-white/8 pt-2">
                    <div className="text-[0.65rem] font-bold text-muted-foreground/50 uppercase tracking-wider mb-2 px-2">Dossiers</div>
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-muted-foreground">
                      <FolderOpen size={12} />
                      <span>Travail</span>
                    </div>
                  </div>
                </div>
                <div className="flex-1 p-4 overflow-hidden">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-bold">Projet v2</div>
                    <div className="flex gap-1">
                      {[
                        { label: 'Toutes', active: true },
                        { label: 'A faire', active: false },
                        { label: 'En cours', active: false },
                        { label: 'Terminee', active: false },
                      ].map((f, i) => (
                        <button key={i} className={`px-2 py-1 rounded-lg text-[0.6rem] font-medium border-none cursor-default ${f.active ? 'bg-violet-500/20 text-violet-400' : 'text-muted-foreground bg-transparent'}`}>
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {[
                    { text: 'Refaire la page d\'accueil', status: 'doing', statusLabel: 'En cours', statusColor: '#4dabf7', priority: '#ff6b6b', tags: [{ name: 'Urgent', color: '#ff6b6b' }], subtasks: '2/3' },
                    { text: 'Corriger le bug #142', status: 'todo', statusLabel: 'A faire', statusColor: '#9899b3', priority: '#ffd43b', tags: [{ name: 'Travail', color: '#4dabf7' }], subtasks: null },
                    { text: 'Écrire les tests', status: 'todo', statusLabel: 'A faire', statusColor: '#9899b3', priority: '#51cf66', tags: [], subtasks: '0/5' },
                    { text: 'Déployer en production', status: 'done', statusLabel: 'Terminee', statusColor: '#51cf66', priority: '#ff6b6b', tags: [{ name: 'Urgent', color: '#ff6b6b' }], subtasks: '3/3' },
                  ].map((t, i) => (
                    <div key={i} className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl mb-1 bg-white/[0.03] border border-white/8 hover:border-white/15 transition-colors group">
                      <GripVertical size={10} className="text-muted-foreground/20 shrink-0" />
                      <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ background: t.statusColor + '20' }}>
                        {t.status === 'done' ? <Check size={10} style={{ color: t.statusColor }} /> :
                         t.status === 'doing' ? <Clock size={10} style={{ color: t.statusColor }} /> :
                         <Circle size={10} style={{ color: t.statusColor }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`text-xs ${t.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{t.text}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: t.priority }} />
                          {t.tags.map((tag, ti) => (
                            <span key={ti} className="text-[0.5rem] px-1.5 py-0.5 rounded-md font-medium" style={{ background: tag.color + '20', color: tag.color }}>
                              {tag.name}
                            </span>
                          ))}
                          {t.subtasks && (
                            <span className="text-[0.5rem] text-muted-foreground">{t.subtasks}</span>
                          )}
                        </div>
                      </div>
                      {i === 0 && <Star size={10} className="text-amber-400 fill-amber-400 shrink-0" />}
                    </div>
                  ))}
                  <div className="mt-2 flex items-center gap-2 px-2.5 py-2 rounded-xl border border-dashed border-white/10 text-xs text-muted-foreground/50">
                    Ajouter une tache puis appuyez Entree...
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURE 2 — KANBAN ═══ */}
      <section className="py-20 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/[0.05] via-cyan-500/[0.03] to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center relative z-10">
          {/* Mockup fidèle Kanban */}
          <div className="order-2 lg:order-1 relative float-slow">
            <div className="absolute -inset-6 bg-gradient-to-br from-blue-500/20 to-cyan-500/15 rounded-3xl blur-3xl" />
            <div className="glow-border glow-border-always relative z-10"><div className="rounded-2xl bg-card/80 backdrop-blur-sm overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10">
                <span className="text-xs font-bold">Sprint Q2</span>
                <span className="text-[0.55rem] text-muted-foreground ml-1">3 colonnes · 8 cartes</span>
                <div className="ml-auto flex gap-1">
                  {['Tout', 'Taches', 'Notes'].map((f, i) => (
                    <button key={i} className={`px-2 py-1 rounded-lg text-[0.55rem] font-medium border-none cursor-default ${i === 0 ? 'bg-violet-500/20 text-violet-400' : 'text-muted-foreground bg-transparent'}`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 p-4 h-[300px] overflow-hidden">
                {[
                  { label: 'A faire', color: '#a78bfa', cards: [
                    { type: 'task', title: 'Maquettes UI', list: 'Design', priority: '#f87171', tags: [{ n: 'Urgent', c: '#f87171' }] },
                    { type: 'task', title: 'Brief client', list: 'Commercial', priority: '#4ade80', tags: [] },
                    { type: 'note', title: 'Idées refonte', color: '#6c63ff' },
                  ]},
                  { label: 'En cours', color: '#60a5fa', cards: [
                    { type: 'task', title: 'Intégration API', list: 'Dev', priority: '#facc15', tags: [{ n: 'Travail', c: '#60a5fa' }], subtasks: '2/4' },
                    { type: 'task', title: 'Tests unitaires', list: 'Dev', priority: '#f87171', tags: [] },
                  ]},
                  { label: 'Terminee', color: '#4ade80', cards: [
                    { type: 'task', title: 'Setup CI/CD', list: 'DevOps', priority: '#4ade80', tags: [], done: true },
                    { type: 'task', title: 'Design system', list: 'Design', priority: '#facc15', tags: [{ n: 'Personnel', c: '#4ade80' }], done: true },
                    { type: 'note', title: 'CR Réunion', color: '#ff6b6b' },
                  ]},
                ].map((col, ci) => (
                  <div key={ci} className="flex-1 flex flex-col gap-2 min-w-0">
                    <div className="flex items-center gap-2 px-1 py-1">
                      <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ background: col.color, boxShadow: `0 0 8px ${col.color}50` }} />
                      <span className="text-[0.65rem] font-bold text-foreground">{col.label}</span>
                      <span className="text-[0.5rem] text-muted-foreground/50 ml-auto">{col.cards.length}</span>
                    </div>
                    {col.cards.map((card, ki) => (
                      <div key={ki} className="rounded-xl bg-white/[0.04] border border-white/8 p-2.5 hover:border-white/15 transition-colors">
                        {card.type === 'task' ? (
                          <>
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-4 h-4 rounded-md flex items-center justify-center" style={{ background: card.done ? '#4ade8020' : col.color + '20' }}>
                                {card.done ? <Check size={8} style={{ color: '#4ade80' }} /> : <Circle size={8} style={{ color: col.color }} />}
                              </div>
                              <span className={`text-[0.65rem] flex-1 ${card.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{card.title}</span>
                            </div>
                            <div className="flex items-center gap-1.5 pl-6">
                              <span className="text-[0.45rem] px-1.5 py-0.5 rounded-md bg-white/5 text-muted-foreground flex items-center gap-1">
                                <CheckSquare size={7} /> {card.list}
                              </span>
                              {card.tags.map((tag, ti) => (
                                <span key={ti} className="text-[0.45rem] px-1.5 py-0.5 rounded-md" style={{ background: tag.c + '20', color: tag.c }}>{tag.n}</span>
                              ))}
                              <div className="w-1.5 h-1.5 rounded-full ml-auto" style={{ background: card.priority }} />
                              {card.subtasks && <span className="text-[0.45rem] text-muted-foreground">{card.subtasks}</span>}
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-6 rounded-full shrink-0" style={{ background: card.color }} />
                            <div>
                              <span className="text-[0.65rem] text-foreground">{card.title}</span>
                              <div className="text-[0.45rem] text-muted-foreground mt-0.5">Note</div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/25 text-blue-400 text-xs font-semibold mb-5">
              <Columns3 size={12} /> TABLEAUX KANBAN
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-5">
              Glissez, déposez,{' '}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">c'est organisé</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              Créez vos colonnes, déplacez vos tâches et notes par drag & drop.{' '}
              <strong className="text-foreground">Visualisez votre progression en un coup d'oeil.</strong>
            </p>
            <div className="flex flex-col gap-3">
              {['Colonnes par défaut : A faire, En cours, Terminee', 'Colonnes personnalisées avec couleurs au choix', 'Tâches et notes sur le même board', 'Import depuis vos listes en un clic', 'Filtres par type : Tout, Taches, Notes'].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className="w-5 h-5 rounded-md bg-blue-500/15 flex items-center justify-center text-blue-400 shrink-0">
                    <Check size={12} />
                  </div>
                  <span className="text-foreground/80">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURE 3 — NOTES ═══ */}
      <section className="py-20 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.04] to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-xs font-semibold mb-4">
              <StickyNote size={12} /> NOTES
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold">
              Notes{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">riches et structurées</span>
            </h2>
          </div>

          {/* Mockup Notes — pleine largeur */}
          <div className="relative float-slow">
            <div className="absolute -inset-6 bg-gradient-to-br from-emerald-500/20 to-teal-500/15 rounded-3xl blur-3xl" />
            <div className="glow-border glow-border-always relative z-10">
            <div className="rounded-2xl bg-card/80 backdrop-blur-sm shadow-2xl overflow-hidden">
              <div className="flex h-[380px]">
                <div className="w-44 bg-white/[0.03] border-r border-white/10 p-3 flex flex-col gap-1 shrink-0">
                  <div className="text-[0.65rem] font-bold text-muted-foreground/50 uppercase tracking-wider mb-2 px-1">Mes Notes</div>
                  {[
                    { title: 'CR Réunion', color: '#6c63ff', active: true },
                    { title: 'Idées produit', color: '#ff6b6b', active: false },
                    { title: 'Todo semaine', color: '#51cf66', active: false },
                    { title: 'Ressources', color: '#4dabf7', active: false },
                  ].map((n, i) => (
                    <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[0.6rem] ${n.active ? 'bg-white/8 text-foreground font-semibold border border-white/10' : 'text-muted-foreground'}`}>
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: n.color }} />
                      <span className="truncate">{n.title}</span>
                      {i === 0 && <Star size={8} className="text-amber-400 fill-amber-400 shrink-0 ml-auto" />}
                    </div>
                  ))}
                  <div className="mt-2 border-t border-white/8 pt-2">
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[0.6rem] text-muted-foreground">
                      <FolderOpen size={10} /> Projets
                    </div>
                  </div>
                </div>
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center gap-1 px-3 py-2 border-b border-white/10">
                    {['T1', 'T2', 'B', 'I', '<>', '—', '[ ]', '> '].map((btn, i) => (
                      <button key={i} className="w-6 h-6 rounded-md text-[0.55rem] font-mono text-muted-foreground bg-transparent border border-white/8 flex items-center justify-center cursor-default hover:bg-white/5">
                        {btn}
                      </button>
                    ))}
                    <div className="ml-auto flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full border-2 border-[#6c63ff]" style={{ background: '#6c63ff' }} />

                    </div>
                  </div>
                  <div className="flex-1 flex">
                    <div className="flex-1 p-4 font-mono text-[0.65rem] text-muted-foreground leading-loose">
                      <div className="text-violet-400 font-bold"># CR Réunion</div>
                      <div className="mt-2 text-foreground/60">## Points abordés</div>
                      <div className="mt-1">- Lancement **v2.0** prêt</div>
                      <div>- Design system validé</div>
                      <div>- Planning Q2 à finaliser</div>
                      <div className="mt-2 text-foreground/60">## Actions</div>
                      <div className="mt-1">- [ ] Finaliser maquettes</div>
                      <div>- [x] Préparer la démo</div>
                      <div className="mt-2 text-emerald-400/60">{'>'} Deadline : vendredi</div>
                      <div className="mt-2">---</div>
                      <div className="mt-1">*Prochaine réunion lundi 14h*</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-3 py-1.5 border-t border-white/8 text-[0.5rem] text-muted-foreground/50">
                    <span>47 mots · 234 car.</span>
                    <span>Classique</span>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURE 4 — PARTAGE ═══ */}
      <section className="py-20 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/[0.04] to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center relative z-10">
          {/* Mockup partage */}
          <div className="order-2 lg:order-1 relative float-slow">
            <div className="absolute -inset-6 bg-gradient-to-br from-amber-500/20 to-orange-500/15 rounded-3xl blur-3xl" />
            <div className="glow-border glow-border-always relative z-10">
            <div className="rounded-2xl bg-card/80 backdrop-blur-sm p-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <Share2 size={16} className="text-amber-400" />
                <div className="text-sm font-bold">Partager cette liste</div>
              </div>
              {/* Tabs */}
              <div className="flex gap-1 mb-4 p-1 rounded-lg bg-white/[0.04]">
                <div className="flex-1 text-center text-[0.65rem] font-semibold py-1.5 rounded-md bg-white/8 text-foreground">Par email</div>
                <div className="flex-1 text-center text-[0.65rem] font-medium py-1.5 rounded-md text-muted-foreground">Lien public</div>
              </div>
              {/* Email invite */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-[0.65rem] text-muted-foreground">marie@example.com</div>
                <div className="px-2.5 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-[0.6rem] text-muted-foreground">Éditeur ▾</div>
              </div>
              {/* Members */}
              {[
                { name: 'Antoine G.', role: 'Propriétaire', color: '#8b5cf6', letter: 'A' },
                { name: 'Marie L.', role: 'Éditeur', color: '#ec4899', letter: 'M' },
                { name: 'Thomas R.', role: 'Lecteur', color: '#3b82f6', letter: 'T' },
              ].map((m, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 hover:bg-white/[0.04] transition-colors">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[0.6rem] font-bold shrink-0" style={{ background: m.color }}>
                    {m.letter}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-foreground">{m.name}</div>
                  </div>
                  <span className="text-[0.55rem] font-semibold px-2 py-0.5 rounded-md bg-white/8 text-muted-foreground">{m.role}</span>
                </div>
              ))}
              {/* Public link */}
              <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/8 border border-amber-500/15 text-[0.65rem]">
                <Link2 size={12} className="text-amber-400" />
                <span className="text-muted-foreground truncate">makeyourlist.app/share/ab3f...</span>
                <span className="ml-auto text-amber-400 font-semibold text-[0.6rem] cursor-pointer">Copier</span>
              </div>
            </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400 text-xs font-semibold mb-5">
              <Share2 size={12} /> PARTAGE
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-5">
              Partagez vos listes et notes{' '}
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">en un clic</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              Invitez par email avec un rôle précis, ou générez un lien public en lecture seule.{' '}
              <strong className="text-foreground">Chaque membre a des permissions claires.</strong>
            </p>
            <div className="flex flex-col gap-3">
              {['Partage par email avec rôles (Propriétaire, Éditeur, Lecteur)', 'Lien public en lecture seule', 'Synchronisation temps réel entre membres', 'Journal d\'activité partagé'].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className="w-5 h-5 rounded-md bg-amber-500/15 flex items-center justify-center text-amber-400 shrink-0">
                    <Check size={12} />
                  </div>
                  <span className="text-foreground/80">{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-violet-400 bg-violet-500/15 border border-violet-500/20 px-3 py-1.5 rounded-full">
              <Crown size={12} /> À partir du plan Étudiant
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURE 5 — EXPORT DE NOTES ═══ */}
      <section className="py-20 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-pink-500/[0.04] to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-pink-500/15 border border-pink-500/25 text-pink-400 text-xs font-semibold mb-5">
              <Download size={12} /> EXPORT
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-5">
              Exportez vos notes en{' '}
              <span className="bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent">HTML, PDF ou Word</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              Téléchargez vos notes dans le format de votre choix. Le HTML est gratuit pour tous.{' '}
              <strong className="text-foreground">PDF et Word sont disponibles dès le plan Pro.</strong>
            </p>
            <div className="flex flex-col gap-3">
              {['Export HTML gratuit avec styles intégrés', 'Export PDF via impression navigateur', 'Export Word (.doc) compatible Microsoft Office', 'Mise en page responsive, prête à imprimer'].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className="w-5 h-5 rounded-md bg-pink-500/15 flex items-center justify-center text-pink-400 shrink-0">
                    <Check size={12} />
                  </div>
                  <span className="text-foreground/80">{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-violet-400 bg-violet-500/15 border border-violet-500/20 px-3 py-1.5 rounded-full">
              <Crown size={12} /> PDF & Word dès le plan Pro
            </div>
          </div>

          {/* Mockup export */}
          <div className="relative float-slow">
            <div className="absolute -inset-6 bg-gradient-to-br from-pink-500/20 to-rose-500/15 rounded-3xl blur-3xl" />
            <div className="glow-border glow-border-always relative z-10">
            <div className="rounded-2xl bg-card/80 backdrop-blur-sm p-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-5">
                <Download size={16} className="text-pink-400" />
                <div className="text-sm font-bold">Exporter la note</div>
              </div>
              <div className="space-y-2.5">
                {[
                  { format: 'HTML', ext: '.html', desc: 'Avec styles intégrés', color: '#f97316', free: true },
                  { format: 'PDF', ext: '.pdf', desc: 'Via impression navigateur', color: '#ef4444', free: false },
                  { format: 'Word', ext: '.doc', desc: 'Compatible Microsoft Office', color: '#3b82f6', free: false },
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/8 hover:border-white/15 transition-colors cursor-pointer">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-[0.6rem] font-bold" style={{ background: f.color }}>
                      {f.ext}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-foreground">{f.format}</div>
                      <div className="text-[0.6rem] text-muted-foreground/60">{f.desc}</div>
                    </div>
                    {f.free ? (
                      <span className="text-[0.55rem] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">Gratuit</span>
                    ) : (
                      <span className="text-[0.55rem] font-semibold px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400">Pro</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURE 6 — API REST ═══ */}
      <section className="py-20 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-teal-500/[0.04] to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center relative z-10">
          {/* Mockup API */}
          <div className="order-2 lg:order-1 relative float-slow">
            <div className="absolute -inset-6 bg-gradient-to-br from-teal-500/20 to-cyan-500/15 rounded-3xl blur-3xl" />
            <div className="glow-border glow-border-always relative z-10">
            <div className="rounded-2xl bg-card/80 backdrop-blur-sm p-5 shadow-2xl font-mono text-[0.7rem]">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                </div>
                <span className="text-muted-foreground/50 text-[0.6rem] ml-1">Terminal</span>
              </div>
              <div className="space-y-2 text-muted-foreground">
                <div><span className="text-emerald-400">$</span> curl -H <span className="text-amber-400">"apikey: myl_sk_..."</span> \</div>
                <div className="pl-4 text-teal-400">https://api.makeyourlist.app/todos</div>
                <div className="mt-3 text-muted-foreground/50">{'{'}</div>
                <div className="pl-3"><span className="text-blue-400">"data"</span>: [</div>
                <div className="pl-6">{'{'} <span className="text-blue-400">"id"</span>: <span className="text-amber-400">"a1b2..."</span>,</div>
                <div className="pl-8"><span className="text-blue-400">"text"</span>: <span className="text-emerald-400">"Finaliser le design"</span>,</div>
                <div className="pl-8"><span className="text-blue-400">"done"</span>: <span className="text-violet-400">false</span> {'}'}</div>
                <div className="pl-3">],</div>
                <div className="pl-3"><span className="text-blue-400">"count"</span>: <span className="text-violet-400">24</span></div>
                <div className="text-muted-foreground/50">{'}'}</div>
              </div>
            </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/15 border border-teal-500/25 text-teal-400 text-xs font-semibold mb-5">
              <Code2 size={12} /> API REST
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-5">
              Automatisez tout avec{' '}
              <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">notre API</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              Générez une clé API depuis votre profil et accédez à vos tâches, notes et projets par programmation.{' '}
              <strong className="text-foreground">Documentation interactive intégrée à l'app.</strong>
            </p>
            <div className="flex flex-col gap-3">
              {['Clé API personnelle sécurisée', 'Endpoints REST pour tâches, notes, projets', 'Documentation interactive avec exemples cURL', 'Réponses JSON standardisées'].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className="w-5 h-5 rounded-md bg-teal-500/15 flex items-center justify-center text-teal-400 shrink-0">
                    <Check size={12} />
                  </div>
                  <span className="text-foreground/80">{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-violet-400 bg-violet-500/15 border border-violet-500/20 px-3 py-1.5 rounded-full">
              <Crown size={12} /> À partir du plan Étudiant
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURE 7 — APPLICATION MOBILE ═══ */}
      <section className="py-20 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/[0.04] to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center relative z-10">
          {/* Phone mockup */}
          <div className="order-2 lg:order-1 relative float-slow">
            <div className="absolute -inset-6 bg-gradient-to-br from-blue-500/20 to-cyan-500/15 rounded-3xl blur-3xl" />
            <div className="glow-border glow-border-always relative z-10">
            <div className="rounded-2xl bg-card/80 backdrop-blur-sm p-6 shadow-2xl flex justify-center">
              <div className="w-52 relative">
                <div className="rounded-[2rem] border-4 border-white/15 bg-background overflow-hidden shadow-2xl">
                  <div className="h-5 bg-white/[0.04] flex items-center justify-center"><div className="w-14 h-1.5 rounded-full bg-white/10" /></div>
                  <div className="p-3 space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5.5 12.5 L9.5 16.5 L18.5 6.5"/></svg>
                      </div>
                      <span className="text-[0.55rem] font-bold text-foreground">Make Your List</span>
                      <div className="ml-auto w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center"><User size={9} className="text-violet-400" /></div>
                    </div>
                    {['Design system v2','Préparer la démo','Brief client final'].map((t,i) => (
                      <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/8">
                        <div className={`w-3 h-3 rounded-md border-2 flex items-center justify-center shrink-0 ${i === 2 ? 'border-emerald-400 bg-emerald-400' : 'border-white/20'}`}>
                          {i === 2 && <Check size={7} className="text-white" />}
                        </div>
                        <span className={`text-[0.5rem] ${i === 2 ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{t}</span>
                      </div>
                    ))}
                    <div className="flex gap-1.5 mt-1">
                      {['Tâches','Kanban','Notes'].map((tab,i) => (
                        <div key={i} className={`flex-1 text-center py-1 rounded-md text-[0.45rem] font-medium ${i === 0 ? 'bg-violet-500/20 text-violet-400' : 'text-muted-foreground/50'}`}>{tab}</div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="absolute -right-6 top-6 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/20 text-[0.5rem] text-emerald-400 font-semibold shadow-lg">Hors-ligne ✓</div>
                <div className="absolute -left-5 bottom-12 px-2 py-0.5 rounded-md bg-violet-500/15 border border-violet-500/20 text-[0.5rem] text-violet-400 font-semibold shadow-lg">PWA</div>
              </div>
            </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/25 text-blue-400 text-xs font-semibold mb-5">
              <Smartphone size={12} /> APPLICATION MOBILE
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-5">
              Emportez votre workspace{' '}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">partout avec vous</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              Installez Make Your List en un tap depuis votre navigateur.{' '}
              <strong className="text-foreground">Pas de store, pas de téléchargement lourd.</strong> L'app fonctionne même hors-ligne.
            </p>
            <div className="flex flex-col gap-3">
              {['Installation instantanée depuis le navigateur', 'Fonctionne hors-ligne avec synchronisation auto', 'Mises à jour automatiques transparentes', 'Compatible iOS, Android et Desktop'].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className="w-5 h-5 rounded-md bg-blue-500/15 flex items-center justify-center text-blue-400 shrink-0">
                    <Check size={12} />
                  </div>
                  <span className="text-foreground/80">{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/15 border border-emerald-500/20 px-3 py-1.5 rounded-full">
              <Check size={12} /> Gratuit pour tous
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-20 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-500/[0.05] to-transparent pointer-events-none" />
        <div className="glow-border glow-border-always max-w-3xl mx-auto relative z-10">
        <div className="text-center rounded-2xl overflow-hidden p-12 bg-card/80 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-pink-500/5 to-amber-500/5 pointer-events-none" />
          <div className="relative">
            <h2 className="text-3xl font-extrabold mb-4 animated-gradient-text">
              Prêt à gagner du temps ?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Créez votre compte en 30 secondes. <strong className="text-foreground">Gratuit, sans carte bancaire.</strong>
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/inscription"
                className="pulse-glow group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold no-underline shadow-2xl shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-105 transition-all relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                <Rocket size={16} />
                Commencer gratuitement <ArrowRight size={16} />
              </Link>
              <Link
                to="/tarifs"
                className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl bg-white/8 text-foreground font-semibold no-underline border border-white/15 hover:bg-white/15 transition-all"
              >
                <Crown size={16} className="text-violet-400" /> Voir les tarifs
              </Link>
            </div>
          </div>
        </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
