Bridging the gap between divergent associative thinking (the AuDHD "web of everything") and linear task execution requires treating the **Ideation Wall** and **Task Manager** not as separate rooms, but as two lenses on the same live graph. For a high-capacity ADHD/autistic mind, losing the *why* (spatial/conceptual context) kills the *how* (dopamine-driven actuation), while seeing the entire graph during execution triggers analysis paralysis.

(Note: Your `src/` archive uploaded as raw compressed binary headers rather than readable text, so the architectural upgrades below are mapped directly to your Angular component tree—`ideation-wall`, `taskstick-store`, `svg-connection-layer`, `focus-spotlight`, and `ai-agent`.)

**1. Bi-Directional "Semantic Tether" (Preserving Mental Context)**

* **The Neuro-Friction:** Switching from `ideation-wall` to `task-manager` or `weekly-planner` strips away the spatial memory of *why* a task exists, causing the brain to drop the thread.


* **The Upgrade (`taskstick-graph.model.ts` & `focus-spotlight.component.ts`):** Add a `contextBreadcrumb` and `originClusterId` to every actionable task node. When viewing a task in `focus-spotlight` or `weekly-planner`, render a miniature, read-only **1-Hop Mini-Map** (using a lightweight instance of `svg-connection-layer`) showing the parent idea node and its immediate sibling concepts. Clicking a node in the mini-map teleports the viewport directly to those coordinates on the `ideation-wall`.



**2. Zero-Friction "Micro-Actuation" (Defeating Task Paralysis)**

* **The Neuro-Friction:** High-complexity thinkers conceptualize massive architectural systems inside a single `post-it-node`, which then feels too monolithic to start.


* **The Upgrade (`ai-agent.service.ts` & `post-it-context-menu.component.ts`):** Add a **"Spark / De-paralyze"** action to the context menu. When triggered, `ai-agent.service` reads the node and its connected neighbors, then generates two things inside the node:


* **`firstPhysicalAction`:** A hyper-concrete, 2-minute entry step (e.g., *"Open `taskstick-store.service.ts` and define the `EnergyLevel` enum"* instead of *"Refactor store"*).


* **3-Step Micro-Checklist:** Embedded directly on the `post-it-node` face so the user can check off the first step *right on the canvas* to build momentum before ever opening the formal task view.





**3. Visual "Current Flow" & Fog-of-War Dimming (Sensory Regulation)**

* **The Neuro-Friction:** A rich mind map quickly turns into visual noise (autistic sensory overload) while tempting the ADHD brain to jump between 15 unfinished branches at once.
* **The Upgrade (`svg-connection-layer.component.ts` & `ideation-wall.component.ts`):**
* **Active Focus Dimming:** When a node or branch is marked as "In Actuation," dim all unconnected nodes on the canvas to `opacity: 0.2` and `filter: grayscale(80%)`.


* **Animated SVG Dependency Flow:** Use CSS `stroke-dashoffset` animations on `svg-connection-layer` edges to show directional flow *only* along the active dependency chain leading to the current task. When a prerequisite post-it is completed, animate a pulse down the SVG bezier curve to "unlock" the downstream action node.





**4. "Save RAM" State-Dump on Context Switching (Working Memory Protection)**

* **The Neuro-Friction:** Interruptions or hyperfocus shifts wipe out the fragile mental stack of what you were *just* about to do next.
* **The Upgrade (`postit.model.ts` & `speech-recognition.service.ts`):** Add a `mentalStackDump` field to your task/post-it model. Whenever a user pauses a task in `focus-spotlight` or switches branches, trigger a 5-second voice-or-text prompt via `speech-recognition.service`: *"Where did you leave off, and what is the very next thought?"* Pin this note as a glowing badge on the `post-it-node` so re-entry tomorrow takes 3 seconds instead of 30 minutes of re-reading.



**5. Executive Function / Energy-State Routing**

* **The Neuro-Friction:** Traditional priority (`High / Medium / Low`) fails neurodivergent brains because ability to execute depends on current neuro-state, not deadline urgency.
* **The Upgrade (`taskstick-store.service.ts` & `dashboard.component.ts`):** Tag action nodes by **Cognitive Mode** rather than just priority:
* ⚡ **Hyperfocus / Deep Architecture** (High RAM, zero interruptions)
* 🔧 **Mechanical / Dopamine Wins** (Low friction, visual/tactile fixes)
* 🧠 **Divergent / Ideation** (Brainstorming, connecting nodes)
Add a state toggle in `focus-spotlight` (*"What's your brain state right now?"*) that filters the actionable queue from `taskstick-store` to match current cognitive bandwidth.





If you'd like to implement any of these directly, paste the contents of `postit.model.ts`, `taskstick-graph.model.ts`, and `ideation-wall.component.ts` (as plain text or individual `.ts` files), and we can write the exact TypeScript/Angular implementation.