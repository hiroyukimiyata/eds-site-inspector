import { sendToContent, ensureContentInjected, escapeHtml, highlightCode } from './panel/utils.js';
import { renderDocs } from './panel/renderers/docs.js';

const tabId = chrome.devtools.inspectedWindow.tabId;
console.log('[EDS Inspector Panel] Tab ID:', tabId);

// sendToContentとensureContentInjectedをラップ（tabIdを自動的に渡す）
const sendToContentWithTabId = (type, payload) => sendToContent(tabId, type, payload);
const ensureContentInjectedWithTabId = () => ensureContentInjected(tabId);

function switchTab(tab) {
  document.querySelectorAll('.eds-tabs button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  document.querySelectorAll('[data-tab-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.tabPanel !== tab;
  });
  
  // Docsタブが選択されたときだけrenderDocsを呼ぶ
  if (tab === 'docs') {
    renderDocs(tabId);
  }
}

function bindTabs() {
  document.querySelectorAll('.eds-tabs button').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

function renderControl(state, refresh) {
  const root = document.querySelector('[data-tab-panel="control"]');
  root.innerHTML = '';

  const status = document.createElement('div');
  status.className = 'eds-status';
  status.innerHTML = `<span class="eds-status__dot"></span> ${state.sections.length} sections · ${state.blocks.length} blocks`;
  root.appendChild(status);

  const toggleSections = document.createElement('label');
  toggleSections.className = 'eds-toggle';
  toggleSections.innerHTML = `<input type="checkbox" ${state.overlaysEnabled.sections ? 'checked' : ''}/> Sections overlay`;
  toggleSections.querySelector('input').addEventListener('change', async (evt) => {
    try {
      await sendToContentWithTabId('toggle-overlay', { key: 'sections', value: evt.target.checked });
    } finally {
      refresh();
    }
  });

  const toggleBlocks = document.createElement('label');
  toggleBlocks.className = 'eds-toggle';
  toggleBlocks.innerHTML = `<input type="checkbox" ${state.overlaysEnabled.blocks ? 'checked' : ''}/> Blocks overlay`;
  toggleBlocks.querySelector('input').addEventListener('change', async (evt) => {
    try {
      await sendToContentWithTabId('toggle-overlay', { key: 'blocks', value: evt.target.checked });
    } finally {
      refresh();
    }
  });

  const actions = document.createElement('div');
  actions.className = 'eds-actions';
  const reanalyze = document.createElement('button');
  reanalyze.className = 'eds-button eds-button--primary';
  reanalyze.textContent = 'Re-run analysis';
  reanalyze.addEventListener('click', async () => {
    reanalyze.disabled = true;
    try {
      await sendToContentWithTabId('reanalyze');
      await refresh();
    } finally {
      reanalyze.disabled = false;
    }
  });

  const hide = document.createElement('button');
  hide.className = 'eds-button';
  hide.textContent = 'Remove overlays';
  hide.addEventListener('click', async () => {
    try {
      await sendToContentWithTabId('destroy');
    } finally {
      await refresh();
    }
  });

  actions.append(reanalyze, hide);
  root.append(toggleSections, toggleBlocks, actions);

  const hint = document.createElement('p');
  hint.className = 'eds-hint';
  hint.textContent = 'Detection relies on SSR markup; overlays follow live DOM updates on scroll/resize.';
  root.appendChild(hint);
}

function renderBlocks(state, refresh) {
  const root = document.querySelector('[data-tab-panel="blocks"]');
  root.innerHTML = '';
  if (!state.blocks.length) {
    root.innerHTML = '<p class="eds-empty">No blocks detected inside <main>.</p>';
    return;
  }

  // カテゴリごとにグループ化
  const blocksByCategory = {};
  state.blocks.forEach((block) => {
    const category = block.category || 'block';
    if (!blocksByCategory[category]) {
      blocksByCategory[category] = [];
    }
    blocksByCategory[category].push(block);
  });

  // カテゴリの順序を定義
  const categoryOrder = ['block', 'heading', 'text', 'image', 'list', 'code', 'table', 'quote', 'media', 'button', 'icon'];
  
  categoryOrder.forEach((category) => {
    if (!blocksByCategory[category] || blocksByCategory[category].length === 0) return;
    
    const categoryTitle = document.createElement('h3');
    categoryTitle.className = 'eds-category-title';
    categoryTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1);
    root.appendChild(categoryTitle);
    
    const list = document.createElement('ul');
    list.className = 'eds-block-list';
    
    blocksByCategory[category].forEach((block) => {
      const li = document.createElement('li');
      li.className = 'eds-block-item';
      if (state.selectedBlock === block.id) {
        li.classList.add('is-selected');
      }
      
      const nameSpan = document.createElement('span');
      nameSpan.textContent = block.name;
      nameSpan.className = 'eds-block-name';
      
      // ブロック数が1より大きい場合は表示
      if (block.count && block.count > 1) {
        const countSpan = document.createElement('span');
        countSpan.className = 'eds-block-count';
        countSpan.textContent = ` (${block.count})`;
        countSpan.style.cssText = 'color: var(--muted); font-size: 11px; margin-left: 4px;';
        nameSpan.appendChild(countSpan);
      }
      
      const tagSpan = document.createElement('span');
      tagSpan.textContent = block.tagName;
      tagSpan.className = 'eds-block-list__tag';
      
      li.appendChild(nameSpan);
      li.appendChild(tagSpan);
      
      li.addEventListener('mouseenter', () => sendToContentWithTabId('highlight', { id: block.id }));
      li.addEventListener('mouseleave', () => sendToContentWithTabId('highlight', { id: null }));
      li.addEventListener('click', async () => {
        // 他の選択を解除
        document.querySelectorAll('.eds-block-item').forEach((item) => {
          item.classList.remove('is-selected');
        });
        // 選択状態を追加
        li.classList.add('is-selected');
        
        await sendToContentWithTabId('select-block', { id: block.id });
        const detail = await sendToContentWithTabId('get-block-detail', { id: block.id });
        renderBlockDetail(state, detail, refresh);
      });
      
      list.appendChild(li);
    });
    
    root.appendChild(list);
  });
}

