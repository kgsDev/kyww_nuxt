import { getApiConfig, getDirectusHeaders } from '../utils/config';
import sendgrid from '@sendgrid/mail';
import { sendEmailSafely } from '../utils/emailUtils';

export default defineEventHandler(async (event) => {
  const config = getApiConfig();
  const method = event.method;
  
  if (method !== 'POST') {
    throw createError({
      statusCode: 405,
      message: 'Method not allowed'
    });
  }

  try {
    sendgrid.setApiKey(config.SENDGRID_API_KEY);
    
    const body = await readBody(event);
    const { 
      userEmail, 
      userName, 
      trainingDate, 
      trainingLocation, 
      trainingTypes,
      trainerName,
      isNewTraining 
    } = body;
    
    if (!userEmail || !userName) {
      throw createError({
        statusCode: 400,
        message: 'User email and name are required'
      });
    }

    // Format training types for display
    const typesList = [];
    if (trainingTypes.training_field_chemistry) typesList.push('Field Chemistry');
    if (trainingTypes.training_r_card) typesList.push('R-Card');
    if (trainingTypes.training_habitat) typesList.push('Habitat');
    if (trainingTypes.training_biological) typesList.push('Biological');
    
    const typesText = typesList.join(', ');
    
    // Format date
    const formattedDate = new Date(trainingDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Determine subject and content based on whether it's new or edited
    const subject = isNewTraining 
      ? 'New Training Record Added - Kentucky Watershed Watch'
      : 'Training Record Updated - Kentucky Watershed Watch';
    
    const actionText = isNewTraining ? 'added' : 'updated';
    const greeting = isNewTraining 
      ? `<p>Great news! A new training record has been added to your Kentucky Watershed Watch account.</p>`
      : `<p>A training record in your Kentucky Watershed Watch account has been updated.</p>`;

    // Send email with proper error handling
    const emailResult = await sendEmailSafely({
      to: userEmail,
      from: {
        email: 'contact@kywater.org',
        name: 'Kentucky Watershed Watch',
      },
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">Training Record ${isNewTraining ? 'Added' : 'Updated'}</h2>
          
          ${greeting}
          
          <div style="margin: 30px 0; padding: 20px; background-color: #f8f8f8; border-radius: 4px;">
            <h3 style="margin-top: 0; color: #333;">Training Details:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: bold;">Date:</td>
                <td style="padding: 8px 0; color: #333;">${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: bold;">Location:</td>
                <td style="padding: 8px 0; color: #333;">${trainingLocation}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: bold;">Training Types:</td>
                <td style="padding: 8px 0; color: #333;">${typesText}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: bold;">Trainer:</td>
                <td style="padding: 8px 0; color: #333;">${trainerName}</td>
              </tr>
            </table>
          </div>

          <div style="margin: 30px 0;">
            <h3 style="color: #333;">What This Means:</h3>
            <p>This training record has been ${actionText} by your trainer. You can view all your training history and certifications by logging into the KYWW Data Portal.</p>
            <div style="text-align: center; margin: 25px 0;">
              <a href="https://kyww.uky.edu/portal" 
                 style="background-color: #4CAF50; color: white; padding: 12px 25px; 
                        text-decoration: none; border-radius: 4px; display: inline-block;">
                View Your Training Records
              </a>
            </div>
          </div>

          <div style="margin: 30px 0; padding: 15px; background-color: #e3f2fd; border-left: 4px solid #2196F3; border-radius: 4px;">
            <p style="margin: 0; color: #1976D2;">
              <strong>Note:</strong> Your current certifications are determined by all training records in your account. 
              Certifications are valid for 3 years from the training date.
            </p>
          </div>

          <p style="margin-top: 30px;">Best regards,<br>Kentucky Watershed Watch Team</p>
          
          <p style="color: #666; font-size: 0.9em; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
            Questions about your training records?<br>
            Contact us at contact@kywater.org or reach out to your trainer directly.
          </p>
        </div>
      `,
    });
    
    if (!emailResult.success) {
      console.error('Training notification email failed:', emailResult.error);
      // Don't throw error - we want the training save to succeed even if email fails
      return {
        success: false,
        message: 'Training saved but email notification failed',
        error: emailResult.error
      };
    }
    
    return {
      success: true,
      message: 'Training notification sent successfully'
    };
    
  } catch (error) {
    console.error('Training notification error:', error);
    // Return error but don't throw - training save should succeed
    return {
      success: false,
      message: 'Failed to send training notification',
      error: error.message
    };
  }
});