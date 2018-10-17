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
    HEP_PASS: 'freeswitchESL',
    HEP_ID: 2222,
    report_call_events: true,
    report_rtcp_events: true,
    report_qos_events: true,
    report_custom_events: true
  }
};

module.exports = config;
