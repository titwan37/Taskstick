# Je veux un mur à idée:

- un mur blanc magnétique sur lequel on peut poser des Post-it de differentes couleurs
- on peut les déplacer
- on peut les coller les uns aux autres
- on peut les regrouper par couleur, par zone, par tag
- on peut les marquer d'une croix ou d'un rond pour dire qu'ils sont faits.

UC1:

From a post-it 
- having "+" icon to be able to generate easily a connected subtask 
- Or second trigger option, when drag and drop a connector to the void, 
expected resullt:
- it creates instantly a connected subtask with similar color , where we have the edit focus to type title of the task.

UC2:

- usually the first post-it is a thema. (especially if it does not contains any action/verb)
- the sub tasks, usually contains an action/verb should be grouped together under that thema. the post-it should be smaller and the thema should be enrich in the description spot by knowledge of connected tasks information by ai-agent. 

UC3:

Can we have an undo function  to cancel previous action/operation?

UC4:

Can we have a tool to create areas/regions in dashes, to group the post-its together ?

UC5:
Can we have a second edit box in the post-it for description ? and when we double click on it we can edit it? also it can be enrich by ai-agent using information of connected tasks and autocompletion, when ai-agent got a clue, it populates the description box with an icon and text indicating that it is an ai-suggestion. the user can accept or reject the ai-suggestion.

UC6: 
Can we have a context menu, when we click right mouse or icon top bar ? 
- The context menu can change the status of the action like set as thema, set as subtask, set as done, set as blocked, set duration, set as unblocked, set color, add new task, add new subtask, add new thema, delete.

UC7:
It should be easily to set duration of a subtasks, ask focus on it.
In the agenda scheduler, the declination of task should be visible and group by thema and color, like a cascade of events.
Dont show thema as blocked. When a thema is connected to a subtask, it should show the action subtask first, parented under the thema.

UC8:
post-it connection, should the interdependency from tasks, leading to procrastination of the whole things. 
- what is crutial is to be able to decline easily the big thema in little actions like open, read, write, scan, mail, ...
- AI is very helpful to decline those thema. 
- the user can create, accept, reject, re-arrange, delete, the small actions.
- the final action should be clickable and by clicking it, it turns to done. and all its connected actions should be grouped as done. only the thema color should persist. and status become 


### Refined User Stories (`poc_taskstick2.md` format)

#### UC7: Micro-Task Timeboxing, Instant Focus & Cascading Agenda

* **Duration & Focus Trigger on Subtasks:**
* Allow setting a duration on any subtask directly from the card via quick-select chips (e.g., `5m`, `15m`, `25m`, `45m`) or custom minutes.
* Provide an instant **"🎯 Focus"** trigger on each subtask that launches the Focus Spotlight / Time-Timer directly for that specific item.


* **Cascading Hierarchy in Agenda / Scheduler:**
* In the weekly agenda/scheduler, display tasks decomposed into their constituent subtasks, visually organized as a nested cascade of events grouped by their parent **Thema** and inheriting the Thema's pastel color.
* Sub-actions should render chronologically or in dependency order, providing an immediate visual roadmap rather than disjointed task blocks.


* **Thema Non-Blocking Rule:**
* A **Thema** acts as an umbrella / container and must **never** be marked as `isBlocked = true` by the DAG engine.
* In task lists and agenda views, actionable subtasks must be prioritized and rendered first, clearly parented under their Thema container, so the next executable step is always immediately accessible.



---

#### UC8: Cognitive Deconstruction, AI-Powered Micro-Actions & Cascade Completion

* **Anti-Paralysis Micro-Action Breakdown:**
* Overwhelming themes and complex interdependencies trigger executive dysfunction and task avoidance. To eliminate startup friction, provide single-click deconstruction of broad themes into frictionless micro-actions led by concrete operational verbs (e.g., *Open, Read, Write, Scan, Email, Download, Review*).


* **AI-Assisted Deconstruction & Interactive Curation:**
* The AI agent analyzes the Thema and proposes an ordered list of atomic micro-tasks ($\le 15\text{–}20\text{ min}$ each).
* **User Control & Curation:** The user can interactively accept, reject, reorder (drag & drop), edit, or delete generated micro-actions before or after placing them on the board.


* **Cumulative Completion & Visual Consolidation:**
* Clicking the completion marker (⭕ $\rightarrow$ ❌/✓) on the final terminal action—or choosing "Complete All" on the cluster—automatically marks all upstream connected micro-actions as **Done**.
* **Visual State Transformation:** Completed micro-actions collapse into a consolidated summary stack to eliminate visual clutter. The Thema retains its signature color border/accent for spatial memory, while its status transitions to **`completed`** (with strikethrough and muted opacity), providing an explicit dopamine closure signal.



