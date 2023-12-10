import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Construct __dirname equivalent in ES module
const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
  plugins: {
    tailwindcss: {
      config: join(__dirname, 'tailwind.config.js'),
    },
    autoprefixer: {},
  },
};
