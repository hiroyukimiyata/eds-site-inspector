/**
 * JSONファイルの収集
 */

/**
 * JSONファイルを収集
 */
export function collectJsonFiles() {
  const jsonFiles = new Map();
  const mainOrigin = window.location.origin;
  
  console.log('[EDS Inspector JSON] Starting collection, origin:', mainOrigin);
  
  // Performance APIからネットワークリクエストを収集
  const resources = performance.getEntriesByType('resource');
  console.log('[EDS Inspector JSON] Total resources:', resources.length);
  
  // .jsonを含むすべてのリソースをまず抽出
  const jsonCandidates = resources.filter(r => r.name && r.name.includes('.json'));
  console.log('[EDS Inspector JSON] Resources containing .json:', jsonCandidates.length);
  jsonCandidates.forEach(r => {
    console.log('[EDS Inspector JSON] Candidate:', r.name);
  });
  
  // すべてのリソースをチェック
  resources.forEach((entry) => {
    const urlString = entry.name;
      if (!urlString || typeof urlString !== 'string') return;
      
    // .jsonを含むかチェック
    if (!urlString.includes('.json')) return;
    
    try {
      // URLを解析
      let url;
      try {
        url = new URL(urlString);
      } catch (e) {
        // 相対URLの場合は現在のページのURLをベースにする
        url = new URL(urlString, window.location.href);
      }
      
      console.log('[EDS Inspector JSON] Processing:', urlString, '-> origin:', url.origin, 'pathname:', url.pathname);
      console.log('[EDS Inspector JSON] Main origin:', mainOrigin);
      
      // メインドメインと同じドメインのもののみを対象
      // ただし、サブドメインの違いは許容（例: main--fm-eds-demo-- と main--fm-eds-demo-doc--）
      const mainDomain = mainOrigin.replace(/^https?:\/\//, '').split('/')[0];
      const resourceDomain = url.origin.replace(/^https?:\/\//, '').split('/')[0];
      
      // 完全に同じドメイン、または同じベースドメイン（最後の2つのセグメントが同じ）
      const mainParts = mainDomain.split('.');
      const resourceParts = resourceDomain.split('.');
      const isSameDomain = url.origin === mainOrigin || 
                          (mainParts.length >= 2 && resourceParts.length >= 2 &&
                           mainParts.slice(-2).join('.') === resourceParts.slice(-2).join('.'));
      
      if (!isSameDomain) {
        console.log('[EDS Inspector JSON] Skipping different domain:', url.origin, 'vs', mainOrigin);
        return;
      }
      
      // パス名を取得（クエリパラメータは含まれない）
      const pathname = url.pathname;
      
      // .jsonで終わるURLを検出
      // pathnameは既にクエリパラメータを含まないので、.jsonで終わっていればOK
      // 例: /file.json -> pathname = "/file.json"
      //     /file.json?v=1 -> pathname = "/file.json"
      const isJsonFile = pathname.endsWith('.json');
      
      if (isJsonFile) {
        // ファイル名を抽出
        const pathParts = pathname.split('/').filter(p => p);
        const filename = pathParts[pathParts.length - 1] || pathname;
        
        // 正規化されたURLを保存
        const normalizedUrl = url.toString();
        
        jsonFiles.set(normalizedUrl, {
          url: normalizedUrl,
          pathname: pathname,
          filename: filename
        });
        console.log('[EDS Inspector JSON] ✓ ADDED JSON:', filename, '->', normalizedUrl);
      } else {
        console.log('[EDS Inspector JSON] Pathname does not end with .json:', pathname);
      }
    } catch (e) {
      console.error('[EDS Inspector JSON] Error processing URL:', urlString, e);
    }
  });
  
  const collectedFiles = Array.from(jsonFiles.values());
  console.log('[EDS Inspector JSON] ✓ FINAL RESULT: Collected', collectedFiles.length, 'JSON files');
  if (collectedFiles.length > 0) {
    collectedFiles.forEach(f => {
      console.log('[EDS Inspector JSON] File:', f.filename, f.url);
      });
  } else {
    console.error('[EDS Inspector JSON] ❌ NO JSON FILES FOUND!');
    console.error('[EDS Inspector JSON] All .json candidates:', jsonCandidates.map(r => r.name));
  }
  
  return jsonFiles;
}

/**
 * fetchとXMLHttpRequestをインターセプトしてJSONファイルを検出（将来の拡張用）
 * 現在は拡張子のみで判定するため、この関数は不要だが、将来の拡張のために残す
 */
export function setupJsonInterceptor() {
  // 現在は拡張子のみで判定するため、何もしない
  // 将来、Content-Typeでの判定が必要になった場合に使用
}

