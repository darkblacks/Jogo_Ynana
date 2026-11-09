// Usado no build do Netlify: grava js/config.js com o valor da variável GACHAQUI_SERVER.
import { writeFileSync } from 'node:fs';

const url = (process.env.GACHAQUI_SERVER || '').trim().replace(/\/+$/, '');
if (!url) {
  console.log('GACHAQUI_SERVER não definida: mantendo js/config.js como está.');
} else {
  if (!/^(https?|wss?):\/\//.test(url)) {
    console.error(`GACHAQUI_SERVER inválida: "${url}". Use algo como https://1-2-3-4.sslip.io`);
    process.exit(1);
  }
  writeFileSync(
    new URL('./js/config.js', import.meta.url),
    `// Gerado no build a partir de GACHAQUI_SERVER.\nexport const SERVER_URL = ${JSON.stringify(url)};\n`,
  );
  console.log('js/config.js -> SERVER_URL =', url);
}
