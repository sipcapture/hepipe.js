/*
HEPIPE-JS
(c) 2015 QXIP BV
For License details, see LICENSE

Edited by:
Giacomo Vacca <giacomo.vacca@gmail.com>
Federico Cabibbu <federico.cabiddu@gmail.com>
*/

var HEPjs = require('hep-js');
var dgram = require('dgram');
var socket = dgram.createSocket("udp4");

var debug = false; 
var stats = {rcvd: 0, parsed: 0, hepsent: 0, err: 0, heperr: 0 }; 

var hep_server;
var hep_port;
var hep_pass;
var hep_id;

var socket;

module.exports = {
  init:function(config) {
    hep_server = config.HEP_SERVER;
    hep_port = config.HEP_PORT;
    hep_pass = config.HEP_PASS;
    hep_id = config.HEP_ID;
    debug = config.debug;
    socket = dgram.createSocket("udp4");
    socket = getSocket('udp4'); 
  },
  preHep:function(message) {
    var rcinfo = message.rcinfo;
    var msg = message.payload;
    if (rcinfo.correlation_id == null || !(rcinfo.correlation_id.toString().length)) return;
    if (debug) console.log(msg);
    stats.rcvd++;

    var hrTime = process.hrtime();
    var datenow = new Date().getTime();
    rcinfo.time_sec = Math.floor( datenow / 1000);
    rcinfo.time_usec = datenow - (rcinfo.time_sec*1000);

    if (debug) console.log(rcinfo);
    sendHEP3(msg, rcinfo);	
  },
  getStats:function() {
    return stats;
  }
};

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

var sendHEP3 = function(msg,rcinfo){
  if (rcinfo && msg) {
    try {
      if (debug) console.log('Sending HEP3 Packet to '+ hep_server + ':' + hep_port + '...');
      if (! typeof msg === 'string' || ! msg instanceof String) msg = JSON.stringify(msg);
      var hep_message = HEPjs.encapsulate(msg.toString(),rcinfo);
      stats.parsed++;
      if (hep_message && hep_message.length) {
        socket.send(hep_message, 0, hep_message.length, hep_port, hep_server, function(err) {
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
