import sendgrid from '@sendgrid/mail';

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  statusCode?: number;
}

export async function sendEmailSafely(emailData: any): Promise<EmailResult> {
  try {
    const response = await sendgrid.send(emailData);
    
    // SendGrid returns an array, get the first response
    const result = Array.isArray(response) ? response[0] : response;
    
    return {
      success: true,
      messageId: result.headers?.['x-message-id'] || 'sent',
      statusCode: result.statusCode
    };
  } catch (error: any) {
    console.error('SendGrid email error:', {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
      response: error.response?.body
    });

    return {
      success: false,
      error: error.message || 'Email sending failed',
      statusCode: error.statusCode || 500
    };
  }
}