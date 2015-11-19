var fs = require("fs");
var http = require("http");
var HEPjs = require('hep-js');

var _config_ = require("./config");
var logs = _config_.LOGS;

var version = 'v0.1';
var debug = false;
var stats = {rcvd: 0, parsed: 0, hepsent: 0, err: 0, heperr: 0 }; 
var hep_proto = { "type": "HEP", "version": 3, "payload_type": "JSON", "captureId": _config_.HEP_ID, "capturePass": _config_.HEP_AUTH, "ip_family": 2};


	var test = "Nov 19 22:05:36 ams2 /usr/sbin/kamailio[1067]: INFO: <script>: Sending reply, fs='udp:127.0.0.1:5060' - ID=11876453@127.0.1.1 TEST";
	var match = test.match(/ID=([^&]\S*)/)
	console.log( 'that: '+match[1] );


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
  var file = logSet.path
  var tag = logSet.tag
  var pattern = logSet.pattern
  var rstream = fs.createReadStream(file, {
    encoding: 'utf8',
    start: from,
    end: to
  });
  rstream.on('data', function(chunk) {
    data = chunk.trim();
    if (data !== '') {
     var cid = data.match(pattern)[1];
     if (cid != undefined) {
	      // post process string
	      preHep(tag,data,cid);
     }
    }
  }); 
}

function preHep(tag,data,cid) {

	console.log('CID: '+cid, 'DATA:'+data);	

/*
	// Build HEP3
	hep_proto.ip_family = 2;
        hep_proto.protocol = 6;
	hep_proto.proto_type = 1;
        hep_proto.srcIp = ret.info.srcaddr;
        hep_proto.dstIp = ret.info.dstaddr;
        hep_proto.srcPort = tcpret.info.srcport;
        hep_proto.dstPort = tcpret.info.dstport;
*/

	// sendHEP3();
}

var sendHEP3 = function(hepmsg, msg, rcinfo){
	if (hepmsg) {
		try {
			if (debug) console.log('Sending HEP3 Packet...');
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
