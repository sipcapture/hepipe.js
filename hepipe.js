/*
HEPIPE-JS
(c) 2015 QXIP BV
For License details, see LICENSE

Edited by:
Giacomo Vacca <giacomo.vacca@gmail.com>
Federico Cabibbu <federico.cabiddu@gmail.com>
*/

var version = 0.3
console.log("HEPIPE v"+version+" (http://sipcapture.org)");
console.log("Press CTRL-C to Exit...");

var config = require('./config.js');

if (config.hep_config) {
  var hep_client = require('./hep-client.js');
  hep_client.init(config.hep_config);
}
else {
  console.log('Must provide HEP configuration');
  exit;
}

if (config.logs_config) {
  var log_client = require('./log-client.js');
  log_client.watchFiles(config.logs_config, hep_client.preHep);
}

if (config.esl_config) {
  var esl_client = require('./esl-client.js');
  esl_client.connect(config.esl_config, hep_client.preHep);
}

if (config.janus_config) {
  var janus_client = require('./janus-client.js');
  janus_client.connect(config.janus_config, hep_client.preHep);
}

var exit = false;
process.on('SIGINT', function() {
  console.log();
  console.log('Stats:', hep_client.getStats());
  if (exit) {
    console.log("Exiting...");
    process.exit();
  } else {
    console.log("Press CTRL-C within 2 seconds to Exit...");
    exit = true;
    setTimeout(function () {
      exit = false;
    }, 2000)
  }
});
