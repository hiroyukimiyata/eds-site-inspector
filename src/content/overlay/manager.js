/**
 * オーバーレイ管理
 */
import { UI_IDS } from '../constants.js';
import { state } from '../state.js';
import { isDefaultContent } from '../utils/category.js';

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
let pingTimeoutId = null;
const EXTENSION_CHECK_INTERVAL = 1000; // 1秒ごとにチェック
const PING_TIMEOUT = 500; // pingのタイムアウト（ms）

export async function checkExtensionAvailable() {
  const now = Date.now();
  // キャッシュされた結果を使用（1秒以内）
  if (now - lastExtensionCheck < EXTENSION_CHECK_INTERVAL) {
    return extensionAvailable;
  }
  
  lastExtensionCheck = now;
  
  // 既存のタイムアウトをクリーンアップ
  if (pingTimeoutId !== null) {
    clearTimeout(pingTimeoutId);
    pingTimeoutId = null;
  }
  
  try {
    // まず、chrome.storage.localからDevToolsが開いているかどうかを確認
    // これにより、DevTools操作中でも確実に検出できる
    const storageResult = await chrome.storage.local.get('eds-devtools-open');
    const devToolsOpen = storageResult && storageResult['eds-devtools-open'];
    
    if (devToolsOpen) {
      // DevToolsが開いている場合は、確実にtrueを返す
      extensionAvailable = true;
      return true;
    }
    
    // DevToolsが開いていない場合、ポップアップが開いているかどうかを確認
    // chrome.runtime.sendMessageでメッセージを送信して、レスポンスがあるかどうかで確認
    const response = await new Promise((resolve) => {
      let resolved = false;
      
      chrome.runtime.sendMessage({ type: 'ping' }, (response) => {
        if (resolved) return; // 既にタイムアウトで解決済みの場合は無視
        resolved = true;
        
        // 既存のタイムアウトをクリーンアップ
        if (pingTimeoutId !== null) {
          clearTimeout(pingTimeoutId);
          pingTimeoutId = null;
        }
        
        // エラーが発生した場合（ポップアップもDevToolsも存在しない場合）
        if (chrome.runtime.lastError) {
          resolve(false);
        } else {
          // レスポンスがある場合は、ポップアップが開いている
          resolve(true);
        }
      });
      
      // タイムアウトを設定
      pingTimeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          pingTimeoutId = null;
          resolve(false);
        }
      }, PING_TIMEOUT);
    });
    
    // ポップアップが開いている場合はtrue、そうでなければfalse
    // ポップアップが非表示 AND DevToolsが非表示の場合のみfalse
    extensionAvailable = response;
    return extensionAvailable;
  } catch (e) {
    // タイムアウトをクリーンアップ
    if (pingTimeoutId !== null) {
      clearTimeout(pingTimeoutId);
      pingTimeoutId = null;
    }
    
    // エラーが発生した場合、安全のためfalseを返す
    // （ちらつきを防ぐため、前回の状態を保持する）
    extensionAvailable = false;
    return false;
  }
}

/**
 * オーバーレイの位置を更新（スロットリング付き）
 */
let refreshTimeoutId = null;
let isRefreshing = false;
const REFRESH_THROTTLE = 16; // 約60fps（16ms）

export async function refreshOverlayPositions() {
  // 既に更新中の場合はスキップ
  if (isRefreshing) {
    return;
  }
  
  // スロットリング: 連続呼び出しを制限
  if (refreshTimeoutId !== null) {
    return; // 既にスケジュール済み
  }
  
  refreshTimeoutId = requestAnimationFrame(async () => {
    refreshTimeoutId = null;
    await performRefresh();
  });
}

/**
 * 実際の更新処理
 */
let lastDisplayState = null; // 前回の表示状態を保持（ちらつき防止）

