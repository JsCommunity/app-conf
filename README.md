# app-conf [![Build Status](https://travis-ci.org/julien-f/nodejs-app-conf.png?branch=master)](https://travis-ci.org/julien-f/nodejs-app-conf)

## Usage

```javascript
var loadConfig = require("app-conf").load;

loadConfig("my-application").then(function(config) {
  console.log(config);
});
```

The following files are looked up and merged (the latest take
precedence):

- `config.*` in the project directory;
- `/etc/my-application/config.*`;
- `~/.config/my-application/config.*`;
- `/.my-application.*` down to `./.my-application.*` in the current
  working directory.

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
