import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(item => {
  if (['.git', 'node_modules', '.qa'].includes(item.name)) return [];
  const name = path.join(dir, item.name);
  return item.isDirectory() ? walk(name) : [name];
});
const files = walk('.');
let errors = 0;
for (const file of files) {
  if (/\.(m?js|cjs)$/.test(file)) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.status !== 0) { console.error(result.stderr); errors++; }
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)) {
      if (!fs.existsSync(path.resolve(path.dirname(file), match[1]))) { console.error('缺少模块', file, match[1]); errors++; }
    }
  }
  if (file.endsWith('.json')) { try { JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.error(file, e.message); errors++; } }
  if (file.endsWith('.html')) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)) {
      const result = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: match[1], encoding: 'utf8' });
      if (result.status !== 0) { console.error(file, result.stderr); errors++; }
    }
  }
}
if (errors) process.exitCode = 1;
else console.log(`语法、JSON、模块路径检查通过（${files.length} 个文件）`);
