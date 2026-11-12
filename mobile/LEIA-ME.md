# Gachaqui no celular

O app é o **mesmo jogo do site**, empacotado com [Capacitor](https://capacitorjs.com): as mesmas regras, IA, personagens, tutorial e visual. O modo online usa **o mesmo servidor** (`https://gachaqui.duckdns.org`), então quem está no app joga com quem está no site.

O que muda no app em relação ao navegador:

- tela cheia, sem barra de endereço, sem "puxar para atualizar" e sem o navegador fechando a aba;
- botão **voltar** do Android abre a pausa (e não sai do jogo sem querer);
- reconecta na hora quando você volta para o app (a sala espera 30 s por quem caiu);
- convite pelo menu de compartilhar do celular (WhatsApp, Telegram…);
- link `gachaqui://sala/CODIGO` abre direto a sala no app; no Chrome do Android, o convite do site oferece "Abrir no app";
- vibração nos golpes, tela sempre acesa durante a partida;
- funciona sem internet contra a IA, no torneio e no tutorial.

## Android: gerar o APK (automático)

Não precisa instalar nada no computador. A cada atualização enviada ao GitHub (pastas `frontend/` ou `mobile/`), o GitHub Actions compila o APK sozinho:

1. Abra a aba **Actions** do repositório e veja o fluxo **Apps (Android e iPhone)** rodar (uns 5 minutos).
2. Quando terminar, o APK aparece em **Releases** como `gachaqui.apk`.
3. Link fixo da versão mais nova (para mandar aos amigos):
   `https://github.com/darkblacks/Jogo_Ynana/releases/latest/download/gachaqui.apk`
   - Se o repositório for **privado**, esse link só funciona para quem tem acesso. Nesse caso, baixe o APK e mande o arquivo pelo WhatsApp/Drive.

Para gerar de novo sem mudar nada: **Actions → Apps (Android e iPhone) → Run workflow**.

### Instalar no celular

1. Abra o link no celular e baixe o `gachaqui.apk`.
2. Toque no arquivo. Se o Android pedir, permita **"Instalar apps desconhecidos"** para o navegador/gerenciador de arquivos.
3. Atualizações: baixe o APK novo e instale por cima (não precisa desinstalar).

### Assinatura (faça uma vez)

O Android só aceita atualizar um app por cima se todas as versões tiverem a **mesma assinatura**. A chave de assinatura é secreta e **não fica no repositório**: ela vai nos segredos do GitHub.

1. Pegue os dois arquivos que vieram com o app: `gachaqui-keystore-base64.txt` e `gachaqui-keystore-senha.txt` (guarde também o `gachaqui.keystore` num lugar seguro — se perder, os amigos terão de desinstalar para receber a próxima versão).
2. No GitHub: **Settings → Secrets and variables → Actions → New repository secret** e crie:
   - `GACHAQUI_KEYSTORE_BASE64` = todo o conteúdo de `gachaqui-keystore-base64.txt`
   - `GACHAQUI_KEYSTORE_PASSWORD` = a senha de `gachaqui-keystore-senha.txt`
3. **Actions → Apps (Android e iPhone) → Run workflow** para gerar o primeiro APK assinado.

Sem esses segredos, o fluxo ainda gera um APK que instala e funciona normalmente, só que de "teste": cada versão nova pede para desinstalar a anterior antes.

Para criar uma chave nova no seu computador (precisa de Java):

```bash
keytool -genkeypair -keystore gachaqui.keystore -alias gachaqui -keyalg RSA -keysize 2048 -validity 10000
```

e depois gere o texto em base64 (`base64 -w0 gachaqui.keystore` no Linux, ou `certutil -encode` no Windows, apagando as linhas BEGIN/END).

### Gerar no próprio computador (opcional)

Precisa de Node 22+, JDK 21 e Android Studio (com o SDK).

```bash
cd mobile
npm ci
npm run android:apk      # APK em android/app/build/outputs/apk/debug/
npm run android:abrir    # ou abre o projeto no Android Studio
```

## iPhone

O GitHub Actions também compila o app de iPhone (numa máquina Mac do GitHub, de graça para repositório público) e publica o `gachaqui.ipa` junto com o APK, na mesma versão:
`https://github.com/darkblacks/Jogo_Ynana/releases/latest/download/gachaqui.ipa`

A Apple só deixa instalar app de fora da App Store se ele estiver assinado. O IPA sai **sem assinatura**, e cada pessoa assina com o próprio Apple ID na hora de instalar:

- **Sideloadly** (Windows/Mac, sideloadly.io): liga o iPhone no cabo, arrasta o `.ipa`, digita o Apple ID, Start. Depois, no iPhone: Ajustes → Geral → VPN e Gerenciamento de Dispositivo → Confiar; e no iOS 16+, Ajustes → Privacidade e Segurança → Modo de Desenvolvedor.
- Com Apple ID **grátis**, a assinatura vale 7 dias (repita o processo para renovar; o **AltStore** renova sozinho pelo Wi-Fi). Limite de 3 apps assim por Apple ID.
- **Sem computador:** Safari → `gachaqui.netlify.app` → Compartilhar → Adicionar à Tela de Início (tela cheia, funciona sem internet contra a IA).

A página https://gachaqui.netlify.app/baixar explica tudo isso para os amigos.

### Para ninguém precisar de computador: TestFlight

Com uma conta **Apple Developer** (US$ 99/ano), dá para distribuir pelo **TestFlight**: os amigos instalam o app TestFlight da App Store e entram por um link de convite (até 10.000 pessoas, cada versão vale 90 dias). Para ligar isso no GitHub Actions são necessários, como segredos do repositório: o certificado de distribuição (`.p12` + senha), o perfil de provisionamento e uma chave da API do App Store Connect. Quando tiver a conta, dá para acrescentar esse passo no fluxo `apps.yml`.

### Gerar no próprio Mac (opcional)

```bash
cd mobile
npm ci
npm run ios:abrir   # abre no Xcode; escolha seu time em Signing & Capabilities e rode no iPhone
```

## Atualizar o app quando o jogo mudar

O app copia a pasta `frontend/` na hora do build (`npm run sync`). Então qualquer mudança no site entra no próximo APK automaticamente.
