/**
 * 定数定義
 */

export const UI_IDS = {
  overlayRoot: 'eds-inspector-overlay-root',
};

// Default Contentの定義（ドキュメントに基づく）
// https://www.aem.live/developer/block-collection/
export const DEFAULT_CONTENT_MAP = [
  // Headings: h1-h6
  { selector: 'h1', name: 'heading (h1)', category: 'heading' },
  { selector: 'h2', name: 'heading (h2)', category: 'heading' },
  { selector: 'h3', name: 'heading (h3)', category: 'heading' },
  { selector: 'h4', name: 'heading (h4)', category: 'heading' },
  { selector: 'h5', name: 'heading (h5)', category: 'heading' },
  { selector: 'h6', name: 'heading (h6)', category: 'heading' },
  // Text: p
  { selector: 'p', name: 'text', category: 'text' },
  // Images: picture, img
  { selector: 'picture', name: 'image', category: 'image' },
  { selector: 'img', name: 'image', category: 'image' },
  // Lists: ul, ol
  { selector: 'ul', name: 'list (unordered)', category: 'list' },
  { selector: 'ol', name: 'list (ordered)', category: 'list' },
  // Code: pre, code
  { selector: 'pre', name: 'code', category: 'code' },
  { selector: 'code', name: 'code', category: 'code' },
  // Other semantic elements
  { selector: 'table', name: 'table', category: 'table' },
  { selector: 'blockquote', name: 'blockquote', category: 'quote' },
  { selector: 'video', name: 'video', category: 'media' },
];

