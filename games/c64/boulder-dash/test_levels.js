#!/usr/bin/env node
// Holds the Maps tab's cave builder (levels.html) to the recipe in the game's code.
// For each of the 20 caves and 5 levels the page builds the 880-cell map; the first 12 hex digits of the
// MD5 of those bytes must equal the digits a second implementation (Python, checked against the emulator's
// map of cave A level 1) gave. Run: node test_levels.js [levels.html]
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const page = path.resolve(process.argv[2] || path.join(__dirname, 'levels.html'));
const html = fs.readFileSync(page, 'utf8');
const core = html.match(/<script id="levels-core">([\s\S]*?)<\/script>/)[1];
const data = html.match(/const BD_DATA = (\{[\s\S]*?\});\n/)[1];
const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(core, ctx);
const BD = ctx.window.BD, D = JSON.parse(data);
const EXPECT = [["bd9ffcbd3450", "79bbb9213824", "f6878acf5d71", "90f9fd3adeb7", "8aad6cb244ca"], ["15dcf378084e", "89f8edc02788", "21f018584fbd", "d5b850dda839", "4d57ccb39fba"], ["9b921b58c601", "2bc513b1b66e", "ea3ef4dfa284", "32db16152019", "c173ad79d6a4"], ["00b7fef160d6", "6a09f29f7a21", "3f1a0d0cdf4e", "abbb214a6405", "3dfd2c8f96a2"], ["cb1123471117", "cb1123471117", "cb1123471117", "cb1123471117", "cb1123471117"], ["28c80d12a123", "77022dd5251c", "bfd391388fd5", "f7b4c0f2987b", "27e05cf9bbe8"], ["df544d09813a", "8b8063f6d07f", "6d958addfddc", "9fcb48ccf0f6", "e9e73bba1faf"], ["3eec04d75278", "0054ed1aba3f", "98e39c624c07", "94941799d647", "166e4bc1245b"], ["f4aaa0782a7e", "4b295754a5c8", "ba392322ba85", "71fd674c29e3", "83bc17e80c8d"], ["c67ff44d51b2", "c67ff44d51b2", "c67ff44d51b2", "c67ff44d51b2", "c67ff44d51b2"], ["7e4b67fbca94", "fc10c3ae0c4b", "0a315456f9c0", "ad4d327a5b9d", "1319f535495c"], ["d06633fbda16", "34b95e1a26ed", "a0d50d52ef07", "f44ba4daccfa", "893e22fcbf8c"], ["6b8de38242f9", "6e507854ad02", "a83161135181", "9eddd116fbb5", "50d3cff87ac9"], ["f1b16ac22a59", "f1b16ac22a59", "f1b16ac22a59", "f1b16ac22a59", "f1b16ac22a59"], ["caba10db509a", "df1e9b045542", "8f7e52975465", "e47cac513a57", "380bb4c437a5"], ["227bc896fd67", "79f04510ca57", "2433ea38f51e", "a22e2788ffc0", "6ba361e6198d"], ["a525fae382d8", "a525fae382d8", "a525fae382d8", "a525fae382d8", "a525fae382d8"], ["60cb36c72c52", "60cb36c72c52", "60cb36c72c52", "60cb36c72c52", "60cb36c72c52"], ["48d2cdf47982", "48d2cdf47982", "48d2cdf47982", "48d2cdf47982", "48d2cdf47982"], ["c0550bb734e4", "c0550bb734e4", "c0550bb734e4", "c0550bb734e4", "c0550bb734e4"]];
let bad = 0;
if (D.caves.length !== 20) { console.log('FAILS: the page holds', D.caves.length, 'caves, not 20'); bad++; }
D.caves.forEach((h, i) => {
  const rec = Uint8Array.from(h.match(/../g).map(b => parseInt(b, 16)));
  for (let l = 0; l < 5; l++) {
    const got = crypto.createHash('md5').update(Buffer.from(BD.build(rec, l))).digest('hex').slice(0, 12);
    if (got !== EXPECT[i][l]) { console.log('FAILS: cave', i + 1, 'level', l + 1, got, 'expected', EXPECT[i][l]); bad++; }
  }
});
console.log(bad ? 'FAILED' : 'OK - 100 caves match');
process.exit(bad ? 1 : 0);
