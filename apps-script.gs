/**
 * Estúdio 4blue — backend (Apps Script "ESTUDIO 4BLUE").
 * Login Google + admins, lives (cards), chat produção ↔ convidados, presença, YouTube (criar live e ler comentários).
 * Guarda tudo em Propriedades do script (lives, admins) e no Cache (chat, presença). Não usa planilha.
 *
 * Atualizar: cole este código, salve, Implantar → Gerenciar implantações → editar (lápis) → Nova versão → Implantar.
 */
var CLIENT_ID = '397559732703-q3l6tmt3p6hoc8s3aumsah741u6jmrge.apps.googleusercontent.com';
var DOMINIO = '4blue.com.br';
var SESSAO_HORAS = 12;
var VAGAS = ['c1', 'c2', 'c3', 'tela'];

/* ======================= entrada ======================= */
function doPost(e) {
  var b = {};
  try { b = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (x) { return json_({ ok: false, erro: 'Pedido inválido.' }); }
  try {
    var a = String(b.action || '');
    if (a === 'login') return json_(login_(b.credential));
    if (a.indexOf('convidado.') === 0) return json_(convidado_(a, b));
    var u = usuario_(b.token);
    if (!u) return json_({ ok: false, erro: 'Sessão expirada. Entre de novo.', relogar: true });
    return json_(acao_(a, b, u));
  } catch (err) {
    return json_({ ok: false, erro: String(err && err.message || err) });
  }
}
function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    if (p.code && p.state) return youtubeRetorno_(p);
    if (p.acao === 'chat') {
      if (!usuario_(p.token)) return json_({ ok: false, erro: 'Sessão expirada. Entre de novo.', relogar: true });
      return json_(comentarios_(p.v, p.page));
    }
    return json_({ ok: true, servico: 'Estúdio 4blue', versao: 2 });
  } catch (err) { return json_({ ok: false, erro: String(err && err.message || err) }); }
}

function acao_(a, b, u) {
  switch (a) {
    case 'eu': return { ok: true, email: u.email, nome: u.nome, papel: u.papel };
    case 'lives.list': return { ok: true, lives: listarLives_() };
    case 'live.get': var l = lerLive_(b.id); return l ? { ok: true, live: l } : { ok: false, erro: 'Live não encontrada.' };
    case 'live.save': return { ok: true, live: salvarLive_(b.live || {}, u) };
    case 'live.delete': apagarLive_(b.id); return { ok: true };
    case 'live.youtube': return youtubeCriar_(b.id, u);
    case 'youtube.status': return youtubeStatus_();
    case 'youtube.conectar': return youtubeConectarUrl_(u);
    case 'youtube.chave': return youtubeChave_(u);
    case 'live.youtubeLink': return youtubeLinkManual_(b.id, b.link);
    case 'chat.list': return chatLer_(b.id, b.desde, true);
    case 'chat.send': return chatEnviar_(b.id, { de: u.email, nome: u.nome || u.email.split('@')[0], papel: 'producao', texto: b.texto });
    case 'admins.list': return { ok: true, admins: admins_(), dono: dono_() };
    case 'admins.save': precisaAdmin_(u); return salvarAdmin_(b.email, b.papel, b.nome, u);
    case 'admins.remove': precisaAdmin_(u); return removerAdmin_(b.email);
  }
  return { ok: false, erro: 'Ação desconhecida: ' + a };
}

