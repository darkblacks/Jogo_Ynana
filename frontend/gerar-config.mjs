// Usado no build do Netlify: troca o SERVER_URL de js/config.js pelo valor da variável GACHAQUI_SERVER.
// (As outras configurações do arquivo ficam como estão.)
import { readFileSync, writeFileSync } from 'node:fs';

const url = (process.env.GACHAQUI_SERVER || '').trim().replace(/\/+$/, '');
const file = new URL('./js/config.js', import.meta.url);
if (!url) {
  console.log('GACHAQUI_SERVER não definida: mantendo js/config.js como está.');
} else {
  if (!/^(https?|wss?):\/\//.test(url)) {
    console.error(`GACHAQUI_SERVER inválida: "${url}". Use algo como https://1-2-3-4.sslip.io`);
    process.exit(1);
  }
  const src = readFileSync(file, 'utf8');
  const out = src.replace(/export const SERVER_URL = [^;]*;/, `export const SERVER_URL = ${JSON.stringify(url)};`);
  writeFileSync(file, out);
  console.log('js/config.js -> SERVER_URL =', url);
}
