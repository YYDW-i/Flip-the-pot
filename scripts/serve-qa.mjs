// 仅用于本地 WebGL 验证；此脚本和浏览器适配器都不会打包进小游戏。
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd(), port = 4173;
http.createServer((request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); } catch { response.writeHead(400).end(); return; }
  if (pathname === '/qa/capture' && request.method === 'POST') {
    const chunks = []; let size = 0;
    request.on('data', chunk => { size += chunk.length; if (size > 2000000) request.destroy(); else chunks.push(chunk); });
    request.on('end', () => {
      const png = Buffer.concat(chunks);
      if (png.length < 8 || png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') { response.writeHead(400).end(); return; }
      fs.mkdirSync(path.join(root, '.qa'), { recursive: true }); fs.writeFileSync(path.join(root, '.qa', 'preview.png'), png);
      response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }).end('已保存到 .qa/preview.png');
    });
    return;
  }
  if (pathname === '/') pathname = '/tests/browser.html';
  if (!pathname.startsWith('/js/') && !pathname.startsWith('/assets/audio/') && pathname !== '/tests/browser.html') { response.writeHead(404).end(); return; }
  const file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { response.writeHead(404).end(); return; }
  response.setHeader('Content-Type', file.endsWith('.html') ? 'text/html; charset=utf-8' : file.endsWith('.wav') ? 'audio/wav' : 'application/javascript; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store'); fs.createReadStream(file).pipe(response);
}).listen(port, '127.0.0.1', () => console.log('WebGL 验证页面：http://127.0.0.1:' + port));
