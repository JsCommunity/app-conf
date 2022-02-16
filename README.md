# app-conf

[![Package Version](https://badgen.net/npm/v/app-conf)](https://npmjs.org/package/app-conf) [![Build Status](https://travis-ci.org/julien-f/nodejs-app-conf.png?branch=master)](https://travis-ci.org/julien-f/nodejs-app-conf) [![PackagePhobia](https://badgen.net/packagephobia/install/app-conf)](https://packagephobia.now.sh/result?p=app-conf) [![Latest Commit](https://badgen.net/github/last-commit/julien-f/nodejs-app-conf)](https://github.com/julien-f/nodejs-app-conf/commits/master)

## Usage

The following files are looked up and merged (the latest take
precedence):

1. **vendor**: `config.*` in the application directory;
1. **global**: `/etc/my-application/config.*`;
1. **user**: `~/.config/my-application/config.*`;
1. **local**: `/.my-application.*` down to `./.my-application.*` in the current
   working directory;

> Note: the **local** config is relative to the current working directory and
> only makes sense for CLIs.

```javascript
var loadConfig = require("app-conf").load;

loadConfig("my-application", {
  // this is the directory where the vendor conf is stored
  appDir: __dirname,

  // default config values
  defaults: {},

  // which types of config should be loaded
  entries: ["vendor", "global", "user", "local"],

  // whether to ignore unknown file formats instead of throwing
  ignoreUnknownFormats: false,
}).then(function (config) {
  console.log(config);
});
```

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

### `watch(opts, cb)`

This method reload the configuration every time it might have changed.

```js
const watchConfig = require("app-conf").watch;

const stopWatching = await watchConfig(
  {
    // contrary to `load`, this option is required
    appDir: __dirname,

    // contrary to `load`, this is part of the options
    appName: "my-application",

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
  }
);
```

### CLI

A basic CLI is available to show the config:

```
> ./node_modules/.bin/app-conf
Usage: app-conf <appName> [<appDir>]

app-conf v1.0.0
> ./node_modules/.bin/app-conf my-app .
```

> Note: To ensure the configuration is parsed the same way as your application (e.g. optional formats), this command should be run from your appliacation directory and not from a global install.

## Contributing

Contributions are _very_ welcome, either on the documentation or on
the code.

You may:

- report any [issue](https://github.com/julien-f/nodejs-app-conf/issues)
  you've encountered;
- fork and create a pull request.

## License

ISC © [Julien Fontanet](http://julien.isonoe.net)
