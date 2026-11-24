// Conversation logic for the Sambhal property enquiry flow.
// Pure functions: no network, no database. Pasted into n8n Code nodes and unit-tested locally.

var DEFAULTS = {
  kinds: [
    { id: 'flat', title: 'Flat / Builder floor' },
    { id: 'plot', title: 'Plot' },
    { id: 'human', title: 'Dealer se baat' }
  ],
  budgets: [
    { id: 'b1', title: '₹50 lakh tak', min: 0, max: 50 },
    { id: 'b2', title: '₹50 lakh–1 crore', min: 50, max: 100 },
    { id: 'b3', title: '₹1 crore se upar', min: 100, max: 99999 }
  ],
  // Optional: cities, each with its own areas. Without cities the flow asks only for an area from "areas".
  cities: null,
  areas: ['Indirapuram', 'Raj Nagar Extension', 'Vaishali'],
  slots: [
    { id: 's1', title: 'Kal 11:00 AM', dayOffset: 1, time: '11:00' },
    { id: 's2', title: 'Kal 4:00 PM', dayOffset: 1, time: '16:00' },
    { id: 's3', title: 'Parso 11:00 AM', dayOffset: 2, time: '11:00' }
  ],
  max_options: 3,
  rates: { ai_call: 0.3, template: 0.35, session_message: 0 },
  greeting: 'Namaste! Main {name} ka assistant hoon. Aap kya dhundh rahe hain?',
  ai_model: 'claude-haiku-5-5'
};

function priceText(lakh) {
  var n = Number(lakh);
  if (n >= 100) return '₹' + (Math.round(n) / 100).toFixed(2).replace(/\.?0+$/, '') + ' crore';
  return '₹' + n + ' lakh';
}

