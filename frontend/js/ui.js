import * as E from './engine.js';
import { decideAction, chooseMareGive, chooseSteal, LEVELS } from './ai.js';
import * as T from './tournament.js';
import { RULES_HTML } from './rules.js';
import { SERVER_URL, PUBLIC_URL, APP_DOWNLOAD_URL } from './config.js';
import * as N from './native.js';
import { CHARACTERS, charById, lineFor, initials } from './characters.js';
import { tutorialState, TUTORIAL } from './tutorial.js';

const HUMAN = 0;
const AI = 1;
const SAVE_KEY = 'gachaqui.save.v1';

const $ = (s, r = document) => r.querySelector(s);
const h = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const img = (c) => (c.kind === 'mare' || c.kind === 'saque' ? `assets/cards/${c.kind}.webp` : `assets/cards/${c.kind}${c.v}.webp`);
const BN = E.BASE_NAMES;
const art = (b) => (b === 'torre' ? 'a' : 'o'); // "a Torre", "o Forte", "o Porto"

// ---------------- armazenamento ----------------
const store = {
  load() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch { return {}; } },
  save(d) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(d)); } catch { /* sem armazenamento */ } },
};
let SAVE = store.load();
let speed = +new URLSearchParams(location.search).get('speed') || SAVE.speed || 1;
const persist = () => store.save(SAVE);

// ---------------- navegação ----------------
let prevScreen = 'menu';
function go(name) {
  const cur = document.querySelector('.screen.active');
  if (cur && cur.id !== 'scr-rules') prevScreen = cur.id.replace('scr-', '');
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === 'scr-' + name));
  if (name === 'menu') refreshMenu();
  if (name === 'quick') renderLevels();
  N.keepAwake(name === 'game'); // tela acesa durante a partida
  window.scrollTo(0, 0);
}
document.addEventListener('click', (e) => {
  const g = e.target.closest('[data-go]');
  if (g) go(g.dataset.go);
  if (e.target.closest('[data-back]')) go(prevScreen);
  if (e.target.closest('[data-rules]')) go('rules');
});
$('#rules-body').innerHTML = RULES_HTML;

function refreshMenu() {
  $('#btn-tutorial').classList.toggle('new', !SAVE.tutDone);
  const b = $('#btn-continue');
  if (SAVE.game && SAVE.game.mode === 'quick') { b.hidden = false; b.textContent = 'Continuar partida'; }
  else if (SAVE.t && SAVE.t.champion == null) { b.hidden = false; b.textContent = 'Continuar torneio'; }
  else b.hidden = true;
}
$('#btn-continue').onclick = () => {
  if (SAVE.game && SAVE.game.mode === 'quick') resumeGame(SAVE.game);
  else if (SAVE.t) {
    if (SAVE.game && SAVE.game.mode === 'tournament') resumeGame(SAVE.game);
    else showBracket();
  }
};

// ---------------- personagens / partida rápida ----------------
const LV_COLOR = { facil: '#3d7a3a', medio: '#8a6a1c', dificil: '#7c1513', lendario: '#4b2a7a' };
const tierOf = (lv) => (typeof lv === 'string' ? lv : lv && lv.base) || 'medio';
const tierLabel = (lv) => (LEVELS[tierOf(lv)] || LEVELS.medio).label;

function avatarHtml(ch, cls = '') {
  if (ch && ch.avatar) return `<img class="ava ${cls}" src="${ch.avatar}" alt="">`;
  const bg = ch ? ch.color : '#a3211e';
  return `<span class="ava ini ${cls}" style="background:${bg}">${ch ? initials(ch) : 'V'}</span>`;
}

function renderLevels() {
  const g = $('#level-grid');
  g.innerHTML = '';
  const list = CHARACTERS.slice().sort((a, b) => (b.power || 0) - (a.power || 0));
  for (const ch of list) {
    const b = h('button', 'level-card char-card');
    b.innerHTML = `${avatarHtml(ch, 'big')}
      <span class="cc-body">
        <strong>${esc(ch.name)}</strong>
        <span class="d">${esc(ch.title)}</span>
        <span class="tags"><span class="badge lv-${tierOf(ch.ai)}">${tierLabel(ch.ai)}</span> <span class="badge style">${esc(ch.styleLabel)}</span></span>
      </span>`;
    b.onclick = () => startQuick(ch.id);
    g.append(b);
  }
}
function startQuick(charId) {
  const ch = charById(charId) || CHARACTERS[0];
  const names = [SAVE.playerName || 'Você', ch.name];
  startGame({ mode: 'quick', levels: [null, ch.ai], names, starter: Math.random() < 0.5 ? 0 : 1, charId: ch.id });
}

// ---------------- torneio ----------------
$('#in-name').value = SAVE.playerName || '';
$('#btn-tstart').onclick = () => {
  const name = $('#in-name').value.trim() || 'Capitão(ã)';
  const bestOf = +document.querySelector('input[name=bestof]:checked').value;
  SAVE.playerName = name;
  SAVE.t = T.createTournament(name, bestOf);
  SAVE.game = null;
  persist();
  showBracket();
};

function playerTag(t, idx, score, cls = '') {
  if (idx == null) return `<div class="b-p tbd"><span class="dot" style="background:#ccc"></span><span class="nm">a definir</span></div>`;
  const p = t.players[idx];
  const ch = p.charId ? charById(p.charId) : null;
  const title = p.human ? 'Você' : `${tierLabel(p.level)} — ${p.motto}`;
  const pic = p.human ? avatarHtml(null, 'sm') : ch ? avatarHtml(ch, 'sm') : `<span class="dot" style="background:${LV_COLOR[p.level]}"></span>`;
  return `<div class="b-p ${p.human ? 'you' : ''} ${cls}" title="${esc(title)}">${pic}<span class="nm">${esc(p.short || p.name)}</span><span class="sc">${score ?? ''}</span></div>`;
}

function showBracket(message) {
  const t = SAVE.t;
  go('bracket');
  $('#bracket-title').textContent = t.champion != null ? 'Torneio encerrado' : `Torneio — ${T.ROUND_NAMES[t.round]}`;
  $('#bracket-format').textContent = `Melhor de ${t.bestOf}`;
  const br = $('#bracket');
  br.innerHTML = '';
  const hm = T.humanMatch(t);
  T.ROUND_NAMES.forEach((rn, r) => {
    const col = h('div', 'b-col');
    col.append(h('h4', '', rn));
    const count = [4, 2, 1][r];
    for (let i = 0; i < count; i++) {
      const m = t.rounds[r] && t.rounds[r][i];
      const box = h('div', 'b-match' + (m && m === hm ? ' current' : ''));
      if (!m) box.innerHTML = playerTag(t, null) + playerTag(t, null);
      else {
        const started = m.games.length > 0;
        const cls = (side) => (m.winner == null ? '' : m.winner === (side ? m.b : m.a) ? 'win' : 'lose');
        box.innerHTML = playerTag(t, m.a, started ? m.wins[0] : '', cls(0)) + playerTag(t, m.b, started ? m.wins[1] : '', cls(1));
      }
      col.append(box);
    }
    br.append(col);
  });
  const champCol = h('div', 'b-col');
  champCol.append(h('h4', '', 'Campeão'));
  const cp = t.champion != null ? t.players[t.champion] : null;
  champCol.append(h('div', 'champ-box', `<div class="trophy">🏆</div><div class="nm">${cp ? esc(cp.name) : '?'}</div>`));
  br.append(champCol);

  const msg = $('#bracket-msg');
  const act = $('#bracket-actions');
  act.innerHTML = '';
  msg.innerHTML = message || '';
  if (t.champion != null) {
    if (!message) msg.innerHTML = cp.human ? '🏆 <b>Você é o(a) campeão(ã) do torneio!</b>' : `<b>${esc(cp.name)}</b> venceu o torneio.`;
    const nb = h('button', 'btn primary', 'Novo torneio');
    nb.onclick = () => go('tsetup');
    act.append(nb);
  } else if (hm) {
    const opp = t.players[hm.a === 0 || t.players[hm.a].human ? hm.b : hm.a];
    const side = t.players[hm.a].human ? 0 : 1;
    if (!message) msg.innerHTML = `Seu adversário: <b>${esc(opp.name)}</b> <span class="badge lv-${tierOf(opp.level)}">${tierLabel(opp.level)}</span> — <i>${esc(opp.motto)}</i>`;
    const label = hm.games.length ? `Continuar série (${hm.wins[side]} x ${hm.wins[1 - side]})` : 'Jogar';
    const pb = h('button', 'btn primary big', label);
    pb.onclick = () => (SAVE.game && SAVE.game.mode === 'tournament' ? resumeGame(SAVE.game) : startTournamentGame());
    act.append(pb);
  } else {
    if (!message) msg.innerHTML = 'Você foi eliminado(a). Acompanhe o resto do torneio.';
    const sb = h('button', 'btn sea', t.round < 2 || !T.roundDone(t) ? 'Simular próxima rodada' : 'Ver final');
    sb.onclick = () => simulateRoundUI();
    act.append(sb);
  }
}

function simulateRoundUI() {
  const t = SAVE.t;
  $('#bracket-msg').textContent = 'Simulando partidas…';
  setTimeout(() => {
    T.simulatePendingAI(t);
    T.advance(t);
    if (!T.humanMatch(t) && t.champion == null) {
      // jogador eliminado: deixa a próxima rodada pronta para simular
    }
    persist();
    showBracket();
  }, 30);
}

