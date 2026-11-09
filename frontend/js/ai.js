// Gachaqui — IA. Só enxerga viewFor(): nunca vê mão, defesas escondidas ou Torre do adversário.
import { BASES, DECK_COMPOSITION } from './engine.js';
import { legalActions as _legal, act as _act, mareGive as _mareGive, stealPick as _steal, pendingDeciders as _pend, viewFor as _view, defenseVisible as _vis } from './engine.js';

export const LEVELS = {
  facil: { label: 'Fácil', randomChance: 0.4, noise: 2.5, smartPrior: false, smartGive: false },
  medio: { label: 'Médio', randomChance: 0.08, noise: 1.0, smartPrior: false, smartGive: true },
  dificil: { label: 'Difícil', randomChance: 0, noise: 0.15, smartPrior: true, smartGive: true, search: 16 },
  lendario: { label: 'Lendário', randomChance: 0, noise: 0.1, smartPrior: true, smartGive: true, search: 48 },
};

const up = (bases, b) => bases[b].hp > 0;
const standing = (bases) => BASES.filter((b) => up(bases, b)).length;

// Distribuição de valores de uma defesa escondida
function defenseDist(level) {
  if (!level.smartPrior) return { 2: 0.25, 3: 0.25, 6: 0.25, 9: 0.25 };
  const comp = DECK_COMPOSITION.def;
  const tot = Object.values(comp).reduce((a, b) => a + b, 0);
  const d = {};
  for (const [v, q] of Object.entries(comp)) d[v] = q / tot;
  return d;
}

// Valor de acertar um golpe na base b do adversário
function hitGain(view, b) {
  const ob = view.opp.bases;
  const x = ob[b];
  if (x.hp === 1 && standing(ob) === 1) return 1000; // vitória
  let g;
  if (b === 'forte') g = x.hp === 2 ? 4 : 7.5;
  else if (b === 'porto') g = 7;
  else g = 6 + (view.opp.handCount > 0 ? 1.2 : 0) + (ob.torre.stored ? 1 : 0);
  // derrubar a penúltima base deixa a vitória perto
  if (x.hp === 1 && standing(ob) === 2) g += 3;
  return g;
}

// Valor de perder (levar golpe em) uma base própria
function loseValue(view, b) {
  const mb = view.bases;
  const x = mb[b];
  if (x.hp === 1 && standing(mb) === 1) return 60;
  let v;
  if (b === 'forte') v = x.hp === 2 ? 3.5 : 7.5;
  else if (b === 'porto') v = 6.5;
  else v = 5.5 + (mb.torre.stored ? 1 : 0) + (view.hand.length > 2 ? 0.8 : 0);
  if (x.hp === 1 && standing(mb) === 2) v += 4;
  return v;
}

function scoreAttack(view, card, b, level) {
  const slot = view.opp.bases[b];
  const gain = hitGain(view, b);
  const cost = card.v * 0.18; // prefere gastar a carta mais fraca que resolve
  if (!slot.def) return gain + 1.5 - cost;
  let dist;
  if (slot.def.card) dist = { [slot.def.card.v]: 1 }; // Forte danificado: defesa visível
  else dist = defenseDist(level);
  let pw = 0, pt = 0, pl = 0;
  for (const [v, p] of Object.entries(dist)) {
    if (card.v > +v) pw += p;
    else if (card.v === +v) pt += p;
    else pl += p;
  }
  const removeDef = 1.2; // qualquer combate tira a defesa da base
  const penalty = 4.5 + (view.opp.handCount > 3 ? 1 : 0); // adversário ganha 2 ações
  return pw * gain + (pt + pl) * removeDef - pl * penalty - cost * 0.6;
}

function attackPressure(view) {
  // chance de o adversário atacar no próximo turno
  let p = Math.min(1, 0.35 + view.opp.handCount * 0.12);
  if (view.opp.bonus) p = Math.min(1, p + 0.3);
  return p;
}

