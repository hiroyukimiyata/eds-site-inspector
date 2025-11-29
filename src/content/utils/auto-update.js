/**
 * 自動更新機能
 */
import { analyzePage } from '../analyzer.js';
import { loadCodeAndMedia } from '../api/code-media.js';

let autoUpdateEnabled = true;
let updateTimeout = null;
let mutationObserver = null;
let performanceObserver = null;

/**
 * 自動更新をスケジュール
 */
export function scheduleAutoUpdate(delay = 500) {
  if (!autoUpdateEnabled) return;
  
  // 既存のタイムアウトをクリア
  if (updateTimeout) {
    clearTimeout(updateTimeout);
  }
  
  // 新しいタイムアウトを設定
  updateTimeout = setTimeout(async () => {
    try {
      console.log('[EDS Inspector Content] Auto-updating page analysis...');
      await analyzePage(); // analyzePage内でloadCodeAndMediaが呼ばれる
      console.log('[EDS Inspector Content] Auto-update complete');
    } catch (err) {
      console.error('[EDS Inspector Content] Error in auto-update:', err);
    }
  }, delay);
}

/**
 * 自動更新を設定
 */
export function setupAutoUpdate() {
  // DOMの変更を監視
  if (mutationObserver) {
    mutationObserver.disconnect();
  }
  
  mutationObserver = new MutationObserver((mutations) => {
    let shouldUpdate = false;
    
    mutations.forEach((mutation) => {
      // main要素内の変更を監視
      const main = document.querySelector('main');
      if (main && main.contains(mutation.target)) {
        // 新しい要素が追加された場合
        if (mutation.addedNodes.length > 0) {
          shouldUpdate = true;
        }
        // クラス名が変更された場合（ブロックやアイコンの追加）
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          shouldUpdate = true;
        }
        // Lazy Load対応: src属性が変更された場合（data-srcからsrcに変更されたとき）
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'src' || mutation.attributeName === 'data-src')) {
          const target = mutation.target;
          if (target.tagName === 'IMG' || target.tagName === 'VIDEO' || target.tagName === 'SOURCE') {
            const url = target.getAttribute('src') || target.getAttribute('data-src');
            if (url && url.includes('media_')) {
              shouldUpdate = true;
            }
          }
        }
      }
    });
    
    if (shouldUpdate) {
      scheduleAutoUpdate(1000); // 1秒後に更新
    }
  });
  
  const main = document.querySelector('main');
  if (main) {
    mutationObserver.observe(main, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'src', 'data-src'], // Lazy Load対応: src属性の変更も監視
    });
  }
  
  // ネットワークリクエストを監視
  if (performanceObserver) {
    try {
      performanceObserver.disconnect();
    } catch (e) {
      // 無視
    }
  }
  
  try {
    performanceObserver = new PerformanceObserver((list) => {
      let shouldUpdate = false;
      
      list.getEntries().forEach((entry) => {
        const url = entry.name || '';
        // ブロックやアイコンのリソースが読み込まれた場合
        if (url.includes('/blocks/') || url.includes('/icons/')) {
          shouldUpdate = true;
        }
      });
      
      if (shouldUpdate) {
        scheduleAutoUpdate(1000); // 1秒後に更新
      }
    });
    
    performanceObserver.observe({ entryTypes: ['resource'] });
  } catch (e) {
    console.warn('[EDS Inspector Content] PerformanceObserver not supported:', e);
  }
  
  // ページロード完了時に自動的に分析を実行
  if (document.readyState === 'complete') {
    scheduleAutoUpdate(500);
  } else {
    window.addEventListener('load', () => {
      scheduleAutoUpdate(500);
    });
  }
}

/**
 * 自動更新を有効化
 */
export function enableAutoUpdate() {
  autoUpdateEnabled = true;
  setupAutoUpdate();
}

/**
 * 自動更新を無効化
 */
export function disableAutoUpdate() {
  autoUpdateEnabled = false;
  if (updateTimeout) {
    clearTimeout(updateTimeout);
    updateTimeout = null;
  }
  if (mutationObserver) {
    mutationObserver.disconnect();
  }
  if (performanceObserver) {
    try {
      performanceObserver.disconnect();
    } catch (e) {
      // 無視
    }
  }
}

