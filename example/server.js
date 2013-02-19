var argo = require('argo-server');
var limit = require('../');

var options = {
  capacity: 3,
  duration: 5000,
  burst: 3,
  delay: 1000 
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
