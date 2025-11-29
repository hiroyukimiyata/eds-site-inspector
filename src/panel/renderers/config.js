/**
 * Configタブのレンダラー
 */
import { processCode } from '../utils/code-processor.js';

/**
 * Configタブをレンダリング
 */
export async function renderConfig(tabId) {
  const root = document.querySelector('[data-tab-panel="config"]');
  
  if (!root) {
    console.error('[EDS Inspector Panel] Config panel root not found');
    return;
  }
  
  // ローディング表示
  root.innerHTML = '<p class="eds-loading">Loading config.json…</p>';
  
  try {
    // 現在のタブのURLを取得
    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.url) {
      root.innerHTML = '<p class="eds-empty">Could not determine current page URL.</p>';
      return;
    }
    
    const currentUrl = tab.url;
    const urlObj = new URL(currentUrl);
    
    // ドメイン直下の /config.json を取得
    const configUrl = `${urlObj.origin}/config.json`;
    
    try {
      const response = await fetch(configUrl);
      if (!response.ok) {
        root.innerHTML = `<p class="eds-empty">Failed to load config.json: ${response.status} ${response.statusText}<br><code style="word-break: break-all; background: var(--bg-muted); padding: 4px 8px; border-radius: 4px; display: inline-block; margin-top: 8px;">${configUrl}</code></p>`;
        return;
      }
      
      const configData = await response.json();
      
      // JSONを整形して表示
      const container = document.createElement('div');
      container.className = 'eds-config-container';
      
      // JSONを整形して表示（シンタックスハイライト付き）
      const pre = document.createElement('pre');
      pre.className = 'eds-code';
      pre.style.cssText = 'background: var(--bg-muted); border: 1px solid var(--border); border-radius: 8px; padding: 16px; overflow-x: auto; max-height: 600px; overflow-y: auto;';
      
      const code = document.createElement('code');
      const jsonString = JSON.stringify(configData, null, 2);
      // シンタックスハイライトを適用
      code.innerHTML = processCode(jsonString, 'json', 'config.json');
      code.style.cssText = 'font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace; font-size: 12px; line-height: 1.6; display: block;';
      
      pre.appendChild(code);
      container.appendChild(pre);
      
      // URL情報を追加
      const urlInfo = document.createElement('div');
      urlInfo.style.cssText = 'margin-top: 12px; padding: 8px 12px; background: var(--bg-muted); border-radius: 6px; font-size: 11px; color: var(--muted);';
      urlInfo.innerHTML = `Source: <code style="background: var(--bg); padding: 2px 6px; border-radius: 4px;">${configUrl}</code>`;
      container.appendChild(urlInfo);
      
      root.innerHTML = '';
      root.appendChild(container);
    } catch (fetchErr) {
      console.error('[EDS Inspector Panel] Error fetching config.json:', fetchErr);
      root.innerHTML = `<p class="eds-empty">Error loading config.json: ${fetchErr.message}<br><code style="word-break: break-all; background: var(--bg-muted); padding: 4px 8px; border-radius: 4px; display: inline-block; margin-top: 8px;">${configUrl}</code></p>`;
    }
  } catch (err) {
    console.error('[EDS Inspector Panel] Error loading config:', err);
    root.innerHTML = `<p class="eds-empty">Error loading config: ${err.message}</p>`;
  }
}

