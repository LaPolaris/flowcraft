export const TRANSLATIONS = {
  fr: {
    addNode: '+ Nœud', connect: 'Connecter', clear: 'Vider', example: 'Exemple',
    export: 'Exporter ▾', exportPng: '⏺ PNG', exportGif: '⏺ GIF', exportMp4: '⏺ MP4', exportJsonFile: '⏺ JSON',
    importJson: 'Import JSON', load: 'Charger', exportJson: 'Exporter',
    animation: 'Animation', animDots: 'Dots animés', animGlow: 'Glow edges',
    animPulse: 'Pulse nœuds', animRandom: 'Direction aléa', animEdgeMove: 'Edge moving',
    linkStyle: 'Style des liens', linkType: 'Type de lien', dotColor: 'Couleur des dots',
    straight: 'Droit', curved: 'Courbé', step: 'Escalier',
    theme: 'Thème', properties: 'Propriétés',
    selectNode: 'Sélectionne un nœud pour éditer ses propriétés',
    nodes: 'Nœuds', links: 'Liens', mode: 'Mode', selection: 'Sélection',
    speed: 'VITESSE', version: 'Version', license: 'Licence', poweredBy: 'Propulsé par', sourceCode: 'Code source',
    connecting: 'Connexion',
  },
  en: {
    addNode: '+ Node', connect: 'Connect', clear: 'Clear', example: 'Example',
    export: 'Export ▾', exportPng: '⏺ PNG', exportGif: '⏺ GIF', exportMp4: '⏺ MP4', exportJsonFile: '⏺ JSON',
    importJson: 'Import JSON', load: 'Load', exportJson: 'Export',
    animation: 'Animation', animDots: 'Animated dots', animGlow: 'Glow edges',
    animPulse: 'Pulse nodes', animRandom: 'Random direction', animEdgeMove: 'Edge moving',
    linkStyle: 'Link style', linkType: 'Link type', dotColor: 'Dot color',
    straight: 'Straight', curved: 'Curved', step: 'Step',
    theme: 'Theme', properties: 'Properties',
    selectNode: 'Select a node to edit its properties',
    nodes: 'Nodes', links: 'Links', mode: 'Mode', selection: 'Selection',
    speed: 'SPEED', version: 'Version', license: 'Licence', poweredBy: 'Powered by', sourceCode: 'Source code',
    connecting: 'Connecting',
  },
};

export let currentLang = 'fr';

export function translate(key) {
  return TRANSLATIONS[currentLang]?.[key] ?? key;
}

export function applyLang(lang) {
  currentLang = lang;
  const t = TRANSLATIONS[lang];
  document.getElementById('htmlRoot').lang = lang;
  document.getElementById('btnLang').textContent = lang === 'fr' ? 'EN' : 'FR';

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (t[key] !== undefined) el.textContent = t[key];
  });

  document.querySelectorAll('#edgeStyle option[data-i18n]').forEach(opt => {
    const key = opt.dataset.i18n;
    if (t[key]) opt.textContent = t[key];
  });
}
