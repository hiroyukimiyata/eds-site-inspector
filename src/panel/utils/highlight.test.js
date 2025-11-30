/**
 * highlightCode関数のテスト
 */
import { describe, it, expect } from 'vitest';
import { highlightCode } from '../utils.js';

describe('highlightCode', () => {
  describe('JavaScript', () => {
    it('キーワードをハイライトする', () => {
      const code = 'const x = 1;';
      const result = highlightCode(code, 'javascript');
      
      expect(result).toContain('<span class="eds-code-keyword">const</span>');
      // HTMLタグとして正しく表示されることを確認（エスケープされていない）
      expect(result).toContain('<span class="eds-code-keyword">');
    });

    it('文字列リテラルをハイライトする', () => {
      const code = 'const str = "hello";';
      const result = highlightCode(code, 'javascript');
      
      expect(result).toContain('<span class="eds-code-string">');
      // HTMLタグとして正しく表示されることを確認（エスケープされていない）
      expect(result).toContain('<span class="eds-code-string">');
    });

    it('コード内の文字列が誤ってマッチしない', () => {
      const code = 'const className = "eds-code-string";';
      const result = highlightCode(code, 'javascript');
      
      // "eds-code-string"という文字列が誤ってマッチしないことを確認
      expect(result).not.toContain('<span class="eds-code-string"><span'); // ネストされない
      expect(result).toContain('<span class="eds-code-string">'); // 文字列リテラル自体はハイライトされる
    });

    it('コメントをハイライトする', () => {
      const code = '// This is a comment\nconst x = 1;';
      const result = highlightCode(code, 'javascript');
      
      expect(result).toContain('<span class="eds-code-comment">');
    });

    it('数値をハイライトする', () => {
      const code = 'const x = 123;';
      const result = highlightCode(code, 'javascript');
      
      expect(result).toContain('<span class="eds-code-number">123</span>');
    });

    it('関数呼び出しをハイライトする', () => {
      const code = 'console.log("test");';
      const result = highlightCode(code, 'javascript');
      
      // logが関数としてハイライトされる
      expect(result).toContain('<span class="eds-code-function">log</span>');
    });

    it('特殊文字をエスケープする', () => {
      const code = 'const x = "<div>test</div>";';
      const result = highlightCode(code, 'javascript');
      
      expect(result).not.toContain('<div>'); // HTMLタグがエスケープされている
      expect(result).toContain('&lt;div&gt;');
    });
  });

  describe('CSS', () => {
    it('プロパティをハイライトする', () => {
      const code = 'color: red;';
      const result = highlightCode(code, 'css');
      
      expect(result).toContain('<span class="eds-code-prop">color</span>');
    });

    it('値をハイライトする', () => {
      const code = 'color: red;';
      const result = highlightCode(code, 'css');
      
      expect(result).toContain('<span class="eds-code-value">');
    });

    it('コメントをハイライトする', () => {
      const code = '/* This is a comment */';
      const result = highlightCode(code, 'css');
      
      expect(result).toContain('<span class="eds-code-comment">');
    });
  });

  describe('JSON', () => {
    it('文字列をハイライトする', () => {
      const code = '{"name": "value"}';
      const result = highlightCode(code, 'json');
      
      expect(result).toContain('<span class="eds-code-string">');
    });

    it('キーワードをハイライトする', () => {
      const code = '{"flag": true}';
      const result = highlightCode(code, 'json');
      
      expect(result).toContain('<span class="eds-code-keyword">true</span>');
    });

    it('数値をハイライトする', () => {
      const code = '{"count": 42}';
      const result = highlightCode(code, 'json');
      
      expect(result).toContain('<span class="eds-code-number">42</span>');
    });
  });

  describe('HTML', () => {
    it('HTMLタグをハイライトする', () => {
      const code = '<div class="test">Content</div>';
      const result = highlightCode(code, 'html');
      
      expect(result).toContain('<span class="eds-code-tag">');
      expect(result).toContain('<span class="eds-code-name">div</span>');
    });
  });
});

