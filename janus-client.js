/*
*       HEPIPE-JANUS 0.2
*       Meetecho Janus Event API to HEP/EEP Utility
*       Copyright 2016 QXIP BV (http://qxip.net)
* Edited by:
* Lorenzo Mangani <lorenzo.mangani@gmail.com>
* Giacomo Vacca <giacomo.vacca@gmail.com>
* Federico Cabibbu <federico.cabiddu@gmail.com>
*/

var http = require('http');

var dirty = require('dirty');
var db = dirty(); // omit filename for no persistence

var debug = false;
var report_rtcp = false; // Media to RTCP
var log = true; // SIP + Session


var hep_id;
var hep_pass;
var api_port;
var preHep;

var local_ip;
var local_port = 8080;

var caller, callee, method;

const publicIp = require('public-ip');

module.exports = {
  connect:function(config, callback_preHep) {
    hep_id = config.HEP_ID;
    hep_pass = config.HEP_PASS;
    api_port = config.API_PORT;
    preHep = callback_preHep;
    debug = config.debug;

    publicIp.v4().then(extip => {
    	console.log('Ext IP:',extip);
	local_ip = extip ? extip : '127.0.0.1';
    });

    /* HTTP API Receiver */
    http.createServer(function (req, res) {
      var body = "";
      req.on('data', function (chunk) {
        body += chunk;
      });
      req.on('end', function () {
        // console.log(body);
	processJanusEvent(body);
        res.writeHead(200);
        res.end();
      });
    }).listen(api_port);
  }
};

