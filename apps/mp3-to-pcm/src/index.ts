import express from 'express';
import multer from 'multer';
import { execFile } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { randomUUID } from 'crypto';
import path from 'path';

const app = express();
const upload = multer();

app.post('/decode', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).send('Missing file');

  const tempName = randomUUID();
  const mp3Path = `/tmp/${tempName}.mp3`;
  const pcmPath = `/tmp/${tempName}.pcm`;

  try {
    await writeFile(mp3Path, req.file.buffer);

    await new Promise((resolve, reject) => {
      execFile('ffmpeg', [
        '-i', mp3Path,
        '-f', 's16le',          // raw 16-bit PCM
        '-acodec', 'pcm_s16le',
        '-ac', '1',             // mono
        '-ar', '48000',         // 48kHz
        pcmPath
      ], (err) => (err ? reject(err) : resolve(null)));
    });

    const buffer = await Bun.file(pcmPath).arrayBuffer();
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('[decode error]', err);
    res.status(500).send('Failed to decode');
  } finally {
    await unlink(mp3Path).catch(() => {});
    await unlink(pcmPath).catch(() => {});
  }
});

app.listen(3000, () => {
  console.log('🎧 MP3-to-PCM decoder listening on port 3000');
});

