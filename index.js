var schedule = require('node-schedule');

console.log('Welcome to EveryHourBot Twitter Bot.\nVersion 1.0.0');

const rule = new schedule.RecurrenceRule();
rule.minute = 0;

const job = schedule.scheduleJob(rule, function(){
        require('child_process').fork('./maincore.js');
        console.log('\nExecuting main core\n');
});

