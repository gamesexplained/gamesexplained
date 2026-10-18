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
