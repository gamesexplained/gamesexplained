## What goes wrong

In the debugger, `keydown` and `keyup` put the key in a queue. Only the cycles timer reads that queue, once every `cycles_per_run` cycles, which is 40,000 in fast debug mode. So when a script presses a key and runs on, the program can check the keyboard before the key has arrived, and miss it.

## How to see it

Press Z at the BASIC prompt and look at the system VIA straight away:

```
./beebjit -headless -fast -debug -commands "breakat 2000000;c;keydown 90;sys;q"
```

The keyboard is scanning itself here, so a key going down should set CA2 at once (bit 0 of the IFR). Instead the IFR reads `00`, and the key only turns up at the next timer tick. `-opt bbc:cycles-per-run=1` works round it, but it makes everything much slower.

## The fix

The debugger runs on the same thread that reads the queue, so `keydown` and `keyup` can read it (`keyboard_read_queue()`) straight after adding the key. A pull request with this follows.
