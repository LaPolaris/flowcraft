import { state, ICONS, viewport, screenToCanvas, deselectAllBase } from './state.js';
import { translate } from './i18n.js';
import { FA_ALL_ICONS } from './fa-icons.js';
import { rebuildEdges, updateStats, startWireDrag, finishConnect, deleteNode } from './edge-manager.js';

export function createNode(type, x, y) {
  const id = 'n' + (++state.idCounter);
  const base = {
    id, type, x, y,
    label: type.charAt(0).toUpperCase() + type.slice(1),
    sub: '',
    icon: ICONS[type] || '▭',
    iconMode: 'text',
    faIcon: 'fa-solid fa-bolt',
    color: '#2a2a3e',
    bgColor: '',
    textColor: '',
  };

  let node;
  if (type === 'note') {
    node = { ...base, label: 'Note', sub: 'Écrivez ici...', color: '#ffd93d', textColor: '#ffd93d' };
  } else if (type === 'text') {
    node = { ...base, label: 'Texte libre', sub: '', color: '#e8e8f0', textColor: '#e8e8f0', fontSize: 16, fontWeight: 'normal', fontStyle: 'normal' };
  } else {
    node = base;
  }

  state.nodes.push(node);
  renderNode(node);
  updateStats();
  return node;
}

export function renderNode(node) {
  let el = document.getElementById(node.id);
  if (!el) {
    el = document.createElement('div');
    el.id = node.id;
    el.className = 'node';
    viewport.appendChild(el);
    bindNodeEvents(el, node);
  }

  el.style.left = node.x + 'px';
  el.style.top = node.y + 'px';

  // Réinitialiser les classes de type
  el.classList.remove('node-note', 'node-text', 'shape-circle', 'shape-rounded', 'shape-sharp');

  if (node.type === 'note') {
    el.classList.add('node-note');
    el.style.borderColor = node.color === '#2a2a3e' ? '#ffd93d' : node.color;
    el.style.background = node.bgColor || '#2a2200';
    el.style.color = node.textColor || '#ffd93d';
    el.style.boxShadow = node.color !== '#2a2a3e' ? `0 0 12px ${node.color}44` : '0 0 12px #ffd93d22';
    el.style.borderRadius = '4px';
    const noteText = node.noteContent || node.label || '';
    el.innerHTML = `
      <div class="note-header">
        <span class="note-pin">📌</span>
        <span class="note-title">${node.label}</span>
      </div>
      <div class="note-body" contenteditable="false">${noteText !== node.label ? noteText : (node.sub || '')}</div>
      <div class="port right" data-port="right" data-node="${node.id}"></div>
      <div class="port left" data-port="left" data-node="${node.id}"></div>
      <div class="port bottom" data-port="bottom" data-node="${node.id}"></div>
      <div class="port top" data-port="top" data-node="${node.id}"></div>
    `;
  } else if (node.type === 'text') {
    el.classList.add('node-text');
    el.style.borderColor = 'transparent';
    el.style.background = 'transparent';
    el.style.color = node.textColor || node.color !== '#2a2a3e' ? node.color : 'var(--text)';
    el.style.boxShadow = 'none';
    el.style.borderRadius = '0';
    el.innerHTML = `
      <div class="text-free" style="font-size:${node.fontSize||14}px;font-weight:${node.fontWeight||'normal'};font-style:${node.fontStyle||'normal'}">${node.label}</div>
      ${node.sub ? `<div class="text-free-sub">${node.sub}</div>` : ''}
      <div class="port right" data-port="right" data-node="${node.id}"></div>
      <div class="port left" data-port="left" data-node="${node.id}"></div>
      <div class="port bottom" data-port="bottom" data-node="${node.id}"></div>
      <div class="port top" data-port="top" data-node="${node.id}"></div>
    `;
  } else {
    el.style.borderColor = node.color === '#2a2a3e' ? 'var(--node-border)' : node.color;
    el.style.background = node.bgColor || 'var(--node-bg)';
    el.style.color = node.textColor || 'var(--text)';
    if (node.color !== '#2a2a3e') el.style.boxShadow = `0 0 12px ${node.color}44`;
    else el.style.boxShadow = '';

    const shape = node.shape || 'rect';
    if (shape !== 'rect') el.classList.add('shape-' + shape);
    if (shape === 'rect') el.style.borderRadius = (node.borderRadius != null ? node.borderRadius : 10) + 'px';
    else el.style.borderRadius = '';

    const iconHtml = node.iconMode === 'fa'
      ? `<i class="fa ${node.faIcon} node-icon" style="font-size:18px;display:block;margin-bottom:4px;color:${node.textColor||'inherit'}"></i>`
      : `<span class="node-icon">${node.icon}</span>`;

    el.innerHTML = `
      ${iconHtml}
      <div class="node-label">${node.label}</div>
      ${node.sub ? `<div class="node-sub">${node.sub}</div>` : ''}
      <div class="port right" data-port="right" data-node="${node.id}"></div>
      <div class="port left" data-port="left" data-node="${node.id}"></div>
      <div class="port bottom" data-port="bottom" data-node="${node.id}"></div>
      <div class="port top" data-port="top" data-node="${node.id}"></div>
    `;
  }

  el.querySelectorAll('.port').forEach(port => {
    port.addEventListener('mousedown', e => {
      e.stopPropagation();
      e.preventDefault();
      startWireDrag(node);
    });
  });
}

