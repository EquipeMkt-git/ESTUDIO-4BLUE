# Estúdio 4blue: o substituto do StreamYard

O sistema junta três peças gratuitas:
- O **OBS** transmite para o YouTube.
- O **VDO.Ninja** traz os mentores e convidados por um link no navegador.
- O **painel** (`painel.html`) é por onde você controla tudo durante a live, sem mexer no OBS.

O painel roda neste computador e conversa com o OBS pelo WebSocket, que já vem dentro do OBS. Ele não usa servidor nem tem mensalidade.

**Teste do mentor (link para mandar aos convidados):** https://equipemkt-git.github.io/ESTUDIO-4BLUE/teste-mentor.html

**Fonte Knockout:** é paga e não fica neste repositório público. Para os títulos ficarem na ID, copie `knockout-50.otf` de `F:\4BLUE\ACESSO CLAUDE IA\LIVE-WORKSHOP-PRECIFICACAO\assets` para a pasta `assets/` depois de baixar. Sem ela, as telas usam uma fonte comum.

**Como usar no PC da live:** baixe o repositório (Code → Download ZIP), extraia e abra o `painel.html` com duplo clique. Não abra o painel pelo endereço do GitHub Pages: ele precisa rodar no mesmo PC do OBS.

## O que tem na pasta

| Arquivo | Para que serve |
|---|---|
| `painel.html` | **Abra este.** Cenas, convidados, banner, letreiro, QR, comentários, vídeo, transmissão |
| `overlay.html` | Camada por cima da live: logo, banner com nome, letreiro, comentário em destaque, chamada com QR |
| `fundo.html`, `abertura.html`, `intervalo.html`, `voltamos.html`, `encerramento.html` | Telas cheias na ID (tema azul da 4blue ou tema da Black) |
| `teste-mentor.html` | Página para o mentor testar câmera, microfone, fone e internet na véspera |
| `obs.js`, `montar.js`, `painel.js`, `tela.js`, `estado.js`, `base.css`, `assets/` | Peças internas, não precisa abrir |

## Instalação (uma vez só, no PC que vai transmitir)

### 1. Ligar o WebSocket do OBS
1. No OBS, vá em **Ferramentas → Configurações do servidor WebSocket**.
2. Marque **Habilitar servidor WebSocket**. A porta fica 4455 e a autenticação fica ligada.
3. Clique em **Mostrar informações de conexão** e copie a **senha**.
4. **Nunca** abra a porta 4455 no roteador. O painel só funciona no próprio PC, e é assim que deve ser.

### 2. Ajustar a transmissão para o YouTube
- **Configurações → Transmissão:** serviço YouTube - RTMPS. Use **Conectar conta** ou cole a chave de transmissão do YouTube Studio. A chave fica só no OBS e nunca passa pelo painel.
- **Configurações → Saída** (modo Simples):
  - taxa de bits do vídeo: **6000 kbps**;
  - codificador: **hardware AMD (AMF) H.264**, se aparecer. Ele alivia o processador. Se não aparecer, use x264 em "veryfast";
  - áudio: **160 kbps**.
- **Configurações → Avançado → Reconectar automaticamente:** ligado, 10 tentativas e 5 segundos de espera. Se a internet piscar, o OBS volta sozinho.
- **Configurações → Áudio:** 48 kHz.

### 3. Montar as cenas pelo painel
1. Abra o `painel.html` com **duplo clique** (no Chrome ou no Edge).
2. Vá em **Configurar**, cole a senha do WebSocket e clique em **Conectar**. A opção "Lembrar a senha" evita digitar de novo.
3. Clique em **1. Ajustar vídeo 1080p30**. Faça isso **antes** de montar, porque as posições das cenas dependem da resolução.
4. Clique em **2. Montar / atualizar estúdio**. Ele cria as 10 cenas, as fontes dos convidados, as telas e os filtros de áudio: tira ruído, nivela a voz e impede o som de estourar.
5. Para refazer as cenas depois, use **Refazer cenas do zero**.

As cenas são Abertura, Solo, Dupla, Trio, Tela + mentor, Tela cheia, Vídeo, Intervalo, Voltamos já e Encerramento. Os nomes começam com número para ficarem em ordem no OBS.

### 4. Comentários na tela (Social Stream Ninja)
1. No Chrome, instale a extensão gratuita **Social Stream Ninja** pela Chrome Web Store.
2. Nas configurações da extensão, ligue a opção de **enviar mensagens ao servidor de API**. Ela fica em Configurações globais → Mecânicas.
3. Copie o **ID da sessão** que a extensão mostra e cole em **Configurar → Comentários** no painel. Depois clique em **Ligar**.
4. Na hora da live, abra o **chat pop-out** da live no YouTube (menu ⋮ do chat → "Abrir chat em pop-up"). A extensão lê os comentários de lá. Ela também lê Instagram e TikTok se a live for para lá.
5. Os comentários aparecem na aba **Comentários** do painel. Um clique mostra o comentário na live, outro clique tira. Se a extensão falhar, use o **comentário manual**.

