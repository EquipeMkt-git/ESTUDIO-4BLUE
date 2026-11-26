/* Estúdio 4blue — tela de início: cards das lives, nova live, convites, admins e guia de configuração. */
const $=id=>document.getElementById(id);
let lives=[],ytInfo=null,editando=null;
const abrir=id=>$(id).hidden=false, fechar=id=>$(id).hidden=true;
document.querySelectorAll('[data-fechar]').forEach(b=>b.onclick=()=>b.closest('.fundo-modal').hidden=true);
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.fundo-modal:not(#mLogin)').forEach(m=>m.hidden=true)});
Api.aoExpirar=()=>Api.entrar().then(carregar);
$('bSair').onclick=()=>Api.sair();

const VAGAS=[['c1','Pessoa 1'],['c2','Pessoa 2'],['c3','Pessoa 3'],['tela','Tela compartilhada']];
const dataBR=ms=>new Date(ms).toLocaleString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});

/* ---------- lista ---------- */
async function carregar(){
  try{
    const [r,y]=await Promise.all([Api.post('lives.list'),Api.post('youtube.status').catch(()=>null)]);
    lives=r.lives||[];ytInfo=y;desenhar();
  }catch(e){aviso(e.message,5000)}
}
function situacao(l){
  if(l.status==='encerrada') return ['fim','Encerrada'];
  if(!l.inicio) return ['','Sem data'];
  const d=new Date(l.inicio),hoje=new Date();
  const dif=l.inicio-Date.now();
  if(dif<0&&dif>-4*3600e3) return ['vivo','Agora'];
  if(d.toDateString()===hoje.toDateString()) return ['hoje','Hoje'];
  if(dif<0) return ['fim','Passou'];
  return ['','Agendada'];
}
function desenhar(){
  const agora=Date.now();
  const prox=lives.filter(l=>l.status!=='encerrada'&&(!l.inicio||l.inicio>agora-6*3600e3)).sort((a,b)=>(a.inicio||9e15)-(b.inicio||9e15));
  const pass=lives.filter(l=>!prox.includes(l));
  $('proximas').innerHTML=prox.length?'':`<div class="vazio" style="grid-column:1/-1">Nenhuma live agendada.<br><br><button class="pri" onclick="novaLive()">+ Criar a primeira</button></div>`;
  prox.forEach(l=>$('proximas').appendChild(card(l)));
  $('tPassadas').hidden=!pass.length;$('passadas').innerHTML='';
  pass.slice(0,12).forEach(l=>$('passadas').appendChild(card(l,true)));
}
function card(l,passada){
  const [cls,txt]=situacao(l),c=l.convidados||{};
  const d=document.createElement('div');d.className='card';
  const pessoas=VAGAS.slice(0,3).map(([v])=>c[v]&&c[v].nome).filter(Boolean);
  d.innerHTML=`
    <div class="capa ${l.tipo==='gravada'?'gravada':l.tema==='black'?'black':''}">
      <div class="tags"><span class="tag ${cls}">${txt}</span><span class="tag">${l.tipo==='gravada'?'🎬 Vídeo gravado':'🎙 Ao vivo'}</span></div>
      <div class="quando">${l.inicio?dataBR(l.inicio):'Sem data definida'}</div>
    </div>
    <div class="corpo">
      <h3>${esc(l.titulo)}</h3>
      ${l.tipo==='gravada'?`<div class="yt">🎞 ${esc((l.video||'Vídeo não escolhido').split(/[\\/]/).pop())}</div>`:
        `<div class="pessoas">${pessoas.length?pessoas.map(p=>`<span class="pessoa">${esc(p)}</span>`).join(''):'<span class="pessoa">Sem convidados ainda</span>'}</div>`}
      <div class="yt">${l.youtube&&l.youtube.url?`▶ <a href="${esc(l.youtube.url)}" target="_blank" rel="noopener">Live no YouTube</a> · <a href="${esc(l.youtube.studio)}" target="_blank" rel="noopener">YouTube Studio</a>`:'▶ Ainda sem link do YouTube'}</div>
    </div>
    <div class="acoes">
      <a class="entrar" href="estudio.html?live=${encodeURIComponent(l.id)}" style="flex:1"><button class="pri" style="width:100%">${passada?'Abrir estúdio':'Entrar no estúdio'}</button></a>
      <button data-a="conv">${l.tipo==='gravada'?'YouTube':'Convites'}</button>
      <button data-a="edit" title="Editar">✎</button>
    </div>`;
  d.querySelector('[data-a=conv]').onclick=()=>abrirConvites(l);
  d.querySelector('[data-a=edit]').onclick=()=>editarLive(l);
  return d;
}

