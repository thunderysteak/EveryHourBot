const Twitter = require("twitter-lite")
const dotenv = require("dotenv")
const fs = require('fs')
const RandomOrg = require('random-org')
dotenv.config()

//Create RandomOrg Client
const randomClient = new RandomOrg({ apiKey: process.env.RANDOMORG_KEY})
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

//Load the filenames in the folder into an array and get count of how many files are in the array.
const mediaStoreArr = fs.readdirSync('./media/')
const mediaStoreSize = mediaStoreArr.length
//Throw an error if there are not enough files in the media folder
try{
    if (mediaStoreSize <= 1){
        throw new Error("Less than 2 files in media or media folder is empty! Unable to continue execution!");
    }
} catch(err){
    console.error(err)
    exit()
}

//Function to obtain a random number from range from Random.Org. 
async function genRandomNumber(randomLowestInt, randomBiggestInt) {
    const result = await randomClient.generateIntegers({
        min: randomLowestInt,
        max: randomBiggestInt,
        n: 1,
    });
    return result.random.data
}

async function getRandomFile() {
    const usedNumbers = fs.readFileSync('usednumbers.txt').toString().split("\n");
    //Permit only 24 entries in the usednumbers file not to repeat if media folder contains less than 72 files
    if (usedNumbers.length >= 24 && mediaStoreSize < 72){
        fs.writeFile('usednumbers.txt', '', function (err) {
            if (err) throw err;
            console.log('Reached 24 entries with less than 72 files, clearing!');
          });
    }
    //Permit only 72 entries in the usednumbers file not to repeat if media folder contains more than 72 files but less than 168. 3 days of unique pics.
    else if (usedNumbers.length >= 72 && mediaStoreSize <= 168){
        fs.writeFile('usednumbers.txt', '', function (err) {
            if (err) throw err;
            console.log('Reached 72 entries, clearing!');
          });
    }
    //Permit 168 entries in the usednumbers file not to repeat if media folder contains more than 168 files. One week of unique pics!
    else if (usedNumbers.length >= 168 && mediaStoreSize > 168){
        fs.writeFile('usednumbers.txt', '', function (err) {
            if (err) throw err;
            console.log('Reached 168 entries, clearing!');
          });
    }
    /*
    Duplication checking. Enters content of usernumbers.txt into an array and then compares the generated number with the entries in
    the array. If duplicate was detected, the whole loop re-runs generating a new number.
    */
    while (true){
        var generatedNumber = await genRandomNumber(1,mediaStoreSize)
        console.log('File with ID of '+ generatedNumber[0]+' has been generated. Checking if it was used recently.')
        if (mediaStoreSize <= 23){
            console.log("Less than 23 images loaded, skipping checks.")
            break
        }
        else if (usedNumbers.includes(generatedNumber[0].toString()) == false ){
            console.log('File with ID of '+ generatedNumber[0]+' has not been used recently.')
            break
            }
        }
    fs.appendFileSync('usednumbers.txt', generatedNumber[0] + '\n');
    //Join the selected filename to get the full path and then load the binary data into imageData
    //generatedNumber is required to be in its own variable, as mediaStoreArr[generatedNumber[0]] would occassionally not return a number resulting in a crash.
    const uniqueNumber = generatedNumber[0]
    const randomFileString = "./media/" + mediaStoreArr[uniqueNumber]
    console.log(randomFileString)
    const imageData = fs.readFileSync(randomFileString);
    return imageData
}

const createPost = async () => {
    //Read image file data and convert it to Base64 as required by the Twitter API
    const imageData = await getRandomFile()
    console.log("Converting file to Base64")
    const base64Image = new Buffer(imageData).toString('base64');
    console.log("uploading img")
    //Send the base64 data to Twitter media API endpoint and get the media ID string
    const mediaUploadResponse = await mediaClient.post('media/upload', {
    media_data: base64Image,
    });

    //Create new tweet with the media ID that was uploaded
    await client.post("statuses/update", { media_ids: mediaUploadResponse.media_id_string })
    .then(res => {
    console.log('Creating Tweet...');
    })
    .catch(err => {
    console.log(err);
    });

}

createPost()
.then(res => {
    console.log("\n\n\nTweet has been successfully sent.\n\n\n");
})
.catch(err => {
    console.log(err);
    });
