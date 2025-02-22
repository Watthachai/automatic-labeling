export async function logAudit(
  userId: string,
  action: string,
  details: string,
  productionId?: string,
  ipAddress?: string
) {
  try {
    const response = await fetch('/api/audit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        action,
        details,
        productionId,
        ipAddress
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create audit log');
    }

    return await response.json();
  } catch (error) {
    console.error('Audit log error:', error);
    throw error;
  }
}