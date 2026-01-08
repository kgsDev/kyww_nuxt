//This API page is for inviting users - sends off emails to users who have attended a training session
//invite-users.post_OLD.ts
import { v4 as uuidv4 } from 'uuid';
import sendgrid from '@sendgrid/mail';
import { readBody, send, setResponseStatus, createError, sendError } from 'h3';
import { getApiConfig, getDirectusHeaders } from '../utils/config';
import { sendEmailSafely } from '../utils/emailUtils';

const config = getApiConfig();
sendgrid.setApiKey(config.SENDGRID_API_KEY);

export default eventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { emails, 
      training_date, 
      training_location,
      trainer_id,
      trainer_name,
      training_field_chemistry,
      training_r_card,
      training_habitat,
      training_biological,
      training_no_training,
    } = body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid or missing emails list'
      });
    }

    // Send immediate response (202 Accepted)
    setResponseStatus(event, 202);
    send(event, JSON.stringify({ 
      status: 'success',
      message: 'Processing invitations. You will be notified of any failures.',
      timestamp: new Date().toISOString()
    }), 'application/json');

    // Process emails asynchronously with better error tracking
    setImmediate(async () => {
      const results = { sent: 0, failed: 0, errors: [] };
      
      for (const email of emails) {
        try {
          const token = uuidv4();

          // Check for existing invite
          const existingInviteResponse = await fetch(
            `${config.public.directusUrl}/items/user_invites?filter[email][_eq]=${email}`,
            {
              method: 'GET',
              headers: getDirectusHeaders(config),
            }
          );

          if (!existingInviteResponse.ok) {
            throw new Error(`Failed to fetch existing invite for ${email}`);
          }

          const existingInviteData = await existingInviteResponse.json();
          if (existingInviteData.data?.length > 0) {
            for (const invite of existingInviteData.data) {
              const deleteResponse = await fetch(
                `${config.public.directusUrl}/items/user_invites/${invite.id}`,
                {
                  method: 'DELETE',
                  headers: getDirectusHeaders(config),
                }
              );

              if (!deleteResponse.ok) {
                throw new Error(`Failed to delete existing invite for ${email}`);
              }
            }
          }

          const inviteBody = {
            email,
            trainer_id,
            trainer_name,
            training_field_chemistry,
            training_r_card,
            training_habitat,
            training_biological,
            training_no_training,
            invite_token: token,
            invite_sent_at: new Date().toISOString(),
          };

          // Only add training date and location if they're set and not empty
          // (they should be empty if training_no_training is true)
          if (training_date && training_date.trim() !== '') {
            inviteBody.training_date = training_date;
          }
          
          if (training_location && training_location.trim() !== '') {
            inviteBody.training_location = training_location;
          }

          // Create new invite
          const inviteResponse = await fetch(`${config.public.directusUrl}/items/user_invites`, {
            method: 'POST',
            headers: getDirectusHeaders(config),
            body: JSON.stringify(inviteBody),
          });

          if (!inviteResponse.ok) {
            const errorData = await inviteResponse.json();
            console.error('Error creating invite:', errorData);
            throw new Error(`Failed to create invite for ${email}`);
          }

          // Send the invitation email with different content based on training type
          const signupLink = `https://kyww.uky.edu/signup/?token=${token}`;
          
          let emailSubject, emailContent;
          
          if (training_no_training) {
            // For non-samplers (hub contacts, etc.)
            emailSubject = 'Kentucky Watershed Watch Data Portal Access';
            emailContent = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Welcome to Kentucky Watershed Watch!</h2>
                <p>You've been invited to join the Kentucky Watershed Watch data portal. As a hub contact or community partner, you'll have access to our network of citizen scientists working to protect Kentucky's water resources!</p>
                <div style="margin: 30px 0;">
                  <h3 style="color: #4CAF50;">Next Step: Create Your Data Portal Account</h3>
                  <p>You're now invited to create your account in the KYWW data portal where you'll be able to view and support our stream monitoring network.</p>
                  <div style="text-align: center; margin: 25px 0;">
                    <a href="${signupLink}" 
                       style="background-color: #4CAF50; color: white; padding: 12px 25px; 
                              text-decoration: none; border-radius: 4px; display: inline-block;">
                      Create Your Data Portal Account
                    </a>
                  </div>
                </div>
                <div style="margin: 30px 0; padding: 20px; background-color: #f8f8f8; border-radius: 4px;">
                  <p style="color: #666; margin-bottom: 10px;"><strong>Important Security Notice:</strong></p>
                  <ul style="color: #666; margin: 0; padding-left: 20px;">
                    <li>This invitation link is unique to you and will expire after use</li>
                    <li>Kentucky Watershed Watch will never ask for your password via email or phone</li>
                    <li>Always ensure you're accessing our official websites: kyww.uky.edu and kywater.org</li>
                  </ul>
                </div>
                <p style="margin-top: 30px;">Best regards,<br>Kentucky Watershed Watch Team</p>
                <p style="color: #666; font-size: 0.9em; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                  Questions about registration? Need assistance?<br>
                  Contact us at contact@kywater.org
                </p>
              </div>
            `;
          } else {
            // For trained samplers
            emailSubject = 'Complete Your Kentucky Watershed Watch Registration';
            emailContent = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Welcome to Kentucky Watershed Watch!</h2>
                <p>Thank you for attending the Kentucky Watershed Watch Sampler Training${training_date ? ` on ${new Date(training_date).toLocaleDateString()}` : ''}${training_location ? ` at ${training_location}` : ''}. We're excited to have you join our network of citizen scientists working to protect Kentucky's water resources!</p>
                <div style="margin: 30px 0;">
                  <h3 style="color: #4CAF50;">Next Step: Create Your Data Portal Account</h3>
                  <p>You're now invited to create your account in the KYWW data portal where you'll be able to enter and track your stream sample data.</p>
                  <div style="text-align: center; margin: 25px 0;">
                    <a href="${signupLink}" 
                       style="background-color: #4CAF50; color: white; padding: 12px 25px; 
                              text-decoration: none; border-radius: 4px; display: inline-block;">
                      Create Your Data Portal Account
                    </a>
                  </div>
                </div>
                <div style="margin: 30px 0; padding: 20px; background-color: #f8f8f8; border-radius: 4px;">
                  <p style="color: #666; margin-bottom: 10px;"><strong>Important Security Notice:</strong></p>
                  <ul style="color: #666; margin: 0; padding-left: 20px;">
                    <li>This invitation link is unique to you and will expire after use</li>
                    <li>Kentucky Watershed Watch will never ask for your password via email or phone</li>
                    <li>Always ensure you're accessing our official websites: kyww.uky.edu and kywater.org</li>
                  </ul>
                </div>
                <p style="margin-top: 30px;">Best regards,<br>Kentucky Watershed Watch Team</p>
                <p style="color: #666; font-size: 0.9em; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                  Questions about registration? Need assistance?<br>
                  Contact us at contact@kywater.org
                </p>
              </div>
            `;
          }

          const emailResult = await sendEmailSafely({
            to: email,
            from: { email: 'contact@kywater.org', name: 'Kentucky Watershed Watch' },
            subject: emailSubject,
            html: emailContent
          });

          if (emailResult.success) {
            results.sent++;
          } else {
            results.failed++;
            results.errors.push(`${email}: ${emailResult.error}`);
          }
          
        } catch (error) {
          results.failed++;
          results.errors.push(`${email}: ${error.message}`);
          console.error(`Failed to process invite for ${email}:`, error);
        }
      }
      
      // Log summary for admin monitoring
      console.log('Invitation batch complete:', results);
      
      // Optionally notify admin of failures via email if there were many failures
      if (results.failed > 0 && results.failed / emails.length > 0.5) {
        await sendEmailSafely({
          to: 'admin@kywater.org', // Replace with actual admin email
          from: { email: 'contact@kywater.org', name: 'Kentucky Watershed Watch' },
          subject: 'High failure rate in invitation batch',
          html: `
            <p>Invitation batch completed with ${results.failed} failures out of ${emails.length} total.</p>
            <p>Errors: ${results.errors.join(', ')}</p>
          `
        });
      }
    });

  } catch (error) {
    console.error('Error sending invitations:', error);
    sendError(event, createError({ statusCode: 500, statusMessage: 'Failed to process invitations' }));
  }
});