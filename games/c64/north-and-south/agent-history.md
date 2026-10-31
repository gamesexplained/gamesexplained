# North & South — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 29 and 30 October 2026, claude-opus-5-5

- Four tape images, fourteen files, eight parts: the resident loader and
  script, the title, the menu, the map (three files), the battle, the fort,
  the train and the ending. Every part was listed from a hand-over the
  game's own loader made. No train came up in an hour of the computer
  playing both sides, so its file was asked for at the fort's prompt by
  setting the loader's file number (`orientation.md`).
- The train is the fort's code rebuilt at other addresses. Its comments
  were carried from the fort's where the instructions match (`work/pair.py`,
  `work/carry.py`), and checked against the train's own bytes. Labels the
  two share by design stay the same; the rest were renamed where they
  clashed with another part's (`work/clash.py`).
- The VICE MCP server would not connect from this session (ECONNREFUSED);
  everything ran through `kit/scripts/tools.py` and `kit/c64/vice.py`
  instead, which worked.
- The sample (seed 20261029, 65 comments, checker on claude-fable-5-1)
  found six wrong in a detail. One overturned a finding the run had meant
  to publish: the computer's plan 3 was thought to wrap a large army's
  score to 0, where the loop leaves it unchanged, and no army is that large.
  The checker ran the routine in the simulator; reading it had not shown
  the 257 times.
- Writing the levels table for the page turned up a contradiction with the
  run's own notes, which said a low level was the handicap everywhere.
  Reading whose level each routine indexes showed the arcade parts and
  the strategic odds count the level opposite ways. The page and the facts
  were corrected before publishing.
- The map widget runs the map's own routines. Its test against the
  emulator's picture first differed by 576 pixels: the month band, which
  three other routines draw. With them, 184 pixels differ, all under the
  cursor sprite.
- Screenshots of a page with a SID player on screen timed out in the
  Chrome extension (the Barbarian page did the same); the players were
  checked through the page's state instead, and by `test_music.js`.
- The loader's text at `$F2CC` is in none of the listings: it lies in
  memory none of the menu's files cover, and the map's files load over it.