async function performRefresh() {
  if (isRefreshing) return;
  isRefreshing = true;
  
  try {
    const root = document.getElementById(UI_IDS.overlayRoot);
    if (!root) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[EDS Inspector] Overlay root not found');
      }
      return;
    }
    
    ensureOverlayRootSizing(root);
    
    // ポップアップまたはDevToolsが開いているかどうかを確認
    // ポップアップが非表示 AND DevToolsが非表示の場合のみ、オーバーレイを非表示にする
    const extensionAvailable = await checkExtensionAvailable();
    
    // オーバーレイが存在しない場合は非表示にする
    if (state.overlays.length === 0) {
      if (lastDisplayState !== 'none') {
        root.style.display = 'none';
        lastDisplayState = 'none';
      }
      return;
    }
    
    // 表示状態を決定: 拡張機能が利用可能 かつ state.overlaysVisibleがtrueの場合のみ表示
    const shouldShow = extensionAvailable && state.overlaysVisible;
    const newDisplayState = shouldShow ? 'block' : 'none';
    
    // ちらつき防止: 状態が変わらない場合はdisplayを変更しない
    if (lastDisplayState !== newDisplayState) {
      root.style.display = newDisplayState;
      lastDisplayState = newDisplayState;
    }
    
    // 非表示の場合は、ここで終了
    if (!shouldShow) {
      return;
    }
    const viewportOffset = { x: window.scrollX, y: window.scrollY };
    
    let displayedCount = 0;
    let defaultContentDisplayedCount = 0;
    
    state.overlays.forEach((overlay) => {
      const { element, target } = overlay;
      if (!target || !element) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[EDS Inspector] Invalid overlay:', overlay);
        }
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
      } else {
        // Default Contentかどうかを判定
        if (isDefaultContent(overlay.item)) {
          enabled = state.overlaysEnabled.defaultContent;
        } else {
          // Blocks（categoryが'block'、'button'、'icon'または未定義）
          enabled = state.overlaysEnabled.blocks;
        }
      }
      
      const shouldDisplay = overlay.visible && enabled;
      element.style.display = shouldDisplay ? 'block' : 'none';
      
      if (shouldDisplay) {
        displayedCount++;
        if (isDefaultContent(overlay.item)) {
          defaultContentDisplayedCount++;
        }
      }
    });
    
    // デバッグログ（開発モードでのみ出力）
    if (process.env.NODE_ENV === 'development') {
      const defaultContentOverlays = state.overlays.filter(o => isDefaultContent(o.item));
      
      console.log('[EDS Inspector] Refreshed overlay positions:', {
        totalOverlays: state.overlays.length,
        defaultContentOverlays: defaultContentOverlays.length,
        displayedCount,
        defaultContentDisplayedCount,
        overlaysVisible: state.overlaysVisible,
        overlaysEnabled: state.overlaysEnabled
      });
      
      if (defaultContentDisplayedCount === 0 && defaultContentOverlays.length > 0) {
        console.warn('[EDS Inspector] No Default Content overlays displayed:', {
          defaultContentOverlaysCount: defaultContentOverlays.length,
          defaultContentDisplayedCount,
          overlaysEnabled: state.overlaysEnabled
        });
      }
    }
  } finally {
    isRefreshing = false;
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
  lastDisplayState = null; // 状態をリセット
}

/**
 * グローバルリスナーをアタッチ
 */
export function attachGlobalListeners() {
  window.addEventListener('scroll', () => { 
    refreshOverlayPositions().catch(err => {
      if (process.env.NODE_ENV === 'development') {
        console.error('[EDS Inspector] Error refreshing overlays:', err);
      }
    }); 
  }, true);
  
  window.addEventListener('resize', () => { 
    refreshOverlayPositions().catch(err => {
      if (process.env.NODE_ENV === 'development') {
        console.error('[EDS Inspector] Error refreshing overlays:', err);
      }
    }); 
  }, true);
  
  const resizeObserver = new ResizeObserver(() => { 
    refreshOverlayPositions().catch(err => {
      if (process.env.NODE_ENV === 'development') {
        console.error('[EDS Inspector] Error refreshing overlays:', err);
      }
    }); 
  });
  resizeObserver.observe(document.documentElement);
}