function renderCodeTree(node, parent, basePath) {
  const li = document.createElement('li');
  li.textContent = node.name;
  if (node.children && node.children.length) {
    li.classList.add('has-children');
    const ul = document.createElement('ul');
    node.children.forEach((child) => renderCodeTree(child, ul, basePath));
    li.appendChild(ul);
  }
  if (node.path) {
    li.title = node.path;
    li.addEventListener('click', (evt) => {
      evt.stopPropagation();
      window.open(`${basePath}${node.path}`, '_blank');
    });
  }
  parent.appendChild(li);
}

function renderCode(state) {
  const root = document.querySelector('[data-tab-panel="code"]');
  root.innerHTML = '';
  if (!state.codeBasePath) {
    root.innerHTML = '<p class="eds-empty">Code Bus path could not be determined.</p>';
    return;
  }
  if (!state.codeTree) {
    root.innerHTML = '<p class="eds-loading">Loading Code Bus…</p>';
    return;
  }
  const tree = document.createElement('ul');
  tree.className = 'eds-tree';
  renderCodeTree(state.codeTree, tree, state.codeBasePath);
  root.appendChild(tree);
}

function renderIcons(state) {
  const root = document.querySelector('[data-tab-panel="icons"]');
  root.innerHTML = '';
  if (!state.icons || !state.icons.length) {
    root.innerHTML = '<p class="eds-empty">No icons found on this page.</p>';
    return;
  }
  const grid = document.createElement('div');
  grid.className = 'eds-icon-grid';
  
  state.icons.forEach((icon) => {
    const card = document.createElement('div');
    card.className = 'eds-icon-card';
    
    // クリック時にURLを開く
    if (icon.url) {
      card.addEventListener('click', () => {
        window.open(icon.url, '_blank');
      });
    }
    
    const preview = document.createElement('div');
    preview.className = 'eds-icon-preview';
    if (icon.svg) {
      preview.innerHTML = icon.svg;
    } else {
      preview.textContent = '📦';
      preview.style.fontSize = '48px';
    }
    
    const name = document.createElement('div');
    name.className = 'eds-icon-name';
    name.textContent = icon.name;
    
    card.appendChild(preview);
    card.appendChild(name);
    grid.appendChild(card);
  });
  
  root.appendChild(grid);
}

