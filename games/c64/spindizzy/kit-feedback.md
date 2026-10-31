# Spindizzy — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `60-verify`: "A wrong comment is usually one belief written down more than once": `on_ice`'s comment called ice water, and the search found the same swap in six more comments (`surface_response`, `find_floor_at`, `place_block`, `queue_block_tiles`, `block_base_tiles` and the switch symbols' tile pictures), all corrected together.
- `60-verify`: "Give them a stratum of their own, draw about 20 from it": the 518 comments the world script wrote got 20 draws of their own; 4 were wrong, and the template was fixed and all 127 structure comments written again, rather than the four alone.
- `70-minisite`: "for a widget that runs the game's own code on the listing's bytes": the room pictures, the sound effects, the password check and the inhabitants' speeds all run the game's routines, and the room widget turned up two facts given per pass that hold every other pass.

## What was changed in the kit

- `kit/c64/vice.py`: `read_mem`'s docstring says that with no bank it reads what the processor sees, the ROM over a bitmap under the KERNAL, and that bank `"ram"` reads the RAM beneath. This run's first dumps of a bitmap at $E000 read the KERNAL; `c64-reference` says the same for $D000, and the function a run calls is where it is found at that moment.

## Candidates

A page that runs the game's own routines on the listing's bytes starts
with zero page at 0, since the listing holds no bytes there. A routine
that reads a pointer from zero page fails loudly, but a mask or a mode
read from it can give a picture that looks right and is not: here the
colour mask $61 at 0 draws every room in colour scheme 0, a plausible
room in the wrong colours. It was caught only by comparing the page's
bitmap and colour matrix with the emulator's, byte for byte. The skill
would say, in `70-minisite` where it introduces `cpu6502.js`: when a
widget runs the game's code, list every zero-page and I/O read the
routine makes before its first output, set each from the snapshot or
the code that sets it in play, and compare one output with the emulator.
No other game folder could be named for it.

## Maintainer asks

None.

## What cost the most time

Matching the page's room pictures to the emulator byte for byte; a line in
`kit/skills/c64/tool-vice-mcp` that a dump taken right after a key that
redraws the screen can catch the redraw half done would have saved most of
it.

## Operating system and tools

Linux x86_64 cloud container (Ubuntu 24.04.5), VICE x64sc v3.14.0 from
the vice-mcp release, regenerator2000 0.9.20, Python 3.13.18, Node
22.23.4. Nothing new for `kit/c64/INSTALL.md`.
