/**
 * EDS Site Inspector Content Script
 * メインエントリーポイント
 */
import { attachGlobalListeners } from './content/overlay/manager.js';
import { setupAutoUpdate } from './content/utils/auto-update.js';
import { handleMessage } from './content/message-handler.js';
import { setupJsonInterceptor } from './content/collectors/json.js';

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
  
  console.log('[EDS Inspector Content] Script loaded and message listener attached');
})();
