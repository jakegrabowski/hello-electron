import { describe, it, expect } from 'vitest';
import { sortDirEntries } from './dir';
import type { DirEntry } from './api';

const entry = (name: string, isDirectory: boolean): DirEntry => ({
  name,
  isDirectory,
});

describe('sortDirEntries', () => {
  it('lists directories before files, each group alphabetical', () => {
    const input = [
      entry('zebra.txt', false),
      entry('mango', true),
      entry('apple.txt', false),
      entry('alpha', true),
    ];

    const result = sortDirEntries(input);

    expect(result.map((e) => e.name)).toEqual([
      'alpha',
      'mango',
      'apple.txt',
      'zebra.txt',
    ]);
  });

  it('does not mutate the input array', () => {
    const input = [entry('b', false), entry('a', true)];

    sortDirEntries(input);

    expect(input.map((e) => e.name)).toEqual(['b', 'a']);
  });
});