function renderMedia(state) {
  const root = document.querySelector('[data-tab-panel="media"]');
  root.innerHTML = '';
  if (!state.mediaFiles) {
    root.innerHTML = '<p class="eds-loading">Loading Media Bus…</p>';
    return;
  }
  if (!state.mediaFiles.length) {
    root.innerHTML = '<p class="eds-empty">No media_ files found.</p>';
    return;
  }
  const grid = document.createElement('div');
  grid.className = 'eds-media-grid';
  
  state.mediaFiles.forEach((file) => {
    const card = document.createElement('div');
    card.className = 'eds-media-card';
    
    // クリック時にURLを開く
    if (file.url) {
      card.addEventListener('click', () => {
        window.open(file.url, '_blank');
      });
    }
    
    const preview = document.createElement('div');
    preview.className = 'eds-media-preview';
    
    if (file.isVideo) {
      // 動画の場合はビデオアイコンを表示
      preview.innerHTML = `
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 5V19L19 12L8 5Z" fill="#94a3b8"/>
        </svg>
      `;
    } else if (file.isImage && file.url) {
      // 画像の場合はプレビューを表示
      const img = document.createElement('img');
      img.src = file.url;
      img.style.cssText = 'max-width: 100%; max-height: 120px; object-fit: contain;';
      img.onerror = () => {
        preview.innerHTML = '📷';
        preview.style.fontSize = '48px';
      };
      preview.appendChild(img);
    } else {
      // その他の場合はファイルアイコンを表示
      preview.innerHTML = '📄';
      preview.style.fontSize = '48px';
    }
    
    const name = document.createElement('div');
    name.className = 'eds-media-name';
    name.textContent = file.fileName || file.path.split('/').pop();
    
    card.appendChild(preview);
    card.appendChild(name);
    grid.appendChild(card);
  });
  
  root.appendChild(grid);
}

// 古いMarkdown関数は削除（utils/markdown.jsとpanel/renderers/docs.jsに移動済み）

