import {
  CheckSquare, Columns3, StickyNote, Share2, Star, Code2, Users,
  ArrowLeft, Check, Sparkles, Crown, Rocket, ArrowRight,
  GripVertical, Clock, FolderOpen, FileText, Download, Shield, Link2,
  Smartphone, Wifi, WifiOff, RefreshCw
} from 'lucide-react'
import Footer from './Footer'
import { usePageMeta } from '../hooks/usePageMeta'
import { Link } from 'react-router-dom'

const FEATURES = {
  listes: {
    icon: <CheckSquare size={28} />,
    title: 'Listes de tâches',
    subtitle: 'Organisez chaque détail de vos projets',
    gradient: 'from-violet-500 to-purple-600',
    color: '#8b5cf6',
    heroDesc: 'Des listes puissantes qui s\'adaptent à votre façon de travailler. Priorisez, catégorisez, suivez — tout est sous contrôle.',
    sections: [
      {
        title: 'Statuts intelligents',
        desc: 'Chaque tâche suit un workflow clair : À faire → En cours → Terminée. Visualisez instantanément où en est chaque élément.',
        points: ['3 statuts visuels avec codes couleur', 'Filtrage rapide par statut', 'Compteur de progression automatique'],
      },
      {
        title: 'Priorités & Tags',
        desc: 'Marquez ce qui est urgent, catégorisez par projet ou contexte. Les tags colorés rendent tout lisible en un coup d\'œil.',
        points: ['3 niveaux de priorité (Basse, Moyenne, Haute)', 'Tags personnalisés illimités', 'Filtres combinables pour retrouver n\'importe quoi'],
      },
      {
        title: 'Sous-tâches',
        desc: 'Décomposez les tâches complexes en étapes. La barre de progression se met à jour automatiquement.',
        points: ['Sous-tâches imbriquées', 'Barre de progression visuelle', 'Cochez les sous-tâches indépendamment'],
      },
      {
        title: 'Actions par lot',
        desc: 'Sélectionnez plusieurs tâches d\'un coup et appliquez des modifications en masse. Fini le clic-par-clic.',
        points: ['Sélection multiple avec checkbox', 'Modification de statut/priorité en lot', 'Suppression groupée sécurisée'],
      },
    ],
    mockup: 'tasks',
  },
  kanban: {
    icon: <Columns3 size={28} />,
    title: 'Vue Kanban',
    subtitle: 'Votre workflow, enfin visible',
    gradient: 'from-blue-500 to-cyan-500',
    color: '#3b82f6',
    heroDesc: 'Passez de la vue liste au Kanban en un clic. Glissez, déposez, réorganisez — votre productivité devient visuelle.',
    sections: [
      {
        title: 'Drag & Drop natif',
        desc: 'Déplacez vos tâches entre colonnes avec un glisser-déposer fluide et réactif. L\'interface suit vos gestes naturellement.',
        points: ['Drag & drop sur mobile et desktop', 'Animation fluide en temps réel', 'Réorganisation libre dans chaque colonne'],
      },
      {
        title: 'Colonnes personnalisables',
        desc: 'Vos colonnes correspondent à vos statuts. Chaque déplacement met à jour automatiquement le statut de la tâche.',
        points: ['Colonnes = statuts (À faire, En cours, Terminée)', 'Compteur de tâches par colonne', 'Vue d\'ensemble instantanée'],
      },
      {
        title: 'Filtres & Tri',
        desc: 'Filtrez par priorité, tag ou membre. Triez par date, importance ou ordre personnalisé.',
        points: ['Filtres combinables en temps réel', 'Tri par priorité, date, nom', 'Recherche dans le Kanban'],
      },
      {
        title: 'Basculement instantané',
        desc: 'Un seul clic pour passer de la vue liste à la vue Kanban. Vos données restent les mêmes, seule la présentation change.',
        points: ['Transition fluide entre les vues', 'Même données, présentation différente', 'Préférence sauvegardée par projet'],
      },
    ],
    mockup: 'kanban',
  },
  notes: {
    icon: <StickyNote size={28} />,
    title: 'Notes',
    subtitle: 'Vos idées, organisées et accessibles',
    gradient: 'from-emerald-500 to-teal-500',
    color: '#10b981',
    heroDesc: 'Un éditeur riche et intuitif pour capturer vos idées, rédiger vos comptes-rendus et structurer votre pensée.',
    sections: [
      {
        title: 'Éditeur riche',
        desc: 'Formatez vos notes avec des titres, du gras, des listes, des citations et des cases à cocher. Tout ce qu\'il faut, rien de trop.',
        points: ['Titres, gras, italique, code', 'Listes à puces et numérotées', 'Cases à cocher intégrées'],
      },
      {
        title: '8 couleurs de note',
        desc: 'Assignez une couleur à chaque note pour les identifier visuellement. Idéal pour séparer projets, contextes ou priorités.',
        points: ['8 couleurs vives disponibles', 'Identification visuelle instantanée', 'Personnalisation par note'],
      },
      {
        title: 'Dossiers & Organisation',
        desc: 'Rangez vos notes dans des dossiers pour les retrouver facilement. Combinez avec les favoris pour un accès direct.',
        points: ['Arborescence de dossiers', 'Glisser-déposer pour ranger', 'Favoris pour accès rapide'],
      },
      {
        title: 'Aperçu en temps réel',
        desc: 'Voyez le rendu final au fur et à mesure que vous écrivez. Pas besoin de basculer entre modes.',
        points: ['Rendu live instantané', 'Compteur de mots et caractères', 'Interface épurée et concentrée'],
      },
    ],
    mockup: 'notes',
  },
  partage: {
    icon: <Share2 size={28} />,
    title: 'Partage',
    subtitle: 'Partagez vos listes et notes facilement',
    gradient: 'from-amber-500 to-orange-500',
    color: '#f59e0b',
    heroDesc: 'Invitez par email avec un rôle précis ou générez un lien public en lecture seule. Chaque membre a des permissions claires.',
    sections: [
      {
        title: 'Partage par email',
        desc: 'Invitez n\'importe qui en saisissant son adresse email. Choisissez le rôle avant d\'envoyer pour garder le contrôle.',
        points: ['Invitation par adresse email', 'Choix du rôle à l\'invitation', 'Suppression d\'accès en un clic'],
      },
      {
        title: '3 rôles distincts',
        desc: 'Propriétaire, Éditeur, Lecteur — chaque membre a des permissions claires. Gardez le contrôle sans bloquer personne.',
        points: ['Propriétaire : accès total', 'Éditeur : modification des tâches et notes', 'Lecteur : consultation seule'],
      },
      {
        title: 'Lien public',
        desc: 'Générez un lien public en lecture seule pour partager une liste ou une note avec n\'importe qui, sans compte requis.',
        points: ['Lien partageable en un clic', 'Lecture seule pour les visiteurs', 'Accessible sans inscription'],
      },
      {
        title: 'Synchronisation temps réel',
        desc: 'Chaque modification apparaît instantanément chez tous les membres. Pas besoin de rafraîchir.',
        points: ['Mises à jour instantanées', 'Journal d\'activité partagé', 'Synchronisation automatique'],
      },
    ],
    mockup: 'collab',
  },
  export: {
    icon: <Download size={28} />,
    title: 'Export de notes',
    subtitle: 'Téléchargez vos notes dans le format de votre choix',
    gradient: 'from-pink-500 to-rose-500',
    color: '#ec4899',
    heroDesc: 'Exportez vos notes en HTML (gratuit), PDF ou Word (.doc). Gardez une copie locale de vos contenus, prête à imprimer ou à partager.',
    sections: [
      {
        title: 'Export HTML',
        desc: 'Téléchargez vos notes en fichier HTML complet avec styles intégrés. Fonctionne dans n\'importe quel navigateur.',
        points: ['Styles dark/light intégrés', 'Mise en page responsive', 'Gratuit pour tous les plans'],
      },
      {
        title: 'Export PDF',
        desc: 'Générez un PDF via l\'impression navigateur. Idéal pour archiver ou envoyer un compte-rendu formaté.',
        points: ['Impression navigateur native', 'Mise en page prête à imprimer', 'Disponible dès le plan Pro'],
      },
      {
        title: 'Export Word (.doc)',
        desc: 'Exportez en fichier .doc compatible Microsoft Office. Encodage UTF-8 pour garder les accents et caractères spéciaux.',
        points: ['Compatible Microsoft Word', 'Encodage UTF-8 complet', 'Disponible dès le plan Pro'],
      },
      {
        title: 'Formatage conservé',
        desc: 'Vos titres, listes, gras, italique et cases à cocher sont fidèlement reproduits dans chaque format d\'export.',
        points: ['Titres et sous-titres', 'Listes à puces et numérotées', 'Mise en forme riche conservée'],
      },
    ],
    mockup: 'export',
  },
  api: {
    icon: <Code2 size={28} />,
    title: 'API REST',
    subtitle: 'Automatisez et intégrez vos données',
    gradient: 'from-teal-500 to-cyan-500',
    color: '#14b8a6',
    heroDesc: 'Générez une clé API depuis votre profil et accédez à vos tâches, notes et projets par programmation. Documentation interactive intégrée.',
    sections: [
      {
        title: 'Clé API sécurisée',
        desc: 'Générez et gérez votre clé API personnelle depuis votre profil. Révocation possible à tout moment pour garder le contrôle.',
        points: ['Génération depuis le profil utilisateur', 'Clé unique par compte', 'Révocation instantanée'],
      },
      {
        title: 'Endpoints REST complets',
        desc: 'Accédez à vos tâches, notes et projets via des endpoints REST standardisés. CRUD complet sur toutes vos données.',
        points: ['GET, POST, PUT, DELETE sur chaque ressource', 'Réponses JSON standardisées', 'Codes d\'erreur documentés'],
      },
      {
        title: 'Documentation interactive',
        desc: 'Une page de documentation intégrée à l\'app avec exemples concrets et possibilité de tester les endpoints directement.',
        points: ['Exemples cURL pour chaque endpoint', 'Codes de réponse documentés', 'Guide de démarrage rapide'],
      },
      {
        title: 'Compatible partout',
        desc: 'Utilisez l\'API depuis n\'importe quel langage ou outil : cURL, Python, JavaScript, Postman, etc.',
        points: ['Compatible avec n\'importe quel langage', 'Authentification par header simple', 'Format JSON universel'],
      },
    ],
    mockup: 'api',
  },
  mobile: {
    icon: <Smartphone size={28} />,
    title: 'Application mobile',
    subtitle: 'Votre workspace dans la poche',
    gradient: 'from-blue-500 to-cyan-500',
    color: '#3b82f6',
    heroDesc: 'Installez Make Your List en un tap depuis votre navigateur. Pas de store, pas de téléchargement lourd — une Progressive Web App rapide qui fonctionne même hors-ligne.',
    sections: [
      {
        title: 'Installation instantanée',
        desc: 'Ajoutez l\'app à votre écran d\'accueil directement depuis Safari ou Chrome. Aucun passage par un store nécessaire.',
        points: ['Un tap pour installer depuis le navigateur', 'Icône sur l\'écran d\'accueil', 'Lancement en plein écran comme une app native'],
      },
      {
        title: 'Fonctionne hors-ligne',
        desc: 'Grâce au Service Worker, l\'application charge instantanément même sans connexion. Vos données se synchronisent au retour du réseau.',
        points: ['Cache intelligent des données', 'Indicateur de connexion en temps réel', 'Synchronisation automatique au retour en ligne'],
      },
      {
        title: 'Mises à jour automatiques',
        desc: 'Pas besoin de mettre à jour manuellement. Chaque visite vérifie les nouvelles versions et les applique en arrière-plan.',
        points: ['Notification de mise à jour disponible', 'Application automatique au prochain lancement', 'Toujours la dernière version'],
      },
      {
        title: 'Compatible partout',
        desc: 'iOS, Android, Windows, macOS, Linux — Make Your List s\'adapte à tous vos écrans avec une interface responsive.',
        points: ['iOS (Safari) et Android (Chrome)', 'Desktop Windows, macOS, Linux', 'Interface adaptée à chaque taille d\'écran'],
      },
    ],
    mockup: 'mobile',
  },
}

