import { state, canvasWrap } from './state.js';

function catmullRomPath2D(pts, tension = 0.5) {
  const p = new Path2D();
  if (pts.length < 2) return p;
  if (pts.length === 2) {
    p.moveTo(pts[0].x, pts[0].y);
    p.lineTo(pts[1].x, pts[1].y);
    return p;
  }
  const ext = [pts[0], ...pts, pts[pts.length - 1]];
  p.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < ext.length - 2; i++) {
    const p0 = ext[i - 1], p1 = ext[i], p2 = ext[i + 1], p3 = ext[i + 2];
    const cp1x = p1.x + (p2.x - p0.x) * tension / 3;
    const cp1y = p1.y + (p2.y - p0.y) * tension / 3;
    const cp2x = p2.x - (p3.x - p1.x) * tension / 3;
    const cp2y = p2.y - (p3.y - p1.y) * tension / 3;
    p.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }
  return p;
}

function buildPath2D(from, to, edge = null) {
  const p = new Path2D();
  if (edge && edge.waypoints && edge.waypoints.length > 0) {
    return catmullRomPath2D([from, ...edge.waypoints, to]);
  }
  const style = edge ? (edge.pathStyle || state.edgeStyle) : state.edgeStyle;
  if (style === 'straight') {
    p.moveTo(from.x, from.y);
    p.lineTo(to.x, to.y);
  } else if (style === 'step') {
    const mx = (from.x + to.x) / 2;
    p.moveTo(from.x, from.y);
    p.lineTo(mx, from.y);
    p.lineTo(mx, to.y);
    p.lineTo(to.x, to.y);
  } else if (style === 'smooth') {
    const dx = (to.x - from.x) * 0.4;
    p.moveTo(from.x, from.y);
    p.bezierCurveTo(from.x + dx, from.y, to.x - dx, to.y, to.x, to.y);
  } else if (style === 'freehand') {
    const wps = (edge && edge.waypoints && edge.waypoints.length > 0) ? edge.waypoints : [];
    return catmullRomPath2D([from, ...wps, to]);
  } else {
    const cx1 = from.x + (to.x - from.x) * 0.5;
    const cy1 = from.y;
    const cx2 = cx1;
    const cy2 = to.y;
    p.moveTo(from.x, from.y);
    p.bezierCurveTo(cx1, cy1, cx2, cy2, to.x, to.y);
  }
  return p;
}

function bezierPoint(from, to, t, style, edge = null) {
  if (edge && edge.waypoints && edge.waypoints.length > 0) {
    return catmullRomPoint([from, ...edge.waypoints, to], t);
  }
  const resolvedStyle = edge ? (edge.pathStyle || style) : style;

  let cx1, cy1, cx2, cy2;
  if (resolvedStyle === 'straight') {
    return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
  }
  if (resolvedStyle === 'step') {
    const mx = (from.x + to.x) / 2;
    const totalLen = Math.abs(mx - from.x) + Math.abs(to.y - from.y) + Math.abs(to.x - mx);
    const d = t * totalLen;
    const s1 = Math.abs(mx - from.x);
    const s2 = s1 + Math.abs(to.y - from.y);
    if (d <= s1) return { x: from.x + (mx - from.x) * (d / s1), y: from.y };
    if (d <= s2) return { x: mx, y: from.y + (to.y - from.y) * ((d - s1) / Math.abs(to.y - from.y)) };
    return { x: mx + (to.x - mx) * ((d - s2) / Math.abs(to.x - mx)), y: to.y };
  }
  if (resolvedStyle === 'smooth') {
    const dx = (to.x - from.x) * 0.4;
    cx1 = from.x + dx; cy1 = from.y; cx2 = to.x - dx; cy2 = to.y;
  } else {
    cx1 = from.x + (to.x - from.x) * 0.5; cy1 = from.y;
    cx2 = cx1; cy2 = to.y;
  }
  const mt = 1 - t;
  return {
    x: mt*mt*mt*from.x + 3*mt*mt*t*cx1 + 3*mt*t*t*cx2 + t*t*t*to.x,
    y: mt*mt*mt*from.y + 3*mt*mt*t*cy1 + 3*mt*t*t*cy2 + t*t*t*to.y,
  };
}

