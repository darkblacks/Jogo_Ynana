// Endereço do backend (servidor do modo online).
//
// Padrão: o servidor de produção em https://gachaqui.duckdns.org.
// - Para rodar tudo localmente (backend entregando o site), deixe vazio: ''.
// - No Netlify, a variável de ambiente GACHAQUI_SERVER, se existir, substitui este valor no build.
export const SERVER_URL = 'https://gachaqui.duckdns.org';

// Endereço público do site: usado nos links de convite enviados de dentro do app.
export const PUBLIC_URL = 'https://gachaqui.netlify.app';

// Onde baixar o app Android (APK). Vazio = o botão "Baixar app" some.
export const APP_DOWNLOAD_URL = 'https://github.com/darkblacks/Jogo_Ynana/releases/latest/download/gachaqui.apk';