async function renderBlockDetail(state, detail, refresh) {
  const root = document.querySelector('[data-tab-panel="blocks"]');
  if (!detail || !detail.block) {
    return;
  }
  
  // 現在の開閉状態を保存
  const expandedPaths = new Set();
  const existingItems = root.querySelectorAll('.eds-asset-item.is-expanded');
  existingItems.forEach(item => {
    const path = item.querySelector('.eds-file-card__path')?.textContent;
    if (path) {
      expandedPaths.add(path);
    }
  });
  
  // 一覧に戻るボタンを作成
  const backButton = document.createElement('button');
  backButton.className = 'eds-back-button';
  backButton.textContent = '← Back to Blocks List';
  backButton.addEventListener('click', async () => {
      await sendToContentWithTabId('select-block', { id: null });
    if (refresh) {
      refresh();
    } else {
      hydratePanels();
    }
  });
  
  // 既存の内容をクリア
  root.innerHTML = '';
  root.appendChild(backButton);
  
  // Source表示の内容を追加
  const meta = document.createElement('div');
  meta.className = 'eds-meta';
  meta.innerHTML = `
    <div><strong>Name:</strong> ${detail.block.name}</div>
    <div><strong>Tag:</strong> ${detail.block.tagName}</div>
    <div><strong>Classes:</strong> ${detail.block.classes || '(none)'}</div>
    <div><strong>Detected via:</strong> <span class="eds-inline-code">/blocks/${detail.block.name}</span></div>
  `;

  root.appendChild(meta);

  // 同じ名前のブロックを取得（content scriptからすべて取得）
  const blocksWithSameName = await sendToContentWithTabId('get-blocks-by-name', { name: detail.block.name });
  const currentBlockIndex = blocksWithSameName.findIndex(b => b.id === detail.block.id);
  const hasMultipleBlocks = blocksWithSameName.length > 1;

  // Markupをassetsリストの先頭に追加
  const allAssets = [];
  const markupContent = detail.markup || 'No markup captured for this block.';
  if (markupContent !== 'No markup captured for this block.') {
    allAssets.push({
      path: 'Markup',
      type: 'html',
      content: markupContent,
      isMarkup: true
    });
  }
  
  if (detail.assets && detail.assets.length) {
    allAssets.push(...detail.assets);
  }

  if (allAssets.length > 0) {
    // 全て開く/閉じるボタン
    const controls = document.createElement('div');
    controls.className = 'eds-asset-controls';
    controls.style.cssText = 'display: flex; gap: 8px; margin-bottom: 16px;';
    
    const expandAllBtn = document.createElement('button');
    expandAllBtn.className = 'eds-button';
    expandAllBtn.textContent = 'Expand All';
    expandAllBtn.addEventListener('click', () => {
      document.querySelectorAll('.eds-asset-item').forEach(item => {
        item.classList.add('is-expanded');
      });
    });
    
    const collapseAllBtn = document.createElement('button');
    collapseAllBtn.className = 'eds-button';
    collapseAllBtn.textContent = 'Collapse All';
    collapseAllBtn.addEventListener('click', () => {
      document.querySelectorAll('.eds-asset-item').forEach(item => {
        item.classList.remove('is-expanded');
      });
    });
    
    controls.appendChild(expandAllBtn);
    controls.appendChild(collapseAllBtn);
    root.appendChild(controls);
    
    const list = document.createElement('ul');
    list.className = 'eds-file-list';
    allAssets.forEach((asset) => {
      const li = document.createElement('li');
      li.className = 'eds-asset-item';
      
      const header = document.createElement('div');
      header.className = 'eds-asset-header';
      header.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: var(--bg-muted); border: 1px solid var(--border); border-radius: 8px; margin-bottom: 8px;';
      
      const toggle = document.createElement('span');
      toggle.className = 'eds-asset-toggle';
      toggle.textContent = '▶';
      toggle.style.cssText = 'font-size: 10px; color: var(--muted); transition: transform 0.2s; cursor: pointer;';
      
      const titleWrapper = document.createElement('div');
      titleWrapper.style.cssText = 'display: flex; align-items: center; gap: 8px; flex: 1;';
      
      const title = document.createElement('div');
      title.className = 'eds-file-card__path';
      title.textContent = asset.path;
      title.style.flex = '1';
      title.style.cursor = 'pointer';
      
      // Markupの場合のみ、前/次のブロック切り替えボタンを追加（常に表示、複数ある場合のみ有効化）
      if (asset.isMarkup) {
        const navWrapper = document.createElement('div');
        navWrapper.className = 'eds-markup-nav';
        navWrapper.style.cssText = 'display: flex; align-items: center; gap: 4px;';
        
        const prevBtn = document.createElement('button');
        prevBtn.className = 'eds-nav-button';
        prevBtn.innerHTML = '◀';
        prevBtn.title = 'Previous block';
        prevBtn.disabled = !hasMultipleBlocks || currentBlockIndex === 0;
        prevBtn.style.cssText = 'background: transparent; border: 1px solid var(--border); border-radius: 4px; cursor: pointer; padding: 4px 8px; font-size: 12px; color: var(--text); transition: all 0.2s;';
        prevBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (currentBlockIndex > 0) {
            const prevBlock = blocksWithSameName[currentBlockIndex - 1];
            await sendToContentWithTabId('select-block', { id: prevBlock.id });
            await sendToContentWithTabId('scroll-to-block', { id: prevBlock.id });
            await sendToContentWithTabId('highlight', { id: prevBlock.id });
            const prevDetail = await sendToContentWithTabId('get-block-detail', { id: prevBlock.id });
            renderBlockDetail(state, prevDetail, refresh);
          }
        });
        
        const navInfo = document.createElement('span');
        navInfo.className = 'eds-nav-info';
        navInfo.textContent = `${currentBlockIndex + 1} / ${blocksWithSameName.length}`;
        navInfo.style.cssText = 'font-size: 11px; color: var(--muted); padding: 0 4px;';
        
        const nextBtn = document.createElement('button');
        nextBtn.className = 'eds-nav-button';
        nextBtn.innerHTML = '▶';
        nextBtn.title = 'Next block';
        nextBtn.disabled = !hasMultipleBlocks || currentBlockIndex === blocksWithSameName.length - 1;
        nextBtn.style.cssText = 'background: transparent; border: 1px solid var(--border); border-radius: 4px; cursor: pointer; padding: 4px 8px; font-size: 12px; color: var(--text); transition: all 0.2s;';
        nextBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (currentBlockIndex < blocksWithSameName.length - 1) {
            const nextBlock = blocksWithSameName[currentBlockIndex + 1];
            await sendToContentWithTabId('select-block', { id: nextBlock.id });
            await sendToContentWithTabId('scroll-to-block', { id: nextBlock.id });
            await sendToContentWithTabId('highlight', { id: nextBlock.id });
            const nextDetail = await sendToContentWithTabId('get-block-detail', { id: nextBlock.id });
            renderBlockDetail(state, nextDetail, refresh);
          }
        });
        
        navWrapper.appendChild(prevBtn);
        navWrapper.appendChild(navInfo);
        navWrapper.appendChild(nextBtn);
        titleWrapper.appendChild(title);
        titleWrapper.appendChild(navWrapper);
      } else {
        titleWrapper.appendChild(title);
      }
      
      const pill = document.createElement('span');
      pill.className = 'eds-pill';
      pill.textContent = asset.type;
      
      // コピーボタンを追加
      const copyBtn = document.createElement('button');
      copyBtn.className = 'eds-copy-button';
      copyBtn.innerHTML = '📋';
      copyBtn.title = 'Copy to clipboard';
      copyBtn.style.cssText = 'background: transparent; border: none; cursor: pointer; padding: 4px 8px; font-size: 14px; color: var(--muted); transition: color 0.2s;';
      copyBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const rawContent = asset.content || '(empty file)';
        try {
          await navigator.clipboard.writeText(rawContent);
          copyBtn.innerHTML = '✓';
          copyBtn.style.color = '#86efac';
          setTimeout(() => {
            copyBtn.innerHTML = '📋';
            copyBtn.style.color = 'var(--muted)';
          }, 2000);
        } catch (err) {
          console.error('Failed to copy:', err);
          copyBtn.innerHTML = '✗';
          copyBtn.style.color = '#f87171';
          setTimeout(() => {
            copyBtn.innerHTML = '📋';
            copyBtn.style.color = 'var(--muted)';
          }, 2000);
        }
      });
      
      const content = document.createElement('div');
      content.className = 'eds-asset-content';
      content.style.cssText = 'display: none; margin-top: 8px;';
      
      const code = document.createElement('pre');
      code.className = 'eds-code';
      
      // ファイルタイプに応じてシンタックスハイライトとインデント処理
      const processedCode = processCode(asset.content || '(empty file)', asset.type, asset.path);
      code.innerHTML = processedCode;
      
      content.appendChild(code);
      
      // ヘッダーのクリックで開閉（toggleとtitleをクリック可能に）
      const handleToggle = () => {
        li.classList.toggle('is-expanded');
        const isExpanded = li.classList.contains('is-expanded');
        content.style.display = isExpanded ? 'block' : 'none';
        toggle.textContent = isExpanded ? '▼' : '▶';
      };
      
      toggle.addEventListener('click', handleToggle);
      title.addEventListener('click', handleToggle);
      
      // 保存された開閉状態を復元
      const wasExpanded = expandedPaths.has(asset.path);
      if (wasExpanded) {
        li.classList.add('is-expanded');
        content.style.display = 'block';
        toggle.textContent = '▼';
      }
      
      header.appendChild(toggle);
      header.appendChild(titleWrapper);
      header.appendChild(pill);
      header.appendChild(copyBtn);
      
      li.appendChild(header);
      li.appendChild(content);
      list.appendChild(li);
    });
    root.appendChild(list);
  } else {
    const empty = document.createElement('p');
    empty.className = 'eds-empty';
    empty.textContent = 'No block assets found in network responses.';
    root.appendChild(empty);
  }
}

