# Wizard — orientation

## Image and tools

The contributor supplied a G64 with the eight-byte `GCR-1541` header, version 0 and 84 half-track entries (42 tracks). It is a disk image, not a frozen running game. SHA-256: `040b0615ab6dc3d741ee7bb85b59352a7c4c1a6fca0276672b9ab71ffa398c81`.

The directory has 49 entries: WIZ, SCOR, LODR, CHRW, SPRW, M.L., GAME, BLDR, L00T through L39T, and PPSS. The PP&S introduction and credits appear; no trainer menu was observed. Work used a copy in `work/wizard.g64`, leaving the supplied original alone. The companion NBZ was retained privately but was not used to boot.

Measured on 2 October 2026: vice-mcp `release v3.13.2, v3.13.2-linux-x86_64-gui.zip`; regenerator2000 0.9.20. Linux x86_64 with a virtual display. This clone uses MCP ports 6511 and 3001, set in the ignored `tools/mcp-ports.json`, because other sessions use the defaults. The disassembler is served through the kit's stdio bridge. A fixture verified binary inspection, tracing, labels, comments and clean shutdown.

`verify-footprint` passed. The emulator check passed 54 of 57 cases, including exact stopping and stepping, persistent input, snapshot equality and equality after restart. The failed checks were `watch-store`, `watch-load` and `warp`: their fixed host-speed thresholds failed (39 watchpoint hits; warp 71 passes/s, normal 46/s). Nonzero counters and the precise frame tests worked. Game timing must therefore be measured in emulated frames or cycles, not host seconds. The startup liveness check was corrected to accept positive progress on a busy host.

## Power-on to the canonical snapshot

1. Start the emulator through `python3 kit/scripts/tools.py vice`. Hard-reset, resume execution, and call `vice_autostart` on the local G64 with `program: "WIZ"` and `run: true`. Leave the drive's processor enabled. This run used the bundled 1541-II drive ROM and PAL video.
2. The copyright screen is followed by two illustrated loading screens. Enable WarpMode while loading if desired. On this host they took several minutes; wait for the screen states rather than assuming a fixed host delay.
3. This image's protection loop can stay on the second illustration. Its routine at `$19A3` reads 128 bytes from track 3, sector 3, XORing them into `$7000–$707F`, and the loop at `$195C` waits for the first byte to become `$4C`. True-drive reads in this run supplied only one of the two protected sector patterns. The direct `vice_disk_read_sector` call supplied the other.
4. If still in that loop, stop at an execution checkpoint at `$195C`. Check `$FB` before intervening: **when it is 1, resume to the next hit without changing RAM.** The loader rejects a first-attempt success at `$1973–$1977`; the fresh-boot check on 3 October 2026 succeeded on attempt 2. With `$FB` no longer 1, read `$7000–$707F` from RAM and the first 128 bytes returned by `vice_disk_read_sector` for unit 8, track 3, sector 3. XOR the two byte arrays. In this image their first bytes are `$44` and `$08`; the result starts `$4C,$9F,$8E` and has `$4C` every third byte through offset 117, a valid jump table. Only when those checks pass, write the result to `$7000`. Remove the checkpoint and resume. Do not alter `$FB`, the program counter or the loader code. The loader then writes marker `$FA` to `$99F0` at `$1986` and to `$58FF` at `$1989`, observed with store watchpoints, and proceeds to the title. This applies the loader's own computation to bytes from the supplied disk; no engine instruction or disk file is patched.
5. At the program menu, move port 2 down from Demonstration to Play the Game (three frames of down worked here), release, then press fire. For the later menus, hold fire for 90 frames and release for at least 30; brief presses can miss their slower polling loops.
6. While GAME loads, set an execution checkpoint at `$0819`, its SYS entry. When it stops, before executing the jump to `$2245`, save without ROMs. **`work/entry.vsf` is the canonical disassembly and listing snapshot.** It is an actual stopped machine after the disk loader, including the protection table already produced in RAM.

## From entry to play

Remove the entry checkpoint and resume. Choose Beginner, then one player, then press fire once more on the instruction to begin. Leave the number keys untouched for the default speed 5. The first level is Playground. Wait for the level to finish drawing and for the player to appear; turn WarpMode off. Stop between instructions with the kit's `pause()` and save `work/play-round1.vsf`. `reference/playground.png` shows that state. Port-2 right for 12 PAL frames moved sprite 7 from X=172 to X=182 while other objects advanced; `reference/playground-moved.png` records the response.

## Snapshot choice and memory

At entry `$00/$01 = $2F/$37`; the RAM IRQ vector is `$7D6A` and NMI vector `$7D6F`. In play the same banking remains, IRQ is `$7CBF`, and NMI remains `$7D6F`. The live PC was `$8E62`, inside the disk's machine-code image. These are observations, not a claim about an interrupt's rate.

In play `$DD00=$C4` selects VIC bank `$C000`; `$D018=$13` selects screen `$C400` and charset `$C800`. The font matches CHRW byte-for-byte. SPRW loads from disk at `$4000` and is relocated to `$E000–$FFFF`; 8190 of its 8192 bytes match the snapshot, with the two bytes at `$FFFA/$FFFB` changed to `$FE43`. This sprite RAM lies beneath the KERNAL ROM and must be included in analysis.

GAME occupies `$0801–$4A88`. M.L. occupies `$5800–$9F6F`. Comparing the canonical entry with Playground finds 307 changed bytes in GAME and four at `$8AB7–$8ABA` in M.L.; font and sprite RAM are identical. The entry image preserves the initialization values. The meaning of the changed ranges is established in facts and symbols, rather than presumed from the comparison.

Levels are separate L00T–L39T files. A gameplay snapshot contains one loaded level; the level format and the complete disk set must be checked separately. BLDR is a separate construction program, not simultaneously resident with GAME.

## Loader summary

WIZ loads LODR, whose illustrated sequence loads the shared machine routines and graphics, relocates sprites under ROM, and combines the two protected sector patterns into the engine's jump table. Its title menu then loads GAME or BLDR into the low program area. The program begins through SYS 2073 and a jump at `$0819`. The protection assist above is the only intervention before that hand-over; the loader is not the subject of the annotation pass.

## Fresh-boot check, 3 October 2026

A hard reset and WIZ autostart from a disposable copy of the supplied G64, using the guarded assist above, reached GAME through the program menu. All 45,560 listed resident bytes at the fresh `$0819` stop matched the canonical listing. Joystick selection of Beginner and one player reached Playground through its normal load/setup, with wizard (172,165), six lives in all six account slots, and the documented banking and interrupt vectors. This establishes the assisted boot recipe; it is not a claim that the protected image booted without assistance.
