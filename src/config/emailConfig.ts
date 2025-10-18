/**
 * Sends a notification email to the admin when a new store is created.
 * @param storeName - The name of the store
 * @param storeAddress - The address of the store
 * @param ownerEmail - The email of the store owner
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const sendAdminNotification = async (
    storeName: string,
    storeAddress: string,
    ownerEmail: string
): Promise<{ success: boolean; message: string }> => {
    try {
        if (!validateEmailConfig()) {
            return {
                success: false,
                message: 'Email configuration is not properly set up. Please check the configuration.'
            };
        }

        if (!emailConfig.ADMIN_EMAIL) {
            return {
                success: false,
                message: 'Admin email is not configured'
            };
        }

        // Prepare email content
        const subject = `🏪 New Store Registration: ${storeName}`;
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2>New Store Registration</h2>
                <p>A new store has been submitted for approval:</p>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Store Name:</strong> ${storeName}</p>
                    <p><strong>Address:</strong> ${storeAddress}</p>
                    <p><strong>Owner Email:</strong> ${ownerEmail}</p>
                </div>
                <p>Please review this store submission in your admin dashboard and take appropriate action.</p>
                <p>Best regards,<br>System Notification</p>
            </div>
        `;

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${emailConfig.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: emailConfig.SENDER_EMAIL,
                to: emailConfig.ADMIN_EMAIL,
                subject,
                html,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ Failed to send admin notification:', data);
            return {
                success: false,
                message: data.message || 'Failed to send admin notification'
            };
        }

        console.log('✅ Admin notification sent successfully:', data);
        return {
            success: true,
            message: 'Admin notification sent successfully'
        };

    } catch (error: any) {
        console.error('❌ Error sending admin notification:', error);
        return {
            success: false,
            message: error.message || 'An unexpected error occurred while sending the admin notification'
        };
    }
};

export const emailConfig = {
    // Resend API key from environment variables
    RESEND_API_KEY: process.env.RESEND_API_KEY || process.env.EXPO_PUBLIC_RESEND_API_KEY,

    // Using your custom domain (scanwizards.com)
    // Make sure this domain is verified in your Resend dashboard
    SENDER_EMAIL: process.env.SENDER_EMAIL || 'noreply@scanwizards.com',

    // Admin email for store notifications
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'scanwizards@gmail.com'
};

// Validation function
export const validateEmailConfig = () => {
    const errors: string[] = [];

    if (!emailConfig.RESEND_API_KEY) {
        errors.push('RESEND_API_KEY is not configured');
    }

    if (!emailConfig.SENDER_EMAIL) {
        errors.push('SENDER_EMAIL is not configured');
    }

    if (!emailConfig.ADMIN_EMAIL) {
        errors.push('ADMIN_EMAIL is not configured');
    }

    if (errors.length > 0) {
        console.warn('⚠️ Email Configuration Issues:', errors);
        return false;
    }

    return true;
};

/**
 * Sends a notification email to a store owner about their store's status change.
 * @param ownerEmail - The email address of the store owner
 * @param storeName - The name of the store
 * @param status - The new status of the store ('approved' or 'rejected')
 * @param rejectionReason - Optional reason for rejection
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const sendStoreOwnerNotification = async (
    ownerEmail: string,
    storeName: string,
    status: 'approved' | 'rejected',
    rejectionReason?: string
): Promise<{ success: boolean; message: string }> => {
    try {
        if (!validateEmailConfig()) {
            return { 
                success: false, 
                message: 'Email configuration is not properly set up. Please check the configuration.' 
            };
        }

        // Basic email validation
        if (!ownerEmail || !ownerEmail.includes('@')) {
            return { 
                success: false, 
                message: 'Invalid owner email address' 
            };
        }

        // Prepare email content based on status
        const subject = status === 'approved'
            ? `🎉 Your store "${storeName}" has been approved!`
            : `❗ Update about your store "${storeName}"`;

        const html = status === 'approved'
            ? `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #4CAF50;">🎉 Great News!</h2>
                    <p>Dear Store Owner,</p>
                    <p>Your store <strong>"${storeName}"</strong> has been approved by our admin team!</p>
                    <p>You can now:</p>
                    <ul>
                        <li>Start managing your store</li>
                        <li>Add and manage products</li>
                        <li>Update store information</li>
                        <li>View analytics</li>
                    </ul>
                    <p>Log in to your account to get started.</p>
                    <p>Thank you for joining our platform!</p>
                    <p>Best regards,<br>The Admin Team</p>
                </div>
            `
            : `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #F44336;">❗ Store Registration Update</h2>
                    <p>Dear Store Owner,</p>
                    <p>We regret to inform you that your store <strong>"${storeName}"</strong> has been rejected and cannot be approved at this time.</p>
                    ${rejectionReason ? `<div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; border-radius: 4px;"><p><strong>Reason for Rejection:</strong></p><p>${rejectionReason.replace(/\n/g, '<br>')}</p></div>` : ''}
                    <p>Common reasons for rejection include:</p>
                    <ul>
                        <li>Incomplete or incorrect information</li>
                        <li>Unable to verify business credentials</li>
                        <li>Violation of platform policies</li>
                        <li>Missing required documentation</li>
                    </ul>
                    <p>Please contact our support team for more information and guidance on how to meet our requirements.</p>
                    <p><strong>Support Email:</strong> ${emailConfig.ADMIN_EMAIL}</p>
                    <p>Best regards,<br>The Admin Team</p>
                </div>
            `;

        console.log('📧 Resend API Request Details:');
        console.log('  From:', emailConfig.SENDER_EMAIL);
        console.log('  To:', ownerEmail);
        console.log('  Subject:', subject);
        console.log('  API Key exists:', !!emailConfig.RESEND_API_KEY);

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${emailConfig.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: emailConfig.SENDER_EMAIL,
                to: ownerEmail,
                subject,
                html,
            }),
        });

        console.log('📬 Resend API Response Status:', response.status);
        console.log('📬 Resend API Response Headers:', {
            'Content-Type': response.headers.get('Content-Type'),
            'Content-Length': response.headers.get('Content-Length'),
        });

        const data = await response.json();
        console.log('📬 Resend API Response Body:', JSON.stringify(data, null, 2));

        if (!response.ok) {
            console.error('❌ Failed to send email to store owner:', {
                status: response.status,
                statusText: response.statusText,
                data: data,
            });
            return {
                success: false,
                message: data.message || `Failed to send email (${response.status}): ${JSON.stringify(data)}`
            };
        }

        console.log('✅ Email sent successfully to store owner:', data);
        return {
            success: true,
            message: 'Email notification sent successfully'
        };

    } catch (error: any) {
        console.error('❌ Error sending email:', error);
        return {
            success: false,
            message: error.message || 'An unexpected error occurred while sending the email'
        };
    }
};