/* ---------- nova / editar ---------- */
let tipo='convidados';
document.querySelectorAll('.tipo').forEach(b=>b.onclick=()=>{tipo=b.dataset.tipo;marcarTipo()});
function marcarTipo(){
  document.querySelectorAll('.tipo').forEach(b=>b.classList.toggle('sel',b.dataset.tipo===tipo));
  $('blocoConv').hidden=tipo!=='convidados';$('blocoGravada').hidden=tipo!=='gravada';
}
function prepararYt(l){
  const temLink=l&&l.youtube&&l.youtube.id;
  const conectado=ytInfo&&ytInfo.conectado;
  $('rotYt').hidden=!!temLink;
  $('fYt').checked=!!conectado&&!temLink;
  $('txtYt').innerHTML=conectado?`Criar a live no YouTube agora (canal <b>${esc(ytInfo.canal&&ytInfo.canal.titulo||'')}</b>)`
    :'Criar a live no YouTube agora <small style="color:var(--sub)">(o canal ainda não foi conectado: vou abrir o YouTube Studio para você criar e colar o link)</small>';
}
function novaLive(){
  editando=null;tipo='convidados';
  $('lTituloModal').textContent='Nova live';$('bSalvar').textContent='Criar live';$('bApagar').hidden=true;
  ['fTitulo','fDesc','fVideo','fSub'].forEach(id=>$(id).value='');
  const d=new Date(Date.now()+86400e3);$('fData').value=d.toISOString().slice(0,10);$('fHora').value='19:00';
  $('fPriv').value='public';$('fTema').value='azul';$('fAuto').checked=$('fEncerrar').checked=true;
  document.querySelectorAll('[data-nome],[data-cargo]').forEach(i=>i.value='');
  marcarTipo();prepararYt(null);abrir('mLive');$('fTitulo').focus();
}
window.novaLive=novaLive;
$('bNova').onclick=novaLive;
function editarLive(l){
  editando=l;tipo=l.tipo||'convidados';
  $('lTituloModal').textContent='Editar live';$('bSalvar').textContent='Salvar';$('bApagar').hidden=false;
  $('fTitulo').value=l.titulo||'';$('fDesc').value=l.descricao||'';$('fVideo').value=l.video||'';$('fSub').value=l.subtitulo||'';
  $('fData').value=l.data||'';$('fHora').value=l.hora||'';$('fPriv').value=l.privacidade||'public';$('fTema').value=l.tema||'azul';
  $('fAuto').checked=l.autoInicio!==false;$('fEncerrar').checked=l.encerrarSozinho!==false;
  const c=l.convidados||{};
  document.querySelectorAll('[data-nome]').forEach(i=>i.value=(c[i.dataset.nome]||{}).nome||'');
  document.querySelectorAll('[data-cargo]').forEach(i=>i.value=(c[i.dataset.cargo]||{}).cargo||'');
  marcarTipo();prepararYt(l);abrir('mLive');
}
$('bSalvar').onclick=async()=>{
  const titulo=$('fTitulo').value.trim();if(!titulo) return aviso('Dê um título para a live');
  const data=$('fData').value,hora=$('fHora').value;
  const inicio=data&&hora?new Date(data+'T'+hora+':00').getTime():null;
  const convidados={};
  VAGAS.forEach(([v])=>{const n=document.querySelector(`[data-nome="${v}"]`).value.trim(),c=document.querySelector(`[data-cargo="${v}"]`);
    convidados[v]={nome:n,cargo:c?c.value.trim():''}});
  const live={id:editando&&editando.id,titulo,descricao:$('fDesc').value.trim(),data,hora,inicio,tipo,privacidade:$('fPriv').value,tema:$('fTema').value,
    subtitulo:$('fSub').value.trim(),convidados,video:$('fVideo').value.trim().replace(/^"|"$/g,''),autoInicio:$('fAuto').checked,encerrarSozinho:$('fEncerrar').checked};
  if(tipo==='gravada'&&!live.video) aviso('Lembre de colocar o caminho do vídeo antes da live',4000);
  $('bSalvar').disabled=true;
  try{
    let r=await Api.post('live.save',{live});
    if(!$('rotYt').hidden&&$('fYt').checked){
      if(ytInfo&&ytInfo.conectado){
        try{r=await Api.post('live.youtube',{id:r.live.id});aviso('Live criada e agendada no YouTube')}
        catch(e){aviso('A live foi salva, mas o YouTube recusou: '+e.message,6000)}
      }else{
        window.open('https://studio.youtube.com','_blank');
        aviso('Crie a live no YouTube Studio e cole o link em Convites → YouTube',6000);
      }
    }else aviso(editando?'Live salva':'Live criada');
    fechar('mLive');await carregar();
    if(!editando&&tipo==='convidados') abrirConvites(lives.find(x=>x.id===r.live.id)||r.live);
  }catch(e){aviso(e.message,5000)}
  $('bSalvar').disabled=false;
};
$('bApagar').onclick=async()=>{
  if(!editando||!confirm(`Apagar a live "${editando.titulo}"? Os convites param de funcionar. A live no YouTube (se houver) não é apagada.`))return;
  try{await Api.post('live.delete',{id:editando.id});fechar('mLive');aviso('Live apagada');carregar()}catch(e){aviso(e.message)}
};

