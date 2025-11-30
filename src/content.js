/**
 * EDS Site Inspector Content Script
 * メインエントリーポイント
 */
import { attachGlobalListeners } from './content/overlay/manager.js';
import { setupAutoUpdate } from './content/utils/auto-update.js';
import { handleMessage } from './content/message-handler.js';
import { setupJsonInterceptor } from './content/collectors/json.js';
import { state } from './content/state.js';
import { init } from './content/analyzer.js';

(() => {
  // 既に実行されている場合でも、メッセージリスナーが動作するようにする
  const isAlreadyInitialized = window.__edsInspectorInitialized;
  if (isAlreadyInitialized) {
    console.warn('[EDS Inspector Content] Script already initialized, but message listener should still work.');
  } else {
    window.__edsInspectorInitialized = true;
  }
  
  // メッセージリスナーが既に設定されているか確認
  if (window.__edsInspectorMessageListenerAttached) {
    console.log('[EDS Inspector Content] Message listener already attached, skipping re-initialization.');
    // メッセージリスナーは既に設定されているので、早期リターン
    return;
  }

  // JSONインターセプターをセットアップ（できるだけ早く実行）
  setupJsonInterceptor();
  console.log('[EDS Inspector Content] JSON interceptor setup');

  // グローバルリスナーをアタッチ
  attachGlobalListeners();
  console.log('[EDS Inspector Content] Global listeners attached');

  // 自動更新を設定
  setupAutoUpdate();
  console.log('[EDS Inspector Content] Auto-update setup');

  // メッセージリスナーを設定（既に実行されている場合でも）
  if (!window.__edsInspectorMessageListenerAttached) {
    window.__edsInspectorMessageListenerAttached = true;
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      handleMessage(message, sender, sendResponse);
      return true; // 非同期処理のためtrueを返す
    });
    console.log('[EDS Inspector Content] Message listener attached');
  } else {
    console.log('[EDS Inspector Content] Message listener already attached, skipping');
  }
  
  // Detect page navigation and automatically reload
  setupPageNavigationDetection();
  
  console.log('[EDS Inspector Content] Script loaded and message listener attached');
})();

/**
 * Detect page navigation and automatically reload
 */
function setupPageNavigationDetection() {
  // Record current URL
  let currentUrl = window.location.href;
  
  // Monitor popstate event (browser back/forward buttons)
  window.addEventListener('popstate', () => {
    const newUrl = window.location.href;
    if (newUrl !== currentUrl) {
      console.log('[EDS Inspector Content] Page navigation detected (popstate):', newUrl);
      currentUrl = newUrl;
      handlePageNavigation();
    }
  });
  
  // Monitor pushState/replaceState (SPA page navigation)
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  
  history.pushState = function(...args) {
    originalPushState.apply(history, args);
    const newUrl = window.location.href;
    if (newUrl !== currentUrl) {
      console.log('[EDS Inspector Content] Page navigation detected (pushState):', newUrl);
      currentUrl = newUrl;
      handlePageNavigation();
    }
  };
  
  history.replaceState = function(...args) {
    originalReplaceState.apply(history, args);
    const newUrl = window.location.href;
    if (newUrl !== currentUrl) {
      console.log('[EDS Inspector Content] Page navigation detected (replaceState):', newUrl);
      currentUrl = newUrl;
      handlePageNavigation();
    }
  };
  
  // Monitor link clicks (SPA page navigation)
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link && link.href && link.href !== currentUrl) {
      // Check if link is within the same domain
      try {
        const linkUrl = new URL(link.href);
        const currentUrlObj = new URL(currentUrl);
        if (linkUrl.origin === currentUrlObj.origin && linkUrl.pathname !== currentUrlObj.pathname) {
          // Delay check slightly (wait for SPA navigation to complete)
          setTimeout(() => {
            const newUrl = window.location.href;
            if (newUrl !== currentUrl) {
              console.log('[EDS Inspector Content] Page navigation detected (link click):', newUrl);
              currentUrl = newUrl;
              handlePageNavigation();
            }
          }, 500);
        }
      } catch (e) {
        // Ignore URL parsing errors
      }
    }
  }, true);
  
  console.log('[EDS Inspector Content] Page navigation detection setup complete');
}

/**
 * Handle page navigation
 */
async function handlePageNavigation() {
  // オーバーレイが表示されている場合（ポップアップまたはDevToolsが開いている）のみリロード
  try {
    // ポップアップまたはDevToolsが開いているかどうかを確認
    const extensionAvailable = await checkExtensionAvailable();
    
    if (!extensionAvailable) {
      console.log('[EDS Inspector Content] Extension not available, skipping auto-reload');
      return;
    }
    
    // オーバーレイが表示されている場合のみリロード
    if (!state.overlaysVisible) {
      console.log('[EDS Inspector Content] Overlays not visible, skipping auto-reload');
      return;
    }
    
    // Reset state
    state.isAnalyzed = false;
    
    // Automatically re-analyze
    console.log('[EDS Inspector Content] Auto-reloading after page navigation...');
    
    // Wait a bit before executing (until DOM is updated)
    setTimeout(async () => {
      try {
        await init();
        console.log('[EDS Inspector Content] Auto-reload complete after page navigation');
      } catch (err) {
        console.error('[EDS Inspector Content] Error during auto-reload:', err);
      }
    }, 1000);
  } catch (err) {
    console.error('[EDS Inspector Content] Error handling page navigation:', err);
  }
}
