/**
 * sections.jsのテスト
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { detectSections } from './sections.js';

describe('detectSections', () => {
  let mainSSR, mainLive, ssrDocuments;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('main要素の直接の子要素をsectionとして検出する', () => {
    // SSRドキュメントを作成
    const ssrDoc = document.implementation.createHTMLDocument('SSR Document');
    ssrDoc.body.innerHTML = `
      <main>
        <div>
          <div class="hero">Hero content</div>
        </div>
        <div>
          <div class="content">Content</div>
        </div>
        <div>
          <div class="footer">Footer</div>
        </div>
      </main>
    `;
    
    // Liveドキュメントを作成
    document.body.innerHTML = `
      <main>
        <div>
          <div class="hero">Hero content</div>
        </div>
        <div>
          <div class="content">Content</div>
        </div>
        <div>
          <div class="footer">Footer</div>
        </div>
      </main>
    `;
    
    mainSSR = ssrDoc.querySelector('main');
    mainLive = document.querySelector('main');
    
    ssrDocuments = new Map();
    ssrDocuments.set('https://example.com/page', ssrDoc);
    
    const sections = detectSections(ssrDocuments, mainSSR, mainLive);
    
    // main要素の直接の子要素が3つあるので、3つのsectionが検出されるべき
    expect(sections.length).toBe(3);
    expect(sections[0].element).toBe(mainLive.children[0]);
    expect(sections[1].element).toBe(mainLive.children[1]);
    expect(sections[2].element).toBe(mainLive.children[2]);
  });

  it('Section Metadataブロックからラベルを抽出する', () => {
    const ssrDoc = document.implementation.createHTMLDocument('SSR Document');
    ssrDoc.body.innerHTML = `
      <main>
        <div>
          <div class="section-metadata">
            <div>
              <div>style</div>
              <div>content</div>
            </div>
          </div>
          <div class="hero">Hero content</div>
        </div>
      </main>
    `;
    
    document.body.innerHTML = `
      <main>
        <div>
          <div class="section-metadata">
            <div>
              <div>style</div>
              <div>content</div>
            </div>
          </div>
          <div class="hero">Hero content</div>
        </div>
      </main>
    `;
    
    mainSSR = ssrDoc.querySelector('main');
    mainLive = document.querySelector('main');
    
    ssrDocuments = new Map();
    ssrDocuments.set('https://example.com/page', ssrDoc);
    
    const sections = detectSections(ssrDocuments, mainSSR, mainLive);
    
    expect(sections.length).toBe(1);
    expect(sections[0].label).toBe('content');
  });

  it('Section Metadataがない場合はラベルがnullになる', () => {
    const ssrDoc = document.implementation.createHTMLDocument('SSR Document');
    ssrDoc.body.innerHTML = `
      <main>
        <div>
          <div class="hero">Hero content</div>
        </div>
      </main>
    `;
    
    document.body.innerHTML = `
      <main>
        <div>
          <div class="hero">Hero content</div>
        </div>
      </main>
    `;
    
    mainSSR = ssrDoc.querySelector('main');
    mainLive = document.querySelector('main');
    
    ssrDocuments = new Map();
    ssrDocuments.set('https://example.com/page', ssrDoc);
    
    const sections = detectSections(ssrDocuments, mainSSR, mainLive);
    
    expect(sections.length).toBe(1);
    expect(sections[0].label).toBeNull();
  });

  it('SSRとCSRの要素が正しくマッピングされる', () => {
    const ssrDoc = document.implementation.createHTMLDocument('SSR Document');
    ssrDoc.body.innerHTML = `
      <main>
        <div>
          <h1>Section 1</h1>
        </div>
        <div>
          <h2>Section 2</h2>
        </div>
      </main>
    `;
    
    document.body.innerHTML = `
      <main>
        <div>
          <h1>Section 1</h1>
        </div>
        <div>
          <h2>Section 2</h2>
        </div>
      </main>
    `;
    
    mainSSR = ssrDoc.querySelector('main');
    mainLive = document.querySelector('main');
    
    ssrDocuments = new Map();
    ssrDocuments.set('https://example.com/page', ssrDoc);
    
    const sections = detectSections(ssrDocuments, mainSSR, mainLive);
    
    expect(sections.length).toBe(2);
    // インデックスベースでマッピングされる
    expect(sections[0].element).toBe(mainLive.children[0]);
    expect(sections[1].element).toBe(mainLive.children[1]);
  });

  it('パスベースでSSR要素を見つける（インデックスが一致しない場合）', () => {
    const ssrDoc = document.implementation.createHTMLDocument('SSR Document');
    ssrDoc.body.innerHTML = `
      <main>
        <div>
          <h1>Section 1</h1>
        </div>
        <div>
          <h2>Section 2</h2>
        </div>
      </main>
    `;
    
    // Liveドキュメントの構造が少し異なる場合
    document.body.innerHTML = `
      <main>
        <div>
          <h1>Section 1</h1>
        </div>
        <div class="extra-wrapper">
          <div>
            <h2>Section 2</h2>
          </div>
        </div>
      </main>
    `;
    
    mainSSR = ssrDoc.querySelector('main');
    mainLive = document.querySelector('main');
    
    ssrDocuments = new Map();
    ssrDocuments.set('https://example.com/page', ssrDoc);
    
    const sections = detectSections(ssrDocuments, mainSSR, mainLive);
    
    // パスベースでマッピングされるため、sectionは検出される
    expect(sections.length).toBeGreaterThan(0);
  });

  it('main要素の直接の子要素でない<section>タグは検出しない', () => {
    const ssrDoc = document.implementation.createHTMLDocument('SSR Document');
    ssrDoc.body.innerHTML = `
      <main>
        <div>
          <section>
            <h1>Nested Section</h1>
          </section>
        </div>
      </main>
    `;
    
    document.body.innerHTML = `
      <main>
        <div>
          <section>
            <h1>Nested Section</h1>
          </section>
        </div>
      </main>
    `;
    
    mainSSR = ssrDoc.querySelector('main');
    mainLive = document.querySelector('main');
    
    ssrDocuments = new Map();
    ssrDocuments.set('https://example.com/page', ssrDoc);
    
    const sections = detectSections(ssrDocuments, mainSSR, mainLive);
    
    // main要素の直接の子要素（<div>）のみが検出される
    expect(sections.length).toBe(1);
    expect(sections[0].element.tagName.toLowerCase()).toBe('div');
  });

  it('main要素の直接の子要素である<section>タグは検出する', () => {
    const ssrDoc = document.implementation.createHTMLDocument('SSR Document');
    ssrDoc.body.innerHTML = `
      <main>
        <section>
          <h1>Section 1</h1>
        </section>
        <section>
          <h2>Section 2</h2>
        </section>
      </main>
    `;
    
    document.body.innerHTML = `
      <main>
        <section>
          <h1>Section 1</h1>
        </section>
        <section>
          <h2>Section 2</h2>
        </section>
      </main>
    `;
    
    mainSSR = ssrDoc.querySelector('main');
    mainLive = document.querySelector('main');
    
    ssrDocuments = new Map();
    ssrDocuments.set('https://example.com/page', ssrDoc);
    
    const sections = detectSections(ssrDocuments, mainSSR, mainLive);
    
    // main要素の直接の子要素である<section>タグが検出される
    expect(sections.length).toBe(2);
    expect(sections[0].element.tagName.toLowerCase()).toBe('section');
    expect(sections[1].element.tagName.toLowerCase()).toBe('section');
  });

  it('複数のSSRドキュメントからsectionを検出する', () => {
    const ssrDoc1 = document.implementation.createHTMLDocument('SSR 1');
    ssrDoc1.body.innerHTML = `
      <main>
        <div>
          <h1>Section 1</h1>
        </div>
      </main>
    `;
    
    const ssrDoc2 = document.implementation.createHTMLDocument('SSR 2');
    ssrDoc2.body.innerHTML = `
      <main>
        <div>
          <h2>Section 2</h2>
        </div>
      </main>
    `;
    
    document.body.innerHTML = `
      <main>
        <div>
          <h1>Section 1</h1>
        </div>
      </main>
    `;
    
    mainSSR = ssrDoc1.querySelector('main');
    mainLive = document.querySelector('main');
    
    ssrDocuments = new Map();
    ssrDocuments.set('https://example.com/page1', ssrDoc1);
    ssrDocuments.set('https://example.com/page2', ssrDoc2);
    
    const sections = detectSections(ssrDocuments, mainSSR, mainLive);
    
    // メインSSRドキュメントからsectionが検出される
    expect(sections.length).toBe(1);
  });

  it('空のmain要素でもエラーが発生しない', () => {
    const ssrDoc = document.implementation.createHTMLDocument('SSR Document');
    ssrDoc.body.innerHTML = '<main></main>';
    
    document.body.innerHTML = '<main></main>';
    
    mainSSR = ssrDoc.querySelector('main');
    mainLive = document.querySelector('main');
    
    ssrDocuments = new Map();
    ssrDocuments.set('https://example.com/page', ssrDoc);
    
    const sections = detectSections(ssrDocuments, mainSSR, mainLive);
    
    expect(sections.length).toBe(0);
  });

  it('テキストノードのみの子要素はスキップする', () => {
    const ssrDoc = document.implementation.createHTMLDocument('SSR Document');
    ssrDoc.body.innerHTML = `
      <main>
        <div>
          <h1>Section 1</h1>
        </div>
      </main>
    `;
    
    document.body.innerHTML = `
      <main>
        <div>
          <h1>Section 1</h1>
        </div>
      </main>
    `;
    
    mainSSR = ssrDoc.querySelector('main');
    mainLive = document.querySelector('main');
    
    // テキストノードを追加
    const textNode = document.createTextNode('  \n  ');
    mainLive.insertBefore(textNode, mainLive.firstChild);
    
    ssrDocuments = new Map();
    ssrDocuments.set('https://example.com/page', ssrDoc);
    
    const sections = detectSections(ssrDocuments, mainSSR, mainLive);
    
    // テキストノードはスキップされ、div要素のみが検出される
    expect(sections.length).toBe(1);
    expect(sections[0].element.tagName.toLowerCase()).toBe('div');
  });
});

