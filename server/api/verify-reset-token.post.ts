import { defineEventHandler, readBody, sendError } from 'h3';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { token } = body;
    const config = useRuntimeConfig();

    if (!token) {
      console.warn('Token is missing in the request body');
      return { valid: false, error: 'Token is required' };
    }

    const url = `${config.public.DIRECTUS_URL}/users?filter[reset_token][_eq]=${encodeURIComponent(token)}`;
    console.log('Verifying token at URL:', url);

    // Check token in Directus
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.DIRECTUS_SERVER_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to verify token: ${errorText}`);
      return { valid: false, error: 'Failed to verify token with Directus' };
    }

    const userData = await response.json();

    if (!userData.data || userData.data.length === 0) {
      console.warn('No user found with the provided reset token');
      return { valid: false, error: 'Invalid or expired token' };
    }

    const user = userData.data[0];
    const now = new Date();
    const expiryDate = new Date(user.reset_token_expires);

    const isValid = user.reset_token === token && expiryDate > now;

    if (!isValid) {
      console.warn('Token is invalid or expired');
      return { valid: false, error: 'Invalid or expired token' };
    }

    return { valid: isValid };
  } catch (error) {
    console.error('An unexpected error occurred during token verification:', error);
    sendError(event, createError({ statusCode: 500, statusMessage: 'Internal Server Error', data: { valid: false, error: error.message } }));
  }
});