export function bindNodeEvents(el, node) {
  el.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    if (e.target.classList.contains('port')) return;
    e.stopPropagation();

    if (state.connectMode && state.connectSource) {
      finishConnect(node);
      return;
    }

    const pt = screenToCanvas(e.clientX, e.clientY);

    if (e.shiftKey) {
      selectNode(node, true);
      state.dragging = null;
      return;
    }

    // Si le nœud est déjà dans la sélection multiple, on démarre un drag groupé
    if (state.selectedNodes.length > 1 && state.selectedNodes.includes(node)) {
      // stocker les offsets de tous les nœuds sélectionnés
      state.dragging = node;
      state.dragOffX = pt.x - node.x;
      state.dragOffY = pt.y - node.y;
      state.groupDragOffsets = state.selectedNodes.map(n => ({
        node: n,
        dx: pt.x - n.x,
        dy: pt.y - n.y,
      }));
    } else {
      selectNode(node);
      state.dragging = node;
      state.dragOffX = pt.x - node.x;
      state.dragOffY = pt.y - node.y;
      state.groupDragOffsets = null;
    }
  });

  el.addEventListener('contextmenu', e => {
    e.preventDefault();
    e.stopPropagation();
    state.ctxTarget = node;
    if (typeof window.showCtxMenu === 'function') window.showCtxMenu(e.clientX, e.clientY);
  });

  bindNodeTouchEvents(el, node);
}

export function bindNodeTouchEvents(el, node) {
  el.addEventListener('touchstart', e => {
    if (e.touches.length !== 1) return;
    e.stopPropagation();
    e.preventDefault();
    const t = e.touches[0];

    if (state.connectMode && state.connectSource) {
      finishConnect(node);
      return;
    }

    selectNode(node);
    const pt = screenToCanvas(t.clientX, t.clientY);
    state.dragging = node;
    state.dragOffX = pt.x - node.x;
    state.dragOffY = pt.y - node.y;
  }, { passive: false });

  el.querySelectorAll('.port').forEach(port => {
    port.addEventListener('touchstart', e => {
      if (e.touches.length !== 1) return;
      e.stopPropagation();
      e.preventDefault();
      startWireDrag(node);
    }, { passive: false });
  });
}

export function selectNode(node, addToSelection = false) {
  if (addToSelection) {
    const idx = state.selectedNodes.indexOf(node);
    if (idx === -1) {
      state.selectedNodes.push(node);
      document.getElementById(node.id).classList.add('selected');
    } else {
      state.selectedNodes.splice(idx, 1);
      document.getElementById(node.id).classList.remove('selected');
    }
    state.selectedNode = state.selectedNodes[state.selectedNodes.length - 1] || null;
    renderProps(state.selectedNodes.length === 1 ? state.selectedNodes[0] : null);
  } else {
    state.selectedNodes = [node];
    state.selectedNode = node;
    document.querySelectorAll('.node').forEach(el => el.classList.remove('selected'));
    document.getElementById(node.id).classList.add('selected');
    renderProps(node);
  }
}

