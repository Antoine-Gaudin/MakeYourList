Mes souhait sur le canvas de tabeau sont les suivants :

- Crée des schémas avec des formes géométriques simples (carré, cercle, triangle, etc.)
- Ajouter du texte à ces formes pour les annoter
- Permettre de déplacer et redimensionner les formes facilement
- Offrir une palette de couleurs pour personnaliser les formes et le texte
- Intégrer des outils de dessin à main levée pour plus de flexibilité
- Permettre l'importation d'images pour les intégrer dans les schémas
- Mettre le lien de partage pour ensuite l'envoyer à des utilisateurs ou non utilisateur comme dans les notes et tâches
- Mettre des traits de connexion entre les formes pour montrer les relations entre elles
- Offrir la possibilité de grouper des formes pour les manipuler ensemble
- Gestion des canvas de la même manière que les notes et tâches, avec la possibilité de les organiser dans des dossiers et fichier
- On doit pouvoir avoir l'option de mettre au premier plan ou arrière plan les canvas pour les superposer avec les notes et tâches
- On doit pouvoir crée une forme en posant des numéros sur le canvas et ensuite les relier pour créer une forme géométrique (1,2,3,4 pour un carré par exemple)
- télécharger le canvas en format HTML, PDF ou images pour une utilisation hors ligne ou pour les partager facilement
- ctrl + appuis long dans le canvas pour ce déplacer comme dans n8n
- Ctrl + Z pour faire un retour en arrière et Ctrl + Y pour refaire une action

---

# Recommandations & points d'attention (audit Claude)

## Stack recommandée

- **Librairie principale : React Flow (`@xyflow/react`)**
  - Conçue pour schémas structurés / org charts / flowcharts — colle au besoin "visualiser la structure d'un projet"
  - Nœuds custom en JSX : on peut y mettre n'importe quel composant Tailwind, donc réutiliser le style global de l'app
  - Panning, zoom, minimap, connexions auto-routées, sélection multi, NodeResizer : tout est natif
  - MIT, ~55 kb gz, lazy-load la page pour ne pas impacter le bundle principal
- **Dessin à main levée : `perfect-freehand` (~5 kb)** en complément
  - React Flow ne gère pas le freehand nativement
  - Stocker les tracés comme un type de nœud spécial `freehand` avec un `path` SVG
  - Rendu correct mais moins poli qu'Excalidraw — à accepter si on reste sur React Flow
- **Export image/PDF** : `toPng` / `toSvg` natifs dans React Flow, `jsPDF` pour le PDF
- **Groupement** : via les nœuds parents de React Flow (subflows) — API un peu verbeuse mais fonctionnelle

## Architecture côté projet

### Table SQL à créer
```
diagrams (
  id uuid pk,
  project_id uuid fk -> projects,
  folder_id uuid fk -> folders (nullable),
  name text,
  data jsonb,              -- { nodes: [...], edges: [...], viewport: {...} }
  position int,
  created_at timestamptz,
  updated_at timestamptz,
  created_by uuid fk -> auth.users
)
```

### Migrations complémentaires à prévoir
1. Étendre l'enum/CHECK de `folders.type` pour accepter `'diagram'`
2. Étendre l'enum/CHECK de `share_links.item_type` pour accepter `'diagram'`
3. Mettre à jour la RPC `get_shared_item` pour savoir résoudre un `item_type = 'diagram'` (même logique que pour `note`, `list`, `kanban`)
4. Policies RLS identiques à `notes` / `kanban_boards` (calées sur le project_id)
5. Index sur `(project_id)` et `(folder_id)`

