import sendgrid from '@sendgrid/mail';
import { readBody } from 'h3';

const config = useRuntimeConfig();
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
      kitOption,
      originalTrainingDate,
      trainingDateLatest,
      trainingLocation,
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

    const respondWithJSON = (data, statusCode = 200) => {
      event.node.res.setHeader('Content-Type', 'application/json');
      event.node.res.statusCode = statusCode;
      event.node.res.end(JSON.stringify(data));
    };

    // Check required fields
    if (!captchaToken || !token || !firstName || !lastName || !email) {
      console.warn('Required fields missing');
      return respondWithJSON({ message: 'Missing required fields.' }, 400);
    }

    // Verify CAPTCHA with Google
    try {
      const captchaVerify = await fetch(
        `https://www.google.com/recaptcha/api/siteverify?secret=${config.RECAPTCHA_SECRET_KEY}&response=${captchaToken}`,
        { method: 'POST' }
      );

      if (!captchaVerify.ok) throw new Error('CAPTCHA verification request failed');
      const captchaResult = await captchaVerify.json();

      if (!captchaResult.success) {
        console.warn('CAPTCHA verification failed');
        return respondWithJSON({ message: 'CAPTCHA verification failed.' }, 400);
      }
    } catch (error) {
      console.error('CAPTCHA verification error:', error);
      return respondWithJSON({ message: 'Internal CAPTCHA verification error' }, 500);
    }

    // Check if the email already exists in Directus
    try {
      const existingUserResponse = await fetch(`${config.public.DIRECTUS_URL}/users?filter[email][_eq]=${email}`, {
        headers: {
          Authorization: `Bearer ${config.DIRECTUS_SERVER_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });
      if (!existingUserResponse.ok) throw new Error('Failed to check existing user');

      const existingUserData = await existingUserResponse.json();
      if (existingUserData.data && existingUserData.data.length > 0) {
        return respondWithJSON({
          message: 'An account with this email already exists. Please log in instead.',
        }, 409);
      }
    } catch (error) {
      console.error('User verification error:', error);
      return respondWithJSON({ message: 'Internal error during user verification' }, 500);
    }

    // Validate token and fetch invite data
    let inviteData;
    try {
      const inviteResponse = await fetch(`${config.public.DIRECTUS_URL}/items/user_invites?filter[invite_token][_eq]=${token}`, {
        headers: {
          Authorization: `Bearer ${config.DIRECTUS_SERVER_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });
      if (!inviteResponse.ok) throw new Error('Failed to validate invite token');

      inviteData = await inviteResponse.json();
      if (!inviteData.data || inviteData.data.length === 0) {
        console.warn('Invalid or expired token');
        return respondWithJSON({ message: 'Invalid or expired token.' }, 400);
      }
    } catch (error) {
      console.error('Token validation error:', error);
      return respondWithJSON({ message: 'Internal error during token validation' }, 500);
    }

    // Create user in `directus_users` and set sampler role
    let userId;
    try {
      const userResponse = await fetch(`${config.public.DIRECTUS_URL}/users`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.DIRECTUS_SERVER_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          first_name: firstName,
          last_name: lastName,
          display_name: `${firstName} ${lastName}`,
          phone,
          county_residence,
          mailing_address,
          role: config.public.SAMPLER_ROLE_ID,
          isSampler: true,
        }),
      });

      if (!userResponse.ok) throw new Error('Failed to create user');
      const userData = await userResponse.json();
      userId = userData.data.id;
    } catch (error) {
      console.error('User creation error:', error);
      return respondWithJSON({ message: 'Failed to create user' }, 500);
    }

    // Populate `sampler_data` with sampler-specific information
    try {
      const samplerDataResponse = await fetch(`${config.public.DIRECTUS_URL}/items/sampler_data`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.DIRECTUS_SERVER_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          original_training_date: originalTrainingDate,
          training_date_latest: trainingDateLatest,
          desired_hub: desiredHub,
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
          DO_expire,
          PH_expire,
        }),
      });

      if (!samplerDataResponse.ok) throw new Error('Failed to create sampler data');
    } catch (error) {
      console.error('Sampler data creation error:', error);
      return respondWithJSON({ message: 'Failed to create sampler data' }, 500);
    }

    // Delete the invite after successful signup
    try {
      const inviteId = inviteData.data[0].id;
      const deleteInviteResponse = await fetch(`${config.public.DIRECTUS_URL}/items/user_invites/${inviteId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${config.DIRECTUS_SERVER_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });
      if (!deleteInviteResponse.ok) throw new Error('Failed to delete invite');
    } catch (error) {
      console.error('Error deleting invite:', error);
      return respondWithJSON({ message: 'Internal error during invite deletion' }, 500);
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
          <p>Thank you for joining Kentucky Watershed Watch as a volunteer water sampler. We're excited to have you as part of our community of dedicated citizens working to monitor and protect Kentucky's water resources.</p>
          
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
