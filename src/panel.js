/**
 * EDS Site Inspector Panel
 * メインエントリーポイント
 */
import { sendToContent, ensureContentInjected } from './panel/utils.js';
import { renderDocs } from './panel/renderers/docs.js';
import { renderControl } from './panel/renderers/control.js';
import { renderBlocks } from './panel/renderers/blocks.js';
import { renderIcons } from './panel/renderers/icons.js';
import { renderCode } from './panel/renderers/code.js';
import { renderMedia } from './panel/renderers/media.js';
import { renderBlockDetail } from './panel/renderers/block-detail.js';

const tabId = chrome.devtools.inspectedWindow.tabId;
console.log('[EDS Inspector Panel] Tab ID:', tabId);

// sendToContentとensureContentInjectedをラップ（tabIdを自動的に渡す）
const sendToContentWithTabId = (type, payload) => sendToContent(tabId, type, payload);
const ensureContentInjectedWithTabId = () => ensureContentInjected(tabId);

/**
 * タブを切り替え
 */
function switchTab(tab) {
  document.querySelectorAll('.eds-tabs button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  document.querySelectorAll('[data-tab-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.tabPanel !== tab;
  });
  
  // Docsタブが選択されたときだけrenderDocsを呼ぶ
  if (tab === 'docs') {
    renderDocs(tabId);
  }
}

/**
 * タブのイベントリスナーをバインド
 */
