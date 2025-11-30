/**
 * コード処理ユーティリティ
 */
import { escapeHtml, highlightCode } from '../utils.js';
import { js_beautify } from 'js-beautify';

/**
 * HTMLを安全にインデント（DOMParserを使用して正確にインデント）
 */
function safeIndentHtml(html) {
  if (!html || typeof html !== 'string') return html;
  
  try {
    // DOMParserを使ってHTMLをパース
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const errorNode = doc.querySelector('parsererror');
    if (errorNode) {
      // パースエラーの場合はjs-beautifyにフォールバック
      return js_beautify.html(html, {
        indent_size: 2,
        wrap_line_length: 200,
        wrap_attributes: 'auto',
        indent_inner_html: true
      });
    }
    
    // bodyの最初の子要素を取得（outerHTMLは1つの要素を返すため）
    const body = doc.body;
    if (body && body.firstElementChild) {
      return formatElementRecursive(body.firstElementChild, 0, 2);
    }
    
    return html;
  } catch (e) {
    console.warn('[EDS Inspector] HTML formatting error:', e);
    // エラー時はjs-beautifyにフォールバック
    try {
      return js_beautify.html(html, {
        indent_size: 2,
        wrap_line_length: 200,
        wrap_attributes: 'auto',
        indent_inner_html: true
      });
    } catch (e2) {
      return html;
    }
  }
}

/**
 * 要素を再帰的にフォーマット（正確なインデントを保証）
 */
function formatElementRecursive(element, indent, indentSize) {
  if (!element) return '';
  
  const indentStr = ' '.repeat(indent);
  const tagName = element.tagName.toLowerCase();
  
  // 属性をフォーマット
  const attrs = Array.from(element.attributes)
    .map(attr => ` ${attr.name}="${attr.value}"`)
    .join('');
  
  const children = Array.from(element.childNodes);
  const elementChildren = children.filter(child => child.nodeType === Node.ELEMENT_NODE);
  const textChildren = children.filter(child => child.nodeType === Node.TEXT_NODE);
  
  // 子要素がない場合
  if (children.length === 0) {
    return `${indentStr}<${tagName}${attrs} />`;
  }
  
  // テキストのみの子要素がある場合
  if (elementChildren.length === 0) {
    const text = textChildren.map(child => child.textContent).join('').trim();
    if (text) {
      return `${indentStr}<${tagName}${attrs}>${text}</${tagName}>`;
    } else {
      return `${indentStr}<${tagName}${attrs} />`;
    }
  }
  
  // 要素の子要素がある場合
  let result = `${indentStr}<${tagName}${attrs}>\n`;
  
  children.forEach(child => {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const formatted = formatElementRecursive(child, indent + indentSize, indentSize);
      if (formatted) {
        result += formatted + '\n';
      }
    } else if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent.trim();
      if (text) {
        result += ' '.repeat(indent + indentSize) + text + '\n';
      }
    }
  });
  
  result += `${indentStr}</${tagName}>`;
  return result;
}

/**
 * コードを処理（シンタックスハイライトとインデント）
 */
export function processCode(content, type, path) {
  if (!content || content === '(empty file)') {
    return escapeHtml(content);
  }
  
  // ファイルタイプを判定（typeを優先、なければpathから判定）
  let lang = type ? type.toLowerCase() : '';
  const ext = path ? path.split('.').pop().toLowerCase() : '';
  
  // typeが指定されていない場合、pathから判定
  if (!lang || lang === 'file') {
    if (ext === 'html' || ext === 'htm') lang = 'html';
    else if (ext === 'css') lang = 'css';
    else if (ext === 'js' || ext === 'mjs') lang = 'javascript';
    else if (ext === 'json') lang = 'json';
    else if (ext === 'xml') lang = 'xml';
    else lang = 'text';
  }
  
  // HTMLの場合は最後にインデント処理
  if (lang === 'html') {
    content = safeIndentHtml(content);
  }
  
  // シンタックスハイライト
  return highlightCode(content, lang);
}

