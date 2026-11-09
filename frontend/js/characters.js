// Personagens de "Os Contos de Ynana" no Gachaqui.
//
// Para editar: cada personagem tem retrato, força da IA, estilo de jogo e falas por situação.
// As falas marcadas como sugestão podem ser trocadas à vontade — é só texto.
//
// ai.base    nível de partida: 'facil' | 'medio' | 'dificil' | 'lendario'
// ai.search  quantas simulações por jogada (0 = só heurística). Mais = mais forte e mais lento.
// ai.style   personalidade em jogo (1 = neutro): atk, def, risk, tower, mare, thief
//
// Situações das falas:
//   intro     antes da partida            start    quando a partida começa
//   hit       ela/ele acerta uma base sua  fell     derruba uma base sua
//   blocked   o ataque dela/dele é anulado defended  anula um ataque seu
//   hurt      você acerta uma base dela/dele  lost   você derruba uma base dela/dele
//   steal     pega carta da sua mão (Torre) mare    quando sai uma Maré
//   bonus     ganha 2 ações                win / lose  fim da partida

export const CHARACTERS = [
  {
    id: 'ynana',
    name: 'Ynana Merx',
    short: 'Ynana',
    title: 'A pequena estrategista',
    blurb: 'Herdeira da Trademerx, híbrida de raposa. Método antes de impulso.',
    avatar: 'assets/chars/ynana.webp',
    bust: 'assets/chars/ynana-busto.webp',
    color: '#8e1b1b',
    styleLabel: 'Estrategista',
    ai: { base: 'lendario', search: 80, style: { tower: 1.05, mare: 1.05 } },
    boss: 1, // chefe final do torneio
    lines: {
      intro: ['O mar sempre foi minha casa. Este tabuleiro também.', 'Método antes de impulso. Vamos ver o seu.', 'Acho que desta vez quem dá as cartas sou eu.'],
      start: ['Embaralhe direito. Eu percebo.', 'Sem pressa. Eu tenho a noite toda.'],
      hit: ['Previsível.', 'Eu disse que vinha.', 'Anotado. E cobrado.'],
      fell: ['Uma a menos. Fica mais fácil de contar.', 'Isso não caiu. Eu derrubei.'],
      blocked: ['Pelamor de Deus…', 'Tudo bem. Eu tenho método.'],
      defended: ['Achou mesmo que ia passar?', 'Eu li essa jogada três turnos atrás.'],
      hurt: ['Hm. Anotado.', 'Não vai acontecer duas vezes.'],
      lost: ['Pelamor de Deus…', 'Tudo bem. Ainda tenho o que preciso.'],
      steal: ['Obrigada. Vou cuidar bem dela.'],
      mare: ['Vamos ver o que a maré traz.'],
      bonus: ['Duas jogadas. Eu não desperdiço nenhuma.'],
      win: ['Aposta é aposta. Hoje você dorme cedo.', 'Método. Sempre o método.'],
      lose: ['…De novo amanhã. E eu escolho o baralho.', 'Pelamor de Deus. Muito bem jogado.'],
    },
  },
  {
    id: 'rufus',
    name: 'Rufus Albarata',
    short: 'Rufus',
    title: 'O Ursão',
    blurb: 'Marujo de poucas palavras e ternura ranzinza. Quem segura a Trademerx por dentro.',
    avatar: 'assets/chars/rufus.webp',
    bust: 'assets/chars/rufus-busto.webp',
    color: '#1d2f5e',
    styleLabel: 'Paciente',
    ai: { base: 'dificil', search: 24, style: { def: 1.15, risk: 0.85 } },
    boss: 2, // penúltimo desafio (semifinal)
    lines: {
      intro: ['Chá e biscoitos resolvem quase tudo, sabia? O resto se resolve aqui.', 'Não sou homem de mansões. Mas de cartas, sou.'],
      start: ['Hm. Vamos lá.', 'Senta direito. Isso vai demorar.'],
      hit: ['Hm.', 'Fica de olho.'],
      fell: ['Já vi tempestade pior que você.', 'Era de madeira podre mesmo.'],
      blocked: ['Hmpf.', 'De novo amanhã.'],
      defended: ['Por aqui não passa.', 'Velho, mas não bobo.'],
      hurt: ['…Não foi de todo ruim.', 'Hm. Sorte.'],
      lost: ['A maior? Ainda estou vivo, então nunca foi tão grande assim, hein?', 'Já perdi coisa mais importante.'],
      steal: ['Isso aqui fica comigo.'],
      mare: ['O mar devolve o que quer, quando quer.'],
      bonus: ['Duas vezes. Sem pressa.'],
      win: ['Vá dormir cedo. Aposta é aposta.', 'Chá. Agora.'],
      lose: ['De novo amanhã.', 'Hm. …Não conta pra ninguém.'],
    },
  },
  {
    id: 'hela',
    name: 'Hela Falcobane',
    short: 'Hela',
    title: 'A pirata caolha',
    blurb: 'Barulhenta e impulsiva: entra antes de pensar e pensa depois, com a faca na mão.',
    avatar: 'assets/chars/hela.webp',
    bust: 'assets/chars/hela-busto.webp',
    color: '#b5501a',
    styleLabel: 'Impulsiva',
    ai: { base: 'dificil', search: 4, noise: 1.0, randomChance: 0.06, style: { atk: 1.45, risk: 1.7, def: 0.7, tower: 0.7 } },
    lines: {
      intro: ['Eu jogava pedra nos tubarões pra eles chegarem perto. Chega mais.', 'Primeiro eu ataco. Depois eu penso.'],
      start: ['Bora! Tô com pressa!', 'Vai, vai, vai!'],
      hit: ['HA! Sentiu essa?', 'Na mosca!', 'Isso que é abordagem!'],
      fell: ['Afundou! Quer ajuda pra nadar?', 'Pro fundo do mar com isso!'],
      blocked: ['Tch. Sorte.', 'Escudo covarde.'],
      defended: ['Bateu e voltou!', 'Achou que eu ia deixar a porta aberta?'],
      hurt: ['Ah, é assim? Agora ficou divertido.', 'Ai! Gostei.'],
      lost: ['Isso foi um arranhão. Já perdi coisa maior.', 'Tá. Agora eu fiquei brava.'],
      steal: ['Pirata que se preza não pede, pega.'],
      mare: ['Maré boa é maré braba!'],
      bonus: ['Duas? Perfeito. Mais estrago.'],
      win: ['Mais um pro meu baú!', 'HA! Quem é a melhor? Eu!'],
      lose: ['Revanche. Agora. Não, sério, agora.', 'Tá, tá. Foi bom. Não se acostuma.'],
    },
  },
  {
    id: 'almosafar',
    name: 'Al-Mosafar',
    short: 'Al-Mosafar',
    title: 'O aristocrata',
    blurb: 'Crocodilo da Alta Elite, de faixa e brasão. Sorri demais para quem está perdendo.',
    avatar: 'assets/chars/almosafar.webp',
    bust: 'assets/chars/almosafar-busto.webp',
    color: '#3e6b2a',
    styleLabel: 'Calculista',
    ai: { base: 'medio', search: 0, style: { tower: 1.6, mare: 1.35, def: 1.15, risk: 0.7 } },
    lines: {
      intro: ['Que prazer. Sempre aprecio um adversário… nutritivo.', 'Sente-se. Eu insisto.'],
      start: ['Comecemos, então. Com calma.'],
      hit: ['Ah, perdão. Foi deliberado.', 'Tudo tem seu preço.'],
      fell: ['Este era o seu preço.', 'Uma aquisição muito agradável.'],
      blocked: ['Paciência. O rio sempre chega ao mar.'],
      defended: ['Minhas portas só se abrem com convite.'],
      hurt: ['Encantador. Vou me lembrar disso.'],
      lost: ['Um investimento de longo prazo, apenas.', 'Hm. Prejuízo contábil.'],
      steal: ['Considere uma taxa.'],
      mare: ['Trocas… minha especialidade.'],
      bonus: ['Duas jogadas. Os juros correm a meu favor.'],
      win: ['Foi um prazer fazer negócios com você.'],
      lose: ['Hmm. Os juros, eu cobro na próxima.'],
    },
  },
  {
    id: 'ibrahim',
    name: 'Samir Ibrahim Sanlucaco',
    short: 'Ibrahim',
    title: 'O bandido do porto',
    blurb: 'Gente do povão, das ruas e dos bandidos locais. De olho na sua Torre — e nas suas cartas.',
    avatar: null, // falta a imagem
    bust: null,
    color: '#6b4a2a',
    styleLabel: 'Ladino',
    ai: { base: 'medio', search: 0, noise: 1.1, style: { thief: 2.2, mare: 1.6, atk: 1.1 } },
    lines: {
      intro: ['Relaxa, eu só vim jogar… e talvez levar umas cartas.', 'Que torre bonita a sua. Seria uma pena…'],
      start: ['Valendo!'],
      hit: ['Essa foi de graça.', 'Ninguém viu nada, né?'],
      fell: ['Caiu! Que azar o seu.', 'Prédio velho, parceiro.'],
      blocked: ['Opa, opa. Calma aí.'],
      defended: ['Tá trancado, parceiro.'],
      hurt: ['Ei! Isso é desonesto… eu acho.'],
      lost: ['Tranquilo. Tenho outros esconderijos.'],
      steal: ['Achado não é roubado.', 'Isso aqui é meu agora.'],
      mare: ['A maré mexeu nos bolsos de todo mundo, hein?'],
      bonus: ['Duas mãos leves, duas jogadas.'],
      win: ['Foi bom negociar. Pra mim.'],
      lose: ['Tá bom, tá bom. Hoje eu deixo.'],
    },
  },
  // Personagens provisórios: completam o torneio até chegarem as fichas dos outros personagens.
  {
    id: 'tito', name: 'Marujo Tito', short: 'Tito', title: 'Grumete', blurb: 'Ainda aprendendo a dar nó.',
    avatar: null, bust: null, color: '#3d7a3a', styleLabel: 'Afobado', extra: true,
    ai: { base: 'facil' },
    lines: { intro: ['É… é a minha vez já?'], hit: ['Acertei! Acho.'], lost: ['Ai, ai, ai.'], win: ['Eu ganhei?! Eu ganhei!'], lose: ['Ah… de novo.'] },
  },
  {
    id: 'gaivota', name: 'Dona Gaivota', short: 'Gaivota', title: 'Comerciante do cais', blurb: 'Rouba tudo que brilha.',
    avatar: null, bust: null, color: '#5d7f99', styleLabel: 'Gananciosa', extra: true,
    ai: { base: 'facil', style: { thief: 1.8, mare: 1.4 } },
    lines: { intro: ['Que cartas bonitas… são suas?'], steal: ['Brilhava. Agora é minha.'], win: ['Tudo que brilha vem pra mim!'], lose: ['Hmpf. Nem brilhava tanto.'] },
  },
  {
    id: 'bras', name: 'Capitão Brás', short: 'Brás', title: 'Capitão mercante', blurb: 'Nunca deixa o Porto sem escudo.',
    avatar: null, bust: null, color: '#8a6a1c', styleLabel: 'Cauteloso', extra: true,
    ai: { base: 'medio', style: { def: 1.4, atk: 0.85 } },
    lines: { intro: ['Escudo no Porto, sempre.'], defended: ['Eu avisei: escudo no Porto.'], win: ['Prudência vence tempestade.'], lose: ['Bom vento pra você.'] },
  },
];

export const charById = (id) => CHARACTERS.find((c) => c.id === id) || null;

// Escolhe uma fala sem repetir a anterior da mesma situação
const lastLine = {};
export function lineFor(ch, situation, rng = Math.random) {
  const list = ch && ch.lines && ch.lines[situation];
  if (!list || !list.length) return null;
  let i = Math.floor(rng() * list.length);
  const key = ch.id + situation;
  if (list.length > 1 && i === lastLine[key]) i = (i + 1) % list.length;
  lastLine[key] = i;
  return list[i];
}

export const initials = (ch) => (ch ? ch.short.charAt(0).toUpperCase() : '?');
