# Prompt — Intégration de l'outil Schéma dans la page /tarifs

## Contexte

Le projet `todo-app` (Vite + React + Tailwind + Supabase) ajoute une nouvelle fonctionnalité **Schéma / Canvas** (voir `tabeaucanvas.md` pour les specs de la feature elle-même). Cette tâche concerne **uniquement** l'intégration de cette feature dans la grille tarifaire publique `/tarifs` afin que les visiteurs sachent ce qui est inclus dans chaque plan.

## Fichier à modifier

**`src/components/PricingPage.jsx`** — c'est le seul fichier à toucher pour cette tâche. Trois zones à mettre à jour de manière synchronisée :

1. `PLANS` (lignes 11-70) — features affichées dans les cards de chaque plan
2. `COMPARISON_ROWS` (lignes 72-83) — tableau comparatif détaillé
3. `FAQ` (lignes 85-110) — questions/réponses

## Répartition des quotas validée

| Plan | Quota Schémas |
|---|---|
| **Free** | 0 schéma (bloqué) |
| **Étudiant** (2,49€/mois) | 1 schéma |
| **Pro** (7€/mois) | Schémas illimités |

## Modifications exactes à apporter

### 1. `PLANS` — ajouter une feature dans chaque plan

**Plan Free** (objet `id: 'free'`, tableau `features` ligne 19) — ajouter avant `Collaboration` :
```js
{ text: 'Schémas (canvas)', included: false },
```

**Plan Étudiant** (objet `id: 'student'`, tableau `features` ligne 43) — insérer **après** `'5 tableaux Kanban'` (ligne 47), donc dans la zone "espaces de travail", PAS près des membres :
```js
{ text: '1 schéma (canvas)', included: true },
```

**Plan Pro** (objet `id: 'pro'`, tableau `features` ligne 62) — ajouter après `'Membres illimités'` :
```js
{ text: 'Schémas illimités', included: true },
```

### 2. `COMPARISON_ROWS` — ajouter une ligne

À insérer **entre** la ligne `'Tableaux Kanban'` (ligne 75) et la ligne `'Notes'` (ligne 76), pour rester groupée avec les autres "espaces de travail" :
```js
{ label: 'Schémas (canvas)', free: '—', student: '1', pro: 'Illimité' },
```

### 3. `FAQ` — ajouter une entrée

À ajouter à la fin du tableau `FAQ` (après l'entrée "Que se passe-t-il si je dépasse les limites…") :
```js
{
  q: 'Qu\'est-ce que l\'outil Schéma ?',
  a: 'L\'outil Schéma vous permet de créer des diagrammes et visuels (formes, zones de texte, flèches) pour structurer vos projets ou idées. Le plan Étudiant inclut 1 schéma, le plan Pro en propose en illimité.',
},
```

## Contraintes strictes

- **Tailwind only**. Ne PAS proposer de CSS brut, ne PAS installer de plugin Tailwind.
- **Ne PAS toucher** à d'autres fichiers que `PricingPage.jsx` dans cette tâche. Pas d'effet de bord sur la logique d'auth, le checkout Stripe, le contexte Subscription, etc.
- **Ne PAS modifier** les prix, les autres features existantes, ni la structure des objets — uniquement ajouter les entrées listées ci-dessus.
- **Ne PAS renommer** "Schéma" en autre chose (Canvas, Diagramme…). Utiliser exactement la formulation `Schémas (canvas)` pour les features et le tableau comparatif, et `Schéma` dans la FAQ.
- **Ne PAS toucher** à `public/tarifs-preview.html` ni à `dist/` — ce sont des artefacts statiques séparés.
- **Réponses en français** dans tous les libellés UI ajoutés.

## Vérifications attendues après modification

1. La page `/tarifs` affiche bien la nouvelle feature dans les 3 cards (Free barrée, Étudiant "1 schéma", Pro "illimité").
2. Le tableau comparatif a une nouvelle ligne "Schémas (canvas)" cohérente avec les cards.
3. La FAQ contient la nouvelle question.
4. Aucune régression visuelle sur les autres features ou plans.
5. Aucune erreur console / aucun warning React (clés manquantes, etc.).

## Hors scope (à NE PAS faire ici)

- Implémenter la feature Schéma elle-même (voir `tabeaucanvas.md` pour ça, c'est une autre tâche).
- Modifier le schéma Supabase (`subscriptions`, quotas, RLS, etc.) — ça sera fait dans une tâche séparée. Cette tâche est purement vitrine/marketing.
- Ajouter une logique de blocage côté app (gating, modal upsell). Hors scope.
- Toucher au composant `CheckoutPage.jsx`, au contexte `SubscriptionContext`, ou à la fonction edge `create-checkout`.

## Livrable attendu

Un seul commit modifiant `src/components/PricingPage.jsx` avec les 5 ajouts décrits (3 features + 1 ligne comparative + 1 FAQ). Message de commit suggéré :

```
feat(tarifs): ajouter quota Schémas (Étudiant 1 / Pro illimité)
```