/* ======================= login e admins ======================= */
function login_(credential) {
  if (!credential) return { ok: false, erro: 'Login sem credencial.' };
  var r = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential), { muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) return { ok: false, erro: 'Login do Google inválido. Tente de novo.' };
  var t = JSON.parse(r.getContentText());
  var email = String(t.email || '').toLowerCase();
  if (t.aud !== CLIENT_ID) return { ok: false, erro: 'Login de outro aplicativo.' };
  if (String(t.email_verified) !== 'true') return { ok: false, erro: 'E-mail do Google não verificado.' };
  if (email.split('@')[1] !== DOMINIO) return { ok: false, erro: 'Use a conta Google da 4blue (@' + DOMINIO + ').' };
  var ad = acharAdmin_(email);
  if (!ad) return { ok: false, erro: 'Seu e-mail (' + email + ') ainda não tem acesso. Peça para um admin liberar em Admins.' };
  if (t.name && ad.nome !== t.name) { ad.nome = t.name; gravarAdmin_(ad); }
  var exp = Date.now() + SESSAO_HORAS * 3600 * 1000;
  return { ok: true, email: email, nome: t.name || email, papel: ad.papel, exp: exp, token: assinar_(email + '|' + exp) };
}
function usuario_(token) {
  if (!token || String(token).indexOf('.') < 0) return null;
  var partes = String(token).split('.');
  var dado;
  try { dado = Utilities.newBlob(Utilities.base64DecodeWebSafe(partes[0])).getDataAsString(); } catch (x) { return null; }
  if (assinar_(dado) !== token) return null;
  var d = dado.split('|');
  if (Number(d[1]) < Date.now()) return null;
  var ad = acharAdmin_(d[0]);
  return ad ? { email: ad.email, nome: ad.nome, papel: ad.papel } : null;
}
// dono do sistema (conta onde o Apps Script está): sempre admin
var DONO = 'dhione@4blue.com.br';
function dono_() { return DONO; }
function admins_() { try { return JSON.parse(props_().getProperty('ADMINS') || '[]'); } catch (x) { return []; } }
function acharAdmin_(email) {
  email = String(email || '').toLowerCase();
  if (email && email === dono_()) return { email: email, nome: '', papel: 'admin', dono: true };
  for (var i = 0, l = admins_(); i < l.length; i++) if (l[i].email === email) return l[i];
  return null;
}
function gravarAdmin_(ad) {
  if (ad.dono) return;
  var l = admins_().filter(function (x) { return x.email !== ad.email; });
  l.push(ad); props_().setProperty('ADMINS', JSON.stringify(l));
}
function precisaAdmin_(u) { if (u.papel !== 'admin') throw new Error('Só admins podem mexer na lista de acesso.'); }
function salvarAdmin_(email, papel, nome, u) {
  email = String(email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+$/.test(email)) return { ok: false, erro: 'E-mail inválido.' };
  if (email.split('@')[1] !== DOMINIO) return { ok: false, erro: 'Só e-mails @' + DOMINIO + '.' };
  if (email === dono_()) return { ok: false, erro: 'Esse e-mail é o dono do sistema e já é admin.' };
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    var ant = acharAdmin_(email);
    gravarAdmin_({ email: email, nome: nome || (ant && ant.nome) || '', papel: papel === 'admin' ? 'admin' : 'operador', por: u.email, em: Date.now() });
  } finally { lock.releaseLock(); }
  return { ok: true, admins: admins_() };
}
function removerAdmin_(email) {
  email = String(email || '').toLowerCase();
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try { props_().setProperty('ADMINS', JSON.stringify(admins_().filter(function (x) { return x.email !== email; }))); }
  finally { lock.releaseLock(); }
  return { ok: true, admins: admins_() };
}

