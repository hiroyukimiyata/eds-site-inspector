/**
 * ポップアップスクリプト
 */
(async () => {
  /**
   * エラーメッセージを表示
   */
  function showError(message) {
    const container = document.querySelector('.popup-container');
    if (container) {
      container.innerHTML = `<div class="popup-content"><p class="error-message">${message}</p></div>`;
    } else {
      document.body.innerHTML = `<div class="popup-container"><div class="popup-content"><p class="error-message">${message}</p></div></div>`;
    }
  }

  try {
    // 現在のタブを取得
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      console.error('[EDS Inspector Popup] No active tab found');
      showError('No active tab found');
      return;
    }

    // 無効なページをスキップ
    const url = tab.url || '';
    const invalidSchemes = ['chrome://', 'edge://', 'chrome-extension://', 'moz-extension://', 'about:', 'file://'];
    const isInvalidPage = invalidSchemes.some(scheme => url.startsWith(scheme));
    
    if (isInvalidPage) {
      showError('Cannot use on this page');
      return;
    }

    // DOMが読み込まれるまで待つ
    if (document.readyState === 'loading') {
      await new Promise(resolve => {
        document.addEventListener('DOMContentLoaded', resolve);
      });
    }

    // プラットフォームを検出してDevToolsのショートカットキーを表示
    try {
      const platformInfo = await chrome.runtime.getPlatformInfo();
      const devtoolsHint = document.getElementById('devtools-hint');
      if (devtoolsHint) {
        let shortcut = '';
        if (platformInfo.os === 'mac') {
          shortcut = 'Cmd+Option+I';
        } else {
          // Windows, Linux, etc.
          shortcut = 'F12 or Ctrl+Shift+I';
        }
        devtoolsHint.textContent = `Open DevTools for details (${shortcut})`;
      }
    } catch (err) {
      // プラットフォーム情報が取得できない場合はデフォルトのまま
      console.log('[EDS Inspector Popup] Could not get platform info:', err);
    }

    // チェックボックスの要素を取得
    const toggleAll = document.getElementById('toggle-all');
    const toggleSections = document.getElementById('toggle-sections');
    const toggleBlocks = document.getElementById('toggle-blocks');
    const toggleDefault = document.getElementById('toggle-default');

    if (!toggleAll || !toggleSections || !toggleBlocks || !toggleDefault) {
      console.error('[EDS Inspector Popup] Checkboxes not found');
      showError('UI elements not found');
      return;
    }

    // 初回表示時は無条件で全てチェック済みに設定（UIの応答性を向上）
    toggleAll.checked = true;
    toggleSections.checked = true;
    toggleBlocks.checked = true;
    toggleDefault.checked = true;

    // 現在の状態を取得
    let currentState = null;
    try {
      // コンテンツスクリプトが実行されているか確認
      currentState = await chrome.tabs.sendMessage(tab.id, { 
        target: 'eds-content', 
        type: 'state' 
      });
    } catch (e) {
      // コンテンツスクリプトが実行されていない場合は初期化を試みる
      console.log('[EDS Inspector Popup] Content script not running, initializing...');
      try {
        // CSSをインジェクト
        await chrome.scripting.insertCSS({ 
          target: { tabId: tab.id }, 
          files: ['content.css'] 
        });
        
        // JavaScriptをインジェクト
        await chrome.scripting.executeScript({ 
          target: { tabId: tab.id }, 
          files: ['content.js'] 
        });
        
        // スクリプトがロードされるまで待つ
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 初期化メッセージを送信
        await chrome.tabs.sendMessage(tab.id, { 
          target: 'eds-content', 
          type: 'init' 
        });
        
        // 初期化後に少し待ってから状態を取得（オーバーレイが構築されるまで）
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 状態を取得
        currentState = await chrome.tabs.sendMessage(tab.id, { 
          target: 'eds-content', 
          type: 'state' 
        });
        
        // オーバーレイが表示されていない場合は表示状態にする
        // initで既にtrueに設定されているはずだが、確実に表示されるようにする
        if (!currentState || !currentState.overlaysVisible) {
          console.log('[EDS Inspector Popup] Ensuring overlays are visible');
          // まず確実に表示状態にする
          await chrome.tabs.sendMessage(tab.id, {
            target: 'eds-content',
            type: 'set-overlays-visible',
            payload: { visible: true }
          });
          // 状態を再取得
          currentState = await chrome.tabs.sendMessage(tab.id, { 
            target: 'eds-content', 
            type: 'state' 
          });
        }
        
        // refresh-overlaysは呼ばない（init内で既に呼ばれているため、ブリンクを防ぐ）
      } catch (initErr) {
        console.error('[EDS Inspector Popup] Failed to initialize:', initErr);
        showError('Initialization failed: ' + initErr.message);
        return;
      }
    }

    // 状態を取得したら、チェックボックスの状態を更新（初回は既にtrueに設定済み）
    if (currentState && currentState.overlaysEnabled) {
      const { sections, blocks, defaultContent } = currentState.overlaysEnabled;
      // 状態が取得できた場合のみ更新（undefinedの場合は既存の値（true）を維持）
      if (sections !== undefined) toggleSections.checked = sections;
      if (blocks !== undefined) toggleBlocks.checked = blocks;
      if (defaultContent !== undefined) toggleDefault.checked = defaultContent;
      
      // すべてのオーバーレイが有効な場合、toggleAllをチェック
      toggleAll.checked = sections && blocks && defaultContent;
      
      // ポップアップが開かれたときにオーバーレイを表示状態にする
      if (!currentState.overlaysVisible) {
        chrome.tabs.sendMessage(tab.id, {
          target: 'eds-content',
          type: 'set-overlays-visible',
          payload: { visible: true }
        }).catch(err => {
          // エラーは無視
        });
      }
    }
    // 状態が取得できない場合は、既にtrueに設定されているのでそのまま

    // チェックボックスの変更イベントを設定（それぞれ独立して動作）
    // チェックボックスの状態は即座に反映され、その後でメッセージを送信（キビキビ動くように）
    toggleAll.addEventListener('change', () => {
      const allEnabled = toggleAll.checked;
      // すべてのチェックボックスを同期
      toggleSections.checked = allEnabled;
      toggleBlocks.checked = allEnabled;
      toggleDefault.checked = allEnabled;
      // すべてのオーバーレイを一括で更新
      toggleAllOverlays(allEnabled);
    });

    toggleSections.addEventListener('change', () => {
      // チェックボックスの状態は既に更新されているので、即座にメッセージを送信
      updateOverlayState('sections', toggleSections.checked);
      // toggleAllの状態を更新
      updateToggleAllState();
    });

    toggleBlocks.addEventListener('change', () => {
      updateOverlayState('blocks', toggleBlocks.checked);
      updateToggleAllState();
    });

    toggleDefault.addEventListener('change', () => {
      updateOverlayState('defaultContent', toggleDefault.checked);
      updateToggleAllState();
    });
    
    /**
     * toggleAllの状態を更新（個別のチェックボックスが変更されたとき）
     */
    function updateToggleAllState() {
      toggleAll.checked = toggleSections.checked && toggleBlocks.checked && toggleDefault.checked;
    }
    
    /**
     * すべてのオーバーレイを一括でOn/Off
     */
    function toggleAllOverlays(enabled) {
      // 非同期処理はバックグラウンドで実行（awaitしない）
      Promise.all([
        chrome.tabs.sendMessage(tab.id, {
          target: 'eds-content',
          type: 'toggle-overlay',
          payload: { key: 'sections', value: enabled }
        }),
        chrome.tabs.sendMessage(tab.id, {
          target: 'eds-content',
          type: 'toggle-overlay',
          payload: { key: 'blocks', value: enabled }
        }),
        chrome.tabs.sendMessage(tab.id, {
          target: 'eds-content',
          type: 'toggle-overlay',
          payload: { key: 'defaultContent', value: enabled }
        })
      ]).then(() => {
        // chrome.storageに状態を保存（DevToolsパネルとの同期のため）
        chrome.storage.local.set({
          'eds-overlays-enabled': {
            sections: enabled,
            blocks: enabled,
            defaultContent: enabled
          }
        }).catch(err => {
          console.error('[EDS Inspector Popup] Failed to save overlay state:', err);
        });
      }).catch(err => {
        console.error('[EDS Inspector Popup] Failed to toggle all overlays:', err);
      });
    }

    /**
     * オーバーレイの状態を更新（独立して制御）
     * 非同期処理はバックグラウンドで実行し、UIの応答性を保つ
     */
    function updateOverlayState(key, value) {
      // 非同期処理はバックグラウンドで実行（awaitしない）
      chrome.tabs.sendMessage(tab.id, {
        target: 'eds-content',
        type: 'toggle-overlay',
        payload: { key, value }
      }).then(response => {
        // chrome.storageに状態を保存（DevToolsパネルとの同期のため）
        if (response && response.overlaysEnabled) {
          chrome.storage.local.set({
            'eds-overlays-enabled': response.overlaysEnabled
          }).catch(err => {
            console.error('[EDS Inspector Popup] Failed to save overlay state:', err);
          });
        }
      }).catch(err => {
        console.error('[EDS Inspector Popup] Failed to update overlay state:', err);
      });
    }

    // ポップアップが非表示になったときにオーバーレイを非表示にする
    // ただし、DevToolsパネルが開いている場合は非表示にしない
    window.addEventListener('blur', () => {
      chrome.storage.local.get('eds-devtools-open').then(result => {
        // DevToolsパネルが開いていない場合のみオーバーレイを非表示にする
        if (!result['eds-devtools-open']) {
          chrome.tabs.sendMessage(tab.id, {
            target: 'eds-content',
            type: 'set-overlays-visible',
            payload: { visible: false }
          }).catch(err => {
            // エラーは無視（タブが閉じられている可能性がある）
          });
        }
      }).catch(err => {
        // エラーが発生した場合は、念のため非表示にする
        chrome.tabs.sendMessage(tab.id, {
          target: 'eds-content',
          type: 'set-overlays-visible',
          payload: { visible: false }
        }).catch(() => {
          // エラーは無視
        });
      });
    });

    // visibilitychangeイベントでも検出（より確実）
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        chrome.storage.local.get('eds-devtools-open').then(result => {
          // DevToolsパネルが開いていない場合のみオーバーレイを非表示にする
          if (!result['eds-devtools-open']) {
            chrome.tabs.sendMessage(tab.id, {
              target: 'eds-content',
              type: 'set-overlays-visible',
              payload: { visible: false }
            }).catch(err => {
              // エラーは無視
            });
          }
        }).catch(err => {
          // エラーが発生した場合は、念のため非表示にする
          chrome.tabs.sendMessage(tab.id, {
            target: 'eds-content',
            type: 'set-overlays-visible',
            payload: { visible: false }
          }).catch(() => {
            // エラーは無視
          });
        });
      }
    });

    // chrome.storageの変更を監視（DevToolsパネルで変更された場合の同期）
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes['eds-overlays-enabled']) {
        const newValue = changes['eds-overlays-enabled'].newValue;
        if (newValue) {
          const { sections, blocks, defaultContent } = newValue;
          if (sections !== undefined) toggleSections.checked = sections;
          if (blocks !== undefined) toggleBlocks.checked = blocks;
          if (defaultContent !== undefined) toggleDefault.checked = defaultContent;
          // toggleAllの状態を更新
          toggleAll.checked = sections && blocks && defaultContent;
        }
      }
    });
  } catch (err) {
    console.error('[EDS Inspector Popup] Unexpected error:', err);
    showError('Unexpected error: ' + err.message);
  }
})();

