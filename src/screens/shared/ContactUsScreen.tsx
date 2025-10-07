import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function ContactUsScreen() {
    const navigation = useNavigation();

    const handleEmailPress = () => {
        Linking.openURL('mailto:scanwizards@gmail.com?subject=ScanWizard Support');
    };

    const handlePhonePress = () => {
        Linking.openURL('tel:+639510166794');
    };

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
                <Text style={styles.headerTitle}>Contact Us</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.contentContainer}>
                    <View style={styles.heroSection}>
                        <Text style={styles.heroTitle}>Need Help with ScanWizard?</Text>
                        <Text style={styles.heroDescription}>
                            Our support team is here to assist you with any questions about product locating, distance tracking, or technical issues. Reach out to us through any of the following methods:
                        </Text>
                    </View>

                    <View style={styles.contactGrid}>
                        <TouchableOpacity style={styles.contactCard} onPress={handleEmailPress}>
                            <View style={styles.contactIcon}>
                                <MaterialIcons name="email" size={32} color="#4c669f" />
                            </View>
                            <Text style={styles.contactCardLabel}>Email Support</Text>
                            <Text style={styles.contactCardInfo}>scanwizards@gmail.com</Text>
                            <Text style={styles.contactCardDescription}>Get help with app features and technical support</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.contactCard} onPress={handlePhonePress}>
                            <View style={styles.contactIcon}>
                                <FontAwesome name="phone" size={32} color="#4c669f" />
                            </View>
                            <Text style={styles.contactCardLabel}>Phone Support</Text>
                            <Text style={styles.contactCardInfo}>+63 (951) 016-6794</Text>
                            <Text style={styles.contactCardDescription}>Call us for immediate assistance</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.infoSection}>
                        <View style={styles.infoCard}>
                            <MaterialIcons name="location-on" size={28} color="#ffffff" />
                            <View style={styles.infoContent}>
                                <Text style={styles.infoTitle}>Development Headquarters</Text>
                                <Text style={styles.infoText}>
                                    Sorsogon State University{'\n'}
                                    Bulan Campus{'\n'}
                                    Zone 3, Bulan, Sorsogon{'\n'}
                                    Philippines
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.hoursSection}>
                        <Text style={styles.sectionTitle}>🕒 Support Hours</Text>
                        <View style={styles.hoursCard}>
                            <Text style={styles.hoursText}>
                                <Text style={styles.hoursDay}>Monday - Friday:</Text> 9:00 AM - 6:00 PM PST{'\n'}
                                <Text style={styles.hoursDay}>Saturday:</Text> 10:00 AM - 4:00 PM PST{'\n'}
                                <Text style={styles.hoursDay}>Sunday:</Text> Closed{'\n'}
                                <Text style={styles.hoursDay}>Emergency Support:</Text> 24/7 for critical app issues
                            </Text>
                        </View>
                    </View>

                    <View style={styles.helpSection}>
                        <Text style={styles.sectionTitle}>💡 Quick Help</Text>
                        <View style={styles.helpCard}>
                            <Text style={styles.helpText}>
                                • For barcode scanning issues: Check camera permissions{'\n'}
                                • Location not working: Enable GPS services{'\n'}
                                • Distance tracking: Ensure location services are active{'\n'}
                                • Store integration: Verify internet connection{'\n'}
                            </Text>
                        </View>
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
    heroSection: {
        marginBottom: 30,
    },
    heroTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 10,
        textAlign: 'center',
    },
    heroDescription: {
        fontSize: 16,
        color: '#ffffff',
        lineHeight: 24,
        textAlign: 'center',
    },
    contactGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 25,
    },
    contactCard: {
        width: '48%',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: 15,
        borderRadius: 12,
        marginBottom: 15,
        alignItems: 'center',
    },
    contactIcon: {
        width: 60,
        height: 60,
        backgroundColor: '#e8f4fd',
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    contactCardLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        marginBottom: 5,
    },
    contactCardInfo: {
        fontSize: 12,
        color: '#4c669f',
        textAlign: 'center',
        marginBottom: 8,
        fontWeight: '600',
    },
    contactCardDescription: {
        fontSize: 10,
        color: '#666',
        textAlign: 'center',
        lineHeight: 14,
    },
    infoSection: {
        marginBottom: 25,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: 20,
        borderRadius: 12,
    },
    infoContent: {
        marginLeft: 15,
        flex: 1,
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 8,
    },
    infoText: {
        fontSize: 14,
        color: '#ffffff',
        lineHeight: 20,
    },
    hoursSection: {
        marginBottom: 25,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 15,
    },
    hoursCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: 20,
        borderRadius: 12,
    },
    hoursText: {
        fontSize: 14,
        color: '#ffffff',
        lineHeight: 22,
    },
    hoursDay: {
        fontWeight: 'bold',
        color: '#ffd700',
    },
    helpSection: {
        marginBottom: 20,
    },
    helpCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: 20,
        borderRadius: 12,
    },
    helpText: {
        fontSize: 14,
        color: '#ffffff',
        lineHeight: 20,
    },
});