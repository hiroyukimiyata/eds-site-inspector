/**
 * ファイル表示用の共通ユーティリティ
 */

// 検索ワードのストレージキー
const SEARCH_STORAGE_PREFIX = 'eds-search-';

/**
 * 全画面表示を開くアイコン（4つの矢印が外側に向かう）を生成
 */
export function createFullscreenEnterIcon() {
  return `
    <svg version="1.1" id="_x32_" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 512 512" style="width: 32px; height: 32px; opacity: 1;" xml:space="preserve">
      <style type="text/css">
        .st0{fill:currentColor;}
      </style>
      <g>
        <polygon class="st0" points="481.706,337.186 481.711,460.288 277.415,256 481.711,51.704 481.711,174.821 511.996,174.821 512,0 
        337.175,0 337.175,30.294 460.292,30.294 256,234.588 51.704,30.294 174.817,30.294 174.817,0 0,0 0.004,174.821 30.289,174.821 
        30.289,51.704 234.581,256 30.289,460.288 30.289,337.17 0.004,337.179 0,512 174.817,512 174.817,481.706 51.704,481.706 
        256,277.419 460.292,481.706 337.175,481.706 337.175,512 512,512 511.996,337.179 " />
      </g>
    </svg>
  `;
}

/**
 * 全画面表示を閉じるアイコン（4つの矢印が中央に向かう）を生成
 */
