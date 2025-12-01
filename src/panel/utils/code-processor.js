/**
 * コード処理ユーティリティ
 */
import { escapeHtml, highlightCode } from '../utils.js';
import { js_beautify } from 'js-beautify';

/**
 * js-beautifyの設定（フォールバック用）
 */
const JS_BEAUTIFY_CONFIG = {
  indent_size: 2,
  wrap_line_length: 200,
  wrap_attributes: 'auto',
  indent_inner_html: true
};

/**
 * js-beautifyにフォールバック
 * @param {string} html - フォーマットするHTML文字列
 * @returns {string} フォーマットされたHTML文字列
 */
function fallbackToJsBeautify(html) {
  try {
    return js_beautify.html(html, JS_BEAUTIFY_CONFIG);
  } catch (e) {
    console.warn('[EDS Inspector] js-beautify fallback failed:', e);
    return html;
  }
}

/**
 * HTMLを安全にインデント（DOMParserを使用して正確にインデント）
 * @param {string} html - フォーマットするHTML文字列
 * @returns {string} フォーマットされたHTML文字列
 */
export function safeIndentHtml(html) {
  if (!html || typeof html !== 'string') return html;
  
  try {
    // 完全なHTMLドキュメントかどうかを判定（<!DOCTYPE html>または<html>タグが含まれているか）
    const isFullDocument = /<!DOCTYPE\s+html>/i.test(html) || /^\s*<html/i.test(html.trim());
    
    // DOMParserを使ってHTMLをパース
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const errorNode = doc.querySelector('parsererror');
    if (errorNode) {
      // パースエラーの場合はjs-beautifyにフォールバック
      return fallbackToJsBeautify(html);
    }
    
    // 完全なHTMLドキュメントの場合のみ、documentElement全体を処理
    if (isFullDocument) {
      const htmlElement = doc.documentElement;
      if (htmlElement && htmlElement.tagName.toLowerCase() === 'html') {
        // HTML全体をフォーマット（DOCTYPEを含む）
        let result = '<!DOCTYPE html>\n';
        result += formatElementRecursive(htmlElement, 0, 2);
        if (result && result.trim()) {
          return result;
        }
      }
    }
    
    // フラグメント（部分的なHTML）の場合は、bodyの最初の子要素を取得
    const body = doc.body;
    if (body && body.firstElementChild) {
      const formatted = formatElementRecursive(body.firstElementChild, 0, 2);
      // フォーマット結果が空でないことを確認
      if (formatted && formatted.trim()) {
        return formatted;
      }
    }
    
    // bodyに子要素がない場合は、bodyの内容をそのまま返す
    if (body && body.innerHTML.trim()) {
      return fallbackToJsBeautify(html);
    }
    
    // フォーマットできない場合はフォールバック
    return fallbackToJsBeautify(html);
  } catch (e) {
    console.warn('[EDS Inspector] HTML formatting error:', e);
    // エラー時はjs-beautifyにフォールバック
    return fallbackToJsBeautify(html);
  }
}

/**
 * 要素を再帰的にフォーマット（正確なインデントを保証）
 * @param {HTMLElement} element - フォーマットする要素
 * @param {number} indent - 現在のインデント数（スペース数）
 * @param {number} indentSize - インデントサイズ（通常は2）
 * @returns {string} フォーマットされたHTML文字列
 */
export function formatElementRecursive(element, indent, indentSize) {
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
  
  // 子要素を順番に処理
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
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
  }
  
  result += `${indentStr}</${tagName}>`;
  return result;
}

/**
 * ファイルタイプを判定
 * @param {string} type - ファイルタイプ
 * @param {string} path - ファイルパス
 * @returns {string} 言語名（html, css, javascript, json, xml, text）
 */
export function detectFileType(type, path) {
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
  
  return lang;
}

/**
 * コードを処理（シンタックスハイライトとインデント）
 */
export function processCode(content, type, path) {
  if (!content || content === '(empty file)') {
    return escapeHtml(content);
  }
  
  // ファイルタイプを判定
  const lang = detectFileType(type, path);
  
  // HTMLの場合は最後にインデント処理
  if (lang === 'html') {
    content = safeIndentHtml(content);
  }
  
  // すべてのコードタイプに対して、highlightCodeを使用
  // highlightCodeは既にエスケープしてからハイライトを適用するため、
  // コード内の文字列（例：class="eds-code-string"）が誤ってマッチすることはない
  return highlightCode(content, lang);
}

