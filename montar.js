/* Monta (ou atualiza) as cenas do Estúdio 4blue dentro do OBS pelo WebSocket.
   - Cria só o que falta: cenas que já existem não são mexidas (para refazer uma cena, apague no OBS e monte de novo).
   - Fontes existentes têm só o endereço atualizado (útil quando muda o nome ou a senha da sala).
   Tela de 1920x1080. Faixa de cima (0–80) fica para o logo e a de baixo (1024–1080) para o letreiro. */

const FONTES={
  FUNDO:'[E] FUNDO', OVERLAY:'[E] OVERLAY',
  ABERTURA:'[E] TELA ABERTURA', INTERVALO:'[E] TELA INTERVALO', VOLTAMOS:'[E] TELA VOLTAMOS', ENCERRAMENTO:'[E] TELA ENCERRAMENTO',
  C1:'CONVIDADO 1', C2:'CONVIDADO 2', C3:'CONVIDADO 3', TELA:'TELA COMPARTILHADA', VIDEO:'VIDEO'
};
const CENAS={
  ABERTURA:'01 ABERTURA', SOLO:'02 SOLO', DUPLA:'03 DUPLA', TRIO:'04 TRIO', TELA_MENTOR:'05 TELA + MENTOR',
  TELA_CHEIA:'06 TELA CHEIA', VIDEO:'07 VIDEO', INTERVALO:'08 INTERVALO', VOLTAMOS:'09 VOLTAMOS JA', ENCERRAMENTO:'10 ENCERRAMENTO', GRAVADA:'11 VIDEO GRAVADO'
};
const CHEIA={x:0,y:0,w:1920,h:1080};
// itens de baixo para cima; "so" = começa visível só esse (para escolher quem aparece)
const LAYOUT={
  [CENAS.ABERTURA]:[[FONTES.ABERTURA,CHEIA]],
  [CENAS.SOLO]:[[FONTES.FUNDO,CHEIA],[FONTES.C1,{x:160,y:90,w:1600,h:900}],[FONTES.C2,{x:160,y:90,w:1600,h:900},false],[FONTES.C3,{x:160,y:90,w:1600,h:900},false],[FONTES.OVERLAY,CHEIA]],
  [CENAS.DUPLA]:[[FONTES.FUNDO,CHEIA],[FONTES.C1,{x:27,y:250,w:920,h:518}],[FONTES.C2,{x:973,y:250,w:920,h:518}],[FONTES.OVERLAY,CHEIA]],
  [CENAS.TRIO]:[[FONTES.FUNDO,CHEIA],[FONTES.C1,{x:25,y:330,w:610,h:343}],[FONTES.C2,{x:655,y:330,w:610,h:343}],[FONTES.C3,{x:1285,y:330,w:610,h:343}],[FONTES.OVERLAY,CHEIA]],
  [CENAS.TELA_MENTOR]:[[FONTES.FUNDO,CHEIA],[FONTES.TELA,{x:30,y:100,w:1420,h:799}],[FONTES.C1,{x:1470,y:100,w:420,h:236}],[FONTES.C2,{x:1470,y:100,w:420,h:236},false],[FONTES.C3,{x:1470,y:100,w:420,h:236},false],[FONTES.OVERLAY,CHEIA]],
  [CENAS.TELA_CHEIA]:[[FONTES.FUNDO,CHEIA],[FONTES.TELA,{x:140,y:88,w:1640,h:922}],[FONTES.OVERLAY,CHEIA]],
  [CENAS.VIDEO]:[[FONTES.VIDEO,CHEIA]],
  [CENAS.INTERVALO]:[[FONTES.INTERVALO,CHEIA]],
  [CENAS.VOLTAMOS]:[[FONTES.VOLTAMOS,CHEIA]],
  [CENAS.ENCERRAMENTO]:[[FONTES.ENCERRAMENTO,CHEIA]],
  [CENAS.GRAVADA]:[[FONTES.VIDEO,CHEIA],[FONTES.OVERLAY,CHEIA]]
};

