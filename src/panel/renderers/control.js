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

  // ポップアップと同じ構造のコンテナ
  const overlayControls = document.createElement('div');
  overlayControls.className = 'overlay-controls';

  // Sections チェックボックス
  const sectionsItem = document.createElement('div');
  sectionsItem.className = 'control-item';
  const sectionsLabel = document.createElement('label');
  sectionsLabel.className = 'control-label';
  const sectionsCheckbox = document.createElement('input');
  sectionsCheckbox.type = 'checkbox';
  sectionsCheckbox.id = 'control-toggle-sections';
  sectionsCheckbox.className = 'control-checkbox';
  sectionsCheckbox.checked = state.overlaysEnabled?.sections ?? true;
  sectionsCheckbox.addEventListener('change', async (evt) => {
    try {
      await sendToContent(tabId, 'toggle-overlay', { key: 'sections', value: evt.target.checked });
    } finally {
      refresh();
    }
  });
  const sectionsText = document.createElement('span');
  sectionsText.className = 'control-text';
  sectionsText.textContent = 'Sections';
  sectionsLabel.appendChild(sectionsCheckbox);
  sectionsLabel.appendChild(sectionsText);
  sectionsItem.appendChild(sectionsLabel);
  overlayControls.appendChild(sectionsItem);

  // Blocks チェックボックス
  const blocksItem = document.createElement('div');
  blocksItem.className = 'control-item';
  const blocksLabel = document.createElement('label');
  blocksLabel.className = 'control-label';
  const blocksCheckbox = document.createElement('input');
  blocksCheckbox.type = 'checkbox';
  blocksCheckbox.id = 'control-toggle-blocks';
  blocksCheckbox.className = 'control-checkbox';
  blocksCheckbox.checked = state.overlaysEnabled?.blocks ?? true;
  blocksCheckbox.addEventListener('change', async (evt) => {
    try {
      await sendToContent(tabId, 'toggle-overlay', { key: 'blocks', value: evt.target.checked });
    } finally {
      refresh();
    }
  });
  const blocksText = document.createElement('span');
  blocksText.className = 'control-text';
  blocksText.textContent = 'Blocks';
  blocksLabel.appendChild(blocksCheckbox);
  blocksLabel.appendChild(blocksText);
  blocksItem.appendChild(blocksLabel);
  overlayControls.appendChild(blocksItem);

  // Default Content チェックボックス
  const defaultItem = document.createElement('div');
  defaultItem.className = 'control-item';
  const defaultLabel = document.createElement('label');
  defaultLabel.className = 'control-label';
  const defaultCheckbox = document.createElement('input');
  defaultCheckbox.type = 'checkbox';
  defaultCheckbox.id = 'control-toggle-default';
  defaultCheckbox.className = 'control-checkbox';
  defaultCheckbox.checked = state.overlaysEnabled?.defaultContent ?? true;
  defaultCheckbox.addEventListener('change', async (evt) => {
    try {
      await sendToContent(tabId, 'toggle-overlay', { key: 'defaultContent', value: evt.target.checked });
    } finally {
      refresh();
    }
  });
  const defaultText = document.createElement('span');
  defaultText.className = 'control-text';
  defaultText.textContent = 'Default Content';
  defaultLabel.appendChild(defaultCheckbox);
  defaultLabel.appendChild(defaultText);
  defaultItem.appendChild(defaultLabel);
  overlayControls.appendChild(defaultItem);

  root.appendChild(overlayControls);

  // Reloadボタンを追加
  const reloadButton = document.createElement('button');
  reloadButton.className = 'eds-button eds-button--primary';
  reloadButton.textContent = 'Reload';
  reloadButton.style.cssText = 'width: 100%; margin-top: 16px; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--accent); color: #0b1220; cursor: pointer; font-weight: 600; font-size: 12px;';
  reloadButton.addEventListener('click', async () => {
    reloadButton.disabled = true;
    reloadButton.textContent = 'Reloading...';
    try {
      // ページをスクロールしてから再解析
      await sendToContent(tabId, 'scroll-page-for-lazy-load');
      await sendToContent(tabId, 'reanalyze');
      await refresh();
    } catch (err) {
      console.error('[EDS Inspector Panel] Error reloading:', err);
    } finally {
      reloadButton.disabled = false;
      reloadButton.textContent = 'Reload';
    }
  });
  root.appendChild(reloadButton);
}

