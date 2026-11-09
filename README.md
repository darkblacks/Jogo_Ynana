# Gachaqui

Jogo de cartas de ataque e defesa para navegador: contra a IA, em torneio eliminatório de 8 jogadores ou online contra um amigo.

```
frontend/   site estático (vai para o Netlify: gachaqui.netlify.app)
backend/    servidor do modo online (Node + WebSocket), vai para o seu servidor
deploy/     instalador do backend e instruções para o Claude Code
tools/      simulador de testes
```

## Publicar

### 1. Backend no seu servidor (Ubuntu/Debian)

Pelo terminal (no Windows, o `cmd` já tem `ssh`):

```bash
ssh usuario@IP-DO-SERVIDOR
git clone -b claude/serene-goodall-ko7s49 https://github.com/darkblacks/Jogo_Ynana.git gachaqui
cd gachaqui
sudo bash deploy/instalar.sh
```

O instalador coloca Node.js, o serviço `gachaqui` (reinicia sozinho) e o Caddy com HTTPS automático. Sem domínio próprio, ele usa `https://IP-COM-TRACOS.sslip.io`. Para usar um domínio seu: `sudo bash deploy/instalar.sh api.seudominio.com`.

No fim ele mostra o endereço do backend. As portas 80 e 443 precisam estar liberadas no painel do provedor.

Quer que o Claude Code faça isso por você no servidor? Veja `deploy/INSTRUCOES_CLAUDE.md`.

### 2. Frontend no Netlify

- **Pelo Git (recomendado):** *Add new site → Import an existing project* → este repositório. Branch: `claude/serene-goodall-ko7s49` (ou `main`, depois de juntar). **Base directory: `frontend`**. Build command e publish directory já vêm do `frontend/netlify.toml`. O endereço do backend já vem em `frontend/js/config.js` (`https://gachaqui.duckdns.org`). Para usar outro, crie a variável de ambiente `GACHAQUI_SERVER` no Netlify e faça *Trigger deploy*.
- **Arrastando a pasta:** arraste a pasta `frontend` em https://app.netlify.com/drop (ou em *Deploys* do site).

O backend só aceita conexões vindas de `https://gachaqui.netlify.app` (e das prévias do Netlify). Para liberar outro endereço, defina `ALLOWED_ORIGINS` no serviço.

### Endpoints do backend

| Método | Caminho | Resposta |
|---|---|---|
| GET | `/health` | `ok` |
| GET | `/api/info` | `{ ok, nome, versao, salas, jogadoresOnline, ws }` |
| WebSocket | `/ws` | partidas online (JSON: `create`, `join`, `rejoin`, `action`, `mare`, `steal`, `rematch`, `leave`) |

A partida roda no servidor; cada navegador só recebe o que o jogador veria na mesa (a mão, o baralho e as defesas escondidas do adversário nunca são enviados).

## Rodar localmente

```bash
cd backend && npm install && npm start
```

Abra http://localhost:8080. O backend também entrega o frontend, então tudo funciona num lugar só. Para testar o online sozinho, abra o link da sala numa janela anônima.

Testes (simula centenas de partidas IA x IA): `npm test` na raiz.

## Modos de jogo

- **Tutorial com o Roku:** uma partida guiada, passo a passo, em que o Roku ensina cada regra na hora em que ela acontece.
- **Torneio · 8 jogadores:** quartas, semifinal e final contra 7 capitães da IA (melhor de 1, 3 ou 5). Funciona sem backend.
- **Partida rápida:** um jogo contra a IA no nível escolhido. Funciona sem backend.
- **Jogar com um amigo:** cria uma sala e gera um link. Placar, revanche e reconexão automática.

### Personagens

Os adversários são personagens de *Os Contos de Ynana*, cada um com retrato, força, estilo de jogo e falas próprias (em `frontend/js/characters.js`):

| Personagem | Força | Estilo |
|---|---|---|
| Ynana Merx | 1ª — Lendário (chefe da final) | Estrategista |
| Rufus Albarata | 2ª — Difícil (chefe da semifinal) | Paciente, defende muito |
| Hela Falcobane | 3ª — Difícil | Impulsiva, ataca mesmo base defendida |
| Seraphine Dreya | 4ª — Difícil | Elegante, gosta da Maré e da Torre |
| Al-Mosafar | 5ª — Médio | Calculista |
| Ibrahim | 6ª — Médio | Ladino, mira a Torre para roubar cartas |
| Roku Sonedrasta | 7ª — Fácil | Malandro; também é o professor do tutorial |

No torneio entram os 7. A posição na chave é sorteada, com três regras: o mais fraco enfrenta o jogador nas quartas, o Rufus fica na metade do jogador (semifinal) e a Ynana na outra metade (final).

A IA não trapaceia: antes de cada simulação, as cartas escondidas do adversário são embaralhadas e redistribuídas.

Para adicionar um personagem: coloque o rosto em `frontend/assets/chars/<id>.webp` (256x256) e o busto em `<id>-busto.webp` (640x640), e acrescente um bloco em `characters.js`.

## Decisões de regra

As regras originais não fixam alguns detalhes. Estas são as "regras da casa" adotadas (em `frontend/js/engine.js`):

- Baralho de 30 cartas por jogador: ataques 1/3/6/9 (4/4/3/2), escudos 2/3/6/9 (4/4/3/2), 2 Marés e 2 Saques.
- **Saque** (carta especial): ao ser comprado, quem comprou pega 1 carta da mão do adversário, sem ver. Cartas guardadas na Torre estão protegidas.
- **Guardar na Torre não gasta ação**, e a carta fica lá por tempo indeterminado. Pegar de volta é grátis no início do turno.
- **Comprar carta** é uma ação sempre disponível: compra 1 carta e passa a vez (substitui o "passar a vez").
- A defesa volta ao baralho no início do 2º turno do dono depois de colocada (protege durante dois turnos do adversário).
- Maré ou Saque que chegue à mão por qualquer caminho pode ser usado como ação.
- Com o baralho vazio, não compra.
- Ganhar "2 ações" mais de uma vez antes do próprio turno continua valendo 2 ações.
- Limite de segurança de 400 turnos; nesse caso vence quem tiver mais resistência nas bases.
