/**
 * JSONファイルの収集
 */

/**
 * JSONファイルを収集
 */
export function collectJsonFiles() {
  const jsonFiles = new Map(); // url -> { url, pathname, filename }
  const mainOrigin = window.location.origin;
  
  const addFromUrl = (urlString) => {
    try {
      if (!urlString || typeof urlString !== 'string') return;
      
      // URLを解析
      let url;
      try {
        url = new URL(urlString);
      } catch (e) {
        // 相対URLの場合は現在のページのURLをベースにする
        url = new URL(urlString, window.location.href);
      }
      
      // メインドメインと同じドメインのもののみを対象
      if (url.origin !== mainOrigin) {
        return;
      }
      
      const { pathname } = url;
      
      // .jsonで終わるURL、またはContent-Typeがapplication/jsonのものを検出
      const isJsonFile = pathname.endsWith('.json') || 
                        pathname.match(/\.json(\?|$)/);
      
      if (isJsonFile) {
        // ファイル名を抽出
        const pathParts = pathname.split('/').filter(p => p);
        const filename = pathParts[pathParts.length - 1]?.split('?')[0] || pathname;
        
        jsonFiles.set(urlString, {
          url: urlString,
          pathname: pathname,
          filename: filename
        });
        console.log('[EDS Inspector] Found JSON file:', filename, 'from URL:', urlString);
      }
    } catch (e) {
      // URL解析エラーは無視
    }
  };

  // Performance APIからネットワークリクエストを収集
  const resources = performance.getEntriesByType('resource');
  console.log('[EDS Inspector] Checking', resources.length, 'network resources for JSON files...');
  
  resources.forEach((entry) => {
    if (entry.name) {
      addFromUrl(entry.name);
    }
  });
  
  // fetchとXMLHttpRequestのラップは、既に実行されている可能性があるため、
  // 重複してラップしないようにする（パフォーマンスとエラー回避のため）
  
  // PerformanceObserverで追加のリクエストを監視
  try {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.name) {
          addFromUrl(entry.name);
        }
      });
    });
    observer.observe({ entryTypes: ['resource'] });
  } catch (e) {
    // PerformanceObserverがサポートされていない場合は無視
  }
  
  const collectedFiles = Array.from(jsonFiles.values());
  console.log('[EDS Inspector] Collected JSON files:', collectedFiles.length, 'files:', collectedFiles.map(f => f.filename));
  return jsonFiles;
}

