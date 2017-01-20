/*
HEPIPE-JS ELASTICSEARCH Client
(c) 2015-2017 QXIP BV
For License details, see LICENSE

Edited by:
Lorenzo Mangani <lorenzo.mangani@gmail.com>
Giacomo Vacca <giacomo.vacca@gmail.com>
Federico Cabibbu <federico.cabiddu@gmail.com>
*/

var debug = false; 
var stats = {rcvd: 0, parsed: 0, sent: 0, err: 0, senterr: 0 }; 

var ElasticQueue, Queue;
var ElasticQueue = require('elastic-queue');

var es_url;
var es_user;
var es_index;
var es_type;
var es_timeout;
var es_interval;

var socket;

module.exports = {
  init:function(config) {
    es_url = config.ES_URL ? config.ES_URL : 'http://127.0.0.1:9200';
    es_user = config.ES_USER;
    es_index = config.ES_INDEX ? config.ES_INDEX : 'hepipe';
    es_type = config.ES_TYPE ? config.ES_TYPE : 'webrtc';
    es_timeout = config.ES_TIMEOUT ? config.ES_TIMEOUT : 30;
    es_interval = config.ES_INTERVAL ? config.ES_INTERVAL : (es_timeout * 1000);
    debug = config.debug;

	/* ES Queue init */
	if (es_user.length > 1) { es_url = es_url.replace('://', '://'+es_user+'@'); }

	Queue = new ElasticQueue({
		elasticsearch: { client: { host: es_url } },
		batchSize: 50,
		commitTimeout: 1000,
		rateLimit: 1000
	});
	Queue.on('task', function(batch) {
		//counts.task++;
		return;
	});
	Queue.on('batchComplete', function(resp) {
		//counts.batch++;
		return;
	        // return console.log("batch complete");
	});
	Queue.on('drain', function() {
		//counts.drain++;
		return;
	  	// console.log("\n\nQueue is Empty\n\n");
	  	// Queue.close();
	  	// return process.exit();
	});


  },
  bulkES:function(message) {
    if (debug) console.log(message);
    bufferMe(message)
  },
  getStats:function() {
    return stats;
  }
};

/* JSON _Bulk Buffer */

var bufferMe = function(data){
	stats.rcvd++;
	try { data = JSON.parse(data) } catch(err) { console.log(err); stats.err++; return; }
	stats.parsed++;

	// Janus failsafe conversion of key identifiers
	if(data.session_id) data.session_id = data.session_id.toString();
	if(data.handle_id) data.handle_id = data.handle_id.toString();
	if(data.sender) data.sender = data.sender.toString();

        if (debug) console.log('Queuing packet....');
        var now = new Date().toISOString().substring(0, 10).replace(/-/g,'.');
        data["@timestamp"] = new Date().toISOString().slice(0, 19) + 'Z';
        var doc = {
      		  index: es_index+"-"+now,
      		  type: es_type,
      		  body: JSON.stringify(data)
      		};
      		Queue.push(doc, function(err, resp) {
      		  if (err) {
		    stats.senterr++;
      		    if (debug) console.log(err);
      		  }
		    stats.sent++;
      		    if (debug) console.log(resp);
      		});
}
