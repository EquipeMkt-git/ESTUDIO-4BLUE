/* Estúdio 4blue — login Google e chamadas ao Apps Script, usado pelo início e pelo estúdio. */
const CFG=window.ESTUDIO_CONFIG||{};
const K_SES='estudio4blue:sessao';
const Api={
  sessao:(()=>{try{return JSON.parse(localStorage.getItem(K_SES)||'{}')}catch(e){return {}}})(),
  valida(){return !!(this.sessao&&this.sessao.token&&this.sessao.exp>Date.now())},
  sair(){localStorage.removeItem(K_SES);location.reload()},
  async post(action,dados){
    const r=await fetch(CFG.API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify(Object.assign({action,token:this.sessao.token},dados||{}))}).then(x=>x.json());
    if(r.relogar){localStorage.removeItem(K_SES);this.sessao={};if(this.aoExpirar)this.aoExpirar();throw new Error(r.erro)}
    if(!r.ok) throw new Error(r.erro||'Erro no servidor');
    return r;
  },
  // mostra a tela de login (elemento #mLogin com #gBotao e #loginErro) e resolve quando entrar
  entrar(){
    return new Promise(res=>{
      const m=document.getElementById('mLogin');m.hidden=false;
      const erro=t=>document.getElementById('loginErro').textContent=t||'';
      const iniciar=()=>{
        google.accounts.id.initialize({client_id:CFG.GOOGLE_CLIENT_ID,ux_mode:'popup',auto_select:true,hd:CFG.DOMINIO,callback:async resp=>{
          erro('Conferindo o acesso…');
          try{
            const r=await fetch(CFG.API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'login',credential:resp.credential})}).then(x=>x.json());
            if(!r.ok) throw new Error(r.erro||'Login recusado');
            this.sessao={email:r.email,nome:r.nome,papel:r.papel,token:r.token,exp:r.exp};
            localStorage.setItem(K_SES,JSON.stringify(this.sessao));
            m.hidden=true;erro('');res(this.sessao);
          }catch(e){erro(e.message)}
        }});
        google.accounts.id.renderButton(document.getElementById('gBotao'),{theme:'filled_black',size:'large',text:'signin_with',shape:'pill',locale:'pt-BR'});
      };
      if(window.google&&google.accounts) iniciar();
      else{const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;s.onload=iniciar;
        s.onerror=()=>erro('Não consegui carregar o login do Google. Confira a internet.');document.head.appendChild(s)}
    });
  },
  async garantir(){if(!this.valida()) await this.entrar();return this.sessao}
};
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function aviso(t,ms){const e=document.getElementById('toast');if(!e)return alert(t);e.textContent=t;e.classList.add('on');clearTimeout(aviso.t);aviso.t=setTimeout(()=>e.classList.remove('on'),ms||3000)}
async function copiar(t,msg){try{await navigator.clipboard.writeText(t);aviso(msg||'Copiado')}catch(e){prompt('Copie:',t)}}
function linkConvite(live,vaga){
  const aqui=location.href.replace(/[^/]*([?#].*)?$/,'');
  const local=/^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const base=(local?aqui:(CFG.SITE||aqui)).replace(/\/?$/,'/');
  return base+'convidado.html?l='+encodeURIComponent(live.id)+'&v='+vaga+'&k='+encodeURIComponent(live.chave)+(local&&/demo/.test(location.search)?'&demo':'');
}
function textoConvite(live,vaga){
  const c=(live.convidados||{})[vaga]||{},nome=c.nome||'',link=linkConvite(live,vaga);
  const quando=live.inicio?new Date(live.inicio).toLocaleString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'';
  if(vaga==='tela') return `Link para compartilhar a tela na live "${live.titulo}" (abra numa aba separada e escolha a tela ou a janela dos slides):\n${link}`;
  return `Olá${nome?' '+nome.split(' ')[0]:''}! Você está convidado para a live "${live.titulo}"${quando?' ('+quando+')':''}.\n\n`+
    `Seu link para entrar:\n${link}\n\nAntes, faça o teste de câmera e som (3 minutos):\n${CFG.TESTE_MENTOR}\n\n`+
    `Use fone de ouvido e entre uns 15 minutos antes. Você vai cair nos bastidores, com um chat para falar com a produção.`;
}

/* ---------- modo de teste (só em localhost com ?demo): servidor falso no próprio navegador ---------- */
if(/^(localhost|127\.0\.0\.1)$/.test(location.hostname)&&/[?&]demo/.test(location.search+document.referrer)){
  const db=JSON.parse(localStorage.getItem('demo:db')||'null')||{lives:[],admins:[{email:'operador@4blue.com.br',nome:'Operador Teste',papel:'operador'}],chat:{},pres:{}};
  const gravar=()=>localStorage.setItem('demo:db',JSON.stringify(db));
  const r6=n=>Math.random().toString(36).slice(2,2+n);
  Api.sessao={email:'dhione@4blue.com.br',nome:'Teste',papel:'admin',token:'demo',exp:Date.now()+864e5};
  Api.entrar=async()=>Api.sessao;
  Api.post=async(a,d)=>{d=d||{};await new Promise(r=>setTimeout(r,120));Object.assign(db,JSON.parse(localStorage.getItem('demo:db')||'{}'));
    const L=id=>db.lives.find(l=>l.id===id);
    switch(a){
      case 'lives.list':return{ok:true,lives:db.lives};
      case 'live.get':return{ok:true,live:L(d.id)};
      case 'live.save':{let l=d.live.id&&L(d.live.id);if(!l){l={id:'demo'+r6(4),sala:'aula4blue'+r6(6),senhaSala:r6(10),chave:r6(12),status:'agendada'};db.lives.push(l)}
        Object.keys(d.live).forEach(k=>{if(d.live[k]!==undefined&&k!=='id')l[k]=d.live[k]});gravar();return{ok:true,live:l}}
      case 'live.delete':db.lives=db.lives.filter(l=>l.id!==d.id);gravar();return{ok:true};
      case 'live.youtubeLink':{const l=L(d.id),m=String(d.link).match(/([\w-]{11})$/);l.youtube=m?{id:m[1],url:'https://youtube.com/live/'+m[1],studio:'https://studio.youtube.com/video/'+m[1]+'/livestreaming',manual:true}:null;gravar();return{ok:true,live:l}}
      case 'youtube.status':return{ok:true,configurado:false,conectado:false,redirect:'https://script.google.com/macros/s/DEMO/exec'};
      case 'admins.list':return{ok:true,admins:db.admins,dono:'dhione@4blue.com.br'};
      case 'admins.save':db.admins=db.admins.filter(x=>x.email!==d.email);db.admins.push({email:d.email,papel:d.papel});gravar();return{ok:true};
      case 'admins.remove':db.admins=db.admins.filter(x=>x.email!==d.email);gravar();return{ok:true};
      case 'chat.list':case 'convidado.chat':{if(a==='convidado.chat'){db.pres[d.id]=db.pres[d.id]||{};db.pres[d.id][d.vaga]={nome:d.nome,t:Date.now()}}
        const m=(db.chat[d.id]||[]).filter(x=>x.t>(d.desde||0));gravar();return{ok:true,msgs:m,agora:Date.now(),presenca:db.pres[d.id]||{}}}
      case 'chat.send':case 'convidado.enviar':(db.chat[d.id]=db.chat[d.id]||[]).push({t:Date.now(),nome:a==='chat.send'?'Produção':d.nome,papel:a==='chat.send'?'producao':'convidado',vaga:d.vaga||'',texto:d.texto});gravar();return{ok:true};
      case 'convidado.entrar':{const l=L(d.id);if(!l||l.chave!==d.k)throw new Error('Link inválido');return{ok:true,live:l,vaga:d.vaga,nome:d.nome||((l.convidados||{})[d.vaga]||{}).nome||''}}
    }
    throw new Error('demo: ação '+a);
  };
}
