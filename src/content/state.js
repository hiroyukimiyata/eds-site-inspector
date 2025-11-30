/**
 * Content scriptの状態管理
 */
export const state = {
  sections: [],
  blocks: [],
  overlays: [],
  overlaysEnabled: { sections: true, blocks: true, defaultContent: true },
  overlaysVisible: true, // オーバーレイ全体の表示状態
  selectedBlockId: null,
  codeBasePath: null,
  mediaBasePath: null,
  codeTree: null,
  mediaFiles: null,
  ssrDocument: null,
  icons: [], // アイコンの一覧
  jsonFiles: null, // JSONファイルの一覧
  scriptFiles: null, // JSファイルの一覧（/blocks/*.js以外）
  isAnalyzed: false, // 解析済みかどうかのフラグ
};

