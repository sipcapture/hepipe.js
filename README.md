<img src="https://i.imgur.com/scqdu3p.png" width="500">

# HEPipe.js
##### HEP Enabled Log harvester for Node.js

<img src="http://i.imgur.com/74Gswvq.gif" />

HEPipe _(hep-pipe)_ is a sipcapture tool to monitor files, extract and ship arbitrary rows _(logs, events, cdrs, etc)_ with correlation_id to a HEP server such as [HOMER](https://github.com/sipcapture/homer) or [PCAPTURE](http://pcapture.com) using [HEP](http://hep.sipcapture.org) Type _100_

* Status: Experimental

### Install
<pre>
npm install
</pre>

### Configure
Application parameters for HEP and LOGS monitoring in ```config.js```

Each LOGS entry defines a log path and a _(regex)_ rule to match/extract the proper correlation ID from rows

<img src="http://i.imgur.com/CbASvM3.png" />

---------------------

#### Example Log: NGCP
```
Nov 19 22:05:36 ams2 /usr/sbin/kamailio[1067]: INFO: Sending reply, fs='udp:127.0.0.1:5060' - ID=11876453@127.0.1.1
```

* Regex Filter: ```ID=([^&]\\S*)```
* Correlation ID: ```11876453@127.0.1.1```

----------

### Start Hepipe-js
<pre>
npm run forever
</pre>

<img src="http://i.imgur.com/FfI28Qv.png" width="100">

