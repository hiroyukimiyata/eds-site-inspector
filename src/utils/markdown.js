import { marked } from 'marked';

// marked.jsの設定
marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: false,
  mangle: false,
});

/**
 * MarkdownをHTMLに変換
 * @param {string} markdown - Markdownテキスト
 * @returns {string} HTML
 */
export function parseMarkdown(markdown) {
  if (!markdown) return '';
  return marked.parse(markdown);
}

/**
 * MarkdownのASTを解析
 * @param {string} markdown - Markdownテキスト
 * @returns {Array} ASTノードの配列
 */
export function parseMarkdownAST(markdown) {
  if (!markdown) return [];
  
  const tokens = marked.lexer(markdown);
  const ast = [];
  
  tokens.forEach((token) => {
    switch (token.type) {
      case 'heading':
        ast.push({
          type: 'heading',
          level: token.depth,
          text: token.text,
        });
        break;
      case 'paragraph':
        ast.push({
          type: 'paragraph',
          text: token.text,
        });
        break;
      case 'list':
        ast.push({
          type: 'list',
          items: token.items.map(item => item.text || item.raw),
        });
        break;
      case 'code':
        ast.push({
          type: 'code',
          language: token.lang || 'plain',
          content: token.text,
        });
        break;
      case 'table':
        ast.push({
          type: 'table',
          header: token.header,
          rows: token.rows,
        });
        break;
      case 'link':
        ast.push({
          type: 'link',
          text: token.text,
          url: token.href,
        });
        break;
      case 'image':
        ast.push({
          type: 'image',
          alt: token.text,
          url: token.href,
        });
        break;
      default:
        // その他のトークンは無視
        break;
    }
  });
  
  return ast;
}

