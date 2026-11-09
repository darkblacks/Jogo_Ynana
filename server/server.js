// Gachaqui — servidor: entrega o site e conduz as partidas online por WebSocket.
//   npm install && npm start   →   http://localhost:8080
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { Lobby } from './online.js';
import { pendingDeciders } from '../js/engine.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = +process.env.PORT || 8080;
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
    if (url.pathname === '/health') { res.writeHead(200).end('ok'); return; }
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
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 16 * 1024 });

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

server.listen(PORT, () => console.log(`Gachaqui rodando em http://localhost:${PORT}`));
