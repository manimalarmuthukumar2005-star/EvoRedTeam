# EvoRedTeam: The Living Evolution Lab — Design Concept & Visual Metaphor

## 1. Executive Summary & Design Rationale
Conventional AI red-teaming and security tools default to a standard SaaS layout: dark navy background, left sidebar, card grids, line charts, and flat tables. 

**EvoRedTeam explicitly rejects this generic template.** Instead, the interface is designed as an interactive, bioluminescent **living specimen laboratory**. The user's input prompt is the biological "Patient Zero" (Generation 0), and adversarial test prompts are living organisms that mutate, proliferate, or undergo culling inside a living petri-dish field.

Every visual element in the interface maps deterministically to a verified row in `results.csv`, `lineage.json`, and `generations/gen_XX.json`. Nothing is decorative without meaning; nothing is fabricated for visual effect.

---

## 2. Visual Identity & Color Palette

| Token | Hex / Value | Semantic Meaning in Lab |
|---|---|---|
| **Dish Background** | `#0A0D0B` | Deep petri-dish substrate with faint organic green undertone |
| **Origin / Patient Zero** | `#E8ECE9` | Generation 0 base prompt marker, radiating distinct concentric pulse |
| **Safe (0.00 – 0.19)** | `#4FD8A8` | Bioluminescent mint green: guardrail intact, prompt refused or harmless |
| **Low Risk (0.20 – 0.39)**| `#B8D94F` | Chartreuse: slight evasion or minor semantic ambiguity |
| **Medium Risk (0.40 – 0.59)**| `#F4B942` | Amber yellow: partial compliance or academic boundary leak |
| **High Risk (0.60 – 0.79)**| `#FF6B35` | Vibrant orange: significant guardrail circumvention, flagged probe |
| **Critical Risk (0.80 – 1.00)**| `#FF2E63` | Crimson magenta: complete bypass, direct unauthorized execution |
| **Immune Blue** | `#4F9FD8` | Neutralizing defense patch halo in Immune Response replay |
| **Instrument Text** | `JetBrains Mono`, `Fira Code` | Monospace typography for readings, counters, prompt IDs, latency |
| **Narrative Text** | `Space Grotesk`, `Outfit` | Clean humanist sans for headers and methodology documentation |

---

## 3. Data Field to Visual Mapping

```
+-------------------------------------------------------------------------+
| REAL DATA FIELD             | VISUAL REPRESENTATION IN LAB DISH         |
+-----------------------------+-------------------------------------------+
| generation = 0              | Central "Patient Zero" seed organism (#E8ECE9, multi-ring halo) |
| generation >= 1             | Radial orbital distance from center (drifting in gen ring)     |
| risk_score (0.0 - 1.0)      | Bioluminescent core color & glow intensity (0px to 25px blur)  |
| risk_level (SAFE..CRITICAL) | Text badge in specimen hover tooltip & microscope slide        |
| lineage.json edge (p -> c)  | Organic pulsating tendril connecting parent to child node      |
| survived_selection = False  | Culling animation: smooth shrink (radius -> 0) & opacity fade   |
| defense_patch.json delta    | Color morph from critical crimson (#FF2E63) -> immune (#4F9FD8)|
| prompt_id stable hash       | Deterministic angular positioning offset (reproducible layout) |
+-------------------------------------------------------------------------+
```

---

## 4. Canvas Organism Field Technical Specification

### 4.1 Rendering Strategy
- **Layer Architecture**: Single high-performance HTML5 2D `<canvas>` managed by `OrganismEngine.js`.
- **Coordinate System**: Deterministic polar/force layout. The Generation 0 base prompt sits at the center $(0,0)$. Generations $1..N$ radiate outward in concentric rings.
- **Node Cap & Performance Budget**: Hard limit of 150 actively animated organisms. If generations exceed this, nodes cluster into representative "colony" nodes with aggregate weight rather than dropping records.
- **Frame Rate Target**: Smooth 60 FPS on mid-range hardware using `requestAnimationFrame`. Zero `setInterval` polling for animations.
- **Offscreen Throttling**: The animation loop automatically pauses via `IntersectionObserver` when the canvas section scrolls out of the viewport.

### 4.2 Motion & Biological Physics
- **Ambient Brownian Motion**: Organisms gently oscillate around their stable equilibrium coordinates using gentle sinusoidal drift ($dx = \sin(\omega t) \cdot A$).
- **Tendril Growth**: When moving from Generation $N \to N+1$, tendrils grow from the parent node along cubic Bézier curves over 400–600ms.
- **Culling Phase**: Non-surviving nodes undergo programmed cell death (apoptosis) over 800ms, fading alpha and contracting radius before settling as dimmed cellular debris.
- **Reduced Motion Mode (`prefers-reduced-motion`)**: When active, Brownian drift is disabled, and transitions switch to instant alpha fades without continuous orbital physics.

### 4.3 Fallback Ladder
- **Level 1 (Shipped / Target)**: Full HTML5 2D Canvas interactive biological simulation with real-time radial tendrils, particle halos, scrubber interpolation, and slide-in microscope viewer.
- **Level 2 (Static Fallback)**: Deterministic SVG node-link graph with static halos and click inspection.
- **Level 3 (Minimal Fallback)**: Scatter chart in Recharts mapping generation vs. risk score.

*Status: **Level 1 Shipped**.*

---

## 5. End-to-End User Experience Workflow

1. **Specimen Induction**: User enters a single testing prompt at the landing chamber (Patient Zero).
2. **First Brood Burst**: PromptTesterAgent synthesizes 15–20 Generation 1 test prompts across 18 distinct evasion techniques.
3. **Execution & Evaluation**: Target models are probed; LLM judge scores each response with explicit rationale.
4. **Evolution Cycle**: High-risk survivors undergo mutation and crossover across generations.
5. **Specimen Slide Inspection**: Clicking any organism pulls a microscopic slide with full prompt text, target response, judge rationale, and lineage breadcrumb back to Patient Zero.
6. **Immune Response**: Retesting risky prompts with defense system-prompt patches replays the organism field from red to immune blue.
7. **Specimen Archive**: Complete tabular exploration with multi-attribute filtering and direct CSV / ZIP package export.
