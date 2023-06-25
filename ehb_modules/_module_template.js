/*

####################################
###EVERY HOUR BOT MODULE TEMPLATE###
####################################

The version 2 of the EHB bot is now modular and utilises parent and child
processes. Parent runs a randomisation logic and then spawns child processes
with a provided generated file path to keep all services in sync. This ensures
that if one module fails catastrophically, the whole bot doesn't grind to a
halt and still posts to rest of the platforms. 

This template is a quick starting block for bringing implementation to any
additional social media platforms that are currently not supported.

Ensure to update index.js to execute the module

*/

import * as fs from 'node:fs/promises'
import * as dotenv from 'dotenv'
import { exit } from 'node:process';

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

const doYourFunctionHere = async () => {

//Your code here. Grab the image path from the 'imagePath' variable and use fs to read the file.

}

//Use async logic where we first obtain the payload, then perform our function and then exit the process.
getPayload()
.then(() => {
    doYourFunctionHere()
    .then(() => {
        exit(0)
    })
})