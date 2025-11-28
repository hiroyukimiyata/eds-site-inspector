(() => {
  // 既に実行されている場合でも、メッセージリスナーが動作するようにする
  const isAlreadyInitialized = window.__edsInspectorInitialized;
  if (isAlreadyInitialized) {
    console.warn('[EDS Inspector Content] Script already initialized, but message listener should still work.');
  } else {
    window.__edsInspectorInitialized = true;
  }
  
  // メッセージリスナーが既に設定されているか確認
  if (window.__edsInspectorMessageListenerAttached) {
    console.log('[EDS Inspector Content] Message listener already attached, skipping re-initialization.');
    // メッセージリスナーは既に設定されているので、早期リターン
    return;
  }

  const UI_IDS = {
    overlayRoot: 'eds-inspector-overlay-root',
  };

  // Default Contentの定義（ドキュメントに基づく）
  // https://www.aem.live/developer/block-collection/
  const DEFAULT_CONTENT_MAP = [
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

  const state = {
    sections: [],
    blocks: [],
    overlays: [],
    overlaysEnabled: { sections: true, blocks: true },
    overlaysVisible: true, // オーバーレイ全体の表示状態
    selectedBlockId: null,
    codeBasePath: null,
    mediaBasePath: null,
    codeTree: null,
    mediaFiles: null,
    ssrDocument: null,
  };

  function createOverlayRoot() {
    let root = document.getElementById(UI_IDS.overlayRoot);
    if (root) return root;
    root = document.createElement('div');
    root.id = UI_IDS.overlayRoot;
    root.style.position = 'absolute';
    root.style.top = '0';
    root.style.left = '0';
    root.style.width = '100%';
    root.style.height = `${document.documentElement.scrollHeight}px`;
    root.style.pointerEvents = 'none';
    root.style.zIndex = '2147483646';
    document.body.appendChild(root);
    return root;
  }

  function ensureOverlayRootSizing(root) {
    if (!root) return;
    const doc = document.documentElement;
    const body = document.body || { scrollHeight: 0, scrollWidth: 0 };
    const height = Math.max(doc.scrollHeight, doc.clientHeight, body.scrollHeight, body.clientHeight || 0);
    const width = Math.max(doc.scrollWidth, doc.clientWidth, body.scrollWidth, body.clientWidth || 0);
    root.style.height = `${height}px`;
    root.style.width = `${width}px`;
  }

  function computeElementPath(el, root) {
    const path = [];
    let current = el;
    while (current && current !== root) {
      const parent = current.parentElement;
      if (!parent) break;
      const idx = Array.from(parent.children).indexOf(current);
      path.unshift(idx);
      current = parent;
    }
    return path;
  }

  function findElementByPath(root, path) {
    let current = root;
    for (const idx of path) {
      if (!current || !current.children || !current.children[idx]) return null;
      current = current.children[idx];
    }
    return current;
  }

  function inferBlockName(el) {
    if (el.dataset.blockName) return el.dataset.blockName;
    const blockClass = Array.from(el.classList).find((cls) => cls !== 'block' && !cls.startsWith('section-'));
    if (blockClass) return blockClass;
    const defaultContent = DEFAULT_CONTENT_MAP.find((entry) => el.matches(entry.selector));
    if (defaultContent) return defaultContent.name;
    return el.tagName.toLowerCase();
  }

  function formatHtmlSnippet(el) {
    const clone = el.cloneNode(true);
    const lines = clone.outerHTML.split('\n');
    return lines.map((line) => line.trim()).join('\n');
  }

  function collectBlockResourceNames() {
    const blockNames = new Set();
    const addFromUrl = (urlString) => {
      try {
        const { pathname } = new URL(urlString, window.location.href);
        // /blocks/{block-name}/ というパターンを検出
        const match = pathname.match(/\/blocks\/([^/]+)\//);
        if (match && match[1]) {
          blockNames.add(match[1]);
          console.log('[EDS Inspector] Found block resource:', match[1], 'from URL:', urlString);
        }
      } catch (e) {
        /* noop */
      }
    };

    // Performance APIからネットワークリクエストを収集
    performance.getEntriesByType('resource').forEach((entry) => {
      addFromUrl(entry.name);
    });
    
    // DOMからlink/scriptタグのURLを収集
    document.querySelectorAll('link[href*="/blocks/"], script[src*="/blocks/"]').forEach((el) => {
      const url = el.getAttribute('href') || el.getAttribute('src');
      if (url) addFromUrl(url);
    });
    
    // ネットワークリクエストを監視（既に読み込まれたリソースも含む）
    // 追加のリクエストをキャッチするため、PerformanceObserverも使用
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.name) addFromUrl(entry.name);
        });
      });
      observer.observe({ entryTypes: ['resource'] });
    } catch (e) {
      // PerformanceObserverがサポートされていない場合は無視
    }
    
    console.log('[EDS Inspector] Collected block names:', Array.from(blockNames));
    return blockNames;
  }

  function detectSections(mainSSR, mainLive) {
    const sections = [];
    const seenElements = new Set();
    
    console.log('[EDS Inspector] Detecting sections...');
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
        const styleCell = sectionMetadata.querySelector('div > div:first-child');
        if (styleCell) {
          sectionLabel = styleCell.textContent.trim();
        }
      }
      
      // data-section-id属性を確認
      if (!sectionLabel && ssrChild.hasAttribute('data-section-id')) {
        sectionLabel = ssrChild.getAttribute('data-section-id');
      }
      
      // クラス名からラベルを抽出
      if (!sectionLabel) {
        const classes = Array.from(ssrChild.classList);
        const sectionClass = classes.find(cls => cls.startsWith('section-') && cls !== 'section-metadata');
        if (sectionClass) {
          sectionLabel = sectionClass;
        }
      }
      
      // デフォルトラベル
      if (!sectionLabel) {
        sectionLabel = `section-${sections.length + 1}`;
      }
      
      sections.push({ 
        id: `section-${sections.length}`, 
        element: liveElement, 
        label: sectionLabel 
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

  function detectBlocks(mainSSR, mainLive, blockResources) {
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
    // ライブDOMで直接クラス名で検索する（パスベースの検出は信頼性が低いため）
    blockResources.forEach((blockName) => {
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
    
    // SSRマークアップからもブロッククラスを検出（ネットワークリクエストに存在しない場合）
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
    
    // Default Contentの検出
    // Default Contentはブロックリソース（/blocks/{name}/）を持たないため、
    // SSRマークアップから直接セマンティックな要素を検出する
    console.log('[EDS Inspector] Detecting default content blocks...');
    
    // 既に検出されたブロック要素を収集（ブロック内のDefault Contentは検出しないため）
    const detectedBlockElements = new Set();
    blocks.forEach((block) => {
      detectedBlockElements.add(block.element);
    });
    
    // ブロッククラスを持つ要素も収集（ネットワークリクエストに存在するブロック）
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
    
    DEFAULT_CONTENT_MAP.forEach((contentDef) => {
      // SSRマークアップから該当する要素を検出
      const ssrElements = mainSSR.querySelectorAll(contentDef.selector);
      ssrElements.forEach((ssrEl) => {
        if (!(ssrEl instanceof HTMLElement)) return;
        
        // textブロック（<p>タグ）内の要素は検出しない
        // codeやlinkなどは、<p>タグ内にある場合はオーバーレイ表示を省略
        let parent = ssrEl.parentElement;
        let isInsideParagraph = false;
        while (parent && parent !== mainSSR) {
          if (parent.tagName.toLowerCase() === 'p') {
            isInsideParagraph = true;
            break;
          }
          parent = parent.parentElement;
        }
        
        // <p>タグ内の要素で、かつtextブロック自体でない場合はスキップ
        if (isInsideParagraph && contentDef.selector !== 'p') {
          return;
        }
        
        // ライブDOMで対応する要素を見つける
        // セレクタとインデックスを使って検出
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
          
          // ブロック内の要素は検出しない
          let liveParent = pathBasedElement.parentElement;
          let isInsideBlock = false;
          while (liveParent && liveParent !== mainLive) {
            if (detectedBlockElements.has(liveParent)) {
              isInsideBlock = true;
              break;
            }
            // ブロッククラスを持つ要素もチェック
            const parentClasses = Array.from(liveParent.classList || []);
            if (parentClasses.some(cls => blockResources.has(cls))) {
              isInsideBlock = true;
              break;
            }
            liveParent = liveParent.parentElement;
          }
          
          if (isInsideBlock) {
            return;
          }
          
          // ライブDOMでも<p>タグ内かどうかを確認
          liveParent = pathBasedElement.parentElement;
          let isInsideLiveParagraph = false;
          while (liveParent && liveParent !== mainLive) {
            if (liveParent.tagName.toLowerCase() === 'p') {
              isInsideLiveParagraph = true;
              break;
            }
            liveParent = liveParent.parentElement;
          }
          
          // <p>タグ内の要素で、かつtextブロック自体でない場合はスキップ
          if (isInsideLiveParagraph && contentDef.selector !== 'p') {
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
        
        // ブロック内の要素は検出しない
        let liveParent = liveElement.parentElement;
        let isInsideBlock = false;
        while (liveParent && liveParent !== mainLive) {
          if (detectedBlockElements.has(liveParent)) {
            isInsideBlock = true;
            break;
          }
          // ブロッククラスを持つ要素もチェック
          const parentClasses = Array.from(liveParent.classList || []);
          if (parentClasses.some(cls => blockResources.has(cls))) {
            isInsideBlock = true;
            break;
          }
          liveParent = liveParent.parentElement;
        }
        
        if (isInsideBlock) {
          return;
        }
        
        // ライブDOMでも<p>タグ内かどうかを確認
        liveParent = liveElement.parentElement;
        let isInsideLiveParagraph = false;
        while (liveParent && liveParent !== mainLive) {
          if (liveParent.tagName.toLowerCase() === 'p') {
            isInsideLiveParagraph = true;
            break;
          }
          liveParent = liveParent.parentElement;
        }
        
        // <p>タグ内の要素で、かつtextブロック自体でない場合はスキップ
        if (isInsideLiveParagraph && contentDef.selector !== 'p') {
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
    
    // Buttonsの検出（特別な処理が必要）
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
    
    console.log('[EDS Inspector] Detected blocks:', blocks.map(b => ({ name: b.name, tagName: b.tagName, classes: b.classes })));
    
    return blocks;
  }

  function createOverlayElement(item, type) {
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
      label.textContent = `Section: ${item.label}`;
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

  function refreshOverlayPositions() {
    const root = document.getElementById(UI_IDS.overlayRoot);
    if (!root) return;
    ensureOverlayRootSizing(root);
    
    // オーバーレイ全体が非表示の場合は、ルート要素を非表示にする
    if (!state.overlaysVisible) {
      root.style.display = 'none';
      return;
    }
    
    root.style.display = 'block';
    const viewportOffset = { x: window.scrollX, y: window.scrollY };
    state.overlays.forEach((overlay) => {
      const { element, target } = overlay;
      const rect = target.getBoundingClientRect();
      element.style.transform = `translate(${rect.left + viewportOffset.x}px, ${rect.top + viewportOffset.y}px)`;
      element.style.width = `${rect.width}px`;
      element.style.height = `${rect.height}px`;
      // オーバーレイ全体が表示されている場合のみ、個別のオーバーレイの表示状態を確認
      element.style.display = (overlay.visible && state.overlaysEnabled[overlay.item.id.startsWith('section-') ? 'sections' : 'blocks']) ? 'block' : 'none';
    });
  }
  
  function toggleOverlays() {
    state.overlaysVisible = !state.overlaysVisible;
    refreshOverlayPositions();
    console.log('[EDS Inspector] Overlays toggled, visible:', state.overlaysVisible);
  }

  function setHighlight(id) {
    state.overlays.forEach((overlay) => {
      overlay.element.classList.toggle('is-highlighted', overlay.item.id === id);
    });
  }

  function buildOverlays() {
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
      state.overlays.push({ element: el, target: block.element, item: block, visible: state.overlaysEnabled.blocks });
    });
    refreshOverlayPositions();
  }

  function serializeState() {
    // ブロックをユニークにする（同じ要素を複数回検出しないようにする）
    const uniqueBlocks = new Map();
    const seenElements = new Set();
    
    state.blocks.forEach((block) => {
      // 要素ベースでユニーク化
      if (seenElements.has(block.element)) return;
      seenElements.add(block.element);
      
      // nameだけでユニーク化（同じnameのブロックは1つだけ表示）
      const key = block.name;
      if (!uniqueBlocks.has(key)) {
        uniqueBlocks.set(key, block);
      } else {
        // 既存のブロックと比較して、より適切なものを選択
        const existing = uniqueBlocks.get(key);
        // tagNameがより具体的なものを優先（例: picture > img）
        const existingTag = existing.tagName.toLowerCase();
        const currentTag = block.tagName.toLowerCase();
        // picture > img, pre > code などの優先順位
        const tagPriority = { picture: 3, pre: 3, h1: 6, h2: 5, h3: 4, h4: 3, h5: 2, h6: 1, ol: 2, ul: 2 };
        const existingPriority = tagPriority[existingTag] || 0;
        const currentPriority = tagPriority[currentTag] || 0;
        if (currentPriority > existingPriority) {
          uniqueBlocks.set(key, block);
        }
      }
    });
    
    return {
      sections: state.sections.map((section) => ({ id: section.id, label: section.label })),
      blocks: Array.from(uniqueBlocks.values()).map((block) => ({ 
        id: block.id, 
        name: block.name, 
        tagName: block.tagName, 
        classes: block.classes,
        category: block.category || 'block'
      })),
      overlaysEnabled: { ...state.overlaysEnabled },
      selectedBlock: state.selectedBlockId,
      codeBasePath: state.codeBasePath,
      mediaBasePath: state.mediaBasePath,
      codeTree: state.codeTree,
      mediaFiles: state.mediaFiles,
    };
  }
  
  function showDevToolsPrompt() {
    // DevToolsを開くように促すメッセージを表示
    const prompt = document.createElement('div');
    prompt.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(120deg, #0ea5e9, #6366f1);
      color: #0b1220;
      padding: 16px 20px;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 2147483647;
      font-family: Inter, Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      max-width: 400px;
      line-height: 1.5;
    `;
    prompt.innerHTML = `
      <div style="font-weight: 700; margin-bottom: 8px;">EDS Site Inspector</div>
      <div style="margin-bottom: 12px;">Please open DevTools (F12 or Cmd+Option+I) and select the "EDS Site Inspector" tab.</div>
      <button id="eds-close-prompt" style="
        background: #0b1220;
        color: #fff;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        font-size: 12px;
      ">Close</button>
    `;
    document.body.appendChild(prompt);
    
    const closeBtn = prompt.querySelector('#eds-close-prompt');
    closeBtn.addEventListener('click', () => {
      prompt.remove();
    });
    
    // 5秒後に自動的に閉じる
    setTimeout(() => {
      if (prompt.parentNode) {
        prompt.remove();
      }
    }, 5000);
  }

  function buildTreeFromPaths(paths) {
    const root = { name: 'codebus', children: [] };
    paths.forEach((path) => {
      const parts = path.replace(/^\//, '').split('/');
      let current = root;
      parts.forEach((part, index) => {
        let child = current.children.find((c) => c.name === part);
        if (!child) {
          child = { name: part, children: [] };
          current.children.push(child);
        }
        if (index === parts.length - 1) {
          child.path = `/${parts.join('/')}`;
        }
        current = child;
      });
    });
    return root;
  }

  function parseRefRepoOwner(urlString) {
    try {
      const url = new URL(urlString);
      const match = url.hostname.match(/^(?<ref>[^-]+)--(?<repo>[^-]+)--(?<owner>[^.]+)/);
      if (match && match.groups) {
        return match.groups;
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  async function fetchAdminListing(basePath, filterFn) {
    const parsed = parseRefRepoOwner(basePath);
    if (!parsed) return null;
    const { owner, repo, ref } = parsed;
    const url = `https://admin.hlx.page/inspect/${owner}/${repo}/${ref}/`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load listing: ${res.status}`);
    const json = await res.json();
    if (!Array.isArray(json.entries)) return null;
    const filtered = filterFn ? json.entries.filter(filterFn) : json.entries;
    return filtered.map((entry) => entry.path);
  }

  async function loadCodeAndMedia() {
    if (state.codeBasePath) {
      try {
        const paths = await fetchAdminListing(state.codeBasePath, (entry) => entry.type === 'file');
        if (paths && paths.length) {
          state.codeTree = buildTreeFromPaths(paths);
        }
      } catch (err) {
        console.warn('Code Bus listing failed', err);
      }
    }
    if (state.mediaBasePath) {
      try {
        const mediaPaths = await fetchAdminListing(state.mediaBasePath, (entry) => entry.type === 'file' && entry.path.includes('media_'));
        if (mediaPaths) {
          state.mediaFiles = mediaPaths.map((path) => ({ path }));
        }
      } catch (err) {
        console.warn('Media Bus listing failed', err);
      }
    }
  }

  async function resolveConfig() {
    const maybe = window.hlx || window.hlxRUM || {};
    state.codeBasePath = maybe.codeBasePath || null;
    state.mediaBasePath = maybe.mediaBasePath || null;

    if (state.codeBasePath && state.mediaBasePath) return;

    const candidates = ['/.helix/config.json', '/helix-config.json'];
    for (const path of candidates) {
      try {
        const res = await fetch(path);
        if (res.ok) {
          const json = await res.json();
          state.codeBasePath = state.codeBasePath || json.codeBasePath;
          state.mediaBasePath = state.mediaBasePath || json.mediaBasePath;
          break;
        }
      } catch (e) {
        // ignore
      }
    }
  }

  function destroy() {
    const overlay = document.getElementById(UI_IDS.overlayRoot);
    if (overlay) overlay.remove();
    state.overlays = [];
  }

  async function parseSSRDocument() {
    try {
      const res = await fetch(window.location.href, { credentials: 'include' });
      const html = await res.text();
      const parser = new DOMParser();
      return parser.parseFromString(html, 'text/html');
    } catch (err) {
      console.warn('Failed to fetch SSR markup', err);
      return null;
    }
  }

  async function analyzePage() {
    const mainLive = document.querySelector('main');
    if (!mainLive) {
      throw new Error('EDS Inspector: <main> element not found.');
    }
    const ssrDoc = (state.ssrDocument = (await parseSSRDocument()) || document);
    const mainSSR = ssrDoc.querySelector('main') || document.querySelector('main');
    const blockResources = collectBlockResourceNames();

    state.sections = detectSections(mainSSR, mainLive);
    state.blocks = detectBlocks(mainSSR, mainLive, blockResources);
    buildOverlays();
    refreshOverlayPositions();
  }

  async function getBlockAssets(blockName) {
    const assets = [];
    const seen = new Set();
    const addAsset = (urlString) => {
      try {
        const url = new URL(urlString, window.location.href);
        if (!url.pathname.includes(`/blocks/${blockName}/`)) return;
        if (seen.has(url.pathname)) return;
        seen.add(url.pathname);
        assets.push({ url: url.toString(), path: url.pathname });
      } catch (e) {
        /* noop */
      }
    };

    performance.getEntriesByType('resource').forEach((entry) => addAsset(entry.name));
    document.querySelectorAll('link[href*="/blocks/"], script[src*="/blocks/"]').forEach((el) => {
      const url = el.getAttribute('href') || el.getAttribute('src');
      if (url) addAsset(url);
    });

    const enriched = [];
    for (const asset of assets) {
      try {
        const res = await fetch(asset.url);
        const text = await res.text();
        const type = asset.path.split('.').pop() || 'file';
        enriched.push({ ...asset, type, content: text });
      } catch (err) {
        enriched.push({ ...asset, type: 'error', content: `Failed to load asset: ${err.message}` });
      }
    }
    return enriched;
  }

  async function getBlockDetail(blockId) {
    const block = state.blocks.find((b) => b.id === blockId);
    if (!block) return null;
    const markup = formatHtmlSnippet(block.element);
    const assets = await getBlockAssets(block.name);
    return { block, markup, assets };
  }

  function attachGlobalListeners() {
    window.addEventListener('scroll', refreshOverlayPositions, true);
    window.addEventListener('resize', refreshOverlayPositions, true);
    const resizeObserver = new ResizeObserver(() => refreshOverlayPositions());
    resizeObserver.observe(document.documentElement);
  }

  async function init() {
    console.log('[EDS Inspector Content] init() called');
    try {
      attachGlobalListeners();
      console.log('[EDS Inspector Content] Global listeners attached');
      await resolveConfig();
      console.log('[EDS Inspector Content] Config resolved');
      await analyzePage();
      console.log('[EDS Inspector Content] Page analyzed');
      await loadCodeAndMedia();
      console.log('[EDS Inspector Content] Code and media loaded');
      const state = serializeState();
      console.log('[EDS Inspector Content] State serialized:', state);
      return state;
    } catch (err) {
      console.error('[EDS Inspector Content] Error in init():', err);
      throw err;
    }
  }

  // メッセージリスナーを設定（既に実行されている場合でも）
  if (!window.__edsInspectorMessageListenerAttached) {
    window.__edsInspectorMessageListenerAttached = true;
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('[EDS Inspector Content] Message received:', message);
      if (message?.target !== 'eds-content') {
        console.log('[EDS Inspector Content] Message target mismatch, ignoring');
        return;
      }
      (async () => {
        try {
          switch (message.type) {
            case 'init': {
              console.log('[EDS Inspector Content] Initializing...');
              // 既に実行されている場合でも、初期化を再実行できるようにする
              if (window.__edsInspectorInitialized) {
                console.log('[EDS Inspector Content] Re-initializing...');
                // 既存のオーバーレイを削除
                destroy();
                // 状態をリセット
                state.overlays = [];
                state.sections = [];
                state.blocks = [];
              }
              const snapshot = await init();
              console.log('[EDS Inspector Content] Initialization complete:', snapshot);
              sendResponse(snapshot);
              break;
            }
          case 'reanalyze': {
            const snapshot = await analyzePage();
            sendResponse(serializeState());
            break;
          }
          case 'toggle-overlay': {
            state.overlaysEnabled[message.payload.key] = message.payload.value;
            state.overlays.forEach((overlay) => {
              if (message.payload.key === 'sections' && overlay.item.id.startsWith('section-')) overlay.visible = message.payload.value;
              if (message.payload.key === 'blocks' && overlay.item.id.startsWith('block-')) overlay.visible = message.payload.value;
            });
            refreshOverlayPositions();
            sendResponse(serializeState());
            break;
          }
          case 'toggle-overlays': {
            toggleOverlays();
            sendResponse({ ok: true, visible: state.overlaysVisible });
            break;
          }
          case 'destroy': {
            destroy();
            sendResponse(serializeState());
            break;
          }
          case 'highlight': {
            setHighlight(message.payload.id);
            sendResponse({ ok: true });
            break;
          }
          case 'select-block': {
            state.selectedBlockId = message.payload.id;
            sendResponse({ ok: true });
            break;
          }
          case 'state': {
            sendResponse(serializeState());
            break;
          }
          case 'get-block-detail': {
            const detail = await getBlockDetail(message.payload.id);
            sendResponse(detail);
            break;
          }
          case 'show-devtools-prompt': {
            showDevToolsPrompt();
            sendResponse({ ok: true });
            break;
          }
          default:
            console.warn('[EDS Inspector Content] Unknown message type:', message.type);
            sendResponse({ ok: false, reason: 'unknown-message' });
        }
      } catch (err) {
        console.error('[EDS Inspector Content] Error handling message:', err);
        sendResponse({ ok: false, error: err.message });
      }
    })();
    return true;
  });
    console.log('[EDS Inspector Content] Message listener attached');
  } else {
    console.log('[EDS Inspector Content] Message listener already attached, skipping');
  }
  
  console.log('[EDS Inspector Content] Script loaded and message listener attached');
})();
