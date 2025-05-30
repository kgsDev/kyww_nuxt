//This is the signup API for the KYWW portal. It is used to create a new user account in Directus and send a welcome email to the new user.
//signup.post.ts
import sendgrid from '@sendgrid/mail';
import { getApiConfig, getDirectusHeaders } from '../utils/config';
import { readBody } from 'h3';

const config = getApiConfig();
sendgrid.setApiKey(config.SENDGRID_API_KEY);

export default eventHandler(async (event) => {
  try {
    const {
      captchaToken,
      token,
      firstName,
      lastName,
      email,
      password,
      phone,
      county_residence,
      desiredHub,
      mailing_address,
      address,
      kitOption,
      originalTrainingDate,
      trainingDateLatest,
      trainingLocation,
      trainer_id, 
      trainer_name,
      training_field_chemistry,
      training_r_card,
      training_habitat,
      training_biological,
      equip_ph,
      equip_do,
      equip_cond,
      equip_thermo,
      equip_waste,
      equip_pan,
      equip_flip,
      DO_expire,
      PH_expire,
      equip_incubator,
    } = await readBody(event);
    
    const createErrorResponse = (message, code, statusCode = 500) => ({
      status: 'error',
      message,
      code,
      timestamp: new Date().toISOString()
    });
   
    const respondWithJSON = (data, statusCode = 200) => {
      event.node.res.setHeader('Content-Type', 'application/json');
      event.node.res.statusCode = statusCode;
      event.node.res.end(JSON.stringify(data));
    };

    // Check required fields
    if (!captchaToken || !token || !firstName || !lastName || !email) {
      return respondWithJSON(createErrorResponse(
        'Please fill in all required fields.',
        'MISSING_FIELDS',
        400
      ));
    }

    // Verify CAPTCHA with Google
    // Skip CAPTCHA verification in development
		if (!config.isDev == 'development'){
      try {
        const captchaVerify = await fetch(
          `https://www.google.com/recaptcha/api/siteverify?secret=${config.RECAPTCHA_SECRET_KEY}&response=${captchaToken}`,
          { method: 'POST' }
        );

        if (!captchaVerify.ok) throw new Error('CAPTCHA verification request failed');
        const captchaResult = await captchaVerify.json();

        if (!captchaResult.success) {
          console.warn('CAPTCHA verification failed');
          return respondWithJSON(createErrorResponse(
            'Please verify that you are human and try again.',
            'CAPTCHA_FAILED',
            400
          ));
        }
      } catch (error) {
        console.error('CAPTCHA verification error:', error);
        return respondWithJSON({ message: 'Internal CAPTCHA verification error' }, 500);
      }
    }else{
      console.log('Skipping CAPTCHA verification in development');
    }

    // Check if the email already exists in Directus
    try {
      const existingUserResponse = await fetch(`${config.public.directusUrl}/users?filter[email][_eq]=${email}`, {
        headers: getDirectusHeaders(config),
      });
      
      if (!existingUserResponse.ok) {
        console.error('Failed to check existing user:', await existingUserResponse.text());
        return respondWithJSON({ 
          status: 'error',
          message: 'Unable to verify account status. Please try again later.',
          code: 'USER_VERIFICATION_ERROR' 
        }, 500);
      }

      const existingUserData = await existingUserResponse.json();
      if (existingUserData.data && existingUserData.data.length > 0) {
        return respondWithJSON({
          status: 'error',
          message: 'An account with this email already exists. You can reset your password at the login page if needed.',
          code: 'USER_EXISTS',
          redirect: '/auth/signin'
        }, 409);
      }
    } catch (error) {
      console.error('User verification error:', error);
      return respondWithJSON({ 
        status: 'error',
        message: 'Unable to complete registration. Please try again later.',
        code: 'INTERNAL_ERROR'
      }, 500);
    }

    // Validate token and fetch invite data
    let inviteData;
    try {
      const inviteResponse = await fetch(`${config.public.directusUrl}/items/user_invites?filter[invite_token][_eq]=${token}`, {
        headers: getDirectusHeaders(config),
      });
      if (!inviteResponse.ok) throw new Error('Failed to validate invite token');

      inviteData = await inviteResponse.json();
      if (!inviteData.data || inviteData.data.length === 0) {
        console.warn('Invalid or expired token');
        return respondWithJSON(createErrorResponse(
          'This invitation link has expired or is invalid. Please request a new invitation.',
          'INVALID_TOKEN',
          400
        ));
      }
    } catch (error) {
      console.error('Token validation error:', error);
      return respondWithJSON({ message: 'Internal error during token validation' }, 500);
    }

    // Create user and sampler data
    let userId;
    try {
      // First prepare both request bodies
      const userRequestBody = {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        display_name: `${firstName} ${lastName}`,
        phone: phone || null,
        county_residence,
        mailing_address,
        street: address?.street || null,
        city: address?.city || null,
        state: address?.state || null,
        zip: address?.zip || null,
        trainer_id: trainer_id || inviteData.data[0].trainer_id,
        trainer_name: trainer_name || inviteData.data[0].trainer_name,
        role: config.public.STANDARD_ROLE_ID,
        policies: [
          {
            policy: config.public.SAMPLER_POLICY_ID
          }
        ],
        status: 'active',
      };

      const samplerDataBody = {
        status: 'active',  // required field
        user_id: null, // Will be set after user creation
        last_name: lastName,
        hub_id: desiredHub,
        kitOption,
        training_location_original: trainingLocation,
        training_location_latest: trainingLocation,
        training_field_chemistry,
        training_r_card,
        training_habitat,
        training_biological,
        equip_ph,
        equip_do,
        equip_cond,
        equip_thermo,
        equip_waste,
        equip_pan,
        equip_flip,
        equip_incubator,
      };

      //only add dates if set
      if (originalTrainingDate && originalTrainingDate.trim() !== '' && originalTrainingDate !== 'undefined' && originalTrainingDate !== 'N/A') {
        samplerDataBody.original_training_date = originalTrainingDate;
      }

      if (trainingDateLatest && trainingDateLatest.trim() !== '' && trainingDateLatest !== 'undefined' && trainingDateLatest !== 'N/A') {
        samplerDataBody.training_date_latest = trainingDateLatest;
      }

      // Only add expiration dates if they're set
      if (DO_expire && DO_expire.trim() !== '' && DO_expire !== 'undefined' && DO_expire !== 'N/A') {
        samplerDataBody.DO_expire = DO_expire;
      }
      if (PH_expire && PH_expire.trim() !== '' && PH_expire !== 'undefined' && PH_expire !== 'N/A') {
        samplerDataBody.PH_expire = PH_expire;
      }
    
      // Create user
      const userResponse = await fetch(`${config.public.directusUrl}/users`, {
        method: 'POST',
        headers: getDirectusHeaders(config),
        body: JSON.stringify(userRequestBody),
      });

      if (!userResponse.ok) {
        // After the request
        const errorText = await userResponse.text();
        console.error('User creation error response:', errorText);
        throw new Error('Failed to create user: ' + errorText);
      }

      const userData = await userResponse.json();
      userId = userData.data.id;

      // Update sampler data body with user ID
      samplerDataBody.user_id = userId;

      // Create sampler data
      const samplerDataResponse = await fetch(`${config.public.directusUrl}/items/sampler_data`, {
        method: 'POST',
        headers: getDirectusHeaders(config),
        body: JSON.stringify(samplerDataBody),
      });

      if (!samplerDataResponse.ok) {
        const errorText = await samplerDataResponse.text();
        console.error('Sampler data creation failed:', {
          status: samplerDataResponse.status,
          statusText: samplerDataResponse.statusText,
          body: errorText
        });

        // Cleanup: delete the user since sampler data failed
        console.log('Cleaning up user due to sampler data creation failure');
        const deleteResponse = await fetch(`${config.public.directusUrl}/users/${userId}`, {
          method: 'DELETE',
          headers: getDirectusHeaders(config),
        });

        if (!deleteResponse.ok) {
          console.error('Failed to clean up user after sampler data error:', await deleteResponse.text());
        }

        throw new Error(`Failed to create sampler data: ${errorText}`);
      }

    } catch (error) {
      console.error('User/Sampler creation error:', error);
      return respondWithJSON(createErrorResponse(
        'Unable to complete registration. Please try again or contact support.',
        'REGISTRATION_FAILED',
        500
      ));
    }


    // 5. Delete the invite
    try {
      console.log('Starting invite deletion for token:', token);
      const inviteId = inviteData.data[0].id;
      
      const deleteInviteResponse = await fetch(`${config.public.directusUrl}/items/user_invites/${inviteId}`, {
        method: 'DELETE',
        headers: getDirectusHeaders(config),
      });

      if (!deleteInviteResponse.ok) {
        throw new Error(`Failed to delete invite: ${await deleteInviteResponse.text()}`);
      }
    } catch (error) {
      console.error('Failed to delete invite:', error);
      // We've created the user and sampler data, but couldn't delete the invite
      // We might want to handle this differently
      return respondWithJSON({ 
        message: 'Account created but there was an issue completing the process. Please contact support.' 
      }, 500);
    }


    // Send a welcome email to the new user
    try {
      await sendgrid.send({
        to: email,
        from: { email: 'contact@kywater.org', name: 'Kentucky Watershed Watch' },
        subject: 'Welcome to Kentucky Watershed Watch',
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Kentucky Watershed Watch!</h2>
          <p>Hello ${firstName} ${lastName},</p>
          <p>Thank you for joining Kentucky Watershed Watch as a volunteer water sampler. We're excited to have you as part of our community of dedicated volunteers working to monitor and protect Kentucky's water resources.</p>
          
          <div style="margin: 30px 0;">
            <h3 style="color: #4CAF50;">Getting Started</h3>
            <p>You can now access the KYWW sampling portal to enter your stream sample data:</p>
            <div style="text-align: center; margin: 20px 0;">
              <a href="https://kyww.uky.edu" 
                 style="background-color: #4CAF50; color: white; padding: 12px 25px; 
                        text-decoration: none; border-radius: 4px; display: inline-block;">
                Access KYWW Portal
              </a>
            </div>
            <ul style="color: #444; margin: 20px 0; padding-left: 20px;">
              <li>Your username is your email address: <strong>${email}</strong></li>
              <li>Use the password you created during registration</li>
              <li>Sign in at <a href="https://kyww.uky.edu" style="color: #4CAF50;">kyww.uky.edu</a></li>
            </ul>
          </div>
    
          <div style="background-color: #e8f5e9; padding: 20px; border-radius: 4px; margin: 20px 0;">
            <h3 style="color: #2e7d32; margin-top: 0;">Additional Resources</h3>
            <p>Visit <a href="https://kywater.org" style="color: #4CAF50;">kywater.org</a> to:</p>
            <ul style="color: #444;">
              <li>Access additional program information</li>
              <li>Refresh your training materials</li>
              <li>Purchase KWW merchandise (t-shirts and more)</li>
            </ul>
            <p style="color: #666; font-size: 0.9em; font-style: italic;">A portion of merchandise proceeds directly supports our sampling program.</p>
          </div>

          <div style="margin: 30px 0; padding: 20px; background-color: #f8f8f8; border-radius: 4px;">
            <p style="color: #666; margin-bottom: 10px;"><strong>Important Security Information:</strong></p>
            <ul style="color: #666; margin: 0; padding-left: 20px;">
              <li>Kentucky Watershed Watch will never ask for your password via email or phone.</li>
              <li>Always access our site directly at kyww.uky.edu rather than clicking links in emails.</li>
              <li>Keep your login credentials secure and never share them with others.</li>
              <li>Contact us immediately (contact@kywater.org) if you notice any suspicious activity on your account.</li>
            </ul>
          </div>
    
          <p>Happy sampling!</p>
          <p style="margin-top: 30px;">Best regards,<br>Kentucky Watershed Watch Team</p>
          
          <p style="color: #666; font-size: 0.9em; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
            If you have any questions or need assistance, please contact us at contact@kywater.org.<br>
            Thank you for contributing to the protection of Kentucky's water resources!
          </p>
        </div>
      `
    });
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return respondWithJSON({ message: 'Internal error during email sending' }, 500);
  }

  return respondWithJSON({
    message: 'Account created successfully! You will receive a confirmation email shortly.',
  }, 201);

} catch (error) {
  console.error('Signup error:', error);
  return respondWithJSON({ message: 'Internal server error' }, 500);
}
});
