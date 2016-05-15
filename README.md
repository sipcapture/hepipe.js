<img src="https://i.imgur.com/scqdu3p.png" width="400">

# HEPipe.js
##### HEP Enabled Log harvester for Node.js

<img src="http://i.imgur.com/74Gswvq.gif" />

HEPipe _(hep-pipe)_ is a simple powerful tool to monitor files _(logs, events, cdrs, etc)_, extract and ship arbitrary rows  with a matching correlation field to a HEP server such as [HOMER](https://github.com/sipcapture/homer) or [PCAPTURE](http://pcapture.com) using [HEP](http://hep.sipcapture.org) Type _100_

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

#### Example: NGCP/Kamailio Logs
```
Nov 19 22:05:36 ams2 /usr/sbin/kamailio[1067]: INFO: Sending reply, fs='udp:127.0.0.1:5060' - ID=11876453@127.0.1.1
```

* Regex Filter: ```ID=([^&]\\S*)```
* Correlation ID: ```11876453@127.0.1.1```
* HEP Output: <pre>rcinfo = { 
    type: 'HEP',
    version: 3,
    payload_type: '100',
    captureId: '2001',
    capturePass: 'myHep',
    ...
    correlation_id: '11876453@127.0.1.1',
    payload: {
      msg: 'Nov 19 22:05:36 ams2 /usr/sbin/kamailio[1067]: INFO: Sending reply, fs='udp:127.0.0.1:5060' - ID=11876453@127.0.1.1'
           }
}
          </pre>

#### Example: NGCP/RTPEngine Logs
```
Nov 19 22:05:36 ams2 (daemon.info) rtpengine[2812]: [11876453@127.0.1.1] ------ Media #1 (audio over RTP/AVP) using PCMA/8000
```

* Regex Filter: ```\\[.*].*\\[(.*)\\]```
* Correlation ID: ```11876453@127.0.1.1```
* HEP Output: <pre>rcinfo = { 
    type: 'HEP',
    version: 3,
    payload_type: '100',
    captureId: '2002',
    capturePass: 'myHep',
    ...
    correlation_id: '11876453@127.0.1.1',
    payload: {
      msg: 'Nov 19 22:05:36 ams2 (daemon.info) rtpengine[2812]: [11876453@127.0.1.1] ------ Media #1 (audio over RTP/AVP) using PCMA/8000'
           }
}
</pre>


----------

### Start Hepipe-js
<pre>
npm run forever
</pre>

That's all! If you matched your strings right, HEP logs are being shipped out!

---------

### Developers
Contributions to our projects are always welcome! If you intend to participate and help us improve our software, we kindly ask you to sign a [CLA (Contributor License Agreement)](http://cla.qxip.net) and coordinate at best with the existing team via the [homer-dev](http://groups.google.com/group/homer-dev) mailing list.


----------
<img src="http://i.imgur.com/FfI28Qv.png" width="100">


##### If you use our projects in production, please consider supporting us with a [donation](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=donation%40sipcapture%2eorg&lc=US&item_name=SIPCAPTURE&no_note=0&currency_code=EUR&bn=PP%2dDonationsBF%3abtn_donateCC_LG%2egif%3aNonHostedGuest)

[![Donate](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=donation%40sipcapture%2eorg&lc=US&item_name=SIPCAPTURE&no_note=0&currency_code=EUR&bn=PP%2dDonationsBF%3abtn_donateCC_LG%2egif%3aNonHostedGuest)



