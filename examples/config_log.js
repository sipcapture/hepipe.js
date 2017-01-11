var config = {
 hep_config: {
   debug: true,
   HEP_SERVER: '10.0.0.176',
   HEP_PORT: 9060
 },
 logs_config: {
   debug: true,
   HEP_ID: 11,
   HEP_PASS: 'multipass',
   logs: [
     {
       tag : 'opus_decoder',
       host : '127.0.0.1',
       pattern: ['^([^ ]*) .*Opus decoder stats',
                 '^([^ ]*) .* EARLY'],
       path : '/var/log/freeswitch/freeswitch.log'
     }
   ]
 }
};

module.exports = config;
