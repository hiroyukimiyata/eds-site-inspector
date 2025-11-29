/**
 * 現在のURLからMarkdownファイルのURLを生成
 * @param {string} currentUrl - 現在のページのURL
 * @returns {string|null} MarkdownファイルのURL、生成できない場合はnull
 */
export function getMarkdownUrl(currentUrl) {
  try {
    const url = new URL(currentUrl);
    let pathname = url.pathname;
    
    // /で終わる場合は/index.mdを追加
    if (pathname.endsWith('/')) {
      pathname += 'index.md';
    } else {
      // 既存の拡張子を.mdに置き換え、拡張子がない場合は.mdを追加
      const pathParts = pathname.split('.');
      if (pathParts.length > 1) {
        // 拡張子がある場合は置き換え
        pathParts[pathParts.length - 1] = 'md';
        pathname = pathParts.join('.');
      } else {
        // 拡張子がない場合は追加
        pathname += '.md';
      }
    }
    
    url.pathname = pathname;
    return url.toString();
  } catch (e) {
    console.error('[EDS Inspector] Error constructing markdown URL:', e);
    return null;
  }
}

