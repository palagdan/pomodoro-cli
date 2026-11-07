// Demo-only: os.userInfo() ignores $USER, so patch it to show a neutral name in the GIF.
const os = require('os');
const real = os.userInfo;
os.userInfo = (...args) => ({ ...real(...args), username: 'demo' });
