import type { DirEntry } from './api';

/**
 * Sort entries with directories first, then alphabetically by name.
 * Returns a new array; does not mutate the input.
 */
export const sortDirEntries = (entries: DirEntry[]): DirEntry[] =>
  [...entries].sort((a, b) =>
    a.isDirectory === b.isDirectory
      ? a.name.localeCompare(b.name)
      : a.isDirectory
        ? -1
        : 1,
  );
