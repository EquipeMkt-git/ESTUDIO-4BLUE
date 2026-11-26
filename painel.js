/* Painel do Estúdio 4blue: controla o OBS pelo WebSocket e manda textos para o overlay. */
const $=id=>document.getElementById(id);
const obs=new OBS();
const VAGAS=[
  {id:'c1',fonte:FONTES.C1,rotulo:'CONVIDADO 1'},
  {id:'c2',fonte:FONTES.C2,rotulo:'CONVIDADO 2'},
  {id:'c3',fonte:FONTES.C3,rotulo:'CONVIDADO 3'},
  {id:'tela',fonte:FONTES.TELA,rotulo:'TELA'}
];
const BOTOES_CENA=[
  [CENAS.ABERTURA,'Abertura'],[CENAS.SOLO,'Solo'],[CENAS.DUPLA,'Dupla'],[CENAS.TRIO,'Trio'],[CENAS.TELA_MENTOR,'Tela + mentor'],
  [CENAS.TELA_CHEIA,'Tela cheia'],[CENAS.VIDEO,'Vídeo'],[CENAS.INTERVALO,'Intervalo'],[CENAS.VOLTAMOS,'Voltamos já'],[CENAS.ENCERRAMENTO,'Encerramento']
];

/* ---------- configuração e estado (guardados neste computador) ---------- */
const K_CFG='estudio4blue:config',K_EST='estudio4blue:painel';
let cfg=Object.assign({host:'127.0.0.1',porta:'4455',senha:'',lembrar:false,pasta:'',sala:'',senhaSala:'',sessao:'',nomes:{},cargos:{},videos:''},ler(K_CFG));
if(!cfg.senha) cfg.senha=sessionStorage.getItem('estudio4blue:senha')||'';
let est=Object.assign({tema:'azul',logo:true,banner:{},letreiro:{tag:'Ao vivo'},cta:{},comentario:{},titulo:'',subtitulo:'',inicio:null,intervaloFim:null},ler(K_EST));
function ler(k){try{return JSON.parse(localStorage.getItem(k)||'{}')}catch(e){return {}}}
function salvarCfg(){
  const c=Object.assign({},cfg); if(!c.lembrar) c.senha='';
  localStorage.setItem(K_CFG,JSON.stringify(c)); sessionStorage.setItem('estudio4blue:senha',cfg.senha||'');
}
function salvarEst(){localStorage.setItem(K_EST,JSON.stringify(est))}
if(location.protocol==='file:'){
  cfg.pasta=decodeURIComponent(location.pathname).replace(/^\//,'').replace(/\/[^/]*$/,'').replace(/\//g,'\\');
}
if(!cfg.sala){sortearSala()}
function sortearSala(){
  const r=n=>Array.from(crypto.getRandomValues(new Uint8Array(n)),b=>'abcdefghjkmnpqrstuvwxyz23456789'[b%31]).join('');
  cfg.sala='aula4blue'+r(5); cfg.senhaSala=r(8);
}

/* ---------- utilidades de tela ---------- */
function aviso(t){const e=$('toast');e.textContent=t;e.classList.add('on');clearTimeout(aviso.t);aviso.t=setTimeout(()=>e.classList.remove('on'),2600)}
function log(t){const e=$('log');e.hidden=false;e.textContent+=t+'\n';e.scrollTop=e.scrollHeight}
async function copiar(t){try{await navigator.clipboard.writeText(t);aviso('Link copiado')}catch(e){prompt('Copie o link:',t)}}
function pill(id,tipo,txt){const p=$(id);p.className='pill '+(tipo||'');p.querySelector('span').textContent=txt}
function vincular(id,obj,chave,depois){
  const e=$(id); e.value=obj[chave]??''; e.addEventListener('input',()=>{obj[chave]=e.value;depois&&depois()});
}

/* ---------- envio do estado para o overlay e telas ---------- */
let envioPendente=null;
function enviar(){
  salvarEst();
  clearTimeout(envioPendente);
  envioPendente=setTimeout(async()=>{
    if(!obs.conectado) return;
    try{await obs.pedir('CallVendorRequest',{vendorName:'obs-browser',requestType:'emit_event',requestData:{event_name:'estudio',event_data:est}})}
    catch(e){console.warn(e)}
  },120);
}
setInterval(()=>obs.conectado&&enviar(),5000); // páginas recarregadas recebem de novo

/* ---------- cenas ---------- */
let programa='';
function desenharCenas(){
  $('cenas').innerHTML='';
  BOTOES_CENA.forEach(([cena,rot],i)=>{
    const b=document.createElement('button');
    b.className='cena'+(cena===CENAS.VOLTAMOS?' socorro':'')+(cena===programa?' no-ar':'');
    b.innerHTML=`<small>${(i+1)%10}</small><b>${rot}</b>`;
    b.onclick=()=>irPara(cena);
    $('cenas').appendChild(b);
  });
}
async function irPara(cena){
  try{await obs.pedir('SetCurrentProgramScene',{sceneName:cena})}
  catch(e){aviso(e.code===600?'A cena "'+cena+'" não existe. Use Configurar → Montar estúdio.':e.message)}
}
document.addEventListener('keydown',ev=>{
  if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)||ev.ctrlKey||ev.altKey||ev.metaKey) return;
  const n='1234567890'.indexOf(ev.key); if(n>=0&&BOTOES_CENA[n]) irPara(BOTOES_CENA[n][0]);
});
// mostra só um convidado nas cenas com uma vaga (Solo, Tela + mentor)
async function soEste(cena,fonte){
  for(const v of VAGAS.slice(0,3)){
    try{
      const {sceneItemId}=await obs.pedir('GetSceneItemId',{sceneName:cena,sourceName:v.fonte});
      await obs.pedir('SetSceneItemEnabled',{sceneName:cena,sceneItemId,sceneItemEnabled:v.fonte===fonte});
    }catch(e){}
  }
  irPara(cena);
}