const PROTECT = { 2: 0.42, 3: 0.55, 6: 0.8, 9: 0.93 };

function scoreDefend(view, card, b) {
  const threat = loseValue(view, b);
  const pressure = attackPressure(view);
  let s = threat * PROTECT[card.v] * pressure;
  // não desperdiçar escudo forte em base pouco valiosa
  if (card.v >= 6 && threat < 5) s -= 0.8;
  // quantas bases sem defesa: a última sem defesa é o alvo óbvio
  const undefended = BASES.filter((x) => up(view.bases, x) && !view.bases[x].def).length;
  if (undefended === 1) s += 1.5;
  return s;
}

function cardWorth(c) {
  // usado para escolher o que entregar na Maré / guardar
  if (c.kind === 'mare') return 3.5;
  if (c.kind === 'atk') return { 1: 1, 3: 3, 6: 6, 9: 9.5 }[c.v];
  return { 2: 1.5, 3: 2.5, 6: 5.5, 9: 8.5 }[c.v];
}

function scoreStore(view, card) {
  // Guardar protege a carta da Maré e do saque da Torre
  const best = Math.max(...view.hand.map(cardWorth));
  return cardWorth(card) === best ? 0.4 + best * 0.05 : 0.1;
}

function scoreMare(view, level) {
  const worst = Math.min(...view.hand.filter((c) => c.kind !== 'mare').map(cardWorth).concat([5]));
  // trocar compensa quando temos lixo para entregar e o adversário tem mão
  if (view.opp.handCount === 0) return -1;
  return level.smartGive ? 2.6 - worst * 0.5 : 0.6;
}

function scoreRetrieve(view) {
  const c = view.bases.torre.stored;
  if (!c) return -99;
  if (c.kind === 'atk') {
    const open = BASES.some((b) => up(view.opp.bases, b) && !view.opp.bases[b].def);
    return open || c.v === 9 ? 3 : 0.5;
  }
  if (c.kind === 'def') {
    const need = BASES.some((b) => up(view.bases, b) && !view.bases[b].def);
    return need ? 2.5 : 0.2;
  }
  return 1;
}

export function chooseAction(view, legal, levelKey, rng = Math.random) {
  const level = LEVELS[levelKey] || LEVELS.medio;
  const nonPass = legal.filter((a) => a.type !== 'pass');
  if (!nonPass.length) return legal[0];
  const byId = Object.fromEntries(view.hand.map((c) => [c.id, c]));

  // golpe da vitória é sempre visto (até no fácil, na maioria das vezes)
  const scored = legal.map((a) => {
    let s;
    const c = byId[a.cardId];
    switch (a.type) {
      case 'attack': s = scoreAttack(view, c, a.base, level); break;
      case 'defend': s = scoreDefend(view, c, a.base); break;
      case 'store': s = scoreStore(view, c); break;
      case 'mare': s = scoreMare(view, level); break;
      case 'retrieve': s = scoreRetrieve(view); break;
      default: s = -50;
    }
    s += (rng() - 0.5) * 2 * level.noise;
    return { a, s };
  });

  if (rng() < level.randomChance) {
    const pool = nonPass.filter((a) => a.type !== 'retrieve');
    if (pool.length) return pool[Math.floor(rng() * pool.length)];
  }
  scored.sort((x, y) => y.s - x.s);
  // "retrieve" é grátis: só faz se valer mais que nada
  if (scored[0].a.type === 'retrieve' && scored[0].s < 1) {
    const next = scored.find((x) => x.a.type !== 'retrieve');
    if (next) return next.a;
  }
  return scored[0].a;
}

export function chooseMareGive(view, levelKey, rng = Math.random) {
  const level = LEVELS[levelKey] || LEVELS.medio;
  const hand = view.hand;
  if (!level.smartGive || rng() < level.randomChance) return hand[Math.floor(rng() * hand.length)].id;
  return hand.slice().sort((a, b) => cardWorth(a) - cardWorth(b))[0].id;
}

