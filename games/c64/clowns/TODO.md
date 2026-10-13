# Clowns — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

Tier: **Silver**, 12 October 2026. Coverage 100 % of the 8,192-byte ROM.

For Gold: a human's pass through `index.html`, section by section, with
`copy` in `game.json` set to what it was.

Open questions:

- Which language and compiler produced `$E000`-`$EFFF` (`facts.md`, "Build").
- Where the character ROM shows the video chip in the Ultimax configuration
  (not measured; the game never uses it).

Ideas for follow-ups:

- A paddle on a touch screen for the Play tab: it takes the mouse and the arrow keys.
- A disk version that takes a joystick, which the C64-Wiki mentions: not found. The c64.com
  disk checked on 12 October 2026 carries this cartridge's 8 KB unchanged behind a loader that
  copies it to $E000 and $2000; no disk release by Commodore was found.
