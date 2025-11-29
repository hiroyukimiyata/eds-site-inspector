/**
 * ブロック検出ロジック
 */
import { computeElementPath, findElementByPath } from '../utils/dom.js';
import { DEFAULT_CONTENT_MAP } from '../constants.js';

/**
 * ブロックを検出
 */
export function detectBlocks(mainSSR, mainLive, blockResources) {
  const blocks = [];
  const seenElements = new Set();
  
  console.log('[EDS Inspector] Block resources from network:', Array.from(blockResources));
  console.log('[EDS Inspector] SSR main element:', mainSSR);
  console.log('[EDS Inspector] Live main element:', mainLive);
  
  // EDSブロックの構造に基づく検出:
  // 1. ブロック名はCSSクラス名として使用される (例: <div class="blockname">)
  // 2. ネットワークリクエストで /blocks/{block-name}/ が読み込まれる
  // 3. SSRマークアップでは、ブロック名がクラス名として使用される
  
  // ネットワークリクエストから収集したブロック名を優先的に使用
  detectBlocksFromResources(mainLive, blockResources, blocks, seenElements);
  
  // SSRマークアップからもブロッククラスを検出（ネットワークリクエストに存在しない場合）
  detectBlocksFromSSR(mainSSR, mainLive, blockResources, blocks, seenElements);
  
  // Default Contentの検出
  detectDefaultContent(mainSSR, mainLive, blockResources, blocks, seenElements);
  
  // Buttonsの検出
  detectButtons(mainSSR, mainLive, blocks, seenElements);
  
  console.log('[EDS Inspector] Detected blocks:', blocks.map(b => ({ name: b.name, tagName: b.tagName, classes: b.classes })));
  
  return blocks;
}

/**
 * ネットワークリクエストからブロックを検出
 */
function detectBlocksFromResources(mainLive, blockResources, blocks, seenElements) {
  blockResources.forEach((blockName) => {
    // iconはBlockとして検出しない（Iconsタブで別途表示）
    if (blockName === 'icon' || blockName.startsWith('icon-')) return;
    
    // ライブDOMでブロッククラスを持つ要素を直接検索
    try {
      const liveElements = mainLive.querySelectorAll(`.${CSS.escape(blockName)}`);
      liveElements.forEach((liveElement) => {
        if (!(liveElement instanceof HTMLElement)) return;
        // 既に検出済みの要素はスキップ
        if (seenElements.has(liveElement)) return;
        
        // クラスリストにブロック名が含まれていることを確認
        const classList = Array.from(liveElement.classList);
        if (!classList.includes(blockName)) return;
        
        // main要素の子孫要素であることを確認
        if (!mainLive.contains(liveElement)) return;
        
        // ブロックのネストを防ぐ
        if (isInsideBlock(liveElement, mainLive, blockResources, blockName)) {
          return;
        }
        
        seenElements.add(liveElement);
        blocks.push({
          id: `block-${blocks.length}`,
          element: liveElement,
          name: blockName,
          tagName: liveElement.tagName.toLowerCase(),
          classes: liveElement.className || '',
        });
        console.log('[EDS Inspector] Detected block:', blockName, 'live element:', liveElement);
      });
    } catch (e) {
      console.warn('[EDS Inspector] Error querying for block:', blockName, e);
    }
  });
}

/**
 * SSRマークアップからブロックを検出
 */