function decide(ctx, msg, nowMs) {
  var out = { skip: false, needsAI: false, replies: [], event: null, visit: null, step: null, data: null, aiBody: null, rates: null };
  if (!ctx || !ctx.known || !ctx.enabled) { out.skip = true; return out; }
  var cfg = Object.assign({}, DEFAULTS, ctx.config || {});
  var rates = Object.assign({}, DEFAULTS.rates, cfg.rates || {});
  out.rates = rates;
  var conv = ctx.conversation;
  if (conv && conv.last_msg_id === msg.msg_id) { out.skip = true; return out; }

  var to = msg.wa_id;
  var acct = ctx.account;
  var step = conv ? conv.step : 'new';
  var data = conv && conv.data ? JSON.parse(JSON.stringify(conv.data)) : {};
  var isText = msg.kind === 'text';
  var rid = msg.reply_id || '';
  var label = '';
  var meta = {};
  var cities = Array.isArray(cfg.cities) && cfg.cities.length ? cfg.cities : null;
  var maxOpt = Math.min(3, Math.max(1, Number(cfg.max_options) || 3));
  var low = function (s) { return String(s || '').trim().toLowerCase(); };

  function textMsg(body, dest) {
    dest = dest || to;
    return { to: dest, kind: 'session', payload: { messaging_product: 'whatsapp', to: dest, type: 'text', text: { body: body, preview_url: false } } };
  }
  function choose(body, opts) {
    if (opts.length <= 3) {
      return { to: to, kind: 'session', payload: { messaging_product: 'whatsapp', to: to, type: 'interactive', interactive: {
        type: 'button', body: { text: body },
        action: { buttons: opts.map(function (o) { return { type: 'reply', reply: { id: o.id, title: o.title.slice(0, 20) } }; }) } } } };
    }
    return { to: to, kind: 'session', payload: { messaging_product: 'whatsapp', to: to, type: 'interactive', interactive: {
      type: 'list', body: { text: body },
      action: { button: 'Chuniye', sections: [{ title: 'Options', rows: opts.slice(0, 10).map(function (o) { return { id: o.id, title: o.title.slice(0, 24) }; }) }] } } } };
  }
  function cityObj() { return cities ? cities.filter(function (c) { return c.id === data.city; })[0] || null : null; }
  function cityAreas() { var c = cityObj(); return c ? (c.areas || []) : (cities ? [] : cfg.areas || []); }
  function kindOpts() { return cfg.kinds.map(function (k) { return { id: 'kind:' + k.id, title: k.title }; }); }
  function cityOpts() { return cities.slice(0, 10).map(function (c) { return { id: 'city:' + c.id, title: c.title }; }); }
  function budgetOpts() { return cfg.budgets.map(function (b) { return { id: 'budget:' + b.id, title: b.title }; }); }
  function areaOpts() {
    var o = cityAreas().slice(0, 9).map(function (a) { return { id: 'area:' + a, title: a }; });
    o.push({ id: 'area:*', title: 'Koi bhi area' });
    return o;
  }
  function slotOpts() { return cfg.slots.map(function (s) { return { id: 'slot:' + s.id, title: s.title }; }); }
  function pickOpts() {
    var m = data.matches || [];
    if (m.length <= 1) return [{ id: 'pick:0', title: 'Visit book karein' }];
    return m.map(function (x, i) { return { id: 'pick:' + i, title: 'Option ' + (i + 1) }; });
  }
  function ask(s) {
    if (s === 'kind') return choose('Aap kya dhundh rahe hain?', kindOpts());
    if (s === 'city') return choose('Kis shehar mein dekh rahe hain?', cityOpts());
    if (s === 'area') return choose('Kis area mein? (' + (cityObj() ? cityObj().title : 'area chuniye') + ')', areaOpts());
    if (s === 'budget') return choose('Aapka budget kitna hai?', budgetOpts());
    if (s === 'pick') return choose('Kaunsa option dekhna chahenge? Site visit book kar dete hain.', pickOpts());
    if (s === 'slot') return choose('Site visit ke liye free slots:', slotOpts());
    return null;
  }
  function dealerAlert(text) {
    var d = ctx.wa && ctx.wa.dealer_phone;
    if (!d) return;
    if (cfg.dealer_template) {
      out.replies.push({ to: d, kind: 'template', payload: { messaging_product: 'whatsapp', to: d, type: 'template', template: {
        name: cfg.dealer_template, language: { code: 'en' },
        components: [{ type: 'body', parameters: [{ type: 'text', text: text.replace(/\s*\n\s*/g, ' | ') }] }] } } });
    } else {
      out.replies.push(textMsg(text, d));
    }
  }
  function summary() {
    var kind = (cfg.kinds.filter(function (k) { return k.id === data.kind; })[0] || {}).title || data.kind || '-';
    var band = (cfg.budgets.filter(function (b) { return b.id === data.budget; })[0] || {}).title || '-';
    var place = data.area && data.area !== '*' ? data.area : 'koi bhi area';
    if (cityObj()) place += ', ' + cityObj().title;
    return kind + ', ' + band + ', ' + place;
  }
  // Exact match first; then any area in the same city; then the nearest prices. Never a dead end while stock exists.
  function findMatches() {
    var band = cfg.budgets.filter(function (b) { return b.id === data.budget; })[0] || { min: 0, max: 99999 };
    var c = cityObj();
    var pool = (ctx.listings || []).filter(function (l) {
      return l.kind === data.kind && (!c || low(l.city) === low(c.title) || low(l.city) === low(c.id));
    });
    var inBand = function (l) { var p = Number(l.price_lakh); return p >= band.min && p <= band.max; };
    var anyArea = !data.area || data.area === '*';
    var exact = pool.filter(function (l) { return inBand(l) && (anyArea || low(l.area) === low(data.area)); });
    if (exact.length) return { tier: 1, list: exact.slice(0, maxOpt) };
    var cityBand = pool.filter(inBand);
    if (cityBand.length) return { tier: 2, list: cityBand.slice(0, maxOpt) };
    var mid = band.max >= 99999 ? band.min : (band.min + band.max) / 2;
    var near = pool.slice().sort(function (a, b) {
      var da = Math.abs(Number(a.price_lakh) - mid), db = Math.abs(Number(b.price_lakh) - mid);
      var sa = anyArea || low(a.area) === low(data.area) ? 0 : 1, sb = anyArea || low(b.area) === low(data.area) ? 0 : 1;
      return sa - sb || da - db;
    });
    return { tier: 3, list: near.slice(0, maxOpt) };
  }
  function slotAt(slot) {
    var ist = new Date(nowMs + 19800000);
    var d = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + (slot.dayOffset || 1)));
    var mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    var dd = String(d.getUTCDate()).padStart(2, '0');
    return d.getUTCFullYear() + '-' + mm + '-' + dd + 'T' + slot.time + ':00+05:30';
  }
  function unclear() {
    // Free text mid-flow: let the AI answer, then repeat the current question.
    if (isText && step !== 'done' && step !== 'handover' && !ctx.capped) {  // usage cap reached: no AI calls
      out.needsAI = true;
      var lst = (ctx.listings || []).slice(0, 60).map(function (l) { return { title: l.title, kind: l.kind, city: l.city, area: l.area, price_lakh: l.price_lakh, details: l.details }; });
      out.aiBody = {
        model: cfg.ai_model, max_tokens: 200,
        system: 'You are the WhatsApp assistant of ' + acct.name + ', a property dealer in ' + acct.city + ', India. ' +
          'Reply in Hinglish (Hindi in Roman script) in at most 2 short sentences. Use only facts from LISTINGS. ' +
          'Never invent prices, availability or promises; if unsure, say the dealer will confirm. ' +
          'Do not ask questions, the next question is sent separately. LISTINGS: ' + JSON.stringify(lst),
        messages: [{ role: 'user', content: msg.text }]
      };
    }
    var a = ask(step);
    if (a) out.replies.push(a);
    label = 'Unclear message, options repeated';
  }
  function afterKind() { return cities ? 'city' : 'area'; }

  var greetRe = /^(hi+|hii+|hello|hey|namaste|start|menu|restart)\b/i;
  var humanRe = /\b(dealer|baat|call me|human|agent)\b/i;

  if (step === 'new' || (isText && greetRe.test(msg.text.trim()))) {
    data = {}; step = 'kind';
    out.replies.push(choose(cfg.greeting.replace('{name}', acct.name), kindOpts()));
    label = 'New enquiry answered'; meta.first_reply = true;
  } else if (rid === 'kind:human' || (isText && humanRe.test(msg.text))) {
    step = 'handover';
    out.replies.push(textMsg('Theek hai, dealer aapse jald hi sampark karenge.'));
    dealerAlert('Buyer baat karna chahta hai.\n' + (msg.name || 'Buyer') + ' (' + to + ')\nAb tak: ' + summary());
    label = 'Handed over to dealer';
  } else if (step === 'kind') {
    if (rid.indexOf('kind:') === 0) {
      data.kind = rid.slice(5); step = afterKind();
      out.replies.push(ask(step)); label = 'Buyer intent captured';
    } else unclear();
  } else if (step === 'city') {
    var c = rid.indexOf('city:') === 0 ? cities.filter(function (x) { return 'city:' + x.id === rid; })[0] : null;
    if (c) {
      data.city = c.id; step = 'area';
      out.replies.push(ask('area')); label = 'City captured';
    } else unclear();
  } else if (step === 'area') {
    if (rid.indexOf('area:') === 0) {
      data.area = rid.slice(5); step = 'budget';
      out.replies.push(ask('budget')); label = 'Area captured';
    } else unclear();
  } else if (step === 'budget') {
    if (rid.indexOf('budget:') === 0) {
      data.budget = rid.slice(7);
      var r = findMatches();
      if (!r.list.length) {
        step = 'handover';
        out.replies.push(textMsg('Abhi is type ki koi listing hamare paas nahi hai. Dealer aapko naye options ke saath jald sampark karenge.'));
        dealerAlert('Koi listing nahi mili.\n' + (msg.name || 'Buyer') + ' (' + to + ')\nChahiye: ' + summary());
        label = 'No stock for this type, dealer alerted';
      } else {
        var m = r.list;
        data.matches = m.map(function (l) { return { id: l.id, title: l.title, area: l.area, city: l.city || '', price_lakh: l.price_lakh }; });
        step = 'pick';
        var head = r.tier === 1 ? 'Aapke liye ' + m.length + ' option' + (m.length > 1 ? 's' : '') + ' mile hain:'
          : r.tier === 2 ? 'Is area mein aapke budget mein abhi kuch nahi hai, par paas mein ye options hain:'
          : 'Aapke budget mein abhi exact listing nahi hai. Sabse kareeb ye options hain:';
        out.replies.push(textMsg(head + '\n\n' + m.map(function (l, i) {
          return (i + 1) + '. ' + l.title + '\n📍 ' + l.area + (l.city ? ', ' + l.city : '') + '\n' + (l.details ? l.details + '\n' : '') + '💰 ' + priceText(l.price_lakh);
        }).join('\n\n')));
        out.replies.push(ask('pick'));
        label = r.tier === 1 ? m.length + ' listing(s) matched and sent' : 'Nearest ' + m.length + ' listing(s) sent';
        meta.match_tier = r.tier;
      }
    } else unclear();
  } else if (step === 'pick') {
    if (rid.indexOf('pick:') === 0) {
      data.pick = Number(rid.slice(5)) || 0; step = 'slot';
      out.replies.push(ask('slot')); label = 'Visit slots offered';
    } else unclear();
  } else if (step === 'slot') {
    var slot = rid.indexOf('slot:') === 0 ? cfg.slots.filter(function (s) { return 'slot:' + s.id === rid; })[0] : null;
    if (slot) {
      var chosen = (data.matches || [])[data.pick || 0] || { title: 'Property' };
      var where = chosen.area ? chosen.area + (chosen.city ? ', ' + chosen.city : '') : '';
      data.slot = slot.id; step = 'done';
      out.visit = { listing_title: chosen.title + (where ? ' (' + where + ')' : ''), slot_at: slotAt(slot), slot_label: slot.title };
      out.replies.push(textMsg('✅ Site visit confirm hai!\n\n🏠 ' + chosen.title + (where ? '\n📍 ' + where : '') +
        (chosen.price_lakh ? '\n💰 ' + priceText(chosen.price_lakh) : '') + '\n🗓 ' + slot.title +
        '\n\nVisit se 1 ghanta pehle reminder aayega. Dealer ko aapka naam aur number bhej diya hai.\nNaye enquiry ke liye "Hi" likhiye.'));
      dealerAlert('Naya site visit booked.\n' + (msg.name || 'Buyer') + ' (' + to + ')\n' + chosen.title + (where ? ', ' + where : '') + '\n' + slot.title + '\nChahiye: ' + summary());
      label = 'Site visit booked, dealer alerted';
    } else unclear();
  } else {
    // done or handover, and not a greeting
    var booked = data.slot ? (cfg.slots.filter(function (s) { return s.id === data.slot; })[0] || {}).title : null;
    out.replies.push(textMsg(booked
      ? 'Aapka site visit (' + booked + ') booked hai. Kuch aur chahiye to "dealer se baat" likhiye, ya naye enquiry ke liye "Hi" likhiye.'
      : 'Dealer jald aapse sampark karenge. Naye enquiry ke liye "Hi" likhiye.'));
    label = 'Follow-up message acknowledged';
  }

  out.step = step; out.data = data;
  out.event = { event: label, status: 'ok', meta: meta };
  return out;
}

// Called after the optional AI call. Adds the AI answer and works out message count and estimated cost.
function finalize(out, aiText) {
  if (out.needsAI && aiText) {
    out.replies.unshift({ to: out.replies[0] ? out.replies[0].to : null, kind: 'session',
      payload: { messaging_product: 'whatsapp', to: out.replies[0].to, type: 'text', text: { body: aiText.trim(), preview_url: false } } });
    out.event.event = 'Free-text question answered by AI';
    out.event.ai_calls = 1;
  } else {
    out.event.ai_calls = 0;
  }
  var r = out.rates, cost = out.event.ai_calls * r.ai_call;
  out.replies.forEach(function (x) { cost += x.kind === 'template' ? r.template : r.session_message; });
  out.event.msgs = out.replies.length;
  out.event.est_cost = Math.round(cost * 100) / 100;
  return out;
}


const ctx = $input.first().json.ctx;
const msg = $('Parse').first().json;
return [{ json: decide(ctx, msg, Date.now()) }];
