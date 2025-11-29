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
 */
export function formatHtmlSnippet(el) {
  const clone = el.cloneNode(true);
  const lines = clone.outerHTML.split('\n');
  return lines.map((line) => line.trim()).join('\n');
}