function bindTabs() {
  document.querySelectorAll('.eds-tabs button').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

let autoUpdateInterval = null;
let isUpdating = false;

/**
 * パネルをハイドレート（状態を取得してUIを更新）
 */
async function hydratePanels() {
  if (isUpdating) {
    console.log('[EDS Inspector Panel] Already updating, skipping...');
    return;
  }
  
  try {
    isUpdating = true;
    console.log('[EDS Inspector Panel] Fetching state from content script...');
    const state = await sendToContentWithTabId('state');
    console.log('[EDS Inspector Panel] State received:', state);
    if (!state) {
      throw new Error('No state received from content script');
    }
    renderControl(state, hydratePanels, tabId);
    if (state.selectedBlock) {
      const detail = await sendToContentWithTabId('get-block-detail', { id: state.selectedBlock });
      renderBlockDetail(state, detail, hydratePanels, tabId);
    } else {
      renderBlocks(state, hydratePanels, tabId);
    }
    renderIcons(state);
    renderCode(state);
    renderMedia(state);
    // renderDocs()はタブ切り替え時のみ呼ぶ（自動更新では呼ばない）
  } catch (err) {
    console.error('[EDS Inspector Panel] Error hydrating panels:', err);
    // エラーメッセージを表示
    const controlPanel = document.querySelector('[data-tab-panel="control"]');
    if (controlPanel) {
      controlPanel.innerHTML = `
        <div class="eds-error" style="padding: 20px; color: #d32f2f;">
          <h3>Error: Failed to communicate with content script</h3>
          <p>${err.message}</p>
          <p>Please make sure:</p>
          <ul>
            <li>The page is fully loaded</li>
            <li>You're on a valid web page (not chrome:// or extension://)</li>
            <li>Try refreshing the page</li>
          </ul>
        </div>
      `;
    }
    throw err;
  } finally {
    isUpdating = false;
  }
}

/**
 * 自動更新を開始
 */
function startAutoUpdate() {
  // 既存のインターバルをクリア
  if (autoUpdateInterval) {
    clearInterval(autoUpdateInterval);
  }
  
  // 2秒ごとに状態を更新
  autoUpdateInterval = setInterval(async () => {
    try {
      await hydratePanels();
    } catch (err) {
      console.error('[EDS Inspector Panel] Error in auto-update:', err);
    }
  }, 2000);
  
  console.log('[EDS Inspector Panel] Auto-update started');
}

/**
 * 自動更新を停止
 */
function stopAutoUpdate() {
  if (autoUpdateInterval) {
    clearInterval(autoUpdateInterval);
    autoUpdateInterval = null;
    console.log('[EDS Inspector Panel] Auto-update stopped');
  }
}

/**
 * パネルを初期化
 */
async function initializePanel() {
  console.log('[EDS Inspector Panel] Initializing panel...');
  const controlPanel = document.querySelector('[data-tab-panel="control"]');
  
  try {
    // ローディングメッセージを表示
    if (controlPanel) {
      controlPanel.innerHTML = '<div class="eds-loading" style="padding: 20px;">Initializing EDS Site Inspector...</div>';
    }
    
    bindTabs();
    switchTab('control');
    console.log('[EDS Inspector Panel] Ensuring content script is injected...');
    
    try {
      await ensureContentInjectedWithTabId();
      console.log('[EDS Inspector Panel] Content script injection ensured');
    } catch (injectErr) {
      console.error('[EDS Inspector Panel] Failed to inject content script:', injectErr);
      if (controlPanel) {
        const errorMessage = injectErr.message || 'Unknown error';
        const isConnectionError = errorMessage.includes('Could not establish connection') || 
                                  errorMessage.includes('Receiving end does not exist');
        
        controlPanel.innerHTML = `
          <div class="eds-error" style="padding: 20px; color: #d32f2f; line-height: 1.6;">
            <h3 style="margin-top: 0;">Error: Failed to inject content script</h3>
            <p><strong>${errorMessage}</strong></p>
            ${isConnectionError ? `
              <p>This error usually means the extension's service worker is not running.</p>
              <h4>Please try the following steps:</h4>
              <ol style="margin-left: 20px;">
                <li>Go to <code>chrome://extensions/</code></li>
                <li>Find "EDS Site Inspector" extension</li>
                <li>Click the <strong>"Reload"</strong> button (🔄) to restart the service worker</li>
                <li>Click the <strong>"Service worker"</strong> link to verify it's running</li>
                <li>Refresh this page (F5)</li>
                <li>Reopen this DevTools panel</li>
              </ol>
            ` : `
              <p>Please try:</p>
              <ul style="margin-left: 20px;">
                <li>Refreshing the page (F5)</li>
                <li>Reloading the extension from chrome://extensions/</li>
              </ul>
            `}
          </div>
        `;
      }
      // エラーを再スローして、後続の処理を停止
      throw injectErr;
    }
    
    // コンテンツスクリプトがロードされるまで少し待つ
    await new Promise((resolve) => setTimeout(resolve, 200));
    
    try {
      console.log('[EDS Inspector Panel] Sending init message to content script...');
      await sendToContentWithTabId('init');
      console.log('[EDS Inspector Panel] Init message sent successfully');
    } catch (e) {
      console.warn('[EDS Inspector Panel] Init message failed, retrying...', e);
      // if content not ready yet, retry once
      await new Promise((resolve) => setTimeout(resolve, 300));
      try {
        await sendToContentWithTabId('init');
        console.log('[EDS Inspector Panel] Init message sent successfully after retry');
      } catch (retryErr) {
        console.error('[EDS Inspector Panel] Init message failed after retry:', retryErr);
        if (controlPanel) {
          controlPanel.innerHTML = `
            <div class="eds-error" style="padding: 20px; color: #d32f2f;">
              <h3>Error: Failed to initialize content script</h3>
              <p>${retryErr.message}</p>
              <p>The content script may not be loaded. Please try:</p>
              <ul>
                <li>Refreshing the page</li>
                <li>Checking the page console for errors</li>
              </ul>
            </div>
          `;
        }
        throw retryErr;
      }
    }
    
    console.log('[EDS Inspector Panel] Hydrating panels...');
    await hydratePanels();
    console.log('[EDS Inspector Panel] Panel initialization complete');
    
    // 自動更新を開始（2秒ごとに状態を取得してUIを更新）
    startAutoUpdate();
  } catch (err) {
    console.error('[EDS Inspector Panel] Error initializing panel:', err);
    if (controlPanel && !controlPanel.querySelector('.eds-error')) {
      controlPanel.innerHTML = `
        <div class="eds-error" style="padding: 20px; color: #d32f2f;">
          <h3>Error: Failed to initialize panel</h3>
          <p>${err.message}</p>
          <p>Check the console for more details.</p>
        </div>
      `;
    }
  }
}

console.log('[EDS Inspector Panel] Panel script loaded');
window.initializePanel = initializePanel;
