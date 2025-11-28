console.log('[EDS Inspector] Background script loaded');

chrome.action.onClicked.addListener(async (tab) => {
  console.log('[EDS Inspector] Action clicked, tab:', tab);
  
  if (!tab.id) {
    console.error('[EDS Inspector] No tab ID available');
    return;
  }

  // 無効なページ（chrome://、edge://、chrome-extension://など）をスキップ
  const url = tab.url || '';
  const invalidSchemes = ['chrome://', 'edge://', 'chrome-extension://', 'moz-extension://', 'about:', 'file://'];
  const isInvalidPage = invalidSchemes.some(scheme => url.startsWith(scheme));
  
  if (isInvalidPage) {
    console.warn('[EDS Inspector] Cannot inject scripts on this page:', url);
    return;
  }

  try {
    console.log('[EDS Inspector] Starting injection for tab:', tab.id, 'URL:', url);
    
    // まず、既に実行されているかどうかを確認
    let scriptAlreadyRunning = false;
    try {
      const stateResponse = await chrome.tabs.sendMessage(tab.id, { target: 'eds-content', type: 'state' });
      if (stateResponse) {
        console.log('[EDS Inspector] Script already running, state:', stateResponse);
        scriptAlreadyRunning = true;
      }
    } catch (e) {
      // メッセージが届かない場合は、スクリプトが実行されていない
      console.log('[EDS Inspector] Script not running yet (state check failed):', e.message);
    }
    
    if (!scriptAlreadyRunning) {
      // CSSをインジェクト
      console.log('[EDS Inspector] Injecting CSS...');
      try {
        await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['content.css'] });
        console.log('[EDS Inspector] CSS injected successfully');
      } catch (cssErr) {
        console.warn('[EDS Inspector] CSS injection failed (may already be injected):', cssErr.message);
      }
      
      // JavaScriptをインジェクト
      console.log('[EDS Inspector] Injecting JavaScript...');
      try {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
        console.log('[EDS Inspector] JavaScript injected successfully');
        // スクリプトがロードされるまで少し待つ
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (jsErr) {
        console.warn('[EDS Inspector] JavaScript injection failed:', jsErr.message);
        // インジェクションに失敗した場合でも、メッセージを送信してみる
      }
    }
    
    // メッセージを送信して初期化（既に実行されている場合でも再初期化）
    console.log('[EDS Inspector] Sending init message...');
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { target: 'eds-content', type: 'init' });
      console.log('[EDS Inspector] Initialization complete, response:', response);
    } catch (msgErr) {
      console.error('[EDS Inspector] Failed to send init message:', msgErr);
      console.error('[EDS Inspector] This might mean content.js is not loaded or message listener is not attached');
      throw msgErr;
    }
    
    // オーバーレイの表示・非表示を切り替える
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { target: 'eds-content', type: 'toggle-overlays' });
      console.log('[EDS Inspector] Toggle overlays response:', response);
    } catch (e) {
      console.log('[EDS Inspector] Cannot toggle overlays (content script may not be ready):', e);
      // コンテンツスクリプトがまだ準備できていない場合は、初期化を試みる
      try {
        await chrome.tabs.sendMessage(tab.id, { target: 'eds-content', type: 'init' });
        // 初期化後に再度トグルを試みる
        setTimeout(async () => {
          try {
            await chrome.tabs.sendMessage(tab.id, { target: 'eds-content', type: 'toggle-overlays' });
          } catch (e2) {
            console.log('[EDS Inspector] Cannot toggle overlays after init:', e2);
          }
        }, 200);
      } catch (initErr) {
        console.log('[EDS Inspector] Cannot initialize content script:', initErr);
      }
    }
  } catch (err) {
    console.error('[EDS Inspector] Failed to inject scripts:', err);
    console.error('[EDS Inspector] Error details:', {
      message: err.message,
      stack: err.stack,
      tabId: tab.id,
      url: url
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[EDS Inspector] Message received:', message);
  
  if (message?.type === 'eds-init-devtools' && message.tabId) {
    (async () => {
      console.log('[EDS Inspector] Received eds-init-devtools message for tab:', message.tabId);
      try {
        // CSSをインジェクト
        try {
          await chrome.scripting.insertCSS({ target: { tabId: message.tabId }, files: ['content.css'] });
          console.log('[EDS Inspector] CSS injected via DevTools');
        } catch (cssErr) {
          console.warn('[EDS Inspector] CSS injection failed (may already be injected):', cssErr.message);
        }
        
        // JavaScriptをインジェクト
        await chrome.scripting.executeScript({ target: { tabId: message.tabId }, files: ['content.js'] });
        console.log('[EDS Inspector] JavaScript injected via DevTools');
        
        // スクリプトがロードされるまで少し待つ
        await new Promise((resolve) => setTimeout(resolve, 100));
        
        console.log('[EDS Inspector] Sending success response');
        sendResponse({ ok: true });
      } catch (err) {
        console.error('[EDS Inspector] Failed to inject via DevTools:', err);
        sendResponse({ ok: false, error: err.message });
      }
    })();
    
    // 非同期処理でsendResponseを呼ぶ場合はtrueを返す必要がある
    return true;
  }
  
  if (message?.type === 'eds-state-changed' && message?.target === 'eds-background') {
    // content scriptから状態変更の通知を受け取った場合
    // panelに通知する（ただし、panelはDevToolsのコンテキストで実行されるため、
    // 直接メッセージを送ることはできない。代わりに、panelが定期的に状態を取得する）
    console.log('[EDS Inspector] State changed notification received from content script');
    sendResponse({ ok: true });
    return false;
  }
  
  return false;
});