/* ---------- convidados ---------- */
const mudos={};
function desenharVagas(){
  $('vagas').innerHTML='';
  VAGAS.forEach(v=>{
    const d=document.createElement('div');d.className='vaga';
    const ehTela=v.id==='tela';
    d.innerHTML=`<div class="topo"><b>${v.rotulo}</b><input placeholder="${ehTela?'De quem é a tela':'Nome'}" data-n></div>
      ${ehTela?'':'<input placeholder="Cargo ou assunto (para o banner)" data-c style="margin-top:6px">'}
      <div class="medidor"><i data-m></i></div>
      <div class="acoes">
        <button data-mudo>🔊 Som</button>
        ${ehTela?'<button data-acao="cheia">Tela cheia</button><button data-acao="tm">Tela + mentor</button>'
                :'<button data-acao="solo">Solo</button><button data-acao="tela">Com a tela</button><button data-acao="banner">Banner</button>'}
        <button data-acao="link">Copiar link</button>
      </div>`;
    const n=d.querySelector('[data-n]'),c=d.querySelector('[data-c]');
    n.value=cfg.nomes[v.id]||''; n.oninput=()=>{cfg.nomes[v.id]=n.value;salvarCfg();desenharLinks()};
    if(c){c.value=cfg.cargos[v.id]||''; c.oninput=()=>{cfg.cargos[v.id]=c.value;salvarCfg()}}
    d.querySelector('[data-mudo]').onclick=async()=>{
      try{await obs.pedir('SetInputMute',{inputName:v.fonte,inputMuted:!mudos[v.fonte]})}catch(e){aviso(e.message)}
    };
    d.querySelectorAll('[data-acao]').forEach(b=>b.onclick=()=>{
      const a=b.dataset.acao;
      if(a==='link') return copiar(linkConvidado(cfg,v.id,cfg.nomes[v.id]));
      if(a==='solo') return soEste(CENAS.SOLO,v.fonte);
      if(a==='tela') return soEste(CENAS.TELA_MENTOR,v.fonte);
      if(a==='cheia') return irPara(CENAS.TELA_CHEIA);
      if(a==='tm') return irPara(CENAS.TELA_MENTOR);
      if(a==='banner'){
        if(!cfg.nomes[v.id]) return aviso('Preencha o nome do convidado');
        est.banner={visivel:true,nome:cfg.nomes[v.id],cargo:cfg.cargos[v.id]||''};
        $('bNome').value=est.banner.nome;$('bCargo').value=est.banner.cargo;botoesLiga();enviar();
      }
    });
    d.dataset.fonte=v.fonte;
    $('vagas').appendChild(d);
  });
}
function marcarMudo(fonte,mudo){
  mudos[fonte]=mudo;
  const d=document.querySelector(`.vaga[data-fonte="${fonte}"] [data-mudo]`);
  if(d){d.classList.toggle('mudo',mudo);d.textContent=mudo?'🔇 Mudo':'🔊 Som'}
}
obs.on('InputMuteStateChanged',d=>marcarMudo(d.inputName,d.inputMuted));
obs.on('InputVolumeMeters',d=>{
  for(const i of d.inputs||[]){
    const el=document.querySelector(`.vaga[data-fonte="${i.inputName}"] [data-m]`); if(!el) continue;
    let pico=0; for(const ch of i.inputLevelsMul||[]) pico=Math.max(pico,ch[1]||0);
    const db=pico>0?20*Math.log10(pico):-60;
    el.style.width=Math.max(0,Math.min(100,(db+60)/60*100))+'%';
  }
});

