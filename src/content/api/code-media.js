/**
 * コードとメディアの読み込み
 */
import { state } from '../state.js';
import { fetchAdminListing } from './admin.js';
import { buildTreeFromPaths } from '../utils/path.js';
import { collectMediaFiles } from '../collectors/resources.js';

/**
 * コードとメディアを読み込み
 */
export async function loadCodeAndMedia() {
  if (state.codeBasePath) {
    try {
      const paths = await fetchAdminListing(state.codeBasePath, (entry) => entry.type === 'file');
      if (paths && paths.length) {
        state.codeTree = buildTreeFromPaths(paths);
      }
    } catch (err) {
      console.warn('Code Bus listing failed', err);
    }
  }
  
  // ネットワークリクエストからMedia Busファイルを収集
  const networkMediaFiles = collectMediaFiles();
  
  // Admin APIからもMedia Busファイルを取得（フォールバック）
  let adminMediaFiles = [];
  if (state.mediaBasePath) {
    try {
      // Media Busのファイル名パターン: media_ + 10文字以上のハッシュ値（16進数）+ 拡張子
      const mediaFilePattern = /^media_[0-9a-fA-F]{10,}\.[a-zA-Z0-9]+$/;
      const mediaPaths = await fetchAdminListing(state.mediaBasePath, (entry) => {
        if (entry.type !== 'file') return false;
        // パスからファイル名を抽出
        const fileName = entry.path.split('/').pop();
        return mediaFilePattern.test(fileName);
      });
      if (mediaPaths) {
        adminMediaFiles = mediaPaths.map((path) => {
          const fileName = path.split('/').pop();
          const extension = fileName.split('.').pop().toLowerCase();
          const isVideo = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(extension);
          const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension);
          return { 
            path,
            fileName,
            extension,
            isVideo,
            isImage,
            url: state.mediaBasePath ? `${state.mediaBasePath}${path}` : null,
          };
        });
      }
    } catch (err) {
      console.warn('Media Bus listing failed', err);
    }
  }
  
  // ネットワークリクエストから検出したファイルとAdmin APIから取得したファイルをマージ
  const mediaFilesMap = new Map();
  
  // Admin APIから取得したファイルを追加
  adminMediaFiles.forEach((file) => {
    mediaFilesMap.set(file.fileName, file);
  });
  
  // ネットワークリクエストから検出したファイルを追加（既存のものは上書きしない）
  networkMediaFiles.forEach((url, fileName) => {
    if (!mediaFilesMap.has(fileName)) {
      const extension = fileName.split('.').pop().toLowerCase();
      const isVideo = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(extension);
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension);
      mediaFilesMap.set(fileName, {
        path: `/${fileName}`,
        fileName,
        extension,
        isVideo,
        isImage,
        url,
      });
    }
  });
  
  state.mediaFiles = Array.from(mediaFilesMap.values());
  console.log('[EDS Inspector] Total media files:', state.mediaFiles.length);
  console.log('[EDS Inspector] Media files:', state.mediaFiles.map(f => f.fileName));
}

