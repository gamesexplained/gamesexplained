# Cuthbert in the Cooler — orientation

## The image

The contributor supplied `cuthbert_in_the_cooler.prg`, 4,875 bytes including its two-byte load address, SHA-256 `3e9798f374af37ba2d2951d3049c6a1a176d37483d538d55cb09eecfec19fcd9`. Its header loads at $1001 and contains BASIC line 20, `SYS 4109` ($100D). Keep the file in this folder's ignored `work/`. No alternate game file was downloaded.

The PRG is packed. Its release identity is unknown; it has no trainer screen or crack intro on the observed route. Its unpacked addresses agree with the C16 cheats published by Plus/4 World, but that is not a byte-for-byte comparison with another release. The C16 cassette instructions describe three starting Cuthberts; this image displays four spare lives and permits five attempts.

## From power-on to play

1. Start the PAL 16 KB C16 through `python3 kit/scripts/tools.py plus4emu`. A free port can be chosen with `--port`; this run used 7511, leaving another clone's server alone. Connect through `kit/c16/plus4emu.py` to that port. All 46 `check-emulator` checks passed on this build; no workaround was needed.
2. Delete old checkpoints, release keys/joysticks, hard-reset and advance 150 frames to BASIC. Call `program` on the local PRG. The call loads bytes without running them. Saving here produces `work/loaded.p4emu`.
3. Set a temporary execution checkpoint at $100D, type `RUN\n` and run. At this stop, set a temporary execution checkpoint at $1100 and run for up to 150 frames. The unpacker reaches $1100 after about 60 frames. Save `work/entry.p4emu` before its `SEI` runs. This is the snapshot used for `symbols.json` and `listing.json`.
4. Run until $1172, with a bound of 500 frames, and require the returned PC to equal $1172. The first maze appears while its colour fade is still running, so a screenshot alone is insufficient. Save `work/play-round1.p4emu` at this verified main-loop boundary. No start button is required: this image enters play directly.
5. Advance one complete pass back to $1172 to draw the initial guards. `reference/play-round1.png` shows that state. For the renderer comparison, save the screen, colours, used dynamic glyphs and TED registers; temporarily park the CPU in an injected `JMP $0703` at $0703 while taking the screenshot, then restore the original PC. This keeps the game from advancing during the screenshot tool's two-frame capture. The temporary code is outside the game's engine and is never part of the listing.

The image is one load. Level changes use resident tables; no tape or disk is attached during play. `media.json` records the single packed PRG as the source of this part.

## Rebuilding the disassembler

`python3 kit/scripts/tools.py r2000 games/c16/cuthbert-in-the-cooler/work/entry.p4emu` builds the Plus/4-mode project from the snapshot and committed symbol map. This run chose port 3011 with `KIT_R2000_PORT`. Use `kit/c16/r2000.py --game games/c16/cuthbert-in-the-cooler` for annotations. The source image is the hand-over; `listing.py` takes the play snapshot as `--entry` for its loaded-data comparison.

## Steady state

The game begins at $1100 with `SEI` and does not install an IRQ handler. The RAM IRQ vector at $0314 remains $CE0E, the KERNAL's, and the BRK vector at $0316 remains $F44C. These vectors are not the game's main loop. ROMs remain paged in; TED reads the RAM font at $3800, attributes at $0800 and characters at $0C00, with $FF07 = $98 (multicolour text, 256 characters).

The engine and inline arguments occupy $1100-$2009; its local state/pointer and ten maze records continue through $2100. Source graphics begin at $3300. The font's static part is $3800-$3B47; fire, guards and player graphics are generated in higher slots. The entry and play snapshots agree in engine instructions and source tables; changing digits, inline selectors and generated glyphs are runtime changes.

Reference screenshots `level-01.png` through `level-10.png` were made by setting the resident level byte before calling the game's own builder, fade and panel routines. They are controlled views of the original data, not a claimed played route to those levels. The life-overflow screenshot likewise forces the last counter boundary before invoking the original award routine.

## The loader, in a paragraph

The BASIC stub enters $100D, copies a short helper below $0200 and jumps into the packed program's unpacking code at $2208. That code reconstructs the resident engine and its data and transfers to $1100. The unpacked image retains a BASIC/depacker area below the engine, monitor instruction-name strings after the maze records, and fill between allocations. These are outside the engine's coverage. The retained bytes do not establish the PRG's original release or author.
