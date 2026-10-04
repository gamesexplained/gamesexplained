## 0.0.22 · 25 September 2026 · Little Computer People, the retrospective's ask · air with Claude

**Under the I/O area, the instruction decides what an address is.** Little
Computer People runs its sound driver in the RAM beneath the chips and
keeps its first label there, `snd_event`, at `$D000`. The disassembler
keeps one label per address, so the raster interrupt's write to sprite 0's
X position read `sta snd_event,y`, and Wizball's sprite shapes at `$D000`
and `$D400` put their names on its video and sound chip writes. The
comments said which meaning was live, and the listing still read wrong.
`listing.py` now names an operand in that range after the chip's register
for code outside it and after the game's symbol for code inside it, and a
register access no longer counts as a reference to the RAM beneath. Code
elsewhere that banks the chips out and touches that RAM is listed in
`game.json` under `io`. Little Computer People has three such stretches:
two between its own writes to `$01`, and a routine called only with the
chips out. The coverage skill says to go through the bank switches and
fill it in.