/* ── Mini mockups for each feature ── */
function TasksMockup({ color }) {
  const tasks = [
    { title: 'Finaliser maquettes v2', status: 'En cours', priority: 'Haute', pColor: '#ef4444', tags: ['Design'], progress: 60 },
    { title: 'Rédiger specs API', status: 'À faire', priority: 'Moyenne', pColor: '#f59e0b', tags: ['Backend'], progress: 0 },
    { title: 'Tests unitaires auth', status: 'Terminée', priority: 'Haute', pColor: '#ef4444', tags: ['Dev'], progress: 100 },
    { title: 'Mise en prod v1.8', status: 'En cours', priority: 'Basse', pColor: '#22c55e', tags: ['DevOps'], progress: 30 },
  ]
  return (
    <div className="space-y-2">
      {tasks.map((t, i) => (
        <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl ${t.status === 'Terminée' ? 'bg-white/[0.02] opacity-60' : 'bg-white/[0.04]'} border border-white/8 transition-all hover:border-white/15`}>
          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${t.status === 'Terminée' ? 'border-emerald-400 bg-emerald-400' : t.status === 'En cours' ? 'border-blue-400' : 'border-white/20'}`}>
            {t.status === 'Terminée' && <Check size={10} className="text-white" />}
          </div>
          <span className={`text-xs font-medium flex-1 ${t.status === 'Terminée' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{t.title}</span>
          <span className="text-[0.55rem] px-1.5 py-0.5 rounded font-semibold" style={{ background: `${t.pColor}20`, color: t.pColor }}>{t.priority}</span>
          <span className="text-[0.55rem] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400 font-medium">{t.tags[0]}</span>
          {t.progress > 0 && t.progress < 100 && (
            <div className="w-12 h-1 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500" style={{ width: `${t.progress}%` }} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function KanbanMockup() {
  const cols = [
    { title: 'À faire', color: '#6b7280', items: ['Refonte header', 'Docs API v2'] },
    { title: 'En cours', color: '#3b82f6', items: ['Système de filtres', 'Page pricing'] },
    { title: 'Terminée', color: '#22c55e', items: ['Auth flow', 'Setup CI/CD', 'Landing page'] },
  ]
  return (
    <div className="flex gap-3">
      {cols.map((col, ci) => (
        <div key={ci} className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
            <span className="text-[0.6rem] font-bold text-muted-foreground uppercase tracking-wider">{col.title}</span>
            <span className="text-[0.5rem] text-muted-foreground/50 ml-auto">{col.items.length}</span>
          </div>
          <div className="space-y-1.5">
            {col.items.map((item, ii) => (
              <div key={ii} className="px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/8 text-[0.6rem] text-foreground/80 hover:border-white/15 transition-colors cursor-grab">
                {item}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function NotesMockup() {
  return (
    <div className="flex h-[280px]">
      <div className="w-36 bg-white/[0.02] border-r border-white/8 p-2 flex flex-col gap-1 shrink-0">
        <div className="text-[0.55rem] font-bold text-muted-foreground/50 uppercase tracking-wider mb-1 px-1">Notes</div>
        {[
          { title: 'CR Réunion', color: '#6c63ff', active: true },
          { title: 'Idées produit', color: '#ff6b6b' },
          { title: 'Todo semaine', color: '#51cf66' },
        ].map((n, i) => (
          <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[0.55rem] ${n.active ? 'bg-white/8 text-foreground font-semibold border border-white/10' : 'text-muted-foreground'}`}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: n.color }} />
            <span className="truncate">{n.title}</span>
          </div>
        ))}
      </div>
      <div className="flex-1 p-4 font-mono text-[0.6rem] text-muted-foreground leading-loose">
        <div className="text-violet-400 font-bold text-xs"># CR Réunion</div>
        <div className="mt-2 text-foreground/60">## Points abordés</div>
        <div className="mt-1">- Lancement **v2.0** prêt</div>
        <div>- Design system validé</div>
        <div className="mt-2 text-foreground/60">## Actions</div>
        <div className="mt-1">- [ ] Finaliser maquettes</div>
        <div>- [x] Préparer la démo</div>
        <div className="mt-2 text-emerald-400/60">{'>'} Deadline : vendredi</div>
      </div>
    </div>
  )
}

