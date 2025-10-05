import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

type RootStackParamList = {
    Home: undefined;
    Scanner: undefined;
    AddProduct: undefined;
    AddStore: undefined;
    Profile: undefined;
};

export default function HomeScreen() {
    const navigation = useNavigation<StackNavigationProp<RootStackParamList, 'Home'>>();
    return (
        <LinearGradient
            colors={['#f8faff', '#e8f2ff', '#dce7ff', '#f0e6ff']}
            style={styles.container}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >

            <View style={styles.contentContainer}>
                <Image
                    source={require('../../assets/images/transparent.png')}
                    style={styles.image}
                    resizeMode="contain"
                />

                <View style={styles.brandContainer}>
                    <Text style={styles.brandText}>ScanWizard</Text>
                </View>

                <Text style={styles.title}>Welcome!</Text>
                <Text style={styles.subtitle}>
                    Quickly scan a product to explore details and nearby stores.
                </Text>

                <TouchableOpacity
                    style={styles.scanButton}
                    onPress={() => navigation.navigate('Scanner')}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={['#6366F1', '#8B5CF6', '#3B82F6']}
                        style={styles.buttonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Ionicons name="scan" size={24} color="#fff" style={{ marginRight: 10 }} />
                        <Text style={styles.scanButtonText}>Scan the Product</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    circle: {
        position: 'absolute',
        borderRadius: 1000,
        opacity: 0.08,
    },
    circle1: {
        width: 220,
        height: 220,
        backgroundColor: '#3B82F6',
        top: -110,
        right: -60,
    },
    circle2: {
        width: 180,
        height: 180,
        backgroundColor: '#8B5CF6',
        bottom: 80,
        left: -90,
    },
    circle3: {
        width: 120,
        height: 120,
        backgroundColor: '#6366F1',
        top: height * 0.25,
        right: 20,
    },
    circle4: {
        width: 160,
        height: 160,
        backgroundColor: '#A855F7',
        top: height * 0.15,
        left: -80,
    },
    circle5: {
        width: 90,
        height: 90,
        backgroundColor: '#1D4ED8',
        bottom: height * 0.4,
        right: -45,
    },
    contentContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    title: {
        fontSize: 25,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#1e293b',
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    subtitle: {
        fontSize: 16,
        color: '#475569',
        fontWeight: '500',
        textAlign: 'center',
        marginBottom: 40,
        paddingHorizontal: 30,
        lineHeight: 24,
    },
    image: {
        marginTop: 10,
        width: width * 0.8,
        height: width * 0.8,
        marginBottom: 10,
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    brandContainer: {
        alignItems: 'center',
        marginBottom: 25,
        position: 'absolute',
        top: 150,
    },
    brandText: {
        fontSize: 40,
        fontWeight: '700',
        color: '#1a0465ff',
        letterSpacing: 0,
        marginTop: -25
    },

    scanButton: {
        borderRadius: 16,
        elevation: 8,
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 16,
    },
    scanButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
});