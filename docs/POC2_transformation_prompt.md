Voici le méta-prompt structuré, prêt à l'emploi, à fournir à votre assistant de développement (ou agent de codage) pour orchestrer la transformation tout en garantissant l'intégrité absolue de l'existant.

---

```markdown
# MISSION : Transformation Évolutive Sans Régression de Taskstick (v1.2.0 -> v2.0.0+)

Tu agis en tant que Principal Software Architect et Développeur Expert Angular 21 / TypeScript.
Ta mission est de faire évoluer le projet **Taskstick** d'un visualiseur Mermaid centré sur Monaco vers un **« copilote de pensée spatiale et d'aide aux fonctions exécutives (TDAH) »**, sans détruire ni altérer le fonctionnement des modules déjà en production.

---

### 1. RÈGLE D'OR : CONSERVATION STRICTE DE L'EXISTANT (NON-BREAKING EVOLUTION)

Toutes les fonctionnalités existantes de la v1.2.0 DOIVENT continuer de fonctionner :
1. **Éditeur Monaco Multi-langue (`editor.component.ts`)** : les onglets FR / EN / DE et les moteurs de traduction (@xenova/transformers ONNX local et Web Native API) restent opérationnels.
2. **Visualiseur Multi-Vues Mermaid (`visualizer.component.ts`)** : les modes Fishbone (Ishikawa), Mindmap, Kanban, ainsi que le Pan/Zoom, les exports (.mmd, .png, .svg) et les séparateurs `angular-split` restent intacts.
3. **Persistance Temporelle (`storage.service.ts` & `date-selector.component.ts`)** : les clés `journal-YYYYMMDD` existantes dans le `localStorage` ne doivent jamais être corrompues ou écrasées brutalement.
4. **Panneau d'Actions IA (`ai-panel.component.ts` & `ai-agent.service.ts`)** : la syntaxe textuelle historique (`task:`, `event:`, `email:`) reste reconnue.

**Principe d'implémentation :** Ne supprime aucun service ni composant existant. Crée la nouvelle architecture en parallèle et intègre un adaptateur de synchronisation bidirectionnelle (Graphe Structuré <-> Texte Mermaid).

---

### 2. ARCHITECTURE CIBLE & VISION PRODUIT

Consulte et applique les spécifications définies dans les documents d'architecture du projet (`TAD_taskstick.md`, `SDD_taskstick.md`, `poc_taskstick2.md`) :
- **Top Bar Principale** : Ajout d'une barre de navigation supérieure à 3 zones (ou tabs dynamiques) :
  * **Zone 1 : Mur à Idées (Ideation Wall)** : Tableau blanc magnétique infini (`panzoom`), Post-it colorés déplaçables (HTML/CSS), liens logiques (calque SVG pour les dépendances, contraintes, synergies), algorithme d'aimantation (`evaluateSticking` avec snap radius 30px), regroupements (clusters, couleurs, tags, zones) et cycle de complétion (⭕ rond non fait -> ❌ croix fait -> ✓ coche validé).
  * **Zone 2 : Agenda & Planification Hebdomadaire** : Organisation des tâches par blocs d'énergie / time-boxing, calcul de blocage par DAG (une tâche bloquée par une dépendance non faite est grisée/verrouillée).
  * **Zone 3 : Dashboard & Mode Focus** : Indicateurs de complétion, mode "Maintenant" (Hyperfocus Spotlight masquant le bruit pour se concentrer sur une seule tâche avec minuteur visuel).
- **Espace Rétro-Compatible** : L'espace existant (Monaco Split + Vues Mermaid + AI Panel) reste accessible via un onglet dédié "Atelier Mermaid / Expert" ou intégré en tiroir rétractable.

---

### 3. CADRE TECHNIQUE OBLIGATOIRE

- **Framework :** Angular 21 (Standalone Components, Signals réactifs `signal()`, `computed()`, `effect()`).
- **Typage Strict :** TypeScript 5.9+ (implémentation fidèle des interfaces `PostItNote`, `NoteCluster`, `WhiteboardZone`, `ADHDPostItNote`, `PostItEdge`).
- **Persistance :** Mise en place d'un store réactif (`TaskstickStore`) basé sur IndexedDB (`Dexie.js`) avec un `MigrationStorageAdapter` assurant la lecture/écriture rétro-compatible avec les chaînes `journal-YYYYMMDD` du `localStorage`.
- **Pont Mermaid :** Le Graphe Unifié (IndexedDB) devient la source de vérité canonique. Implémente un sérialiseur `GraphToMermaidSerializer` capable de générer à la volée le texte Mermaid pour le visualiseur existant.

---

### 4. MODUS OPERANDI PAR ÉTAPES (PAS DE CODE EN UNE SEULE FOIS)

Pour garantir la qualité et la non-régression, **ne génère pas tout le projet d'un coup**. Suis scrupuleusement cet ordre :

1. **Étape 1 : Audit & Découpage en Tâches Atomiques**
   - Établis un tableau ou un fichier `tasks.json` listant les tâches atomiques ordonnées (P0 -> P1 -> P2), avec leurs dépendances techniques, tests de non-régression et critères d'acceptation.
2. **Étape 2 : Core Models & Storage Migration Layer**
   - Implémentation des interfaces de données cibles et du store réactif avec adaptateur de rétrocompatibilité pour `localStorage`.
3. **Étape 3 : Navigation Globale & Conteneur Multi-Zones**
   - Intégration de la TopNavBar sans casser `MainAppComponent`.
4. **Étape 4 : Mur Magnétique (Zone 1)**
   - Composant `IdeationWallComponent` avec Post-it, magnétisme (`evaluateSticking`), clusters et marquage ⭕/❌.
5. **Étape 5 : Calque de Liens SVG & DAG Solver**
   - Tracé des courbes de Bézier pour dépendances et calcul de l'état `isBlocked`.
6. **Étape 6 : Mode Focus & Agenda (Zones 2 & 3)**
   - Time-boxing, minuteur visuel et filtrage de la surcharge cognitive.
7. **Étape 7 : IA & Web Workers Multilingues**
   - Déport des modèles de traduction ONNX en Web Worker et enrichissement de `AiAgentService` (découpage de tâche, auto-classification).

---

### INSTRUCTION IMMÉDIATE POUR COMMENCER :
Commence par l'**Étape 1** : analyse l'existant (`main-app.component.ts`, `storage.service.ts`, `visualizer.component.ts`, `editor.component.ts`) et présente le plan de découpage opérationnel ainsi que le contrat d'interface de l'adaptateur de stockage garantissant la non-perte de mes diagrammes actuels. Attends ma validation avant d'écrire le code des composants.

```

