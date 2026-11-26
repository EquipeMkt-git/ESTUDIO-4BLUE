/* Estúdio 4blue — painel no estilo StreamYard.
   Online (GitHub Pages) com login Google da 4blue. Conversa com o OBS do próprio computador pelo WebSocket. */
const $=id=>document.getElementById(id);
const LIVE_ID=new URLSearchParams(location.search).get('live')||'';
let live=null;
const ONLINE=/^https?:$/.test(location.protocol);
const obs=new OBS();

const VAGAS=[
  {id:'c1',fonte:FONTES.C1,rotulo:'Pessoa 1'},
  {id:'c2',fonte:FONTES.C2,rotulo:'Pessoa 2'},
  {id:'c3',fonte:FONTES.C3,rotulo:'Pessoa 3'},
  {id:'tela',fonte:FONTES.TELA,rotulo:'Tela compartilhada'}
];
const LAYOUTS=[
  ['auto','Automático','<rect x="1" y="1" width="15" height="18" rx="2"/><rect x="18" y="1" width="15" height="18" rx="2" opacity=".5"/>'],
  ['solo','Uma pessoa','<rect x="5" y="1" width="24" height="18" rx="2"/>'],
  ['dupla','Lado a lado','<rect x="1" y="4" width="15" height="12" rx="2"/><rect x="18" y="4" width="15" height="12" rx="2"/>'],
  ['trio','Três','<rect x="0" y="6" width="10" height="8" rx="1.5"/><rect x="12" y="6" width="10" height="8" rx="1.5"/><rect x="24" y="6" width="10" height="8" rx="1.5"/>'],
  ['telaPessoas','Tela + pessoas','<rect x="1" y="2" width="23" height="16" rx="2"/><rect x="26" y="2" width="7" height="5" rx="1"/><rect x="26" y="9" width="7" height="5" rx="1"/>'],
  ['soTela','Só a tela','<rect x="2" y="1" width="30" height="18" rx="2"/>']
];
const CENAS_PALCO=[CENAS.SOLO,CENAS.DUPLA,CENAS.TRIO,CENAS.TELA_MENTOR,CENAS.TELA_CHEIA];

