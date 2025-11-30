/**
 * 設定の解決
 */
import { state } from '../state.js';

/**
 * 設定を解決（codeBasePath, mediaBasePath）
 */
export async function resolveConfig() {
  const maybe = window.hlx || window.hlxRUM || {};
  state.codeBasePath = maybe.codeBasePath || null;
  state.mediaBasePath = maybe.mediaBasePath || null;

  if (state.codeBasePath && state.mediaBasePath) return;

  const candidates = ['/.helix/config.json', '/helix-config.json'];
  for (const path of candidates) {
    try {
      const res = await fetch(path);
      if (res.ok) {
        const json = await res.json();
        state.codeBasePath = state.codeBasePath || json.codeBasePath;
        state.mediaBasePath = state.mediaBasePath || json.mediaBasePath;
        break;
      }
    } catch (e) {
      // ignore
    }
  }
}

/**
 * SSRドキュメントをパース（複数のHTMLドキュメントに対応）
 * @param {Map<string, string>} htmlDocuments - URL -> HTML文字列のMap
 * @returns {Map<string, Document>} URL -> DocumentオブジェクトのMap
 */
export async function parseSSRDocuments(htmlDocuments) {
  const ssrDocuments = new Map();
  const parser = new DOMParser();
  
  // メインドキュメントを取得
  const mainUrl = window.location.href.split('?')[0];
  try {
    const res = await fetch(mainUrl, { credentials: 'include' });
    if (res.ok) {
      const html = await res.text();
      // メインドキュメントのHTML文字列も保存
      if (!htmlDocuments.has(mainUrl)) {
        htmlDocuments.set(mainUrl, html);
      }
      const doc = parser.parseFromString(html, 'text/html');
      ssrDocuments.set(mainUrl, doc);
      console.log('[EDS Inspector] Parsed main SSR document:', mainUrl);
    }
  } catch (err) {
    console.warn('[EDS Inspector] Failed to fetch main SSR markup', err);
  }
  
  // 収集されたHTMLドキュメントをパース
  for (const [url, html] of htmlDocuments.entries()) {
    if (html && url !== mainUrl) {
      try {
        const doc = parser.parseFromString(html, 'text/html');
        ssrDocuments.set(url, doc);
        console.log('[EDS Inspector] Parsed SSR document:', url);
      } catch (err) {
        console.warn('[EDS Inspector] Failed to parse SSR document:', url, err);
      }
    }
  }
  
  return ssrDocuments;
}

