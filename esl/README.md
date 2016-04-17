<img src="https://i.imgur.com/scqdu3p.png" width="400">

# HEPipe.js
##### HEP Enabled Freeswitch ESL harvester in Node.js

<img src="http://i.imgur.com/74Gswvq.gif" />

This tools subscribes to FreeSWITCH ESL events and converts them into correlated HEP Logs & Reports

* Status: Experimental

#### Support

| ESL Event  | Hep Mode | HEP Type  |
|:--|:--|:--|
| CHANNEL_CREATE | LOG | 100 |
| CHANNEL_ANSWER | LOG | 100 |
| CHANNEL_DESTROY | LOG | 100 | 
| CUSTOM | LOG | 100 | 
| RECV_RTCP_MESSAGE | RTCP | 5 | 
| CHANNEL_DESTROY | CUSTOM QoS | 99 |


### Install
<pre>
npm install
</pre>

##### Options

| switch  | description  | default |
|:--|:--|--:|
| -s | HEP SERVER IP | 127.0.0.1 |
| -p | HEP SERVER PORT | 9060 |
| -es| FS ESL IP | 127.0.0.1 |
| -ep| FS ESL PORT | 8021 |
| -ew| FS ESL Password | ClueCon |


##### Usage Example
```
nodejs hepipe-esl.js -s {homer_ip} -p 9060 -d
``` 

##### TODO

* move to redis?
* clean up / modularize code
