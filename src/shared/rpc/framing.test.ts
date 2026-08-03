import { describe, it, expect } from 'vitest';
import { LineBuffer } from './framing';

describe('LineBuffer', () => {
  it('emits complete lines and buffers the remainder', () => {
    const lb = new LineBuffer();
    expect(lb.push('hel')).toEqual([]);
    expect(lb.push('lo\nwor')).toEqual(['hello']);
    expect(lb.push('ld\n')).toEqual(['world']);
  });

  it('handles multiple lines in one chunk', () => {
    const lb = new LineBuffer();
    expect(lb.push('a\nb\nc\n')).toEqual(['a', 'b', 'c']);
  });

  it('strips a trailing carriage return', () => {
    const lb = new LineBuffer();
    expect(lb.push('hi\r\n')).toEqual(['hi']);
  });
});
