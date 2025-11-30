/**
 * セクション検出ロジック
 */
import { computeElementPath, findElementByPath } from '../utils/dom.js';

/**
 * セクションを検出（複数のSSRドキュメントに対応）
 */
export function detectSections(ssrDocuments, mainSSR, mainLive) {
  const sections = [];
  const seenElements = new Set();
  
  console.log('[EDS Inspector] Detecting sections...');
  console.log('[EDS Inspector] SSR documents count:', ssrDocuments.size);
  console.log('[EDS Inspector] SSR main children:', Array.from(mainSSR.children).map(c => c.tagName));
  console.log('[EDS Inspector] Live main children:', Array.from(mainLive.children).map(c => c.tagName));
  
  // EDSの構造に基づくSection検出:
  // 1. Blocksとdefault contentは常にsectionでラップされる
  // 2. Sectionは<main>の直接の子要素として存在する
  // 3. Section Metadataブロックがある場合、それがsectionにdata属性を追加する
  
  // <main>の直接の子要素をsectionとして検出（これが最も重要）
  const ssrChildren = Array.from(mainSSR.children);
  const liveChildren = Array.from(mainLive.children);
  
  ssrChildren.forEach((ssrChild, index) => {
    if (!(ssrChild instanceof HTMLElement)) return;
    
    // 対応するライブDOMの要素を見つける
    // インデックスベースで検出（構造が同じ場合）
    let liveElement = liveChildren[index];
    
    // インデックスが一致しない場合、パスベースで検出を試す
    if (!liveElement || liveElement.tagName !== ssrChild.tagName) {
      const path = computeElementPath(ssrChild, mainSSR);
      liveElement = findElementByPath(mainLive, path);
    }
    
    if (!liveElement) {
      console.warn('[EDS Inspector] Could not find live element for section at index:', index);
      return;
    }
    
    // 既に検出済みの要素はスキップ
    if (seenElements.has(liveElement)) return;
    seenElements.add(liveElement);
    
    // Section Metadataブロックを探す（section-metadataクラスを持つ要素）
    let sectionLabel = null;
    const sectionMetadata = ssrChild.querySelector('.section-metadata');
    if (sectionMetadata) {
      // Section Metadataからラベルを抽出
      // 2つ目の<div>のテキストを取得（例: "content"）
      const metadataContainer = sectionMetadata.querySelector('div > div');
      if (metadataContainer) {
        const metadataCells = Array.from(metadataContainer.children);
        if (metadataCells.length >= 2) {
          // 2つ目の<div>のテキストを取得
          const secondCell = metadataCells[1];
          const labelText = secondCell.textContent.trim();
          if (labelText) {
            sectionLabel = labelText;
          }
        }
      }
    }
    
    // section-metadataがない場合は、ラベルをnullのままにする（表示時に"Section:"のみ表示）
    
    sections.push({ 
      id: `section-${sections.length}`, 
      element: liveElement, 
      label: sectionLabel // nullの場合は名前部分を省略
    });
    
    console.log('[EDS Inspector] Detected section:', sectionLabel, 'element:', liveElement);
  });
  
  // <section>要素も検出（HTML5のセマンティック要素として）
  // ただし、<main>の直接の子要素でない場合は、親sectionの一部として扱う
  const sectionElements = mainSSR.querySelectorAll('section');
  sectionElements.forEach((ssrSection) => {
    if (!(ssrSection instanceof HTMLElement)) return;
    
    // <main>の直接の子要素の場合は既に検出済み
    if (ssrSection.parentElement === mainSSR) return;
    
    const path = computeElementPath(ssrSection, mainSSR);
    const liveSection = findElementByPath(mainLive, path);
    if (!liveSection) return;
    
    // 既に検出済みの要素はスキップ
    if (seenElements.has(liveSection)) return;
    
    // 親要素が既にsectionとして検出されている場合はスキップ
    let parent = liveSection.parentElement;
    let isChildOfDetectedSection = false;
    while (parent && parent !== mainLive) {
      if (seenElements.has(parent)) {
        isChildOfDetectedSection = true;
        break;
      }
      parent = parent.parentElement;
    }
    
    if (isChildOfDetectedSection) return;
    
    seenElements.add(liveSection);
    const label = ssrSection.getAttribute('data-section-id') || 
                  ssrSection.className || 
                  ssrSection.id || 
                  `section-${sections.length + 1}`;
    sections.push({ 
      id: `section-${sections.length}`, 
      element: liveSection, 
      label 
    });
    console.log('[EDS Inspector] Detected nested section:', label);
  });
  
  console.log('[EDS Inspector] Detected sections:', sections.map(s => ({ label: s.label, tagName: s.element.tagName })));
  
  return sections;
}

