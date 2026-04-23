import { state, canvas, screenToCanvas, deselectAllBase } from './state.js';
import { translate } from './i18n.js';

const wireSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
const wireLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');

wireSvg.id = 'wire-preview';
wireSvg.style.display = 'none';
wireSvg.appendChild(wireLine);
document.getElementById('viewport').appendChild(wireSvg);

let wireActive = false;

export function startWireDrag(node) {
  wireActive = true;

  const srcEl = document.getElementById(node.id);
  const sx = node.x + srcEl.offsetWidth / 2;
  const sy = node.y + srcEl.offsetHeight / 2;

  wireSvg.style.display = 'block';
  wireLine.setAttribute('x1', sx);
  wireLine.setAttribute('y1', sy);
  wireLine.setAttribute('x2', sx);
  wireLine.setAttribute('y2', sy);

  document.getElementById(node.id).classList.add('connecting-source');

  const finishWire = targetEl => {
    wireSvg.style.display = 'none';
    document.querySelectorAll('.node.wire-target').forEach(el => el.classList.remove('wire-target'));
    document.getElementById(node.id).classList.remove('connecting-source');
    wireActive = false;

    const target = targetEl ? targetEl.closest('.node') : null;
    if (target && target.id !== node.id) {
      const targetNode = state.nodes.find(n => n.id === target.id);
      if (targetNode) {
        const exists = state.edges.find(e => e.from === node.id && e.to === targetNode.id);
        if (!exists) {
          state.edges.push({ from: node.id, to: targetNode.id });
          rebuildEdges();
          updateStats();
        }
      }
    }
  };

  const onMove = mv => {
    if (!wireActive) return;
    const pt = screenToCanvas(mv.clientX, mv.clientY);
    wireLine.setAttribute('x2', pt.x);
    wireLine.setAttribute('y2', pt.y);

    document.querySelectorAll('.node.wire-target').forEach(el => el.classList.remove('wire-target'));
    const el = mv.target.closest('.node');
    if (el && el.id !== node.id) el.classList.add('wire-target');
  };

  const onUp = mu => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    finishWire(mu.target);
  };

  const onTouchMove = mv => {
    if (!wireActive) return;
    mv.preventDefault();
    const t = mv.touches[0];
    const pt = screenToCanvas(t.clientX, t.clientY);
    wireLine.setAttribute('x2', pt.x);
    wireLine.setAttribute('y2', pt.y);

    document.querySelectorAll('.node.wire-target').forEach(el => el.classList.remove('wire-target'));
    const el = document.elementFromPoint(t.clientX, t.clientY);
    const nodeEl = el ? el.closest('.node') : null;
    if (nodeEl && nodeEl.id !== node.id) nodeEl.classList.add('wire-target');
  };

  const onTouchEnd = mu => {
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);
    const t = mu.changedTouches[0];
    const el = document.elementFromPoint(t.clientX, t.clientY);
    finishWire(el);
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('touchend', onTouchEnd);
}

export function startConnect(node) {
  state.connectMode = true;
  state.connectSource = node;
  document.getElementById('btnConnect').classList.add('active');
  document.getElementById('statMode').textContent = translate('connecting');
  document.getElementById(node.id).classList.add('connecting-source');
}

export function finishConnect(targetNode) {
  if (!state.connectSource || state.connectSource.id === targetNode.id) {
    cancelConnect();
    return;
  }
  const exists = state.edges.find(e => e.from === state.connectSource.id && e.to === targetNode.id);
  if (!exists) {
    state.edges.push({ from: state.connectSource.id, to: targetNode.id });
    rebuildEdges();
    updateStats();
  }
  cancelConnect();
}

export function cancelConnect() {
  if (state.connectSource) {
    const el = document.getElementById(state.connectSource.id);
    if (el) el.classList.remove('connecting-source');
  }
  state.connectMode = false;
  state.connectSource = null;
  document.getElementById('btnConnect').classList.remove('active');
  document.getElementById('statMode').textContent = translate('selection');
}

export function getNodeCenter(node) {
  const el = document.getElementById(node.id);
  if (!el) return { x: node.x, y: node.y };
  return {
    x: node.x + el.offsetWidth / 2,
    y: node.y + el.offsetHeight / 2,
  };
}

