/**
 * ブロック検出ロジック
 */
import { computeElementPath, findElementByPath } from '../utils/dom.js';
import { DEFAULT_CONTENT_MAP } from '../constants.js';
import { state } from '../state.js';

/**
 * ブロックを検出（複数のSSRドキュメントに対応）
 */
export function detectBlocks(ssrDocuments, mainSSR, mainLive, blockResources) {
  const blocks = [];
  const seenElements = new Set();
  
  console.log('[EDS Inspector] Block resources from network:', Array.from(blockResources));
  console.log('[EDS Inspector] SSR documents count:', ssrDocuments.size);
  console.log('[EDS Inspector] SSR main element:', mainSSR);
  console.log('[EDS Inspector] Live main element:', mainLive);
  
  // EDSブロックの構造に基づく検出:
  // 1. ブロック名はCSSクラス名として使用される (例: <div class="blockname">)
  // 2. ネットワークリクエストで /blocks/{block-name}/ が読み込まれる
  // 3. SSRマークアップでは、ブロック名がクラス名として使用される
  
  // ネットワークリクエストから収集したブロック名を優先的に使用
  detectBlocksFromResources(ssrDocuments, mainSSR, mainLive, blockResources, blocks, seenElements);
  
  // SSRマークアップからもブロッククラスを検出（ネットワークリクエストに存在しない場合）
  detectBlocksFromSSR(ssrDocuments, mainSSR, mainLive, blockResources, blocks, seenElements);
  
  // Default Contentの検出
  detectDefaultContent(ssrDocuments, mainSSR, mainLive, blockResources, blocks, seenElements);
  
  // Buttonsの検出
  detectButtons(ssrDocuments, mainSSR, mainLive, blocks, seenElements);
  
  console.log('[EDS Inspector] Detected blocks:', blocks.map(b => ({ name: b.name, tagName: b.tagName, classes: b.classes })));
  
  return blocks;
}

/**
 * 要素がBlock要素のルート要素かどうかを判定
 * （親要素に同じブロッククラスを持たない要素がルート要素）
 * @param {HTMLElement} element - 判定する要素
 * @param {string} blockName - ブロック名
 * @returns {boolean} ルート要素の場合true
 */
export function isBlockRootElement(element, blockName) {
  if (!element || !element.parentElement) return true;
  
  // headerとfooterの場合は、タグ名が一致する要素自体がルート要素
  if ((blockName === 'header' || blockName === 'footer') && element.tagName.toLowerCase() === blockName) {
    return true;
  }
  
  let parent = element.parentElement;
  while (parent) {
    const parentClasses = Array.from(parent.classList || []);
    // 親要素が同じブロッククラスを持っている場合は、この要素はルート要素ではない
    if (parentClasses.includes(blockName)) {
      return false;
    }
    // headerとfooterの場合は、親要素が同じタグ名の場合もルート要素ではない
    if ((blockName === 'header' || blockName === 'footer') && parent.tagName.toLowerCase() === blockName) {
      return false;
    }
    parent = parent.parentElement;
  }
  
  return true;
}

/**
 * ネットワークリクエストからブロックを検出（複数のSSRドキュメントに対応）
 */
