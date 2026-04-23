export const state = {
  nodes: [],
  edges: [],
  selectedNode: null,
  selectedEdge: null,
  connectMode: false,
  connectSource: null,
  dragging: null,
  dragOffX: 0,
  dragOffY: 0,
  dotColor: '#00f5a0',
  edgeStyle: 'curve',
  animDots: true,
  animGlow: true,
  animPulse: false,
  animRandom: false,
  animEdgeMove: false,
  speed: 1.2,
  ctxTarget: null,
  editTarget: null,
  nodeColor: '#2a2a3e',
  dotAnimations: [],
  rafId: null,
  idCounter: 0,
  panX: 0,
  panY: 0,
  zoom: 1,
  panning: false,
  panStartX: 0,
  panStartY: 0,
  selectedNodes: [],
  lasso: null,
};

export const ICONS = {
  process: '▭', decision: '◇', cloud: '☁️', database: '🗄️',
  api: '⚡', user: '👤', server: '🖥️', mobile: '📱',
  note: '📝', text: 'T'
};

export const canvas = document.getElementById('canvas');
export const canvasWrap = document.getElementById('canvasWrap');
export const viewport = document.getElementById('viewport');

export function applyViewport() {
  viewport.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
}

export function screenToCanvas(clientX, clientY) {
  const rect = canvasWrap.getBoundingClientRect();
  return {
    x: (clientX - rect.left - state.panX) / state.zoom,
    y: (clientY - rect.top - state.panY) / state.zoom,
  };
}

export function deselectAllBase() {
  state.selectedNode = null;
  state.selectedEdge = null;
  document.querySelectorAll('.node').forEach(el => el.classList.remove('selected'));
  document.querySelectorAll('.edge-group.selected').forEach(el => el.classList.remove('selected'));
}
