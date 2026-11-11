// Gachaqui online — salas e visão por jogador. O servidor guarda o estado verdadeiro;
// cada jogador só recebe o que poderia ver na mesa (a mão e o baralho do outro viram cartas "escondidas").
import { randomBytes } from 'node:crypto';
import { newGame, act, mareGive, stealPick, pendingDeciders, BASES, defenseVisible, forfeit } from '../frontend/js/engine.js';

// Quanto tempo a sala espera alguém que caiu antes de fechar (padrão: 30 s)
export const GRACE_MS = +process.env.GRACE_MS || 30000;

const HIDDEN = (id) => ({ id, kind: 'hidden', v: 0 });

export function perspective(s, seat) {
  const rot = (i) => (i == null ? null : i === seat ? 0 : 1);
  const maskP = (pl, own) => ({
    name: pl.name,
    bonus: pl.bonus,
    hand: own ? pl.hand : pl.hand.map((_, i) => HIDDEN('oh' + i)),
    deck: pl.deck.map((_, i) => HIDDEN('dk' + i)), // nem a ordem do próprio baralho é revelada
    bases: Object.fromEntries(
      BASES.map((b) => {
        const x = pl.bases[b];
        const o = {
          hp: x.hp,
          def: x.def ? { life: x.def.life, card: own || defenseVisible(pl, b) ? x.def.card : HIDDEN('hd-' + b) } : null,
        };
        if (b === 'torre') o.stored = x.stored ? (own ? x.stored : HIDDEN('hs')) : null;
        return [b, o];
      }),
    ),
  });
  return {
    players: [maskP(s.players[seat], true), maskP(s.players[1 - seat], false)],
    current: rot(s.current),
    starter: rot(s.starter),
    turn: s.turn,
    phase: s.phase,
    actionsLeft: s.actionsLeft,
    drawsLeft: s.drawsLeft,
    acted: s.acted,
    mare: s.mare
      ? {
          source: s.mare.source,
          owner: rot(s.mare.owner),
          card: s.mare.card,
          need: [s.mare.need[seat], s.mare.need[1 - seat]],
          gives: [s.mare.gives[seat], s.mare.gives[1 - seat] ? 'x' : null],
        }
      : null,
    steal: s.steal ? { from: rot(s.steal.from), to: rot(s.steal.to), source: s.steal.source } : null,
    winner: rot(s.winner),
    endReason: s.endReason,
    seed: 0,
  };
}

export function eventsFor(events, seat) {
  const rot = (i) => (i === seat ? 0 : 1);
  return events.map((e) => {
    const x = { ...e };
    if ('p' in e) x.p = rot(e.p);
    if ('from' in e) x.from = rot(e.from);
    if ('to' in e) x.to = rot(e.to);
    if ('owner' in e) x.owner = rot(e.owner);
    if (e.t === 'mareSwap') x.gave = [e.gave[seat], e.gave[1 - seat]];
    const mine = e.p === seat;
    if (!mine && ['draw', 'store', 'retrieve', 'expire'].includes(e.t)) delete x.card;
    if (!mine && e.t === 'defend' && !e.visible) delete x.card;
    return x;
  });
}