export function createFullscreenExitIcon() {
  return `
    <svg version="1.1" id="_x32_" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 512 512" style="width: 32px; height: 32px; opacity: 1;" xml:space="preserve">
      <style type="text/css">
        .st0{fill:currentColor;}
      </style>
      <g>
        <polygon class="st0" points="500.66,155.854 377.547,155.854 511.993,21.418 490.574,0.008 356.137,134.444 356.137,11.331 
        325.844,11.339 325.844,186.147 500.66,186.147 " />
        <polygon class="st0" points="377.547,356.129 500.66,356.129 500.66,325.844 325.844,325.837 325.844,500.653 356.137,500.668 
        356.137,377.555 490.59,511.992 512,490.565 " />
        <polygon class="st0" points="11.34,155.863 11.348,186.155 186.156,186.155 186.156,11.347 155.88,11.339 155.88,134.444 
        21.434,0.008 0.016,21.426 134.453,155.863 " />
        <polygon class="st0" points="11.355,325.837 11.355,356.121 134.453,356.121 0,490.565 21.442,511.984 155.871,377.539 
        155.871,500.653 186.171,500.644 186.164,325.837 " />
      </g>
    </svg>
  `;
}

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
  
  searchBar.appendChild(searchInput);
  searchBar.appendChild(searchInfo);
  searchBar.appendChild(prevBtn);
  searchBar.appendChild(nextBtn);
  searchContainer.appendChild(searchBar);
  
  let matches = [];
  let currentMatchIndex = -1;
  let originalCodeHTML = null;
  let originalPlainText = rawText; // 元のプレーンテキストを保持
  
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
    
    // ハイライト済みHTMLからプレーンテキストを抽出（HTMLタグを除去）
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = codeElement.innerHTML;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    
    // rawTextが利用可能な場合はそれを使用、そうでなければ抽出したテキストを使用
    const textToSearch = originalPlainText || plainText;
    
    matches = [];
    currentMatchIndex = -1;
    
    if (!searchText) {
      searchInfo.textContent = '';
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      return;
    }
    
    // プレーンテキストから検索マッチを探す
    const regex = new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matchIndices = [];
    let match;
    while ((match = regex.exec(textToSearch)) !== null) {
      matchIndices.push({
        index: match.index,
        length: match[0].length
      });
    }
    
    // マッチが見つかった場合、code要素内のテキストノードを検索してハイライト
    if (matchIndices.length > 0) {
      // code要素内のテキストノードを取得
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
      
      // テキストノードの累積オフセットを計算
      let cumulativeOffset = 0;
      let matchIndex = 0;
      
      textNodes.forEach(textNode => {
        const text = textNode.textContent;
        const nodeStart = cumulativeOffset;
        const nodeEnd = cumulativeOffset + text.length;
        
        // このノードに含まれるマッチを探す
        const nodeMatches = [];
        while (matchIndex < matchIndices.length) {
          const match = matchIndices[matchIndex];
          const matchStart = match.index;
          const matchEnd = match.index + match.length;
          
          // マッチがこのノードの範囲内にあるか
          if (matchStart >= nodeStart && matchStart < nodeEnd) {
            const relativeStart = matchStart - nodeStart;
            const relativeEnd = Math.min(matchEnd - nodeStart, text.length);
            nodeMatches.push({
              index: relativeStart,
              length: relativeEnd - relativeStart
            });
            matches.push({
              node: textNode,
              index: relativeStart,
              length: relativeEnd - relativeStart
            });
            matchIndex++;
          } else if (matchStart >= nodeEnd) {
            // このノードより後にあるので、次のノードへ
            break;
          } else {
            matchIndex++;
          }
        }
        
        // マッチが見つかった場合、テキストノードを分割してハイライト
        if (nodeMatches.length > 0) {
          const parent = textNode.parentNode;
          const parts = [];
          let lastIndex = 0;
          
          nodeMatches.forEach(({ index, length }) => {
            if (index > lastIndex) {
              parts.push(text.substring(lastIndex, index));
            }
            const matchText = text.substring(index, index + length);
            const highlight = document.createElement('mark');
            highlight.className = 'eds-search-highlight';
            highlight.style.cssText = 'background: #fbbf24; color: #0b1220; padding: 2px 2px; border-radius: 2px; font-weight: 500;';
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
        
        cumulativeOffset = nodeEnd;
      });
    }
    
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
          el.style.cssText = 'background: #f59e0b; color: #0b1220; padding: 2px 2px; border-radius: 2px; font-weight: 600; box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.3);';
        } else {
          el.style.cssText = 'background: #fbbf24; color: #0b1220; padding: 2px 2px; border-radius: 2px; font-weight: 500;';
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
    // originalCodeHTMLは保持（再検索時に使用するため）
    // 検索ワードをクリア
    if (searchKey) {
      saveSearchQuery(searchKey, '');
    }
  };
  
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

/**
 * 全画面表示モーダルを作成・表示
 * @param {string} rawContent - 元のコンテンツ（検索用のプレーンテキスト）
 * @param {string} processedHtml - 処理済みのHTML（シンタックスハイライト済み）
 * @param {string} title - タイトル
 * @param {string} searchKey - 検索キー（オプション）
 */
export function createFullscreenViewer(rawContent, processedHtml, title, searchKey = null) {
  // 既存の全画面表示があれば削除
  const existing = document.querySelector('.eds-fullscreen-viewer');
  if (existing) {
    existing.remove();
  }
  
  // 全画面表示コンテナを作成
  const fullscreenContainer = document.createElement('div');
  fullscreenContainer.className = 'eds-fullscreen-viewer';
  fullscreenContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--bg);
    z-index: 10000;
    display: flex;
    flex-direction: column;
    animation: fadeIn 0.2s ease;
  `;
  
  // ヘッダーを作成
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 12px 16px;
    background: var(--bg-muted);
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  `;
  
  const headerLeft = document.createElement('div');
  headerLeft.style.cssText = 'display: flex; align-items: center; gap: 12px;';
  
  const titleElement = document.createElement('div');
  titleElement.textContent = title;
  titleElement.style.cssText = 'font-weight: 600; color: var(--text); font-size: 14px;';
  
  headerLeft.appendChild(titleElement);
  
  const headerRight = document.createElement('div');
  headerRight.style.cssText = 'display: flex; align-items: center; gap: 8px;';
  
  // コピーボタン
  const copyBtn = createCopyButton(rawContent, null, null);
  copyBtn.style.cssText = 'background: transparent; border: 1px solid var(--border); border-radius: 4px; color: var(--text); cursor: pointer; padding: 6px 12px; font-size: 12px; transition: all 0.2s;';
  
  // 閉じるボタン（領域を小さくするニュアンスのアイコン）
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = createFullscreenExitIcon();
  closeBtn.title = 'Close (ESC)';
  closeBtn.style.cssText = 'background: transparent; border: 1px solid var(--border); border-radius: 4px; color: var(--text); cursor: pointer; padding: 4px 8px; font-size: 14px; transition: all 0.2s; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px;';
  closeBtn.addEventListener('click', () => {
    fullscreenContainer.remove();
    document.removeEventListener('keydown', handleEsc);
  });
  
  headerRight.appendChild(copyBtn);
  headerRight.appendChild(closeBtn);
  
  header.appendChild(headerLeft);
  header.appendChild(headerRight);
  
  // コンテンツエリアを作成
  const contentArea = document.createElement('div');
  contentArea.style.cssText = `
    flex: 1;
    overflow: auto;
    position: relative;
    padding: 0;
  `;
  
  // 検索UIを追加（rawContentを使用）
  const searchUI = createSearchUI(contentArea, rawContent, searchKey);
  
  // コードコンテナを作成
  const codeContainer = document.createElement('div');
  codeContainer.style.cssText = 'padding: 16px;';
  
  const pre = document.createElement('pre');
  pre.className = 'eds-code';
  pre.style.cssText = 'background: var(--bg-muted); border: 1px solid var(--border); border-radius: 8px; padding: 16px; overflow-x: auto; margin: 0;';
  
  const code = document.createElement('code');
  code.innerHTML = processedHtml;
  code.style.cssText = 'font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace; font-size: 12px; line-height: 1.6; display: block;';
  
  pre.appendChild(code);
  codeContainer.appendChild(pre);
  
  contentArea.appendChild(searchUI);
  contentArea.appendChild(codeContainer);
  
  fullscreenContainer.appendChild(header);
  fullscreenContainer.appendChild(contentArea);
  
  // ESCキーで閉じる
  const handleEsc = (e) => {
    if (e.key === 'Escape') {
      fullscreenContainer.remove();
      document.removeEventListener('keydown', handleEsc);
    }
  };
  document.addEventListener('keydown', handleEsc);
  
  // アニメーション用のCSSを追加（まだ存在しない場合）
  if (!document.querySelector('#eds-fullscreen-styles')) {
    const style = document.createElement('style');
    style.id = 'eds-fullscreen-styles';
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
  
  // パネルのルートに追加
  const panelRoot = document.querySelector('[data-tab-panel]')?.closest('main') || document.body;
  panelRoot.appendChild(fullscreenContainer);
  
  return fullscreenContainer;
}

