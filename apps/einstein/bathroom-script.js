'use strict';

var alexa = require('alexa-app');
var app = new alexa.app('einstein');
var violet = require('../../lib/violet.js')(app);
var violetUtils = require('../../lib/violetUtils.js')(violet);

//Violet queries for list of doctors associated with me and creates an array of expected results

violet.addKeyTypes({
  'doctor': 'AMAZON.US_FIRST_NAME',
});

//common across multiple goals
violet.addPhraseEquivalents([
  ['When\'s', 'When is'],
  ['I\'d', 'I would']
]);

violet.respondTo({
  expecting: ['When is my appointment with [[doctor]]?', 'When do I see [[doctor]] next', 'Do I have an upcoming appointment with [[doctor]]'],
  resolve: (response) => {
    var doctor = response.get('[[doctor]]');
    var days = 3;
    var time = '11:30 AM';
    var dayOfTheWeek = 'Thursday';

    response.say('Your next appointment with ' + response.get('[[doctor]]') + ' is in ' + days + ' days, \
      on ' + dayOfTheWeek + ' at ' + time);
}});

violet.respondTo({
  expecting: ['Can you set a reminder for me?', 'I would like to set a reminder'],
  resolve: (response) => {
    response.say('I can do that for you. Please start recording your reminder now');
}});

module.exports = app;