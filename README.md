# app-conf

[![Package Version](https://badgen.net/npm/v/app-conf)](https://npmjs.org/package/app-conf) [![Build Status](https://travis-ci.org/julien-f/nodejs-app-conf.png?branch=master)](https://travis-ci.org/julien-f/nodejs-app-conf) [![PackagePhobia](https://badgen.net/packagephobia/install/app-conf)](https://packagephobia.now.sh/result?p=app-conf) [![Latest Commit](https://badgen.net/github/last-commit/julien-f/nodejs-app-conf)](https://github.com/julien-f/nodejs-app-conf/commits/master)

## Usage

```javascript
var loadConfig = require("app-conf").load;

loadConfig("my-application", {
  // this is the directory where the vendor conf is stored
  appDir: __dirname,
}).then(function(config) {
  console.log(config);
});
```

The following files are looked up and merged (the latest take
precedence):

1. **vendor**: `config.*` in the application directory;
1. **global**: `/etc/my-application/config.*`;
1. **user**: `~/.config/my-application/config.*`;
1. **local**: `/.my-application.*` down to `./.my-application.*` in the current
   working directory;

> Note: the **local** config is relative to the current working directory and
> only makes sense for CLIs.

Relative paths, string values starting by `./` or `../`, are automatically
resolved from the config file directory.

Paths relative to the home directory, string values starting by `~/`, are also
automatically resolved.

The environment variable `APP_CONF_ENV` can be used to parse environment
specific config files:

1. **vendor**: `${APP_CONF_ENV}.config.*` in the application directory;
1. **global**: `/etc/my-application/${APP_CONF_ENV}.config.*`;
1. **user**: `~/.config/my-application/config.*`;
1. **local**: `/.${APP_CONF_ENV}.my-application.*` down to
   `./.${APP_CONF_ENV}.my-application.*` in the current working directory.

> Note: these files are merged after there respective environment-less
> equivalent.

JSON format is supported natively but you may install the following
packages to have additional features:

- [@iarna/toml](https://www.npmjs.com/package/@iarna/toml): to support [TOML files](https://github.com/toml-lang/toml);
- [ini](https://www.npmjs.org/package/ini): to support INI files;
- [js-yaml](https://www.npmjs.org/package/js-yaml): to support YAML files;
- [json5](https://www.npmjs.com/package/json5): to support advanced JSON files;
- [strip-json-comments](https://www.npmjs.org/package/strip-json-comments): to support comments in JSON files.

## Contributing

Contributions are _very_ welcome, either on the documentation or on
the code.

You may:

- report any [issue](https://github.com/julien-f/nodejs-app-conf/issues)
  you've encountered;
- fork and create a pull request.

## License

ISC © [Julien Fontanet](http://julien.isonoe.net)
