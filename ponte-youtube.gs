/**
 * Estúdio 4blue — PONTE DO YOUTUBE.
 * Fica na conta dona do canal (kaminski.avalca@gmail.com → @4blueGestao) e cria/agenda as lives nele.
 * Só aceita pedidos assinados com a CHAVE DA PONTE (gerada aqui mesmo, guardada nas Propriedades do script).
 *
 * Instalar (uma vez, logado na conta do canal):
 *  1. script.google.com → Novo projeto "ESTUDIO 4BLUE - PONTE YOUTUBE" → cole este código.
 *  2. Serviços (+) → YouTube Data API v3.
 *  3. Rode preparar() e autorize. O registro mostra o canal e a CHAVE DA PONTE.
 *  4. Implantar → Nova implantação → App da Web → Executar como: Eu → Acesso: Qualquer pessoa.
 *  5. No Estúdio, Admins → Canal do YouTube: cole a URL /exec e a chave da ponte.
 */

function doPost(e) {
  try {
    var b = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var seg = PropertiesService.getScriptProperties().getProperty('SEGREDO');
    if (!seg) return json_({ ok: false, erro: 'Ponte não preparada (rode preparar()).' });
    var msg = String(b.ts) + '|' + String(b.acao) + '|' + String(b.dados || '');
    var esperado = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(msg, seg));
    if (b.assinatura !== esperado) return json_({ ok: false, erro: 'Chave da ponte não confere.' });
    if (Math.abs(Date.now() - Number(b.ts)) > 5 * 60000) return json_({ ok: false, erro: 'Pedido vencido (confira o relógio).' });
    var d = b.dados ? JSON.parse(b.dados) : {};
    if (b.acao === 'canal') return json_(canal_());
    if (b.acao === 'criar') return json_(criar_(d));
    if (b.acao === 'chave') return json_(chave_());
    return json_({ ok: false, erro: 'Ação desconhecida.' });
  } catch (err) {
    return json_({ ok: false, erro: String(err && err.message || err) });
  }
}
function doGet() { return json_({ ok: true, servico: 'Ponte YouTube do Estúdio 4blue' }); }

function canal_() {
  var r = YouTube.Channels.list(['snippet'], { mine: true });
  var c = r.items && r.items[0];
  return c ? { ok: true, canal: { id: c.id, titulo: c.snippet.title, url: c.snippet.customUrl || '' } } : { ok: false, erro: 'Esta conta não tem canal.' };
}

// fluxo fixo: o OBS usa sempre a mesma chave de transmissão e cada live nova é ligada a ele
function fluxo_() {
  var p = PropertiesService.getScriptProperties(), id = p.getProperty('STREAM');
  if (id) {
    var r = YouTube.LiveStreams.list(['id', 'cdn', 'snippet'], { id: id });
    if (r.items && r.items.length) return r.items[0];
  }
  var s = YouTube.LiveStreams.insert({
    snippet: { title: 'Estúdio 4blue (OBS)' },
    cdn: { ingestionType: 'rtmp', resolution: '1080p', frameRate: '30fps' },
    contentDetails: { isReusable: true }
  }, ['snippet', 'cdn', 'contentDetails']);
  p.setProperty('STREAM', s.id);
  return s;
}
function chave_() {
  var s = fluxo_(), ing = (s.cdn && s.cdn.ingestionInfo) || {};
  return { ok: true, servidor: ing.rtmpsIngestionAddress || 'rtmps://a.rtmps.youtube.com:443/live2', chave: ing.streamName };
}
function criar_(d) {
  if (!d.titulo) return { ok: false, erro: 'Falta o título.' };
  if (!d.inicio) return { ok: false, erro: 'Falta a data e a hora.' };
  var corpo = {
    snippet: { title: String(d.titulo).slice(0, 100), description: String(d.descricao || '').slice(0, 4900),
               scheduledStartTime: new Date(Math.max(Number(d.inicio), Date.now() + 60000)).toISOString() },
    status: { privacyStatus: ['public', 'unlisted', 'private'].indexOf(d.privacidade) >= 0 ? d.privacidade : 'unlisted', selfDeclaredMadeForKids: false },
    contentDetails: { enableAutoStart: true, enableAutoStop: true, enableDvr: true, monitorStream: { enableMonitorStream: false } }
  };
  var b;
  if (d.ytId) { corpo.id = d.ytId; b = YouTube.LiveBroadcasts.update(corpo, ['snippet', 'status', 'contentDetails']); }
  else b = YouTube.LiveBroadcasts.insert(corpo, ['snippet', 'status', 'contentDetails']);
  var s = fluxo_();
  YouTube.LiveBroadcasts.bind(b.id, ['id', 'contentDetails'], { streamId: s.id });
  return { ok: true, youtube: { id: b.id, url: 'https://youtube.com/live/' + b.id, studio: 'https://studio.youtube.com/video/' + b.id + '/livestreaming', status: b.status && b.status.lifeCycleStatus } };
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/** Rode uma vez: autoriza, mostra o canal e a CHAVE DA PONTE (copie e cole no Estúdio, em Admins). */
function preparar() {
  var p = PropertiesService.getScriptProperties(), seg = p.getProperty('SEGREDO');
  if (!seg) { seg = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, ''); p.setProperty('SEGREDO', seg); }
  Logger.log('CANAL: ' + JSON.stringify(canal_()));
  Logger.log('CHAVE DA PONTE (copie e cole no Estúdio): ' + seg);
}
