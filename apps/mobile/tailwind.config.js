const colors = require('./theme/colors');

module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './theme/**/*.{js,ts}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: { colors },
  },
  plugins: [],
};
