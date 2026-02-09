var config = {
  hep_config: {
    debug: true,
    HEP_SERVER: '172.16.0.100',
    HEP_PORT: 9060
  },
  esl_config: {
    debug: true,
    ESL_SERVER: '127.0.0.1',
    ESL_PORT: 8021,
    ESL_PASS: 'ClueCon',
    HEP_ID: 1000,  // Matching FreeSWITCH capture_id
    report_call_events: false,  // Only RTCP events for now
    report_rtcp_events: true,   // Enable RTCP events
    report_qos_events: false
  }
};

module.exports = config;