/* ---------- convites e YouTube ---------- */
function abrirConvites(l){
  $('convTitulo').textContent=l.titulo+(l.inicio?' · '+dataBR(l.inicio):'');
  const c=l.convidados||{};
  $('listaConv').innerHTML=l.tipo==='gravada'?'<p class="dica">Live com vídeo gravado não tem convidados.</p>':'';
  if(l.tipo!=='gravada') VAGAS.forEach(([v,rot])=>{
    const d=document.createElement('div');d.className='conv';
    d.innerHTML=`<div class="t"><b>${esc((c[v]||{}).nome||rot)}</b><small>${rot}${(c[v]||{}).cargo?' · '+esc(c[v].cargo):''}</small></div>
      <button data-a="link" class="fantasma">Só o link</button><button class="pri" data-a="msg">Copiar convite</button>`;
    d.querySelector('[data-a=msg]').onclick=()=>copiar(textoConvite(l,v),'Convite copiado. Cole no WhatsApp.');
    d.querySelector('[data-a=link]').onclick=()=>copiar(linkConvite(l,v),'Link copiado');
    $('listaConv').appendChild(d);
  });
  const yt=l.youtube;
  $('caixaYt').innerHTML=`<b>YouTube</b>
    ${yt&&yt.url?`<p class="dica">Live: <a href="${esc(yt.url)}" target="_blank" rel="noopener">${esc(yt.url)}</a></p>`:'<p class="dica">Essa live ainda não tem link do YouTube.</p>'}
    <div class="linha" style="margin-top:10px"><input id="cYtLink" placeholder="Cole aqui o link da live do YouTube" value="${esc(yt&&yt.url||'')}" autocomplete="off"><button id="bYtLink">Salvar link</button></div>
    ${ytInfo&&ytInfo.conectado?`<button class="pri" id="bYtCriar" style="margin-top:10px">${yt&&yt.id&&!yt.manual?'Atualizar no YouTube':'Criar no YouTube agora'}</button>`:
      `<p class="dica">O canal da 4blue ainda não está conectado ao sistema, então crie a live no <a href="https://studio.youtube.com" target="_blank" rel="noopener">YouTube Studio</a> e cole o link acima.</p>`}`;
  $('bYtLink').onclick=async()=>{
    try{const r=await Api.post('live.youtubeLink',{id:l.id,link:$('cYtLink').value.trim()});aviso('Link salvo');await carregar();abrirConvites(lives.find(x=>x.id===l.id)||r.live)}catch(e){aviso(e.message)}
  };
  const bc=$('bYtCriar');
  if(bc) bc.onclick=async()=>{bc.disabled=true;try{await Api.post('live.youtube',{id:l.id});aviso('Live no YouTube pronta');await carregar();abrirConvites(lives.find(x=>x.id===l.id))}catch(e){aviso(e.message,6000)}bc.disabled=false};
  abrir('mConv');
}