/* ---------- bastidores (sala do diretor) ---------- */
$('bDiretor').onclick=()=>{
  const c=$('cardDiretor');c.hidden=!c.hidden;
  if(!c.hidden&&!$('ifDiretor').src) $('ifDiretor').src=linkDiretor(cfg);
  $('bDiretor').textContent=c.hidden?'Abrir bastidores':'Fechar bastidores';
};
$('bDiretorAba').onclick=()=>window.open(linkDiretor(cfg),'_blank');

/* ---------- banner, letreiro, chamada, tema ---------- */
function botoesLiga(){
  const lig=(id,on)=>{$(id).classList.toggle('on',!!on);$(id).textContent=on?'Tirar':'Mostrar'};
  lig('bBanner',est.banner.visivel);lig('bLetreiro',est.letreiro.visivel);lig('bCta',est.cta.visivel);
  $('bLogo').classList.toggle('on',est.logo!==false);$('bLogo').textContent=est.logo!==false?'Logo visível':'Logo escondido';
}
vincular('bNome',est.banner,'nome',enviar);vincular('bCargo',est.banner,'cargo',enviar);
vincular('lTag',est.letreiro,'tag',enviar);vincular('lTexto',est.letreiro,'texto',enviar);
vincular('kTitulo',est.cta,'titulo',enviar);vincular('kTexto',est.cta,'texto',enviar);
vincular('kLink',est.cta,'link',enviar);vincular('kLinkTexto',est.cta,'linkTexto',enviar);
$('bBanner').onclick=()=>{est.banner.visivel=!est.banner.visivel;botoesLiga();enviar()};
$('bLetreiro').onclick=()=>{est.letreiro.visivel=!est.letreiro.visivel;botoesLiga();enviar()};
$('bCta').onclick=()=>{est.cta.visivel=!est.cta.visivel;botoesLiga();enviar()};
$('bLogo').onclick=()=>{est.logo=est.logo===false;botoesLiga();enviar()};
$('sTema').value=est.tema;$('sTema').onchange=()=>{est.tema=$('sTema').value;enviar()};

