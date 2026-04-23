# FlowCraft — Diagram Builder

A lightweight, browser-based diagram / flowchart builder with animated edges, no dependencies (except html2canvas and gif.js for export).

![FlowCraft screenshot](https://lapolaris.fr/outils/flowcraft/screenshot.png)

---

## Features

- **Drag & drop nodes** — create and move nodes freely on the canvas
- **Connect nodes** — drag from a port or use the Connect button / context menu
- **Animated edges** — glowing dots traveling along connections, configurable speed and direction
- **Edge moving** — animated dash/dot stroke scrolling along Dashed or Dotted edges (exported in GIF/video)
- **Edge styles** — Straight, Curved, Step, Smooth
- **Freehand curves** — double-click any link to add a waypoint and bend it freely; drag waypoints to reshape; double-click a waypoint to remove it
- **Arrow types** — None, Triangle, Open, Circle
- **Node customization** — label, subtitle, border/background/text color, shape (Rect, Rounded, Circle, Sharp), border radius
- **Icon support** — emoji/text icon or Font Awesome icon (searchable picker with 1 000+ icons)
- **Link customization** — color, dash style (Solid, Dashed, Dotted), arrow type, per-edge animation toggle
- **Multi-selection** — Shift+click or lasso drag to select multiple nodes; move or delete them as a group
- **Keyboard shortcuts** — Delete/Backspace to delete, Ctrl+D to duplicate, Escape to deselect, Space to pan
- **Pan & zoom** — scroll wheel, middle-click drag, Space + drag, pinch-to-zoom on mobile
- **Themes** — Dark, Light, Navy, Purple
- **Import / Export JSON** — full diagram state (nodes + edges + waypoints) serialized to JSON
- **Export PNG** — screenshot of the canvas via html2canvas
- **Export GIF** — animated GIF (3 s loop, 30 fps) via gif.js — includes dot animation and edge moving
- **Export MP4/WebM** — 6 s animated video via MediaRecorder API — includes dot animation and edge moving
- **i18n** — French / English toggle
- **Responsive** — collapsible sidebars, touch support

---

## Project structure

```
flowcraft/
├── index.html
├── css/
│   └── main.css
├── js/
│   ├── main.js              # Entry point — wires all modules together
│   ├── state.js             # Global state object, DOM refs, viewport helpers
│   ├── node-manager.js      # Node creation, rendering, drag, props panel
│   ├── edge-manager.js      # Edge rendering, animation, wire-drag, edge props, waypoints
│   ├── ui.js                # Toolbar, sidebar, canvas interaction (pan/zoom/drag/lasso/keyboard)
│   ├── export-manager.js    # PNG, GIF, MP4 export logic
│   ├── example.js           # Default diagram loaded on startup
│   ├── i18n.js              # Translations (fr / en)
│   ├── fa-icons.js          # Font Awesome icon list for the picker
│   ├── gif.js               # gif.js library
│   ├── gif.worker.js        # gif.js web worker
│   └── html2canvas.min.js   # html2canvas library
└── README.md
```

All JS files use **ES Modules** (`type="module"`).

---

## Getting started

### 1. Build (optional — recommended for production)

Bundle and minify all modules into a single file with esbuild:

```bash
npx esbuild js/main.js --bundle --minify --outfile=js/main.min.js
```

Then update `index.html` to load `js/main.min.js` instead of `js/main.js`.

### 2. Serve locally

ES Modules require a server (not `file://`). Serve the folder with any static server of your choice.

---

## Usage

### Adding nodes
Click **+ Nœud / + Node** in the toolbar. A new process node appears at a random position.
**📌 Note** and **T Texte** buttons add sticky-note and free-text elements.

### Connecting nodes
Two methods:
1. **Port drag** — hover a node to reveal the 4 ports (↑ ↓ ← →), then drag from a port to another node.
2. **Connect button** — select a node, click **Connecter**, then click the target node.

Right-click a node → **Connecter** also works.

### Editing a node
Select a node to open its properties in the right panel:
- Edit label, subtitle
- Pick border / background / text color
- Switch between emoji icon and Font Awesome icon
- Choose shape and border radius

Right-click → **Éditer** opens the quick-edit modal.

### Editing an edge (link)
Click on a link to open its properties:
- Change color
- Toggle animated dots on/off per edge
- Change dash style (Solid / Dashed / Dotted)
- Add an arrow (Triangle / Open / Circle)
- Click **Appliquer** to save

Right-click on a link to delete it instantly.

### Freehand curves (waypoints)
Any link can be bent freely without changing its type:
- **Double-click on a link** → adds a waypoint at that position, curving the link through it (Catmull-Rom spline)
- **Drag a waypoint handle** → reshapes the curve in real time
- **Double-click a waypoint handle** → removes that point (if no points remain, the link returns to its original style)
- The right panel shows the waypoint count and hints when a link is selected

### Multi-selection
- **Shift + click** nodes to add/remove them from the selection
- **Drag on empty canvas** → draws a lasso rectangle; all nodes inside are selected on release
- **Drag any selected node** → moves the entire group together

### Keyboard shortcuts
| Key | Action |
|-----|--------|
| `Delete` / `Backspace` | Delete selected nodes (and their edges) or the selected link |
| `Ctrl + D` | Duplicate selected nodes (offset +24 px) |
| `Escape` | Deselect everything / cancel connect mode |
| `Space + drag` | Pan the canvas |

### Animation controls (left sidebar)
| Toggle | Effect |
|--------|--------|
| Dots animés | Animated glowing dots travel along edges |
| Glow edges | Edges glow with the dot color |
| Pulse nœuds | Colored nodes pulse with a soft halo |
| Direction aléa | Dots move in random directions |
| Edge moving | Dashes/dots scroll along Dashed or Dotted edges |

The **VITESSE** slider controls the speed of all animations simultaneously.

### Pan & Zoom
| Action | Result |
|--------|--------|
| Scroll wheel | Zoom in / out |
| Middle-click drag | Pan |
| Space + left-click drag | Pan |
| Pinch (touch) | Zoom |
| One-finger drag on canvas (touch) | Pan |

### Import / Export JSON
Paste a JSON diagram in the left sidebar textarea and click **Charger / Load**.

Click **Exporter / Export** (JSON button) to serialize the current diagram to the textarea.

The JSON format supports: nodes with all properties, edges with color/dash/arrow/animDots/waypoints/pathStyle.

Example JSON format:
```json
{
  "edgeStyle": "curve",
  "nodes": [
    {
      "id": "n1",
      "type": "process",
      "x": 400,
      "y": 300,
      "label": "Subject",
      "sub": "Interface",
      "icon": "📢",
      "iconMode": "emoji",
      "faIcon": "fa-solid fa-bullhorn",
      "color": "#00f5a0",
      "bgColor": "",
      "textColor": ""
    }
  ],
  "edges": [
    {
      "from": "n1",
      "to": "n2",
      "color": "#00f5a0",
      "dash": "dashed",
      "arrow": "triangle",
      "animDots": true,
      "waypoints": [{ "x": 550, "y": 200 }],
      "pathStyle": "curve"
    }
  ]
}
```

Example exported gif image:

![Diagram with flowcraft (Observer Design pattern)](https://lapolaris.fr/uploads/posts/editor/observer-pattern-with-flowcraft-diagram-builder.gif)

---

## Module responsibilities

| File | Responsibility |
|------|----------------|
| `state.js` | Single source of truth — `state` object, DOM refs (`canvas`, `canvasWrap`, `viewport`), `applyViewport()`, `screenToCanvas()`, `deselectAllBase()` |
| `node-manager.js` | `createNode()`, `renderNode()`, `bindNodeEvents()`, `selectNode()`, `deselectAll()`, `renderProps()` — handles multi-selection and group drag |
| `edge-manager.js` | `rebuildEdges()`, `startAnimation()`, `startWireDrag()`, `startConnect()`, `finishConnect()`, `cancelConnect()`, `selectEdge()`, `renderEdgeProps()`, `deleteNode()`, `updateStats()`, waypoint logic (insert, drag, delete), Catmull-Rom path |
| `ui.js` | All button/toggle/sidebar handlers, `setupCanvasInteraction()` (pan, zoom, drag, lasso, keyboard shortcuts, touch), `openEditModal()`, `setupEditModal()`, JSON import/export |
| `export-manager.js` | PNG (`html2canvas`), GIF (`gif.js`), MP4/WebM (`MediaRecorder`) export — renders edge moving and waypoint curves frame by frame |
| `example.js` | Loads the default API-gateway demo diagram |
| `i18n.js` | Translation map, `applyLang()`, `translate()` |
| `fa-icons.js` | Array of Font Awesome class strings for the icon picker |

---

## Dependency graph

```
main.js
 ├── i18n.js
 ├── ui.js
 │    ├── state.js
 │    ├── node-manager.js ──→ state.js, i18n.js, fa-icons.js, edge-manager.js
 │    ├── edge-manager.js ──→ state.js, i18n.js
 │    ├── i18n.js
 │    └── example.js ────→ state.js, node-manager.js, edge-manager.js
 ├── export-manager.js ──→ state.js
 ├── example.js
 └── edge-manager.js
```

> No circular dependencies — `deselectAllBase()` lives in `state.js` so both `node-manager` and `edge-manager` can call it without importing each other.

---

## Browser support

| Feature | Requirement |
|---------|-------------|
| ES Modules | Chrome 61+, Firefox 60+, Safari 11+, Edge 16+ |
| MP4/WebM export | Chrome/Edge (MediaRecorder + VP9) |
| GIF export | All modern browsers |
| Pinch zoom | Mobile Safari, Chrome for Android |

---

## About

FlowCraft is an open-source tool built by [LaPolaris](https://lapolaris.fr),
a web & AI training organization based in France.

Live demo → [lapolaris.fr/outils/flowcraft](https://lapolaris.fr/outils/flowcraft)

---

## License

MIT — see [LICENSE](LICENSE).

Built by [LaPolaris](https://lapolaris.fr).