export function deselectAll() {
  state.selectedNodes = [];
  deselectAllBase();
  renderProps(null);
}

export function renderProps(node) {
  const div = document.getElementById('propContent');
  if (!node) {
    div.innerHTML = `<div class="no-selection" data-i18n="selectNode">${translate('selectNode')}</div>`;
    return;
  }

  if (node.type === 'note') {
    renderNoteProps(node, div);
    return;
  }

  if (node.type === 'text') {
    renderTextProps(node, div);
    return;
  }

  let selBorder = node.color || '#2a2a3e';
  let selBg = node.bgColor || '#16161f';
  let selText = node.textColor || '#e8e8f0';
  let currentIconMode = node.iconMode || 'text';
  let selectedFaIcon = node.faIcon || 'fa-solid fa-bolt';

  const dotsHtml = (key, currentVal) => ['#2a2a3e','#00f5a0','#00d4ff','#ff6b6b','#ffd93d','#c77dff','#ffffff','#aaaaaa']
    .map(c => `
      <div class="ncd ${c === currentVal ? 'selected' : ''}"
           style="background:${c};${key==='border'?'outline:1px solid rgba(255,255,255,0.08)':''}"
           data-key="${key}" data-color="${c}" title="${c}"></div>
    `).join('');

  div.innerHTML = `
    <div class="prop-row"><label>Label</label><input type="text" id="pLabel" value="${node.label}"></div>
    <div class="prop-row"><label>Sous-titre</label><input type="text" id="pSub" value="${node.sub || ''}"></div>

    <div class="prop-section-title">Couleurs</div>
    <div class="node-color-section">
      <div class="node-color-row">
        <label>Bordure</label>
        <div class="node-color-dots" id="pDotsBorder">${dotsHtml('border', selBorder)}</div>
      </div>
      <div class="node-color-row">
        <label>Fond</label>
        <div class="node-color-dots" id="pDotsBg">${dotsHtml('bg', selBg)}</div>
      </div>
      <div class="node-color-row">
        <label>Texte</label>
        <div class="node-color-dots" id="pDotsText">${dotsHtml('text', selText)}</div>
      </div>
    </div>

    <div class="prop-section-title">Icône</div>
    <div class="icon-mode-tabs">
      <div class="icon-tab ${currentIconMode !== 'fa' ? 'active' : ''}" id="pTabText">Emoji / Texte</div>
      <div class="icon-tab ${currentIconMode === 'fa' ? 'active' : ''}" id="pTabFa">Font Awesome</div>
    </div>
    <div id="pIconTextPanel" style="display:${currentIconMode !== 'fa' ? 'block' : 'none'}">
      <div class="prop-row"><label>Icône (emoji ou car.)</label><input type="text" id="pIcon" value="${node.icon}" placeholder="⚡ ▭ ◇ 🔥 ..."></div>
    </div>
    <div id="pIconFaPanel" style="display:${currentIconMode === 'fa' ? 'block' : 'none'}">
      <input type="text" class="fa-search" id="pFaSearch" placeholder="cloud, github, bolt...">
      <div class="fa-picker" id="pFaPicker"></div>
    </div>

    <div class="prop-section-title">Forme</div>
    <div class="shape-picker" id="pShapePicker">
      <div class="shape-opt ${(node.shape || 'rect') === 'rect' ? 'active' : ''}" data-shape="rect" title="Rectangle"><div class="shape-prev shape-prev-rect"></div><span>Rect</span></div>
      <div class="shape-opt ${(node.shape || 'rect') === 'rounded' ? 'active' : ''}" data-shape="rounded" title="Arrondi"><div class="shape-prev shape-prev-rounded"></div><span>Round</span></div>
      <div class="shape-opt ${(node.shape || 'rect') === 'circle' ? 'active' : ''}" data-shape="circle" title="Cercle"><div class="shape-prev shape-prev-circle"></div><span>Cercle</span></div>
      <div class="shape-opt ${(node.shape || 'rect') === 'sharp' ? 'active' : ''}" data-shape="sharp" title="Sharp"><div class="shape-prev shape-prev-sharp"></div><span>Sharp</span></div>
    </div>
    <div id="pRadiusRow" style="display:${['rect'].includes(node.shape || 'rect') ? 'block' : 'none'}">
      <div class="prop-row">
        <label>Rayon (<span id="pRadiusVal">${node.borderRadius ?? 10}</span>px)</label>
        <input type="range" id="pRadius" min="0" max="40" value="${node.borderRadius ?? 10}" style="width:100%">
      </div>
    </div>

    <div style="margin-top:10px">
      <button class="btn primary" id="pSave" style="width:100%">Appliquer</button>
    </div>
    <div style="margin-top:6px">
      <button class="btn" id="pReset" style="width:100%">Reset</button>
    </div>
    <div style="margin-top:6px">
      <button class="btn danger" id="pDelete" style="width:100%">Supprimer</button>
    </div>
  `;

  const applyPreview = () => {
    const el = document.getElementById(node.id);
    if (!el) return;
    el.style.borderColor = selBorder;
    el.style.background = selBg;
    el.style.color = selText;
    el.style.boxShadow = selBorder !== '#2a2a3e' ? `0 0 12px ${selBorder}44` : '';
  };

  div.querySelectorAll('.ncd').forEach(dot => {
    dot.addEventListener('click', () => {
      const key = dot.dataset.key;
      const color = dot.dataset.color;
      if (key === 'border') selBorder = color;
      if (key === 'bg') selBg = color;
      if (key === 'text') selText = color;
      div.querySelectorAll(`.ncd[data-key="${key}"]`).forEach(d => d.classList.toggle('selected', d.dataset.color === color));
      applyPreview();
    });
  });

  const showTab = (mode) => {
    currentIconMode = mode;
    document.getElementById('pTabText').classList.toggle('active', mode === 'text');
    document.getElementById('pTabFa').classList.toggle('active', mode === 'fa');
    document.getElementById('pIconTextPanel').style.display = mode === 'text' ? 'block' : 'none';
    document.getElementById('pIconFaPanel').style.display = mode === 'fa' ? 'block' : 'none';
  };
  document.getElementById('pTabText').addEventListener('click', () => showTab('text'));
  document.getElementById('pTabFa').addEventListener('click', () => showTab('fa'));

  let faPage = 0;
  const FA_PAGE_SIZE = 200;
  let faFiltered = FA_ALL_ICONS;

  const renderFaPicker = () => {
    const picker = document.getElementById('pFaPicker');
    const slice = faFiltered.slice(0, (faPage + 1) * FA_PAGE_SIZE);
    picker.innerHTML = slice.map(ic => `
      <div class="fa-item ${ic === selectedFaIcon ? 'selected' : ''}" data-fa="${ic}" title="${ic.replace('fa-solid ', '').replace('fa-brands ', '').replace('fa-', '')}">
        <i class="fa ${ic}"></i>
      </div>
    `).join('');
    picker.querySelectorAll('.fa-item').forEach(item => {
      item.addEventListener('click', () => {
        selectedFaIcon = item.dataset.fa;
        picker.querySelectorAll('.fa-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
      });
    });
  };

  renderFaPicker();

  document.getElementById('pFaPicker').addEventListener('scroll', e => {
    const el = e.target;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
      if ((faPage + 1) * FA_PAGE_SIZE < faFiltered.length) {
        faPage++;
        renderFaPicker();
      }
    }
  });

  document.getElementById('pFaSearch').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    faFiltered = q ? FA_ALL_ICONS.filter(ic => ic.includes(q)) : FA_ALL_ICONS;
    faPage = 0;
    renderFaPicker();
  });

  let selShape = node.shape || 'rect';
  let selRadius = node.borderRadius ?? 10;

  div.querySelectorAll('.shape-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      selShape = opt.dataset.shape;
      div.querySelectorAll('.shape-opt').forEach(o => o.classList.toggle('active', o.dataset.shape === selShape));
      document.getElementById('pRadiusRow').style.display = selShape === 'rect' ? 'block' : 'none';
      const el = document.getElementById(node.id);
      if (el) {
        el.classList.remove('shape-circle', 'shape-rounded', 'shape-sharp');
        if (selShape !== 'rect') el.classList.add('shape-' + selShape);
        if (selShape === 'rect') el.style.borderRadius = selRadius + 'px';
        else el.style.borderRadius = '';
      }
    });
  });

  document.getElementById('pRadius').addEventListener('input', e => {
    selRadius = parseInt(e.target.value, 10);
    document.getElementById('pRadiusVal').textContent = selRadius;
    const el = document.getElementById(node.id);
    if (el && selShape === 'rect') el.style.borderRadius = selRadius + 'px';
  });

  document.getElementById('pSave').addEventListener('click', () => {
    node.label = document.getElementById('pLabel').value;
    node.sub = document.getElementById('pSub').value;
    node.color = selBorder;
    node.bgColor = selBg;
    node.textColor = selText;
    node.shape = selShape;
    node.borderRadius = selShape === 'rect' ? selRadius : undefined;
    node.iconMode = currentIconMode;
    if (currentIconMode === 'fa') {
      node.faIcon = selectedFaIcon;
    } else {
      node.icon = document.getElementById('pIcon').value;
    }
    renderNode(node);
    rebuildEdges();
  });

  document.getElementById('pReset').addEventListener('click', () => {
    node.color = '#2a2a3e'; node.bgColor = ''; node.textColor = '';
    selBorder = '#2a2a3e'; selBg = '#16161f'; selText = '#e8e8f0';
    div.querySelectorAll('.ncd').forEach(d => {
      d.classList.toggle('selected',
        (d.dataset.key === 'border' && d.dataset.color === selBorder) ||
        (d.dataset.key === 'bg' && d.dataset.color === selBg) ||
        (d.dataset.key === 'text' && d.dataset.color === selText)
      );
    });
    renderNode(node);
    rebuildEdges();
  });

  document.getElementById('pDelete').addEventListener('click', () => deleteNode(node));
}

