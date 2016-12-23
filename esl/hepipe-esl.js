/*
*	HEPIPE-ESL 0.1
*	FreeSWITCH ESL to HEP/EEP Utility
*	Copyright 2016 QXIP BV (http://qxip.net)
*/

var version = 0.2
console.log("HEPIPE-ESL v"+version+" (http://sipcapture.org)");
console.log("Press CTRL-C to Exit...");

var esl_client = require('./esl-client.js');
var hep_client = require('./hep-client.js');

var hep_config = {
  HEP_SERVER: '127.0.0.1', 
  HEP_PORT: 9060
};

var esl_config = { 
  ESL_SERVER: '127.0.0.1',
  ESL_PORT: 8021,
  ESL_PASS: 'ClueCon',
  HEP_PASS: 'multipass', 
  HEP_ID: 2222,
  report_call_events: false,
  report_rtcp_events: false,
  report_qos_events: false
};

var debug = false; 
var exit = false;

/* Command Options */
if(process.argv.indexOf("-d") != -1){ debug = true; }

if(process.argv.indexOf("-s") != -1){ hep_config.HEP_SERVER = process.argv[process.argv.indexOf("-s") + 1]; }
if(process.argv.indexOf("-p") != -1){ hep_config.HEP_PORT = process.argv[process.argv.indexOf("-p") + 1]; }


if(process.argv.indexOf("-es") != -1){ esl_config.ESL_SERVER = process.argv[process.argv.indexOf("-es") + 1]; }
if(process.argv.indexOf("-ep") != -1){ esl_config.ESL_PORT = process.argv[process.argv.indexOf("-ep") + 1]; }
if(process.argv.indexOf("-ew") != -1){ esl_config.ESL_PASS = process.argv[process.argv.indexOf("-ew") + 1]; }
if(process.argv.indexOf("--call") != -1){ esl_config.report_call_events = true; }
if(process.argv.indexOf("--rtcp") != -1){ esl_config.report_rtcp_events = true; }
if(process.argv.indexOf("--qos") != -1){ esl_config.report_qos_events = true; }
if(process.argv.indexOf("--all") != -1){
  esl_config.report_call_events = true;
  esl_config.report_rtcp_events = true;
  esl_config.report_qos_events = true;
}

hep_client.init(hep_config, debug);
esl_client.connect(esl_config, hep_client.preHep, debug);

 /* Exit */
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
      // console.log("Continuing...");
      exit = false;
    }, 2000)
  }
});
