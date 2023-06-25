//We need to use fs.createReadStream as fs/promise causes unusual errors with Mast.js
import * as noPromiseFs from 'node:fs'
import * as dotenv from 'dotenv'
import { login } from 'masto';
import { exit } from 'node:process';
import { MastoTimeoutError } from "masto"

if (process.env.ISDOCKER != "true" ) {
    dotenv.config()
}

//Send to parent that we are ready for execution
process.send('ready') 
//Define imagePath in Global Scope for doMastodon func to be able to grab payload from parent
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

const doMastodon = async () => {
    console.log("Doing Mastodon");


    try {
    const masto = await login({
        url: process.env.MASTODON_SERVER,
        accessToken: process.env.MASTODON_ACCESS_TOKEN,
    });
    //We need to use fs.createReadStream as fs/promise causes Delayed-Stream module to fail
    const attachment = await masto.mediaAttachments.create({
        file: noPromiseFs.createReadStream(imagePath),
    });
    await masto.statuses.create({
        status: '',
        visibility: 'public',
        mediaIds: [attachment.id],
    });
    //FIXME
    //Need to limit this to not run infinite times and cause issues
    //Uploads to larger instance seem to time out around 3 to 5 times before a successful upload
    } catch(e) {
        if (String(e).includes("Timeout") || e instanceof MastoTimeoutError) {
            console.log("Mastodon timed out. Retrying...")
            doMastodon()
        }
        else {
        console.error(`Error creating Toot: ${e}`)
        exit(1)
        }
    }
}

//The NodeJS process did not exit properly and hung
//Sounds like a bug, but not seeing it
//Needs investigation
getPayload()
.then(() => {
    doMastodon()
    .then(() => {
        console.log("\nToot Published");
        exit(0)
    })
})