/*
HEPIPE-JS
(c) 2015 QXIP BV
For License details, see LICENSE

Edited by:
Giacomo Vacca <giacomo.vacca@gmail.com>
Federico Cabibbu <federico.cabiddu@gmail.com>
*/

var fs = require("fs");
var debug = false;

var preHep;
var config;

var hep_id;
var hep_pass;

module.exports = {
  watchFiles:function(logs_config, callback_preHep) {
    preHep = callback_preHep;
    debug = logs_config.debug;
    config = logs_config;
    hep_id = config.HEP_ID;
    hep_pass = config.HEP_PASS;

    for (var i = 0; i < logs_config.logs.length; i++) {
      watchFile(logs_config.logs[i]);
    }
  }
};

function watchFile(logSet){
  var path = logSet.path;
  var currSize = fs.statSync(path).size;
  console.log("["+new Date+"]"+ " Watching '"+path+"' ("+currSize+")");

  var i, rgx;
  var patternList = [];

  if (logSet.pattern.constructor == Array) {
    for (i = 0; i < logSet.pattern.length; i++) {
      console.log("Processing pattern [" + logSet.pattern[i] +"]");   
      rgx = new RegExp(logSet.pattern[i], "");
      patternList.push(rgx);
    }
  } else {
    console.log("Processing pattern [" + logSet.pattern +"]");   
    rgx = new RegExp(logSet.pattern, "");
    patternList.push(rgx);
  }

  setInterval(function() {
    var newSize = fs.statSync(path).size;
    if (newSize > currSize) {
      readChanges(logSet, patternList, currSize, newSize);
      currSize = newSize;
    }   
    else {
      if (newSize < currSize) {
        currSize = newSize;
      }
    }
  }, 1000);
}

function readChanges(logSet, patternList, from, to){
  var file = logSet.path;
  var tag = logSet.tag;
  var host = logSet.host;
  var pattern = logSet.pattern;
  
  var rstream = fs.createReadStream(file, {
    encoding: 'utf8',
    start: from,
    end: to
  });

  rstream.on('data', function(chunk) {
    var last = "";
    data = chunk.trim();
    var lines, i, j;

    lines = (last+chunk).split("\n");
    for(i = 0; i < lines.length - 1; i++) {
      var datenow =  new Date().getTime();
//      stats.rcvd++;
      for (j = 0; j < patternList.length; j++) {
        var cid = (lines[i]).match(patternList[j]);
        if (cid != undefined && cid[1] != undefined ) {
//        stats.parsed++;
          var message = prepareMessage(tag, lines[i], cid[1], host, datenow);
          preHep(message);
	  break;
        }
      }
    }
  }); 
}

function prepareMessage(tag, data, cid, host, datenow) {
  if (debug) console.log('CID: ' + cid + ' DATA:' + data);

  var t_sec = Math.floor(datenow / 1000);

  var message = {
    rcinfo: {
      type: 'HEP',
      version: 3,
      payload_type: 100,
      time_sec: t_sec,
      time_usec: (datenow - (t_sec*1000))*1000,
      ip_family: 2,
      protocol: 6,
      proto_type: 100,
      srcIp: '127.0.0.1',
      dstIp: '127.0.0.1',
      srcPort: 0,
      dstPort: 0,
      captureId: hep_id,
      capturePass: hep_pass,
      correlation_id: cid
    },
    payload: data
  };

  return message;
}
