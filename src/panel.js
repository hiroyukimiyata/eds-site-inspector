/**
 * EDS Site Inspector Panel
 * メインエントリーポイント
 */
import { sendToContent, ensureContentInjected } from './panel/utils.js';
import { renderDocs } from './panel/renderers/docs.js';
import { renderControl } from './panel/renderers/control.js';
import { renderBlocks } from './panel/renderers/blocks.js';
import { renderIcons } from './panel/renderers/icons.js';
import { renderScripts } from './panel/renderers/code.js';
import { renderMedia } from './panel/renderers/media.js';
import { renderJson } from './panel/renderers/json.js';
import { renderBlockDetail } from './panel/renderers/block-detail.js';
import { renderExplore } from './panel/renderers/explore.js';

const tabId = chrome.devtools.inspectedWindow.tabId;
console.log('[EDS Inspector Panel] Tab ID:', tabId);

// sendToContentとensureContentInjectedをラップ（tabIdを自動的に渡す）
const sendToContentWithTabId = (type, payload) => sendToContent(tabId, type, payload);
const ensureContentInjectedWithTabId = () => ensureContentInjected(tabId);

/**
 * 選択されたタブを保存
 */
function saveSelectedTab(tab) {
  try {
    sessionStorage.setItem('eds-selected-tab', tab);
  } catch (err) {
    console.warn('[EDS Inspector Panel] Failed to save selected tab:', err);
  }
}

/**
 * 選択されたタブを取得
 */
function getSelectedTab() {
  try {
    return sessionStorage.getItem('eds-selected-tab') || 'control';
  } catch (err) {
    console.warn('[EDS Inspector Panel] Failed to get selected tab:', err);
    return 'control';
  }
}

/**
 * タブを切り替え
 */
async function switchTab(tab) {
  document.querySelectorAll('.eds-tabs button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  document.querySelectorAll('[data-tab-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.tabPanel !== tab;
  });
  
  // 選択されたタブを保存
  saveSelectedTab(tab);
  
  // Docsタブが選択されたときだけrenderDocsを呼ぶ
  if (tab === 'docs') {
    renderDocs(tabId);
  }
  
  // JSONタブが選択されたときだけrenderJsonを呼ぶ
  if (tab === 'json') {
    try {
      const state = await sendToContentWithTabId('state');
      if (state) {
        renderJson(state);
      }
    } catch (err) {
      console.error('[EDS Inspector Panel] Error loading JSON tab:', err);
    }
  }
  
  // Scriptsタブが選択されたときだけrenderScriptsを呼ぶ
  if (tab === 'code') {
    try {
      const state = await sendToContentWithTabId('state');
      if (state) {
        renderScripts(state);
      }
    } catch (err) {
      console.error('[EDS Inspector Panel] Error loading Scripts tab:', err);
    }
  }
  
  // Exploreタブが選択されたときだけrenderExploreを呼ぶ
  if (tab === 'explore') {
    renderExplore();
  }
}

/**
 * タブのイベントリスナーをバインド
 */
function bindTabs() {
  document.querySelectorAll('.eds-tabs button').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await switchTab(btn.dataset.tab);
    });
  });
}

let isUpdating = false;

/**
 * ローディング状態を設定
 */
function setLoading(loading) {
  const tabs = document.querySelectorAll('.eds-tabs button');
  tabs.forEach(btn => {
    btn.disabled = loading;
    if (loading) {
      btn.style.opacity = '0.5';
      btn.style.cursor = 'not-allowed';
    } else {
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
    }
  });
  
  // ローディング表示
  const main = document.querySelector('main');
  if (loading) {
    const existingLoading = main.querySelector('.eds-loading-overlay');
    if (!existingLoading) {
      const loadingOverlay = document.createElement('div');
      loadingOverlay.className = 'eds-loading-overlay';
      loadingOverlay.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(11, 18, 32, 0.8); display: flex; align-items: center; justify-content: center; z-index: 1000;';
      loadingOverlay.innerHTML = '<div class="eds-loading" style="padding: 20px; text-align: center;">Loading...</div>';
      main.style.position = 'relative';
      main.appendChild(loadingOverlay);
    }
  } else {
    const existingLoading = main.querySelector('.eds-loading-overlay');
    if (existingLoading) {
      existingLoading.remove();
    }
  }
}

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
    setLoading(true);
    console.log('[EDS Inspector Panel] Fetching state from content script...');
    const state = await sendToContentWithTabId('state');
    console.log('[EDS Inspector Panel] State received:', state);
    if (!state) {
      throw new Error('No state received from content script');
    }
    
    // DevToolsパネルが開かれたときは、オーバーレイを確実に表示状態にする
    if (!state.overlaysVisible) {
      console.log('[EDS Inspector Panel] Overlays not visible, ensuring visibility...');
      await sendToContentWithTabId('set-overlays-visible', { visible: true });
      // 状態を再取得
      const updatedState = await sendToContentWithTabId('state');
      if (updatedState) {
        Object.assign(state, updatedState);
      }
    }
    
    renderControl(state, hydratePanels, tabId);
    if (state.selectedBlock) {
      const detail = await sendToContentWithTabId('get-block-detail', { id: state.selectedBlock });
      renderBlockDetail(state, detail, hydratePanels, tabId);
    } else {
      renderBlocks(state, hydratePanels, tabId);
    }
    renderIcons(state);
    renderScripts(state);
    renderMedia(state);
    renderJson(state);
    // renderDocs()はタブ切り替え時のみ呼ぶ
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
    setLoading(false);
  }
}

/**
 * ページをスクロールしてLazy Loadをトリガーしてから解析を開始
 */
