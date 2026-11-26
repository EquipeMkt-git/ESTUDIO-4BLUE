/* Recebe o estado do painel pelo OBS (obs-websocket -> obs-browser "emit_event").
   O painel manda o evento "estudio" com o estado inteiro a cada mudança e a cada 5 s.
   O último estado fica guardado para a página voltar igual se o OBS recarregar. */
(function(){
  const CHAVE='estudio4blue:estado';
  let atual={};
  try{atual=JSON.parse(localStorage.getItem(CHAVE)||'{}')}catch(e){}
  const ouvintes=[];
  function aplicar(e){
    atual=e||{};
    document.body.classList.toggle('black',atual.tema==='black');
    ouvintes.forEach(f=>{try{f(atual)}catch(err){console.error(err)}});
  }
  window.Estudio={
    aoMudar(f){ouvintes.push(f); if(document.body) f(atual)},
    get estado(){return atual}
  };
  window.addEventListener('estudio',ev=>{
    const e=ev.detail||{};
    try{localStorage.setItem(CHAVE,JSON.stringify(e))}catch(err){}
    aplicar(e);
  });
  // Para testar fora do OBS: abrir a página com #teste chama window.simular(estado)
  window.simular=e=>window.dispatchEvent(new CustomEvent('estudio',{detail:e}));
  document.addEventListener('DOMContentLoaded',()=>aplicar(atual));
})();
