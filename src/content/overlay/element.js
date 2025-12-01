/**
 * オーバーレイ要素の作成
 */
import { state } from '../state.js';
import { isDefaultContent } from '../utils/category.js';

/**
 * オーバーレイ要素を作成
 */
export function createOverlayElement(item, type) {
  const el = document.createElement('div');
  
  // タイプに基づいてクラスを設定
  if (type === 'section') {
    el.className = 'eds-overlay eds-overlay--section';
  } else {
    // ブロックのカテゴリに基づいて、BlockかDefault Contentかを判断
    if (isDefaultContent(item)) {
      el.className = 'eds-overlay eds-overlay--default-content';
    } else {
      el.className = 'eds-overlay eds-overlay--block';
    }
  }
  
  el.dataset.overlayId = item.id;
  const label = document.createElement('div');
  label.className = 'eds-overlay__label';
  
  if (type === 'section') {
    // section-metadataがある場合は"Section: {label}"、ない場合は"Section"のみ
    if (item.label) {
      label.textContent = `Section: ${item.label}`;
    } else {
      label.textContent = 'Section';
    }
  } else {
    // ブロックのカテゴリに基づいて、BlockかDefault Contentかを判断
    const prefix = isDefaultContent(item) ? 'Default Content:' : 'Block:';
    label.textContent = `${prefix} ${item.name}`;
  }
  
  el.appendChild(label);
  el.addEventListener('click', (evt) => {
    evt.stopPropagation();
    evt.preventDefault();
    if (type === 'block') {
      state.selectedBlockId = item.id;
    }
  });
  return el;
}

