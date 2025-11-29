/**
 * Controlタブのレンダラー
 */
import { sendToContent } from '../utils.js';

/**
 * Controlタブをレンダリング
 */
export function renderControl(state, refresh, tabId) {
  const root = document.querySelector('[data-tab-panel="control"]');
  root.innerHTML = '';

  const status = document.createElement('div');
  status.className = 'eds-status';
  status.innerHTML = `<span class="eds-status__dot"></span> ${state.sections.length} sections · ${state.blocks.length} blocks`;
  root.appendChild(status);

  const toggleSections = document.createElement('label');
  toggleSections.className = 'eds-toggle';
  toggleSections.innerHTML = `<input type="checkbox" ${state.overlaysEnabled.sections ? 'checked' : ''}/> Sections overlay`;
  toggleSections.querySelector('input').addEventListener('change', async (evt) => {
    try {
      await sendToContent(tabId, 'toggle-overlay', { key: 'sections', value: evt.target.checked });
    } finally {
      refresh();
    }
  });

  const toggleBlocks = document.createElement('label');
  toggleBlocks.className = 'eds-toggle';
  toggleBlocks.innerHTML = `<input type="checkbox" ${state.overlaysEnabled.blocks ? 'checked' : ''}/> Blocks overlay`;
  toggleBlocks.querySelector('input').addEventListener('change', async (evt) => {
    try {
      await sendToContent(tabId, 'toggle-overlay', { key: 'blocks', value: evt.target.checked });
    } finally {
      refresh();
    }
  });

  const actions = document.createElement('div');
  actions.className = 'eds-actions';
  const reanalyze = document.createElement('button');
  reanalyze.className = 'eds-button eds-button--primary';
  reanalyze.textContent = 'Re-run analysis';
  reanalyze.addEventListener('click', async () => {
    reanalyze.disabled = true;
    try {
      await sendToContent(tabId, 'reanalyze');
      await refresh();
    } finally {
      reanalyze.disabled = false;
    }
  });

  const hide = document.createElement('button');
  hide.className = 'eds-button';
  hide.textContent = 'Remove overlays';
  hide.addEventListener('click', async () => {
    try {
      await sendToContent(tabId, 'destroy');
    } finally {
      await refresh();
    }
  });

  actions.append(reanalyze, hide);
  root.append(toggleSections, toggleBlocks, actions);

  const hint = document.createElement('p');
  hint.className = 'eds-hint';
  hint.textContent = 'Detection relies on SSR markup; overlays follow live DOM updates on scroll/resize.';
  root.appendChild(hint);
}

