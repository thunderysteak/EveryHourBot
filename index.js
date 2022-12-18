//var schedule = require('node-schedule');
import defaultExport, * as schedule from 'node-schedule'
import * as child from 'child_process';

console.log('Welcome to EveryHourBot Bot.\nVersion 1.1.0');

const rule = new schedule.RecurrenceRule();
rule.minute = 0;

const job = schedule.scheduleJob(rule, function(){
        child.fork('./maincore.js');
        console.log('\nExecuting main core\n');
});

