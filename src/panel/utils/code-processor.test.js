/**
 * code-processor.jsのテスト
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { safeIndentHtml, formatElementRecursive, detectFileType, processCode } from './code-processor.js';

describe('safeIndentHtml', () => {
  it('シンプルなHTMLを正しくインデントする', () => {
    const html = '<div class="test"><p>Hello</p></div>';
    const result = safeIndentHtml(html);
    
    expect(result).toContain('<div class="test">');
    expect(result).toContain('<p>');
    expect(result).toContain('Hello');
    expect(result).toContain('</p>');
    expect(result).toContain('</div>');
    
    // 各行のインデントを確認
    const lines = result.split('\n').filter(line => line.trim());
    expect(lines.length).toBeGreaterThan(1);
    expect(lines[0]).toMatch(/^<div/); // 0 spaces
    // インデントが適用されていることを確認
    const hasIndentedLine = lines.some(line => line.match(/^  </));
    expect(hasIndentedLine).toBe(true);
  });

  it('ネストされたHTMLを正しくインデントする', () => {
    const html = '<div><div><div><p>Nested</p></div></div></div>';
    const result = safeIndentHtml(html);
    
    const lines = result.split('\n').filter(line => line.trim());
    expect(lines[0]).toMatch(/^<div/); // 0 spaces
    expect(lines[1]).toMatch(/^  <div/); // 2 spaces
    expect(lines[2]).toMatch(/^    <div/); // 4 spaces
    expect(lines[3]).toMatch(/^      <p/); // 6 spaces
  });

  it('属性を持つ要素を正しくインデントする', () => {
    const html = '<div class="pagination" data-block-name="pagination"><div class="inner">Content</div></div>';
    const result = safeIndentHtml(html);
    
    expect(result).toContain('class="pagination"');
    expect(result).toContain('data-block-name="pagination"');
    
    const lines = result.split('\n').filter(line => line.trim());
    expect(lines[0]).toMatch(/^<div/); // 0 spaces
    expect(lines[1]).toMatch(/^  <div class="inner">/); // 2 spaces
  });

  it('SVG要素を含むHTMLを正しくインデントする', () => {
    const html = '<div><p><span><svg xmlns="http://www.w3.org/2000/svg"><use href="#icon"></use></svg></span></p></div>';
    const result = safeIndentHtml(html);
    
    const lines = result.split('\n').filter(line => line.trim());
    // 各階層で2スペースずつインデントが増えることを確認
    const indentCounts = lines.map(line => {
      const match = line.match(/^(\s*)/);
      return match ? match[1].length : 0;
    });
    
    // ルート要素は0スペース
    expect(indentCounts[0]).toBe(0);
    // 1階層目は2スペース
    expect(indentCounts[1]).toBe(2);
    // 2階層目は4スペース
    expect(indentCounts[2]).toBe(4);
    // 3階層目は6スペース
    expect(indentCounts[3]).toBe(6);
    // 4階層目は8スペース
    expect(indentCounts[4]).toBe(8);
  });

  it('空のHTMLをそのまま返す', () => {
    expect(safeIndentHtml('')).toBe('');
    expect(safeIndentHtml(null)).toBe(null);
    expect(safeIndentHtml(undefined)).toBe(undefined);
  });

  it('無効なHTMLの場合はフォールバックする', () => {
    const html = '<div><unclosed';
    const result = safeIndentHtml(html);
    // エラーが発生しても文字列を返す
    expect(typeof result).toBe('string');
  });
});

describe('formatElementRecursive', () => {
  let parser;
  
  beforeEach(() => {
    parser = new DOMParser();
  });

  it('シンプルな要素を正しくフォーマットする', () => {
    const doc = parser.parseFromString('<div class="test">Content</div>', 'text/html');
    const element = doc.body.firstElementChild;
    
    const result = formatElementRecursive(element, 0, 2);
    
    expect(result).toContain('<div class="test">');
    expect(result).toContain('Content');
    expect(result).toContain('</div>');
  });

  it('ネストされた要素を正しくインデントする', () => {
    const doc = parser.parseFromString('<div><div><div>Nested</div></div></div>', 'text/html');
    const element = doc.body.firstElementChild;
    
    const result = formatElementRecursive(element, 0, 2);
    const lines = result.split('\n').filter(line => line.trim());
    
    // インデント数を確認
    const indentCounts = lines.map(line => {
      const match = line.match(/^(\s*)/);
      return match ? match[1].length : 0;
    });
    
    expect(indentCounts[0]).toBe(0); // <div>
    expect(indentCounts[1]).toBe(2); //   <div>
    expect(indentCounts[2]).toBe(4); //     <div>
    // テキストノードのインデントを確認（6スペースまたは4スペース）
    const textLineIndex = lines.findIndex(line => line.includes('Nested'));
    if (textLineIndex >= 0) {
      expect(indentCounts[textLineIndex]).toBeGreaterThanOrEqual(4);
    }
    // 閉じタグのインデントを確認
    const closingTags = lines.filter(line => line.includes('</div>'));
    expect(closingTags.length).toBeGreaterThan(0);
  });

  it('属性を正しくフォーマットする', () => {
    const doc = parser.parseFromString('<div class="test" id="my-id" data-value="123">Content</div>', 'text/html');
    const element = doc.body.firstElementChild;
    
    const result = formatElementRecursive(element, 0, 2);
    
    expect(result).toContain('class="test"');
    expect(result).toContain('id="my-id"');
    expect(result).toContain('data-value="123"');
  });

  it('テキストノードのみの要素を正しくフォーマットする', () => {
    const doc = parser.parseFromString('<p>Hello World</p>', 'text/html');
    const element = doc.body.firstElementChild;
    
    const result = formatElementRecursive(element, 0, 2);
    
    expect(result).toBe('<p>Hello World</p>');
  });

  it('空の要素を正しくフォーマットする', () => {
    const doc = parser.parseFromString('<div></div>', 'text/html');
    const element = doc.body.firstElementChild;
    
    const result = formatElementRecursive(element, 0, 2);
    
    expect(result).toBe('<div />');
  });
});

describe('detectFileType', () => {
  it('typeが指定されている場合はtypeを優先する', () => {
    expect(detectFileType('html', 'test.csr')).toBe('html');
    expect(detectFileType('css', 'test.txt')).toBe('css');
    expect(detectFileType('javascript', 'test.unknown')).toBe('javascript');
  });

  it('typeが指定されていない場合はpathから判定する', () => {
    expect(detectFileType(null, 'test.html')).toBe('html');
    expect(detectFileType('', 'test.css')).toBe('css');
    expect(detectFileType('file', 'script.js')).toBe('javascript');
    expect(detectFileType('file', 'data.json')).toBe('json');
    expect(detectFileType('file', 'config.xml')).toBe('xml');
  });

  it('typeもpathもない場合はtextを返す', () => {
    expect(detectFileType(null, null)).toBe('text');
    expect(detectFileType('', '')).toBe('text');
    expect(detectFileType('file', 'noextension')).toBe('text');
  });

  it('Markup (CSR)のようなpathでもtypeがhtmlならhtmlを返す', () => {
    expect(detectFileType('html', 'Markup (CSR)')).toBe('html');
  });
});

describe('processCode', () => {
  it('HTMLコンテンツを正しく処理する', () => {
    const html = '<div class="test">Content</div>';
    const result = processCode(html, 'html', 'test.html');
    
    // HTMLがフォーマットされ、シンタックスハイライトが適用されていることを確認
    expect(result).toContain('div'); // シンタックスハイライト後はエスケープされている
    expect(result).toContain('test');
    expect(result).toContain('Content');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('空のコンテンツを正しく処理する', () => {
    expect(processCode('', 'html', 'test.html')).toBe('');
    expect(processCode('(empty file)', 'html', 'test.html')).toBe('(empty file)');
  });

  it('typeがhtmlの場合、インデント処理が適用される', () => {
    const html = '<div><div>Nested</div></div>';
    const result = processCode(html, 'html', 'test.html');
    
    // インデントが適用されていることを確認
    const lines = result.split('\n');
    expect(lines.length).toBeGreaterThan(1);
  });

  it('実際のpaginationブロックのHTMLを正しくフォーマットする', () => {
    const html = '<div class="pagination contained block" data-block-name="pagination" data-block-status="loaded"><div><div class="column left link-highlight-colorful-effect-hover-wrapper"><p><span class="icon icon-icon-arrow"><svg xmlns="http://www.w3.org/2000/svg"><use href="#icons-sprite-icon-arrow"></use></svg></span>Previous</p><h3 id="build"><a href="/docs/#build" title="Build" target="_self" class="link-highlight-colorful-effect">Build</a></h3></div><div class="column right link-highlight-colorful-effect-hover-wrapper"><p>Up Next<span class="icon icon-icon-arrow"><svg xmlns="http://www.w3.org/2000/svg"><use href="#icons-sprite-icon-arrow"></use></svg></span></p><h3 id="anatomy-of-an-aem-project"><a href="/developer/anatomy-of-a-helix-project" title="Anatomy of an AEM Project" target="_self" class="link-highlight-colorful-effect">Anatomy of an AEM Project</a></h3></div></div></div>';
    const result = safeIndentHtml(html);
    
    // 開始タグと終了タグが存在することを確認
    expect(result).toContain('<div class="pagination');
    expect(result).toContain('</div>');
    
    // 各行のインデントが正しいことを確認
    const lines = result.split('\n').filter(line => line.trim());
    const indentCounts = lines.map(line => {
      const match = line.match(/^(\s*)/);
      return match ? match[1].length : 0;
    });
    
    // ルート要素は0スペース
    expect(indentCounts[0]).toBe(0);
    // 1階層目は2スペース
    const level1Lines = lines.filter((line, i) => indentCounts[i] === 2 && line.includes('<div'));
    expect(level1Lines.length).toBeGreaterThan(0);
    // 2階層目は4スペース
    const level2Lines = lines.filter((line, i) => indentCounts[i] === 4 && line.includes('<div'));
    expect(level2Lines.length).toBeGreaterThan(0);
    
    // インデントが2スペースずつ増えていることを確認
    const uniqueIndents = [...new Set(indentCounts)].sort((a, b) => a - b);
    for (let i = 1; i < uniqueIndents.length; i++) {
      const diff = uniqueIndents[i] - uniqueIndents[i - 1];
      // 2スペースまたは4スペースの差（属性の折り返しなどで4スペースになる場合がある）
      expect(diff === 2 || diff === 4).toBe(true);
    }
  });
});

