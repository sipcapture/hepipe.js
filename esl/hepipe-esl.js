/*
*	HEPIPE-ESL 0.1
*	FreeSWITCH ESL to HEP/EEP Utility
*	Copyright 2016 QXIP BV (http://qxip.net)
*/

var version = 0.2
console.log("HEPIPE-ESL v"+version+" (http://sipcapture.org)");
console.log("Press CTRL-C to Exit...");

/* Requires */
var esl_client = require('./esl-client.js');


var HEPjs = require('hep-js');
var dgram = require('dgram');
var socket = dgram.createSocket("udp4");


/* Default Config */
var _config_ = { 
  HEP_SERVER: '127.0.0.1', 
  HEP_PORT: 9060, 
  HEP_PASS: 'multipass', 
  HEP_ID: 2222,
  ESL_SERVER: '127.0.0.1',
  ESL_PORT: 8021,
  ESL_PASS: 'ClueCon'
};

var debug = false; 
var report_call_events = false;
var report_rtcp_events = false;
var report_qos_events = false;
var exit = false;
var stats = {rcvd: 0, parsed: 0, hepsent: 0, err: 0, heperr: 0 }; 

/* Command Options */
if(process.argv.indexOf("-d") != -1){ debug = true; }
if(process.argv.indexOf("-s") != -1){ _config_.HEP_SERVER = process.argv[process.argv.indexOf("-s") + 1]; }
if(process.argv.indexOf("-p") != -1){ _config_.HEP_PORT = process.argv[process.argv.indexOf("-p") + 1]; }
if(process.argv.indexOf("-es") != -1){ _config_.ESL_SERVER = process.argv[process.argv.indexOf("-es") + 1]; }
if(process.argv.indexOf("-ep") != -1){ _config_.ESL_PORT = process.argv[process.argv.indexOf("-ep") + 1]; }
if(process.argv.indexOf("-ew") != -1){ _config_.ESL_PASS = process.argv[process.argv.indexOf("-ew") + 1]; }
if(process.argv.indexOf("--call") != -1){ report_call_events = true; }
if(process.argv.indexOf("--rtcp") != -1){ report_rtcp_events = true; }
if(process.argv.indexOf("--qos") != -1){ report_qos_events = true; }
if(process.argv.indexOf("--all") != -1){
  report_call_events = true;
  report_rtcp_events = true;
  report_qos_events = true;
}

/* UDP Socket Handler */

var getSocket = function (type) {
  if (undefined === socket) {
    socket = dgram.createSocket(type);
    socket.on('error', socketErrorHandler);

    /**
    * Handles socket's 'close' event,
    * recover socket in case of unplanned closing.
    */
    var socketCloseHandler = function () {
      if (socketUsers > 0) {
        socket = undefined;
        --socketUsers;
        getSocket(type);
      }
    };
    socket.on('close', socketCloseHandler);
  }
  return socket;
}

var socket = dgram.createSocket("udp4");
socket = getSocket('udp4'); 

/* HEP Handler */
var sendHEP3 = function(msg,rcinfo){
  if (rcinfo && msg) {
    try {
      if (debug) console.log('Sending HEP3 Packet to '+_config_.HEP_SERVER+':'+_config_.HEP_PORT+'...');
      if (! typeof msg === 'string' || ! msg instanceof String) msg = JSON.stringify(msg);
      var hep_message = HEPjs.encapsulate(msg.toString(),rcinfo);
      stats.parsed++;
      if (hep_message && hep_message.length) {
        socket.send(hep_message, 0, hep_message.length, _config_.HEP_PORT, _config_.HEP_SERVER, function(err) {
          stats.hepsent++;
        });
      } else { console.log('HEP Parsing error!'); stats.heperr++; }
    } 
    catch (e) {
      console.log('HEP3 Error sending!');
      console.log(e);
      stats.heperr++;
    }
  }
}

var preHep = function(message) {
  var rcinfo = message.rcinfo;
  var msg = message.payload;
  if (rcinfo.correlation_id == null || ! rcinfo.correlation_id.length ) return;
  if (debug) console.log(msg);
  stats.rcvd++;

  var hrTime = process.hrtime();
  var datenow = new Date().getTime();
  rcinfo.time_sec = Math.floor( datenow / 1000);
  rcinfo.time_usec = datenow - (rcinfo.time_sec*1000);

  if (debug) console.log(rcinfo);
  sendHEP3(msg,rcinfo);	
};


esl_client.init(_config_.HEP_ID, _config_.HEP_PASS, report_call_events, report_rtcp_events, report_qos_events);
esl_client.connect(_config_.ESL_SERVER, _config_.ESL_PORT, _config_.ESL_PASS, preHep);

 /* Exit */
process.on('SIGINT', function() {
  console.log();
  console.log('Stats:',stats);
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