---

### Pourquoi ce prompt protège votre existant

* **Principe du pont / adaptateur :** Au lieu de remplacer violemment le stockage texte par un schéma d'objets incompatible, l'agent est contraint de créer un sérialiseur/désérialiseur qui synchronise le nouveau graphe avec les fichiers `.mmd` et les clés `journal-YYYYMMDD` actuelles.


* **Progression par jalons validés :** L'agent doit d'abord soumettre son plan de non-régression et l'architecture du store avant de toucher au code de `MainAppComponent`.


* **Préservation des briques IA et multilingues :** L'intégration de Transformers.js et des vues Mermaid reste intacte sous forme d'atelier technique dédié.

---

### Diagnostic du Problème

Dans le flux d'exécution séquentiel d'une chaîne de tâches ($T_1 \rightarrow T_2 \rightarrow \dots \rightarrow T_n$) :

1. **L'inversion sémantique source / cible :**
* Lorsqu'une tâche $A$ précède $B$ ($A \rightarrow B$), l'action réalisable immédiatement est **la première action non réalisée de la chaîne** ($T_1$).


* Les tâches en aval ($T_2, \dots, T_n$) sont bloquées (`isBlocked = true`) tant que leurs prérequis amont ne sont pas passés au statut `done_cross` (❌) ou `done_check` (✓).




