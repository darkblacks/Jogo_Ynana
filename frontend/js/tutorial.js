// Tutorial do Gachaqui, ensinado pelo Roku.
// É uma partida de verdade (o mesmo motor de regras), com as cartas arrumadas para que
// cada regra apareça na hora certa. O jogador só pode fazer a jogada pedida em cada passo.
//
// Tipos de passo:
//   { say, hl }                     o Roku explica; o jogador clica em "Continuar"
//   { expect, say, hl }             o jogador precisa fazer esta jogada
//   { roku }                        o Roku faz esta jogada
//   { steal, say }                  o jogador escolhe uma carta da mão do Roku (Torre caiu)
//   { mare, say }                   Maré: o jogador escolhe a carta que entrega
//   { end }                         fim
//
// hl (destaques): 'opp-bases', 'my-bases', 'opp-base:torre', 'my-base:forte', 'opp-def:forte',
//   'my-def:forte', 'my-stored', 'hand', 'hand:atk3', 'deck', 'hud-opp', 'btn:Guardar', 'btn:Pegar'

const C = (kind, v) => ({ kind, v });

export function tutorialState(E, playerName) {
  const s = E.newGame({ names: [playerName, 'Roku'], starter: 0, seed: 1812 });
  let n = 0;
  const mk = (owner) => ([kind, v]) => ({ id: `tut${owner}-${n++}`, kind, v });
  const filler = (k) => Array.from({ length: k }, () => ['def', 2]);
  const [me, roku] = s.players;
  me.hand = [['atk', 3], ['atk', 6], ['atk', 9], ['def', 6], ['def', 2], ['def', 3], ['def', 2]].map(mk(0));
  me.deck = [['def', 3], ['atk', 3], ['def', 2], ['def', 9], ['def', 2], ['atk', 3], ['def', 3], ...filler(14)].map(mk(0));
  roku.hand = [['def', 3], ['atk', 3], ['atk', 1], ['def', 6], ['def', 2]].map(mk(1));
  roku.deck = [['def', 2], ['atk', 1], ['def', 2], ['def', 3], ['mare', 0], ['def', 2], ['def', 2], ...filler(14)].map(mk(1));
  s.initialEvents = [];
  return s;
}

