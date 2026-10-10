'use strict';
// A self-test of kit/scripts/port_check.js on a game folder of its own, made in a temp directory:
// a page with a block of each kind a page names (a script headed /* name */, a function inside the
// page's script ending at // end of name, a const), a .js file beside it, a listing. It checks
// what each block gives, that a missing, empty or unended block stops with the page and the name,
// that an error a block throws names the page's own line, the listing's image and fetch, differ,
// and the script's two modes, the --ask answer whole past the 64 KB a pipe takes at once.
// Exits 1 on any failure. node kit/scripts/test_port_check.js
const fs = require('fs'), os = require('os'), path = require('path');
const { spawnSync } = require('child_process');
const { game, differ } = require('./port_check.js');

let fails = 0;
// ok is true, or what went wrong instead (throws gives the message it got)
const check = (what, ok, more) => {
  if (ok === true) console.log('ok  ', what);
  else { fails++; console.log('FAIL', what, more !== undefined ? more : typeof ok === 'string' ? ok : ''); }
};
const throws = (fn, re) => { try { fn(); return 'no error'; } catch (e) { return re.test(e.message) ? true : e.message; } };

const PAGE = `<!doctype html>
<title>A page</title>
<p>Prose that names /* alpha.js */ and function beta( in passing.</p>
<script>
/* alpha.js */
globalThis.Alpha = (function () {
  const twice = v => 2 * v;
  return { twice };
})();
</script>
<script>
(function () {
  'use strict';
  const unused = document.getElementById('no such element');
  function beta(n) {
    return n + 1;
  }
// end of beta
  function broken(n) {
    throw new Error('boom ' + n);
  }
// end of broken
  function unended(n) {
    return n;
  }
})();
</script>
<script>
const GAMMA = { k: 3 };
const GAMMA_DATA = [1, 2];
</script>
<script>
/* empty */
</script>
`;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'port-check-'));
try {
  fs.writeFileSync(path.join(dir, 'page.html'), PAGE);
  fs.writeFileSync(path.join(dir, 'delta.js'), '/* delta */\nglobalThis.Delta = 4;\n');
  fs.mkdirSync(path.join(dir, 'parts', 'one'), { recursive: true });
  const listing = { records: [{ a: 0x1000, b: [1, 2, 3], l: 'start', t: 'code' }, { a: 0x1003, t: 'gap' },
                              { a: 0xFFFE, b: [0x34, 0x12], l: 'vector' }] };
  fs.writeFileSync(path.join(dir, 'listing.json'), JSON.stringify(listing));
  fs.writeFileSync(path.join(dir, 'parts', 'one', 'listing.json'), JSON.stringify({ records: [{ a: 0x0801, b: [9] }] }));
  const g = game(dir);

  // ---- the blocks ------------------------------------------------------------------------------
  const a = g.block('page.html', 'alpha.js');
  check('/* name */ starts at its own line, not the prose', a.line === 5 && a.text.startsWith('/* alpha.js */'), a.line);
  check('/* name */ runs to the end of its script', a.text.trimEnd().endsWith('})();'), JSON.stringify(a.text.slice(-12)));
  const { Alpha } = g.run('page.html', 'alpha.js', 'Alpha');
  check('a block\'s globalThis export', Alpha && Alpha.twice(21) === 42);
  const { beta } = g.run('page.html', 'beta');
  check('function name( to // end of name, without the page\'s DOM code', beta(1) === 2);
  check('a block\'s text stops before // end of name', !g.block('page.html', 'beta').text.includes('end of beta'));
  const { GAMMA, GAMMA_DATA } = g.run('page.html', 'GAMMA', 'GAMMA', 'GAMMA_DATA');
  check('const name = and what follows it in the script', GAMMA.k === 3 && GAMMA_DATA.length === 2);
  check('const in a block stays out of the global scope', typeof globalThis.GAMMA === 'undefined');
  const { Delta } = g.run('delta.js', 'delta', 'Delta');
  check('a .js file beside the page runs to its end', Delta === 4);
  const { broken } = g.run('page.html', 'broken');
  let at = '';
  try { broken(7); } catch (e) { at = (e.stack.split('\n')[1] || ''); }
  const want = PAGE.split('\n').findIndex(l => l.includes("throw new Error('boom ")) + 1;
  check('an error a block throws names the page and its line', at.includes(path.join(dir, 'page.html') + ':' + want + ':'), at + ' (want line ' + want + ')');

  check('a missing block names the page and the name', throws(() => g.run('page.html', 'nosuch'), /page\.html: no block nosuch/));
  check('an empty block stops the test', throws(() => g.run('page.html', 'empty', 'X'), /page\.html: the block empty is empty/));
  check('an identifier the block does not define stops the test', throws(() => g.run('page.html', 'alpha.js', 'Nope'), /defines no Nope/));
  check('a block named by a comment needs the identifiers asked for', throws(() => g.run('page.html', 'alpha.js'), /say which identifiers/));
  check('a function with no // end of name does not compile on its own, and says where it ends',
        throws(() => g.run('page.html', 'unended'), /block unended, lines 23-\d+, does not compile on its own.*\/\/ end of unended/));
  check('a page that is not there', throws(() => g.run('nopage.html', 'x'), /nopage\.html: cannot read it/));

  // ---- the listing and fetch ---------------------------------------------------------------------
  const L = g.listing();
  check('listing: the bytes the records hold', L.ram[0x1000] === 1 && L.ram[0x1002] === 3 && L.ram[0xFFFF] === 0x12);
  check('listing: has marks only the bytes held', L.has[0x1002] === 1 && L.has[0x1003] === 0 && L.has[0x0FFF] === 0);
  check('listing: names, byName, sym and bytes', L.names.get(0x1000) === 'start' && L.byName.get('vector') === 0xFFFE
        && L.sym('start') === 0x1000 && L.bytes(0x1000, 3).join() === '1,2,3');
  check('listing: each call has its own ram', (L.ram[0x1000] = 99, g.listing().ram[0x1000] === 1));
  check('listing: a part\'s', g.listing('parts/one/listing.json').ram[0x0801] === 9);

  // ---- differ ---------------------------------------------------------------------------------
  const x = new Uint8Array(16), y = new Uint8Array(16);
  check('differ: the same', differ(x, y) === -1);
  y[9] = 1;
  check('differ: the first difference', differ(x, y) === 9);
  check('differ: ranges include both ends', differ(x, y, [[0, 8]]) === -1 && differ(x, y, [[0, 3], [9, 9]]) === 9);

  (async () => {
    g.lib('c64');
    const viaFetch = await globalThis.C64.load('listing.json');
    check('fetch serves the folder to C64.load', viaFetch.ram[0x1001] === 2 && viaFetch.has[0x1003] === 0);
    const missing = await fetch('nothing.json');
    check('fetch of a file not there is not ok', missing.ok === false && missing.status === 404);

    // ---- as a script ----------------------------------------------------------------------------
    const script = path.join(__dirname, 'port_check.js');
    let r = spawnSync('node', [script, dir, 'page.html', 'alpha.js', 'Alpha'], { encoding: 'utf8' });
    check('script: says what the block gives', r.status === 0 && /Alpha: object \{ twice \}/.test(r.stdout), r.stdout + r.stderr);
    r = spawnSync('node', [script, dir, 'page.html', 'nosuch'], { encoding: 'utf8' });
    check('script: a missing block exits 1 with the message', r.status === 1 && /no block nosuch/.test(r.stderr), r.stderr);
    r = spawnSync('node', [script, '-h'], { encoding: 'utf8' });
    check('script: -h prints its usage', r.status === 0 && /--ask/.test(r.stdout));
    const ask = { game: dir, page: 'page.html', name: 'alpha.js', wanted: ['Alpha'],
                  body: 'const v = game.listing().ram[0x1000];\nreturn Array.from({ length: request.n }, (_, i) => Alpha.twice(i) + v);',
                  request: { n: 30000 } };
    r = spawnSync('node', [script, '--ask'], { input: JSON.stringify(ask), encoding: 'utf8', maxBuffer: 1 << 26 });
    let answer = null;
    try { answer = JSON.parse(r.stdout); } catch (e) { /* checked below */ }
    check('script: --ask answers in full past 64 KB', r.status === 0 && r.stdout.length > 65536 && answer && answer.length === 30000
          && answer[29999] === 2 * 29999 + 1, r.stderr || r.stdout.length);
  })().catch(e => { fails++; console.log('FAIL', e.stack || e); }).finally(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(fails ? fails + ' FAILED' : 'all ok');
    process.exitCode = fails ? 1 : 0;
  });
} catch (e) {
  fs.rmSync(dir, { recursive: true, force: true });
  throw e;
}
