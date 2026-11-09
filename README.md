# Gachaqui

Jogo de cartas de ataque e defesa para navegador, com IA adversária, torneio eliminatório de 8 jogadores e partidas online contra um amigo.

## Como jogar

- **Torneio · 8 jogadores:** você e 7 capitães controlados pela IA disputam quartas, semifinal e final. Cada confronto pode ser melhor de 1, 3 ou 5. Os duelos entre IAs são simulados com as mesmas regras.
- **Partida rápida:** um jogo avulso contra a IA, no nível que você escolher.
- **Jogar com um amigo:** crie uma sala e mande o link (ou o código de 5 letras). Tem placar, revanche e reconexão: se alguém fechar a aba ou a internet cair, é só abrir o link de novo.
- **Como jogar:** as regras completas estão dentro do jogo.

O progresso (torneio e partida em andamento) fica salvo no navegador.

### Níveis da IA

| Nível | Como joga |
|---|---|
| Fácil | Heurística com muitos erros aleatórios |
| Médio | Heurística: defende bases valiosas, ataca bases abertas, entrega a pior carta na Maré |
| Difícil | Monte Carlo: simula 16 partidas por jogada possível |
| Lendário | Monte Carlo com 48 simulações por jogada |

No modo online, a partida roda no servidor, e cada navegador só recebe o que o jogador veria na mesa: a mão, o baralho e as defesas escondidas do adversário nunca são enviados.

A IA **não trapaceia**: ela só vê o que um jogador veria. Antes de cada simulação, as cartas escondidas do adversário (mão, baralho, defesas viradas e Torre) são embaralhadas e redistribuídas.

## Rodar localmente

```bash
npm install
npm start
```

Abra http://localhost:8080. O servidor Node entrega o site e conduz as partidas online. Para testar o online sozinho, abra o link da sala em outra janela anônima.

## Publicar na web (com o modo online)

O modo online precisa de um servidor Node rodando. O jeito mais simples é o **Render** (tem plano gratuito):

1. Crie uma conta em https://render.com e conecte o GitHub.
2. Clique em **New → Blueprint** e escolha este repositório. O arquivo `render.yaml` já configura tudo.
3. Depois do deploy, o jogo fica em `https://gachaqui-xxxx.onrender.com`. Crie uma sala e mande o link para o amigo.

No plano gratuito do Render, o servidor "dorme" depois de 15 minutos sem uso, e o primeiro acesso depois disso leva uns 50 segundos para abrir.

### No seu próprio servidor (VPS)

Em qualquer servidor Linux Ubuntu/Debian, clone o repositório e rode o instalador. Ele instala o Node se precisar, cria um serviço que sobe sozinho e, se você passar um domínio, configura HTTPS automático com o Caddy:

```bash
git clone https://github.com/darkblacks/Jogo_Ynana.git gachaqui && cd gachaqui
sudo bash deploy/instalar.sh                  # http://IP-DO-SERVIDOR:8080
sudo bash deploy/instalar.sh meujogo.com.br   # https://meujogo.com.br
```

Outras opções que também funcionam: **Railway** e **Fly.io** (usam o `Dockerfile`), ou qualquer VPS com Node 18+ (`npm install && npm start`; a porta vem da variável `PORT`).

### Só o site, sem servidor

Torneio e partida rápida funcionam como site estático (GitHub Pages, Netlify etc.). Nesse caso, o botão "Jogar com um amigo" avisa que falta o servidor. Para usar o site estático com o servidor hospedado em outro lugar, coloque o endereço em `js/config.js`, por exemplo `export const SERVER_URL = 'wss://gachaqui-xxxx.onrender.com/ws';`.

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
js/config.js      endereço do servidor online (vazio = mesmo site)
server/server.js  servidor HTTP + WebSocket
server/online.js  salas e o que cada jogador pode ver
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
