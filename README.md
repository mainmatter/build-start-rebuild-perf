# build-start-rebuild-perf

Measures web app performance metrics:
- Dev server startup time
- Time to first paint
- Time to app load (waiting for an element selector)
- Reload time after a file changes

Thanks to [Discorse](https://github.com/discourse/discourse/blob/7729810716210a0354b3b4d40006c3b12a92d14d/vite-perf-test.mjs) for providing inspiration for this script.

## Usage

```sh
pnpm dlx build-start-rebuild-perf [options]
```

### Example

```sh
# assuming running in an Ember project with a <img class="logo" /> in the app layout
pnpm dlx build-start-rebuild-perf --file "app/router.js" --wait-for ".logo"
```

## Options

```
	-u, --url <url>            URL to load (default: "http://localhost:4200")
	-f, --file <path>          File to touch to trigger a reload (no default, but app/router.js is an option)
	-c, --command <cmd>        Command to start dev server (default: "pnpm start")
	-w, --wait-for <selector>  Element selector to wait for (default: "body")
	-l, --log-level <level>    Set the log level (choices: "log", "warn", "error")
	-h, --help                 display help for command
```

## Example Output

```md
# Performance Results

| Dev Server Ready | First Paint | App Loaded | Reload after change |
| ---------------- | ----------- | ---------- | ------------------- |
| 5,523 ms         | 5,618 ms    | 6,142 ms   | 918 ms              |
```

## Share with us

Assuming you're in an Ember project and wondering if moving to Vite from the old Ember CLI is worth it, here's how you can use the script to create useful numbers:

1. Start on your `main` branch or anywhwere you're still using Ember CLI with Webpack and Embroider
2. Clear all caches (browser, build, etc) and remove your `node_modules`
3. Run `pnpm install` to reinstall dependencies
4. Run `build-start-rebuild-perf` once to get numbers for a cold start
5. Run `build-start-rebuild-perf` again to measure a warm start
6. Move to your `vite` branch where you enabled the new Vite based Embroider
7. Repeat steps 2-5.

Share a your results with the Ember Initiative via [email](https://mainmatter.com/contact/), or [Mastodon](https://fosstodon.org/@mainmatter), or [Bluesky](https://bsky.app/profile/mainmatter.com).

---

## License

This project is part of the [Ember Initative](https://mainmatter.com/ember-initiative/). It is developed by and &copy; [Mainmatter GmbH](http://mainmatter.com) and contributors. It is released under the [MIT License](./LICENSE).
