/**
 * オーバーレイの構築
 */
import { createOverlayRoot, refreshOverlayPositions } from './manager.js';
import { createOverlayElement } from './element.js';
import { state } from '../state.js';

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
    // Default Contentかどうかを判定
    const isDefaultContent = block.category && block.category !== 'block';
    const visible = isDefaultContent 
      ? state.overlaysEnabled.defaultContent 
      : state.overlaysEnabled.blocks;
    state.overlays.push({ element: el, target: block.element, item: block, visible });
  });
  
  console.log('[EDS Inspector] Built overlays:', state.overlays.length);
  // refreshOverlayPositions()は呼び出し元で呼ばれるため、ここでは呼ばない
}

