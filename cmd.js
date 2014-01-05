#!/usr/bin/env node

var spawn = require('child_process').spawn;
var minimist = require('minimist');
var through = require('through');
var split = require('split');
var path = require('path');
var fs = require('fs');
var url = require('url');

var argv = minimist(process.argv.slice(2));
var files = argv._;
if (files.length === 0) {
}

var http = argv.r;
if (!http) return usage(1);
try { require.resolve(http) }
catch (e) {
    http = path.resolve(http);
    require.resolve(http);
}

var benchmarks = {};

(function next () {
    if (files.length === 0) return printSummary();
    var file = files.shift();
    var name = path.basename(file).split('.')[0];
    var b = benchmarks[name] = {};
    
    var ps = spawn(process.execPath, [ file, http ]);
    ps.stderr.pipe(process.stderr);
    
    ps.stdout.on('data', function (buf) {
        var uri = buf.toString().trim();
        benchmark(uri, function (err, res) {
            if (err) console.error(err);
            else benchmarks[name] = res;
            
            ps.kill();
            next();
        });
    });
})();

function benchmark (uri, cb) {
    var u = url.parse(uri);
    var host = u.hostname === 'localhost' ? '127.0.0.1' : u.host;
    uri = u.protocol + '//' + host + (u.port ? ':' + u.port : '') + u.path;
console.log(uri);
    
    var results = {};
    
    var ab = spawn('ab', [ '-c', 100, '-t', 10, uri ]);
    ab.stdout.pipe(split()).pipe(through(function (line) {
        console.log('line=', line);
    }));
    ab.stderr.pipe(process.stderr);
    
    ab.on('exit', function (code) {
        if (code === 0) {
            cb(null, results);
        }
        else cb(new Error('non-zero exit code from `ab`'));
    });
}

function printSummary () {
    console.log(benchmarks);
}

function usage (code) {
    console.log('usage: core-http-benchmark -r MODULE [FILES]');
    if (code !== 0) process.exit(code);
}