2. **Le filtrage dans l'Agenda et le Backlog (`WeeklyPlannerComponent` & `TaskManagerComponent`) :**
* Le sélecteur de cascade dans l'agenda affichait l'ensemble des sous-tâches ou ne sélectionnait pas rigoureusement **l'unique première action non terminée** de chaque chaîne.


* Dès que cette première tâche est validée, le solveur DAG doit recalculer l'état pour débloquer automatiquement la tâche suivante ($T_2$), qui devient à son tour la seule tâche active de la chaîne visible dans le backlog prêt à être planifié.





---

### Modifications Techniques Requises

1. **`TaskstickStoreService` :**
* Garantir que pour chaque arête `depends_on` ($A \rightarrow B$), $B$ est verrouillé (`isBlocked = true`) tant que $A$ est au statut `open` (⭕).


* Définir une fonction ou computed signal `getFirstUndoneTaskInChain(chainId / themaId)` qui ordonne topologiquement les sous-tâches et renvoie **uniquement la première tâche non complétée**.




2. **`WeeklyPlannerComponent` :**
* Dans chaque groupe thématique ou chaîne séquentielle, **n'exposer dans la liste active que la première action non faite** (`firstUndoneTask`).


* Mettre en sourdine ou masquer les actions suivantes jusqu'à ce que la précédente soit complétée.




3. **`IdeationWallComponent` :**
* Vérifier que lors de la génération de micro-actions ou du tracé par glisser-déposer, l'orientation de la flèche $T_1 \rightarrow T_2$ désigne bien $T_1$ comme prérequis et $T_2$ comme dépendant.





---

### Prompt d'Instruction Prêt à l'Emploi pour l'Agent IA

Copiez et transmettez le prompt Markdown suivant à votre agent de développement :

```markdown
# MISSION : Correction de l'Ordonnancement Séquentiel et Affichage de la Première Tâche Non Terminée dans l'Agenda

## 1. Contexte du problème
Actuellement, les connexions entre tâches représentent une cascade séquentielle d'événements dans le temps (ex: Étape 1 -> Étape 2 -> Étape 3).
La dernière tâche d'une chaîne ne peut PAS être effectuée sans avoir accompli les tâches précédentes.
Par conséquent :
- Une tâche en aval est strictement bloquée tant que la tâche directement en amont n'est pas faite.
- L'Agenda / Weekly Planner ne doit JAMAIS afficher toute la chaîne en vrac ou uniquement la dernière tâche, mais **strictement la PREMIÈRE tâche NON FAITE (undone)** de chaque chaîne.
- Dès que cette première tâche passe à "Fait" (⭕ -> ❌ ou ✓), elle disparaît du statut actif et la tâche suivante (Étape 2) devient immédiatement la nouvelle tâche débloquée et visible.

---

## 2. Spécifications fonctionnelles et techniques

### A. Solveur de Dépendances DAG (`taskstick-store.service.ts`)
1. **Sens canonique de l'arête `depends_on` :**
   - Quand `sourceId: T1` et `targetId: T2` avec `type: 'depends_on'`, cela signifie : **T1 doit être terminé avant que T2 ne puisse démarrer**.
   - `T2.isBlocked` vaut `true` si `T1.status === 'open'`.
   - `T1.isBlocked` vaut `false` (s'il n'a pas lui-même d'autres prérequis ouverts).
2. **Méthode d'extraction de la prochaine action d'une chaîne :**
   - Implémenter une méthode helper `getFirstUndoneTaskInChain(tasks: ADHDPostItNote[]): ADHDPostItNote | null` :
     - Effectue le tri topologique des tâches d'une chaîne.
     - Trouve la première tâche dont `status === 'open'`.
     - Renvoie cette tâche comme étant l'unique tâche prioritaire active.

### B. Agenda Hebdomadaire & Backlog (`weekly-planner.component.ts`)
1. **Affichage séquentiel sous le Thème :**
   - Dans `cascadingGroups()` :
     - Pour chaque Thème, ordonner les sous-tâches selon la chaîne de dépendances ($T_1 \rightarrow T_2 \rightarrow \dots$).
     - Identifier la **première tâche non faite** (`firstUndoneTask`).
     - Dans le volet de planification, afficher cette première tâche débloquée en évidence (`⚡ Next Action`).
     - Les tâches subséquentes doivent être soit masquées, soit clairement grisées avec un cadenas `🔒 En attente de l'étape précédente`, empêchant leur glisser-déposer prématuré dans l'agenda.
