# Commando — TODO

Current tier is **Bronze** because this session's model ID is unknown/unproven; the run cannot claim Silver until a maintainer checks it (`kit/CHECKING.md`). The saved ledger is 52.8% of tracked bytes (code 32.1%, data 73.9%). The main gameplay engine and several data ranges still need explanation, so this is not a complete image explanation.

## Orientation and sweep still needed

- Capture the loader-to-engine hand-over at the first instruction of game code, compare it with `work/play.vsf`, and update the disk-file-to-memory map.
- Finish and record the I/O register census and screen-code/text string sweep in `facts.md`.
- Continue `coverage.py`'s work queue, starting with `$3A2E`, `$0A57`, `$0D59`, `$3DB5`, and `$0850`; trace the main loop, input, scrolling, player/enemy state, collision, scoring, grenades, all areas, sound, and ending. Keep feature statuses aligned with live tests.
- Determine whether `$D800-$DFFF` (RAM under color RAM and CIA I/O) contains data the game uses; the listing reports this range unaccounted.
- Rebuild and check the disassembler project from committed `symbols.json` on a clean startup before finalizing.
- C64-Wiki reference screenshots were not saved because browser permission was declined. The local title and gameplay captures are included.

## Host and kit

- Ubuntu 26.04.1 x86_64 is a first C64 kit run on this operating system. `check-emulator` passed 57/57 on VICE 3.13.2; footprint verification passed and the install notes and status cell record the result.
- Refresh `kit-feedback.md` to include the coverage ledger and symbol export changes, then run the required kit checks before committing.

## Page ideas

- Show how the IRQ dispatch pointer in screen RAM `$0406-$0407` lets successive raster handlers update sprite registers for different parts of the screen.
- Show the live grenade test: Space changes the HUD count and produces a projectile.
