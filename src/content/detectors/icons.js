/**
 * アイコン検出ロジック
 */

/**
 * アイコンを検出
 */
export async function detectIcons(mainSSR, mainLive, iconResources) {
  const icons = [];
  const seenElements = new Set();
  const seenIconNames = new Set();
  
  // ネットワークリクエストから検出したアイコン名を優先的に使用
  await detectIconsFromResources(mainLive, iconResources, icons, seenElements, seenIconNames);
  
  // ネットワークリクエストに存在しないアイコンも検出（DOMから直接）
  detectIconsFromDOM(mainLive, icons, seenElements, seenIconNames);
  
  // 重複を削除（同じname）
  const uniqueIcons = [];
  const seenKeys = new Set();
  icons.forEach((icon) => {
    const key = icon.name;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueIcons.push(icon);
    }
  });
  
  console.log('[EDS Inspector] Detected icons:', uniqueIcons.map(i => ({ name: i.name, url: i.url })));
  
  return uniqueIcons;
}

/**
 * ネットワークリクエストからアイコンを検出
 */
async function detectIconsFromResources(mainLive, iconResources, icons, seenElements, seenIconNames) {
  for (const [iconName, iconUrl] of iconResources.entries()) {
    // Live DOMでアイコン要素を検索
    // アイコンは通常 <span class="icon icon-{name}"> または <span class="icon-{name}"> の形式
    const selectors = [
      `span.icon-${CSS.escape(iconName)}`,
      `span.icon.icon-${CSS.escape(iconName)}`,
      `span[class*="icon-${CSS.escape(iconName)}"]`,
    ];
    
    let found = false;
    for (const selector of selectors) {
      try {
        const liveIcons = mainLive.querySelectorAll(selector);
        for (const liveIcon of liveIcons) {
          if (seenElements.has(liveIcon)) continue;
          seenElements.add(liveIcon);
          found = true;
          
          const classes = liveIcon.className || '';
          // アイコン名は icon-{name} の形式（例: icon-arrow）
          const iconClassName = `icon-${iconName}`;
          
          // SVGの内容を取得（DOM要素から）
          let svgContent = await getIconSvg(liveIcon, iconUrl);
          
          icons.push({
            id: `icon-${icons.length}`,
            element: liveIcon,
            name: iconClassName,
            classes: classes,
            svg: svgContent,
            url: iconUrl,
          });
        }
      } catch (e) {
        console.warn('[EDS Inspector] Error querying for icon:', iconName, e);
      }
    }
    
    // DOM要素が見つからない場合でも、ネットワークリクエストから検出したアイコンを追加
    if (!found && !seenIconNames.has(iconName)) {
      seenIconNames.add(iconName);
      
      // SVGをネットワークリクエストのURLから取得
      const svgContent = await fetchIconSvg(iconUrl);
      
      icons.push({
        id: `icon-${icons.length}`,
        element: null,
        name: `icon-${iconName}`,
        classes: '',
        svg: svgContent,
        url: iconUrl,
      });
    }
  }
}

/**
 * DOMから直接アイコンを検出
 */
function detectIconsFromDOM(mainLive, icons, seenElements, seenIconNames) {
  const iconSelectors = [
    'span.icon',
    'span[class*="icon-"]',
  ];
  
  for (const selector of iconSelectors) {
    const liveIcons = mainLive.querySelectorAll(selector);
    for (const liveIcon of liveIcons) {
      if (seenElements.has(liveIcon)) continue;
      seenElements.add(liveIcon);
      
      // アイコン名を取得（クラス名から）
      const classes = liveIcon.className || '';
      // icon-で始まるクラス名を探す
      const iconClass = classes.split(' ').find(cls => cls.startsWith('icon-'));
      // アイコン名は完全なクラス名（例: icon-arrow）
      const iconName = iconClass || (classes.includes('icon') ? 'icon' : 'icon');
      
      // 既に検出済みのアイコン名はスキップ
      if (seenIconNames.has(iconName.replace('icon-', ''))) continue;
      
      // SVGの内容を取得
      const svg = liveIcon.querySelector('svg');
      let svgContent = '';
      if (svg) {
        // SVGをクローンして、サイズ属性を追加
        const svgClone = svg.cloneNode(true);
        svgClone.setAttribute('width', '48');
        svgClone.setAttribute('height', '48');
        svgClone.style.width = '48px';
        svgClone.style.height = '48px';
        svgContent = svgClone.outerHTML;
      }
      
      icons.push({
        id: `icon-${icons.length}`,
        element: liveIcon,
        name: iconName,
        classes: classes,
        svg: svgContent,
        url: null,
      });
    }
  }
}

/**
 * アイコンのSVGを取得（DOM要素から）
 */
async function getIconSvg(liveIcon, fallbackUrl) {
  const svg = liveIcon.querySelector('svg');
  if (svg) {
    // SVGをクローンして、サイズ属性を追加
    const svgClone = svg.cloneNode(true);
    svgClone.setAttribute('width', '48');
    svgClone.setAttribute('height', '48');
    svgClone.style.width = '48px';
    svgClone.style.height = '48px';
    return svgClone.outerHTML;
  } else {
    // DOM要素にSVGがない場合は、ネットワークリクエストのURLから取得を試みる
    return await fetchIconSvg(fallbackUrl);
  }
}

/**
 * アイコンのSVGをURLから取得
 */
async function fetchIconSvg(iconUrl) {
  if (!iconUrl) return '';
  
  try {
    const response = await fetch(iconUrl);
    if (response.ok) {
      const svgText = await response.text();
      // SVGテキストをパースして、サイズ属性を追加
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
      const svgElement = svgDoc.querySelector('svg');
      if (svgElement) {
        svgElement.setAttribute('width', '48');
        svgElement.setAttribute('height', '48');
        svgElement.style.width = '48px';
        svgElement.style.height = '48px';
        return svgElement.outerHTML;
      }
    }
  } catch (e) {
    console.warn('[EDS Inspector] Failed to fetch icon SVG:', iconUrl, e);
  }
  return '';
}

