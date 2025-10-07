import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function AboutUsScreen() {
    const navigation = useNavigation();

    return (
        <LinearGradient
            colors={['#4c669f', '#3b5998', '#192f6a']}
            style={styles.container}
        >
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="#ffffff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>About ScanWizard</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.contentContainer}>
                    <View style={styles.logoContainer}>
                        <Image
                            source={require('../../assets/images/finallogo.png')}
                            style={styles.logoImage}
                            resizeMode="contain"
                        />
                        <Text style={styles.title}>ScanWizard</Text>
                        <Text style={styles.subtitle}>Product Locator with Customizable Distance Tracker</Text>
                    </View>

                    <Text style={styles.description}>
                        Welcome to ScanWizard! We are a cutting-edge mobile application built using React Native and Expo, designed to revolutionize how users find products within their local area. Our innovative platform combines barcode scanning with real-time location tracking to help you locate products within your preferred radius.
                    </Text>

                    <View style={styles.featureCard}>
                        <Text style={styles.sectionTitle}>🌟 Our Vision</Text>
                        <Text style={styles.description}>
                            To create a seamless shopping experience where finding products is as easy as waving a magic wand. We bridge the gap between shoppers and local stores through advanced technology and real-time tracking.
                        </Text>
                    </View>

                    <View style={styles.featureCard}>
                        <Text style={styles.sectionTitle}>🚀 Key Features</Text>
                        <View style={styles.featureList}>
                            <View style={styles.featureItem}>
                                <Text style={styles.featureIcon}>📱</Text>
                                <View style={styles.featureText}>
                                    <Text style={styles.featureTitle}>Smart Product Locator</Text>
                                    <Text style={styles.featureDescription}>Scan barcodes or QR codes to instantly find products</Text>
                                </View>
                            </View>

                            <View style={styles.featureItem}>
                                <Text style={styles.featureIcon}>🎯</Text>
                                <View style={styles.featureText}>
                                    <Text style={styles.featureTitle}>Customizable Distance Tracker</Text>
                                    <Text style={styles.featureDescription}>Set your preferred radius to find products within your desired range</Text>
                                </View>
                            </View>

                            <View style={styles.featureItem}>
                                <Text style={styles.featureIcon}>📍</Text>
                                <View style={styles.featureText}>
                                    <Text style={styles.featureTitle}>Real-Time Location Updates</Text>
                                    <Text style={styles.featureDescription}>Continuous distance tracking as you move</Text>
                                </View>
                            </View>

                            <View style={styles.featureItem}>
                                <Text style={styles.featureIcon}>🏪</Text>
                                <View style={styles.featureText}>
                                    <Text style={styles.featureTitle}>Store Integration</Text>
                                    <Text style={styles.featureDescription}>Connect with nearby stores and view inventory in real-time</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    <View style={styles.featureCard}>
                        <Text style={styles.sectionTitle}>🛠 Technology Stack</Text>
                        <Text style={styles.techList}>
                            • React Native & Expo for cross-platform development{'\n'}
                            • Geolocation API for precise location tracking{'\n'}
                            • Advanced Barcode Scanner integration{'\n'}
                            • Interactive Map View for location visualization{'\n'}
                            • Real-time data synchronization
                        </Text>
                    </View>

                    <View style={styles.missionCard}>
                        <Text style={styles.sectionTitle}>🎯 Our Mission</Text>
                        <Text style={styles.description}>
                            We're committed to streamlining your shopping experience by providing instant product location information while supporting local businesses in their digital transformation. ScanWizard empowers both shoppers and store managers with powerful tools for efficient product discovery.
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    placeholder: {
        width: 40,
    },
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
        paddingTop: 10,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    logoImage: {
        width: 120,
        height: 120,
        marginBottom: 10,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 16,
        color: '#e0e0e0',
        textAlign: 'center',
        fontStyle: 'italic',
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 15,
    },
    description: {
        fontSize: 16,
        color: '#ffffff',
        lineHeight: 24,
        marginBottom: 20,
    },
    featureCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: 20,
        borderRadius: 15,
        marginBottom: 20,
    },
    missionCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        padding: 20,
        borderRadius: 15,
        marginBottom: 20,
        borderLeftWidth: 4,
        borderLeftColor: '#4CAF50',
    },
    featureList: {
        marginTop: 10,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    featureIcon: {
        fontSize: 24,
        marginRight: 15,
        marginTop: 2,
    },
    featureText: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 4,
    },
    featureDescription: {
        fontSize: 14,
        color: '#e0e0e0',
        lineHeight: 20,
    },
    techList: {
        fontSize: 14,
        color: '#ffffff',
        lineHeight: 22,
    },
});