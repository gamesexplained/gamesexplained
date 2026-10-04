# Impossible Mission — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## Run of 1 October 2026 (claude-opus-5-5, one agent, a cloud container)

**The image.** The contributor's file was named `.d64` but its header
read `GCR-1541`: a G64. Renamed in `work/`, it autostarted in VICE with
its default true drive emulation and loaded in about two minutes with
warp on.

**Getting into play.** Fire on port 2 starts the game, but the joystick
then drives the pocket computer's hand, and nothing said which button
turns it off. Clicking through the buttons found it (right-hand block,
middle row, left). After that the stick walks the agent out of the lift.

**Finding the game's entry.** The loader is a chain of KERNAL loads
(`im...`, `bpage`, `load-0800`, `loader2`) ending in a jump to `$B000`.
A stopping execute checkpoint on `$0D00`-`$BFFF` found `$B000`, which is
the `bpage` unpacker, not the game: it moves the program, unpacks it and
jumps to `$3855`. The first hand-over snapshot was saved at `$B000` as
`entry.vsf`; `listing.py` compares the play snapshot with `entry.vsf`
to find untracked authored data, and with the pre-unpack image it found
almost nothing. Renaming the `$3855` snapshot to `entry.vsf` (and the
`$B000` one to `loader-b000.vsf`) turned up 12 KB of authored data the
ledger had not been counting. The loader's three "patched" bytes looked
at first like a sabotage of failing copies; comparing with the file on
the disk showed the opposite: the file is broken and the check repairs it.

**False code under the I/O area.** The tracer followed `jsr $DD03` (the
CIA register used as an `rts`) into the RAM under CIA 2 and decoded the
end picture's screen as code, twice: once at the first trace and again
when `$8396` was disassembled, which re-traced the same call. Each time
the range was set back to undefined; the second time it was typed `byte`
so it stays data.

**Wrong readings corrected on the way.**
- `$BEB8` was first taken for a delay; it adds A to the pointer at
  `$18`. Three descriptions that said "with a pause" were rewritten.
- The interrupt was first described as two a frame everywhere; a hit
  count on `$82F4` in a room showed one a frame there, since a room fills
  the screen and needs no split.
- The text sets were first counted as two; the rooms use a third
  character set at `$5000`, selected by `draw_room` and left alone by the
  interrupt in a room.
- The code room puzzle's reward was first written the wrong way round
  (snooze for even levels); `tbl_counter_offsets` puts lift inits first.
- The terminal's pointer was described as starting on the first choice;
  the live screenshot shows it on LOG OFF.
- The frame header format of the speech data is still not fully
  understood: two attempts to parse the headers with the reading in the
  listing gave one frame per voice line. It stays an open question.

**Untraced code.** Two routines were described but not disassembled,
because they are reached only through a patched `jsr` (`$7FD7`) or the
IRQ vector (`$8396`); `listing.py`'s list of untracked bytes pointed at
the first, a search for comments outside code blocks found the second.

**The web.** The contributor said yes to looking the game up, but the
container's network refused every game site; only the summaries of a
web search could be read, and `features.md` marks those rows "(search)".

## 2 October 2026: the page split into tabs

At the contributor's request the single How it works page was split into
tabs on the pattern of other games' minisites: an Overview, The
stronghold (the room browser and the room record), How it works (the
puzzle pieces, the pocket computer, the robots, time and score), Sound
and speech, and Discoveries (the protection, the phone, the PAL ending,
the claims the code contradicts and the open questions). The content is
the verified material of the single page, regrouped; each page embeds
only the memory excerpts its widgets draw from.

## 4 October 2026: the speech player

The frame headers had been left as an open question: parsing the data by
the listing's reading gave one frame per line. Instead of parsing the
data, the game's own driver was run for each line on the kit's C64 model
with its CIA timers, recording every write to `$D418`, and a port of the
driver was written against that record until both gave the same levels
on the same NMIs for all eight lines. The port showed where the reading
had gone wrong: a header's end-of-line test is bit 7 of the previous
header's byte 3, not of byte 0, and a header covers several decodes of
its samples. Two other slips were corrected on the way: the timer is
CIA 2's timer B, not A, and the comment on `$0BE3` described a decoder
no line uses. The page's first build decoded silence: it embedded the
speech data but not the sample base at `$0CFE`/`$0CFF`, which the port
reads; the browser test now compares whole streams with the checked
ones, not their lengths.
