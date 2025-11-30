/**
 * Content scriptとの通信
 */
export async function sendToContent(tabId, type, payload = {}) {
  console.log('[EDS Inspector Panel] Sending message to content:', type, payload);
  try {
    const response = await chrome.tabs.sendMessage(tabId, { target: 'eds-content', type, payload });
    console.log('[EDS Inspector Panel] Received response:', response);
    return response;
  } catch (err) {
    console.error('[EDS Inspector Panel] Failed to send message:', err);
    throw err;
  }
}

/**
 * Content scriptの注入を確保
 */
export async function ensureContentInjected(tabId) {
  console.log('[EDS Inspector Panel] Requesting content script injection...');
  console.log('[EDS Inspector Panel] Tab ID:', tabId);
  
  try {
    const response = await Promise.race([
      chrome.runtime.sendMessage({ type: 'eds-init-devtools', tabId }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Could not establish connection. Receiving end does not exist.')), 3000)
      )
    ]);
    console.log('[EDS Inspector Panel] Content script injection response:', response);
    
    if (response && response.ok === false) {
      throw new Error(response.error || 'Content script injection failed');
    }
    
    if (!response) {
      throw new Error('No response from service worker');
    }
    
    return response;
  } catch (err) {
    console.error('[EDS Inspector Panel] Failed to request content script injection:', err);
    
    const errorMessage = err.message || 'Unknown error';
    if (errorMessage.includes('Could not establish connection') || 
        errorMessage.includes('Receiving end does not exist')) {
      throw new Error('Could not establish connection. Receiving end does not exist.');
    }
    
    throw err;
  }
}

/**
 * HTMLエスケープ
 */
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * コードのシンタックスハイライト（簡易版）
 * すべてのコードタイプで、マッチした部分をエスケープしてから<span>タグで囲む
 */
export function highlightCode(code, lang) {
  if (lang === 'html') {
    // HTMLはエスケープ後にハイライト（エスケープされたHTMLタグを認識するため）
    const escaped = escapeHtml(code);
    return highlightHtml(escaped);
  } else if (lang === 'markdown') {
    return highlightMarkdown(code);
  } else if (lang === 'css') {
    return highlightCss(code);
  } else if (lang === 'javascript' || lang === 'js') {
    return highlightJs(code);
  } else if (lang === 'json') {
    return highlightJson(code);
  }
  
  return escapeHtml(code);
}

function highlightHtml(html) {
  return html
    .replace(/(&lt;\/?)([\w-]+)([^&]*?)(\/?&gt;)/g, (match, open, tag, attrs, close) => {
      const attrsHighlighted = attrs.replace(/(\w+)(=)(&quot;[^&]*&quot;|'[^']*'|[^\s&gt;]+)/g, 
        '<span class="eds-code-attr">$1</span><span class="eds-code-punct">$2</span><span class="eds-code-string">$3</span>');
      return `<span class="eds-code-tag">${open}</span><span class="eds-code-name">${tag}</span>${attrsHighlighted}<span class="eds-code-tag">${close}</span>`;
    })
    .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="eds-code-comment">$1</span>');
}

/**
 * Markdownコードに対してハイライトを適用
 */