### 5. Plugins opcionais do OBS (gratuitos)
- **Move Transition** (do exeldro): as câmeras deslizam quando o layout muda, em vez de cortar seco. Depois de instalar, escolha a transição "Move" no OBS.
- **Aitum Multistream**: transmite para YouTube, Instagram e TikTok ao mesmo tempo. É o mesmo esquema que a Live 24h usa com o obs-multi-rtmp.

Os dois estão no site do OBS, em obsproject.com → Forums → Resources. Instale fechando o OBS antes.

## Antes de cada live

**Na véspera**
- Em **Configurar**, clique em **Gerar sala e senha novas**. Depois clique em **Montar / atualizar estúdio** para o OBS pegar os links novos.
- Preencha o nome de cada convidado no painel e use **Copiar link** em cada vaga. Mande para cada pessoa só o link dela.
- O convidado que vai mostrar slides recebe também o link da **TELA**, para abrir em outra aba e compartilhar a tela.
- Mande também a página de teste (`teste-mentor.html`, veja "Pendências").
- Na aba **Telas**, preencha o título da aula e o horário de início (a contagem da abertura usa esse horário).
- Na aba **Banner**, deixe prontos o letreiro e a chamada com QR.

**30 minutos antes**
- Abra o OBS e depois o painel. Ele reconecta sozinho se a senha estiver salva.
- Deixe a cena **Abertura** no ar.
- Clique em **Abrir bastidores** para ver quem já entrou, falar com cada pessoa e conferir o som.
- Ligue os comentários e abra o chat pop-out do YouTube.
- Clique em **Iniciar transmissão**. A contagem regressiva segura o público até a hora.

**Durante**
- Para trocar de cena, use os botões ou as teclas **1 a 0**:

  | Tecla | Cena |
  |---|---|
  | 1 | Abertura |
  | 2 | Solo |
  | 3 | Dupla |
  | 4 | Trio |
  | 5 | Tela + mentor |
  | 6 | Tela cheia |
  | 7 | Vídeo |
  | 8 | Intervalo |
  | 9 | Voltamos já |
  | 0 | Encerramento |

- Para escolher quem aparece em **Solo** ou **Tela + mentor**, use os botões **Solo** e **Com a tela** do convidado.
- O botão **Banner** do convidado põe o nome e o cargo dele na tela.
- O botão **Som** de cada convidado corta o áudio dele na live. A barrinha verde mostra se está chegando som.
- Para vídeo, cole o caminho do arquivo na lista e clique em **Tocar no ar**. Quando o vídeo termina, o painel volta sozinho para a cena anterior.
- Para intervalo, clique em **5, 10 ou 15 min**. A tela entra no ar já com a contagem.
- Se algo der errado, aperte **9 (Voltamos já)**.

**No fim**
- Coloque a cena **Encerramento** no ar e depois clique em **Encerrar transmissão** (o painel pede confirmação).

## Gravação separada de cada convidado (para cortes)
- Nos **bastidores** (sala do diretor do VDO.Ninja), cada convidado tem um botão de **gravar**. O arquivo fica salvo neste PC em qualidade melhor que a live, o que é bom para cortar Reels depois.
- O botão **● Gravar** do painel grava a live inteira como ela sai, na pasta de gravação do OBS.

## Limites deste PC
- Com 8 GB de RAM, o recomendado é até **3 convidados + 1 tela**. Feche o navegador pesado, o WhatsApp Desktop e o Canva durante a live.
- No topo do painel aparecem o uso do processador (CPU) e a perda de quadros. Se a CPU passar de 80% ou a "perda" passar de 1%, desligue a **prévia** do painel e baixe a taxa do vídeo para 4500 kbps.
- Quem transmite é este PC e esta internet. Se o PC ou a internet caírem, a live cai, diferente do StreamYard, que roda na nuvem. Use cabo de rede.

## Segurança
- A senha do WebSocket fica só neste computador.
- Gere uma sala nova a cada live. Quem tem o link do convidado entra nos bastidores.
- As chaves do YouTube ficam só no OBS.

## Pendências
- **Página de teste do mentor:** ela precisa de um endereço público para o mentor abrir. A ideia é publicar a pasta no GitHub Pages da equipe, como o painel da Live 24h. Isso ainda não foi feito e espera o seu OK.
- **Teste com convidado real:** as cenas, telas, overlay, vídeo, banner, letreiro, QR e comentário manual foram testados num OBS isolado. A entrada de um convidado de verdade pelo VDO.Ninja e o chat do Social Stream ainda não, porque precisam de câmera e de uma live real. Faça uma live de teste não listada antes da primeira aula.