function processCode(content, type, path) {
  if (!content || content === '(empty file)') {
    return escapeHtml(content);
  }
  
  // ファイルタイプを判定
  const ext = path.split('.').pop().toLowerCase();
  let lang = type.toLowerCase();
  
  if (ext === 'html' || ext === 'htm') lang = 'html';
  else if (ext === 'css') lang = 'css';
  else if (ext === 'js' || ext === 'mjs') lang = 'javascript';
  else if (ext === 'json') lang = 'json';
  else if (ext === 'xml') lang = 'xml';
  
  // HTMLの場合はインデント処理
  if (lang === 'html') {
    content = indentHtml(content);
  }
  
  // シンタックスハイライト
  return highlightCode(content, lang);
}

function indentHtml(html) {
  if (!html || typeof html !== 'string') return html;
  
  // 既に整形されている場合は正規化のみ
  if (html.includes('\n')) {
    const lines = html.split('\n');
    const indentSize = 2;
    let indent = 0;
    const normalized = [];
    
    for (let line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        normalized.push('');
        continue;
      }
      
      // 閉じタグの場合はインデントを減らす
      if (trimmed.match(/^<\/\w+/)) {
        indent = Math.max(0, indent - indentSize);
      }
      
      normalized.push(' '.repeat(indent) + trimmed);
      
      // 開きタグで、自己完結型でない場合はインデントを増やす
      const openTagMatch = trimmed.match(/^<(\w+)([^>]*)>/);
      if (openTagMatch && !trimmed.match(/\/>$/)) {
        const tagName = openTagMatch[1];
        if (!isSelfClosingTag(tagName)) {
          indent += indentSize;
        }
      }
    }
    
    return normalized.join('\n');
  }
  
  // 1行のHTMLの場合は整形を試みる
  try {
    const parser = new DOMParser();
    // HTML全体をラップせずに直接パース
    const doc = parser.parseFromString(html, 'text/html');
    const errorNode = doc.querySelector('parsererror');
    if (errorNode) {
      // パースエラーの場合は元のHTMLを返す
      return html;
    }
    
    // bodyの内容を取得
    const body = doc.body;
    if (body && body.childNodes.length > 0) {
      let formatted = '';
      Array.from(body.childNodes).forEach(node => {
        const nodeFormatted = formatElement(node, 0, 2);
        if (nodeFormatted) {
          formatted += nodeFormatted + '\n';
        }
      });
      return formatted.trim() || html;
    }
    
    return html;
  } catch (e) {
    console.warn('[EDS Inspector] HTML formatting error:', e);
    return html;
  }
}

