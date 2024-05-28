# Todo

> @nicholaswmin

- [ ] Add a README
- [ ] Allow detection of max threshold.
 - [ ] Plot the max threshold.
- [ ] Allow passing own config for `plot`, `isLeakingFn`.
- [ ] Fix uptrend detection
 - Fixed but stupidly, I just measure if first/last compaction are within a
   limit.
- [x] Separate backend from plots
- [x] Figure out why I need to call `new Blob([leak])` to leak
      memory in `leaks/always` test.
      - Probably because Oilpan is smart not to allocate memory on a repeating
        string and instead uses a counter. Jamming an `Array` with `Math.random`
        makes it leak.
- [x] Test against low level servers
- [ ] Tests
  - [x] Basic cases
  - [ ] Config
- [ ] Verify correctness with blind tests
- [ ] Publish
