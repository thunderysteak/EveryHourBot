import Twitter from 'twitter-lite'
import * as fs from 'node:fs/promises'
//We need to use fs.createReadStream as fs/promise causes unusual errors with Mast.js
import * as noPromiseFs from 'node:fs'
import * as dotenv from 'dotenv'
import { login } from 'masto';
import * as crypto from 'node:crypto'
import * as exit from 'node:process'
import * as readLastLines from 'read-last-lines'
import pRetry from 'p-retry'

//Are we in Docker?
//Checks if env variable is present from Dockerfile
if (process.env.ISDOCKER != "true" ) {
    dotenv.config()
}



const USED_NUMBERS_PATH = "./usednumbers.txt"
const MEDIA_DIR = "./media"

/**
 * Opens the media store folder and reads the contents. Returns an empty array if the directory doesn't exist.
 * @returns An array of all filenames in the directory.
*/
const getMediaStore = async () => {
    try {
        const media = await fs.readdir(MEDIA_DIR)
        return media
    } catch(e) {
        return [];
    }
}

//dump eet
//need to use it outside of randomisation now
const mediaStore = await getMediaStore()

/**
 * Generates a random number between 0 and max, that isn't already in used.
 * @param used An array of used numbers.
 */
const getNonDuplicateRandom = (used, max) => {
    var generatedNumber = crypto.randomInt(0, max)
    if(!used.includes(generatedNumber)) {
        return generatedNumber;
    }
    return getNonDuplicateRandom(used, max);
}

const getUsedNumbers = async() => {
    try {
        const buf = await fs.readFile(USED_NUMBERS_PATH)
        return buf.toString().split("\n").map(v => parseInt(v))
    } catch(e) {
        if(e.code == "ENOENT") {
            // used numbers file doesn't exist
            await fs.writeFile(USED_NUMBERS_PATH, "")
            return []
        }
    }
}

const getRandomFile = async(optionalArg) => {
    console.log("Randomising file")
    // Exit with an error if there are not enough files in the media folder.
    if (mediaStore.length <= 1) {
        console.error("Less than 2 files in media or media folder is empty! Unable to continue execution!")
        exit();
    }

    const usedNumbers = await getUsedNumbers();

    //Permit only 75% usage of unique files. 
    if (usedNumbers.length >= Math.round((mediaStore.length / 4) * 3)) {
        await fs.writeFile("usednumbers.txt", "")
        console.log("Reached 75% of entries in the unique files queue. Clearing queue!");
    }

    let generatedNumber = 0;
    if(mediaStore.length <= 23) {
        console.log("Less than 23 images loaded, skipping checks.")
        generatedNumber = crypto.randomInt(0, mediaStore.length)
    } else {
        generatedNumber = getNonDuplicateRandom(usedNumbers, mediaStore.length)
        await fs.appendFile("usednumbers.txt", generatedNumber + "\n");
    }
    console.log(`Generated number ${generatedNumber}`)

    //Seems to break PM2 if not ran from folder that contains the media folder. Should an issue be open for this?
    const randomFileString = "./media/" + mediaStore[generatedNumber]
    console.log("Using file: " + randomFileString)
    if (optionalArg == 'getFilepath'){
        return randomFileString;
    } else {
        return fs.readFile(randomFileString);
    }
}

//FIXME
const readLastRandomFile = async(optionalArg) => {
    const mediaStore = await getMediaStore()
    let generatedNumber = await readLastLines.read("usednumbers.txt", 1)
    generatedNumber = Number(generatedNumber)
    const randomFileString = "./media/" + mediaStore[generatedNumber]
    console.log("Using file: " + randomFileString)
    if (optionalArg == "getFilepath"){
        return randomFileString;
    } else {
        return fs.readFile(randomFileString);
    }
}

// TODO: isabel has no idea what your functions do please rename
const doMastodon = async () => {
    console.log("Doing Mastodon");
    let imageData = ""
    
    //What the fuck
    if ((process.env.USE_TWITTER == "false") || (mediaStore.length <= 23)) {
        imageData = await getRandomFile("getFilepath")
    }

    else if (process.env.USE_TWITTER == "true") {
        imageData = await readLastRandomFile("getFilepath")
    }

    const masto = await login({
        url: process.env.MASTODON_SERVER,
        accessToken: process.env.MASTODON_ACCESS_TOKEN,
    });
    //We need to use fs.createReadStream as fs/promise causes Delayed-Stream module to fail
    const attachment = await masto.mediaAttachments.create({
        file: noPromiseFs.createReadStream(imageData),
    });
    const postMasto = async () => {
    masto.statuses.create({
        status: '',
        visibility: 'public',
        mediaIds: [attachment.id],
    });
    }
    await pRetry(postMasto, {
        onFailedAttempt: error => {
		console.log(`Attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left.`);
	},
	retries: 5})
    
    console.log("\n\n\Toot has been successfully sent.\n\n\n");
}

const doTwitter = async() => {
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
        const imageData = await getRandomFile()
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

    createTwitterPost()
        .then(() => {
            console.log("\n\n\nTweet has been successfully sent.\n\n\n");
        })
        .catch(err => {
            console.error(err);
        });
}

if(process.env.USE_TWITTER && process.env.USE_MASTODON) {
    //FIXME
    //Async calls hurt me and I give up trying to do this properly
    //Just make it sleep a second so it reuses the Twitter image to stay in sync
    console.log("Queued Mastodon & Twitter")
    doTwitter().then(setTimeout(() => doMastodon(), 1000))
} else if(process.env.USE_TWITTER) {
    doTwitter()
} else if(process.env.USE_MASTODON) {
    doMastodon()
}


/*
[01:03]
oh no
[01:03]
are you programming again
[01:03]
pls dont

izzymg - 10/11/2022
*/