function detectBlocksFromResources(ssrDocuments, mainSSR, mainLive, blockResources, blocks, seenElements) {
  blockResources.forEach((blockName) => {
    // iconはBlockとして検出しない（Iconsタブで別途表示）
    if (blockName === 'icon' || blockName.startsWith('icon-')) return;
    
    // ライブDOMでブロック要素を検索
    let liveElements = [];
    
    try {
      // headerとfooterはタグ名で検索（<header>タグ、<footer>タグ）
      // これらは通常main要素の外にあるため、ドキュメント全体から検索
      if (blockName === 'header' || blockName === 'footer') {
        const tagElements = document.querySelectorAll(blockName);
        liveElements = Array.from(tagElements);
        console.log('[EDS Inspector] Block', blockName, 'found by tag name:', liveElements.length);
      } else {
        // 通常のブロックはクラス名で検索
        // main要素内を先に検索
        liveElements = Array.from(mainLive.querySelectorAll(`.${CSS.escape(blockName)}`));
        
        // main要素内で見つからない場合、ドキュメント全体から検索（side-navigationなどmain外の要素用）
        if (liveElements.length === 0) {
          liveElements = Array.from(document.querySelectorAll(`.${CSS.escape(blockName)}`));
          if (liveElements.length > 0) {
            console.log('[EDS Inspector] Block', blockName, 'found outside main:', liveElements.length);
          }
        }
      }
      
      liveElements.forEach((liveElement) => {
        if (!(liveElement instanceof HTMLElement)) return;
        
        // headerとfooterの場合は、タグ名で一致することを確認
        // それ以外の場合は、クラス名で一致することを確認
        if (blockName === 'header' || blockName === 'footer') {
          if (liveElement.tagName.toLowerCase() !== blockName) {
            return; // タグ名が一致しない場合はスキップ
          }
        } else {
          // 通常のブロックはクラス名で確認
          const classList = Array.from(liveElement.classList);
          if (!classList.includes(blockName)) return;
        }
        
        // main要素の子孫要素であることを確認（main外の要素も許可）
        const isOutsideMain = !mainLive.contains(liveElement);
        // main外の要素も検出対象とする（ヘッダー、フッター、サイドバーなど）
        // ただし、main内の要素を優先するため、main外の要素は後で処理
        
        // Block要素のルート要素かどうかを判定（親要素に同じブロッククラスを持たない要素のみ）
        if (!isBlockRootElement(liveElement, blockName)) {
          return; // ルート要素ではない場合はスキップ
        }
        
        // 既に検出済みの要素はスキップ
        if (seenElements.has(liveElement)) return;
        
        // ブロックのネストを防ぐ（他のブロック内にないことを確認）
        if (isInsideBlock(liveElement, mainLive, blockResources, blockName)) {
          return;
        }
        
        // SSR要素を見つける（複数のSSRドキュメントから検索）
        let ssrElement = null;
        if (mainSSR) {
          try {
            // ライブ要素がmain要素内にある場合
            if (mainLive.contains(liveElement)) {
              // ライブ要素からパスを計算
              const path = computeElementPath(liveElement, mainLive);
              // SSR要素を見つける
              ssrElement = findElementByPath(mainSSR, path);
            }
            
            // パスベースで見つからない場合、ブロック名で検索を試す
            if (!ssrElement) {
              // headerとfooterはタグ名で検索、それ以外はクラス名で検索
              let allLiveElements = [];
              if (blockName === 'header' || blockName === 'footer') {
                allLiveElements = Array.from(document.querySelectorAll(blockName));
              } else {
                allLiveElements = Array.from(document.querySelectorAll(`.${CSS.escape(blockName)}`));
              }
              
              const liveIndex = Array.from(allLiveElements).indexOf(liveElement);
              
              // すべてのSSRドキュメントを検索
              for (const [url, ssrDoc] of ssrDocuments.entries()) {
                let allSSRElements = [];
                if (blockName === 'header' || blockName === 'footer') {
                  allSSRElements = Array.from(ssrDoc.querySelectorAll(blockName));
                } else {
                  allSSRElements = Array.from(ssrDoc.querySelectorAll(`.${CSS.escape(blockName)}`));
                }
                
                console.log('[EDS Inspector] Searching SSR element for', blockName, 'in', url, {
                  allSSRElementsCount: allSSRElements.length,
                  allLiveElementsCount: allLiveElements.length,
                  liveIndex,
                  isOutsideMain: !mainLive.contains(liveElement),
                  liveElementTag: liveElement.tagName.toLowerCase()
                });
                
                if (liveIndex >= 0 && liveIndex < allSSRElements.length) {
                  ssrElement = allSSRElements[liveIndex];
                  console.log('[EDS Inspector] Found SSR element for', blockName, 'in', url, ssrElement, 'tag:', ssrElement.tagName.toLowerCase());
                  break;
                }
              }
              
              if (!ssrElement) {
                console.warn('[EDS Inspector] Could not find SSR element for', blockName, 'in any SSR document');
              }
            }
          } catch (e) {
            console.warn('[EDS Inspector] Error finding SSR element:', e);
          }
        }
        
        seenElements.add(liveElement);
        
        // SSR要素がどのドキュメントから来たかを記録
        let sourceDocumentUrl = null;
        if (ssrElement) {
          for (const [url, ssrDoc] of ssrDocuments.entries()) {
            if (ssrDoc.contains(ssrElement)) {
              sourceDocumentUrl = url;
              break;
            }
          }
        }
        
        const blockData = {
          id: `block-${blocks.length}`,
          element: liveElement, // ルート要素を保存
          ssrElement: ssrElement, // SSR要素への参照を保存
          sourceDocumentUrl: sourceDocumentUrl, // どのドキュメントから来たか
          name: blockName,
          tagName: liveElement.tagName.toLowerCase(),
          classes: liveElement.className || '',
        };
        blocks.push(blockData);
        console.log('[EDS Inspector] Detected block:', blockName, {
          rootElement: liveElement,
          ssrElement: ssrElement,
          hasSSRElement: !!ssrElement,
          sourceDocumentUrl: sourceDocumentUrl,
          blockId: blockData.id,
          isOutsideMain: !mainLive.contains(liveElement)
        });
      });
    } catch (e) {
      console.warn('[EDS Inspector] Error querying for block:', blockName, e);
    }
  });
}

