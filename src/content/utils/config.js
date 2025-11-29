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
 * SSRドキュメントをパース
 */
export async function parseSSRDocument() {
  try {
    const res = await fetch(window.location.href, { credentials: 'include' });
    const html = await res.text();
    const parser = new DOMParser();
    return parser.parseFromString(html, 'text/html');
  } catch (err) {
    console.warn('Failed to fetch SSR markup', err);
    return null;
  }
}

