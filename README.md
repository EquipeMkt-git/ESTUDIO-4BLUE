# Estúdio 4blue: o substituto do StreamYard

**Painel:** https://equipemkt-git.github.io/ESTUDIO-4BLUE/ (entra com a conta Google da 4blue)
**Teste do mentor:** https://equipemkt-git.github.io/ESTUDIO-4BLUE/teste-mentor.html

O painel fica online, mas comanda o **OBS do computador onde ele está aberto**. Abra o painel no mesmo PC que vai transmitir.

## Primeira vez em cada PC (5 minutos)
1. No OBS, vá em **Ferramentas → Configurações do servidor WebSocket**, marque **Habilitar** e copie a senha em **Mostrar informações de conexão**.
2. Em **Configurações → Transmissão**, conecte a conta do YouTube (ou cole a chave). Em **Saída**, use 6000 kbps e o codificador da placa de vídeo (AMD/NVIDIA), se houver.
3. Abra o painel, entre com o Google da 4blue e cole a senha do OBS.
4. O painel prepara o OBS sozinho: cria as cenas, as telas na ID e os filtros de som. Basta clicar em **Preparar automaticamente**.

## Em cada live
1. **+ Convidar:** escreva o nome de cada pessoa e clique em **Copiar convite**. A mensagem já vai pronta para o WhatsApp, com o link de entrada e o teste de câmera.
2. Escreva o **nome da live** no topo. Em **Marca**, coloque o horário de início, que alimenta a contagem da Abertura.
3. Deixe a **Abertura** no ar e clique em **Entrar ao vivo**.
4. Quem entra aparece nos **Bastidores**. Clique em **Pôr no palco** para colocar a pessoa no ar.
   - O layout se ajusta sozinho: 1 pessoa ocupa a tela, 2 ficam lado a lado, 3 ficam em linha.
   - Com a **tela compartilhada** no palco, a tela fica grande e as pessoas vão para a lateral.
   - Para fixar um formato, use os botões de layout embaixo da prévia.
5. O botão **🏷** de cada pessoa mostra o nome dela na tela. Na aba **Banners** ficam outros nomes, o **letreiro** e a **chamada com QR code**.
6. Os botões **Intervalo** (com relógio), **Voltamos já** e **Encerramento** trocam a tela. **Voltar ao palco** retoma as pessoas.
7. Em **Vídeos**, cole o caminho do arquivo e clique em ▶. Quando o vídeo acaba, a live volta sozinha ao palco.
8. Em **Comentários**, cole o link da live e clique em **Ligar**. Um clique no comentário mostra ele na tela.
9. **🎧 Falar com convidados** abre a sala para conversar com quem está nos bastidores antes de entrar no ar. Use fone.

## Bom saber
- **Gerar sala nova** (em Configurações) a cada live: os convites antigos param de funcionar.
- O topo mostra o uso do processador. Se ficar vermelho, desligue em Configurações o "vídeo dos convidados nos bastidores".
- Com 8 GB de RAM, use no máximo 3 pessoas + 1 tela. Use cabo de rede: se a internet do PC cair, a live cai.
- A fonte **Knockout** é paga e não fica no repositório. As telas usam a Knockout instalada no PC. Se o PC não tiver a fonte, entra uma fonte comum.

## Arquivos
| Arquivo | O que é |
|---|---|
| `index.html`, `painel.js` | O painel |
| `overlay.html`, `fundo.html`, `abertura.html`, `intervalo.html`, `voltamos.html`, `encerramento.html` | O que o OBS mostra (o OBS carrega do site) |
| `teste-mentor.html` | Teste de câmera, som e internet para o convidado |
| `montar.js` | Cria as cenas no OBS e monta o palco |
| `obs.js` | Conversa com o OBS |
| `config.js` | Login, domínio e endereço do Apps Script |
| `comentarios.gs` | Apps Script: confere o login e lê os comentários do YouTube |

Código: https://github.com/EquipeMkt-git/ESTUDIO-4BLUE
