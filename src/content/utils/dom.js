/**
 * DOM操作のユーティリティ関数
 */

/**
 * 要素のパスを計算（ルート要素からのインデックスパス）
 */
export function computeElementPath(el, root) {
  const path = [];
  let current = el;
  while (current && current !== root) {
    const parent = current.parentElement;
    if (!parent) break;
    const idx = Array.from(parent.children).indexOf(current);
    path.unshift(idx);
    current = parent;
  }
  return path;
}

/**
 * パスから要素を見つける
 */
export function findElementByPath(root, path) {
  let current = root;
  for (const idx of path) {
    if (!current || !current.children || !current.children[idx]) return null;
    current = current.children[idx];
  }
  return current;
}

/**
 * HTMLスニペットをフォーマット
 * Block要素自体（<div class="blockname">）がBlockの完全な範囲を表しているため、
 * その要素のouterHTMLを取得する
 * DOMの構造を正確に保つため、outerHTMLを直接取得する
 */
export function formatHtmlSnippet(el) {
  if (!el || !(el instanceof HTMLElement)) return '';
  
  // Block要素自体とそのすべての子要素を取得
  // outerHTMLはDOMの構造を正確に文字列化するため、そのまま使用
  return el.outerHTML;
}

