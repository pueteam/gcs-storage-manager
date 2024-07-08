const flowbite = require('flowbite-react/tailwind');

module.exports = {
  darkMode: 'class',
  content: [
    './src/renderer/**/*.{js,jsx,ts,tsx,html}',
    'node_modules/flowbite-react/**/*.{js,jsx,ts,tsx}',
    flowbite.content(),
  ],
  theme: {
    extend: {},
  },
  plugins: [flowbite.plugin()],
};