/* ---------- admins e canal ---------- */
$('bAdmins').onclick=async()=>{abrir('mAdmins');desenharAdmins();desenharYt()};
async function desenharAdmins(){
  $('listaAdmins').innerHTML='<p class="dica">Carregando…</p>';
  try{
    const r=await Api.post('admins.list');
    $('listaAdmins').innerHTML=`<div class="adm"><div class="t"><b>${esc(r.dono)}</b><small>Dono do sistema · admin</small></div></div>`;
    r.admins.forEach(a=>{
      const d=document.createElement('div');d.className='adm';
      d.innerHTML=`<div class="t"><b>${esc(a.nome||a.email)}</b><small>${esc(a.email)}</small></div>
        <select><option value="operador">Operador</option><option value="admin">Admin</option></select><button class="fantasma perigo" title="Tirar acesso">✕</button>`;
      const s=d.querySelector('select');s.value=a.papel;
      s.onchange=async()=>{try{await Api.post('admins.save',{email:a.email,papel:s.value});aviso('Papel alterado')}catch(e){aviso(e.message)}};
      d.querySelector('button').onclick=async()=>{if(!confirm('Tirar o acesso de '+a.email+'?'))return;try{await Api.post('admins.remove',{email:a.email});desenharAdmins()}catch(e){aviso(e.message)}};
      $('listaAdmins').appendChild(d);
    });
  }catch(e){$('listaAdmins').innerHTML=`<p class="dica">${esc(e.message)}</p>`}
}
$('bAddAdmin').onclick=async()=>{
  const email=$('aEmail').value.trim();if(!email)return;
  try{await Api.post('admins.save',{email,papel:$('aPapel').value});$('aEmail').value='';aviso('Acesso liberado. A pessoa já pode entrar com o Google da 4blue.');desenharAdmins()}catch(e){aviso(e.message)}
};
async function desenharYt(){
  try{ytInfo=await Api.post('youtube.status')}catch(e){}
  const y=ytInfo||{};
  $('ytStatus').innerHTML=y.conectado?
    `✅ Conectado ao canal <b>${esc(y.canal&&y.canal.titulo||'')}</b>. As lives podem ser criadas e agendadas direto pelo sistema.
     <div style="margin-top:10px"><button id="bYtCon">Conectar outro canal</button></div>`:
    y.configurado?
    `O sistema ainda não está ligado ao canal. Clique e, na tela do Google, <b>escolha o canal da 4blue</b>.
     <div style="margin-top:10px"><button class="pri" id="bYtCon">Conectar canal do YouTube</button></div>`:
    `Para criar as lives direto no canal da 4blue falta um passo técnico: o cliente OAuth do Google Cloud (YT_CLIENT_ID e YT_CLIENT_SECRET nas Propriedades do Apps Script, com esta URL de retorno: <code style="word-break:break-all">${esc(y.redirect||'')}</code>).
     <br><br>Enquanto isso, crie a live no YouTube Studio e cole o link no card.`;
  const b=$('bYtCon');
  if(b) b.onclick=async()=>{try{const r=await Api.post('youtube.conectar');window.open(r.url,'conectarYT','width=520,height=680');aviso('Depois de escolher o canal, volte aqui e abra Admins de novo',6000)}catch(e){aviso(e.message)}};
}

