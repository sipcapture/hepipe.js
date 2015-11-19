<img src="http://i.imgur.com/FfI28Qv.png" width="100">

# hepipe.js
HEP Enabled Log harvester for Node.js


HEPipe (Hep-pipe) allows users to extract and send arbitrary data (logs, events, cdrs, etc) to a HEP server such as [HOMER](https://github.com/sipcapture/homer)

### Install
<pre>
npm install
</pre>

### Configure
Add your HEP server details, tell HEPIPE to start watching logs and how to match/extract its correlation IDs from them  _(regex)_

#### Example Log: NGCP
```
Nov 19 22:05:36 ams2 /usr/sbin/kamailio[1067]: INFO: <script>: Sending reply, fs='udp:127.0.0.1:5060' - ID=11876453@127.0.1.1
```

##### Example Filter: <pre> /ID=([^&]\S*)/ </pre>

##### Correlation: <pre> 11876453@127.0.1.1 </pre>

----------

### Start Hepipe-js
<pre>
npm run forever
</pre>
