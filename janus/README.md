<img src="https://i.imgur.com/scqdu3p.png" width="400">

# Janus/Meetecho HEPipe.js
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

-------------


#### Full Experient (docker)

- Start the test container running Janus + Event Socket:
```
# docker run -tid \
  -p 7889:7889 -p 7089:7089 -p 8089:8889 -p 7088:7088 -p 8088:8088 -p 8000:8000 \
  -p 8080:8080 -p 10000-10200:10000-10200 \
  --name janus qxip/docker-janus 
```
- Connect to the container to install and run HEPIPE for Janus:
```
# docker exec -ti janus /bin/bash
root@8ba4eea1260a:# cd /usr/src && git clone http://github.com/sipcapture/hepipe.js && cd hepipe.js/janus
root@8ba4eea1260a:/usr/src/hepipe.js/janus# npm install
root@8ba4eea1260a:/usr/src/hepipe.js/janus# nodejs hepipe-janus.js -s {your.homer.ip} -p 9060
```
- Use your Browser to connect to the Janus Demo and perform a SIP Call
- ```
- https://<hostname>:8080/siptest.html
- ```
- 
- Connect to HOMER and locate your SIP Call + Logs
  <img src="http://i.imgur.com/g3sT9ZF.png" />

```