/**
 * SSRマークアップからブロックを検出（複数のSSRドキュメントに対応）
 */
function detectBlocksFromSSR(ssrDocuments, mainSSR, mainLive, blockResources, blocks, seenElements) {
  const ssrBlockClasses = new Set();
  
  // すべてのSSRドキュメントからブロッククラスを収集
  for (const [url, ssrDoc] of ssrDocuments.entries()) {
    const mainSSRInDoc = ssrDoc.querySelector('main') || ssrDoc;
    const allSSRElements = mainSSRInDoc.querySelectorAll('*');
    
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
  }
  
  console.log('[EDS Inspector] Potential block classes from SSR:', Array.from(ssrBlockClasses));
  
  // SSRマークアップから検出したブロッククラスで、ネットワークリクエストに存在しないものを検出
  ssrBlockClasses.forEach((blockName) => {
    if (blockResources.has(blockName)) return; // 既に検出済み
    
    // iconはBlockとして検出しない（Iconsタブで別途表示）
    if (blockName === 'icon' || blockName.startsWith('icon-')) return;
    
    try {
      // main要素内を先に検索
      let liveElements = Array.from(mainLive.querySelectorAll(`.${CSS.escape(blockName)}`));
      
      // main要素内で見つからない場合、ドキュメント全体から検索
      if (liveElements.length === 0) {
        liveElements = Array.from(document.querySelectorAll(`.${CSS.escape(blockName)}`));
        if (liveElements.length > 0) {
          console.log('[EDS Inspector] Block', blockName, 'found outside main in SSR:', liveElements.length);
        }
      }
      
      liveElements.forEach((liveElement) => {
        if (!(liveElement instanceof HTMLElement)) return;
        
        // クラスリストにブロック名が含まれていることを確認
        const classList = Array.from(liveElement.classList);
        if (!classList.includes(blockName)) return;
        
        // main要素外の要素も検出対象とする
        
        // Block要素のルート要素かどうかを判定（親要素に同じブロッククラスを持たない要素のみ）
        if (!isBlockRootElement(liveElement, blockName)) {
          return; // ルート要素ではない場合はスキップ
        }
        
        // 既に検出済みの要素はスキップ
        if (seenElements.has(liveElement)) return;
        
        // ブロックのネストを防ぐ（他のブロック内にないことを確認）
        if (isInsideBlock(liveElement, mainLive, blockResources, blockName)) {
          return;
        }
        
        // SSR要素を見つける
        let ssrElement = null;
        if (mainSSR) {
          try {
            // ライブ要素がmain要素内にある場合
            if (mainLive.contains(liveElement)) {
              // パスベースで検出を試す
              const path = computeElementPath(liveElement, mainLive);
              ssrElement = findElementByPath(mainSSR, path);
            }
            
            // SSRマークアップから対応する要素を探す（main要素内を先に検索）
            if (!ssrElement) {
              const ssrElementsInMain = mainSSR.querySelectorAll(`.${CSS.escape(blockName)}`);
              const liveIndex = Array.from(liveElements).indexOf(liveElement);
              if (liveIndex >= 0 && liveIndex < ssrElementsInMain.length) {
                ssrElement = ssrElementsInMain[liveIndex];
              }
            }
            
            // main要素内で見つからない場合、複数のSSRドキュメントから検索
            if (!ssrElement) {
              const allLiveElements = document.querySelectorAll(`.${CSS.escape(blockName)}`);
              const liveIndex = Array.from(allLiveElements).indexOf(liveElement);
              
              // すべてのSSRドキュメントを検索
              for (const [url, ssrDoc] of ssrDocuments.entries()) {
                const allSSRElements = ssrDoc.querySelectorAll(`.${CSS.escape(blockName)}`);
                console.log('[EDS Inspector] Searching SSR element for', blockName, 'in', url, {
                  allSSRElementsCount: allSSRElements.length,
                  allLiveElementsCount: allLiveElements.length,
                  liveIndex,
                  isOutsideMain: !mainLive.contains(liveElement)
                });
                if (liveIndex >= 0 && liveIndex < allSSRElements.length) {
                  ssrElement = allSSRElements[liveIndex];
                  console.log('[EDS Inspector] Found SSR element for', blockName, 'in', url, ssrElement);
                  break;
                }
              }
              
              if (!ssrElement) {
                console.warn('[EDS Inspector] Could not find SSR element for', blockName, 'in any SSR document');
              }
            }
          } catch (e) {
            console.warn('[EDS Inspector] Error finding SSR element:', e);
          }
        }
        
        seenElements.add(liveElement);
        
        // SSR要素がどのドキュメントから来たかを記録
        let sourceDocumentUrl = null;
        if (ssrElement) {
          for (const [url, ssrDoc] of ssrDocuments.entries()) {
            if (ssrDoc.contains(ssrElement)) {
              sourceDocumentUrl = url;
              break;
            }
          }
        }
        
        blocks.push({
          id: `block-${blocks.length}`,
          element: liveElement, // ルート要素を保存
          ssrElement: ssrElement, // SSR要素への参照を保存
          sourceDocumentUrl: sourceDocumentUrl, // どのドキュメントから来たか
          name: blockName,
          tagName: liveElement.tagName.toLowerCase(),
          classes: liveElement.className || '',
        });
        console.log('[EDS Inspector] Detected block (from SSR, no network resource):', blockName, 'root element:', liveElement, 'SSR element:', ssrElement, 'sourceDocumentUrl:', sourceDocumentUrl);
      });
    } catch (e) {
      console.warn('[EDS Inspector] Error querying for SSR block:', blockName, e);
    }
  });
}

