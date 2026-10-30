# Speedball — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

Silver: 100 % coverage (55,107 bytes, code and data), `facts.md`, every
feature confirmed, traced or live, and the minisite built with players
for every tune and every sound effect, held to the game's driver by
`test_music.js`.

The sample found 11 wrong in 60 (18 %, 95 % interval 10.6 % to 29.9 %),
all corrected. An audit of the whole listing by another model is
recommended before the page is relied on (`kit/CHECKING.md`).

## For Gold

- A human edit pass over How it works and Discoveries, section by
  section (`kit/style.md`).
- Who at Pantheon Software programmed the C64 version: the game's
  credits name only the company, and no source found on 30 October 2026
  named a programmer.

## For Platinum

- A Play tab: a port of a match to JavaScript, routine by routine, held
  in lockstep with the game (`kit/skills/core/70-minisite/play.md`). The
  tile chooser, the tackle check and the slide test already run the
  game's routines on the page, with tests.

## Article ideas

- A match replayed from a recording of play (`kit/skills/core/65-inputs`),
  showing the stamina meters drain as tackles land.
- The computer's aiming: `ai_side1_target` (`$A898`) reads the sign of the
  tackle figure, so a template above 127 aims differently from one below.
