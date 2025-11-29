/**
 * リソース収集（ブロック、アイコン、メディア）
 */

/**
 * ブロックリソース名を収集
 */
export function collectBlockResourceNames() {
  const blockNames = new Set();
  const addFromUrl = (urlString) => {
    try {
      const { pathname } = new URL(urlString, window.location.href);
      // /blocks/{block-name}/ というパターンを検出
      const match = pathname.match(/\/blocks\/([^/]+)\//);
      if (match && match[1]) {
        blockNames.add(match[1]);
        console.log('[EDS Inspector] Found block resource:', match[1], 'from URL:', urlString);
      }
    } catch (e) {
      /* noop */
    }
  };

  // Performance APIからネットワークリクエストを収集
  performance.getEntriesByType('resource').forEach((entry) => {
    addFromUrl(entry.name);
  });
  
  // DOMからlink/scriptタグのURLを収集
  document.querySelectorAll('link[href*="/blocks/"], script[src*="/blocks/"]').forEach((el) => {
    const url = el.getAttribute('href') || el.getAttribute('src');
    if (url) addFromUrl(url);
  });
  
  // ネットワークリクエストを監視（既に読み込まれたリソースも含む）
  // 追加のリクエストをキャッチするため、PerformanceObserverも使用
  try {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.name) addFromUrl(entry.name);
      });
    });
    observer.observe({ entryTypes: ['resource'] });
  } catch (e) {
    // PerformanceObserverがサポートされていない場合は無視
  }
  
  console.log('[EDS Inspector] Collected block names:', Array.from(blockNames));
  return blockNames;
}

/**
 * アイコン名を収集
 */
export function collectIconNames() {
  const iconMap = new Map(); // iconName -> url
  const addFromUrl = (urlString) => {
    try {
      const { pathname, origin } = new URL(urlString, window.location.href);
      // ルート位置からの /icons/{icon-name} というパターンを検出
      // パスの途中に /icons/ が含まれる場合は除外
      if (!pathname.startsWith('/icons/')) {
        return;
      }
      const match = pathname.match(/^\/icons\/([^/]+)/);
      if (match && match[1]) {
        // ファイル拡張子を除去（例: arrow.svg -> arrow, icon-arrow.svg -> icon-arrow）
        let iconName = match[1].replace(/\.(svg|png|jpg|jpeg|gif|webp)$/i, '');
        // icon- プレフィックスを除去（例: icon-arrow -> arrow）
        if (iconName.startsWith('icon-')) {
          iconName = iconName.replace(/^icon-/, '');
        }
        // 完全なURLを保存
        const fullUrl = `${origin}${pathname}`;
        iconMap.set(iconName, fullUrl);
        console.log('[EDS Inspector] Found icon resource:', iconName, 'from URL:', urlString);
      }
    } catch (e) {
      /* noop */
    }
  };

  // Performance APIからネットワークリクエストを収集
  performance.getEntriesByType('resource').forEach((entry) => {
    addFromUrl(entry.name);
  });
  
  // DOMからlink/script/imgタグのURLを収集
  document.querySelectorAll('link[href*="/icons/"], script[src*="/icons/"], img[src*="/icons/"]').forEach((el) => {
    const url = el.getAttribute('href') || el.getAttribute('src');
    if (url) addFromUrl(url);
  });
  
  // ネットワークリクエストを監視（既に読み込まれたリソースも含む）
  // 追加のリクエストをキャッチするため、PerformanceObserverも使用
  try {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.name) addFromUrl(entry.name);
      });
    });
    observer.observe({ entryTypes: ['resource'] });
  } catch (e) {
    // PerformanceObserverがサポートされていない場合は無視
  }
  
  console.log('[EDS Inspector] Collected icon names:', Array.from(iconMap.keys()));
  return iconMap;
}

/**
 * メディアファイルを収集
 */
