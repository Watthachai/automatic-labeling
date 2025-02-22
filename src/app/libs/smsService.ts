import axios from 'axios';

interface SMSResponse {
  status: boolean;
  message_id?: string;
  remaining_credit?: number;
  error?: {
    code: string;
    message: string;
  };
}

export async function sendSMS(phoneNumber: string, message: string): Promise<SMSResponse> {
  const API_KEY = process.env.THAIBULK_API_KEY;
  const API_SECRET = process.env.THAIBULK_API_SECRET;

  if (!API_KEY || !API_SECRET) {
    console.error('Missing Thai Bulk SMS credentials');
    return {
      status: false,
      error: {
        code: 'CONFIG_ERROR',
        message: 'SMS service not properly configured'
      }
    };
  }

  // Format phone number according to Thai Bulk SMS requirements
  // Should be in format: 66XXXXXXXXX (no plus, no leading zero)
  let formattedPhone = phoneNumber
    .replace(/^\+66/, '') // Remove +66 prefix
    .replace(/^0/, '')    // Remove leading 0
    .replace(/[^0-9]/g, ''); // Remove non-numeric characters

  // Add 66 prefix if not present
  if (!formattedPhone.startsWith('66')) {
    formattedPhone = `66${formattedPhone}`;
  }

  // Validate final phone number format
  if (!formattedPhone.match(/^66\d{9}$/)) {
    return {
      status: false,
      error: {
        code: 'INVALID_PHONE',
        message: `Invalid phone number format: ${phoneNumber}. Must be in format: 66XXXXXXXXX`
      }
    };
  }

  try {
    const response = await axios.post(
      'https://api-v2.thaibulksms.com/sms',
      {
        msisdn: formattedPhone,
        sender: "NEWS",         // Required sender name
        message: message,
        force: "standard"
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64')}`
        }
      }
    );

    // Check for success in response
    if (response.data && !response.data.error) {
      return {
        status: true,
        message_id: response.data.message_id,
        remaining_credit: response.data.remaining_credit
      };
    }

    // Handle API error response
    return {
      status: false,
      error: {
        code: response.data.error?.code?.toString() || 'UNKNOWN',
        message: response.data.error?.description || 'Unknown error occurred'
      }
    };

  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      console.error('SMS API Error:', JSON.stringify(error.response.data, null, 2));
      return {
        status: false,
        error: {
          code: error.response.data.error.code.toString(),
          message: error.response.data.error.description
        }
      };
    }
    
    console.error('Network Error:', error);
    return {
      status: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network error occurred'
      }
    };
  }
}