/**
 * パス操作のユーティリティ関数
 */

/**
 * ref/repo/ownerをURLから解析
 */
export function parseRefRepoOwner(urlString) {
  try {
    const url = new URL(urlString);
    const match = url.hostname.match(/^(?<ref>[^-]+)--(?<repo>[^-]+)--(?<owner>[^.]+)/);
    if (match && match.groups) {
      return match.groups;
    }
  } catch (e) {
    return null;
  }
  return null;
}

/**
 * パスからツリー構造を構築
 */
export function buildTreeFromPaths(paths) {
  const root = { name: 'codebus', children: [] };
  paths.forEach((path) => {
    const parts = path.replace(/^\//, '').split('/');
    let current = root;
    parts.forEach((part, index) => {
      let child = current.children.find((c) => c.name === part);
      if (!child) {
        child = { name: part, children: [] };
        current.children.push(child);
      }
      if (index === parts.length - 1) {
        child.path = `/${parts.join('/')}`;
      }
      current = child;
    });
  });
  return root;
}

