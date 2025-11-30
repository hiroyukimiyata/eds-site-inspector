/**
 * オーバーレイ管理
 */
import { UI_IDS } from '../constants.js';
import { state } from '../state.js';

/**
 * オーバーレイルート要素を作成
 */
export function createOverlayRoot() {
  let root = document.getElementById(UI_IDS.overlayRoot);
  if (root) return root;
  root = document.createElement('div');
  root.id = UI_IDS.overlayRoot;
  root.style.position = 'absolute';
  root.style.top = '0';
  root.style.left = '0';
  root.style.width = '100%';
  root.style.height = `${document.documentElement.scrollHeight}px`;
  root.style.pointerEvents = 'none';
  root.style.zIndex = '2147483646';
  document.body.appendChild(root);
  return root;
}

/**
 * オーバーレイルートのサイズを確保
 */
export function ensureOverlayRootSizing(root) {
  if (!root) return;
  const doc = document.documentElement;
  const body = document.body || { scrollHeight: 0, scrollWidth: 0 };
  const height = Math.max(doc.scrollHeight, doc.clientHeight, body.scrollHeight, body.clientHeight || 0);
  const width = Math.max(doc.scrollWidth, doc.clientWidth, body.scrollWidth, body.clientWidth || 0);
  root.style.height = `${height}px`;
  root.style.width = `${width}px`;
}

/**
 * ポップアップまたはDevToolsが存在するかチェック
 * ポップアップまたはDevToolsが開いている場合のみtrueを返す
 */
let lastExtensionCheck = 0;
let extensionAvailable = false;
const EXTENSION_CHECK_INTERVAL = 1000; // 1秒ごとにチェック

export async function checkExtensionAvailable() {
  const now = Date.now();
  // キャッシュされた結果を使用（1秒以内）
  if (now - lastExtensionCheck < EXTENSION_CHECK_INTERVAL) {
    return extensionAvailable;
  }
  
  lastExtensionCheck = now;
  
  try {
    // ポップアップまたはDevToolsが開いているかどうかを確認
    // chrome.runtime.sendMessageでメッセージを送信して、レスポンスがあるかどうかで確認
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'ping' }, (response) => {
        // エラーが発生した場合（ポップアップもDevToolsも存在しない場合）
        if (chrome.runtime.lastError) {
          resolve(false);
        } else {
          // レスポンスがある場合は、ポップアップまたはDevToolsが開いている
          resolve(true);
        }
      });
      // タイムアウト（200ms以内にレスポンスがない場合は存在しないと判断）
      setTimeout(() => resolve(false), 200);
    });
    
    extensionAvailable = response;
    return extensionAvailable;
  } catch (e) {
    // エラーの場合は存在しないと判断
    extensionAvailable = false;
    return false;
  }
}

/**
 * オーバーレイの位置を更新
 */
export async function refreshOverlayPositions() {
  const root = document.getElementById(UI_IDS.overlayRoot);
  if (!root) {
    console.warn('[EDS Inspector] Overlay root not found');
    return;
  }
  ensureOverlayRootSizing(root);
  
  // ポップアップまたはDevToolsが開いているかどうかを確認
  const extensionAvailable = await checkExtensionAvailable();
  if (!extensionAvailable) {
    // ポップアップもDevToolsも閉じている場合は、オーバーレイを非表示にする
    console.log('[EDS Inspector] Extension not available, hiding overlays');
    root.style.display = 'none';
    state.overlaysVisible = false;
    return;
  }
  
  // オーバーレイ全体が非表示の場合は、ルート要素を非表示にする
  if (!state.overlaysVisible) {
    console.log('[EDS Inspector] Overlays not visible, hiding root. State:', {
      overlaysVisible: state.overlaysVisible,
      overlaysEnabled: state.overlaysEnabled,
      overlaysCount: state.overlays.length
    });
    root.style.display = 'none';
    return;
  }
  
  // オーバーレイが存在しない場合は何もしない
  if (state.overlays.length === 0) {
    console.log('[EDS Inspector] No overlays to display');
    return;
  }
  
  root.style.display = 'block';
  const viewportOffset = { x: window.scrollX, y: window.scrollY };
  
  let displayedCount = 0;
  state.overlays.forEach((overlay) => {
    const { element, target } = overlay;
    if (!target || !element) {
      console.warn('[EDS Inspector] Invalid overlay:', overlay);
      return;
    }
    const rect = target.getBoundingClientRect();
    element.style.transform = `translate(${rect.left + viewportOffset.x}px, ${rect.top + viewportOffset.y}px)`;
    element.style.width = `${rect.width}px`;
    element.style.height = `${rect.height}px`;
    // オーバーレイ全体が表示されている場合のみ、個別のオーバーレイの表示状態を確認
    let enabled = false;
    if (overlay.item.id.startsWith('section-')) {
      enabled = state.overlaysEnabled.sections;
    } else if (overlay.item.category && overlay.item.category !== 'block') {
      // Default Content（categoryが'block'以外）
      enabled = state.overlaysEnabled.defaultContent;
    } else {
      // Blocks（categoryが'block'または未定義）
      enabled = state.overlaysEnabled.blocks;
    }
    const shouldDisplay = overlay.visible && enabled;
    element.style.display = shouldDisplay ? 'block' : 'none';
    if (shouldDisplay) {
      displayedCount++;
    }
  });
  
  // デバッグログは必要最小限に（ブリンクの原因を特定するため）
  if (displayedCount === 0 && state.overlays.length > 0) {
    console.log('[EDS Inspector] Refreshed overlay positions:', {
      overlaysCount: state.overlays.length,
      displayedCount,
      overlaysVisible: state.overlaysVisible,
      overlaysEnabled: state.overlaysEnabled
    });
  }
  
  if (displayedCount === 0 && state.overlays.length > 0) {
    console.warn('[EDS Inspector] No overlays displayed:', {
      overlaysCount: state.overlays.length,
      overlaysVisible: state.overlaysVisible,
      overlaysEnabled: state.overlaysEnabled,
      overlays: state.overlays.map(o => ({ id: o.item.id, visible: o.visible, category: o.item.category }))
    });
  }
}

/**
 * オーバーレイの表示/非表示を切り替え
 */
export async function toggleOverlays() {
  state.overlaysVisible = !state.overlaysVisible;
  await refreshOverlayPositions();
  console.log('[EDS Inspector] Overlays toggled, visible:', state.overlaysVisible);
}

/**
 * ハイライトを設定
 */
export function setHighlight(id) {
  state.overlays.forEach((overlay) => {
    overlay.element.classList.toggle('is-highlighted', overlay.item.id === id);
  });
}

/**
 * オーバーレイを破棄
 */
export function destroy() {
  const overlay = document.getElementById(UI_IDS.overlayRoot);
  if (overlay) overlay.remove();
  state.overlays = [];
}

/**
 * グローバルリスナーをアタッチ
 */
export function attachGlobalListeners() {
  window.addEventListener('scroll', () => { refreshOverlayPositions().catch(console.error); }, true);
  window.addEventListener('resize', () => { refreshOverlayPositions().catch(console.error); }, true);
  const resizeObserver = new ResizeObserver(() => { refreshOverlayPositions().catch(console.error); });
  resizeObserver.observe(document.documentElement);
}

