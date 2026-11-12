// Integração com o app de celular (Capacitor).
// O mesmo código roda no navegador e no app: fora do app, estas funções não fazem nada
// (ou usam o equivalente da web, quando existe).

const CAP = window.Capacitor;
export const NATIVE = !!(CAP && CAP.isNativePlatform && CAP.isNativePlatform());
export const PLATFORM = NATIVE ? CAP.getPlatform() : 'web';
const plugin = (name) => (CAP && CAP.Plugins && CAP.Plugins[name]) || null;

const UA = navigator.userAgent || '';
export const IS_ANDROID_WEB = !NATIVE && /Android/i.test(UA);
export const IS_IOS_WEB = !NATIVE && /iPhone|iPad|iPod/i.test(UA);
export const IS_STANDALONE = window.matchMedia && (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches);

// Compartilhar o convite (abre o menu do WhatsApp, Telegram etc.)
export async function shareLink({ title, text, url }) {
  try {
    const Share = plugin('Share');
    if (Share) { await Share.share({ title, text, url, dialogTitle: 'Convidar para o Gachaqui' }); return true; }
    if (navigator.share) { await navigator.share({ title, text, url }); return true; }
  } catch { /* cancelado */ }
  return false;
}
export const canShare = () => !!plugin('Share') || !!navigator.share;

// Botão "voltar" do Android
export function onBackButton(fn) {
  const App = plugin('App');
  if (App) App.addListener('backButton', fn);
}
export function exitApp() {
  const App = plugin('App');
  if (App) App.exitApp();
}

// Voltou para o app / para a aba (para reconectar na hora)
export function onResume(fn) {
  const App = plugin('App');
  if (App) App.addListener('appStateChange', (st) => { if (st.isActive) fn(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') fn(); });
}

// Link de convite aberto pelo sistema: gachaqui://sala/CODIGO ou https://…/?sala=CODIGO
export function onDeepLink(fn) {
  const App = plugin('App');
  if (App) App.addListener('appUrlOpen', (e) => { const code = codeFromUrl(e.url); if (code) fn(code); });
}
export function codeFromUrl(url) {
  try {
    const u = new URL(url);
    const q = u.searchParams.get('sala');
    if (q) return q.toUpperCase();
    const m = (u.host + u.pathname).match(/sala\/([A-Za-z0-9]{4,8})/);
    return m ? m[1].toUpperCase() : null;
  } catch { return null; }
}

// No navegador do Android: abre o convite no app, se estiver instalado (senão continua no site)
export function appIntentUrl(code, fallbackUrl) {
  return `intent://sala/${encodeURIComponent(code)}#Intent;scheme=gachaqui;package=com.gachaqui.app;S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end`;
}

// Vibração curta nos golpes
export function buzz(strong = false) {
  const H = plugin('Haptics');
  if (H) { H.impact({ style: strong ? 'HEAVY' : 'LIGHT' }).catch(() => {}); return; }
  if (navigator.vibrate) navigator.vibrate(strong ? 60 : 20);
}

// Tela acesa durante a partida
let wakeLock = null;
export async function keepAwake(on) {
  try {
    if (on && !wakeLock && navigator.wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } else if (!on && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch { /* sem suporte */ }
}

// Ajustes de abertura do app
export function startNative() {
  if (!NATIVE) return;
  document.documentElement.classList.add('native', 'platform-' + PLATFORM);
  const SB = plugin('StatusBar');
  if (SB) {
    SB.setStyle({ style: 'DARK' }).catch(() => {});
    SB.setBackgroundColor({ color: '#12204a' }).catch(() => {});
  }
  const Splash = plugin('SplashScreen');
  if (Splash) setTimeout(() => Splash.hide().catch(() => {}), 300);
}

// Site instalável (PWA): abre em tela cheia e funciona sem internet (exceto o online)
export function registerServiceWorker() {
  if (NATIVE || !('serviceWorker' in navigator) || location.protocol !== 'https:') return;
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
