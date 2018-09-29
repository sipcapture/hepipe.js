/*
*       HEPIPE-JANUS 0.1
*       Meetecho Janus Event API to HEP/EEP Utility
*       Copyright 2016 QXIP BV (http://qxip.net)
* Edited by:
* Giacomo Vacca <giacomo.vacca@gmail.com>
* Federico Cabibbu <federico.cabiddu@gmail.com>
*/

var http = require('http');

var Receptacle = require('receptacle');
var db = new Receptacle({ max: 1024 });

var debug = false;
var report_rtcp = false; // Media to RTCP
var log = true; // SIP + Session
const ttl = { ttl: 600000 };

var hep_id;
var hep_pass;
var api_port;
var preHep;

module.exports = {
  connect:function(config, callback_preHep) {
    hep_id = config.HEP_ID;
    hep_pass = config.HEP_PASS;
    api_port = config.API_PORT;
    preHep = callback_preHep;
    debug = config.debug;

    /* HTTP API Receiver */
    http.createServer(function (req, res) {
      var body = "";
      req.on('data', function (chunk) {
        body += chunk;
      });
      req.on('end', function () {
        // console.log(body);
        // Parse Event
        body = JSON.parse(body);
        if(Array.isArray(body)) {
          for(var i in body)
            processJanusEvent(body[i]);
        } else {
          processJanusEvent(body);
        }
        res.writeHead(200);
        res.end();
      });
    }).listen(api_port);
  }
};

/* JANUS Event Handler */
function processJanusEvent(e) {
  // do stuff
  if (debug) console.log('Janus Session-ID: ' + e.session_id);
  if (debug) console.log('Janus Event Type: ' + e.type);

  // No CID no Party! Check handle_id to Call-ID association, Skip if none available
  if (db) {
    if (db.get(e.handle_id)) {
      if (debug) console.log('FOUND HANDLE ID!', db.get(e.handle_id).cid);
      var xcid = db.get(e.handle_id).cid;
    }
  } else { var xcid = e.handle_id; }

  /* EVENT LOGGER */
  if (log) {
    // Log Events to HEP Message
    if(e.type == 64) {
      // Save association Handle-ID > SIP Call-ID
      if(e.event.data['call-id']) {
        db.set(e.handle_id, {cid: e.event.data['call-id']}, ttl);
        xcid = e.event.data['call-id'];
      }

      var ip = '127.0.0.1';

      if(e.event.data['sip']) {
        // Send as SIP type
        var payload = e.event.data['sip'];

        // Format HEP Header
        var message = {
          rcinfo: {
            type: 'HEP',
            version: 3,
            payload_type: 'SIP',
            captureId: hep_id,
            capturePass: hep_pass,
            ip_family: 2,
            protocol: 17,
            proto_type: 1,
            srcIp: ip,
            dstIp: ip,
            srcPort: 0,
            dstPort: 0,
            correlation_id: xcid ? xcid : e.handle_id
          },
          payload: payload
        };

        // Prepare for shipping!
        preHep(message);
      } else {
        // Send as Log type 
        var payload = e.timestamp + ': ';
        payload += JSON.stringify(e.event);

        // Format HEP Header
        var message = {
          rcinfo: {
            type: 'HEP',
            version: 3,
            payload_type: 'JSON',
            captureId: hep_id,
            capturePass: hep_pass,
            ip_family: 2,
            protocol: 17,
            proto_type: 100,
            srcIp: ip,
            dstIp: ip,
            srcPort: 0,
            dstPort: 0,
            correlation_id: xcid ? xcid : e.handle_id
          },
          payload: payload
        };

        // Prepare for shipping!
        preHep(message);
      }
    }
  }
}
