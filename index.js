var url = require('url');
var spawn = require('child_process').spawn;
var split = require('split');
var through = require('through');
var EventEmitter = require('events').EventEmitter;

module.exports = benchmark;

function benchmark (uri, t, cb) {
    var u = url.parse(uri);
    var host = u.hostname === 'localhost' ? '127.0.0.1' : u.host;
    uri = u.protocol + '//' + host + (u.port ? ':' + u.port : '') + u.path;
    var bench = new EventEmitter;
    if (cb) {
        bench.on('results', function (res) { cb(null, res) });
        bench.on('error', cb);
    }
    
    var results = {};
    
    var ab = spawn('ab', [ '-c', 100, '-t', t, uri ]);
    ab.stdout.pipe(split()).pipe(through(function (line) {
        var m;
        if (m = /^(\S[^:]*):\s{2,}(.+)/.exec(line)) {
            var key = m[1].toLowerCase();
            var value = m[2].trim();
            results[key] = value;
        }
    }));
    
    var t0 = Date.now();
    var iv = setInterval(function () {
        var percent = Math.floor(100 * (Date.now() - t0) / 1000 / t);
        bench.emit('percent', Math.max(100, percent));
    }, 100);
    
    ab.stderr.pipe(split()).pipe(through(function (line) {
        var m;
        if (m = /^Completed (\d+)/.exec(line)) {
            bench.emit('completed', parseInt(m[1]));
        }
        else if (m = /^Finished (\d+)/.exec(line)) {
            bench.emit('finished', parseInt(m[1]));
        }
        else if (/\S/.test(line)) {
            bench.emit('stderr', line);
        }
    }));
    
    ab.on('exit', function (code) {
        clearInterval(iv);
        
        if (code === 0) {
            bench.emit('results', results);
        }
        else {
            bench.emit('error', new Error('non-zero exit code from `ab`'));
        }
        bench.emit('exit', code);
    });
    
    return bench;
}
