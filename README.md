# build-start-rebuild-perf

Measures times:

- Build time
- Time to first paint
- Time to app load (checking for a specified element to be rendered)
- Time to finishe a hot reload after a file changed

Parameters:

- `--url` URL to load - defaults to `http://localhost:4200`
- `--file` file to touch to trigger a reload
- `--command` command to start the dev server - defaults to `pnpm start`
- `--waitFor` element selector to wait for before considering the app loaded - defaults to `body`

Output:

```md
| Build | Time to interactive |  App load | Hot reload |
| ----: | ------------------: | --------: | ---------: |
|    4s |             93.32ms | 102.132ms |  504.677ms |
```
