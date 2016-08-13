/*
*	HEPIPE-JANUS 0.1
*	Meetecho Janus Event API to HEP/EEP Utility
*	Copyright 2016 QXIP BV (http://qxip.net)
*/

var version = 0.1
console.log("HEPIPE-JANUS v"+version+" (http://sipcapture.org)");
console.log("Press CTRL-C to Exit...");

/* Requires */

var http = require('http');
var HEPjs = require('hep-js');
var dgram = require('dgram');
var socket = dgram.createSocket("udp4");

var dirty = require('dirty');
var db = dirty(); // omit filename for no persistence

	/* Default Config */

	var _config_ = { 
			HEP_SERVER: '127.0.0.1', 
			HEP_PORT: 9060, 
			HEP_PASS: 'multipass', 
			HEP_ID: 2222,
			API_SERVER: '127.0.0.1',
			API_PORT: 8021
	};

var debug = false;
var report_rtcp = false; // Media to RTCP
var log = true; // SIP + Session

var exit = false;
var stats = {rcvd: 0, parsed: 0, hepsent: 0, err: 0, heperr: 0 }; 


/* Command Options */

if(process.argv.indexOf("-d") != -1){ debug = true; }
if(process.argv.indexOf("-s") != -1){ _config_.HEP_SERVER = process.argv[process.argv.indexOf("-s") + 1]; }
if(process.argv.indexOf("-p") != -1){ _config_.HEP_PORT = process.argv[process.argv.indexOf("-p") + 1]; }
if(process.argv.indexOf("-es") != -1){ _config_.API_SERVER = process.argv[process.argv.indexOf("-es") + 1]; }
if(process.argv.indexOf("-ep") != -1){ _config_.API_PORT = process.argv[process.argv.indexOf("-ep") + 1]; }

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



/* JANUS Event Handler */

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
}).listen(API_PORT);


function processJanusEvent(e) {
      // Parse Event
      e = JSON.parse(e);
      // do stuff
      if (debug) console.log('Janus Session-ID: ' + e.getHeader('session_id'));
      if (debug) console.log('Janus Event Type: ' + e.getHeader('type'));

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
		if(e.event.data.call-id) {
		    db.set(e.handle_id, {cid: e.event.data.call-id}, function() {
		    if (debug) console.log('Session Correlation ' + e.handle_id + ' = ' + e.event.data.call-id);
   		});


		var ip = '127.0.0.1';

		if(e.event.data.sip) {
		// Send as SIP type

			var payload = e.event.data.sip;

			// Format HEP Header
			var message = {

				rcinfo: {
	                          type: 'HEP',
	                          version: 3,
	                          payload_type: 'SIP',
	                          captureId: _config_.HEP_ID,
	                          capturePass: _config_.HEP_PASS,
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
	                          captureId: _config_.HEP_ID,
	                          capturePass: _config_.HEP_PASS,
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


	/* RTCP EMULATION */
	if (report_rtcp) {

            if(e.type == 32) {
		/*
		{
		   "type": 32,
		   "timestamp": 25811762929,
		   "session_id": 1143320055091737,
		   "handle_id": 6006260340428864,
		   "event": {
		      "media": "audio",
		      "base": 48000,
		      "lsr": 37971368,
		      "lost": 0,
		      "lost-by-remote": 0,
		      "jitter-local": 44,
		      "jitter-remote": 0,
		      "packets-received": 140,
		      "packets-sent": 141,
		      "bytes-received": 24080,
		      "bytes-sent": 25662,
		      "nacks-received": 0,
		      "nacks-sent": 0
		   }
		}
		*/

		if (!e.getHeader('Source0-SSRC')) {
			if (debug) console.log('Processing RTCP Report...',e);

			var message = {
				rcinfo: {
	                          type: 'HEP',
	                          version: 3,
	                          payload_type: 'JSON',
	                          captureId: _config_.HEP_ID,
	                          capturePass: _config_.HEP_PASS,
	                          ip_family: 2,
	                          protocol: 17,
	                          proto_type: 5,
	                          srcIp: e.getHeader('variable_local_media_ip') ? e.getHeader('variable_local_media_ip') : '127.0.0.1',
	                          dstIp: e.getHeader('variable_remote_audio_ip_reported') ? e.getHeader('variable_remote_audio_ip_reported') : '127.0.0.1',
	                          srcPort: parseInt(e.getHeader('variable_local_media_port')) ? parseInt(e.getHeader('variable_local_media_port')) : 0,
	                          dstPort: parseInt(e.getHeader('variable_remote_audio_port')) ? parseInt(e.getHeader('variable_remote_audio_port')) : 0,
	                          correlation_id: xcid ? xcid : db.get(e.getHeader('Unique-ID')).cid
	                  	},

				// HEP Type 5
			        payload:  JSON.stringify({ 
						"type":200,
						"ssrc": e.getHeader('SSRC'),
						"report_count": parseInt(e.getHeader('Event-Sequence')),
						"report_blocks":[{
						   "source_ssrc": e.getHeader('Source0-SSRC'),
						   "fraction_lost": parseInt(e.getHeader('Source0-Fraction')),
						   "packets_lost": parseInt(e.getHeader('Source0-Lost')),
						   "highest_seq_no": parseInt(e.getHeader('Source0-Highest-Sequence-Number-Received')),
						   "lsr": parseInt(e.getHeader('Source0-LSR')),
						   "ia_jitter": parseFloat(e.getHeader('Source0-Jitter')),
						   "dlsr": parseInt(e.getHeader('Source0-DLSR'))
						}],
						"sender_information":{
							"packets": parseInt(e.getHeader('Sender-Packet-Count')),
							"ntp_timestamp_sec": parseInt(e.getHeader('NTP-Most-Significant-Word')),
							"ntp_timestamp_usec": parseInt(e.getHeader('NTP-Least-Significant-Word')),
							"rtp_timestamp": parseInt(e.getHeader('RTP-Timestamp')),
							"octets": parseInt(e.getHeader('Octect-Packet-Count'))
							}
					  })
				
			};
			
		// Prepare for shipping!
		preHep(message);

	    }

	    }


        }


    });
}



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