// Endereços do VDO.Ninja. O id de cada vaga é fixo por sala: sala_c1, sala_c2, sala_c3, sala_tela.
function idVaga(cfg,vaga){return (cfg.sala||'estudio4blue')+'_'+vaga}
function linkVisao(cfg,vaga){
  // o que o OBS puxa: só o vídeo da vaga, preenchendo o quadro, sem botões
  const p=new URLSearchParams({view:idVaga(cfg,vaga)});
  if(cfg.senhaSala) p.set('password',cfg.senhaSala);
  return 'https://vdo.ninja/?'+p.toString()+'&cover&cleanoutput&transparent';
}
function linkConvidado(cfg,vaga,nome){
  const p=new URLSearchParams({room:cfg.sala,push:idVaga(cfg,vaga)});
  if(cfg.senhaSala) p.set('password',cfg.senhaSala);
  if(nome) p.set('label',nome);
  if(vaga==='tela') return 'https://vdo.ninja/?'+p.toString()+'&screenshare&quality=0';
  return 'https://vdo.ninja/?'+p.toString()+'&webcam&quality=1&echocancellation=1&noisesuppression=1&autogain=1';
}
function linkDiretor(cfg){
  const p=new URLSearchParams({director:cfg.sala});
  if(cfg.senhaSala) p.set('password',cfg.senhaSala);
  return 'https://vdo.ninja/?'+p.toString();
}
function arquivoLocal(cfg,nome){return (cfg.pasta||'').replace(/\\/g,'/').replace(/\/$/,'')+'/'+nome}

// cantos arredondados no vídeo dos convidados (CSS injetado na página do VDO.Ninja pelo OBS)
const CSS_CONVIDADO='body{background:rgba(0,0,0,0)!important;margin:0;overflow:hidden}video{border-radius:28px!important;object-fit:cover!important}';

function definicaoFontes(cfg){
  // painel online: o OBS puxa as telas do site; painel aberto do arquivo: puxa da pasta local
  const origem=arq=>cfg.site?{is_local_file:false,url:cfg.site.replace(/\/?$/,'/')+arq}:{is_local_file:true,local_file:arquivoLocal(cfg,arq)};
  const nav=(arq,extra)=>({kind:'browser_source',settings:Object.assign(origem(arq),{width:1920,height:1080,fps:30,fps_custom:false,reroute_audio:false,restart_when_active:false,shutdown:false,css:''},extra||{})});
  const vaga=v=>({kind:'browser_source',audio:true,settings:{is_local_file:false,url:linkVisao(cfg,v),width:1280,height:720,fps:30,reroute_audio:true,restart_when_active:false,shutdown:false,css:CSS_CONVIDADO}});
  return {
    [FONTES.FUNDO]:nav('fundo.html'),
    [FONTES.OVERLAY]:nav('overlay.html'),
    [FONTES.ABERTURA]:nav('abertura.html',{shutdown:true,restart_when_active:true}),
    [FONTES.INTERVALO]:nav('intervalo.html',{shutdown:true,restart_when_active:true}),
    [FONTES.VOLTAMOS]:nav('voltamos.html',{shutdown:true,restart_when_active:true}),
    [FONTES.ENCERRAMENTO]:nav('encerramento.html',{shutdown:true,restart_when_active:true}),
    [FONTES.C1]:vaga('c1'),[FONTES.C2]:vaga('c2'),[FONTES.C3]:vaga('c3'),[FONTES.TELA]:vaga('tela'),
    [FONTES.VIDEO]:{kind:'ffmpeg_source',audio:true,settings:{is_local_file:true,local_file:'',restart_on_activate:true,close_when_inactive:true,hw_decode:true}}
  };
}

// filtros de áudio: limpa ruído, nivela a voz e impede estouro
const FILTROS_VOZ=[
  ['Ruído','noise_suppress_filter_v2',{method:'rnnoise'}],
  ['Compressor','compressor_filter',{ratio:4,threshold:-20,attack_time:6,release_time:60,output_gain:3}],
  ['Limitador','limiter_filter',{threshold:-3,release_time:60}]
];
const FILTROS_MIDIA=[['Limitador','limiter_filter',{threshold:-3,release_time:60}]];

