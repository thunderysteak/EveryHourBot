import Twitter from 'twitter-lite'
import * as fs from 'node:fs/promises'
import * as dotenv from 'dotenv'
import { exit } from 'node:process';
import * as noPromiseFs from 'node:fs'

//Are we in Docker?
//Checks if env variable is present from Dockerfile
if (process.env.ISDOCKER != "true" ) {
    dotenv.config()
}
//Send to parent that we are ready for execution
process.send('ready') 
//Define imagePath in Global Scope for doMastodon func to be able to grab payload from parent
let imagePath 
//Make the message receiving an async function so we can launch stuff after we done
//The Twitter API can't behave
async function getPayload() {
    return new Promise((resolveFunc) => {
        process.on('message', (m) => {
            console.log('CHILD got message:', m);
            imagePath = m
            resolveFunc()
        })
    });
}



    console.log("Doing Twitter");
    //Create media upload client with different API endpoint
    //npm library not using correct API endpoint
    //https://github.com/draftbit/twitter-lite/issues/116
    const mediaClient = new Twitter({
        subdomain: "upload",
        consumer_key: process.env.CONSUMER_KEY,
        consumer_secret: process.env.CONSUMER_SECRET,
        access_token_key: process.env.ACCESS_TOKEN_KEY,
        access_token_secret: process.env.ACCESS_TOKEN_SECRET
    });

    //Create tweet upload client
    const client = new Twitter({
        subdomain: "api",
        consumer_key: process.env.CONSUMER_KEY,
        consumer_secret: process.env.CONSUMER_SECRET,
        access_token_key: process.env.ACCESS_TOKEN_KEY,
        access_token_secret: process.env.ACCESS_TOKEN_SECRET
    });

    //This whole function might need to be rewritten once twitter-lite has stable V2 API support
    //http://gitlab.home.thunderysteak.com/thunderysteak/PossumEveryHour/-/issues/2
    const createTwitterPost = async () => {

        //Read image file data and convert it to Base64 as required by the Twitter API 1.1
        //https://developer.twitter.com/en/docs/twitter-api/v1/media/upload-media/api-reference/post-media-upload
        const imageData = await fs.readFile(imagePath) 
        console.log("Uploading base64 image...")
        //Send the base64 data to Twitter media API endpoint and get the media ID string
        const mediaUploadResponse = await mediaClient.post("media/upload", {
            media_data: imageData.toString("base64"),
        });

        //Create new tweet with the media ID that was uploaded.
        //If we wanted to start adding text to posts, this is where we'd do it.

        try {
            console.log("Creating tweet...")
            await client.post("statuses/update", { media_ids: mediaUploadResponse.media_id_string })
        } catch(e) {
            console.error(`Error creating tweet: ${e}`)
        }
    }

    await getPayload()
        .then(() => {
            createTwitterPost()
            .then(() => {
                console.log("\n\n\nTweet has been successfully sent.\n\n\n");
                exit(0)
            }).catch(err => {
                console.error(err);
                exit(1)
            });
        })

