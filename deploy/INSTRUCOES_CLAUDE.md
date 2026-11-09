# Instalar o backend do Gachaqui neste servidor

Você é o Claude Code rodando no servidor de produção do jogo Gachaqui. Tarefa: deixar o backend (modo online) no ar com HTTPS, para o frontend publicado em https://gachaqui.netlify.app.

## Passos

1. Confirme que está na raiz do repositório (tem as pastas `backend/`, `frontend/` e `deploy/`) e que o sistema é Ubuntu ou Debian (`cat /etc/os-release`).
2. Leia `deploy/instalar.sh` antes de rodar e explique ao usuário, em poucas linhas, o que ele vai instalar (Node.js 22, dependências do backend, serviço systemd `gachaqui`, Caddy com HTTPS).
3. Pergunte ao usuário se ele tem um domínio próprio para o backend. Se não tiver, o script usa `IP-COM-TRACOS.sslip.io`, que funciona com HTTPS sem configurar nada.
4. Rode o instalador com sudo:
   - sem domínio: `sudo bash deploy/instalar.sh`
   - com domínio: `sudo bash deploy/instalar.sh api.dominio.com`
5. Verifique:
   - `systemctl is-active gachaqui caddy`
   - `curl -fsS https://DOMINIO/health` responde `ok`
   - `curl -fsS https://DOMINIO/api/info` responde JSON com `"ok":true`
   - `curl -sI -H "Origin: https://gachaqui.netlify.app" https://DOMINIO/api/info` traz `access-control-allow-origin: https://gachaqui.netlify.app`
6. Se o HTTPS não responder, o mais comum é o firewall do provedor (painel da hospedagem) bloqueando as portas 80 e 443. Diga isso ao usuário; não tente desligar firewalls sem perguntar.
7. Ao final, mostre ao usuário:
   - o endereço do backend: `https://DOMINIO`
   - o que ele deve colocar no Netlify: variável de ambiente `GACHAQUI_SERVER = https://DOMINIO` (depois, "Trigger deploy"), ou editar `frontend/js/config.js` com esse endereço se ele publicar arrastando a pasta.

## Regras

- Não altere o código do jogo (`frontend/js`, `backend/*.js`), só a configuração do servidor.
- Não abra portas além de 80 e 443; o backend escuta só em 127.0.0.1:8080, atrás do Caddy.
- Se já existir um `/etc/caddy/Caddyfile` com outros sites, o script faz backup e só acrescenta o bloco do Gachaqui. Se o servidor usar Nginx ou Apache nas portas 80/443 em vez do Caddy, PARE e pergunte ao usuário antes de instalar o Caddy (os dois brigariam pelas mesmas portas).
