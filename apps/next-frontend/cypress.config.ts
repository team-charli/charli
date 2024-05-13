import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    baseUrl: 'http://localhost:3000', // Set the base URL of your Next.js app
    specPattern: 'cypress/e2e/**/*.spec.ts', // Specify the location of your spec files
  },
});
