#!/usr/bin/env bash
# Aplica a atualização do Gachaqui no servidor e reinicia o backend.
# Uso (dentro da pasta do projeto, depois de extrair o zip por cima dela):
#   bash deploy/aplicar-patch.sh
set -euo pipefail

PASTA="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PASTA"

if [ ! -f backend/server.js ] || [ ! -f frontend/js/engine.js ]; then
  echo "!! Rode dentro da pasta do Gachaqui (onde ficam backend/ e frontend/)." >&2
  exit 1
fi

echo "==> Instalando dependências do backend (se houver novas)"
npm --prefix backend install --omit=dev --no-audit --no-fund

echo "==> Reiniciando o serviço gachaqui"
sudo systemctl restart gachaqui

echo "==> Conferindo"
ok=0
for _ in $(seq 1 15); do
  if curl -fsS http://127.0.0.1:8080/health >/dev/null 2>&1; then ok=1; break; fi
  sleep 1
done
if [ "$ok" -ne 1 ]; then
  echo "!! O backend não respondeu. Veja o log:" >&2
  sudo journalctl -u gachaqui -n 40 --no-pager >&2
  exit 1
fi
info="$(curl -fsS http://127.0.0.1:8080/api/info)"
echo "    $info"
case "$info" in
  *'"versao":"1.2.0"'*) echo "==> Pronto! Backend atualizado para a versão 1.2.0." ;;
  *) echo "!! O backend respondeu, mas não está na versão 1.2.0. O zip foi extraído na pasta certa?" >&2; exit 1 ;;
esac
