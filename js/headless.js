// Partida IA x IA sem interface (usada no torneio e nos testes).
import { newGame, act, mareGive, stealPick, pendingDeciders, viewFor } from './engine.js';
import { decideAction, chooseMareGive, chooseSteal } from './ai.js';

export function playHeadless(levels, { starter = 0, seed, names } = {}) {
  const s = newGame({ starter, seed, names });
  let guard = 0;
  // RNG da IA derivado do estado, para partidas reproduzíveis
  let aiSeed = (s.seed ^ 0x9e3779b9) | 0;
  const rng = () => {
    let t = (aiSeed = (aiSeed + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  while (s.phase !== 'over') {
    if (++guard > 20000) throw new Error('loop infinito');
    const who = pendingDeciders(s);
    if (s.phase === 'action') {
      const p = who[0];
      act(s, decideAction(s, p, levels[p], rng));
    } else if (s.phase === 'mare') {
      for (const p of who) if (s.phase === 'mare') mareGive(s, p, chooseMareGive(viewFor(s, p), levels[p], rng));
    } else if (s.phase === 'steal') {
      stealPick(s, chooseSteal(viewFor(s, who[0]), rng));
    } else throw new Error('fase inesperada ' + s.phase);
  }
  return { winner: s.winner, turns: s.turn, reason: s.endReason, state: s };
}