function startTournamentGame() {
  const t = SAVE.t;
  const m = T.humanMatch(t);
  const humanSide = t.players[m.a].human ? 0 : 1;
  const opp = t.players[humanSide === 0 ? m.b : m.a];
  const starterSide = T.nextStarterSide(m);
  startGame({
    mode: 'tournament',
    levels: [null, T.profileOf(opp)],
    charId: opp.charId,
    names: [t.players[humanSide === 0 ? m.a : m.b].name, opp.name],
    starter: starterSide === humanSide ? HUMAN : AI,
  });
}

function afterTournamentGame(winner, turns, quote = '') {
  const t = SAVE.t;
  const m = T.humanMatch(t);
  const humanSide = t.players[m.a].human ? 0 : 1;
  const opp = t.players[humanSide === 0 ? m.b : m.a];
  const winnerSide = winner === HUMAN ? humanSide : 1 - humanSide;
  T.recordGame(t, m, winnerSide, turns);
  SAVE.game = null;
  persist();
  const my = m.wins[humanSide], their = m.wins[1 - humanSide];
  if (m.winner == null) {
    showModal(`
      <h2 class="big-title">${winner === HUMAN ? 'Vitória!' : 'Derrota'}</h2>
      ${quote}
      <p class="score-line">Você ${my} x ${their} ${esc(opp.name)}</p>
      <p>Série melhor de ${t.bestOf}: quem fizer ${T.winsNeeded(t)} vitória(s) avança.</p>
      <div class="row center"><button class="btn ghost" id="m-br">Ver chave</button><button class="btn primary" id="m-next">Próxima partida</button></div>`);
    $('#m-next').onclick = () => { hideModal(); startTournamentGame(); };
    $('#m-br').onclick = () => { hideModal(); showBracket(); };
    return;
  }
  const won = m.winner !== null && t.players[m.winner].human;
  const round = T.ROUND_NAMES[t.round];
  showModal(`<h2 class="big-title">${won ? (t.round === 2 ? 'Campeão!' : 'Você avançou!') : 'Eliminado'}</h2>
    ${quote}
    <p class="score-line">Você ${my} x ${their} ${esc(opp.name)}</p>
    <p>Simulando os outros duelos da ${round.toLowerCase()}…</p>`);
  setTimeout(() => {
    T.simulatePendingAI(t);
    T.advance(t);
    persist();
    hideModal();
    let msg;
    if (t.champion != null) msg = t.players[t.champion].human ? '🏆 <b>Você é o(a) campeão(ã) do torneio!</b>' : `<b>${esc(t.players[t.champion].name)}</b> venceu o torneio.`;
    else if (won) msg = `Você venceu <b>${esc(opp.name)}</b> por ${my} x ${their}. Próxima fase: <b>${T.ROUND_NAMES[t.round]}</b>!`;
    else msg = `<b>${esc(opp.name)}</b> venceu por ${their} x ${my}. Você foi eliminado(a) — acompanhe o resto do torneio.`;
    showBracket(msg);
  }, 60);
}

// ---------------- partida ----------------
let G = null; // { mode, levels, names, state, log }
let selected = null;
let awaiting = null; // 'action' | 'mare' | 'steal' | null
let resolver = null;
let newIds = new Set();
let lastDefended = null;
let runToken = 0;

async function startGame({ mode, levels, names, starter, charId }) {
  const state = E.newGame({ names, starter });
  G = { mode, levels, names, state, log: [], charId: charId || null };
  const initial = state.initialEvents;
  delete state.initialEvents;
  enterGame();
  const ch = oppChar();
  if (ch) await showVersus(ch, starter);
  logLine(`Partida começou. ${starter === HUMAN ? 'Você começa' : esc(names[AI]) + ' começa'}.`, 'big');
  say('start', true);
  run(initial);
}

const oppChar = () => (G && G.charId ? charById(G.charId) : null);

function showVersus(ch, starter) {
  return new Promise((resolve) => {
    const line = lineFor(ch, 'intro');
    const extra = G.mode === 'tournament' ? `<div class="vs-round">${esc(seriesText())}</div>` : '';
    const pic = ch.bust ? `<img class="vs-bust" src="${ch.bust}" alt="">` : avatarHtml(ch, 'huge');
    showModal(`<div class="versus">
      ${extra}
      <div class="vs-pic" style="--c:${ch.color}">${pic}</div>
      <h2 class="vs-name">${esc(ch.name)}</h2>
      <div class="vs-title">${esc(ch.title)}</div>
      <div class="tags center"><span class="badge lv-${tierOf(ch.ai)}">${tierLabel(ch.ai)}</span> <span class="badge style">${esc(ch.styleLabel)}</span></div>
      ${line ? `<blockquote class="vs-quote">“${esc(line)}”</blockquote>` : ''}
      <p class="vs-blurb">${esc(ch.blurb)}</p>
      <p class="vs-start">${starter === HUMAN ? 'Você começa.' : esc(ch.short) + ' começa.'}</p>
      <div class="row center"><button class="btn primary big" id="vs-go">Jogar</button></div>
    </div>`);
    $('#vs-go').onclick = () => { hideModal(); resolve(); };
  });
}

// Fala do personagem: balão no topo + histórico
let speechTimer;
function say(situation, force = false) {
  const ch = oppChar();
  if (!ch || G.mode === 'tutorial') return;
  if (!force && Math.random() > 0.7) return;
  const line = lineFor(ch, situation);
  if (!line) return;
  const b = $('#speech');
  b.innerHTML = `<b>${esc(ch.short)}:</b> ${esc(line)}`;
  b.classList.remove('show');
  void b.offsetWidth;
  b.classList.add('show');
  clearTimeout(speechTimer);
  speechTimer = setTimeout(() => b.classList.remove('show'), Math.max(2600, 3400 * speed));
  logLine(`<i>${esc(ch.short)}: “${esc(line)}”</i>`, 'say');
}

function resumeGame(g) {
  G = g;
  enterGame();
  run([]);
}

function enterGame() {
  go('game');
  selected = null; awaiting = null; newIds = new Set();
  buildBoard();
  const lv = G.levels[AI];
  const crest = $('#opp-crest');
  const ch = oppChar();
  if (ch && ch.avatar) { crest.innerHTML = `<img src="${ch.avatar}" alt="">`; crest.style.background = ch.color; }
  else {
    crest.textContent = ch ? initials(ch) : G.names[AI].replace(/^(O|A|Dona|Capitão|Corsária|Baronesa|Mestre|Marujo|IA)\s+/i, '').charAt(0).toUpperCase();
    crest.style.background = ch ? ch.color : LV_COLOR[tierOf(lv)] || '#1d7d7a';
  }
  $('#speech').classList.remove('show');
  $('#scr-game').classList.toggle('tutorial', G.mode === 'tutorial');
  $('#opp-name').textContent = G.names[AI];
  $('#hud-series').innerHTML = seriesText();
  $('#log-list').innerHTML = '';
  for (const l of G.log) appendLog(l);
  $('#btn-speed').textContent = speedLabel();
}

function seriesText() {
  if (G.mode === 'tutorial') return 'Tutorial';
  if (G.mode === 'online') return `Contra um amigo · Placar ${G.score ? G.score[0] + ' x ' + G.score[1] : '0 x 0'}`;
  if (G.mode !== 'tournament' || !SAVE.t) return 'Partida rápida';
  const t = SAVE.t;
  const m = T.humanMatch(t);
  if (!m) return '';
  const hs = t.players[m.a].human ? 0 : 1;
  return `${T.ROUND_NAMES[t.round]} · Jogo ${m.games.length + 1} · ${m.wins[hs]} x ${m.wins[1 - hs]}`;
}

const SPEEDS = [1, 0.5, 1.7];
const speedLabel = () => ({ 1: 'Normal', 0.5: 'Rápido', 1.7: 'Lento' })[speed] || 'Normal';
$('#btn-speed').onclick = () => {
  speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
  SAVE.speed = speed; persist();
  $('#btn-speed').textContent = speedLabel();
};
$('#btn-log').onclick = () => $('#log').classList.toggle('open');
$('#btn-quit').onclick = () => {
  if (G.mode === 'tutorial') { tutQuit(); return; }
  if (G.mode === 'online') {
    const live = G.state && G.state.phase !== 'over';
    showModal(`<h2>Partida online</h2><p>Sala <b>${esc(G.code)}</b>. Se você sair, a sala espera você por 30 segundos: dá para voltar pelo mesmo link ou digitando o código. Depois disso, ${esc(G.names[AI])} vence por abandono e a sala fecha.</p>
      <div class="row center">
        <button class="btn ghost" id="q-rules">Regras</button>
        <button class="btn ghost" id="q-menu">Sair da sala</button>
        ${live ? '<button class="btn ghost danger" id="q-surr">Render-se</button>' : ''}
        <button class="btn primary" id="q-back">Continuar</button></div>`);
    $('#q-back').onclick = hideModal;
    if (live) $('#q-surr').onclick = () => confirmSurrender(() => sendNet({ t: 'surrender' }));
    $('#q-rules').onclick = () => { hideModal(); go('rules'); };
    $('#q-menu').onclick = () => { hideModal(); leaveOnline(); go('menu'); };
    return;
  }
  const live = G.state && G.state.phase !== 'over';
  showModal(`<h2>Pausa</h2><p>A partida fica salva neste navegador.</p>
    <div class="row center">
      <button class="btn ghost" id="q-rules">Regras</button>
      <button class="btn ghost" id="q-menu">Sair para o menu</button>
      ${G.mode === 'tournament' ? '<button class="btn ghost" id="q-br">Ver chave</button>' : ''}
      ${live ? '<button class="btn ghost danger" id="q-surr">Render-se</button>' : ''}
      <button class="btn primary" id="q-back">Continuar</button></div>`);
  $('#q-back').onclick = hideModal;
  if (live) $('#q-surr').onclick = () => confirmSurrender(surrenderLocal);
  $('#q-rules').onclick = () => { hideModal(); go('rules'); };
  $('#q-menu').onclick = () => { hideModal(); runToken++; go('menu'); };
  const br = $('#q-br');
  if (br) br.onclick = () => { hideModal(); runToken++; showBracket(); };
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms * speed));

