/**
 * HTMLフォーマッター
 */

/**
 * HTMLをインデント
 */
export function indentHtml(html) {
  if (!html || typeof html !== 'string') return html;
  
  // 既に整形されている場合は正規化のみ
  if (html.includes('\n')) {
    const lines = html.split('\n');
    const indentSize = 2;
    let indent = 0;
    const normalized = [];
    
    for (let line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        normalized.push('');
        continue;
      }
      
      // 閉じタグの場合はインデントを減らす
      if (trimmed.match(/^<\/\w+/)) {
        indent = Math.max(0, indent - indentSize);
      }
      
      normalized.push(' '.repeat(indent) + trimmed);
      
      // 開きタグで、自己完結型でない場合はインデントを増やす
      const openTagMatch = trimmed.match(/^<(\w+)([^>]*)>/);
      if (openTagMatch && !trimmed.match(/\/>$/)) {
        const tagName = openTagMatch[1];
        if (!isSelfClosingTag(tagName)) {
          indent += indentSize;
        }
      }
    }
    
    return normalized.join('\n');
  }
  
  // 1行のHTMLの場合は整形を試みる
  try {
    const parser = new DOMParser();
    // HTML全体をラップせずに直接パース
    const doc = parser.parseFromString(html, 'text/html');
    const errorNode = doc.querySelector('parsererror');
    if (errorNode) {
      // パースエラーの場合は元のHTMLを返す
      return html;
    }
    
    // bodyの内容を取得
    const body = doc.body;
    if (body && body.childNodes.length > 0) {
      let formatted = '';
      Array.from(body.childNodes).forEach(node => {
        const nodeFormatted = formatElement(node, 0, 2);
        if (nodeFormatted) {
          formatted += nodeFormatted + '\n';
        }
      });
      return formatted.trim() || html;
    }
    
    return html;
  } catch (e) {
    console.warn('[EDS Inspector] HTML formatting error:', e);
    return html;
  }
}

/**
 * 要素をフォーマット
 */
function formatElement(element, indent, indentSize) {
  if (!element) return '';
  
  if (element.nodeType === Node.TEXT_NODE) {
    const text = element.textContent;
    // 空白のみのテキストノードは無視
    if (!text.trim()) return '';
    return text;
  }
  
  if (element.nodeType === Node.ELEMENT_NODE) {
    const tagName = element.tagName.toLowerCase();
    const indentStr = ' '.repeat(indent);
    const children = Array.from(element.childNodes);
    const hasElementChildren = children.some(child => child.nodeType === Node.ELEMENT_NODE);
    
    // 子要素がない場合
    if (children.length === 0) {
      return `${indentStr}<${tagName}${formatAttributes(element)} />`;
    }
    
    // テキストのみの子要素がある場合
    if (!hasElementChildren) {
      const text = children.map(child => child.textContent).join('').trim();
      if (text) {
        return `${indentStr}<${tagName}${formatAttributes(element)}>${text}</${tagName}>`;
      } else {
        return `${indentStr}<${tagName}${formatAttributes(element)} />`;
      }
    }
    
    // 要素の子要素がある場合
    let result = `${indentStr}<${tagName}${formatAttributes(element)}>\n`;
    children.forEach(child => {
      const formatted = formatElement(child, indent + indentSize, indentSize);
      if (formatted) {
        result += formatted + '\n';
      }
    });
    result += `${indentStr}</${tagName}>`;
    return result;
  }
  
  return '';
}

/**
 * 属性をフォーマット
 */
function formatAttributes(element) {
  if (!element.attributes || element.attributes.length === 0) return '';
  const attrs = Array.from(element.attributes).map(attr => ` ${attr.name}="${attr.value}"`).join('');
  return attrs;
}

/**
 * 自己完結タグかどうかを判定
 */
function isSelfClosingTag(tagName) {
  const selfClosing = ['img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr'];
  return selfClosing.includes(tagName.toLowerCase());
}