function highlightMarkdown(md) {
  // まず全体をエスケープ
  const escaped = escapeHtml(md);
  let highlighted = escaped;
  
  // 見出し (# ## ### など)
  highlighted = highlighted.replace(/(#{1,6})\s+(.+)/g, (match, hashes, text) => {
    return `<span class="eds-code-keyword">${hashes}</span> ${text}`;
  });
  
  // コードブロック (```...```)
  highlighted = highlighted.replace(/(```[\s\S]*?```)/g, (match) => {
    return `<span class="eds-code-string">${match}</span>`;
  });
  
  // インラインコード (`...`)
  highlighted = highlighted.replace(/(`[^`]+`)/g, (match) => {
    return `<span class="eds-code-string">${match}</span>`;
  });
  
  // 強調 (**bold** または __bold__)
  highlighted = highlighted.replace(/(\*\*|__)(.+?)\1/g, (match, marker, text) => {
    return `<span class="eds-code-keyword">${marker}</span>${text}<span class="eds-code-keyword">${marker}</span>`;
  });
  
  // 斜体 (*italic* または _italic_) - **でない場合
  // 否定後読みアサーションはサポートされていないので、単純なパターンを使用
  // 強調の処理は既に上で行われているので、残っている単一の*は斜体として扱う
  highlighted = highlighted.replace(/\*([^*\s][^*]*[^*\s])\*/g, (match, text) => {
    // 既にハイライトされている部分（<span>タグを含む）はスキップ
    if (match.includes('<span')) return match;
    return `<span class="eds-code-function">*</span>${text}<span class="eds-code-function">*</span>`;
  });
  
  // リンク [text](url)
  highlighted = highlighted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
    return `<span class="eds-code-keyword">[</span>${text}<span class="eds-code-keyword">]</span><span class="eds-code-keyword">(</span><span class="eds-code-string">${url}</span><span class="eds-code-keyword">)</span>`;
  });
  
  // 画像 ![alt](url)
  highlighted = highlighted.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
    return `<span class="eds-code-comment">![</span>${alt}<span class="eds-code-comment">]</span><span class="eds-code-keyword">(</span><span class="eds-code-string">${url}</span><span class="eds-code-keyword">)</span>`;
  });
  
  // リスト (- または * または 1.)
  highlighted = highlighted.replace(/(\s*)([-*+]|\d+\.)\s+(.+)/g, (match, indent, marker, text) => {
    return `${indent}<span class="eds-code-keyword">${marker}</span> ${text}`;
  });
  
  // 引用 (>) - エスケープ後の形式
  highlighted = highlighted.replace(/(&gt;)\s+(.+)/g, (match, marker, text) => {
    return `<span class="eds-code-comment">${marker}</span> ${text}`;
  });
  
  // 水平線 (--- または ***)
  highlighted = highlighted.replace(/(---+|\*{3,})/g, (match) => {
    return `<span class="eds-code-comment">${match}</span>`;
  });
  
  return highlighted;
}

/**
 * CSSコードに対してハイライトを適用（エスケープ前のコードに対して正規表現を適用し、マッチした部分をエスケープしてから<span>タグで囲む）
 */
function highlightCss(css) {
  const matches = [];
  
  // コメント（最優先、他のマッチを除外するため）
  css.replace(/(\/\*[\s\S]*?\*\/)/g, (match, comment, offset) => {
    matches.push({ type: 'comment', match, offset, length: match.length });
  });
  
  // プロパティ名（:の前）
  css.replace(/([\w-]+)(\s*)(:)/g, (match, prop, space, colon, offset) => {
    matches.push({ type: 'prop', match: prop, offset, length: prop.length });
  });
  
  // 値（:の後、;または}の前）
  css.replace(/(:)(\s*)([^;{}]+)/g, (match, colon, space, value, offset) => {
    matches.push({ type: 'value', match: value, offset: offset + colon.length + space.length, length: value.length });
  });
  
  // カラー値
  css.replace(/(#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|rgba\([^)]+\))/g, (match, color, offset) => {
    matches.push({ type: 'color', match, offset, length: match.length });
  });
  
  // 区切り文字（最後に適用）
  css.replace(/([{}:;])/g, (match, punct, offset) => {
    matches.push({ type: 'punct', match, offset, length: match.length });
  });
  
  // マッチをオフセット順にソート
  matches.sort((a, b) => a.offset - b.offset);
  
  // 重複を除去（コメント内のマッチは除外、同じ位置のマッチは優先順位で選択）
  const uniqueMatches = [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    
    // コメント内のマッチは除外
    const isInsideComment = uniqueMatches.some(existing => {
      if (existing.type === 'comment') {
        return m.offset > existing.offset && m.offset + m.length <= existing.offset + existing.length;
      }
      return false;
    });
    
    if (isInsideComment) continue;
    
    // 既存のマッチと重複していないか確認
    const overlaps = uniqueMatches.some(existing => {
      return (m.offset >= existing.offset && m.offset < existing.offset + existing.length) ||
             (existing.offset >= m.offset && existing.offset < m.offset + m.length);
    });
    
    if (!overlaps) {
      uniqueMatches.push(m);
    }
  }
  
  // マッチに基づいてハイライトを適用
  let result = '';
  let lastIndex = 0;
  for (const m of uniqueMatches) {
    // マッチの前の部分をエスケープ
    result += escapeHtml(css.substring(lastIndex, m.offset));
    
    // マッチした部分をエスケープしてから<span>タグで囲む
    const escapedMatch = escapeHtml(m.match);
    const className = {
      'punct': 'eds-code-punct',
      'prop': 'eds-code-prop',
      'value': 'eds-code-value',
      'comment': 'eds-code-comment',
      'color': 'eds-code-color'
    }[m.type];
    result += `<span class="${className}">${escapedMatch}</span>`;
    
    lastIndex = m.offset + m.length;
  }
  
  // 残りの部分をエスケープ
  result += escapeHtml(css.substring(lastIndex));
  
  return result;
}

/**
 * JavaScriptコードに対してハイライトを適用（エスケープ前のコードに対して正規表現を適用し、マッチした部分をエスケープしてから<span>タグで囲む）
 */
function highlightJs(js) {
  const keywords = ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'class', 'extends', 'import', 'export', 'default', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'new', 'this', 'super', 'typeof', 'instanceof', 'true', 'false', 'null', 'undefined'];
  const matches = [];
  
  // 文字列リテラル
  js.replace(/(['"`])((?:\\.|(?!\1)[^\\])*?)(\1)/g, (match, quote1, content, quote2, offset) => {
    matches.push({ type: 'string', match, offset, length: match.length });
  });
  
  // コメント
  js.replace(/(\/\/.*$)/gm, (match, comment, offset) => {
    matches.push({ type: 'comment', match, offset, length: match.length });
  });
  js.replace(/(\/\*[\s\S]*?\*\/)/g, (match, comment, offset) => {
    matches.push({ type: 'comment', match, offset, length: match.length });
  });
  
  // キーワード
  keywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'g');
    let match;
    while ((match = regex.exec(js)) !== null) {
      matches.push({ type: 'keyword', match: keyword, offset: match.index, length: keyword.length });
    }
  });
  
  // 数値
  js.replace(/\b(\d+\.?\d*)\b/g, (match, number, offset) => {
    matches.push({ type: 'number', match, offset, length: match.length });
  });
  
  // 関数呼び出し
  js.replace(/(\w+)(\s*\()/g, (match, name, paren, offset) => {
    if (!keywords.includes(name)) {
      matches.push({ type: 'function', match: name, offset, length: name.length });
    }
  });
  
  // マッチをオフセット順にソート
  matches.sort((a, b) => a.offset - b.offset);
  
  // 重複を除去（文字列やコメント内のマッチは除外）
  const uniqueMatches = [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    // 既存のマッチと重複していないか確認
    const overlaps = uniqueMatches.some(existing => {
      return (m.offset >= existing.offset && m.offset < existing.offset + existing.length) ||
             (existing.offset >= m.offset && existing.offset < m.offset + m.length);
    });
    
    // 文字列やコメント内のマッチは除外
    const isInsideStringOrComment = uniqueMatches.some(existing => {
      if (existing.type === 'string' || existing.type === 'comment') {
        return m.offset > existing.offset && m.offset + m.length <= existing.offset + existing.length;
      }
      return false;
    });
    
    if (!overlaps && !isInsideStringOrComment) {
      uniqueMatches.push(m);
    }
  }
  
  // マッチに基づいてハイライトを適用
  let result = '';
  let lastIndex = 0;
  for (const m of uniqueMatches) {
    // マッチの前の部分をエスケープ
    result += escapeHtml(js.substring(lastIndex, m.offset));
    
    // マッチした部分をエスケープしてから<span>タグで囲む
    const escapedMatch = escapeHtml(m.match);
    const className = {
      'string': 'eds-code-string',
      'comment': 'eds-code-comment',
      'keyword': 'eds-code-keyword',
      'number': 'eds-code-number',
      'function': 'eds-code-function'
    }[m.type];
    result += `<span class="${className}">${escapedMatch}</span>`;
    
    lastIndex = m.offset + m.length;
  }
  
  // 残りの部分をエスケープ
  result += escapeHtml(js.substring(lastIndex));
  
  return result;
}