function confirmSurrender(doIt) {
  const extra = G.mode === 'tournament' ? ' No torneio, conta como derrota neste jogo da série.' : '';
  showModal(`<h2>Render-se?</h2><p>${esc(G.names[AI])} vence esta partida.${extra}</p>
    <div class="row center"><button class="btn ghost" id="sr-no">Continuar jogando</button><button class="btn primary" id="sr-yes">Render-se</button></div>`);
  $('#sr-no').onclick = hideModal;
  $('#sr-yes').onclick = () => { hideModal(); doIt(); };
}

async function surrenderLocal() {
  if (!G || G.state.phase === 'over') return;
  runToken++; // para o turno em andamento
  awaiting = null; resolver = null; promptCancel = null; selected = null;
  const ev = E.forfeit(G.state, HUMAN, 'surrender');
  logLine('Você se rendeu.', 'big');
  await play(ev);
  finishGame();
}

const endReasonText = (s, oppName) => {
  if (s.endReason === 'surrender') return s.winner === HUMAN ? `${esc(oppName)} se rendeu.` : 'Você se rendeu.';
  if (s.endReason === 'abandon') return s.winner === HUMAN ? `${esc(oppName)} saiu e não voltou a tempo.` : 'Você saiu e não voltou a tempo.';
  if (s.endReason === 'limit') return 'Limite de turnos atingido.';
  return '';
};

function saveGame() {
  if (G.mode === 'quick' || G.mode === 'tournament') {
    G.log = G.log.slice(-250);
    SAVE.game = G;
    persist();
  }
}

async function run(initialEvents) {
  const token = ++runToken;
  const alive = () => token === runToken && document.querySelector('#scr-game.active');
  await play(initialEvents);
  while (alive()) {
    const s = G.state;
    render();
    saveGame();
    if (s.phase === 'over') { finishGame(); return; }
    const who = E.pendingDeciders(s);
    if (s.phase === 'mare') {
      for (const p of who) {
        if (p === AI && s.phase === 'mare') await play(E.mareGive(s, AI, chooseMareGive(E.viewFor(s, AI), G.levels[AI])));
      }
      if (s.phase === 'mare' && E.pendingDeciders(s).includes(HUMAN)) {
        const id = await askMare();
        if (!alive()) return;
        await play(E.mareGive(s, HUMAN, id));
      }
      continue;
    }
    if (s.phase === 'steal') {
      if (s.steal.to === HUMAN) {
        const idx = await askSteal(s.players[AI].hand.length, s.steal && s.steal.source);
        if (!alive()) return;
        await play(E.stealPick(s, idx));
      } else {
        await wait(500);
        await play(E.stealPick(s, chooseSteal(E.viewFor(s, AI))));
      }
      continue;
    }
    if (s.phase === 'action') {
      if (s.current === HUMAN) {
        const a = await askAction();
        if (!alive()) return;
        if (a.type !== 'retrieve') newIds = new Set();
        await play(E.act(s, a));
      } else {
        await wait(750);
        if (!alive()) return;
        // deixa a tela atualizar antes de a IA "pensar"
        await new Promise((r) => setTimeout(r, 20));
        const a = decideAction(s, AI, G.levels[AI]);
        await play(E.act(s, a));
      }
    }
  }
}

let promptCancel = null; // cancela a escolha aberta (online: chegou estado mais novo)
function askAction() {
  awaiting = 'action';
  render();
  return new Promise((r) => {
    resolver = r;
    promptCancel = () => { awaiting = null; selected = null; resolver = null; r(null); };
  });
}
function submit(a) {
  if (awaiting !== 'action' || !E.isLegal(G.state, a)) return;
  if (G.expect && !tutMatches(a, G.expect)) { tutNudge(); selected = null; render(); return; }
  awaiting = null;
  selected = null;
  const r = resolver; resolver = null; promptCancel = null;
  r(a);
}

// ---------------- eventos -> animação + histórico ----------------
const nameOf = (p) => (p === HUMAN ? 'Você' : G.names[AI]);
async function play(events) {
  for (const ev of events) {
    const me = ev.p === HUMAN;
    switch (ev.t) {
      case 'turn':
        logLine(`${me ? 'Seu turno' : 'Turno de ' + esc(G.names[AI])} (${ev.turn})`, 'turn');
        if (!me) zone(`Vez de ${G.names[AI]}`);
        else zone('Seu turno');
        break;
      case 'bonusStart':
        logLine(`${me ? 'Você tem' : esc(G.names[AI]) + ' tem'} <b>2 ações</b> neste turno!`, 'big' + (me ? ' me' : ''));
        toast(me ? 'Você tem 2 ações neste turno!' : `${G.names[AI]} tem 2 ações neste turno!`, me ? '' : 'red');
        if (!me) say('bonus');
        break;
      case 'draw':
        if (me) { newIds.add(ev.card.id); logLine(`Você comprou ${E.cardName(ev.card)}.`, 'me'); }
        else logLine(`${esc(G.names[AI])} comprou uma carta.`);
        break;
      case 'deckEmpty':
        logLine(`${me ? 'Seu baralho' : 'O baralho de ' + esc(G.names[AI])} está vazio.`);
        break;
      case 'expire':
        logLine(me ? `Sua defesa n${art(ev.base)} ${BN[ev.base]} (${E.cardName(ev.card)}) completou 2 turnos e voltou ao baralho.` : `A defesa d${art(ev.base)} ${BN[ev.base]} de ${esc(G.names[AI])} expirou.`, me ? 'me' : '');
        break;
      case 'defend': {
        lastDefended = { p: ev.p, base: ev.base };
        const vis = E.defenseVisible(G.state.players[ev.p], ev.base);
        logLine(me ? `Você defendeu ${art(ev.base)} ${BN[ev.base]} com ${E.cardName(ev.card)}.` : `${esc(G.names[AI])} pôs uma defesa atrás d${art(ev.base)} ${BN[ev.base]}${vis ? ` (visível: ${E.cardName(ev.card)})` : ''}.`, me ? 'me' : '');
        if (!me) { render(); zone(`${G.names[AI]} defendeu ${art(ev.base)} ${BN[ev.base]}`); await wait(900); }
        break;
      }
      case 'store':
        logLine(me ? `Você guardou ${E.cardName(ev.card)} na Torre.` : `${esc(G.names[AI])} guardou uma carta na Torre.`, me ? 'me' : '');
        if (!me) { render(); zone(`${G.names[AI]} guardou uma carta na Torre`); await wait(900); }
        break;
      case 'retrieve':
        if (me) newIds.add(ev.card.id);
        logLine(me ? `Você pegou ${E.cardName(ev.card)} de volta da Torre.` : `${esc(G.names[AI])} pegou a carta guardada na Torre.`, me ? 'me' : '');
        if (!me) { render(); zone(`${G.names[AI]} pegou a carta da Torre`); await wait(700); }
        break;
      case 'drawAction':
        logLine(`${me ? 'Você comprou' : esc(G.names[AI]) + ' comprou'} uma carta como ação.`, me ? 'me' : '');
        if (!me) { render(); zone(`${G.names[AI]} comprou uma carta`); await wait(800); }
        break;
      case 'saqueReveal':
        logLine(`💰 <b>Saque!</b> ${me ? 'Você' : esc(G.names[AI])} ${ev.source === 'draw' ? 'comprou' : 'usou'} um Saque.`, 'big');
        render();
        await showSaqueBanner(ev);
        if (!me) say('steal');
        break;
      case 'saqueEmpty':
        logLine(`O Saque não pegou nada: ${me ? esc(G.names[AI]) + ' está' : 'você está'} sem cartas na mão.`);
        break;
      case 'mareReveal':
        logLine(`🌊 <b>Maré!</b> ${me ? 'Você' : esc(G.names[AI])} ${ev.source === 'draw' ? 'comprou' : 'usou'} uma Maré.`, 'big');
        render();
        await showMareBanner(ev);
        say('mare');
        break;
      case 'mareSwap': {
        const [mine, theirs] = ev.gave; // mine = carta que o humano deu; theirs = a que a IA deu
        if (theirs) newIds.add(theirs.id);
        const txt = `Troca da Maré: você entregou ${mine ? E.cardName(mine) : 'nada'} e recebeu ${theirs ? E.cardName(theirs) : 'nada'}.`;
        logLine(txt, 'me');
        render();
        await showSwap(mine, theirs);
        break;
      }
      case 'combat':
        logCombat(ev);
        await showCombat(ev);
        if (ev.p === AI) say(ev.result === 'hit' || ev.result === 'pierce' ? (ev.fell ? 'fell' : 'hit') : 'blocked', ev.fell);
        else say(ev.result === 'hit' || ev.result === 'pierce' ? (ev.fell ? 'lost' : 'hurt') : 'defended', ev.fell || ev.result === 'repel');
        break;
      case 'steal':
        if (ev.to === HUMAN) { newIds.add(ev.card.id); logLine(`Você pegou ${E.cardName(ev.card)} da mão de ${esc(G.names[AI])}${ev.source === 'saque' ? ' com o Saque' : ''}.`, 'me big'); toast(`Você pegou ${E.cardName(ev.card)}!`, 'sea'); }
        else { logLine(`${esc(G.names[AI])} pegou ${E.cardName(ev.card)} da sua mão.`, 'big'); toast(`${G.names[AI]} pegou ${E.cardName(ev.card)} da sua mão!`, 'red'); say('steal', true); }
        render();
        await wait(600);
        break;
      case 'win':
        logLine(ev.p === HUMAN ? '🏆 Você venceu!' : `${esc(G.names[AI])} venceu.`, 'big');
        break;
    }
  }
  render();
}

