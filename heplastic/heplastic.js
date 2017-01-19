/* 
 *	NODEJS webRTC Logger for ES
 *	(C) 2017 L. Mangani, QXIP BV
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 59 Temple Place - Suite 330, Boston, MA 02111-1307, USA.
 *
 Usage:
	nodejs heplastic.js -debug true -ES 'https://test.facetflow.io:443' -t 15

 Daemonize using forever:
	npm install forever -g
	forever start heplastic.js
*/ 

var version = 'v0.1';
var debug = false;
var https = require('https');
var fs = require('fs');

var api_pem = '/root/key.pem';
var api_crt = '/root/server.crt';

/********* HELP MENU *********/

if(process.argv.indexOf("-h") != -1){ 
	console.log('Usage:');
	console.log();
	console.log('      -a:     	API Local Port');
	console.log('      -aP:     	API Certificate PEM');
	console.log('      -aC:     	API Certificate CRT');
	console.log();
	console.log('      -s:     	HEP3 Collector IP');
	console.log('      -p:     	HEP3 Collector Port');
	console.log('      -i:     	HEP3 Agent ID');
	console.log('      -P:     	HEP3 Password');
	console.log();
	console.log('      -ES:    	ES _Bulk API IP    (ie: 127.0.0.1) ');
	console.log('      -EP:    	ES _Bulk API Port  (ie: 443) ');
	console.log('      -EI:    	ES _Bulk API Index (ie: captagent)');
	console.log('      -ET:    	ES _Bulk API Type  (ie: captagent)');
	console.log('      -EU:    	ES _Bulk API Auth  (ie: user:pass)');
	console.log('      -t:     	ES _Bulk Frequency (in seconds)');
	console.log();
	console.log('      -debug: 	Debug Internals    (ie: -debug true)');
	console.log('      CRTL-C: 	Exit');
	console.log();
	process.exit();
}


/******** Settings Section ********/

	// CAPTURE ARGS & DEFAULTS
	if(process.argv.indexOf("-debug") != -1){ 
	   debug = process.argv[process.argv.indexOf("-debug") + 1];
	}

	var api_port = 9988;
	if(process.argv.indexOf("-a") != -1){ 
	   api_port = process.argv[process.argv.indexOf("-a") + 1];
	}
	if(process.argv.indexOf("-aP") != -1){ 
	   api_pem = process.argv[process.argv.indexOf("-aP") + 1];
	}
	if(process.argv.indexOf("-aC") != -1){ 
	   api_crt = process.argv[process.argv.indexOf("-aC") + 1];
	}

	// HEP ARGS & DEFAULTS
	var hep_server = 'localhost';
	if(process.argv.indexOf("-s") != -1){ 
	    hep_server = process.argv[process.argv.indexOf("-s") + 1];
	}
	var hep_port = 9063;
	if(process.argv.indexOf("-p") != -1){ 
	    hep_port = process.argv[process.argv.indexOf("-p") + 1];
	}
	var hep_id = '2001';
	if(process.argv.indexOf("-i") != -1){ 
	    hep_id = process.argv[process.argv.indexOf("-i") + 1];
	}
	var hep_pass = 'myHep6';
	if(process.argv.indexOf("-P") != -1){ 
	    hep_pass = process.argv[process.argv.indexOf("-P") + 1];
	}
	// ES ARGS & DEFAULTS (experimental, HTTPS default)
	var es_on = true;
	var es_url = 'http://127.0.0.1:9200'; 
	var es_user = 'admin:password'; 

	if(process.argv.indexOf("-ES") != -1){ 
	    es_url = process.argv[process.argv.indexOf("-ES") + 1];
	    es_on = true;
	}
	var es_index = 'webrtc'; 
	if(process.argv.indexOf("-EI") != -1){ 
	    es_index = process.argv[process.argv.indexOf("-EI") + 1];
	}
	var es_type = 'janus'; 
	if(process.argv.indexOf("-ET") != -1){ 
	    es_type = process.argv[process.argv.indexOf("-ET") + 1];
	}
	if(process.argv.indexOf("-EU") != -1){ 
	    es_user = process.argv[process.argv.indexOf("-EU") + 1];
	}
	var es_timeout = 30; 
	if(process.argv.indexOf("-t") != -1){ 
	    es_timeout = parseInt(process.argv[process.argv.indexOf("-t") + 1]);
	}
	var es_interval = es_timeout * 1000;


console.log('Starting HEPlastic '+version+' on port: '+api_port);

    const options = {
      key: fs.readFileSync(api_pem, 'utf8'),
      cert: fs.readFileSync(api_crt, 'utf8')
    };


/*********** Elastic Queue ***********/
if (es_on) { 

	if (es_user.length > 1) { es_url = es_url.replace('://', '://'+es_user+'@'); }

	var ElasticQueue, Queue;
	var ElasticQueue = require('elastic-queue');
	
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
	
}

/* JSON _Bulk Buffer */

var bufferMe = function(data){
	try { data = JSON.parse(data) } catch(err) { console.log(err); return; }

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
      		    if (debug) console.log(err);
      		  }
      		    if (debug) console.log(resp);
      		});
}

/* Start */

    /* HTTP API Receiver */
    https.createServer(options, function (req, res) {

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Request-Method', '*');
        res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');

      var body = "";
      req.on('data', function (chunk) {
        body += chunk;
      });
      req.on('end', function () {
        // console.log(body);
        if (body != "") bufferMe(body);
        res.writeHead(200);
        res.end();
      });
    }).listen(api_port);


/* Stats & Kill Thread */

var exit = false;

process.on('SIGINT', function() {
    console.log();
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
