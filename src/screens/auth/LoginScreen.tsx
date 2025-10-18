import React, { useState, useEffect, useRef } from 'react';
import {
    Animated,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Linking,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { StyledAlert } from '../components/StyledAlert';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import * as Haptics from 'expo-haptics';
import { SimpleLineIcons, Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../types/navigation';
import { fontFamily } from '../../Styles/fontFamily';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

// Helper function to verify admin status
const verifyAdmin = async (): Promise<boolean> => {
    const { data: { user }, error } = await supabase.auth.getUser();
    return !error && user?.user_metadata?.role === 'admin';
};

export default function LoginScreen({ navigation }: Props) {
    const [secureTextEntry, setSecureTextEntry] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [focusedField, setFocusedField] = useState('');

    // Styled alert modal state
    const [styledAlertVisible, setStyledAlertVisible] = useState(false);
    const [styledAlertTitle, setStyledAlertTitle] = useState('');
    const [styledAlertMessage, setStyledAlertMessage] = useState('');
    const [styledAlertOnOk, setStyledAlertOnOk] = useState<(() => void) | null>(null);

    // Navigation guard
    const isNavigating = useRef(false);
    const isLoggingIn = useRef(false);

    // Animation refs
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    useEffect(() => {
        // Entrance animation
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
        ]).start();

        let isHandlingDeepLink = false;

        // Handle deep links
        const handleDeepLink = async ({ url }: { url: string }) => {
            console.log('🔗 [LoginScreen] Deep link received:', url);

            if (isHandlingDeepLink) {
                console.log('⚠️ [LoginScreen] Already handling a deep link, ignoring...');
                return;
            }

            try {
                const urlObj = new URL(url);
                console.log('🔗 [LoginScreen] URL breakdown:', {
                    pathname: urlObj.pathname,
                    search: urlObj.search,
                    hash: urlObj.hash
                });

                // Check if it's a password reset link
                if (url.includes('reset-password')) {
                    isHandlingDeepLink = true;
                    console.log('✅ [LoginScreen] Password reset link detected');

                    // Supabase sends tokens in the hash fragment after # (not query params)
                    // Format: #access_token=xxx&expires_in=3600&refresh_token=yyy&token_type=bearer&type=recovery
                    const hash = urlObj.hash.substring(1); // Remove the # symbol
                    const hashParams = new URLSearchParams(hash);

                    const accessToken = hashParams.get('access_token');
                    const refreshToken = hashParams.get('refresh_token');
                    const type = hashParams.get('type');

                    console.log('📦 [LoginScreen] Extracted from hash:', {
                        hasAccessToken: !!accessToken,
                        hasRefreshToken: !!refreshToken,
                        type: type,
                        accessTokenPreview: accessToken ? `${accessToken.substring(0, 20)}...` : 'MISSING'
                    });

                    if (accessToken && refreshToken && type === 'recovery') {
                        console.log('✅ [LoginScreen] Valid recovery tokens found');

                        // Set the session using the tokens from the URL
                        console.log('🔐 [LoginScreen] Setting session with recovery tokens...');
                        const { data, error } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken
                        });

                        if (error) {
                            console.error('❌ [LoginScreen] Error setting session:', error);
                            showStyledAlert(
                                'Session Error',
                                'Failed to verify the password reset link. Please request a new one.'
                            );
                            isHandlingDeepLink = false;
                            return;
                        }

                        console.log('✅ [LoginScreen] Session established, navigating to ResetPassword');

                        // Navigate to reset password screen
                        // Give a small delay to ensure navigation is ready
                        setTimeout(() => {
                            navigation.navigate('ResetPassword', {
                                token: accessToken,
                                type: 'recovery'
                            });
                            isHandlingDeepLink = false;
                        }, 300);
                    } else {
                        console.log('❌ [LoginScreen] Missing required tokens in URL');
                        console.log('Hash content:', hash);
                        showStyledAlert(
                            'Invalid Link',
                            'The password reset link is invalid or incomplete. Please request a new password reset email.'
                        );
                        isHandlingDeepLink = false;
                    }
                } else {
                    console.log('ℹ️ [LoginScreen] Not a reset-password link');
                }
            } catch (error) {
                console.error('❌ [LoginScreen] Error parsing deep link:', error);
                showStyledAlert('Error', 'There was an error processing the link. Please try again.');
                isHandlingDeepLink = false;
            }
        };

        // Check initial URL first (for cold starts)
        Linking.getInitialURL().then(url => {
            if (url) {
                console.log('🔗 [LoginScreen] Initial URL detected (cold start):', url);
                handleDeepLink({ url });
            } else {
                console.log('ℹ️ [LoginScreen] No initial URL, checking session...');
                // Only check session if no deep link is present
                checkSession();
            }
        }).catch(err => {
            console.error('❌ [LoginScreen] Error getting initial URL:', err);
            checkSession();
        });

        // Listen for deep links while app is running
        const subscription = Linking.addEventListener('url', handleDeepLink);

        return () => {
            subscription.remove();
        };
    }, [navigation]);

    const checkSession = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session && !isLoggingIn.current) {
                navigation.replace('Main');
            }
        } catch (error) {
            console.error('Session check error:', error);
        }
    };

    const handlePasswordReset = async () => {
        console.log('=== PASSWORD RESET STARTED ===');
        console.log('Email entered:', email);
        
        if (!email) {
            console.log('❌ No email provided');
            showStyledAlert('Email Required', 'Please enter your email first to reset your password');
            return;
        }

        setResetLoading(true);
        try {
            console.log('📧 Sending password reset email to:', email);
            console.log('📧 Redirect URL:', 'scanwizard://reset-password');
            
            // Important: Don't include query parameters here - Supabase will add the token
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: 'scanwizard://reset-password'
            });
            
            if (error) {
                console.error('❌ Reset password error:', error);
                throw error;
            }

            console.log('✅ Password reset email sent successfully');
            showStyledAlert(
                'Reset Link Sent! 📧',
                'A password reset link has been sent to your email. Please check your inbox and click the link to reset your password.',
                () => setStyledAlertVisible(false)
            );
        } catch (error: any) {
            console.error('❌ Password reset exception:', error);
            console.error('Error message:', error?.message);
            console.error('Error details:', JSON.stringify(error, null, 2));
            
            let errorMessage = error?.message || 'An unknown error occurred';
            
            // Provide more helpful error messages
            if (errorMessage.includes('Invalid email')) {
                errorMessage = 'The email address is invalid. Please check and try again.';
            } else if (errorMessage.includes('User not found')) {
                errorMessage = 'This email is not registered. Please sign up first.';
            } else if (errorMessage.includes('over_email_send_rate_limit')) {
                errorMessage = 'Too many reset emails sent. Please try again later.';
            }
            
            showStyledAlert('Reset Failed ❌', errorMessage);
        } finally {
            setResetLoading(false);
            console.log('=== PASSWORD RESET COMPLETED ===\n');
        }
    };

    const handleResendConfirmation = async () => {
        if (!email) {
            showStyledAlert('Email Required', 'Please enter your email first to resend confirmation');
            return;
        }

        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: email.trim().toLowerCase()
            });

            if (error) throw error;

            showStyledAlert(
                'Confirmation Email Sent! 📧',
                'A new confirmation email has been sent. Please check your inbox and click the link to verify your account.',
                () => setStyledAlertVisible(false)
            );
        } catch (error) {
            showStyledAlert('Resend Failed', (error as any).message || 'Failed to resend confirmation email');
        }
    };

    const handleLogin = async () => {
        if (!email || !password) {
            showStyledAlert('Missing Information', 'Please fill in both email and password');
            return;
        }

        if (isLoggingIn.current || loginLoading) {
            return;
        }

        setLoginLoading(true);
        isLoggingIn.current = true;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.trim().toLowerCase(),
                password,
            });

            if (error) {
                let errorMessage = error.message;
                let alertTitle = 'Login Failed';

                if (error.status === 400) {
                    if (error.message.includes('Email not confirmed')) {
                        alertTitle = 'Email Not Confirmed';
                        errorMessage = 'Your email address has not been confirmed yet. Please check your inbox for the confirmation email and click the verification link.';

                        showStyledAlert(
                            alertTitle,
                            errorMessage + '\n\nWould you like us to resend the confirmation email?',
                            () => {
                                setStyledAlertVisible(false);
                                setTimeout(() => {
                                    showStyledAlert(
                                        'Resend Confirmation Email?',
                                        'Click "Resend" to receive a new confirmation email.',
                                        handleResendConfirmation
                                    );
                                }, 500);
                            }
                        );
                        return;
                    } else if (error.message.includes('Invalid login credentials')) {
                        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
                    }
                } else if (error.message.includes('email_not_confirmed')) {
                    alertTitle = 'Email Not Confirmed';
                    errorMessage = 'Please check your email and click the confirmation link before signing in.';

                    showStyledAlert(
                        alertTitle,
                        errorMessage + '\n\nNeed us to resend the confirmation email?',
                        () => {
                            setStyledAlertVisible(false);
                            setTimeout(() => {
                                showStyledAlert(
                                    'Resend Confirmation Email?',
                                    'Click "Resend" to receive a new confirmation email.',
                                    handleResendConfirmation
                                );
                            }, 500);
                        }
                    );
                    return;
                }

                showStyledAlert(alertTitle, errorMessage);
                throw new Error(errorMessage);
            }

            // Login successful
            if (data.session) {
                const isAdmin = await verifyAdmin();

                showStyledAlert(
                    "Welcome Back! 🎉",
                    "You've successfully logged in to your account.",
                    () => {
                        setStyledAlertVisible(false);
                        setTimeout(() => {
                            navigation.replace('Main');
                        }, 100);
                    }
                );

                if (isAdmin) {
                    setTimeout(() => {
                        showStyledAlert(
                            'Admin Access Granted 👑',
                            'You can access admin features from your profile.',
                            () => setStyledAlertVisible(false)
                        );
                    }, 2000);
                }
            }

        } catch (error: any) {
            console.error('Login error:', error);
        } finally {
            setLoginLoading(false);
            isLoggingIn.current = false;
        }
    };

    const showStyledAlert = (title: string, message: string, onOk?: () => void) => {
        setStyledAlertTitle(title);
        setStyledAlertMessage(message);
        setStyledAlertOnOk(() => onOk || null);
        setStyledAlertVisible(true);
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <Animated.View
                    style={[
                        styles.container,
                        {
                            opacity: fadeAnim,
                            transform: [
                                { translateY: slideAnim },
                                { scale: scaleAnim }
                            ]
                        }
                    ]}
                >
                    {/* Header Section */}
                    <View style={styles.headerSection}>
                        <Text style={styles.title}>Welcome Back</Text>
                        <Text style={styles.subtitle}>Sign in to continue your journey</Text>
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
                                <Ionicons name="mail-outline" size={20} color="#6B7280" />
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter your email"
                                    placeholderTextColor="#9CA3AF"
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    value={email}
                                    onChangeText={setEmail}
                                    editable={!loginLoading && !googleLoading}
                                    onFocus={() => setFocusedField('email')}
                                    onBlur={() => setFocusedField('')}
                                />
                            </View>
                        </View>

                        {/* Password Input */}
                        <View style={styles.inputWrapper}>
                            <Text style={styles.inputLabel}>Password</Text>
                            <View style={[
                                styles.inputContainer,
                                focusedField === 'password' && styles.inputContainerFocused
                            ]}>
                                <SimpleLineIcons name="lock" size={20} color="#6B7280" />
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter your password"
                                    placeholderTextColor="#9CA3AF"
                                    secureTextEntry={secureTextEntry}
                                    autoCapitalize="none"
                                    value={password}
                                    onChangeText={setPassword}
                                    editable={!loginLoading && !googleLoading}
                                    onFocus={() => setFocusedField('password')}
                                    onBlur={() => setFocusedField('')}
                                />
                                <TouchableOpacity
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setSecureTextEntry(!secureTextEntry);
                                    }}
                                    disabled={loginLoading || googleLoading}
                                    style={styles.eyeButton}
                                >
                                    <Ionicons
                                        name={secureTextEntry ? "eye-outline" : "eye-off-outline"}
                                        size={20}
                                        color="#6B7280"
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Forgot Password */}
                        <TouchableOpacity
                            style={[
                                styles.forgotContainer,
                                resetLoading && styles.forgotContainerDisabled
                            ]}
                            onPress={handlePasswordReset}
                            disabled={loginLoading || googleLoading || resetLoading}
                        >
                            {resetLoading ? (
                                <ActivityIndicator size="small" color="#007AFF" />
                            ) : (
                                <Text style={styles.forgotText}>Forgot Password?</Text>
                            )}
                        </TouchableOpacity>

                        {/* Login Button */}
                        <TouchableOpacity
                            style={[styles.loginButton, loginLoading && styles.loginButtonDisabled]}
                            onPress={handleLogin}
                            disabled={loginLoading}
                            activeOpacity={0.8}
                        >
                            {loginLoading ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                    <Text style={styles.loadingText}>Signing In...</Text>
                                </View>
                            ) : (
                                <Text style={styles.loginButtonText}>Sign In</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            Don't have an account?{' '}
                            <Text
                                style={styles.footerLink}
                                onPress={() => !loginLoading && !googleLoading && navigation.navigate('Signup')}
                            >
                                Sign Up
                            </Text>
                        </Text>
                    </View>

                    {/* Styled alert modal */}
                    <StyledAlert
                        visible={styledAlertVisible}
                        title={styledAlertTitle}
                        message={styledAlertMessage}
                        onOk={styledAlertOnOk || undefined}
                        onClose={() => setStyledAlertVisible(false)}
                        showCancel={false}
                    />
                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    scrollContainer: {
        flexGrow: 1,
        backgroundColor: '#F8FAFC',
    },
    container: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 32,
    },
    headerSection: {
        alignItems: 'center',
        marginBottom: 40,
        marginTop: 60,
    },
    title: {
        fontSize: 32,
        fontFamily: fontFamily.bold,
        color: '#1F2937',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        fontFamily: fontFamily.regular,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 24,
    },
    formSection: {
        flex: 1,
    },
    inputWrapper: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontFamily: fontFamily.medium,
        color: '#374151',
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 4,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    inputContainerFocused: {
        borderColor: '#3B82F6',
        shadowColor: '#3B82F6',
        shadowOpacity: 0.1,
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        fontFamily: fontFamily.regular,
        color: '#1F2937',
        paddingHorizontal: 12,
        paddingVertical: 16,
    },
    eyeButton: {
        padding: 8,
    },
    forgotContainer: {
        alignSelf: 'flex-end',
        marginBottom: 24,
        paddingVertical: 8,
    },
    forgotContainerDisabled: {
        opacity: 0.6,
    },
    forgotText: {
        fontSize: 14,
        fontFamily: fontFamily.medium,
        color: '#3B82F6',
        textDecorationLine: 'underline',
    },
    loginButton: {
        backgroundColor: '#1F2937',
        borderRadius: 16,
        marginTop: 8,
        paddingVertical: 18,
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#1F2937',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 4,
    },
    loginButtonDisabled: {
        backgroundColor: '#9CA3AF',
        shadowOpacity: 0.1,
    },
    loginButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: fontFamily.bold,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    loadingText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: fontFamily.medium,
        marginLeft: 8,
    },
    footer: {
        alignItems: 'center',
        marginTop: 32,
        paddingTop: 24,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    footerText: {
        fontSize: 15,
        fontFamily: fontFamily.regular,
        color: '#6B7280',
        textAlign: 'center',
    },
    footerLink: {
        color: '#3B82F6',
        fontFamily: fontFamily.medium,
        textDecorationLine: 'underline',
    },
});