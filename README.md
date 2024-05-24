[![test-workflow][test-workflow-badge]][ci-test]

# stream-repro
Streaming query repro case

## Run

git clone, then:

```bash
# install
npm i

# set to a running Postgres server
export DATABASE_URL=postgres://postgres@localhost:5432/repro

# create a 1-table DB with sample data
npm run initdb

# run
npm start
```

## Test

```bash
npm test
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
[nicholaswmin]: https://github.com/nicholaswmin
