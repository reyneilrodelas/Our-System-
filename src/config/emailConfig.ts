// export const emailConfig = {
//     RESEND_API_KEY: 're_HV3SHxdP_GRLZsTwVguckFNk1xJKiZ7vi',
//     SENDER_EMAIL: 'onboarding@resend.dev', // This is the default sender, replace with your actual sender from Resend dashboard
//     ADMIN_EMAIL: 'reyneilrodelas29@gmail.com'
// };

// config/emailConfig.ts
export const emailConfig = {
    // Get your Resend API key from: https://resend.com/api-keys
    RESEND_API_KEY: 're_HV3SHxdP_GRLZsTwVguckFNk1xJKiZ7vi',

    // This email must be verified in your Resend account
    // Format: noreply@yourdomain.com or use Resend's test domain
    SENDER_EMAIL: 'onboarding@resend.dev', // Change this after verifying your domain

    // Admin email - where store creation notifications go
    ADMIN_EMAIL: 'reyneilrodelas29@gmail.com', // Change to your actual admin email
};

// Validation function
export const validateEmailConfig = () => {
    const errors: string[] = [];

    if (!emailConfig.RESEND_API_KEY || emailConfig.RESEND_API_KEY === 're_HV3SHxdP_GRLZsTwVguckFNk1xJKiZ7vi') {
        errors.push('RESEND_API_KEY is not configured');
    }

    if (!emailConfig.SENDER_EMAIL || emailConfig.SENDER_EMAIL === 'onboarding@resend.dev') {
        errors.push('SENDER_EMAIL should be updated to your verified domain');
    }

    if (!emailConfig.ADMIN_EMAIL || emailConfig.ADMIN_EMAIL === 'your-admin-email@gmail.com') {
        errors.push('ADMIN_EMAIL is not configured');
    }

    if (errors.length > 0) {
        console.warn('⚠️ Email Configuration Issues:', errors);
        return false;
    }

    return true;
};