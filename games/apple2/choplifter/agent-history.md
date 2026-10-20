# Choplifter — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 20 October 2026, the first run (Silver)

The contributor asked for Silver, with the game looked up online, its
sound on the page and a comparison with the C64 version
(`games/c64/choplifter`). The image is the A Woz A Day copy of
Broderbund's original disk (`orientation.md`), not a crack.

**The machine.** On the kit's default enhanced IIe the disk loaded for a
few seconds and stopped with a lone `M` on the text screen. The loader
compares stretches of the Monitor ROM with copies it carries, and the
IIe's Monitor differs at `$FB51`. The WOZ's META chunk says
`requires_machine 2|2+`, and 4am's crack notes say the same. Rather
than analyse a crack, the kit's Apple2TS server gained Apple2TS's own
II Plus as a model (`--model iiplus`), with a check-emulator phase that
tells the two apart. Apple2TS's II Plus still runs the 65C02's extra
opcodes; Choplifter uses none, and the tool's `workarounds.md` says so.

**Orient and sweep.** The loader hands over to `$0800` at cycle
10,635,872, and the listing is built from memory at that moment. The
program is modules calling each other through jump tables of `JMP`s.
Flow disassembly stalled early: the graphics library's ten services read
their arguments from the bytes after the call. Every call site was
found and its argument typed as data, and the disassembly went on. The
202 comments on the shape table were written by a script from the
shapes' headers. `kit/apple2/codemap.py` was written so that
`check_listing.py` could hold the code that ran against the listing, as
it does on the C64.

**Verify.** One checker on the same model, which wrote none of the
comments, sampled 80, seed 20261020: 13 wrong, all written by hand,
16.3 %, over the mark. Each was corrected with the comments that held
the same belief, 37 more. One of the checker's own corrections was too
wide: it said a right-hand tank is kept with the helicopter anywhere up
to X `$03FF`, but the helicopter never goes below `$02D0`, so the range
is `$02D0-$034F`; `test_tank.js` holds the page's model to the code at
every X. An audit of the whole listing is recommended (`TODO.md`).

**The attract mode from the listing.** The How it works page runs the
attract mode on the kit's 6502 from the listing. The first run went
wrong in the graphics library: the listing held none of the inline
arguments. They had been typed as data with no label, so the ledger did
not track them and `listing.py` wrote gaps there. It had printed a
warning for each, "likely a missed instruction", which read as not
applying because the bytes were typed. Labelling every argument (138)
fixed it, and one more at `$0C00`, where a fixed edge of the memory map
cut a two-byte argument's span. This is #442 and the 50-coverage edit.
The frames then still differed from Apple2TS's: the game never draws
the ground or the counters' bar, which come from the loading screen,
and the listing does not hold the screen. With both hi-res pages filled
from the hand-over first, every frame tested matched, byte for byte.

**Sound.** `site/lib/apple2-speaker.js` plays a log of speaker clicks.
Each of the nine effects runs from its call site in the listing on the
kit's 6502, and `work/verify/sound.py` showed Apple2TS clicking at the
same spacings, 4 cycles apart throughout. Building it found the noise
routine's two comments wrong: they called it an explosion's, and its
only callers are a tank and a jet firing.

**The pages.** Build-time links turned world X values and the C64
version's addresses inside code spans into links to unrelated records
of this listing; they are plain text now. The C64 page has no
Discoveries tab, so the comparison links to its How it works. There is
no Maps / levels tab: the game has one world, and the level changes only
how many of each enemy may be out, which the How it works section on
the levels shows as a table read from the listing. The comparison with
the C64 version is from its `facts.md` and listing; both versions place
a right-hand tank at the world's far left the same way (the C64's at
`$9F54`).