function detectBlocksFromSSR(mainSSR, mainLive, blockResources, blocks, seenElements) {
  const allSSRElements = mainSSR.querySelectorAll('*');
  const ssrBlockClasses = new Set();
  
  allSSRElements.forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    const classList = Array.from(el.classList);
    classList.forEach((className) => {
      // ブロッククラスとして考えられるクラス名を収集
      if (className && 
          className !== 'block' && 
          !className.startsWith('section-') &&
          !className.startsWith('icon-') &&
          className !== 'contained' &&
          className.length > 2 &&
          !className.includes(' ') &&
          /^[a-z][a-z0-9-]*$/.test(className)) {
        ssrBlockClasses.add(className);
      }
    });
  });
  
  console.log('[EDS Inspector] Potential block classes from SSR:', Array.from(ssrBlockClasses));
  
  // SSRマークアップから検出したブロッククラスで、ネットワークリクエストに存在しないものを検出
  ssrBlockClasses.forEach((blockName) => {
    if (blockResources.has(blockName)) return; // 既に検出済み
    
    // iconはBlockとして検出しない（Iconsタブで別途表示）
    if (blockName === 'icon' || blockName.startsWith('icon-')) return;
    
    try {
      const liveElements = mainLive.querySelectorAll(`.${CSS.escape(blockName)}`);
      liveElements.forEach((liveElement) => {
        if (!(liveElement instanceof HTMLElement)) return;
        // 既に検出済みの要素はスキップ
        if (seenElements.has(liveElement)) return;
        
        // クラスリストにブロック名が含まれていることを確認
        const classList = Array.from(liveElement.classList);
        if (!classList.includes(blockName)) return;
        
        // main要素の子孫要素であることを確認
        if (!mainLive.contains(liveElement)) return;
        
        // ブロックのネストを防ぐ
        if (isInsideBlock(liveElement, mainLive, blockResources, blockName)) {
          return;
        }
        
        seenElements.add(liveElement);
        blocks.push({
          id: `block-${blocks.length}`,
          element: liveElement,
          name: blockName,
          tagName: liveElement.tagName.toLowerCase(),
          classes: liveElement.className || '',
        });
        console.log('[EDS Inspector] Detected block (from SSR, no network resource):', blockName);
      });
    } catch (e) {
      console.warn('[EDS Inspector] Error querying for SSR block:', blockName, e);
    }
  });
}

/**
 * Default Contentを検出
 */
function detectDefaultContent(mainSSR, mainLive, blockResources, blocks, seenElements) {
  console.log('[EDS Inspector] Detecting default content blocks...');
  
  // 既に検出されたブロック要素を収集
  const detectedBlockElements = new Set();
  blocks.forEach((block) => {
    detectedBlockElements.add(block.element);
  });
  
  // ブロッククラスを持つ要素も収集
  blockResources.forEach((blockName) => {
    try {
      const blockElements = mainLive.querySelectorAll(`.${CSS.escape(blockName)}`);
      blockElements.forEach((el) => {
        if (el instanceof HTMLElement && mainLive.contains(el)) {
          detectedBlockElements.add(el);
        }
      });
    } catch (e) {
      // 無視
    }
  });
  
  // ブロッククラスを持つ要素かどうかを判定する関数
  function isBlockElement(element) {
    if (!element || !(element instanceof HTMLElement)) return false;
    if (detectedBlockElements.has(element)) return true;
    const classes = Array.from(element.classList || []);
    return classes.some(cls => blockResources.has(cls));
  }
  
  DEFAULT_CONTENT_MAP.forEach((contentDef) => {
    // SSRマークアップから該当する要素を検出
    let ssrElements;
    try {
      ssrElements = mainSSR.querySelectorAll(contentDef.selector);
    } catch (e) {
      // セレクタが無効な場合（例: span.icon）はスキップ
      console.warn('[EDS Inspector] Invalid selector:', contentDef.selector, e);
      return;
    }
    
    ssrElements.forEach((ssrEl) => {
      if (!(ssrEl instanceof HTMLElement)) return;
      
      // textブロック（<p>タグ）内の要素は検出しない
      if (isInsideParagraph(ssrEl, mainSSR) && contentDef.selector !== 'p') {
        return;
      }
      
      // ライブDOMで対応する要素を見つける
      const allLiveElements = mainLive.querySelectorAll(contentDef.selector);
      const ssrIndex = Array.from(mainSSR.querySelectorAll(contentDef.selector)).indexOf(ssrEl);
      const liveElement = allLiveElements[ssrIndex];
      
      if (!liveElement) {
        // パスベースの検出を試す
        const path = computeElementPath(ssrEl, mainSSR);
        const pathBasedElement = findElementByPath(mainLive, path);
        if (!pathBasedElement) return;
        
        // タグ名が一致することを確認
        if (pathBasedElement.tagName.toLowerCase() !== contentDef.selector.toLowerCase()) return;
        
        // 既に検出済みの要素はスキップ
        if (seenElements.has(pathBasedElement)) return;
        
        // ブロック要素の場合はスキップ
        if (isBlockElement(pathBasedElement)) {
          return;
        }
        
        // ライブDOMでも<p>タグ内かどうかを確認
        if (isInsideParagraph(pathBasedElement, mainLive) && contentDef.selector !== 'p') {
          return;
        }
        
        seenElements.add(pathBasedElement);
        blocks.push({
          id: `block-${blocks.length}`,
          element: pathBasedElement,
          name: contentDef.name,
          tagName: pathBasedElement.tagName.toLowerCase(),
          classes: pathBasedElement.className || '',
          category: contentDef.category || 'default',
        });
        console.log('[EDS Inspector] Detected default content:', contentDef.name, 'element:', pathBasedElement);
        return;
      }
      
      // 既に検出済みの要素はスキップ
      if (seenElements.has(liveElement)) return;
      
      // main要素の子孫要素であることを確認
      if (!mainLive.contains(liveElement)) return;
      
      // ブロック要素の場合はスキップ
      if (isBlockElement(liveElement)) {
        return;
      }
      
      // ライブDOMでも<p>タグ内かどうかを確認
      if (isInsideParagraph(liveElement, mainLive) && contentDef.selector !== 'p') {
        return;
      }
      
      seenElements.add(liveElement);
      blocks.push({
        id: `block-${blocks.length}`,
        element: liveElement,
        name: contentDef.name,
        tagName: liveElement.tagName.toLowerCase(),
        classes: liveElement.className || '',
        category: contentDef.category || 'default',
      });
      console.log('[EDS Inspector] Detected default content:', contentDef.name, 'element:', liveElement);
    });
  });
}

