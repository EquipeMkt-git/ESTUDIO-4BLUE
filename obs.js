/* Cliente mínimo do obs-websocket 5 (o que já vem dentro do OBS 28+). Sem dependências.
   Uso: const obs=new OBS(); await obs.conectar('ws://127.0.0.1:4455','senha'); await obs.pedir('GetVersion'); obs.on('CurrentProgramSceneChanged',d=>...) */
class OBS{
  constructor(){this.ws=null;this.id=0;this.pendentes=new Map();this.ouvintes={};this.conectado=false}
  on(evento,f){(this.ouvintes[evento]=this.ouvintes[evento]||[]).push(f)}
  emitir(evento,d){(this.ouvintes[evento]||[]).forEach(f=>{try{f(d)}catch(e){console.error(e)}})}
  static async sha256b64(txt){
    const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(txt));
    return btoa(String.fromCharCode(...new Uint8Array(h)));
  }
  conectar(url,senha,inscricoes){
    // inscricoes: todos os eventos comuns (2047) + medidores de volume (65536)
    inscricoes=inscricoes??(2047|65536);
    return new Promise((ok,falha)=>{
      try{this.ws&&this.ws.close()}catch(e){}
      const ws=new WebSocket(url); this.ws=ws; let pronto=false;
      const tempo=setTimeout(()=>{if(!pronto){ws.close();falha(new Error('O OBS não respondeu. Ele está aberto e com o servidor WebSocket ligado?'))}},6000);
      ws.onerror=()=>{if(!pronto){clearTimeout(tempo);falha(new Error('Não consegui conectar em '+url+'. Confira se o OBS está aberto e se o WebSocket está ligado.'))}};
      ws.onclose=ev=>{
        this.conectado=false;
        this.pendentes.forEach(p=>p.falha(new Error('Conexão com o OBS caiu')));this.pendentes.clear();
        if(!pronto){clearTimeout(tempo);falha(new Error(ev.code===4009?'Senha do WebSocket errada.':'O OBS fechou a conexão (código '+ev.code+').'))}
        else this.emitir('_fechou',ev);
      };
      ws.onmessage=async m=>{
        const msg=JSON.parse(m.data);
        if(msg.op===0){ // Hello
          const d={op:1,d:{rpcVersion:1,eventSubscriptions:inscricoes}};
          const a=msg.d.authentication;
          if(a){
            if(!senha){ws.close();clearTimeout(tempo);falha(new Error('O OBS pede senha. Preencha a senha do WebSocket.'));return}
            d.d.authentication=await OBS.sha256b64((await OBS.sha256b64(senha+a.salt))+a.challenge);
          }
          ws.send(JSON.stringify(d));
        }else if(msg.op===2){pronto=true;this.conectado=true;clearTimeout(tempo);ok(msg.d)}
        else if(msg.op===5){this.emitir(msg.d.eventType,msg.d.eventData||{})}
        else if(msg.op===7){
          const p=this.pendentes.get(msg.d.requestId); if(!p) return; this.pendentes.delete(msg.d.requestId);
          const st=msg.d.requestStatus;
          if(st.result) p.ok(msg.d.responseData||{});
          else p.falha(Object.assign(new Error(msg.d.requestType+': '+(st.comment||('erro '+st.code))),{code:st.code}));
        }
      };
    });
  }
  pedir(tipo,dados){
    if(!this.ws||this.ws.readyState!==1) return Promise.reject(new Error('OBS desconectado'));
    const id=String(++this.id);
    return new Promise((ok,falha)=>{
      this.pendentes.set(id,{ok,falha});
      this.ws.send(JSON.stringify({op:6,d:{requestType:tipo,requestId:id,requestData:dados||{}}}));
    });
  }
}
