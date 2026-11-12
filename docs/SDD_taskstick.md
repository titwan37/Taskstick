# Software Design Document (SDD) — Taskstick

**System:** Taskstick  
**Author:** AI Technical Specialist & Software Architect  
**Location:** [SDD_taskstick.md](file:///c:/Dev/Taskstick/docs/SDD_taskstick.md)  
**Date:** 2026-10-26  

---

> [!IMPORTANT]
> **Clarification Formelle : Existant vs Futur :**
> - **SECTION 1 — CONCEPTION LOGICIELLE EXISTANTE (AS-IS) :** Détaille les contrats d'interface, classes et services **réellement présents dans les sources de `c:\Dev\Taskstick\src\app`**.
> - **SECTION 2 — SPÉCIFICATIONS TECHNIQUES CIBLES (TO-BE) :** Détaille les modèles, algorithmes, contrats d'interface et états requis pour réaliser les exigences du **Mur à Idées magnétique**, de la **Gestion des Tâches** et du **Dashboard** ([poc_taskstick2.md](file:///c:/Dev/Taskstick/docs/poc_taskstick2.md)).
> - **SECTION 3 — MATRICE DE TRAÇABILITÉ DES EXIGENCES :** Lien direct entre les besoins formulés par l'utilisateur et les composants logiciels prévus.

---

# SECTION 1 — CONCEPTION LOGICIELLE EXISTANTE (AS-IS - v1.2.0)

## 1.1. Modèles de Données et Types Réellement Implémentés

Dans l'état actuel du code (`src/app/`), les données sont manipulées sous forme de texte brut Mermaid ou de structures d'actions extraites par regex :

```typescript
// Extrait de src/app/services/ai-agent.service.ts
export interface ExtractedAction {
  type: 'task' | 'event' | 'email';
  title: string;
  raw: string;
}

// Extrait de src/app/editor/editor.component.ts
export type SupportedLanguage = 'fr' | 'en' | 'de';
export type TranslationEngine = 'transformers' | 'native';

export interface MultiLanguageContent {
  fr: string;
  en: string;
  de: string;
}

export interface TabConfig {
  code: SupportedLanguage;
  label: string;
  flag: string;
}
```

## 1.2. Contrats des Composants Existants

### `MainAppComponent` ([src/app/main-app.component.ts](file:///c:/Dev/Taskstick/src/app/main-app.component.ts))
- **Propriétés d'État Actuelles :**
  - `diagram: string` : Le contenu texte du diagramme (source unique de vérité actuelle).
  - `dark: boolean` : État du thème (sombre/clair).
  - `vizLayout: 'split' | 'grid' | 'ishikawa' | 'mindmap' | 'kanban'` : Sélecteur de disposition visuelle des visualisateurs.
  - `editorVisible: boolean` : Toggle d'affichage du volet gauche Monaco.
  - `aiVisible: boolean` : Toggle d'affichage du volet droit des tâches IA.
- **Méthodes Clés :**
  - `toggleTheme()` : Bascule de thème avec View Transitions API.
  - `onDiagramChange(newContent: string)` : Réception des modifications de l'éditeur Monaco.
  - `loadDate(dateKey: string)` : Chargement depuis `StorageService`.
  - `saveToDatabase()` : Sauvegarde dans le localStorage.
  - `exportToDrive()`, `loadFromDrive()` : I/O fichiers locaux.

### `EditorComponent` ([src/app/editor/editor.component.ts](file:///c:/Dev/Taskstick/src/app/editor/editor.component.ts))
- Encapsule l'instance Monaco Editor avec gestion du dictionnaire multi-langue et du modèle `@xenova/transformers`.

### `VisualizerComponent` ([src/app/visualizer/visualizer.component.ts](file:///c:/Dev/Taskstick/src/app/visualizer/visualizer.component.ts))
- Reçoit `@Input() diagram: string`, initialise Mermaid, compile le SVG, et attache l'instance `PanZoom`.

### `StorageService` ([src/app/services/storage.service.ts](file:///c:/Dev/Taskstick/src/app/services/storage.service.ts))
- Stockage synchrone dans `window.localStorage` sous le format de clé `journal-YYYYMMDD`.

---

# SECTION 2 — SPÉCIFICATIONS TECHNIQUES CIBLES (TO-BE - v2.0.0)

Cette section spécifie les interfaces et algorithmes nécessaires pour implémenter la vision de [poc_taskstick2.md](file:///c:/Dev/Taskstick/docs/poc_taskstick2.md).

## 2.1. Modèles du Mur à Idées Magnétique (Zone 1)

```typescript
export type PostItColor = 'yellow' | 'pink' | 'blue' | 'green' | 'purple' | 'orange';

/**
 * Statut d'avancement du Post-it :
 * - 'open' : Non fait (marqué d'un rond ⭕)
 * - 'done_cross' : Fait / terminé (marqué d'une croix ❌)
 * - 'done_check' : Fait / validé (marqué d'une coche ✓)
 */
export type PostItStatus = 'open' | 'done_cross' | 'done_check';

export interface Coordinates2D {
  x: number;
  y: number;
}

export interface PostItNote {
  id: string;
  title: string;
  content?: string;
  color: PostItColor;
  status: PostItStatus;
  tags: string[];          // Ex: ['#design', '#urgent']
  position: Coordinates2D;  // Coordonnées absolues sur le mur magnétique
  zIndex: number;
  clusterId?: string;      // ID du bloc solidaire si collé à d'autres notes
  zoneId?: string;         // ID de la zone délimitée du mur (si présente)
  createdAt: number;
  updatedAt: number;
}

/**
 * Regroupement solidaire de notes collées ensemble
 */
export interface NoteCluster {
  id: string;
  noteIds: string[];
  relativeOffsets: Record<string, Coordinates2D>; // Décalage par rapport à l'ancre
}

/**
 * Zone délimitée sur le tableau blanc magnétique
 */
export interface WhiteboardZone {
  id: string;
  label: string;
  colorCode: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface IdeationWallFilter {
  selectedColor?: PostItColor | 'all';
  selectedZone?: string | 'all';
  selectedTag?: string | 'all';
  searchQuery?: string;
}
```

---

## 2.2. Algorithmes Spécifiques au Mur à Idées

### 1. Algorithme d'Aimantation & Collage Mutuel (Sticking / Clustering)
Lorsque l'utilisateur relâche un Post-it $N_A$ après déplacement :

```typescript
function evaluateSticking(movedNote: PostItNote, allNotes: PostItNote[], snapRadius = 30): void {
  for (const targetNote of allNotes) {
    if (targetNote.id === movedNote.id) continue;
    
    const distance = Math.hypot(
      movedNote.position.x - targetNote.position.x,
      movedNote.position.y - targetNote.position.y
    );
    
    // Si la note est amenée à proximité immédiate d'une autre note
    if (distance <= snapRadius) {
      // 1. Définir ou rattacher à un cluster commun
      const clusterId = targetNote.clusterId || `cluster_${Date.now()}`;
      targetNote.clusterId = clusterId;
      movedNote.clusterId = clusterId;
      
      // 2. Magnétiser la bordure (alignement automatique bord à bord avec léger décalage organique)
      movedNote.position.x = targetNote.position.x + 180; // Largeur standard d'un Post-it
      movedNote.position.y = targetNote.position.y;
      break;
    }
  }
}
```

### 2. Déplacement Solidaire d'un Groupe (Cluster Drag)
Lorsque l'utilisateur glisse une note $N_i$ faisant partie d'un `clusterId` :
- Le vecteur déplacement $\vec{V} = (\Delta x, \Delta y)$ est appliqué simultanément à toutes les notes $N_k$ partageant le même `clusterId`.
- Un bouton d'action *"Décoller"* sur le Post-it permet de rompre le lien (`clusterId = undefined`).

### 3. Cycle de Marquage de Complétion (⭕ Rond vs ❌ Croix)
```typescript
function toggleNoteStatus(currentStatus: PostItStatus): PostItStatus {
  switch (currentStatus) {
    case 'open':
      return 'done_cross'; // Fait (marqué d'une croix ❌)
    case 'done_cross':
      return 'done_check'; // Option coche ✓
    case 'done_check':
    default:
      return 'open';       // Remis à non fait (marqué d'un rond ⭕)
  }
}
```

### 4. Algorithme de Regroupement Automatique (Grouping)
L'utilisateur peut déclencher un auto-alignement des Post-it :
- **Par Couleur :** Les notes sont rangées en colonnes thématiques selon leur couleur (`yellow`, `pink`, `blue`, etc.).
- **Par Zone :** Les notes sont repositionnées à l'intérieur des boîtes englobantes des `WhiteboardZone`.
- **Par Tag :** Les notes portant le même tag principal sont réunies en essaims visuels.

---

## 2.3. Modèles de la Gestion des Tâches (Zone 2)

```typescript
export interface TaskCategory {
  id: string;
  name: string;
  icon?: string;
  badgeCount?: number;
}

export interface TaskItem {
  id: string;
  categoryId: string;
  title: string;
  description?: string;
  done: boolean;
  dueDate?: string;
  createdAt: number;
}

export interface TaskFilterState {
  categoryId: string;
  onlyPending: boolean;
  searchTerm: string;
}
```

---

## 2.4. Modèles du Dashboard de Synthèse (Zone 3)

```typescript
export interface DashboardStats {
  totalIdeas: number;
  totalTasks: number;
  completedTasks: number;
  openIdeasCount: number;
  doneIdeasCount: number;
  ideasByColor: Record<PostItColor, number>;
  tasksByCategory: Record<string, { total: number; done: number }>;
  completionPercentage: number;
}
```

---

# SECTION 3 — MATRICE DE TRAÇABILITÉ DES EXIGENCES

Cette matrice relie chaque exigence du document [poc_taskstick2.md](file:///c:/Dev/Taskstick/docs/poc_taskstick2.md) aux structures de conception définies :

| Exigence Brute ([poc_taskstick2.md](file:///c:/Dev/Taskstick/docs/poc_taskstick2.md)) | Statut Réel | Composant Logiciel Cible (TO-BE) | Spécification Technique Associée |
|---|---|---|---|
| *« un mur blanc magnétique sur lequel on peut poser des Post-it de differentes couleurs »* | **À implémenter** | `IdeationWallComponent`, canvas blanc avec grille | `PostItNote.color` (`PostItColor`), CSS dot-grid, Post-it palette |
| *« on peut les déplacer »* | **À implémenter** | Moteur de Drag & Drop (HTML5 / CDK DragDrop) | Mise à jour des `Coordinates2D (x, y)` avec snap grille |
| *« on peut les coller les uns aux autres »* | **À implémenter** | `ClusterEngine` / Fonction `evaluateSticking` | `PostItNote.clusterId` & calcul de proximité |
| *« on peut les regrouper par couleur, par zone, par tag »* | **À implémenter** | `GroupingManager` & barres de filtres/actions | Fonctions de tri et filtres `IdeationWallFilter` |
| *« on peut les marquer d'une croix ou d'un rond pour dire qu'ils sont faits »* | **À implémenter** | Badge interactif de complétion sur la note | `PostItStatus`: `open` (⭕) vs `done_cross` (❌) |
| *Barre de navigation principale (3 zones)* | **À implémenter** | `MainNavigationComponent` / Tab Router | Switch vers `Mur à Idée`, `Gestion Tâches`, `Dashboard` |
