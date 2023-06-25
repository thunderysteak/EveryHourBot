# EveryHourBot

A bot written in NodeJS that powers @PossumEveryHour, supporting various social media platforms and cryptographic functionality for quality randomness.

Supported Platforms
- Twitter
- Mastodon
- BlueSky

More platforms planned!

# NOTICE: Breaking changes for Twitter!

With v2.0.0 of the bot, the whole codebase was heavily refactored, and the Twitter part has been replaced to utilise V2 API that is compatible with the Twitter Developer Free Tier. You will now need an Access Token that has Read and Write permissions.

You NEED to generate and set up OAuth 2.0 Client ID and Client Secret to grand Read and Write permission to your Access Token. If you don't set this up, you will either receive 403 or 401 HTTP error codes.

Code for the V1 API Twitter bot can be located under the v1.1.0-legacytwitter tag. 

## Dependencies
NodeJS 18 and up
For Twitter: Twitter Developer Account with V2 API access & Access Token with Read and Write permissions

### MASTODON_SERVER & BLUESKY_SERVER .env variable 

For the `MASTODON_SERVER` variable for Mastodon and `BLUESKY_SERVER` variable for BlueSky/AT Protocol, you need to pass a full URL including `https://` for the server.
```
MASTODON_SERVER="https://fqdn.local"
```

## How to use  
There are two ways of running the bot. Running it via a daemon process like PM2 (or running the main file manually) or using Docker.

### Using Docker
1. [Clone the repository](https://docs.github.com/en/github/creating-cloning-and-archiving-repositories/cloning-a-repository) into a location you want it to run from.
2. [Install Docker](https://docs.docker.com/engine/install/), ideally a version that includes V2 Compose. This should be standard for any release after April 2022.
3. Edit the `docker-compose.yaml` file to adjust environment variable values. Use `.env-example` as an example file. 
4. Create a `media` directory in the same path as `docker-compose.yaml` and `index.js`. 
5. `docker compose up` 
6. You're done! No fiddling with RHEL, no worrying about your environment.

### Using PM2/Node
These instructions are for running the bot on a Linux/Windows server system. Code not designed to run on serverless infrastructure like AWS Lambda, Azure Functions or running on Heroku.  

1. [Clone the repository](https://docs.github.com/en/github/creating-cloning-and-archiving-repositories/cloning-a-repository) into a location you want it to run from 
2. Enter the directory where `index.js` is located and run `npm install` to install the required dependencies
3. Populate the `media` folder with pictures of your choosing. BlueSky has a limitation of formats and only supports JPEG and PNG.
4. Obtain the required API keys that are listed in `.env`.
5. Create a new `.env` file and add the required API keys. Use `.env-example` as an example file.  
6. Use a NodeJS daemon process like PM2 to start the bot. As an example, cd to the directory and run `pm2 start -f index.js --name "PossumEveryHour"`

If you are confused on where to start or you have no experience with Linux or servers in general, I'd suggest using something like a [Raspberry Pi](https://www.youtube.com/watch?v=BpJCAafw2qE), or [using an old computer to install Ubuntu Linux onto](https://www.youtube.com/watch?v=D4WyNjt_hbQ) and run your own bot from that. 

### Rocky Linux/RHEL8 requirements
Rocky/RHEL8 ships with NodeJS 10 by default. Execute these commands to disable the NodeJS 10 DNF module, enable NodeJS 18 module and install NodeJS 18:  

```
sudo dnf module disable nodejs:10 -y
sudo dnf module enable nodejs:18 -y
sudo dnf install @nodejs:18
```

Then verify:

```
$ node -v
v18.14.2
```

## How does it work?  

1. `index.js` acts as the main/parent process that regulates the time and spawns child processes from the `ehb_modules`
2. Parent spawns the module `generate_file.js` in a new child process. Its always ran first. This module processes the randomisation and returns a file path back to the parent
3. `index.js` receives the file path back from the child and then spawns other modules for each social media platform with the file path
4. Modules perform their job, their process exists and `index.js` waits for next run

Tested with Rocky Linux 8.5, npm 8.1.2 and nodejs v18.14.2

# Thanks to these people that helped with the development

- Thanks to [IzzyMG](https://github.com/izzymg) for the help fixing up parts of the messy code in the V1.X releases.
