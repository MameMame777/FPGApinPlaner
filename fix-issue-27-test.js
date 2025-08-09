// Quick fix script for issue-27 test file
const fs = require('fs');

const filePath = 'src/test/issue-27-save-export.test.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Replace store.getState() with store
content = content.replace(/store\.getState\(\)/g, 'store');

// Replace setState calls with direct assignment
content = content.replace(/const currentState = store;\s*store\.setState\(\{ \.\.\.currentState, filteredPins: mockPins \}\);/g, 'store.filteredPins = mockPins;');
content = content.replace(/const currentState = store;\s*store\.setState\(\{ \.\.\.currentState, filteredPins: \[\] \}\);/g, 'store.filteredPins = [];');

// Remove state variable definitions that use store
content = content.replace(/const state = store;\s*/g, '');

// Replace state. with store. 
content = content.replace(/state\./g, 'store.');

fs.writeFileSync(filePath, content);
console.log('Fixed issue-27 test file');