export function collectMediaFiles() {
  const mediaMap = new Map(); // fileName -> url
  // Media Busのファイル名パターン: media_ + 10文字以上のハッシュ値（16進数）+ 拡張子
  const mediaFilePattern = /^media_[0-9a-fA-F]{10,}\.[a-zA-Z0-9]+$/;
  
  const addFromUrl = (urlString) => {
    try {
      if (!urlString || typeof urlString !== 'string') return;
      
      // URLにmedia_が含まれていない場合はスキップ
      if (!urlString.includes('media_')) return;
      
      // URLを解析（相対URLの場合は現在のページのURLをベースにする）
      let url;
      try {
        url = new URL(urlString);
      } catch (e) {
        // 相対URLの場合は現在のページのURLをベースにする
        url = new URL(urlString, window.location.href);
      }
      
      const { pathname, origin } = url;
      
      // パスからファイル名を抽出
      // 例: /developer/media_1a70c29a5d772d0dc5f0cd8d513af41df5bb8177d.jpeg → media_1a70c29a5d772d0dc5f0cd8d513af41df5bb8177d.jpeg
      const pathParts = pathname.split('/').filter(p => p);
      let fileName = pathParts[pathParts.length - 1];
      
      if (!fileName) return;
      
      // ファイル名にクエリパラメータが含まれている場合は除去
      fileName = fileName.split('?')[0];
      
      // Media Busのファイル名パターンに一致するか確認
      if (mediaFilePattern.test(fileName)) {
        // クエリパラメータを除去したURLを保存
        const urlWithoutQuery = `${origin}${pathname}`;
        mediaMap.set(fileName, urlWithoutQuery);
        console.log('[EDS Inspector] ✓ Found media file:', fileName);
      } else {
        // デバッグ用: パターンに一致しないファイル名をログ出力
        if (fileName.startsWith('media_')) {
          console.log('[EDS Inspector] ✗ Media file pattern mismatch:', fileName);
          console.log('[EDS Inspector]   Pattern:', mediaFilePattern.toString());
          console.log('[EDS Inspector]   Full URL:', urlString);
          console.log('[EDS Inspector]   Pathname:', pathname);
        }
      }
    } catch (e) {
      // URL解析エラーは無視（相対URLなど）
      if (urlString.includes('media_')) {
        console.warn('[EDS Inspector] Error parsing URL:', urlString, e);
      }
    }
  };

  // Performance APIからネットワークリクエストを収集
  const resources = performance.getEntriesByType('resource');
  console.log('[EDS Inspector] Checking', resources.length, 'network resources for media files...');
  let mediaCount = 0;
  resources.forEach((entry) => {
    if (entry.name && entry.name.includes('media_')) {
      mediaCount++;
      addFromUrl(entry.name);
    }
  });
  console.log('[EDS Inspector] Found', mediaCount, 'resources containing "media_"');
  
  // DOMからimg/video/sourceタグのURLを収集（Lazy Load対応）
  // data-srcやsrcsetも含めて検出
  const mediaSelectors = [
    'img[src*="media_"]',
    'img[data-src*="media_"]',
    'video[src*="media_"]',
    'video[data-src*="media_"]',
    'source[src*="media_"]',
    'source[srcset*="media_"]',
    'picture source[srcset*="media_"]',
  ];
  const mediaElements = document.querySelectorAll(mediaSelectors.join(', '));
  console.log('[EDS Inspector] Checking', mediaElements.length, 'DOM elements for media files...');
  mediaElements.forEach((el) => {
    // src, data-src, srcsetの順で確認
    const url = el.getAttribute('src') || 
                el.getAttribute('data-src') || 
                el.getAttribute('srcset');
    if (url) {
      // srcsetの場合は最初のURLを取得
      const firstUrl = url.split(',')[0].trim().split(' ')[0];
      addFromUrl(firstUrl);
    }
  });
  
  const collectedFiles = Array.from(mediaMap.keys());
  console.log('[EDS Inspector] Collected media files:', collectedFiles.length, 'files:', collectedFiles);
  return mediaMap;
}

