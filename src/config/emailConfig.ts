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
        const content = `
Dear Admin,

A new store has been submitted for approval:

Store Details:
-------------
Name: ${storeName}
Address: ${storeAddress}
Owner Email: ${ownerEmail}

Please review this store submission in your admin dashboard and take appropriate action.

Best regards,
System Notification
`;

        // Send email using Resend API directly
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
                text: content,
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
    // Your Resend API key
    RESEND_API_KEY: 're_HV3SHxdP_GRLZsTwVguckFNk1xJKiZ7vi',

    // Using Resend's default test domain which is already verified
    SENDER_EMAIL: 'onboarding@resend.dev',

    // Admin email for store notifications
    ADMIN_EMAIL: 'reyneilrodelas29@gmail.com'
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
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const sendStoreOwnerNotification = async (
    ownerEmail: string,
    storeName: string,
    status: 'approved' | 'rejected'
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

        const content = status === 'approved'
            ? `Dear Store Owner,\n\nGreat news! Your store "${storeName}" has been approved by our admin team. You can now start managing your store and adding products.\n\nThank you for joining our platform!\n\nBest regards,\nThe Admin Team`
            : `Dear Store Owner,\n\nWe regret to inform you that your store "${storeName}" could not be approved at this time. Please contact our support team for more information and guidance on how to meet our requirements.\n\nBest regards,\nThe Admin Team`;

        // Send email using Resend API directly
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
                text: content,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ Failed to send email:', data);
            return {
                success: false,
                message: data.message || 'Failed to send email notification'
            };
        }

        console.log('✅ Email sent successfully:', data);
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