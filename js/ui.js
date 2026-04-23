import { state, ICONS, canvasWrap, canvas, viewport, applyViewport, screenToCanvas } from './state.js';
import { createNode, renderNode, renderProps, deselectAll, selectNode } from './node-manager.js';
import { rebuildEdges, startConnect, cancelConnect, deleteNode, updateStats } from './edge-manager.js';
import { applyLang, translate, currentLang } from './i18n.js';
import { loadExample } from './example.js';

export function setupUi() {
  window.showCtxMenu = showCtxMenu;

  document.getElementById('ctxEdit').addEventListener('click', () => {
    if (!state.ctxTarget) return;
    hideCtxMenu();
    openEditModal(state.ctxTarget);
  });

  document.getElementById('ctxConnect').addEventListener('click', () => {
    if (!state.ctxTarget) return;
    hideCtxMenu();
    startConnect(state.ctxTarget);
  });

  document.getElementById('ctxDelete').addEventListener('click', () => {
    if (!state.ctxTarget) return;
    hideCtxMenu();
    deleteNode(state.ctxTarget);
  });

  document.addEventListener('click', () => hideCtxMenu());

  document.getElementById('btnAddNode').addEventListener('click', () => {
    const x = 100 + Math.random() * 300;
    const y = 100 + Math.random() * 200;
    createNode('process', x, y);
  });

  document.getElementById('btnAddNote').addEventListener('click', () => {
    const x = 100 + Math.random() * 300;
    const y = 100 + Math.random() * 200;
    createNode('note', x, y);
  });

  document.getElementById('btnAddText').addEventListener('click', () => {
    const x = 100 + Math.random() * 300;
    const y = 100 + Math.random() * 200;
    createNode('text', x, y);
  });

  document.getElementById('btnConnect').addEventListener('click', () => {
    if (state.connectMode) cancelConnect();
    else if (state.selectedNode) startConnect(state.selectedNode);
    else alert('Sélectionne un noeud d\'abord');
  });

  document.getElementById('btnClear').addEventListener('click', () => {
    if (!confirm('Vider le canvas ?')) return;
    state.nodes.forEach(n => {
      const el = document.getElementById(n.id);
      if (el) el.remove();
    });
    state.nodes = [];
    state.edges = [];
    rebuildEdges();
    deselectAll();
    updateStats();
  });

  document.getElementById('btnLoad').addEventListener('click', loadExample);

  const backdrop = document.getElementById('sidebarBackdrop');

  function closeSidebars() {
    document.querySelector('.sidebar').classList.remove('show');
    document.querySelector('.right-panel').classList.remove('show');
    document.getElementById('btnToggleLeft').classList.remove('active');
    document.getElementById('btnToggleRight').classList.remove('active');
    backdrop.classList.remove('show');
  }

  backdrop.addEventListener('click', closeSidebars);
  backdrop.addEventListener('touchend', e => { e.preventDefault(); closeSidebars(); });

  function toggleLeft(e) {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    const sb = document.querySelector('.sidebar');
    const isSmall = window.innerWidth <= 900;
    if (isSmall) {
      const opening = !sb.classList.contains('show');
      sb.classList.toggle('show');
      document.querySelector('.right-panel').classList.remove('show');
      document.getElementById('btnToggleRight').classList.remove('active');
      backdrop.classList.toggle('show', opening);
    } else {
      sb.classList.toggle('collapsed');
    }
    document.getElementById('btnToggleLeft').classList.toggle('active');
  }

  function toggleRight(e) {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    const rp = document.querySelector('.right-panel');
    const isSmall = window.innerWidth <= 900;
    if (isSmall) {
      const opening = !rp.classList.contains('show');
      rp.classList.toggle('show');
      document.querySelector('.sidebar').classList.remove('show');
      document.getElementById('btnToggleLeft').classList.remove('active');
      backdrop.classList.toggle('show', opening);
    } else {
      rp.classList.toggle('collapsed');
    }
    document.getElementById('btnToggleRight').classList.toggle('active');
  }

  const btnLeft = document.getElementById('btnToggleLeft');
  const btnRight = document.getElementById('btnToggleRight');

  btnLeft.addEventListener('click', toggleLeft);
  btnRight.addEventListener('click', toggleRight);
  btnLeft.addEventListener('touchend', e => { e.stopPropagation(); e.preventDefault(); toggleLeft(null); });
  btnRight.addEventListener('touchend', e => { e.stopPropagation(); e.preventDefault(); toggleRight(null); });

  const exportWrap = document.querySelector('.export-wrap');
  document.getElementById('btnExportDrop').addEventListener('click', e => {
    e.stopPropagation();
    exportWrap.classList.toggle('open');
  });
  document.addEventListener('click', () => exportWrap.classList.remove('open'));

  document.getElementById('btnLang').addEventListener('click', () => {
    applyLang(currentLang === 'fr' ? 'en' : 'fr');
  });

  document.getElementById('btnLoadJson').addEventListener('click', () => {
    const errEl = document.getElementById('jsonError');
    errEl.textContent = '';
    let data;
    try {
      data = JSON.parse(document.getElementById('jsonInput').value);
    } catch (e) {
      errEl.textContent = 'JSON invalide : ' + e.message;
      return;
    }
    if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
      errEl.textContent = 'Structure attendue : { nodes: [...], edges: [...] }';
      return;
    }

    state.nodes.forEach(n => { const el = document.getElementById(n.id); if (el) el.remove(); });
    state.nodes = [];
    state.edges = [];
    state.idCounter = 0;

    if (data.edgeStyle) {
      state.edgeStyle = data.edgeStyle;
      const edgeStyleSelect = document.getElementById('edgeStyle');
      if (edgeStyleSelect) edgeStyleSelect.value = state.edgeStyle;
    }

    data.nodes.forEach(n => {
      const rawIconMode = (n.iconMode || 'text').toString().toLowerCase();
      const iconMode = rawIconMode === 'fa' || rawIconMode === 'fontawesome' ? 'fa' : 'text';
      const nodeType = n.type || 'process';
      const node = {
        id: n.id || ('n' + (++state.idCounter)),
        type: nodeType,
        x: n.x ?? 100,
        y: n.y ?? 100,
        label: n.label ?? (n.type || 'Node'),
        sub: n.sub || '',
        icon: n.icon != null ? n.icon : (ICONS[nodeType] || ''),
        iconMode,
        faIcon: n.faIcon || 'fa-solid fa-bolt',
        color: n.color || '#2a2a3e',
        bgColor: n.bgColor || '',
        textColor: n.textColor || '',
        shape: n.shape || 'rect',
        borderRadius: n.borderRadius ?? 10,
        // Note/Text extras
        fontSize: n.fontSize,
        fontWeight: n.fontWeight,
        fontStyle: n.fontStyle,
      };
      const num = parseInt(node.id.replace(/\D/g, ''), 10);
      if (!isNaN(num) && num > state.idCounter) state.idCounter = num;
      state.nodes.push(node);
      renderNode(node);
    });

    state.edges = data.edges.filter(e => e.from && e.to).map(e => ({
      from: e.from,
      to: e.to,
      color: e.color,
      dash: e.dash,
      arrow: e.arrow,
      animDots: e.animDots !== false,
      pathStyle: e.pathStyle,
      waypoints: e.waypoints || [],
    }));
    rebuildEdges();
    updateStats();
  });

  document.getElementById('btnExportJson').addEventListener('click', () => {
    const data = {
      edgeStyle: state.edgeStyle,
      nodes: state.nodes.map(n => {
        const obj = {
          id: n.id,
          type: n.type,
          x: Math.round(n.x),
          y: Math.round(n.y),
          label: n.label,
          sub: n.sub,
          color: n.color,
          bgColor: n.bgColor,
          textColor: n.textColor,
        };
        if (n.type === 'note') {
          // notes n'ont pas besoin d'icon/shape
        } else if (n.type === 'text') {
          obj.fontSize = n.fontSize;
          obj.fontWeight = n.fontWeight;
          obj.fontStyle = n.fontStyle;
        } else {
          obj.icon = n.icon;
          obj.iconMode = n.iconMode === 'fa' ? 'fontawesome' : 'emoji';
          obj.faIcon = n.faIcon;
          obj.shape = n.shape;
          obj.borderRadius = n.borderRadius;
        }
        return obj;
      }),
      edges: state.edges.map(e => {
        const obj = {
          from: e.from,
          to: e.to,
          color: e.color,
          dash: e.dash,
          arrow: e.arrow,
          animDots: e.animDots !== false,
        };
        if (e.pathStyle) obj.pathStyle = e.pathStyle;
        if (e.waypoints && e.waypoints.length > 0) obj.waypoints = e.waypoints;
        return obj;
      }),
    };
    document.getElementById('jsonInput').value = JSON.stringify(data, null, 2);
  });

  document.getElementById('btnExportJsonFile').addEventListener('click', () => {
    const data = {
      edgeStyle: state.edgeStyle,
      nodes: state.nodes.map(n => {
        const obj = {
          id: n.id, type: n.type,
          x: Math.round(n.x), y: Math.round(n.y),
          label: n.label, sub: n.sub,
          color: n.color, bgColor: n.bgColor, textColor: n.textColor,
        };
        if (n.type === 'text') {
          obj.fontSize = n.fontSize; obj.fontWeight = n.fontWeight; obj.fontStyle = n.fontStyle;
        } else if (n.type !== 'note') {
          obj.icon = n.icon; obj.iconMode = n.iconMode === 'fa' ? 'fontawesome' : 'emoji';
          obj.faIcon = n.faIcon; obj.shape = n.shape; obj.borderRadius = n.borderRadius;
        }
        return obj;
      }),
      edges: state.edges.map(e => {
        const obj = { from: e.from, to: e.to, color: e.color, dash: e.dash, arrow: e.arrow, animDots: e.animDots !== false };
        if (e.pathStyle) obj.pathStyle = e.pathStyle;
        if (e.waypoints && e.waypoints.length > 0) obj.waypoints = e.waypoints;
        return obj;
      }),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'flowcraft-diagram.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    document.querySelector('.export-wrap').classList.remove('open');
  });

  document.getElementById('speedSlider').addEventListener('input', e => {
    state.speed = parseFloat(e.target.value);
    document.getElementById('speedVal').textContent = state.speed.toFixed(1) + 'x';
    rebuildEdges();
  });

  document.getElementById('edgeStyle').addEventListener('change', e => {
    state.edgeStyle = e.target.value;
    rebuildEdges();
  });

  function bindToggle(id, key) {
    const el = document.getElementById(id);
    el.addEventListener('click', () => {
      state[key] = !state[key];
      el.classList.toggle('on', state[key]);
      rebuildEdges();
    });
  }
  bindToggle('togDots', 'animDots');
  bindToggle('togGlow', 'animGlow');
  bindToggle('togPulse', 'animPulse');
  bindToggle('togRandom', 'animRandom');
  bindToggle('togEdgeMove', 'animEdgeMove');

  document.querySelectorAll('#dotColorPicker .color-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      document.querySelectorAll('#dotColorPicker .color-dot').forEach(d => d.classList.remove('selected'));
      dot.classList.add('selected');
      state.dotColor = dot.dataset.color;
      rebuildEdges();
    });
  });

  const themes = {
    dark: { '--bg': '#0a0a0f', '--panel': '#111118', '--border': '#1e1e2e', '--node-bg': '#16161f', '--node-border': '#2a2a3e', '--text': '#e8e8f0', '--muted': '#555570' },
    light: { '--bg': '#f0f2f5', '--panel': '#ffffff', '--border': '#dde1ea', '--node-bg': '#ffffff', '--node-border': '#c8cdd8', '--text': '#1a1a2e', '--muted': '#8890a4' },
    navy: { '--bg': '#0d1b2a', '--panel': '#112233', '--border': '#1a3050', '--node-bg': '#0f2035', '--node-border': '#1e3d5c', '--text': '#e0f0ff', '--muted': '#4a7090' },
    purple: { '--bg': '#1a0a2e', '--panel': '#22103a', '--border': '#2d1650', '--node-bg': '#1e0d35', '--node-border': '#3a2060', '--text': '#eaddff', '--muted': '#6040a0' },
  };

  document.querySelectorAll('[data-theme]').forEach(dot => {
    dot.addEventListener('click', () => {
      document.querySelectorAll('[data-theme]').forEach(d => d.classList.remove('selected'));
      dot.classList.add('selected');
      const t = themes[dot.dataset.theme];
      Object.entries(t).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
    });
  });

  setupCanvasInteraction();
}

