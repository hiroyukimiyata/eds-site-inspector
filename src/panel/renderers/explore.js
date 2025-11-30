/**
 * Exploreタブのレンダラー
 */
import edsSitesData from '../data/eds-sites.json';

/**
 * Exploreタブをレンダリング
 */
export function renderExplore() {
  const root = document.querySelector('[data-tab-panel="explore"]');
  root.innerHTML = '';

  // コンボボックスとボタンを横並びにするコンテナ
  const searchRowContainer = document.createElement('div');
  searchRowContainer.className = 'eds-explore-search-row';
  
  // EDS Site選択用のCombo Boxコンテナ
  const comboBoxContainer = document.createElement('div');
  comboBoxContainer.className = 'eds-explore-combobox';
  
  // 入力フィールド
  const inputContainer = document.createElement('div');
  inputContainer.className = 'eds-explore-input-container';
  
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'eds-explore-input';
  input.placeholder = 'Search EDS sites by title or URL...';
  input.autocomplete = 'off';
  
  const dropdownIcon = document.createElement('span');
  dropdownIcon.className = 'eds-explore-dropdown-icon';
  dropdownIcon.textContent = '▼';
  
  inputContainer.appendChild(input);
  inputContainer.appendChild(dropdownIcon);
  
  // ドロップダウンリスト
  const dropdown = document.createElement('div');
  dropdown.className = 'eds-explore-dropdown';
  dropdown.hidden = true;
  
  comboBoxContainer.appendChild(inputContainer);
  comboBoxContainer.appendChild(dropdown);
  
  // 「このサイトを開く」ボタンコンテナ
  const openSiteButtons = document.createElement('div');
  openSiteButtons.className = 'eds-explore-open-buttons';
  openSiteButtons.style.display = 'none';
  
  const openInCurrentTab = document.createElement('button');
  openInCurrentTab.className = 'eds-explore-open-button';
  openInCurrentTab.textContent = 'Open in this tab';
  openInCurrentTab.addEventListener('click', () => {
    if (selectedSite) {
      openSite(selectedSite.url, 'current');
    }
  });
  
  const openInNewTab = document.createElement('button');
  openInNewTab.className = 'eds-explore-open-button';
  openInNewTab.textContent = 'Open in new tab';
  openInNewTab.addEventListener('click', () => {
    if (selectedSite) {
      openSite(selectedSite.url, 'new');
    }
  });
  
  openSiteButtons.appendChild(openInCurrentTab);
  openSiteButtons.appendChild(openInNewTab);
  
  searchRowContainer.appendChild(comboBoxContainer);
  searchRowContainer.appendChild(openSiteButtons);
  
  // プレビューコンテナ
  const previewContainer = document.createElement('div');
  previewContainer.className = 'eds-explore-preview-container';
  
  const previewLabel = document.createElement('div');
  previewLabel.className = 'eds-explore-preview-label';
  previewLabel.textContent = 'Preview';
  
  const previewFrame = document.createElement('div');
  previewFrame.className = 'eds-explore-preview-frame';
  
  const previewLoading = document.createElement('div');
  previewLoading.className = 'eds-explore-preview-loading';
  previewLoading.style.display = 'none';
  previewLoading.innerHTML = `
    <div class="eds-explore-loading-spinner"></div>
    <div class="eds-explore-loading-text">Loading...</div>
  `;
  
  const previewIframe = document.createElement('iframe');
  previewIframe.className = 'eds-explore-preview-iframe';
  previewIframe.sandbox = 'allow-same-origin allow-scripts allow-forms allow-popups';
  previewIframe.style.display = 'none';
  
  const previewEmpty = document.createElement('div');
  previewEmpty.className = 'eds-explore-preview-empty';
  previewEmpty.textContent = 'Select an EDS site to preview';
  previewEmpty.style.display = 'flex';
  
  previewFrame.appendChild(previewLoading);
  previewFrame.appendChild(previewIframe);
  previewFrame.appendChild(previewEmpty);
  
  previewContainer.appendChild(previewLabel);
  previewContainer.appendChild(previewFrame);
  
  root.appendChild(searchRowContainer);
  root.appendChild(previewContainer);
  
  let selectedSite = null;
  let filteredSites = [...edsSitesData];
  
  /**
   * ドロップダウンを更新
   */
  function updateDropdown() {
    dropdown.innerHTML = '';
    
    if (filteredSites.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'eds-explore-dropdown-item';
      noResults.textContent = 'No sites found';
      noResults.style.color = 'var(--muted)';
      dropdown.appendChild(noResults);
    } else {
      filteredSites.forEach((site) => {
        const item = document.createElement('div');
        item.className = 'eds-explore-dropdown-item';
        item.innerHTML = `
          <div class="eds-explore-dropdown-item-title">${escapeHtml(site.title)}</div>
          <div class="eds-explore-dropdown-item-url">${escapeHtml(site.url)}</div>
        `;
        item.addEventListener('click', () => {
          selectSite(site);
        });
        dropdown.appendChild(item);
      });
    }
  }
  
  /**
   * サイトを選択
   */
  function selectSite(site) {
    selectedSite = site;
    input.value = site.title;
    dropdown.hidden = true;
    loadPreview(site.url);
    // 「このサイトを開く」ボタンを表示
    openSiteButtons.style.display = 'flex';
  }
  
  /**
   * サイトを開く
   */
  function openSite(url, mode) {
    if (mode === 'current') {
      // 現在のタブで開く（DevToolsで検査中のタブ）
      const tabId = chrome.devtools?.inspectedWindow?.tabId;
      if (tabId) {
        chrome.tabs.update(tabId, { url: url });
      } else {
        // フォールバック: アクティブなタブを取得
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs && tabs.length > 0) {
            chrome.tabs.update(tabs[0].id, { url: url });
          }
        });
      }
    } else {
      // 新しいタブで開く
      chrome.tabs.create({ url: url });
    }
  }
  
  /**
   * プレビューをロード
   */
  function loadPreview(url) {
    // 既存のイベントリスナーをクリア
    previewIframe.onload = null;
    previewIframe.onerror = null;
    
    // 状態をリセット
    previewEmpty.style.display = 'none';
    previewIframe.style.display = 'none';
    previewLoading.style.display = 'flex';
    previewFrame.style.cursor = 'default';
    previewFrame.onclick = null;
    
    // タイムアウトを設定（30秒）
    let loadTimeout = setTimeout(() => {
      previewLoading.style.display = 'none';
      previewEmpty.style.display = 'flex';
      previewEmpty.textContent = 'Failed to load preview (timeout)';
      previewIframe.src = '';
    }, 30000);
    
    previewIframe.onload = () => {
      clearTimeout(loadTimeout);
      previewLoading.style.display = 'none';
      previewIframe.style.display = 'block';
      
      // プレビューをクリックしたら別ウインドウで開く
      previewFrame.style.cursor = 'pointer';
      previewFrame.onclick = () => {
        window.open(url, '_blank');
      };
    };
    
    previewIframe.onerror = () => {
      clearTimeout(loadTimeout);
      previewLoading.style.display = 'none';
      previewEmpty.style.display = 'flex';
      previewEmpty.textContent = 'Failed to load preview';
      previewIframe.src = '';
    };
    
    // iframeのsrcを設定（これで読み込みが開始される）
    previewIframe.src = url;
  }
  
  /**
   * HTMLエスケープ
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * フィルタリング
   */
  function filterSites(query) {
    const lowerQuery = query.toLowerCase();
    filteredSites = edsSitesData.filter((site) => {
      return (
        site.title.toLowerCase().includes(lowerQuery) ||
        site.url.toLowerCase().includes(lowerQuery)
      );
    });
    updateDropdown();
  }
  
  // イベントリスナー
  input.addEventListener('focus', () => {
    dropdown.hidden = false;
    updateDropdown();
  });
  
  input.addEventListener('input', (e) => {
    filterSites(e.target.value);
    dropdown.hidden = false;
    
    // 入力が空の場合は選択をクリア
    if (e.target.value === '') {
      selectedSite = null;
      previewEmpty.style.display = 'flex';
      previewIframe.style.display = 'none';
      previewLoading.style.display = 'none';
      previewIframe.src = '';
      previewFrame.style.cursor = 'default';
      previewFrame.onclick = null;
      // 「このサイトを開く」ボタンを非表示
      openSiteButtons.style.display = 'none';
    }
  });
  
  input.addEventListener('blur', () => {
    // 少し遅延させてからドロップダウンを閉じる（クリックイベントが発火するように）
    setTimeout(() => {
      dropdown.hidden = true;
    }, 200);
  });
  
  // 初期状態でドロップダウンを更新
  updateDropdown();
}

