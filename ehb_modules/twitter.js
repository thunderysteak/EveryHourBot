import * as dotenv from 'dotenv'
import { exit } from 'node:process';
import { TwitterApi } from 'twitter-api-v2';

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

const doTwitter = async () => {
    /*

    Hours wasted to untangle the auth clusterfuck: 3 Hours
    Monster Energy Ultra drank: 3x

    */

    //Put the tokens into variables or suffer a terrible fate
    const twitterAppKey = process.env.TWITTER_CUSTOMER_API_KEY
    const twitterAppKeySecret = process.env.TWITTER_CUSTOMER_API_KEY_SECRET
    const twitterAccessToken = process.env.TWITTER_ACCESS_TOKEN
    const twitterAccessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET
    const client = new TwitterApi({
        appKey: twitterAppKey,
        appSecret: twitterAppKeySecret,
        accessToken: twitterAccessToken,
        accessSecret: twitterAccessTokenSecret,
    })
    //
    const twitterClient = client.readWrite
    //Just upload the media using V1 API and then publish the Tweet with the uploaded media using V2
    //Statements dreamed up by the utterly deranged
    const v1MediaId = await Promise.all([
        //Don't even need to change it to base64 or load into buffer what is this module
        twitterClient.v1.uploadMedia(imagePath),
      ]);
    /* Somehow hitting the 50 requests/24hr limits 
    BORN TO DIE
    TWITTER IS A FUCK
    Kill Em All 1989
    I am trash man
    410,757,864,530 DEAD BOTS
    */
    await twitterClient.v2.tweet('', {'media': { media_ids: v1MediaId }},);
}

//Use async logic where we first obtain the payload, then perform our function and then exit the process.
getPayload()
.then(() => {
    doTwitter()
    .then(() => {
        console.log("Tweet Published")
        exit(0)
    })
})