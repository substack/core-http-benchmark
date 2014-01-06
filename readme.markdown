# core-http-benchmark

run the http benchmarks from node core

If you were going to write an alternate implementation of the node core http
library in userland, this library would be very handy for that.

# example

![benchmark](example/benchmark.gif)

# usage

```
usage: core-http-benchmark OPTIONS [FILES]

  Run each of the benchmark FILES.

  -t  time to take for each test in seconds, default: 10
  -r  http module to use, default: http
  -b  test a single path from a benchmark file
 
  -c FILE     compare performance against existing benchmark output
  --no-fancy  turn off fancy ansi output (default if not a tty)

```
