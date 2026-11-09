#!/usr/bin/env bash
# Instala o Gachaqui como serviço num servidor Linux (Ubuntu/Debian).
# Rode de dentro da pasta do projeto:
#   sudo bash deploy/instalar.sh                 -> jogo em http://IP-DO-SERVIDOR:8080
#   sudo bash deploy/instalar.sh meujogo.com.br  -> jogo em https://meujogo.com.br (HTTPS automático via Caddy)
set -euo pipefail

DOMINIO="${1:-}"
PORTA="${PORT:-8080}"
PASTA="$(cd "$(dirname "$0")/.." && pwd)"
USUARIO="${SUDO_USER:-$(whoami)}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Rode com sudo: sudo bash deploy/instalar.sh $DOMINIO" >&2
  exit 1
fi

echo "==> Pasta do jogo: $PASTA (usuário: $USUARIO, porta: $PORTA)"

# 1. Node.js 22, se não houver Node 18+
precisa_node=1
if command -v node >/dev/null 2>&1; then
  maior="$(node -p 'process.versions.node.split(".")[0]')"
  [ "$maior" -ge 18 ] && precisa_node=0
fi
if [ "$precisa_node" -eq 1 ]; then
  echo "==> Instalando Node.js 22"
  apt-get update -y
  apt-get install -y ca-certificates curl gnupg
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
echo "==> Node $(node -v)"

# 2. Dependências do projeto
cd "$PASTA"
sudo -u "$USUARIO" npm install --omit=dev

# 3. Serviço systemd (sobe sozinho e reinicia se cair)
cat > /etc/systemd/system/gachaqui.service <<EOF
[Unit]
Description=Gachaqui (jogo + servidor online)
After=network.target

[Service]
Type=simple
User=$USUARIO
WorkingDirectory=$PASTA
Environment=PORT=$PORTA
Environment=NODE_ENV=production
ExecStart=$(command -v node) server/server.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now gachaqui
systemctl restart gachaqui
sleep 1
if curl -fsS "http://127.0.0.1:$PORTA/health" >/dev/null; then
  echo "==> Servidor do jogo rodando na porta $PORTA"
else
  echo "!! O serviço não respondeu. Veja: journalctl -u gachaqui -n 50" >&2
  exit 1
fi

# 4. HTTPS com domínio (opcional)
if [ -n "$DOMINIO" ]; then
  echo "==> Configurando HTTPS para $DOMINIO com Caddy"
  if ! command -v caddy >/dev/null 2>&1; then
    apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
    apt-get update -y
    apt-get install -y caddy
  fi
  cat > /etc/caddy/Caddyfile <<EOF
$DOMINIO {
  reverse_proxy 127.0.0.1:$PORTA
}
EOF
  systemctl reload caddy || systemctl restart caddy
  echo "==> Pronto: https://$DOMINIO  (o domínio precisa apontar para o IP deste servidor; portas 80 e 443 abertas)"
else
  echo "==> Pronto: http://IP-DO-SERVIDOR:$PORTA  (libere a porta $PORTA no firewall do provedor)"
fi
echo "Para atualizar depois: git pull && sudo systemctl restart gachaqui"
