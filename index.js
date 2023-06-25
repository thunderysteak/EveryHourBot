import defaultExport, * as schedule from 'node-schedule'
import * as child from 'child_process';
import * as dotenv from 'dotenv'

//Are we in Docker?
//Checks if env variable is present from Dockerfile
if (process.env.ISDOCKER != "true" ) {
        dotenv.config()
    }


console.log('\n'+
'\n'+'▓█████::██▒:::█▓▓█████::██▀███::▓██:::██▓:██░:██::▒█████:::█::::██::██▀███:::▄▄▄▄::::▒█████::▄▄▄█████▓'+
'\n'+'▓█:::▀:▓██░:::█▒▓█:::▀:▓██:▒:██▒:▒██::██▒▓██░:██▒▒██▒::██▒:██::▓██▒▓██:▒:██▒▓█████▄:▒██▒::██▒▓::██▒:▓▒'+
'\n'+'▒███::::▓██::█▒░▒███:::▓██:░▄█:▒::▒██:██░▒██▀▀██░▒██░::██▒▓██::▒██░▓██:░▄█:▒▒██▒:▄██▒██░::██▒▒:▓██░:▒░'+
'\n'+'▒▓█::▄:::▒██:█░░▒▓█::▄:▒██▀▀█▄::::░:▐██▓░░▓█:░██:▒██:::██░▓▓█::░██░▒██▀▀█▄::▒██░█▀::▒██:::██░░:▓██▓:░:'+
'\n'+'░▒████▒:::▒▀█░::░▒████▒░██▓:▒██▒::░:██▒▓░░▓█▒░██▓░:████▓▒░▒▒█████▓:░██▓:▒██▒░▓█::▀█▓░:████▓▒░::▒██▒:░:'+
'\n'+'░░:▒░:░:::░:▐░::░░:▒░:░░:▒▓:░▒▓░:::██▒▒▒::▒:░░▒░▒░:▒░▒░▒░:░▒▓▒:▒:▒:░:▒▓:░▒▓░░▒▓███▀▒░:▒░▒░▒░:::▒:░░:::'+
'\n'+':░:░::░:::░:░░:::░:░::░::░▒:░:▒░:▓██:░▒░::▒:░▒░:░::░:▒:▒░:░░▒░:░:░:::░▒:░:▒░▒░▒:::░:::░:▒:▒░:::::░::::'+
'\n'+':::░::::::::░░:::::░:::::░░:::░::▒:▒:░░:::░::░░:░░:░:░:▒:::░░░:░:░:::░░:::░::░::::░:░:░:░:▒::::░::::::'+
'\n'+':::░::░::::::░:::::░::░:::░::::::░:░::::::░::░::░::::░:░:::::░::::::::░::::::░::::::::::░:░:::::::::::'+
'\n'+'::::::::::::░::::::::::::::::::::░:░::::::::::::::::::::::::::::::::::::::::::::::░:::::::::::::::::::'+
'\n')
    
console.log('Welcome to EveryHourBot Bot.\nVersion 2.0.0\n\n'+
'Module Status:\n'+
'Use Mastodon: '+process.env.USE_MASTODON +'\n'+
'Use BlueSky: '+process.env.USE_BLUESKY+'\n'+
'Use Twitter: '+process.env.USE_TWITTER+'\n'+
'Debug Mode Enabled: '+process.env.DEBUG_MODE+'\n'
);

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
let timestamp = Date.now();
console.log('Starting new run at UNIX time '+timestamp)
const filePayload = await getPayload()
if(process.env.USE_MASTODON == "true") {child.fork('./ehb_modules/mastodon.js').send(filePayload)}
if(process.env.USE_BLUESKY == "true") {child.fork('./ehb_modules/bluesky.js').send(filePayload)}
if(process.env.USE_TWITTER == "true") {child.fork('./ehb_modules/twitter.js').send(filePayload)}
} 


if(process.env.DEBUG_MODE == "true"){
        console.log('!!!!!!DEBUG MODE ON --- BYPASSING TIMER AND EXITING AFTER EXECUTION!!!!!!')
        runJob()
}
else{
        const job = schedule.scheduleJob(rule, function(){
                console.log('\nExecuting modules\n');
                runJob()
        });
}
