/*
*	HEPIPE-ESL 0.1
*	FreeSWITCH ESL to HEP/EEP Utility
*	Copyright 2016 QXIP BV (http://qxip.net)
*
* Edited by:
* Giacomo Vacca <giacomo.vacca@gmail.com>
* Federico Cabibbu <federico.cabiddu@gmail.com>
*/

var eslWaitTime = 60000;
var debug = false;

var Receptacle = require('receptacle');
var db = new Receptacle({ max: 1048576 });

var report_call_events = false;
var report_rtcp_events = false;
var report_qos_events = false;
var report_custom_events = false;
var log = true;

var hep_id;
var hep_pass;

var esl = require('modesl');

var ttl = { ttl: 86400000 };

module.exports = {
  connect: function (config, callback_preHep) {
    host = config.ESL_SERVER;
    port = config.ESL_PORT;
    pass = config.ESL_PASS;
    hep_id = config.HEP_ID;
    hep_pass = config.HEP_PASS;
    report_call_events = config.report_call_events;
    report_rtcp_events = config.report_rtcp_events;
    report_qos_events = config.report_qos_events;
    report_custom_events = config.report_custom_events;
    debug = config.debug;
    eslConnect(host, port, pass, callback_preHep);
  }
};

var eslConnect = function (host, port, pass, callback_preHep) {
  if (debug) console.log("host: " + host + ", port: " + port + ", pass: " + pass);

  eslConn = new esl.Connection(host, port, pass)
    .on("error", function (error) {
      console.log('ESL Connection Error ' + JSON.stringify(error));
      setTimeout(function () { eslConnect(host, port, pass, callback_preHep); }, eslWaitTime);
    }).on("esl::end", function () {
      console.log('ESL Connection Ended');
      setTimeout(function () { eslConnect(host, port, pass, callback_preHep); }, eslWaitTime);
    }).on("esl::ready", function () {
      eslConn.events('json', 'ALL', function () {
        console.log('ESL ready - subscribed to receive events.');
      });
    }).on("esl::event::**", function (e, headers, body) {
      if (debug) console.log('Event: ' + e.getHeader('Event-Name'));
      if (debug) console.log('Unique-ID: ' + e.getHeader('Unique-ID'));

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

      if (log) {
        var payload = e.getHeader('Event-Date-Local') + ': ';
        if (e.getHeader('Event-Name')) {
          if (e.getHeader('Event-Name') == 'CHANNEL_CREATE') {
            if (e.getHeader('Call-Direction') == 'inbound') {
              payload += 'RINGING; ';
              payload += e.getHeader('Call-Direction') + '; ';
              payload += e.getHeader('Caller-Caller-ID-Number') + '; ';
              payload += e.getHeader('Caller-Destination-Number') + '; ';
              payload += e.getHeader('Unique-ID') + '; ';
            } else {
              payload += 'RINGING; ';
              payload += e.getHeader('Call-Direction') + '; ';
              payload += e.getHeader('Caller-Callee-ID-Number') + '; ';
              payload += e.getHeader('Caller-Caller-ID-Number') + '; ';
              payload += e.getHeader('Unique-ID') + '; ';
            }

            db.set(e.getHeader('Unique-ID'), { cid: e.getHeader('variable_sip_call_id') }, ttl);
          } else if (e.getHeader('Event-Name') == 'CHANNEL_PROGRESS_MEDIA') {
            var key = e.getHeader('Unique-ID');
            var details = {
              cid: e.getHeader('variable_sip_call_id'),
              localMediaIp: e.getHeader('variable_local_media_ip'),
              remoteMediaIp: e.getHeader('variable_remote_media_ip'),
              localMediaPort: e.getHeader('variable_local_media_port'),
              remoteMediaPort: e.getHeader('variable_remote_media_port')
            };
            if (debug) console.log(`CHANNEL_PROGRESS_MEDIA SETTING CACHE FOR ${key} TO ${JSON.stringify(details)}`);
            db.set(key, details, ttl);
          } else if (e.getHeader('Event-Name') == 'CHANNEL_BRIDGE') {
            var key = e.getHeader('Unique-ID');
            var details = {
              cid: e.getHeader('variable_sip_call_id'),
              localMediaIp: e.getHeader('variable_local_media_ip'),
              remoteMediaIp: e.getHeader('variable_remote_media_ip'),
              localMediaPort: e.getHeader('variable_local_media_port'),
              remoteMediaPort: e.getHeader('variable_remote_media_port')
            };
            if (debug) console.log(`CHANNEL_BRIDGE SETTING CACHE FOR ${key} TO ${JSON.stringify(details)}`);
            db.set(key, details, ttl);
          } else if (e.getHeader('Event-Name') == 'CHANNEL_ANSWER') {
            if (e.getHeader('Call-Direction') == 'inbound') {
              payload += 'ANSWERED; ';
              payload += e.getHeader('Caller-Caller-ID-Number') + '; ';
              payload += e.getHeader('Unique-ID') + '; ';
            } else {
              payload += 'ANSWERED; ';
              payload += e.getHeader('Caller-Callee-ID-Number') + '; ';
              payload += e.getHeader('Unique-ID') + '; ';
            }

            var key = e.getHeader('Unique-ID');
            var details = {
              cid: e.getHeader('variable_sip_call_id'),
              localMediaIp: e.getHeader('variable_local_media_ip'),
              remoteMediaIp: e.getHeader('variable_remote_media_ip'),
              localMediaPort: e.getHeader('variable_local_media_port'),
              remoteMediaPort: e.getHeader('variable_remote_media_port')
            };
            if (debug) console.log(`CHANNEL_ANSWER SETTING CACHE FOR ${key} TO ${JSON.stringify(details)}`);
            db.set(key, details, ttl);
          } else if (e.getHeader('Event-Name') == 'CHANNEL_DESTROY') {
            if (e.getHeader('Call-Direction') == 'inbound') {
              payload += 'HANGUP; ';
              payload += e.getHeader('Caller-Caller-ID-Number') + '; ';
              payload += e.getHeader('Unique-ID') + '; ';
            } else {
              payload += 'HANGUP; ';
              payload += e.getHeader('Caller-Callee-ID-Number') + '; ';
              payload += e.getHeader('Unique-ID') + '; ';
            }

            db.delete(e.getHeader('Unique-ID'));
            if (debug) console.log('Session UUID ' + e.getHeader('Unique-ID') + ' has been removed!');
          } else if (e.getHeader('Event-Name') == 'CUSTOM') {
            if (e.getHeader('Event-Subclass') === 'sofia::register') {
              payload += 'REGISTER; ';
              payload += e.getHeader('from-user') + '; ';
              payload += e.getHeader('network-ip') + '; ';
            } else if (e.getHeader('Event-Subclass') === 'sofia::unregister') {
              payload += 'UNREGISTER; ';
              payload += e.getHeader('from-user') + '; ';
              payload += e.getHeader('network-ip') + '; ';
            }
          } else if (e.getHeader('Event-Name') == 'DTMF') {
            if (debug) console.log('DTMF EVENT', e);
            payload += e.getHeader('Event-Name') + ' DIGIT: ' + e.getHeader('DTMF-Digit') + ' DURATION: ' + e.getHeader('DTMF-Duration') + ' FROM:' + e.getHeader('variable_sip_from_user') + ' TO: ' + e.getHeader('variable_sip_req_user');
          } else {
            payload += e.getHeader('Event-Name') + '; ' + e.getHeader('Channel-Name') + ' (' + e.getHeader('Event-Calling-Function') + ')';
          }

          if (report_call_events) {
            var message = getCallMessage(e, xcid, payload, hep_id, hep_pass);
            var message = getCallMessage(e, xcid, JSON.stringify(e), hep_id, hep_pass);
            callback_preHep(message);
          }
        }
      }

      if (report_rtcp_events) {
        if (e.getHeader('Event-Name') == 'RECV_RTCP_MESSAGE' || e.getHeader('Event-Name') == 'SEND_RTCP_MESSAGE') {
          if (e.getHeader('Source0-SSRC') || e.getHeader('Source-SSRC')) {
            if (debug) console.log('Processing RTCP Report...', e);
            var message = getRTCPMessage(e, xcid, hep_id, hep_pass);
            callback_preHep(message);
          }
        }
      }

      if (report_qos_events) {
        if (e.getHeader('Event-Name') == 'CHANNEL_DESTROY') {
          if (e.getHeader('variable_rtp_use_codec_rate') && e.getHeader('variable_sip_call_id')) {
            var message = getQoSMessage(e, xcid, hep_id, hep_pass);
            callback_preHep(message);
          }
        }
      }

      if (report_custom_events) {
        if (e.getHeader('Event-Name') == 'CUSTOM') {
          if (e.getHeader('Unique-ID') && e.getHeader('variable_sip_call_id')) {
            var message = getCallMessage(e, xcid || e.getHeader('variable_sip_call_id'), hep_id, hep_pass);
            callback_preHep(message);
          }
        }
      }

    });
};

