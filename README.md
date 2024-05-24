[![test-workflow][test-workflow-badge]][ci-test]

# stream-repro
[Streaming query][streams] over HTTP repro case

## Install

git clone, then:

```bash
# install
npm i

# spin up a PG server, then export it as DATABASE_URL
export DATABASE_URL=postgres://postgres:123@localhost:5432/repro

# create a 1-table DB with sample data
npm run initdb
```

Run the test cases:

## Test

```bash
npm test
```

## Run server

There's no point but:

```bash
npm start
```

## Env info

```yml
# machine
MacOS Sonoma @M2 24GB Air
Node: v22.0.0
Chrome: v124.0.6  
```

## Authors

@nicholaswmin

MIT License, 2024

[test-workflow-badge]: https://github.com/nicholaswmin/stream-repro/actions/workflows/tests.yml/badge.svg
[ci-test]: https://github.com/nicholaswmin/stream-repro/actions/workflows/tests.yml
[streams]: https://nodejs.org/api/stream.html#readable-streams
[nicholaswmin]: https://github.com/nicholaswmin