function CollabMockup() {
  const members = [
    { name: 'Antoine G.', role: 'Propriétaire', color: '#8b5cf6', letter: 'A' },
    { name: 'Marie L.', role: 'Éditeur', color: '#ec4899', letter: 'M' },
    { name: 'Thomas R.', role: 'Lecteur', color: '#3b82f6', letter: 'T' },
  ]
  return (
    <div className="p-4 space-y-2">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs font-bold">Membres du projet</span>
        <span className="text-[0.55rem] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold ml-auto">3 en ligne</span>
      </div>
      {members.map((m, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors">
          <div className="relative">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[0.6rem] font-bold" style={{ background: m.color }}>{m.letter}</div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border-2 border-card" />
          </div>
          <span className="text-xs font-medium flex-1">{m.name}</span>
          <span className="text-[0.55rem] font-semibold px-2 py-1 rounded-md bg-white/8 text-muted-foreground">{m.role}</span>
        </div>
      ))}
      <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-white/15 text-[0.6rem] text-muted-foreground cursor-pointer hover:border-violet-500/30 hover:text-violet-400 transition-colors">
        <Users size={12} /> Inviter par email...
      </div>
    </div>
  )
}

function ExportMockup() {
  return (
    <div className="p-5">
      <div className="flex items-center gap-3 mb-5">
        <Download size={16} className="text-pink-400" />
        <span className="text-xs font-bold">Exporter la note</span>
      </div>
      <div className="space-y-2.5">
        {[
          { format: 'HTML', ext: '.html', desc: 'Avec styles intégrés', color: '#f97316', badge: 'Gratuit', badgeColor: 'emerald' },
          { format: 'PDF', ext: '.pdf', desc: 'Via impression navigateur', color: '#ef4444', badge: 'Pro', badgeColor: 'violet' },
          { format: 'Word', ext: '.doc', desc: 'Compatible Microsoft Office', color: '#3b82f6', badge: 'Pro', badgeColor: 'violet' },
        ].map((f, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/8 hover:border-white/15 transition-colors cursor-pointer">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[0.55rem] font-bold" style={{ background: f.color }}>
              {f.ext}
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-foreground">{f.format}</div>
              <div className="text-[0.55rem] text-muted-foreground/60">{f.desc}</div>
            </div>
            <span className={`text-[0.5rem] font-semibold px-2 py-0.5 rounded-full bg-${f.badgeColor}-500/15 text-${f.badgeColor}-400`}>{f.badge}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ApiMockup() {
  return (
    <div className="p-5 font-mono text-[0.65rem] space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
        </div>
        <span className="text-muted-foreground/50 text-[0.55rem] ml-1">Terminal</span>
      </div>
      <div className="text-muted-foreground">
        <div><span className="text-emerald-400">$</span> curl -H <span className="text-amber-400">"apikey: myl_sk_..."</span> \</div>
        <div className="pl-4 text-teal-400">https://api.makeyourlist.app/todos</div>
      </div>
      <div className="text-muted-foreground/50 mt-2">{'// Réponse 200 OK'}</div>
      <div className="text-muted-foreground">
        <div>{'{'}</div>
        <div className="pl-3"><span className="text-blue-400">"data"</span>: [{'{'}</div>
        <div className="pl-6"><span className="text-blue-400">"id"</span>: <span className="text-amber-400">"a1b2c3"</span>,</div>
        <div className="pl-6"><span className="text-blue-400">"text"</span>: <span className="text-emerald-400">"Finaliser le design"</span>,</div>
        <div className="pl-6"><span className="text-blue-400">"done"</span>: <span className="text-violet-400">false</span></div>
        <div className="pl-3">{'}'}],</div>
        <div className="pl-3"><span className="text-blue-400">"count"</span>: <span className="text-violet-400">24</span></div>
        <div>{'}'}</div>
      </div>
    </div>
  )
}

function MobileMockup() {
  return (
    <div className="p-5 flex justify-center">
      <div className="w-52 relative">
        <div className="rounded-[2rem] border-4 border-white/15 bg-background overflow-hidden shadow-2xl">
          <div className="h-5 bg-white/[0.04] flex items-center justify-center"><div className="w-14 h-1.5 rounded-full bg-white/10" /></div>
          <div className="p-3 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5.5 12.5 L9.5 16.5 L18.5 6.5"/></svg>
              </div>
              <span className="text-[0.55rem] font-bold text-foreground">Make Your List</span>
            </div>
            {['Finaliser maquettes','Tests unitaires','Déployer v2.0'].map((t,i) => (
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
        <div className="absolute -right-6 top-6 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/20 text-[0.5rem] text-emerald-400 font-semibold">Hors-ligne ✓</div>
        <div className="absolute -left-5 bottom-12 px-2 py-0.5 rounded-md bg-violet-500/15 border border-violet-500/20 text-[0.5rem] text-violet-400 font-semibold">PWA</div>
      </div>
    </div>
  )
}

const MOCKUPS = {
  tasks: TasksMockup,
  kanban: KanbanMockup,
  notes: NotesMockup,
  collab: CollabMockup,
  export: ExportMockup,
  api: ApiMockup,
  mobile: MobileMockup,
}

export default function FeatureDetailPage({ featureKey, onNavigate }) {
  const f = FEATURES[featureKey]
  if (!f) return null
  const nav = (p) => { onNavigate?.(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const Mockup = MOCKUPS[f.mockup]

  usePageMeta({
    title: f.title,
    description: f.heroDesc,
    path: `/fonctionnalite/${featureKey}`,
  })

  return (
    <div className="flex-1 overflow-y-auto">

      {/* ═══ HERO ═══ */}
      <section className="relative py-28 px-6 overflow-hidden noise-overlay">
        <div className="aurora-bg"><div className="aurora-orb" /></div>
        <div className="grid-pattern absolute inset-0 pointer-events-none" />
        <div className="max-w-4xl mx-auto relative z-10">
          <Link
            to="/decouvrir"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/10 text-sm font-medium mb-8 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:border-white/20 transition-all no-underline"
          >
            <ArrowLeft size={14} /> Retour aux fonctionnalités
          </Link>

          <div className="flex items-center gap-4 mb-6">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${f.gradient} flex items-center justify-center text-white shadow-2xl`} style={{ boxShadow: `0 12px 40px ${f.color}50` }}>
              {f.icon}
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight animated-gradient-text">{f.title}</h1>
              <p className="text-lg text-muted-foreground mt-1">{f.subtitle}</p>
            </div>
          </div>

          <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
            {f.heroDesc}
          </p>

          <div className="flex flex-wrap gap-3 mt-8">
            <Link
              to="/inscription"
              className="pulse-glow group inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold no-underline shadow-2xl shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-105 transition-all relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
              <Rocket size={16} /> Essayer gratuitement <ArrowRight size={16} />
            </Link>
            <Link
              to="/tarifs"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white/8 text-foreground font-semibold no-underline border border-white/15 hover:bg-white/15 transition-all"
            >
              <Crown size={16} className="text-violet-400" /> Voir les tarifs
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ MOCKUP SHOWCASE ═══ */}
      <section className="py-20 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-500/[0.03] to-transparent pointer-events-none" />
        <div className="max-w-3xl mx-auto relative z-10 float-slow">
          <div className="absolute -inset-8 bg-gradient-to-br rounded-3xl blur-3xl" style={{ background: `linear-gradient(135deg, ${f.color}20, ${f.color}08)` }} />
          <div className="glow-border glow-border-always relative z-10">
            <div className="rounded-2xl bg-card/80 backdrop-blur-sm overflow-hidden shadow-2xl">
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/8">
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <span className="text-[0.55rem] text-muted-foreground/40 ml-3 font-medium">{f.title}</span>
              </div>
              <Mockup color={f.color} />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ DETAIL SECTIONS ═══ */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            {f.sections.map((s, i) => (
              <div key={i} className="glow-border card-shimmer group" style={{ animationDelay: `${i * 0.15}s` }}>
                <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-8 h-full relative z-10 transition-all duration-300 group-hover:-translate-y-1">
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: `radial-gradient(400px circle at 50% 0%, ${f.color}12, transparent)` }} />

                  <div className="flex items-center gap-3 mb-4 relative z-10">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center text-white shadow-lg`} style={{ boxShadow: `0 6px 20px ${f.color}35` }}>
                      <span className="text-lg font-black">{i + 1}</span>
                    </div>
                    <h3 className="text-lg font-bold text-foreground">{s.title}</h3>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed mb-5 relative z-10">{s.desc}</p>

                  <div className="flex flex-col gap-2.5 relative z-10">
                    {s.points.map((point, pi) => (
                      <div key={pi} className="flex items-center gap-2.5 text-sm">
                        <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ background: `${f.color}20` }}>
                          <Check size={12} style={{ color: f.color }} />
                        </div>
                        <span className="text-foreground/80">{point}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
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
                Prêt à essayer {f.title} ?
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
                  <Rocket size={16} /> Commencer gratuitement <ArrowRight size={16} />
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

export const FEATURE_KEYS = Object.keys(FEATURES)
