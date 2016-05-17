/*
HEPIPE-JS
(c) 2015 QXIP BV
For License details, see LICENSE
*/

var fs = require("fs");
var HEPjs = require('hep-js');

var _config_ = require("./config");
var logs = _config_.LOGS;

var version = '0.0.3';
var debug = false;
var ztime = true;

/* Options */

if(process.argv.indexOf("-d") != -1){
    debug = true; 
}

if(process.argv.indexOf("-z") != -1){
    ztime = true; 
}

var _config_ = require("./config/default");
if(process.argv.indexOf("-c") != -1){
    _config_ = require(process.argv[process.argv.indexOf("-c") + 1]); 
}

if(process.argv.indexOf("-s") != -1){
    _config_.HEP_SERVER = process.argv[process.argv.indexOf("-s") + 1]; 
}
if(process.argv.indexOf("-p") != -1){
    _config_.HEP_PORT = process.argv[process.argv.indexOf("-p") + 1]; 
}

var stats = {rcvd: 0, parsed: 0, hepsent: 0, err: 0, heperr: 0 }; 
var hep_proto = { "type": "HEP", "version": 3, "payload_type": 100, "captureId": _config_.HEP_ID, "capturePass": _config_.HEP_AUTH, "ip_family": 2};

console.log("HEPipe.js v"+version);
console.log("Press CTRL-C to Exit...");

/* HEP OUT SOCKET */ 

var dgram = require('dgram');
var socket = dgram.createSocket("udp4");

// Start watching all files inf config.LOGS array
for (var i = 0; i < logs.length; i++) {
   watchFile(logs[i]);
}


// Main functions  
function watchFile(logSet){
  var path = logSet.path;
  // get current file-size...
  var currSize = fs.statSync(path).size;
  console.log("["+new Date+"]"+ " Watching '"+path+"' ("+currSize+")");

  // now watch every x msec for file-size changes...
  setInterval(function(){
    var newSize = fs.statSync(path).size;
    if (newSize > currSize) {
      // additions were applied to file...
      readChanges(logSet, currSize, newSize);
      currSize = newSize;
    }   
    else {
      // deletions were applied to file
      if (newSize < currSize) {
        currSize = newSize;
      }
    }
  }, 1000);
}

function readChanges(logSet, from, to){
  var file = logSet.path;
  var tag = logSet.tag;
  var host = logSet.host;
  var pattern = logSet.pattern;
  var rgx = new RegExp(pattern, "");

  var rstream = fs.createReadStream(file, {
    encoding: 'utf8',
    start: from,
    end: to
  });
  rstream.on('data', function(chunk) {
    var last = "";
    data = chunk.trim();
    var lines, i;
    var lastdate;

    lines = (last+chunk).split("\n");
    for(i = 0; i < lines.length - 1; i++) {
    	     var datenow =  new Date().getTime();
	     if (ztime) { if (lastdate == datenow) { datenow += i; } else { lastdate = datenow;} }
    	     stats.rcvd++;
	     var cid = (lines[i]).match(rgx);
	     if (cid != undefined && cid[1] != undefined ) {
		      // post process string
		      stats.parsed++;
		      preHep(tag,lines[i],cid[1],host,datenow);
     	     }
    }

  }); 
}

function preHep(tag,data,cid,host,datenow) {

	if (debug) console.log('CID: '+cid, 'DATA:'+data);	

	hep_proto.time_sec = Math.floor(datenow / 1000);
	hep_proto.time_usec = (datenow - (hep_proto.time_sec*1000))*1000;

	// Build HEP3
	hep_proto.ip_family = 2;
        hep_proto.protocol = 6;
	hep_proto.proto_type = 100;
        hep_proto.srcIp = '127.0.0.1';
        hep_proto.dstIp = '127.0.0.1';
        hep_proto.srcPort = 0;
        hep_proto.dstPort = 0;
	hep_proto.correlation_id = cid;
	// Send HEP3
	sendHEP3(data, hep_proto);
}

var sendHEP3 = function(msg, rcinfo){
	if (rcinfo) {
		try {
			var hep_message = HEPjs.encapsulate(msg,rcinfo);
			if (hep_message) {
				socket = getSocket('udp4'); 
				socket.send(hep_message, 0, hep_message.length, _config_.HEP_PORT, _config_.HEP_SERVER, function(err) {
				stats.hepsent++;
			  	// socket.close();
				});
			}
		} 
		catch (e) {
			console.log('HEP3 Error sending!');
			console.log(e);
			stats.heperr++;
		}
	}
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

/* Stats & Kill Thread */

var exit = false;

process.on('SIGINT', function() {
    console.log();
    console.log('Statistics:', stats);
    console.log("Exiting...");
    process.exit();
});
