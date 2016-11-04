FROM nodesource/node:4.0

RUN git clone https://github.com/sipcapture/hepipe.js.git
WORKDIR hepipe.js/esl

RUN npm install

COPY run.sh /usr/src/app/hepipe.js/esl/run.sh
RUN chmod +x /usr/src/app/hepipe.js/esl/run.sh

ENTRYPOINT ["/usr/src/app/hepipe.js/esl/run.sh"]
