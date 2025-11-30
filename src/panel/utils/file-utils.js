/**
 * ファイル表示用の共通ユーティリティ
 */

// 検索ワードのストレージキー
const SEARCH_STORAGE_PREFIX = 'eds-search-';

/**
 * 検索ワードを保存
 */
function saveSearchQuery(key, query) {
  try {
    sessionStorage.setItem(`${SEARCH_STORAGE_PREFIX}${key}`, query);
  } catch (err) {
    console.warn('[EDS Inspector Panel] Failed to save search query:', err);
  }
}

/**
 * 検索ワードを取得
 */
function getSearchQuery(key) {
  try {
    return sessionStorage.getItem(`${SEARCH_STORAGE_PREFIX}${key}`) || '';
  } catch (err) {
    console.warn('[EDS Inspector Panel] Failed to get search query:', err);
    return '';
  }
}

/**
 * クリップボードにコピー（DevTools対応）
 */
export function copyToClipboard(text) {
  // DevToolsのコンテキストではClipboard APIがブロックされるため、フォールバック方法を使用
  const copyWithFallback = (textToCopy) => {
    // テキストエリアを作成してコピー
    const textarea = document.createElement('textarea');
    textarea.value = textToCopy;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textToCopy.length);
    
    try {
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      return successful;
    } catch (err) {
      document.body.removeChild(textarea);
      throw err;
    }
  };
  
  return new Promise((resolve, reject) => {
    // まずClipboard APIを試す
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        resolve(true);
      }).catch(() => {
        // Clipboard APIが失敗した場合はフォールバックを使用
        try {
          if (copyWithFallback(text)) {
            resolve(true);
          } else {
            reject(new Error('Copy failed'));
          }
        } catch (err) {
          reject(err);
        }
      });
    } else {
      // Clipboard APIが利用できない場合はフォールバックを使用
      try {
        if (copyWithFallback(text)) {
          resolve(true);
        } else {
          reject(new Error('Copy failed'));
        }
      } catch (err) {
        reject(err);
      }
    }
  });
}

/**
 * コピーボタンを作成
 */
export function createCopyButton(content, onSuccess, onError) {
  const copyBtn = document.createElement('button');
  copyBtn.className = 'eds-copy-button';
  copyBtn.innerHTML = '📋';
  copyBtn.title = 'Copy to clipboard';
  copyBtn.style.cssText = 'background: transparent; border: none; cursor: pointer; padding: 4px 8px; font-size: 14px; color: var(--muted); transition: color 0.2s; flex-shrink: 0;';
  copyBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await copyToClipboard(content);
      if (onSuccess) {
        onSuccess(copyBtn);
      } else {
        showCopySuccess(copyBtn);
      }
    } catch (err) {
      console.error('[EDS Inspector Panel] Failed to copy:', err);
      if (onError) {
        onError(copyBtn, err);
      } else {
        showCopyError(copyBtn);
      }
    }
  });
  return copyBtn;
}

/**
 * コピー成功を表示
 */
function showCopySuccess(button) {
  const originalHTML = button.innerHTML;
  const originalColor = button.style.color;
  button.innerHTML = '✓';
  button.style.color = '#86efac';
  setTimeout(() => {
    button.innerHTML = originalHTML;
    button.style.color = originalColor;
  }, 2000);
}

/**
 * コピーエラーを表示
 */
function showCopyError(button) {
  const originalHTML = button.innerHTML;
  const originalColor = button.style.color;
  button.innerHTML = '✗';
  button.style.color = '#f87171';
  setTimeout(() => {
    button.innerHTML = originalHTML;
    button.style.color = originalColor;
  }, 2000);
}

/**
 * 検索UIを作成
 */
