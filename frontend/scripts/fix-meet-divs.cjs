const fs = require('fs');
const p = require('path').join(__dirname, '../src/pages/live/AdeebMeet.jsx');
const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);

lines[456] = '                <div className="flex-1 p-3 md:p-4 overflow-y-auto min-h-0">';
lines[475] = '                            </motion.div>'.replace('motion.div', 'div');
lines[491] = '                            </motion.div>'.replace('motion.div', 'motion.div');
lines[492] = '                        </motion.div>'.replace('motion.div', 'motion.div');
lines[516] = '                        </motion.div>'.replace('motion.div', 'motion.div');
lines[518] = '                </motion.div>'.replace('motion.div', 'motion.div');

// Apply div fixes
[475, 491, 492, 516, 518].forEach((idx) => {
    lines[idx] = lines[idx].replace(/<\/?motion\.div>/g, (m) => m.replace('motion.', ''));
});

fs.writeFileSync(p, lines.join('\n'));
console.log('done');
