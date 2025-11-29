/**
 * Iconsタブのレンダラー
 */

/**
 * Iconsタブをレンダリング
 */
export function renderIcons(state) {
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