var getRTCPMessage = function (e, xcid, hep_id, hep_pass) {
  var call = db.get(e.getHeader('Unique-ID'));

  if (e.getHeader('Event-Name') == 'RECV_RTCP_MESSAGE') {
    if (!call.recvSSRC) {
      call.recvSSRC = e.getHeader('Source0-SSRC');
      db.set(e.getHeader('Unique-ID'),call,ttl);
    }
    if (!call.recvPackets) {
      call.recvPackets = 0;
    }
    if (e.getHeader('Sender-Packet-Count')) {
      packets = parseInt(e.getHeader('Sender-Packet-Count'))  - call.recvPackets;
      call.recvPackets = parseInt(e.getHeader('Sender-Packet-Count')) ;
      db.set(e.getHeader('Unique-ID'),call,ttl);
    }
    if (!call.recvOctects) {
      call.recvOctets = 0;
    }
    if (e.getHeader('Octect-Packet-Count')) {
      octets = parseInt(e.getHeader('Octect-Packet-Count'))  - call.recvOctets;
      call.recvOctets = parseInt(e.getHeader('Octect-Packet-Count')) ;
      db.set(e.getHeader('Unique-ID'),call,ttl);
    }
    if (!call.recvPacketsLost) {
      call.recvPacketsLost = 0;
    }
    if (e.getHeader('Source0-Lost')) {
      packetsLost = parseInt(e.getHeader('Source0-Lost'))  - call.recvPacketsLost;
      call.recvPacketsLost = parseInt(e.getHeader('Source0-Lost')) ;
      db.set(e.getHeader('Unique-ID'),call,ttl);
    }
    var ssrc = call.recvSSRC;
    var srcIp = call.localMediaIp ? call.localMediaIp : '127.0.0.1';
    var srcPort = call.localMediaPort ? call.localMediaPort : 0;
    var dstIp = call.remoteMediaIp ? call.remoteMediaIp : '127.0.0.1';
    var dstPort = call.remoteMediaPort ? call.remoteMediaPort : 0;
    var fractionLost = parseInt(e.getHeader('Source0-Fraction'));
    var packetsLost = packetsLost;
    var highestSeqNo = parseInt(e.getHeader('Source0-Highest-Sequence-Number-Received'));
    var lsr = parseInt(e.getHeader('Source0-LSR'));
    var iaJitter = parseFloat(e.getHeader('Source0-Jitter'));
    var dlsr = parseInt(e.getHeader('Source0-DLSR'));
  }

  if (e.getHeader('Event-Name') == 'SEND_RTCP_MESSAGE') {
    if (!call.sendSSRC) {
      call.sendSSRC = e.getHeader('SSRC');
      db.set(e.getHeader('Unique-ID'),call,ttl);
    }
    if (!call.sendPackets) {
      call.sendPackets = 0;
    }
    if (e.getHeader('Sender-Packet-Count')) {
      packets = parseInt(e.getHeader('Sender-Packet-Count'))  - call.sendPackets;
      call.sendPackets = parseInt(e.getHeader('Sender-Packet-Count')) ;
      db.set(e.getHeader('Unique-ID'),call,ttl);
    }
    if (!call.sendOctects) {
      call.sendOctets = 0;
    }
    if (e.getHeader('Octect-Packet-Count')) {
      octets = parseInt(e.getHeader('Octect-Packet-Count'))  - call.sendOctets;
      call.sendOctets = parseInt(e.getHeader('Octect-Packet-Count')) ;
      db.set(e.getHeader('Unique-ID'),call,ttl);
    }
    if (!call.sendPacketsLost) {
      call.sendPacketsLost = 0;
    }
    if (e.getHeader('Source-Lost')) {
      packetsLost = parseInt(e.getHeader('Source-Lost')) - call.sendPacketsLost;
      call.sendPacketsLost = parseInt(e.getHeader('Source-Lost')) ;
      db.set(e.getHeader('Unique-ID'),call,ttl);
    }
    var ssrc = call.sendSSRC;
    var srcIp = call.remoteMediaIp ? call.remoteMediaIp : '127.0.0.1';
    var srcPort = call.remoteMediaPort ? call.remoteMediaPort : 0;
    var dstIp = call.localMediaIp ? call.localMediaIp : '127.0.0.1';
    var dstPort = call.localMediaPort ? call.localMediaPort : 0;
    var fractionLost = parseInt(e.getHeader('Source-Fraction'));
    var packetsLost = packetsLost;
    var highestSeqNo = parseInt(e.getHeader('Source-Highest-Sequence-Number-Received'));
    var lsr = parseInt(e.getHeader('Source-LSR'));
    var iaJitter = parseFloat(e.getHeader('Source-Jitter'));
    var dlsr = parseInt(e.getHeader('Source-DLSR'));
  }

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
      srcIp: srcIp,
      dstIp: dstIp,
      srcPort: srcPort,
      dstPort: dstPort,
      correlation_id: xcid ? xcid : ''
    },
    payload: JSON.stringify({
      "type": 200,
      "ssrc": ssrc,
      "report_count": parseInt(e.getHeader('Event-Sequence')),
      "report_blocks": [{
        "source_ssrc": ssrc,
        "fraction_lost": fractionLost,
        "packets_lost": packetsLost,
        "highest_seq_no": highestSeqNo,
        "lsr": lsr,
        "ia_jitter": iaJitter,
        "dlsr": dlsr
      }],
      "sender_information": {
        "packets": packets,
        "ntp_timestamp_sec": parseInt(e.getHeader('NTP-Most-Significant-Word')),
        "ntp_timestamp_usec": parseInt(e.getHeader('NTP-Least-Significant-Word')),
        "rtp_timestamp": parseInt(e.getHeader('RTP-Timestamp')),
        "octets": octets
      }
    })
  };

  return message;
};

