// Gachaqui — servidor do modo online (WebSocket) + endpoints HTTP.
// Também entrega o frontend, para quem quiser rodar tudo num lugar só.
//   cd backend && npm install && npm start   →   http://localhost:8080
//
// Endpoints:
//   GET  /health     → "ok" (para monitoramento)
//   GET  /api/info   → { ok, nome, versao, salas, jogadoresOnline, ws }
//   WS   /ws         → partidas online (mensagens JSON: create, join, rejoin, action, mare, steal, rematch, leave)
//
// Variáveis de ambiente:
//   PORT             porta (padrão 8080)
//   HOST             interface (padrão 0.0.0.0)
//   ALLOWED_ORIGINS  sites que podem conectar, separados por vírgula
//                    (padrão: https://gachaqui.netlify.app, prévias do Netlify e localhost)
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { Lobby } from './online.js';
import { pendingDeciders } from '../frontend/js/engine.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'frontend');
const PORT = +process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';
const VERSION = '1.1.0';
const ALLOWED = (process.env.ALLOWED_ORIGINS || 'https://gachaqui.netlify.app')
  .split(',').map((x) => x.trim().replace(/\/$/, '')).filter(Boolean);

// Quem pode usar o servidor: o site no Netlify (e as prévias dele), o próprio servidor e localhost.
function originAllowed(origin, host) {
  if (!origin) return true; // clientes que não são navegador
  let u;
  try { u = new URL(origin); } catch { return false; }
  if (u.host === host) return true;
  if (['localhost', '127.0.0.1'].includes(u.hostname)) return true;
  if (ALLOWED.includes('*') || ALLOWED.includes(u.origin)) return true;
  // prévias de deploy: https://<algo>--gachaqui.netlify.app
  return ALLOWED.some((a) => {
    try {
      const au = new URL(a);
      return au.hostname.endsWith('.netlify.app') && u.protocol === 'https:' && u.hostname.endsWith('--' + au.hostname);
    } catch { return false; }
  });
}
const PUBLIC = ['index.html', 'css', 'js', 'assets'];
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain' }).end('ok'); return; }
    if (url.pathname.startsWith('/api/')) {
      const origin = req.headers.origin;
      const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', Vary: 'Origin' };
      if (origin && originAllowed(origin, req.headers.host)) headers['Access-Control-Allow-Origin'] = origin;
      if (req.method === 'OPTIONS') { res.writeHead(204, { ...headers, 'Access-Control-Allow-Methods': 'GET' }).end(); return; }
      if (url.pathname === '/api/info') {
        res.writeHead(200, headers).end(JSON.stringify({
          ok: true,
          nome: 'Gachaqui',
          versao: VERSION,
          salas: lobby.rooms.size,
          jogadoresOnline: wss.clients.size,
          ws: '/ws',
        }));
        return;
      }
      res.writeHead(404, headers).end(JSON.stringify({ ok: false, erro: 'não encontrado' }));
      return;
    }
    let rel = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.resolve(ROOT, rel);
    const top = path.relative(ROOT, file).split(path.sep)[0];
    if (!file.startsWith(ROOT + path.sep) || !PUBLIC.includes(top)) throw Object.assign(new Error(), { code: 'ENOENT' });
    const st = await stat(file);
    if (!st.isFile()) throw Object.assign(new Error(), { code: 'ENOENT' });
    const ext = path.extname(file);
    res.writeHead(200, {
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.webp' ? 'public, max-age=86400' : 'no-cache',
    });
    res.end(await readFile(file));
  } catch (e) {
    res.writeHead(e.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(e.code === 'ENOENT' ? 'Não encontrado' : 'Erro');
  }
});

const lobby = new Lobby();
const wss = new WebSocketServer({
  server,
  path: '/ws',
  maxPayload: 16 * 1024,
  verifyClient: ({ origin, req }) => originAllowed(origin, req.headers.host),
});

const send = (ws, msg) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg)); };

function broadcast(room, events, opts = {}) {
  room.seats.forEach((seat, i) => {
    if (!seat || !seat.ws) return;
    // não interrompe quem ainda está escolhendo (ex.: os dois escolhendo carta na Maré)
    const stillDeciding = !events.length && !opts.force && room.state && room.state.phase !== 'over' && pendingDeciders(room.state).includes(i) && i !== opts.actor;
    if (stillDeciding) return;
    send(seat.ws, lobby.updateFor(room, i, events));
  });
}

function presence(room) {
  room.seats.forEach((seat, i) => {
    const opp = room.seats[1 - i];
    if (seat && seat.ws) send(seat.ws, { t: 'presence', opponentOnline: !!(opp && opp.ws), opponentName: opp ? opp.name : null });
  });
}

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => (ws.isAlive = true));
  let room = null, seat = -1;

  const attach = (r, s) => {
    const old = r.seats[s].ws;
    if (old && old !== ws) { send(old, { t: 'error', msg: 'Você abriu o jogo em outra aba.', fatal: true }); old.close(); }
    room = r; seat = s; r.seats[s].ws = ws; r.lastActive = Date.now();
  };

  ws.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(data); } catch { return; }
    try {
      switch (msg.t) {
        case 'create': {
          const r = lobby.create(msg.name);
          attach(r.room, 0);
          send(ws, { t: 'lobby', code: room.code, token: room.seats[0].token, names: [room.seats[0].name, null] });
          break;
        }
        case 'join': {
          const r = lobby.join(msg.code, msg.name);
          attach(r.room, 1);
          send(ws, { t: 'joined', code: room.code, token: room.seats[1].token });
          broadcast(room, room.lastEvents, { force: true });
          break;
        }
        case 'rejoin': {
          const r = lobby.rejoin(msg.code, msg.token);
          attach(r.room, r.seat);
          if (!room.state) send(ws, { t: 'lobby', code: room.code, token: msg.token, names: [room.seats[0].name, null] });
          else if (msg.v !== room.v) send(ws, lobby.updateFor(room, seat, [], { sync: true }));
          presence(room);
          break;
        }
        case 'action': case 'mare': case 'steal': case 'rematch': {
          if (!room) throw new Error('Entre numa sala primeiro.');
          const r = lobby.decide(room, seat, msg);
          if (r.waitingRematch) presence(room), broadcastRematch(room);
          else broadcast(room, r.events, { actor: seat, force: r.newGame });
          break;
        }
        case 'leave':
          if (room) { room.seats[seat].ws = null; presence(room); room = null; }
          break;
      }
    } catch (e) {
      send(ws, { t: 'error', msg: e.message || 'Erro' });
    }
  });

  ws.on('close', () => {
    if (room && room.seats[seat] && room.seats[seat].ws === ws) {
      room.seats[seat].ws = null;
      room.lastActive = Date.now();
      presence(room);
    }
  });
});

function broadcastRematch(room) {
  room.seats.forEach((s, i) => { if (s && s.ws) send(s.ws, { t: 'rematch', rematch: [room.rematch[i], room.rematch[1 - i]] }); });
}

// mantém as conexões vivas atrás de proxies e limpa salas abandonadas
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false;
    ws.ping();
  }
  lobby.sweep();
}, 30000).unref();

server.listen(PORT, HOST, () => {
  console.log(`Gachaqui ${VERSION} rodando em http://${HOST}:${PORT}`);
  console.log(`Origens permitidas: ${ALLOWED.join(', ')} (+ localhost e o próprio servidor)`);
});
