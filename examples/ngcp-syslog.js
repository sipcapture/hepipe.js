// HEPIPE-JS SETTINGS for NGCP syslog (general)
// ------------------------------------------------------
var config = {
        
        // Address and Port of your HEP Server
        HEP_SERVER: 'homer.ip.addr',
        HEP_PORT: 9060,
        // the HEP ID and Authentication for this Agent
        HEP_ID: '2001',
        HEP_AUTH: 'null',
        // the Logfiles to monitor
        LOGS: [
                {
                  tag : 'ngcp',
                  host : '127.0.0.1',
                  pattern: 'ID=([^&]\\S*)',
                  path : '/var/log/syslog'
                }
              ]
};

module.exports = config;