export function buildPath(from, to, edge = null) {
  // Si l'edge a des waypoints, toujours utiliser freehand (Catmull-Rom)
  if (edge && edge.waypoints && edge.waypoints.length > 0) {
    return catmullRomPath([from, ...edge.waypoints, to]);
  }
  const style = edge ? (edge.pathStyle || state.edgeStyle) : state.edgeStyle;
  if (style === 'straight') {
    return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  }
  if (style === 'step') {
    const mx = (from.x + to.x) / 2;
    return `M ${from.x} ${from.y} L ${mx} ${from.y} L ${mx} ${to.y} L ${to.x} ${to.y}`;
  }
  if (style === 'smooth') {
    const dx = (to.x - from.x) * 0.4;
    return `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`;
  }
  if (style === 'freehand') {
    const wps = (edge && edge.waypoints && edge.waypoints.length > 0) ? edge.waypoints : [];
    const pts = [from, ...wps, to];
    return catmullRomPath(pts);
  }
  const cx1 = from.x + (to.x - from.x) * 0.5;
  const cy1 = from.y;
  const cx2 = from.x + (to.x - from.x) * 0.5;
  const cy2 = to.y;
  return `M ${from.x} ${from.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${to.x} ${to.y}`;
}

function catmullRomPath(pts, tension = 0.5) {
  if (pts.length < 2) return '';
  if (pts.length === 2) {
    return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
  }
  // Duplicate endpoints for Catmull-Rom
  const p = [pts[0], ...pts, pts[pts.length - 1]];
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < p.length - 2; i++) {
    const p0 = p[i - 1], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2];
    const cp1x = p1.x + (p2.x - p0.x) * tension / 3;
    const cp1y = p1.y + (p2.y - p0.y) * tension / 3;
    const cp2x = p2.x - (p3.x - p1.x) * tension / 3;
    const cp2y = p2.y - (p3.y - p1.y) * tension / 3;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export function rebuildEdges() {
  canvas.querySelectorAll('.edge-group').forEach(e => e.remove());
  canvas.querySelectorAll('defs [id^="marker-"]').forEach(m => m.remove());
  state.dotAnimations = [];

  let edgeMoveStyle = document.getElementById('edgeMoveStyle');
  if (edgeMoveStyle) edgeMoveStyle.remove();
  edgeMoveStyle = document.createElement('style');
  edgeMoveStyle.id = 'edgeMoveStyle';
  const durationDashed = (1.5 / state.speed).toFixed(2);
  const durationDotted = (1.0 / state.speed).toFixed(2);
  edgeMoveStyle.textContent = `
    @keyframes edgeMoveDashed { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -13; } }
    @keyframes edgeMoveDotted { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -8; } }
    .edge-moving-dashed { animation: edgeMoveDashed ${durationDashed}s linear infinite; }
    .edge-moving-dotted { animation: edgeMoveDotted ${durationDotted}s linear infinite; }
  `;
  document.head.appendChild(edgeMoveStyle);

  let defs = canvas.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    canvas.appendChild(defs);
  }

  if (!defs.querySelector('#glow')) {
    defs.innerHTML += `
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    `;
  }

  state.edges.forEach((edge, i) => {
    const fromNode = state.nodes.find(n => n.id === edge.from);
    const toNode = state.nodes.find(n => n.id === edge.to);
    if (!fromNode || !toNode) return;

    const from = getNodeCenter(fromNode);
    const to = getNodeCenter(toNode);
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.classList.add('edge-group');
    g.dataset.edgeIndex = i;

    const d = buildPath(from, to, edge);

    const bgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    bgPath.setAttribute('d', d);
    bgPath.setAttribute('fill', 'none');
    bgPath.setAttribute('stroke', 'rgba(255,255,255,0.06)');
    bgPath.setAttribute('stroke-width', '2');
    g.appendChild(bgPath);

    const edgeColor = edge.color || state.dotColor;
    const edgeOpacity = state.animGlow ? '0.3' : '0.5';
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', state.animGlow ? edgeColor : 'rgba(255,255,255,0.15)');
    path.setAttribute('stroke-width', '1.5');
    path.setAttribute('opacity', state.animGlow ? '0.3' : '0.5');
    if (state.animGlow) path.setAttribute('filter', 'url(#glow)');

    if (edge.dash === 'dashed') path.setAttribute('stroke-dasharray', '8 5');
    else if (edge.dash === 'dotted') path.setAttribute('stroke-dasharray', '2 6');

    if (state.animEdgeMove && edge.dash === 'dashed') path.classList.add('edge-moving-dashed');
    else if (state.animEdgeMove && edge.dash === 'dotted') path.classList.add('edge-moving-dotted');

    const arrowType = edge.arrow || 'none';
    const markerId = 'marker-' + i;
    if (arrowType !== 'none') {
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
      marker.setAttribute('id', markerId);
      marker.setAttribute('orient', 'auto');
      marker.setAttribute('markerUnits', 'userSpaceOnUse');
      marker.setAttribute('overflow', 'visible');

      if (arrowType === 'triangle') {
        marker.setAttribute('markerWidth', '16'); marker.setAttribute('markerHeight', '12');
        marker.setAttribute('refX', '16'); marker.setAttribute('refY', '6');
        const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        p.setAttribute('d', 'M0,0 L0,12 L16,6 z');
        p.setAttribute('fill', edgeColor);
        p.setAttribute('opacity', edgeOpacity);
        marker.appendChild(p);
      } else if (arrowType === 'open') {
        marker.setAttribute('markerWidth', '14'); marker.setAttribute('markerHeight', '12');
        marker.setAttribute('refX', '14'); marker.setAttribute('refY', '6');
        const p = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        p.setAttribute('points', '0,0 14,6 0,12');
        p.setAttribute('fill', 'none');
        p.setAttribute('stroke', edgeColor);
        p.setAttribute('stroke-width', '2');
        p.setAttribute('opacity', edgeOpacity);
        marker.appendChild(p);
      } else if (arrowType === 'circle') {
        marker.setAttribute('markerWidth', '12'); marker.setAttribute('markerHeight', '12');
        marker.setAttribute('refX', '12'); marker.setAttribute('refY', '6');
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('cx', '6'); c.setAttribute('cy', '6'); c.setAttribute('r', '5');
        c.setAttribute('fill', edgeColor);
        c.setAttribute('opacity', edgeOpacity);
        marker.appendChild(c);
      }

      defs.appendChild(marker);
    }

    g.appendChild(path);

    const hitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hitPath.setAttribute('d', d);
    hitPath.setAttribute('fill', 'none');
    hitPath.setAttribute('stroke', 'transparent');
    hitPath.setAttribute('stroke-width', '12');
    hitPath.style.cursor = 'pointer';
    g.appendChild(hitPath);

    g.addEventListener('click', e => {
      e.stopPropagation();
      selectEdge(edge, g);
    });

    g.addEventListener('dblclick', e => {
      e.stopPropagation();
      const pt = screenToCanvas(e.clientX, e.clientY);
      if (!edge.waypoints) edge.waypoints = [];
      insertWaypoint(edge, pt, from, to);
      if (!edge.pathStyle) edge.pathStyle = state.edgeStyle || 'curve';
      rebuildEdges();
      const idx = state.edges.indexOf(edge);
      const grp = canvas.querySelector(`.edge-group[data-edge-index="${idx}"]`);
      if (grp) { grp.classList.add('selected'); state.selectedEdge = edge; }
      renderEdgeProps(edge);
    });

    g.addEventListener('contextmenu', e => {
      e.preventDefault();
      state.edges.splice(i, 1);
      rebuildEdges();
      updateStats();
    });

    canvas.appendChild(g);

    // Waypoint handles — toujours visibles si l'edge a des waypoints
    if (edge.waypoints && edge.waypoints.length > 0) {
      edge.waypoints.forEach((wp, wpIdx) => {
        const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        handle.setAttribute('cx', wp.x);
        handle.setAttribute('cy', wp.y);
        handle.setAttribute('r', '7');
        handle.setAttribute('fill', edgeColor);
        handle.setAttribute('opacity', '0.85');
        handle.setAttribute('stroke', '#fff');
        handle.setAttribute('stroke-width', '1.5');
        handle.style.cursor = 'grab';
        g.appendChild(handle);

        handle.addEventListener('dblclick', e => {
          e.stopPropagation();
          edge.waypoints.splice(wpIdx, 1);
          if (edge.waypoints.length === 0) delete edge.pathStyle;
          rebuildEdges();
          const idx = state.edges.indexOf(edge);
          const grp = canvas.querySelector(`.edge-group[data-edge-index="${idx}"]`);
          if (grp) { grp.classList.add('selected'); state.selectedEdge = edge; }
          renderEdgeProps(edge);
        });

        handle.addEventListener('mousedown', e => {
          e.stopPropagation();
          setupWaypointDrag(e, edge, wpIdx);
        });
      });
    }

    if (arrowType !== 'none') {
      const toEl = document.getElementById(toNode.id);
      if (toEl && path.getTotalLength) {
        const totalLen = path.getTotalLength();
        if (totalLen > 0) {
          const hw = toEl.offsetWidth / 2;
          const hh = toEl.offsetHeight / 2;
          let cutLen = totalLen;
          for (let l = totalLen; l > 0; l -= 2) {
            const pt = path.getPointAtLength(l);
            if (Math.abs(pt.x - to.x) > hw + 4 || Math.abs(pt.y - to.y) > hh + 4) {
              cutLen = l;
              break;
            }
          }
          const steps = Math.max(20, Math.floor(cutLen / 5));
          let newD = '';
          for (let s = 0; s <= steps; s++) {
            const pt = path.getPointAtLength((s / steps) * cutLen);
            newD += (s === 0 ? 'M' : ' L') + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1);
          }
          const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          arrowPath.setAttribute('d', newD);
          arrowPath.setAttribute('fill', 'none');
          arrowPath.setAttribute('stroke', 'none');
          arrowPath.setAttribute('stroke-width', '1.5');
          arrowPath.setAttribute('marker-end', `url(#${markerId})`);
          g.appendChild(arrowPath);
        }
      }
    }

    if (state.animDots && edge.animDots !== false) {
      const numDots = 2 + Math.floor(Math.random() * 2);
      for (let d = 0; d < numDots; d++) {
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('r', '4');
        dot.setAttribute('fill', edgeColor);
        dot.setAttribute('filter', 'url(#glow)');
        dot.setAttribute('opacity', '0.9');
        g.appendChild(dot);

        const totalLen = path.getTotalLength ? path.getTotalLength() : 100;
        state.dotAnimations.push({
          dot,
          path,
          progress: (d / numDots) * totalLen,
          totalLen,
          speed: (state.speed * 0.8 + Math.random() * state.speed * 0.4),
          dir: state.animRandom && Math.random() > 0.5 ? -1 : 1,
        });
      }
    }
  });

  startAnimation();
}

