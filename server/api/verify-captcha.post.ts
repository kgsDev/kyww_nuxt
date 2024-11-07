// server/api/verify-captcha.post.ts
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const token = body.token;

    const config = useRuntimeConfig();
    const secretKey = config.RECAPTCHA_SECRET_KEY;


    if (!token) {
      return { success: false, error: 'No CAPTCHA token provided' };
    }

    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });

    const data = await response.json();

    return { 
      success: data.success,
      score: data.score, // if using v3
      action: data.action // if using v3
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.message 
    };
  }
});