function renderNoteProps(node, div) {
  const colorOpts = ['#ffd93d','#00f5a0','#00d4ff','#ff6b6b','#c77dff','#ffffff','#aaaaaa'];
  const dotsHtml = (key, cur) => colorOpts.map(c => `
    <div class="ncd ${c===cur?'selected':''}" style="background:${c}" data-key="${key}" data-color="${c}" title="${c}"></div>
  `).join('');

  let selColor = node.color !== '#2a2a3e' ? node.color : '#ffd93d';
  let selText = node.textColor || '#ffd93d';

  div.innerHTML = `
    <div class="prop-section-title">Note</div>
    <div class="prop-row"><label>Titre</label><input type="text" id="pNoteTitle" value="${node.label}"></div>
    <div class="prop-row"><label>Contenu</label><textarea id="pNoteBody" rows="5" style="width:100%;background:var(--bg);border:1px solid var(--border);color:var(--text);font-family:'Space Mono',monospace;font-size:11px;padding:6px;border-radius:4px;resize:vertical">${node.sub || ''}</textarea></div>
    <div class="prop-section-title">Couleurs</div>
    <div class="node-color-row"><label>Bordure/icône</label><div class="node-color-dots" id="pNoteColor">${dotsHtml('color', selColor)}</div></div>
    <div class="node-color-row" style="margin-top:6px"><label>Texte</label><div class="node-color-dots" id="pNoteText">${dotsHtml('text', selText)}</div></div>
    <div style="margin-top:10px">
      <button class="btn primary" id="pNoteSave" style="width:100%">Appliquer</button>
    </div>
    <div style="margin-top:6px">
      <button class="btn danger" id="pNoteDelete" style="width:100%">Supprimer</button>
    </div>
  `;

  div.querySelectorAll('.ncd').forEach(dot => {
    dot.addEventListener('click', () => {
      const key = dot.dataset.key;
      const color = dot.dataset.color;
      if (key === 'color') selColor = color;
      if (key === 'text') selText = color;
      div.querySelectorAll(`.ncd[data-key="${key}"]`).forEach(d => d.classList.toggle('selected', d.dataset.color === color));
    });
  });

  document.getElementById('pNoteSave').addEventListener('click', () => {
    node.label = document.getElementById('pNoteTitle').value;
    node.sub = document.getElementById('pNoteBody').value;
    node.color = selColor;
    node.textColor = selText;
    renderNode(node);
    rebuildEdges();
  });

  document.getElementById('pNoteDelete').addEventListener('click', () => deleteNode(node));
}