// Évalue la position t (0-1) sur une spline Catmull-Rom par longueur approx
function catmullRomPoint(pts, t, tension = 0.5) {
  if (pts.length < 2) return pts[0] || { x: 0, y: 0 };
  if (pts.length === 2) {
    return { x: pts[0].x + (pts[1].x - pts[0].x) * t, y: pts[0].y + (pts[1].y - pts[0].y) * t };
  }
  const ext = [pts[0], ...pts, pts[pts.length - 1]];
  const segments = pts.length - 1;
  const seg = Math.min(Math.floor(t * segments), segments - 1);
  const lt = (t * segments) - seg;
  const p0 = ext[seg], p1 = ext[seg + 1], p2 = ext[seg + 2], p3 = ext[seg + 3];
  const cp1x = p1.x + (p2.x - p0.x) * tension / 3;
  const cp1y = p1.y + (p2.y - p0.y) * tension / 3;
  const cp2x = p2.x - (p3.x - p1.x) * tension / 3;
  const cp2y = p2.y - (p3.y - p1.y) * tension / 3;
  const mt = 1 - lt;
  return {
    x: mt*mt*mt*p1.x + 3*mt*mt*lt*cp1x + 3*mt*lt*lt*cp2x + lt*lt*lt*p2.x,
    y: mt*mt*mt*p1.y + 3*mt*mt*lt*cp1y + 3*mt*lt*lt*cp2y + lt*lt*lt*p2.y,
  };
}

function drawNodeIcon(ctx, type, cx, cy, s, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = 0.85;

  switch (type) {
    case 'process':
      ctx.strokeRect(cx - s, cy - s * 0.65, s * 2, s * 1.3);
      break;
    case 'decision':
      ctx.beginPath();
      ctx.moveTo(cx, cy - s);
      ctx.lineTo(cx + s * 1.2, cy);
      ctx.lineTo(cx, cy + s);
      ctx.lineTo(cx - s * 1.2, cy);
      ctx.closePath();
      ctx.stroke();
      break;
    case 'cloud':
      ctx.beginPath();
      ctx.arc(cx - s * 0.5, cy + s * 0.1, s * 0.55, Math.PI * 0.5, Math.PI * 1.5);
      ctx.arc(cx - s * 0.1, cy - s * 0.4, s * 0.45, Math.PI, 0);
      ctx.arc(cx + s * 0.5, cy + s * 0.1, s * 0.55, Math.PI * 1.5, Math.PI * 0.5);
      ctx.lineTo(cx - s * 0.5, cy + s * 0.65);
      ctx.stroke();
      break;
    case 'database':
      ctx.beginPath();
      ctx.ellipse(cx, cy - s * 0.5, s, s * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - s, cy - s * 0.5);
      ctx.lineTo(cx - s, cy + s * 0.5);
      ctx.arc(cx, cy + s * 0.5, s, Math.PI, 0);
      ctx.lineTo(cx + s, cy - s * 0.5);
      ctx.stroke();
      break;
    case 'api':
      ctx.beginPath();
      ctx.moveTo(cx + s * 0.3, cy - s);
      ctx.lineTo(cx - s * 0.3, cy);
      ctx.lineTo(cx + s * 0.1, cy);
      ctx.lineTo(cx - s * 0.3, cy + s);
      ctx.stroke();
      break;
    case 'user':
      ctx.beginPath();
      ctx.arc(cx, cy - s * 0.35, s * 0.42, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy + s * 1.1, s * 0.85, Math.PI, 0);
      ctx.stroke();
      break;
    case 'server':
      for (let i = 0; i < 3; i++) {
        const ry = cy - s * 0.7 + i * (s * 0.55);
        ctx.strokeRect(cx - s, ry, s * 2, s * 0.4);
        ctx.beginPath();
        ctx.arc(cx + s * 0.7, ry + s * 0.2, s * 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'mobile':
      ctx.beginPath();
      ctx.roundRect(cx - s * 0.55, cy - s, s * 1.1, s * 2, s * 0.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy + s * 0.65, s * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeRect(cx - s * 0.35, cy - s * 0.65, s * 0.7, s * 0.9);
      break;
    default:
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        i === 0 ? ctx.moveTo(cx + s * Math.cos(a), cy + s * Math.sin(a))
                : ctx.lineTo(cx + s * Math.cos(a), cy + s * Math.sin(a));
      }
      ctx.closePath();
      ctx.stroke();
  }
  ctx.restore();
}

function getNodesBoundingBox(margin) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  state.nodes.forEach(node => {
    const el = document.getElementById(node.id);
    if (!el) return;
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + el.offsetWidth);
    maxY = Math.max(maxY, node.y + el.offsetHeight);
  });
  // Inclure les waypoints des liens main libre dans le bounding box
  state.edges.forEach(edge => {
    if (!edge.waypoints) return;
    edge.waypoints.forEach(wp => {
      minX = Math.min(minX, wp.x);
      minY = Math.min(minY, wp.y);
      maxX = Math.max(maxX, wp.x);
      maxY = Math.max(maxY, wp.y);
    });
  });
  if (!isFinite(minX)) return null;
  return {
    x: minX - margin,
    y: minY - margin,
    w: (maxX - minX) + margin * 2,
    h: (maxY - minY) + margin * 2,
  };
}