function setupCanvasInteraction() {
  // Lasso SVG overlay
  const lassoEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  lassoEl.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:100';
  const lassoRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  lassoRect.setAttribute('fill', 'rgba(0,245,160,0.08)');
  lassoRect.setAttribute('stroke', '#00f5a0');
  lassoRect.setAttribute('stroke-width', '1');
  lassoRect.setAttribute('stroke-dasharray', '4 3');
  lassoRect.style.display = 'none';
  lassoEl.appendChild(lassoRect);
  canvasWrap.style.position = 'relative';
  canvasWrap.appendChild(lassoEl);

  canvasWrap.addEventListener('mousemove', e => {
    if (state.panning) {
      state.panX = e.clientX - state.panStartX;
      state.panY = e.clientY - state.panStartY;
      applyViewport();
      return;
    }

    // Lasso drag
    if (state.lasso) {
      const rect = canvasWrap.getBoundingClientRect();
      state.lasso.x2 = e.clientX - rect.left;
      state.lasso.y2 = e.clientY - rect.top;
      const lx = Math.min(state.lasso.x1, state.lasso.x2);
      const ly = Math.min(state.lasso.y1, state.lasso.y2);
      const lw = Math.abs(state.lasso.x2 - state.lasso.x1);
      const lh = Math.abs(state.lasso.y2 - state.lasso.y1);
      lassoRect.setAttribute('x', lx);
      lassoRect.setAttribute('y', ly);
      lassoRect.setAttribute('width', lw);
      lassoRect.setAttribute('height', lh);
      lassoRect.style.display = 'block';
      return;
    }

    if (!state.dragging) return;
    const pt = screenToCanvas(e.clientX, e.clientY);

    // Drag groupé
    if (state.groupDragOffsets) {
      state.groupDragOffsets.forEach(({ node, dx, dy }) => {
        node.x = pt.x - dx;
        node.y = pt.y - dy;
        const el = document.getElementById(node.id);
        if (el) { el.style.left = node.x + 'px'; el.style.top = node.y + 'px'; }
      });
    } else {
      state.dragging.x = pt.x - state.dragOffX;
      state.dragging.y = pt.y - state.dragOffY;
      const el = document.getElementById(state.dragging.id);
      if (el) { el.style.left = state.dragging.x + 'px'; el.style.top = state.dragging.y + 'px'; }
    }
    rebuildEdges();
  });

  canvasWrap.addEventListener('mouseup', e => {
    state.panning = false;
    canvasWrap.style.cursor = '';
    state.groupDragOffsets = null;
    state.dragging = null;

    // Fin du lasso — sélectionner les nœuds dans la zone
    if (state.lasso) {
      const rect = canvasWrap.getBoundingClientRect();
      const lx1 = Math.min(state.lasso.x1, state.lasso.x2);
      const ly1 = Math.min(state.lasso.y1, state.lasso.y2);
      const lx2 = Math.max(state.lasso.x1, state.lasso.x2);
      const ly2 = Math.max(state.lasso.y1, state.lasso.y2);
      const W = lx2 - lx1, H = ly2 - ly1;

      if (W > 5 || H > 5) {
        const selected = state.nodes.filter(n => {
          const el = document.getElementById(n.id);
          if (!el) return false;
          const nx = n.x * state.zoom + state.panX;
          const ny = n.y * state.zoom + state.panY;
          const nw = el.offsetWidth * state.zoom;
          const nh = el.offsetHeight * state.zoom;
          return nx + nw > lx1 && nx < lx2 && ny + nh > ly1 && ny < ly2;
        });
        document.querySelectorAll('.node').forEach(el => el.classList.remove('selected'));
        state.selectedNodes = selected;
        state.selectedNode = selected[selected.length - 1] || null;
        selected.forEach(n => document.getElementById(n.id).classList.add('selected'));
        renderProps(state.selectedNodes.length === 1 ? state.selectedNodes[0] : null);
      }

      state.lasso = null;
      lassoRect.style.display = 'none';
    }

    if (state.connectMode && (e.target === canvasWrap || e.target.classList.contains('grid-overlay'))) {
      cancelConnect();
    }
  });

  let lastTouchDist = null;

  canvasWrap.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      if (t.target === canvasWrap || t.target.classList.contains('grid-overlay') || t.target === canvas || t.target === viewport) {
        state.panning = true;
        state.panStartX = t.clientX - state.panX;
        state.panStartY = t.clientY - state.panY;
        deselectAll();
      }
    } else if (e.touches.length === 2) {
      state.panning = false;
      state.dragging = null;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist = Math.hypot(dx, dy);
    }
  }, { passive: true });

  canvasWrap.addEventListener('touchmove', e => {
    e.preventDefault();
    if (e.touches.length === 1) {
      const t = e.touches[0];
      if (state.panning) {
        state.panX = t.clientX - state.panStartX;
        state.panY = t.clientY - state.panStartY;
        applyViewport();
      } else if (state.dragging) {
        const pt = screenToCanvas(t.clientX, t.clientY);
        state.dragging.x = pt.x - state.dragOffX;
        state.dragging.y = pt.y - state.dragOffY;
        const el = document.getElementById(state.dragging.id);
        if (el) { el.style.left = state.dragging.x + 'px'; el.style.top = state.dragging.y + 'px'; }
        rebuildEdges();
      }
    } else if (e.touches.length === 2 && lastTouchDist !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const delta = dist / lastTouchDist;
      lastTouchDist = dist;
      const mid = { x: (e.touches[0].clientX + e.touches[1].clientX) / 2, y: (e.touches[0].clientY + e.touches[1].clientY) / 2 };
      const rect = canvasWrap.getBoundingClientRect();
      const mx = mid.x - rect.left;
      const my = mid.y - rect.top;
      const newZoom = Math.min(3, Math.max(0.2, state.zoom * delta));
      state.panX = mx - (mx - state.panX) * (newZoom / state.zoom);
      state.panY = my - (my - state.panY) * (newZoom / state.zoom);
      state.zoom = newZoom;
      applyViewport();
    }
  }, { passive: false });

  canvasWrap.addEventListener('touchend', e => {
    if (e.touches.length === 0) {
      state.panning = false;
      state.dragging = null;
      lastTouchDist = null;
    } else if (e.touches.length === 1) {
      lastTouchDist = null;
    }
  }, { passive: true });

  canvasWrap.addEventListener('wheel', e => {
    e.preventDefault();
    const rect = canvasWrap.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(3, Math.max(0.2, state.zoom * delta));
    state.panX = mouseX - (mouseX - state.panX) * (newZoom / state.zoom);
    state.panY = mouseY - (mouseY - state.panY) * (newZoom / state.zoom);
    state.zoom = newZoom;
    applyViewport();
  }, { passive: false });

  let spaceDown = false;
  window.addEventListener('keydown', e => {
    if (e.target.matches('input,textarea')) return;

    if (e.code === 'Space') {
      e.preventDefault();
      spaceDown = true;
      canvasWrap.style.cursor = 'grab';
      return;
    }

    // Supprimer
    if (e.code === 'Delete' || e.code === 'Backspace') {
      e.preventDefault();
      if (state.selectedNodes.length > 0) {
        // Copie car deleteNode modifie state.nodes
        [...state.selectedNodes].forEach(n => deleteNode(n));
        state.selectedNodes = [];
      } else if (state.selectedEdge) {
        const idx = state.edges.indexOf(state.selectedEdge);
        if (idx !== -1) state.edges.splice(idx, 1);
        state.selectedEdge = null;
        rebuildEdges();
        updateStats();
        import('./node-manager.js').then(m => m.renderProps(null));
      }
      return;
    }

    // Dupliquer
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyD') {
      e.preventDefault();
      const toDuplicate = state.selectedNodes.length > 0
        ? state.selectedNodes
        : state.selectedNode ? [state.selectedNode] : [];
      if (toDuplicate.length === 0) return;

      const newNodes = toDuplicate.map(n => {
        const newNode = { ...n, id: 'n' + (++state.idCounter), x: n.x + 24, y: n.y + 24 };
        state.nodes.push(newNode);
        renderNode(newNode);
        return newNode;
      });

      state.selectedNodes = newNodes;
      state.selectedNode = newNodes[newNodes.length - 1];
      document.querySelectorAll('.node').forEach(el => el.classList.remove('selected'));
      newNodes.forEach(n => {
        const el = document.getElementById(n.id);
        if (el) el.classList.add('selected');
      });
      updateStats();
      return;
    }

    // Escape
    if (e.code === 'Escape') {
      deselectAll();
      cancelConnect();
    }
  });

  window.addEventListener('keyup', e => {
    if (e.code === 'Space') {
      spaceDown = false;
      if (!state.panning) canvasWrap.style.cursor = '';
    }
  });

  canvasWrap.addEventListener('mousedown', e => {
    if (e.button === 1 || (e.button === 0 && spaceDown)) {
      e.preventDefault();
      state.panning = true;
      state.panStartX = e.clientX - state.panX;
      state.panStartY = e.clientY - state.panY;
      canvasWrap.style.cursor = 'grabbing';
      return;
    }
    if (e.target === canvasWrap || e.target.classList.contains('grid-overlay') || e.target === canvas || e.target === viewport) {
      if (!e.shiftKey) deselectAll();
      hideCtxMenu();
      // Démarrer le lasso
      const rect = canvasWrap.getBoundingClientRect();
      state.lasso = { x1: e.clientX - rect.left, y1: e.clientY - rect.top, x2: e.clientX - rect.left, y2: e.clientY - rect.top };
    }
  });
}

