var cluster = require('cluster');
var server = require('./simple.js');
if (cluster.isMaster) {
  cluster.fork();
  cluster.fork();
  server.listen(0);
}
else {
  server.listen(0);
}
