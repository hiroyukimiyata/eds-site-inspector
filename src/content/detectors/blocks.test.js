/**
 * blocks.jsのテスト
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isBlockRootElement, detectBlocks } from './blocks.js';
import { computeElementPath, findElementByPath } from '../utils/dom.js';

describe('isBlockRootElement', () => {
  let container;
  
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('親要素に同じブロッククラスがない場合はtrueを返す', () => {
    const element = document.createElement('div');
    element.className = 'test-block';
    container.appendChild(element);
    
    expect(isBlockRootElement(element, 'test-block')).toBe(true);
  });

  it('親要素に同じブロッククラスがある場合はfalseを返す', () => {
    const parent = document.createElement('div');
    parent.className = 'test-block';
    container.appendChild(parent);
    
    const child = document.createElement('div');
    child.className = 'test-block';
    parent.appendChild(child);
    
    expect(isBlockRootElement(child, 'test-block')).toBe(false);
    expect(isBlockRootElement(parent, 'test-block')).toBe(true);
  });

  it('複数階層のネストでも正しく判定する', () => {
    const level1 = document.createElement('div');
    level1.className = 'test-block';
    container.appendChild(level1);
    
    const level2 = document.createElement('div');
    level2.className = 'test-block';
    level1.appendChild(level2);
    
    const level3 = document.createElement('div');
    level3.className = 'test-block';
    level2.appendChild(level3);
    
    expect(isBlockRootElement(level1, 'test-block')).toBe(true);
    expect(isBlockRootElement(level2, 'test-block')).toBe(false);
    expect(isBlockRootElement(level3, 'test-block')).toBe(false);
  });

  it('親要素がない場合はtrueを返す', () => {
    const element = document.createElement('div');
    element.className = 'test-block';
    
    expect(isBlockRootElement(element, 'test-block')).toBe(true);
  });

  it('異なるブロッククラスを持つ親要素がある場合はtrueを返す', () => {
    const parent = document.createElement('div');
    parent.className = 'other-block';
    container.appendChild(parent);
    
    const child = document.createElement('div');
    child.className = 'test-block';
    parent.appendChild(child);
    
    expect(isBlockRootElement(child, 'test-block')).toBe(true);
  });

  it('headerタグの場合はタグ名で判定する', () => {
    const header = document.createElement('header');
    container.appendChild(header);
    
    expect(isBlockRootElement(header, 'header')).toBe(true);
    
    const nestedHeader = document.createElement('header');
    header.appendChild(nestedHeader);
    
    expect(isBlockRootElement(nestedHeader, 'header')).toBe(false);
  });

  it('footerタグの場合はタグ名で判定する', () => {
    const footer = document.createElement('footer');
    container.appendChild(footer);
    
    expect(isBlockRootElement(footer, 'footer')).toBe(true);
    
    const nestedFooter = document.createElement('footer');
    footer.appendChild(nestedFooter);
    
    expect(isBlockRootElement(nestedFooter, 'footer')).toBe(false);
  });

  it('複数のクラス名がある場合でも正しく判定する', () => {
    const element = document.createElement('div');
    element.className = 'test-block other-class';
    container.appendChild(element);
    
    expect(isBlockRootElement(element, 'test-block')).toBe(true);
  });
});

describe('detectBlocks', () => {
  let mainSSR, mainLive, ssrDocuments, blockResources;

  beforeEach(() => {
    // テスト用のDOM構造を作成
    document.body.innerHTML = '';
    
    // SSRドキュメントを作成
    const ssrDoc = document.implementation.createHTMLDocument('SSR Document');
    ssrDoc.body.innerHTML = `
      <main>
        <div>
          <div class="hero">
            <h1>Hero Title</h1>
            <p>Hero content</p>
          </div>
        </div>
        <div>
          <div class="content">
            <h2>Content Title</h2>
            <p>Content paragraph</p>
          </div>
        </div>
      </main>
    `;
    
    // Liveドキュメントを作成
    document.body.innerHTML = `
      <main>
        <div>
          <div class="hero">
            <h1>Hero Title</h1>
            <p>Hero content</p>
          </div>
        </div>
        <div>
          <div class="content">
            <h2>Content Title</h2>
            <p>Content paragraph</p>
          </div>
        </div>
      </main>
    `;
    
    mainSSR = ssrDoc.querySelector('main');
    mainLive = document.querySelector('main');
    
    ssrDocuments = new Map();
    ssrDocuments.set('https://example.com/page', ssrDoc);
    
    blockResources = new Set(['hero', 'content']);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('ネットワークリクエストからブロックを検出する', () => {
    const blocks = detectBlocks(ssrDocuments, mainSSR, mainLive, blockResources);
    
    expect(blocks.length).toBeGreaterThan(0);
    const heroBlock = blocks.find(b => b.name === 'hero');
    const contentBlock = blocks.find(b => b.name === 'content');
    
    expect(heroBlock).toBeDefined();
    expect(contentBlock).toBeDefined();
  });

  it('ブロックのルート要素のみを検出する', () => {
    // ネストされたブロック構造を作成
    document.body.innerHTML = `
      <main>
        <div>
          <div class="hero">
            <div class="hero">
              <p>Nested hero</p>
            </div>
          </div>
        </div>
      </main>
    `;
    
    const ssrDoc = document.implementation.createHTMLDocument('SSR');
    ssrDoc.body.innerHTML = document.body.innerHTML;
    const ssrMain = ssrDoc.querySelector('main');
    const liveMain = document.querySelector('main');
    
    const ssrDocs = new Map();
    ssrDocs.set('https://example.com/page', ssrDoc);
    
    const blocks = detectBlocks(ssrDocs, ssrMain, liveMain, new Set(['hero']));
    
    // ルート要素のみが検出されるべき
    const heroBlocks = blocks.filter(b => b.name === 'hero');
    expect(heroBlocks.length).toBe(1);
    expect(heroBlocks[0].element.className).toBe('hero');
  });

  it('SSRとCSRの要素が正しくマッピングされる', () => {
    const blocks = detectBlocks(ssrDocuments, mainSSR, mainLive, blockResources);
    
    const heroBlock = blocks.find(b => b.name === 'hero');
    expect(heroBlock).toBeDefined();
    expect(heroBlock.ssrElement).toBeDefined();
    expect(heroBlock.element).toBeDefined();
    
    // SSR要素とCSR要素のクラス名が一致することを確認
    expect(heroBlock.element.className).toContain('hero');
    expect(heroBlock.ssrElement.className).toContain('hero');
  });

  it('ブロッククラス名が完全一致する要素のみを検出する', () => {
    document.body.innerHTML = `
      <main>
        <div>
          <div class="hero-block">
            <p>Not a hero block</p>
          </div>
          <div class="hero">
            <p>Hero block</p>
          </div>
        </div>
      </main>
    `;
    
    const ssrDoc = document.implementation.createHTMLDocument('SSR');
    ssrDoc.body.innerHTML = document.body.innerHTML;
    const ssrMain = ssrDoc.querySelector('main');
    const liveMain = document.querySelector('main');
    
    const ssrDocs = new Map();
    ssrDocs.set('https://example.com/page', ssrDoc);
    
    const blocks = detectBlocks(ssrDocs, ssrMain, liveMain, new Set(['hero']));
    
    const heroBlocks = blocks.filter(b => b.name === 'hero');
    expect(heroBlocks.length).toBe(1);
    expect(heroBlocks[0].element.className).toBe('hero');
  });

  it('複数のブロックが同じセクション内にある場合でも正しく検出する', () => {
    document.body.innerHTML = `
      <main>
        <div>
          <div class="hero">
            <h1>Hero</h1>
          </div>
          <div class="content">
            <h2>Content</h2>
          </div>
        </div>
      </main>
    `;
    
    const ssrDoc = document.implementation.createHTMLDocument('SSR');
    ssrDoc.body.innerHTML = document.body.innerHTML;
    const ssrMain = ssrDoc.querySelector('main');
    const liveMain = document.querySelector('main');
    
    const ssrDocs = new Map();
    ssrDocs.set('https://example.com/page', ssrDoc);
    
    const blocks = detectBlocks(ssrDocs, ssrMain, liveMain, new Set(['hero', 'content']));
    
    expect(blocks.length).toBeGreaterThanOrEqual(2);
    expect(blocks.find(b => b.name === 'hero')).toBeDefined();
    expect(blocks.find(b => b.name === 'content')).toBeDefined();
  });

  it('main要素外のブロックも検出する（header/footerなど）', () => {
    document.body.innerHTML = `
      <header>
        <nav class="navigation">
          <a href="/">Home</a>
        </nav>
      </header>
      <main>
        <div>
          <div class="content">
            <p>Content</p>
          </div>
        </div>
      </main>
      <footer>
        <p>Footer</p>
      </footer>
    `;
    
    const ssrDoc = document.implementation.createHTMLDocument('SSR');
    ssrDoc.body.innerHTML = document.body.innerHTML;
    const ssrMain = ssrDoc.querySelector('main');
    const liveMain = document.querySelector('main');
    
    const ssrDocs = new Map();
    ssrDocs.set('https://example.com/page', ssrDoc);
    
    const blocks = detectBlocks(ssrDocs, ssrMain, liveMain, new Set(['navigation', 'content', 'header', 'footer']));
    
    // headerとfooterはタグ名で検出される
    const headerBlocks = blocks.filter(b => b.name === 'header');
    const footerBlocks = blocks.filter(b => b.name === 'footer');
    
    expect(headerBlocks.length).toBeGreaterThan(0);
    expect(footerBlocks.length).toBeGreaterThan(0);
  });

  it('headerタグはタグ名で検出される', () => {
    document.body.innerHTML = `
      <header>
        <nav>Navigation</nav>
      </header>
      <main>
        <div class="content">
          <p>Content</p>
        </div>
      </main>
    `;
    
    const ssrDoc = document.implementation.createHTMLDocument('SSR');
    ssrDoc.body.innerHTML = document.body.innerHTML;
    const ssrMain = ssrDoc.querySelector('main');
    const liveMain = document.querySelector('main');
    
    const ssrDocs = new Map();
    ssrDocs.set('https://example.com/page', ssrDoc);
    
    const blocks = detectBlocks(ssrDocs, ssrMain, liveMain, new Set(['header']));
    
    const headerBlocks = blocks.filter(b => b.name === 'header');
    expect(headerBlocks.length).toBeGreaterThan(0);
    expect(headerBlocks[0].element.tagName.toLowerCase()).toBe('header');
  });

  it('footerタグはタグ名で検出される', () => {
    document.body.innerHTML = `
      <main>
        <div class="content">
          <p>Content</p>
        </div>
      </main>
      <footer>
        <p>Footer</p>
      </footer>
    `;
    
    const ssrDoc = document.implementation.createHTMLDocument('SSR');
    ssrDoc.body.innerHTML = document.body.innerHTML;
    const ssrMain = ssrDoc.querySelector('main');
    const liveMain = document.querySelector('main');
    
    const ssrDocs = new Map();
    ssrDocs.set('https://example.com/page', ssrDoc);
    
    const blocks = detectBlocks(ssrDocs, ssrMain, liveMain, new Set(['footer']));
    
    const footerBlocks = blocks.filter(b => b.name === 'footer');
    expect(footerBlocks.length).toBeGreaterThan(0);
    expect(footerBlocks[0].element.tagName.toLowerCase()).toBe('footer');
  });

  it('異なるブロックがネストされている場合、それぞれが正しく検出される', () => {
    document.body.innerHTML = `
      <main>
        <div>
          <div class="section">
            <div class="hero">
              <h1>Hero in section</h1>
            </div>
          </div>
        </div>
      </main>
    `;
    
    const ssrDoc = document.implementation.createHTMLDocument('SSR');
    ssrDoc.body.innerHTML = document.body.innerHTML;
    const ssrMain = ssrDoc.querySelector('main');
    const liveMain = document.querySelector('main');
    
    const ssrDocs = new Map();
    ssrDocs.set('https://example.com/page', ssrDoc);
    
    const blocks = detectBlocks(ssrDocs, ssrMain, liveMain, new Set(['section', 'hero']));
    
    // sectionとheroの両方が検出されるべき
    const sectionBlocks = blocks.filter(b => b.name === 'section');
    const heroBlocks = blocks.filter(b => b.name === 'hero');
    
    expect(sectionBlocks.length).toBeGreaterThan(0);
    expect(heroBlocks.length).toBeGreaterThan(0);
  });

  it('SSRマークアップからブロッククラスを検出する（ネットワークリクエストにない場合）', () => {
    document.body.innerHTML = `
      <main>
        <div>
          <div class="custom-block">
            <p>Custom block</p>
          </div>
        </div>
      </main>
    `;
    
    const ssrDoc = document.implementation.createHTMLDocument('SSR');
    ssrDoc.body.innerHTML = document.body.innerHTML;
    const ssrMain = ssrDoc.querySelector('main');
    const liveMain = document.querySelector('main');
    
    const ssrDocs = new Map();
    ssrDocs.set('https://example.com/page', ssrDoc);
    
    // ネットワークリクエストには存在しないが、SSRマークアップには存在するブロック
    const blocks = detectBlocks(ssrDocs, ssrMain, liveMain, new Set());
    
    const customBlocks = blocks.filter(b => b.name === 'custom-block');
    expect(customBlocks.length).toBeGreaterThan(0);
  });

  it('Default Content（h1, h2, pなど）を検出する', () => {
    document.body.innerHTML = `
      <main>
        <div>
          <h1>Heading 1</h1>
          <h2>Heading 2</h2>
          <p>Paragraph</p>
        </div>
      </main>
    `;
    
    const ssrDoc = document.implementation.createHTMLDocument('SSR');
    ssrDoc.body.innerHTML = document.body.innerHTML;
    const ssrMain = ssrDoc.querySelector('main');
    const liveMain = document.querySelector('main');
    
    const ssrDocs = new Map();
    ssrDocs.set('https://example.com/page', ssrDoc);
    
    const blocks = detectBlocks(ssrDocs, ssrMain, liveMain, new Set());
    
    const h1Blocks = blocks.filter(b => b.name === 'heading (h1)');
    const h2Blocks = blocks.filter(b => b.name === 'heading (h2)');
    const pBlocks = blocks.filter(b => b.name === 'text');
    
    expect(h1Blocks.length).toBeGreaterThan(0);
    expect(h2Blocks.length).toBeGreaterThan(0);
    expect(pBlocks.length).toBeGreaterThan(0);
  });

  it('ブロック要素内のDefault Contentは検出しない', () => {
    document.body.innerHTML = `
      <main>
        <div>
          <div class="hero">
            <h1>Hero Heading</h1>
            <p>Hero paragraph</p>
          </div>
        </div>
      </main>
    `;
    
    const ssrDoc = document.implementation.createHTMLDocument('SSR');
    ssrDoc.body.innerHTML = document.body.innerHTML;
    const ssrMain = ssrDoc.querySelector('main');
    const liveMain = document.querySelector('main');
    
    const ssrDocs = new Map();
    ssrDocs.set('https://example.com/page', ssrDoc);
    
    const blocks = detectBlocks(ssrDocs, ssrMain, liveMain, new Set(['hero']));
    
    // heroブロック内のh1とpはDefault Contentとして検出されない
    const heroBlock = blocks.find(b => b.name === 'hero');
    expect(heroBlock).toBeDefined();
    
    // heroブロック内のh1とpは検出されない（ブロック要素内のため）
    const h1InHero = blocks.filter(b => 
      b.name === 'heading (h1)' && 
      heroBlock.element.contains(b.element)
    );
    expect(h1InHero.length).toBe(0);
  });

  it('パスベースでSSR要素を見つける', () => {
    document.body.innerHTML = `
      <main>
        <div>
          <div class="hero">
            <h1>Hero</h1>
          </div>
        </div>
      </main>
    `;
    
    const ssrDoc = document.implementation.createHTMLDocument('SSR');
    ssrDoc.body.innerHTML = document.body.innerHTML;
    const ssrMain = ssrDoc.querySelector('main');
    const liveMain = document.querySelector('main');
    
    const ssrDocs = new Map();
    ssrDocs.set('https://example.com/page', ssrDoc);
    
    const blocks = detectBlocks(ssrDocs, ssrMain, liveMain, new Set(['hero']));
    
    const heroBlock = blocks.find(b => b.name === 'hero');
    expect(heroBlock).toBeDefined();
    expect(heroBlock.ssrElement).toBeDefined();
    
    // パスベースでマッピングされていることを確認
    const livePath = computeElementPath(heroBlock.element, liveMain);
    const ssrElementByPath = findElementByPath(ssrMain, livePath);
    expect(ssrElementByPath).toBe(heroBlock.ssrElement);
  });

  it('複数のSSRドキュメントからブロックを検出する', () => {
    document.body.innerHTML = `
      <main>
        <div>
          <div class="hero">
            <h1>Hero</h1>
          </div>
        </div>
      </main>
    `;
    
    const ssrDoc1 = document.implementation.createHTMLDocument('SSR 1');
    ssrDoc1.body.innerHTML = document.body.innerHTML;
    
    const ssrDoc2 = document.implementation.createHTMLDocument('SSR 2');
    ssrDoc2.body.innerHTML = `
      <main>
        <div>
          <div class="content">
            <h2>Content</h2>
          </div>
        </div>
      </main>
    `;
    
    const ssrMain = ssrDoc1.querySelector('main');
    const liveMain = document.querySelector('main');
    
    const ssrDocs = new Map();
    ssrDocs.set('https://example.com/page1', ssrDoc1);
    ssrDocs.set('https://example.com/page2', ssrDoc2);
    
    const blocks = detectBlocks(ssrDocs, ssrMain, liveMain, new Set(['hero', 'content']));
    
    const heroBlock = blocks.find(b => b.name === 'hero');
    expect(heroBlock).toBeDefined();
    expect(heroBlock.sourceDocumentUrl).toBe('https://example.com/page1');
  });

  it('iconブロックは検出しない', () => {
    document.body.innerHTML = `
      <main>
        <div>
          <div class="icon">
            <span>Icon</span>
          </div>
          <div class="icon-arrow">
            <span>Arrow Icon</span>
          </div>
        </div>
      </main>
    `;
    
    const ssrDoc = document.implementation.createHTMLDocument('SSR');
    ssrDoc.body.innerHTML = document.body.innerHTML;
    const ssrMain = ssrDoc.querySelector('main');
    const liveMain = document.querySelector('main');
    
    const ssrDocs = new Map();
    ssrDocs.set('https://example.com/page', ssrDoc);
    
    const blocks = detectBlocks(ssrDocs, ssrMain, liveMain, new Set(['icon', 'icon-arrow']));
    
    const iconBlocks = blocks.filter(b => b.name === 'icon' || b.name.startsWith('icon-'));
    expect(iconBlocks.length).toBe(0);
  });
});
