/**
 * Admin API呼び出し
 */
import { parseRefRepoOwner } from '../utils/path.js';

/**
 * Admin APIからリストを取得
 */
export async function fetchAdminListing(basePath, filterFn) {
  const parsed = parseRefRepoOwner(basePath);
  if (!parsed) return null;
  const { owner, repo, ref } = parsed;
  const url = `https://admin.hlx.page/inspect/${owner}/${repo}/${ref}/`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load listing: ${res.status}`);
  const json = await res.json();
  if (!Array.isArray(json.entries)) return null;
  const filtered = filterFn ? json.entries.filter(filterFn) : json.entries;
  return filtered.map((entry) => entry.path);
}

