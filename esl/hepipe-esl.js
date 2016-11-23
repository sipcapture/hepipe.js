/*
*	HEPIPE-ESL 0.1
*	FreeSWITCH ESL to HEP/EEP Utility
*	Copyright 2016 QXIP BV (http://qxip.net)
*/

var version = 0.2
console.log("HEPIPE-ESL v"+version+" (http://sipcapture.org)");
console.log("Press CTRL-C to Exit...");

/* Requires */

var esl = require('modesl');
var HEPjs = require('hep-js');
var dgram = require('dgram');
var socket = dgram.createSocket("udp4");

var dirty = require('dirty');
var db = dirty('uuid.db');

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

var debug = false; 
var report = true;
var report_rtcp = true;
log = true;
var exit = false;
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
        eslConn.events('json' , 'ALL', function() {
            //eslConn.events('json' , 'CHANNEL_DESTROY', function() {
            console.log('ESL ready - subscribed to receive events.');
        });
    }).on("esl::event::**", function (e, headers, body) {
        // do stuff
        if (debug) console.log('Event: ' + e.getHeader('Event-Name'));
        if (debug) console.log('Unique-ID: ' + e.getHeader('Unique-ID'));

        // No CID no Party! Check B-Leg, A-Leg and Included Header in sequence, Skip if none available
        // if(!e.getHeader('variable_sip_call_id')) {
        // if (debug) console.log('Missing CID!');

        if (db) {
            if (db.get(e.getHeader('Other-Leg-Unique-ID'))) {
                if (debug) console.log('FOUND B-LEG!', db.get(e.getHeader('Other-Leg-Unique-ID')).cid);
                var xcid = db.get(e.getHeader('Other-Leg-Unique-ID')).cid;
            } else if (db.get(e.getHeader('Unique-ID'))) {
                if (debug) console.log('FOUND!', db.get(e.getHeader('Unique-ID')).cid);
                var xcid = db.get(e.getHeader('Unique-ID')).cid;
            } else {
                if (debug) console.log('DEFAULT!', db.get(e.getHeader('variable_sip_call_id')));
                var xcid = e.getHeader('variable_sip_call_id');
            }
        } else { var xcid = e.getHeader('variable_sip_call_id'); }

        /* EVENT LOGGER */
        if (log) {
            var payload = e.getHeader('Event-Date-Local') + ': ';

            // Log Events to HEP Message
            if(e.getHeader('Event-Name')) {
                if(e.getHeader('Event-Name') == 'CHANNEL_CREATE') {
                    if(e.getHeader('Call-Direction') == 'inbound'){
                        // Inbound Call
                        payload +=  'RINGING; ';
                        payload +=  e.getHeader('Call-Direction') + '; ';
                        payload +=  e.getHeader('Caller-Caller-ID-Number') + '; ';
                        payload +=  e.getHeader('Caller-Destination-Number') + '; ';
                        payload +=  e.getHeader('Unique-ID') + '; ';
                        // payload +=  e.getHeader('') + '; ';
                    } else {
                        // Outbound Call
                        payload +=  'RINGING; ';
                        payload +=  e.getHeader('Call-Direction') + '; ';
                        payload +=  e.getHeader('Caller-Callee-ID-Number') + '; ';
                        payload +=  e.getHeader('Caller-Caller-ID-Number') + '; ';
                        payload +=  e.getHeader('Unique-ID') + '; ';
                        // payload +=  e.getHeader('') + '; ';
                    }

                    db.set(e.getHeader('Unique-ID'), {cid: e.getHeader('variable_sip_call_id')}, function() {
                        if (debug) console.log('Session init saved!');
                    });
                } else if(e.getHeader('Event-Name') == 'CHANNEL_ANSWER') {
                    if(e.getHeader('Call-Direction') == 'inbound'){
                        // Inbound Call
                        payload += 'ANSWERED; ';
                        payload +=  e.getHeader('Caller-Caller-ID-Number') + '; ';
                        payload +=  e.getHeader('Unique-ID') + '; ';
                        // payload +=  e.getHeader('') + '; ';
                    } else {
                        // Outbound Call
                        payload += 'ANSWERED; ';
                        payload +=  e.getHeader('Caller-Callee-ID-Number') + '; ';
                        payload +=  e.getHeader('Unique-ID') + '; ';
                        // payload +=  e.getHeader('') + '; ';
                    }

                    db.set(e.getHeader('Unique-ID'), {cid: e.getHeader('variable_sip_call_id')}, function(e) {
                        if (debug) console.log('Session answer saved!' );
                    });
                } else if(e.getHeader('Event-Name') == 'CHANNEL_DESTROY') {
                    if(e.getHeader('Call-Direction') == 'inbound'){
                        // Inbound Call
                        payload += 'HANGUP; ';
                        payload +=  e.getHeader('Caller-Caller-ID-Number') + '; ';
                        payload +=  e.getHeader('Unique-ID') + '; ';
                        // payload +=  e.getHeader('') + '; ';
                    } else {
                        // Outbound Call
                        payload += 'HANGUP; ';
                        payload +=  e.getHeader('Caller-Callee-ID-Number') + '; ';
                        payload +=  e.getHeader('Unique-ID') + '; ';
                        // payload +=  e.getHeader('') + '; ';
                    }

                    db.rm(e.getHeader('Unique-ID'), function(e) {
                        if (debug) console.log('Session UUID has been removed!');
                    });
                } else if(e.getHeader('Event-Name') == 'CUSTOM') {
                    if(e.getHeader('Event-Subclass') === 'sofia::register'){
                        payload += 'REGISTER; ';
                        payload +=  e.getHeader('from-user') + '; ';
                        payload +=  e.getHeader('network-ip') + '; ';
                    } else if(e.getHeader('Event-Subclass') === 'sofia::unregister'){
                        payload += 'UNREGISTER; ';
                        payload +=  e.getHeader('from-user') + '; ';
                        payload +=  e.getHeader('network-ip') + '; ';
                    }
                } else if(e.getHeader('Event-Name') == 'DTMF') {
                    if (debug) console.log('DTMF EVENT',e);
                    payload += e.getHeader('Event-Name') + ' DIGIT: '+e.getHeader('DTMF-Digit') + ' DURATION: '+e.getHeader('DTMF-Duration') + ' FROM:'+ e.getHeader('variable_sip_from_user') + ' TO: ' + e.getHeader('variable_sip_req_user');
                } else {
                    payload += e.getHeader('Event-Name') + '; ' + e.getHeader('Channel-Name') + ' (' + e.getHeader('Event-Calling-Function') + ')';
                }

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
                        srcIp: e.getHeader('FreeSWITCH-IPv4'),
                        dstIp: e.getHeader('FreeSWITCH-IPv4'),
                        srcPort: 0,
                        dstPort: 0,
                        correlation_id: xcid ? xcid : e.getHeader('variable_sip_call_id')
                    },
                    payload: payload
                };

                // Prepare for shipping!
                preHep(message);
            }
        }

        /* RTCP EMULATION */
        if (report_rtcp) {
            if(e.getHeader('Event-Name') == 'RECV_RTCP_MESSAGE') {
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

        /* CUSTOM HEP QoS REPORT */
        if (report) {
            if(e.getHeader('Event-Name') == 'CHANNEL_DESTROY') {
                if(e.getHeader('variable_rtp_use_codec_rate') && e.getHeader('variable_sip_call_id')) {

                    var message = {
                        rcinfo: {
                            type: 'HEP',
                            version: 3,
                            payload_type: 'JSON',
                            captureId: _config_.HEP_ID,
                            capturePass: _config_.HEP_PASS,
                            ip_family: 2,
                            protocol: 17,
                            proto_type: 32,
                            mos: -1,
                            srcIp: e.getHeader('variable_local_media_ip') ?  e.getHeader('variable_local_media_ip') : '127.0.0.1',
                            dstIp: e.getHeader('variable_remote_audio_ip_reported') ? e.getHeader('variable_remote_audio_ip_reported') : '127.0.0.1',
                            srcPort: parseInt(e.getHeader('variable_local_media_port')) ? parseInt(e.getHeader('variable_local_media_port')) : 0,
                            dstPort: parseInt(e.getHeader('variable_remote_audio_port')) ? parseInt(e.getHeader('variable_remote_audio_port')) : 0,
                            correlation_id: xcid ? xcid : e.getHeader('variable_sip_call_id')
                        },
                        // HEP Type 33
                        payload:  JSON.stringify({
                            "CORRELATION_ID": xcid ? xcid : e.getHeader('variable_sip_call_id'),
                            "RTP_SIP_CALL_ID": xcid ? xcid : e.getHeader('variable_sip_call_id'),
                            "JITTER": (parseInt(e.getHeader('variable_rtp_audio_in_jitter_max_variance')) + parseInt(e.getHeader('variable_rtp_audio_in_jitter_max_variance')))/2,
                            "REPORT_TS": parseInt(e.getHeader('Event-Date-Timestamp')),
                            "TL_BYTE": parseInt(e.getHeader('variable_rtp_audio_in_media_bytes'))+parseInt(e.getHeader('variable_rtp_audio_out_media_bytes')),
                            "TOTAL_PK": parseInt(e.getHeader('variable_rtp_audio_in_packet_count'))+parseInt(e.getHeader('variable_rtp_audio_out_packet_count')),
                            "PACKET_LOSS": parseInt(e.getHeader('variable_rtp_audio_in_skip_packet_count'))+parseInt(e.getHeader('variable_rtp_audio_out_skip_packet_count')),
                            "MAX_JITTER": parseFloat(e.getHeader('variable_rtp_audio_in_jitter_max_variance')),
                            "MIN_JITTER": parseFloat(e.getHeader('variable_rtp_audio_in_jitter_min_variance')),
                            "DELTA": parseFloat(e.getHeader('variable_rtp_audio_in_mean_interval')),
                            "MOS": parseFloat(e.getHeader('variable_rtp_audio_in_mos')),
                            "SRC_IP": e.getHeader('variable_advertised_media_ip'),
                            "SRC_PORT": parseInt(e.getHeader('variable_local_media_port')),
                            "DST_IP": e.getHeader('variable_remote_media_ip'),
                            "DST_PORT": parseInt(e.getHeader('variable_remote_media_port')),
                            "CODEC_PT": parseInt(e.getHeader('variable_rtp_audio_recv_pt')),
                            "PTIME": parseInt(e.getHeader('variable_rtp_use_codec_ptime')),
                            "CLOCK": parseInt(e.getHeader('variable_rtp_use_codec_rate')),
                            "CODEC_NAME": e.getHeader('variable_rtp_use_codec_name'),
                            "TYPE": e.getHeader('Event-Name')
                        })
                    };

                    // Prepare for shipping!
                    preHep(message);
                }
            }
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
