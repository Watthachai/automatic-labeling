import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !twilioPhoneNumber) {
  throw new Error('Missing Twilio configuration');
}

const client = twilio(accountSid, authToken);

export async function sendSMS(to: string, code: string) {
  try {
    // Validate phone numbers are different
    if (to === twilioPhoneNumber) {
      throw new Error('Recipient number cannot be the same as sender number');
    }

    // Format phone number if needed
    const formattedTo = to.startsWith('+') ? to : `+${to}`;

    const message = await client.messages.create({
      body: `Your Hospital Production System verification code is: ${code}`,
      to: formattedTo,
      from: twilioPhoneNumber
    });
    
    console.log(`SMS sent to ${to}: ${message.sid}`);
    return true;
  } catch (error) {
    console.error('Error sending SMS:', error);
    return false;
  }
}