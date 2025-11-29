/**
 * Codeタブのレンダラー
 */

/**
 * コードツリーをレンダリング
 */
function renderCodeTree(node, parent, basePath) {
  const li = document.createElement('li');
  li.textContent = node.name;
  if (node.children && node.children.length) {
    li.classList.add('has-children');
    const ul = document.createElement('ul');
    node.children.forEach((child) => renderCodeTree(child, ul, basePath));
    li.appendChild(ul);
  }
  if (node.path) {
    li.title = node.path;
    li.addEventListener('click', (evt) => {
      evt.stopPropagation();
      window.open(`${basePath}${node.path}`, '_blank');
    });
  }
  parent.appendChild(li);
}

/**
 * Codeタブをレンダリング
 */
export function renderCode(state) {
  const root = document.querySelector('[data-tab-panel="code"]');
  root.innerHTML = '';
  if (!state.codeBasePath) {
    root.innerHTML = '<p class="eds-empty">Code Bus path could not be determined.</p>';
    return;
  }
  if (!state.codeTree) {
    root.innerHTML = '<p class="eds-loading">Loading Code Bus…</p>';
    return;
  }
  const tree = document.createElement('ul');
  tree.className = 'eds-tree';
  renderCodeTree(state.codeTree, tree, state.codeBasePath);
  root.appendChild(tree);
}