function showCtxMenu(x, y) {
  const menu = document.getElementById('ctxMenu');
  menu.style.display = 'block';
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
}

function hideCtxMenu() {
  document.getElementById('ctxMenu').style.display = 'none';
}

export function openEditModal(node) {
  state.editTarget = node;
  document.getElementById('editLabel').value = node.label;
  document.getElementById('editSub').value = node.sub || '';
  document.getElementById('editIcon').value = node.icon;

  document.querySelectorAll('#nodeColorPicker .color-dot').forEach(d => {
    d.classList.toggle('selected', d.dataset.color === node.color);
  });

  document.getElementById('editModal').style.display = 'flex';
}

export function setupEditModal() {
  document.getElementById('editSave').addEventListener('click', () => {
    const node = state.editTarget;
    if (!node) return;
    node.label = document.getElementById('editLabel').value;
    node.sub = document.getElementById('editSub').value;
    node.icon = document.getElementById('editIcon').value;
    renderNode(node);
    renderProps(node);
    rebuildEdges();
    document.getElementById('editModal').style.display = 'none';
  });

  document.getElementById('editCancel').addEventListener('click', () => {
    document.getElementById('editModal').style.display = 'none';
  });

  document.querySelectorAll('#nodeColorPicker .color-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      document.querySelectorAll('#nodeColorPicker .color-dot').forEach(d => d.classList.remove('selected'));
      dot.classList.add('selected');
      state.nodeColor = dot.dataset.color;
      if (state.editTarget) {
        state.editTarget.color = dot.dataset.color;
        renderNode(state.editTarget);
        rebuildEdges();
      }
    });
  });
}
