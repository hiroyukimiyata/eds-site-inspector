/**
 * 状態のシリアライズ
 */
import { state } from '../state.js';

/**
 * 状態をシリアライズ
 */
export function serializeState() {
  // デバッグ: jsonFilesの状態を確認
  console.log('[EDS Inspector Serializer] serializeState() called');
  console.log('[EDS Inspector Serializer] state.jsonFiles:', state.jsonFiles);
  if (state.jsonFiles) {
    console.log('[EDS Inspector Serializer] state.jsonFiles.size:', state.jsonFiles.size);
    const jsonArray = Array.from(state.jsonFiles.values());
    console.log('[EDS Inspector Serializer] jsonFiles array:', jsonArray);
  }
  // ブロックをユニークにする（同じ要素を複数回検出しないようにする）
  const seenElements = new Set();
  const allBlocks = [];
  
  state.blocks.forEach((block) => {
    // 要素ベースでユニーク化（同じ要素は1回だけ）
    if (seenElements.has(block.element)) return;
    seenElements.add(block.element);
    
    // すべてのブロックを追加（同じ名前のブロックも複数含める）
    allBlocks.push(block);
  });
  
  // 同じ名前のブロックをグループ化して、1つのエントリとして返す（ブロック数も含める）
  const blocksByName = new Map();
  allBlocks.forEach((block) => {
    const key = block.name;
    if (!blocksByName.has(key)) {
      blocksByName.set(key, {
        blocks: [],
        representative: block // 代表的なブロック（最初に見つかったもの）
      });
    }
    blocksByName.get(key).blocks.push(block);
  });
  
  return {
    sections: state.sections.map((section) => ({ id: section.id, label: section.label })),
    blocks: Array.from(blocksByName.entries()).map(([name, group]) => {
      const rep = group.representative;
      return {
        id: rep.id, // 代表的なブロックのIDを使用
        name: rep.name,
        tagName: rep.tagName,
        classes: rep.classes,
        category: rep.category || 'block',
        count: group.blocks.length // 同じ名前のブロック数
      };
    }),
    icons: state.icons.map((icon) => ({
      id: icon.id,
      name: icon.name,
      classes: icon.classes,
      svg: icon.svg,
      url: icon.url,
    })),
    overlaysEnabled: { ...state.overlaysEnabled },
    selectedBlock: state.selectedBlockId,
    codeBasePath: state.codeBasePath,
    mediaBasePath: state.mediaBasePath,
    codeTree: state.codeTree,
    mediaFiles: state.mediaFiles ? state.mediaFiles.map((file) => ({
      path: file.path,
      fileName: file.fileName,
      extension: file.extension,
      isVideo: file.isVideo,
      isImage: file.isImage,
      url: file.url,
    })) : null,
    jsonFiles: state.jsonFiles ? Array.from(state.jsonFiles.values()) : null,
  };
}

// デバッグ用: serializeStateを呼ぶ前にjsonFilesの状態を確認
export function debugJsonFiles() {
  console.log('[EDS Inspector Serializer] state.jsonFiles:', state.jsonFiles);
  console.log('[EDS Inspector Serializer] state.jsonFiles type:', typeof state.jsonFiles);
  console.log('[EDS Inspector Serializer] state.jsonFiles instanceof Map:', state.jsonFiles instanceof Map);
  if (state.jsonFiles) {
    console.log('[EDS Inspector Serializer] state.jsonFiles.size:', state.jsonFiles.size);
    console.log('[EDS Inspector Serializer] Array.from(state.jsonFiles.values()):', Array.from(state.jsonFiles.values()));
  }
}

