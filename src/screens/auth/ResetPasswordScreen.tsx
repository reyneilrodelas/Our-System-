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
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const [styledAlertVisible, setStyledAlertVisible] = useState(false);
    const [styledAlertTitle, setStyledAlertTitle] = useState('');
    const [styledAlertMessage, setStyledAlertMessage] = useState('');
    const [alertOnOk, setAlertOnOk] = useState<(() => void) | undefined>();

    // Check for valid auth session on component mount
    useEffect(() => {
        checkAuthSession();
    }, []);

    const checkAuthSession = async () => {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error) {
                console.error('Error checking session:', error);
                showStyledAlert(
                    'Session Error',
                    'Unable to verify your session. Please request a new password reset link.',
                    () => navigation.replace('Login')
                );
                return;
            }

            if (!session) {
                showStyledAlert(
                    'Invalid Session',
                    'Your password reset link has expired or is invalid. Please request a new one.',
                    () => navigation.replace('Login')
                );
                return;
            }

            // Session is valid, user can proceed
            setCheckingSession(false);
        } catch (error: any) {
            console.error('Error checking auth session:', error);
            showStyledAlert(
                'Error',
                'An error occurred. Please try again.',
                () => navigation.replace('Login')
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

    const handleResetPassword = async () => {
        // Validate inputs
        if (!newPassword.trim() || !confirmPassword.trim()) {
            showStyledAlert('Error', 'Please fill in all fields');
            return;
        }

        if (newPassword !== confirmPassword) {
            showStyledAlert('Error', 'Passwords do not match');
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
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) {
                throw error;
            }

            // Clear form
            setNewPassword('');
            setConfirmPassword('');

            showStyledAlert(
                'Success',
                'Your password has been reset successfully. Please log in with your new password.',
                () => {
                    // Sign out the user to ensure they use new credentials
                    supabase.auth.signOut().finally(() => {
                        navigation.replace('Login');
                    });
                }
            );
        } catch (error: any) {
            console.error('Password reset error:', error);

            // Handle specific error cases
            let errorMessage = 'Failed to reset password. Please try again.';

            if (error.message?.includes('session')) {
                errorMessage = 'Your session has expired. Please request a new password reset link.';
                showStyledAlert('Error', errorMessage, () => navigation.replace('Login'));
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
                        Please enter your new password below
                    </Text>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>New Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter new password"
                            value={newPassword}
                            onChangeText={setNewPassword}
                            secureTextEntry
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!loading}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Confirm Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Confirm new password"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!loading}
                        />
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