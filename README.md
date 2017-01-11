<img src="https://i.imgur.com/scqdu3p.png" width="400">

# HEPipe.js
##### HEP Enabled data harvester

<img src="http://i.imgur.com/74Gswvq.gif" />


HEPipe.js can work several types of feeds:
- log based events
- Freeswitch ESL events
- Meetecho Janus events

Each module features its own programming used to match and encapsulate extracted data using the desired HEP payload (e.g. JSON vs SIP) and send it to an [HOMER](https://github.com/sipcapture/homer) instance.

These are configured by setting the related sections in `config.js` (see `examples/` for managing log events, ESL events (log, RTCP, QoS) and Janus events (SIP, other events)).

## Installation and Run

Prepare with:

`sudo npm install`

Fill config.js as needed (please see `examples/`)

Run with:

`sudo node hepipe.js`

## Dockerisation

You can also run hepipe.js inside a Docker container.

config.js can be made available via a read-only Volume.

Ensure that the container can access the monitored log (e.g. via a Volume), and can connect to FS ESL or Janus Events API as needed.
