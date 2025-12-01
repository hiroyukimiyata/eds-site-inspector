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

  // Show All Overlays チェックボックス
  const allItem = document.createElement('div');
  allItem.className = 'control-item control-item--all';
  const allLabel = document.createElement('label');
  allLabel.className = 'control-label';
  const allCheckbox = document.createElement('input');
  allCheckbox.type = 'checkbox';
  allCheckbox.id = 'control-toggle-all';
  allCheckbox.className = 'control-checkbox control-checkbox--all';
  const allEnabled = state.overlaysEnabled?.sections && 
                     state.overlaysEnabled?.blocks && 
                     state.overlaysEnabled?.defaultContent;
  allCheckbox.checked = allEnabled ?? true;
  allCheckbox.addEventListener('change', async (evt) => {
    const enabled = evt.target.checked;
    try {
      // すべてのオーバーレイを一括で更新
      await Promise.all([
        sendToContent(tabId, 'toggle-overlay', { key: 'sections', value: enabled }),
        sendToContent(tabId, 'toggle-overlay', { key: 'blocks', value: enabled }),
        sendToContent(tabId, 'toggle-overlay', { key: 'defaultContent', value: enabled })
      ]);
      
      // 個別のチェックボックスも更新
      const sectionsCheckbox = document.getElementById('control-toggle-sections');
      const blocksCheckbox = document.getElementById('control-toggle-blocks');
      const defaultCheckbox = document.getElementById('control-toggle-default');
      if (sectionsCheckbox) sectionsCheckbox.checked = enabled;
      if (blocksCheckbox) blocksCheckbox.checked = enabled;
      if (defaultCheckbox) defaultCheckbox.checked = enabled;
      
      // chrome.storageに状態を保存（ポップアップとの同期のため）
      const state = await sendToContent(tabId, 'state');
      if (state && state.overlaysEnabled) {
        chrome.storage.local.set({
          'eds-overlays-enabled': state.overlaysEnabled
        }).catch(err => {
          console.error('[EDS Inspector Panel] Failed to save overlay state:', err);
        });
      }
    } finally {
      refresh();
    }
  });
  const allText = document.createElement('span');
  allText.className = 'control-text control-text--all';
  allText.textContent = 'Show All Overlays';
  allLabel.appendChild(allCheckbox);
  allLabel.appendChild(allText);
  allItem.appendChild(allLabel);
  overlayControls.appendChild(allItem);

  // 区切り線
  const divider = document.createElement('div');
  divider.className = 'control-divider';
  overlayControls.appendChild(divider);

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
      // toggleAllの状態を更新
      updateToggleAllState();
      // chrome.storageに状態を保存（ポップアップとの同期のため）
      const state = await sendToContent(tabId, 'state');
      if (state && state.overlaysEnabled) {
        chrome.storage.local.set({
          'eds-overlays-enabled': state.overlaysEnabled
        }).catch(err => {
          console.error('[EDS Inspector Panel] Failed to save overlay state:', err);
        });
      }
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
      // toggleAllの状態を更新
      updateToggleAllState();
      // chrome.storageに状態を保存（ポップアップとの同期のため）
      const state = await sendToContent(tabId, 'state');
      if (state && state.overlaysEnabled) {
        chrome.storage.local.set({
          'eds-overlays-enabled': state.overlaysEnabled
        }).catch(err => {
          console.error('[EDS Inspector Panel] Failed to save overlay state:', err);
        });
      }
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
      // toggleAllの状態を更新
      updateToggleAllState();
      // chrome.storageに状態を保存（ポップアップとの同期のため）
      const state = await sendToContent(tabId, 'state');
      if (state && state.overlaysEnabled) {
        chrome.storage.local.set({
          'eds-overlays-enabled': state.overlaysEnabled
        }).catch(err => {
          console.error('[EDS Inspector Panel] Failed to save overlay state:', err);
        });
      }
    } finally {
      refresh();
    }
  });
  
  /**
   * toggleAllの状態を更新（個別のチェックボックスが変更されたとき）
   */
  function updateToggleAllState() {
    const sectionsCheckbox = document.getElementById('control-toggle-sections');
    const blocksCheckbox = document.getElementById('control-toggle-blocks');
    const defaultCheckbox = document.getElementById('control-toggle-default');
    if (sectionsCheckbox && blocksCheckbox && defaultCheckbox && allCheckbox) {
      allCheckbox.checked = sectionsCheckbox.checked && blocksCheckbox.checked && defaultCheckbox.checked;
    }
  }
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

