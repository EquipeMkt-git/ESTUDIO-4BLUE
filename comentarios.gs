/**
 * Estúdio 4blue — backend em Apps Script: login com Google da 4blue + comentários do YouTube.
 *
 * Publicar (uma vez):
 *  1. script.google.com → Novo projeto "ESTUDIO 4BLUE" → cole este código.
 *  2. Serviços (+) → YouTube Data API v3 → Adicionar (identificador "YouTube").
 *  3. Rode a função autorizar() uma vez e aceite as permissões.
 *  4. Implantar → Nova implantação → App da Web → Executar como: Eu → Acesso: Qualquer pessoa.
 *  5. Copie a URL /exec para API_URL em config.js.
 *
 * POST {action:'login', credential}         → {ok, token, email, exp}
 * GET  ?acao=chat&token=...&v=ID&page=TOKEN → {ok, itens, page, espera}
 */
var CLIENT_ID = '397559732703-q3l6tmt3p6hoc8s3aumsah741u6jmrge.apps.googleusercontent.com';
var DOMINIO = '4blue.com.br';
var SESSAO_HORAS = 12;

function doPost(e) {
  try {
    var b = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (b.action === 'login') return json_(login_(b.credential));
    return json_({ ok: false, erro: 'Ação desconhecida.' });
  } catch (err) { return json_({ ok: false, erro: String(err && err.message || err) }); }
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    if (p.acao === 'chat') {
      var s = sessao_(p.token);
      if (!s) return json_({ ok: false, erro: 'Sessão expirada. Entre de novo.', relogar: true });
      return json_(chat_(p.v, p.page));
    }
    return json_({ ok: true, servico: 'Estúdio 4blue' });
  } catch (err) { return json_({ ok: false, erro: String(err && err.message || err) }); }
}

/* ---------- login ---------- */
function login_(credential) {
  if (!credential) return { ok: false, erro: 'Login sem credencial.' };
  var r = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential), { muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) return { ok: false, erro: 'Login do Google inválido. Tente de novo.' };
  var t = JSON.parse(r.getContentText());
  var email = String(t.email || '').toLowerCase();
  if (t.aud !== CLIENT_ID) return { ok: false, erro: 'Login de outro aplicativo.' };
  if (String(t.email_verified) !== 'true') return { ok: false, erro: 'E-mail do Google não verificado.' };
  if (email.split('@')[1] !== DOMINIO) return { ok: false, erro: 'Use a conta Google da 4blue (@' + DOMINIO + ').' };
  var exp = Date.now() + SESSAO_HORAS * 3600 * 1000;
  return { ok: true, email: email, nome: t.name || email, exp: exp, token: assinar_(email + '|' + exp) };
}
function segredo_() {
  var pr = PropertiesService.getScriptProperties();
  var s = pr.getProperty('SEGREDO');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); pr.setProperty('SEGREDO', s); }
  return s;
}
function assinar_(dado) {
  var sig = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(dado, segredo_()));
  return Utilities.base64EncodeWebSafe(dado) + '.' + sig;
}
function sessao_(token) {
  if (!token || token.indexOf('.') < 0) return null;
  var partes = String(token).split('.');
  var dado = Utilities.newBlob(Utilities.base64DecodeWebSafe(partes[0])).getDataAsString();
  if (assinar_(dado) !== token) return null;
  var d = dado.split('|');
  if (Number(d[1]) < Date.now()) return null;
  return { email: d[0] };
}

/* ---------- comentários do YouTube ---------- */
function chat_(v, page) {
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
    if (/ended|notFound|forbidden/i.test(msg)) { CacheService.getScriptCache().remove('chat_' + v); return { ok: false, erro: 'O chat dessa live terminou ou não está disponível.' }; }
    throw err;
  }
  var itens = (r.items || []).filter(function (m) {
    return m.snippet && (m.snippet.type === 'textMessageEvent' || m.snippet.type === 'superChatEvent');
  }).map(function (m) {
    var a = m.authorDetails || {};
    return { id: m.id, nome: a.displayName || '', texto: (m.snippet.displayMessage || '').trim(), foto: a.profileImageUrl || '',
             dono: !!a.isChatOwner, moderador: !!a.isChatModerator, membro: !!a.isChatSponsor };
  });
  // no mínimo 6 s entre leituras para não estourar a cota diária
  return { ok: true, itens: itens, page: r.nextPageToken || '', espera: Math.max(6000, Number(r.pollingIntervalMillis) || 0) };
}
function chatDoVideo_(v) {
  var cache = CacheService.getScriptCache();
  var c = cache.get('chat_' + v);
  if (c) return c;
  var r = YouTube.Videos.list(['liveStreamingDetails'], { id: v });
  var d = r.items && r.items[0] && r.items[0].liveStreamingDetails;
  var id = d && d.activeLiveChatId;
  if (id) cache.put('chat_' + v, id, 6 * 3600);
  return id || '';
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/** Rode uma vez pelo editor para autorizar YouTube e acesso externo. */
function autorizar() {
  YouTube.Videos.list(['id'], { id: 'jNQXAC9IVRw' });
  UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=x', { muteHttpExceptions: true });
  segredo_();
  Logger.log('Autorizado.');
}
