# Zak McKracken and the Alien Mindbenders: the music player — verified technical facts

The music's own program: sound 1 on the disk, which the game loads to
`$C300`. Unless marked *live*, a fact comes from reading the code in
`work/music-on.vsf` (`orientation.md`, "Parts"). Addresses outside
`$C300`-`$C735` are the program's, the part main
(`parts/main/facts.md`, "Sound").

## Where it comes from

- Sound 1 is 1,078 bytes in room 47's file, beside the four tunes. Opcode
  `$AB` with 1 (op_music_memory, main `$6183`) takes five pages off the
  top of the heap and loads sound 1 there; the loader puts it at `$C300`
  whatever the heap holds (load_resource, main `$D4FF`-`$D506`, while
  `$61EF` is set). Then the sound's entry in the resource tables is
  forgotten, so the heap never moves it. That fixed address is what makes
  it a load over the program rather than data in a buffer.
- The scripts load it with `$AB 1` four times, in global scripts 1, 78,
  135 and 149, and give the pages back with `$AB 2` twice, in scripts 1
  and 122 (a search of the scripts' bytes; ScummVM's descumm reads `$AB`
  with no operand).
- In `work/music-on.vsf`, saved live while tune 95 plays in the opening,
  `$C300`-`$C735` holds sound 1 as the disk has it, byte for byte, except
  its first four bytes (*live*). Those are the heap block's header that
  write_block_header (main `$D595`) puts over the resource's own: the
  size `$FF00`, left in `$FC14`/`$FC15` by op_music_memory's call of
  alloc_hard, then type 6 and number 1. On the disk the four bytes are
  the size, `$0436`, a 0 and the check byte. In `work/play-bedroom.vsf`,
  after the opening, all 1,078 bytes are still there.

## How it plays a tune

- startMusic (main `$57A5`) calls music_start (`$C304`) with the tune's
  number. It holds the frame interrupt out of the sound engine while it
  works (`$FC31`, read at main `$134F`), stops every sound, builds the
  note lengths and sets up the voices the tune names. From then on
  sound_frame (main `$3FE0`) calls music_frame (`$C395`) every frame
  while the music is on (`$43E8`).
- A tune is a sound resource. After its two size bytes and two more, byte
  4 says which voices it plays (bit 0 for voice 0, and so on), byte 5 is
  its tempo, bytes 6 to 11 are the offsets of the three voices' parts,
  and the word at byte 12 + 2i is the offset of instrument i.
- A voice's part is a list of events. Each is a note (1 to 96), `$FF` for
  a rest or 0 for the end, then a length, then up to two bytes that are
  each an instrument (bit 6 clear) or a cue for the scripts (bit 6 set);
  bit 7 marks an event's last byte (music_frame, `$C395`). A voice reads
  its next event only when the engine has finished its last note, which
  is when the voice's channel is free (`$43E0`).
- The music plays each voice as a sound effect: sounds 3, 4 and 5, which
  are built into the program (main `$4406`, `$4433`, `$4460`). For each
  event it writes the pitch, the length and, with a new instrument, 22
  of the instrument's bytes into that sound, then starts the sound's
  voice part and its pulse width part on the voice's two channels
  (start_channel, main `$40BF`).
- A note's length is an index into a table music_build_lengths (`$C648`)
  makes from the tempo: length k, for k from 1 to 32, starts the note's
  first command with a time of k times the tempo less 2. step_channel
  (main `$414E`) counts a time down once a frame and goes on to the next
  command when it falls below zero, so a time of N lasts N + 1 frames.
  All four tunes have a tempo of 8 and play all three voices.
- The pitch table (`$C673`, `$C6D4`) has a semitone between each note
  and the next from note 1 on (its entry 0 is never read, since a note of
  0 ends a voice's part), and is tuned to an American machine's clock: note 58,
  `$1C31`, is 439.9 Hz on an NTSC machine, the A above middle C, and
  423.8 Hz on a European (PAL) one, about two thirds of a semitone flat.
  The notes the tunes use run from 17 to 96.
- The cues go to variable 17 (`$C447`), which ScummVM calls
  VAR_MUSIC_TIMER. Only tune 95 has any: six in its second voice, all
  of value 2. The opening, global script 1, waits for the variable to
  pass 1 six times and sets it back each time: before it shows room 55,
  and then for each of the five objects it shows there in turn (756 to
  760), so those pictures change on the music's cues.
- When the last voice's part ends, the music turns itself off and counts
  the tune and sounds 3, 4 and 5 once less in use (music_voice_end,
  `$C5D4`). Nothing ever counted sounds 3, 4 and 5 up for the music, so
  their counts, 128 (the lock bit alone) while the opening's tune plays,
  read 127 in `work/play-bedroom.vsf` after it. free_unused_sounds
  (main `$4A50`) passes over sounds 3, 4 and 5 by number, so they stay.

## Odd details

- For a rest, the code loads Y with `$13` (`$C506`), byte 19 of the
  voice's sound, the waveform, and replaces it with `$0D` at `$C511`
  before it stores anything. The note after a rest writes the waveform
  back to byte 19 from `$44A0` (`$C521`), where nothing had changed it.
- An instrument is copied as 5 bytes and then 17 (`$C47A`), but most of
  the tunes' instruments are 15 bytes long and a few 22, and some header
  entries name the same one. After a 15-byte instrument the last seven
  bytes copied are the next one's, or, after a tune's last, what follows
  the tune.
- The music holds its voices in `$43E9`, but begin_sound (main `$3CE7`)
  refuses a sound effect only while the music holds all three; while it
  holds fewer, an effect may take one of its voices that is idle.

## Open questions

- Global scripts 48 and 128, and an object of room 25, start tunes with
  no `$AB 1` of their own. Whether the player is always in memory by then
  was not followed.

## The listing's error rate

All 24 of the part's comments were audited by gpt-6-astra at medium
effort, through Codex, a checker that wrote none of them. It found 4
wrong in a detail, and each was read against the code and held: the
voices the music holds keep sound effects off only when it holds all
three; a note's length is the time its command starts with, which lasts
a frame longer; the pitch table's entry 0 is never read, so the
semitones start at note 1; and the tunes' instruments are not all 15
bytes apart. All 4 were corrected. The same audit is a row of `accuracy`
in `game.json`, which keeps the sample of main's listing as the
listing's measure.
