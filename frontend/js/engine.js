// Gachaqui — motor de regras (sem DOM). O estado é JSON puro, então pode ser salvo.

export const BASES = ['forte', 'torre', 'porto'];
export const BASE_NAMES = { forte: 'Forte', torre: 'Torre', porto: 'Porto' };
export const BASE_HP = { forte: 2, torre: 1, porto: 1 };

// Composição de cada baralho (as regras não fixam quantidades; esta é a "regra da casa" padrão).
export const DECK_COMPOSITION = {
  atk: { 1: 4, 3: 4, 6: 3, 9: 2 },
  def: { 2: 4, 3: 4, 6: 3, 9: 2 },
  mare: 2,
  saque: 2,
};

export const DEFENSE_LIFE = 2;      // turnos do dono
export const MAX_TURNS = 400;       // trava de segurança contra partidas infinitas

export function cardName(c) {
  if (!c) return '?';
  if (c.kind === 'mare') return 'Maré';
  if (c.kind === 'saque') return 'Saque';
  if (c.kind === 'atk') return ({ 1: 'Espada', 3: 'Lança', 6: 'Ataque 6', 9: 'Canhão' })[c.v] + ` (${c.v})`;
  return `Escudo (${c.v})`;
}

// ---------- RNG determinístico (mulberry32), guardado no estado ----------
export function rand(s) {
  let t = (s.seed = (s.seed + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function shuffle(s, arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand(s) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildDeck(s, owner) {
  const deck = [];
  let n = 0;
  const mk = (kind, v) => deck.push({ id: `${owner}-${n++}`, kind, v });
  for (const [v, q] of Object.entries(DECK_COMPOSITION.atk)) for (let i = 0; i < q; i++) mk('atk', +v);
  for (const [v, q] of Object.entries(DECK_COMPOSITION.def)) for (let i = 0; i < q; i++) mk('def', +v);
  for (let i = 0; i < DECK_COMPOSITION.mare; i++) mk('mare', 0);
  for (let i = 0; i < (DECK_COMPOSITION.saque || 0); i++) mk('saque', 0);
  return shuffle(s, deck);
}

function newPlayer(name) {
  return {
    name,
    deck: [],
    hand: [],
    bonus: false, // ganhou 2 ações para o próximo turno
    bases: {
      forte: { hp: 2, def: null },
      torre: { hp: 1, def: null, stored: null },
      porto: { hp: 1, def: null },
    },
  };
}

export function newGame({ names = ['Jogador 1', 'Jogador 2'], starter = 0, seed = (Math.random() * 2 ** 31) | 0 } = {}) {
  const s = {
    seed,
    players: [newPlayer(names[0]), newPlayer(names[1])],
    current: starter,
    starter,
    turn: 1,
    phase: 'setup',
    actionsLeft: 0,
    drawsLeft: 0,
    acted: false,
    storedThisTurn: false,
    drawCtx: 'turn',
    mare: null,
    steal: null,
    winner: null,
    endReason: null,
  };
  s.players.forEach((p, i) => {
    p.deck = buildDeck(s, i);
    p.hand = p.deck.splice(0, 5); // Maré na mão inicial fica na mão (pode ser usada como ação)
  });
  const ev = [];
  startTurn(s, ev);
  s.initialEvents = ev;
  return s;
}

export const isUp = (p, b) => p.bases[b].hp > 0;
export const standingCount = (p) => BASES.filter((b) => isUp(p, b)).length;
export const defenseVisible = (p, b) => b === 'forte' && p.bases.forte.hp === 1; // Forte danificado

function startTurn(s, ev) {
  const p = s.players[s.current];
  // Defesas que completaram 2 turnos do dono voltam ao fundo do baralho
  for (const b of BASES) {
    const slot = p.bases[b];
    if (slot.def) {
      slot.def.life--;
      if (slot.def.life <= 0) {
        p.deck.push(slot.def.card);
        ev.push({ t: 'expire', p: s.current, base: b, card: slot.def.card });
        slot.def = null;
      }
    }
  }
  s.actionsLeft = p.bonus ? 2 : 1;
  if (p.bonus) ev.push({ t: 'bonusStart', p: s.current });
  p.bonus = false;
  s.acted = false;
  s.storedThisTurn = false;
  s.drawCtx = 'turn';
  s.drawsLeft = isUp(p, 'porto') ? 2 : 1;
  ev.push({ t: 'turn', p: s.current, turn: s.turn, actions: s.actionsLeft, draws: s.drawsLeft });
  continueDraw(s, ev);
}

function continueDraw(s, ev) {
  const p = s.players[s.current];
  s.phase = 'drawing';
  while (s.drawsLeft > 0) {
    s.drawsLeft--;
    if (!p.deck.length) {
      ev.push({ t: 'deckEmpty', p: s.current });
      continue;
    }
    const c = p.deck.shift();
    if (c.kind === 'mare') {
      ev.push({ t: 'mareReveal', p: s.current, card: c, source: 'draw' });
      startMare(s, 'draw', c, ev);
      if (s.phase === 'mare') return; // espera as escolhas
      continue;
    }
    if (c.kind === 'saque') {
      ev.push({ t: 'saqueReveal', p: s.current, card: c, source: 'draw' });
      startSaque(s, 'draw', c, ev);
      if (s.phase === 'steal') return; // espera a escolha da carta
      continue;
    }
    p.hand.push(c);
    ev.push({ t: 'draw', p: s.current, card: c });
  }
  if (s.drawCtx === 'action') {
    // a compra foi a ação "Comprar carta": encerra a ação
    s.drawCtx = 'turn';
    s.phase = 'resolving';
    afterAction(s, ev);
    return;
  }
  s.phase = 'action';
}

// Saque: quem compra (ou usa) pega 1 carta da mão do adversário, sem ver
function startSaque(s, after, card, ev) {
  const to = s.current;
  const from = 1 - to;
  s.players[to].deck.push(card); // o Saque vai para o fundo do baralho
  if (!s.players[from].hand.length) {
    ev.push({ t: 'saqueEmpty', p: to });
    return;
  }
  shuffle(s, s.players[from].hand); // sem ver
  s.steal = { from, to, after, source: 'saque' };
  s.phase = 'steal';
}

function startMare(s, source, card, ev) {
  s.mare = {
    source,
    card,
    owner: s.current,
    gives: [null, null],
    need: s.players.map((pl) => pl.hand.length > 0),
  };
  s.phase = 'mare';
  if (!s.mare.need[0] && !s.mare.need[1]) resolveMare(s, ev);
}

function resolveMare(s, ev) {
  const m = s.mare;
  const [a, b] = s.players;
  const ga = m.gives[0] ? takeFromHand(a, m.gives[0]) : null;
  const gb = m.gives[1] ? takeFromHand(b, m.gives[1]) : null;
  if (ga) b.hand.push(ga);
  if (gb) a.hand.push(gb);
  s.players[m.owner].deck.push(m.card);
  ev.push({ t: 'mareSwap', gave: [ga, gb], owner: m.owner });
  s.mare = null;
  s.phase = 'resolving';
}

function takeFromHand(p, id) {
  const i = p.hand.findIndex((c) => c.id === id);
  if (i < 0) throw new Error('carta não está na mão: ' + id);
  return p.hand.splice(i, 1)[0];
}

// ---------- Ações ----------
export function legalActions(s) {
  if (s.phase !== 'action') return [];
  const me = s.players[s.current];
  const op = s.players[1 - s.current];
  const out = [];
  if (!s.acted && !s.storedThisTurn && me.bases.torre.stored) out.push({ type: 'retrieve' });
  const seen = new Set();
  for (const c of me.hand) {
    const key = c.kind + c.v;
    if (seen.has(key)) continue; // cartas iguais geram as mesmas ações
    seen.add(key);
    if (c.kind === 'def') {
      for (const b of BASES) if (isUp(me, b) && !me.bases[b].def) out.push({ type: 'defend', cardId: c.id, base: b });
    } else if (c.kind === 'atk') {
      for (const b of BASES) if (isUp(op, b)) out.push({ type: 'attack', cardId: c.id, base: b });
    } else if (c.kind === 'mare') {
      out.push({ type: 'mare', cardId: c.id });
    } else if (c.kind === 'saque') {
      out.push({ type: 'saque', cardId: c.id });
    }
    if (isUp(me, 'torre') && !me.bases.torre.stored) out.push({ type: 'store', cardId: c.id });
  }
  out.push({ type: 'draw' }); // "Comprar carta": sempre disponível
  return out;
}

export function isLegal(s, a) {
  if (s.phase !== 'action') return false;
  const me = s.players[s.current];
  const op = s.players[1 - s.current];
  const card = a.cardId ? me.hand.find((c) => c.id === a.cardId) : null;
  switch (a.type) {
    case 'retrieve': return !s.acted && !s.storedThisTurn && !!me.bases.torre.stored;
    case 'defend': return !!card && card.kind === 'def' && isUp(me, a.base) && !me.bases[a.base].def;
    case 'attack': return !!card && card.kind === 'atk' && isUp(op, a.base);
    case 'store': return !!card && isUp(me, 'torre') && !me.bases.torre.stored;
    case 'mare': return !!card && card.kind === 'mare';
    case 'saque': return !!card && card.kind === 'saque';
    case 'draw': return true;
  }
  return false;
}

export function act(s, a) {
  if (!isLegal(s, a)) throw new Error('ação ilegal: ' + JSON.stringify(a));
  const ev = [];
  const me = s.players[s.current];
  const op = s.players[1 - s.current];
  const cur = s.current;
  switch (a.type) {
    case 'retrieve': {
      const c = me.bases.torre.stored;
      me.bases.torre.stored = null;
      me.hand.push(c);
      ev.push({ t: 'retrieve', p: cur, card: c });
      return ev; // grátis
    }
    case 'defend': {
      const c = takeFromHand(me, a.cardId);
      me.bases[a.base].def = { card: c, life: DEFENSE_LIFE };
      ev.push({ t: 'defend', p: cur, base: a.base, card: c, visible: defenseVisible(me, a.base) });
      break;
    }
    case 'store': {
      // guardar é grátis e a carta fica na Torre o tempo que o dono quiser
      const c = takeFromHand(me, a.cardId);
      me.bases.torre.stored = c;
      s.storedThisTurn = true;
      ev.push({ t: 'store', p: cur, card: c });
      return ev;
    }
    case 'mare': {
      const c = takeFromHand(me, a.cardId);
      ev.push({ t: 'mareReveal', p: cur, card: c, source: 'action' });
      startMare(s, 'action', c, ev);
      if (s.phase === 'mare') return ev;
      break;
    }
    case 'saque': {
      const c = takeFromHand(me, a.cardId);
      ev.push({ t: 'saqueReveal', p: cur, card: c, source: 'action' });
      startSaque(s, 'action', c, ev);
      if (s.phase === 'steal') return ev;
      break;
    }
    case 'draw': {
      // "Comprar carta": compra 1 e encerra a ação (Maré e Saque comprados assim também valem)
      ev.push({ t: 'drawAction', p: cur });
      s.drawCtx = 'action';
      s.drawsLeft = 1;
      continueDraw(s, ev);
      return ev;
    }
    case 'attack': {
      const atk = takeFromHand(me, a.cardId);
      const slot = op.bases[a.base];
      const def = slot.def ? slot.def.card : null;
      slot.def = null;
      let result;
      if (!def) result = 'hit';
      else if (atk.v > def.v) result = 'pierce';
      else if (atk.v === def.v) result = 'block';
      else result = 'repel';
      me.deck.push(atk);
      if (def) op.deck.push(def);
      let fell = false, damaged = false, lostStored = null;
      if (result === 'hit' || result === 'pierce') {
        slot.hp--;
        fell = slot.hp === 0;
        damaged = !fell;
        if (fell && a.base === 'torre' && slot.stored) {
          lostStored = slot.stored;
          op.deck.push(slot.stored);
          slot.stored = null;
        }
      }
      if (result === 'repel') op.bonus = true;
      ev.push({ t: 'combat', p: cur, base: a.base, atk, def, result, fell, damaged, lostStored });
      if (standingCount(op) === 0) {
        s.winner = cur;
        s.endReason = 'bases';
        s.phase = 'over';
        ev.push({ t: 'win', p: cur });
        return ev;
      }
      if (fell && a.base === 'torre' && op.hand.length > 0) {
        shuffle(s, op.hand); // o atacante pega sem ver
        s.steal = { from: 1 - cur, to: cur, after: 'action', source: 'torre' };
        s.phase = 'steal';
        return ev;
      }
      break;
    }
  }
  afterAction(s, ev);
  return ev;
}

function afterAction(s, ev) {
  s.acted = true;
  s.actionsLeft--;
  if (s.actionsLeft > 0) {
    s.phase = 'action';
    return;
  }
  endTurn(s, ev);
}

function endTurn(s, ev) {
  s.current = 1 - s.current;
  s.turn++;
  if (s.turn > MAX_TURNS) {
    // Desempate de segurança: mais resistência restante; depois quem não começou.
    const hp = s.players.map((p) => BASES.reduce((t, b) => t + p.bases[b].hp, 0));
    s.winner = hp[0] === hp[1] ? 1 - s.starter : hp[0] > hp[1] ? 0 : 1;
    s.endReason = 'limit';
    s.phase = 'over';
    ev.push({ t: 'win', p: s.winner, limit: true });
    return;
  }
  startTurn(s, ev);
}

// Maré: cada jogador escolhe 1 carta da própria mão para entregar
export function mareGive(s, p, cardId) {
  if (s.phase !== 'mare' || !s.mare.need[p] || s.mare.gives[p]) throw new Error('escolha de Maré inválida');
  if (!s.players[p].hand.some((c) => c.id === cardId)) throw new Error('carta não está na mão');
  s.mare.gives[p] = cardId;
  const ev = [];
  if (s.mare.need.every((n, i) => !n || s.mare.gives[i])) {
    const source = s.mare.source;
    resolveMare(s, ev);
    if (source === 'draw') continueDraw(s, ev);
    else afterAction(s, ev);
  }
  return ev;
}

export function stealPick(s, index) {
  if (s.phase !== 'steal') throw new Error('não há roubo pendente');
  const { from, to, after, source } = s.steal;
  const fromP = s.players[from];
  const i = Math.max(0, Math.min(fromP.hand.length - 1, index | 0));
  const c = fromP.hand.splice(i, 1)[0];
  s.players[to].hand.push(c);
  s.steal = null;
  s.phase = 'resolving';
  const ev = [{ t: 'steal', from, to, card: c, source: source || 'torre' }];
  if (after === 'draw') continueDraw(s, ev);
  else afterAction(s, ev);
  return ev;
}

// Quem precisa decidir agora
export function pendingDeciders(s) {
  if (s.phase === 'action') return [s.current];
  if (s.phase === 'mare') return [0, 1].filter((i) => s.mare.need[i] && !s.mare.gives[i]);
  if (s.phase === 'steal') return [s.steal.to];
  return [];
}

// Visão sem informação escondida (para a IA não trapacear)
export function viewFor(s, p) {
  const me = s.players[p];
  const op = s.players[1 - p];
  const maskBases = (pl, own) => {
    const out = {};
    for (const b of BASES) {
      const x = pl.bases[b];
      out[b] = {
        hp: x.hp,
        def: x.def ? { life: x.def.life, card: own || defenseVisible(pl, b) ? x.def.card : null } : null,
      };
      if (b === 'torre') out[b].stored = own ? x.stored : x.stored ? 'hidden' : null;
    }
    return out;
  };
  return {
    me: p,
    current: s.current,
    phase: s.phase,
    turn: s.turn,
    actionsLeft: s.actionsLeft,
    acted: s.acted,
    hand: me.hand.slice(),
    deckCount: me.deck.length,
    bonus: me.bonus,
    bases: maskBases(me, true),
    opp: {
      handCount: op.hand.length,
      deckCount: op.deck.length,
      bonus: op.bonus,
      bases: maskBases(op, false),
    },
    mare: s.mare ? { source: s.mare.source, owner: s.mare.owner } : null,
    stealCount: s.steal && s.steal.to === p ? s.players[s.steal.from].hand.length : 0,
  };
}

// Encerra a partida porque um jogador desistiu: 'surrender' (rendição) ou 'abandon' (saiu e não voltou)
export function forfeit(s, loser, reason = 'surrender') {
  if (s.phase === 'over') return [];
  s.winner = 1 - loser;
  s.endReason = reason;
  s.phase = 'over';
  s.mare = null;
  s.steal = null;
  return [{ t: 'win', p: s.winner, reason }];
}