/* JANUS Event Handler */
function processJanusEvent(e) {
  // Parse Event
  e = JSON.parse(e);
  // do stuff
  if (debug) console.log('Janus Session-ID: ' + e.session_id);
  if (debug) console.log('Janus Event Type: ' + e.type);

  // No CID no Party! Check handle_id to Call-ID association, Skip if none available
  if (db) {
    if (db.get(e.handle_id)) {
      if (debug) console.log('FOUND HANDLE ID!', db.get(e.handle_id).cid);
      var xcid = db.get(e.handle_id).cid + "";
      // var xcid = db.get(e.handle_id).session_id;
    }
  } else { var xcid = e.session_id + ""; }

  /* EVENT LOGGER */
  if (log) {
    // Log Events to HEP Message
    if(e.type == 64) {
      // Save association Handle-ID > SIP Call-ID
      if(e.event.data['call-id']) {
	// db.set(e.session_id, {cid: e.event.data['call-id'], handle_id: e.handle_id});
        db.set(e.handle_id, {cid: e.event.data['call-id'], session_id:e.session_id}, function() {
          if (debug) console.log('Session Correlation ' + e.handle_id + ' = ' + e.event.data['call-id']);
        });
        xcid = e.event.data['call-id'];
        // xcid = e.session_id;
      }

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
            protocol: 6,
            proto_type: 1,
            srcIp: local_ip,
            dstIp: local_ip,
            srcPort: 8080,
            dstPort: 8089,
            correlation_id: xcid ? xcid : e.session_id+""
          },
          payload: payload
        };

	// SIP Direction hack
        if (e.event.data['event'] == "sip-in") { message.rcinfo.srcPort = 8089; message.rcinfo.dstPort = 8080; }
        else if (e.event.data['event'] == "sip-out") { message.rcinfo.srcPort = 8080; message.rcinfo.dstPort = 8089; }

        // Prepare for shipping!
        if (message.rcinfo.dstIp && message.rcinfo.srcIp) preHep(message);

      } else {
        // Send as Log type
        //var payload = e.timestamp + ': ';
        var payload = e.session_id + ': ';
	e.event.timestamp = e.timestamp;

	if (e.event.data ) {
	    try {
		if (e.event.data['event']) e.event.method = e.event.data['event'];
		if (e.event.data['identity']) e.event.data.caller = e.event.data['identity'];
		if (e.event.data['username']) e.event.data.caller = e.event.data['username'];
		if (e.event.data['display']) e.event.data.caller = e.event.data['display'];
		if (e.event.data['rooom']) e.event.data.callee = e.event.data['room'];
	    } catch(err) { console.log(err); }
	}

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
            protocol: 6,
            proto_type: 14,
            srcIp: local_ip,
            dstIp: local_ip,
            srcPort: 8080,
            dstPort: 8089,
            correlation_id: xcid ? xcid : e.session_id+""
          },
          payload: payload
        };

        // Prepare for shipping!
        if (message.rcinfo.dstIp && message.rcinfo.srcIp) preHep(message);
      }

    } else if (e.type == 1) {
    // session create/destroy
	// store session_id for transport lookups
      	if(e.session_id && e.event.transport && e.event.transport['id'] ) {
      	  db.set(e.session_id, { transport_id: e.event.transport['id'] }, function() {
      	    if (debug) console.log('Session Pairing: ' + e.session_id + ' + ' + e.event.transport['id'] );
      	  });
      	} else if (e.event.name == "destroyed") {
	  // cleanup db
	  try {
	  	if (db.get(db.get(e.session_id).transport_id)) {
			setTimeout(function() {
			  db.rm(db.get(db.get(e.session_id).transport_id));
			}, 2000);
		  }
		  setTimeout(function() {
		  	db.rm(e.session_id);
		  }, 2000);
	 } catch(err) { console.log(err); }
	}
	return;

    } else if (e.type == 128) {
    // transports, no session_id native
	// store IP for Session for transport lookups
      	if(e.event.id && e.event.data['ip'] && e.event.data['port']) {
      	  db.set(e.event.id, {ip: e.event.data['ip'].replace('::ffff:',''),port: e.event.data['port'] }, function() {
      	    if (debug) console.log('Session Correlation IP: ' + e.event.id + ' = ' + e.event.data['ip'].replace('::ffff:','') + ':' + e.event.data['port']  );
      	  });
      	}
	return;

    } else if (e.type == 32) {
	if (!e.session_id) return;
	// media quality reports - TODO convert to rtcp like for HOMER?
	// lookup of media transport IP - ignoring handle_id or grabbing them all
  	if (db) {
  	  if (e.session_id && db.get(e.session_id)) {
  	    var client_ip = db.get(db.get(e.session_id).transport_id).ip;
  	    var client_port = db.get(db.get(e.session_id).transport_id).port;
  	    if (debug) console.log('FOUND MEDIA SESSION ID!', client_ip+':'+client_port);
  	  } else { 
	    var client_ip = '127.0.0.1';
	    var client_port = '0';
	  }
	}

	// Correlate!
	var uuid = e.session_id + "";

		var rtcp = {
			"timestamp": e.timestamp,
			"type": 200,
			"ssrc": uuid,
			"media": e.event['media'],
			"report_count": 1,
			"report_blocks": [{
				"source_ssrc": e.session_id,
				"fraction_lost": (e.event['packets-received']+e.event['packets-sent'])/100*e.event['lost'],
				"packets_lost": e.event['lost'],
				"highest_seq_no": e.event['packets-received'],
				"lsr": e.event['lsr'],
				"ia_jitter": 0,
				"dlsr": 0
			}],
			"sender_information": {
				"packets": e.event['packets-sent'],
				"ntp_timestamp_sec": "3373905467",
				"ntp_timestamp_usec": "4288694262",
				"rtp_timestamp": -210772703,
				"octets": e.event['bytes-sent']
			}
		};

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
                          proto_type: 5,
                          srcIp: client_ip,
                          dstIp: local_ip,
                          srcPort: client_port,
                          dstPort: local_port,
                          correlation_id: uuid
	          },
	          payload: JSON.stringify(rtcp)
	        };
	        // Prepare for shipping!
		console.log('MEDIA REPORT:',message);
	        if (message.rcinfo.srcIp) preHep(message);

    } else {
	if (!e.session_id) return;

	// log all other messages
	// console.log('OTHER:',e);

	// lookup IP
  	if (db) {
  	  if (e.session_id && db.get(e.session_id)) {
  	    var client_ip = db.get(db.get(e.session_id).transport_id).ip;
  	    var client_port = db.get(db.get(e.session_id).transport_id).port;
  	    if (debug) console.log('FOUND SESSION ID!', client_ip+':'+client_port);
  	  }
  	} else { var xcid = e.handle_id + ""; }

	// Correlate!
	var uuid = e.session_id + "";

        // Send as Log type
        // var payload = e.timestamp + ': ';
        var payload = uuid + ': ';

	e.event.timestamp = e.timestamp;
	if (e.event.jsep) { e.event.method = "JSEP:"+e.event.jsep['type'] }
	else if (e.event.ice) { e.event.method = "ICE:"+e.event.ice }
	else if (e.event.dtls) { e.event.method = "DTLS:"+e.event.dtls }
	else if (e.event.connection) { e.event.method = "Connection:"+e.event.connection }
	else if (e.event['selected-pair']) { e.event.method = "Pair:"+e.event['selected-pair'] }

        payload += JSON.stringify(e.event);

	// Event owner: local|remote
    	if (e.event && e.event.owner && e.event.owner === "remote") {

	        // Format HEP Header
	        var message = {
	          rcinfo: {
	            type: 'HEP',
	            version: 3,
	            payload_type: 'JSON',
	            captureId: hep_id,
	            capturePass: hep_pass,
	            ip_family: 2,
	            protocol: 6,
	            proto_type: 14,
	            dstIp: client_ip,
	            srcIp: local_ip,
	            dstPort: client_port,
	            srcPort: local_port,
	            correlation_id: uuid
	          },
	          payload: payload
	        };
	        // Prepare for shipping!
	        if (message.rcinfo.dstIp && message.rcinfo.srcIp) preHep(message);

	} else {

	        // Format HEP Header
	        var message = {
	          rcinfo: {
	            type: 'HEP',
	            version: 3,
	            payload_type: 'JSON',
	            captureId: hep_id,
	            capturePass: hep_pass,
	            ip_family: 2,
	            protocol: 6,
	            proto_type: 14,
	            srcIp: client_ip,
	            dstIp: local_ip,
	            srcPort: client_port,
	            dstPort: local_port,
	            correlation_id: uuid
	          },
	          payload: payload
	        };
	        // Prepare for shipping!
	        if (message.rcinfo) preHep(message);

     }
  }
  }
}
