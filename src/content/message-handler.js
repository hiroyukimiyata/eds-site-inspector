/**
 * メッセージハンドラー
 */
import { state } from './state.js';
import { analyzePage } from './analyzer.js';
import { loadCodeAndMedia } from './api/code-media.js';
import { serializeState } from './utils/serializer.js';
import { toggleOverlays, setHighlight, destroy } from './overlay/manager.js';
import { refreshOverlayPositions } from './overlay/manager.js';
import { formatHtmlSnippet } from './utils/dom.js';
import { getBlockAssets } from './api/block-assets.js';
import { enableAutoUpdate, disableAutoUpdate } from './utils/auto-update.js';
import { init } from './analyzer.js';

/**
 * 状態変更を通知
 */
export function notifyStateChanged() {
  // panelに状態が変更されたことを通知（background script経由）
  try {
    chrome.runtime.sendMessage({
      type: 'eds-state-changed',
      target: 'eds-background',
    }).catch(() => {
      // panelが開いていない場合は無視
    });
  } catch (e) {
    // エラーは無視
  }
}

/**
 * ブロック詳細を取得
 */
async function getBlockDetail(blockId) {
  const block = state.blocks.find((b) => b.id === blockId);
  if (!block) return null;
  const markup = formatHtmlSnippet(block.element);
  const assets = await getBlockAssets(block.name);
  return { block, markup, assets };
}

/**
 * DevToolsプロンプトを表示
 */