---

### Implementation Prompt for Coding Agents

```markdown
# TASK: Implement UC7 (Focus Timeboxing & Cascading Agenda) and UC8 (Micro-Action AI Decomposer & Cascade Completion)

## Context & Architecture
- Framework: Angular 21 (Signals, Standalone Components), TypeScript 5.9+.
- State Management: `TaskstickStoreService` (Dexie.js IndexedDB + LocalStorage sync).
- Components involved: `PostItNodeComponent`, `WeeklyPlannerComponent`, `AiAgentService`, `TaskstickStoreService`, `FocusSpotlightComponent`.

---

## 1. Specifications for UC7

### A. Subtask Duration & Direct Focus Launch
1. **Quick Duration Selector:**
   - In `PostItNodeComponent` (compact subtask mode), add a fast duration selector (pills: `5m`, `15m`, `25m`, `45m`) that updates `note.estimatedMinutes`.
2. **Instant Focus Action:**
   - Add a direct `🎯 Focus` icon button on subtask nodes that invokes `TaskstickStoreService.setActiveFocusNote(note)` and switches the workspace to the Focus Spotlight view with the timer preloaded to `note.estimatedMinutes`.

### B. Cascading Scheduler & Theme Non-Blocking
1. **Thema Non-Blocking Rule:**
   - In `TaskstickStoreService.detectCycle()` and DAG dependency solver (`isBlocked` calculation):
     - Ensure notes categorized as `isThema === true` are explicitly exempt from `isBlocked = true`.
     - Only leaf action nodes inherit blocking states from unfulfilled prerequisites.
2. **Weekly Planner Cascade View:**
   - In `WeeklyPlannerComponent`, group subtasks under their parent Thema:
     - Render the Thema container with its assigned color header.
     - Indent and cascade its connected subtasks below it in topological/execution order.
     - The first unblocked, actionable subtask must be highlighted as the **"Next Action"**.

---

## 2. Specifications for UC8

### A. Micro-Action Decomposition (AI & Manual)
1. **AI Micro-Step Generator (`AiAgentService`):**
   - Enhance `decomposeTask()` to generate ultra-atomic micro-actions specifically prefixed with concrete physical verbs (`Ouvrir/Open`, `Lire/Read`, `Rédiger/Write`, `Numériser/Scan`, `Envoyer/Send`).
   - Limit default duration for each micro-action to 5–15 minutes.
2. **Interactive Action Tray (Review Modal / Popover):**
   - When AI decomposition runs, present an interactive staging tray displaying proposed micro-actions.
   - The user must be able to:
     - Check/uncheck individual actions (Accept/Reject).
     - Drag to reorder steps.
     - Edit inline text or delete items.
     - Click "Apply to Board", which instantiates the accepted nodes and connects them with `depends_on` or `parent_of` edges.

### B. Cascade Completion & Visual State Machine
1. **Cascade Completion in Store:**
   - Add `completeTaskCascade(finalActionNoteId: string)` in `TaskstickStoreService`:
     - When a terminal action in a chain is marked done (or user triggers "Mark All Connected Done"):
       - Transition all upstream connected subtask notes to `status = 'done_cross'`.
       - Transition the parent Thema note to `status = 'done_check'`.
2. **Visual Consolidation:**
   - On the Ideation Wall and Scheduler:
     - Group completed subtasks into a collapsed stack or mini-badge (`✓ 5/5 actions`) beneath the Thema to declutter the canvas.
     - Preserve the Thema’s distinctive hue/tag color for spatial recognition while dimming background opacity (`opacity: 0.65`) to signal closure.

```

---

### Key UC Differences & Clarifications

| Feature Aspect | **UC7 (Focus & Agenda Scheduling)** | **UC8 (Deconstruction & Cascade Done)** |
| --- | --- | --- |
| **Core ADHD Challenge** | Time blindness & scheduling overwhelm. | Initiation paralysis & task dread. |
| **Primary Interaction** | Quick chips (`15m`, `25m`) $\rightarrow$ Launch Focus Mode $\rightarrow$ Cascading agenda view. | AI decomposition into verb-led micro-actions $\rightarrow$ Curate/Reorder $\rightarrow$ Apply. |
| **DAG / Status Rule** | Themes are never marked `isBlocked`; actionable children float to the top. | Completing terminal action cascades `done` to all linked items; collapses clutter while keeping Thema color. |

Would you like to proceed with generating the unit tests and Angular Signals store methods (`completeTaskCascade` and the Thema non-blocking DAG solver) for these two use cases?