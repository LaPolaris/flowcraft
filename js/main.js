import { setupUi, setupEditModal } from './ui.js';
import { setupExportHandlers } from './export-manager.js';
import { loadExample } from './example.js';
import { updateStats } from './edge-manager.js';
import { applyLang, currentLang } from './i18n.js';

function init() {
  applyLang(currentLang);
  setupUi();
  setupEditModal();
  setupExportHandlers();
  loadExample();
  updateStats();
}

init();
