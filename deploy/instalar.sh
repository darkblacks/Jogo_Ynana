#!/usr/bin/env bash
# Instala o BACKEND do Gachaqui num servidor Linux (Ubuntu/Debian) com HTTPS.
# Rode de dentro da pasta do projeto clonado:
#
#   sudo bash deploy/instalar.sh                  -> domínio automático https://IP-COM-TRACOS.sslip.io
#   sudo bash deploy/instalar.sh api.meusite.com  -> usa o seu domínio (precisa apontar para este servidor)
#
# Variáveis opcionais: PORT (padrão 8080), ALLOWED_ORIGINS (padrão https://gachaqui.netlify.app)
set -euo pipefail

DOMINIO="${1:-}"
PORTA="${PORT:-8080}"
ORIGENS="${ALLOWED_ORIGINS:-https://gachaqui.netlify.app}"
PASTA="$(cd "$(dirname "$0")/.." && pwd)"
USUARIO="${SUDO_USER:-$(whoami)}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Rode com sudo: sudo bash deploy/instalar.sh $DOMINIO" >&2
  exit 1
fi
if ! command -v apt-get >/dev/null 2>&1; then
  echo "Este script é para Ubuntu/Debian (apt-get)." >&2
  exit 1
fi

passo() { echo; echo "==> $*"; }

passo "Pasta do projeto: $PASTA (usuário: $USUARIO, porta interna: $PORTA)"
apt-get update -y
apt-get install -y ca-certificates curl gnupg git

# 1. Node.js 22, se não houver Node 18+
precisa_node=1
if command -v node >/dev/null 2>&1; then
  maior="$(node -p 'process.versions.node.split(".")[0]')"
  [ "$maior" -ge 18 ] && precisa_node=0
fi
if [ "$precisa_node" -eq 1 ]; then
  passo "Instalando Node.js 22"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
passo "Node $(node -v)"

# 2. Dependências do backend
passo "Instalando dependências do backend"
sudo -u "$USUARIO" npm --prefix "$PASTA/backend" install --omit=dev

# 3. Serviço systemd (sobe sozinho e reinicia se cair). Só escuta localmente; o Caddy expõe com HTTPS.
passo "Criando o serviço gachaqui"
cat > /etc/systemd/system/gachaqui.service <<EOF
[Unit]
Description=Gachaqui backend (modo online)
After=network.target

[Service]
Type=simple
User=$USUARIO
WorkingDirectory=$PASTA/backend
Environment=PORT=$PORTA
Environment=HOST=127.0.0.1
Environment=ALLOWED_ORIGINS=$ORIGENS
Environment=NODE_ENV=production
ExecStart=$(command -v node) server.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable gachaqui >/dev/null
systemctl restart gachaqui
for _ in 1 2 3 4 5 6 7 8 9 10; do
  curl -fsS "http://127.0.0.1:$PORTA/health" >/dev/null 2>&1 && break
  sleep 1
done
if ! curl -fsS "http://127.0.0.1:$PORTA/health" >/dev/null 2>&1; then
  echo "!! O backend não respondeu. Veja: journalctl -u gachaqui -n 50" >&2
  exit 1
fi
passo "Backend rodando em 127.0.0.1:$PORTA"

# 4. Domínio: se não foi passado, usa sslip.io (resolve para o IP público deste servidor)
if [ -z "$DOMINIO" ]; then
  IP="$(curl -fsS -4 https://api.ipify.org || curl -fsS -4 https://ifconfig.me)"
  DOMINIO="${IP//./-}.sslip.io"
  passo "Sem domínio informado: usando $DOMINIO"
fi

# 5. Caddy: HTTPS automático (Let's Encrypt) e proxy para o backend, incluindo WebSocket
if ! command -v caddy >/dev/null 2>&1; then
  passo "Instalando Caddy"
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --batch --yes --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
fi
passo "Configurando HTTPS para $DOMINIO"
BLOCO="# gachaqui-inicio
$DOMINIO {
  encode gzip
  reverse_proxy 127.0.0.1:$PORTA
}
# gachaqui-fim"
CF=/etc/caddy/Caddyfile
if [ -f "$CF" ]; then cp "$CF" "$CF.bak.$(date +%s)"; fi
if [ ! -s "$CF" ] || grep -q "/usr/share/caddy" "$CF"; then
  # arquivo vazio ou o padrão da instalação: substitui
  printf '%s\n' "$BLOCO" > "$CF"
else
  # já há outros sites: remove um bloco antigo do gachaqui (se houver) e acrescenta o novo
  sed -i '/# gachaqui-inicio/,/# gachaqui-fim/d' "$CF"
  printf '\n%s\n' "$BLOCO" >> "$CF"
fi
caddy validate --config "$CF" --adapter caddyfile
systemctl enable caddy >/dev/null
systemctl reload caddy 2>/dev/null || systemctl restart caddy

# 6. Firewall local (se o ufw estiver ativo)
if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
  passo "Liberando portas 80 e 443 no ufw"
  ufw allow 80/tcp >/dev/null
  ufw allow 443/tcp >/dev/null
fi

# 7. Teste final por HTTPS (o certificado pode levar alguns segundos)
passo "Testando https://$DOMINIO/api/info"
ok=0
for _ in $(seq 1 30); do
  if curl -fsS "https://$DOMINIO/api/info" >/dev/null 2>&1; then ok=1; break; fi
  sleep 2
done

echo
echo "=================================================================="
if [ "$ok" -eq 1 ]; then
  echo " Backend no ar: https://$DOMINIO"
else
  echo " O backend roda, mas o HTTPS ainda não respondeu."
  echo " Confira se as portas 80 e 443 estão liberadas no painel do seu provedor"
  echo " e veja o log do Caddy: journalctl -u caddy -n 50"
fi
echo
echo " Endpoints:"
echo "   https://$DOMINIO/health"
echo "   https://$DOMINIO/api/info"
echo "   wss://$DOMINIO/ws"
echo
echo " No Netlify, crie a variável de ambiente:"
echo "   GACHAQUI_SERVER = https://$DOMINIO"
echo " (ou edite frontend/js/config.js com esse endereço)"
echo
echo " Atualizar depois:  git pull && sudo systemctl restart gachaqui"
echo " Ver logs:          journalctl -u gachaqui -f"
echo "=================================================================="
