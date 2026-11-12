// Copia o site (pasta frontend) para dentro do app (mobile/www).
// O app usa exatamente os mesmos arquivos do site: regras, IA, visual e modo online.
import { cpSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const origem = path.resolve(aqui, '../../frontend');
const destino = path.resolve(aqui, '../www');
if (!existsSync(path.join(origem, 'index.html'))) throw new Error('Não achei frontend/index.html');
rmSync(destino, { recursive: true, force: true });
cpSync(origem, destino, {
  recursive: true,
  // arquivos só do site/Netlify não vão para o app
  filter: (p) => !/(netlify\.toml|gerar-config\.mjs|sw\.js|\.nojekyll)$/.test(p),
});
console.log('Site copiado para', destino);
