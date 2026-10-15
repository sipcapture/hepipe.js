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

// FreeSWITCH default log prefix: YYYY-MM-DD HH:MM:SS.microseconds
var FS_LOG_TIMESTAMP = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})(?:\.(\d+))?/;

function parseLogLineTimestamp(line) {
  var match = line.match(FS_LOG_TIMESTAMP);
  if (!match) {
    return null;
  }
  var parsed = new Date(match[1].replace(' ', 'T'));
  if (isNaN(parsed.getTime())) {
    return null;
  }
  if (match[2]) {
    var fraction = match[2];
    var ms = parseInt(fraction.substring(0, 3).padEnd(3, '0'), 10);
    parsed.setMilliseconds(ms);
  }
  var ts = parsed.getTime();
  return {
    timeSeconds: Math.floor(ts / 1000),
    timeUseconds: (ts % 1000) * 1000
  };
}

function readChanges(logSet, patternList, from, to){
  var file = logSet.path;
  var host = logSet.host;

  var rstream = fs.createReadStream(file, {
    encoding: 'utf8',
    start: from,
    end: to
  });

  rstream.on('data', function(chunk) {
    var lines, i, j;

    lines = chunk.split("\n");
    for (i = 0; i < lines.length - 1; i++) {
      for (j = 0; j < patternList.length; j++) {
        var cid = lines[i].match(patternList[j]);
        if (cid != undefined && cid[1] != undefined) {
          var message = prepareMessage(lines[i], cid[1], host);
          preHep(message);
          break;
        }
      }
    }
  });
}

function prepareMessage(data, cid, host) {
  if (debug) console.log('CID: ' + cid + ' DATA:' + data);

  var timestamps = parseLogLineTimestamp(data);
  var datenow = new Date().getTime();
  var timeSeconds = timestamps ? timestamps.timeSeconds : Math.floor(datenow / 1000);
  var timeUseconds = timestamps ? timestamps.timeUseconds : (datenow % 1000) * 1000;
  var logHost = host || '127.0.0.1';

  var message = {
    rcinfo: {
      type: 'HEP',
      version: 3,
      payload_type: 'JSON',
      timeSeconds: timeSeconds,
      timeUseconds: timeUseconds,
      ip_family: 2,
      protocol: 6,
      proto_type: 100,
      srcIp: logHost,
      dstIp: logHost,
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
