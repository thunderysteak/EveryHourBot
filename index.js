import defaultExport, * as schedule from 'node-schedule'
import * as child from 'child_process';
import * as dotenv from 'dotenv'

console.log('Welcome to EveryHourBot Bot.\nVersion 2.0.0');

//Are we in Docker?
//Checks if env variable is present from Dockerfile
if (process.env.ISDOCKER != "true" ) {
        dotenv.config()
    }

const rule = new schedule.RecurrenceRule();
rule.minute = 0;

//Needs to be defined in a global scope 
let filePath
let filePayload

//We need to wrap child_process.fork in a promise
//And also define the file generation module for better manipulation

function getFileToServe() {
        const fileGen = child.fork('./ehb_modules/generate_file.js')
        return new Promise((resolveFunc) => {
        fileGen.on('message', (m) => {
                filePath = m
        })
        fileGen.on('exit', code => {
                if (code != 0){
                        throw new Error('File generator module has encountered an error! EHB will now close.');
                } else {
                resolveFunc(code)
                }
        })
});
}

async function getPayload(){
        await getFileToServe()
        return filePath
}

async function runJob() {
const filePayload = await getPayload()
console.log('Use Mastodon:',process.env.USE_MASTODON == "true")
if(process.env.USE_MASTODON == "true") {child.fork('./ehb_modules/mastodon.js').send(filePayload)}
/* 
Twitter no longer supported
console.log('Use Twitter:',process.env.USE_TWITTER == "true")
if(process.env.USE_TWITTER == "true") {child.fork('./ehb_modules/twitter.js').send(filePayload)}
} 
*/


const job = schedule.scheduleJob(rule, function(){
        console.log('\nExecuting modules\n');
        runJob()
});




