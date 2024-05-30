[![test-workflow][test-workflow-badge]][ci-test]

# stream-gotchas
List of corner/edge cases when [streaming JSON][streaming] over HTTP,  
i.e when doing something like:

```js
// this uses 'express' and 'pg' but could be any database, any framework
db.select('*').from('messages').stream().pipe(res)
```

Examples:

- [User aborts request in-flight][cases-ex-1]
- [A stream errors-out in-flight][cases-ex-2]
- [Something happened and I want to send a nicer HTTP status][cases-ex-3]

...and others.

A draft description of each case can be [found here][cases].  
Each case includes tests for its failure and tests for it's solution.

The test suite tests each case (both failure and solution) for:

- **Memory pressure and [memory leaks][memleak]**.
  - Are all streams amenable to garbage collection?
- **Runaway queries**
  - Are database queries still running when they shouldn't?
- **Database connection release**.
  - Does we unnecessarily hold-on to a database connection?

## Install

git clone, then:

```bash
# Run a local Postgres server, then:
export DATABASE_URL=postgres://postgres:123@localhost:5432/repro

# install
npm i

# create a test DB with test data
npm run initdb
```

## Test

To collect accurate runtime statistics, the requests are run in a separate
process, via [httpie][httpie], which you need to install.

Run the test cases:

```bash
npm test
```

### Plot the Garbage Collector

The tests attempt to stress an endpoint so that [Oilpan][oilpan],
the garbage collector, kicks in.

As the heap limits are reached, Oilpan will start freaking out and run ever
more frequent compaction cycles.

Because it's a [stop-the-world][stop-the-world] type of GC,
it tries to avoid unnecessarily running unless it believes it's about to be
OOM-ed.

Heap compaction is a process based on heuristics so sometimes it's best to
view it visually.

To plot the heap while running the tests:

```bash
npm test --plot-gc
```

prints something like this:
```text

client aborts request while in-flight
  when we send one request
    ✔ sends an HTTP 200 and a 20 MB response
  when we send a lot of requests
    ✔ releases database connections back to the pool
*
                                                              -- Heap size following GC --

   Cur: 17 MB
   Max: 42 MB                                                                                   ─── heap size      No leakage
          ╷
    42.00 ┼                     ╭───────╮                    ╭───────╮             ╭───────╮                                                  
    35.17 ┤                     │       │                    │       │             │       │             ╭─────────────────────╮              
    28.33 ┤       ╭─────────────╯       │      ╭─────────────╯       ╰─────────────╯       ╰──────╮      │                     ╰──────╮       
    21.50 ┼───────╯                     ╰──────╯                                                  ╰──────╯                            │       
    14.67 ┤                                                                                                                           ╰──────
     7.83 ┤                                                                                                                                   
     1.00 ┤                                                                                                                                   
          ┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬

   Initial: 18 MB                                                                                                               GC Cycles: 18


    ✔ exhibits memory spikes that return to baseline

```

* Heap statistics are collected immediately following a collection/compaction.

## Additional Reading:

- [Streams Handbook][streams-handbook]
- [Anatomy of an HTTP transaction][anatomy-http]
- [Stream: NodeJS reference][stream-node-ref]

## Authors

@nicholaswmin

MIT License, 2024

[test-workflow-badge]: https://github.com/nicholaswmin/stream-repro/actions/workflows/tests.yml/badge.svg
[ci-test]: https://github.com/nicholaswmin/stream-repro/actions/workflows/tests.yml
[streams]: https://nodejs.org/api/stream.html#readable-streams
[streaming]: https://en.wikipedia.org/wiki/Chunked_transfer_encoding
[nicholaswmin]: https://github.com/nicholaswmin
[httpie]: https://httpie.io/docs/cli/installation
[oilpan]: https://v8.dev/blog/oilpan-library
[cases]: .github/docs/CASES.md#user-aborts-request-mid-flight
[cases-ex-1]: .github/docs/CASES.md#user-aborts-the-request-mid-flight
[cases-ex-2]: .github/docs/CASES.md#processing-streams-error-out-mid-flight
[cases-ex-3]: .github/docs/CASES.md#sending-http-headers-mid-flight
[json]: https://en.wikipedia.org/wiki/JSON
[memleak]: https://en.wikipedia.org/wiki/Memory_leak
[stop-the-world]: https://en.wikipedia.org/wiki/Tracing_garbage_collection#Stop-the-world_vs._incremental_vs._concurrent
[anatomy-http]: https://nodejs.org/en/learn/modules/anatomy-of-an-http-transaction
[streams-handbook]: https://github.com/JasonGhent/stream-handbook-epub
[stream-node-ref]: https://nodejs.org/api/stream.html
