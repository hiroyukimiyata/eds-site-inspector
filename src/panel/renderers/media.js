/**
 * Mediaタブのレンダラー
 */

/**
 * Mediaタブをレンダリング
 */
export function renderMedia(state) {
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

