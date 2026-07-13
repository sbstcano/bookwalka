const fs = require('fs');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const tar = require('tar');
const extractZip = require('extract-zip');


async function extractArchive(archivePath, destination, archiveType) {
  if (archiveType === 'tar.zst') {
    const { decompressStream } = await import('zstd-stream');
    const decompressed = await decompressStream(
      Readable.toWeb(fs.createReadStream(archivePath))
    );
    await pipeline(
      Readable.fromWeb(decompressed),
      tar.x({ cwd: destination, strict: true })
    );
    return;
  }

  if (archiveType === 'tgz') {
    await tar.x({ file: archivePath, cwd: destination, strict: true });
    return;
  }

  if (archiveType === 'zip') {
    await extractZip(archivePath, { dir: destination });
    return;
  }

  throw new Error(`Unsupported Ollama archive type: ${archiveType}`);
}


module.exports = { extractArchive };
