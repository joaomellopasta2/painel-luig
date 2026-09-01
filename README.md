# Painel Processos Luig × Petrobras (PWA)

App instalável que reúne todos os processos de **Luig Almeida Mota (OAB/RJ 183.486)**
envolvendo **Petrobras** e **Transpetro**, com **atualização automática 2× ao dia
(00h e 12h de Brasília)**.

Fonte dos dados: **API pública e gratuita do DJEN/CNJ** (comunica.pje.jus.br).

---

## Como funciona (visão geral)
1. O site (este app) é hospedado na **Vercel** (URL/domínio bonito, rápido, HTTPS).
2. Um robô (**GitHub Actions**) roda às **00h e 12h**, executa `updater/collect.py`,
   busca os processos no DJEN, regenera o `dados.json` e **faz commit** no GitHub.
3. A Vercel detecta o commit e **republica sozinha**. O app compara com a versão
   anterior e marca as **novidades** (publicações novas).

Tudo **gratuito** e roda na nuvem, mesmo com seu computador desligado.
(O código e o histórico ficam no GitHub; a Vercel só publica.)

---

## Instalação (uma vez, ~10 min)

### 1. Criar conta no GitHub
Acesse https://github.com e crie uma conta gratuita (se ainda não tiver).

### 2. Criar o repositório
- Clique em **New repository**.
- Nome sugerido: `painel-luig` · deixe **Public** · **não** marque "Add a README".
- Clique **Create repository**.

### 3. Enviar os arquivos
**Opção A — pelo navegador (mais fácil):**
- Na página do repositório recém-criado, clique em **"uploading an existing file"**.
- Arraste **todo o conteúdo desta pasta** (inclusive as pastas `icons/`, `updater/`
  e `.github/`, e o `vercel.json`).
- Confirme em **Commit changes**.
  > ⚠️ Garanta que a pasta **`.github/workflows/update.yml`** foi enviada — é ela que
  > faz a atualização automática. Se não aparecer, crie manualmente: botão
  > **Add file → Create new file**, nome `.github/workflows/update.yml`, e cole o conteúdo.

**Opção B — pelo Git (se você usa):**
```bash
cd "painel-luig"
git init
git add .
git commit -m "Primeira versão do painel"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/painel-luig.git
git push -u origin main
```

### 4. Publicar na Vercel
- Acesse https://vercel.com e entre com **Continue with GitHub**.
- **Add New… → Project** → **Import** o repositório `painel-luig`.
- Framework Preset: **Other** (é site estático — não precisa configurar build).
- Clique **Deploy**. Em ~1 min sai a URL (ex.: `https://painel-luig.vercel.app`).
  > A cada commit do robô, a Vercel republica automaticamente.

### 5. Ligar a atualização automática (GitHub Actions)
- No repositório do GitHub: aba **Actions** → se pedir, clique em **"I understand… enable workflows"**.
- Abra o workflow **"Atualizar dados (2x/dia)"** → **Run workflow** (roda a 1ª vez).
- A partir daí ele roda sozinho às **00h** e **12h** e a Vercel republica.

### 6. Instalar no celular
- Abra a URL no navegador do celular.
- **Android/Chrome:** menu ⋮ → **Instalar app** / **Adicionar à tela inicial**.
- **iPhone/Safari:** botão Compartilhar → **Adicionar à Tela de Início**.

Pronto! Ele passa a atualizar sozinho às **00h** e **12h**.

---

## Perguntas comuns
- **Preciso deixar o PC ligado?** Não. A atualização roda nos servidores do GitHub.
- **Os horários batem exatos?** O GitHub pode atrasar alguns minutos o disparo — normal.
- **Como forço uma atualização agora?** Aba **Actions → Run workflow**. No app, o botão ⟳ recarrega os dados já publicados.
- **Mudou o número de processos?** Normal — o robô recoleta tudo a cada rodada e detecta os novos.
- **É seguro/legal?** Sim. Todos os dados são **públicos** (princípio da publicidade dos atos processuais) e vêm da API oficial do CNJ.

---

## Estrutura
```
index.html            interface do app
styles.css            estilo (tema claro/escuro automático)
app.js                lógica (abas, filtros, busca, gráficos, modal)
manifest.webmanifest  torna instalável (PWA)
sw.js                 cache offline
icons/                ícones do app
dados.json            dados gerados pelo coletor (atualizado pelo robô)
vercel.json           configuração da Vercel (cache do dados.json etc.)
.vercelignore         arquivos que não vão para o site publicado
updater/collect.py    coletor do DJEN/CNJ
.github/workflows/update.yml   agenda 00h/12h + commita (Vercel republica)
```