/**
 * Buttonsを検出
 */
function detectButtons(mainSSR, mainLive, blocks, seenElements) {
  // Buttonsは通常、単独のpタグ内のaタグで、strong/emでスタイリングされる
  // https://www.aem.live/developer/block-collection/buttons
  const buttonParagraphs = mainSSR.querySelectorAll('p');
  buttonParagraphs.forEach((ssrP) => {
    if (!(ssrP instanceof HTMLElement)) return;
    const link = ssrP.querySelector('a');
    if (!link) return;
    
    // 単独のaタグを持つpタグを検出
    const children = Array.from(ssrP.children);
    if (children.length !== 1 || children[0].tagName.toLowerCase() !== 'a') return;
    
    // パスベースでライブDOMの対応要素を見つける
    const path = computeElementPath(ssrP, mainSSR);
    const liveP = findElementByPath(mainLive, path);
    if (!liveP) return;
    
    // 既に検出済みの要素はスキップ
    if (seenElements.has(liveP)) return;
    
    // main要素の子孫要素であることを確認
    if (!mainLive.contains(liveP)) return;
    
    seenElements.add(liveP);
    blocks.push({
      id: `block-${blocks.length}`,
      element: liveP,
      name: 'button',
      tagName: liveP.tagName.toLowerCase(),
      classes: liveP.className || '',
      category: 'button',
    });
    console.log('[EDS Inspector] Detected button:', liveP);
  });
}

/**
 * 要素がブロック内にあるかチェック
 */
function isInsideBlock(element, mainLive, blockResources, currentBlockName) {
  let parent = element.parentElement;
  while (parent && parent !== mainLive) {
    // 親要素が別のブロッククラスを持っているかチェック（同じブロック名は除く）
    const parentClasses = Array.from(parent.classList || []);
    if (parentClasses.some(cls => blockResources.has(cls) && cls !== currentBlockName)) {
      return true;
    }
    parent = parent.parentElement;
  }
  return false;
}

/**
 * 要素が<p>タグ内にあるかチェック
 */
function isInsideParagraph(element, root) {
  let parent = element.parentElement;
  while (parent && parent !== root) {
    if (parent.tagName.toLowerCase() === 'p') {
      return true;
    }
    parent = parent.parentElement;
  }
  return false;
}

