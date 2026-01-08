//This API page is for inviting users - sends off emails to users who have attended a training session
//invite-users.post.ts
import { v4 as uuidv4 } from 'uuid';
import sendgrid from '@sendgrid/mail';
import { readBody, setResponseStatus, createError, eventHandler } from 'h3';
import { getApiConfig, getDirectusHeaders } from '../utils/config';
import { sendEmailSafely } from '../utils/emailUtils';

const config = getApiConfig();
sendgrid.setApiKey(config.SENDGRID_API_KEY);

// Helper functions
function createApiResponse(status: string, message: string, code?: string, data?: any) {
  return {
    status,
    message,
    code,
    data,
    timestamp: new Date().toISOString()
  };
}

function respondWithStatus(event: any, response: any, statusCode: number) {
  setResponseStatus(event, statusCode);
  return response;
}

function generateSecureToken(): string {
  return uuidv4();
}

function generateInviteEmailTemplate({ signupUrl, trainingDate, trainingLocation, trainerName, isTrainedSampler, trainingTypes }): string {

  if (!isTrainedSampler) {
    // For non-samplers (hub contacts, etc.) - ORIGINAL DESIGN
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Kentucky Watershed Watch!</h2>
        <p>You've been invited to join the Kentucky Watershed Watch data portal. As a hub contact or community partner, you'll have access to our network of citizen scientists working to protect Kentucky's water resources!</p>
        <div style="margin: 30px 0;">
          <h3 style="color: #4CAF50;">Next Step: Create Your Data Portal Account</h3>
          <p>You're now invited to create your account in the KYWW data portal where you'll be able to view and support our stream monitoring network.</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${signupUrl}" 
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
    // For trained samplers - ORIGINAL DESIGN WITH TRAINING DETAILS BOX
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Kentucky Watershed Watch!</h2>
        <p>Thank you for attending the Kentucky Watershed Watch Sampler Training${trainingDate ? ` on ${new Date(trainingDate).toLocaleDateString()}` : ''}${trainingLocation ? ` at ${trainingLocation}` : ''}. We're excited to have you join our network of citizen scientists working to protect Kentucky's water resources!</p>
        
        <div style="margin: 20px 0; padding: 15px; background-color: white; border: 1px solid #4CAF50; border-left: 4px solid #4CAF50; border-radius: 4px;">
          <p style="margin: 0 0 10px 0; font-weight: bold; color: #333;">Training Session Details:</p>
          <p style="margin: 5px 0; color: #666;"><strong>Date:</strong> ${trainingDate ? new Date(trainingDate).toLocaleDateString() : 'N/A'}</p>
          <p style="margin: 5px 0; color: #666;"><strong>Location:</strong> ${trainingLocation || 'N/A'}</p>
          <p style="margin: 5px 0; color: #666;"><strong>Trainer:</strong> ${trainerName || 'Kentucky Watershed Watch Staff'}</p>
          <p style="margin: 10px 0 5px 0; color: #666;"><strong>Training Completed:</strong></p>
          <ul style="margin: 5px 0; padding-left: 20px; color: #666;">
            ${trainingTypes.fieldChemistry ? '<li>Field Chemistry</li>' : ''}
            ${trainingTypes.rCard ? '<li>R-Card</li>' : ''}
            ${trainingTypes.habitat ? '<li>Habitat</li>' : ''}
            ${trainingTypes.biological ? '<li>Biological</li>' : ''}
          </ul>
        </div>
        
        <div style="margin: 30px 0;">
          <h3 style="color: #4CAF50;">Next Step: Create Your Data Portal Account</h3>
          <p>You're now invited to create your account in the KYWW data portal where you'll be able to enter and track your stream sample data.</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${signupUrl}" 
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
}

export default eventHandler(async (event) => {
  try {
    const body = await readBody(event);
    
    const {
      emails,
      training_date,
      training_location,
      training_field_chemistry = false,
      training_r_card = false,
      training_habitat = false,
      training_biological = false,
      training_no_training = false,
      trainer_id,
      trainer_name,
      equip_ph = false,
      equip_do = false,
      equip_cond = false,
      equip_thermo = false,
      equip_waste = false,
      equip_pan = false,
      equip_flip = false,
      equip_incubator = false,
      kitOption = null,
      desiredHub = null
    } = body;

    // Validation
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return respondWithStatus(event, createApiResponse(
        'error',
        'No email addresses provided',
        'INVALID_INPUT'
      ), 400);
    }

    if (emails.length > 15) {
      return respondWithStatus(event, createApiResponse(
        'error',
        'Cannot process more than 15 emails at once',
        'TOO_MANY_EMAILS'
      ), 400);
    }

    // Validate at least one training type OR no_training flag
    const hasAnyTrainingType = training_field_chemistry || training_r_card || 
                              training_habitat || training_biological || training_no_training;

    if (!hasAnyTrainingType) {
      return respondWithStatus(event, createApiResponse(
        'error',
        'At least one training type must be selected, or check "No Training Conducted"',
        'NO_TRAINING_SELECTED'
      ), 400);
    }

    // Only require training date and location if actual training was conducted
    if (!training_no_training) {
      if (!training_date || !training_location) {
        return respondWithStatus(event, createApiResponse(
          'error',
          'Training date and location are required when training is conducted',
          'MISSING_REQUIRED_FIELDS'
        ), 400);
      }
    }

    if (!trainer_id) {
      return respondWithStatus(event, createApiResponse(
        'error',
        'Trainer ID is required',
        'MISSING_TRAINER_ID'
      ), 400);
    }

    const results = {
      successful: [],
      failed: [],
      alreadyRegistered: []
    };

    // Process each email
    for (const email of emails) {
      try {
        const trimmedEmail = email.trim().toLowerCase();
        
        if (!trimmedEmail) continue;

        // Check if user already exists
        const existingUserResponse = await fetch(
          `${config.public.directusUrl}/users?filter[email][_eq]=${encodeURIComponent(trimmedEmail)}`,
          {
            headers: getDirectusHeaders(config),
            method: 'GET'
          }
        );

        const existingUserData = await existingUserResponse.json();
        
        if (existingUserData.data && existingUserData.data.length > 0) {
          const existingUser = existingUserData.data[0];
          
          // Only create training record if actual training was conducted
          if (!training_no_training) {
            try {
              // Create training history record
              const trainingHistoryResponse = await fetch(
                `${config.public.directusUrl}/items/training_history`,
                {
                  method: 'POST',
                  headers: {
                    ...getDirectusHeaders(config),
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    user_id: existingUser.id,
                    trainer_id,
                    trainer_name,
                    training_date,
                    training_location,
                    training_field_chemistry,
                    training_r_card,
                    training_habitat,
                    training_biological,
                    status: 'published',
                    verified: true,
                    notes: `Training session on ${training_date} at ${training_location}`
                  })
                }
              );

              if (!trainingHistoryResponse.ok) {
                throw new Error('Failed to create training history');
              }

              // CREATE EQUIPMENT HISTORY if any equipment was issued
              const hasEquipment = equip_ph || equip_do || equip_cond || equip_thermo || 
                                  equip_waste || equip_pan || equip_flip || equip_incubator;
              
              if (hasEquipment) {
                const equipmentHistoryResponse = await fetch(
                  `${config.public.directusUrl}/items/equipment_history`,
                  {
                    method: 'POST',
                    headers: {
                      ...getDirectusHeaders(config),
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      user_id: existingUser.id,
                      equip_ph,
                      equip_do,
                      equip_cond,
                      equip_thermo,
                      equip_waste,
                      equip_pan,
                      equip_flip,
                      equip_incubator,
                      ph_expire: null, // Set if you have this data
                      do_expire: null, // Set if you have this data
                      kit_option: kitOption,
                      status: 'published',
                    })
                  }
                );

                if (!equipmentHistoryResponse.ok) {
                  console.error('Failed to create equipment history');
                  // Don't throw - training record was created successfully
                }
              }

              results.alreadyRegistered.push({
                email: trimmedEmail,
                message: 'User already registered - training and equipment records added'
              });
            } catch (trainingError) {
              console.error('Error creating training/equipment history:', trainingError);
              results.failed.push({
                email: trimmedEmail,
                reason: 'Failed to add training/equipment record'
              });
            }
          }
          
          continue;
        }

        // Check for existing invitation
        const existingInviteResponse = await fetch(
          `${config.public.directusUrl}/items/user_invites?filter[email][_eq]=${encodeURIComponent(trimmedEmail)}&filter[used][_eq]=false`,
          {
            headers: getDirectusHeaders(config),
            method: 'GET'
          }
        );

        const existingInviteData = await existingInviteResponse.json();
        
        if (existingInviteData.data && existingInviteData.data.length > 0) {
          results.failed.push({
            email: trimmedEmail,
            reason: 'Pending invitation already exists'
          });
          continue;
        }

        // Generate invitation token
        const inviteToken = generateSecureToken();

        // Create user_invite record
        const inviteData = {
          email: trimmedEmail,
          invite_token: inviteToken,
          trainer_id,
          trainer_name,
          training_date,
          training_location,
          training_field_chemistry,
          training_r_card,
          training_habitat,
          training_biological,
          training_no_training,
          equip_ph,
          equip_do,
          equip_cond,
          equip_thermo,
          equip_waste,
          equip_pan,
          equip_flip,
          equip_incubator,
          kitOption,
          desiredHub,
          used: false,
          invite_sent_at: new Date().toISOString()
        };

        const createInviteResponse = await fetch(
          `${config.public.directusUrl}/items/user_invites`,
          {
            method: 'POST',
            headers: {
              ...getDirectusHeaders(config),
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(inviteData)
          }
        );

        if (!createInviteResponse.ok) {
          const errorText = await createInviteResponse.text();
          console.error('Invite creation failed:', errorText);
          throw new Error('Failed to create invitation');
        }

        // Send invitation email
        const signupUrl = `${config.public.siteUrl}/signup/?token=${inviteToken}`;
        
        const emailSubject = training_no_training 
          ? 'Kentucky Watershed Watch Data Portal Access'
          : 'Complete Your Kentucky Watershed Watch Registration';

        const emailResult = await sendEmailSafely({
          to: trimmedEmail,
          from: { email: 'contact@kywater.org', name: 'Kentucky Watershed Watch' },
          subject: emailSubject,
          html: generateInviteEmailTemplate({
            signupUrl,
            trainingDate: training_date,
            trainingLocation: training_location,
            trainerName: trainer_name,
            isTrainedSampler: !training_no_training,
            trainingTypes: {
              fieldChemistry: training_field_chemistry,
              rCard: training_r_card,
              habitat: training_habitat,
              biological: training_biological
            }
          })
        });

        if (emailResult.success) {
          results.successful.push({
            email: trimmedEmail,
            inviteToken
          });
        } else {
          results.failed.push({
            email: trimmedEmail,
            reason: 'Email failed to send: ' + emailResult.error
          });
        }

      } catch (error) {
        console.error(`Error processing ${email}:`, error);
        results.failed.push({
          email: email.trim(),
          reason: error.message || 'Unknown error'
        });
      }
    }

    // Return results
    if (results.failed.length === 0 && results.alreadyRegistered.length === 0) {
      return respondWithStatus(event, createApiResponse(
        'success',
        `Successfully sent ${results.successful.length} invitation(s)`,
        'ALL_INVITES_SENT',
        results
      ), 200);
    } else if (results.successful.length > 0) {
      return respondWithStatus(event, createApiResponse(
        'partial',
        `Sent ${results.successful.length} invitation(s), ${results.failed.length} failed, ${results.alreadyRegistered.length} already registered`,
        'PARTIAL_SUCCESS',
        results
      ), 207);
    } else {
      return respondWithStatus(event, createApiResponse(
        'error',
        'All invitations failed',
        'ALL_FAILED',
        results
      ), 400);
    }

  } catch (error) {
    console.error('Invite users error:', error);
    return respondWithStatus(event, createApiResponse(
      'error',
      'Internal server error: ' + error.message,
      'SERVER_ERROR'
    ), 500);
  }
});