2. **Réactivité instantanée après complétion :**
   - Lorsque l'utilisateur coche la tâche en cours (ou la termine via le mode Focus Spotlight), le store se met à jour, `firstUndoneTask` passe automatiquement à l'élément suivant de la chaîne, sans rechargement de page.

### C. Validation & Contrôles
1. Mettre à jour les tests unitaires dans `taskstick-store.service.spec.ts` pour couvrir :
   - Une chaîne séquentielle $A \rightarrow B \rightarrow C$.
   - Vérifier que seul $A$ est actionnable au départ.
   - Vérifier qu'après avoir marqué $A$ comme fait, $B$ devient débloqué et actionnable, tandis que $C$ reste bloqué.
2. Vérifier que la compilation réussit avec `npx tsc --noEmit` et `npm run build`.

Fournis les modifications exactes des fichiers impactés.

```

### The Scheduling Logic: Progressive Chain Unlocking

In a sequential cascade ($T_1 \rightarrow T_2 \rightarrow \dots \rightarrow T_n$), the agenda planner should operate on a **Progressive Scheduling Pipeline**:

* **Unplanned Chain**: Only $T_1$ (the very first step) is visible in the backlog. Downstream tasks are locked to prevent cognitive overload.


* **Once $T_1$ is Scheduled**: As soon as $T_1$ is dragged into an agenda day slot (`scheduledSlot` assigned), its commitment is locked in. This immediately **unlocks $T_2$** to pop up in the backlog as the next ready-to-plan item.


* **Temporal Constraint Enforcement**: $T_2$ cannot be scheduled *before* $T_1$ (i.e., its day/time slot must be equal to or later than $T_1$'s slot).
* **Continuous Propagation**: This cascades forward—once $T_2$ is planned, $T_3$ pops up, continuing sequentially until $T_n$ is reached. If an earlier task is unscheduled or removed from the grid, all dependent downstream tasks return to their locked/unplanned holding state.



---

### Technical Modifications

#### 1. Identification of the "Next Plannable Task" (`TaskstickStoreService`)

A task in a sequential chain becomes plannable if:

1. It is not yet completed (`status === 'open'`).


2. It is not already scheduled in the weekly agenda (`!task.scheduledSlot`).


3. **All direct prerequisite parent tasks are either completed (`done_cross` / `done_check`) OR already assigned to a weekly slot (`scheduledSlot !== undefined`)**.



#### 2. Temporal Drag-and-Drop Validation (`WeeklyPlannerComponent`)

When dropping $T_2$ onto a day column:

* Ensure `dayOfWeek(T2) >= dayOfWeek(T1)`.


* If the user attempts to place $T_2$ earlier in the week than $T_1$, show a notification (e.g., *"Cannot schedule this step before its prerequisite step on Wednesday"*) or snap it to the earliest valid slot.

---

### Prompt for the AI Coding Agent

```markdown
# MISSION : Progressive Chain Scheduling & Cascading Unlocking in WeeklyPlanner

