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
    const [focusedField, setFocusedField] = useState('');

    // Styled alert modal state
    const [styledAlertVisible, setStyledAlertVisible] = useState(false);
    const [styledAlertTitle, setStyledAlertTitle] = useState('');
    const [styledAlertMessage, setStyledAlertMessage] = useState('');
    const [styledAlertOnOk, setStyledAlertOnOk] = useState<(() => void) | null>(null);

    // Navigation guard
    const isNavigating = useRef(false);
    const isLoggingIn = useRef(false);
    const hasCheckedSession = useRef(false);

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

        // Check for existing session ONLY once
        if (!hasCheckedSession.current) {
            hasCheckedSession.current = true;
            const sessionCheckTimeout = setTimeout(() => {
                checkSession();
            }, 500);
        }

        // Reset navigation flag when screen is focused (user returned from somewhere)
        const unsubscribeFocus = navigation.addListener('focus', () => {
            console.log('📍 LoginScreen focused');
            // Reset all guards when returning to login screen
            if (isNavigating.current) {
                isNavigating.current = false;
                console.log('🔄 Reset navigation guard');
            }
            if (isLoggingIn.current) {
                isLoggingIn.current = false;
                console.log('🔄 Reset login guard');
            }
            // Reset loading states
            setLoginLoading(false);
            setGoogleLoading(false);
        });

        // Listen for deep links
        const handleDeepLink = async ({ url }: { url: string }) => {
            console.log('🔗 [LoginScreen] Deep link received:', url);
            console.log('🔗 [LoginScreen] Full URL breakdown:', {
                href: url,
                hostname: new URL(url).hostname,
                pathname: new URL(url).pathname,
                search: new URL(url).search,
                hash: new URL(url).hash
            });

            if (url.includes('reset-password')) {
                console.log('✅ [LoginScreen] Reset password link detected');
                try {
                    const urlObj = new URL(url);
                    let token = urlObj.searchParams.get('token');

                    // If token not in query params, check hash fragment (Supabase may put it there)
                    if (!token && urlObj.hash) {
                        console.log('🔍 Token not in query params, checking hash fragment');
                        // Hash format: #access_token=xxx&type=recovery&expires_in=3600
                        const hashParams = new URLSearchParams(urlObj.hash.substring(1));
                        token = hashParams.get('access_token');
                        console.log('📦 Token from hash:', token ? `${token.substring(0, 20)}...` : 'MISSING');
                    }

                    console.log('📦 [LoginScreen] Extracted params:', {
                        token: token ? `${token.substring(0, 20)}...` : 'MISSING',
                        allParams: Array.from(urlObj.searchParams.entries())
                    });

                    if (token) {
                        console.log('✅ [LoginScreen] Valid recovery token found, navigating to ResetPassword');
                        navigation.navigate('ResetPassword', { token, type: 'recovery' });
                    } else {
                        console.log('❌ [LoginScreen] No token in URL');
                        showStyledAlert('Invalid Link', 'The password reset link is missing the token. Please try requesting a new password reset email.');
                    }
                } catch (error) {
                    console.error('❌ [LoginScreen] Error parsing deep link:', error);
                    showStyledAlert('Error', 'There was an error processing the password reset link.');
                }
            } else {
                console.log('❌ [LoginScreen] Not a reset-password link');
            }
        };

        const subscription = Linking.addEventListener('url', handleDeepLink);

        Linking.getInitialURL().then(url => {
            if (url) {
                console.log('🔗 [LoginScreen] Initial deep link detected (cold start):', url);
                handleDeepLink({ url });
            } else {
                console.log('ℹ️ [LoginScreen] No initial deep link (normal app launch)');
            }
        }).catch(err => {
            console.error('❌ [LoginScreen] Error getting initial URL:', err);
        });

        return () => {
            subscription.remove();
            unsubscribeFocus();
        };
    }, [navigation]);

    const checkSession = async () => {
        // Skip if already navigating or logging in
        if (isNavigating.current || isLoggingIn.current) {
            console.log('ℹ️ Already navigating or logging in, skipping session check');
            return;
        }

        try {
            console.log('🔍 Checking for existing session...');
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error) {
                console.log('ℹ️ Session check error:', error.message);
                return;
            }

            if (session) {
                console.log('✅ Active session found, navigating to Main');
                isNavigating.current = true;
                navigation.replace('Main');
            } else {
                console.log('ℹ️ No active session, staying on Login screen');
            }
        } catch (error) {
            console.error('❌ Session check error:', error);
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
        console.log('🔐 Login attempt started');

        if (!email || !password) {
            showStyledAlert('Missing Information', 'Please fill in both email and password');
            return;
        }

        if (isLoggingIn.current || loginLoading) {
            console.log('⚠️ Login already in progress, skipping');
            return;
        }

        setLoginLoading(true);
        isLoggingIn.current = true;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            console.log('📧 Attempting login with email:', email.trim().toLowerCase());

            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.trim().toLowerCase(),
                password,
            });

            if (error) {
                console.error('❌ Login error:', error.message);
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
            console.log('✅ Login successful');
            if (data.session) {
                console.log('✅ Session created successfully');
                // Set navigation flag BEFORE checking admin
                isNavigating.current = true;

                const isAdmin = await verifyAdmin();
                console.log('👤 User is admin:', isAdmin);

                showStyledAlert(
                    "Welcome Back! 🎉",
                    "You've successfully logged in to your account.",
                    () => {
                        console.log('User pressed OK, navigating to Main');
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
            console.error('❌ Login exception:', error);
            // Ensure guards are reset on error
            isNavigating.current = false;
            isLoggingIn.current = false;
            setLoginLoading(false);
        } finally {
            // Only reset loading state if not navigating
            if (!isNavigating.current) {
                console.log('🔄 Resetting login state (not navigating)');
                setLoginLoading(false);
                isLoggingIn.current = false;
            }
        }
    };

    const showStyledAlert = (title: string, message: string, onOk?: () => void) => {
        setStyledAlertTitle(title);
        setStyledAlertMessage(message);
        setStyledAlertOnOk(onOk || null);
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
                            onPress={() => navigation.navigate('ForgotPassword')}
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