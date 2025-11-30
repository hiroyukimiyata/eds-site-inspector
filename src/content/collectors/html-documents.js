/**
 * HTMLドキュメントの収集（.plain.html）
 * Performance APIを使用してネットワークリクエストから検出
 */

/**
 * HTMLドキュメントを収集
 */
export async function collectHtmlDocuments() {
  const htmlDocuments = new Map(); // URL -> HTML文字列
  
  console.log('[EDS Inspector HTML] Starting collection of .plain.html documents');
  
  // Performance APIからネットワークリクエストを収集
  const resources = performance.getEntriesByType('resource');
  console.log('[EDS Inspector HTML] Total resources:', resources.length);
  
  // .plain.htmlを含むすべてのリソースを抽出
  const htmlCandidates = resources.filter(r => r.name && r.name.includes('.plain.html'));
  console.log('[EDS Inspector HTML] Resources containing .plain.html:', htmlCandidates.length);
  
  htmlCandidates.forEach((entry) => {
    try {
      const url = new URL(entry.name, window.location.href);
      // 同一ドメインのみ
      if (url.origin === window.location.origin) {
        const normalizedUrl = url.href.split('?')[0]; // クエリパラメータを除去
        htmlDocuments.set(normalizedUrl, null); // 後で取得
        console.log('[EDS Inspector HTML] Found .plain.html:', normalizedUrl);
      }
    } catch (e) {
      // URL解析エラーは無視
    }
  });
  
  // メインドキュメントも追加
  const mainUrl = window.location.href.split('?')[0];
  htmlDocuments.set(mainUrl, null);
  
  // すべてのHTMLドキュメントを取得
  const fetchPromises = Array.from(htmlDocuments.keys()).map(url => fetchHtmlDocument(url, htmlDocuments));
  await Promise.all(fetchPromises);
  
  console.log('[EDS Inspector HTML] Collected HTML documents:', htmlDocuments.size);
  return htmlDocuments;
}

/**
 * HTMLドキュメントを取得
 */
async function fetchHtmlDocument(url, htmlDocuments) {
  try {
    const response = await fetch(url, { credentials: 'include' });
    if (response.ok) {
      const html = await response.text();
      htmlDocuments.set(url, html);
      console.log('[EDS Inspector HTML] Fetched HTML document:', url, 'length:', html.length);
      return html;
    } else {
      console.warn('[EDS Inspector HTML] Failed to fetch HTML:', url, response.status);
      return null;
    }
  } catch (e) {
    console.warn('[EDS Inspector HTML] Error fetching HTML:', url, e);
    return null;
  }
}

