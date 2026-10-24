## next · 2026-10-24 · Master of Magic (C64) · air with Claude

- **Give the sound a page streams half a second of queue.** A Play tab
  sends what its game writes to the sound chip to the audio thread, a
  frame or so at a time, and the chip's model there plays it one call
  at a time from a queue. Master of Magic's page kept 48 calls of a
  twelfth of a frame each, 80 ms, and its music skipped badly. The queue
  has to hold the page's uneven frames and the audio device's buffer
  together. The page's sends, recorded in headless Chromium and replayed
  at a device's pace, held with a buffer of 128 or 512 samples; at 2,048
  the music stalled 17 times and skipped 20 times in 20 seconds, at
  4,096 234 and 95 times. In the real worklet with a 100 ms buffer
  (`latencyHint: 0.1`) it stalled and skipped about 130 times a second;
  with half a second of queue it settled within the first second and
  skipped nothing. Jet Set Willy's page had the same 80 ms, Storm's
  160 ms, and the Spectrum's and C16's Play tabs 4 frames; the other
  pages, each with a copy of the queue, half a second. `site/lib/sid.js`
  now keeps the queue for every C64 Play tab (`host({ live: true })`),
  the AY's and TED's hold half a second, and
  `kit/scripts/test_live_sound.js` fails a shorter one, and a Play page
  with a queue of its own.