/* ---------- guardado neste navegador ---------- */
const K_CFG='estudio4blue:config',K_EST='estudio4blue:painel:'+LIVE_ID;
const ler=k=>{try{return JSON.parse(localStorage.getItem(k)||'{}')}catch(e){return {}}};
let cfg=Object.assign({host:'127.0.0.1',porta:'4455',senha:'',pasta:'',sala:'',senhaSala:'',nomes:{},cargos:{},videos:[],minis:true,previa:true},ler(K_CFG));
if(typeof cfg.videos==='string') cfg.videos=cfg.videos.split('\n').map(s=>s.trim()).filter(Boolean);
let est=Object.assign({tema:'azul',logo:true,banner:{},banners:[],letreiro:{tag:'Ao vivo'},cta:{},comentario:{},titulo:'',subtitulo:'',inicio:null,intervaloFim:null,palco:[],tela:false,layout:'auto'},ler(K_EST));
const salvarCfg=()=>localStorage.setItem(K_CFG,JSON.stringify(cfg));
const salvarEst=()=>localStorage.setItem(K_EST,JSON.stringify(est));
cfg.site=ONLINE?(CFG.SITE&&location.hostname.endsWith('github.io')?CFG.SITE:location.href.replace(/[^/]*([?#].*)?$/,'')):'';
if(!ONLINE) cfg.pasta=decodeURIComponent(location.pathname).replace(/^\//,'').replace(/\/[^/]*$/,'').replace(/\//g,'\\');
function sortearSala(){
  const r=n=>Array.from(crypto.getRandomValues(new Uint8Array(n)),b=>'abcdefghjkmnpqrstuvwxyz23456789'[b%31]).join('');
  cfg.sala='aula4blue'+r(5);cfg.senhaSala=r(10);
}
salvarCfg();

/* ---------- utilidades ---------- */
function aviso(t,ms){const e=$('toast');e.textContent=t;e.classList.add('on');clearTimeout(aviso.t);aviso.t=setTimeout(()=>e.classList.remove('on'),ms||2800)}
async function copiar(t,msg){try{await navigator.clipboard.writeText(t);aviso(msg||'Copiado')}catch(e){prompt('Copie:',t)}}
function pill(tipo,txt){$('pObs').className='pill '+(tipo||'');$('pObs').querySelector('span').textContent=txt}
const abrir=id=>$(id).hidden=false, fechar=id=>$(id).hidden=true;
document.querySelectorAll('[data-fechar]').forEach(b=>b.onclick=()=>b.closest('.fundo-modal').hidden=true);
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.fundo-modal:not(#mLogin)').forEach(m=>m.hidden=true)});
function chave(id,ligado){$(id).classList.toggle('on',!!ligado)}

$('bSair').onclick=()=>Api.sair();
Api.aoExpirar=()=>Api.entrar();

/* ---------- envio para overlay e telas ---------- */
let envioT=null;
function enviar(){
  salvarEst();clearTimeout(envioT);
  envioT=setTimeout(()=>{if(obs.conectado)obs.pedir('CallVendorRequest',{vendorName:'obs-browser',requestType:'emit_event',requestData:{event_name:'estudio',event_data:est}}).catch(()=>{})},120);
}
setInterval(()=>obs.conectado&&enviar(),5000);

/* ---------- palco ---------- */
let programa='',layoutAtual=null;
function desenharLayouts(){
  const atual=escolherLayout(est.palco,est.tela,est.layout);
  $('layouts').innerHTML=LAYOUTS.map(([id,rot,svg])=>{
    const desab=(id==='telaPessoas'||id==='soTela')&&!est.tela;
    const sel=est.layout===id||(est.layout==='auto'&&id==='auto');
    return `<button class="lay${sel?' sel':''}" data-l="${id}" ${desab?'disabled title="Ponha a tela compartilhada no palco"':''}><svg viewBox="0 0 34 20">${svg}</svg>${rot}</button>`;
  }).join('');
  $('layouts').querySelectorAll('[data-l]').forEach(b=>b.onclick=()=>{est.layout=b.dataset.l;salvarEst();desenharLayouts();aplicarPalco(true)});
}
let aplicando=false,pendente=false;
async function aplicarPalco(forcarAoAr){
  salvarEst();desenharCards();desenharLayouts();
  if(!obs.conectado) return;
  // se uma tela cheia (abertura, intervalo...) está no ar, só prepara o palco
  const emTela=programa&&!CENAS_PALCO.includes(programa);
  if(emTela&&!forcarAoAr){$('bVoltarPalco').hidden=!escolherLayout(est.palco,est.tela,est.layout);return}
  if(aplicando){pendente=true;return}
  aplicando=true;
  try{
    const r=await arrumarPalco(obs,est.palco,est.tela,est.layout);
    if(!r&&forcarAoAr) aviso('Ninguém no palco. Ponha alguém no palco nos bastidores.');
    layoutAtual=r;
  }catch(e){aviso(e.code===600?'Faltam cenas no OBS. Abra Configurações → Refazer cenas.':e.message)}
  aplicando=false;
  if(pendente){pendente=false;aplicarPalco()}
}
$('bVoltarPalco').onclick=()=>aplicarPalco(true);
document.querySelectorAll('[data-tela]').forEach(b=>b.onclick=ev=>{
  const t=b.dataset.tela;
  if(t==='INTERVALO') return menuIntervalo(b);
  irPara(CENAS[t]);
});
function menuIntervalo(b){
  document.querySelectorAll('.pop').forEach(p=>p.remove());
  const r=b.getBoundingClientRect(),p=document.createElement('div');p.className='pop';
  p.style.left=r.left+'px';p.style.top=(r.top-56)+'px';
  p.innerHTML=[5,10,15,0].map(m=>`<button data-m="${m}">${m?m+' min':'Sem relógio'}</button>`).join('');
  p.querySelectorAll('button').forEach(x=>x.onclick=()=>{const m=+x.dataset.m;est.intervaloFim=m?Date.now()+m*60000:null;enviar();irPara(CENAS.INTERVALO);p.remove()});
  document.body.appendChild(p);
  setTimeout(()=>document.addEventListener('click',function f(e){if(!p.contains(e.target)){p.remove();document.removeEventListener('click',f)}}),0);
}
async function irPara(cena){
  try{await obs.pedir('SetCurrentProgramScene',{sceneName:cena})}
  catch(e){aviso(e.code===600?'Faltam cenas no OBS. Abra Configurações → Refazer cenas.':e.message)}
}
function marcarPrograma(){
  document.querySelectorAll('[data-tela]').forEach(b=>b.classList.toggle('sel',CENAS[b.dataset.tela]===programa));
  const emTela=programa&&!CENAS_PALCO.includes(programa);
  $('bVoltarPalco').hidden=!(emTela&&escolherLayout(est.palco,est.tela,est.layout));
}

/* ---------- bastidores ---------- */
const mudos={};
const convidado=id=>((live&&live.convidados)||{})[id]||{};
function nomeVaga(v){return convidado(v.id).nome||''}
function desenharCards(){
  const box=$('cards');
  VAGAS.forEach(v=>{
    let c=box.querySelector(`[data-v="${v.id}"]`);
    if(!c){
      c=document.createElement('div');c.className='pc';c.dataset.v=v.id;
      c.innerHTML=`<div class="mini"><span class="selo" hidden>NO PALCO</span><span class="espera"></span></div>
        <div class="info"><div class="nome"><b></b><button class="ic fantasma" data-a="conv" title="Copiar convite">🔗</button></div>
        <div class="med"><i></i></div>
        <div class="acoes"><button class="grande" data-a="palco"></button><button class="ic" data-a="som" title="Som na live">🔊</button>${v.id==='tela'?'':'<button class="ic" data-a="nome" title="Mostrar o nome na tela">🏷</button>'}</div></div>`;
      c.querySelector('[data-a=palco]').onclick=()=>alternarPalco(v.id);
      c.querySelector('[data-a=som]').onclick=()=>obs.pedir('SetInputMute',{inputName:v.fonte,inputMuted:!mudos[v.fonte]}).catch(e=>aviso(e.message));
      c.querySelector('[data-a=conv]').onclick=()=>copiar(convite(v),'Convite copiado. Cole no WhatsApp.');
      const bn=c.querySelector('[data-a=nome]');
      if(bn) bn.onclick=()=>{
        if(!nomeVaga(v)) return aviso('Escreva o nome em + Convidar');
        const ja=est.banner.visivel&&est.banner.nome===nomeVaga(v);
        est.banner=ja?{...est.banner,visivel:false}:{visivel:true,nome:nomeVaga(v),cargo:convidado(v.id).cargo||''};
        enviar();desenharBanners();desenharCards();
      };
      box.appendChild(c);
    }
    const noPalco=v.id==='tela'?est.tela:est.palco.includes(v.id);
    c.classList.toggle('no-palco',noPalco);
    c.querySelector('.selo').hidden=!noPalco;
    const n=c.querySelector('.nome b');n.textContent=nomeVaga(v)||v.rotulo;n.classList.toggle('sem',!nomeVaga(v));
    c.querySelector('[data-a=palco]').textContent=noPalco?'Tirar do palco':'Pôr no palco';
    const bn=c.querySelector('[data-a=nome]');if(bn) bn.classList.toggle('pri',!!(est.banner.visivel&&est.banner.nome===nomeVaga(v)&&nomeVaga(v)));
    const s=c.querySelector('[data-a=som]');s.classList.toggle('mudo',!!mudos[v.fonte]);s.textContent=mudos[v.fonte]?'🔇':'🔊';
    // miniatura ao vivo do convidado (VDO.Ninja)
    const mini=c.querySelector('.mini');let f=mini.querySelector('iframe');
    const src=cfg.minis?linkMiniatura(cfg,v.id):'';
    if(src&&(!f||f.dataset.src!==src)){if(f)f.remove();f=document.createElement('iframe');f.allow='autoplay';f.dataset.src=src;f.src=src;mini.appendChild(f)}
    if(!src&&f) f.remove();
    mini.querySelector('.espera').textContent=src?'':(v.id==='tela'?'Tela':'Sem vídeo');
  });
}
function alternarPalco(id){
  if(id==='tela') est.tela=!est.tela;
  else est.palco=est.palco.includes(id)?est.palco.filter(x=>x!==id):[...est.palco,id];
  if((est.layout==='telaPessoas'||est.layout==='soTela')&&!est.tela) est.layout='auto';
  aplicarPalco();
}
obs.on('InputMuteStateChanged',d=>{mudos[d.inputName]=d.inputMuted;desenharCards()});
obs.on('InputVolumeMeters',d=>{
  for(const i of d.inputs||[]){
    const v=VAGAS.find(x=>x.fonte===i.inputName);if(!v)continue;
    const el=document.querySelector(`[data-v="${v.id}"] .med i`);if(!el)continue;
    let p=0;for(const ch of i.inputLevelsMul||[])p=Math.max(p,ch[1]||0);
    const db=p>0?20*Math.log10(p):-60;el.style.width=Math.max(0,Math.min(100,(db+60)/60*100))+'%';
  }
});
$('bFalar').onclick=()=>window.open(linkDiretor(cfg),'bastidores4blue');

/* ---------- convites ---------- */
function convite(v){return textoConvite(live,v.id)}
$('bConvidar').onclick=()=>{
  $('listaConv').innerHTML='';
  VAGAS.forEach(v=>{
    const d=document.createElement('div');d.className='conv';
    d.innerHTML=`<div class="linha"><b>${v.rotulo}</b><input placeholder="${v.id==='tela'?'De quem é a tela':'Nome'}" data-n>
      <button class="pri" data-c>Copiar convite</button></div>
      ${v.id==='tela'?'':'<input placeholder="Cargo (para o nome na tela)" data-g style="margin-top:6px">'}`;
    const n=d.querySelector('[data-n]'),g=d.querySelector('[data-g]');
    const conv=()=>{live.convidados=live.convidados||{};return live.convidados[v.id]=live.convidados[v.id]||{}};
    n.value=convidado(v.id).nome||'';n.oninput=()=>{conv().nome=n.value.trim();salvarLiveDepois();desenharCards()};
    if(g){g.value=convidado(v.id).cargo||'';g.oninput=()=>{conv().cargo=g.value.trim();salvarLiveDepois()}}
    d.querySelector('[data-c]').onclick=()=>copiar(convite(v),'Convite copiado. Cole no WhatsApp.');
    $('listaConv').appendChild(d);
  });
  abrir('mConvidar');
};

/* ---------- banners, letreiro, chamada ---------- */
function desenharBanners(){
  const L=$('listaBanners');
  if(!est.banners.length){L.innerHTML='<div class="vazio-txt">Nenhum banner ainda. Os nomes dos convidados também aparecem nos bastidores (botão 🏷).</div>';return}
  L.innerHTML='';
  est.banners.forEach((b,i)=>{
    const on=est.banner.visivel&&est.banner.nome===b.titulo&&(est.banner.cargo||'')===(b.sub||'');
    const d=document.createElement('div');d.className='item'+(on?' on':'');
    d.innerHTML=`<div class="t"><b>${esc(b.titulo)}</b>${b.sub?`<small>${esc(b.sub)}</small>`:''}</div><button class="x" title="Apagar">✕</button>`;
    d.onclick=e=>{if(e.target.classList.contains('x'))return;est.banner=on?{...est.banner,visivel:false}:{visivel:true,nome:b.titulo,cargo:b.sub||''};enviar();desenharBanners();desenharCards()};
    d.querySelector('.x').onclick=()=>{est.banners.splice(i,1);salvarEst();desenharBanners()};
    L.appendChild(d);
  });
}
$('bAddBanner').onclick=()=>{const t=$('nbTitulo').value.trim();if(!t)return;est.banners.push({titulo:t,sub:$('nbSub').value.trim()});$('nbTitulo').value=$('nbSub').value='';salvarEst();desenharBanners()};
$('nbSub').onkeydown=$('nbTitulo').onkeydown=e=>{if(e.key==='Enter')$('bAddBanner').click()};
$('bTirarBanner').onclick=()=>{est.banner.visivel=false;enviar();desenharBanners();desenharCards()};
function campo(id,obj,k){const e=$(id);e.value=obj[k]??'';e.oninput=()=>{obj[k]=e.value;enviar()}}
campo('lTexto',est.letreiro,'texto');
campo('kTitulo',est.cta,'titulo');campo('kLink',est.cta,'link');campo('kLinkTexto',est.cta,'linkTexto');campo('kTexto',est.cta,'texto');
$('kLetreiro').onclick=()=>{if(!est.letreiro.texto)return aviso('Escreva o texto do letreiro');est.letreiro.visivel=!est.letreiro.visivel;chave('kLetreiro',est.letreiro.visivel);enviar()};
$('kCta').onclick=()=>{if(!est.cta.titulo&&!est.cta.link)return aviso('Preencha o título ou o link');est.cta.visivel=!est.cta.visivel;chave('kCta',est.cta.visivel);enviar()};

/* ---------- marca e telas ---------- */
function desenharMarca(){document.querySelectorAll('.tema').forEach(t=>t.classList.toggle('sel',t.dataset.t===est.tema));chave('kLogo',est.logo!==false)}
document.querySelectorAll('.tema').forEach(t=>t.onclick=()=>{est.tema=t.dataset.t;enviar();desenharMarca()});
$('kLogo').onclick=()=>{est.logo=est.logo===false;enviar();desenharMarca()};
campo('titulo',est,'titulo');campo('tSub',est,'subtitulo');
campo('tTxtInt',est,'textoIntervalo');campo('tTxtVolt',est,'textoVoltamos');
campo('tFimChapeu',est,'tituloFimChapeu');campo('tFimTitulo',est,'tituloFim');campo('tFimTexto',est,'textoFim');
if(est.inicio){const d=new Date(est.inicio);$('tInicio').value=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')}
$('tInicio').onchange=()=>{
  const v=$('tInicio').value;if(!v){est.inicio=null;return enviar()}
  const [h,m]=v.split(':').map(Number),d=new Date();d.setHours(h,m,0,0);
  if(d<Date.now()-3600e3) d.setDate(d.getDate()+1);
  est.inicio=d.getTime();enviar();
};

/* ---------- vídeos ---------- */
let cenaAntesDoVideo=null,palcoAntesDoVideo=false;
function desenharVideos(){
  const L=$('listaVideos');
  if(!cfg.videos.length){L.innerHTML='<div class="vazio-txt">Nenhum vídeo ainda.</div>';return}
  L.innerHTML='';
  cfg.videos.forEach((p,i)=>{
    const d=document.createElement('div');d.className='item';
    d.innerHTML=`<button class="pri" style="padding:6px 10px">▶</button><div class="t"><b>${esc(p.split(/[\\/]/).pop())}</b><small>${esc(p)}</small></div><button class="x" title="Tirar da lista">✕</button>`;
    d.querySelector('.pri').onclick=()=>tocar(p);
    d.querySelector('.x').onclick=()=>{cfg.videos.splice(i,1);salvarCfg();desenharVideos()};
    L.appendChild(d);
  });
}
$('bAddVideo').onclick=()=>{const p=$('novoVideo').value.trim().replace(/^"|"$/g,'');if(!p)return;cfg.videos.push(p);$('novoVideo').value='';salvarCfg();desenharVideos()};
$('novoVideo').onkeydown=e=>{if(e.key==='Enter')$('bAddVideo').click()};
async function tocar(p){
  try{
    if(programa!==CENAS.VIDEO){cenaAntesDoVideo=programa;palcoAntesDoVideo=CENAS_PALCO.includes(programa)}
    await obs.pedir('SetInputSettings',{inputName:FONTES.VIDEO,inputSettings:{local_file:p.replace(/\\/g,'/')}});
    await irPara(CENAS.VIDEO);
    await obs.pedir('TriggerMediaInputAction',{inputName:FONTES.VIDEO,mediaAction:'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART'});
  }catch(e){aviso(e.message)}
}
obs.on('MediaInputPlaybackEnded',d=>{
  if(d.inputName===FONTES.VIDEO&&programa===CENAS.GRAVADA) return fimGravada();
  if(d.inputName!==FONTES.VIDEO||programa!==CENAS.VIDEO) return;
  if(palcoAntesDoVideo) aplicarPalco(true); else if(cenaAntesDoVideo) irPara(cenaAntesDoVideo);
});

/* ---------- comentários do YouTube (Apps Script) ---------- */
let chatLigado=false,chatPage='',chatT=null,mensagens=[],vistos=new Set();
function idDoVideo(s){s=String(s||'').trim();const m=s.match(/(?:v=|youtu\.be\/|\/live\/|\/video\/|\/embed\/|\/shorts\/)([\w-]{11})/);return m?m[1]:(/^[\w-]{11}$/.test(s)?s:'')}
$('chatLink').value=cfg.chatLink||'';
$('bChat').onclick=()=>{
  if(chatLigado){chatLigado=false;clearTimeout(chatT);$('bChat').textContent='Ligar';$('chatStatus').textContent='Desligado.';return}
  if(!CFG.API_URL) return aviso('O leitor de comentários ainda não foi publicado (Apps Script). Use o comentário escrito.',4000);
  const v=idDoVideo($('chatLink').value);if(!v) return aviso('Cole o link da live do YouTube');
  cfg.chatLink=$('chatLink').value.trim();salvarCfg();
  chatLigado=true;chatPage='';$('bChat').textContent='Desligar';$('chatStatus').textContent='Conectando…';lerChat(v);
};
async function lerChat(v){
  if(!chatLigado) return;
  let espera=8000;
  try{
    const u=CFG.API_URL+'?acao=chat&v='+encodeURIComponent(v)+'&page='+encodeURIComponent(chatPage)+'&token='+encodeURIComponent(Api.sessao.token||'');
    const r=await fetch(u).then(x=>x.json());
    if(r.relogar){chatLigado=false;$('bChat').textContent='Ligar';await Api.entrar();return}
    if(!r.ok){$('chatStatus').textContent=r.erro;espera=20000}
    else{
      chatPage=r.page||chatPage;espera=r.espera||8000;$('chatStatus').textContent='Ligado. Clique num comentário para mostrar na live.';
      let novos=0;for(const m of r.itens||[]){if(vistos.has(m.id))continue;vistos.add(m.id);mensagens.unshift(m);novos++}
      if(novos){mensagens=mensagens.slice(0,300);desenharChat()}
    }
  }catch(e){$('chatStatus').textContent='Sem resposta do leitor de comentários, tentando de novo…';espera=15000}
  chatT=setTimeout(()=>lerChat(v),espera);
}
function desenharChat(){
  const box=$('chat');
  if(!mensagens.length){box.innerHTML='<div class="vazio-txt">'+(chatLigado?'Nenhum comentário ainda.':'Cole o link da live e clique em Ligar. Clique num comentário para mostrar na tela.')+'</div>';return}
  box.innerHTML='';
  mensagens.forEach(m=>{
    const on=est.comentario.visivel&&est.comentario.texto===m.texto&&est.comentario.nome===m.nome;
    const d=document.createElement('div');d.className='item'+(on?' on':'');
    d.innerHTML=`<img alt="" src="${esc(m.foto||'assets/logo-4blue-branca.png')}"><div class="t"><small>${esc(m.nome)}${m.dono?' · canal':m.moderador?' · moderador':''}</small><p>${esc(m.texto)}</p></div>`;
    d.onclick=()=>destacar(m);box.appendChild(d);
  });
}
function destacar(m){
  const on=est.comentario.visivel&&est.comentario.texto===m.texto&&est.comentario.nome===m.nome;
  est.comentario=on?{...est.comentario,visivel:false}:{visivel:true,nome:m.nome,texto:m.texto,foto:m.foto||''};
  enviar();desenharChat();
}
$('bTirarComent').onclick=()=>{est.comentario.visivel=false;enviar();desenharChat()};
$('bManual').onclick=()=>{const t=$('mTexto').value.trim();if(!t)return;const m={id:'m'+Date.now(),nome:$('mNome').value.trim()||'Comentário',texto:t,foto:''};mensagens.unshift(m);destacar(m);$('mTexto').value=''};

/* ---------- ao vivo, gravação, números ---------- */
let aoVivo=false,gravando=false;
function marcarSaidas(){
  $('bVivo').classList.toggle('no-ar',aoVivo);$('bVivo').textContent=aoVivo?'Encerrar live':'Entrar ao vivo';
  $('bGravar').classList.toggle('on',gravando);$('bGravar').textContent=gravando?'■ Parar gravação':'● Gravar';
  const t=$('palco').querySelector('.tag');if(t){t.textContent=aoVivo?'AO VIVO':'PRÉVIA';t.classList.toggle('vivo',aoVivo)}
}
$('bVivo').onclick=async()=>{
  if(aoVivo){if(!confirm('Encerrar a live agora? Ela acaba para todo mundo.'))return;obs.pedir('StopStream').catch(e=>aviso(e.message))}
  else{if(!confirm('Entrar ao vivo agora? A transmissão começa no YouTube (destino configurado no OBS).'))return;obs.pedir('StartStream').catch(e=>aviso(e.message))}
};
$('bGravar').onclick=()=>obs.pedir(gravando?'StopRecord':'StartRecord').catch(e=>aviso(e.message));
obs.on('StreamStateChanged',d=>{aoVivo=!!d.outputActive;marcarSaidas()});
obs.on('RecordStateChanged',d=>{gravando=!!d.outputActive;marcarSaidas()});
setInterval(async()=>{
  if(!obs.conectado) return;
  try{
    const [s,g]=await Promise.all([obs.pedir('GetStreamStatus'),obs.pedir('GetStats')]);
    aoVivo=s.outputActive;marcarSaidas();
    const perda=s.outputTotalFrames?100*s.outputSkippedFrames/s.outputTotalFrames:0;
    const alerta=g.cpuUsage>80||perda>1;
    $('stats').innerHTML=(aoVivo?`<b style="color:#fca5a5">${s.outputTimecode.split('.')[0]}</b> · `:'')+
      `<span style="color:${alerta?'#fca5a5':'inherit'}">CPU ${g.cpuUsage.toFixed(0)}%${aoVivo?' · perda '+perda.toFixed(1)+'%':''}</span>`;
  }catch(e){}
},2000);
async function previa(){
  if(obs.conectado&&cfg.previa&&programa&&!document.hidden){
    try{
      const r=await obs.pedir('GetSourceScreenshot',{sourceName:programa,imageFormat:'jpg',imageWidth:960,imageCompressionQuality:60});
      let img=$('palco').querySelector('img');
      if(!img){$('palco').innerHTML='<img alt="O que está no ar"><span class="tag">PRÉVIA</span>';img=$('palco').querySelector('img');marcarSaidas()}
      img.src=r.imageData;
    }catch(e){}
  }
  setTimeout(previa,1000);
}

/* ---------- conexão e preparo automático ---------- */
let querConectado=false;
async function conectar(senha){
  pill('','Conectando…');
  try{
    await obs.conectar(`ws://${cfg.host||'127.0.0.1'}:${cfg.porta||4455}`,senha??cfg.senha);
    if(senha!=null){cfg.senha=senha;salvarCfg()}
    querConectado=true;fechar('mConectar');pill('ok','OBS conectado');
    ['bGravar','bVivo','bRefazer'].forEach(id=>$(id).disabled=false);
    programa=(await obs.pedir('GetCurrentProgramScene')).currentProgramSceneName||'';marcarPrograma();
    const [s,r]=await Promise.all([obs.pedir('GetStreamStatus'),obs.pedir('GetRecordStatus')]);aoVivo=s.outputActive;gravando=r.outputActive;marcarSaidas();
    for(const v of VAGAS){try{mudos[v.fonte]=(await obs.pedir('GetInputMute',{inputName:v.fonte})).inputMuted}catch(e){}}
    desenharCards();
    await conferirOBS();
    enviar();
  }catch(e){
    pill('erro','OBS desconectado');
    $('conectarErro').textContent=e.message;abrir('mConectar');
  }
}
// confere resolução e cenas; atualiza os endereços sozinho; só pergunta quando precisa mexer de verdade
async function conferirOBS(){
  const v=await obs.pedir('GetVideoSettings');
  const {scenes}=await obs.pedir('GetSceneList');
  const faltam=Object.values(CENAS).filter(c=>!scenes.some(s=>s.sceneName===c));
  const resolucao=v.baseWidth!==1920||v.baseHeight!==1080;
  if(!faltam.length&&!resolucao){
    try{await montarEstudio(obs,cfg,()=>{})}catch(e){console.warn(e)} // só atualiza endereços (sala, site)
    return;
  }
  $('prepTexto').textContent=(resolucao?`O OBS está em ${v.baseWidth}x${v.baseHeight}: vou passar para 1920x1080. `:'')+
    (faltam.length===Object.keys(CENAS).length?'Vou criar as cenas, as telas e os filtros de som. ':`Faltam ${faltam.length} cenas: vou criar. `)+'Leva uns segundos.';
  $('log').hidden=true;$('log').textContent='';abrir('mPreparar');
  $('bPreparar').onclick=()=>preparar(resolucao,faltam.length<Object.keys(CENAS).length&&resolucao);
}
async function preparar(resolucao,refazer){
  $('bPreparar').disabled=true;$('log').hidden=false;
  const log=t=>{$('log').textContent+=t+'\n';$('log').scrollTop=1e9};
  try{
    if(resolucao){
      if(aoVivo) throw new Error('Encerre a live antes: o OBS não muda a resolução ao vivo.');
      await obs.pedir('SetVideoSettings',{baseWidth:1920,baseHeight:1080,outputWidth:1920,outputHeight:1080,fpsNumerator:30,fpsDenominator:1});
      log('Vídeo em 1920x1080, 30 fps');
    }
    await montarEstudio(obs,cfg,log,refazer);
    enviar();aviso('OBS pronto');setTimeout(()=>fechar('mPreparar'),900);
    if(est.palco.length||est.tela) aplicarPalco();
  }catch(e){log('ERRO: '+e.message)}
  $('bPreparar').disabled=false;
}
$('bPrepDepois').onclick=()=>fechar('mPreparar');
obs.on('_fechou',()=>{
  pill('erro','OBS desconectado, tentando de novo…');
  ['bGravar','bVivo','bRefazer'].forEach(id=>$(id).disabled=true);
  if(querConectado) setTimeout(()=>!obs.conectado&&conectar(),3000);
});
obs.on('CurrentProgramSceneChanged',d=>{programa=d.sceneName;marcarPrograma()});
$('bConectar').onclick=()=>conectar($('cSenha').value);
$('cSenha').onkeydown=e=>{if(e.key==='Enter')$('bConectar').click()};

/* ---------- configurações ---------- */
$('bConfig').onclick=()=>{
  $('cSenha2').value=cfg.senha||'';$('cHost').value=cfg.host;$('cPorta').value=cfg.porta;
  $('cSala').value=cfg.sala;$('cSenhaSala').value=cfg.senhaSala;$('cPasta').value=cfg.pasta||'';
  $('cPasta').hidden=$('rotPasta').hidden=ONLINE;
  chave('kMinis',cfg.minis);chave('kPrevia',cfg.previa);abrir('mConfig');
};
$('bReconectar').onclick=()=>{cfg.host=$('cHost').value.trim()||'127.0.0.1';cfg.porta=$('cPorta').value.trim()||'4455';salvarCfg();conectar($('cSenha2').value)};
$('cSala').oninput=()=>{cfg.sala=$('cSala').value.replace(/[^\w]/g,'');salvarCfg()};
$('cSenhaSala').oninput=()=>{cfg.senhaSala=$('cSenhaSala').value.trim();salvarCfg()};
$('cSala').onchange=$('cSenhaSala').onchange=()=>{desenharCards();obs.conectado&&montarEstudio(obs,cfg,()=>{}).catch(()=>{})};
$('bSorteio').onclick=async()=>{
  if(!confirm('Gerar sala nova? Os convites já enviados param de funcionar.'))return;
  sortearSala();salvarCfg();$('cSala').value=cfg.sala;$('cSenhaSala').value=cfg.senhaSala;desenharCards();
  if(obs.conectado){try{await montarEstudio(obs,cfg,()=>{});aviso('Sala nova pronta. Mande os convites de novo.')}catch(e){aviso(e.message)}}
};
$('cPasta').oninput=()=>{cfg.pasta=$('cPasta').value.trim();salvarCfg()};
$('bRefazer').onclick=async()=>{
  if(!confirm('Apagar as cenas do Estúdio no OBS e criar de novo?'))return;
  fechar('mConfig');$('prepTexto').textContent='Refazendo as cenas…';abrir('mPreparar');
  const v=await obs.pedir('GetVideoSettings');preparar(v.baseWidth!==1920||v.baseHeight!==1080,true);
};
$('bLinks').onclick=()=>copiar(linkDiretor(cfg),'Link da sala dos bastidores copiado');
$('kMinis').onclick=()=>{cfg.minis=!cfg.minis;salvarCfg();chave('kMinis',cfg.minis);desenharCards()};
$('kPrevia').onclick=()=>{cfg.previa=!cfg.previa;salvarCfg();chave('kPrevia',cfg.previa)};

/* ---------- abas ---------- */
document.querySelectorAll('#abas button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('#abas button').forEach(x=>x.classList.toggle('sel',x===b));
  document.querySelectorAll('.aba').forEach(a=>a.classList.toggle('sel',a.id===b.dataset.aba));
});

/* ---------- início ---------- */
function iniciarApp(){
  $('usuario').textContent=Api.sessao.email||'';
  chave('kLetreiro',est.letreiro.visivel);chave('kCta',est.cta.visivel);
  desenharLayouts();desenharCards();desenharBanners();desenharMarca();desenharVideos();desenharChat();marcarSaidas();previa();
  if(cfg.senha) conectar(); else abrir('mConectar');
}
/* ---------- a live deste estúdio (vem do card) ---------- */
let salvarLiveT=null;
function salvarLiveDepois(){
  clearTimeout(salvarLiveT);
  salvarLiveT=setTimeout(async()=>{
    try{const r=await Api.post('live.save',{live:{id:live.id,titulo:live.titulo,subtitulo:live.subtitulo,convidados:live.convidados,video:live.video,autoInicio:live.autoInicio,encerrarSozinho:live.encerrarSozinho}});live=Object.assign(live,r.live)}
    catch(e){aviso('Não salvou: '+e.message)}
  },1200);
}
function aplicarLive(){
  cfg.sala=live.sala;cfg.senhaSala=live.senhaSala;
  est.titulo=live.titulo||'';if(live.subtitulo) est.subtitulo=live.subtitulo;
  if(live.inicio) est.inicio=live.inicio;
  if(live.tema&&!localStorage.getItem(K_EST)) est.tema=live.tema;
  $('titulo').value=est.titulo;$('tSub').value=est.subtitulo||'';
  if(est.inicio){const d=new Date(est.inicio);$('tInicio').value=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')}
  if(live.youtube&&live.youtube.url&&!$('chatLink').value) $('chatLink').value=live.youtube.url;
  document.title=live.titulo+' — Estúdio 4blue';
  document.body.classList.toggle('gravada',live.tipo==='gravada');
  $('gravada').hidden=live.tipo!=='gravada';
  if(live.tipo==='gravada') prepararGravada();
}
$('titulo').addEventListener('input',()=>{live.titulo=$('titulo').value;salvarLiveDepois()});
$('tSub').addEventListener('input',()=>{live.subtitulo=$('tSub').value;salvarLiveDepois()});

/* ---------- chat com convidados e equipe ---------- */
let eqDesde=0,eqNaoLidas=0,presenca={};
async function lerEquipe(){
  try{
    const r=await Api.post('chat.list',{id:LIVE_ID,desde:eqDesde});
    presenca=r.presenca||{};desenharPresenca();
    if(r.msgs&&r.msgs.length){
      const box=$('eqMsgs');if(!eqDesde) box.innerHTML='';
      const aberta=$('aEquipe').classList.contains('sel');
      r.msgs.forEach(m=>{
        const d=document.createElement('div');const eu=m.papel==='producao'&&m.de===Api.sessao.email;
        d.className='eq-m'+(eu?' eu':'');
        const quem=m.papel==='producao'?(eu?'Você':m.nome+' · produção'):`${m.nome} · ${m.vaga==='tela'?'tela':'convidado'}`;
        d.innerHTML=`<small>${esc(quem)} · ${new Date(m.t).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</small>${esc(m.texto)}`;
        box.appendChild(d);
        if(!aberta&&!eu&&eqDesde) eqNaoLidas++;
      });
      box.scrollTop=box.scrollHeight;
      eqDesde=r.msgs[r.msgs.length-1].t;
      marcarNaoLidas();
    }
  }catch(e){}
  setTimeout(lerEquipe,3000);
}
function marcarNaoLidas(){$('naoLidas').hidden=!eqNaoLidas;$('naoLidas').textContent=eqNaoLidas}
document.querySelector('[data-aba=aEquipe]').addEventListener('click',()=>{eqNaoLidas=0;marcarNaoLidas()});
$('eqForm').onsubmit=async e=>{
  e.preventDefault();const t=$('eqTexto').value.trim();if(!t)return;$('eqTexto').value='';
  try{await Api.post('chat.send',{id:LIVE_ID,texto:t})}catch(err){aviso(err.message)}
};
const naSala=vaga=>presenca[vaga]&&Date.now()-presenca[vaga].t<25000;
function desenharPresenca(){
  $('presencas').innerHTML=VAGAS.map(v=>{
    const p=presenca[v.id],on=naSala(v.id);
    return `<span class="pres${on?' on':''}">${on?'●':'○'} ${esc((p&&p.nome)||nomeVaga(v)||v.rotulo)}</span>`;
  }).join('');
  VAGAS.forEach(v=>{
    const c=document.querySelector(`[data-v="${v.id}"] .nome`);if(!c)return;
    let s=c.querySelector('.na-sala');if(!s){s=document.createElement('span');s.className='na-sala';c.insertBefore(s,c.querySelector('button'))}
    s.textContent=naSala(v.id)?'● na sala':'';
  });
}

/* ---------- live com vídeo gravado ---------- */
let gv={fase:'espera'};
function prepararGravada(){
  $('gvVideo').value=live.video||'';
  chave('gvAuto',live.autoInicio!==false);chave('gvEncerrar',live.encerrarSozinho!==false);
  setInterval(tickGravada,1000);
}
$('gvSalvar').onclick=()=>{live.video=$('gvVideo').value.trim().replace(/^"|"$/g,'');$('gvVideo').value=live.video;salvarLiveDepois();aviso('Vídeo salvo')};
$('gvAuto').onclick=()=>{live.autoInicio=live.autoInicio===false;chave('gvAuto',live.autoInicio!==false);salvarLiveDepois()};
$('gvEncerrar').onclick=()=>{live.encerrarSozinho=live.encerrarSozinho===false;chave('gvEncerrar',live.encerrarSozinho!==false);salvarLiveDepois()};
$('gvAgora').onclick=()=>{if(confirm('Rodar o vídeo agora? Se a live ainda não estiver no ar, ela começa.'))rodarGravada()};
$('gvContagem').onclick=()=>contagemGravada();
function fmt(s){s=Math.max(0,Math.round(s));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return (h?h+':':'')+String(m).padStart(h?2:1,'0')+':'+String(x).padStart(2,'0')}
function statusGv(t){$('gvStatus').textContent=t}
async function contagemGravada(){
  if(!obs.conectado) return aviso('Conecte o OBS primeiro');
  est.inicio=live.inicio;enviar();
  await irPara(CENAS.ABERTURA);
  if(!aoVivo) await obs.pedir('StartStream').catch(e=>aviso(e.message));
  gv.fase='contagem';statusGv('No ar com a contagem');
}
async function rodarGravada(){
  if(!obs.conectado) return aviso('Conecte o OBS primeiro');
  const v=(live.video||'').trim();if(!v) return aviso('Coloque o caminho do vídeo');
  try{
    await obs.pedir('SetInputSettings',{inputName:FONTES.VIDEO,inputSettings:{local_file:v.replace(/\\/g,'/')}});
    if(!aoVivo) await obs.pedir('StartStream');
    await irPara(CENAS.GRAVADA);
    await obs.pedir('TriggerMediaInputAction',{inputName:FONTES.VIDEO,mediaAction:'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART'});
    gv.fase='video';statusGv('▶ Vídeo no ar');
  }catch(e){aviso(e.code===600?'Falta a cena do vídeo gravado no OBS: abra Configurações → Refazer cenas.':e.message,6000)}
}
async function fimGravada(){
  gv.fase='fim';statusGv('Vídeo terminou');
  await irPara(CENAS.ENCERRAMENTO);
  if(live.encerrarSozinho!==false){
    statusGv('Encerrando em 20 s…');
    setTimeout(async()=>{if(gv.fase==='fim'&&aoVivo){await obs.pedir('StopStream').catch(()=>{});statusGv('Live encerrada')}},20000);
  }
}
async function tickGravada(){
  const ini=live.inicio;
  if(!ini){$('gvRelogio').textContent='Defina data e hora da live no card';return}
  const falta=(ini-Date.now())/1000;
  if(gv.fase==='video'){
    try{const s=await obs.pedir('GetMediaInputStatus',{inputName:FONTES.VIDEO});$('gvRelogio').textContent=`${fmt((s.mediaCursor||0)/1000)} de ${fmt((s.mediaDuration||0)/1000)}`}catch(e){}
    return;
  }
  $('gvRelogio').textContent=gv.fase==='fim'?'Terminou':gv.fase==='contagem'?`No ar com a contagem · vídeo em ${fmt(falta)}`:falta>0?`Começa em ${fmt(falta)}`:'Horário de início já passou';
  if(live.autoInicio===false||!obs.conectado) return;
  if(gv.fase==='espera'&&falta<=300&&falta>-60) contagemGravada();
  else if(gv.fase==='contagem'&&falta<=0) rodarGravada();
}

/* ---------- transmissão do YouTube no OBS ---------- */
$('bTransmissao').onclick=async()=>{
  if(!obs.conectado) return aviso('Conecte o OBS primeiro');
  if(!confirm('Configurar o OBS para transmitir no canal conectado ao Estúdio? A configuração de transmissão atual do OBS é trocada.'))return;
  try{
    const k=await Api.post('youtube.chave');
    await obs.pedir('SetStreamServiceSettings',{streamServiceType:'rtmp_custom',streamServiceSettings:{server:k.servidor,key:k.chave,use_auth:false}});
    aviso('Pronto: o OBS transmite para o YouTube do Estúdio. As lives criadas pelo sistema já ficam ligadas a ele.',6000);
  }catch(e){aviso(e.message,6000)}
};

/* ---------- início ---------- */
(async()=>{
  if(!LIVE_ID){location.replace('index.html');return}
  await Api.garantir();
  try{live=(await Api.post('live.get',{id:LIVE_ID})).live}
  catch(e){document.body.innerHTML='<p style="padding:40px">'+esc(e.message)+' <a href="index.html">Voltar para as lives</a></p>';return}
  aplicarLive();
  iniciarApp();
  lerEquipe();
})();