/* ======================= lives ======================= */
function props_() { return PropertiesService.getScriptProperties(); }
function aleatorio_(n) {
  var c = 'abcdefghjkmnpqrstuvwxyz23456789', s = '';
  for (var i = 0; i < n; i++) s += c.charAt(Math.floor(Math.random() * c.length));
  return s;
}
function idsLives_() { try { return JSON.parse(props_().getProperty('LIVES') || '[]'); } catch (x) { return []; } }
function lerLive_(id) { var v = props_().getProperty('live_' + id); return v ? JSON.parse(v) : null; }
function listarLives_() {
  var todas = props_().getProperties(), out = [];
  idsLives_().forEach(function (id) { if (todas['live_' + id]) out.push(JSON.parse(todas['live_' + id])); });
  out.sort(function (a, b) { return (b.inicio || 0) - (a.inicio || 0); });
  return out;
}
var CAMPOS_LIVE = ['titulo', 'descricao', 'data', 'hora', 'inicio', 'tipo', 'privacidade', 'tema', 'convidados', 'video', 'subtitulo', 'status', 'autoInicio', 'encerrarSozinho', 'banners', 'letreiro', 'cta'];
function salvarLive_(dados, u) {
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    var l = dados.id ? lerLive_(dados.id) : null;
    if (!l) {
      l = { id: Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyMMdd') + aleatorio_(4), criadoPor: u.email, criadoEm: Date.now(),
            sala: 'aula4blue' + aleatorio_(6), senhaSala: aleatorio_(10), chave: aleatorio_(12), status: 'agendada', youtube: null };
      var ids = idsLives_(); ids.push(l.id); props_().setProperty('LIVES', JSON.stringify(ids));
    }
    CAMPOS_LIVE.forEach(function (k) { if (dados[k] !== undefined) l[k] = dados[k]; });
    l.titulo = String(l.titulo || 'Live sem título').slice(0, 100);
    l.atualizadoPor = u.email; l.atualizadoEm = Date.now();
    var txt = JSON.stringify(l);
    if (txt.length > 8500) throw new Error('Informações demais nessa live (textos muito longos).');
    props_().setProperty('live_' + l.id, txt);
    return l;
  } finally { lock.releaseLock(); }
}
function apagarLive_(id) {
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    props_().deleteProperty('live_' + id);
    props_().setProperty('LIVES', JSON.stringify(idsLives_().filter(function (x) { return x !== id; })));
  } finally { lock.releaseLock(); }
}

/* ======================= chat e presença ======================= */
function chatLer_(id, desde, comPresenca) {
  var c = CacheService.getScriptCache();
  var msgs = JSON.parse(c.get('chat_' + id) || '[]');
  desde = Number(desde) || 0;
  var r = { ok: true, msgs: msgs.filter(function (m) { return m.t > desde; }), agora: Date.now() };
  if (comPresenca) r.presenca = JSON.parse(c.get('pres_' + id) || '{}');
  return r;
}
function chatEnviar_(id, m) {
  var texto = String(m.texto || '').trim().slice(0, 500);
  if (!texto) return { ok: false, erro: 'Mensagem vazia.' };
  if (!lerLive_(id)) return { ok: false, erro: 'Live não encontrada.' };
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    var c = CacheService.getScriptCache();
    var msgs = JSON.parse(c.get('chat_' + id) || '[]');
    var t = Math.max(Date.now(), msgs.length ? msgs[msgs.length - 1].t + 1 : 0);
    msgs.push({ t: t, de: m.de, nome: String(m.nome || '').slice(0, 60), papel: m.papel, vaga: m.vaga || '', texto: texto });
    if (msgs.length > 300) msgs = msgs.slice(-300);
    c.put('chat_' + id, JSON.stringify(msgs), 21600);
  } finally { lock.releaseLock(); }
  return { ok: true };
}
function presenca_(id, vaga, nome) {
  var c = CacheService.getScriptCache();
  var p = JSON.parse(c.get('pres_' + id) || '{}');
  p[vaga] = { nome: String(nome || '').slice(0, 60), t: Date.now() };
  c.put('pres_' + id, JSON.stringify(p), 21600);
}

/* ======================= página do convidado ======================= */
function convidado_(a, b) {
  var l = lerLive_(b.id);
  if (!l || b.k !== l.chave) return { ok: false, erro: 'Link de convite inválido ou antigo. Peça um novo para a produção.' };
  var vaga = VAGAS.indexOf(b.vaga) >= 0 ? b.vaga : 'c1';
  var nome = String(b.nome || (l.convidados && l.convidados[vaga] && l.convidados[vaga].nome) || '').slice(0, 60);
  if (a === 'convidado.entrar') {
    presenca_(l.id, vaga, nome);
    return { ok: true, live: { id: l.id, titulo: l.titulo, inicio: l.inicio, sala: l.sala, senhaSala: l.senhaSala, tema: l.tema },
             vaga: vaga, nome: nome };
  }
  if (a === 'convidado.chat') {
    presenca_(l.id, vaga, nome);
    return chatLer_(l.id, b.desde, false);
  }
  if (a === 'convidado.enviar') {
    return chatEnviar_(l.id, { de: 'convidado:' + vaga, nome: nome || vaga, papel: 'convidado', vaga: vaga, texto: b.texto });
  }
  return { ok: false, erro: 'Ação desconhecida.' };
}