async function montarEstudio(obs,cfg,log,refazer){
  log=log||console.log;
  const v=await obs.pedir('GetVideoSettings');
  if(v.baseWidth!==1920||v.baseHeight!==1080){
    throw new Error(`A tela do OBS está em ${v.baseWidth}x${v.baseHeight}. Clique antes em "Ajustar vídeo 1080p30" (as posições das cenas dependem disso).`);
  }
  const espera=ms=>new Promise(r=>setTimeout(r,ms));
  const TEMP='[E] AGUARDE';
  if(refazer){
    // o OBS não apaga a cena que está no ar nem fica sem nenhuma cena: usa uma cena provisória
    await obs.pedir('CreateScene',{sceneName:TEMP}).catch(()=>{});
    await obs.pedir('SetCurrentProgramScene',{sceneName:TEMP});
    for(const cena of Object.values(CENAS)){
      try{await obs.pedir('RemoveScene',{sceneName:cena});log('Apaguei a cena '+cena)}catch(e){}
    }
    // espera o OBS terminar de apagar
    for(let i=0;i<30;i++){
      const {scenes}=await obs.pedir('GetSceneList');
      if(!scenes.some(s=>Object.values(CENAS).includes(s.sceneName))) break;
      await espera(200);
    }
    await espera(500);
  }
  const defs=definicaoFontes(cfg);
  const {inputs}=await obs.pedir('GetInputList');
  const existentes=new Set(inputs.map(i=>i.inputName));
  const {scenes}=await obs.pedir('GetSceneList');
  const cenasExist=new Set(scenes.map(s=>s.sceneName));

  // 1) atualiza endereço das fontes que já existem
  for(const [nome,d] of Object.entries(defs)){
    if(existentes.has(nome) && nome!==FONTES.VIDEO){
      await obs.pedir('SetInputSettings',{inputName:nome,inputSettings:d.settings,overlay:true});
      log('Atualizei '+nome);
    }
  }
  // 2) cria as cenas que faltam, na ordem
  for(const cena of Object.values(CENAS)){
    if(cenasExist.has(cena)){log('Cena '+cena+' já existe, deixei como está');continue}
    await obs.pedir('CreateScene',{sceneName:cena});
    for(const [fonte,caixa,visivel] of LAYOUT[cena]){
      let itemId;
      const criar=async()=>{
        const d=defs[fonte];
        const r=await obs.pedir('CreateInput',{sceneName:cena,inputName:fonte,inputKind:d.kind,inputSettings:d.settings,sceneItemEnabled:visivel!==false});
        existentes.add(fonte); return r.sceneItemId;
      };
      if(!existentes.has(fonte)) itemId=await criar();
      else{
        try{itemId=(await obs.pedir('CreateSceneItem',{sceneName:cena,sourceName:fonte,sceneItemEnabled:visivel!==false})).sceneItemId}
        catch(e){if(e.code===600){existentes.delete(fonte);itemId=await criar()}else throw e} // fonte sumiu: cria de novo
      }
      await obs.pedir('SetSceneItemTransform',{sceneName:cena,sceneItemId:itemId,sceneItemTransform:{
        positionX:caixa.x,positionY:caixa.y,alignment:5,
        boundsType:'OBS_BOUNDS_SCALE_INNER',boundsWidth:caixa.w,boundsHeight:caixa.h,boundsAlignment:0}});
    }
    log('Criei a cena '+cena);
  }
  // 3) filtros de áudio
  const comFiltro=[[FONTES.C1,FILTROS_VOZ],[FONTES.C2,FILTROS_VOZ],[FONTES.C3,FILTROS_VOZ],[FONTES.TELA,FILTROS_MIDIA],[FONTES.VIDEO,FILTROS_MIDIA]];
  for(const [fonte,filtros] of comFiltro){
    if(!existentes.has(fonte)) continue;
    const {filters}=await obs.pedir('GetSourceFilterList',{sourceName:fonte});
    const tem=new Set(filters.map(f=>f.filterName));
    for(const [nome,tipo,cfgF] of filtros){
      if(tem.has(nome)) continue;
      try{await obs.pedir('CreateSourceFilter',{sourceName:fonte,filterName:nome,filterKind:tipo,filterSettings:cfgF});log('Filtro '+nome+' em '+fonte)}
      catch(e){log('Não consegui pôr o filtro '+nome+' em '+fonte+': '+e.message)}
    }
  }
  if(refazer){
    await obs.pedir('SetCurrentProgramScene',{sceneName:CENAS.ABERTURA}).catch(()=>{});
    await espera(300);
    await obs.pedir('RemoveScene',{sceneName:TEMP}).catch(()=>{});
  }
  log('Pronto. '+Object.keys(CENAS).length+' cenas conferidas.');
}

