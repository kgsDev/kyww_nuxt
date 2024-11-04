// /api/signup.js
import sendgrid from '@sendgrid/mail';
import { readBody } from 'h3'; // Correct imports from h3

sendgrid.setApiKey(process.env.EMAIL_SENDGRID_API_KEY);


export default eventHandler(async (event) => {
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
    equip_chem_do,
    equip_chem_ph,
    equip_incubator,
    equip_rcard,
    equip_pipette
  } = await readBody(event);


  const respondWithJSON = (data, statusCode = 200) => {
    event.node.res.setHeader('Content-Type', 'application/json');
    event.node.res.statusCode = statusCode;
    event.node.res.end(JSON.stringify(data));
  };

  // Check required fields
  if (!captchaToken || !token || !firstName || !lastName || !email) {
    return respondWithJSON({ message: 'Missing required fields.' }, 200);
  }
  
  // Verify CAPTCHA with Google
  try {
    const captchaVerify = await fetch(`https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captchaToken}`, {
      method: 'POST',
    });
    if (!captchaVerify.ok) throw new Error("CAPTCHA verification failed");
    const captchaResult = await captchaVerify.json();

    if (!captchaResult.success) {
      console.log("CAPTCHA verification failed");
      return respondWithJSON({ message: 'CAPTCHA verification failed.' }, 200);
    }
  } catch (error) {
    console.error("CAPTCHA verification error:", error);
    return respondWithJSON({ message: 'Internal CAPTCHA verification error' }, 200);
  }

  // Check if the email already exists in Directus
  try {
    const existingUserResponse = await fetch(`${process.env.DIRECTUS_URL}/users?filter[email][_eq]=${email}`, {
      headers: {
        Authorization: `Bearer ${process.env.DIRECTUS_SERVER_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    if (!existingUserResponse.ok) throw new Error("Failed to check existing user");

    const existingUserData = await existingUserResponse.json();
    if (existingUserData.data && existingUserData.data.length > 0) {
      return respondWithJSON({ message: 'An account with this email already exists. Login to the portal (<a href="https://kyww.uky.edu">kyww.uky.edu</a>) with the email you used to create an account.' }, 200);
    }
  } catch (error) {
    return respondWithJSON({ message: 'Internal error during user verification' }, 200);
  }

  // Validate token and fetch invite data
  let inviteData;
  try {
    const inviteResponse = await fetch(`${process.env.DIRECTUS_URL}/items/user_invites?filter[invite_token][_eq]=${token}`, {
      headers: {
        Authorization: `Bearer ${process.env.DIRECTUS_SERVER_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    if (!inviteResponse.ok) throw new Error("Failed to validate invite token");

    inviteData = await inviteResponse.json();
    if (!inviteData.data || inviteData.data.length === 0) {
      console.log("Invalid or expired token");
      return respondWithJSON({ message: 'Invalid or expired token. Check your email invite and also make sure you are not already signed up.' }, 200);
    }
  } catch (error) {
    console.error("Error validating invite token:", error);
    return respondWithJSON({ message: 'Internal error during token validation' }, 500);
  }

  try {
    // Create the user in `directus_users` with sampler role
    const userResponse = await fetch(`${process.env.DIRECTUS_URL}/users`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.DIRECTUS_SERVER_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password: password,
        first_name: firstName,
        last_name: lastName,
        display_name: `${firstName} ${lastName}`,
        phone,
        county_residence,
        mailing_address,
        role: process.env.SAMPLER_ROLE_ID,
        isSampler: true,
      }),
    });

    if (!userResponse.ok) throw new Error("Failed to create user");
    const userData = await userResponse.json();
    const userId = userData.data.id;
    
    // Populate `sampler_data` with sampler-specific information
    const samplerDataResponse = await fetch(`${process.env.DIRECTUS_URL}/items/sampler_data`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.DIRECTUS_SERVER_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        original_training_date: originalTrainingDate,
        training_date_latest: trainingDateLatest,
        desired_hub: desiredHub,
        kitOption: kitOption,
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
        equip_chem_do,
        equip_chem_ph,
        equip_incubator,
        equip_rcard,
        equip_pipette
      }),
    });

    if (!samplerDataResponse.ok) throw new Error("Failed to create sampler data");

    // Delete the invite after successful signup
    const inviteId = inviteData.data[0].id;
    const deleteInviteResponse = await fetch(`${process.env.DIRECTUS_URL}/items/user_invites/${inviteId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${process.env.DIRECTUS_SERVER_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    if (!deleteInviteResponse.ok) throw new Error("Failed to delete invite");

    // Send a welcome email to the new user
    await sendgrid.send({
      to: email,
      from: {
        email: 'contact@kywater.org',
        name: 'Kentucky Watershed Watch'
      },
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

    // Successful signup response
    return respondWithJSON({ message: 'Account created successfully!<br><br>You will be sent an email confirmation. Redirecting to the data portal sign in page at <a href="https://kyww.uky.edu">kyww.uky.edu</a>...' }, 200);

  } catch (error) {
    console.error('Signup error:', error);
    return respondWithJSON({  message: 'Sign up error - Internal server error' }, 500);
  }
});
