/**
 * ページ分析のメインロジック
 */
import { state } from './state.js';
import { resolveConfig, parseSSRDocument } from './utils/config.js';
import { collectBlockResourceNames, collectIconNames } from './collectors/resources.js';
import { detectSections } from './detectors/sections.js';
import { detectBlocks } from './detectors/blocks.js';
import { detectIcons } from './detectors/icons.js';
import { buildOverlays } from './overlay/builder.js';
import { refreshOverlayPositions } from './overlay/manager.js';
import { loadCodeAndMedia } from './api/code-media.js';
import { notifyStateChanged } from './message-handler.js';

/**
 * ページを分析
 */
export async function analyzePage() {
  const mainLive = document.querySelector('main');
  if (!mainLive) {
    throw new Error('EDS Inspector: <main> element not found.');
  }
  const ssrDoc = (state.ssrDocument = (await parseSSRDocument()) || document);
  const mainSSR = ssrDoc.querySelector('main') || document.querySelector('main');
  const blockResources = collectBlockResourceNames();
  const iconResources = collectIconNames();

  state.sections = detectSections(mainSSR, mainLive);
  state.blocks = detectBlocks(mainSSR, mainLive, blockResources);
  state.icons = await detectIcons(mainSSR, mainLive, iconResources);
  
  // Media Busファイルも検出
  await loadCodeAndMedia();
  
  buildOverlays();
  // オーバーレイを構築した直後に位置を更新（同期的に）
  refreshOverlayPositions();
  
  // 状態が変更されたことをpanelに通知
  notifyStateChanged();
}

/**
 * 初期化
 */
export async function init() {
  console.log('[EDS Inspector Content] init() called');
  try {
    await resolveConfig();
    console.log('[EDS Inspector Content] Config resolved');
    await analyzePage();
    console.log('[EDS Inspector Content] Page analyzed');
    await loadCodeAndMedia();
    console.log('[EDS Inspector Content] Code and media loaded');
    
    const serializedState = serializeState();
    console.log('[EDS Inspector Content] State serialized:', serializedState);
    return serializedState;
  } catch (err) {
    console.error('[EDS Inspector Content] Error in init():', err);
    throw err;
  }
}

// 循環参照を避けるため、serializeStateを後でインポート
import { serializeState } from './utils/serializer.js';

