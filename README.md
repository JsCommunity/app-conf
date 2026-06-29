# app-conf

[![Package Version](https://badgen.net/npm/v/app-conf)](https://npmjs.org/package/app-conf) [![Build Status](https://github.com/JsCommunity/app-conf/actions/workflows/ci.yml/badge.svg)](https://github.com/JsCommunity/app-conf/actions) [![PackagePhobia](https://badgen.net/packagephobia/install/app-conf)](https://packagephobia.com/result?p=app-conf) [![Latest Commit](https://badgen.net/github/last-commit/JsCommunity/app-conf)](https://github.com/JsCommunity/app-conf/commits/master)

## Usage

The following files are looked up and merged (the latest take
precedence):

1. **vendor**: `config.*` in the application directory;
1. **system**: `/etc/my-application/config.*`;
1. **global**: `~/.config/my-application/config.*`;
1. **local**: `/.my-application.*` down to `./.my-application.*` in the current
   working directory;
1. **env**: environment variables prefixed with the app name (see below);

> Note: the **local** config is relative to the current working directory and
> only makes sense for CLIs.

```javascript
import { load as loadConfig } from "app-conf";

const config = await loadConfig({
  appName: "my-application",

  // this is the directory where the vendor conf is stored
  //
  // vendor config will not be loaded if not defined
  appDir: new URL(".", import.meta.url).pathname,

  // default config values
  defaults: {},

  // which types of config should be loaded
  entries: ["vendor", "system", "global", "local", "env"],

  // whether to ignore unknown file formats instead of throwing
  ignoreUnknownFormats: false,

  // prefix for environment variable overrides
  //
  // defaults to the app name uppercased with non-alphanumeric characters
  // replaced by underscores, e.g. "my-application" → "MY_APPLICATION_"
  //
  // set to false to disable env var overrides entirely
  //envPrefix: "MY_APPLICATION_",
});

console.log(config);
```

> **Deprecated:** `loadConfig(appName, opts)` (two-argument form) still works
> but is deprecated; pass `appName` inside the options object instead.

<details>
<summary>CommonJS</summary>

```javascript
const { load: loadConfig } = require("app-conf");

loadConfig({
  appName: "my-application",
  appDir: __dirname,
  defaults: {},
  entries: ["vendor", "system", "global", "local", "env"],
  ignoreUnknownFormats: false,
}).then((config) => {
  console.log(config);
});
```

</details>

Relative paths, string values starting by `./` or `../`, are automatically
resolved from the config file directory.

Paths relative to the home directory, string values starting by `~/`, are also
automatically resolved.

JSON format is supported natively but you may install the following
packages to have additional features:

- [@iarna/toml](https://www.npmjs.com/package/@iarna/toml): to support [TOML files](https://github.com/toml-lang/toml);
- [cson-parse](https://www.npmjs.com/package/cson-parser): to support CSON files;
- [ini](https://www.npmjs.org/package/ini): to support INI files;
- [js-yaml](https://www.npmjs.org/package/js-yaml): to support YAML files;
- [json5](https://www.npmjs.com/package/json5): to support advanced JSON files;
- [strip-json-comments](https://www.npmjs.org/package/strip-json-comments): to support comments in JSON files.

### Environment variable overrides

Environment variables are the highest-precedence source and always win over
file-based config.

The prefix is derived from the app name by default (`my-application` →
`MY_APPLICATION_`). Use `__` to separate nested keys:

```
MY_APPLICATION_port=8080              → { port: "8080" }
MY_APPLICATION_port=json:8080         → { port: 8080 }
MY_APPLICATION_database__host=db      → { database: { host: "db" } }
MY_APPLICATION_feature__enabled=json:true → { feature: { enabled: true } }
MY_APPLICATION_tags=json:["a","b"]    → { tags: ["a", "b"] }
```

Values are strings by default. Prefix a value with `json:` to parse it as
JSON — numbers, booleans, arrays, and objects are all supported. A malformed
`json:` value throws rather than silently falling back to a string.

Key segments are used **as-is** — their case is not transformed. Use the exact
casing your config schema expects:

```
MY_APPLICATION_port=8080         → { port: "8080" }    ✓ lowercase key
MY_APPLICATION_Port=8080         → { Port: "8080" }    different key
```

### `watch(opts, cb)`

This method reload the configuration every time it might have changed.

```js
const watchConfig = require("app-conf").watch;

const stopWatching = await watchConfig(
  {
    // contrary to `load`, this is part of the options
    appName: "my-application",

    // if set to true the configuration will be loaded before waiting for
    // changes
    //
    // in that case, the returned promise will reject if the initial load
    // failed, or will resolve after the callback has been called with the
    // initial configuration
    //
    // because the async call to `watchConfig()` will not have returned yet,
    // `stopWatching()` will not be available in this first callback call
    initialLoad: false,

    // all other options are passed to load()
  },
  (error, config) => {
    if (error !== undefined) {
      console.warn("loading config has failed");

      // we might not want to retry on changes
      stopWatching();

      return;
    }

    console.log("config has been loaded", config);
  },
);
```

> Note: the vendor config IS NOT watched, but it's loaded as expected.

### `parse(path)`

> Low level function which parses a file using app-conf logic, automatically handling formats and resolving paths.

```js
const parseConfig = require("app-conf").parse;

const config = await parseConfig("config.toml");
```

### CLI

A basic CLI is available to show the config:

```
> ./node_modules/.bin/app-conf
Usage: app-conf [--json | -j] [--watch | -w] [--env-prefix <prefix> | --no-env] [-p <path>]... <appName> [<appDir>]

> ./node_modules/.bin/app-conf my-app .
```

The `-p` flag accepts dot-notation paths (e.g. `-p database.host`) to print a single value or a subset of the configuration. Only top-level keys are supported when multiple `-p` flags are used.

Use `--env-prefix <prefix>` to override the derived env var prefix, or `--no-env` to disable env var overrides entirely.

> Note: To ensure the configuration is parsed the same way as your application (e.g. optional formats), this command should be run from your application directory and not from a global install.

## Contributing

Contributions are _very_ welcome, either on the documentation or on
the code.

You may:

- report any [issue](https://github.com/JsCommunity/app-conf/issues)
  you've encountered;
- fork and create a pull request.

## License

ISC © [Julien Fontanet](http://julien.isonoe.net)