/* ---------- guia de configuração ---------- */
const GUIA=[
  ['Bem-vindo ao Estúdio 4blue',`<p>Este é o substituto do StreamYard. A transmissão sai do <b>OBS</b>, instalado no PC de quem vai operar a live, e você comanda tudo por este site.</p>
    <div class="ilus">Leva uns 10 minutos, uma vez em cada computador. Dá para ver este guia de novo no botão <b>❔ Como configurar</b>.</div>
    <ul><li>PC com Windows, de preferência com <b>cabo de rede</b></li><li>Chrome ou Edge</li><li>Fone de ouvido</li></ul>`],
  ['1. Instale o OBS',`<ol><li>Baixe em <a href="https://obsproject.com/pt-br/download" target="_blank" rel="noopener">obsproject.com</a> (versão para Windows) e instale.</li>
    <li>Se o OBS abrir o <b>assistente de configuração automática</b>, clique em <b>Cancelar</b>. O Estúdio ajusta tudo sozinho.</li></ol>`],
  ['2. Ligue a conexão com o site',`<ol><li>No OBS: menu <b>Ferramentas → Configurações do servidor WebSocket</b>.</li>
    <li>Marque <b>Habilitar servidor WebSocket</b>. Deixe a porta <b>4455</b> e a autenticação marcada.</li>
    <li>Clique em <b>Mostrar informações de conexão</b> e copie a <b>senha</b>.</li>
    <li>Clique em <b>OK</b>.</li></ol>
    <div class="ilus">A senha é colada no Estúdio na primeira vez que você entrar numa live neste PC. Ela fica só neste computador.</div>`],
  ['3. Ligue o OBS ao YouTube',`<p>Escolha um dos dois:</p>
    <ul><li><b>Mais fácil:</b> no OBS, <b>Configurações → Transmissão → Serviço: YouTube - RTMPS → Conectar conta</b> e escolha o canal da 4blue.</li>
    <li><b>Automático:</b> quando o canal da 4blue estiver conectado ao sistema (em Admins), o próprio estúdio configura o OBS no botão <b>Configurar transmissão</b>.</li></ul>
    <p>Em <b>Configurações → Saída</b>, use <b>6000 kbps</b> e o codificador de <b>hardware</b> (AMD ou NVIDIA), se aparecer.</p>`],
  ['4. Crie a live e convide',`<ol><li>Clique em <b>+ Nova live</b>, coloque título, data e hora e o nome de quem participa.</li>
    <li>Em <b>Convites</b>, copie a mensagem de cada pessoa e mande no WhatsApp. Ela já leva o link de entrada e o teste de câmera.</li>
    <li>O convidado entra por um link nosso, com chat para falar com a produção.</li></ol>`],
  ['5. Na hora da live',`<ol><li>Abra o OBS e depois clique em <b>Entrar no estúdio</b> no card da live.</li>
    <li>Na primeira vez, cole a senha do OBS. O estúdio prepara as cenas sozinho.</li>
    <li>Deixe a <b>Abertura</b> no ar e clique em <b>Entrar ao vivo</b>.</li>
    <li>Quem entrou aparece nos <b>Bastidores</b>. Clique em <b>Pôr no palco</b> para colocar a pessoa no ar.</li>
    <li>No fim, clique em <b>Encerramento</b> e depois em <b>Encerrar live</b>.</li></ol>
    <div class="ilus">Na <b>live com vídeo gravado</b>, é só abrir o estúdio antes do horário: ele mostra a contagem, roda o vídeo e encerra sozinho.</div>`]
];
let passo=0;
function mostrarGuia(){passo=0;desenharGuia();abrir('mGuia')}
function desenharGuia(){
  $('guiaBarra').innerHTML=GUIA.map((_,i)=>`<i class="${i<=passo?'on':''}"></i>`).join('');
  $('guiaConteudo').innerHTML=`<h3>${GUIA[passo][0]}</h3>${GUIA[passo][1]}`;
  $('gVoltar').hidden=passo===0;$('gProx').textContent=passo===GUIA.length-1?'Começar':'Próximo';
}
$('gProx').onclick=()=>{if(passo<GUIA.length-1){passo++;desenharGuia()}else{fechar('mGuia');guiaVisto()}};
$('gVoltar').onclick=()=>{if(passo>0){passo--;desenharGuia()}};
$('gPular').onclick=()=>{fechar('mGuia');guiaVisto()};
$('bGuia').onclick=mostrarGuia;
function guiaVisto(){localStorage.setItem('estudio4blue:guia:'+(Api.sessao.email||''),'1')}

/* ---------- início ---------- */
(async()=>{
  await Api.garantir();
  $('usuario').textContent=Api.sessao.email||'';
  $('bAdmins').hidden=Api.sessao.papel!=='admin';
  await carregar();
  if(!localStorage.getItem('estudio4blue:guia:'+(Api.sessao.email||''))) mostrarGuia();
})();
