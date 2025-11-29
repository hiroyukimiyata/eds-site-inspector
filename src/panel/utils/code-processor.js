/**
 * コード処理ユーティリティ
 */
import { escapeHtml, highlightCode } from '../utils.js';
import { indentHtml } from './html-formatter.js';

/**
 * コードを処理（シンタックスハイライトとインデント）
 */
export function processCode(content, type, path) {
  if (!content || content === '(empty file)') {
    return escapeHtml(content);
  }
  
  // ファイルタイプを判定
  const ext = path.split('.').pop().toLowerCase();
  let lang = type.toLowerCase();
  
  if (ext === 'html' || ext === 'htm') lang = 'html';
  else if (ext === 'css') lang = 'css';
  else if (ext === 'js' || ext === 'mjs') lang = 'javascript';
  else if (ext === 'json') lang = 'json';
  else if (ext === 'xml') lang = 'xml';
  
  // HTMLの場合はインデント処理
  if (lang === 'html') {
    content = indentHtml(content);
  }
  
  // シンタックスハイライト
  return highlightCode(content, lang);
}

