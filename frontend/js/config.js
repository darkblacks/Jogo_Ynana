// Endereço do backend (servidor do modo online).
//
// - Vazio: usa o mesmo endereço onde o site está (quando o backend também entrega o site).
// - No Netlify: coloque o endereço do seu servidor, por exemplo:
//     export const SERVER_URL = 'https://1-2-3-4.sslip.io';
//   Se o site for publicado pelo Git, dá para não mexer aqui: crie no Netlify a variável
//   de ambiente GACHAQUI_SERVER com esse endereço, e o build gera este arquivo sozinho.
export const SERVER_URL = '';