function logCombat(ev) {
  const me = ev.p === HUMAN;
  const who = me ? 'Você' : esc(G.names[AI]);
  const tgt = `${art(ev.base)} ${BN[ev.base]}${me ? ' de ' + esc(G.names[AI]) : ''}`;
  let s = `${who} atacou ${tgt} com ${E.cardName(ev.atk)}`;
  s += ev.def ? ` contra ${E.cardName(ev.def)}: ` : ' (sem defesa): ';
  s += { hit: 'acertou!', pierce: 'atravessou e acertou!', block: 'empate, golpe anulado.', repel: 'golpe anulado — o defensor terá 2 ações.' }[ev.result];
  if (ev.fell) s += ` <b>${BN[ev.base]} caiu!</b>`;
  else if (ev.damaged) s += ' O Forte ficou danificado.';
  logLine(s, ev.fell ? 'big' : me ? 'me' : '');
}

function logLine(html, cls = '') {
  const l = { html, cls };
  G.log.push(l);
  appendLog(l);
}
function appendLog(l) {
  const li = h('li', l.cls, l.html);
  const list = $('#log-list');
  list.append(li);
  const box = $('#log');
  box.scrollTop = box.scrollHeight;
}

let zoneTimer;
function zone(text, ms = 1400) {
  const z = $('#zone-msg');
  z.textContent = text;
  z.classList.add('show');
  clearTimeout(zoneTimer);
  zoneTimer = setTimeout(() => z.classList.remove('show'), ms * speed + 300);
}

function toast(text, cls = '') {
  const t = h('div', 'toast ' + cls, esc(text));
  $('#toasts').append(t);
  setTimeout(() => t.remove(), 2800);
}

// ---------------- tabuleiro ----------------
const POS = {
  [AI]: {
    def: { forte: [493, 140], torre: [767, 135], porto: [1047, 140] },
    atk: { forte: [496, 376], torre: [771, 388], porto: [1050, 376] },
    base: { forte: [365, 150, 605, 325], torre: [645, 110, 885, 325], porto: [910, 155, 1200, 325] },
    stored: [690, 325, 850, 358],
    deck: [220, 180, 345, 365],
    plate: [724, 35],
  },
  [HUMAN]: {
    atk: { forte: [467, 681], torre: [736, 681], porto: [1001, 681] },
    def: { forte: [467, 927], torre: [741, 937], porto: [1027, 927] },
    base: { forte: [340, 700, 600, 880], torre: [615, 660, 860, 880], porto: [880, 700, 1170, 880] },
    stored: [655, 865, 820, 898],
    deck: [165, 720, 310, 905],
    plate: [724, 1023],
  },
};
const PX = (x) => (x / 1448) * 100 + '%';
const PY = (y) => (y / 1086) * 100 + '%';
function placeRect(e, [x1, y1, x2, y2]) {
  Object.assign(e.style, { left: PX(x1), top: PY(y1), width: PX(x2 - x1), height: PY(y2 - y1) });
}
function placeAt(e, [x, y]) {
  Object.assign(e.style, { left: PX(x), top: PY(y) });
}

const boardEls = { 0: {}, 1: {} };
function buildBoard() {
  const b = $('#board');
  b.querySelectorAll('.ov, .slot, .plate').forEach((e) => e.remove());
  for (const p of [HUMAN, AI]) {
    const P = POS[p];
    const els = (boardEls[p] = { base: {}, def: {} });
    for (const base of E.BASES) {
      const hit = h('div', 'ov base-hit');
      placeRect(hit, P.base[base]);
      hit.dataset.p = p;
      hit.dataset.base = base;
      hit.onclick = () => onBaseClick(p, base);
      b.append(hit);
      els.base[base] = hit;
      const d = h('div', 'slot');
      placeAt(d, P.def[base]);
      b.append(d);
      els.def[base] = d;
    }
    const st = h('div', 'ov stored');
    placeRect(st, P.stored);
    st.onclick = () => { if (p === HUMAN) submit({ type: 'retrieve' }); };
    b.append(st);
    els.stored = st;
    const dk = h('div', 'ov deck-count');
    placeRect(dk, P.deck);
    b.append(dk);
    els.deck = dk;
    const pl = h('div', 'plate ' + (p === AI ? 'top' : 'bot'));
    placeAt(pl, P.plate);
    b.append(pl);
    els.plate = pl;
  }
}

function onBaseClick(p, base) {
  if (awaiting !== 'action' || !selected) return;
  const card = G.state.players[HUMAN].hand.find((c) => c.id === selected);
  if (!card) return;
  if (card.kind === 'atk' && p === AI) submit({ type: 'attack', cardId: card.id, base });
  else if (card.kind === 'def' && p === HUMAN) submit({ type: 'defend', cardId: card.id, base });
}

const CRACK = `<svg class="crack" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M48 0 L52 22 L40 38 L55 55 L45 72 L58 100" stroke="#1a0d05" stroke-width="2.4" fill="none" stroke-linejoin="round"/><path d="M52 22 L68 30 M40 38 L26 44 M55 55 L72 60" stroke="#1a0d05" stroke-width="1.6" fill="none"/></svg>`;

function render() {
  if (!G) return;
  const s = G.state;
  const me = s.players[HUMAN];
  const op = s.players[AI];
  const selCard = selected ? me.hand.find((c) => c.id === selected) : null;
  if (selected && !selCard) selected = null;

  for (const p of [HUMAN, AI]) {
    const pl = s.players[p];
    const els = boardEls[p];
    for (const b of E.BASES) {
      const x = pl.bases[b];
      const hit = els.base[b];
      hit.className = 'ov base-hit';
      hit.innerHTML = '';
      if (x.hp <= 0) {
        hit.classList.add('fallen');
        hit.innerHTML = `<span class="stamp">${b === 'torre' ? 'CAÍDA' : 'CAÍDO'}</span>`;
      } else if (b === 'forte' && x.hp === 1) {
        hit.innerHTML = CRACK + '<span class="dmg-badge">Danificado</span>';
      }
      // alvos possíveis
      if (awaiting === 'action' && selCard && x.hp > 0) {
        if (selCard.kind === 'atk' && p === AI) hit.classList.add('target', 'atk');
        if (selCard.kind === 'def' && p === HUMAN && !x.def) hit.classList.add('target', 'def');
      }
      hit.title = `${BN[b]} de ${pl.name}` + (x.hp <= 0 ? ' — caiu' : b === 'forte' ? ` — ${x.hp}/2 de resistência` : '');
      // defesa
      const slot = els.def[b];
      slot.innerHTML = '';
      if (x.def) {
        const visible = p === HUMAN || E.defenseVisible(pl, b);
        const mc = h('div', 'mcard' + (visible ? '' : ' back'));
        if (visible) mc.style.backgroundImage = `url(${img(x.def.card)})`;
        const lives = [0, 1].map((i) => `<i class="${i < x.def.life ? '' : 'off'}"></i>`).join('');
        mc.innerHTML = `<span class="life" title="Turnos restantes">${lives}</span>`;
        if (p === HUMAN) mc.innerHTML += E.defenseVisible(pl, b) ? '<span class="eye">visível</span>' : '<span class="eye" title="O adversário não vê">oculta</span>';
        else if (visible) mc.innerHTML += '<span class="eye">visível</span>';
        if (lastDefended && lastDefended.p === p && lastDefended.base === b) { mc.classList.add('defend-in'); }
        if (visible) hoverPreview(mc, x.def.card);
        slot.append(mc);
      }
    }
    lastDefended = null;
    // Torre
    const st = els.stored;
    const stored = pl.bases.torre.stored;
    st.className = 'ov stored' + (stored ? ' has' : '');
    st.innerHTML = '';
    st.title = stored ? (p === HUMAN ? `Guardada: ${E.cardName(stored)}` : 'Uma carta guardada') : 'Torre vazia';
    if (stored && p === HUMAN) {
      if (awaiting === 'action' && E.isLegal(s, { type: 'retrieve' })) {
        st.classList.add('can');
        st.title += ' — clique para pegar de volta (grátis)';
      }
      const tip = h('div', 'tip');
      tip.innerHTML = `<div class="mcard" style="background-image:url(${img(stored)})"></div>`;
      hoverPreview(tip.firstChild, stored);
      st.append(tip);
    }
    els.deck.innerHTML = `<span title="Cartas no baralho">${pl.deck.length}</span>`;
    els.plate.textContent = pl.name;
    els.plate.classList.toggle('active', s.current === p && s.phase !== 'over');
  }

  // HUD do adversário
  const lv = G.levels[AI];
  const tag = G.mode === 'online'
    ? `<span class="badge lv-online"><span class="net ${G.oppOnline ? '' : 'off'}"></span>${G.oppOnline ? 'online' : 'desconectado'}</span>`
    : `<span class="badge lv-${tierOf(lv)}">${tierLabel(lv)}</span>${oppChar() ? ` <span class="badge style">${esc(oppChar().styleLabel)}</span>` : ''}`;
  $('#opp-sub').innerHTML = `${tag} ${op.bonus ? ' · <b>2 ações no próximo turno</b>' : ''}`;
  $('#hud-series').innerHTML = seriesText();
  const oh = $('#opp-hand');
  oh.innerHTML = '';
  for (let i = 0; i < Math.min(op.hand.length, 12); i++) oh.append(h('span', 'mini-back'));
  oh.append(h('span', 'n', `${op.hand.length} na mão`));

  renderHand(selCard);
  renderStatus(selCard);
  applyTutHl();
}

