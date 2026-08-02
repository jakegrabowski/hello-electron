import './styles.css';
import type { DirEntry } from '../shared/api';

const button = document.querySelector<HTMLButtonElement>('#read-dir');
const status = document.querySelector<HTMLElement>('#status');
const listing = document.querySelector<HTMLUListElement>('#listing');

if (!button || !status || !listing) {
  throw new Error('Required DOM elements not found');
}

const renderListing = (dirPath: string, entries: DirEntry[]): void => {
  document.title = `Hello, Electron — ${dirPath}`;
  listing.innerHTML = '';
  for (const entry of entries) {
    const li = document.createElement('li');
    li.textContent = entry.name;
    li.className = entry.isDirectory ? 'dir' : 'file';
    listing.appendChild(li);
  }
};

button.addEventListener('click', async () => {
  button.disabled = true;
  status.textContent = 'Reading…';
  try {
    const { path: dirPath, entries } = await window.app.readDir();
    renderListing(dirPath, entries);
    status.textContent = `${entries.length} entries in ${dirPath}`;
  } catch (error) {
    status.textContent = `Error: ${(error as Error).message}`;
  } finally {
    button.disabled = false;
  }
});
