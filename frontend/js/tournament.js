// Gachaqui — torneio eliminatório de 8 jogadores (quartas, semifinal, final).
import { playHeadless } from './headless.js';

export const ROUND_NAMES = ['Quartas de final', 'Semifinal', 'Final'];

export const RIVALS = [
  { name: 'Marujo Tito', level: 'facil', motto: 'Ainda aprendendo a dar nó.' },
  { name: 'Dona Gaivota', level: 'facil', motto: 'Rouba tudo que brilha.' },
  { name: 'Corsária Iara', level: 'medio', motto: 'Ataca primeiro, pergunta depois.' },
  { name: 'Capitão Brás', level: 'medio', motto: 'Nunca deixa o Porto sem escudo.' },
  { name: 'Baronesa Névoa', level: 'dificil', motto: 'Ninguém vê o que ela esconde.' },
  { name: 'Mestre Salgado', level: 'dificil', motto: 'Calcula cada onda.' },
  { name: 'O Velho Farol', level: 'lendario', motto: 'Já viu todas as marés.' },
];

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createTournament(playerName, bestOf) {
  // O jogador fica na metade de cima; o Lendário sempre na metade de baixo (só na final).
  const legend = RIVALS.find((r) => r.level === 'lendario');
  const others = shuffle(RIVALS.filter((r) => r !== legend));
  // adversário das quartas: alguém de nível fácil ou médio
  const firstIdx = others.findIndex((r) => r.level === 'facil' || r.level === 'medio');
  const first = others.splice(firstIdx, 1)[0];
  const top = [{ name: playerName, level: null, human: true }, first, others[0], others[1]];
  const bottom = shuffle([legend, others[2], others[3], others[4]]);
  const players = [...top, ...bottom].map((p, i) => ({ ...p, id: i }));
  const rounds = [[], [], []];
  for (let i = 0; i < 4; i++) rounds[0].push(newMatch(i * 2, i * 2 + 1));
  return { v: 1, bestOf, players, rounds, round: 0, champion: null, humanOut: false, createdAt: Date.now() };
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
    const r = playHeadless([pa.level, pb.level], { starter: side, names: [pa.name, pb.name] });
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