function renderTextProps(node, div) {
  const colorOpts = ['#e8e8f0','#00f5a0','#00d4ff','#ff6b6b','#ffd93d','#c77dff','#ffffff','#aaaaaa'];
  const dotsHtml = (cur) => colorOpts.map(c => `
    <div class="ncd ${c===cur?'selected':''}" style="background:${c}" data-color="${c}" title="${c}"></div>
  `).join('');

  let selColor = node.color !== '#2a2a3e' ? node.color : '#e8e8f0';
  let selSize = node.fontSize || 14;
  let selWeight = node.fontWeight || 'normal';
  let selStyle = node.fontStyle || 'normal';

  div.innerHTML = `
    <div class="prop-section-title">Texte Libre</div>
    <div class="prop-row"><label>Texte</label><input type="text" id="pTextLabel" value="${node.label}"></div>
    <div class="prop-row"><label>Sous-texte</label><input type="text" id="pTextSub" value="${node.sub || ''}"></div>
    <div class="prop-section-title">Style</div>
    <div class="node-color-row"><label>Couleur</label><div class="node-color-dots" id="pTextColor">${dotsHtml(selColor)}</div></div>
    <div class="prop-row" style="margin-top:8px">
      <label>Taille (<span id="pFontSizeVal">${selSize}</span>px)</label>
      <input type="range" id="pFontSize" min="10" max="72" value="${selSize}" style="width:100%">
    </div>
    <div class="shape-picker" style="margin-top:4px">
      <div class="shape-opt ${selWeight==='normal'?'active':''}" data-weight="normal"><span style="font-weight:normal">Aa</span><span>Normal</span></div>
      <div class="shape-opt ${selWeight==='bold'?'active':''}" data-weight="bold"><span style="font-weight:bold">Aa</span><span>Gras</span></div>
      <div class="shape-opt ${selStyle==='normal'?'active':''}" data-fstyle="normal"><span>Aa</span><span>Droit</span></div>
      <div class="shape-opt ${selStyle==='italic'?'active':''}" data-fstyle="italic"><span style="font-style:italic">Aa</span><span>Italic</span></div>
    </div>
    <div style="margin-top:10px">
      <button class="btn primary" id="pTextSave" style="width:100%">Appliquer</button>
    </div>
    <div style="margin-top:6px">
      <button class="btn danger" id="pTextDelete" style="width:100%">Supprimer</button>
    </div>
  `;

  div.querySelectorAll('#pTextColor .ncd').forEach(dot => {
    dot.addEventListener('click', () => {
      selColor = dot.dataset.color;
      div.querySelectorAll('#pTextColor .ncd').forEach(d => d.classList.toggle('selected', d.dataset.color === selColor));
    });
  });

  document.getElementById('pFontSize').addEventListener('input', e => {
    selSize = parseInt(e.target.value, 10);
    document.getElementById('pFontSizeVal').textContent = selSize;
  });

  div.querySelectorAll('[data-weight]').forEach(opt => {
    opt.addEventListener('click', () => {
      selWeight = opt.dataset.weight;
      div.querySelectorAll('[data-weight]').forEach(o => o.classList.toggle('active', o.dataset.weight === selWeight));
    });
  });

  div.querySelectorAll('[data-fstyle]').forEach(opt => {
    opt.addEventListener('click', () => {
      selStyle = opt.dataset.fstyle;
      div.querySelectorAll('[data-fstyle]').forEach(o => o.classList.toggle('active', o.dataset.fstyle === selStyle));
    });
  });

  document.getElementById('pTextSave').addEventListener('click', () => {
    node.label = document.getElementById('pTextLabel').value;
    node.sub = document.getElementById('pTextSub').value;
    node.color = selColor;
    node.textColor = selColor;
    node.fontSize = selSize;
    node.fontWeight = selWeight;
    node.fontStyle = selStyle;
    renderNode(node);
    rebuildEdges();
  });

  document.getElementById('pTextDelete').addEventListener('click', () => deleteNode(node));
}
