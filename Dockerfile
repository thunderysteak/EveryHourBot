FROM node:18.16.1-alpine

ENV ISDOCKER=true

RUN mkdir /ehb 
RUN mkdir /ehb/media

WORKDIR /ehb
COPY . /ehb/

RUN chown -R daemon /ehb
RUN chmod -R 705 /ehb
RUN npm install

USER daemon
CMD ["node", "index.js"]