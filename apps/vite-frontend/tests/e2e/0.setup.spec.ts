// tests/e2e/0.setup.spec.ts
import { test, expect } from '@playwright/test';
import { getGoogleTokensViaRefreshToken } from './helpers/googleAuth';

test.describe('Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Get real tokens
    const { idToken, accessToken } = await getGoogleTokensViaRefreshToken();

    // 2. Construct a URL with tokens in the hash
    const urlWithTokens = `http://localhost:5173/#id_token=${idToken}&access_token=${accessToken}`;

    // 3. Visit the app
    await page.goto(urlWithTokens);
  });

  test('should complete registration flow with real Google OAuth tokens', async ({ page }) => {
    // 4. Wait for your app to finish the chain
    await expect(page.getByText('Welcome new user')).toBeVisible();
    // Or whichever element indicates successful registration

    // ... run additional checks, e.g. verifying Supabase user data, etc.
  });

  test.afterAll(async () => {
    // 5. Optionally remove the test user from your DB, etc.
    // e.g., call your custom endpoint or Supabase directly
  });
});

