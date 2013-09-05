var assert = require("assert"),
	argo = require("argo"),
	Stream = require("stream"),
	util = require("util"),
    rate_limiter = require("../limit.js");

//Mocks for the argo based tests


function Request(){
	this.headers = {};
	Stream.call(this);
}
util.inherits(Request, Stream);

function Response() {
  this.headers = {};
  this.statusCode = 0;
  this.body = '';
  this.writable = true;
  Stream.call(this);
}
util.inherits(Response, Stream);

Response.prototype.setHeader = function(k, v) {
  this.headers[k] = v;
};

Response.prototype.writeHead = function(s, h) {
  this.statusCode = s;
  this.headers = h;
}

Response.prototype.getHeader = function(k) {
  return this.headers[k];
};

Response.prototype.end = function(b) {
  this.body = b;
};


function _getEnv() {
  return { 
    request: new Request(),
    response: new Response(),
    target: {},
    argo: {}
  };
}

//Stock options for README Rate limiter.
var options = {
  capacity: 1,
  duration: 5000, // ms
  burst: 2,
  delay: 1000 //ms
};


describe("argo-rate-limiter", function(){
	it("has an IPAddressRateLimiter and LeakyBucket property", function(){
		assert.ok(rate_limiter.IPAddressRateLimiter);
		assert.ok(rate_limiter.LeakyBucket);
	});

	it("has decrement create a new leaky bucket per IP", function(done){
		var ipAddrLimiter = new rate_limiter.IPAddressRateLimiter(options);
		var address = "127.0.0.1";
		ipAddrLimiter.decrement(address, function(err, result){
			assert.ok(address in ipAddrLimiter.addresses);
			assert.equal(ipAddrLimiter.addresses[address].available, result);
			done();
		});
	});

	it("returns an error if available and availableBurst are both 0", function(done){
		var ipAddrLimiter = new rate_limiter.IPAddressRateLimiter(options);
		var address = "127.0.0.1";
		ipAddrLimiter.decrement(address, function(err, result){
			assert.ok(address in ipAddrLimiter.addresses);
			assert.equal(ipAddrLimiter.addresses[address].available, result);
			ipAddrLimiter.decrement(address, function(err, result){
				assert.ok(address in ipAddrLimiter.addresses);
				ipAddrLimiter.decrement(address, function(err, result){
					assert.equal(err.message, "Bucket overflow.");			
					done();
				});
			});
		});
	});

	it("refreshes the available variable after duration has been exceeded", function(done){
		var ipAddrLimiter = new rate_limiter.IPAddressRateLimiter(options);
		var address = "127.0.0.1";
		ipAddrLimiter.decrement(address, function(err, result){
			assert.ok(address in ipAddrLimiter.addresses);
			assert.equal(ipAddrLimiter.addresses[address].available, result);
			assert.equal(ipAddrLimiter.addresses[address].available, 0);
		});
		var that = this;
		this.done = done;
		setTimeout(function(){
			ipAddrLimiter.decrement(address, function(err, result){
				assert.ok(address in ipAddrLimiter.addresses);
				assert.equal(ipAddrLimiter.addresses[address].available, result);
				assert.equal(ipAddrLimiter.addresses[address].available, 0);
				that.done();
			});
		}, 5000);
	});

	it("returns an X-Remaining-API-Requests header", function(done){
		var env = _getEnv();
		var address = "127.0.0.1";
		env.request = new Request();
		env.request.url = '/hello';
		env.request.method = 'GET';
		env.request.connection = {
			remoteAddress: address
		};
		env.response = new Response();

		
		env.response.end = function(body) {
			assert.equal("0",env.response.getHeader("X-Remaining-API-Requests"));
			done();
		};

		argo()
		.use(rate_limiter(options))
		.get('/hello', function(handle) {
		  handle('request', function(env, next) {
		    env.response.statusCode = 200;
		    env.response.body = "Hello. World.";
		    next(env);
		  });
		})
		.call(env);
	});

	it("returns a 503 error when the rate limit is hit", function(done){
		var server = argo();

		var env = _getEnv();
		var address = "127.0.0.1";
		env.request = new Request();
		env.request.url = '/hello';
		env.request.method = 'GET';
		env.request.connection = {
			remoteAddress: address
		};
		env.response = new Response();

		env.response.end = function(body) {
			assert.equal("0",env.response.getHeader("X-Remaining-API-Requests"));
		};

		var envTwo = _getEnv();
		envTwo.request = new Request();
		envTwo.request.url = '/hello';
		envTwo.request.method = 'GET';
		envTwo.request.connection = {
			remoteAddress: address
		};
		envTwo.response = new Response();

		envTwo.response.end = function(body) {
			assert.equal("0",env.response.getHeader("X-Remaining-API-Requests"));
		};

		var envThree = _getEnv();
		envThree.request = new Request();
		envThree.request.url = '/hello';
		envThree.request.method = 'GET';
		envThree.request.connection = {
			remoteAddress: address
		};
		envThree.response = new Response();

		envThree.response.end = function(body) {
			assert.equal(503,envThree.response.statusCode);
			done();
		};
		
		server
		.use(rate_limiter(options))
		.get('/hello', function(handle) {
		  handle('request', function(env, next) {
		    env.response.statusCode = 200;
		    env.response.body = "Hello. World.";
		    next(env);
		  });
		})
		
		//Hack to mock three simultaneous requests to argo.
		var app = server.build();
		app.flow(env);
		app.flow(envTwo);
		app.flow(envThree);

	});

	it("tracks forwarded requests in leaky bucket algo", function(){
		var env = _getEnv();
		var address = "127.0.0.1";
		var forwardingAddress = "127.0.0.1";
		env.request = new Request();
		env.request.url = '/hello';
		env.request.method = 'GET';
		env.request.headers = {
			"x-forwarded-for":forwardingAddress
		};
		env.request.connection = {
			remoteAddress: address
		};

		var limiter = new rate_limiter.IPAddressRateLimiter(options);
		var ip = limiter.findAddress(env.request);
		assert.equal(forwardingAddress, ip);
	});
});