function showDevToolsPrompt() {
  // DevToolsを開くように促すメッセージを表示
  const prompt = document.createElement('div');
  prompt.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(120deg, #0ea5e9, #6366f1);
    color: #0b1220;
    padding: 16px 20px;
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 2147483647;
    font-family: Inter, Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
    max-width: 400px;
    line-height: 1.5;
  `;
  prompt.innerHTML = `
    <div style="font-weight: 700; margin-bottom: 8px;">EDS Site Inspector</div>
    <div style="margin-bottom: 12px;">Please open DevTools (F12 or Cmd+Option+I) and select the "EDS Site Inspector" tab.</div>
    <button id="eds-close-prompt" style="
      background: #0b1220;
      color: #fff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 12px;
    ">Close</button>
  `;
  document.body.appendChild(prompt);
  
  const closeBtn = prompt.querySelector('#eds-close-prompt');
  closeBtn.addEventListener('click', () => {
    prompt.remove();
  });
  
  // 5秒後に自動的に閉じる
  setTimeout(() => {
    if (prompt.parentNode) {
      prompt.remove();
    }
  }, 5000);
}

/**
 * メッセージを処理
 */
export async function handleMessage(message, sender, sendResponse) {
  console.log('[EDS Inspector Content] Message received:', message);
  if (message?.target !== 'eds-content') {
    console.log('[EDS Inspector Content] Message target mismatch, ignoring');
    return;
  }
  
  try {
    switch (message.type) {
      case 'init': {
        console.log('[EDS Inspector Content] Initializing...');
        // 既に実行されている場合でも、初期化を再実行できるようにする
        if (window.__edsInspectorInitialized) {
          console.log('[EDS Inspector Content] Re-initializing...');
          // 既存のオーバーレイを削除
          destroy();
          // 状態をリセット
          state.overlays = [];
          state.sections = [];
          state.blocks = [];
          state.icons = [];
        }
        // オーバーレイを表示状態にする（確実にtrueに設定）
        state.overlaysVisible = true;
        state.overlaysEnabled = { sections: true, blocks: true, defaultContent: true };
        console.log('[EDS Inspector Content] State set before init:', {
          overlaysVisible: state.overlaysVisible,
          overlaysEnabled: state.overlaysEnabled
        });
        
        const snapshot = await init();
        console.log('[EDS Inspector Content] Initialization complete:', snapshot);
        
        // 初期化後、確実にoverlaysVisibleがtrueのままであることを確認
        state.overlaysVisible = true;
        state.overlaysEnabled = { sections: true, blocks: true, defaultContent: true };
        
        // init()内で既にrefreshOverlayPositions()が呼ばれているため、
        // ここでは呼ばない（ブリンクを防ぐため）
        // DOMが完全に読み込まれるまで少し待ってから一度だけ更新
        setTimeout(() => {
          console.log('[EDS Inspector Content] Final overlay refresh after init, state:', {
            overlaysVisible: state.overlaysVisible,
            overlaysEnabled: state.overlaysEnabled,
            overlaysCount: state.overlays.length
          });
          // 状態を再確認してから更新
          state.overlaysVisible = true;
          refreshOverlayPositions();
        }, 300);
        
        sendResponse(snapshot);
        break;
      }
      case 'reanalyze': {
        console.log('[EDS Inspector Content] reanalyze called');
        await analyzePage();
        console.log('[EDS Inspector Content] analyzePage completed, jsonFiles:', state.jsonFiles ? state.jsonFiles.size : 0);
        await loadCodeAndMedia();
        const serialized = serializeState();
        console.log('[EDS Inspector Content] serializeState completed, jsonFiles in serialized:', serialized.jsonFiles ? serialized.jsonFiles.length : 0);
        sendResponse(serialized);
        break;
      }
      case 'enable-auto-update': {
        enableAutoUpdate();
        sendResponse({ ok: true });
        break;
      }
      case 'disable-auto-update': {
        disableAutoUpdate();
        sendResponse({ ok: true });
        break;
      }
      case 'toggle-overlay': {
        state.overlaysEnabled[message.payload.key] = message.payload.value;
        state.overlays.forEach((overlay) => {
          if (message.payload.key === 'sections' && overlay.item.id.startsWith('section-')) {
            overlay.visible = message.payload.value;
          } else if (message.payload.key === 'blocks' && overlay.item.id.startsWith('block-')) {
            // Blocksのみ（Default Contentは除外）
            const isDefaultContent = overlay.item.category && overlay.item.category !== 'block';
            if (!isDefaultContent) {
              overlay.visible = message.payload.value;
            }
          } else if (message.payload.key === 'defaultContent' && overlay.item.id.startsWith('block-')) {
            // Default Contentのみ
            const isDefaultContent = overlay.item.category && overlay.item.category !== 'block';
            if (isDefaultContent) {
              overlay.visible = message.payload.value;
            }
          }
        });
        refreshOverlayPositions();
        sendResponse(serializeState());
        break;
      }
      case 'toggle-overlays': {
        toggleOverlays();
        sendResponse({ ok: true, visible: state.overlaysVisible });
        break;
      }
      case 'refresh-overlays': {
        refreshOverlayPositions();
        sendResponse({ ok: true });
        break;
      }
      case 'set-overlays-visible': {
        state.overlaysVisible = message.payload.visible;
        refreshOverlayPositions();
        sendResponse({ ok: true, visible: state.overlaysVisible });
        break;
      }
      case 'destroy': {
        destroy();
        sendResponse(serializeState());
        break;
      }
      case 'highlight': {
        setHighlight(message.payload.id);
        sendResponse({ ok: true });
        break;
      }
      case 'scroll-to-block': {
        const block = state.blocks.find(b => b.id === message.payload.id);
        if (block && block.element) {
          block.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // スクロール後にオーバーレイの位置を更新
          setTimeout(() => {
            refreshOverlayPositions();
            setHighlight(message.payload.id);
          }, 300);
        }
        sendResponse({ ok: true });
        break;
      }
      case 'select-block': {
        state.selectedBlockId = message.payload.id;
        sendResponse({ ok: true });
        break;
      }
      case 'state': {
        sendResponse(serializeState());
        break;
      }
      case 'get-block-detail': {
        const detail = await getBlockDetail(message.payload.id);
        sendResponse(detail);
        break;
      }
      case 'get-blocks-by-name': {
        // 同じ名前のブロックをすべて取得
        const blockName = message.payload.name;
        const blocksWithSameName = state.blocks.filter(b => b.name === blockName);
        sendResponse(blocksWithSameName.map(block => ({
          id: block.id,
          name: block.name,
          tagName: block.tagName,
          classes: block.classes,
          category: block.category || 'block'
        })));
        break;
      }
      case 'show-devtools-prompt': {
        showDevToolsPrompt();
        sendResponse({ ok: true });
        break;
      }
      case 'scroll-page-for-lazy-load': {
        // ページを下までスクロールしてから上に戻す（Lazy Load対策）
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = document.documentElement.clientHeight;
        const maxScroll = scrollHeight - clientHeight;
        
        // 下までスクロール
        window.scrollTo({ top: maxScroll, behavior: 'smooth' });
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // 上に戻る
        window.scrollTo({ top: 0, behavior: 'smooth' });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // スクロール完了後、リソースが記録されるまで少し待つ
        await new Promise(resolve => setTimeout(resolve, 500));
        
        sendResponse({ ok: true });
        break;
      }
      default:
        console.warn('[EDS Inspector Content] Unknown message type:', message.type);
        sendResponse({ ok: false, reason: 'unknown-message' });
    }
  } catch (err) {
    console.error('[EDS Inspector Content] Error handling message:', err);
    sendResponse({ ok: false, error: err.message });
  }
}

