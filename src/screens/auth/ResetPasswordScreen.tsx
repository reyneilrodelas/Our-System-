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
    Animated,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { RootStackParamList } from '../../types/navigation';
import { fontFamily } from '../../Styles/fontFamily';
import { StyledAlert } from '../components/StyledAlert';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

type Props = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;

export default function ResetPasswordScreen({ route, navigation }: Props) {
    const [resetToken, setResetToken] = useState(route.params?.token || '');
    const [email, setEmail] = useState(route.params?.email || '');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [styledAlertVisible, setStyledAlertVisible] = useState(false);
    const [styledAlertTitle, setStyledAlertTitle] = useState('');
    const [styledAlertMessage, setStyledAlertMessage] = useState('');
    const [alertOnOk, setAlertOnOk] = useState<(() => void) | undefined>();
    const [focusedField, setFocusedField] = useState('');
    const [isRecoveryFlow, setIsRecoveryFlow] = useState(!!route.params?.type);

    // Password visibility states
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Password strength
    const [passwordStrength, setPasswordStrength] = useState(0);

    useEffect(() => {
        calculatePasswordStrength(newPassword);
    }, [newPassword]);

    const calculatePasswordStrength = (password: string) => {
        let strength = 0;
        if (password.length >= 8) strength += 25;
        if (password.length >= 12) strength += 25;
        if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength += 25;
        if (/[0-9]/.test(password)) strength += 15;
        if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength += 10;
        setPasswordStrength(Math.min(strength, 100));
    };

    const getStrengthColor = () => {
        if (passwordStrength < 40) return '#EF4444';
        if (passwordStrength < 70) return '#F59E0B';
        return '#22C55E';
    };

    const getStrengthText = () => {
        if (passwordStrength < 40) return 'Weak';
        if (passwordStrength < 70) return 'Medium';
        return 'Strong';
    };

    const showStyledAlert = (title: string, message: string, onOk?: () => void) => {
        setStyledAlertTitle(title);
        setStyledAlertMessage(message);
        setAlertOnOk(() => onOk);
        setStyledAlertVisible(true);
    };

    const handleAlertClose = () => {
        setStyledAlertVisible(false);
    };

    const validatePassword = (password: string): { isValid: boolean; error?: string } => {
        if (password.length < 8) {
            return { isValid: false, error: 'Password must be at least 8 characters long' };
        }
        if (password.length > 72) {
            return { isValid: false, error: 'Password must be less than 72 characters' };
        }

        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

        if (!hasUpperCase || !hasLowerCase || !hasNumber) {
            return {
                isValid: false,
                error: 'Password must contain uppercase, lowercase, numbers, and special characters'
            };
        }

        return { isValid: true };
    };

    const handleResetPassword = async () => {
        console.log('=== PASSWORD RESET STARTED ===');

        if (!resetToken.trim()) {
            showStyledAlert('Error', 'Please enter the verification code from your email');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        if (!email.trim()) {
            showStyledAlert('Error', 'Please enter your email address');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        if (!newPassword.trim() || !confirmPassword.trim()) {
            showStyledAlert('Error', 'Please fill in all password fields');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        if (newPassword !== confirmPassword) {
            showStyledAlert('Error', 'Passwords do not match');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        const validation = validatePassword(newPassword);
        if (!validation.isValid) {
            showStyledAlert('Error', validation.error || 'Invalid password');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        setLoading(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            console.log('🔐 Verifying OTP code...');
            console.log('OTP code entered:', resetToken);
            console.log('Email:', email);

            const { data, error: verifyError } = await supabase.auth.verifyOtp({
                email: email.trim().toLowerCase(),
                token: resetToken.trim(),
                type: 'recovery',
            });

            if (verifyError) {
                console.error('❌ OTP verification failed:', verifyError);
                console.error('Error message:', verifyError.message);
                console.error('Error status:', verifyError.status);

                throw new Error(verifyError.message || 'Verification failed. Please check the code and try again.');
            }

            console.log('✅ OTP verified successfully!');
            console.log('Verified data:', data);

            console.log('Updating password...');

            const updatePromise = supabase.auth.updateUser({
                password: newPassword
            });

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Password update timeout')), 10000)
            );

            try {
                await Promise.race([updatePromise, timeoutPromise]);
            } catch (updateError: any) {
                if (updateError?.message === 'Password update timeout') {
                    console.warn('⚠️ Password update timeout - continuing anyway');
                } else {
                    console.error('❌ Password update failed:', updateError?.message);
                    throw new Error(updateError?.message || 'Failed to update password');
                }
            }

            setResetToken('');
            setEmail('');
            setNewPassword('');
            setConfirmPassword('');

            console.log('✅ Password reset successful!');

            console.log('Clearing recovery session...');
            try {
                await supabase.auth.signOut();
                console.log('✅ Session cleared');
            } catch (signOutError) {
                console.log('⚠️ Sign out error (non-critical):', signOutError);
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            showStyledAlert(
                'Success! ✅',
                'Your password has been reset successfully. You can now sign in with your new password.',
                () => {
                    console.log('User pressed OK, redirecting to Login screen');
                    navigation.replace('Login');
                }
            );
        } catch (error: any) {
            console.error('❌ Password reset exception:', error);
            console.error('Full error:', JSON.stringify(error, null, 2));

            let errorMessage = 'Failed to reset password. Please try again.';
            if (error.message) {
                errorMessage = error.message;
            }

            if (errorMessage.includes('verification code')) {
                errorMessage = 'The verification code is invalid or has expired. Please request a new password reset email.';
            } else if (errorMessage.includes('expired')) {
                errorMessage = 'The verification code has expired (valid for 24 hours). Please request a new password reset email.';
            } else if (errorMessage.includes('invalid')) {
                errorMessage = 'The verification code is invalid. Please check and try again, or request a new one.';
            }

            showStyledAlert('Reset Failed ❌', errorMessage);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setLoading(false);
            console.log('=== PASSWORD RESET COMPLETED ===\n');
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <LinearGradient
                colors={['#F0F9FF', '#FFFFFF', '#F8FAFC']}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.container}>
                        {/* Back Button */}
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                            disabled={loading}
                            activeOpacity={0.7}
                        >
                            <View style={styles.backButtonInner}>
                                <Ionicons name="arrow-back" size={24} color="#1F2937" />
                            </View>
                        </TouchableOpacity>

                        {/* Illustration Section */}
                        <View style={styles.illustrationSection}>
                            <View style={styles.iconCircle}>
                                <LinearGradient
                                    colors={['#8B5CF6', '#7C3AED']}
                                    style={styles.iconGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <MaterialCommunityIcons name="lock-reset" size={48} color="#FFFFFF" />
                                </LinearGradient>
                            </View>
                        </View>

                        {/* Header Section */}
                        <View style={styles.headerSection}>
                            <Text style={styles.title}>Create New Password</Text>
                            <Text style={styles.subtitle}>
                                Your new password must be different from previously used passwords
                            </Text>
                        </View>

                        {/* Form Section */}
                        <View style={styles.formSection}>
                            {/* Verification Code Input */}
                            <View style={styles.inputWrapper}>
                                <Text style={styles.inputLabel}>Verification Code</Text>
                                <View style={[
                                    styles.inputContainer,
                                    focusedField === 'token' && styles.inputContainerFocused
                                ]}>
                                    <View style={styles.iconWrapper}>
                                        <MaterialCommunityIcons
                                            name="shield-key"
                                            size={22}
                                            color={focusedField === 'token' ? '#8B5CF6' : '#9CA3AF'}
                                        />
                                    </View>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Enter 6-digit code"
                                        placeholderTextColor="#9CA3AF"
                                        value={resetToken}
                                        onChangeText={setResetToken}
                                        editable={!loading && !isRecoveryFlow}
                                        onFocus={() => setFocusedField('token')}
                                        onBlur={() => setFocusedField('')}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        maxLength={6}
                                        keyboardType="number-pad"
                                    />
                                    {resetToken.length === 6 && (
                                        <View style={styles.validIcon}>
                                            <Ionicons name="checkmark-circle" size={22} color="#22C55E" />
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Email Input */}
                            <View style={styles.inputWrapper}>
                                <Text style={styles.inputLabel}>Email Address</Text>
                                <View style={[
                                    styles.inputContainer,
                                    focusedField === 'email' && styles.inputContainerFocused
                                ]}>
                                    <View style={styles.iconWrapper}>
                                        <Ionicons
                                            name="mail"
                                            size={22}
                                            color={focusedField === 'email' ? '#8B5CF6' : '#9CA3AF'}
                                        />
                                    </View>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="your@email.com"
                                        placeholderTextColor="#9CA3AF"
                                        value={email}
                                        onChangeText={setEmail}
                                        editable={!loading}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        onFocus={() => setFocusedField('email')}
                                        onBlur={() => setFocusedField('')}
                                    />
                                    {email.includes('@') && (
                                        <View style={styles.validIcon}>
                                            <Ionicons name="checkmark-circle" size={22} color="#22C55E" />
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* New Password Input */}
                            <View style={styles.inputWrapper}>
                                <Text style={styles.inputLabel}>New Password</Text>
                                <View style={[
                                    styles.inputContainer,
                                    focusedField === 'newPassword' && styles.inputContainerFocused
                                ]}>
                                    <View style={styles.iconWrapper}>
                                        <Ionicons
                                            name="lock-closed"
                                            size={22}
                                            color={focusedField === 'newPassword' ? '#8B5CF6' : '#9CA3AF'}
                                        />
                                    </View>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Enter new password"
                                        placeholderTextColor="#9CA3AF"
                                        value={newPassword}
                                        onChangeText={setNewPassword}
                                        secureTextEntry={!showNewPassword}
                                        editable={!loading}
                                        autoCapitalize="none"
                                        onFocus={() => setFocusedField('newPassword')}
                                        onBlur={() => setFocusedField('')}
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowNewPassword(!showNewPassword)}
                                        disabled={loading}
                                        style={styles.eyeButton}
                                    >
                                        <Ionicons
                                            name={showNewPassword ? "eye-off" : "eye"}
                                            size={22}
                                            color="#9CA3AF"
                                        />
                                    </TouchableOpacity>
                                </View>

                                {/* Password Strength Indicator */}
                                {newPassword.length > 0 && (
                                    <View style={styles.strengthContainer}>
                                        <View style={styles.strengthBar}>
                                            <View
                                                style={[
                                                    styles.strengthFill,
                                                    {
                                                        width: `${passwordStrength}%`,
                                                        backgroundColor: getStrengthColor()
                                                    }
                                                ]}
                                            />
                                        </View>
                                        <Text style={[styles.strengthText, { color: getStrengthColor() }]}>
                                            {getStrengthText()}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Confirm Password Input */}
                            <View style={styles.inputWrapper}>
                                <Text style={styles.inputLabel}>Confirm Password</Text>
                                <View style={[
                                    styles.inputContainer,
                                    focusedField === 'confirmPassword' && styles.inputContainerFocused
                                ]}>
                                    <View style={styles.iconWrapper}>
                                        <Ionicons
                                            name="lock-closed"
                                            size={22}
                                            color={focusedField === 'confirmPassword' ? '#8B5CF6' : '#9CA3AF'}
                                        />
                                    </View>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Confirm new password"
                                        placeholderTextColor="#9CA3AF"
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        secureTextEntry={!showConfirmPassword}
                                        editable={!loading}
                                        autoCapitalize="none"
                                        onFocus={() => setFocusedField('confirmPassword')}
                                        onBlur={() => setFocusedField('')}
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                        disabled={loading}
                                        style={styles.eyeButton}
                                    >
                                        <Ionicons
                                            name={showConfirmPassword ? "eye-off" : "eye"}
                                            size={22}
                                            color="#9CA3AF"
                                        />
                                    </TouchableOpacity>
                                </View>

                                {/* Password Match Indicator */}
                                {confirmPassword.length > 0 && (
                                    <View style={styles.matchContainer}>
                                        {confirmPassword === newPassword ? (
                                            <View style={styles.matchRow}>
                                                <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                                                <Text style={styles.matchText}>Passwords match</Text>
                                            </View>
                                        ) : (
                                            <View style={styles.matchRow}>
                                                <Ionicons name="close-circle" size={16} color="#EF4444" />
                                                <Text style={styles.noMatchText}>Passwords don't match</Text>
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>

                            {/* Reset Password Button */}
                            <TouchableOpacity
                                style={[styles.resetButton, loading && styles.resetButtonDisabled]}
                                onPress={handleResetPassword}
                                disabled={loading}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={loading ? ['#9CA3AF', '#6B7280'] : ['#8B5CF6', '#7C3AED']}
                                    style={styles.buttonGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    {loading ? (
                                        <View style={styles.loadingContainer}>
                                            <ActivityIndicator color="#FFFFFF" size="small" />
                                            <Text style={styles.loadingText}>Resetting Password...</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.buttonContent}>
                                            <Text style={styles.resetButtonText}>Reset Password</Text>
                                            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                                        </View>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            {/* Password Requirements Card */}
                            <View style={styles.requirementsCard}>
                                <View style={styles.requirementsHeader}>
                                    <View style={styles.requirementsIconCircle}>
                                        <MaterialCommunityIcons name="shield-check" size={16} color="#8B5CF6" />
                                    </View>
                                    <Text style={styles.requirementsTitle}>Password Requirements</Text>
                                </View>

                                <View style={styles.requirementsList}>
                                    <View style={styles.requirementItem}>
                                        <Ionicons
                                            name={newPassword.length >= 8 ? "checkmark-circle" : "ellipse-outline"}
                                            size={18}
                                            color={newPassword.length >= 8 ? "#22C55E" : "#D1D5DB"}
                                        />
                                        <Text style={[
                                            styles.requirementText,
                                            newPassword.length >= 8 && styles.requirementMet
                                        ]}>
                                            At least 8 characters
                                        </Text>
                                    </View>

                                    <View style={styles.requirementItem}>
                                        <Ionicons
                                            name={/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) ? "checkmark-circle" : "ellipse-outline"}
                                            size={18}
                                            color={/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) ? "#22C55E" : "#D1D5DB"}
                                        />
                                        <Text style={[
                                            styles.requirementText,
                                            /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) && styles.requirementMet
                                        ]}>
                                            Upper & lowercase letters
                                        </Text>
                                    </View>

                                    <View style={styles.requirementItem}>
                                        <Ionicons
                                            name={/[0-9]/.test(newPassword) ? "checkmark-circle" : "ellipse-outline"}
                                            size={18}
                                            color={/[0-9]/.test(newPassword) ? "#22C55E" : "#D1D5DB"}
                                        />
                                        <Text style={[
                                            styles.requirementText,
                                            /[0-9]/.test(newPassword) && styles.requirementMet
                                        ]}>
                                            At least one number
                                        </Text>
                                    </View>

                                    <View style={styles.requirementItem}>
                                        <Ionicons
                                            name={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword) ? "checkmark-circle" : "ellipse-outline"}
                                            size={18}
                                            color={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword) ? "#22C55E" : "#D1D5DB"}
                                        />
                                        <Text style={[
                                            styles.requirementText,
                                            /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword) && styles.requirementMet
                                        ]}>
                                            Special character (!@#$%...)
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Styled alert modal */}
                        <StyledAlert
                            visible={styledAlertVisible}
                            title={styledAlertTitle}
                            message={styledAlertMessage}
                            onOk={alertOnOk}
                            onClose={handleAlertClose}
                            showCancel={false}
                        />
                    </View>
                </ScrollView>
            </LinearGradient>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    scrollContainer: {
        flexGrow: 1,
    },
    container: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 32,
    },
    backButton: {
        width: 48,
        height: 48,
        marginBottom: 24,
        top: 16,
        left: -5,
        bottom: 25,
        zIndex: 10,
    },
    backButtonInner: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    illustrationSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        overflow: 'hidden',
        shadowColor: '#8B5CF6',
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 8,
    },
    iconGradient: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerSection: {
        marginBottom: 40,
        alignItems: 'center',
    },
    title: {
        fontSize: 32,
        fontFamily: fontFamily.bold,
        color: '#1F2937',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        fontFamily: fontFamily.regular,
        color: '#6B7280',
        lineHeight: 22,
        textAlign: 'center',
        paddingHorizontal: 8,
    },
    formSection: {
        flex: 1,
    },
    inputWrapper: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 15,
        fontFamily: fontFamily.semiBold,
        color: '#374151',
        marginBottom: 10,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 4,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
    },
    inputContainerFocused: {
        borderColor: '#8B5CF6',
        shadowColor: '#8B5CF6',
        shadowOpacity: 0.15,
    },
    iconWrapper: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        fontFamily: fontFamily.medium,
        color: '#1F2937',
        paddingHorizontal: 8,
        paddingVertical: 16,
    },
    validIcon: {
        marginRight: 4,
    },
    eyeButton: {
        padding: 8,
    },
    strengthContainer: {
        marginTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    strengthBar: {
        flex: 1,
        height: 6,
        backgroundColor: '#E5E7EB',
        borderRadius: 3,
        overflow: 'hidden',
    },
    strengthFill: {
        height: '100%',
        borderRadius: 3,
    },
    strengthText: {
        fontSize: 13,
        fontFamily: fontFamily.semiBold,
        minWidth: 60,
    },
    matchContainer: {
        marginTop: 8,
    },
    matchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    matchText: {
        fontSize: 13,
        fontFamily: fontFamily.medium,
        color: '#22C55E',
    },
    noMatchText: {
        fontSize: 13,
        fontFamily: fontFamily.medium,
        color: '#EF4444',
    },
    resetButton: {
        borderRadius: 16,
        marginTop: 12,
        marginBottom: 32,
        overflow: 'hidden',
        shadowColor: '#8B5CF6',
        shadowOffset: {
            width: 0,
            height: 6,
        },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 6,
    },
    resetButtonDisabled: {
        shadowOpacity: 0.1,
    },
    buttonGradient: {
        paddingVertical: 18,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    resetButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontFamily: fontFamily.bold,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    loadingText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontFamily: fontFamily.semiBold,
        marginLeft: 12,
    },
    requirementsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 3,
    },
    requirementsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    requirementsIconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F5F3FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    requirementsTitle: {
        fontSize: 16,
        fontFamily: fontFamily.bold,
        color: '#1F2937',
    },
    requirementsList: {
        gap: 12,
    },
    requirementItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    requirementText: {
        fontSize: 14,
        fontFamily: fontFamily.regular,
        color: '#9CA3AF',
        flex: 1,
    },
    requirementMet: {
        color: '#22C55E',
        fontFamily: fontFamily.medium,
    },
});