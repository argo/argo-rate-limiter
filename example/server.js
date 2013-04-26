var argo = require('argo');
var limit = require('../');

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
      env.response.headers['Content-Type'] = 'text/plain';
      env.responseBody = 'Hello World!';
      next(env);
    });
  })
  .listen(process.env.PORT || 1337);
