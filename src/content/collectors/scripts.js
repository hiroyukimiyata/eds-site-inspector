/**
 * JSファイルの収集（/blocks/*.js以外）
 */

/**
 * JSファイルを収集
 */
export function collectScriptFiles() {
  const scriptFiles = new Map();
  const mainOrigin = window.location.origin;
  
  console.log('[EDS Inspector Scripts] Starting collection, origin:', mainOrigin);
  
  // Performance APIからネットワークリクエストを収集
  const resources = performance.getEntriesByType('resource');
  console.log('[EDS Inspector Scripts] Total resources:', resources.length);
  
  // .jsを含むすべてのリソースをまず抽出
  const jsCandidates = resources.filter(r => r.name && r.name.includes('.js'));
  console.log('[EDS Inspector Scripts] Resources containing .js:', jsCandidates.length);
  jsCandidates.forEach(r => {
    console.log('[EDS Inspector Scripts] Candidate:', r.name);
  });
  
  // すべてのリソースをチェック
  resources.forEach((entry) => {
    const urlString = entry.name;
    if (!urlString || typeof urlString !== 'string') return;
    
    // .jsを含むかチェック
    if (!urlString.includes('.js')) return;
    
    try {
      // URLを解析
      let url;
      try {
        url = new URL(urlString);
      } catch (e) {
        // 相対URLの場合は現在のページのURLをベースにする
        url = new URL(urlString, window.location.href);
      }
      
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
        console.log('[EDS Inspector Scripts] Skipping different domain:', url.origin, 'vs', mainOrigin);
        return;
      }
      
      console.log('[EDS Inspector Scripts] Processing:', urlString, '-> origin:', url.origin, 'pathname:', url.pathname);
      console.log('[EDS Inspector Scripts] Main origin:', mainOrigin);
      
      // パス名を取得
      const pathname = url.pathname;
      
      // /blocks/*.js を除外
      if (pathname.includes('/blocks/') && pathname.endsWith('.js')) {
        console.log('[EDS Inspector Scripts] Skipping block JS:', pathname);
        return;
      }
      
      // .jsで終わるURLを検出
      if (pathname.endsWith('.js')) {
        // ファイル名を抽出
        const pathParts = pathname.split('/').filter(p => p);
        const filename = pathParts[pathParts.length - 1] || pathname;
        
        // 正規化されたURLを保存
        const normalizedUrl = url.toString();
        
        scriptFiles.set(normalizedUrl, {
          url: normalizedUrl,
          pathname: pathname,
          filename: filename
        });
        console.log('[EDS Inspector Scripts] ✓ Found script:', filename, '->', normalizedUrl);
      }
    } catch (e) {
      console.warn('[EDS Inspector Scripts] Error processing URL:', urlString, e);
    }
  });
  
  const collectedFiles = Array.from(scriptFiles.values());
  console.log('[EDS Inspector Scripts] ✓ FINAL RESULT: Collected', collectedFiles.length, 'script files');
  if (collectedFiles.length > 0) {
    collectedFiles.forEach(f => {
      console.log('[EDS Inspector Scripts] File:', f.filename, f.url);
    });
  } else {
    console.error('[EDS Inspector Scripts] ❌ NO SCRIPT FILES FOUND!');
    console.error('[EDS Inspector Scripts] All .js candidates:', jsCandidates.map(r => r.name));
  }
  
  return scriptFiles;
}

