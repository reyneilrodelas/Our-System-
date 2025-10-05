import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View, Image, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { fontFamily } from '../../Styles/fontFamily';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Startup'>;

export default function Startup() {
    const navigation = useNavigation<NavigationProp>();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [imageLoaded, setImageLoaded] = useState(false);
    const [loadError, setLoadError] = useState(false);

    // Preload image and handle animation timing
    useEffect(() => {
        let timer: NodeJS.Timeout | undefined = undefined;

        // Try to preload the image
        try {
            const imageSource = Image.resolveAssetSource(
                require('../../assets/images/transparent.png')
            );

            Image.prefetch(imageSource.uri).then(() => {
                setImageLoaded(true);
            }).catch(() => {
                setLoadError(true);
                setImageLoaded(true); // Continue with fallback UI
            });
        } catch (error) {
            setLoadError(true);
            setImageLoaded(true); // Continue with fallback UI
        }

        return () => {
            if (timer) clearTimeout(timer);
        };
    }, []);

    // Handle animations when image is loaded
    useEffect(() => {
        if (imageLoaded) {
            // Fade in animation
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }).start();

            // Set timeout for fade out and navigation
            const timer = setTimeout(() => {
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                }).start(() => {
                    navigation.replace('Login');
                });
            }, 2500);

            return () => clearTimeout(timer);
        }
    }, [imageLoaded]);

    return (
        <LinearGradient
            colors={['#BEF0FF', '#00A8FF']}
            style={styles.container}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
        >
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                {!loadError ? (
                    <Image
                        source={require('../../assets/images/transparent.png')}
                        style={styles.image}
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setLoadError(true)}
                        fadeDuration={0} // Disable Android's default fade
                        resizeMode="contain"
                    />
                ) : (
                    <View style={styles.fallbackImage} />
                )}
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
        width: 100,
        height: 100,
    },
    fallbackImage: {
        width: 100,
        height: 100,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 20,
    },
    text: {
        fontSize: 30,
        fontFamily: fontFamily.extraBold,
        color: '#333',
        textAlign: 'center',
        marginTop: 20,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 1,
    },
});