### Intégration au code existant
- **`useSupabaseData.js`** : ajouter `diagrams` au fetch parallèle, aux realtime subscriptions, et créer `addDiagram / updateDiagram / deleteDiagram / setDiagrams` sur le modèle de `kanban_boards` (c'est le plus proche)
- **`App.jsx`** : nouveau `activeTab === 'diagrams'` + import lazy du composant éditeur + ajout dans la sidebar
- **`SubscriptionContext`** : ajouter `maxDiagrams` dans les limites (à calibrer free/premium)
- **`SharedWithMe.jsx`** : ajouter `diagram` dans `itemTypeLabels`, `itemTypeIcons`, `itemTypeColors`, et dans `resolveLinkItem()` pour l'onglet "Liens publics"
- **`ApiDocs.jsx`** : documenter la nouvelle entité (pattern déjà en place pour les autres tables)
- **`ShareButton.jsx`** : zéro changement (agnostique au type)

### Format du JSONB `data`
Utiliser le format natif React Flow sans wrapper maison :
```
{
  nodes: [{ id, type, position: {x,y}, data: { label, color, shape, ... }, width, height, zIndex }],
  edges: [{ id, source, target, label, markerEnd, style }],
  viewport: { x, y, zoom }
}
```
→ permet un round-trip direct avec la librairie, pas de conversion, et rend l'export/import trivial.

## Points d'attention

### Par point du cahier des charges

| # | Point | Attention |
|---|---|---|
| 10 | **Dessin à main levée** | Pas natif React Flow. Passer par `perfect-freehand` en surcouche. Le rendu sera correct mais pas Excalidraw-level. Si c'est un critère majeur, reconsidérer la librairie. |
| 11 | **Import d'images** | Réutiliser le système `attachments` existant. **Attention au quota de stockage** : les images de diagrammes vont manger le quota utilisateur. Prévoir : (a) compression automatique côté client avant upload, (b) limite de taille par image plus basse que les PJ classiques (1-2 Mo), (c) éventuellement doubler le quota pour les plans premium. |
| 12 | **Grouper des formes** | API React Flow "subflow" un peu verbeuse. Prévoir sélection rectangle + bouton "Grouper/Dissocier" dans la toolbar contextuelle. |
| 13 | **Avant/arrière plan** | **À clarifier avant l'implémentation** : interprétation (a) ordre Z *à l'intérieur* du canvas (forme devant/derrière une autre) — facile, champ `zIndex` par nœud ; interprétation (b) canvas en overlay global *par-dessus* la page Notes ou Todos — **fortement déconseillée**, complexité énorme pour peu de valeur, casse la navigation, problèmes d'accessibilité. **Partir sur (a) sauf contre-ordre explicite.** |
| 14 | **Forme par points numérotés** | À clarifier : si c'est juste pour recréer un carré, c'est redondant avec la forme prédéfinie → à supprimer. Si c'est pour **dessiner un polygone arbitraire à N points** (forme libre), c'est utile et distinctif → à coder comme un mode "Polygone" qui place des points successifs et ferme le polygone au double-clic. |
| 15 | **Export HTML / PDF / image** | PNG/SVG : natif React Flow. PDF : `jsPDF` + PNG généré. HTML : générer une page autoportée contenant l'image + titre + métadonnées, sur le modèle de l'export HTML déjà en place dans `Notes.jsx` (`exportAsHtml`). **Ne pas tenter** un export HTML "réouvrable/éditable" — complexité disproportionnée. |
| 16 | **Ctrl + appui long pour pan** | React Flow supporte `panOnDrag={[1, 2]}` + `selectionKeyCode` — câbler `panOnDrag` conditionné à l'état `ctrl pressed` via un hook `useKeyPress('Control')`. Faisable proprement. |
| 17 | **Undo/redo** | Maintenir un stack d'états `data` en mémoire + throttle pour ne pas saturer (1 entrée par action significative, pas par frame de drag). Limiter à ~50 entrées. Persister l'état courant en base à chaque save debounced, le stack reste local. |

### Points transversaux

1. **Mobile** : l'édition d'un canvas au doigt est inconfortable quelle que soit la librairie. **Assumer desktop-first** pour l'édition, et garantir une **consultation read-only propre** sur mobile (zoom, pan 2 doigts, pas d'édition). Bloquer les actions d'édition sous un certain breakpoint avec un message "Édition disponible sur ordinateur".

2. **Performance sur gros canvas** : au-delà de ~200 nœuds, React Flow commence à ramer si tous les nœuds ont des styles complexes. Prévoir : (a) virtualisation activée (`onlyRenderVisibleElements`), (b) éviter les re-renders inutiles avec `useMemo` sur les types de nœuds custom.

3. **Sauvegarde** : debounce ~1s comme pour les notes. Gérer le "unsaved changes" visuellement (petit indicateur dans la topbar).

4. **Realtime** : activer l'abonnement `postgres_changes` sur la table `diagrams`, mais **ne pas rafraîchir le canvas si l'utilisateur est en train d'éditer** (sinon on écrase son travail). Convention possible : si `updated_at` distant > `updated_at` local *et* aucune édition en cours depuis 5s, merger ; sinon ignorer. Alternative plus simple : pas de collaboration temps réel multi-curseurs au MVP, un seul éditeur à la fois avec "lock" soft basé sur `last_edited_by`.

5. **Share links et expiration** : réutiliser exactement ce qui vient d'être fait pour les autres items (TTL, label, révocation). Aucun travail spécifique, juste étendre `item_type`.

6. **Limites d'abonnement** : reco → free = 3 diagrammes, premium = illimité. À caler sur les autres limites existantes.

7. **Nommer la feature** : "Schémas" ou "Canvas" ou "Tableaux" — choisir et rester cohérent partout (sidebar, activité, notifications, docs API). Le fichier s'appelle `tabeaucanvas.md` → probablement "Tableaux" ou "Canvas". Trancher tôt.

8. **Liens vers les vraies entités du projet** (killer feature optionnel) : prévoir un type de nœud "Référence" qui pointe vers une note/tâche/liste/kanban existante (`{ refType: 'note', refId: uuid }`). Clic sur le nœud → navigation vers l'item réel. Énorme valeur pour visualiser la structure d'un projet, à peu de frais car tout le matériel est déjà là.

## Ordre d'implémentation conseillé

1. **SQL** : table `diagrams` + migrations folders/share_links + RPC
2. **Hook** : fetch/CRUD dans `useSupabaseData.js` sur le modèle kanban
3. **Squelette page** : liste des diagrammes + dossiers + création/rename/delete (copie adaptée de Notes ou Kanban)
4. **Éditeur basique** : React Flow + formes prédéfinies + texte + couleurs + déplacer/resize + sauvegarde debounced
5. **Connexions + undo/redo + pan Ctrl**
6. **Partage** : `share_links` + `SharedWithMe`
7. **Freehand + import image + groupement + Z-order interne**
8. **Export PNG/PDF/HTML**
9. **Polygone arbitraire** (si confirmé)
10. **Limites d'abonnement + docs API**
11. **Nœud "Référence" vers entités projet** (si retenu)

Les étapes 1 à 6 forment un MVP livrable et utile. Les étapes 7+ sont incrémentales et peuvent être priorisées selon l'usage réel.
