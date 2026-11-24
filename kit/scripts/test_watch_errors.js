'use strict';
// A self-test of watchErrors in kit/scripts/play_browser.js on a stand-in for a Playwright page, so it
// needs no browser: a page's uncaught errors and the console errors about the site's own files are
// gathered, and one about a file from another site (a web font where the check cannot reach it) is
// left out (#1021). Exits 1 on any failure.  node kit/scripts/test_watch_errors.js
const { watchErrors } = require('./play_browser.js');
let fails = 0;
const check = (what, ok, detail = '') => { if (!ok) { fails++; console.log('FAIL', what, detail); } else console.log('ok  ', what); };

const on = {};
const page = { on(ev, fn) { on[ev] = fn; } };
const say = (type, text, url) => on.console({ type: () => type, text: () => text, location: () => ({ url }) });
const base = 'http://127.0.0.1:41234';
const errors = watchErrors(page, base);
say('error', 'Failed to load resource: net::ERR_TUNNEL_CONNECTION_FAILED', 'https://fonts.googleapis.com/css2?family=X');
say('error', 'Failed to load resource: net::ERR_TUNNEL_CONNECTION_FAILED', 'https://www.googletagmanager.com/gtag/js');
say('error', 'Failed to load resource: the server responded with a status of 404 (Not Found)', base + '/c64/g/tune.json');
say('error', 'no canvas', base + '/lib/site.js');
say('error', 'from an inline script', '');
say('warning', 'slow', base + '/lib/site.js');
on.pageerror(new Error('x is undefined'));
check('another site\'s file is left out', !errors.some(e => e.includes('googleapis') || e.includes('googletagmanager')), errors.join('\n'));
check('the site\'s own files, a message with no address and the page\'s error are kept, in order',
  errors.length === 4 && errors[0].includes('404') && errors[1].startsWith('no canvas') && errors[2].startsWith('from an inline')
  && errors[3] === 'x is undefined', errors.join('\n'));
const more = [];
check('a second page adds to the same list', watchErrors({ on() {} }, base, more) === more);

console.log(fails ? `${fails} failed` : 'all passed');
process.exit(fails ? 1 : 0);
