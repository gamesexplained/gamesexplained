## 0.0.225 · 2026-10-22 · Master of Magic (C64) · air with Claude

- **Look for memory changes in every video bank.** A Play page finds the
  port's changes to memory by comparing it, line by line, with what the
  video chip last saw. `C64.videoMemory` compared only the bank on show,
  and Master of Magic's title shows bank 3 for its picture and bank 0
  for the story line below it. The picture half of its interrupt, at
  line `$30`, moves the story line a character in bank 0; the change was
  found only once bank 0 was on show again, after the scroller half's
  cycles ended past the line, so every fourth frame drew the line a
  character behind its fine scroll, 6 pixels right and then 10 left.
  This was the third scroller to jump a character on a Play tab (Storm's
  and Ghostbusters' in #373, Jet Set Willy's ticker on 17 October), each
  from a different way of placing a change in the frame, and each found
  by eye after the page was published. `videoMemory` now compares every
  bank, and the Play skill asks for a test that draws each scrolling
  line in node.
- **Show the frame due at the page's clock.** The same title's timer
  interrupt holds the main program back until line `$EE`, so a stretch
  of the port can run most of a frame past the page's target. The page
  showed the newest finished frame, and the story moved 4 pixels in 40
  of 579 drawings, and 0 in the next. It now shows the frame the target falls
  after.