function formatElement(element, indent, indentSize) {
  if (!element) return '';
  
  if (element.nodeType === Node.TEXT_NODE) {
    const text = element.textContent;
    // 空白のみのテキストノードは無視
    if (!text.trim()) return '';
    return text;
  }
  
  if (element.nodeType === Node.ELEMENT_NODE) {
    const tagName = element.tagName.toLowerCase();
    const indentStr = ' '.repeat(indent);
    const children = Array.from(element.childNodes);
    const hasElementChildren = children.some(child => child.nodeType === Node.ELEMENT_NODE);
    
    // 子要素がない場合
    if (children.length === 0) {
      return `${indentStr}<${tagName}${formatAttributes(element)} />`;
    }
    
    // テキストのみの子要素がある場合
    if (!hasElementChildren) {
      const text = children.map(child => child.textContent).join('').trim();
      if (text) {
        return `${indentStr}<${tagName}${formatAttributes(element)}>${text}</${tagName}>`;
      } else {
        return `${indentStr}<${tagName}${formatAttributes(element)} />`;
      }
    }
    
    // 要素の子要素がある場合
    let result = `${indentStr}<${tagName}${formatAttributes(element)}>\n`;
    children.forEach(child => {
      const formatted = formatElement(child, indent + indentSize, indentSize);
      if (formatted) {
        result += formatted + '\n';
      }
    });
    result += `${indentStr}</${tagName}>`;
    return result;
  }
  
  return '';
}

