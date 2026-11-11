/* sideb.js */
// Side B of the disk, for the Discoveries tab: the game upside down. Side B's engine and stages are
// side A's byte for byte but for the two tables of the 192 hi-res rows' addresses, row_lo ($0800) and
// row_hi ($08C0), which side B holds in reverse order (orientation.md, "Side B"). So the page needs
// no second listing: KarSideB.place runs a stage as stages.js does, with the two tables turned over
// first when side B is asked for. The castle picture is the one picture the game copies to the screen
// without the tables (engine $03A5), so side B stores it with its rows in reverse order. CASTLE is the
// picture as side A's tracks 4-6 load it at $A000-$BFFF; KarSideB.castle('b') turns its rows over,
// which gives side B's bytes. LEFTOVER is the sector of side B's track 6 that the loader reads into
// page $40 and never uses (the Discoveries tab's last entry). discoveries.html loads this file after
// ../../lib/cpu6502.js, apple2.js and stages.js; test_sideb.js holds the tables, both pictures and
// the sector to the SHA-256 of what each side of the disk gave (work/, the read logs).
//
//   KarSideB.turn(m)                  turns row_lo and row_hi over in a 64K of memory
//   KarSideB.place(Ls, part, k, side) KarStages.place, on side 'a' or 'b'
//   KarSideB.castle(side)             the castle picture's 8,192 bytes as that side loads them
//   KarSideB.screen(pic)              a 64K with those bytes on hi-res page 1, for Apple2.draw
//   KarSideB.leftover()               the sector's 256 bytes
//   KarSideB.MAP                      what each stretch of the sector is: [first, last, kind]
//   KarSideB.date(sector)             the date its last two bytes hold, as the add-on prints it
globalThis.KarSideB = (function () {
  const ROW_LO = 0x0800, ROW_HI = 0x08C0, ROWS = 192;
  const CASTLE =
    'gICAgICglYCAgICAwKqVgNWqlaiAgNSg1YjVqoWAgICAgICAgICAgICAwKqQnoD/////////////gKjVqpWA/o+AgICAgICAgIDAgoCAgICAgJ2AkIqAgICA' +
    'hICAgICAgICAgICAgICAgICAgIiAgICAgICAgICAAAAAAAAAAADAqtWKgIqAqpWg1YL+/////7+AoIGA1aqVgICAgIKFoICAgICAgICAgICAgID+////////' +
    '////////j5y48P//n6DAqoCAgICAgNWK0ICAgJCA0ICAgJGA0ILAgICAgICAgICFgIWAgICAgIDAgICglYCAgICAgIAAAAAAAAAAAICAgICAgICAgPz/////' +
    '////////14KAgICggICAgJSAgKqVgNWAgKqAgICAgPj/////////////n5WKhIDViPmPgICohaiAgICAgICAgICAkICAgJSogICA+sHz0ar9+v+6v6jXv/z9' +
    'h4CAgMyp04KAqoGAgICAgAAAAAAAAAAAgIDAqoGAgID//////////////////5WogYqAgICAgICAgICAgICAgICAgICAwP///////////9OqgIiAgMCA1YKA' +
    'gICAgICAgICAgICAgICAgICAgICAgJX6lYKAipWImODl58Oq7Prnn4CA0IqAgICAgICAgICAAAAAAAAAAACAgICAgIDg/////////////////////4GAgICA' +
    '1aqBiICAgICAgICAgICAgICA+P////////+AgICAgICAgICAgICAgICAkYDAgoCAgICAgICAgICAgMCKwPrBwIeg97+AgICO0L6BgICqwYDAioCAgKiAqIWA' +
    'gIAAAAAAAAAAANWAgKDUgP7/////////////////////v4CAgICAgICAgICAgNCqgYCAgICAgICA/P///////4nQgICAlKCBgICCkICAgICAgICA0ICAgICg' +
    'gIDAgICggaqAgMCq0KrVqtWqgP6DgMCKgIDAqtWqhYDQgpWA1YDAggAAAAAAAAAAgICAgIDw////////////////////////g4CAgMCCgKiBgNSq1YCAgICA' +
    'gICAgICA8P////+/gMzBmZCixIiB5piDhICAgICAgICAgICAgICAgICAlILUoNWAgKiAgICAkKqVgICAgIDUgICAwIKEgISAgaCAgICAAAAAAAAAAACAgICA' +
    'gPz//////////////5/8//+/+P+PgICAgICAgICAgICAgICAgICAgICAgICAgIDVgtSq1arVqtWq1arVqpWg1aqAgICAgICAgICAgJWggIDQoICKlKiFqtWq' +
    'gICQgICAgKiAgICAgICAgIGAgICAgICAgIAAAAAAAAAAAICAhYCAgNCKlYCAgNSqharVgISqgYrQqtWg1arVgoCAgICAioCAgICAgICq0YD4////////////' +
    '/4Cg1aqFgP6fgICAhICAgICAhKOAgICA1ajQgIGegIiBgJCAgICAgICAqNWq1YCAgICAgICCgICAgIGAwIKAqAAAAAAAAAAA1arVqsCCgKiFgNXw////////' +
    'g4CAgJCghYCAgICA1IKAgICAgICAgICAgICA/P//////////////4I+AgPCH/p+A1IKAgICAgIDQqtWCgICFqpWqhYCBgICCwJmz5syZ4J+AhYCFgICAgICA' +
    'wICAoNCAgICAqJWAAAAAAAAAAACAgICAgICVgID//4/A/////////8OKgIDAopGAgKjVgICAgIDUgNSqgICAgJD4////////////8I/VqoGH1Krhj4DAqoWA' +
    'gICAgISqhICAgNWq0KrVoICAwIL/h4Co1frVivDo3/rXr/+CwOiBgtWAgKqBgICAlIAAAAAAAAAAAICAgICAgIDg/////////////////4/UqtWqgYCAgICA' +
    'gICAgICAgICAgICA1MD///////////+ToICqgIDQgoGCgICAgICAgNSKgIjQgICA1arVqIGAhYCBqIW4gOr/iPa/9YLHgtCq/I+AoN2CgICAgNCCgICAgAAA' +
    'AAAAAAAAgICAgICA4P////////////////////+BgICAgICqgICAgICAgICAgICAgICVqvj//////////4OAgICAgICAgMCAgICAgNGAhajVoNSCgICAqoCg' +
    'hYCQgtCCwMCBoICAgIDgv9D6gYCAgJWAwKiBgICigaCFgICAAAAAAAAAAADBgoCAgID//////////////////////7+AgICAgICAgMCqgIDUqoWAgICAoNCI' +
    'gPj/////h7+o1arVqtWq1arVqpWAgICK3OvHgtWqgIjAioCAhYCAoICAgICAgISohaDVqoDAj4CAioCA1KrVoJWgwKqVgNCKgKgAAAAAAAAAAICAgICA8P//' +
    '/////////////////////4OAgICAgICAgICUqpWAgICAgMDC3YKRgOD/////v4DMwZmAgICAgOaYg4SAhIDAjoSi94+VqoSAgICAoMWClKDVgICogICAgICq' +
    'gICAgICA0IKAgICAlICAgIGggYCAgAAAAAAAAAAAgICAgID8//////////////+P/v////D/j4CAgICAgICAgICAgICAgMWKwIKEqIWKgICA1fjRqtWq1arV' +
    'qtWq1arFj9WqoICA9u+FgNSC0KLVgICA1KCAioCghaiFgICAlICAgICowYCAgICAhYCFgICAgICAioCAAAAAAAAAAACAqtWKgICAqtWCgKjVgsCqhajQqtWC' +
    'gKCFgICg1aqAgICA0KqEqICAgKDRgNXg//////////////+AoNWqhYD+n4CAoNWAgICAgMCAgICAgICC/YCAgICAgIDAgICAgICAgKDVqpWAgICAgIDAgICA' +
    'gICAgICAgIAAAAAAAAAAANWK1KrVgICAgICA/v///////5+AgICAgICAgICAgMCqgICAgICAgICAgICAgPz//////////////+SPgIDwp/6fgICAgICAgICA' +
    'gKqVgICAgICAiICAgICAgLDmzJmz5tT6h4WAhbPmzJmz5syBgKjAgoCAgICAgAAAAAAAAAAAgICAgICo1YDA7/+BgPj/////8J/wq4CAlIKVgNCK0ILAgoCA' +
    'wIKFqoCAgICA8P///////////4Sj1ar//9eqhaOAgKDFgICAwICAgICAgICUgICAwICAgMCq5YHUuNWo1YLw//3vgar0q/Wq34OUgICKgYCAgICAAAAAAAAA' +
    'AACAgICAgICA8P////////////////+A0KrVqpWAgIDAqoCAgICAgICAgICAgICA////////////06rAooGAlIrVgoCAgICAgICAgICAgICAgICAgICAgICA' +
    'gYCB/MHy//7/rvWA9oL4itz6gPiPgICAgIDAgoCAgIAAAAAAAAAAAICAgICAgPD/////////////////////g4CAgICAgICAgICAgICAgICAgICAgIDw////' +
    '//////+fgICAgICAgICQgICAgICAgICAgICAgICAgICAgIGAkIDQgtCAgKCAgIC8+P+U6oeAgICUgICggYDQqoGi1YCAgAAAAAAAAAAAgKqBgICA////////' +
    '////////////////gICAgICAgIDQqtWA1aiVgICAgICAgIDw/////6eMqtWq1ar1udWq1arVgISAgICAgICAgJSAgKCAoMCAgKiAgICAgICBqpWA1aqFgPyA' +
    'gIqAqJWolaDVioCqlYDAqoGAAAAAAAAAAACAgICAgPD///////////////////////+DgICAgICAgICAgKqFgICAgICAgICAgICA/////7+AzMGZkKLEiIHm' +
    'mIOEgICAgICAgICAgICAgICAgKjBgIWghYCAqICAgIDAqoCAgICAgMCKgICAgNSAkICBgJSAgIAAAAAAAAAAAICAgICA/P//////////////h/7////g/4+A' +
    'gICAgICAgICAgoCAgICAqoCAwIeAgICAoJX8w6rVqtWq1arVqtWq4Z/UqoCAgICAgICAgICA1YCAgJSAwIqAgIWghYCAgJSAgICAqNGAgICAgJWgxYCAgICA' +
    'gKiBgAAAAAAAAAAAwKrVqoGAgICAitSqlaDVoICq1aqFgICAwKrVgtCq1YDAoNWA1aCBgICA1YCA/v//////////////gajVqpWA/5+AgKjRgoCAlIDUg4CA' +
    'gIDVoMSAgICUgICAwMDhsJiMhsOBkaKEhsPhsJiMxoCAgICAgKiVgICiAAAAAAAAAADUgICqlYCAgICA8P//////////gYCAgICAgICAgIDAgICAgICAgICA' +
    'gICAgID8///////////////kj4CA8Kf+n4CAgICAgICAoMCigICAgICghYqViICAgIDMmbPmjKCVqI+FgOXMmbPmzJmzhoCIwIKAgICghYAAAAAAAAAAAICg' +
    'gYCAqMGKlICcgID4gf///4eA/oGAgICA0ILUgsCK0ICAgICAgICAgICA0PD///////////+UqNWq1arVqpWogICAgYCAgICAhIKUgICA1arBqtWAgIDQvoGA' +
    'gP6fgNWC0O7564eo1f7dqv2ClICAiIWAgIDAggAAAAAAAAAAgICAgICAgPj///////////////+fgNCC1KrVgICA0KCFgICAgICAgICAgICUgP//////////' +
    '/9Oq1YCVoIWo1YKAgICAgICA1KiAiNGAgIDVqpSAgYCUgIGAgOCRnvz/0ard4P+D/ojW6oGohYCAgICAwICAgICAAAAAAAAAAACAiICAgID4////////////' +
    '/////////4eAgICAgICAgICAgICAgICAgICAgIGi4P//////////n4Dm4ITAjMyBkICAgICg0aKFgNGq0YqAgJSglYCUgJSAkILUgICogICA//+BhKiHgICA' +
    'kICAqIGIlICBiNWAgIAAAAAAAAAAAICAgICAwP///////////////////////4CAgICAgICA1arVgJWA1YCAgICowIiU4P////+nwarVqtWq//nfqtWq1YKF' +
    'gILd7tCL1arVgtSCgICAgoCogICAgIWAwarVgNSqgKj/j4CogICFoIGg1aiAqtWAgKiFgAAAAAAAAAAAgICAgID4////////////////////////g4CAgICA' +
    'gICAgICohYCAgICAwMrXgJCAgP7///+/gICAgJCixIiBgICAhICVqMGKkL7fipWqlICBgJCowICFoIWAgKiAgICAwKqBgICAgICAioCAgIDAgICAgYDQgICA' +
    'AAAAAAAAAACAgICAgPz//////////////4P/////wf+PgICAgICAgICAwIKAgICAxaqFiNS6hYiAgKCFgICq1arVqtWq1arVqoCA0KqAgICArtmi1YKEqNWK' +
    'gICVgMCKgICEgJSAgIDVgoCAgIDQgICAgICEqNWAgICAgICggYAAAAAAAAAAANWqhYDVgICAlajVgICqgIDUqtWAgICAgNSq1aqBqtWK0KqBgNSCgKCAgISA' +
    'gP7//////////////4Oq1arVwP+fgICKwIqAoNWChICAgICAgJqFgICAgICAgMDA4bCYjIbDgdWqhYbD4bCYjMaAgICAgICAgICAgAAAAAAAAAAAkICAgICA' +
    'gICAgPz//////////4eAgICAgICAgICAgICAgICKgICAgICAgICA/P////////////+fhICAgoCg+J+AgIDAgICAgICAgICAgICAgJCIgICAgICAs+bMmYCq' +
    'gaD9h4CFs+bMmbPmzJmAiMCKgICAgICAAAAAAAAAAACAqoWAgIqAqoWAgMCHgP7/////wf+HxYKBgNCqlYCAqIWAgICAgJSAgICAgIDw////////////0KrV' +
    'qtWq1arVioCAgICAgIDAgICAgICAgIGAgICAgICA0K/ggICf/ILUgMD834u+oIH614LVjoWAgIiEgICAgIAAAAAAAAAAAICAgICAgID8////////////gID+' +
    'gYCOgNCC1YqAgJSAlKKAgICAgICAgICAgID+////////j/7TqoWT0KiQo9WCgICAgICAgICAgICAgICAgICAgICAgKCAgID494Hwh4Co1uD/j4PwlaCfuIGA' +
    'gICAgMCKgICAgAAAAAAAAAAAgIrAqoCA+P////////////////////+HgICAgICAgICAgICAgICAgICAgICAgMD//////////5+A5uCM4IzMgZCAgICAgICA' +
    'gICAgICAgICAgICAgICUgNSC3ICAqICA4Ov/gICgnYCAgICA0KqVgICAhKjUgoCAAAAAAAAAAACAgICAgMD///////////////////////+AgICAgICAoJWo' +
    '1YqEgNSqgICAgICAgMD/////h9Wq1arV/////7/VqtWqgYCAgICAgICA0IKAgICAgICAioCAgICBoIGolYDAiMD+1/qVqICAgICAoJWgharVgIColYAAAAAA' +
    'AAAAAICAgICA+P///////////////////////4eAgICAgICAgICAgICAgICAgIDg9Z6AgID4/4CAgICAgICQosSIgYCAgICAgICAgICAgICAgICAgYDUipCg' +
    'haiVgICKgICAgICogICAgICAgKiAgICAwICAgIGAgICAgAAAAAAAAAAAgICAgID8//////////////+B/////4H/j4CAgICAgICAgICAgICAgICYgIDAh4CA' +
    'gIGowaqVqNWq1arVqtWq1YrUqsGqgYiAgICAgICAgIDRioCAhYDQgoCAhIDQgICglYqAgICC1ICAgICAgKDQioCAgICAgISAAAAAAAAAAADVgJWA0IKAqtGg' +
    'harVioCAgICFiMCCgIDUqoGolYDVqtWqgIDAqsGqgICAgID+//////////////+PgICAgPD/n4CAioCqgIjAioCogYCAgNWi1aiAgICAkIDAgICAgICAgICF' +
    'gIWAgICAgIDAgICAgIDUioCKwKoAAAAAAAAAAICAgICAgICAgID///////////+fgICAgICAgICAgICAgIDQqoGAgICAgICAgPz/////////////n9WKwIrQ' +
    'qvmPgICA1IqQgICIkIKAgICA1YDFqoCAgICAgNWrkIDQgICg9f+A5cyZs+bMmbPmgIrAioCAgICFgAAAAAAAAAAAgKqVoNWq1aqFgID4//////////+foNWI' +
    'gIDAqoWAgICAgICAgICAgICAgICQ4P///////////4eAgICAgICAgICAgICAgICAgKKBgtSAgIDVqoWo1YqAgPCv+IDggfSA14D5/////YGU6v2CwKOFgICI' +
    'lICAgICAAAAAAAAAAACAgICAgICA/v///////////4OAgIDgn4DEitSqgYCFgICAgICAgICAgICAgISA/v///////8+Y1KqBv8CK+IPUisCAgICAgIDBqpCg' +
    'wYCAgNWqlIqAgICggICAzOeAwJ6A/pfw1Z+AwIOAnfCAgICAgIDAqoCAgIAAAAAAAAAAAISoxKqAqPz/////////////////////j4CAgICAgICAgICAgICA' +
    'gICAgICgwYqA/////////4eAgObgjOCMzIGAgICAgIjRqpWAgYrEqICA0IDAgsCClYCEwoeGgIiAgPivh4CAgLWAgICAgNSq0YCAgISo0IqAgAAAAAAAAAAA' +
    'gICAgIDg////////////////////////gYCAgICAgKiFoNWKwKrAgoCAgIiAgpSA/////5+AgICAgIaAgICYgICAgIDQgtyO0IvVgtSqlIKAgICAwIrAgoCg' +
    'gaCBoJSKwID0q4Cq1aqBgNCAgKCFgISqxYCAgNWAAAAAAAAAAACAgICAgPj///////////////////////+HgICAgICAgICAgKCBgICAgIDQotWbgIqAwJ/U' +
    'qtWq1arVgICAgKDVqtWq1YqgxajV+t2ClYqQiIWAxYCAqIGq1YCBioCghYCAgICAgICBgICogICAgICAgICAgICAgIAAAAAAAAAAAICAgICA/P//////////' +
    '////gf////+B/4+AgICAgICAgIDAiICAgICVqoWA8IrFqICFqtCq1YCAgICAgICAgICA1aqFqoWKgID+lKDAgoCowaqAoIWA0ICAgJSAgICAgIWKgICAgtSC' +
    'gICAgICAwKqAgICAgICQgAAAAAAAAAAAgIDUgsCq1YLAgsCKgOD//4eAwIKAqIWg1YKAgNSK1KrVioCAgKrVgoCAgICA/v///////////////4CAgID+/5+o' +
    'wIDQqsWCgKqFgICggYCAgpWAgIiQgNCAwICAgICAgICAhYCFgICAgICAwICAgICAgICAgICAAAAAAAAAAACAgICAgICAgIDA/////////////4CAgICAgICA' +
    'gICAgICA1aqVgICAgICAgID8/////////////5+FgNCogKD5j4CAgNWKlICAgICAgICAgICggYDBgICAgLjUqtWAgIDgod/+/4CAgICAs+bMmYOKwKqAgICA' +
    'gIAAAAAAAAAAAMCqlYDVgsCqgYDA////////////w7GQgICAgICAgICAgICAgICAgICAgICAgOD///////////+fgICAgICAAICAgICAgICAgICAgICAgICA' +
    'gYCAgICAgID+vt6A/4CU8J+A3/+D/v+DgIjAoIGogYCAiNCAgICAgAAAAAAAAAAAgICAgICAgP//////////////gICA/r+AgKjAqtWggYCAgICAgICAgICA' +
    'gICAgPx////////PgtWqgICAgoCA0KrQgICAgICAgICAgICAgICAgICAgICAgoCDgI//gMCQgLqBqJWDkP7/iPCDgIiAgICAwKqBgICAAAAAAAAAAACVoNWq' +
    'gYr8/////////////////////5+AgICAgICAgICAgICAioCAgICAgICAgP////////+h1YCAgICAgICAqoWAgICAgICAoIGAgICAgICAgICAgJWghaiEgIGK' +
    'gID8q4GAgIDQgYCAgICVqoGAgICFqMGigYAAAAAAAAAAAICAgICA4P///////////////////////4GAgICAqMCqhaDVqtCCgICAgICAgICAgP7/////g4CA' +
    'gICQosSIgYCAgJCAgICAgICAgICAoNWCgICAgMCK0KqAoIGogYDUgsCA1YKAoMGqhYDAgoCghYCEqIWCgIDAqgAAAAAAAAAAgICAgID4////////////////' +
    '4///x///h4CAgICAgICAgICAhICAgJSAgICVrJSAgICehYCAgICA0ICAgICggYCAgICAgICAgICAgICAgICFgIWAgIqBqtWKgYLQqtWAgICAgICggYCAgIWA' +
    'gKCAgICAgICAgICAAAAAAAAAAACAgICAgP7//////////////4Cv1ar1gf6PgICAgICAgICAkIKAgICAwKKDgMCKgICA1KrVqtWq1arVqtWq1arVqtWq1ajV' +
    'goCAgICAgICAgIWqgKiEgJCAgICUgICAgICAgICAwIDQgoCAgICAgICKgICAgICAgIAAAAAAAAAAAICo1YqAqNWK0KrVgvD/////g9CKgKDVqtWAgIDQosCq' +
    '1YCAgICg1YCAgICAgP7///////////////+PhKDw//+fgoCAhKCFgICo1aiBioCA0arVooGgkYDAgMCAgICAgICAgIWAhYCAgICAgMCAgICFgICA0KLVgAAA' +
    'AAAAAAAAgICAgICAgICA8P////////////+DgICAgICAgICggYCAoNWqlYCAoICAgICA+P////////////+f1aqVpdWq+Y+AgICBqoGAgIqUoISAgICVgsGq' +
    'lYKAgICewL/VgtCP+P+XqP+PgKiVgICYs+bMgoCqgICAoIGAAAAAAAAAAACAgNCAlICAoIH+////////////////gIiAgICAgICAgICAgICAgICAgICAgJDg' +
    '////////////w6qAgICAgADVgICAgICAgIDQioGo0ICAgNWqlaqAqICA1PrXwIeolaiY4Jf/gKr/roD4gaCAqoCAgICQgICAgIAAAAAAAAAAAICAgICAgMD/' +
    '//////////////+P+P//gICAgKjVqsGCgICAgICAgICAgICAhYr8////////j6rVqtWq1arVqtWqlYCAgICEisGilKDEgoCA1YqEqoGAwIDAv8CA/YCAn8Cq' +
    'gIDVn8DK96/RhoCqgICAgICqgYCAgAAAAAAAAAAAlYCVoMGA/v////////////////////+fgICAgICAgICAgICA0KqAgICAgKDBioD+////////qdGAgIDQ' +
    'qoCAgKKVgICAiPGL3YLVoICAhYCAqoCokIDRqIWI1KrBotWA36rVn4CAwIOAgIColaiFgNSAhaDVgJSAAAAAAAAAAACAgICAgOD/////////////////////' +
    '//+BgICAlIjQqoGA1arVgoCAgICAotCgkID4/////4+AgICAkKLEiIGAgICEgJCq+IbAvtWqwIqUioCAgIDQgtCqwaqAoICAxICQiNWCgICAoNWAgICAqIWA' +
    'hKCFioCAgIoAAAAAAAAAAICAgICA/P////////////////j//5/+/4eAgICAgICAgICAgICAgIDQgNSKlIiBioCAmNWK1arVqtX/////r9Wq1ajVqoCFoIOI' +
    '9IDAitColaCBgMCCgarVqsWq1aqFgICAgICAoIGAgICVgICAgICAgICAgICAgAAAAAAAAAAAgICAgpX+//////////////+AnoCA+ID+j4CAgICAgICAgJCs' +
    'gICAgNWi1YDg7oCggYCAgICAgICAgICAgICAgICAgICAgICAgKCFgICCgKiQqIGAhICUgICAkICAgICAgICAgACA0IqAgICAgICAgIGAgICAgICAgICAgICA' +
    'gIA=';
  const LEFTOVER =
    'rV+qyQTwC8kQ8AfJMPADTEWwrZyzSEpKSkpKqq3+tp2+tGgYaSKqrf+2nca0TEWwrf+2rv62TMe26KkQLV6q8AO9xrRIrZyzSkpKSkqovr60aEzHtgAAAAAA' +
    'AAAAoACERciFRExErqmvTO39qPAlqR6FJKmgIO39mEgpDyC4tiDCtooguLYgwrZoSkpKShhpUiC4tkwvrgAAAAAAAAAAAAAAABsHAAAAIEKuqQCFPIU9oDi5' +
    'u7OiCGqQEUj4GKU8aQGFPKU9aQCFPdhoytDpyNDhIEj5qcYg7f2p0iDt/anFIO39IO39qb0g7f2lPSDa/aU8TNr9AAD///f3///39w==';
  const bytes = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const base = y => 0x400 * (y % 8) + 0x80 * (Math.floor(y / 8) % 8) + 0x28 * Math.floor(y / 64);

  function turn(m) {
    m.subarray(ROW_LO, ROW_LO + ROWS).reverse();
    m.subarray(ROW_HI, ROW_HI + ROWS).reverse();
    return m;
  }

  function place(Ls, part, k, side) {
    const P = KarStages.STAGES.find(t => t.part === part).places[k], s = KarStages.start(Ls, part);
    if (side === 'b') turn(s.m);
    while (s.flips < P.at) if (!KarStages.next(s, P.set)) break;
    return s;
  }

  function castle(side) {
    const a = bytes(CASTLE);
    if (side !== 'b') return a;
    const b = a.slice();
    for (let y = 0; y < ROWS; y++) b.set(a.subarray(base(ROWS - 1 - y), base(ROWS - 1 - y) + 40), base(y));
    return b;
  }

  function screen(pic) {
    const m = new Uint8Array(0x10000);
    m.set(pic, 0x2000);
    return m;
  }

  // The sector, by what its bytes are. The date add-on was assembled for $B65B, the free end of DOS
  // 3.3's page $B6 on a 48K Apple, so its own two bytes at $B6FE and $B6FF are the sector's $A3 and $A4.
  const MAP = [
    [0x00, 0x54, 'date'], [0x5D, 0x96, 'date'], [0xA3, 0xA4, 'today'], [0xA8, 0xF5, 'free'], [0xF8, 0xFF, 'fill'],
  ];
  // As the add-on prints a date ($B6C7): the low four bits of the second byte, the first byte, and
  // the second byte's high four bits plus 82, each as two digits, with slashes between them.
  function date(sector) {
    const day = sector[0xA3], ym = sector[0xA4], two = v => String(v % 100).padStart(2, '0');
    return two(ym & 15) + '/' + two(day) + '/' + two((ym >> 4) + 82);
  }

  return { ROW_LO, ROW_HI, ROWS, turn, place, castle, screen, leftover: () => bytes(LEFTOVER), MAP, date };
})();
