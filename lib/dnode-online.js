
// DNode Online
// ============

var cache = []

module.exports = function(options) {
  var redis = options.database
    , prefix = (options.prefix || 'online:')
    , remove = (options.remove = true)
    , offset = (options.offset = 60000 * 60 * 24)
    , interval = (options.interval = 60000 * 10)

  if (!redis) throw new Error('redis connection required')

  function clearOld(key, opt, fn) {
    if (!cache.length) return
    opt || (opt = {})
    if ('function' === typeof opt) {
      fn = opt
      opt = {}
    }
    opt.min || (opt.min = '-inf')
    opt.max || (opt.max = new Date().getTime() - offset)
    cache.forEach(function (x) {
      redis.zremrangebyscore(prefix + x, opt.min, opt.max, function(err, resp) {
          if ('function' !== typeof fn) return
          fn(err, resp)
      })
    })
  }
  remove && setInterval(clearOld, interval)

  return function(client, con) {

    this.clearOld = clearOld

    this.online = function(key, opt, fn) {
      opt || (opt = {})
      if ('function' === typeof opt) {
        fn = opt
        opt = {}
      }
      if ('function' !== typeof fn || !key) return
      opt.min || (opt.min = '-inf')
      opt.max || (opt.max = '+inf')
      redis.zrangebyscore(prefix + key, opt.min, opt.max, function(err, resp) {
        console.log('onlined: ', err, resp)
        fn(err, resp)
      })
    }

    this.addOnline = function(key, val, fn) {
      if ('string' !== typeof key) return
      if ('string' !== typeof val) return
      !~cache.indexOf(key) && cache.push(key)
      redis.zadd(prefix + key, new Date().getTime(), val, function(err, resp) {
        if ('function' !== typeof fn) return
        fn(err, resp)
      })
    }

    this.removeOnline = function(key, val, fn) {
      if ('string' !== typeof key) return
      if ('string' !== typeof val) return
      redis.zrem(prefix + key, val, function(err, resp) {
        if ('function' !== typeof fn) return
        fn(err, resp)
      })
    }
  }
}