function renderHand() {
  const s = G.state;
  const hand = s.players[HUMAN].hand.slice().sort((a, b) => kindOrder(a) - kindOrder(b) || a.v - b.v);
  const el = $('#hand');
  el.innerHTML = '';
  if (!hand.length) { el.append(h('div', 'empty-hand', 'Sua mão está vazia.')); return; }
  const w = el.clientWidth - 24;
  // mede a largura real da carta (o CSS pode usar clamp/vw, que não dá para ler como número)
  const probe = h('div', 'hcard');
  probe.style.visibility = 'hidden';
  el.append(probe);
  const cw = probe.getBoundingClientRect().width || 104;
  probe.remove();
  const need = hand.length * (cw + 6);
  el.style.setProperty('--overlap', need > w ? `${Math.max(-cw * 0.62, (w - cw) / Math.max(1, hand.length - 1) - cw)}px` : '6px');
  const myTurn = awaiting === 'action';
  for (const c of hand) {
    const b = h('button', 'hcard');
    b.style.backgroundImage = `url(${img(c)})`;
    b.setAttribute('aria-label', E.cardName(c));
    b.dataset.k = c.kind + c.v;
    if (c.id === selected) b.classList.add('sel');
    if (!myTurn) b.classList.add('dim');
    if (newIds.has(c.id)) b.classList.add('new');
    b.onclick = () => {
      if (awaiting !== 'action') return;
      selected = selected === c.id ? null : c.id;
      render();
    };
    hoverPreview(b, c);
    el.append(b);
  }
}
const kindOrder = (c) => ({ atk: 0, def: 1, mare: 2, saque: 3 })[c.kind];

function renderStatus(selCard) {
  const s = G.state;
  const txt = $('#status-text');
  const acts = $('#status-actions');
  acts.innerHTML = '';
  const btn = (label, cls, fn) => { const b = h('button', 'btn small ' + cls, label); b.onclick = fn; acts.append(b); return b; };
  if (s.phase === 'over') { txt.innerHTML = s.winner === HUMAN ? '<b>Você venceu!</b>' : `<b>${esc(G.names[AI])}</b> venceu.`; return; }
  if (awaiting !== 'action') {
    if (G.mode === 'tutorial') txt.innerHTML = s.current === AI ? 'Vez do <b>Roku</b>…' : 'Leia o que o <b>Roku</b> está explicando.';
    else if (s.phase === 'mare' && G.mode === 'online') txt.innerHTML = `Aguardando <b>${esc(G.names[AI])}</b> escolher a carta da Maré…`;
    else txt.innerHTML = s.current === AI ? `Vez de <b>${esc(G.names[AI])}</b>…` : 'Aguarde…';
    return;
  }
  const left = s.actionsLeft > 1 ? ` <b>(${s.actionsLeft} ações restantes)</b>` : '';
  const legal = E.legalActions(s);
  if (!selCard) {
    txt.innerHTML = `Seu turno: escolha uma carta da mão.${left}`;
    if (legal.some((a) => a.type === 'retrieve')) btn('Pegar carta da Torre (grátis)', 'sea', () => submit({ type: 'retrieve' }));
    btn('Comprar carta', 'primary', () => submit({ type: 'draw' })).title = 'Usa a ação para comprar 1 carta e passar a vez';
    return;
  }
  const canStore = E.isLegal(s, { type: 'store', cardId: selCard.id });
  if (selCard.kind === 'atk') txt.innerHTML = `Clique numa base do adversário para atacar com <b>${E.cardName(selCard)}</b>.${left}`;
  else if (selCard.kind === 'def') {
    const any = E.BASES.some((b) => E.isLegal(s, { type: 'defend', cardId: selCard.id, base: b }));
    txt.innerHTML = any ? `Clique numa das suas bases para defender com <b>${E.cardName(selCard)}</b>.${left}` : `Todas as suas bases de pé já têm defesa.${left}`;
  } else if (selCard.kind === 'saque') {
    txt.innerHTML = `<b>Saque</b>: pegue 1 carta da mão do adversário, sem ver.${left}`;
    btn('Usar Saque', 'sea', () => submit({ type: 'saque', cardId: selCard.id }));
  } else {
    txt.innerHTML = `<b>Maré</b>: cada jogador entrega 1 carta da mão ao outro.${left}`;
    btn('Usar Maré', 'sea', () => submit({ type: 'mare', cardId: selCard.id }));
  }
  if (canStore) btn('Guardar na Torre (grátis)', '', () => submit({ type: 'store', cardId: selCard.id }));
  else if (selCard && E.isUp(s.players[HUMAN], 'torre') && s.players[HUMAN].bases.torre.stored) acts.append(h('span', 'hint', 'Torre ocupada'));
  btn('Cancelar', 'ghost', () => { selected = null; render(); });
}

// pré-visualização ampliada (desktop)
const preview = $('#preview');
function hoverPreview(el, card) {
  el.addEventListener('mouseenter', () => {
    preview.querySelector('img').src = img(card);
    preview.hidden = false;
  });
  el.addEventListener('mousemove', (e) => {
    const w = 230, hgt = 340;
    let x = e.clientX + 24, y = e.clientY - hgt / 2;
    if (x + w > innerWidth) x = e.clientX - w - 24;
    y = Math.max(8, Math.min(innerHeight - hgt - 8, y));
    preview.style.left = x + 'px';
    preview.style.top = y + 'px';
  });
  el.addEventListener('mouseleave', () => (preview.hidden = true));
}

// ---------------- modais ----------------
function showModal(html) {
  preview.hidden = true;
  $('#modal-box').innerHTML = html;
  $('#modal').hidden = false;
}
function hideModal() { $('#modal').hidden = true; }

function clickOrWait(ms) {
  return new Promise((r) => {
    const m = $('#modal');
    let done = false;
    const fin = () => { if (done) return; done = true; m.removeEventListener('click', fin); r(); };
    m.addEventListener('click', fin);
    setTimeout(fin, ms * speed);
  });
}

async function showCombat(ev) {
  const me = ev.p === HUMAN;
  const attacker = me ? 'Você' : G.names[AI];
  const defender = me ? G.names[AI] : 'Você';
  // carta voando para o espaço de ataque
  const targetP = me ? AI : HUMAN;
  const fly = h('div', 'atk-fly mcard');
  fly.style.backgroundImage = `url(${img(ev.atk)})`;
  placeAt(fly, POS[targetP].atk[ev.base]);
  $('#board').append(fly);
  await wait(450);

  const defHtml = ev.def
    ? `<div class="ccard" id="c-def"><div class="inner"><div class="card-back"></div><div class="face" style="background-image:url(${img(ev.def)})"></div></div></div>`
    : `<div class="ccard nodef">Base sem defesa</div>`;
  showModal(`
    <h2>${me ? `Você ataca ${art(ev.base)} ${BN[ev.base]} de ${esc(G.names[AI])}` : `${esc(attacker)} ataca ${art(ev.base) === 'a' ? 'sua' : 'seu'} ${BN[ev.base]}`}</h2>
    <div class="combat">
      <div class="side"><div class="who">${esc(attacker)}</div><div class="ccard"><div class="face" style="position:static;transform:none;width:100%;height:100%;background-image:url(${img(ev.atk)})"></div></div></div>
      <div class="vs">×</div>
      <div class="side"><div class="who">${esc(defender)} · ${BN[ev.base]}</div>${defHtml}</div>
    </div>
    <div class="result" id="c-res"></div>
    <div class="modal-hint">clique para continuar</div>`);
  await wait(500);
  if (ev.def) { $('#c-def').classList.add('flipped'); await wait(750); }
  const good = me ? ['hit', 'pierce'].includes(ev.result) : ['block', 'repel'].includes(ev.result);
  const neutral = ev.result === 'block';
  let main = {
    hit: `Acertou ${art(ev.base)} ${BN[ev.base]}!`,
    pierce: `${E.cardName(ev.atk)} atravessou o escudo e acertou!`,
    block: 'Empate — golpe anulado.',
    repel: 'Golpe anulado!',
  }[ev.result];
  const extra = [];
  if (ev.fell) {
    const fem = ev.base === 'torre';
    extra.push(me ? `${fem ? 'A' : 'O'} ${BN[ev.base]} de ${G.names[AI]} caiu!` : `${fem ? 'Sua' : 'Seu'} ${BN[ev.base]} caiu!`);
  }
  if (ev.damaged) extra.push(me ? 'O Forte inimigo ficou danificado (a defesa dele agora fica visível).' : 'Seu Forte ficou danificado (a defesa dele agora fica visível).');
  if (ev.result === 'repel') extra.push(`${me ? G.names[AI] + ' fará' : 'Você fará'} 2 ações no próximo turno.`);
  if (ev.lostStored) extra.push('A carta guardada na Torre voltou ao baralho.');
  if (ev.fell && ev.base === 'torre') extra.push(me ? 'Você vai pegar 1 carta da mão do adversário.' : `${G.names[AI]} vai pegar 1 carta da sua mão.`);
  const res = $('#c-res');
  res.className = 'result show ' + (neutral ? 'neutral' : good ? 'good' : 'bad');
  if (ev.result === 'hit' || ev.result === 'pierce') N.buzz(ev.fell);
  res.innerHTML = esc(main) + (extra.length ? `<small>${extra.map(esc).join('<br>')}</small>` : '');
  render();
  await clickOrWait(ev.fell ? 2600 : 1900);
  hideModal();
  fly.remove();
}

async function showMareBanner(ev) {
  const me = ev.p === HUMAN;
  showModal(`<h2>🌊 Maré!</h2>
    <div class="combat"><div class="ccard"><div class="face" style="position:static;transform:none;width:100%;height:100%;background-image:url(${img(ev.card)})"></div></div></div>
    <p>${me ? 'Você' : esc(G.names[AI])} ${ev.source === 'draw' ? 'comprou' : 'usou'} uma Maré. Cada jogador escolhe 1 carta da própria mão e entrega ao outro. Depois a Maré vai para o fundo do baralho.</p>
    <div class="modal-hint">clique para continuar</div>`);
  await clickOrWait(1800);
  hideModal();
}

