/**
 * オーバーレイの構築
 */
import { createOverlayRoot, refreshOverlayPositions } from './manager.js';
import { createOverlayElement } from './element.js';
import { state } from '../state.js';
import { isDefaultContent } from '../utils/category.js';

/**
 * オーバーレイを構築
 */
export function buildOverlays() {
  console.log('[EDS Inspector] Building overlays:', {
    sectionsCount: state.sections.length,
    blocksCount: state.blocks.length,
    overlaysEnabled: state.overlaysEnabled,
    overlaysVisible: state.overlaysVisible
  });
  
  const root = createOverlayRoot();
  root.innerHTML = '';
  state.overlays = [];
  
  state.sections.forEach((section) => {
    const el = createOverlayElement(section, 'section');
    root.appendChild(el);
    state.overlays.push({ element: el, target: section.element, item: section, visible: state.overlaysEnabled.sections });
  });
  
  state.blocks.forEach((block) => {
    const el = createOverlayElement(block, 'block');
    root.appendChild(el);
    // overlay.visibleは常にtrueに設定（表示制御はrefreshOverlayPositionsで行う）
    state.overlays.push({ element: el, target: block.element, item: block, visible: true });
    
    // デバッグログ
    if (isDefaultContent(block)) {
      console.log('[EDS Inspector] Built overlay for Default Content:', {
        id: block.id,
        name: block.name,
        category: block.category,
        hasElement: !!block.element,
        hasTarget: !!block.element
      });
    }
  });
  
  const defaultContentOverlays = state.overlays.filter(o => isDefaultContent(o.item));
  console.log('[EDS Inspector] Built overlays:', {
    total: state.overlays.length,
    defaultContent: defaultContentOverlays.length,
    overlaysEnabled: state.overlaysEnabled
  });
  // refreshOverlayPositions()は呼び出し元で呼ばれるため、ここでは呼ばない
}