export const TUTORIAL = [
  { say: 'E aí! Eu sou o Roku. A Raposa vive dizendo que eu sou o melhor professor de Gachaqui de Albahara… então bora, eu te ensino.', hl: ['hud-opp'] },
  { say: 'O objetivo é um só: derrubar as três bases do adversário — <b>Forte</b>, <b>Torre</b> e <b>Porto</b>. As minhas estão lá em cima; as suas, aqui embaixo.', hl: ['opp-bases', 'my-bases'] },
  { say: 'A <b>Torre</b> e o <b>Porto</b> caem com 1 golpe. O <b>Forte</b> aguenta 2: no primeiro fica danificado, no segundo cai. Base que cai não volta.', hl: ['my-base:forte'] },
  { say: 'Cada base tem um poder. Com o <b>Porto</b> de pé, você compra <b>2 cartas</b> por turno (sem ele, só 1). A <b>Torre</b> guarda 1 carta escondida, fora da sua mão.', hl: ['my-base:porto', 'my-base:torre'] },
  { say: 'Essas são as suas cartas. <b style="color:#a3211e">Vermelhas atacam</b>: Espada 1, Lança 3, Ataque 6 e Canhão 9. <b style="color:#1d2f5e">Azuis defendem</b>: Escudo 2, 3, 6 e 9. Tem também a <b>Maré</b>, mas essa eu mostro depois.', hl: ['hand'] },
  { say: 'Todo turno tem duas etapas: primeiro você <b>compra</b> (você já comprou as 2 deste turno), depois faz <b>UMA ação</b>: atacar, defender ou guardar uma carta na Torre.', hl: ['hand', 'deck'] },

  { expect: { type: 'attack', kind: 'atk', v: 3, base: 'torre' }, say: 'Minha Torre está <b>sem defesa</b>. Clique na <b>Lança (3)</b> e depois na <b>minha Torre</b>, lá em cima.', hl: ['hand:atk3', 'opp-base:torre'] },
  { say: 'Base sem defesa: o ataque acerta direto. E a Torre cai com 1 golpe! Quando você derruba a Torre de alguém, pega <b>1 carta da mão</b> dessa pessoa — sem ver. A carta que estivesse guardada nela volta para o baralho do dono.' },
  { steal: true },
  { say: 'Pronto, essa carta agora é sua. Sua ação acabou, então a vez passa pra mim. Presta atenção no meu Forte…' },

  { roku: { type: 'defend', kind: 'def', v: 3, base: 'forte' } },
  { say: 'Coloquei uma <b>defesa</b> atrás do meu Forte, <b>virada para baixo</b>: você não sabe o valor. Cada base aceita só 1 defesa, e ela dura <b>2 turnos do dono</b>. Depois volta para o baralho, mesmo sem ser usada.', hl: ['opp-def:forte'] },
  { expect: { type: 'defend', kind: 'def', v: 6, base: 'forte' }, say: 'Sua vez de defender. Clique no <b>Escudo (6)</b> e depois no <b>seu Forte</b>.', hl: ['hand:def6', 'my-base:forte'] },
  { say: 'Isso! As bolinhas douradas embaixo do escudo mostram quantos turnos ele ainda dura. E o "oculta" quer dizer que eu não vejo o valor.', hl: ['my-def:forte'] },

  { roku: { type: 'attack', kind: 'atk', v: 3, base: 'forte' } },
  { say: 'Ai. Ataquei seu Forte com Lança 3 contra o seu Escudo 6. Olha como funciona o combate:<br>• Ataque <b>maior</b> que a defesa: atravessa e acerta a base.<br>• Ataque <b>igual</b>: o golpe é anulado.<br>• Ataque <b>menor</b>: anulado, e o defensor ganha <b>2 ações</b> no próximo turno.' },
  { say: 'Depois de qualquer combate, as duas cartas voltam para o fundo do baralho de quem jogou. E como meu ataque foi menor… você tem <b>2 ações</b> agora!' },

  { expect: { type: 'attack', kind: 'atk', v: 6, base: 'forte' }, say: 'Primeira ação: meu Forte tem uma defesa escondida. Arrisca o <b>Ataque (6)</b> nele.', hl: ['hand:atk6', 'opp-base:forte'] },
  { say: 'Atravessou! Meu escudo era 3. O Forte ficou <b>danificado</b> — e a partir de agora qualquer defesa nele fica <b>visível</b> para você.', hl: ['opp-base:forte'] },
  { expect: { type: 'store', kind: 'atk', v: 9 }, say: 'Segunda ação: <b>guarde o Canhão (9) na sua Torre</b>. Clique no Canhão e depois em "Guardar na Torre". Carta guardada fica fora da mão: ninguém troca nem rouba.', hl: ['hand:atk9', 'btn:Guardar', 'my-stored'] },

  { say: 'Agora é a minha vez… e olha o que eu comprei: uma <b>Maré</b>! Quando alguém compra Maré, ela é revelada na hora e <b>cada jogador entrega 1 carta da própria mão ao outro</b>. Depois ela volta para o fundo do baralho.' },
  { mare: { give: C('atk', 1) } },
  { say: 'Eu te dei uma <b>Espada (1)</b>. Parece fraca, mas já já vai servir. Ah: se a Maré vier na sua mão inicial, você pode usá-la como ação quando quiser.' },

  { roku: { type: 'defend', kind: 'def', v: 6, base: 'forte' } },
  { say: 'Pus um Escudo 6 no meu Forte. Como ele está danificado, a defesa fica <b>aberta</b>: você vê o valor. Guarda isso na cabeça.', hl: ['opp-def:forte'] },
  { say: 'Sua vez. Reparou que o escudo do seu Forte sumiu? Completou os 2 turnos e voltou para o baralho.', hl: ['my-base:forte'] },
  { expect: { type: 'retrieve' }, say: 'Pegar a carta da Torre de volta é <b>grátis</b>, mas só no começo do turno, antes da ação. Clique na <b>sua Torre</b> (o selo "Carta guardada" brilhando) ou no botão.', hl: ['my-stored', 'btn:Pegar'] },
  { expect: { type: 'attack', kind: 'atk', v: 1, base: 'porto' }, say: 'Meu <b>Porto</b> está sem defesa. Contra base aberta, qualquer ataque serve — use a <b>Espada (1)</b> e poupe as cartas fortes.', hl: ['hand:atk1', 'opp-base:porto'] },
  { say: 'Porto caído: agora eu só compro <b>1 carta</b> por turno. Me deixou mais pobre, hein?' },

  { roku: { type: 'attack', kind: 'atk', v: 1, base: 'porto' } },
  { say: 'Vingança! Seu Porto também caiu, então você também passa a comprar só 1. Por isso vale a pena proteger o Porto.', hl: ['my-base:porto'] },
  { expect: { type: 'attack', kind: 'atk', v: 9, base: 'forte' }, say: 'Última base: meu Forte danificado, com Escudo 6 visível. O <b>Canhão (9)</b> é maior que 6. Manda ver!', hl: ['hand:atk9', 'opp-base:forte'] },
  { end: true },
];
