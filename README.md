# Estúdio 4blue: o substituto do StreamYard

**Site:** https://equipemkt-git.github.io/ESTUDIO-4BLUE/ (entra com a conta Google da 4blue liberada em Admins)
**Teste de câmera para convidados:** https://equipemkt-git.github.io/ESTUDIO-4BLUE/teste-mentor.html

## Como funciona
- **Início (lives):** cada live é um card com data, tipo, convidados e link do YouTube. Os botões do card são **Entrar no estúdio**, **Convites** e **✎ editar**.
- **+ Nova live:** título, data, hora e tipo.
  - **🎙 Ao vivo:** apresentadores e convidados pela câmera, com tela compartilhada.
  - **🎬 Vídeo gravado:** roda um vídeo como se fosse ao vivo. O estúdio entra no ar 5 minutos antes com a contagem, roda o vídeo no horário e encerra sozinho.
- **Convites:** cada convidado recebe uma mensagem pronta para o WhatsApp. O link abre a página do convidado, com câmera, **chat com a produção** e o teste de câmera.
- **Estúdio:** palco no estilo StreamYard.
  - **Bastidores:** cada convidado aparece com o aviso "na sala" e o botão **Pôr no palco**. O layout se ajusta sozinho.
  - **Aba Chat:** conversa com os convidados e a equipe.
  - **Comentários:** do YouTube, levados para a tela com um clique.
  - **Mais:** banners, letreiro, QR code, telas (abertura, intervalo, voltamos já, encerramento) e vídeos.
- **Admins** (só para admin): libera e-mails @4blue.com.br. O **admin** libera pessoas e o **operador** cria e opera lives. Por ali também se conecta o canal do YouTube.
- **❔ Como configurar:** o guia de instalação abre sozinho no primeiro acesso e pode ser aberto de novo quando quiser.

## Primeira vez em cada PC
O guia do site mostra estes passos:
1. Instalar o OBS.
2. Ligar o WebSocket do OBS e copiar a senha.
3. Ligar o OBS ao YouTube (pela conta no OBS ou pelo botão "Configurar a transmissão" do estúdio).
4. Entrar no estúdio e colar a senha. O estúdio prepara as cenas sozinho.

## YouTube: criar a live pelo sistema
O canal da 4blue é uma **conta de marca**. O Apps Script, sozinho, só enxerga o canal pessoal do dono, então a criação automática precisa de uma conexão própria (OAuth) em que se escolhe o canal 4blue:
1. No Google Cloud, crie um cliente OAuth do tipo "Aplicativo da Web" com a API YouTube Data v3 ativada.
2. Cadastre como URI de redirecionamento a URL /exec do Apps Script, que aparece em Admins → Canal do YouTube.
3. No Apps Script, em Configurações do projeto → Propriedades do script, crie `YT_CLIENT_ID` e `YT_CLIENT_SECRET`.
4. No site, em Admins → **Conectar canal do YouTube**, escolha o canal da 4blue.

Enquanto isso não for feito, crie a live no YouTube Studio e cole o link em **Convites** no card. Os comentários funcionam mesmo assim.

## Backend
Apps Script **ESTUDIO 4BLUE**, na conta dhione@4blue.com.br, com o código em `apps-script.gs`. Ele guarda lives e admins nas Propriedades do script, e o chat e a presença no Cache, por até 6 horas.
Para atualizar: cole o código, salve e vá em **Implantar → Gerenciar implantações → ✎ → Nova versão**. A URL não muda.

## Arquivos
| Arquivo | O que é |
|---|---|
| `index.html`, `inicio.js` | Início: cards, nova live, convites, admins, guia |
| `estudio.html`, `painel.js` | Estúdio |
| `convidado.html` | Página do convidado (câmera + chat) |
| `api.js`, `config.js` | Login e conversa com o Apps Script |
| `obs.js`, `montar.js` | Conversa com o OBS, cenas e palco |
| `overlay.html`, `fundo.html`, `abertura.html`, `intervalo.html`, `voltamos.html`, `encerramento.html`, `tela.js`, `estado.js`, `base.css` | O que o OBS mostra |
| `teste-mentor.html` | Teste de câmera, som e internet |
| `apps-script.gs` | Backend |

A fonte Knockout é paga e não fica no repositório. As telas usam a Knockout instalada no PC e, se ela não estiver lá, entra uma fonte comum.
