FROM node:16-alpine

RUN mkdir /ehb 
RUN mkdir /ehb/media

WORKDIR /ehb
COPY . /ehb/

RUN chown daemon /ehb
RUN chmod 705 /ehb
RUN npm install

USER daemon
CMD ["node", "index.js"]