/* ======================= YouTube (canal da 4blue) =======================
   O canal da 4blue é conta de marca: o Apps Script sozinho só enxerga o canal pessoal do dono.
   Por isso a criação de lives usa uma conexão própria (OAuth) em que se escolhe o canal 4blue.
   Precisa de um cliente OAuth do Google Cloud (YT_CLIENT_ID / YT_CLIENT_SECRET nas Propriedades do script),
   com a URL /exec desta implantação cadastrada como "URI de redirecionamento autorizado". */
function ytConfig_() { var p = props_(); return { id: p.getProperty('YT_CLIENT_ID'), segredo: p.getProperty('YT_CLIENT_SECRET'), refresh: p.getProperty('YT_REFRESH') }; }
function urlExec_() { return ScriptApp.getService().getUrl(); }
function youtubeStatus_() {
  var c = ytConfig_(), canal = null;
  try { canal = JSON.parse(props_().getProperty('YT_CANAL') || 'null'); } catch (x) {}
  return { ok: true, configurado: !!(c.id && c.segredo), conectado: !!c.refresh, canal: canal, redirect: urlExec_() };
}
function youtubeConectarUrl_(u) {
  precisaAdmin_(u);
  var c = ytConfig_();
  if (!c.id || !c.segredo) return { ok: false, erro: 'Falta configurar o cliente OAuth do YouTube (YT_CLIENT_ID e YT_CLIENT_SECRET).' };
  var estado = assinar_('yt|' + (Date.now() + 15 * 60000));
  var q = { client_id: c.id, redirect_uri: urlExec_(), response_type: 'code', access_type: 'offline', prompt: 'consent select_account',
            scope: 'https://www.googleapis.com/auth/youtube', state: estado };
  return { ok: true, url: 'https://accounts.google.com/o/oauth2/v2/auth?' + Object.keys(q).map(function (k) { return k + '=' + encodeURIComponent(q[k]); }).join('&') };
}
function youtubeRetorno_(p) {
  var estado = String(p.state || ''), ok = false;
  try {
    var d = Utilities.newBlob(Utilities.base64DecodeWebSafe(estado.split('.')[0])).getDataAsString();
    var partes = d.split('|');
    ok = assinar_(d) === estado && partes[0] === 'yt' && Number(partes[1]) > Date.now();
  } catch (x) {}
  if (!ok) return HtmlService.createHtmlOutput('<p>Link de conexão vencido. Volte ao Estúdio e tente de novo.</p>');
  var c = ytConfig_();
  var r = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', { method: 'post', muteHttpExceptions: true,
    payload: { code: p.code, client_id: c.id, client_secret: c.segredo, redirect_uri: urlExec_(), grant_type: 'authorization_code' } });
  var tk = JSON.parse(r.getContentText());
  if (!tk.refresh_token) return HtmlService.createHtmlOutput('<p>O Google não devolveu a autorização (' + (tk.error_description || tk.error || r.getResponseCode()) + '). Tente de novo.</p>');
  props_().setProperty('YT_REFRESH', tk.refresh_token);
  CacheService.getScriptCache().put('yt_access', tk.access_token, 3000);
  var ch = ytApi_('get', 'channels', { part: 'snippet', mine: 'true' });
  var item = ch.items && ch.items[0];
  var canal = item ? { id: item.id, titulo: item.snippet.title } : null;
  props_().setProperty('YT_CANAL', JSON.stringify(canal));
  props_().deleteProperty('YT_STREAM');
  return HtmlService.createHtmlOutput('<div style="font:16px sans-serif;padding:30px">Canal conectado: <b>' + (canal ? canal.titulo : '?') + '</b>.<br>Pode fechar esta janela e voltar ao Estúdio.</div>');
}
function ytAccess_() {
  var cache = CacheService.getScriptCache(), a = cache.get('yt_access');
  if (a) return a;
  var c = ytConfig_();
  if (!c.refresh) throw new Error('Canal do YouTube não conectado. Um admin precisa conectar em Admins → YouTube.');
  var r = JSON.parse(UrlFetchApp.fetch('https://oauth2.googleapis.com/token', { method: 'post', muteHttpExceptions: true,
    payload: { client_id: c.id, client_secret: c.segredo, refresh_token: c.refresh, grant_type: 'refresh_token' } }).getContentText());
  if (!r.access_token) throw new Error('A conexão com o YouTube caiu (' + (r.error || '') + '). Conecte o canal de novo em Admins.');
  cache.put('yt_access', r.access_token, 3000);
  return r.access_token;
}
function ytApi_(metodo, caminho, q, corpo) {
  var url = 'https://www.googleapis.com/youtube/v3/' + caminho + '?' + Object.keys(q || {}).map(function (k) { return k + '=' + encodeURIComponent(q[k]); }).join('&');
  var op = { method: metodo, muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + ytAccess_() } };
  if (corpo) { op.contentType = 'application/json'; op.payload = JSON.stringify(corpo); }
  var r = UrlFetchApp.fetch(url, op), txt = r.getContentText();
  var j = txt ? JSON.parse(txt) : {};
  if (r.getResponseCode() >= 300) throw new Error('YouTube: ' + ((j.error && j.error.message) || r.getResponseCode()));
  return j;
}
// fluxo de vídeo fixo do Estúdio: o OBS usa sempre a mesma chave e cada live nova é ligada a ele
function fluxo_() {
  var id = props_().getProperty('YT_STREAM');
  if (id) {
    var r = ytApi_('get', 'liveStreams', { part: 'id,cdn,snippet', id: id });
    if (r.items && r.items.length) return r.items[0];
  }
  var s = ytApi_('post', 'liveStreams', { part: 'snippet,cdn,contentDetails' }, {
    snippet: { title: 'Estúdio 4blue (OBS)' },
    cdn: { ingestionType: 'rtmp', resolution: '1080p', frameRate: '30fps' },
    contentDetails: { isReusable: true }
  });
  props_().setProperty('YT_STREAM', s.id);
  return s;
}
function youtubeChave_(u) {
  var s = fluxo_(), ing = s.cdn && s.cdn.ingestionInfo || {};
  return { ok: true, servidor: (ing.rtmpsIngestionAddress || 'rtmps://a.rtmps.youtube.com:443/live2'), chave: ing.streamName, titulo: s.snippet.title };
}
function youtubeCriar_(id, u) {
  var l = lerLive_(id);
  if (!l) return { ok: false, erro: 'Live não encontrada.' };
  if (!l.inicio) return { ok: false, erro: 'Defina a data e a hora da live.' };
  var corpo = {
    snippet: { title: l.titulo, description: l.descricao || '', scheduledStartTime: new Date(Math.max(l.inicio, Date.now() + 60000)).toISOString() },
    status: { privacyStatus: l.privacidade || 'unlisted', selfDeclaredMadeForKids: false },
    contentDetails: { enableAutoStart: true, enableAutoStop: true, enableDvr: true, monitorStream: { enableMonitorStream: false } }
  };
  var b;
  if (l.youtube && l.youtube.id && !l.youtube.manual) {
    corpo.id = l.youtube.id;
    b = ytApi_('put', 'liveBroadcasts', { part: 'snippet,status,contentDetails' }, corpo);
  } else {
    b = ytApi_('post', 'liveBroadcasts', { part: 'snippet,status,contentDetails' }, corpo);
  }
  var s = fluxo_();
  ytApi_('post', 'liveBroadcasts/bind', { id: b.id, part: 'id,contentDetails', streamId: s.id });
  l.youtube = { id: b.id, url: 'https://youtube.com/live/' + b.id, studio: 'https://studio.youtube.com/video/' + b.id + '/livestreaming', status: b.status && b.status.lifeCycleStatus };
  props_().setProperty('live_' + l.id, JSON.stringify(l));
  return { ok: true, live: l };
}
function youtubeLinkManual_(id, link) {
  var l = lerLive_(id);
  if (!l) return { ok: false, erro: 'Live não encontrada.' };
  var m = String(link || '').match(/(?:v=|youtu\.be\/|\/live\/|\/video\/)([\w-]{11})/);
  if (!m && link) return { ok: false, erro: 'Não reconheci esse link do YouTube.' };
  l.youtube = m ? { id: m[1], url: 'https://youtube.com/live/' + m[1], studio: 'https://studio.youtube.com/video/' + m[1] + '/livestreaming', manual: true } : null;
  props_().setProperty('live_' + l.id, JSON.stringify(l));
  return { ok: true, live: l };
}

