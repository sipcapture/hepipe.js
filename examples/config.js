var config = {
  hep_config: {
    debug: true,
    HEP_SERVER: '10.0.0.176',
    HEP_PORT: 9060
  },
  esl_config: {
    debug: true,
    ESL_SERVER: '127.0.0.1',
    ESL_PORT: 8021,
    ESL_PASS: 'ClueCon',
    HEP_PASS: 'multipass',
    HEP_ID: 2222,
    report_call_events: true,
    report_rtcp_events: true,
    report_qos_events: true
  },
  logs_config: {
    debug: true,
    HEP_PASS: 'multipass',
    HEP_ID: 2222,
    logs: [
      {
        tag : 'opus_decoder',
        host : '127.0.0.1',
        pattern: '^([^ ]*) .*Opus decoder stats', // escape backslashes!
        path : '/var/log/freeswitch/freeswitch.log'
      }
    ]
  }
};

module.exports = config;
