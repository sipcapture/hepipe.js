# hepipe.js

hepipe.js can detect 3 types of events:
- log lines
- FS ESL events
- Janus events

and it will encapsulate the data with the required payload (e.g. JSON vs SIP) and send it to an Homer instance.

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
