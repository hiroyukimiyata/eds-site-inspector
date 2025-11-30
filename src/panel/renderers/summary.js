/**
 * Summaryタブのレンダラー
 */

/**
 * Summaryタブをレンダリング
 */
export function renderSummary(state) {
  const root = document.querySelector('[data-tab-panel="summary"]');
  root.innerHTML = '';

  const container = document.createElement('div');
  container.style.cssText = 'padding: 16px;';

  // サマリー情報を表示
  const summaryList = document.createElement('dl');
  summaryList.style.cssText = 'margin: 0; padding: 0;';

  // Sections
  const dtSections = document.createElement('dt');
  dtSections.textContent = 'Sections';
  dtSections.style.cssText = 'font-weight: 600; color: var(--text); margin-top: 12px; margin-bottom: 4px;';
  const ddSections = document.createElement('dd');
  ddSections.textContent = `${state.sections.length}`;
  ddSections.style.cssText = 'margin: 0 0 8px 0; color: var(--muted); font-size: 14px;';
  summaryList.appendChild(dtSections);
  summaryList.appendChild(ddSections);

  // Blocks
  const dtBlocks = document.createElement('dt');
  dtBlocks.textContent = 'Blocks';
  dtBlocks.style.cssText = 'font-weight: 600; color: var(--text); margin-top: 12px; margin-bottom: 4px;';
  const ddBlocks = document.createElement('dd');
  ddBlocks.textContent = `${state.blocks.length}`;
  ddBlocks.style.cssText = 'margin: 0 0 8px 0; color: var(--muted); font-size: 14px;';
  summaryList.appendChild(dtBlocks);
  summaryList.appendChild(ddBlocks);

  // Icons
  const dtIcons = document.createElement('dt');
  dtIcons.textContent = 'Icons';
  dtIcons.style.cssText = 'font-weight: 600; color: var(--text); margin-top: 12px; margin-bottom: 4px;';
  const ddIcons = document.createElement('dd');
  ddIcons.textContent = `${state.icons ? state.icons.length : 0}`;
  ddIcons.style.cssText = 'margin: 0 0 8px 0; color: var(--muted); font-size: 14px;';
  summaryList.appendChild(dtIcons);
  summaryList.appendChild(ddIcons);

  // Code files
  const dtCode = document.createElement('dt');
  dtCode.textContent = 'Code Files';
  dtCode.style.cssText = 'font-weight: 600; color: var(--text); margin-top: 12px; margin-bottom: 4px;';
  const ddCode = document.createElement('dd');
  const codeCount = state.codeTree ? countFiles(state.codeTree) : 0;
  ddCode.textContent = `${codeCount}`;
  ddCode.style.cssText = 'margin: 0 0 8px 0; color: var(--muted); font-size: 14px;';
  summaryList.appendChild(dtCode);
  summaryList.appendChild(ddCode);

  // Media files
  const dtMedia = document.createElement('dt');
  dtMedia.textContent = 'Media Files';
  dtMedia.style.cssText = 'font-weight: 600; color: var(--text); margin-top: 12px; margin-bottom: 4px;';
  const ddMedia = document.createElement('dd');
  const mediaCount = state.mediaFiles ? state.mediaFiles.length : 0;
  ddMedia.textContent = `${mediaCount}`;
  ddMedia.style.cssText = 'margin: 0 0 8px 0; color: var(--muted); font-size: 14px;';
  summaryList.appendChild(dtMedia);
  summaryList.appendChild(ddMedia);

  container.appendChild(summaryList);
  root.appendChild(container);
}

/**
 * コードツリー内のファイル数をカウント
 */
function countFiles(node) {
  let count = 0;
  if (node.type === 'file') {
    count = 1;
  } else if (node.children) {
    for (const child of node.children) {
      count += countFiles(child);
    }
  }
  return count;
}


