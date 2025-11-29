/**
 * ブロック名の推論
 */
import { DEFAULT_CONTENT_MAP } from '../constants.js';

/**
 * 要素からブロック名を推論
 */
export function inferBlockName(el) {
  if (el.dataset.blockName) return el.dataset.blockName;
  const blockClass = Array.from(el.classList).find((cls) => cls !== 'block' && !cls.startsWith('section-'));
  if (blockClass) return blockClass;
  const defaultContent = DEFAULT_CONTENT_MAP.find((entry) => el.matches(entry.selector));
  if (defaultContent) return defaultContent.name;
  return el.tagName.toLowerCase();
}

