# Balloon Fight — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 18 October 2026: orient

The platform was new, built on the branch this game's branch comes from
(`kit/nes/`, `kit/skills/nes/`, `site/lib/nes.js`), so this is the first
game run on the NES. The emulator checks passed (36 of 36) before the
cartridge went in. The cartridge booted to the title screen within a
second and Start on the first option began a one-player game straight
away; no loader, trainer or menu to get past. The hand-over, title and
first-phase play snapshots were saved, the ROM was found identical at the
hand-over and in play, and the file's PRG and CHR were matched byte for
byte to the CPU's and the PPU's memory. regenerator2000 started on the
play snapshot in its NES mode and traced from the three vectors.

## 19 October 2026: features, coverage, verify

With the lookup allowed, the booklet's scan on the Internet Archive gave
the rules and the scoring table; StrategyWiki, Wikipedia and Data
Crystal the rest; The Cutting Room Floor and NesCartDB refused the fetch.
The whole 16 KB was read in eight 2 KB dumps from the disassembler and
annotated in one pass, RAM first; the ledger reached 100 % after the
automatic symbols inside the tables and the RAM arrays were described
too. Two wrong turns: typing the split pointer tables `lo_hi_address`
minted bogus symbols in the middle of routines (the disassembler
pairs each half-table with its label, not with the other half), so they
went back to bytes; and the sound effects were named from the request
bits as the callers set them, which the driver reads in another order.
Recording every request bit from a paused game, where only the NMI
runs, showed which routine answers which bit and corrected five names;
the same recordings then held the page's driver port to the emulator
write for write. The sample check found 13 of 60 comments wrong, three
of them the kind a reader of one routine makes (a spring read as
easing, a 0 that ends a stream read as a rest, two register blocks
swapped), all corrected with their repeats. The flight port's first
version ignored the three-frame input cycle and the idle-action lockout
and failed; the second mirrors `actor_animate` and matches over 35,000
frames.

## 19 October 2026: minisite and retrospective

The sound player runs the game's driver on the kit's 6502 with a hook at
every store to the APU, through a new model of the chip in
`site/lib/apu.js`; its writes matched the emulator's recordings for every
tune and effect. The phase renderer reads the layout records as the
game does and matched the emulator's screen for all sixteen indexes once
the propeller quadrants and the bonus round's sprite palette were read
right. The flight widget is the game's flap and physics, tested in
lockstep. The pages were checked in headless Chrome. The run ends at
Silver with the one sample over the mark and an audit recommended.
