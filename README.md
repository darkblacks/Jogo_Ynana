# Gachaqui

Jogo de cartas de ataque e defesa para navegador, com IA adversária e torneio eliminatório de 8 jogadores.

## Como jogar

- **Torneio · 8 jogadores:** você e 7 capitães controlados pela IA disputam quartas, semifinal e final. Cada confronto pode ser melhor de 1, 3 ou 5. Os duelos entre IAs são simulados com as mesmas regras.
- **Partida rápida:** um jogo avulso contra a IA, no nível que você escolher.
- **Como jogar:** as regras completas estão dentro do jogo.

O progresso (torneio e partida em andamento) fica salvo no navegador.

### Níveis da IA

| Nível | Como joga |
|---|---|
| Fácil | Heurística com muitos erros aleatórios |
| Médio | Heurística: defende bases valiosas, ataca bases abertas, entrega a pior carta na Maré |
| Difícil | Monte Carlo: simula 16 partidas por jogada possível |
| Lendário | Monte Carlo com 48 simulações por jogada |

A IA **não trapaceia**: ela só vê o que um jogador veria. Antes de cada simulação, as cartas escondidas do adversário (mão, baralho, defesas viradas e Torre) são embaralhadas e redistribuídas.

## Rodar localmente

É um site estático, sem etapa de build. Sirva a pasta com qualquer servidor HTTP (os módulos JS não funcionam abrindo o arquivo direto com `file://`):

```bash
python3 -m http.server 8080
```

ou

```bash
npm start
```

Depois abra http://localhost:8080.

## Publicar na web

Qualquer hospedagem de arquivos estáticos serve.

- **GitHub Pages:** em *Settings → Pages*, escolha *Deploy from a branch*, a branch e a pasta `/ (root)`.
- **Netlify / Vercel / Cloudflare Pages:** importe o repositório; não há comando de build e o diretório de publicação é a raiz.

## Testes

Simula centenas de partidas IA x IA, confere se nenhuma carta se perde e mostra o equilíbrio entre níveis:

```bash
npm test
```

## Estrutura

```
index.html        telas e estrutura
css/style.css     visual
js/engine.js      regras (puro, sem DOM; estado em JSON)
js/ai.js          IA (heurística + Monte Carlo)
js/headless.js    partida IA x IA sem interface
js/tournament.js  chave do torneio
js/ui.js          interface, animações e salvamento
js/rules.js       texto das regras
assets/           cartas e tabuleiro (WebP otimizados)
tools/sim.mjs     simulador de testes
```

## Decisões de regra

As regras originais não fixam alguns detalhes. Estas são as "regras da casa" adotadas (podem ser mudadas em `js/engine.js`):

- Baralho de 28 cartas por jogador: ataques 1/3/6/9 (4/4/3/2), escudos 2/3/6/9 (4/4/3/2) e 2 Marés.
- A defesa volta ao baralho no início do 2º turno do dono depois de colocada, ou seja, protege durante dois turnos do adversário.
- Uma Maré que chegue à mão por troca, saque ou Torre também pode ser usada como ação.
- Sem ação possível, o jogador passa a vez. Com o baralho vazio, não compra.
- Ganhar "2 ações" mais de uma vez antes do próprio turno continua valendo 2 ações.
- Limite de segurança de 400 turnos; nesse caso vence quem tiver mais resistência nas bases.
