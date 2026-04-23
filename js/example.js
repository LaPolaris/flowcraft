import { state, canvasWrap } from './state.js';
import { createNode, renderNode } from './node-manager.js';
import { rebuildEdges, updateStats } from './edge-manager.js';

export function loadExample() {
  state.nodes.forEach(n => { const el = document.getElementById(n.id); if (el) el.remove(); });
  state.nodes = [];
  state.edges = [];
  state.idCounter = 0;

  const W = canvasWrap.offsetWidth;
  const H = canvasWrap.offsetHeight;
  const cx = W / 2;

  const root = createNode('api', cx - 55, H / 2 - 35);
  root.label = 'API'; root.icon = '⚡'; root.color = '#00f5a0';
  renderNode(root);

  const openApi = createNode('cloud', cx + 80, H / 2 - 160);
  openApi.label = 'Open API'; openApi.icon = '🌐'; openApi.color = '#00d4ff';
  renderNode(openApi);

  const internalApi = createNode('server', cx + 80, H / 2 + 10);
  internalApi.label = 'Internal API'; internalApi.icon = '🖥️'; internalApi.color = '#ffd93d';
  renderNode(internalApi);

  const partnerApi = createNode('server', cx + 80, H / 2 + 180);
  partnerApi.label = 'Partner API'; partnerApi.icon = '🤝'; partnerApi.color = '#c77dff';
  renderNode(partnerApi);

  const rest = createNode('process', cx + 240, H / 2 - 220);
  rest.label = 'REST API'; rest.icon = '🔗'; rest.color = '#00d4ff';
  renderNode(rest);

  const graphql = createNode('process', cx + 240, H / 2 - 120);
  graphql.label = 'GraphQL'; graphql.icon = '◈'; graphql.color = '#00d4ff';
  renderNode(graphql);

  const b2b = createNode('process', cx + 240, H / 2 + 150);
  b2b.label = 'B2B'; b2b.icon = '🏢'; b2b.color = '#c77dff';
  renderNode(b2b);

  const f2b = createNode('process', cx + 240, H / 2 + 30);
  f2b.label = 'Frontend/Backend'; f2b.icon = '⚙️'; f2b.color = '#ffd93d';
  renderNode(f2b);

  state.edges = [
    { from: root.id, to: openApi.id },
    { from: root.id, to: internalApi.id },
    { from: root.id, to: partnerApi.id },
    { from: openApi.id, to: rest.id },
    { from: openApi.id, to: graphql.id },
    { from: internalApi.id, to: f2b.id },
    { from: partnerApi.id, to: b2b.id },
  ];

  rebuildEdges();
  updateStats();
}
