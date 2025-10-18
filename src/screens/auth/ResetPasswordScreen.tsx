import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { RootStackParamList } from '../../types/navigation';
import { fontFamily } from '../../Styles/fontFamily';
import { StyledAlert } from '../components/StyledAlert';

type Props = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;

export default function ResetPasswordScreen({ route, navigation }: Props) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const [styledAlertVisible, setStyledAlertVisible] = useState(false);
    const [styledAlertTitle, setStyledAlertTitle] = useState('');
    const [styledAlertMessage, setStyledAlertMessage] = useState('');
    const [alertOnOk, setAlertOnOk] = useState<(() => void) | undefined>();

    // Password visibility states
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Recovery flow state
    const [isRecoveryFlow, setIsRecoveryFlow] = useState(false);
    const recoveryToken = route.params?.token;
    const recoveryType = route.params?.type;

    // Check for valid auth session on component mount
    useEffect(() => {
        checkAuthSession();

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!session && !isRecoveryFlow) {
                navigation.replace('Login');
            } else if (event === 'TOKEN_REFRESHED') {
                setCheckingSession(false);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const checkAuthSession = async () => {
        try {
            console.log('🔐 [ResetPassword] Checking auth session...');
            console.log('🔐 [ResetPassword] Recovery token present:', !!recoveryToken);
            console.log('🔐 [ResetPassword] Recovery type:', recoveryType);

            // If this is a recovery flow, we expect a valid session to already be set
            if (recoveryToken && recoveryType === 'recovery') {
                console.log('✅ [ResetPassword] Recovery flow detected');

                // Verify we have a valid session
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError || !session) {
                    console.error('❌ [ResetPassword] No valid session for recovery:', sessionError);
                    throw new Error('Invalid or expired password reset link. Please request a new one.');
                }

                console.log('✅ [ResetPassword] Valid recovery session found for:', session.user.email);
                setIsRecoveryFlow(true);
                setCheckingSession(false);
                return;
            }

            // For regular password change (user is logged in), check for active session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError) {
                console.error('❌ [ResetPassword] Session error:', sessionError);
                throw new Error('Unable to verify session');
            }

            if (!session) {
                console.log('❌ [ResetPassword] No session found, trying refresh...');

                const { data: { session: refreshedSession }, error: refreshError } =
                    await supabase.auth.refreshSession();

                if (refreshError || !refreshedSession) {
                    console.error('❌ [ResetPassword] Refresh failed:', refreshError);
                    throw new Error('No valid session found');
                }

                console.log('✅ [ResetPassword] Session refreshed');
            }

            console.log('✅ [ResetPassword] Valid session confirmed');
            setCheckingSession(false);

        } catch (error: any) {
            console.error('❌ [ResetPassword] Auth session error:', error);
            showStyledAlert(
                'Session Error',
                error.message || 'Your password reset link has expired or is invalid. Please request a new password reset link.',
                () => {
                    supabase.auth.signOut().finally(() => {
                        navigation.replace('Login');
                    });
                }
            );
        }
    };

    const showStyledAlert = (title: string, message: string, onOk?: () => void) => {
        setStyledAlertTitle(title);
        setStyledAlertMessage(message);
        setAlertOnOk(() => onOk);
        setStyledAlertVisible(true);
    };

    const handleAlertClose = () => {
        setStyledAlertVisible(false);
        if (alertOnOk) {
            alertOnOk();
            setAlertOnOk(undefined);
        }
    };

    const validatePassword = (password: string): { isValid: boolean; error?: string } => {
        if (password.length < 6) {
            return { isValid: false, error: 'Password must be at least 6 characters long' };
        }
        if (password.length > 72) {
            return { isValid: false, error: 'Password must be less than 72 characters' };
        }
        // Add more validation rules as needed
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);

        if (!hasUpperCase || !hasLowerCase || !hasNumber) {
            return {
                isValid: false,
                error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
            };
        }

        return { isValid: true };
    };

    const verifyCurrentPassword = async (email: string, password: string): Promise<boolean> => {
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                return false;
            }
            return true;
        } catch (error) {
            return false;
        }
    };

    // Replace the handleResetPasswordRecovery function in ResetPasswordScreen with this:

    const handleResetPasswordRecovery = async () => {
        console.log('=== PASSWORD RECOVERY STARTED ===');
        console.log('Recovery token present:', !!recoveryToken);
        console.log('Recovery type:', recoveryType);

        // Validate inputs
        if (!newPassword.trim() || !confirmPassword.trim()) {
            console.log('❌ Missing password fields');
            showStyledAlert('Error', 'Please fill in all password fields');
            return;
        }

        if (newPassword !== confirmPassword) {
            console.log('❌ Passwords do not match');
            showStyledAlert('Error', 'New password and confirmation password do not match');
            return;
        }

        // Validate password strength
        const validation = validatePassword(newPassword);
        if (!validation.isValid) {
            console.log('❌ Password validation failed:', validation.error);
            showStyledAlert('Error', validation.error || 'Invalid password');
            return;
        }

        setLoading(true);
        try {
            // First, verify we have an active session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError || !session) {
                console.error('❌ No valid session found:', sessionError);
                throw new Error('Your password reset link has expired. Please request a new one.');
            }

            console.log('✅ Valid session found, user:', session.user.email);
            console.log('🔐 Updating password...');

            // Update the password
            const { data, error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (updateError) {
                console.error('❌ Password update failed:', updateError);

                // Check for specific error types
                if (updateError.message?.includes('session')) {
                    throw new Error('Your session has expired. Please request a new password reset link.');
                }
                throw updateError;
            }

            console.log('✅ Password updated successfully!');

            // Clear form
            setNewPassword('');
            setConfirmPassword('');

            // Show success message
            showStyledAlert(
                'Success! 🎉',
                'Your password has been changed successfully. You can now log in with your new password.',
                () => {
                    // Sign out to clear the recovery session
                    supabase.auth.signOut().finally(() => {
                        navigation.replace('Login');
                    });
                }
            );

        } catch (error: any) {
            console.error('❌ Password recovery exception:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));

            let errorMessage = 'Failed to reset password. Please try again.';
            let shouldRedirect = false;

            if (error.message) {
                errorMessage = error.message;

                // Check if we should redirect to login
                if (error.message.includes('expired') ||
                    error.message.includes('invalid') ||
                    error.message.includes('session')) {
                    shouldRedirect = true;
                }
            }

            showStyledAlert('Error', errorMessage, () => {
                if (shouldRedirect) {
                    supabase.auth.signOut().finally(() => {
                        navigation.replace('Login');
                    });
                }
            });

        } finally {
            setLoading(false);
            console.log('=== PASSWORD RECOVERY COMPLETED ===\n');
        }
    };

    const handleResetPassword = async () => {
        // If in recovery flow, use different handler
        if (isRecoveryFlow) {
            return handleResetPasswordRecovery();
        }

        // Validate inputs
        if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
            showStyledAlert('Error', 'Please fill in all fields');
            return;
        }

        if (newPassword !== confirmPassword) {
            showStyledAlert('Error', 'Passwords do not match');
            return;
        }

        if (currentPassword === newPassword) {
            showStyledAlert('Error', 'New password must be different from current password');
            return;
        }

        // Validate password strength
        const validation = validatePassword(newPassword);
        if (!validation.isValid) {
            showStyledAlert('Error', validation.error || 'Invalid password');
            return;
        }

        setLoading(true);
        try {
            // First verify that we have a valid session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError || !session) {
                throw new Error('Invalid session. Please request a new password reset link.');
            }

            // Get current user email
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError || !user || !user.email) {
                throw new Error('Unable to verify user information.');
            }

            // Verify current password
            const isCurrentPasswordValid = await verifyCurrentPassword(user.email, currentPassword);

            if (!isCurrentPasswordValid) {
                showStyledAlert('Error', 'Current password is incorrect. Please try again.');
                setLoading(false);
                return;
            }

            // Attempt to update the password
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (updateError) {
                throw updateError;
            }

            // Clear form
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');

            showStyledAlert(
                'Success',
                'Your password has been reset successfully. Please log in with your new password.',
                () => {
                    // Sign out the user and clear the session
                    supabase.auth.signOut().finally(() => {
                        navigation.replace('Login');
                    });
                }
            );
        } catch (error: any) {
            console.error('Password reset error:', error);

            // Handle specific error cases
            let errorMessage = 'Failed to reset password. Please try again.';

            if (error.message?.includes('session') || error.message?.includes('JWT')) {
                errorMessage = 'Your session has expired. Please request a new password reset link.';
                showStyledAlert('Error', errorMessage, () => {
                    supabase.auth.signOut().finally(() => {
                        navigation.replace('Login');
                    });
                });
                return;
            } else if (error.message) {
                errorMessage = error.message;
            }

            showStyledAlert('Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Show loading state while checking session
    if (checkingSession) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#000" />
                <Text style={styles.loadingText}>Verifying session...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.content}>
                    <Text style={styles.title}>Reset Password</Text>
                    <Text style={styles.subtitle}>
                        {isRecoveryFlow 
                            ? 'Please enter your new password below' 
                            : 'Please enter your current password and new password below'}
                    </Text>

                    {!isRecoveryFlow && (
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Current Password</Text>
                            <View style={styles.passwordInputWrapper}>
                                <TextInput
                                    style={styles.passwordInput}
                                    placeholder="Enter current password"
                                    value={currentPassword}
                                    onChangeText={setCurrentPassword}
                                    secureTextEntry={!showCurrentPassword}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    editable={!loading}
                                />
                                <TouchableOpacity
                                    style={styles.eyeButton}
                                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                                    disabled={loading}
                                >
                                    <Text style={styles.eyeIcon}>
                                        {showCurrentPassword ? '👁️' : '👁️‍🗨️'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>New Password</Text>
                        <View style={styles.passwordInputWrapper}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="Enter new password"
                                value={newPassword}
                                onChangeText={setNewPassword}
                                secureTextEntry={!showNewPassword}
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!loading}
                            />
                            <TouchableOpacity
                                style={styles.eyeButton}
                                onPress={() => setShowNewPassword(!showNewPassword)}
                                disabled={loading}
                            >
                                <Text style={styles.eyeIcon}>
                                    {showNewPassword ? '👁️' : '👁️‍🗨️'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Confirm Password</Text>
                        <View style={styles.passwordInputWrapper}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="Confirm new password"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!showConfirmPassword}
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!loading}
                            />
                            <TouchableOpacity
                                style={styles.eyeButton}
                                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                disabled={loading}
                            >
                                <Text style={styles.eyeIcon}>
                                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.requirementsContainer}>
                        <Text style={styles.requirementsTitle}>Password Requirements:</Text>
                        <Text style={styles.requirementText}>• At least 6 characters</Text>
                        <Text style={styles.requirementText}>• One uppercase letter</Text>
                        <Text style={styles.requirementText}>• One lowercase letter</Text>
                        <Text style={styles.requirementText}>• One number</Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleResetPassword}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text style={styles.buttonText}>Reset Password</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => {
                            showStyledAlert(
                                'Cancel Reset',
                                'Are you sure you want to cancel? Your password will not be changed.',
                                () => {
                                    supabase.auth.signOut().finally(() => {
                                        navigation.replace('Login');
                                    });
                                }
                            );
                        }}
                        disabled={loading}
                    >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <StyledAlert
                visible={styledAlertVisible}
                title={styledAlertTitle}
                message={styledAlertMessage}
                onOk={handleAlertClose}
                onClose={handleAlertClose}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    centerContainer: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
    },
    title: {
        fontSize: 28,
        marginBottom: 10,
        fontFamily: fontFamily.bold,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        marginBottom: 30,
        fontFamily: fontFamily.regular,
        color: '#666',
        textAlign: 'center',
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        marginBottom: 8,
        fontFamily: fontFamily.semiBold,
        color: '#333',
    },
    input: {
        width: '100%',
        height: 50,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 15,
        fontFamily: fontFamily.regular,
        fontSize: 16,
        backgroundColor: '#fff',
    },
    passwordInputWrapper: {
        position: 'relative',
        width: '100%',
    },
    passwordInput: {
        width: '100%',
        height: 50,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingRight: 50,
        fontFamily: fontFamily.regular,
        fontSize: 16,
        backgroundColor: '#fff',
    },
    eyeButton: {
        position: 'absolute',
        right: 15,
        top: 0,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        width: 30,
    },
    eyeIcon: {
        fontSize: 20,
    },
    requirementsContainer: {
        backgroundColor: '#f8f9fa',
        padding: 15,
        borderRadius: 8,
        marginBottom: 20,
    },
    requirementsTitle: {
        fontSize: 14,
        fontFamily: fontFamily.semiBold,
        marginBottom: 8,
        color: '#333',
    },
    requirementText: {
        fontSize: 13,
        fontFamily: fontFamily.regular,
        color: '#666',
        marginBottom: 4,
    },
    button: {
        width: '100%',
        height: 50,
        backgroundColor: '#000',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: fontFamily.semiBold,
    },
    cancelButton: {
        width: '100%',
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 16,
        fontFamily: fontFamily.regular,
    },
    loadingText: {
        marginTop: 15,
        fontSize: 16,
        fontFamily: fontFamily.regular,
        color: '#666',
    },
});