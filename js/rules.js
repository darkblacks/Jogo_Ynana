export const RULES_HTML = `
<div class="rules-cards">
  <img src="assets/cards/atk1.webp" alt="Espada 1"><img src="assets/cards/atk3.webp" alt="Lança 3"><img src="assets/cards/atk6.webp" alt="Ataque 6"><img src="assets/cards/atk9.webp" alt="Canhão 9">
  <img src="assets/cards/def2.webp" alt="Escudo 2"><img src="assets/cards/def3.webp" alt="Escudo 3"><img src="assets/cards/def6.webp" alt="Escudo 6"><img src="assets/cards/def9.webp" alt="Escudo 9">
  <img src="assets/cards/mare.webp" alt="Maré">
</div>

<h3>1. Objetivo</h3>
<p>Vence quem derrubar primeiro as três bases do adversário: <b>Forte</b>, <b>Torre</b> e <b>Porto</b>.</p>

<h3>2. Cartas</h3>
<table>
  <tr><th>Tipo</th><th>Cor</th><th>Valores</th><th>No baralho</th></tr>
  <tr><td>Ataque</td><td>Vermelha</td><td>Espada 1, Lança 3, Ataque 6, Canhão 9</td><td>4 · 4 · 3 · 2</td></tr>
  <tr><td>Defesa</td><td>Azul</td><td>Escudo 2, 3, 6, 9</td><td>4 · 4 · 3 · 2</td></tr>
  <tr><td>Maré</td><td>Especial</td><td>—</td><td>2</td></tr>
</table>
<p>Cada jogador tem o próprio baralho de 28 cartas. O Canhão (9) é o ataque mais forte, mas empata com um Escudo 9.</p>

<h3>3. Preparação</h3>
<p>Cada jogador embaralha o baralho e recebe 5 cartas. Quem começa é sorteado (no torneio, alterna a cada jogo da série).</p>

<h3>4. Turno</h3>
<ol>
  <li><b>Comprar:</b> 2 cartas se o seu Porto estiver de pé, 1 carta se ele tiver caído.</li>
  <li><b>Fazer 1 ação</b>, escolhendo uma:
    <ul>
      <li><b>Defender:</b> pôr uma carta azul virada para baixo atrás de uma das suas bases (clique na carta e depois na sua base).</li>
      <li><b>Atacar:</b> jogar uma carta vermelha contra uma base do adversário (clique na carta e depois na base inimiga).</li>
      <li><b>Guardar:</b> esconder uma carta na sua Torre.</li>
      <li><b>Usar Maré</b> que esteja na sua mão.</li>
    </ul>
  </li>
</ol>

<h3>5. Defesas</h3>
<ul>
  <li>No máximo 1 defesa por base. Ela fica escondida até ser atacada.</li>
  <li>A defesa dura 2 turnos do dono (as bolinhas douradas mostram quanto falta); depois volta para o fundo do baralho, mesmo sem ser usada.</li>
  <li>Exceção: a defesa de um <b>Forte danificado</b> fica visível.</li>
</ul>

<h3>6. Combate</h3>
<table>
  <tr><th>Situação</th><th>Resultado</th></tr>
  <tr><td>Base sem defesa</td><td>O ataque acerta a base.</td></tr>
  <tr><td>Ataque maior que a defesa</td><td>Atravessa e acerta a base no mesmo golpe.</td></tr>
  <tr><td>Ataque igual à defesa</td><td>Golpe anulado.</td></tr>
  <tr><td>Ataque menor que a defesa</td><td>Golpe anulado e o defensor faz <b>2 ações</b> no próximo turno.</td></tr>
</table>
<p>Depois de qualquer combate, as cartas usadas vão para o fundo do baralho de quem as jogou.</p>

<h3>7. Bases</h3>
<ul>
  <li><b>Torre</b> e <b>Porto</b> caem com 1 golpe. O <b>Forte</b> aguenta 2: no primeiro fica danificado, no segundo cai. Base caída não volta.</li>
  <li><b>Porto:</b> de pé, você compra 2 cartas por turno.</li>
  <li><b>Torre:</b> guarda 1 carta escondida, fora da mão. Guardar gasta a ação; pegar de volta é grátis no início do seu turno (antes de fazer a ação). Se a Torre cair, a carta guardada volta ao fundo do baralho e o atacante pega 1 carta da mão do defensor sem ver.</li>
</ul>

<h3>8. Maré</h3>
<ul>
  <li>Ao ser comprada, a Maré é revelada na hora: cada jogador escolhe 1 carta da própria mão e entrega ao outro. Depois ela vai para o fundo do baralho.</li>
  <li>Maré que vier na mão inicial pode ser usada como ação no turno que o dono quiser.</li>
</ul>

<h3>Regras da casa (definidas antes da partida)</h3>
<div class="note">
  <ul>
    <li>Baralho de 28 cartas por jogador, com a composição da tabela acima.</li>
    <li>Uma Maré que chegue à mão por outro caminho (troca, saque ou Torre) também pode ser usada como ação.</li>
    <li>Se não houver nenhuma ação possível, o jogador passa a vez. Baralho vazio: não compra.</li>
    <li>Se um jogador ganhar 2 ações mais de uma vez antes do seu turno, continua sendo 2 ações.</li>
    <li>Partidas muito longas (400 turnos) terminam a favor de quem tiver mais resistência nas bases.</li>
  </ul>
</div>

<h3>Torneio</h3>
<p>Oito capitães numa chave eliminatória (quartas, semifinal e final). Cada confronto pode ser melhor de 1, 3 ou 5. Os adversários vão de <b>Fácil</b> a <b>Lendário</b>; os duelos entre IAs são simulados com as mesmas regras. O progresso fica salvo no navegador.</p>
`;
