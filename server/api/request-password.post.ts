// server/api/request-password.post.ts
import { v4 as uuidv4 } from 'uuid';
import sendgrid from '@sendgrid/mail';
import { defineEventHandler, readBody, sendError } from 'h3';

const config = useRuntimeConfig();
sendgrid.setApiKey(config.SENDGRID_API_KEY);

export default defineEventHandler(async (event) => {
  try {
    // Get request body
    const body = await readBody(event);
    const { email, captchaToken } = body;

    if (!captchaToken) {
      console.warn('CAPTCHA token is missing');
      throw createError({
        statusCode: 400,
        message: 'CAPTCHA token is required',
      });
    }

    // Verify reCAPTCHA
    const recaptchaResponse = await $fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      body: new URLSearchParams({
        secret: config.RECAPTCHA_SECRET_KEY,
        response: captchaToken,
      }),
    });

    if (!recaptchaResponse.success) {
      console.warn('Invalid CAPTCHA response');
      throw createError({
        statusCode: 400,
        message: 'Invalid CAPTCHA',
      });
    }

    // Find user by email without revealing user existence
    const userResponse = await fetch(
      `${config.public.DIRECTUS_URL}/users?filter[email][_eq]=${encodeURIComponent(email)}`,
      {
        headers: {
          Authorization: `Bearer ${config.DIRECTUS_SERVER_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!userResponse.ok) {
      console.error('Failed to fetch user data:', await userResponse.text());
      return { message: 'If an account exists, a reset link has been sent.' };
    }

    const userData = await userResponse.json();

    if (!userData.data || userData.data.length === 0) {
      console.warn('No account found with the provided email');
      return { message: 'If an account exists, a reset link has been sent.' };
    }

    const user = userData.data[0];
    const resetToken = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1-hour expiration

    // Update user with reset token
    const updateResponse = await fetch(
      `${config.public.DIRECTUS_URL}/users/${user.id}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${config.DIRECTUS_SERVER_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reset_token: resetToken,
          reset_token_expires: expiresAt.toISOString(),
        }),
      }
    );

    if (!updateResponse.ok) {
      console.error('Failed to update user with reset token:', await updateResponse.text());
      throw createError({
        statusCode: 500,
        message: 'Failed to update user with reset token',
      });
    }

    // Send password reset email
    const resetLink = `https://kyww.uky.edu/reset-password?token=${resetToken}`;
    await sendgrid.send({
      to: email,
      from: {
        email: 'contact@kywater.org',
        name: 'Kentucky Watershed Watch',
      },
      subject: 'Password Reset Request - Kentucky Watershed Watch',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>Hello,</p>
          <p>We received a request to reset your password for your Kentucky Watershed Watch account.</p>
          <p>Click the button below to reset your password. This link will expire in 1 hour.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="background-color: #4CAF50; color: white; padding: 12px 25px; 
                      text-decoration: none; border-radius: 4px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <div style="margin-top: 30px; padding: 20px; background-color: #f8f8f8; border-radius: 4px;">
            <p style="color: #666; margin-bottom: 10px;"><strong>Important Security Notice:</strong></p>
            <ul style="color: #666; margin: 0; padding-left: 20px;">
              <li>Kentucky Watershed Watch will never ask you for your password via email or phone.</li>
              <li>If you didn't request this password reset, please ignore this email.</li>
              <li>If you're concerned about the security of your account, please contact us (contact@kywater.org) immediately.</li>
            </ul>
          </div>
          <p style="margin-top: 30px;">Best regards,<br>Kentucky Watershed Watch Team</p>
        </div>
      `,
    });

    return { message: 'If an account exists, a reset link has been sent.' };

  } catch (error) {
    console.error('Password reset error:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'An error occurred while processing your request.',
    });
  }
});