/* ======================= comentários do YouTube ======================= */
function comentarios_(v, page) {
  v = String(v || '').trim();
  if (!/^[\w-]{11}$/.test(v)) return { ok: false, erro: 'Link da live inválido.' };
  var chatId = chatDoVideo_(v);
  if (!chatId) return { ok: false, erro: 'Essa live não está ao vivo ou o chat está desligado.' };
  var opt = { maxResults: 200 };
  if (page) opt.pageToken = String(page);
  try {
    var r = YouTube.LiveChatMessages.list(chatId, ['snippet', 'authorDetails'], opt);
  } catch (err) {
    var msg = String(err && err.message || err);
    if (/quota/i.test(msg)) return { ok: false, erro: 'A cota diária da API do YouTube acabou. Use o comentário manual.' };
    if (/ended|notFound|forbidden/i.test(msg)) { CacheService.getScriptCache().remove('ytchat_' + v); return { ok: false, erro: 'O chat dessa live terminou ou não está disponível.' }; }
    throw err;
  }
  var itens = (r.items || []).filter(function (m) {
    return m.snippet && (m.snippet.type === 'textMessageEvent' || m.snippet.type === 'superChatEvent');
  }).map(function (m) {
    var a = m.authorDetails || {};
    return { id: m.id, nome: a.displayName || '', texto: (m.snippet.displayMessage || '').trim(), foto: a.profileImageUrl || '',
             dono: !!a.isChatOwner, moderador: !!a.isChatModerator, membro: !!a.isChatSponsor };
  });
  return { ok: true, itens: itens, page: r.nextPageToken || '', espera: Math.max(6000, Number(r.pollingIntervalMillis) || 0) };
}
function chatDoVideo_(v) {
  var cache = CacheService.getScriptCache();
  var c = cache.get('ytchat_' + v);
  if (c) return c;
  var r = YouTube.Videos.list(['liveStreamingDetails'], { id: v });
  var d = r.items && r.items[0] && r.items[0].liveStreamingDetails;
  var id = d && d.activeLiveChatId;
  if (id) cache.put('ytchat_' + v, id, 6 * 3600);
  return id || '';
}

/* ======================= utilidades ======================= */
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function segredo_() {
  var s = props_().getProperty('SEGREDO');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); props_().setProperty('SEGREDO', s); }
  return s;
}
function assinar_(dado) {
  var sig = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(dado, segredo_()));
  return Utilities.base64EncodeWebSafe(dado) + '.' + sig;
}

/** Rode pelo editor para autorizar. */
function autorizar() {
  segredo_();
  UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=x', { muteHttpExceptions: true });
  YouTube.Videos.list(['id'], { id: 'jNQXAC9IVRw' });
  Logger.log('Autorizado. URL: ' + ScriptApp.getService().getUrl());
}
