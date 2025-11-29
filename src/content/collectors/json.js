/**
 * JSONファイルの収集
 */

// グローバルストレージにJSONファイルを保存（fetch/XHRインターセプト用）
if (!window.__edsJsonFiles) {
  window.__edsJsonFiles = new Map();
}

/**
 * JSONファイルを収集
 */
export function collectJsonFiles() {
  const jsonFiles = new Map(); // url -> { url, pathname, filename }
  const mainOrigin = window.location.origin;
  
  const addFromUrl = (urlString, contentType = null) => {
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
                        pathname.match(/\.json(\?|$)/) ||
                        contentType?.includes('application/json');
      
      if (isJsonFile) {
        // ファイル名を抽出
        const pathParts = pathname.split('/').filter(p => p);
        const filename = pathParts[pathParts.length - 1]?.split('?')[0] || pathname;
        
        jsonFiles.set(urlString, {
          url: urlString,
          pathname: pathname,
          filename: filename
        });
        console.log('[EDS Inspector] Found JSON file:', filename, 'from URL:', urlString, 'Content-Type:', contentType);
      }
    } catch (e) {
      // URL解析エラーは無視
    }
  };

  // グローバルストレージから既に検出されたJSONファイルを追加
  window.__edsJsonFiles.forEach((contentType, urlString) => {
    addFromUrl(urlString, contentType);
  });

  // Performance APIからネットワークリクエストを収集
  const resources = performance.getEntriesByType('resource');
  console.log('[EDS Inspector] Checking', resources.length, 'network resources for JSON files...');
  
  resources.forEach((entry) => {
    if (entry.name) {
      // グローバルストレージにContent-Typeが保存されている場合は使用
      const contentType = window.__edsJsonFiles.get(entry.name);
      addFromUrl(entry.name, contentType);
    }
  });
  
  // PerformanceObserverで追加のリクエストを監視
  try {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.name) {
          const contentType = window.__edsJsonFiles.get(entry.name);
          addFromUrl(entry.name, contentType);
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

/**
 * fetchとXMLHttpRequestをインターセプトしてJSONファイルを検出
 */
export function setupJsonInterceptor() {
  // 既にセットアップされている場合はスキップ
  if (window.__edsJsonInterceptorSetup) {
    return;
  }
  window.__edsJsonInterceptorSetup = true;

  // fetchをインターセプト
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const url = args[0];
    const urlString = typeof url === 'string' ? url : url?.url || url?.toString();
    
    try {
      const response = await originalFetch.apply(this, args);
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        const fullUrl = urlString.startsWith('http') ? urlString : new URL(urlString, window.location.href).toString();
        window.__edsJsonFiles.set(fullUrl, contentType);
        console.log('[EDS Inspector] Intercepted JSON via fetch:', fullUrl);
      }
      
      return response;
    } catch (e) {
      return originalFetch.apply(this, args);
    }
  };

  // XMLHttpRequestをインターセプト
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._edsUrl = url;
    return originalOpen.apply(this, [method, url, ...rest]);
  };
  
  XMLHttpRequest.prototype.send = function(...args) {
    const xhr = this;
    const urlString = xhr._edsUrl;
    
    const originalOnReadyStateChange = xhr.onreadystatechange;
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        const contentType = xhr.getResponseHeader('content-type');
        if (contentType && contentType.includes('application/json')) {
          const fullUrl = urlString.startsWith('http') ? urlString : new URL(urlString, window.location.href).toString();
          window.__edsJsonFiles.set(fullUrl, contentType);
          console.log('[EDS Inspector] Intercepted JSON via XHR:', fullUrl);
        }
      }
      if (originalOnReadyStateChange) {
        originalOnReadyStateChange.apply(this, arguments);
      }
    };
    
    return originalSend.apply(this, args);
  };
}

