const fs = require('fs');
// Read as utf16le? Or just read buffer and toString?
// Node fs usually reads utf8 by default. If file is utf16le, it might look like garbage.
// But let's try reading as utf16le just in case.
try {
    const data = fs.readFileSync('dump4.txt', 'utf16le');
    console.log(data);
} catch (e) {
    console.log('Error reading utf16le, trying utf8');
    try {
        const data2 = fs.readFileSync('dump4.txt', 'utf8');
        console.log(data2);
    } catch (e2) {
        console.error(e2);
    }
}
