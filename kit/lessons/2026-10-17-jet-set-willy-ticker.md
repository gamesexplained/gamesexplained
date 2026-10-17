## 0.0.191 · 2026-10-17 · Jet Set Willy (C64) · air with Claude

- **Log an interrupt's memory changes where its code makes them.** A
  Play page's clock that runs the interrupt's handler at once, as it is
  taken, and spends its cycles after, logs every change the handler
  makes where it began. Jet Set Willy's title interrupt at line `$EA`
  copies the ticker's row a character on after the video chip has
  fetched the row on line `$EB`, so on the C64 the moved row shows a
  frame later; logged at `$EA`, it showed in the same frame under the
  old fine scroll, and the text jumped 9 pixels left and 7 back every
  eighth frame. Count the handler's cycles down with the bad lines and
  sprite fetches that hold it, and give `C64.videoMemory` its changes
  where they fall (where its cycles end, when the copy is its last
  work), then draw any scrolling line frame after frame in node and
  hold each move to what the game makes.
