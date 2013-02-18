var LeakyBucket = function(options) {
  options = options || {};
  
  this.burst = options.burst || 0;
  this.capacity = options.capacity || 1;
  this.duration = options.duration || 30000; //ms
  this.delay = options.delay || -1;

  if (this.delay === -1) {
    this.capacity += this.burst;
  }

  this.available = this.capacity;

  this.burstCallbacks = [];
  this.lastCheck = Date.now();
};

LeakyBucket.prototype.fill = function(cb) {
  if (!this.lastCheck) {
    this.lastCheck = Date.now();
  }

  var since = Date.now() - this.lastCheck;

  if (since >= this.duration) {
    this.available = this.capacity;
  }

  if (this.available === 0) {
    if (this.delay > -1 && this.burstCallbacks.length < this.burst) {
      this.burstCallbacks.push(cb);
      setTimeout(this.dequeue(), this.delay);
      return;
    }

    cb(new Error('Bucket overflow.'));
  } else {
    this.lastCheck = Date.now();
    this.available--;
    cb(null, this.available);
  }
};

LeakyBucket.prototype.dequeue = function() {
  var that = this;
  return function() {
    var cb = that.burstCallbacks.shift();
    that.fill(cb);
  };
};

var IPAddressRateLimiter = function(options) {
  this.options = options || {};
  this.addresses = {};
};

IPAddressRateLimiter.prototype.decrement = function(ip, cb) {
  if (!this.addresses[ip]) {
    this.addresses[ip] = new LeakyBucket(this.options);
  }

  this.addresses[ip].fill(cb);
};

var limit = module.exports = function(options) {
  var limiter = new IPAddressRateLimiter(options);
  return function(addHandler) {
    addHandler('request', function(env, next) {
      var ip = env.request.connection.remoteAddress;

      var forwarded = env.request.headers['x-forwarded-for'];
      if (forwarded) {
        ip = forwarded.split(',')[0];
      }

      limiter.decrement(ip, function(err, remainingRequests) {
        if (err) {
          var body = 'Service is currently unavailable.';
          env.response.writeHead(503, { 'Content-Type': 'text/plain', 'Content-Length': body.length });
          env.response.end(body);
        } else {
          env.response.headers['X-Remaining-API-Requests'] = remainingRequests;
          next(env);
        }
      });
    });
  };
};

limit.IPAddressRateLimiter = IPAddressRateLimiter;
limit.LeakyBucket = LeakyBucket;
