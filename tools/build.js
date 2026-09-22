// node tools/build.js — dist/index.html (всё в одном файле) + dist/teftelya.zip; прогоняет smoke по собранному файлу.
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const ROOT = path.join(__dirname, '..'), DIST = path.join(ROOT, 'dist');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const m = html.match(/<!-- src -->([\s\S]*?)<!-- \/src -->/);
if (!m) throw new Error('index.html: нет маркеров <!-- src --> … <!-- /src -->');
const files = [...m[1].matchAll(/<script src="src\/([^"]+)"><\/script>/g)].map(x => x[1]);
const code = files.map(f => {
  const p = path.join(ROOT, 'src', f);
  if (!fs.existsSync(p)) throw new Error('нет файла ' + p);
  return '// ---- ' + f + ' ----\n' + fs.readFileSync(p, 'utf8').replace(/^'use strict';\r?\n/, '');
}).join('\n');
const inline = '<script>\n(() => {\n\'use strict\';\n' + code + '\n})();\n</script>';
const out = html.replace(m[0], () => inline);
fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, 'index.html'), out);
execSync('node tools/smoke.js --dist', { cwd: ROOT, stdio: 'inherit' });
fs.rmSync(path.join(DIST, 'teftelya.zip'), { force: true });
execSync('zip -q -j dist/teftelya.zip dist/index.html', { cwd: ROOT, stdio: 'inherit' });
const kb = f => (fs.statSync(path.join(DIST, f)).size / 1024).toFixed(1) + ' КБ';
console.log('dist/index.html ' + kb('index.html') + ', dist/teftelya.zip ' + kb('teftelya.zip'));
