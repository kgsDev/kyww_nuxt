//This API page is for inviting users - sends off emails to users who have attended a training session

import { v4 as uuidv4 } from 'uuid';
import sendgrid from '@sendgrid/mail';
import { readBody, send } from 'h3'; // Correct imports from h3

sendgrid.setApiKey(process.env.EMAIL_SENDGRID_API_KEY);


//this is for user verification - which is not implemented here
/*
const configPublic = useRuntimeConfig().public;
const roles = {
  sampler: configPublic.SAMPLER_ROLE_ID,
  trainer: configPublic.TRAINER_ROLE_ID,
  basin_lead: configPublic.BASIN_LEAD_ROLE_ID,
  admin: configPublic.ADMIN_ROLE_ID,
};

// Function to fetch the user based on the Bearer token
async function fetchUser(token: string) {
  const response = await fetch(`${process.env.DIRECTUS_URL}/users/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  const userData = await response.json();
  return userData.data; // Assuming the role is in `userData.data.role`
}
*/

export default eventHandler(async (event) => {
  const body = await readBody(event);
  const { emails, 
    training_date, 
    training_location,
    training_field_chemistry,
    training_r_card,
    training_habitat,
    training_biological,
  } = body; // Extract the new fields

  try {
    send(event, JSON.stringify({ message: 'Processing invitations' }), 200);

    setImmediate(async () => {
      for (const email of emails) {
        const token = uuidv4();

        // Check if the email already has an invite
        const existingInviteResponse = await fetch(`${process.env.DIRECTUS_URL}/items/user_invites?filter[email][_eq]=${email}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${process.env.DIRECTUS_SERVER_TOKEN}`,
            'Content-Type': 'application/json',
          },
        });

        const existingInviteData = await existingInviteResponse.json();

        if (existingInviteData.data.length > 0) {
          // Delete existing invites if any
          for (const invite of existingInviteData.data) {
            await fetch(`${process.env.DIRECTUS_URL}/items/user_invites/${invite.id}`, {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${process.env.DIRECTUS_SERVER_TOKEN}`,
                'Content-Type': 'application/json',
              },
            });
          }
        }

        try {
     
          const response = await fetch(`${process.env.DIRECTUS_URL}/items/user_invites`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.DIRECTUS_SERVER_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email,
              training_date,     
              training_location,
              training_field_chemistry,
              training_r_card,
              training_habitat,
              training_biological,
              invite_token: token,
              invite_sent_at: new Date().toISOString(),
            }),
          });
          // Check if invite creation was successful
          if (!response.ok) {
            const errorData = await response.json();
            console.error('Error creating invite:', errorData);
            throw new Error(`Failed to create invite: ${response.statusText}`);
          }
        
          // If successful, proceed to send email
          const signupLink = `https://kyww.uky.edu/signup/?token=${token}`;
        
          await sendgrid.send({
            to: email,
            from: {
              email: 'contact@kywater.org',
              name: 'Kentucky Watershed Watch'
            },
            subject: 'Complete Your Kentucky Watershed Watch Registration',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Welcome to Kentucky Watershed Watch!</h2>
                
                <p>Thank you for attending the Kentucky Watershed Watch Sampler Training. We're excited to have you join our network of citizen scientists working to protect Kentucky's water resources!</p>
                
                <div style="margin: 30px 0;">
                  <h3 style="color: #4CAF50;">Next Step: Create Your Data Portal Account</h3>
                  <p>You're now invited to create your account in the KWW data portal where you'll be able to enter and track your stream sample data.</p>
                  
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
            `
          });
        
        } catch (error) {
          console.error('An error occurred:', error.message);
          // Optionally, log additional error details for debugging
        }
      }
    });
  } catch (error) {
    console.error('Error sending invitations:', error);
  }
});