function formatAttributes(element) {
  if (!element.attributes || element.attributes.length === 0) return '';
  const attrs = Array.from(element.attributes).map(attr => ` ${attr.name}="${attr.value}"`).join('');
  return attrs;
}

function isSelfClosingTag(tagName) {
  const selfClosing = ['img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr'];
  return selfClosing.includes(tagName.toLowerCase());
}

// highlightCodeとescapeHtmlはutils.jsに移動済み

let autoUpdateInterval = null;
let isUpdating = false;

async function hydratePanels() {
  if (isUpdating) {
    console.log('[EDS Inspector Panel] Already updating, skipping...');
    return;
  }
  
  try {
    isUpdating = true;
    console.log('[EDS Inspector Panel] Fetching state from content script...');
    const state = await sendToContentWithTabId('state');
    console.log('[EDS Inspector Panel] State received:', state);
    if (!state) {
      throw new Error('No state received from content script');
    }
    renderControl(state, hydratePanels);
    if (state.selectedBlock) {
      const detail = await sendToContentWithTabId('get-block-detail', { id: state.selectedBlock });
      renderBlockDetail(state, detail, hydratePanels);
    } else {
      renderBlocks(state, hydratePanels);
    }
    renderIcons(state);
    renderCode(state);
    renderMedia(state);
    // renderDocs()はタブ切り替え時のみ呼ぶ（自動更新では呼ばない）
  } catch (err) {
    console.error('[EDS Inspector Panel] Error hydrating panels:', err);
    // エラーメッセージを表示
    const controlPanel = document.querySelector('[data-tab-panel="control"]');
    if (controlPanel) {
      controlPanel.innerHTML = `
        <div class="eds-error" style="padding: 20px; color: #d32f2f;">
          <h3>Error: Failed to communicate with content script</h3>
          <p>${err.message}</p>
          <p>Please make sure:</p>
          <ul>
            <li>The page is fully loaded</li>
            <li>You're on a valid web page (not chrome:// or extension://)</li>
            <li>Try refreshing the page</li>
          </ul>
        </div>
      `;
    }
    throw err;
  } finally {
    isUpdating = false;
  }
}

function startAutoUpdate() {
  // 既存のインターバルをクリア
  if (autoUpdateInterval) {
    clearInterval(autoUpdateInterval);
  }
  
  // 2秒ごとに状態を更新
  autoUpdateInterval = setInterval(async () => {
    try {
      await hydratePanels();
    } catch (err) {
      console.error('[EDS Inspector Panel] Error in auto-update:', err);
    }
  }, 2000);
  
  console.log('[EDS Inspector Panel] Auto-update started');
}

function stopAutoUpdate() {
  if (autoUpdateInterval) {
    clearInterval(autoUpdateInterval);
    autoUpdateInterval = null;
    console.log('[EDS Inspector Panel] Auto-update stopped');
  }
}