function drawFrameToCanvas(ctx, W, H, dotStates, ox = 0, oy = 0, elapsed = 0) {
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#0a0a0f';
  const nodeBg = getComputedStyle(document.documentElement).getPropertyValue('--node-bg').trim() || '#16161f';
  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#e8e8f0';

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  const GRID = 28;
  for (let gx = GRID; gx < W; gx += GRID) {
    for (let gy = GRID; gy < H; gy += GRID) {
      ctx.beginPath();
      ctx.arc(gx, gy, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.save();
  ctx.translate(-ox, -oy);

  state.edges.forEach(edge => {
    const fromNode = state.nodes.find(n => n.id === edge.from);
    const toNode = state.nodes.find(n => n.id === edge.to);
    if (!fromNode || !toNode) return;
    const fromEl = document.getElementById(fromNode.id);
    const toEl = document.getElementById(toNode.id);
    if (!fromEl || !toEl) return;
    const from = { x: fromNode.x + fromEl.offsetWidth / 2, y: fromNode.y + fromEl.offsetHeight / 2 };
    const to = { x: toNode.x + toEl.offsetWidth / 2, y: toNode.y + toEl.offsetHeight / 2 };

    const edgeColor = edge.color || state.dotColor;
    const arrowType = edge.arrow || 'none';

    const p2d = buildPath2D(from, to, edge);

    // Fond de la ligne
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 2; ctx.stroke(p2d); ctx.restore();

    // Ligne principale avec couleur, dash et glow
    ctx.save();
    if (state.animGlow) {
      ctx.shadowColor = edgeColor;
      ctx.shadowBlur = 10;
      ctx.globalAlpha = 0.55;
    } else {
      ctx.globalAlpha = 0.75;
    }
    ctx.strokeStyle = edgeColor;
    ctx.lineWidth = 1.5;
    if (edge.dash === 'dashed') {
      ctx.setLineDash([8, 5]);
      if (state.animEdgeMove) {
        const cycleDuration = 1.5 / state.speed;
        ctx.lineDashOffset = -((elapsed / 1000 / cycleDuration) % 1) * 13;
      } else {
        ctx.lineDashOffset = 0;
      }
    } else if (edge.dash === 'dotted') {
      ctx.setLineDash([2, 6]);
      if (state.animEdgeMove) {
        const cycleDuration = 1.0 / state.speed;
        ctx.lineDashOffset = -((elapsed / 1000 / cycleDuration) % 1) * 8;
      } else {
        ctx.lineDashOffset = 0;
      }
    } else {
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
    }
    ctx.stroke(p2d);
    ctx.restore();

    // Flèche — on cherche le point d'entrée sur le bord du nœud cible
    if (arrowType !== 'none') {
      const hw = toEl.offsetWidth / 2 + 4;
      const hh = toEl.offsetHeight / 2 + 4;

      // Remonter depuis t=1 jusqu'à sortir de la boîte du nœud cible
      let tEdge = 1.0;
      for (let step = 1.0; step >= 0; step -= 0.005) {
        const pt = bezierPoint(from, to, step, state.edgeStyle, edge);
        if (Math.abs(pt.x - to.x) > hw || Math.abs(pt.y - to.y) > hh) {
          tEdge = step;
          break;
        }
      }

      const pb = bezierPoint(from, to, tEdge, state.edgeStyle, edge);
      const pa = bezierPoint(from, to, Math.max(0, tEdge - 0.02), state.edgeStyle, edge);
      const angle = Math.atan2(pb.y - pa.y, pb.x - pa.x);

      ctx.save();
      ctx.translate(pb.x, pb.y);
      ctx.rotate(angle);
      ctx.fillStyle = edgeColor;
      ctx.strokeStyle = edgeColor;
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 2;

      if (arrowType === 'triangle') {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-12, -5);
        ctx.lineTo(-12, 5);
        ctx.closePath();
        ctx.fill();
      } else if (arrowType === 'open') {
        ctx.beginPath();
        ctx.moveTo(-12, -5);
        ctx.lineTo(0, 0);
        ctx.lineTo(-12, 5);
        ctx.stroke();
      } else if (arrowType === 'circle') {
        ctx.beginPath();
        ctx.arc(-6, 0, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  });

  if (state.animDots) {
    dotStates.forEach(ds => {
      const fromNode = state.nodes.find(n => n.id === ds.fromId);
      const toNode = state.nodes.find(n => n.id === ds.toId);
      if (!fromNode || !toNode) return;
      const fromEl = document.getElementById(fromNode.id);
      const toEl = document.getElementById(toNode.id);
      if (!fromEl || !toEl) return;
      const from = { x: fromNode.x + fromEl.offsetWidth / 2, y: fromNode.y + fromEl.offsetHeight / 2 };
      const to = { x: toNode.x + toEl.offsetWidth / 2, y: toNode.y + toEl.offsetHeight / 2 };
      const pt = bezierPoint(from, to, ds.t, state.edgeStyle, ds.edgeRef);
      const dotColor = ds.edgeColor || state.dotColor;
      ctx.save();
      ctx.shadowColor = dotColor;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = dotColor;
      ctx.globalAlpha = 0.92;
      ctx.fill();
      ctx.restore();
    });
  }

  state.nodes.forEach(node => {
    const el = document.getElementById(node.id);
    if (!el) return;
    const W_node = el.offsetWidth;
    const H_node = el.offsetHeight;
    const x = node.x;
    const y = node.y;

    // --- NOTE NODE ---
    if (node.type === 'note') {
      const noteColor = node.color !== '#2a2a3e' ? node.color : '#ffd93d';
      const noteTextColor = node.textColor || '#ffd93d';
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, y, W_node, H_node, 4);
      ctx.fillStyle = node.bgColor || '#2a2200';
      ctx.fill();
      ctx.strokeStyle = noteColor;
      ctx.lineWidth = 2;
      ctx.shadowColor = noteColor;
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.restore();

      // Header line
      ctx.save();
      ctx.strokeStyle = noteColor + '44';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y + 22);
      ctx.lineTo(x + W_node, y + 22);
      ctx.stroke();
      ctx.restore();

      // Pin + title
      ctx.save();
      ctx.font = "bold 10px 'Space Mono', monospace";
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = noteTextColor;
      ctx.fillText('📌 ' + node.label, x + 8, y + 12);
      ctx.restore();

      // Body text (sub)
      if (node.sub) {
        ctx.save();
        ctx.font = "10px 'Space Mono', monospace";
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = noteTextColor + 'cc';
        const lines = node.sub.split('\n');
        lines.forEach((line, i) => {
          ctx.fillText(line, x + 8, y + 28 + i * 15);
        });
        ctx.restore();
      }
      return;
    }

    // --- TEXT FREE NODE ---
    if (node.type === 'text') {
      const textNodeColor = node.textColor || (node.color !== '#2a2a3e' ? node.color : textColor);
      const fontSize = node.fontSize || 14;
      const weight = node.fontWeight || 'normal';
      const style = node.fontStyle || 'normal';
      ctx.save();
      ctx.font = `${style} ${weight} ${fontSize}px 'Syne', sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = textNodeColor;
      ctx.fillText(node.label, x + 4, y + 4);
      if (node.sub) {
        ctx.font = `11px 'Space Mono', monospace`;
        ctx.globalAlpha = 0.6;
        ctx.fillText(node.sub, x + 4, y + fontSize + 8);
      }
      ctx.restore();
      return;
    }

    // --- STANDARD NODE ---
    const borderColor = node.color !== '#2a2a3e' ? node.color : '#2a2a3e';
    const nodeTextColor = node.textColor || textColor;
    const nodeBgColor = node.bgColor || nodeBg;
    const shape = node.shape || 'rect';
    const r = shape === 'rect' ? (node.borderRadius ?? 10)
            : shape === 'rounded' ? Math.min(W_node, H_node) / 2
            : shape === 'sharp' ? 0
            : 8;

    ctx.save();
    ctx.beginPath();
    if (shape === 'circle') {
      const cx = x + W_node / 2;
      const cy = y + H_node / 2;
      const radius = Math.min(W_node, H_node) / 2;
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    } else {
      ctx.roundRect(x, y, W_node, H_node, r);
    }
    ctx.fillStyle = nodeBgColor;
    ctx.fill();
    if (node.color !== '#2a2a3e') {
      ctx.shadowColor = borderColor;
      ctx.shadowBlur = 12;
    }
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = node.color !== '#2a2a3e' ? 2 : 1;
    ctx.stroke();
    ctx.restore();

    if (state.animPulse && node.color !== '#2a2a3e') {
      const pulse = (Math.sin(performance.now() * 0.003 + node.x) + 1) / 2;
      ctx.save();
      ctx.beginPath();
      if (shape === 'circle') {
        const cx = x + W_node / 2;
        const cy = y + H_node / 2;
        ctx.arc(cx, cy, Math.min(W_node, H_node) / 2 + 4, 0, Math.PI * 2);
      } else {
        ctx.roundRect(x - 4, y - 4, W_node + 8, H_node + 8, r + 4);
      }
      ctx.strokeStyle = borderColor;
      ctx.globalAlpha = pulse * 0.3;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    if (node.iconMode === 'fa' && node.faIcon) {
      const tmpEl = document.createElement('i');
      tmpEl.className = 'fa ' + node.faIcon;
      tmpEl.style.cssText = 'position:absolute;left:-9999px;top:-9999px;visibility:hidden;font-size:16px;';
      document.body.appendChild(tmpEl);
      const faChar = getComputedStyle(tmpEl, '::before').content.replace(/['"]/g, '');
      const faFontFamily = getComputedStyle(tmpEl).fontFamily;
      const faFontWeight = getComputedStyle(tmpEl).fontWeight;
      document.body.removeChild(tmpEl);
      if (faChar && faChar !== 'none' && faChar !== '') {
        ctx.save();
        ctx.font = `${faFontWeight} 16px ${faFontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = node.textColor || nodeTextColor;
        ctx.fillText(faChar, x + W_node / 2, y + H_node * 0.30);
        ctx.restore();
      } else {
        drawNodeIcon(ctx, node.type, x + W_node / 2, y + H_node * 0.30, 11, borderColor);
      }
    } else if (node.icon && node.icon.length > 0) {
      ctx.save();
      ctx.font = '16px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = nodeTextColor;
      ctx.fillText(node.icon, x + W_node / 2, y + H_node * 0.30);
      ctx.restore();
    }

    ctx.save();
    ctx.font = "bold 11px 'Space Mono', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = nodeTextColor;
    ctx.fillText(node.label, x + W_node / 2, y + H_node * 0.62);
    ctx.restore();

    if (node.sub) {
      ctx.save();
      ctx.font = "9px 'Space Mono', monospace";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = nodeTextColor + '88';
      ctx.fillText(node.sub, x + W_node / 2, y + H_node * 0.82);
      ctx.restore();
    }
  });

  ctx.restore();
}

export function setupExportHandlers() {
  document.getElementById('btnExport').addEventListener('click', () => {
    if (typeof html2canvas === 'undefined') {
      alert('html2canvas n\'est pas chargé. Ajoutez la librairie html2canvas dans votre page.');
      return;
    }
    const bbox = getNodesBoundingBox(20);
    html2canvas(canvasWrap, {
      backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#0a0a0f',
      useCORS: true,
    }).then(canvas => {
      let finalCanvas = canvas;
      if (bbox) {
        const cropped = document.createElement('canvas');
        cropped.width = bbox.w;
        cropped.height = bbox.h;
        const croppedCtx = cropped.getContext('2d');
        croppedCtx.drawImage(canvas, bbox.x, bbox.y, bbox.w, bbox.h, 0, 0, bbox.w, bbox.h);
        finalCanvas = cropped;
      }
      const a = document.createElement('a');
      a.download = 'flowcraft-diagram.png';
      a.href = finalCanvas.toDataURL('image/png');
      a.click();
    });
  });

  document.getElementById('btnRecord').addEventListener('click', () => {
    const DURATION_MS = 6000;
    const FPS = 60;
    const DPR = 2;

    const btn = document.getElementById('btnRecord');
    const overlay = document.getElementById('recOverlay');
    const bar = document.getElementById('recBar');
    const status = document.getElementById('recStatus');

    if (btn.classList.contains('recording')) return;

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    btn.classList.add('recording');
    overlay.classList.add('active');
    document.getElementById('recTitle').textContent = '⏺ EXPORT MP4 EN COURS';
    status.textContent = 'Initialisation...';
    bar.style.width = '0%';

    const bbox = getNodesBoundingBox(20) || { x: 0, y: 0, w: canvasWrap.offsetWidth, h: canvasWrap.offsetHeight };
    const W = bbox.w;
    const H = bbox.h;
    const ox = bbox.x;
    const oy = bbox.y;

    const offscreen = document.createElement('canvas');
    offscreen.width = W * DPR;
    offscreen.height = H * DPR;
    const ctx2d = offscreen.getContext('2d');
    ctx2d.scale(DPR, DPR);

    const dotStates = [];
    state.edges.forEach(edge => {
      if (edge.animDots === false) return;
      const numDots = 3;
      for (let i = 0; i < numDots; i++) {
        const cycles = 1 + Math.floor(Math.random() * 2);
        dotStates.push({
          fromId: edge.from,
          toId: edge.to,
          edgeColor: edge.color || state.dotColor,
          edgeRef: edge,
          offset: i / numDots,
          cycles,
          dir: state.animRandom && Math.random() > 0.5 ? -1 : 1,
        });
      }
    });

    const stream = offscreen.captureStream(FPS);
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 25_000_000 });
    const chunks = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'flowcraft-linkedin.webm';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      btn.classList.remove('recording');
      overlay.classList.remove('active');
    };

    recorder.start(100);
    const startTime = performance.now();

    const tick = now => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / DURATION_MS, 1);
      bar.style.width = (progress * 100).toFixed(1) + '%';
      status.textContent = `Enregistrement... ${((DURATION_MS - elapsed) / 1000).toFixed(1)}s`;
      dotStates.forEach(ds => {
        const raw = ds.offset + ds.cycles * progress * ds.dir;
        ds.t = ((raw % 1) + 1) % 1;
      });
      drawFrameToCanvas(ctx2d, W, H, dotStates, ox, oy, elapsed);
      if (elapsed < DURATION_MS) requestAnimationFrame(tick);
      else { bar.style.width = '100%'; status.textContent = 'Finalisation du fichier...'; recorder.stop(); }
    };

    requestAnimationFrame(tick);
  });

  document.getElementById('btnGif').addEventListener('click', () => {
    const DURATION_MS = 3000;
    const FPS_GIF = 30;
    const TOTAL_FRAMES = Math.round(DURATION_MS / 1000 * FPS_GIF);
    const DELAY_MS = Math.round(1000 / FPS_GIF);
    const GIF_SCALE = 2;

    const btn = document.getElementById('btnGif');
    const overlay = document.getElementById('recOverlay');
    const bar = document.getElementById('recBar');
    const status = document.getElementById('recStatus');

    if (btn.classList.contains('recording')) return;

    btn.classList.add('recording');
    overlay.classList.add('active');
    document.getElementById('recTitle').textContent = '⏺ EXPORT GIF EN COURS';
    status.textContent = 'Préparation GIF...';
    bar.style.width = '0%';

    const bbox = getNodesBoundingBox(20) || { x: 0, y: 0, w: canvasWrap.offsetWidth, h: canvasWrap.offsetHeight };
    const W = bbox.w;
    const H = bbox.h;
    const ox = bbox.x;
    const oy = bbox.y;

    const offscreen = document.createElement('canvas');
    offscreen.width = W * GIF_SCALE;
    offscreen.height = H * GIF_SCALE;
    const ctx2d = offscreen.getContext('2d');
    ctx2d.scale(GIF_SCALE, GIF_SCALE);

    const dotStates = [];
    state.edges.forEach(edge => {
      if (edge.animDots === false) return;
      const numDots = 3;
      for (let i = 0; i < numDots; i++) {
        const cycles = 1 + Math.floor(Math.random() * 2);
        dotStates.push({
          fromId: edge.from,
          toId: edge.to,
          edgeColor: edge.color || state.dotColor,
          edgeRef: edge,
          offset: i / numDots,
          cycles,
          dir: state.animRandom && Math.random() > 0.5 ? -1 : 1,
          t: i / numDots,
        });
      }
    });

    const workerScriptUrl = URL.createObjectURL(new Blob(
      [document.getElementById('gif-worker-inline').textContent],
      { type: 'application/javascript' }
    ));

    const gif = new GIF({
      workers: 4,
      quality: 3,
      dither: 'FloydSteinberg',
      width: W * GIF_SCALE,
      height: H * GIF_SCALE,
      workerScript: workerScriptUrl,
    });

    let frame = 0;
    const encodeFrame = () => {
      if (frame >= TOTAL_FRAMES) {
        status.textContent = 'Encodage GIF...';
        gif.render();
        return;
      }
      const progress = frame / TOTAL_FRAMES;
      const elapsed = (frame / FPS_GIF) * 1000;
      dotStates.forEach(ds => {
        const raw = ds.offset + ds.cycles * progress * ds.dir;
        ds.t = ((raw % 1) + 1) % 1;
      });
      drawFrameToCanvas(ctx2d, W, H, dotStates, ox, oy, elapsed);
      gif.addFrame(ctx2d, { copy: true, delay: DELAY_MS });
      bar.style.width = ((frame / TOTAL_FRAMES) * 80).toFixed(1) + '%';
      status.textContent = `Capture frame ${frame + 1}/${TOTAL_FRAMES}...`;
      frame++;
      setTimeout(encodeFrame, 0);
    };

    gif.on('progress', p => {
      bar.style.width = (80 + p * 20).toFixed(1) + '%';
      status.textContent = `Encodage GIF... ${(p * 100).toFixed(0)}%`;
    });

    gif.on('finished', blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'flowcraft-loop.gif';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      btn.classList.remove('recording');
      overlay.classList.remove('active');
    });

    encodeFrame();
  });
}
