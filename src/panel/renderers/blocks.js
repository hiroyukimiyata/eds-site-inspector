/**
 * Blocksタブのレンダラー
 */
import { sendToContent } from '../utils.js';
import { renderBlockDetail } from './block-detail.js';

/**
 * Blocksタブをレンダリング
 */
export function renderBlocks(state, refresh, tabId) {
  const root = document.querySelector('[data-tab-panel="blocks"]');
  root.innerHTML = '';
  if (!state.blocks.length) {
    root.innerHTML = '<p class="eds-empty">No blocks detected inside <main>.</p>';
    return;
  }

  // カテゴリごとにグループ化（Default Contentは除外）
  const blocksByCategory = {};
  const defaultContentCategories = ['heading', 'text', 'image', 'list', 'code', 'table', 'quote', 'media', 'default'];
  
  state.blocks.forEach((block) => {
    const category = block.category || 'block';
    // Default ContentはBlocksタブに表示しない（オーバーレイは表示する）
    if (defaultContentCategories.includes(category)) {
      return;
    }
    if (!blocksByCategory[category]) {
      blocksByCategory[category] = [];
    }
    blocksByCategory[category].push(block);
  });

  // カテゴリの順序を定義（Default Contentは除外）
  const categoryOrder = ['block', 'button', 'icon'];
  
  categoryOrder.forEach((category) => {
    if (!blocksByCategory[category] || blocksByCategory[category].length === 0) return;
    
    const categoryTitle = document.createElement('h3');
    categoryTitle.className = 'eds-category-title';
    categoryTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1);
    root.appendChild(categoryTitle);
    
    const list = document.createElement('ul');
    list.className = 'eds-block-list';
    
    blocksByCategory[category].forEach((block) => {
      const li = document.createElement('li');
      li.className = 'eds-block-item';
      if (state.selectedBlock === block.id) {
        li.classList.add('is-selected');
      }
      
      const nameSpan = document.createElement('span');
      nameSpan.textContent = block.name;
      nameSpan.className = 'eds-block-name';
      
      // ブロック数が1より大きい場合は表示
      if (block.count && block.count > 1) {
        const countSpan = document.createElement('span');
        countSpan.className = 'eds-block-count';
        countSpan.textContent = ` (${block.count})`;
        countSpan.style.cssText = 'color: var(--muted); font-size: 11px; margin-left: 4px;';
        nameSpan.appendChild(countSpan);
      }
      
      const tagSpan = document.createElement('span');
      tagSpan.textContent = block.tagName;
      tagSpan.className = 'eds-block-list__tag';
      
      li.appendChild(nameSpan);
      li.appendChild(tagSpan);
      
      li.addEventListener('mouseenter', () => sendToContent(tabId, 'highlight', { id: block.id }));
      li.addEventListener('mouseleave', () => sendToContent(tabId, 'highlight', { id: null }));
      li.addEventListener('click', async () => {
        // 他の選択を解除
        document.querySelectorAll('.eds-block-item').forEach((item) => {
          item.classList.remove('is-selected');
        });
        // 選択状態を追加
        li.classList.add('is-selected');
        
        // 同じ名前のブロックを取得して、最初のインスタンスにスクロール
        const blocksWithSameName = await sendToContent(tabId, 'get-blocks-by-name', { name: block.name });
        const firstBlock = blocksWithSameName && blocksWithSameName.length > 0 ? blocksWithSameName[0] : block;
        
        await sendToContent(tabId, 'select-block', { id: firstBlock.id });
        await sendToContent(tabId, 'scroll-to-block', { id: firstBlock.id });
        await sendToContent(tabId, 'highlight', { id: firstBlock.id });
        
        const detail = await sendToContent(tabId, 'get-block-detail', { id: firstBlock.id });
        renderBlockDetail(state, detail, refresh, tabId);
      });
      
      list.appendChild(li);
    });
    
    root.appendChild(list);
  });
}