async function showSaqueBanner(ev) {
  const me = ev.p === HUMAN;
  showModal(`<h2>💰 Saque!</h2>
    <div class="combat"><div class="ccard"><div class="face" style="position:static;transform:none;width:100%;height:100%;background-image:url(${img(ev.card)})"></div></div></div>
    <p>${me ? 'Você' : esc(G.names[AI])} ${ev.source === 'draw' ? 'comprou' : 'usou'} um Saque: ${me ? 'você pega' : 'pega'} 1 carta da mão ${me ? 'de ' + esc(G.names[AI]) : 'sua'}, sem ver. Cartas guardadas na Torre estão protegidas. Depois o Saque vai para o fundo do baralho.</p>
    <div class="modal-hint">clique para continuar</div>`);
  await clickOrWait(2000);
  hideModal();
}

function askMare() {
  return new Promise((resolve) => {
    const hand = G.state.players[HUMAN].hand.slice().sort((a, b) => kindOrder(a) - kindOrder(b) || a.v - b.v);
    showModal(`<h2>🌊 Maré — escolha a carta para entregar</h2>
      <p>Escolha 1 carta da sua mão para entregar a <b>${esc(G.names[AI])}</b>.</p>
      <div class="pick-grid" id="pick"></div>`);
    const pick = $('#pick');
    for (const c of hand) {
      const b = h('button', 'hcard');
      b.style.backgroundImage = `url(${img(c)})`;
      b.title = E.cardName(c);
      b.onclick = () => { promptCancel = null; hideModal(); resolve(c.id); };
      pick.append(b);
    }
    promptCancel = () => { hideModal(); resolve(null); };
  });
}

async function showSwap(mine, theirs) {
  const cardBox = (c, label) => `<div class="side"><div class="who">${label}</div>${c ? `<div class="ccard"><div class="face" style="position:static;transform:none;width:100%;height:100%;background-image:url(${img(c)})"></div></div>` : '<div class="ccard nodef">nada</div>'}</div>`;
  showModal(`<h2>Troca da Maré</h2>
    <div class="combat">${cardBox(mine, 'Você entregou')}<div class="vs">⇄</div>${cardBox(theirs, 'Você recebeu')}</div>
    <div class="modal-hint">clique para continuar</div>`);
  await clickOrWait(2600);
  hideModal();
}

function askSteal(n, source = 'torre') {
  return new Promise((resolve) => {
    showModal(`<h2>${source === 'saque' ? '💰 Saque!' : 'A Torre caiu!'}</h2>
      <p>Escolha 1 carta da mão de <b>${esc(G.names[AI])}</b> — sem ver os desenhos.</p>
      <div class="pick-grid" id="pick"></div>`);
    const pick = $('#pick');
    for (let i = 0; i < n; i++) {
      const b = h('button', 'card-back');
      b.setAttribute('aria-label', `Carta ${i + 1}`);
      b.onclick = () => { promptCancel = null; hideModal(); resolve(i); };
      pick.append(b);
    }
    promptCancel = () => { hideModal(); resolve(null); };
  });
}

// Fala de fim de partida, com retrato
function endQuote(winner) {
  const ch = oppChar();
  if (!ch) return '';
  const line = lineFor(ch, winner === AI ? 'win' : 'lose');
  if (!line) return '';
  return `<div class="end-quote">${avatarHtml(ch, 'big')}<blockquote>“${esc(line)}”<cite>${esc(ch.short)}</cite></blockquote></div>`;
}

function finishGame() {
  const s = G.state;
  if (G.mode === 'online') return onlineFinish();
  render();
  const won = s.winner === HUMAN;
  const turns = s.turn;
  if (G.mode === 'tournament') {
    const quote = endQuote(s.winner);
    setTimeout(() => afterTournamentGame(s.winner, turns, quote), 700);
    return;
  }
  SAVE.game = null;
  SAVE.stats = SAVE.stats || { w: 0, l: 0 };
  SAVE.stats[won ? 'w' : 'l']++;
  persist();
  const again = G.charId || 'ynana';
  const quote = endQuote(s.winner);
  setTimeout(() => {
    showModal(`<h2 class="big-title">${won ? 'Vitória!' : 'Derrota'}</h2>
      ${quote}
      <p>${endReasonText(s, G.names[AI]) || (won ? `Você derrubou as três bases de ${esc(G.names[AI])}.` : `${esc(G.names[AI])} derrubou as suas três bases.`)}</p>
      <p>Seu histórico em partidas rápidas: ${SAVE.stats.w} vitória(s), ${SAVE.stats.l} derrota(s).</p>
      <div class="row center"><button class="btn ghost" id="m-menu">Menu</button><button class="btn primary" id="m-again">Jogar de novo</button></div>`);
    $('#m-menu').onclick = () => { hideModal(); go('menu'); };
    $('#m-again').onclick = () => { hideModal(); startQuick(again); };
  }, 700);
}

addEventListener('resize', () => { if (G && document.querySelector('#scr-game.active')) renderHand(); });

// ---------------- tutorial (Roku) ----------------
let tutResolve = null;

function tutMatches(a, ex) {
  if (a.type !== ex.type) return false;
  if (ex.base && a.base !== ex.base) return false;
  if (ex.kind) {
    const c = G.state.players[HUMAN].hand.find((x) => x.id === a.cardId);
    if (!c || c.kind !== ex.kind || c.v !== ex.v) return false;
  }
  return true;
}

function tutNudge() {
  toast('Roku: calma! Faz primeiro o que eu falei 😉', 'sea');
  const t = $('#tut');
  t.classList.remove('shake'); void t.offsetWidth; t.classList.add('shake');
}

function applyTutHl() {
  document.querySelectorAll('.tut-hl').forEach((e) => e.classList.remove('tut-hl'));
  if (!G || G.mode !== 'tutorial' || !G.tutHl) return;
  for (const spec of G.tutHl) {
    const [what, arg] = spec.split(':');
    let els = [];
    if (what === 'opp-bases') els = E.BASES.map((b) => boardEls[AI].base[b]);
    else if (what === 'my-bases') els = E.BASES.map((b) => boardEls[HUMAN].base[b]);
    else if (what === 'opp-base') els = [boardEls[AI].base[arg]];
    else if (what === 'my-base') els = [boardEls[HUMAN].base[arg]];
    else if (what === 'opp-def') els = [boardEls[AI].def[arg].firstChild];
    else if (what === 'my-def') els = [boardEls[HUMAN].def[arg].firstChild];
    else if (what === 'my-stored') els = [boardEls[HUMAN].stored];
    else if (what === 'deck') els = [boardEls[HUMAN].deck];
    else if (what === 'hand') els = arg ? [...document.querySelectorAll(`#hand .hcard[data-k="${arg}"]`)] : [$('#hand')];
    else if (what === 'hud-opp') els = [$('#opp-crest')];
    else if (what === 'btn') els = [...document.querySelectorAll('#status-actions .btn')].filter((b) => b.textContent.includes(arg));
    els.filter(Boolean).forEach((e) => e.classList.add('tut-hl'));
  }
}

function tutSay(html, hl = [], withContinue = false, idx = 0) {
  $('#tut-text').innerHTML = html;
  $('#tut-bar').style.width = `${Math.round((idx / (TUTORIAL.length - 1)) * 100)}%`;
  const acts = $('#tut-actions');
  acts.innerHTML = '';
  G.tutHl = hl;
  render();
  if (!withContinue) return Promise.resolve();
  return new Promise((resolve) => {
    const b = h('button', 'btn primary small', 'Continuar →');
    b.onclick = () => { tutResolve = null; resolve(); };
    tutResolve = () => b.click();
    acts.append(b);
    b.focus({ preventScroll: true });
  });
}
document.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && tutResolve && $('#modal').hidden) { e.preventDefault(); tutResolve(); }
});

function rokuAction(s, spec) {
  const c = spec.kind ? s.players[AI].hand.find((x) => x.kind === spec.kind && x.v === spec.v) : null;
  const a = { type: spec.type, cardId: c && c.id, base: spec.base };
  return E.isLegal(s, a) ? a : decideAction(s, AI, 'medio');
}

async function startTutorial() {
  runToken++;
  const token = runToken;
  const state = tutorialState(E, SAVE.playerName || 'Você');
  G = { mode: 'tutorial', levels: [null, 'medio'], names: [state.players[0].name, 'Roku'], state, log: [], charId: 'roku' };
  delete state.initialEvents;
  enterGame();
  logLine('Tutorial com o Roku.', 'big');
  logLine('Seu turno (1)', 'turn');
  const alive = () => token === runToken && G && G.mode === 'tutorial';
  for (let i = 0; i < TUTORIAL.length && alive(); i++) {
    const st = TUTORIAL[i];
    const s = G.state;
    if (st.end) { tutEnd(); return; }
    if (st.expect) {
      tutSay(st.say, st.hl, false, i);
      G.expect = st.expect;
      const a = await askAction();
      if (!alive() || !a) return;
      G.expect = null;
      G.tutHl = [];
      if (a.type !== 'retrieve') newIds = new Set();
      await play(E.act(s, a));
    } else if (st.roku) {
      tutSay('<i>Minha vez…</i>', [], false, i);
      await wait(900);
      if (!alive()) return;
      await play(E.act(s, rokuAction(s, st.roku)));
    } else if (st.steal) {
      await askSteal(s.players[AI].hand.length, s.steal && s.steal.source);
      if (!alive()) return;
      // tanto faz a carta clicada: no tutorial, sai sempre uma carta que não muda a aula
      let idx = s.players[AI].hand.findIndex((c) => c.kind === 'def' && c.v === 2);
      await play(E.stealPick(s, Math.max(0, idx)));
    } else if (st.rokuSteal) {
      if (s.phase === 'steal' && s.steal.to === AI) {
        tutSay('<i>Escolhendo uma carta sua…</i>', [], false, i);
        await wait(700);
        await play(E.stealPick(s, chooseSteal(E.viewFor(s, AI))));
      }
    } else if (st.mare) {
      if (s.phase === 'mare') {
        const g = s.players[AI].hand.find((c) => c.kind === st.mare.give.kind && c.v === st.mare.give.v) || s.players[AI].hand[0];
        if (s.mare.need[AI]) await play(E.mareGive(s, AI, g.id));
        if (s.phase === 'mare') {
          const id = await askMare();
          if (!alive() || !id) return;
          await play(E.mareGive(s, HUMAN, id));
        }
      }
    } else if (st.say) {
      await tutSay(st.say, st.hl, true, i);
    }
  }
}

