/*
*	HEPIPE-ESL 0.1
*	FreeSWITCH ESL to HEP/EEP Utility
*	Copyright 2016 QXIP BV (http://qxip.net)
*/

var version = 0.1
console.log("HEPIPE-ESL v"+version+" (http://sipcapture.org)");
console.log("Press CTRL-C to Exit...");

/* Requires */

var esl = require('modesl');
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

var debug = false, report = true, exit = false;
var stats = {rcvd: 0, parsed: 0, hepsent: 0, err: 0, heperr: 0 }; 


/* Command Options */

if(process.argv.indexOf("-d") != -1){ debug = true; }
if(process.argv.indexOf("-s") != -1){ _config_.HEP_SERVER = process.argv[process.argv.indexOf("-s") + 1]; }
if(process.argv.indexOf("-p") != -1){ _config_.HEP_PORT = process.argv[process.argv.indexOf("-p") + 1]; }
if(process.argv.indexOf("-es") != -1){ _config_.ESL_SERVER = process.argv[process.argv.indexOf("-es") + 1]; }
if(process.argv.indexOf("-ep") != -1){ _config_.ESL_PORT = process.argv[process.argv.indexOf("-ep") + 1]; }
if(process.argv.indexOf("-ew") != -1){ _config_.ESL_PASS = process.argv[process.argv.indexOf("-ew") + 1]; }

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
	if (rcinfo) {
		try {
			if (debug) console.log('Sending HEP3 Packet to '+_config_.HEP_SERVER+':'+_config_.HEP_PORT+'...');
			var hep_message = HEPjs.encapsulate(JSON.stringify(msg),rcinfo);
			stats.parsed++;
			if (hep_message) {
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
	if (debug) console.log(msg);
	stats.rcvd++;

	var hrTime = process.hrtime();
	var datenow = new Date().getTime();
	rcinfo.time_sec = Math.floor( datenow / 1000);
	rcinfo.time_usec = datenow - (rcinfo.time_sec*1000);

	if (debug) console.log(rcinfo);
	
	sendHEP3(msg,rcinfo);
	
};



/* FS ESL Handler */

var eslWaitTime = 60000;
function fsConnect() {
  eslConn = new esl.Connection(_config_.ESL_SERVER, _config_.ESL_PORT, _config_.ESL_PASS)
    .on("error", function (error) {
      console.log('ESL Connection Error ' + JSON.stringify(error));
      setTimeout(fsConnect, eslWaitTime);
    }).on("esl::end", function () {
      console.log('ESL Connection Ended');
      setTimeout(fsConnect, eslWaitTime);
    }).on("esl::ready", function () {
      // Subscribe to events
      // eslConn.events('json' , 'ALL', function() {
      eslConn.events('json' , 'CHANNEL_DESTROY', function() {
        console.log('ESL ready - subscribed to receive events.');
      });
    }).on("esl::event::**", function (e, headers, body) {
      // do stuff
      if (debug) console.log(e, 'Event: ' + e.getHeader('Event-Name'));

      	if (report) {

	    if(e.getHeader('Event-Name') != 'CHANNEL_DESTROY') return;
	    if(!e.getHeader('variable_rtp_use_codec_rate')) return;

			var message = {
				rcinfo: {
	                          type: 'HEP',
	                          version: 3,
	                          payload_type: 'JSON',
	                          captureId: _config_.HEP_ID,
	                          capturePass: _config_.HEP_PASS,
	                          ip_family: 2,
	                          protocol: 17,
	                          proto_type: 33,
	                          //  proto_type: 5,
	                          srcIp: e.getHeader('variable_local_media_ip'),
	                          dstIp: e.getHeader('variable_remote_audio_ip_reported'),
	                          srcPort: parseInt(e.getHeader('variable_local_media_port')),
	                          dstPort: parseInt(e.getHeader('variable_remote_audio_port')),
	                          correlation_id: e.getHeader('variable_sip_call_id')
	                  	},

				// HEP Type 5
			        // payload:  { "type":200,"ssrc":1814766290,"report_count":1,"report_blocks":[{"source_ssrc":-1640316609,"fraction_lost":0,"packets_lost":0,"highest_seq_no":783,"lsr":"0","ia_jitter":48,"dlsr":0}],"sender_information":{"packets":379,"ntp_timestamp_sec":"3373905467","ntp_timestamp_usec":"4288694262","rtp_timestamp":-210772703,"octets":7580}}.toString(),

				// HEP Type 33
			        payload: {
					"CORRELATION_ID": e.getHeader('variable_sip_call_id'),
					"RTP_SIP_CALL_ID": e.getHeader('variable_sip_call_id'),
					"JITTER": (parseInt(e.getHeader('variable_rtp_audio_in_jitter_max_variance')) + parseInt(e.getHeader('variable_rtp_audio_in_jitter_max_variance')))/2,
					"REPORT_TS": e.getHeader('Event-Date-Timestamp'),
					"TL_BYTE": parseInt(e.getHeader('variable_rtp_audio_in_media_bytes'))+parseInt(e.getHeader('variable_rtp_audio_out_media_bytes')),
					"TOTAL_PK": parseInt(e.getHeader('variable_rtp_audio_in_packet_count'))+parseInt(e.getHeader('variable_rtp_audio_out_packet_count')),
					"PACKET_LOSS": parseInt(e.getHeader('variable_rtp_audio_in_skip_packet_count'))+parseInt(e.getHeader('variable_rtp_audio_out_skip_packet_count')),
					"MAX_JITTER": e.getHeader('variable_rtp_audio_in_jitter_max_variance'),
					"MIN_JITTER": e.getHeader('variable_rtp_audio_in_jitter_min_variance'),
					"DELTA": e.getHeader('variable_rtp_audio_in_mean_interval'),
					"MOS": e.getHeader('variable_rtp_audio_in_mos'),
					"SRC_IP": e.getHeader('variable_advertised_media_ip'), 
					"SRC_PORT": e.getHeader('variable_local_media_port'), 
					"DST_IP": e.getHeader('variable_remote_media_ip'),
					"DST_PORT": e.getHeader('variable_remote_media_port'),
					"CODEC_PT":e.getHeader('variable_rtp_audio_recv_pt'), 
					"PTIME": e.getHeader('variable_rtp_use_codec_ptime'),
					"CLOCK": e.getHeader('variable_rtp_use_codec_rate'),
					"CODEC_NAME": e.getHeader('variable_rtp_use_codec_name'),
					"TYPE": e.getHeader('Event-Name')
				}
			};
			
		// Prepare for shipping!
		preHep(message);
	}
    });
}

/* Start Loop */

fsConnect();

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
