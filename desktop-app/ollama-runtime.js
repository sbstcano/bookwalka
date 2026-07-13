const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const tar = require('tar');
const extractZip = require('extract-zip');

const UNSAFE_TAR_ENTRY_TYPES = new Set(['CharacterDevice', 'BlockDevice', 'FIFO']);


function assertSafeTarPath(entryPath) {
  const normalized = path.posix.normalize(entryPath);
  const pathParts = entryPath.split('/');

  if (
    !entryPath
    || path.posix.isAbsolute(entryPath)
    || pathParts.includes('..')
    || normalized === '..'
    || normalized.startsWith('../')
  ) {
    throw new Error(`Unsafe path in Ollama archive: ${entryPath}`);
  }
}

function assertSafeTarLink(entryPath, linkPath) {
  if (!linkPath) return;

  const targetPath = path.posix.normalize(
    path.posix.join(path.posix.dirname(entryPath), linkPath)
  );

  if (
    path.posix.isAbsolute(linkPath)
    || targetPath === '..'
    || targetPath.startsWith('../')
  ) {
    throw new Error(`Unsafe link in Ollama archive: ${entryPath} -> ${linkPath}`);
  }
}

async function assertSafeTarArchive(archivePath) {
  await tar.t({
    file: archivePath,
    strict: true,
    onentry: (entry) => {
      assertSafeTarPath(entry.path);
      assertSafeTarLink(entry.path, entry.linkpath);

      if (UNSAFE_TAR_ENTRY_TYPES.has(entry.type)) {
        throw new Error(`Unsupported entry type in Ollama archive: ${entry.type}`);
      }
    }
  });
}


async function extractArchive(archivePath, destination, archiveType) {
  if (archiveType === 'tar.zst') {
    const { decompressStream } = await import('zstd-stream');
    const decompressed = await decompressStream(
      Readable.toWeb(fs.createReadStream(archivePath))
    );
    await pipeline(
      Readable.fromWeb(decompressed),
      tar.x({ cwd: destination, strict: true, unlink: true })
    );
    return;
  }

  if (archiveType === 'tgz') {
    if (process.platform === 'darwin') {
      await assertSafeTarArchive(archivePath);
      await tar.x({ file: archivePath, cwd: destination, strict: true, preservePaths: true });
      return;
    }

    await tar.x({ file: archivePath, cwd: destination, strict: true, unlink: true });
    return;
  }

  if (archiveType === 'zip') {
    await extractZip(archivePath, { dir: destination });
    return;
  }

  throw new Error(`Unsupported Ollama archive type: ${archiveType}`);
}


module.exports = { extractArchive };
