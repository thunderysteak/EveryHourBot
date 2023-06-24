import * as fs from 'node:fs/promises'
import * as dotenv from 'dotenv'
import { exit } from 'node:process';
import blue from '@atproto/api';
import {fileTypeFromFile} from 'file-type';

//If we are in docker, grab variables from the system environment. if not, use .env file.
if (process.env.ISDOCKER != "true" ) {
    dotenv.config()
}

//Send to parent that we are ready for execution
process.send('ready') 
//Define imagePath in Global Scope for our function to be able to grab payload from parent
let imagePath 

//Make the message receiving an async function so we can ensure we got the payload
async function getPayload() {
    return new Promise((resolveFunc) => {
        process.on('message', (m) => {
            imagePath = m
            resolveFunc()
        })
    });
}

const doBlueSky = async () => {
    //Fetch Image & define it's MIME type
    const imageData = await fs.readFile(imagePath)
    const imageMimeType = await fileTypeFromFile(imagePath)
    /*
    Okay I understand that the naming is confusing but there's logic to this madness
    The AT Protocol used by BlueSky just loves to heavily reference BlueSky.

    We're importing "blue" from the ATProtocol package, then we're creating a new constant 
    named BskyAgent that we then literally shove into a new constant called AT Protocol Agent.
    */

    const { BskyAgent } = blue
    //Define which AT Protocol server we're connecting to
    const atpAgent = new BskyAgent({ service: process.env.BLUESKY_SERVER })
    //Login to AT Protocol server  
    await atpAgent.login({identifier: process.env.BLUESKY_EMAIL, password: process.env.BLUESKY_APP_PASSWORD})
    /* 
    Upload image with the defined MIME type
    Per ATProtocol, encoding/MIME type needs to be defined! 
    https://github.com/bluesky-social/atproto/blob/main/lexicons/com/atproto/repo/uploadBlob.json
    */
    const atpImageBlob = await atpAgent.uploadBlob(imageData, {
        encoding: imageMimeType.mime,
      });
    //Yeet an error if upload fails. 
    if (!atpImageBlob.success) {
        const msg = "Unable to upload image ${imageUrl}"
        console.error(msg, resp);
        throw new Error(msg);
    }
    //Create a post with empty text (required) and embed an image to it (alt text required as well)
    //Doesn't return anything, but for some magical reason it needs to have "return" or it will
    //straight up not POST
    return atpAgent.post({
        text: "",
        embed: {
          $type: "app.bsky.embed.images",
          images: [
            {
                image: atpImageBlob.data.blob,
                alt: "",
            },
          ],
        },
    });
}

//Use async logic where we first obtain the payload, then perform our function and then exit the process.
getPayload()
.then(() => {
    doBlueSky()
    .then(() => {
        exit(0)
    })
})