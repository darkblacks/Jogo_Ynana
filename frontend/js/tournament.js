// Gachaqui — torneio eliminatório de 8 jogadores (quartas, semifinal, final).
import { playHeadless } from './headless.js';

export const ROUND_NAMES = ['Quartas de final', 'Semifinal', 'Final'];

import { CHARACTERS, charById } from './characters.js';

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const toPlayer = (ch) => ({ name: ch.name, short: ch.short, charId: ch.id, level: ch.ai.base, motto: ch.title });

// Perfil de IA de um participante (personagem, ou nível antigo de torneios salvos)
export function profileOf(p) {
  const ch = p.charId && charById(p.charId);
  return ch ? ch.ai : p.level;
}

// Monta a chave: os chefes (Ynana e Rufus) sempre entram; os outros são sorteados.
// O jogador fica na metade de cima com o Rufus (semifinal); a Ynana fica na outra metade (final).
export function createTournament(playerName, bestOf) {
  const final = CHARACTERS.find((c) => c.boss === 1);
  const semi = CHARACTERS.find((c) => c.boss === 2);
  const story = shuffle(CHARACTERS.filter((c) => !c.boss && !c.extra));
  const extras = shuffle(CHARACTERS.filter((c) => c.extra));
  const others = [...story, ...extras].slice(0, 5); // personagens da história têm prioridade
  shuffle(others);
  // adversário das quartas: o mais fraco dos sorteados
  others.sort((a, b) => (a.power || 0) - (b.power || 0));
  const first = others.shift();
  shuffle(others);
  const top = [{ name: playerName, level: null, human: true }, toPlayer(first), toPlayer(others[0]), toPlayer(semi)];
  const bottom = shuffle([toPlayer(final), toPlayer(others[1]), toPlayer(others[2]), toPlayer(others[3])]);
  const players = [...top, ...bottom].map((p, i) => ({ ...p, id: i }));
  const rounds = [[], [], []];
  for (let i = 0; i < 4; i++) rounds[0].push(newMatch(i * 2, i * 2 + 1));
  return { v: 2, bestOf, players, rounds, round: 0, champion: null, humanOut: false, createdAt: Date.now() };
}

function newMatch(a, b) {
  return { a, b, wins: [0, 0], winner: null, games: [], firstStarter: Math.random() < 0.5 ? 0 : 1 };
}

export const winsNeeded = (t) => Math.ceil(t.bestOf / 2);

export function humanMatch(t) {
  if (t.champion != null || t.humanOut) return null;
  return t.rounds[t.round].find((m) => t.players[m.a].human || t.players[m.b].human) || null;
}

// Quem começa o próximo jogo da série (alterna). Retorna o índice do lado: 0 = a, 1 = b.
export function nextStarterSide(m) {
  return (m.firstStarter + m.games.length) % 2;
}

export function recordGame(t, m, winnerSide, turns) {
  m.wins[winnerSide]++;
  m.games.push({ w: winnerSide, turns });
  if (m.wins[winnerSide] >= winsNeeded(t)) {
    m.winner = winnerSide === 0 ? m.a : m.b;
    const loser = winnerSide === 0 ? m.b : m.a;
    if (t.players[loser].human) t.humanOut = true;
  }
}

export function simulateMatch(t, m) {
  while (m.winner == null) {
    const side = nextStarterSide(m);
    const pa = t.players[m.a], pb = t.players[m.b];
    const r = playHeadless([profileOf(pa), profileOf(pb)], { starter: side, names: [pa.name, pb.name] });
    recordGame(t, m, r.winner, r.turns);
  }
}

// Simula as partidas IA x IA que faltam na rodada atual
export function simulatePendingAI(t) {
  for (const m of t.rounds[t.round]) {
    if (m.winner != null) continue;
    if (t.players[m.a].human || t.players[m.b].human) continue;
    simulateMatch(t, m);
  }
}

export function roundDone(t) {
  return t.rounds[t.round].every((m) => m.winner != null);
}

// Avança para a próxima rodada (ou define o campeão)
export function advance(t) {
  if (!roundDone(t)) return false;
  const ms = t.rounds[t.round];
  if (t.round === 2) {
    t.champion = ms[0].winner;
    return true;
  }
  const next = [];
  for (let i = 0; i < ms.length; i += 2) next.push(newMatch(ms[i].winner, ms[i + 1].winner));
  t.rounds[t.round + 1] = next;
  t.round++;
  return true;
}
