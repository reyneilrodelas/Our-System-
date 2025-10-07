import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View, Image, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { fontFamily } from '../../Styles/fontFamily';
import { useAuth } from '../../context/AuthContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Startup'>;

// Adjust these times to control how long the startup screen shows
const MINIMUM_SCREEN_TIME = 1000; // Wait time before starting sequence
const FADE_IN_DURATION = 800; // Fade in animation duration
const DISPLAY_DURATION = 1500; // How long to show logo at full opacity
const FADE_OUT_DURATION = 600; // Fade out animation duration
// Total time: ~3.9 seconds (adjust individual values as needed)

export default function Startup() {
    const navigation = useNavigation<NavigationProp>();
    const { session } = useAuth(); // Get auth session
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [canNavigate, setCanNavigate] = useState(false);
    const mountTime = useRef(Date.now()).current;
    const hasNavigated = useRef(false); // Prevent multiple navigations

    useEffect(() => {
        console.log('Startup screen mounted');
        console.log('Current session:', session);

        // Prevent navigation away from this screen
        const unsubscribe = navigation.addListener('beforeRemove', (e) => {
            if (!hasNavigated.current) {
                // Prevent navigation until animation completes
                e.preventDefault();
                console.log('Navigation blocked - animation in progress');
            }
        });

        // Start fade in immediately
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: FADE_IN_DURATION,
            useNativeDriver: true,
        }).start(() => {
            console.log('Fade in complete');
        });

        // Force minimum display time
        const minimumTimer = setTimeout(() => {
            console.log('Minimum time elapsed');
            setCanNavigate(true);
        }, MINIMUM_SCREEN_TIME);

        return () => {
            clearTimeout(minimumTimer);
            unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (canNavigate) {
            console.log('Starting navigation sequence');

            // Wait for display duration, then fade out
            const displayTimer = setTimeout(() => {
                console.log('Starting fade out');

                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: FADE_OUT_DURATION,
                    useNativeDriver: true,
                }).start(() => {
                    console.log('Navigating away from startup');
                    handleNavigation();
                });
            }, DISPLAY_DURATION);

            return () => clearTimeout(displayTimer);
        }
    }, [canNavigate]);

    const handleNavigation = async () => {
        if (hasNavigated.current) {
            console.log('Navigation already in progress, skipping');
            return;
        }

        hasNavigated.current = true;
        console.log('Navigation allowed - starting');
        console.log('Session status:', session ? 'Logged in' : 'Not logged in');

        try {
            // Check if user is authenticated
            if (session) {
                // User is logged in, go to Main
                navigation.replace('Main');
            } else {
                // User is not logged in, go to Login
                navigation.replace('Login');
            }
        } catch (error) {
            console.error('Navigation error:', error);
            navigation.replace('Login');
        }
    };

    return (
        <LinearGradient
            colors={['#BEF0FF', '#00A8FF']}
            style={styles.container}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
        >
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                <Image
                    source={require('../../assets/images/finallogo.png')}
                    style={styles.image}
                    fadeDuration={0}
                    resizeMode="contain"
                />
                <Text style={styles.text}>ScanWizard</Text>
            </Animated.View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: 110,
        height: 110,
    },
    fallbackImage: {
        width: 110,
        height: 110,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 20,
    },
    text: {
        fontSize: 30,
        fontFamily: fontFamily.extraBold,
        color: '#333',
        textAlign: 'center',
        marginTop: 15,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 1,
    },
});