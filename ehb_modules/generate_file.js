import * as fs from 'node:fs/promises'
import * as crypto from 'node:crypto'

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
        throw new Error('Less than 2 files in media or media folder is empty! Unable to continue execution!')
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
    return randomFileString;
}
const filenameToSend = getRandomFile()
process.send(await filenameToSend);