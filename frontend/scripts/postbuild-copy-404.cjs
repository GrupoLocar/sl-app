// Copia dist/index.html para dist/404.html (fallback SPA) em qualquer SO
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'dist', 'index.html');
const dst = path.join(__dirname, '..', 'dist', '404.html');

try {
  fs.copyFileSync(src, dst);
  console.log(`postbuild: ${path.relative(process.cwd(), src)} -> ${path.relative(process.cwd(), dst)}`);
} catch (err) {
  console.error('postbuild: falha ao copiar index.html para 404.html');
  console.error(err);
  process.exit(1);
}
