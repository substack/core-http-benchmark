var url = require('url');
var spawn = require('child_process').spawn;
var split = require('split');
var through = require('through');
var EventEmitter = require('events').EventEmitter;

module.exports = benchmark;

function benchmark (uri, n, cb) {
    var u = url.parse(uri);
    var host = u.hostname === 'localhost' ? '127.0.0.1' : u.host;
    uri = u.protocol + '//' + host + (u.port ? ':' + u.port : '') + u.path;
    var bench = new EventEmitter;
    if (cb) {
        bench.on('results', function (res) { cb(null, res) });
        bench.on('error', cb);
    }
    
    var results = {};
    
    var ab = spawn('ab', [ '-n', n, '-c', 100, '-t', 10, uri ]);
    ab.stdout.pipe(split()).pipe(through(function (line) {
        var m;
        if (m = /^(\S[^:]*):\s{2,}(.+)/.exec(line)) {
            var key = m[1].toLowerCase();
            var value = m[2].trim();
            results[key] = value;
        }
    }));
    ab.stderr.pipe(split()).pipe(through(function (line) {
        var m;
        if (m = /^Completed (\d+)/.exec(line)) {
            bench.emit('percent', Math.floor(parseInt(m[1]) / n * 100));
        }
        else if (m = /^Finished (\d+)/.exec(line)) {
            bench.emit('finished', parseInt(m[1]));
        }
        else if (/\S/.test(line)) {
            bench.emit('stderr', line);
        }
    }));
    
    ab.on('exit', function (code) {
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
