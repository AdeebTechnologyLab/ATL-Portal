const fs = require('fs');
const p = require('path').join(__dirname, '../src/pages/live/AdeebMeet.jsx');
let s = fs.readFileSync(p, 'utf8');

s = s.replace(
    '        </motion.div>\n    ) : null;\n\nconst VideoTile',
    '        </div>\n    ) : null;\n\nconst VideoTile'
);
s = s.replace(
    '                </motion.div>\n                <AudioWave active={showWave} />',
    '                </motion.div>\n                <AudioWave active={showWave} />'
);
// fix inner label div close
s = s.replace(
    /(\{isScreenShare &&[\s\S]*?<\/span>\s*\)\}\s*)<\/motion\.motion\.motion\.div>/,
    '$1</div>'
);
// simpler
s = s.replace(
    '                    )}\n                </motion.div>\n                <AudioWave active={showWave} />',
    '                    )}\n                </div>\n                <AudioWave active={showWave} />'
);
s = s.replace(
    '            </motion.div>\n            <AnimatePresence>',
    '            </div>\n            <AnimatePresence>'
);
s = s.replace(
    '<motion.div\n            className={`relative bg-white/5 rounded-2xl',
    '<div\n            className={`relative bg-white/5 rounded-2xl'
);
s = s.replace(
    '            </AnimatePresence>\n        </motion.div>\n    );\n};\n\nconst RemoteVideoTile',
    '            </AnimatePresence>\n        </div>\n    );\n};\n\nconst RemoteVideoTile'
);

fs.writeFileSync(p, s);
console.log('fixed videotile');
