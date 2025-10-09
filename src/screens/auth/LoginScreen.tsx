import React, { useState, useEffect, useRef } from 'react';
import {
    Animated,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Image,
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
    const [focusedField, setFocusedField] = useState('');

    // Styled alert modal state
    const [styledAlertVisible, setStyledAlertVisible] = useState(false);
    const [styledAlertTitle, setStyledAlertTitle] = useState('');
    const [styledAlertMessage, setStyledAlertMessage] = useState('');
    const [styledAlertOnOk, setStyledAlertOnOk] = useState<(() => void) | null>(null);

    // Navigation guard to prevent multiple navigations
    const isNavigating = useRef(false);
    const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Animation refs
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    useEffect(() => {
        // Cleanup function to clear timeouts
        return () => {
            if (navigationTimeoutRef.current) {
                clearTimeout(navigationTimeoutRef.current);
            }
        };
    }, []);

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

        // Check for existing session
        checkSession();

        // Listen for deep links
        const handleDeepLink = async ({ url }: { url: string }) => {
            console.log('Deep link received:', url);

            if (url.includes('reset-password')) {
                const params = new URL(url).searchParams;
                const token = params.get('token');
                const type = params.get('type');

                if (type === 'recovery' && token) {
                    showStyledAlert(
                        'Reset Password',
                        'Please enter your new password',
                        () => setStyledAlertVisible(false)
                    );
                }
            } else if (url.includes('login-callback')) {
                checkSession();
            }
        };

        const subscription = Linking.addEventListener('url', handleDeepLink);
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state changed:', event, session?.user?.id);
            if (session && event === 'SIGNED_IN') {
                await handlePostLoginNavigation(session.user);
            }
        });

        Linking.getInitialURL().then(url => {
            if (url) {
                console.log('Initial deep link:', url);
                handleDeepLink({ url });
            }
        }).catch(err => {
            console.error('Error getting initial URL:', err);
        });

        return () => {
            authSubscription.unsubscribe();
            subscription.remove();
            if (navigationTimeoutRef.current) {
                clearTimeout(navigationTimeoutRef.current);
            }
        };
    }, [navigation, fadeAnim, slideAnim, scaleAnim]);

    const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            await handlePostLoginNavigation(session.user);
        }
    };

    const handlePasswordReset = async () => {
        if (!email) {
            showStyledAlert('Email Required', 'Please enter your email first to reset your password');
            return;
        }

        try {
            // Request password reset with verification code
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: 'scanwizard://reset-password'
            });
            if (error) throw error;

            showStyledAlert(
                'Reset Link Sent! 📧',
                'A password reset link has been sent to your email. Please check your inbox and click the link to reset your password.',
                () => setStyledAlertVisible(false)
            );

            showStyledAlert(
                'Verification Code Sent! 📧',
                'A verification code has been sent to your email. Please check your inbox and enter the code to reset your password.',
                () => setStyledAlertVisible(false)
            );

            // Keep success alert visible longer
            setTimeout(() => {
                setStyledAlertVisible(false);
            }, 6000);
        } catch (error) {
            showStyledAlert('Reset Failed', (error as any).message);
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

            // Keep success alert visible longer
            setTimeout(() => {
                setStyledAlertVisible(false);
            }, 6000);
        } catch (error) {
            showStyledAlert('Resend Failed', (error as any).message || 'Failed to resend confirmation email');
        }
    };

    const handlePostLoginNavigation = async (user: any) => {
        // Prevent multiple navigation attempts
        if (isNavigating.current) {
            console.log('Navigation already in progress, skipping...');
            return;
        }

        try {
            isNavigating.current = true;

            const { data: { user: currentUser }, error } = await supabase.auth.getUser();
            if (error) throw error;

            const isAdmin = await verifyAdmin();

            // Show success message
            showStyledAlert(
                "Welcome Back! 🎉",
                "You've successfully logged in to your account.",
                () => {
                    setStyledAlertVisible(false);
                    // Navigate after alert is dismissed
                    navigationTimeoutRef.current = setTimeout(() => {
                        if (!isNavigating.current) return;
                        navigation.replace('Main');
                        isNavigating.current = false;
                    }, 100);
                }
            );

            // Show admin message if applicable (after navigation)
            if (isAdmin) {
                navigationTimeoutRef.current = setTimeout(() => {
                    showStyledAlert(
                        'Admin Access Granted 👑',
                        'You can access admin features from your profile.',
                        () => setStyledAlertVisible(false)
                    );
                }, 3000);
            }
        } catch (error) {
            console.error('Navigation error:', error);
            isNavigating.current = false;
            showStyledAlert('Authentication Error', 'Failed to authenticate user');
        }
    };

    const handleLogin = async () => {
        if (!email || !password) {
            showStyledAlert('Missing Information', 'Please fill in both email and password');
            return;
        }

        // Prevent multiple login attempts
        if (isNavigating.current) {
            console.log('Login already in progress, skipping...');
            return;
        }

        setLoginLoading(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.trim().toLowerCase(),
                password,
            });

            if (error) {
                let errorMessage = error.message;
                let alertTitle = 'Login Failed';

                // Handle specific error cases
                if (error.status === 400) {
                    if (error.message.includes('Email not confirmed')) {
                        alertTitle = 'Email Not Confirmed';
                        errorMessage = 'Your email address has not been confirmed yet. Please check your inbox for the confirmation email and click the verification link.';

                        // Show additional option to resend confirmation
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
                        setLoginLoading(false);
                        isNavigating.current = false;
                        return;
                    } else if (error.message.includes('Invalid login credentials')) {
                        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
                    } else {
                        errorMessage = 'Invalid email or password. Please check your credentials.';
                    }
                } else if (error.status === 401) {
                    errorMessage = 'Authentication failed. Please check your credentials.';
                } else if (error.message.includes('signup_disabled')) {
                    errorMessage = 'New signups are currently disabled. Please contact support.';
                } else if (error.message.includes('email_not_confirmed')) {
                    alertTitle = 'Email Not Confirmed';
                    errorMessage = 'Please check your email and click the confirmation link before signing in.';

                    // Show resend option for this case too
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
                    setLoginLoading(false);
                    isNavigating.current = false;
                    return;
                }

                showStyledAlert(alertTitle, errorMessage);
                throw new Error(errorMessage);
            }

            // Navigation will be handled by the auth state change listener or handlePostLoginNavigation
            console.log('Login successful, waiting for navigation...');

        } catch (error: any) {
            isNavigating.current = false;
            // Only show error if we haven't already shown a specific one above
            if (!error.message?.includes('Email not confirmed') && !error.message?.includes('email_not_confirmed')) {
                showStyledAlert(
                    'Login Failed',
                    error.message || 'Authentication error occurred. Please try again.'
                );
            }
            console.error('Login error details:', { email, error: JSON.stringify(error, null, 2) });
        } finally {
            setLoginLoading(false);
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
                            style={styles.forgotContainer}
                            onPress={handlePasswordReset}
                            disabled={loginLoading || googleLoading}
                        >
                            <Text style={styles.forgotText}>Forgot Password?</Text>
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

// ... keep your existing styles the same ...
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
    googleButton: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
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
    googleIcon: {
        width: 24,
        height: 24,
        marginRight: 12,
    },
    googleButtonText: {
        fontSize: 16,
        fontFamily: fontFamily.medium,
        color: '#374151',
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