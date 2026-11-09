import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.resolve(__dirname, '..', 'dist');
const htmlPath = path.join(distDir, 'index.html');

if (fs.existsSync(htmlPath)) {
  let html = fs.readFileSync(htmlPath, 'utf-8');
  const assetsDir = path.join(distDir, 'assets');

  if (fs.existsSync(assetsDir)) {
    const files = fs.readdirSync(assetsDir);
    const cssFile = files.find((f) => f.endsWith('.css'));
    const jsFile = files.find((f) => f.endsWith('.js'));

    if (cssFile) {
      const cssContent = fs.readFileSync(path.join(assetsDir, cssFile), 'utf-8');
      html = html.replace(/<link rel="stylesheet"[^>]*href="[^"]*"[^>]*>/, `<style>\n${cssContent}\n</style>`);
    }

    if (jsFile) {
      const jsContent = fs.readFileSync(path.join(assetsDir, jsFile), 'utf-8');
      html = html.replace(/<script type="module"[^>]*src="[^"]*"[^>]*><\/script>/, `<script type="module">\n${jsContent}\n</script>`);
    }

    const singleFilePath = path.join(distDir, 'standalone_index.html');
    fs.writeFileSync(singleFilePath, html, 'utf-8');
    console.log(`[build:singlefile] Successfully generated self-contained offline app: ${singleFilePath} (${Math.round(fs.statSync(singleFilePath).size / 1024)} KB)`);
  }
}