/* ---------- telas ---------- */
vincular('tTitulo',est,'titulo',enviar);vincular('tSub',est,'subtitulo',enviar);
vincular('tTxtInt',est,'textoIntervalo',enviar);vincular('tTxtVolt',est,'textoVoltamos',enviar);
vincular('tFimChapeu',est,'tituloFimChapeu',enviar);vincular('tFimTitulo',est,'tituloFim',enviar);vincular('tFimTexto',est,'textoFim',enviar);
if(est.inicio){const d=new Date(est.inicio);$('tInicio').value=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')}
$('tInicio').onchange=()=>{
  const v=$('tInicio').value; if(!v){est.inicio=null;return enviar()}
  const [h,m]=v.split(':').map(Number); const d=new Date(); d.setHours(h,m,0,0);
  if(d<Date.now()-3600e3) d.setDate(d.getDate()+1); // horário que já passou há mais de 1h = amanhã
  est.inicio=d.getTime(); enviar();
};
document.querySelectorAll('[data-int]').forEach(b=>b.onclick=()=>{
  const m=Number(b.dataset.int); est.intervaloFim=m?Date.now()+m*60000:null; enviar(); irPara(CENAS.INTERVALO);
});

/* ---------- comentários (Social Stream Ninja) ---------- */
let wsChat=null,chatLigado=false,mensagens=[];
function ligarChat(){
  if(!cfg.sessao) return aviso('Preencha o ID da sessão do Social Stream');
  chatLigado=true; $('bChat').textContent='Desligar'; abrirChat();
}
function desligarChat(){chatLigado=false;$('bChat').textContent='Ligar';try{wsChat&&wsChat.close()}catch(e){};pill('pChat','','Chat desligado')}
function abrirChat(){
  if(!chatLigado) return;
  pill('pChat','','Chat conectando…');
  wsChat=new WebSocket('wss://io.socialstream.ninja/join/'+encodeURIComponent(cfg.sessao)+'/4');
  wsChat.onopen=()=>pill('pChat','ok','Chat ligado');
  wsChat.onclose=()=>{if(chatLigado){pill('pChat','erro','Chat caiu, religando…');setTimeout(abrirChat,3000)}};
  wsChat.onmessage=ev=>{
    let m; try{m=JSON.parse(ev.data)}catch(e){return}
    if(m&&m.action==='content'&&m.value) m=m.value;
    if(!m||!m.chatname||!m.chatmessage) return;
    const txt=m.textonly?m.chatmessage:(new DOMParser().parseFromString(m.chatmessage,'text/html').body.textContent||'');
    mensagens.unshift({nome:m.chatname,texto:txt.trim(),foto:m.chatimg||'',origem:m.type||''});
    mensagens=mensagens.slice(0,200); desenharChat();
  };
}
$('bChat').onclick=()=>chatLigado?desligarChat():ligarChat();
function desenharChat(){
  const f=($('chatBusca').value||'').toLowerCase();
  const lista=mensagens.filter(m=>!f||(m.nome+' '+m.texto).toLowerCase().includes(f));
  const box=$('chat');
  if(!lista.length){box.innerHTML='<div class="vazio">'+(mensagens.length?'Nada com esse filtro.':'Nenhum comentário ainda. Clique em um comentário para mostrar na live.')+'</div>';return}
  box.innerHTML='';
  lista.forEach(m=>{
    const d=document.createElement('div');
    d.className='msg'+(est.comentario.visivel&&est.comentario.texto===m.texto&&est.comentario.nome===m.nome?' destaque':'');
    const img=document.createElement('img');img.src=m.foto||'assets/logo-4blue-branca.png';img.alt='';
    const t=document.createElement('div');
    const n=document.createElement('div');n.className='n';n.textContent=m.nome+(m.origem?' · '+m.origem:'');
    const x=document.createElement('div');x.className='t';x.textContent=m.texto;
    t.append(n,x);d.append(img,t);
    d.onclick=()=>destacar(m);
    box.appendChild(d);
  });
}
$('chatBusca').oninput=desenharChat;
function destacar(m){
  const mesmo=est.comentario.visivel&&est.comentario.texto===m.texto&&est.comentario.nome===m.nome;
  est.comentario=mesmo?Object.assign({},est.comentario,{visivel:false}):{visivel:true,nome:m.nome,texto:m.texto,foto:m.foto||''};
  enviar();desenharChat();
}
$('bTirarComent').onclick=()=>{est.comentario.visivel=false;enviar();desenharChat()};
$('bManual').onclick=()=>{if(!$('mTexto').value.trim())return;destacar({nome:$('mNome').value.trim(),texto:$('mTexto').value.trim(),foto:''})};

/* ---------- vídeo ---------- */
let cenaAntesDoVideo=null;
function listaVideos(){return (cfg.videos||'').split('\n').map(s=>s.trim().replace(/^"|"$/g,'')).filter(Boolean)}
function desenharVideos(){
  const atual=$('vSel').value; $('vSel').innerHTML='';
  listaVideos().forEach(p=>{const o=document.createElement('option');o.value=p;o.textContent=p.split(/[\\/]/).pop();$('vSel').appendChild(o)});
  if(atual) $('vSel').value=atual;
}
$('vLista').value=cfg.videos||'';$('vLista').oninput=()=>{cfg.videos=$('vLista').value;salvarCfg();desenharVideos()};
$('vTocar').onclick=async()=>{
  const p=$('vSel').value; if(!p) return aviso('Coloque o caminho de um vídeo na lista');
  try{
    if(programa!==CENAS.VIDEO) cenaAntesDoVideo=programa;
    await obs.pedir('SetInputSettings',{inputName:FONTES.VIDEO,inputSettings:{local_file:p.replace(/\\/g,'/')}});
    await irPara(CENAS.VIDEO);
    await obs.pedir('TriggerMediaInputAction',{inputName:FONTES.VIDEO,mediaAction:'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART'});
    $('vStatus').textContent='Tocando: '+p.split(/[\\/]/).pop();
  }catch(e){aviso(e.message)}
};
obs.on('MediaInputPlaybackEnded',d=>{
  if(d.inputName!==FONTES.VIDEO) return;
  $('vStatus').textContent='Vídeo terminou.';
  if($('vVoltar').checked&&programa===CENAS.VIDEO&&cenaAntesDoVideo) irPara(cenaAntesDoVideo);
});

/* ---------- transmissão, gravação e números ---------- */
let aoVivo=false,gravando=false;
function marcarSaidas(){
  $('bTransmitir').classList.toggle('vivo',aoVivo);$('bTransmitir').textContent=aoVivo?'■ Encerrar transmissão':'Iniciar transmissão';
  $('bGravar').classList.toggle('vivo',gravando);$('bGravar').textContent=gravando?'■ Parar gravação':'● Gravar';
}
$('bTransmitir').onclick=async()=>{
  if(aoVivo){if(!confirm('Encerrar a transmissão agora? A live acaba para todo mundo.'))return;await obs.pedir('StopStream').catch(e=>aviso(e.message))}
  else{if(!confirm('Iniciar a transmissão agora com as configurações de transmissão do OBS?'))return;await obs.pedir('StartStream').catch(e=>aviso(e.message))}
};
$('bGravar').onclick=()=>obs.pedir(gravando?'StopRecord':'StartRecord').catch(e=>aviso(e.message));
obs.on('StreamStateChanged',d=>{aoVivo=!!d.outputActive;marcarSaidas()});
obs.on('RecordStateChanged',d=>{gravando=!!d.outputActive;marcarSaidas()});
async function atualizarNumeros(){
  if(!obs.conectado) return;
  try{
    const [s,g]=await Promise.all([obs.pedir('GetStreamStatus'),obs.pedir('GetStats')]);
    aoVivo=s.outputActive; marcarSaidas();
    const perd=s.outputTotalFrames?(100*s.outputSkippedFrames/s.outputTotalFrames):0;
    $('stats').innerHTML=(aoVivo?`<b style="color:#fca5a5">AO VIVO ${s.outputTimecode.split('.')[0]}</b> · `:'')+
      `CPU ${g.cpuUsage.toFixed(0)}% · ${g.activeFps.toFixed(0)} fps`+(aoVivo?` · perda ${perd.toFixed(1)}%`:'')+
      (g.renderSkippedFrames>0?` · render perdeu ${g.renderSkippedFrames}`:'');
  }catch(e){}
}
setInterval(atualizarNumeros,2000);

/* ---------- prévia do que está no ar ---------- */
async function previa(){
  if(obs.conectado&&$('cPrevia').checked&&programa&&!document.hidden){
    try{
      const r=await obs.pedir('GetSourceScreenshot',{sourceName:programa,imageFormat:'jpg',imageWidth:640,imageCompressionQuality:55});
      let img=$('prev').querySelector('img');
      if(!img){$('prev').innerHTML='<img alt="Prévia"><span class="tag">NO AR</span>';img=$('prev').querySelector('img')}
      img.src=r.imageData;
      $('prev').querySelector('.tag').style.display=aoVivo?'':'none';
    }catch(e){}
  }
  setTimeout(previa,1200);
}
previa();

/* ---------- conexão ---------- */
let querConectado=false;
async function conectar(){
  salvarCfg();
  pill('pObs','','Conectando…');
  try{
    await obs.conectar(`ws://${cfg.host||'127.0.0.1'}:${cfg.porta||4455}`,cfg.senha);
    querConectado=true;
    pill('pObs','ok','OBS conectado');
    ['bGravar','bTransmitir','bMontar','bVideo','bRefazer'].forEach(id=>$(id).disabled=false);
    programa=(await obs.pedir('GetCurrentProgramScene')).currentProgramSceneName||'';desenharCenas();
    const [s,r]=await Promise.all([obs.pedir('GetStreamStatus'),obs.pedir('GetRecordStatus')]);
    aoVivo=s.outputActive;gravando=r.outputActive;marcarSaidas();
    for(const v of VAGAS){try{marcarMudo(v.fonte,(await obs.pedir('GetInputMute',{inputName:v.fonte})).inputMuted)}catch(e){}}
    const {scenes}=await obs.pedir('GetSceneList');
    if(!scenes.some(s=>s.sceneName===CENAS.SOLO)) {abrirAba('tConfig');aviso('Conectado. Agora clique em "Montar / atualizar estúdio".')}
    enviar();
  }catch(e){pill('pObs','erro','OBS: '+e.message);aviso(e.message)}
}
obs.on('_fechou',()=>{
  pill('pObs','erro','OBS desconectado, tentando de novo…');
  ['bGravar','bTransmitir','bMontar','bVideo','bRefazer'].forEach(id=>$(id).disabled=true);
  if(querConectado) setTimeout(()=>!obs.conectado&&conectar(),3000);
});
obs.on('CurrentProgramSceneChanged',d=>{programa=d.sceneName;desenharCenas()});
$('bConectar').onclick=()=>{cfg.host=$('cHost').value.trim();cfg.porta=$('cPorta').value.trim();cfg.senha=$('cSenha').value;conectar()};

/* ---------- configurar ---------- */
$('cHost').value=cfg.host;$('cPorta').value=cfg.porta;$('cSenha').value=cfg.senha;$('cLembrar').checked=!!cfg.lembrar;
$('cLembrar').onchange=()=>{cfg.lembrar=$('cLembrar').checked;salvarCfg()};
$('cPasta').value=cfg.pasta;$('cPasta').oninput=()=>{cfg.pasta=$('cPasta').value.trim();salvarCfg()};
$('avisoPasta').hidden=!!cfg.pasta;
$('cSala').value=cfg.sala;$('cSenhaSala').value=cfg.senhaSala;
$('cSala').oninput=()=>{cfg.sala=$('cSala').value.trim().replace(/[^\w]/g,'');salvarCfg();desenharLinks()};
$('cSenhaSala').oninput=()=>{cfg.senhaSala=$('cSenhaSala').value.trim();salvarCfg();desenharLinks()};
$('bSorteio').onclick=()=>{
  if(!confirm('Gerar sala nova? Os links antigos dos convidados param de funcionar e é preciso clicar em "Montar / atualizar estúdio" de novo.'))return;
  sortearSala();$('cSala').value=cfg.sala;$('cSenhaSala').value=cfg.senhaSala;$('ifDiretor').removeAttribute('src');salvarCfg();desenharLinks();
};
$('cSessao').value=cfg.sessao;$('cSessao').oninput=()=>{cfg.sessao=$('cSessao').value.trim();salvarCfg()};
async function montar(refazer){
  if(!cfg.pasta) return aviso('Preencha a pasta do Estúdio');
  if(!cfg.sala) return aviso('Preencha o nome da sala');
  if(refazer&&!confirm('Apagar as 10 cenas do Estúdio no OBS e criar de novo? Ajustes feitos à mão nelas se perdem (as fontes e filtros ficam).'))return;
  $('bMontar').disabled=$('bRefazer').disabled=true;$('log').textContent='';
  try{await montarEstudio(obs,cfg,log,refazer);enviar();aviso('Estúdio montado no OBS')}
  catch(e){log('ERRO: '+e.message);aviso(e.message)}
  $('bMontar').disabled=$('bRefazer').disabled=false;
}
$('bMontar').onclick=()=>montar(false);
$('bRefazer').onclick=()=>montar(true);
$('bVideo').onclick=async()=>{
  if(!confirm('Ajustar o vídeo do OBS para 1920x1080 a 30 fps? Não funciona com a transmissão ligada.'))return;
  try{await obs.pedir('SetVideoSettings',{baseWidth:1920,baseHeight:1080,outputWidth:1920,outputHeight:1080,fpsNumerator:30,fpsDenominator:1});aviso('Vídeo ajustado para 1080p30')}
  catch(e){aviso(e.message)}
};
function desenharLinks(){
  const L=[];
  VAGAS.forEach(v=>L.push([v.rotulo+(cfg.nomes[v.id]?' ('+cfg.nomes[v.id]+')':''),linkConvidado(cfg,v.id,cfg.nomes[v.id])]));
  L.push(['Bastidores',linkDiretor(cfg)]);
  if(cfg.sessao) L.push(['Chat (dock)','https://socialstream.ninja/dock.html?session='+encodeURIComponent(cfg.sessao)]);
  $('links').innerHTML='';
  L.forEach(([r,u])=>{
    const d=document.createElement('div');d.className='l';
    d.innerHTML='<span></span><input readonly><button>Copiar</button>';
    d.querySelector('span').textContent=r;d.querySelector('input').value=u;d.querySelector('button').onclick=()=>copiar(u);
    $('links').appendChild(d);
  });
}

/* ---------- abas ---------- */
function abrirAba(id){
  document.querySelectorAll('#abas button').forEach(b=>b.classList.toggle('sel',b.dataset.aba===id));
  document.querySelectorAll('.aba').forEach(a=>a.classList.toggle('sel',a.id===id));
}
document.querySelectorAll('#abas button').forEach(b=>b.onclick=()=>abrirAba(b.dataset.aba));

/* ---------- início ---------- */
salvarCfg();desenharCenas();desenharVagas();desenharLinks();desenharVideos();botoesLiga();marcarSaidas();
if(cfg.senha||cfg.lembrar){conectar()} else abrirAba('tConfig');
