// app/auth/Signup.tsx
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Animated, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { StyledAlert } from '../components/StyledAlert';
import Colors from '../../constants/Colors';
import { SimpleLineIcons, Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useRef } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Linking } from 'react-native';
import type { RootStackParamList } from '../../types/navigation';
import { supabase } from '../../lib/supabase';
import { fontFamily } from '../../Styles/fontFamily';

type SignupScreenProps = NativeStackScreenProps<RootStackParamList, 'Signup'>;

export default function Signup({ navigation }: SignupScreenProps) {
    const [secureTextEntry, setSecureTextEntry] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');

    // Animation refs
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    useEffect(() => {
        // Entrance animation
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
        ]).start();

        // Listen for deep links
        const handleDeepLink = ({ url }: { url: string }) => {
            console.log('Deep link received:', url);
            if (url.includes('login-callback')) {
                navigation.navigate('Login');
            }
        };

        const subscription = Linking.addEventListener('url', handleDeepLink);
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state changed:', event, session?.user?.id);
            if (session) {
                navigation.navigate('Login');
            }
        });

        Linking.getInitialURL().then(url => {
            if (url) {
                console.log('Initial deep link:', url);
                handleDeepLink({ url });
            }
        });

        return () => {
            authSubscription.unsubscribe();
            subscription.remove();
        };
    }, [navigation, fadeAnim, slideAnim, scaleAnim]);

    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertTitle, setAlertTitle] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [focusedField, setFocusedField] = useState('');

    // Password validation function with real-time checking
    const getPasswordRequirements = (password: string) => {
        return [
            { text: 'At least 8 characters', met: password.length >= 8 },
            { text: 'One uppercase letter', met: /[A-Z]/.test(password) },
            { text: 'One lowercase letter', met: /[a-z]/.test(password) },
            { text: 'One number', met: /\d/.test(password) },
            { text: 'One special character', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) }
        ];
    };

    const validatePassword = (password: string) => {
        const requirements = getPasswordRequirements(password);
        const unmet = requirements.find(req => !req.met);
        return unmet ? unmet.text + ' is required' : null;
    };

    const handleSignup = async () => {
        setLoading(true);
        try {
            if (!fullName.trim() || !email.trim() || !password) {
                setAlertTitle('Missing Information');
                setAlertMessage('Please fill in all required fields');
                setAlertVisible(true);
                setLoading(false);
                return;
            }

            const passwordError = validatePassword(password);
            if (passwordError) {
                setAlertTitle('Password Requirements');
                setAlertMessage(passwordError);
                setAlertVisible(true);
                setLoading(false);
                return;
            }

            const { data: { user }, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName
                    }
                }
            });

            if (authError) {
                throw new Error(authError.message || 'Authentication failed');
            }

            const { data: existingProfile, error: fetchProfileError } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', user?.id)
                .single();

            if (fetchProfileError && fetchProfileError.code !== 'PGRST116') {
                throw new Error(fetchProfileError.message || 'Failed to fetch existing profile');
            }

            setAlertTitle('Welcome! 🎉');
            setAlertMessage('Account created successfully! Please check your email for verification.');
            setAlertVisible(true);

            // Keep success alert visible longer
            setTimeout(() => {
                setAlertVisible(false);
            }, 8000);
            navigation.navigate('Login');
        } catch (error: any) {
            console.error('Signup error:', error);

            let errorMessage = 'Could not create account';
            if (error.message) {
                errorMessage = error.message;
                if (error.message.includes('row-level security policy')) {
                    errorMessage = 'Profile creation permission denied';
                }
            }

            setAlertTitle('Signup Failed');
            setAlertMessage(errorMessage);
            setAlertVisible(true);
        } finally {
            setLoading(false);
        }
    };
    const passwordRequirements = getPasswordRequirements(password);

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
                    <StyledAlert
                        visible={alertVisible}
                        title={alertTitle}
                        message={alertMessage}
                        onClose={() => setAlertVisible(false)}
                    />

                    {/* Header Section */}
                    <View style={styles.headerSection}>
                        <Text style={styles.title}>Create Account</Text>
                        <Text style={styles.subtitle}>Join us and start your journey</Text>
                    </View>

                    {/* Form Section */}
                    <View style={styles.formSection}>
                        {/* Full Name Input */}
                        <View style={styles.inputWrapper}>
                            <Text style={styles.inputLabel}>Full Name</Text>
                            <View style={[
                                styles.inputContainer,
                                focusedField === 'fullName' && styles.inputContainerFocused
                            ]}>
                                <Ionicons name="person-outline" size={20} color="#6B7280" />
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter your full name"
                                    placeholderTextColor="#9CA3AF"
                                    value={fullName}
                                    onChangeText={setFullName}
                                    autoCapitalize="words"
                                    onFocus={() => setFocusedField('fullName')}
                                    onBlur={() => setFocusedField('')}
                                />
                            </View>
                        </View>

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
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
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
                                    placeholder="Create a strong password"
                                    placeholderTextColor="#9CA3AF"
                                    secureTextEntry={secureTextEntry}
                                    value={password}
                                    onChangeText={setPassword}
                                    autoCapitalize="none"
                                    onFocus={() => setFocusedField('password')}
                                    onBlur={() => setFocusedField('')}
                                />
                                <TouchableOpacity
                                    onPress={() => setSecureTextEntry(!secureTextEntry)}
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

                        {/* Password Requirements */}
                        {password.length > 0 && (
                            <View style={styles.passwordRequirements}>
                                <Text style={styles.requirementsTitle}>Password Requirements</Text>
                                {passwordRequirements.map((requirement, index) => (
                                    <View key={index} style={styles.requirementItem}>
                                        <Ionicons
                                            name={requirement.met ? "checkmark-circle" : "ellipse-outline"}
                                            size={16}
                                            color={requirement.met ? "#10B981" : "#9CA3AF"}
                                        />
                                        <Text style={[
                                            styles.requirementText,
                                            requirement.met && styles.requirementTextMet
                                        ]}>
                                            {requirement.text}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Sign Up Button */}
                        <TouchableOpacity
                            style={[styles.signupButton, loading && styles.signupButtonDisabled]}
                            onPress={handleSignup}
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                            {loading ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                    <Text style={styles.loadingText}>Creating Account...</Text>
                                </View>
                            ) : (
                                <Text style={styles.signupButtonText}>Create Account</Text>
                            )}
                        </TouchableOpacity>

                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            Already have an account?{' '}
                            <Text
                                style={styles.footerLink}
                                onPress={() => navigation.navigate('Login')}
                            >
                                Sign In
                            </Text>
                        </Text>
                    </View>
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
        marginTop: 40,
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
    passwordRequirements: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    requirementsTitle: {
        fontSize: 14,
        fontFamily: fontFamily.medium,
        color: '#374151',
        marginBottom: 12,
    },
    requirementItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    requirementText: {
        fontSize: 13,
        fontFamily: fontFamily.regular,
        color: '#6B7280',
        marginLeft: 8,
    },
    requirementTextMet: {
        color: '#10B981',
    },
    signupButton: {
        backgroundColor: '#1F2937',
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
        marginTop: 8,
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
    signupButtonDisabled: {
        backgroundColor: '#9CA3AF',
        shadowOpacity: 0.1,
    },
    signupButtonText: {
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
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E5E7EB',
    },
    dividerText: {
        fontSize: 14,
        fontFamily: fontFamily.regular,
        color: '#6B7280',
        paddingHorizontal: 16,
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