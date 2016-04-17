<img src="https://i.imgur.com/scqdu3p.png" width="400">

# HEPipe.js
##### HEP Enabled Freeswitch ESL harvester in Node.js

<img src="http://i.imgur.com/74Gswvq.gif" />

This tools subscribes to FreeSWITCH ESL events and converts them into correlated HEP Logs & Reports

* Status: Experimental

### Install
<pre>
npm install
</pre>

##### Options

| switch  | description  | default |
|---|:--|--:|
| -s | HEP SERVER IP | 127.0.0.1 |
| -p | HEP SERVER PORT | 9060 |
| -es| FS ESL IP | 127.0.0.1 |
| -ep| FS ESL PORT | 8021 |
| -ew| FS ESL Password | ClueCon |


##### Usage Example
```
nodejs esl/hepipe-esl.js -s 127.0.0.2 -p 9060 -d
``` 

##### TODO

* move to redis?
* clean up / modularize code