function tutEnd() {
  SAVE.tutDone = true; persist();
  $('#tut-text').innerHTML = 'Você venceu! Agora você já sabe jogar Gachaqui.';
  $('#tut-actions').innerHTML = '';
  $('#tut-bar').style.width = '100%';
  G.tutHl = [];
  render();
  const roku = charById('roku');
  setTimeout(() => {
    showModal(`<div class="versus">
      <div class="vs-pic" style="--c:${roku.color}"><img class="vs-bust" src="${roku.bust}" alt=""></div>
      <h2 class="vs-name">Aula concluída!</h2>
      <blockquote class="vs-quote">“Viu? Nem foi tão difícil. Só não conta pra Raposa que eu peguei leve.”</blockquote>
      <p class="vs-blurb">Últimas dicas: o Canhão (9) é o ataque mais forte, mas empata com o Escudo 9. Ataque fraco em defesa escondida é arriscado — se perder, o outro ganha 2 ações. E não deixe a Torre aberta: quem derruba leva uma carta sua.</p>
      <div class="row center">
        <button class="btn ghost" id="te-menu">Menu</button>
        <button class="btn ghost" id="te-again">Repetir tutorial</button>
        <button class="btn primary" id="te-play">Jogar contra o Roku</button>
      </div></div>`);
    $('#te-menu').onclick = () => { hideModal(); G = null; go('menu'); };
    $('#te-again').onclick = () => { hideModal(); startTutorial(); };
    $('#te-play').onclick = () => { hideModal(); startQuick('roku'); };
  }, 900);
}

function tutQuit() {
  showModal(`<h2>Sair do tutorial?</h2><p>Você pode voltar quando quiser pelo menu.</p>
    <div class="row center"><button class="btn ghost" id="tq-no">Continuar aula</button><button class="btn primary" id="tq-yes">Sair</button></div>`);
  $('#tq-no').onclick = hideModal;
  $('#tq-yes').onclick = () => { hideModal(); runToken++; G = null; go('menu'); };
}
$('#tut-skip').onclick = () => tutQuit();
$('#btn-tutorial').onclick = () => startTutorial();

// ---------------- modo online (contra um amigo) ----------------
const ROOM_KEY = 'gachaqui.room.v1';
const net = { ws: null, queue: Promise.resolve(), v: -1, retry: 0, wantOpen: false, room: null };
const loadRoom = () => { try { return JSON.parse(localStorage.getItem(ROOM_KEY)); } catch { return null; } };
const saveRoom = (r) => { try { r ? localStorage.setItem(ROOM_KEY, JSON.stringify(r)) : localStorage.removeItem(ROOM_KEY); } catch {} };

// SERVER_URL aceita "https://servidor", "wss://servidor/ws" ou vazio (mesmo endereço do site)
function serverBase() {
  const raw = (SERVER_URL || '').trim().replace(/\/+$/, '');
  // rodando local (localhost) com o backend entregando o site: usa o mesmo endereço
  // no app o site vem de dentro do aparelho, então o servidor é sempre o configurado
  if (!raw || (!N.NATIVE && ['localhost', '127.0.0.1'].includes(location.hostname))) return location.origin;
  return raw.replace(/^ws(s?):/, 'http$1:').replace(/\/ws$/, '');
}
function serverUrl() {
  return serverBase().replace(/^http(s?):/, 'ws$1:') + '/ws';
}
async function checkServer() {
  const el = $('#on-server');
  if (!el) return;
  el.textContent = 'Verificando servidor…';
  el.className = 'server-status';
  try {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 8000);
    const r = await fetch(serverBase() + '/api/info', { signal: ctl.signal, cache: 'no-store' });
    clearTimeout(to);
    const info = await r.json();
    if (!info.ok) throw new Error();
    el.innerHTML = `<span class="net"></span>Servidor online · ${info.jogadoresOnline} conectado(s) · ${info.salas} sala(s)`;
    el.classList.add('ok');
  } catch {
    el.innerHTML = '<span class="net off"></span>Servidor fora do ar ou não configurado';
    el.classList.add('bad');
  }
}
function roomLink(code) {
  // de dentro do app, o convite aponta para o site (quem tem o app abre direto nele)
  const base = N.NATIVE || location.protocol === 'file:' ? `${PUBLIC_URL.replace(/\/+$/, '')}/` : `${location.origin}${location.pathname}`;
  return `${base}?sala=${code}`;
}

function onlineError(msg) { $('#on-error').textContent = msg || ''; }

function openOnlineScreen(code) {
  go('online');
  $('#on-name').value = SAVE.playerName || '';
  $('#on-code').value = code || '';
  $('#on-start').hidden = false;
  $('#on-wait').hidden = true;
  onlineError('');
  if (location.protocol === 'file:') onlineError('Abra o jogo pelo servidor (npm start) para jogar online.');
  checkServer();
}
$('#btn-online').onclick = () => {
  const r = loadRoom();
  if (r) return resumeOnline(r);
  openOnlineScreen();
};
$('#on-back').onclick = () => { leaveOnline(); go('menu'); };

function connect() {
  return new Promise((resolve, reject) => {
    if (net.ws && net.ws.readyState === 1) return resolve(net.ws);
    let ws;
    try { ws = new WebSocket(serverUrl()); } catch (e) { reject(e); return; }
    let opened = false;
    ws.onopen = () => { opened = true; net.retry = 0; resolve(ws); };
    ws.onerror = () => { if (!opened) reject(new Error('sem servidor')); };
    ws.onclose = () => {
      if (net.ws === ws) net.ws = null;
      if (G && G.mode === 'online') { G.connected = false; G.oppOnline = false; render(); }
      if (net.wantOpen && net.room) {
        const delay = Math.min(10000, 800 * 2 ** net.retry++);
        if (net.retry === 2) toast('Conexão perdida. Tentando reconectar…', 'red');
        setTimeout(() => { if (net.wantOpen) reconnect(); }, delay);
      }
    };
    ws.onmessage = (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }
      onMessage(msg);
    };
    net.ws = ws;
  });
}
const NO_SERVER = 'Não consegui falar com o servidor do jogo. Se você acabou de abrir, espere alguns segundos e tente de novo. Se continuar, o servidor está fora do ar ou o endereço em js/config.js está errado.';
const sendNet = (m) => { if (net.ws && net.ws.readyState === 1) net.ws.send(JSON.stringify(m)); else toast('Sem conexão — tentando de novo…', 'red'); };

async function reconnect() {
  try {
    await connect();
    sendNet({ t: 'rejoin', code: net.room.code, token: net.room.token, v: net.v });
  } catch { /* onclose agenda nova tentativa */ }
}

$('#on-create').onclick = async () => {
  const name = $('#on-name').value.trim() || 'Capitão(ã)';
  SAVE.playerName = name; persist();
  onlineError('');
  try { await connect(); } catch { onlineError(NO_SERVER); return; }
  net.wantOpen = true;
  sendNet({ t: 'create', name });
};
$('#on-join').onclick = async () => {
  const code = $('#on-code').value.trim().toUpperCase();
  const name = $('#on-name').value.trim() || 'Capitão(ã)';
  if (code.length < 4) { onlineError('Digite o código da sala.'); return; }
  SAVE.playerName = name; persist();
  onlineError('');
  try { await connect(); } catch { onlineError(NO_SERVER); return; }
  net.wantOpen = true;
  sendNet({ t: 'join', code, name });
};
$('#on-copy').onclick = async () => {
  const inp = $('#on-link');
  try { await navigator.clipboard.writeText(inp.value); toast('Link copiado!', 'sea'); }
  catch { inp.select(); document.execCommand('copy'); toast('Link copiado!', 'sea'); }
};
$('#on-share').onclick = () => N.shareLink({ title: 'Gachaqui', text: `Bora jogar Gachaqui comigo? Sala ${$('#on-codeshow').textContent}`, url: $('#on-link').value });

async function resumeOnline(r) {
  net.room = r; net.v = -1; net.wantOpen = true;
  try { await connect(); } catch { openOnlineScreen(); onlineError(NO_SERVER); return; }
  sendNet({ t: 'rejoin', code: r.code, token: r.token, v: -1 });
}

function leaveOnline() {
  graceBanner(0);
  net.wantOpen = false;
  if (net.ws) { sendNet({ t: 'leave' }); net.ws.close(); }
  net.ws = null; net.room = null; net.v = -1;
  saveRoom(null);
  if (G && G.mode === 'online') G = null;
}

function showWaitingRoom(code) {
  go('online');
  $('#on-start').hidden = true;
  $('#on-wait').hidden = false;
  $('#on-link').value = roomLink(code);
  $('#on-codeshow').textContent = code;
  $('#on-share').hidden = !N.canShare();
}

