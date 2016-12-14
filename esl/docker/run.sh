#!/bin/bash

HEPIPE_ESL=hepipe-esl.js

cd /usr/src/app/hepipe.js/esl/

/usr/bin/node ${HEPIPE_ESL} -s ${HOMER_SERVER} -p ${HOMER_PORT} -es ${ESL_SERVER} -d ${EVENTS}
