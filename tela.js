/* Telas cheias do Estúdio 4blue. Cada arquivo (fundo.html, abertura.html...) define window.TELA e carrega este script. */
document.write(`<link rel="stylesheet" href="base.css"><style>
  body{background:var(--fundo-cor) var(--fundo) left bottom/cover no-repeat}
  body.black{background-position:center}
  .logo{position:absolute;top:56px;right:72px;height:72px}
  body.black .logo{display:none} /* o fundo da Black já traz a marca */
  .bloco{position:absolute;left:180px;top:50%;transform:translateY(-50%);width:1400px}
  .chapeu{font-weight:800;font-size:30px;letter-spacing:.18em;text-transform:uppercase;color:var(--destaque);margin-bottom:28px}
  h1{font-size:190px;margin-bottom:36px}
  body.black h1{background:var(--ouro);-webkit-background-clip:text;color:transparent}
  .sub{font-weight:600;font-size:42px;line-height:1.3;max-width:1300px;opacity:.92}
  .relogio{display:flex;align-items:baseline;gap:28px;margin-top:64px}
  .relogio .rot{font-weight:700;font-size:30px;letter-spacing:.12em;text-transform:uppercase;opacity:.85}
  .relogio .num{font-size:120px;line-height:1;font-variant-numeric:tabular-nums}
  .barra{position:absolute;left:180px;bottom:120px;width:1400px;height:6px;background:rgba(255,255,255,.15);border-radius:3px;overflow:hidden}
  .barra i{display:block;height:100%;width:30%;background:var(--destaque);border-radius:3px;animation:vai 2.4s ease-in-out infinite}
  @keyframes vai{0%{transform:translateX(-100%)}100%{transform:translateX(480%)}}
  [hidden]{display:none!important}
  .entra{animation:entra .9s cubic-bezier(.2,.8,.2,1) both}
  @keyframes entra{from{opacity:0;transform:translateY(calc(-50% + 40px))}to{opacity:1;transform:translateY(-50%)}}
</style>`);
document.addEventListener("DOMContentLoaded",()=>{
document.body.insertAdjacentHTML("afterbegin",`<img class="logo" src="assets/logo-4blue-branca.png" alt="">
<div class="bloco entra" id="bloco" hidden>
  <div class="chapeu" id="chapeu"></div>
  <h1 class="ko" id="titulo"></h1>
  <div class="sub" id="sub"></div>
  <div class="relogio" id="relogio" hidden><span class="rot" id="rot"></span><span class="num" id="conta">00:00</span></div>
</div>
<div class="barra" id="barra" hidden><i></i></div>`);
const t=window.TELA||new URLSearchParams(location.search).get('t')||'fundo';
const $=id=>document.getElementById(id);
const TEXTOS={
  abertura:e=>({chapeu:'Ao vivo em instantes',titulo:e.titulo||'A aula já vai começar',sub:e.subtitulo||'Pegue papel e caneta e chame quem precisa ver isso.',alvo:e.inicio,rot:'Começa em',fim:'Já vamos começar'}),
  intervalo:e=>({chapeu:'Pausa rápida',titulo:'Intervalo',sub:e.textoIntervalo||'Aproveite para pegar uma água. Já voltamos.',alvo:e.intervaloFim,rot:'Voltamos em',fim:'Voltando agora'}),
  voltamos:e=>({chapeu:'Só um instante',titulo:'Voltamos já',sub:e.textoVoltamos||'Estamos ajustando a transmissão. Não saia daqui.',barra:true}),
  encerramento:e=>({chapeu:e.tituloFimChapeu||'Obrigado por assistir',titulo:e.tituloFim||'Até a próxima',sub:e.textoFim||'Acompanhe a 4blue nas redes para não perder as próximas aulas.'})
};
let alvo=null,rotFim='';
Estudio.aoMudar(e=>{
  if(t==='fundo'){document.querySelector('.logo').hidden=true;return}
  const c=(TEXTOS[t]||TEXTOS.voltamos)(e);
  $('bloco').hidden=false;
  $('chapeu').textContent=c.chapeu; $('titulo').textContent=c.titulo; $('sub').textContent=c.sub;
  $('barra').hidden=!c.barra;
  alvo=c.alvo?Number(c.alvo):null; rotFim=c.fim||'';
  $('rot').textContent=c.rot||'';
  tique();
});
function tique(){
  if(!alvo){$('relogio').hidden=true;return}
  $('relogio').hidden=false;
  const s=Math.round((alvo-Date.now())/1000);
  if(s<=0){$('rot').textContent='';$('conta').textContent=rotFim;$('conta').style.fontSize='72px';return}
  $('conta').style.fontSize='';
  const m=Math.floor(s/60),ss=s%60,h=Math.floor(m/60);
  $('conta').textContent=h?`${h}:${String(m%60).padStart(2,'0')}:${String(ss).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
}
setInterval(tique,250);

});
