export interface DroppedFileWithRelativePath {
  file: File;
  relativePath?: string;
}

export interface DragDropScanResult {
  files: DroppedFileWithRelativePath[];
  emptyFolders: string[];
}

/**
 * Robust asynchronous directory reader for HTML5 FileSystem API.
 * Reads batches until directory stream is exhausted (Chrome limit is 100 entries per batch).
 */
async function readAllDirectoryEntries(dirReader: any): Promise<any[]> {
  const entries: any[] = [];
  while (true) {
    const batch: any[] = await new Promise((resolve, reject) => {
      dirReader.readEntries(resolve, reject);
    });
    if (!batch || batch.length === 0) break;
    entries.push(...batch);
  }
  return entries;
}

function isIgnoredEntry(name: string): boolean {
  return (
    name.startsWith('.') ||
    name === 'Thumbs.db' ||
    name === 'desktop.ini' ||
    name === '__pycache__' ||
    name === 'node_modules'
  );
}

/**
 * Recursively traverses a FileSystemEntry (file or directory)
 */
async function traverseFileSystemEntry(
  entry: any,
  basePath = '',
  collector: DroppedFileWithRelativePath[],
  emptyFolders: string[]
): Promise<void> {
  if (!entry || isIgnoredEntry(entry.name)) return;

  if (entry.isFile) {
    try {
      const file = await new Promise<File>((resolve, reject) => {
        entry.file(resolve, reject);
      });
      const relPath = basePath ? `${basePath}/${file.name}` : file.name;
      collector.push({ file, relativePath: relPath });
    } catch (err) {
      console.warn('Failed to read file from dropped entry:', entry.name, err);
    }
  } else if (entry.isDirectory) {
    const currentPath = basePath ? `${basePath}/${entry.name}` : entry.name;
    const dirReader = entry.createReader();
    try {
      const children = await readAllDirectoryEntries(dirReader);
      const validChildren = children.filter((child) => !isIgnoredEntry(child.name));

      if (validChildren.length === 0) {
        emptyFolders.push(currentPath);
      } else {
        for (const child of validChildren) {
          await traverseFileSystemEntry(child, currentPath, collector, emptyFolders);
        }
      }
    } catch (err) {
      console.warn('Failed to read directory entries:', currentPath, err);
    }
  }
}

/**
 * Parses drag & drop dataTransfer supporting dropped folders (recursive) and files.
 */
export async function parseDroppedItems(
  dataTransfer: DataTransfer
): Promise<DragDropScanResult> {
  const files: DroppedFileWithRelativePath[] = [];
  const emptyFolders: string[] = [];

  const items = dataTransfer.items;

  // Use webkitGetAsEntry if available (Chromium, Safari, Firefox)
  if (items && items.length > 0 && typeof (items[0] as any).webkitGetAsEntry === 'function') {
    const promises: Promise<void>[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const entry = (item as any).webkitGetAsEntry();
        if (entry) {
          promises.push(traverseFileSystemEntry(entry, '', files, emptyFolders));
        } else {
          const file = item.getAsFile();
          if (file) files.push({ file, relativePath: file.name });
        }
      }
    }

    await Promise.all(promises);
    return { files, emptyFolders };
  }

  // Fallback for environments without webkitGetAsEntry
  const rawFiles = Array.from(dataTransfer.files || []);
  for (const file of rawFiles) {
    files.push({ file, relativePath: (file as any).webkitRelativePath || file.name });
  }

  return { files, emptyFolders };
}