/* ---------- Palco (estilo StreamYard) ----------
   Em vez de escolher cena, o operador põe e tira pessoas do palco. O layout sai do número de pessoas
   (1 = solo, 2 = lado a lado, 3 = grade) e da tela compartilhada (tela + pessoas na lateral, ou só a tela).
   A cena certa é preparada (quem aparece e onde) e só depois vai ao ar. */
const POSICOES={
  solo:{cena:CENAS.SOLO,pessoas:[{x:160,y:90,w:1600,h:900}]},
  dupla:{cena:CENAS.DUPLA,pessoas:[{x:27,y:250,w:920,h:518},{x:973,y:250,w:920,h:518}]},
  trio:{cena:CENAS.TRIO,pessoas:[{x:25,y:330,w:610,h:343},{x:655,y:330,w:610,h:343},{x:1285,y:330,w:610,h:343}]},
  telaPessoas:{cena:CENAS.TELA_MENTOR,tela:{x:30,y:100,w:1420,h:799},pessoas:[{x:1470,y:100,w:420,h:236},{x:1470,y:356,w:420,h:236},{x:1470,y:612,w:420,h:236}]},
  soTela:{cena:CENAS.TELA_CHEIA,tela:{x:140,y:88,w:1640,h:922},pessoas:[]}
};
const FONTE_VAGA={c1:FONTES.C1,c2:FONTES.C2,c3:FONTES.C3};

// layout: 'auto' | 'solo' | 'dupla' | 'trio' | 'telaPessoas' | 'soTela'
function escolherLayout(palco,tela,layout){
  const n=palco.length;
  if(layout&&layout!=='auto'){
    if((layout==='telaPessoas'||layout==='soTela')&&!tela) layout='auto';
    else return layout;
  }
  if(tela) return n?'telaPessoas':'soTela';
  return n>=3?'trio':n===2?'dupla':n===1?'solo':null;
}

async function arrumarPalco(obs,palco,tela,layout){
  const nome=escolherLayout(palco,tela,layout);
  if(!nome) return null;
  const P=POSICOES[nome],cena=P.cena;
  const {sceneItems}=await obs.pedir('GetSceneItemList',{sceneName:cena});
  const ids={};sceneItems.forEach(i=>ids[i.sourceName]=i.sceneItemId);
  const garantir=async fonte=>{
    if(ids[fonte]==null) ids[fonte]=(await obs.pedir('CreateSceneItem',{sceneName:cena,sourceName:fonte,sceneItemEnabled:false})).sceneItemId;
    return ids[fonte];
  };
  const caixa=(id,c)=>obs.pedir('SetSceneItemTransform',{sceneName:cena,sceneItemId:id,sceneItemTransform:{
    positionX:c.x,positionY:c.y,alignment:5,boundsType:'OBS_BOUNDS_SCALE_INNER',boundsWidth:c.w,boundsHeight:c.h,boundsAlignment:0}});
  const visiveis=palco.slice(0,P.pessoas.length);
  for(const vaga of ['c1','c2','c3']){
    const id=await garantir(FONTE_VAGA[vaga]);const pos=visiveis.indexOf(vaga);
    if(pos>=0) await caixa(id,P.pessoas[pos]);
    await obs.pedir('SetSceneItemEnabled',{sceneName:cena,sceneItemId:id,sceneItemEnabled:pos>=0});
  }
  if(P.tela){const id=await garantir(FONTES.TELA);await caixa(id,P.tela);await obs.pedir('SetSceneItemEnabled',{sceneName:cena,sceneItemId:id,sceneItemEnabled:true})}
  // overlay sempre por cima de todos
  if(ids[FONTES.OVERLAY]!=null){
    const {sceneItems:agora}=await obs.pedir('GetSceneItemList',{sceneName:cena});
    await obs.pedir('SetSceneItemIndex',{sceneName:cena,sceneItemId:ids[FONTES.OVERLAY],sceneItemIndex:agora.length-1});
  }
  await obs.pedir('SetCurrentProgramScene',{sceneName:cena});
  return nome;
}

// Miniatura do convidado no painel (vídeo pequeno, sem som), direto do VDO.Ninja
function linkMiniatura(cfg,vaga){
  const p=new URLSearchParams({view:idVaga(cfg,vaga)});
  if(cfg.senhaSala) p.set('password',cfg.senhaSala);
  return 'https://vdo.ninja/?'+p.toString()+'&cover&cleanoutput&noaudio&scale=25&bitrate=300';
}