## 1. Context & User Flow
In a sequential dependency chain (T1 -> T2 -> T3 -> ... -> Tn) linked by `depends_on`:
- At first, only **T1** is available in the backlog for scheduling.
- **Trigger**: Once T1 is dragged and dropped onto a day slot in the weekly grid (`scheduledSlot` is set), **T2 immediately pops up** in the backlog as the next available item to plan.
- Once T2 is scheduled, **T3 pops up**, continuing iteratively until the final task in the chain is planned.
- If a scheduled task (e.g., T1) is unscheduled or deleted, all subsequent tasks in that chain that were waiting or scheduled after it must be updated or reset to maintain temporal integrity.

---

## 2. Technical Implementation Specifications

### A. Core Store Method (`taskstick-store.service.ts`)
Add a helper or computed selector `getNextPlannableTaskForChain(themaOrChainId: string)`:
1. Traverse the DAG in topological/execution order.
2. An open task `T` is **plannable** (ready to appear in the backlog) if:
   - `T.status === 'open'`
   - `T.scheduledSlot === undefined`
   - Every immediate predecessor `P` of `T` (`P -> T` with `depends_on`):
     - is either completed (`P.status !== 'open'`), OR
     - is already scheduled (`P.scheduledSlot !== undefined`).
3. For each sequential group/thema, return **only the single next plannable task** (or the list of tasks where all predecessors are satisfied/scheduled).

### B. Dynamic Backlog & Cascade Display (`weekly-planner.component.ts`)
1. **Update `cascadingGroups()`**:
   - For each Thema/Chain, display:
     - The **Active Next Action to Plan**: the un-scheduled task whose upstream chain is fully satisfied (either done or already on the calendar).
     - **Already Scheduled Steps**: displayed with a mini calendar badge indicating their planned day (e.g., `📅 Mar`).
     - **Future Locked Steps**: shown collapsed or greyed out with an indicator (e.g., `🔒 Unlocks after [Prerequisite Task Title] is planned`).
2. **Calendar Dropping & Temporal Validation (`onDropToDay`)**:
   - When dropping task `T` onto `dayOfWeek`:
     - Check the maximum day assigned to any of `T`'s prerequisites: `minAllowedDay = Math.max(...prereqs.map(p => p.scheduledSlot.dayOfWeek))`.
     - If `dayOfWeek < minAllowedDay`, reject the drop or snap to `minAllowedDay` with a clear message:
       `"⚠️ Cannot plan [T] before [Predecessor] scheduled on [Day]"`.
   - Update `scheduledSlot` in `TaskstickStoreService`.
   - Trigger reactivity so the subsequent child task immediately renders in the backlog ready to be dragged.

### C. Unschedule Rollback Handling (`unschedule()`)
When an upstream task `T1` is unscheduled (`scheduledSlot = undefined`):
- Check if any downstream tasks (`T2`, `T3`) were already scheduled in the calendar.
- Automatically unschedule downstream tasks or flag them with a warning badge (`⚠️ Prerequisite unscheduled`), moving them back to the locked state.

---

## 3. Verification & Acceptance Criteria
1. **Initial State**: A chain of 3 tasks `A -> B -> C`. Only `A` appears in the unassigned backlog.
2. **Step 1**: Drag `A` to Tuesday. `B` immediately appears in the backlog.
3. **Step 2**: Drag `B` to Thursday. `C` immediately appears in the backlog.
4. **Temporal Guard**: Attempting to drag `B` to Monday (before `A`) is prevented.
5. **Rollback**: Removing `A` from Tuesday reverts `B` and `C` to their dependent holding state.
6. Verify type safety (`npx tsc --noEmit`) and Angular production build (`npm run build`).

