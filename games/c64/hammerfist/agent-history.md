# Agent history

## 14 November 2026: orientation and source separation

The contributor requested Silver, allowed game downloads and PR/issues,
specified gpt-6.1-sol and their noreply commit identity, and required
headless VICE, dummy audio, targeted instruction traces/watchpoints for
unclear behaviour, and no optional playthroughs or replays. The kit lists
the named model as proven. Work started on `game/c64/hammerfist` from an
updated main; a dry-run push to the contributor remote succeeded. An
unreferenced identity-check commit showed the supplied author identity.

The installed headless build was retained with explicit permission after
the release lookup found v 3.14.1. Two health checks passed 56 checks and
failed host-key input and an exception in the quirks phase. Matrix input
and exact stops worked. The exception occurred when the checkpoint-list
reply lacked its `checkpoints` field; no claim was made for the remaining
monitor quirks in that phase.

The Fairlight archive supplied two D64 s. A KERNAL serial-byte-return
checkpoint distinguished a progressing load from a frozen picture. The
first loader hand-over at $2800 preserved initialization that the
gameplay sprite cache overwrote. The initial frame capture recorded 63
video writes. Its untrimmed reconstruction differed in 248 pixels,
concentrated on moving sprite lines; that reconstruction was not treated
as an exact published frame.

Several early attempts to invoke later loads from restored/arbitrary
drawing states stalled in the serial reader for LD. Directly calling
LD's first-load entry also returned with an error and was discarded.
Reading the native trampoline showed that the proper later entry is
$339F and the hand-over is $3200. Its serial loader masks CIA interrupts
before banking I/O in, so the final forced route explicitly supplies
port $35 and a clean stack. One fresh-boot chain captured all four
hand-overs. The exact relationship of the earlier stalls to restored
drive state was not established.

The unpacker initially appeared to overwrite itself in the simulator.
The serial OPEN path reads the whole PRG, including its nominal load
address; retaining those first two bytes fixed the input stream. All
payload writes then matched all four live captures with zero differences.
This comparison established the overlay ranges rather than estimating
them from runtime byte differences.

The title printer consumes inline arguments. A first flow trace decoded
credit text as instructions; sixteen inline records were typed as data
and the recursive trace was rebuilt with their resume points. Indirect
player, action-step, room and object-handler tables added further code.
The shared routines and replacement loads were separated into part
folders. Symbols were exported to both owners from the first load's
disassembler session.

The sprite decoder matched load 1 and 2 but failed on load 3. Inspection
of the original comparisons showed its escape byte changes from $C8 to
$48. Reading that immediate from each load fixed all four atlases; all
2,176 bitmap/mirror cases matched the original CPU routines. The room
decoder similarly exposed the fourth load's character-bank destination
of $0810 rather than $0800. All 1,600 tile calls and 32 bank selections
matched after using each load's own operands.

The launcher initially failed to stop VICE because its shell wrapper
executes a binary under the resolved symlink target. The stop pattern was
extended to that target, retaining ERE syntax for pgrep. A real stop
reported the emulator down afterward; the existing isolation tests passed.

## Coverage, verification, and pages

The four native hand-overs established payload ownership. Later listing warnings at resident `$2800/$2904` reflect startup bytes overwritten by sprite-cache output and the zero-page save, rather than extra numbered-load payload. The native trampoline's indexed STA `$2800,X` and decoder's computed cache destination identify those producers.

A recursive code sweep initially skipped a ROM-address constant globally. In the fourth load that address holds music RAM. Restricting ROM-call treatment to the loader callers recovered its missing music instructions. Main player walking data at `$8A9B-$8AFA` was also separated from adjacent code. The final death/drop frame ends at `$AB0B`; `$AB0C` is an executable call prefix. All corresponding local formats and aliases were re-read before export.

The shared listing decoder lacked immediate undocumented NOP `$80`. Its music entry treated the writable request operand as separate data/BRK. Adding the two-byte form and a regression test preserved instruction and carry boundaries. The change also required rebuilding one existing intro listing from its own committed bytes.

The docking allocation contains ten room backgrounds, bounded by its first glyph plane. The other allocations contain eight. The map checks therefore expanded from 1600/32 to 1700/34 tile/bank cases. Records 8/9 are called extra stored backgrounds; a universal reachability claim was deliberately avoided.

Native instruction traces checked YCY/YAY and the original/patched F3 callback, recharge overflow and the fourth-room exception, all three effect-index writes, weapon keys, the F1 cycle, and manual up's 32/33 threshold. A pause store watch stopped after the writer's interrupt; its saved return address identified `$6628` as the writer. Snapshot/frame advance sometimes crashed this headless VICE build, including EXC_BAD_ACCESS SIGSEGV reports. Single-instruction tests completed after restarts. No unsolicited playthrough or replay was added.

The paused presentation used the first-room play snapshot with PC `$662F`, SP `$FF`, port `$35`, interrupts enabled, pause `$B3=$FF`, and border zero. This was a forced presentation state, not a claimed natural-play trajectory. Its exact recorded frame rebuilt with zero differing pixels. The loading portrait's native registers/colour/RAM likewise rebuilt with zero differences. Only the video bytes read by those drawings were embedded.

The independent checker drew no annotations and checked the fixed-seed 80-comment sample alone while the lead waited. It found one wrong-detail: horizontal displacement enters in A, not Y, and the routine derives its sign instead of receiving it in carry. The lead confirmed the code and CPU cases, then corrected all four copied comments. No audit was commissioned or performed. The sample's rate and recommended later audit are in facts.md, game.json, and TODO.md.

The public page tests read functions/data from the authored HTML and original bytes from the committed part listings. They cover every bitmap/reflection, every component/player assembly, all stored actor-animation ticks, every stored room and preview tile, all 1800 widget recharge cases, and the sound button initialization plus 18000 driver calls. There is no Play tab: the agreed tier is Silver.

The initial graphics viewer drew only upper 21-row sprite images and treated actor indices as full-directory indices. A visual review exposed the shortened bodies. Reading `$BE6A` established the actor subdirectory at full-directory index 126. Targeted native tracing executed 241 instructions of resident `$18A0` with distinct upper/lower pixel patterns: the intermediate cache held lower rows 0–13 followed by upper rows 14–20. The recorded gameplay frame changes sprite Y from 157 to 178 and steps its pointers through the joined caches. The corrected viewer draws both 21-row segments. CPU tests now check both images and the intermediate cache for every applicable player/component assembly.

That graphics comparison found 247 repeated descriptions of a lower vertical image as a clipping alternative. All were corrected in every part. Three occurred among the comments the independent checker had passed. The original verdict is retained beside each later finding in the private record, and the settled sample is 4/80 known wrong rather than 1/80. Its accuracy row and facts.md explain the distinction; no second sample or audit was added.

Firefox 159.0 exercised 1188 viewer choices with no console/page errors. The shared SID worklet checker rendered ten seconds of all 30 sound buttons; every non-silent label produced output. Effect 17 produced zero output as labelled. The blank dummy tile-animation record originally selected by default was replaced by the current room's first stream.

After the required native checks and frame captures, the run stopped its VICE process through the kit launcher. The MCP port no longer had a listener.

The authored pages were committed as a draft, then rewritten in a separate copy pass. The final pass explains display registers, sprites, character pictures, sound voices, and stored room sets at their first use on each tab. The sentence changes were checked against the facts and retained the numerical evidence and source links. Copy remains agent-draft for human curation.