/**
 * Default Contentを検出（複数のSSRドキュメントに対応）
 */
function detectDefaultContent(ssrDocuments, mainSSR, mainLive, blockResources, blocks, seenElements) {
  console.log('[EDS Inspector] Detecting default content blocks...');
  
  // 既に検出されたブロック要素を収集
  const detectedBlockElements = new Set();
  blocks.forEach((block) => {
    detectedBlockElements.add(block.element);
  });
  
  // ブロッククラスを持つ要素も収集（main要素外も含む）
  blockResources.forEach((blockName) => {
    try {
      // headerとfooterはタグ名で検索
      let blockElements;
      if (blockName === 'header' || blockName === 'footer') {
        blockElements = document.querySelectorAll(blockName);
      } else {
        // 通常のブロックはクラス名で検索（ドキュメント全体から）
        blockElements = document.querySelectorAll(`.${CSS.escape(blockName)}`);
      }
      blockElements.forEach((el) => {
        if (el instanceof HTMLElement) {
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
    // すべてのSSRドキュメントから該当する要素を検出
    for (const [url, ssrDoc] of ssrDocuments.entries()) {
      let ssrElements;
      try {
        // main要素内を先に検索
        const mainSSRInDoc = ssrDoc.querySelector('main') || ssrDoc;
        ssrElements = mainSSRInDoc.querySelectorAll(contentDef.selector);
        
        // main要素内で見つからない場合、ドキュメント全体から検索
        if (ssrElements.length === 0) {
          ssrElements = ssrDoc.querySelectorAll(contentDef.selector);
        }
      } catch (e) {
        // セレクタが無効な場合（例: span.icon）はスキップ
        console.warn('[EDS Inspector] Invalid selector:', contentDef.selector, e);
        continue;
      }
      
      ssrElements.forEach((ssrEl) => {
        if (!(ssrEl instanceof HTMLElement)) return;
        
        // textブロック（<p>タグ）内の要素は検出しない
        const mainSSRInDoc = ssrDoc.querySelector('main') || ssrDoc;
        if (isInsideParagraph(ssrEl, mainSSRInDoc) && contentDef.selector !== 'p') {
          return;
        }
        
        // ライブDOMで対応する要素を見つける（ドキュメント全体から検索）
        const allLiveElements = document.querySelectorAll(contentDef.selector);
        // SSRドキュメント内でのインデックスを取得
        const ssrIndex = Array.from(ssrDoc.querySelectorAll(contentDef.selector)).indexOf(ssrEl);
        const liveElement = allLiveElements[ssrIndex];
      
      if (!liveElement) {
        // パスベースの検出を試す
        const mainSSRInDoc = ssrDoc.querySelector('main') || ssrDoc;
        const path = computeElementPath(ssrEl, mainSSRInDoc);
        // ライブDOMのmain要素から検索を試す
        let pathBasedElement = findElementByPath(mainLive, path);
        // main要素内で見つからない場合、ドキュメント全体から検索
        if (!pathBasedElement) {
          pathBasedElement = findElementByPath(document.body, path);
        }
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
        const mainLiveInDoc = document.querySelector('main') || document.body;
        if (isInsideParagraph(pathBasedElement, mainLiveInDoc) && contentDef.selector !== 'p') {
          return;
        }
        
        seenElements.add(pathBasedElement);
        
        blocks.push({
          id: `block-${blocks.length}`,
          element: pathBasedElement,
          ssrElement: ssrEl, // SSR要素への参照を保存
          sourceDocumentUrl: url, // どのドキュメントから来たか
          name: contentDef.name,
          tagName: pathBasedElement.tagName.toLowerCase(),
          classes: pathBasedElement.className || '',
          category: contentDef.category || 'default',
        });
        console.log('[EDS Inspector] Detected default content:', contentDef.name, 'element:', pathBasedElement, 'from:', url);
        return;
      }
      
      // 既に検出済みの要素はスキップ
      if (seenElements.has(liveElement)) return;
      
      // main要素外の要素も検出対象とする
      
      // ブロック要素の場合はスキップ
      if (isBlockElement(liveElement)) {
        return;
      }
      
      // ライブDOMでも<p>タグ内かどうかを確認
      const mainLiveInDoc = document.querySelector('main') || document.body;
      if (isInsideParagraph(liveElement, mainLiveInDoc) && contentDef.selector !== 'p') {
        return;
      }
      
      seenElements.add(liveElement);
      
      blocks.push({
        id: `block-${blocks.length}`,
        element: liveElement,
        ssrElement: ssrEl, // SSR要素への参照を保存
        sourceDocumentUrl: url, // どのドキュメントから来たか
        name: contentDef.name,
        tagName: liveElement.tagName.toLowerCase(),
        classes: liveElement.className || '',
        category: contentDef.category || 'default',
      });
      console.log('[EDS Inspector] Detected default content:', contentDef.name, 'element:', liveElement, 'from:', url);
      });
    }
  });
}

/**
 * Buttonsを検出（複数のSSRドキュメントに対応）
 */
function detectButtons(ssrDocuments, mainSSR, mainLive, blocks, seenElements) {
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
      ssrElement: ssrP, // SSR要素への参照を保存
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