async function scrollAndAnalyze() {
  console.log('[EDS Inspector Panel] Scrolling page for lazy load...');
  // ページを下までスクロールしてから上に戻す
  await sendToContentWithTabId('scroll-page-for-lazy-load');
  console.log('[EDS Inspector Panel] Page scroll complete, initializing...');
  // スクロール完了後に初期化
  await sendToContentWithTabId('init');
}

/**
 * パネルを初期化
 */
async function initializePanel() {
    console.log('[EDS Inspector Panel] Initializing panel...');
    const controlPanel = document.querySelector('[data-tab-panel="control"]');
    
    // DevToolsパネルが開いていることをchrome.storageに記録
    chrome.storage.local.set({
      'eds-devtools-open': true
    }).catch(err => {
      console.error('[EDS Inspector Panel] Failed to set devtools-open flag:', err);
    });
    
    try {
      // ローディング状態を設定
      setLoading(true);
    
    // ローディングメッセージを表示
    if (controlPanel) {
      controlPanel.innerHTML = '<div class="eds-loading" style="padding: 20px;">Initializing EDS Site Inspector...</div>';
    }
    
    bindTabs();
    // 保存されたタブを復元、なければ'control'をデフォルトとして使用
    const savedTab = getSelectedTab();
    await switchTab(savedTab);
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
    
    // 既に解析済みかどうかを確認
    let isAlreadyAnalyzed = false;
    try {
      const currentState = await sendToContentWithTabId('state');
      if (currentState && currentState.isAnalyzed) {
        isAlreadyAnalyzed = true;
        console.log('[EDS Inspector Panel] Already analyzed, skipping initialization');
        // 解析済みでも、オーバーレイが非表示の場合は表示状態にする
        if (!currentState.overlaysVisible) {
          console.log('[EDS Inspector Panel] Overlays not visible, ensuring visibility...');
          await sendToContentWithTabId('set-overlays-visible', { visible: true });
        }
      }
    } catch (e) {
      console.log('[EDS Inspector Panel] Could not check state, will initialize:', e);
    }
    
    // 解析済みでない場合のみ初期化を実行
    if (!isAlreadyAnalyzed) {
      try {
        console.log('[EDS Inspector Panel] Scrolling page and initializing...');
        await scrollAndAnalyze();
        console.log('[EDS Inspector Panel] Initialization complete');
      } catch (e) {
        console.warn('[EDS Inspector Panel] Init message failed, retrying...', e);
        // if content not ready yet, retry once
        await new Promise((resolve) => setTimeout(resolve, 300));
        try {
          await scrollAndAnalyze();
          console.log('[EDS Inspector Panel] Initialization complete after retry');
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
    } else {
      console.log('[EDS Inspector Panel] Skipping initialization, already analyzed');
    }
    
    console.log('[EDS Inspector Panel] Hydrating panels...');
    await hydratePanels();
    console.log('[EDS Inspector Panel] Panel initialization complete');
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
  } finally {
    setLoading(false);
  }
}

/**
 * Show loading indicator
 */
function showReloadingIndicator() {
  // Remove existing indicator
  const existing = document.querySelector('.eds-reloading-indicator');
  if (existing) {
    existing.remove();
  }
  
  const indicator = document.createElement('div');
  indicator.className = 'eds-reloading-indicator';
  indicator.innerHTML = `
    <div class="eds-reloading-indicator__content">
      <div class="eds-reloading-indicator__spinner"></div>
      <span class="eds-reloading-indicator__text">Reloading page...</span>
    </div>
  `;
  
  // Add to the beginning of main element
  const main = document.querySelector('main');
  if (main) {
    main.insertBefore(indicator, main.firstChild);
  }
}

/**
 * Hide loading indicator
 */
function hideReloadingIndicator() {
  const indicator = document.querySelector('.eds-reloading-indicator');
  if (indicator) {
    indicator.remove();
  }
}

console.log('[EDS Inspector Panel] Panel script loaded');
window.initializePanel = initializePanel;

// chrome.storageの変更を監視（ポップアップで変更された場合の同期）
// 一度だけ設定するため、グローバルスコープで設定
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes['eds-overlays-enabled']) {
    const newValue = changes['eds-overlays-enabled'].newValue;
    if (newValue) {
      // チェックボックスの状態を更新
      const sectionsCheckbox = document.getElementById('control-toggle-sections');
      const blocksCheckbox = document.getElementById('control-toggle-blocks');
      const defaultCheckbox = document.getElementById('control-toggle-default');
      if (sectionsCheckbox && newValue.sections !== undefined) {
        sectionsCheckbox.checked = newValue.sections;
      }
      if (blocksCheckbox && newValue.blocks !== undefined) {
        blocksCheckbox.checked = newValue.blocks;
      }
      if (defaultCheckbox && newValue.defaultContent !== undefined) {
        defaultCheckbox.checked = newValue.defaultContent;
      }
    }
  }
});

// Detect page navigation and automatically reload
if (chrome.devtools && chrome.devtools.network) {
  chrome.devtools.network.onNavigated.addListener(async (url) => {
    console.log('[EDS Inspector Panel] Page navigation detected:', url);
    // Show loading indicator
    showReloadingIndicator();
    
    // Automatically reload on page navigation
    try {
      await hydratePanels();
      console.log('[EDS Inspector Panel] Panels refreshed after page navigation');
    } catch (err) {
      console.error('[EDS Inspector Panel] Error refreshing panels after navigation:', err);
      // Retry initialization if error occurs
      try {
        await initializePanel();
      } catch (initErr) {
        console.error('[EDS Inspector Panel] Error re-initializing panel after navigation:', initErr);
      }
    } finally {
      // Hide loading indicator
      hideReloadingIndicator();
    }
  });
  console.log('[EDS Inspector Panel] Page navigation listener attached');
}
