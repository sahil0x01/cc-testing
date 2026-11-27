#!/usr/bin/env node
'use strict';

// Prints how many todos in a JSON file are done and how many are left.
// Usage: node scripts/stats.js <path-to-todos.json>

var fs = require('fs');

function fail(message) {
  console.error(message);
  process.exit(1);
}

var file = process.argv[2];
if (!file) {
  fail('Usage: node scripts/stats.js <path-to-todos.json>');
}

var raw;
try {
  raw = fs.readFileSync(file, 'utf8');
} catch (err) {
  fail('Could not read ' + file + ': ' + err.message);
}

var todos;
try {
  todos = JSON.parse(raw);
} catch (err) {
  fail('Could not parse ' + file + ' as JSON: ' + err.message);
}

if (!Array.isArray(todos)) {
  fail('Expected ' + file + ' to contain a JSON array of todos.');
}

// Same rule the app uses: only a literal true counts as done.
var done = todos.filter(function (todo) {
  return todo !== null && typeof todo === 'object' && todo.done === true;
}).length;
var left = todos.length - done;

console.log('Done: ' + done);
console.log('Left: ' + left);
