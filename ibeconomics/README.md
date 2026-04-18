# IB Economics — interactive diagrams

An evolving set of interactive HTML diagrams covering the required graphical
elements of the IB Economics syllabus. Designed for teacher-led introduction,
pupil exploration, and revision.

---

## Quick start

You just downloaded this zip. Here is how to see what's inside.

### Option A: open it in a browser locally (quickest to try)

ES modules (the `import` line inside the diagram HTML) will not load from a
plain `file://` URL, so you need a tiny local web server. You almost
certainly already have Python, which makes this one line:

```bash
cd path/to/ib-econ-diagrams
python3 -m http.server 8000
```

Then open <http://localhost:8000/> in your browser. You will see the
collection index. Click "Market equilibrium" to try the first diagram.

Stop the server with Ctrl-C.

### Option B: push to GitHub Pages (what you actually want long-term)

1. Create a new repo at <https://github.com/physicalsmithness>, call it
   whatever you like (e.g. `ib-econ-diagrams`).
2. From inside the unzipped folder:
   ```bash
   git init
   git add .
   git commit -m "First diagram plus shared scaffolding"
   git branch -M main
   git remote add origin https://github.com/physicalsmithness/ib-econ-diagrams.git
   git push -u origin main
   ```
3. In the repo's **Settings → Pages**, set the source to the `main` branch,
   root folder. Wait a minute. Your site will be live at
   `https://physicalsmithness.github.io/ib-econ-diagrams/`.

No build step, no bundler, no server-side code. Just files on a CDN.

---

## What's in the box

```
ib-econ-diagrams/
├── index.html                   top-level browser of the whole set
├── css/
│   └── design-system.css        shared tokens, typography, SVG classes
├── js/
│   ├── common.js                shared utilities: plot scaffolding,
│   │                            draggable, spring physics, scenarios
│   └── pq-plot.js               higher-level reusable plot component
│                                (will be used by diagram 2 onwards)
├── diagrams/
│   └── 01-market-equilibrium.html    first fully working diagram
├── scenarios/                   (placeholder folder for future)
└── README.md
```

One working diagram so far. More to come.

---

## Design principles

1. **Every diagram is interactive**: sliders, drag handles, draggable price lines.
2. **Every region with economic meaning is highlightable**: consumer surplus, welfare loss, tax revenue, shortage or surplus gaps.
3. **Dynamic relationships feel physical**: stable equilibria are springy, sticky variables resist, lagged responses lag.
4. **Explanation coexists with play**: a live narration panel reacts to the current state; a key-idea box captures the core concept.
5. **Non-graphical consequences are surfaced**: live readouts of total revenue, tax incidence, expenditure, employment implications, qualitative frictions.
6. **Scenarios re-skin the diagrams**: the St Andrews greengrocer, the Albanian wheat market, Danny's lemonade stand. Same economics, different clothes.
7. **The set coheres stylistically**: shared colour conventions, shared interaction grammar, shared typography. A red region means a bad thing everywhere.

## Architecture

Colour, typography, and layout conventions live entirely in
`css/design-system.css`. If you want to change the colour of the demand
curve site-wide, you change it once in that file. Interaction behaviours
live in `js/common.js` and `js/pq-plot.js` and are imported by each diagram.

Each diagram is a standalone `.html` file that imports the shared JS as
ES modules. This means the site works perfectly on GitHub Pages with no
build step.

## Colour conventions (never change meaning across diagrams)

| Concept                              | Colour            |
| ------------------------------------ | ----------------- |
| Demand, buyers, MPB, MSB             | Warm amber        |
| Supply, sellers, MPC, MSC            | Cool teal         |
| Equilibrium point                    | Deep navy         |
| Welfare loss, deadweight loss, bads  | Muted coral       |
| Welfare gain, surplus, goods         | Soft leaf green   |
| Tax revenue, transfers               | Slate grey        |
| Socially optimal markers             | Dashed stone      |
| Ghosted pre-shift curve              | Dotted light fawn |

## Scenario system

Each diagram has a scenario picker at the top. Scenarios supply axis
labels, units, natural scales, default equilibrium points, and flavour
text for the narration. The underlying economics is identical; only the
labels and numbers change. Adding a scenario is one entry in the
`scenarios` object in `js/common.js`.

## Interaction grammar

- Drag handles are circles, ~14 to 18px. Cursor changes to grab, scales up on hover.
- A horizontal black dashed line represents a forced price. Drag it, release it, it springs back.
- Shaded regions brighten on hover.
- Sliders below the graph adjust non-visible parameters (percentage shift of a curve, for instance).
- A toggle in the controls row disables the springy return if you want to hold a disequilibrium state for inspection.

## For the future

- Test mode: regions unlabelled, narration replaced with targeted questions.
- Analytics backend: every interaction already dispatches structured events via `logEvent()` in `common.js`. Plug in a listener when the wider pupil system is built.
- More scenarios, more diagrams.
