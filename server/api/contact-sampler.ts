import sendgrid from '@sendgrid/mail';
import { getApiConfig, getDirectusHeaders } from '../utils/config';
import { readBody, parseCookies } from 'h3';

// Define TypeScript interfaces
interface ContactRequest {
    samplerId: string;
    siteId: string;
    siteName?: string;
    message: string;
    captchaToken?: string;
    userId?: string;
}

interface ApiResponse {
  status: string;
  message: string;
  code?: string;
  timestamp?: string;
  redirect?: string;
}

const config = getApiConfig();
sendgrid.setApiKey(config.SENDGRID_API_KEY);

export default eventHandler(async (event) => {
  try {
    
    // 1. Get and validate request data
    const {
        samplerId,
        siteId,
        siteName,
        message,
        captchaToken,
        userId 
    } = await readBody<ContactRequest>(event);
    
    // Create response helper functions
    const createErrorResponse = (message: string, code?: string, statusCode = 500): ApiResponse => ({
      status: 'error',
      message,
      code,
      timestamp: new Date().toISOString()
    });
   
    const respondWithJSON = (data: ApiResponse, statusCode = 200) => {
      event.node.res.setHeader('Content-Type', 'application/json');
      event.node.res.statusCode = statusCode;
      event.node.res.end(JSON.stringify(data));
    };

    // Get authentication info from cookies
    const cookies = parseCookies(event);
    
    // Try to get session tokens from cookies
    const sessionToken = cookies['directus_session_token'];
    const authToken = cookies['directus-auth'];
    
    // Attempt to get the user directly from Directus
    let user;
    try {
      // Get auth token from cookies
      const authCookie = cookies['directus-auth'];
      
      if (!authCookie) {
        return respondWithJSON(createErrorResponse(
          'You must be logged in to contact samplers.',
          'UNAUTHORIZED',
          401
        ));
      }
      
      // Extract the JWT token from the cookie (it may be encoded)
      const tokenMatch = authCookie.match(/^Bearer\s+(.+)$/) || [null, authCookie];
      const token = tokenMatch[1];
      
      // Use the user's token to get their info
      const userResponse = await fetch(`${config.public.directusUrl}/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!userResponse.ok) {
        // Try the frontend approach as a fallback
        try {
          const userIdFromRequest = event.context.user?.id || event.node.req.headers['x-user-id'];
          
          if (!userIdFromRequest) {
            return respondWithJSON(createErrorResponse(
              'Authentication failed. Please try logging in again.',
              'AUTH_ERROR',
              401
            ));
          }
          
          // Get the user by ID using the server token
          const userByIdResponse = await fetch(`${config.public.directusUrl}/users/${userIdFromRequest}`, {
            headers: getDirectusHeaders(config)
          });
          
          if (!userByIdResponse.ok) {
            return respondWithJSON(createErrorResponse(
              'Authentication error. Please try logging in again.',
              'AUTH_ERROR',
              401
            ));
          }
          
          const userByIdData = await userByIdResponse.json();
          user = userByIdData.data;
        } catch (fallbackError) {
          console.error('[CONTACT API] Fallback authentication failed:', fallbackError);
          return respondWithJSON(createErrorResponse(
            'Authentication error. Please try logging in again.',
            'AUTH_ERROR',
            401
          ));
        }
      } else {
        const userData = await userResponse.json();
        user = userData.data;
      }
            
    } catch (error) {
      console.error('[CONTACT API] Error getting user:', error);
      return respondWithJSON(createErrorResponse(
        'Authentication error. Please try logging in again.',
        'AUTH_ERROR',
        401
      ));
    }
    
    if (!user || !user.id || !user.email) {
        // Try to get user from request body or header
        const userIdFromRequest = userId || event.node.req.headers['x-user-id'];
        
        if (userIdFromRequest) {
        
          // Get the user by ID using the server token
          const userByIdResponse = await fetch(`${config.public.directusUrl}/users/${userIdFromRequest}`, {
            headers: getDirectusHeaders(config)
          });
          
          if (userByIdResponse.ok) {
            const userByIdData = await userByIdResponse.json();
            user = userByIdData.data;
          }
        }
      }
      
      // Final check to ensure we have a valid user
      if (!user || !user.id || !user.email) {
        // Try to get user from request body or header
        const userIdFromRequest = userId || event.node.req.headers['x-user-id'];
        
        if (userIdFromRequest) {
          
          // Get the user by ID using the server token
          const userByIdResponse = await fetch(`${config.public.directusUrl}/users/${userIdFromRequest}`, {
            headers: getDirectusHeaders(config)
          });
          
          if (userByIdResponse.ok) {
            const userByIdData = await userByIdResponse.json();
            user = userByIdData.data;
          }
        }
      }

    // Final check to ensure we have a valid user
    if (!user || !user.id || !user.email) {
        return respondWithJSON(createErrorResponse(
        'You must be logged in with a valid email address to contact samplers.',
        'UNAUTHORIZED',
        401
        ));
    }

    // Check required fields
    if (!samplerId || !siteId || !message) {
    return respondWithJSON(createErrorResponse(
        'Missing required fields.',
        'MISSING_FIELDS',
        400
    ));
    }

    // 2. Get sampler information from Directus
    let samplerData;
    try {
      // Check if the samplerId is a valid UUID     
      // Get all samplers and filter client-side
      const samplerUrl = `${config.public.directusUrl}/items/sampler_data?fields=*,user_id.*`;
      
      const samplerResponse = await fetch(samplerUrl, {
        headers: getDirectusHeaders(config),
      });
      
      if (!samplerResponse.ok) {
        const errorText = await samplerResponse.text();
        console.error('[CONTACT API] Sampler response error:', {
          status: samplerResponse.status,
          statusText: samplerResponse.statusText,
          body: errorText
        });
        throw new Error(`Failed to fetch sampler data: ${samplerResponse.status} ${samplerResponse.statusText}`);
      }
      
      const samplerResult = await samplerResponse.json();
     
      samplerData = samplerResult.data.find(sampler => {
        // Convert both IDs to strings and trim any whitespace for accurate comparison
        const sampleIdStr = String(sampler.user_id?.id).trim();
        const targetIdStr = String(samplerId).trim();
        
        return sampleIdStr === targetIdStr;
      });
      
      if (!samplerData) {
        console.error('[CONTACT API] Sampler not found with ID:', samplerId);
        return respondWithJSON(createErrorResponse(
          'Sampler not found with this ID.',
          'SAMPLER_NOT_FOUND',
          404
        ));
      }
      
      if (!samplerData.user_id) {
        console.error('[CONTACT API] Sampler found but has no user_id:', samplerData);
        return respondWithJSON(createErrorResponse(
          'Sampler record is missing user information.',
          'INCOMPLETE_SAMPLER_DATA',
          404
        ));
      }

    } catch (error) {
      console.error('[CONTACT API] Error fetching sampler data:', error);
      return respondWithJSON(createErrorResponse(
        'Unable to fetch sampler information.',
        'FETCH_ERROR',
        500
      ));
    }

    // 3. Get site details
    let siteData;
    try {
      const siteResponse = await fetch(`${config.public.directusUrl}/items/wwky_sites/${siteId}`, {
        headers: getDirectusHeaders(config),
      });
      
      if (!siteResponse.ok) {
        throw new Error('Failed to fetch site data');
      }
      
      const siteResult = await siteResponse.json();
      siteData = siteResult.data;
    } catch (error) {
      console.error('Error fetching site data:', error);
      // Non-critical, continue with basic site info
      siteData = { wwkyid_pk: siteId, stream_name: siteName || 'the sampling site' };
    }

    // 4. Get current user's details
    const currentUser = {
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      displayName: user.display_name || `${user.first_name} ${user.last_name}`
    };

    let sendToEmail = samplerData.user_id.email;
    //sendToEmail = 'dropstones@gmail.com'
    // 5. Send email to the sampler
    await sendgrid.send({
      to: sendToEmail,
      from: { email: 'contact@kywater.org', name: 'Kentucky Watershed Watch' },
      replyTo: currentUser.email,
      subject: `Kentucky Watershed Watch: Connection Request for Site ${siteData.wwkyid_pk}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Kentucky Watershed Watch - Connection Request</h2>
          
          <p>Hello ${samplerData.user_id.first_name},</p>
          
          <p>A fellow Kentucky Watershed Watch volunteer would like to connect with you about 
          sampling at site ${siteData.wwkyid_pk} ${siteData.stream_name ? `(${siteData.stream_name})` : ''}.</p>
          
          <div style="margin: 20px 0; padding: 20px; background-color: #f8f8f8; border-left: 4px solid #4CAF50; border-radius: 4px;">
            <p style="margin-top: 0;"><strong>From:</strong> ${currentUser.displayName} (${currentUser.email})</p>
            <p style="white-space: pre-line;">${message}</p>
          </div>
          
          <p>To respond, you can simply reply directly to this email and your message will go to ${currentUser.firstName}.</p>
          
          <div style="margin: 30px 0; padding: 15px; background-color: #e8f5e9; border-radius: 4px;">
            <h3 style="color: #2e7d32; margin-top: 0;">About Connection Requests</h3>
            <p>Kentucky Watershed Watch encourages collaboration between volunteers. 
            These connection requests allow samplers to coordinate efforts, share resources, and mentor new volunteers.</p>
            <p>You're under no obligation to respond if you're not interested in connecting at this time.</p>
          </div>
          
          <p style="color: #666; font-size: 0.9em; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
            Thank you for your continued involvement with Kentucky Watershed Watch.<br>
            If you have any concerns about this message, please contact us at support@kywater.org.
          </p>
        </div>
      `
    });

    // 6. Send confirmation email to the requesting user
    await sendgrid.send({
      to: currentUser.email,
      from: { email: 'contact@kywater.org', name: 'Kentucky Watershed Watch' },
      subject: 'Your Kentucky Watershed Watch Connection Request Was Sent',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Your Connection Request Was Sent</h2>
          
          <p>Hello ${currentUser.firstName},</p>
          
          <p>Your message to ${samplerData.user_id.first_name} ${samplerData.user_id.last_name} 
          about site ${siteData.wwkyid_pk} ${siteData.stream_name ? `(${siteData.stream_name})` : ''} has been sent.</p>
          
          <div style="margin: 20px 0; padding: 20px; background-color: #f8f8f8; border-radius: 4px;">
            <p style="margin-bottom: 10px;"><strong>Your message:</strong></p>
            <p style="white-space: pre-line;">${message}</p>
          </div>
          
          <p>If ${samplerData.user_id.first_name} is interested in connecting, they will reply directly to your email address.</p>
          
          <p style="color: #666; font-size: 0.9em; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
            Thank you for your involvement with Kentucky Watershed Watch.<br>
            If you have any questions, please contact us at support@kywater.org.
          </p>
        </div>
      `
    });

    // 7. Log the contact request in the system (optional)
    try {
        // Create a record of this connection
        await fetch(`${config.public.directusUrl}/items/sampler_connections`, {
          method: 'POST',
          headers: {
            ...getDirectusHeaders(config),
            // Override the Authorization header to use the user's token if available
            ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
          },
          body: JSON.stringify({
            requesting_user_id: user.id,
            samplerid: samplerId,
            site_id: siteId,
            message: message,
            status: 'sent',
            date_created: new Date().toISOString()
          }),
        });
      } catch (error) {
        console.error('Failed to log connection request:', error);
        // Non-critical, continue with the response
      }

    // 8. Send success response
    return respondWithJSON({
      status: 'success',
      message: 'Your message has been sent successfully.',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Contact sampler error:', error);
    return { 
      status: 'error',
      message: 'Failed to send your message. Please try again later.', 
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    };
  }
});