function insertWaypoint(edge, pt, from, to) {
  if (!edge.waypoints) edge.waypoints = [];
  if (edge.waypoints.length === 0) {
    edge.waypoints.push({ x: pt.x, y: pt.y });
    return;
  }
  // Trouver le segment le plus proche pour insérer au bon endroit
  const pts = [from, ...edge.waypoints, to];
  let bestIdx = 1;
  let bestDist = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const dist = distToSegment(pt, pts[i], pts[i + 1]);
    if (dist < bestDist) { bestDist = dist; bestIdx = i + 1; }
  }
  edge.waypoints.splice(bestIdx - 1, 0, { x: pt.x, y: pt.y });
}

function distToSegment(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function setupWaypointDrag(e, edge, wpIdx) {
  e.preventDefault();
  const onMove = mv => {
    const pt = screenToCanvas(mv.clientX, mv.clientY);
    edge.waypoints[wpIdx] = { x: pt.x, y: pt.y };
    rebuildEdges();
    const idx = state.edges.indexOf(edge);
    const grp = canvas.querySelector(`.edge-group[data-edge-index="${idx}"]`);
    if (grp) { grp.classList.add('selected'); state.selectedEdge = edge; }
  };
  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function startAnimation() {
  if (state.rafId) cancelAnimationFrame(state.rafId);
  if (!state.animDots || state.dotAnimations.length === 0) return;

  function tick() {
    state.dotAnimations.forEach(anim => {
      anim.progress += anim.speed * anim.dir;
      if (anim.progress > anim.totalLen) anim.progress = 0;
      if (anim.progress < 0) anim.progress = anim.totalLen;
      try {
        const pt = anim.path.getPointAtLength(anim.progress);
        anim.dot.setAttribute('cx', pt.x);
        anim.dot.setAttribute('cy', pt.y);
      } catch (e) {}
    });
    state.rafId = requestAnimationFrame(tick);
  }

  state.rafId = requestAnimationFrame(tick);
}

export function selectEdge(edge, groupEl) {
  deselectAllBase();
  state.selectedEdge = edge;
  groupEl.classList.add('selected');
  renderEdgeProps(edge);
}

export function renderEdgeProps(edge) {
  const div = document.getElementById('propContent');
  const colors = ['#00f5a0','#00d4ff','#ff6b6b','#ffd93d','#c77dff','#ffffff','#aaaaaa'];
  const colorDots = colors.map(c => `
    <div class="ncd ${(edge.color||'#00f5a0')===c?'selected':''}"
         style="background:${c}" data-color="${c}"></div>
  `).join('');

  const dotsOn = edge.animDots !== false;

  const wpCount = (edge.waypoints || []).length;

  div.innerHTML = `
    <div class="prop-section-title">Lien : ${edge.from} → ${edge.to}</div>

    ${wpCount > 0 ? `<div style="font-size:10px;font-family:'Space Mono',monospace;color:var(--muted);margin-bottom:8px;line-height:1.5">
      <span style="color:var(--accent)">${wpCount} point${wpCount > 1 ? 's'  : ''}</span> · Double-clic pour supprimer
    </div>` : `<div style="font-size:10px;font-family:'Space Mono',monospace;color:var(--muted);margin-bottom:8px">
      Double-clic sur le lien pour courber
    </div>`}

    <div class="prop-section-title">Couleur</div>
    <div class="node-color-dots" id="eDotColor">${colorDots}</div>

    <div class="prop-section-title">Animation</div>
    <div class="toggle-row">
      <span style="font-size:11px;font-family:'Space Mono',monospace">Dots animés</span>
      <div class="toggle ${dotsOn ? 'on' : ''}" id="eToggleDots"></div>
    </div>

    <div class="prop-section-title">Trait</div>
    <div class="shape-picker" id="eDashPicker">
      <div class="shape-opt ${(edge.dash||'solid')==='solid'?'active':''}" data-dash="solid">
        <svg width="32" height="10"><line x1="2" y1="5" x2="30" y2="5" stroke="currentColor" stroke-width="2"/></svg>
        <span>Solid</span>
      </div>
      <div class="shape-opt ${(edge.dash||'solid')==='dashed'?'active':''}" data-dash="dashed">
        <svg width="32" height="10"><line x1="2" y1="5" x2="30" y2="5" stroke="currentColor" stroke-width="2" stroke-dasharray="6 3"/></svg>
        <span>Dashed</span>
      </div>
      <div class="shape-opt ${(edge.dash||'solid')==='dotted'?'active':''}" data-dash="dotted">
        <svg width="32" height="10"><line x1="2" y1="5" x2="30" y2="5" stroke="currentColor" stroke-width="2" stroke-dasharray="2 6"/></svg>
        <span>Dotted</span>
      </div>
    </div>

    <div class="prop-section-title">Flèche</div>
    <div class="shape-picker" id="eArrowPicker">
      <div class="shape-opt ${(edge.arrow||'none')==='none'?'active':''}" data-arrow="none">
        <svg width="32" height="14"><line x1="2" y1="7" x2="30" y2="7" stroke="currentColor" stroke-width="2"/></svg>
        <span>Aucune</span>
      </div>
      <div class="shape-opt ${(edge.arrow||'none')==='triangle'?'active':''}" data-arrow="triangle">
        <svg width="32" height="14"><line x1="2" y1="7" x2="22" y2="7" stroke="currentColor" stroke-width="2"/><polygon points="22,3 30,7 22,11" fill="currentColor"/></svg>
        <span>Triangle</span>
      </div>
      <div class="shape-opt ${(edge.arrow||'none')==='open'?'active':''}" data-arrow="open">
        <svg width="32" height="14"><line x1="2" y1="7" x2="24" y2="7" stroke="currentColor" stroke-width="2"/><polyline points="22,3 30,7 22,11" fill="none" stroke="currentColor" stroke-width="2"/></svg>
        <span>Open</span>
      </div>
      <div class="shape-opt ${(edge.arrow||'none')==='circle'?'active':''}" data-arrow="circle">
        <svg width="32" height="14"><line x1="2" y1="7" x2="22" y2="7" stroke="currentColor" stroke-width="2"/><circle cx="27" cy="7" r="4" fill="currentColor"/></svg>
        <span>Cercle</span>
      </div>
    </div>

    <div style="margin-top:10px">
      <button class="btn primary" id="eSave" style="width:100%">Appliquer</button>
    </div>
    <div style="margin-top:6px">
      <button class="btn danger" id="eDelete" style="width:100%">Supprimer</button>
    </div>
  `;

  let selColor = edge.color || '#00f5a0';
  let selDash = edge.dash || 'solid';
  let selArrow = edge.arrow || 'none';
  let selAnimDots = edge.animDots !== false;

  document.getElementById('eToggleDots').addEventListener('click', () => {
    selAnimDots = !selAnimDots;
    document.getElementById('eToggleDots').classList.toggle('on', selAnimDots);
  });

  div.querySelectorAll('#eDotColor .ncd').forEach(dot => {
    dot.addEventListener('click', () => {
      selColor = dot.dataset.color;
      div.querySelectorAll('#eDotColor .ncd').forEach(d => d.classList.toggle('selected', d.dataset.color === selColor));
    });
  });

  div.querySelectorAll('#eDashPicker .shape-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      selDash = opt.dataset.dash;
      div.querySelectorAll('#eDashPicker .shape-opt').forEach(o => o.classList.toggle('active', o.dataset.dash === selDash));
    });
  });

  div.querySelectorAll('#eArrowPicker .shape-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      selArrow = opt.dataset.arrow;
      div.querySelectorAll('#eArrowPicker .shape-opt').forEach(o => o.classList.toggle('active', o.dataset.arrow === selArrow));
    });
  });

  document.getElementById('eSave').addEventListener('click', () => {
    edge.color = selColor;
    edge.dash = selDash;
    edge.arrow = selArrow;
    edge.animDots = selAnimDots;
    rebuildEdges();
    const idx = state.edges.indexOf(edge);
    const grp = canvas.querySelector(`.edge-group[data-edge-index="${idx}"]`);
    if (grp) grp.classList.add('selected');
    renderEdgeProps(edge);
  });

  document.getElementById('eDelete').addEventListener('click', () => {
    const idx = state.edges.indexOf(edge);
    if (idx !== -1) state.edges.splice(idx, 1);
    rebuildEdges();
    updateStats();
    state.selectedEdge = null;
    state.selectedNode = null;
    document.querySelectorAll('.node').forEach(el => el.classList.remove('selected'));
    document.querySelectorAll('.edge-group.selected').forEach(el => el.classList.remove('selected'));
  });
}

export function updateStats() {
  document.getElementById('statNodes').textContent = state.nodes.length;
  document.getElementById('statEdges').textContent = state.edges.length;
}

export function deleteNode(node) {
  state.edges = state.edges.filter(e => e.from !== node.id && e.to !== node.id);
  state.nodes = state.nodes.filter(n => n.id !== node.id);
  const el = document.getElementById(node.id);
  if (el) el.remove();
  state.selectedEdge = null;
  state.selectedNode = null;
  document.querySelectorAll('.node').forEach(el => el.classList.remove('selected'));
  document.querySelectorAll('.edge-group.selected').forEach(el => el.classList.remove('selected'));
  rebuildEdges();
  updateStats();
}
