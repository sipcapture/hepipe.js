// HEPIPE-JS SETTINGS (please configure)
// ------------------------------------------------------
var config = {
        
        // Address and Port of your HEP Server
        HEP_SERVER: 'localhost',
        HEP_PORT: 9060,
        // the HEP ID and Authentication for this Agent
        HEP_ID: '2099',
        HEP_AUTH: 'HEProcks',
        // the Logfiles to monitor
        LOGS: [
                {
                  tag : 'ngcp',
                  host : '127.0.0.1',
		  pattern: 'ID=([^&]\\S*)', // escape backslashes!
                  path : '/var/log/syslog'
                }
              ]
};

// ------------------------------------------------------

module.exports = config;