export function createSearchUI(contentElement, rawText, searchKey = null) {
  const searchContainer = document.createElement('div');
  searchContainer.className = 'eds-search-container';
  searchContainer.style.cssText = 'display: flex; flex-direction: column; gap: 0; background: var(--bg-muted); border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 10;';
  
  const searchBar = document.createElement('div');
  searchBar.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 8px;';
  
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search in file... (Ctrl+F / Cmd+F)';
  searchInput.className = 'eds-search-input';
  searchInput.style.cssText = 'flex: 1; padding: 6px 10px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text); font-size: 12px; font-family: inherit;';
  
  // 保存された検索ワードを復元
  if (searchKey) {
    const savedQuery = getSearchQuery(searchKey);
    if (savedQuery) {
      searchInput.value = savedQuery;
    }
  }
  
  const searchInfo = document.createElement('span');
  searchInfo.className = 'eds-search-info';
  searchInfo.style.cssText = 'font-size: 11px; color: var(--muted); min-width: 60px; text-align: right;';
  
  const prevBtn = document.createElement('button');
  prevBtn.innerHTML = '◀';
  prevBtn.title = 'Previous match';
  prevBtn.className = 'eds-search-nav';
  prevBtn.style.cssText = 'background: transparent; border: 1px solid var(--border); border-radius: 4px; cursor: pointer; padding: 4px 8px; font-size: 12px; color: var(--text); transition: all 0.2s;';
  prevBtn.disabled = true;
  
  const nextBtn = document.createElement('button');
  nextBtn.innerHTML = '▶';
  nextBtn.title = 'Next match';
  nextBtn.className = 'eds-search-nav';
  nextBtn.style.cssText = 'background: transparent; border: 1px solid var(--border); border-radius: 4px; cursor: pointer; padding: 4px 8px; font-size: 12px; color: var(--text); transition: all 0.2s;';
  nextBtn.disabled = true;
  
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '✕';
  closeBtn.title = 'Close search';
  closeBtn.style.cssText = 'background: transparent; border: none; cursor: pointer; padding: 4px 8px; font-size: 14px; color: var(--muted); transition: color 0.2s;';
  
  searchBar.appendChild(searchInput);
  searchBar.appendChild(searchInfo);
  searchBar.appendChild(prevBtn);
  searchBar.appendChild(nextBtn);
  searchBar.appendChild(closeBtn);
  searchContainer.appendChild(searchBar);
  
  let matches = [];
  let currentMatchIndex = -1;
  let originalCodeHTML = null;
  
  const highlightMatches = (searchText) => {
    const codeElement = contentElement.querySelector('code');
    if (!codeElement) return;
    
    // 最初の検索時に元のHTMLを保存
    if (originalCodeHTML === null) {
      originalCodeHTML = codeElement.innerHTML;
    }
    
    // 既存のハイライトを削除して元のHTMLを復元
    if (originalCodeHTML) {
      codeElement.innerHTML = originalCodeHTML;
    }
    
    matches = [];
    currentMatchIndex = -1;
    
    if (!searchText) {
      searchInfo.textContent = '';
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      return;
    }
    
    // code要素内のテキストを検索
    const walker = document.createTreeWalker(
      codeElement,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }
    
    const regex = new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    
    textNodes.forEach(textNode => {
      const text = textNode.textContent;
      const matchIndices = [];
      let match;
      const tempRegex = new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      while ((match = tempRegex.exec(text)) !== null) {
        matchIndices.push({
          index: match.index,
          length: match[0].length
        });
        matches.push({
          node: textNode,
          index: match.index,
          length: match[0].length
        });
      }
      
      if (matchIndices.length > 0) {
        // テキストノードを分割してハイライト
        const parent = textNode.parentNode;
        const parts = [];
        let lastIndex = 0;
        
        matchIndices.forEach(({ index, length }) => {
          if (index > lastIndex) {
            parts.push(text.substring(lastIndex, index));
          }
          const matchText = text.substring(index, index + length);
          const highlight = document.createElement('mark');
          highlight.className = 'eds-search-highlight';
          highlight.style.cssText = 'background: #fbbf24; color: #0b1220; padding: 2px 0;';
          highlight.textContent = matchText;
          parts.push(highlight);
          lastIndex = index + length;
        });
        
        if (lastIndex < text.length) {
          parts.push(text.substring(lastIndex));
        }
        
        // テキストノードを置き換え
        const fragment = document.createDocumentFragment();
        parts.forEach(part => {
          if (typeof part === 'string') {
            fragment.appendChild(document.createTextNode(part));
          } else {
            fragment.appendChild(part);
          }
        });
        
        parent.replaceChild(fragment, textNode);
      }
    });
    
    if (matches.length > 0) {
      currentMatchIndex = 0;
      scrollToMatch(0);
      updateSearchInfo();
    } else {
      searchInfo.textContent = 'No matches';
      prevBtn.disabled = true;
      nextBtn.disabled = true;
    }
  };
  
  const scrollToMatch = (index) => {
    if (matches.length === 0 || index < 0 || index >= matches.length) return;
    
    const markElements = Array.from(contentElement.querySelectorAll('mark.eds-search-highlight'));
    if (markElements[index]) {
      const matchElement = markElements[index];
      
      // contentElementがスクロール可能なコンテナ
      const scrollContainer = contentElement;
      
      // 検索UIの高さを取得
      const searchContainerHeight = searchContainer.offsetHeight || 0;
      
      // マッチ要素の位置を取得（contentElement内での相対位置）
      const matchRect = matchElement.getBoundingClientRect();
      const containerRect = scrollContainer.getBoundingClientRect();
      
      // マッチ要素のoffsetTopを取得（検索UIを含む）
      let offsetTop = 0;
      let element = matchElement;
      while (element && element !== scrollContainer) {
        offsetTop += element.offsetTop;
        element = element.offsetParent;
      }
      
      // スクロール位置を計算
      // 検索UIの高さ分だけ下にスクロールして、マッチ要素が見えるように
      const targetScrollTop = offsetTop - searchContainerHeight - 20; // 20pxの余白
      
      // スクロール実行
      scrollContainer.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth'
      });
      
      // 現在のマッチを強調
      markElements.forEach((el, i) => {
        if (i === index) {
          el.style.cssText = 'background: #f59e0b; color: #0b1220; padding: 2px 0; font-weight: 600;';
        } else {
          el.style.cssText = 'background: #fbbf24; color: #0b1220; padding: 2px 0;';
        }
      });
    }
  };
  
  const updateSearchInfo = () => {
    if (matches.length > 0) {
      searchInfo.textContent = `${currentMatchIndex + 1} / ${matches.length}`;
      prevBtn.disabled = false;
      nextBtn.disabled = false;
    } else {
      searchInfo.textContent = '';
      prevBtn.disabled = true;
      nextBtn.disabled = true;
    }
  };
  
  searchInput.addEventListener('input', (e) => {
    const searchText = e.target.value;
    // 検索ワードを保存
    if (searchKey) {
      saveSearchQuery(searchKey, searchText);
    }
    highlightMatches(searchText);
  });
  
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift+Enter: 前のマッチ
        if (currentMatchIndex > 0) {
          currentMatchIndex--;
          scrollToMatch(currentMatchIndex);
          updateSearchInfo();
        }
      } else {
        // Enter: 次のマッチ
        if (currentMatchIndex < matches.length - 1) {
          currentMatchIndex++;
          scrollToMatch(currentMatchIndex);
          updateSearchInfo();
        }
      }
    } else if (e.key === 'Escape') {
      clearSearch();
      searchInput.blur();
    }
  });
  
  prevBtn.addEventListener('click', () => {
    if (currentMatchIndex > 0) {
      currentMatchIndex--;
      scrollToMatch(currentMatchIndex);
      updateSearchInfo();
    } else if (matches.length > 0) {
      currentMatchIndex = matches.length - 1;
      scrollToMatch(currentMatchIndex);
      updateSearchInfo();
    }
  });
  
  nextBtn.addEventListener('click', () => {
    if (currentMatchIndex < matches.length - 1) {
      currentMatchIndex++;
      scrollToMatch(currentMatchIndex);
      updateSearchInfo();
    } else if (matches.length > 0) {
      currentMatchIndex = 0;
      scrollToMatch(currentMatchIndex);
      updateSearchInfo();
    }
  });
  
  const clearSearch = () => {
    highlightMatches('');
    searchInput.value = '';
    originalCodeHTML = null;
    // 検索ワードをクリア
    if (searchKey) {
      saveSearchQuery(searchKey, '');
    }
  };
  
  closeBtn.addEventListener('click', clearSearch);
  
  // Ctrl+F / Cmd+Fで検索入力欄にフォーカス
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      e.stopPropagation();
      searchInput.focus();
      searchInput.select();
    } else if (e.key === 'Escape') {
      clearSearch();
      searchInput.blur();
    }
  };
  
  // contentElementにフォーカス可能な属性を追加
  if (!contentElement.hasAttribute('tabindex')) {
    contentElement.setAttribute('tabindex', '-1');
  }
  
  contentElement.addEventListener('keydown', handleKeyDown);
  
  // searchBarに要素を追加
  searchBar.appendChild(searchInput);
  searchBar.appendChild(searchInfo);
  searchBar.appendChild(prevBtn);
  searchBar.appendChild(nextBtn);
  searchBar.appendChild(closeBtn);
  searchContainer.appendChild(searchBar);
  
  // 保存された検索ワードがある場合は、初期表示時に検索を実行
  if (searchKey) {
    const savedQuery = getSearchQuery(searchKey);
    if (savedQuery) {
      // DOMが構築された後に検索を実行
      setTimeout(() => {
        searchInput.value = savedQuery;
        highlightMatches(savedQuery);
      }, 100);
    }
  }
  
  return searchContainer;
}

