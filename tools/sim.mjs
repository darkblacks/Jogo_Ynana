// Simula muitas partidas IA x IA para validar o motor e o equilíbrio da IA.
import { playHeadless } from '../frontend/js/headless.js';
import { BASES } from '../frontend/js/engine.js';

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
    if (total !== 56) { ok = false; console.error('cartas perdidas!', total); }
    if (r.winner === 0) wins++;
    turns += r.turns;
    if (r.reason === 'limit') limit++;
  }
  console.log(`${a.padEnd(8)} x ${b.padEnd(8)}  vitórias do 1º: ${(100 * wins / N).toFixed(0).padStart(3)}%  turnos médios: ${(turns / N).toFixed(1)}  limite: ${limit}`);
}
if (!ok) process.exit(1);
