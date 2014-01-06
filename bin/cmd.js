#!/usr/bin/env node

var spawn = require('child_process').spawn;
var minimist = require('minimist');
var path = require('path');
var fs = require('fs');
var sprintf = require('sprintf');
var split = require('split');
var through = require('through');
var url = require('url');

var benchmark = require('../');

var argv = minimist(process.argv.slice(2), {
  alias: { c: 'compare' }
});
if (argv.h || argv.help) return usage(0);

var compare = {};
if (argv.c) {
  var lines = fs.readFileSync(argv.c, 'utf8').split('\n');
  lines.forEach(function (line) {
    var parts = line.split(/\s{2,}/);
    var name = parts[0], p = parts[1], rps = parts[2];
    compare[name + p] = parseFloat(rps);
  });
}

var fancy = argv.fancy !== undefined
  ? argv.fancy
  : Boolean(process.stdout.isTTY)
;

var files = argv._;
if (files.length === 0) {
  files = fs.readdirSync(path.join(__dirname, '..', 'bench'))
    .filter(function (x) { return path.extname(x) === '.js' })
    .map(function (x) { return path.join(__dirname, '..', 'bench', x) })
  ;
}

var http = argv.r || 'http';
if (!http) return usage(1);
try { require.resolve(http) }
catch (e) {
  http = path.resolve(http);
  require.resolve(http);
}

if (argv.b && files.length > 1) {
  console.error('-b only works with a single benchmark file');
  return process.exit(1);
}

var benchmarks = {};

(function next () {
  if (files.length === 0) return;
  
  var file = files.shift();
  var name = path.basename(file).split('.')[0];
  var b = benchmarks[name] = {};
  
  var ps = spawn(process.execPath, [ file, http ]);
  ps.stderr.pipe(process.stderr);
  
  var links = [], first = true;
  if (argv.b) {
    ps.stdout.pipe(split()).pipe(through(function (line) {
      if (!first) return;
      first = false;
      var u = url.parse(line.trim());
      var base = u.protocol + '//' + u.host;
      
      links = [].concat(argv.b).map(function (x) {
        return url.resolve(base, x);
      });
      nextLink();
    }));
  }
  else {
    ps.stdout.pipe(split()).pipe(through(function (line) {
      links.push(line.toString().trim());
      if (first) nextLink();
      first = false;
    }));
  }
  
  function nextLink () {
    if (links.length === 0) {
      ps.kill();
      return next();
    }
    
    var uri = links.shift();
    var u = url.parse(uri);
    var b = benchmark(uri, argv.t || 10);
    var sname = name + '  ' + u.path;
    
    if (fancy) {
      process.stdout.write(sprintf('\r%-40s %3d %%', sname, 0));
      b.on('percent', function (percent) {
        process.stdout.write(sprintf(
          '\r%-40s %3d %%', sname, percent
        ));
      });
    }
    
    b.on('error', function (err) { console.error(err) });
    b.on('stderr', function (err) { console.error(err) });
    
    b.on('results', function (results) {
      var rps = parseFloat(results['requests per second']);
      var key = name + u.path;
      
      if (fancy && compare[key]) {
        var cmp = rps > compare[key]
          ? '\x1b[1m\x1b[32mFASTER\x1b[0m'
          : '\x1b[1m\x1b[31mSLOWER\x1b[0m'
        ;
        process.stdout.write(sprintf(
          '\r%-40s %8f   vs %8f  (%s)\x1b[K\r\n',
          sname, rps, compare[key], cmp
        ));
      }
      else if (fancy) {
        process.stdout.write(sprintf('\r%-40s %8f\x1b[K\r\n', sname, rps));
      }
      else if (compare[key]) {
        var cmp = rps > compare[key] ? 'FASTER' : 'SLOWER';
        console.log(sprintf(
          '%-40s %8f   vs %8f  (%s)', sname, rps, compare[key], cmp
        ));
      }
      else console.log(sprintf('%-40s %8f', sname, rps));
      
      benchmarks[name] = {
        'requests per second': rps,
        'time per request': parseFloat(results['time per request'])
      };
    });
    
    b.on('exit', nextLink);
  }
})();

function usage (code) {
  var r = fs.createReadStream(__dirname + '/usage.txt');
  r.pipe(process.stdout);
  r.on('end', function () {
    if (code !== 0) process.exit(code);
  });
}