function onMessage(msg) {
  switch (msg.t) {
    case 'lobby':
      net.room = { code: msg.code, token: msg.token };
      saveRoom(net.room);
      showWaitingRoom(msg.code);
      return;
    case 'joined':
      net.room = { code: msg.code, token: msg.token };
      saveRoom(net.room);
      return;
    case 'presence':
      if (G && G.mode === 'online') {
        const was = G.oppOnline;
        G.oppOnline = msg.opponentOnline;
        if (was === false && msg.opponentOnline) toast(`${G.names[AI]} voltou!`, 'sea');
        graceBanner(msg.opponentOnline ? 0 : msg.opponentGraceMs);
        render();
      }
      return;
    case 'closed':
      if (G && G.mode === 'online') G.closedInfo = msg;
      graceBanner(0);
      net.wantOpen = false;
      saveRoom(null);
      net.queue = net.queue.then(() => new Promise((r) => setTimeout(r, 900))).then(() => showClosed(msg));
      return;
    case 'rematch':
      if (G) G.rematch = msg.rematch;
      updateRematchModal();
      return;
    case 'error':
      if (document.querySelector('#scr-online.active')) onlineError(msg.msg);
      else toast(msg.msg, 'red');
      if (/não existe|não faz parte|não encontrada/i.test(msg.msg)) { saveRoom(null); net.room = null; net.wantOpen = false; if (!document.querySelector('#scr-online.active')) openOnlineScreen(); onlineError(msg.msg); }
      if (msg.fatal) net.wantOpen = false;
      return;
    case 'update':
      if (promptCancel) { const c = promptCancel; promptCancel = null; c(); }
      net.queue = net.queue.then(() => handleUpdate(msg)).catch((e) => console.error(e));
      return;
  }
}

async function handleUpdate(msg) {
  net.v = msg.v;
  graceBanner(msg.opponentOnline ? 0 : msg.opponentGraceMs || 0);
  const isNewGame = !G || G.mode !== 'online' || G.game !== msg.game || msg.sync;
  if (isNewGame) {
    hideModal();
    G = { mode: 'online', levels: [null, 'online'], names: msg.names, state: msg.state, log: G && G.mode === 'online' && G.game === msg.game ? G.log : [], game: msg.game, code: msg.code };
    G.score = msg.score; G.oppOnline = msg.opponentOnline; G.connected = true; G.rematch = msg.rematch;
    enterGame();
    if (!msg.sync) logLine(`Partida ${msg.game} contra ${esc(msg.names[AI])} começou. ${msg.state.starter === HUMAN ? 'Você começa' : esc(msg.names[AI]) + ' começa'}.`, 'big');
    else logLine('Conectado à partida.', 'big');
  } else {
    G.state = msg.state; G.names = msg.names; G.score = msg.score; G.oppOnline = msg.opponentOnline; G.rematch = msg.rematch;
  }
  awaiting = null;
  if (msg.events.some((e) => e.t === 'turn' && e.p === HUMAN)) newIds = new Set();
  await play(msg.events);
  render();
  const s = G.state;
  if (s.phase === 'over') { onlineFinish(); return; }
  const who = E.pendingDeciders(s);
  if (!who.includes(HUMAN)) return;
  if (s.phase === 'action') {
    const a = await askAction();
    if (a) sendNet({ t: 'action', a });
  } else if (s.phase === 'mare') {
    const id = await askMare();
    if (id) sendNet({ t: 'mare', cardId: id });
  } else if (s.phase === 'steal') {
    const idx = await askSteal(s.players[AI].hand.length, s.steal && s.steal.source);
    if (idx != null) sendNet({ t: 'steal', index: idx });
  }
}

// Aviso no topo: "Fulano caiu — a sala fecha em 30s"
let graceTimer = null;
function graceBanner(ms) {
  let el = $('#net-banner');
  if (!el) { el = h('div', 'net-banner'); el.id = 'net-banner'; document.body.append(el); }
  clearInterval(graceTimer);
  if (!ms || !G || G.mode !== 'online') { el.classList.remove('show'); return; }
  const end = Date.now() + ms;
  const tick = () => {
    const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
    el.innerHTML = `<b>${esc(G.names[AI])}</b> caiu. Esperando voltar… <b>${left}s</b>`;
    if (!left) clearInterval(graceTimer);
  };
  tick();
  el.classList.add('show');
  graceTimer = setInterval(tick, 500);
}

function showClosed(msg) {
  if (net.ws) { try { net.ws.close(); } catch {} }
  net.ws = null; net.room = null;
  const name = esc(msg.name || 'O outro jogador');
  const text = msg.reason === 'abandon'
    ? `${name} saiu e não voltou em 30 segundos. <b>Você venceu por abandono.</b>`
    : `${name} saiu da sala.`;
  const score = msg.score ? `<p class="score-line">Você ${msg.score[0]} x ${msg.score[1]} ${name}</p>` : '';
  showModal(`<h2>Sala fechada</h2><p>${text}</p>${score}
    <div class="row center"><button class="btn ghost" id="cl-menu">Menu</button><button class="btn primary" id="cl-new">Criar nova sala</button></div>`);
  $('#cl-menu').onclick = () => { hideModal(); G = null; go('menu'); };
  $('#cl-new').onclick = () => { hideModal(); G = null; openOnlineScreen(); };
}

function onlineFinish() {
  const s = G.state;
  const won = s.winner === HUMAN;
  setTimeout(() => {
    if (!G || G.closedInfo) return; // a sala fechou: outra janela cuida disso
    showModal(`<h2 class="big-title">${won ? 'Vitória!' : 'Derrota'}</h2>
      <p>${endReasonText(s, G.names[AI]) || (won ? `Você derrubou as três bases de ${esc(G.names[AI])}.` : `${esc(G.names[AI])} derrubou as suas três bases.`)}</p>
      <p class="score-line">Você ${G.score[0]} x ${G.score[1]} ${esc(G.names[AI])}</p>
      <p id="rm-status"></p>
      <div class="row center"><button class="btn ghost" id="m-leave">Sair da sala</button><button class="btn primary" id="m-rematch">Revanche</button></div>`);
    $('#m-leave').onclick = () => { hideModal(); leaveOnline(); go('menu'); };
    $('#m-rematch').onclick = () => sendNet({ t: 'rematch' });
    updateRematchModal();
  }, 700);
}
function updateRematchModal() {
  const st = $('#rm-status');
  if (!st || !G || !G.rematch) return;
  const [me, them] = G.rematch;
  st.textContent = me && !them ? `Aguardando ${G.names[AI]} aceitar a revanche…` : !me && them ? `${G.names[AI]} quer revanche!` : '';
  const b = $('#m-rematch');
  if (b) { b.disabled = me; b.textContent = them && !me ? 'Aceitar revanche' : 'Revanche'; }
}

// link de convite: ?sala=CODIGO (no site) ou gachaqui://sala/CODIGO (no app)
function openInvite(code) {
  code = String(code).toUpperCase();
  const saved = loadRoom();
  if (saved && saved.code === code) { resumeOnline(saved); return; }
  if (G && G.mode === 'online' && net.room && net.room.code === code) return; // já está nela
  openOnlineScreen(code);
  // já sabemos o nome: entra direto na sala
  if (SAVE.playerName) $('#on-join').click();
  else $('#on-name').focus();
}
(() => {
  const code = new URLSearchParams(location.search).get('sala');
  if (!code) return;
  openInvite(code);
  // no navegador do Android: oferece abrir o convite no app
  if (N.IS_ANDROID_WEB && APP_DOWNLOAD_URL) {
    const bar = h('div', 'app-bar', `Tem o app do Gachaqui? <a class="btn small sea" href="${N.appIntentUrl(code, location.href)}">Abrir no app</a> <button class="btn small ghost" aria-label="Fechar">×</button>`);
    bar.querySelector('button').onclick = () => bar.remove();
    document.body.append(bar);
  }
})();

// ---------------- celular (app) ----------------
N.startNative();
N.registerServiceWorker();
N.onDeepLink((code) => openInvite(code));
N.onResume(() => {
  // voltou para o app: reconecta na hora, sem esperar o próximo ciclo
  if (net.wantOpen && net.room && (!net.ws || net.ws.readyState > 1)) reconnect();
});
N.onBackButton(() => {
  // botão voltar do Android: fecha janela > pausa a partida > volta ao menu > sai do app
  if (!$('#modal').hidden) {
    if ($('#q-back')) $('#q-back').click();
    else if ($('#tq-no')) $('#tq-no').click();
    else if ($('#sr-no')) $('#sr-no').click();
    else if (!$('#pick') && !$('#vs-go')) $('#modal').click();
    return;
  }
  if ($('#log').classList.contains('open')) { $('#log').classList.remove('open'); return; }
  const cur = document.querySelector('.screen.active');
  const name = cur ? cur.id.replace('scr-', '') : 'menu';
  if (name === 'game') { $('#btn-quit').click(); return; }
  if (name === 'menu') { N.exitApp(); return; }
  if (name === 'online') { $('#on-back').click(); return; }
  if (name === 'rules') { go(prevScreen === 'rules' ? 'menu' : prevScreen); return; }
  go('menu');
});
// botão de baixar o app (só no site)
(() => {
  const b = $('#btn-app');
  if (!b) return;
  if (!N.NATIVE && APP_DOWNLOAD_URL && !N.IS_STANDALONE) { b.hidden = false; b.href = 'baixar/'; }
})();
for (const id of ['#on-code', '#on-name']) {
  $(id).addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    if ($('#on-code').value.trim().length >= 4) $('#on-join').click();
    else if (id === '#on-name') $('#on-create').click();
  });
}

refreshMenu();
