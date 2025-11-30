/**
 * ページ分析のメインロジック
 */
import { state } from './state.js';
import { resolveConfig, parseSSRDocument } from './utils/config.js';
import { collectBlockResourceNames, collectIconNames } from './collectors/resources.js';
import { collectJsonFiles } from './collectors/json.js';
import { collectScriptFiles } from './collectors/scripts.js';
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
  
  // JSONファイルを収集
  console.log('[EDS Inspector Content] About to collect JSON files...');
  state.jsonFiles = collectJsonFiles();
  console.log('[EDS Inspector Content] JSON files collected:', state.jsonFiles ? state.jsonFiles.size : 0);
  
  // JSファイルを収集（/blocks/*.js以外）
  console.log('[EDS Inspector Content] About to collect script files...');
  state.scriptFiles = collectScriptFiles();
  console.log('[EDS Inspector Content] Script files collected:', state.scriptFiles ? state.scriptFiles.size : 0);
  if (state.scriptFiles && state.scriptFiles.size > 0) {
    console.log('[EDS Inspector Content] Script files:', Array.from(state.scriptFiles.values()).map(f => f.url));
  }
  
  // Media Busファイルも検出
  await loadCodeAndMedia();
  
  buildOverlays();
  // オーバーレイを構築した直後に位置を更新（同期的に）
  refreshOverlayPositions();
  
  // 解析済みフラグを設定
  state.isAnalyzed = true;
  
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
    
    // 既に解析済みの場合はスキップ
    if (state.isAnalyzed) {
      console.log('[EDS Inspector Content] Already analyzed, skipping analyzePage()');
    } else {
      await analyzePage();
      console.log('[EDS Inspector Content] Page analyzed');
    }
    
    // loadCodeAndMediaは既にanalyzePage内で呼ばれているが、
    // 解析済みの場合でも再実行する（コードやメディアが更新されている可能性がある）
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

