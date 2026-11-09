// Personagens de "Os Contos de Ynana" no Gachaqui.
//
// Para editar: cada personagem tem retrato, força da IA, estilo de jogo e falas por situação.
// As falas marcadas como sugestão podem ser trocadas à vontade — é só texto.
//
// power      ordem de força no torneio (maior = mais forte)
// ai.base    nível de partida: 'facil' | 'medio' | 'dificil' | 'lendario'
// ai.search  quantas simulações por jogada (0 = só heurística). Mais = mais forte e mais lento.
// ai.width   quantas jogadas candidatas a busca compara (padrão 7)
// ai.rollout como ela imagina o resto da partida nas simulações (padrão: nível médio)
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
    power: 7, // força relativa (7 = mais forte)
    name: 'Ynana Merx',
    short: 'Ynana',
    title: 'A pequena estrategista',
    blurb: 'Herdeira da Trademerx, híbrida de raposa. Método antes de impulso.',
    avatar: 'assets/chars/ynana.webp',
    bust: 'assets/chars/ynana-busto.webp',
    color: '#8e1b1b',
    styleLabel: 'Estrategista',
    ai: { base: 'lendario', search: 48, width: 10, rollout: { base: 'dificil', search: 0, noise: 0.35, randomChance: 0 }, style: { tower: 1.05, mare: 1.05 } },
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
    power: 6, // força relativa (7 = mais forte)
    name: 'Rufus Albarata',
    short: 'Rufus',
    title: 'O Ursão',
    blurb: 'Marujo de poucas palavras e ternura ranzinza. Quem segura a Trademerx por dentro.',
    avatar: 'assets/chars/rufus.webp',
    bust: 'assets/chars/rufus-busto.webp',
    color: '#1d2f5e',
    styleLabel: 'Paciente',
    ai: { base: 'dificil', search: 16, style: { def: 1.15, risk: 0.85 } },
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
    power: 5, // força relativa (7 = mais forte)
    name: 'Hela Falcobane',
    short: 'Hela',
    title: 'A pirata caolha',
    blurb: 'Barulhenta e impulsiva: entra antes de pensar e pensa depois, com a faca na mão.',
    avatar: 'assets/chars/hela.webp',
    bust: 'assets/chars/hela-busto.webp',
    color: '#b5501a',
    styleLabel: 'Impulsiva',
    ai: { base: 'dificil', search: 2, noise: 1.2, randomChance: 0.08, style: { atk: 1.45, risk: 1.7, def: 0.7, tower: 0.7 } },
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
    power: 3, // força relativa (7 = mais forte)
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
    power: 2, // força relativa (7 = mais forte)
    name: 'Samir Ibrahim Sanlucaco',
    short: 'Ibrahim',
    title: 'O chefe do cais',
    blurb: 'Bandido do povão, coberto de ouro e de escamas. De olho na sua Torre — e nas suas cartas.',
    avatar: 'assets/chars/ibrahim.webp',
    bust: 'assets/chars/ibrahim-busto.webp',
    color: '#7a4a1e',
    styleLabel: 'Ladino',
    ai: { base: 'medio', search: 0, noise: 1.1, style: { thief: 2.2, mare: 1.6, atk: 1.1 } },
    lines: {
      intro: ['Relaxa. Eu só vim jogar… e talvez levar umas cartas.', 'Deixa eu acender isso aqui primeiro. Pronto. Pode perder.'],
      start: ['Valendo!', 'Mesa limpa, bolso cheio.'],
      hit: ['Essa foi de graça.', 'Ninguém viu nada, né?'],
      fell: ['Caiu! Que azar o seu.', 'Prédio velho, parceiro.'],
      blocked: ['Opa, opa. Calma aí.', 'Tsc. Esse escudo vai me custar caro.'],
      defended: ['Tá trancado, parceiro.', 'Aqui ninguém entra sem pagar.'],
      hurt: ['Ei! Isso é desonesto… eu acho.'],
      lost: ['Tranquilo. Tenho outros esconderijos.', 'Isso vai sair do seu bolso depois.'],
      steal: ['Achado não é roubado.', 'Isso aqui é meu agora.'],
      mare: ['A maré mexeu nos bolsos de todo mundo, hein?'],
      bonus: ['Duas mãos leves, duas jogadas.'],
      win: ['Foi bom negociar. Pra mim.', 'Mais um anel pra coleção.'],
      lose: ['Tá bom, tá bom. Hoje eu deixo.', 'Cê teve sorte. Eu tenho memória.'],
    },
  },
  {
    id: 'seraphine',
    power: 4, // força relativa (7 = mais forte)
    name: 'Seraphine Dreya',
    short: 'Seraphine',
    title: 'A dama da Andorinha',
    blurb: 'Alta Elite, joias de ouro e olhos de felina. Voltou de Vyrwyll na Andorinha a tempo de resgatar a Ynana e o Rufus.',
    avatar: 'assets/chars/seraphine.webp',
    bust: 'assets/chars/seraphine-busto.webp',
    color: '#9a7420',
    styleLabel: 'Elegante',
    ai: { base: 'dificil', search: 1, noise: 1.1, style: { def: 1.15, mare: 1.4, tower: 1.2, risk: 0.9 } },
    lines: {
      intro: ['Sente-se. Prometo ser gentil. No começo.', 'A Andorinha nunca chega atrasada. Eu também não.'],
      start: ['Vamos ver do que você é feito.', 'Com elegância, por favor.'],
      hit: ['Delicado, não?', 'Não leve para o lado pessoal.'],
      fell: ['Que pena. Era tão bonita.', 'Ouro não enferruja. Torres caem.'],
      blocked: ['Hm. Que deselegante.', 'Interessante. Muito interessante.'],
      defended: ['Ah, não. Assim não, meu bem.', 'Você bateu na porta errada.'],
      hurt: ['Arranhou o verniz. Só o verniz.', 'Ousado. Eu gosto.'],
      lost: ['Eu tenho outras.', 'Hm. Vou cobrar isso com juros e joias.'],
      steal: ['Combina mais comigo, você não acha?'],
      mare: ['O mar sempre me traz presentes.'],
      bonus: ['Duas jogadas. Uma para você assistir, outra para aplaudir.'],
      win: ['Foi um prazer. Para mim, principalmente.', 'Volte quando tiver mais cartas na manga.'],
      lose: ['Muito bem. Hoje você ganhou um brilho a mais.', 'Hm. Guardarei esta derrota com as minhas joias.'],
    },
  },
  {
    id: 'roku',
    power: 1, // força relativa (7 = mais forte)
    name: 'Roku Sonedrasta',
    short: 'Roku',
    title: 'O professor de rua',
    blurb: 'Nascido em Albahara, cria do povão. Quem te ensina a jogar Gachaqui — e quem chama a Ynana de "Raposa".',
    avatar: 'assets/chars/roku.webp',
    bust: 'assets/chars/roku-busto.webp',
    color: '#2b3a55',
    styleLabel: 'Malandro',
    ai: { base: 'facil', search: 0, style: { atk: 1.1, mare: 1.2 } },
    lines: {
      intro: ['Ué, já quer jogar comigo? Gostei.', 'Eu te ensinei tudo… quase tudo.'],
      start: ['Lembra do que eu te ensinei, hein?', 'Bora, sem medo.'],
      hit: ['Viu? Base sem escudo é convite.', 'Essa eu te ensinei, lembra?'],
      fell: ['Caiu! Aula grátis.', 'Sem defesa, sem base.'],
      blocked: ['Boa! Tá aprendendo.', 'Ih, escudo maior. Bem feito pra mim.'],
      defended: ['Achou que eu ia esquecer o escudo?', 'Lição do dia: defende antes.'],
      hurt: ['Ai! Isso doeu no orgulho.', 'Olha só, o aluno tá batendo no mestre.'],
      lost: ['Tá, essa foi boa. Muito boa.', 'A Raposa ia rir de mim agora.'],
      steal: ['Pega uma, devolve nunca.'],
      mare: ['Maré! Troca de presente, ninguém escolhe o que ganha.'],
      bonus: ['Duas ações! Agradeço o escudo.'],
      win: ['Bom jogo! Bora de novo?', 'Ainda não foi dessa vez, mas tá perto.'],
      lose: ['Pronto. Não tenho mais nada pra te ensinar.', 'Ganhou do professor. Vai contar pra todo mundo, né?'],
    },
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
