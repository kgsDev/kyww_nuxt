// server/api/verify-reset-token.post.ts
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { token } = body;

    if (!token) {
      return { valid: false };
    }

    // Log the URL we're about to call
    const url = `${process.env.DIRECTUS_URL}/users?filter[reset_token][_eq]=${encodeURIComponent(token)}`;

    // Check token in Directus
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.DIRECTUS_SERVER_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { valid: false };
    }

    const userData = await response.json();

    if (!userData.data || userData.data.length === 0) {
      return { valid: false };
    }

    const user = userData.data[0];
    const now = new Date();
    const expiryDate = new Date(user.reset_token_expires);

    const isValid = user.reset_token === token && expiryDate > now;

    return { valid: isValid };
  } catch (error) {
    return { valid: false, error: error.message };
  }
});