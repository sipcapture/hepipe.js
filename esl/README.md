### HEPIPE for FreeSWITCH ESL

This experiment hooks ESL events from FreeSWITCH and converts them into HEP Logs & Reports

##### Options

  * -s
    * HEP SERVER IP (default: 127.0.0.1)
  * -p
    * HEP SERVER PORT (default: 9060)
  * -es
    * FS ESL IP (default: 127.0.0.1)
  * -ep
    * FS ESL Port (default: 8021)
  * -ew
    * FS ESL Password (default: ClueCon)

##### Usage Example
```
nodejs esl/hepipe-esl.js -s 127.0.0.2 -p 9060 -d
``` 
