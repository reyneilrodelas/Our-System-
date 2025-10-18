import React, { useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen({ navigation }: Props) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [styledAlertVisible, setStyledAlertVisible] = useState(false);
    const [styledAlertTitle, setStyledAlertTitle] = useState('');
    const [styledAlertMessage, setStyledAlertMessage] = useState('');
    const [alertOnOk, setAlertOnOk] = useState<(() => void) | undefined>();
    const [focusedField, setFocusedField] = useState('');
    const [emailSent, setEmailSent] = useState(false);

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

    const handleSendResetToken = async () => {
        console.log('=== PASSWORD RESET STARTED ===');
        console.log('Email entered:', email);

        if (!email.trim()) {
            console.log('❌ No email provided');
            showStyledAlert('Email Required', 'Please enter your email address to reset your password');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            showStyledAlert('Invalid Email', 'Please enter a valid email address');
            return;
        }

        setLoading(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            console.log('📧 Sending password reset OTP to:', email);

            const { error } = await supabase.auth.resetPasswordForEmail(
                email.trim().toLowerCase(),
                {
                    redirectTo: 'scanwizard://reset-password'
                }
            );

            if (error) {
                console.error('❌ OTP send error:', error);
                throw error;
            }

            console.log('✅ OTP code sent successfully');
            setEmailSent(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            showStyledAlert(
                'Reset Code Sent! 📧',
                'A verification code has been sent to your email. Please check your inbox (and spam folder) and enter the code to reset your password.',
                () => {
                    setStyledAlertVisible(false);
                    setTimeout(() => {
                        navigation.navigate('ResetPassword', { email });
                    }, 100);
                }
            );
        } catch (error: any) {
            console.error('❌ Password reset exception:', error);
            console.error('Error message:', error?.message);
            console.error('Error details:', JSON.stringify(error, null, 2));

            let errorMessage = error?.message || 'An unknown error occurred';

            if (errorMessage.includes('Invalid email')) {
                errorMessage = 'The email address is invalid. Please check and try again.';
            } else if (errorMessage.includes('User not found')) {
                errorMessage = 'This email is not registered. Please sign up first.';
            } else if (errorMessage.includes('over_email_send_rate_limit')) {
                errorMessage = 'Too many reset emails sent. Please try again later.';
            } else if (errorMessage.includes('rate limit')) {
                errorMessage = 'Too many requests. Please try again later.';
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
                                    colors={['#3B82F6', '#2563EB']}
                                    style={styles.iconGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <Ionicons name="lock-closed" size={48} color="#FFFFFF" />
                                </LinearGradient>
                            </View>
                        </View>

                        {/* Header Section */}
                        <View style={styles.headerSection}>
                            <Text style={styles.title}>Forgot Password?</Text>
                            <Text style={styles.subtitle}>
                                No worries! Enter your email and we'll send you a reset code to get you back on track.
                            </Text>
                        </View>

                        {/* Form Section */}
                        <View style={styles.formSection}>
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
                                            color={focusedField === 'email' ? '#3B82F6' : '#9CA3AF'}
                                        />
                                    </View>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="your@email.com"
                                        placeholderTextColor="#9CA3AF"
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                        value={email}
                                        onChangeText={setEmail}
                                        editable={!loading}
                                        onFocus={() => setFocusedField('email')}
                                        onBlur={() => setFocusedField('')}
                                    />
                                    {email.length > 0 && (
                                        <TouchableOpacity
                                            onPress={() => setEmail('')}
                                            style={styles.clearButton}
                                        >
                                            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>

                            {/* Send Reset Token Button */}
                            <TouchableOpacity
                                style={[styles.sendButton, loading && styles.sendButtonDisabled]}
                                onPress={handleSendResetToken}
                                disabled={loading}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={loading ? ['#9CA3AF', '#6B7280'] : ['#22C55E', '#16A34A']}
                                    style={styles.buttonGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    {loading ? (
                                        <View style={styles.loadingContainer}>
                                            <ActivityIndicator color="#FFFFFF" size="small" />
                                            <Text style={styles.loadingText}>Sending Code...</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.buttonContent}>
                                            <Text style={styles.sendButtonText}>Send Reset Code</Text>
                                            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                                        </View>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            {/* Info Card */}
                            <View style={styles.infoCard}>
                                <View style={styles.infoHeader}>
                                    <View style={styles.infoIconCircle}>
                                        <Ionicons name="information" size={16} color="#3B82F6" />
                                    </View>
                                    <Text style={styles.infoTitle}>How it works</Text>
                                </View>

                                <View style={styles.stepsContainer}>
                                    <View style={styles.stepItem}>
                                        <View style={styles.stepNumber}>
                                            <Text style={styles.stepNumberText}>1</Text>
                                        </View>
                                        <View style={styles.stepContent}>
                                            <Text style={styles.stepTitle}>Receive Code</Text>
                                            <Text style={styles.stepDescription}>
                                                We'll email you a 6-digit verification code
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.stepDivider} />

                                    <View style={styles.stepItem}>
                                        <View style={styles.stepNumber}>
                                            <Text style={styles.stepNumberText}>2</Text>
                                        </View>
                                        <View style={styles.stepContent}>
                                            <Text style={styles.stepTitle}>Check Inbox</Text>
                                            <Text style={styles.stepDescription}>
                                                Look in your inbox and spam folder
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.stepDivider} />

                                    <View style={styles.stepItem}>
                                        <View style={styles.stepNumber}>
                                            <Text style={styles.stepNumberText}>3</Text>
                                        </View>
                                        <View style={styles.stepContent}>
                                            <Text style={styles.stepTitle}>Reset Password</Text>
                                            <Text style={styles.stepDescription}>
                                                Enter the code to create a new password
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Bottom Section */}
                        <View style={styles.bottomSection}>
                            <View style={styles.divider}>
                                <View style={styles.dividerLine} />
                                <Text style={styles.dividerText}>or</Text>
                                <View style={styles.dividerLine} />
                            </View>

                            <TouchableOpacity
                                style={styles.secondaryButton}
                                onPress={() => !loading && navigation.navigate('ResetPassword')}
                                disabled={loading}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.secondaryButtonText}>
                                    Already have a code?{' '}
                                    <Text style={styles.secondaryButtonLink}>Enter it here</Text>
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Styled alert modal */}
                        <StyledAlert
                            visible={styledAlertVisible}
                            title={styledAlertTitle}
                            message={styledAlertMessage}
                            onOk={alertOnOk || undefined}
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
        shadowColor: '#3B82F6',
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
        fontSize: 16,
        fontFamily: fontFamily.regular,
        color: '#6B7280',
        lineHeight: 24,
        textAlign: 'center',
        paddingHorizontal: 8,
    },
    formSection: {
        flex: 1,
    },
    inputWrapper: {
        marginBottom: 24,
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
        borderColor: '#3B82F6',
        shadowColor: '#3B82F6',
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
    clearButton: {
        padding: 8,
    },
    sendButton: {
        borderRadius: 16,
        marginBottom: 32,
        overflow: 'hidden',
        shadowColor: '#22C55E',
        shadowOffset: {
            width: 0,
            height: 6,
        },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 6,
    },
    sendButtonDisabled: {
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
    sendButtonText: {
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
    infoCard: {
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
    infoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    infoIconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    infoTitle: {
        fontSize: 17,
        fontFamily: fontFamily.bold,
        color: '#1F2937',
    },
    stepsContainer: {
        gap: 0,
    },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 4,
    },
    stepNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    stepNumberText: {
        fontSize: 15,
        fontFamily: fontFamily.bold,
        color: '#3B82F6',
    },
    stepContent: {
        flex: 1,
        paddingTop: 2,
    },
    stepTitle: {
        fontSize: 15,
        fontFamily: fontFamily.semiBold,
        color: '#1F2937',
        marginBottom: 4,
    },
    stepDescription: {
        fontSize: 14,
        fontFamily: fontFamily.regular,
        color: '#6B7280',
        lineHeight: 20,
    },
    stepDivider: {
        height: 20,
        width: 2,
        backgroundColor: '#E5E7EB',
        marginLeft: 15,
        marginVertical: 4,
    },
    bottomSection: {
        marginTop: 24,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E5E7EB',
    },
    dividerText: {
        marginHorizontal: 16,
        fontSize: 14,
        fontFamily: fontFamily.medium,
        color: '#9CA3AF',
    },
    secondaryButton: {
        padding: 16,
        alignItems: 'center',
    },
    secondaryButtonText: {
        fontSize: 15,
        fontFamily: fontFamily.regular,
        color: '#6B7280',
    },
    secondaryButtonLink: {
        color: '#3B82F6',
        fontFamily: fontFamily.semiBold,
    },
});