export function graceLeft(seat) {
  if (!seat || seat.ws || !seat.goneAt) return 0;
  return Math.max(0, GRACE_MS - (Date.now() - seat.goneAt));
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function makeCode(rooms) {
  for (;;) {
    const bytes = randomBytes(5);
    const code = [...bytes].map((b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
    if (!rooms.has(code)) return code;
  }
}
const token = () => randomBytes(16).toString('hex');
const cleanName = (n) => String(n || '').replace(/[<>]/g, '').trim().slice(0, 18) || 'Capitão(ã)';

export class Lobby {
  constructor() {
    this.rooms = new Map();
  }

  create(name) {
    const code = makeCode(this.rooms);
    const room = {
      code,
      seats: [{ name: cleanName(name), token: token(), ws: null }, null],
      state: null,
      v: 0,
      game: 0,
      score: [0, 0],
      rematch: [false, false],
      lastActive: Date.now(),
    };
    this.rooms.set(code, room);
    return { room, seat: 0 };
  }

  // Entrar pelo código. Se a sala já tem dois jogadores mas um deles caiu,
  // quem entra com o código ocupa o lugar de quem caiu (de preferência o de mesmo nome).
  join(code, name) {
    const room = this.rooms.get(String(code || '').trim().toUpperCase());
    if (!room) throw new Error('Sala não encontrada. Confira o código — a sala pode ter sido fechada.');
    const nm = cleanName(name);
    if (!room.seats[1]) {
      room.seats[1] = { name: nm, token: token(), ws: null };
      this.startGame(room);
      return { room, seat: 1, takeover: false };
    }
    const gone = [0, 1].filter((i) => room.seats[i] && !room.seats[i].ws);
    if (!gone.length) throw new Error('Essa sala já tem dois jogadores conectados.');
    const same = gone.find((i) => room.seats[i].name.toLowerCase() === nm.toLowerCase());
    const seat = same ?? gone[0];
    return { room, seat, takeover: true };
  }

  rejoin(code, tok) {
    const room = this.rooms.get(String(code || '').toUpperCase());
    if (!room) throw new Error('A sala não existe mais.');
    const seat = room.seats.findIndex((x) => x && x.token === tok);
    if (seat < 0) throw new Error('Você não faz parte dessa sala.');
    return { room, seat };
  }

  startGame(room) {
    // primeiro jogo: sorteio; depois alterna
    const starter = room.game === 0 ? (Math.random() < 0.5 ? 0 : 1) : 1 - room.state.starter;
    room.state = newGame({ names: [room.seats[0].name, room.seats[1].name], starter });
    room.lastEvents = room.state.initialEvents;
    delete room.state.initialEvents;
    room.game++;
    room.rematch = [false, false];
    room.v++;
    return room.lastEvents;
  }

  // Aplica uma decisão de um jogador. Retorna os eventos produzidos.
  decide(room, seat, msg) {
    const s = room.state;
    if (!s) throw new Error('A partida ainda não começou.');
    room.lastActive = Date.now();
    if (msg.t === 'rematch') {
      if (s.phase !== 'over') throw new Error('A partida ainda não acabou.');
      room.rematch[seat] = true;
      if (room.rematch[0] && room.rematch[1]) return { events: this.startGame(room), newGame: true };
      return { events: [], waitingRematch: true };
    }
    if (!pendingDeciders(s).includes(seat)) throw new Error('Não é a sua vez.');
    let events;
    if (msg.t === 'action' && s.phase === 'action') events = act(s, msg.a);
    else if (msg.t === 'mare' && s.phase === 'mare') events = mareGive(s, seat, msg.cardId);
    else if (msg.t === 'steal' && s.phase === 'steal') events = stealPick(s, msg.index);
    else throw new Error('Jogada fora de hora.');
    if (s.phase === 'over') room.score[s.winner]++;
    room.v++;
    return { events };
  }

  // Rendição (ou abandono): o outro vence a partida atual
  forfeit(room, seat, reason = 'surrender') {
    const s = room.state;
    if (!s || s.phase === 'over') return [];
    const events = forfeit(s, seat, reason);
    room.score[s.winner]++;
    room.v++;
    room.lastActive = Date.now();
    return events;
  }

  // Mensagem de atualização para um assento
  updateFor(room, seat, events, extra = {}) {
    const opp = room.seats[1 - seat];
    return {
      t: 'update',
      code: room.code,
      v: room.v,
      game: room.game,
      state: perspective(room.state, seat),
      events: eventsFor(events, seat),
      names: [room.seats[seat].name, opp ? opp.name : '?'],
      score: [room.score[seat], room.score[1 - seat]],
      rematch: [room.rematch[seat], room.rematch[1 - seat]],
      opponentOnline: !!(opp && opp.ws),
      opponentGraceMs: graceLeft(opp),
      ...extra,
    };
  }

  // Salas sem ninguém conectado por muito tempo são apagadas
  sweep(maxIdleMs = 60 * 60 * 1000) {
    const now = Date.now();
    for (const [code, r] of this.rooms) {
      const someoneOn = r.seats.some((x) => x && x.ws);
      if (!someoneOn && now - r.lastActive > maxIdleMs) this.rooms.delete(code);
    }
  }
}
