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
 */
export function highlightCode(code, lang) {
  const escaped = escapeHtml(code);
  
  if (lang === 'html') {
    return highlightHtml(escaped);
  } else if (lang === 'css') {
    return highlightCss(escaped);
  } else if (lang === 'javascript' || lang === 'js') {
    return highlightJs(escaped);
  } else if (lang === 'json') {
    return highlightJson(escaped);
  }
  
  return escaped;
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

function highlightCss(css) {
  return css
    .replace(/([{}:;])/g, '<span class="eds-code-punct">$1</span>')
    .replace(/([\w-]+)(\s*)(:)/g, '<span class="eds-code-prop">$1</span>$2<span class="eds-code-punct">$3</span>')
    .replace(/(:)(\s*)([^;{}]+)/g, '$1$2<span class="eds-code-value">$3</span>')
    .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="eds-code-comment">$1</span>')
    .replace(/(#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|rgba\([^)]+\))/g, '<span class="eds-code-color">$1</span>');
}

function highlightJs(js) {
  const keywords = ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'class', 'extends', 'import', 'export', 'default', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'new', 'this', 'super', 'typeof', 'instanceof', 'true', 'false', 'null', 'undefined'];
  let highlighted = js;
  
  // 文字列リテラル
  highlighted = highlighted.replace(/(['"`])((?:\\.|(?!\1)[^\\])*?)(\1)/g, '<span class="eds-code-string">$1$2$3</span>');
  
  // コメント
  highlighted = highlighted.replace(/(\/\/.*$)/gm, '<span class="eds-code-comment">$1</span>');
  highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="eds-code-comment">$1</span>');
  
  // キーワード
  keywords.forEach(keyword => {
    const regex = new RegExp(`\\b(${keyword})\\b`, 'g');
    highlighted = highlighted.replace(regex, '<span class="eds-code-keyword">$1</span>');
  });
  
  // 数値
  highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, '<span class="eds-code-number">$1</span>');
  
  // 関数呼び出し
  highlighted = highlighted.replace(/(\w+)(\s*\()/g, (match, name, paren) => {
    if (!keywords.includes(name)) {
      return `<span class="eds-code-function">${name}</span>${paren}`;
    }
    return match;
  });
  
  return highlighted;
}

function highlightJson(json) {
  return json
    .replace(/(["'])((?:\\.|(?!\1)[^\\])*?)(\1)/g, '<span class="eds-code-string">$1$2$3</span>')
    .replace(/\b(true|false|null)\b/g, '<span class="eds-code-keyword">$1</span>')
    .replace(/\b(\d+\.?\d*)\b/g, '<span class="eds-code-number">$1</span>')
    .replace(/([{}[\]:,])/g, '<span class="eds-code-punct">$1</span>');
}

