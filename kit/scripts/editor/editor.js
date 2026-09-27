/* The page editor's half in the browser. kit/scripts/edit.py adds it to the authored pages
   it serves, never to the site. The element tagged data-ge="N" is block N of the page's
   source, and #ge-meta says what can be done to each block. Every change goes to the
   server as one edit to one block, and the server writes it into the source.

   Block numbers change only when the server answers an edit that adds, removes or moves
   blocks: its reply says how ("remap"), and nothing else renumbers the page. An edit
   waiting its turn holds the element, not the number, and reads the number when it goes. */
(function () {
  'use strict';
  var M = JSON.parse(document.getElementById('ge-meta').textContent);
  var meta = M.els, rev = M.rev, undoCount = M.undo || 0;
  var uncommitted = M.pending || 0;   // this game's files with changes git has not committed, as the server last said
  var agent = !!M.agent;              // whether an agent is waiting for Finalize (edit.py --wait)
  var finished = false;               // Finalize was pressed: the page is read-only from then on
  var editing = true;
  var active = null;            // the block being typed in
  var sigs = null;              // the elements it held when typing began, by tag and attributes
  var before = '';              // what it would save as, unchanged
  var beforeHTML = '', beforeStyle = null;
  var holding = false;          // a prompt is open: leaving the block is not leaving it
  var pending = 0, queue = Promise.resolve();
  var ghosts = [];              // blocks taken out of the page whose edit is still on its way
  var dirty = new Set();        // blocks whose save is on its way
  var hov = {text: null, cut: null, sec: null};
  var INLINE = {A: 1, B: 1, I: 1, EM: 1, STRONG: 1, CODE: 1, KBD: 1, SUP: 1, SUB: 1, SMALL: 1, SPAN: 1, BR: 1,
                ABBR: 1, VAR: 1, SAMP: 1, U: 1, S: 1, MARK: 1, Q: 1, CITE: 1, TIME: 1, WBR: 1, DEL: 1, INS: 1};
  var NOUN = {P: 'paragraph', LI: 'list item', FIGCAPTION: 'caption', SECTION: 'section', FIGURE: 'figure',
              TABLE: 'table', UL: 'list', OL: 'list', DL: 'list', BLOCKQUOTE: 'quote', PRE: 'code block',
              DETAILS: 'details', DIV: 'block'};

  // --- looking things up --------------------------------------------------------
  function byId(n) { return document.querySelector('[data-ge="' + n + '"]'); }
  function mOf(x) {
    if (!x || x.nodeType !== 1 || !x.hasAttribute('data-ge')) return null;
    return meta[+x.getAttribute('data-ge')] || null;
  }
  function up(x, test) {
    for (; x && x.nodeType === 1; x = x.parentElement) {
      var m = mOf(x);
      if (m && test(x, m)) return x;
    }
    return null;
  }
  function norm(s) { return s.replace(/\s+/g, ' ').trim(); }
  function noun(x) {
    if (x.tagName === 'DIV' && x.classList.contains('plate')) return 'plate';
    return NOUN[x.tagName] || 'heading';
  }
  function isText(x, m) { return !!(m.edit || m.lock); }

  function lockWhy(x, m) {
    if (!m) return 'This is not part of the page’s source.';
    if (m.lock === 'game.json') return 'Filled in from game.json: edit it there.';
    if (m.lock === 'empty') return 'Empty in the source: the page’s script fills it in.';
    if (!m.edit) return 'This is not prose the editor can write back.';
    if (x.closest('[data-cut]')) return 'Hidden.';
    if (document.querySelectorAll('[data-ge="' + x.getAttribute('data-ge') + '"]').length > 1)
      return 'The page’s script copies this block, so it is edited in the source.';
    if (x !== active && !dirty.has(x) && norm(x.textContent) !== m.text)
      return 'The page’s script writes this text, so it is edited in the source.';
    return null;
  }

  // --- talking to edit.py -------------------------------------------------------
  // One edit at a time, in order. `after` runs as soon as the reply lands, before the next
  // edit reads its block's number. A commit waits its turn behind the saves before it.
  var WRITES = {save: 1, split: 1, join: 1, cut: 1, restore: 1, move: 1};
  var BUSY = {open: 'Opening it in VS Code…', commit: 'Committing…', finalize: 'Finalizing…', pending: ''};
  function send(op, target, extra, after) {
    pending++;
    var p = queue.then(function () {
      var body = Object.assign({op: op, page: M.page, token: M.token, rev: rev}, extra || {});
      if (target) {
        var n = +target.getAttribute('data-ge');
        body.id = n;
        body.tag = (meta[n] || {}).tag;
      }
      if (BUSY[op] !== '') status(BUSY[op] || 'Saving…');
      return fetch('/__edit/api', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)})
        .then(function (r) { return r.json(); });
    }).then(function (j) {
      pending--;
      if (j.reload) { reloadKeeping(j.what || j.error); throw new Error('reloading'); }
      if (!j.ok) { status(j.error || 'Not saved.', true); throw new Error(j.error); }
      if (j.rev) rev = j.rev;
      if (j.els) meta = j.els;
      if (j.undo != null) undoCount = j.undo;
      if (WRITES[op]) uncommitted = Math.max(uncommitted, 1);
      if (after) after(j);
      if (BUSY[op] !== '') status(op === 'open' ? 'Opened in VS Code.' : j.what ? j.what + '.' : 'Saved.');
      bar();
      draw();
      return j;
    }, function (err) {
      pending--;
      status('Not saved: the editor is not answering. Is edit.py still running?', true);
      throw err;
    });
    queue = p.catch(function () {});
    return p;
  }

  function remapped(n, list) {
    for (var k = 0; k < (list || []).length; k++) if (n >= list[k][0] && n < list[k][1]) return n + list[k][2];
    return n;
  }
  function remap(list) {
    if (!list || !list.length) return;
    [].slice.call(document.querySelectorAll('[data-ge]')).concat(ghosts).forEach(function (e) {
      e.setAttribute('data-ge', remapped(+e.getAttribute('data-ge'), list));
    });
  }

  // The list of sections in the margin (build.py's pagenav, kept by site.js) shows each section's label
  // and heading. site.js can add an entry but not move or drop one, so an edit that moves, cuts or hides
  // anything the list shows reloads the page. A new heading or label is written into its entry in place.
  function inList(x) {
    return !!document.querySelector('.pagenav') && (x.matches('section, h2, .fig') || !!x.querySelector('section, h2, .fig'));
  }
  function patchList(html) {
    var pn = document.querySelector('.pagenav');
    if (!pn || !html) return;
    new DOMParser().parseFromString(html, 'text/html').querySelectorAll('.pagenav ol a').forEach(function (a) {
      var mine = pn.querySelector('ol a[href="' + a.getAttribute('href').replace(/["\\]/g, '\\$&') + '"]');
      if (mine) ['.n', '.h'].forEach(function (s) {
        var f = a.querySelector(s), m = mine.querySelector(s);
        if (f && m) m.innerHTML = f.innerHTML;
      });
    });
  }

  function updates(u) {
    Object.keys(u || {}).forEach(function (k) {
      var e = byId(k);
      if (e && e !== active) e.innerHTML = u[k];
    });
  }

  // keep: {n, top}, the block to show at the same height on the screen after the reload
  function reloadKeeping(msg, keep) {
    try {
      sessionStorage.setItem('ge-place', JSON.stringify({y: scrollY, msg: msg || '', page: M.page,
                                                         n: keep ? keep.n : null, top: keep ? keep.top : 0}));
    } catch (e) {}
    location.reload();
  }

  // --- writing a block back ----------------------------------------------------------
  function sig(e) {
    var s = e.tagName;
    for (var k = 0; k < e.attributes.length; k++) s += ' ' + e.attributes[k].name + '=' + e.attributes[k].value;
    return s;
  }
  function signatures(x) {
    var set = new Set();
    x.querySelectorAll('*').forEach(function (e) { set.add(sig(e)); });
    return set;
  }
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/ /g, '&nbsp;'); }
  function escAttr(s) { return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;'); }

  // The block's content as source: text, and the inline elements it had (attributes and
  // all) or that the editor made (bold, italic, code, a link's href). The Source-tab links
  // site.js adds, and the spans and styles a browser adds while you type, are left out.
  function serial(node) {
    var out = '';
    for (var c = node.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 3) { out += esc(c.data); continue; }
      if (c.nodeType === 8) { out += '<!--' + c.data + '-->'; continue; }
      if (c.nodeType !== 1) continue;
      var t = c.tagName;
      if ((t === 'A' && c.hasAttribute('data-auto')) || !INLINE[t]) { out += serial(c); continue; }
      var known = sigs && sigs.has(sig(c));
      if (t === 'SPAN' && !known) { out += serial(c); continue; }
      var attrs = '';
      if (known) {
        for (var k = 0; k < c.attributes.length; k++) {
          var a = c.attributes[k];
          attrs += ' ' + a.name + (a.value === '' ? '' : '="' + escAttr(a.value) + '"');
        }
      } else if (t === 'A' && c.getAttribute('href')) {
        attrs = ' href="' + escAttr(c.getAttribute('href')) + '"';
      }
      var tag = t.toLowerCase();
      if (t === 'BR' || t === 'WBR') { out += '<' + tag + attrs + '>'; continue; }
      var body = serial(c);
      if (body || attrs) out += '<' + tag + attrs + '>' + body + '</' + tag + '>';
    }
    return out;
  }
  function serialize(x) {
    var s = serial(x);
    if (!(sigs && sigs.has('BR'))) s = s.replace(/<br>$/, '');   // the placeholder a browser leaves in an emptied block
    return s;
  }

  // Line breaks and indentation in the source read as single spaces anyway; make them so,
  // so that typing a space never turns into &nbsp; and an untouched block saves as nothing.
  function tidy(x) {
    var w = document.createTreeWalker(x, NodeFilter.SHOW_TEXT), t, list = [];
    while ((t = w.nextNode())) list.push(t);
    list.forEach(function (t) { t.data = t.data.replace(/[ \t\n\r\f]+/g, ' '); });
    if (list.length) {
      list[0].data = list[0].data.replace(/^ +/, '');
      list[list.length - 1].data = list[list.length - 1].data.replace(/ +$/, '');
    }
  }

  // --- typing in a block ------------------------------------------------------------
  function activate(x, px, py, carry) {
    if (active === x) return;
    if (active) finish(active);
    if (!carry) {
      var why = lockWhy(x, mOf(x));
      if (why) { toast(why + ' Alt+click opens its line in VS Code.'); return; }
    }
    beforeHTML = x.innerHTML;
    beforeStyle = x.getAttribute('style');
    tidy(x);
    sigs = carry || signatures(x);
    before = serialize(x);
    x.setAttribute('contenteditable', 'true');
    x.setAttribute('spellcheck', 'true');
    x.style.whiteSpace = 'pre-wrap';
    active = x;
    x.focus({preventScroll: true});
    if (px != null) caretAt(px, py);
    status(/^(P|LI)$/.test(x.tagName) ? 'Enter splits it · Esc drops your changes · click away to save.'
                                     : 'Esc drops your changes · click away to save.');
    draw();
  }

  function release(x) {
    x.removeAttribute('contenteditable');
    x.removeAttribute('spellcheck');
    if (beforeStyle == null) x.removeAttribute('style'); else x.setAttribute('style', beforeStyle);
  }

  function finish(x, cancel) {
    if (active !== x) return;
    active = null;
    release(x);
    if (cancel) { x.innerHTML = beforeHTML; status('Changes dropped.'); draw(); return; }
    var now = serialize(x), m = mOf(x);
    if (now === before) { draw(); return; }
    if (!norm(x.textContent) && m && m.cut === 'cut') { cut(x); return; }   // emptied: it goes
    dirty.add(x);   // until the reply brings its new words, they differ from the source's: that is not a script
    draw();
    send('save', x, {inner: now}, function (j) { patchList(j.nav); })
      .then(function () { dirty.delete(x); draw(); }, function () { dirty.delete(x); draw(); });
  }

  function caretAt(px, py) {
    var r = null;
    if (document.caretRangeFromPoint) r = document.caretRangeFromPoint(px, py);
    else if (document.caretPositionFromPoint) {
      var p = document.caretPositionFromPoint(px, py);
      if (p) { r = document.createRange(); r.setStart(p.offsetNode, p.offset); }
    }
    if (r && active && active.contains(r.startContainer)) {
      r.collapse(true);
      var s = getSelection(); s.removeAllRanges(); s.addRange(r);
    }
  }
  function caretTo(node, offset) {
    var r = document.createRange(); r.setStart(node, offset); r.collapse(true);
    var s = getSelection(); s.removeAllRanges(); s.addRange(r);
  }
  function atStart(x) {
    var s = getSelection();
    if (!s.rangeCount || !s.isCollapsed) return false;
    var r = document.createRange(); r.setStart(x, 0); r.setEnd(s.anchorNode, s.anchorOffset);
    return r.toString().length === 0;
  }
  function trimEdge(x, atHead) {
    var w = document.createTreeWalker(x, NodeFilter.SHOW_TEXT), t, first = null, last = null;
    while ((t = w.nextNode())) { if (!first) first = t; last = t; }
    if (atHead && first) first.data = first.data.replace(/^[ \t\n\r\f]+/, '');
    if (!atHead && last) last.data = last.data.replace(/[ \t\n\r\f]+$/, '');
  }

  // Enter: the words after the caret become a block of their own, with the same tag and class.
  function split(x) {
    var s = getSelection();
    if (!s.rangeCount) return;
    var r = s.getRangeAt(0); r.deleteContents();
    var tail = document.createRange(); tail.setStart(r.startContainer, r.startOffset); tail.setEnd(x, x.childNodes.length);
    var nb = document.createElement(x.tagName);
    for (var k = 0; k < x.attributes.length; k++) {
      var a = x.attributes[k];
      if (!/^(id|data-ge|contenteditable|spellcheck|style)$/.test(a.name)) nb.setAttribute(a.name, a.value);
    }
    if (beforeStyle != null) nb.setAttribute('style', beforeStyle);
    nb.appendChild(tail.extractContents());
    trimEdge(x, false); trimEdge(nb, true);
    x.after(nb);
    var parts = [serialize(x), serialize(nb)], carry = sigs;
    active = null; release(x);
    dirty.add(x);
    send('split', x, {parts: parts}, function (j) {
      remap(j.remap);
      nb.setAttribute('data-ge', +x.getAttribute('data-ge') + 1);
      patchList(j.nav);
    }).then(function () { dirty.delete(x); }, function () { dirty.delete(x); });
    activate(nb, null, null, carry);
    caretTo(nb, 0);
  }

  function joinable(x) {
    var p = x.previousElementSibling;
    while (p && p.classList.contains('ge-ph')) p = p.previousElementSibling;
    if (!p || p.tagName !== x.tagName || !p.hasAttribute('data-ge') || !x.hasAttribute('data-ge')) return null;
    if (+p.getAttribute('data-ge') !== +x.getAttribute('data-ge') - 1) return null;
    return lockWhy(p, mOf(p)) ? null : p;
  }

  // Backspace at the start: the block's words go on the end of the one before.
  function join(x) {
    var p = joinable(x);
    if (!p) return;
    var carry = new Set(sigs);
    active = null; release(x);
    tidy(p);
    signatures(p).forEach(function (s) { carry.add(s); });
    var gap = document.createTextNode(/\S$/.test(p.textContent) && /^\S/.test(x.textContent) ? ' ' : '');
    p.appendChild(gap);
    while (x.firstChild) p.appendChild(x.firstChild);
    x.remove();
    ghosts.push(x);
    sigs = carry;
    var merged = serialize(p);
    send('join', x, {inner: merged}, function (j) {
      remap(j.remap);
      ghosts.splice(ghosts.indexOf(x), 1);
      patchList(j.nav);
    }).catch(function () { ghosts.splice(ghosts.indexOf(x), 1); });
    activate(p, null, null, carry);
    caretTo(gap, gap.length);
  }

  function toggleCode() {
    var s = getSelection();
    if (!s.rangeCount) return;
    var r = s.getRangeAt(0), n = r.commonAncestorContainer;
    var c = (n.nodeType === 3 ? n.parentElement : n).closest('code');
    if (c && active.contains(c) && c !== active) {
      var p = c.parentNode;
      while (c.firstChild) p.insertBefore(c.firstChild, c);
      p.removeChild(c); p.normalize();
      return;
    }
    if (r.collapsed) return;
    var el = document.createElement('code');
    el.appendChild(r.extractContents());
    r.insertNode(el);
    var r2 = document.createRange(); r2.selectNodeContents(el);
    s.removeAllRanges(); s.addRange(r2);
  }

  function editLink() {
    var s = getSelection();
    if (!s.rangeCount) return;
    var r = s.getRangeAt(0).cloneRange(), n = r.commonAncestorContainer;
    var a = (n.nodeType === 3 ? n.parentElement : n).closest('a');
    if (a && (!active.contains(a) || a.hasAttribute('data-auto'))) a = null;
    holding = true;
    var url = prompt(a ? 'Link to (leave it empty to remove the link)' : 'Link to', a ? a.getAttribute('href') : 'https://');
    holding = false;
    active.focus({preventScroll: true});
    s.removeAllRanges(); s.addRange(r);
    if (url === null) return;
    url = url.trim();
    if (a) {
      var old = sig(a);
      if (!url) {
        while (a.firstChild) a.parentNode.insertBefore(a.firstChild, a);
        a.remove();
        return;
      }
      a.setAttribute('href', url);
      if (sigs.has(old)) sigs.add(sig(a));   // still the link it was, with a new address
    } else if (url && !r.collapsed) {
      document.execCommand('createLink', false, url);
    }
  }

  // --- cutting, moving, restoring ---------------------------------------------------
  function cut(x) {
    var m = mOf(x);
    if (!m || !m.cut) return;
    if (active && (x === active || x.contains(active))) finish(active, true);
    x.setAttribute('data-ge-going', '');
    hov = {text: null, cut: null, sec: null}; draw();
    send('cut', x, null, function (j) {
      var msg = j.mode === 'cut' ? j.what + '.' : j.what + '. It holds something the page’s script uses, so it stays '
                + 'in the page, out of sight, until the cleanup pass.';
      if (inList(x)) { reloadKeeping(msg); return; }
      if (j.mode === 'cut') { x.remove(); remap(j.remap); }
      else { x.removeAttribute('data-ge-going'); x.setAttribute('data-cut', ''); x.setAttribute('hidden', ''); }
      updates(j.updates);
      placeholders();
      toast(msg);
    }).catch(function () { x.removeAttribute('data-ge-going'); });
  }

  function move(sec, dir) {
    if (active) finish(active);
    var top = sec.getBoundingClientRect().top;
    send('move', sec, {dir: dir}, function (j) {
      var A = byId(j.pair[0]), X = byId(j.pair[1]);
      if (!A || !X || document.querySelector('.pagenav')) {   // the section stays where it was on the screen
        reloadKeeping(j.what + '.', {n: remapped(+sec.getAttribute('data-ge'), j.remap), top: top});
        return;
      }
      A.before(X);
      remap(j.remap);
      updates(j.updates);
      placeholders();
      scrollBy(0, sec.getBoundingClientRect().top - top);
      sec.setAttribute('data-ge-flash', '');
      setTimeout(function () { sec.removeAttribute('data-ge-flash'); }, 900);
      draw();
    });
  }

  function restore(x) {
    send('restore', x, null, function (j) { reloadKeeping(j.what + '. Reloaded, so its widgets start afresh.'); });
  }

  function placeholders() {
    document.querySelectorAll('.ge-ph').forEach(function (p) { p.remove(); });
    if (!editing) return;
    document.querySelectorAll('[data-cut]').forEach(function (x) {
      if (x.parentElement && x.parentElement.closest('[data-cut]')) return;
      var m = mOf(x);
      var ph = document.createElement('div');
      ph.className = 'ge-ph';
      ph.setAttribute('contenteditable', 'false');
      ph.innerHTML = '<span>Hidden until the cleanup pass: <b></b></span><button type="button">Restore</button>';
      ph.querySelector('b').textContent = (m && m.label) || x.tagName.toLowerCase();
      ph.querySelector('button').onclick = function () { restore(x); };
      x.before(ph);
    });
  }

  // --- what is drawn over the page ----------------------------------------------------
  var ui = document.createElement('div');
  ui.className = 'ge-ui';
  ui.innerHTML =
    '<div class="ge-box"></div><div class="ge-cutbox"></div><div class="ge-tip"></div>' +
    '<button type="button" class="ge-x">×</button>' +
    '<div class="ge-sec"><button type="button" data-a="up" title="Move this section above the one before it">↑</button>' +
    '<button type="button" data-a="down" title="Move this section below the one after it">↓</button>' +
    '<button type="button" data-a="cut">×</button></div>' +
    '<div class="ge-fmt"><button type="button" data-f="bold" title="Bold (⌘B)"><b>B</b></button>' +
    '<button type="button" data-f="italic" title="Italic (⌘I)"><i>I</i></button>' +
    '<button type="button" data-f="code" title="Code (⌘E)">&lt;/&gt;</button>' +
    '<button type="button" data-f="link" title="Link (⌘K)">Link</button></div>';
  var hud = document.createElement('div');
  hud.className = 'ge-hud';
  hud.innerHTML =
    '<div class="ge-panel" hidden></div><div class="ge-toast"></div>' +
    '<div class="ge-bar"><span class="ge-status"></span>' +   // the buttons on the right never move
    '<button type="button" class="ge-err" hidden></button><button type="button" class="ge-hid" hidden></button>' +
    '<button type="button" class="ge-undo" title="Undo the last change to this page">Undo</button>' +
    '<button type="button" class="ge-commit" title="Commit this game’s pages as they are; nothing is pushed">Commit</button>' +
    '<button type="button" class="ge-finish" title="Exit and finalize: commit, and hand the cleanup pass to your agent">' +
    'Finalize</button>' +
    '<button type="button" class="ge-mode" title="Switch between editing and reading the page">Editing</button></div>';
  document.body.appendChild(ui);
  document.body.appendChild(hud);
  function $(s) { return ui.querySelector(s) || hud.querySelector(s); }

  function box(el, x, pad) {
    var r = x.getBoundingClientRect(), u = ui.getBoundingClientRect();
    el.style.left = (r.left - u.left - pad) + 'px';
    el.style.top = (r.top - u.top - pad) + 'px';
    el.style.width = (r.width + 2 * pad) + 'px';
    el.style.height = (r.height + 2 * pad) + 'px';
  }
  function cutTitle(x) {
    var m = mOf(x);
    return m && m.cut === 'hide'
      ? 'Hide this ' + noun(x) + ': it holds something the page’s script uses, so it stays in the page, out of sight, until the cleanup pass'
      : 'Cut this ' + noun(x);
  }
  function live(x) { return x && document.contains(x) && !x.hasAttribute('data-ge-going'); }

  function draw() {
    var u = ui.getBoundingClientRect();
    var b = $('.ge-box'), tip = $('.ge-tip'), xb = $('.ge-x'), sb = $('.ge-sec'), f = $('.ge-fmt');
    var t = editing && live(hov.text) && hov.text !== active ? hov.text : null;
    b.style.display = tip.style.display = 'none';
    if (t) {
      box(b, t, 5);
      b.style.display = 'block';
      var why = lockWhy(t, mOf(t));
      b.classList.toggle('lock', !!why);
      if (why) {
        tip.textContent = why + ' Alt+click opens its line in VS Code.';
        var r = t.getBoundingClientRect();
        tip.style.left = (r.left - u.left) + 'px';
        tip.style.top = (r.top - u.top - 34) + 'px';
        tip.style.display = 'block';
      }
    }
    var c = editing && live(hov.cut) && hov.cut !== hov.sec ? hov.cut : null;
    xb.style.display = 'none';
    if (c) {
      var rc = c.getBoundingClientRect();
      xb.style.left = (rc.right - u.left - 11) + 'px';
      xb.style.top = (rc.top - u.top - 11) + 'px';
      xb.title = cutTitle(c);
      xb.style.display = 'block';
    }
    var sec = editing && live(hov.sec) ? hov.sec : null;
    sb.style.display = 'none';
    if (sec) {
      sb.style.display = 'flex';
      var rs = sec.getBoundingClientRect();
      var y = Math.min(Math.max(rs.top, 8), rs.bottom - sb.offsetHeight);
      sb.style.left = (rs.right - u.left - sb.offsetWidth) + 'px';
      sb.style.top = (y - u.top) + 'px';
      sb.querySelector('[data-a=cut]').title = cutTitle(sec);
    }
    f.style.display = 'none';
    if (active && document.contains(active)) {
      f.style.display = 'flex';
      var ra = active.getBoundingClientRect();
      f.style.left = (ra.right - u.left - f.offsetWidth + 5) + 'px';   // over the ragged end of the line above
      f.style.top = (ra.top - u.top - f.offsetHeight - 10) + 'px';
    }
  }

  function cutPreview(x) {
    var cb = $('.ge-cutbox');
    if (!x) { cb.style.display = 'none'; return; }
    box(cb, x, 6);
    cb.style.display = 'block';
  }

  var toastTimer = 0;
  function toast(msg) {
    var t = $('.ge-toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('on'); }, 4200);
  }
  function status(msg, bad) {
    var s = $('.ge-status');
    s.textContent = msg;
    s.classList.toggle('bad', !!bad);
    s.title = msg;
  }

  function bar() {
    $('.ge-undo').disabled = finished || !undoCount;
    $('.ge-commit').disabled = finished || !uncommitted;
    $('.ge-finish').disabled = $('.ge-mode').disabled = finished;
    $('.ge-finish').title = 'Exit and finalize: commit, and hand the cleanup pass to your agent'
      + (agent ? ' (standing by)' : ' (none is standing by: you get a prompt to give one)');
    var hid = document.querySelectorAll('[data-cut]').length, h = $('.ge-hid');
    h.hidden = !hid;
    h.textContent = 'Hidden ' + hid;
    var errs = (window.__geErrors || []).length, er = $('.ge-err');
    er.hidden = !errs;
    er.textContent = '⚠ ' + errs;
    er.title = errs + ' error' + (errs === 1 ? '' : 's') + ' from the page’s scripts';
  }

  function panel(kind) {
    var p = $('.ge-panel');
    if (!p.hidden && p.dataset.kind === kind) { p.hidden = true; return; }
    p.dataset.kind = kind;
    p.innerHTML = '';
    if (kind === 'hidden') {
      p.innerHTML = '<p><b>Hidden blocks</b> stay in the page, out of sight, so the page’s scripts keep finding what '
        + 'they look for. The cleanup pass removes them with the code only they use: press Finalize when you have '
        + 'finished editing, and your agent does it.</p><ul></ul>';
      var ul = p.querySelector('ul');
      document.querySelectorAll('[data-cut]').forEach(function (x) {
        var m = mOf(x), li = document.createElement('li');
        li.innerHTML = '<span></span><button type="button">Show</button><button type="button">Restore</button>';
        li.querySelector('span').textContent = (m && m.label) || x.tagName.toLowerCase();
        li.querySelectorAll('button')[0].onclick = function () {
          var ph = x.previousElementSibling;
          (ph && ph.classList.contains('ge-ph') ? ph : x.parentElement).scrollIntoView({block: 'center', behavior: 'smooth'});
        };
        li.querySelectorAll('button')[1].onclick = function () { restore(x); };
        ul.appendChild(li);
      });
    } else {
      p.innerHTML = '<p><b>Errors from the page’s scripts</b> since it loaded. After a cut, one usually means the '
        + 'cut took something a script looks for: Undo puts it back.</p><ul></ul>';
      (window.__geErrors || []).forEach(function (e) {
        var li = document.createElement('li'); li.textContent = e; p.querySelector('ul').appendChild(li);
      });
    }
    p.hidden = false;
  }

  // --- committing and finalizing -------------------------------------------------------
  // Both go through the queue, so they wait for any save still on its way.
  function asked(kind, fill) {
    var p = $('.ge-panel');
    if (!p.hidden && p.dataset.kind === kind) { p.hidden = true; return; }
    if (active) finish(active);
    send('pending').then(function (j) {
      p.dataset.kind = kind;
      fill(p, j);
      p.hidden = false;
      var i = p.querySelector('.ge-msg');
      if (i) { i.focus(); i.select(); }
    });
  }
  function hiddenIn(j) { return Object.keys(j.hidden || {}).reduce(function (s, k) { return s + j.hidden[k]; }, 0); }
  function plural(n, one) { return n + ' ' + one + (n === 1 ? '' : 's'); }
  function listFiles(p, files) {
    var ul = document.createElement('ul');
    ul.className = 'ge-files';
    files.forEach(function (f) { var li = document.createElement('li'); li.textContent = f; ul.appendChild(li); });
    p.insertBefore(ul, p.querySelector('.ge-go-row'));
  }
  function onGo(p, go) {
    p.querySelector('.ge-go').onclick = go;
    var i = p.querySelector('.ge-msg');
    if (i) i.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); go(); } };
  }

  function commitPanel() {
    asked('commit', function (p, j) {
      if (!j.files.length) {
        p.innerHTML = '<p><b>Nothing to commit.</b> Every change to this game’s pages is in a commit already.</p>';
        return;
      }
      p.innerHTML = '<p><b>Commit</b> this game’s pages as they are now. Nothing is pushed: the site changes when '
        + 'you push.</p><input class="ge-msg" aria-label="Commit message"><pre class="ge-body"></pre>'
        + '<p class="ge-go-row"><button type="button" class="ge-go">Commit</button></p>';
      p.querySelector('.ge-msg').value = j.subject;
      var body = p.querySelector('.ge-body');
      if (j.body) body.textContent = j.body; else body.remove();
      listFiles(p, j.files);
      onGo(p, function () {
        var subject = p.querySelector('.ge-msg').value;
        send('commit', null, {subject: subject}, function (r) {
          uncommitted = 0;
          p.hidden = true;
          toast('Committed ' + r.sha + '. Nothing is pushed yet.');
        });
      });
    });
  }

  function finishPanel() {
    asked('finish', function (p, j) {
      var hid = hiddenIn(j), does = [];
      if (j.files.length) does.push('commits your edits');
      if (hid) does.push('hands the cleanup pass for the ' + plural(hid, 'hidden block') + ' to your agent');
      does.push(hid ? 'leaves the editor running for it' : 'stops the editor');
      var who = hid ? (j.agent ? ' Your agent is standing by.'
                               : ' No agent is standing by, so you get the prompt to give one.') : '';
      p.innerHTML = '<p><b>Exit and finalize</b></p><p>This ' + does.join(', then ').replace(/, then ([^,]*)$/, ' and $1')
        + '.' + who + '</p>' + (j.files.length ? '<input class="ge-msg" aria-label="Commit message">' : '')
        + '<p class="ge-go-row"><button type="button" class="ge-go">Finalize</button></p>';
      if (j.files.length) { p.querySelector('.ge-msg').value = j.subject; listFiles(p, j.files); }
      onGo(p, function () {
        var i = p.querySelector('.ge-msg');
        finished = true;
        setEditing(false);
        bar();
        send('finalize', null, {subject: i ? i.value : ''}, function (r) { finalized(p, r); })
          .catch(function () { finished = false; setEditing(true); bar(); });
      });
    });
  }

  function finalized(p, r) {
    var a = r.ask, hid = hiddenIn(a);
    var done = a.commit ? 'Committed ' + a.commit + '; nothing is pushed yet.' : 'There was nothing left to commit.';
    p.innerHTML = '<p><b>Finalized.</b> ' + done + '</p><p class="ge-next"></p>';
    var next = p.querySelector('.ge-next');
    if (r.agent) {
      next.textContent = hid ? 'Your agent has the cleanup pass from here: it removes the hidden blocks and the code '
        + 'only they use, checks the page, commits and stops the editor.' : 'Your agent stops the editor.';
    } else if (hid) {
      next.textContent = 'Give your agent this for the cleanup pass:';
      var box = document.createElement('div');
      box.className = 'ge-ask';
      box.innerHTML = '<code></code><button type="button">Copy</button>';
      box.querySelector('code').textContent = a.todo;
      box.querySelector('button').onclick = function (e) {
        navigator.clipboard.writeText(a.todo).then(function () { e.target.textContent = 'Copied'; });
      };
      p.appendChild(box);
    } else {
      next.textContent = 'The editor has stopped. You can close this tab.';
    }
    p.hidden = false;
    status('Finalized.');
  }

  function setEditing(on) {
    editing = on;
    if (!on && active) finish(active);
    document.documentElement.classList.toggle('ge-reading', !on);
    $('.ge-mode').textContent = on ? 'Editing' : 'Reading';
    placeholders();
    draw();
    status(on ? 'Click any paragraph to edit it.' : 'Reading: the page as a reader sees it.');
  }

  // --- events -------------------------------------------------------------------------
  document.addEventListener('mousemove', function (e) {
    if (!editing || ui.contains(e.target) || hud.contains(e.target)) return;
    var t = e.target;
    var next = {
      text: up(t, isText),
      cut: up(t, function (x, m) { return m.cut && !x.hasAttribute('data-cut'); }),
      sec: up(t, function (x, m) { return m.move && !x.hasAttribute('data-cut'); })
    };
    if (next.text !== hov.text || next.cut !== hov.cut || next.sec !== hov.sec) { hov = next; draw(); }
  }, {passive: true});
  addEventListener('scroll', draw, {passive: true});
  addEventListener('resize', draw);
  document.addEventListener('input', function (e) { if (active && active.contains(e.target)) draw(); });

  document.addEventListener('click', function (e) {
    if (!editing || ui.contains(e.target) || hud.contains(e.target) || e.target.closest('.ge-ph')) return;
    if (e.altKey) {
      var any = up(e.target, function () { return true; });
      if (any) { e.preventDefault(); e.stopPropagation(); send('open', any); }
      return;
    }
    var t = up(e.target, isText);
    if (!t) return;
    if (t === active) { if (e.target.closest('a')) e.preventDefault(); return; }
    var why = lockWhy(t, mOf(t));
    if (why) { toast(why + ' Alt+click opens its line in VS Code.'); return; }
    e.preventDefault(); e.stopPropagation();
    activate(t, e.clientX, e.clientY);
  }, true);

  document.addEventListener('focusout', function (e) {
    if (active && e.target === active && !holding) finish(active);
  });

  // Keys typed into a block, or into the editor's own panels, are the editor's alone: a game
  // widget listening for W or the arrow keys on the whole page must not see them.
  function keys(e) {
    if (hud.contains(e.target)) { e.stopPropagation(); return; }
    if (!active || !active.contains(e.target)) return;
    e.stopPropagation();
    if (e.type !== 'keydown') return;
    var k = e.key, mod = e.metaKey || e.ctrlKey;
    if (k === 'Escape') { e.preventDefault(); var x = active; finish(x, true); x.blur(); return; }
    if (mod && !e.altKey && !e.shiftKey) {
      var c = k.toLowerCase();
      if (c === 'b' || c === 'i') { e.preventDefault(); document.execCommand(c === 'b' ? 'bold' : 'italic'); return; }
      if (c === 'e') { e.preventDefault(); toggleCode(); return; }
      if (c === 'k') { e.preventDefault(); editLink(); return; }
      if (c === 's') { e.preventDefault(); active.blur(); return; }
    }
    if (k === 'Enter' && !mod) {
      e.preventDefault();
      if (e.shiftKey) document.execCommand('insertLineBreak');
      else if (/^(P|LI)$/.test(active.tagName)) split(active);
      else active.blur();
      return;
    }
    if (k === 'Backspace' && !mod && !e.altKey && atStart(active) && joinable(active)) { e.preventDefault(); join(active); }
  }
  ['keydown', 'keypress', 'keyup'].forEach(function (t) { addEventListener(t, keys, true); });

  document.addEventListener('paste', function (e) {
    if (!active || !active.contains(e.target)) return;
    e.preventDefault();
    var text = (e.clipboardData || window.clipboardData).getData('text/plain').replace(/\s*\n\s*/g, ' ');
    document.execCommand('insertText', false, text);
  }, true);
  document.addEventListener('drop', function (e) { if (active && active.contains(e.target)) e.preventDefault(); }, true);

  addEventListener('pagehide', function () {
    if (!active || !active.hasAttribute('data-ge')) return;
    var now = serialize(active), n = +active.getAttribute('data-ge');
    if (now !== before) navigator.sendBeacon('/__edit/api', JSON.stringify(
      {op: 'save', page: M.page, token: M.token, rev: rev, id: n, tag: (meta[n] || {}).tag, inner: now}));
  });

  ui.addEventListener('mousedown', function (e) { if (e.target.closest('button')) e.preventDefault(); });
  $('.ge-fmt').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b || !active) return;
    var f = b.dataset.f;
    if (f === 'bold' || f === 'italic') document.execCommand(f);
    else if (f === 'code') toggleCode();
    else if (f === 'link') editLink();
  });
  var xb = $('.ge-x'), sb = $('.ge-sec');
  xb.onmouseenter = function () { cutPreview(hov.cut); };
  xb.onmouseleave = function () { cutPreview(null); };
  xb.onclick = function () { cutPreview(null); if (hov.cut) cut(hov.cut); };
  sb.querySelector('[data-a=cut]').onmouseenter = function () { cutPreview(hov.sec); };
  sb.querySelector('[data-a=cut]').onmouseleave = function () { cutPreview(null); };
  sb.addEventListener('click', function (e) {
    var b = e.target.closest('button'), s = hov.sec;
    if (!b || !s) return;
    cutPreview(null);
    if (b.dataset.a === 'cut') cut(s); else move(s, b.dataset.a === 'up' ? -1 : 1);
  });
  $('.ge-mode').onclick = function () { setEditing(!editing); };
  $('.ge-undo').onclick = function () { if (active) finish(active); send('undo'); };
  $('.ge-commit').onclick = commitPanel;
  $('.ge-finish').onclick = finishPanel;
  $('.ge-hid').onclick = function () { panel('hidden'); };
  $('.ge-err').onclick = function () { panel('errors'); };

  // Another program changed the file (an edit saved in VS Code, a git checkout): show it. The
  // same question keeps Commit and the agent's standing up to date.
  setInterval(function () {
    bar();
    if (finished || active || pending || document.hidden) return;
    var mine = rev;
    fetch('/__edit/api', {method: 'POST', headers: {'Content-Type': 'application/json'},
                          body: JSON.stringify({op: 'rev', page: M.page, token: M.token})})
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j.pending != null && !pending) { uncommitted = j.pending; agent = !!j.agent; bar(); }
        if (j.rev && j.rev !== mine && mine === rev && !pending && !active) reloadKeeping('Reloaded: the file changed on disk.');
      }, function () { status('The editor is not answering. Is edit.py still running?', true); });
  }, 2000);

  // --- start -------------------------------------------------------------------------
  var kept = null;
  try { kept = JSON.parse(sessionStorage.getItem('ge-place') || 'null'); sessionStorage.removeItem('ge-place'); } catch (e) {}
  if (kept && kept.page === M.page) {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    var place = function () {
      var el = kept.n != null && byId(kept.n);
      if (el) scrollBy(0, el.getBoundingClientRect().top - kept.top); else scrollTo(0, kept.y);
    };
    place();
    addEventListener('load', place);
    if (kept.msg) toast(kept.msg);
  }
  placeholders();
  bar();
  status('Click any paragraph to edit it.');
})();