async function initializePanel() {
  console.log('[EDS Inspector Panel] Initializing panel...');
  const controlPanel = document.querySelector('[data-tab-panel="control"]');
  
  try {
    // ローディングメッセージを表示
    if (controlPanel) {
      controlPanel.innerHTML = '<div class="eds-loading" style="padding: 20px;">Initializing EDS Site Inspector...</div>';
    }
    
    bindTabs();
    switchTab('control');
    console.log('[EDS Inspector Panel] Ensuring content script is injected...');
    
    try {
      await ensureContentInjectedWithTabId();
      console.log('[EDS Inspector Panel] Content script injection ensured');
    } catch (injectErr) {
      console.error('[EDS Inspector Panel] Failed to inject content script:', injectErr);
      if (controlPanel) {
        const errorMessage = injectErr.message || 'Unknown error';
        const isConnectionError = errorMessage.includes('Could not establish connection') || 
                                  errorMessage.includes('Receiving end does not exist');
        
        controlPanel.innerHTML = `
          <div class="eds-error" style="padding: 20px; color: #d32f2f; line-height: 1.6;">
            <h3 style="margin-top: 0;">Error: Failed to inject content script</h3>
            <p><strong>${errorMessage}</strong></p>
            ${isConnectionError ? `
              <p>This error usually means the extension's service worker is not running.</p>
              <h4>Please try the following steps:</h4>
              <ol style="margin-left: 20px;">
                <li>Go to <code>chrome://extensions/</code></li>
                <li>Find "EDS Site Inspector" extension</li>
                <li>Click the <strong>"Reload"</strong> button (🔄) to restart the service worker</li>
                <li>Click the <strong>"Service worker"</strong> link to verify it's running</li>
                <li>Refresh this page (F5)</li>
                <li>Reopen this DevTools panel</li>
              </ol>
            ` : `
              <p>Please try:</p>
              <ul style="margin-left: 20px;">
                <li>Refreshing the page (F5)</li>
                <li>Reloading the extension from chrome://extensions/</li>
              </ul>
            `}
          </div>
        `;
      }
      // エラーを再スローして、後続の処理を停止
      throw injectErr;
    }
    
    // コンテンツスクリプトがロードされるまで少し待つ
    await new Promise((resolve) => setTimeout(resolve, 200));
    
    try {
      console.log('[EDS Inspector Panel] Sending init message to content script...');
      await sendToContentWithTabId('init');
      console.log('[EDS Inspector Panel] Init message sent successfully');
    } catch (e) {
      console.warn('[EDS Inspector Panel] Init message failed, retrying...', e);
      // if content not ready yet, retry once
      await new Promise((resolve) => setTimeout(resolve, 300));
      try {
        await sendToContentWithTabId('init');
        console.log('[EDS Inspector Panel] Init message sent successfully after retry');
      } catch (retryErr) {
        console.error('[EDS Inspector Panel] Init message failed after retry:', retryErr);
        if (controlPanel) {
          controlPanel.innerHTML = `
            <div class="eds-error" style="padding: 20px; color: #d32f2f;">
              <h3>Error: Failed to initialize content script</h3>
              <p>${retryErr.message}</p>
              <p>The content script may not be loaded. Please try:</p>
              <ul>
                <li>Refreshing the page</li>
                <li>Checking the page console for errors</li>
              </ul>
            </div>
          `;
        }
        throw retryErr;
      }
    }
    
    console.log('[EDS Inspector Panel] Hydrating panels...');
    await hydratePanels();
    console.log('[EDS Inspector Panel] Panel initialization complete');
    
    // 自動更新を開始（2秒ごとに状態を取得してUIを更新）
    startAutoUpdate();
  } catch (err) {
    console.error('[EDS Inspector Panel] Error initializing panel:', err);
    if (controlPanel && !controlPanel.querySelector('.eds-error')) {
      controlPanel.innerHTML = `
        <div class="eds-error" style="padding: 20px; color: #d32f2f;">
          <h3>Error: Failed to initialize panel</h3>
          <p>${err.message}</p>
          <p>Check the console for more details.</p>
        </div>
      `;
    }
  }
}

console.log('[EDS Inspector Panel] Panel script loaded');
window.initializePanel = initializePanel;
