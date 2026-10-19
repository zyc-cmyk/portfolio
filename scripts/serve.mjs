import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const prefix = `/${(process.argv[2] || '').replace(/^\/+|\/+$/g, '')}`.replace(/^\/$/, '');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf', '.mp4': 'video/mp4',
};

http.createServer((request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
  catch { response.writeHead(400).end(); return; }
  if (prefix && pathname !== prefix && !pathname.startsWith(`${prefix}/`)) {
    response.writeHead(404).end(); return;
  }
  const relative = pathname.slice(prefix.length).replace(/^\/+/, '') || 'index.html';
  const file = path.resolve(root, relative);
  if (!file.startsWith(`${root}${path.sep}`)) { response.writeHead(403).end(); return; }
  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) { response.writeHead(404).end(); return; }
    const type = mime[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const range = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if (range) {
      const start = Number(range[1]);
      const end = range[2] ? Math.min(Number(range[2]), stat.size - 1) : stat.size - 1;
      if (start >= stat.size || end < start) { response.writeHead(416, {'Content-Range': `bytes */${stat.size}`}).end(); return; }
      response.writeHead(206, {'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Content-Length': end - start + 1});
      fs.createReadStream(file, {start, end}).pipe(response);
    } else {
      response.writeHead(200, {'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Length': stat.size});
      fs.createReadStream(file).pipe(response);
    }
  });
}).listen(4173, '127.0.0.1', () => console.log(`预览地址：http://localhost:4173${prefix}/`));
