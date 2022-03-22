const Twitter = require("twitter-lite")
const fs = require("fs/promises")

/*
Retire RandomORG
http://gitlab.home.thunderysteak.com/thunderysteak/PossumEveryHour/-/issues/1
const RandomOrg = require("random-org")
*/

const { randomInt } = require("crypto")
const { exit } = require("process")

//Are we in Docker?
//Checks if env variable is present from Dockerfile
if (process.env.ISDOCKER != "true" ) {
    const dotenv = require("dotenv")
    dotenv.config()
}

/*
Retire RandomORG
http://gitlab.home.thunderysteak.com/thunderysteak/PossumEveryHour/-/issues/1
//Create RandomOrg Client
const randomClient = new RandomOrg({ apiKey: process.env.RANDOMORG_KEY})
*/

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

/**
 * Generates a random number between 0 and max, that isn't already in used.
 * @param used An array of used numbers.
 */
const getNonDuplicateRandom = (used, max) => {
    var generatedNumber = randomInt(0, max)
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

const getRandomFile = async() => {
    const mediaStore = await getMediaStore()
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
    } else {
        generatedNumber = getNonDuplicateRandom(usedNumbers, mediaStore.length)
    }
    console.log(`Generated number ${generatedNumber}`)
    await fs.appendFile("usednumbers.txt", generatedNumber + "\n");

    //Seems to break PM2 if not ran from folder that contains the media folder. Should an issue be open for this?

    const randomFileString = "./media/" + mediaStore[generatedNumber]
    console.log("Using file: " + randomFileString)
    return fs.readFile(randomFileString);
}

//This whole function might need to be rewritten once twitter-lite has stable V2 API support
//http://gitlab.home.thunderysteak.com/thunderysteak/PossumEveryHour/-/issues/2
const createPost = async () => {
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

createPost()
    .then(res => {
        console.log("\n\n\nTweet has been successfully sent.\n\n\n");
        //require("child_process").fork("./zabbix-heartbeat.js");
    })
    .catch(err => {
        console.error(err);
    });

/*
Retire RandomORG
http://gitlab.home.thunderysteak.com/thunderysteak/PossumEveryHour/-/issues/1
//Function to obtain a random number from range from Random.Org. 
async function genRandomNumber(randomLowestInt, randomBiggestInt) {
    const result = await randomClient.generateIntegers({
        min: randomLowestInt,
        max: randomBiggestInt,
        n: 1,
    });
    return result.random.data
}
*/