var getQoSMessage = function (e, xcid, hep_id, hep_pass) {
  var message = {
    rcinfo: {
      type: 'HEP',
      version: 3,
      payload_type: 'JSON',
      captureId: hep_id,
      capturePass: hep_pass,
      ip_family: 2,
      protocol: 17,
      proto_type: 34,
      mos: parseFloat(e.getHeader('variable_rtp_audio_in_mos')),
      srcIp: e.getHeader('variable_local_media_ip') ? e.getHeader('variable_local_media_ip') : '127.0.0.1',
      dstIp: e.getHeader('variable_remote_media_ip') ? e.getHeader('variable_remote_media_ip') : '127.0.0.1',
      srcPort: parseInt(e.getHeader('variable_local_media_port')) ? parseInt(e.getHeader('variable_local_media_port')) : 0,
      dstPort: parseInt(e.getHeader('variable_remote_media_port')) ? parseInt(e.getHeader('variable_remote_media_port')) : 0,
      correlation_id: xcid ? xcid : ''
    },
    payload: JSON.stringify({
      "CORRELATION_ID": xcid ? xcid : e.getHeader('variable_sip_call_id'),
      "RTP_SIP_CALL_ID": xcid ? xcid : e.getHeader('variable_sip_call_id'),
      "JITTER": (parseInt(e.getHeader('variable_rtp_audio_in_jitter_min_variance')) + parseInt(e.getHeader('variable_rtp_audio_in_jitter_max_variance'))) / 2,
      "REPORT_TS": parseInt(e.getHeader('Event-Date-Timestamp')),
      "TL_BYTE": parseInt(e.getHeader('variable_rtp_audio_in_media_bytes')) + parseInt(e.getHeader('variable_rtp_audio_out_media_bytes')),
      "TOTAL_PK": parseInt(e.getHeader('variable_rtp_audio_in_packet_count')) + parseInt(e.getHeader('variable_rtp_audio_out_packet_count')),
      "PACKET_LOSS": parseInt(e.getHeader('variable_rtp_audio_in_skip_packet_count')) + parseInt(e.getHeader('variable_rtp_audio_out_skip_packet_count')),
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
  return message;
};

var getCallMessage = function (e, xcid, payload, hep_id, hep_pass) {
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
      srcIp: e.getHeader('FreeSWITCH-IPv4'),
      dstIp: e.getHeader('FreeSWITCH-IPv4'),
      srcPort: 0,
      dstPort: 0,
      correlation_id: xcid ? xcid : e.getHeader('variable_sip_call_id')
    },
    payload: payload
  };

  return message;
};