/**
 * JSONコードに対してハイライトを適用（エスケープ前のコードに対して正規表現を適用し、マッチした部分をエスケープしてから<span>タグで囲む）
 */
function highlightJson(json) {
  const matches = [];
  
  // 文字列
  json.replace(/(["'])((?:\\.|(?!\1)[^\\])*?)(\1)/g, (match, quote1, content, quote2, offset) => {
    matches.push({ type: 'string', match, offset, length: match.length });
  });
  
  // キーワード
  json.replace(/\b(true|false|null)\b/g, (match, keyword, offset) => {
    matches.push({ type: 'keyword', match, offset, length: match.length });
  });
  
  // 数値
  json.replace(/\b(\d+\.?\d*)\b/g, (match, number, offset) => {
    matches.push({ type: 'number', match, offset, length: match.length });
  });
  
  // 区切り文字
  json.replace(/([{}[\]:,])/g, (match, punct, offset) => {
    matches.push({ type: 'punct', match, offset, length: match.length });
  });
  
  // マッチをオフセット順にソート
  matches.sort((a, b) => a.offset - b.offset);
  
  // 重複を除去（文字列内のマッチは除外）
  const uniqueMatches = [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const overlaps = uniqueMatches.some(existing => {
      return (m.offset >= existing.offset && m.offset < existing.offset + existing.length) ||
             (existing.offset >= m.offset && existing.offset < m.offset + m.length);
    });
    
    const isInsideString = uniqueMatches.some(existing => {
      if (existing.type === 'string') {
        return m.offset > existing.offset && m.offset + m.length <= existing.offset + existing.length;
      }
      return false;
    });
    
    if (!overlaps && !isInsideString) {
      uniqueMatches.push(m);
    }
  }
  
  // マッチに基づいてハイライトを適用
  let result = '';
  let lastIndex = 0;
  for (const m of uniqueMatches) {
    // マッチの前の部分をエスケープ
    result += escapeHtml(json.substring(lastIndex, m.offset));
    
    // マッチした部分をエスケープしてから<span>タグで囲む
    const escapedMatch = escapeHtml(m.match);
    const className = {
      'string': 'eds-code-string',
      'keyword': 'eds-code-keyword',
      'number': 'eds-code-number',
      'punct': 'eds-code-punct'
    }[m.type];
    result += `<span class="${className}">${escapedMatch}</span>`;
    
    lastIndex = m.offset + m.length;
  }
  
  // 残りの部分をエスケープ
  result += escapeHtml(json.substring(lastIndex));
  
  return result;
}


