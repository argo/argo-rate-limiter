# argo-rate-limiter

Rate limiting for [argo](https://github.com/argo/argo).

## Install

```bash
$ npm install argo-rate-limiter
```

## Example

```javascript
var argo = require('argo');
var limit = require('argo-rate-limiter');

// Allow 1 request every 5 seconds.
// Allow bursts of 2 requests every 5 seconds.
// In a burst, delay the excess request by 1 second.
var options = {
  capacity: 1,
  duration: 5000, // ms
  burst: 2,
  delay: 1000 //ms
};

argo()
  .use(limit(options))
  .get('/greeting', function(addHandler) {
    addHandler('request', function(env, next) {
      env.response.setHeader('Content-Type',  'text/plain');
      env.responseBody = 'Hello World!';
      next(env);
    });
  })
  .listen(process.env.PORT || 1337);
```

## Usage

### limit(options)

#### options.capacity

The number of requests allowed.

#### options.duration

The maximum time allowed to consume the requests at capacity (in milliseconds).

#### options.burst

The number of requests allowed in a burst scenario.  Optional.

#### options.delay

A delay applied to excess requests in a burst (in milliseconds).  Optional.

## License

MIT
