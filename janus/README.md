<img src="https://i.imgur.com/scqdu3p.png" width="400">

# HEPipe.js
##### HEP Enabled harvester for Meetecho Janus Gateway in Node.js

<img src="http://i.imgur.com/74Gswvq.gif" />

This tool harvests Meetecho socket events and converts them into correlated HEP Logs & Reports

* Status: Experimental

#### Support

| Janus Event | Janus Type | HEP Mode | HEP Type  |
|:--|:--|:--|:--|
| SIP | 64 | SIP | 1 |
| CORE | 1 | LOG | 100 |
| SESSION | 2 | LOG | 100 |
| MEDIA | 32 | LOG | 100 |
| ICE | 16 | LOG | 100 |
| JSEP/SDP | 8 | LOG | 100 |

##### Correlation Headers

```session_id``` -> ```handle_id``` -> ```data.call_id```



### Install
<pre>
npm install
</pre>

##### Usage Example
```
nodejs hepipe-janus.js -es {api_listen_ip} -ep {api_listen_port} -s {homer_ip} -p 9060 -d
``` 
##### Options

| switch  | description  | default |
|:--|:--|--:|
| -s | HEP SERVER IP | 127.0.0.1 |
| -p | HEP SERVER PORT | 9060 |
| -es| API LOCAL IP | 127.0.0.1 |
| -ep| API LOCAL PORT | 7777 |


##### TODO

* improve dirty db / move to redis?
* clean up / modularize code
