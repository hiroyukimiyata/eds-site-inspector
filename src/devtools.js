console.log('[EDS Inspector DevTools] DevTools script loaded');

try {
  chrome.devtools.panels.create('EDS Site Inspector', '', 'panel.html', (panel) => {
    if (chrome.runtime.lastError) {
      console.error('[EDS Inspector DevTools] Failed to create panel:', chrome.runtime.lastError.message);
      return;
    }
    console.log('[EDS Inspector DevTools] Panel created successfully:', panel);
    
    panel.onShown.addListener((window) => {
      console.log('[EDS Inspector DevTools] Panel shown, window:', window);
      if (window && window.initializePanel) {
        console.log('[EDS Inspector DevTools] Calling initializePanel...');
        window.initializePanel();
      } else {
        console.warn('[EDS Inspector DevTools] initializePanel function not found on window');
      }
    });
    
    panel.onHidden.addListener(() => {
      console.log('[EDS Inspector DevTools] Panel hidden');
      // DevToolsパネルが閉じられたとき、オーバーレイを非表示にする
      // 現在のタブIDを取得して、content scriptにメッセージを送信
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs.length > 0) {
          const tabId = tabs[0].id;
          chrome.tabs.sendMessage(tabId, {
            target: 'eds-content',
            type: 'set-overlays-visible',
            payload: { visible: false }
          }).catch(err => {
            // エラーは無視（タブが閉じられている可能性がある）
            console.log('[EDS Inspector DevTools] Failed to hide overlays:', err);
          });
        }
      });
    });
  });
} catch (err) {
  console.error('[EDS Inspector DevTools] Error creating panel:', err);
}
