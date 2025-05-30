// File: server/api/contact-sampler.ts
import sendgrid from '@sendgrid/mail';
import { defineEventHandler, readBody, createError } from 'h3';
import { getApiConfig, getDirectusHeaders } from '../utils/config';

const config = getApiConfig();
sendgrid.setApiKey(config.SENDGRID_API_KEY);

export default defineEventHandler(async (event) => {
  try {
    const { token, password } = await readBody(event);

    if (!token || !password) {
      console.warn('Token and password are required fields');
      throw createError({
        statusCode: 400,
        message: 'Token and password are required',
      });
    }

    // Find user with valid token and expiration
    const userResponse = await fetch(
      `${config.public.directusUrl}/users?filter[reset_token][_eq]=${encodeURIComponent(token)}&filter[reset_token_expires][_gt]=${encodeURIComponent(new Date().toISOString())}`,
      {
        headers: getDirectusHeaders(config),
      }
    );

    if (!userResponse.ok) {
      console.error('Failed to fetch user with reset token:', await userResponse.text());
      throw createError({
        statusCode: 400,
        message: 'Invalid or expired reset token',
      });
    }

    const userData = await userResponse.json();

    if (!userData.data || userData.data.length === 0) {
      console.warn('No user found with valid reset token');
      throw createError({
        statusCode: 400,
        message: 'Invalid or expired reset token',
      });
    }

    const user = userData.data[0];

    // Update user's password and clear reset token
    const updateResponse = await fetch(
      `${config.public.directusUrl}/users/${user.id}`,
      {
        method: 'PATCH',
        headers: getDirectusHeaders(config),
        body: JSON.stringify({
          password: password,
          reset_token: null,
          reset_token_expires: null,
        }),
      }
    );

    if (!updateResponse.ok) {
      console.error('Failed to update password for user:', await updateResponse.text());
      throw createError({
        statusCode: 500,
        message: 'Failed to update password',
      });
    }

    // Send confirmation email
    await sendgrid.send({
      to: user.email,
      from: {
        email: 'contact@kywater.org',
        name: 'Kentucky Watershed Watch',
      },
      subject: 'Password Successfully Reset - Kentucky Watershed Watch',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Successful</h2>
          <p>Hello,</p>
          <p>Your Kentucky Watershed Watch account password has been successfully reset.</p>
          <div style="margin: 30px 0; padding: 20px; background-color: #f8f8f8; border-radius: 4px;">
            <p style="color: #666; margin-bottom: 10px;"><strong>Important Security Reminders:</strong></p>
            <ul style="color: #666; margin: 0; padding-left: 20px;">
              <li>Kentucky Watershed Watch will never ask for your password via email or phone.</li>
              <li>We recommend using unique passwords for each of your online accounts.</li>
              <li>If you did not make this change, please contact us (contact@kywater.org) immediately.</li>
              <li>For additional security, remember to log out when using shared computers.</li>
            </ul>
          </div>
          <p>You can now log in to your account with your new password.</p>
          <p style="margin-top: 30px;">Best regards,<br>Kentucky Watershed Watch Team</p>
          <p style="color: #666; font-size: 0.9em; margin-top: 30px;">
            If you have any questions or concerns about your account security, 
            please contact us at contact@kywater.org
          </p>
        </div>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('Password reset error:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'An error occurred while resetting your password.',
    });
  }
});