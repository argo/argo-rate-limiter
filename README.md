# argo-rate-limiter

Rate limiting for [argo-server](https://github.com/argo/argo).

## Install

```bash
$ npm install argo-rate-limiter
```

## Example

```javascript
var argo = require('argo-server');
var limit = require('argo-rate-limiter');

var options = {
  capacity: 3,
  duration: 5000,
  burst: 3,
  delay: 100 
};

argo()
  .use(limit(options))
  .get('/greeting', function(addHandler) {
    addHandler('request', function(env, next) {
      env.response.headers['Content-Type'] = 'text/plain';
      env.responseBody = 'Hello World!';
      next(env);
    });
  })
  .listen(process.env.PORT || 1337);
```

## License

MIT
