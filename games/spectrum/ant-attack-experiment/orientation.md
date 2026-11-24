# Orientation

## Copy and clean-room boundary

The contributor supplied `AntAttack.tzx.zip`, containing `Ant Attack.tzx` (42,138 bytes). Its header is `ZXTape!` followed by 1A, version 1.13. SHA-256: `98ce71d3cd79fb2faac8524428ba53492d05a5e62efcad340236abd50d8d6f7f`. This is a fresh experimental analysis. Existing game folders and kit lesson files were excluded by sparse checkout during the analysis. Other committed folders were later materialized for repository-wide mechanical validation; their contents were not opened as analysis evidence. No earlier Ant Attack listing, write-up, symbols or work cache was read. The initial web search exposed a summary of a modern explanatory article; it was not opened or used. The research sources are listed in features.md.

## Tools

Debian 13 Linux x86_64, ZEsarUX 13.0 (`ZEsarUX_linux-13.0-ubuntu24_x86_64.tar.gz`), SkoolKit 10.2. The emulator passed 47/50 interface checks. Failures: `count-while-running`, `load-keeps-frame-phase`, `warp`. Use bounded opcode runs, begin comparisons from loaded snapshots, and set warp at launch. The footprint check found no unexpected writes outside the checkout.

Start through `python3 kit/scripts/tools.py --platform spectrum zesarux --emulatorspeed 800`. The 48K machine is used throughout. Connect using `kit/spectrum/zesarux.py`. Snapshots remain private in work/.

## Rebuilding the image

1. Copy the uploaded TZX into `work/ant-attack.tzx`. The recording scripts use this space-free alias. The client on this branch also supports the original spaced filename by quoting it for ZRCP.
2. Hard-reset the emulator and smartload that file. Disable old breakpoint slots individually: `bp_clear` disables the global table but does not erase its conditions.
3. Stop at PC `9700` after loading, using repeated bounded `run(limit=10000000)` until the checkpoint actually fires. Do not assume the first run limit got through both tape blocks. Save `work/entry.sna` at this exact hand-over. It is the canonical image behind listing.json.
4. Disable that checkpoint. Advance 350 display frames to see the publisher/logo sequence, then another 1500 to reach the G/B prompt. Save `work/selection.sna` and `reference/selection.png`.
5. Hold B for 30 frames (`ffffffffffffffef00`), release, advance 800 frames. The introductory story and PRESS ANY KEY appear.
6. Hold Space for 20 frames, release, advance 300 frames. READY WHEN YOU ARE appears, with health/ammo twenty and time 1000.
7. Hold Space for 20 frames, release, advance 100 frames. Save `work/play.sna`. Stop at `8009`, the engine loop input test, and save `work/loop.sna` for control comparisons. A held key is released before each comparison.

Frame counts are display frames, not engine updates. The loop runs with interrupts disabled. ZEsarUX snapshot loads reset the position within a display frame.

## Tape to memory

| Tape item | Bytes | Destination and observation |
|---|---:|---|
| ANT ATTACK, blocks 2–3 | 76 | BASIC bootstrap and machine-code tail. It invokes the ROM tape loader with IX=5C00, DE=A400, pushes return 9700, and is replaced by the next block. |
| Headerless block 4 | 41,984 | Loads at 5C00 through FFFF. All 41,984 bytes equal the hand-over snapshot at that address. |

The loader does not unpack the program. Its paragraph ends here: there is one resident 48K image, with BASIC and Z80 code sharing it. There is no additional load during the inspected engine paths. The title is drawn by BASIC after hand-over; it is not a separate loading picture.

## Snapshot comparisons

The BASIC source 5CCB–7DD9, code 8000–8FFF, event data 9000–93B9, vector page, and masked graphics agree between entry and play. Generated bitmap and temporary terrain/mask buffers differ. Five world-map bytes differ as ant occupancy is removed/reinserted. Runtime state and the ROM's BASIC workspace are excluded from authored coverage.

I=98, IM2: the vector at 98FF/9900 contains 9797. The handler at 9797 chains to ROM 0038 with a normal FF error marker; its error-recovery path enters RUN. The engine's 8000 entry executes DI, and its return executes EI. Code tracing includes computed view entries 8681/86A1/86C1/86E1 and cube entries 8203/8703. Executed loader addresses 5D00–5D7F are skipped in the entry-image code map because BASIC has overwritten that code before hand-over. The unreachable NOP at 852A is retained as code beside the compositor.
