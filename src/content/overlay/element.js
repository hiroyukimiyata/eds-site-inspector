/**
 * オーバーレイ要素の作成
 */
import { state } from '../state.js';

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
    const isDefaultContent = item.category && item.category !== 'block';
    if (isDefaultContent) {
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
    const isDefaultContent = item.category && item.category !== 'block';
    const prefix = isDefaultContent ? 'Default Content:' : 'Block:';
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

