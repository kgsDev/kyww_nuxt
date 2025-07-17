//this is for the trainer report page, which shows all users managed by a trainer
//trainer-report.ts
import { getApiConfig, getDirectusHeaders } from '../utils/config';
import { v4 as uuidv4 } from 'uuid';
import sendgrid from '@sendgrid/mail';
import { sendEmailSafely } from '../utils/emailUtils';

export default defineEventHandler(async (event) => {
  const config = getApiConfig();
  const method = event.method;
  
  if (method === 'GET') {
    const { trainerId, includeOtherTrainers } = getQuery(event);
    
    if (!trainerId) {
      throw createError({
        statusCode: 400,
        message: 'Must be authorized to see this'
      });
    }
    
    try {
      // Get users managed by this trainer
      const usersResponse = await fetch(
        `${config.public.directusUrl}/users?filter[trainer_id][_eq]=${trainerId}&limit=-1`,
        {
          headers: getDirectusHeaders(config),
        }
      );
    
      if (!usersResponse.ok) {
        throw new Error('Failed to fetch users');
      }
    
      const usersData = await usersResponse.json();
      
      let otherTrainersUsers = [];
      
      // NEW: If includeOtherTrainers is requested, fetch users trained by other trainers
      if (includeOtherTrainers === 'true') {
        try {
          // Fetch users where trainer_id is NOT the current trainer and not null
          const otherUsersResponse = await fetch(
            `${config.public.directusUrl}/users?filter[_and][0][trainer_id][_neq]=${trainerId}&filter[_and][1][trainer_id][_nnull]=true&limit=-1&fields=id,first_name,last_name,email,trainer_id,trainer_name`,
            {
              headers: getDirectusHeaders(config),
            }
          );
          
          if (otherUsersResponse.ok) {
            const otherUsersData = await otherUsersResponse.json();
            otherTrainersUsers = otherUsersData.data || [];
          } else {
            console.warn('Failed to fetch other trainers users:', otherUsersResponse.status);
          }
        } catch (error) {
          console.warn('Error fetching other trainers users:', error);
          // Continue without other trainers' data rather than failing completely
        }
      }
    
      return {
        users: usersData.data,
        otherTrainersUsers: otherTrainersUsers
      };
    } catch (error) {
      console.error('Trainer report error:', error);
      throw createError({
        statusCode: 500,
        message: 'Failed to fetch trainer report data'
      });
    }
  } 
  // Handle DELETE request for removing invites
  else if (method === 'DELETE') {
    try {
      const body = await readBody(event);
      const { trainerId, inviteId } = body;
      
      if (!trainerId || !inviteId) {
        throw createError({
          statusCode: 400,
          message: 'Trainer ID and Invite ID are required'
        });
      }
      
      // First verify the trainer owns this invite
      const verifyResponse = await fetch(
        `${config.public.directusUrl}/items/user_invites/${inviteId}`,
        {
          headers: getDirectusHeaders(config),
        }
      );
      
      if (!verifyResponse.ok) {
        throw new Error('Failed to verify invite ownership');
      }
      
      const inviteData = await verifyResponse.json();
      
      if (inviteData.data.trainer_id !== trainerId) {
        throw createError({
          statusCode: 403,
          message: 'Not authorized to delete this invite'
        });
      }
      
      // Delete the invite
      const deleteResponse = await fetch(
        `${config.public.directusUrl}/items/user_invites/${inviteId}`,
        {
          method: 'DELETE',
          headers: getDirectusHeaders(config),
        }
      );
      
      if (!deleteResponse.ok) {
        throw new Error('Failed to delete invite');
      }
      
      return {
        success: true,
        message: 'Invitation deleted successfully'
      };
    } catch (error) {
      console.error('Delete invite error:', error);
      throw createError({
        statusCode: 500,
        message: 'Failed to delete invitation'
      });
    }
  }
  // Handle POST request for resending invites
  else if (method === 'POST') {
    try {
      sendgrid.setApiKey(config.SENDGRID_API_KEY);
      
      const body = await readBody(event);
      const { trainerId, inviteId, email } = body;
      
      if (!trainerId || !inviteId || !email) {
        throw createError({
          statusCode: 400,
          message: 'Trainer ID, Invite ID and email are required'
        });
      }
      
      // First verify the trainer owns this invite and get invite data
      const verifyResponse = await fetch(
        `${config.public.directusUrl}/items/user_invites/${inviteId}`,
        {
          headers: getDirectusHeaders(config),
        }
      );
      
      if (!verifyResponse.ok) {
        throw new Error('Failed to verify invite ownership');
      }
      
      const inviteData = await verifyResponse.json();
      const invite = inviteData.data;
      
      if (invite.trainer_id !== trainerId) {
        throw createError({
          statusCode: 403,
          message: 'Not authorized to resend this invite'
        });
      }
      
      // Generate new token
      const token = uuidv4();
      
      // Update the invite with new token and timestamp
      const updateResponse = await fetch(
        `${config.public.directusUrl}/items/user_invites/${inviteId}`,
        {
          method: 'PATCH',
          headers: {
            ...getDirectusHeaders(config),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            invite_token: token,
            invite_sent_at: new Date().toISOString(),
          }),
        }
      );
      
      if (!updateResponse.ok) {
        throw new Error('Failed to update invitation token');
      }
      
      // Send email with proper error handling
      const signupLink = `https://kyww.uky.edu/signup/?token=${token}`;
      const emailResult = await sendEmailSafely({
        to: email,
        from: {
          email: 'contact@kywater.org',
          name: 'Kentucky Watershed Watch',
        },
        subject: 'Complete Your Kentucky Watershed Watch Registration',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to Kentucky Watershed Watch!</h2>
            <p>Thank you for attending the Kentucky Watershed Watch Sampler Training. We're excited to have you join our network of citizen scientists working to protect Kentucky's water resources!</p>
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
        `,
      });
      
      if (!emailResult.success) {
        console.error('Resend invite email failed:', emailResult.error);
        throw createError({
          statusCode: 500,
          message: 'Failed to send invitation email. Please try again later.'
        });
      }
      
      // Success - return proper response
      return {
        success: true,
        message: 'Invitation resent successfully'
      };
      
    } catch (error) {
      console.error('Resend invite error:', error);
      throw createError({
        statusCode: 500,
        message: 'Failed to resend invitation'
      });
    }
  } else {
    throw createError({
      statusCode: 405,
      message: 'Method not allowed'
    });
  }
});