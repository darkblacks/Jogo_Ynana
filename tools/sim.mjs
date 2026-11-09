// Simula muitas partidas IA x IA para validar o motor e o equilíbrio da IA.
import { playHeadless } from '../frontend/js/headless.js';
import { BASES, DECK_COMPOSITION } from '../frontend/js/engine.js';
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const DECK_SIZE = sum(DECK_COMPOSITION.atk) + sum(DECK_COMPOSITION.def) + DECK_COMPOSITION.mare + (DECK_COMPOSITION.saque || 0);

const N = +(process.argv[2] || 400);
const lv = (process.argv[3] || 'facil,medio,dificil').split(',');
let ok = true;
for (const a of lv) for (const b of lv) {
  let wins = 0, turns = 0, limit = 0;
  for (let i = 0; i < N; i++) {
    const starter = i % 2;
    const r = playHeadless([a, b], { starter, seed: i * 7919 + 13 });
    // invariantes: 28 cartas por jogador no total do jogo (somando os dois)
    const s = r.state;
    let total = 0;
    for (const p of s.players) {
      total += p.deck.length + p.hand.length;
      for (const x of BASES) if (p.bases[x].def) total++;
      if (p.bases.torre.stored) total++;
    }
    if (total !== 2 * DECK_SIZE) { ok = false; console.error('cartas perdidas!', total); }
    if (r.winner === 0) wins++;
    turns += r.turns;
    if (r.reason === 'limit') limit++;
  }
  console.log(`${a.padEnd(8)} x ${b.padEnd(8)}  vitórias do 1º: ${(100 * wins / N).toFixed(0).padStart(3)}%  turnos médios: ${(turns / N).toFixed(1)}  limite: ${limit}`);
}
if (!ok) process.exit(1);
