/**
 * ブロック検出ロジック
 */
import { computeElementPath, findElementByPath } from '../utils/dom.js';
import { DEFAULT_CONTENT_MAP } from '../constants.js';
import { state } from '../state.js';

/**
 * CSSクラス名をエスケープ（CSS.escapeのフォールバック付き）
 */
function escapeCSS(className) {
  if (typeof CSS !== 'undefined' && CSS.escape) {
    return CSS.escape(className);
  }
  // フォールバック: 基本的なエスケープ処理
  // CSS識別子として無効な文字をエスケープ
  return className.replace(/([^a-zA-Z0-9_-])/g, '\\$1');
}

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
  
  const defaultContentBlocks = blocks.filter(b => {
    const cat = b.category;
    return cat && cat !== 'block' && cat !== 'button' && cat !== 'icon';
  });
  
  console.log('[EDS Inspector] Detected blocks:', {
    total: blocks.length,
    defaultContent: defaultContentBlocks.length,
    blocks: blocks.map(b => ({ 
      name: b.name, 
      tagName: b.tagName, 
      category: b.category,
      classes: b.classes 
    }))
  });
  
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
    // sectionはBlockとして検出しない（SectionはBlockとは異なる特殊な概念）
    if (blockName === 'section') return;
    
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
        liveElements = Array.from(mainLive.querySelectorAll(`.${escapeCSS(blockName)}`));
        
        // main要素内で見つからない場合、ドキュメント全体から検索（side-navigationなどmain外の要素用）
        if (liveElements.length === 0) {
          liveElements = Array.from(document.querySelectorAll(`.${escapeCSS(blockName)}`));
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
        if (ssrDocuments.size > 0) {
          try {
            // fragment ブロックの特別な処理
            if (blockName === 'fragment') {
              // CSR側の data-path 属性を取得
              const dataPath = liveElement.getAttribute('data-path');
              if (dataPath) {
                // SSR側で /fragments/ へのリンクを持つ <a> タグを検索
                for (const [url, ssrDoc] of ssrDocuments.entries()) {
                  const mainSSRInDoc = ssrDoc.querySelector('main') || ssrDoc;
                  // /fragments/ へのリンクを持つ <a> タグを検索
                  const fragmentLinks = Array.from(mainSSRInDoc.querySelectorAll('a[href*="/fragments/"]'));
                  
                  // data-path の値と href の値でマッピング
                  const matchingLink = fragmentLinks.find(link => {
                    const href = link.getAttribute('href');
                    if (!href) return false;
                    // href から /fragments/ 以降のパスを抽出
                    const fragmentsMatch = href.match(/\/fragments\/(.+)/);
                    if (!fragmentsMatch) return false;
                    const fragmentPath = '/fragments/' + fragmentsMatch[1].split(/[?#]/)[0]; // クエリパラメータやフラグメントを除去
                    return fragmentPath === dataPath;
                  });
                  
                  if (matchingLink) {
                    // <a> タグの親要素（通常は <p>）を SSR 要素として使用
                    ssrElement = matchingLink.parentElement;
                    console.log('[EDS Inspector] Found fragment SSR element for', dataPath, 'in', url, ssrElement, 'tag:', ssrElement.tagName.toLowerCase());
                    break;
                  }
                }
              }
            } else {
              // 通常のブロック: まず、ブロック名で直接検索する方法を優先（より確実）
              // headerとfooterはタグ名で検索、それ以外はクラス名で検索
              let allLiveElements = [];
              if (blockName === 'header' || blockName === 'footer') {
                allLiveElements = Array.from(document.querySelectorAll(blockName));
              } else {
                allLiveElements = Array.from(document.querySelectorAll(`.${escapeCSS(blockName)}`));
              }
              
              const liveIndex = Array.from(allLiveElements).indexOf(liveElement);
              
              // すべてのSSRドキュメントを検索
              if (liveIndex >= 0) {
                for (const [url, ssrDoc] of ssrDocuments.entries()) {
                  let allSSRElements = [];
                  if (blockName === 'header' || blockName === 'footer') {
                    allSSRElements = Array.from(ssrDoc.querySelectorAll(blockName));
                  } else {
                    allSSRElements = Array.from(ssrDoc.querySelectorAll(`.${escapeCSS(blockName)}`));
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
              }
            }
            
            // ブロック名で見つからない場合、パスベースで検索を試す（フォールバック）
            // main ドキュメント以外のドキュメントも検索する
            if (!ssrElement && mainLive.contains(liveElement) && mainSSR) {
              // ライブ要素からパスを計算
              const path = computeElementPath(liveElement, mainLive);
              
              // まず main ドキュメントから検索
              const pathBasedElement = findElementByPath(mainSSR, path);
              
              // パスベースで見つかった要素が、実際のブロック要素かどうかを確認
              // ブロッククラスを持たない場合は、親要素を探してブロッククラスを持つ要素を見つける
              if (pathBasedElement && blockName !== 'header' && blockName !== 'footer') {
                let current = pathBasedElement;
                let foundBlockElement = null;
                // 親要素を遡ってブロッククラスを持つ要素を探す
                while (current && current !== mainSSR) {
                  const classList = Array.from(current.classList || []);
                  if (classList.includes(blockName)) {
                    foundBlockElement = current;
                    break;
                  }
                  current = current.parentElement;
                }
                if (foundBlockElement) {
                  ssrElement = foundBlockElement;
                }
              } else if (pathBasedElement) {
                ssrElement = pathBasedElement;
              }
              
              // main ドキュメントで見つからない場合、他のドキュメントも検索
              if (!ssrElement) {
                for (const [url, ssrDoc] of ssrDocuments.entries()) {
                  // main ドキュメントは既に検索済みなのでスキップ
                  if (ssrDoc === mainSSR?.ownerDocument) continue;
                  
                  const mainSSRInDoc = ssrDoc.querySelector('main') || ssrDoc;
                  const pathBasedElementInDoc = findElementByPath(mainSSRInDoc, path);
                  
                  if (pathBasedElementInDoc && blockName !== 'header' && blockName !== 'footer') {
                    let current = pathBasedElementInDoc;
                    let foundBlockElement = null;
                    // 親要素を遡ってブロッククラスを持つ要素を探す
                    while (current && current !== mainSSRInDoc) {
                      const classList = Array.from(current.classList || []);
                      if (classList.includes(blockName)) {
                        foundBlockElement = current;
                        break;
                      }
                      current = current.parentElement;
                    }
                    if (foundBlockElement) {
                      ssrElement = foundBlockElement;
                      console.log('[EDS Inspector] Found SSR element for', blockName, 'in', url, 'via path-based search', ssrElement);
                      break;
                    }
                  } else if (pathBasedElementInDoc) {
                    ssrElement = pathBasedElementInDoc;
                    console.log('[EDS Inspector] Found SSR element for', blockName, 'in', url, 'via path-based search', ssrElement);
                    break;
                  }
                }
              }
            }
            
            if (!ssrElement) {
              console.warn('[EDS Inspector] Could not find SSR element for', blockName, 'in any SSR document');
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
    // sectionはBlockとして検出しない（SectionはBlockとは異なる特殊な概念）
    if (blockName === 'section') return;
    
    try {
      // main要素内を先に検索
      let liveElements = Array.from(mainLive.querySelectorAll(`.${escapeCSS(blockName)}`));
      
      // main要素内で見つからない場合、ドキュメント全体から検索
      if (liveElements.length === 0) {
        liveElements = Array.from(document.querySelectorAll(`.${escapeCSS(blockName)}`));
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
        if (ssrDocuments.size > 0) {
          try {
            // まず、ブロック名で直接検索する方法を優先（より確実）
            const allLiveElements = Array.from(document.querySelectorAll(`.${escapeCSS(blockName)}`));
            const liveIndex = Array.from(allLiveElements).indexOf(liveElement);
            
            // すべてのSSRドキュメントを検索
            if (liveIndex >= 0) {
              for (const [url, ssrDoc] of ssrDocuments.entries()) {
                const allSSRElements = Array.from(ssrDoc.querySelectorAll(`.${escapeCSS(blockName)}`));
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
            }
            
            // ブロック名で見つからない場合、パスベースで検索を試す（フォールバック）
            // main ドキュメント以外のドキュメントも検索する
            if (!ssrElement && mainLive.contains(liveElement) && mainSSR) {
              // ライブ要素からパスを計算
              const path = computeElementPath(liveElement, mainLive);
              
              // まず main ドキュメントから検索
              const pathBasedElement = findElementByPath(mainSSR, path);
              
              // パスベースで見つかった要素が、実際のブロック要素かどうかを確認
              // ブロッククラスを持たない場合は、親要素を探してブロッククラスを持つ要素を見つける
              if (pathBasedElement && blockName !== 'header' && blockName !== 'footer') {
                let current = pathBasedElement;
                let foundBlockElement = null;
                // 親要素を遡ってブロッククラスを持つ要素を探す
                while (current && current !== mainSSR) {
                  const classList = Array.from(current.classList || []);
                  if (classList.includes(blockName)) {
                    foundBlockElement = current;
                    break;
                  }
                  current = current.parentElement;
                }
                if (foundBlockElement) {
                  ssrElement = foundBlockElement;
                }
              } else if (pathBasedElement) {
                ssrElement = pathBasedElement;
              }
              
              // main ドキュメントで見つからない場合、他のドキュメントも検索
              if (!ssrElement) {
                for (const [url, ssrDoc] of ssrDocuments.entries()) {
                  // main ドキュメントは既に検索済みなのでスキップ
                  if (ssrDoc === mainSSR?.ownerDocument) continue;
                  
                  const mainSSRInDoc = ssrDoc.querySelector('main') || ssrDoc;
                  const pathBasedElementInDoc = findElementByPath(mainSSRInDoc, path);
                  
                  if (pathBasedElementInDoc && blockName !== 'header' && blockName !== 'footer') {
                    let current = pathBasedElementInDoc;
                    let foundBlockElement = null;
                    // 親要素を遡ってブロッククラスを持つ要素を探す
                    while (current && current !== mainSSRInDoc) {
                      const classList = Array.from(current.classList || []);
                      if (classList.includes(blockName)) {
                        foundBlockElement = current;
                        break;
                      }
                      current = current.parentElement;
                    }
                    if (foundBlockElement) {
                      ssrElement = foundBlockElement;
                      console.log('[EDS Inspector] Found SSR element for', blockName, 'in', url, 'via path-based search', ssrElement);
                      break;
                    }
                  } else if (pathBasedElementInDoc) {
                    ssrElement = pathBasedElementInDoc;
                    console.log('[EDS Inspector] Found SSR element for', blockName, 'in', url, 'via path-based search', ssrElement);
                    break;
                  }
                }
              }
            }
            
            if (!ssrElement) {
              console.warn('[EDS Inspector] Could not find SSR element for', blockName, 'in any SSR document');
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
 * SSRとCSRで一貫したロジックを使用
 */
function detectDefaultContent(ssrDocuments, mainSSR, mainLive, blockResources, blocks, seenElements) {
  console.log('[EDS Inspector] Detecting default content blocks...', {
    ssrDocumentsCount: ssrDocuments.size,
    blockResourcesCount: blockResources.size,
    existingBlocksCount: blocks.length
  });
  
  // 既に検出されたブロック要素を収集
  const detectedBlockElements = new Set();
  blocks.forEach((block) => {
    detectedBlockElements.add(block.element);
  });
  
  // ブロッククラスを持つ要素も収集（ライブDOMとSSRドキュメントの両方から）
  const collectBlockElements = (doc, isSSR = false) => {
    blockResources.forEach((blockName) => {
      try {
        let blockElements;
        if (blockName === 'header' || blockName === 'footer') {
          blockElements = doc.querySelectorAll(blockName);
        } else {
          blockElements = doc.querySelectorAll(`.${escapeCSS(blockName)}`);
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
  };
  
  collectBlockElements(document);
  ssrDocuments.forEach((ssrDoc) => {
    collectBlockElements(ssrDoc, true);
  });
  
  // ブロック要素かどうかを判定（SSRとCSRで同じロジック）
  function isBlockElement(element, doc = document) {
    if (!element || !(element instanceof HTMLElement)) return false;
    
    // 要素自体がブロック要素かチェック
    if (detectedBlockElements.has(element)) return true;
    const classes = Array.from(element.classList || []);
    if (classes.some(cls => blockResources.has(cls))) return true;
    
    // 親要素がブロック要素かチェック
    let parent = element.parentElement;
    const root = doc.body || doc.documentElement;
    while (parent && parent !== root) {
      if (detectedBlockElements.has(parent)) return true;
      const parentClasses = Array.from(parent.classList || []);
      if (parentClasses.some(cls => blockResources.has(cls))) return true;
      parent = parent.parentElement;
    }
    
    return false;
  }
  
  // <p>の直下に<picture>があるかチェック（imageとして検出するため）
  function isPictureDirectChildOfP(element) {
    if (!element || element.tagName.toLowerCase() !== 'picture') return false;
    const parent = element.parentElement;
    return parent && parent.tagName.toLowerCase() === 'p';
  }
  
  // パスベースでSSR要素とCSR要素をマッピング（一貫したロジック）
  function findMatchingLiveElement(ssrElement, ssrDoc, mainSSRInDoc, contentDef) {
    // パスベースでマッピングを試す
    const path = computeElementPath(ssrElement, mainSSRInDoc);
    
    // ライブDOMのmain要素から検索
    let liveElement = findElementByPath(mainLive, path);
    if (liveElement && liveElement.tagName.toLowerCase() === contentDef.selector.toLowerCase()) {
      return liveElement;
    }
    
    // main要素内で見つからない場合、ドキュメント全体から検索
    liveElement = findElementByPath(document.body, path);
    if (liveElement && liveElement.tagName.toLowerCase() === contentDef.selector.toLowerCase()) {
      return liveElement;
    }
    
    // パスベースで見つからない場合、インデックスベースでフォールバック
    const mainLiveElements = Array.from(mainLive.querySelectorAll(contentDef.selector));
    const mainSSRElements = Array.from(mainSSRInDoc.querySelectorAll(contentDef.selector));
    
    const ssrIndex = mainSSRElements.indexOf(ssrElement);
    if (ssrIndex >= 0 && ssrIndex < mainLiveElements.length) {
      const candidateElement = mainLiveElements[ssrIndex];
      if (candidateElement.tagName.toLowerCase() === contentDef.selector.toLowerCase()) {
        // テキスト内容の一致を確認（より正確なマッピングのため）
        const ssrText = ssrElement.textContent?.trim() || '';
        const liveText = candidateElement.textContent?.trim() || '';
        const ssrTextShort = ssrText.substring(0, 50);
        const liveTextShort = liveText.substring(0, 50);
        // テキストが一致するか、または両方とも空（画像など）の場合はマッピングを許可
        if (ssrTextShort === liveTextShort || (ssrText === '' && liveText === '')) {
          return candidateElement;
        }
      }
    }
    
    return null;
  }
  
  DEFAULT_CONTENT_MAP.forEach((contentDef) => {
    // すべてのSSRドキュメントから該当する要素を検出
    for (const [url, ssrDoc] of ssrDocuments.entries()) {
      const mainSSRInDoc = ssrDoc.querySelector('main') || ssrDoc;
      let ssrElements;
      
      try {
        // main要素内を先に検索
        ssrElements = mainSSRInDoc.querySelectorAll(contentDef.selector);
        
        // main要素内で見つからない場合、ドキュメント全体から検索
        if (ssrElements.length === 0) {
          ssrElements = ssrDoc.querySelectorAll(contentDef.selector);
        }
      } catch (e) {
        console.warn('[EDS Inspector] Invalid selector:', contentDef.selector, e);
        continue;
      }
      
      ssrElements.forEach((ssrEl) => {
        if (!(ssrEl instanceof HTMLElement)) return;
        
        // SSR要素がブロック要素内にある場合はスキップ
        if (isBlockElement(ssrEl, ssrDoc)) {
          console.log('[EDS Inspector] Skipping SSR element (inside block):', {
            selector: contentDef.selector,
            element: ssrEl,
            tagName: ssrEl.tagName.toLowerCase()
          });
          return;
        }
        
        // <p>の直下に<picture>がある場合はimageとして検出（特別扱い）
        const isPictureInP = isPictureDirectChildOfP(ssrEl);
        if (isPictureInP && contentDef.selector === 'picture') {
          // この場合は検出を続行
        } else if (isInsideParagraph(ssrEl, mainSSRInDoc) && contentDef.selector !== 'p') {
          // 通常の<p>タグ内の要素は検出しない（<p>タグ自体と<p>直下の<picture>は除く）
          return;
        }
        
        // パスベースでCSR要素を見つける（SSRとCSRで一貫したロジック）
        const liveElement = findMatchingLiveElement(ssrEl, ssrDoc, mainSSRInDoc, contentDef);
        
        if (!liveElement) {
          console.log('[EDS Inspector] No matching live element found for SSR element:', {
            selector: contentDef.selector,
            ssrElement: ssrEl,
            tagName: ssrEl.tagName.toLowerCase(),
            path: computeElementPath(ssrEl, mainSSRInDoc)
          });
          return;
        }
        
        // 既に検出済みの要素はスキップ
        if (seenElements.has(liveElement)) return;
        
        // CSR要素もブロック要素内にある場合はスキップ（SSRとCSRで一貫したチェック）
        if (isBlockElement(liveElement, document)) {
          console.log('[EDS Inspector] Skipping live element (inside block):', {
            selector: contentDef.selector,
            element: liveElement,
            tagName: liveElement.tagName.toLowerCase()
          });
          return;
        }
        
        // CSR要素が<p>タグ内かどうかを確認（<p>タグ自体と<p>直下の<picture>は除く）
        const isLivePictureInP = isPictureDirectChildOfP(liveElement);
        if (!isLivePictureInP && isInsideParagraph(liveElement, mainLive) && contentDef.selector !== 'p') {
          return;
        }
        
        seenElements.add(liveElement);
        
        blocks.push({
          id: `block-${blocks.length}`,
          element: liveElement,
          ssrElement: ssrEl,
          sourceDocumentUrl: url,
          name: contentDef.name,
          tagName: liveElement.tagName.toLowerCase(),
          classes: liveElement.className || '',
          category: contentDef.category || 'default',
        });
        
        console.log('[EDS Inspector] ✓ Detected default content:', {
          name: contentDef.name,
          category: contentDef.category || 'default',
          selector: contentDef.selector,
          element: liveElement,
          ssrElement: ssrEl,
          sourceDocumentUrl: url,
          path: computeElementPath(ssrEl, mainSSRInDoc),
          isPictureInP: isPictureInP || isLivePictureInP,
          tagName: liveElement.tagName.toLowerCase()
        });
      });
    }
  });
  
  // 検出結果をログ出力
  const detectedDefaultContent = blocks.filter(b => {
    const cat = b.category;
    return cat && cat !== 'block' && cat !== 'button' && cat !== 'icon';
  });
  console.log('[EDS Inspector] Default content detection complete:', {
    detectedCount: detectedDefaultContent.length,
    categories: [...new Set(detectedDefaultContent.map(b => b.category))],
    items: detectedDefaultContent.map(b => ({ name: b.name, category: b.category }))
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

