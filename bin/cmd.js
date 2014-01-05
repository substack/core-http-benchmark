#!/usr/bin/env node

var spawn = require('child_process').spawn;
var minimist = require('minimist');
var path = require('path');
var fs = require('fs');
var sprintf = require('sprintf');

var benchmark = require('../');

var argv = minimist(process.argv.slice(2));
if (argv.h || argv.help) return usage(0);

var files = argv._;
if (files.length === 0) {
    files = fs.readdirSync(__dirname + '/bench')
        .filter(function (x) { return path.extname(x) === '.js' })
        .map(function (x) { return path.join(__dirname, 'bench', x) })
    ;
}

var http = argv.r || 'http';
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
        var b = benchmark(uri, argv.n || 20000);
        
        process.stdout.write(sprintf('\r%-12s %3d %%', name, 0));
        b.on('percent', function (percent) {
            process.stdout.write(sprintf('\r%-12s %3d %%', name, percent));
        });
        
        b.on('error', function (err) { console.error(err) });
        b.on('stderr', function (err) { console.error(err) });
        
        b.on('results', function (results) {
            var rps = parseFloat(results['requests per second']);
            process.stdout.write(sprintf('\r%-12s %s\r\n', name, rps));
            
            benchmarks[name] = {
                'requests per second': rps,
                'time per request': parseFloat(results['time per request'])
            };
        });
        
        b.on('exit', function () {
            ps.kill();
            next();
        });
    });
})();

function printSummary () {
    console.log(benchmarks);
}

function usage (code) {
    var r = fs.createReadStream(__dirname + '/usage.txt');
    r.pipe(process.stdout);
    r.on('end', function () {
        if (code !== 0) process.exit(code);
    });
}
