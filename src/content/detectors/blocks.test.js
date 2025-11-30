/**
 * blocks.jsのテスト
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { isBlockRootElement } from './blocks.js';

describe('isBlockRootElement', () => {
  let container;
  
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
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
});