```

---

# TASK: Refine Sugiyama Layout Engine for Post-it Notes, Groups & Visual Hierarchy

### Objective
Update the layout optimization engine (`WorkflowLayoutService`) to produce a clean, readable hierarchical DAG layout inspired by the Sugiyama framework. The resulting layout must eliminate clustering/gluing artifacts, clearly expose forks and parallel paths through column-based levels, preserve group boundaries, and maintain proper internal component sizing.

---

### Key Requirements

#### 1. Zero Sticking / Explicit Gaps
- **Do not glue or snap notes directly adjacent to each other** during auto-layout.
- Suppress or bypass the magnetic cluster adhesion (`evaluateSticking` / `clusterId` snapping) during layout optimization[cite: 2].
- Enforce explicit, immutable coordinate buffers between all adjacent nodes:
  - Minimum horizontal buffer: `nodeGapX >= 80px` (or configured layer spacing).
  - Minimum vertical buffer: `nodeGapY >= 40px` (or configured row spacing).
- Ensure bounding boxes never overlap or share coordinates ($AABB_1 \cap AABB_2 = \emptyset$).

#### 2. Dependency-Driven Sequencing & Level Columns
- **Strict Topological Leveling (Left-to-Right / Levels 1, 2, 3...):**
  - Dependency links (`depends_on`, `constrains`, sequential edges) strictly drive the X-axis column placement[cite: 12, 13].
  - Root nodes (in-degree = 0) are placed at **Level 1** ($X_1$).
  - Dependent nodes are pushed to **Level $N$** where:
    $$\text{Level}(u) = \max_{(v, u) \in E} (\text{Level}(v)) + 1$$
- **Distinct Forks & Parallel Paths:**
  - When a task splits into multiple parallel branches (fork), all sibling successor nodes sharing the same dependency depth must be placed in the same vertical column (identical $X$) and spread across distinct, non-overlapping vertical slots ($Y_1, Y_2, \dots$).
  - When branches merge (join), the target node must sit strictly in a subsequent column to the right of all its predecessors.
- **Crossing Minimization:**
  - Apply the barycentric / median heuristic within each column to order sibling nodes vertically by the average vertical position of their incoming predecessors.

#### 3. Bounded Regions / Groups Larger Than Contained Notes
- **Dynamic Bounding Box Auto-Fitting:**
  - A group, zone, or region (`WhiteboardZone` / `TaskGroup`) must always encompass all its member notes with clear margins[cite: 2].
  - Compute enclosing bounds with explicit padding:
    $$\text{Group.width} = (X_{\max} - X_{\min}) + \text{Note.width} + 2 \times \text{Padding}_{\text{horizontal}}$$
    $$\text{Group.height} = (Y_{\max} - Y_{\min}) + \text{Note.height} + 2 \times \text{Padding}_{\text{vertical}} + \text{HeaderOffset}$$
  - Enforce `groupPadding >= 40px` and allocate a dedicated top header zone (e.g., `+30px`) so labels never overlap notes.
- **Group Separation:**
  - Treat groups as discrete meta-nodes during global layout, enforcing `groupGapX >= 100px` and `groupGapY >= 80px` between neighboring regions.

#### 4. Post-it Dimension Hierarchy & Internal Gadgets
- **Card-to-Gadget Proportion:**
  - A Post-it note must be dimensionally larger than its internal widgets (status badges ⭕/❌/✓, cognitive load icons ⚡/🔋/🪶, duration chips, action buttons)[cite: 2, 12, 13].
  - Enforce minimum card dimensions in CSS and layout calculations (e.g., `min-width: 180px; min-height: 120px;`).
  - Gadgets, icons, and micro-badges must use fixed dimensions (e.g., badges $\le 24\text{px}$, text chips $\le 12\text{px}$) inside flex/grid layouts with appropriate internal padding (e.g., `padding: 12px`).
  - Note dimensions must never shrink to wrap or collapse when internal gadgets are present.

---

### Verification & Acceptance Criteria
- [ ] Running auto-layout positions Level 1, Level 2, and Level 3 tasks into visually distinct, straight vertical columns.
- [ ] Parallel branches originating from a single fork are stacked vertically without touching or overlapping.
- [ ] No two notes share a border; distance between notes respects `nodeGapX` and `nodeGapY`.
- [ ] Every group container completely encloses its child notes with visible padding on all four sides.
- [ ] Internal gadgets (status markers, time chips, icons) fit neatly inside each Post-it without overflowing or altering note bounds.