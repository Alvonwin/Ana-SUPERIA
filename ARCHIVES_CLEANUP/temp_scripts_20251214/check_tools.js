const fs = require('fs');
const content = fs.readFileSync('E:/ANA/server/agents/tool-agent.cjs', 'utf8');

// Extract tool definitions
const defMatches = content.match(/name: '([^']+)'/g) || [];
const definitions = defMatches.map(m => m.replace("name: '", '').replace("'", ''));

// Extract implementations
const implMatches = content.match(/async (\w+)\(args\)/g) || [];
const implementations = implMatches.map(m => m.replace('async ', '').replace('(args)', ''));

// Find missing
const defsSet = new Set(definitions);
const implsSet = new Set(implementations);

const missingImpl = [...defsSet].filter(d => !implsSet.has(d));
const extraImpl = [...implsSet].filter(i => !defsSet.has(i));

console.log('Definitions:', defsSet.size);
console.log('Implementations:', implsSet.size);
console.log('\nMissing implementations:', missingImpl.length);
if (missingImpl.length > 0) console.log(missingImpl.join(', '));
console.log('\nExtra implementations (no definition):', extraImpl.length);
if (extraImpl.length > 0) console.log(extraImpl.join(', '));
