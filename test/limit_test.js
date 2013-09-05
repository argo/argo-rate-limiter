var assert = require("assert"),
    rate_limiter = require("../limit.js");

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
});