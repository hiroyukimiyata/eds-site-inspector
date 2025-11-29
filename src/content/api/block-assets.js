/**
 * ブロックアセットの取得
 */

/**
 * ブロックのアセットを取得
 */
export async function getBlockAssets(blockName) {
  const assets = [];
  const seen = new Set();
  const addAsset = (urlString) => {
    try {
      const url = new URL(urlString, window.location.href);
      if (!url.pathname.includes(`/blocks/${blockName}/`)) return;
      if (seen.has(url.pathname)) return;
      seen.add(url.pathname);
      assets.push({ url: url.toString(), path: url.pathname });
    } catch (e) {
      /* noop */
    }
  };

  performance.getEntriesByType('resource').forEach((entry) => addAsset(entry.name));
  document.querySelectorAll('link[href*="/blocks/"], script[src*="/blocks/"]').forEach((el) => {
    const url = el.getAttribute('href') || el.getAttribute('src');
    if (url) addAsset(url);
  });

  const enriched = [];
  for (const asset of assets) {
    try {
      const res = await fetch(asset.url);
      const text = await res.text();
      const type = asset.path.split('.').pop() || 'file';
      enriched.push({ ...asset, type, content: text });
    } catch (err) {
      enriched.push({ ...asset, type: 'error', content: `Failed to load asset: ${err.message}` });
    }
  }
  return enriched;
}

