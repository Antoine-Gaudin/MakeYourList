import { ExternalLink, Globe, BookOpen, Languages, BarChart3, ArrowRight } from 'lucide-react'
import { cn } from '../lib/utils'
import Footer from './Footer'
import { usePageMeta } from '../hooks/usePageMeta'

const PROJECTS = [
  {
    name: 'Make Your List',
    url: null,
    color: '#8b5cf6',
    status: 'Vous y êtes',
    statusColor: '#22c55e',
    description: 'L\'app que vous utilisez en ce moment. Gestion de tâches, Kanban, notes Markdown, collaboration temps réel. Installable en PWA, fonctionne hors-ligne.',
    tech: ['React 19', 'Supabase', 'Tailwind CSS', 'PWA'],
    highlights: [
      'Tâches avec priorités, tags et sous-tâches',
      'Tableaux Kanban personnalisables',
      'Notes Markdown avec preview live',
      'Collaboration en temps réel',
      'Mode hors-ligne',
    ],
  },
  {
    name: 'Novel Index',
    url: 'https://novel-index.com',
    color: '#f59e0b',
    status: 'En ligne',
    statusColor: '#22c55e',
    description: 'Plateforme d\'indexation et de découverte de web novels. Parcourez des milliers de titres, suivez votre progression de lecture, et trouvez votre prochaine lecture.',
    tech: ['Web App', 'Base de données', 'Indexation'],
    highlights: [
      'Catalogue de web novels indexés',
      'Suivi de lecture personnalisé',
      'Système de recherche et filtres',
      'Découverte de nouveaux titres',
    ],
  },
  {
    name: 'Trad Index',
    url: 'https://trad-index.com',
    color: '#4dabf7',
    status: 'En ligne',
    statusColor: '#22c55e',
    description: 'Répertoire dédié aux traductions françaises de novels. Retrouvez les dernières traductions, les équipes de traducteurs et suivez les releases.',
    tech: ['Web App', 'Traduction', 'Communauté'],
    highlights: [
      'Index des traductions françaises',
      'Suivi des sorties de chapitres',
      'Répertoire des équipes de traduction',
      'Mises à jour en temps réel',
    ],
  },
  {
    name: 'Kanveo',
    url: 'https://kanveo.fr',
    color: '#22c55e',
    status: 'En ligne',
    statusColor: '#22c55e',
    description: 'Solution de gestion visuelle de projets. Organisez vos workflows avec des tableaux intuitifs, conçu pour les équipes françaises.',
    tech: ['SaaS', 'Gestion de projet', 'Collaboration'],
    highlights: [
      'Gestion de projet visuelle',
      'Conçu pour le marché français',
      'Interface intuitive',
      'Collaboration d\'équipe',
    ],
  },
]

export default function MyProjectsPage({ onNavigate }) {
  usePageMeta({
    title: 'Mes projets',
    description: 'Découvrez les projets et réalisations de Make Your List.',
    path: '/projets',
  })

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[960px] mx-auto px-6 py-14">

        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5.5 12.5 L9.5 16.5 L18.5 6.5"/></svg> Portfolio
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
            Mes projets
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
            Des applications web pensées pour être utiles, rapides et agréables à utiliser.
          </p>
        </div>

        {/* Projects */}
        <div className="flex flex-col gap-8 mb-16">
          {PROJECTS.map((project, i) => (
            <div
              key={project.name}
              className="rounded-2xl border border-white/10 bg-card overflow-hidden hover:border-primary/20 transition-all duration-200 hover:shadow-lg"
            >
              {/* Header bar */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-border/50">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: project.color + '15', color: project.color }}>
                  <Globe size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-lg">{project.name}</h2>
                    <span className="text-[0.6rem] font-bold px-2.5 py-0.5 rounded-full" style={{ background: project.statusColor + '15', color: project.statusColor }}>
                      {project.status}
                    </span>
                  </div>
                  {project.url && (
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                    >
                      {project.url.replace('https://', '')} <ExternalLink size={10} />
                    </a>
                  )}
                </div>
                {project.url && (
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-transparent text-sm font-semibold border border-border hover:border-primary hover:text-primary transition-all no-underline text-foreground"
                  >
                    Visiter <ExternalLink size={14} />
                  </a>
                )}
              </div>

              {/* Body */}
              <div className="p-6">
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                  {project.description}
                </p>

                <div className="flex flex-col md:flex-row gap-6">
                  {/* Highlights */}
                  <div className="flex-1">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">Points clés</h4>
                    <ul className="flex flex-col gap-2">
                      {project.highlights.map(h => (
                        <li key={h} className="flex items-start gap-2.5 text-sm">
                          <BarChart3 size={14} className="shrink-0 mt-0.5" style={{ color: project.color }} />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Tech tags */}
                  <div className="md:w-[200px] shrink-0">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">Technologies</h4>
                    <div className="flex flex-wrap gap-2">
                      {project.tech.map(t => (
                        <span key={t} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-muted text-muted-foreground">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        {onNavigate && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">Envie d'essayer Make Your List ?</p>
            <button
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25 font-semibold text-sm border-none cursor-pointer hover:shadow-violet-500/40 hover:brightness-110 hover:-translate-y-0.5 transition-all active:translate-y-0"
              onClick={() => onNavigate('todos')}
            >
              Commencer gratuitement <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
