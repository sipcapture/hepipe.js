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
			HEP_ID: 2222 
		};

var debug = false, report = true, exit = false;
var stats = {rcvd: 0, parsed: 0, hepsent: 0, err: 0, heperr: 0 }; 


/* Command Options */

if(process.argv.indexOf("-d") != -1){ debug = true; }
if(process.argv.indexOf("-s") != -1){ _config_.HEP_SERVER = process.argv[process.argv.indexOf("-s") + 1]; }
if(process.argv.indexOf("-p") != -1){ _config_.HEP_PORT = process.argv[process.argv.indexOf("-p") + 1]; }

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

var hep_proto = { "type": "HEP", "version": 3, "payload_type": 100, "captureId": _config_.HEP_ID, "capturePass": _config_.HEP_AUTH, "ip_family": 2};

var sendHEP3 = function(msg,rcinfo){
	if (rcinfo) {
		try {
			if (debug) console.log('Sending HEP3 Packet to '+_config_.HEP_SERVER+':'+_config_.HEP_PORT+'...');
			var hep_message = HEPjs.encapsulate(msg,rcinfo);
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
	if (message.pause && message.pause > 0) {
		pause += message.pause;
		setTimeout(function() {
		    // delayed ts
		    var datenow = new Date().getTime();
		    rcinfo.time_sec = Math.floor( datenow / 1000);
		    rcinfo.time_usec = datenow - (rcinfo.time_sec*1000);
		    sendHEP3(msg,rcinfo);
		    process.stdout.write("rcvd: "+stats.rcvd+", parsed: "+stats.parsed+", hepsent: "+stats.hepsent+", err: "+stats.err+", heperr: "+stats.heperr+"\r");
		}, pause);
	} else {
		sendHEP3(msg,rcinfo);
	}
};



/* FS ESL Handler */

conn = new esl.Connection('127.0.0.1', 8021, 'ClueCon', function() {

   conn.subscribe([
          //  'CHANNEL_CREATE',
          //  'CHANNEL_CALLSTATE',
          //  'CHANNEL_STATE',
          //  'CHANNEL_EXECUTE',
          //  'CHANNEL_EXECUTE_COMPLETE',
            'CHANNEL_DESTROY'
        ], function(data) {
		// console.log('event',this);
		console.log('ESL Client Connected');
        }
   );

    conn.api('status', function(res) {
        //res is an esl.Event instance
        console.log(res.getBody());
    });
   
   
});

if (debug) {
	conn.on('esl::event::**', function(e) {
            console.log(e, 'Event: ' + e.getHeader('Event-Name'));
        });
}

if (report) {
	conn.on('esl::event::**', function(e) {

	    if(e.getHeader('Event-Name') != 'CHANNEL_DESTROY') return;
	    if(!e.getHeader('variable_rtp_use_codec_rate')) return;

            if (debug) console.log(e, 'Event: ' + e.getHeader('Event-Name'));

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
                          srcIp: e.getHeader('variable_local_media_ip'),
                          dstIp: e.getHeader('variable_remote_audio_ip_reported'),
                          srcPort: parseInt(e.getHeader('variable_local_media_port')),
                          dstPort: parseInt(e.getHeader('variable_remote_audio_port')),
                          correlation_id: e.getHeader('variable_sip_call_id')
                  	},
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
			}.toString()
		};

		// Prepare for shipping!
		preHep(message);
		

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