export function chooseSteal(view, rng = Math.random) {
  return Math.floor(rng() * Math.max(1, view.stealCount));
}

// ---------- IA de busca (Monte Carlo com determinização) ----------
// A IA não vê a informação escondida: antes de cada simulação, as cartas que ela não
// conhece (mão, baralho, defesas viradas e Torre do adversário) são embaralhadas e
// redistribuídas aleatoriamente, e a ordem do próprio baralho também é sorteada.

function determinize(s, p, rng) {
  const c = JSON.parse(JSON.stringify(s));
  c.seed = (rng() * 2 ** 31) | 0;
  const op = c.players[1 - p];
  const me = c.players[p];
  const pool = [...op.hand, ...op.deck];
  const hiddenDefs = [];
  for (const b of BASES) {
    if (op.bases[b].def && !_vis(op, b)) { pool.push(op.bases[b].def.card); hiddenDefs.push(b); }
  }
  if (op.bases.torre.stored) pool.push(op.bases.torre.stored);
  shuffleWith(pool, rng);
  // defesas escondidas precisam ser cartas azuis
  for (const b of hiddenDefs) {
    const i = pool.findIndex((x) => x.kind === 'def');
    op.bases[b].def.card = pool.splice(i >= 0 ? i : 0, 1)[0];
  }
  if (op.bases.torre.stored) op.bases.torre.stored = pool.pop();
  op.hand = pool.splice(0, op.hand.length);
  op.deck = pool;
  shuffleWith(me.deck, rng);
  return c;
}

function shuffleWith(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function rollout(c, rng, maxSteps = 600) {
  let n = 0;
  while (c.phase !== 'over' && n++ < maxSteps) {
    const who = _pend(c);
    if (c.phase === 'action') _act(c, chooseAction(_view(c, who[0]), _legal(c), 'medio', rng));
    else if (c.phase === 'mare') { for (const q of who) if (c.phase === 'mare') _mareGive(c, q, chooseMareGive(_view(c, q), 'medio', rng)); }
    else if (c.phase === 'steal') _steal(c, chooseSteal(_view(c, who[0]), rng));
  }
  return c.winner;
}

export function chooseActionSearch(s, p, rng = Math.random, rollouts = 24) {
  const legal = _legal(s);
  if (legal.length === 1) return legal[0];
  const view = _view(s, p);
  // filtra ações claramente ruins para economizar tempo
  const prelim = legal.map((a) => ({ a, h: heuristicScore(view, a) })).sort((x, y) => y.h - x.h);
  if (prelim[0].h >= 900) return prelim[0].a; // vitória imediata
  const cands = prelim.slice(0, 7);
  let best = null;
  for (const cand of cands) {
    let wins = 0;
    for (let i = 0; i < rollouts; i++) {
      const c = determinize(s, p, rng);
      _act(c, cand.a);
      if (rollout(c, rng) === p) wins++;
    }
    const score = wins / rollouts + cand.h * 0.002; // desempate pela heurística
    if (!best || score > best.score) best = { a: cand.a, score };
  }
  return best.a;
}

function heuristicScore(view, a) {
  const level = LEVELS.dificil;
  const c = view.hand.find((x) => x.id === a.cardId);
  switch (a.type) {
    case 'attack': return scoreAttack(view, c, a.base, level);
    case 'defend': return scoreDefend(view, c, a.base);
    case 'store': return scoreStore(view, c);
    case 'mare': return scoreMare(view, level);
    case 'retrieve': return scoreRetrieve(view);
    default: return -50;
  }
}

// Ponto de entrada único: decide a ação do jogador p no estado s.
export function decideAction(s, p, levelKey, rng = Math.random) {
  const level = LEVELS[levelKey] || LEVELS.medio;
  if (level.search) return chooseActionSearch(s, p, rng, level.search);
  return chooseAction(_view(s, p), _legal(s), levelKey, rng);
}
