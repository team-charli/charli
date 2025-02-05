// tests/helpers/googleAuth.ts

export async function getGoogleTokensViaRefreshToken() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET!;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN!;

  const lengths = {clientId: clientId.length, clientSecret: clientSecret.length, refreshToken: refreshToken.length}
  console.log("lengths", lengths);

  // Build the request body as x-www-form-urlencoded, since Google's endpoint expects that
  const bodyParams = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: bodyParams.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Google token endpoint response:', errorBody);
    throw new Error(`Failed to refresh tokens: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token as string,
    idToken: data.id_token as string,
  };
}
