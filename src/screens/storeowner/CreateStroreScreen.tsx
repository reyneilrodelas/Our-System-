import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { StyledAlert } from '../components/StyledAlert';
import MapView, { Marker } from 'react-native-maps';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ENV from '../../config/env';
import { emailConfig } from '../../config/emailConfig';
const supabaseUrl = ENV.SUPABASE_URL;
const supabaseKey = ENV.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);


type RootStackParamList = {
    MyStores: undefined;
};

export default function AddStoreScreen() {
    const { user, isLoading: authLoading } = useAuth();
    const navigation = useNavigation<StackNavigationProp<RootStackParamList, 'MyStores'>>();

    const [form, setForm] = useState({
        name: '',
        address: '',
        latitude: '',
        longitude: '',
        description: '',
    });

    const [loading, setLoading] = useState(false);
    const [checkingStore, setCheckingStore] = useState(true);
    const [message, setMessage] = useState('');
    const [hasStore, setHasStore] = useState(false);
    const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertTitle, setAlertTitle] = useState('');
    const [alertMessage, setAlertMessage] = useState('');

    const [region, setRegion] = useState({
        latitude: 12.6750,
        longitude: 123.8710,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    });

    useEffect(() => {
        const checkExistingStore = async () => {
            if (!user) {
                setCheckingStore(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('stores')
                    .select('id')
                    .eq('owner_id', user.id)
                    .limit(1);

                if (error) throw error;

                setHasStore(data && data.length > 0);
            } catch (error) {
                console.error('Error checking store:', error);
                setMessage('Error checking existing store');
            } finally {
                setCheckingStore(false);
            }
        };

        checkExistingStore();
    }, [user]);

    const checkLocationPermission = async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            setAlertTitle('Location Permission Required');
            setAlertMessage('Please enable location services to set your store location');
            setAlertVisible(true);
            await Location.requestForegroundPermissionsAsync();
            return false;
        }
        return true;
    };

    const handleLocationSelect = async () => {
        try {
            setLoading(true);
            setMessage('');
            setLocationAccuracy(null);

            const hasPermission = await checkLocationPermission();
            if (!hasPermission) {
                setMessage('Location permission is required to set your store location');
                return;
            }

            const servicesEnabled = await Location.hasServicesEnabledAsync();
            if (!servicesEnabled) {
                setMessage('Please enable location services in your device settings');
                return;
            }

            const location = await Promise.race([
                Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High
                }),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('Location request timed out')), 10000)
                )
            ]) as Location.LocationObject;

            if (!location?.coords ||
                isNaN(location.coords.latitude) ||
                isNaN(location.coords.longitude)) {
                throw new Error('Invalid location coordinates received');
            }

            const { latitude, longitude, accuracy } = location.coords;
            setLocationAccuracy(accuracy);

            setRegion({
                latitude,
                longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            });

            setForm(prev => ({
                ...prev,
                latitude: latitude.toString(),
                longitude: longitude.toString(),
            }));

        } catch (error) {
            console.error('Location error:', error);

            // Try with lower accuracy if high accuracy fails
            try {
                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced
                });

                if (location?.coords) {
                    const { latitude, longitude, accuracy } = location.coords;
                    setLocationAccuracy(accuracy);
                    setRegion({
                        latitude,
                        longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    });
                    setForm(prev => ({
                        ...prev,
                        latitude: latitude.toString(),
                        longitude: longitude.toString(),
                    }));
                    return;
                }
            } catch (fallbackError) {
                console.error('Fallback location error:', fallbackError);
            }

            let errorMessage = 'Failed to get your location. Please try again or set it manually on the map.';
            if (error instanceof Error) {
                if (error.message.includes('timed out')) {
                    errorMessage = 'Location detection timed out. Please try again in an open area.';
                } else if (error.message.includes('disabled')) {
                    errorMessage = 'Location services are disabled. Please enable them in settings.';
                }
            }

            setMessage(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleMapPress = (e: { nativeEvent: { coordinate: { latitude: any; longitude: any; }; }; }) => {
        const { latitude, longitude } = e.nativeEvent.coordinate;
        setForm(prev => ({
            ...prev,
            latitude: latitude.toString(),
            longitude: longitude.toString(),
        }));
        setRegion(prev => ({
            ...prev,
            latitude,
            longitude,
        }));
        setLocationAccuracy(null);
    };

    // Function to send email notification using Resend API
    const sendEmailNotification = async (storeName: string, storeAddress: string, ownerEmail: string) => {
        try {
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${emailConfig.RESEND_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: emailConfig.SENDER_EMAIL,
                    to: emailConfig.ADMIN_EMAIL,
                    subject: 'New Store Created - Requires Approval',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #6c5ce7;">New Store Submission</h2>
                            <p>A new store has been created and requires your approval:</p>
                            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
                                <p><strong>Store Name:</strong> ${storeName}</p>
                                <p><strong>Store Address:</strong> ${storeAddress}</p>
                                <p><strong>Owner Email:</strong> ${ownerEmail}</p>
                                <p><strong>Submission Date:</strong> ${new Date().toLocaleDateString()}</p>
                            </div>
                            <p>Please log into the admin dashboard to review and approve this store.</p>
                            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                            <p style="color: #666; font-size: 12px;">
                                This is an automated notification. Please do not reply to this email.
                            </p>
                        </div>
                    `,
                })
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorData}`);
            }

            const result = await response.json();
            console.log('Email sent successfully:', result);
            return true;
        } catch (error) {
            console.error('Failed to send email notification:', error);
            // Don't throw the error to prevent store creation from failing
            return false;
        }
    };

    const handleCreateStore = async () => {
        if (!user) {
            setMessage('User not authenticated');
            return;
        }

        try {
            setLoading(true);
            setMessage('');

            if (!form.name.trim() || !form.address.trim()) {
                throw new Error('Store name and address are required');
            }

            if (!form.latitude || !form.longitude) {
                throw new Error('Please set your store location');
            }

            const { data, error } = await supabase.from('stores').insert({
                name: form.name.trim(),
                address: form.address.trim(),
                latitude: parseFloat(form.latitude),
                longitude: parseFloat(form.longitude),
                status: 'pending',
                description: form.description.trim(),
                owner_id: user.id,
            }).select();

            if (error) throw error;

            // Send email notification to admin (non-blocking)
            sendEmailNotification(form.name.trim(), form.address.trim(), user.email || 'Unknown')
                .then(success => {
                    if (success) {
                        console.log('Admin notification sent successfully');
                    } else {
                        console.warn('Failed to send admin notification, but store was created');
                    }
                })
                .catch(emailError => {
                    console.error('Error in email notification:', emailError);
                });

            setAlertTitle('Success');
            setAlertMessage('Your store has been submitted for admin approval. You will be notified once approved.');
            setAlertVisible(true);
            setHasStore(true);

            // Navigate after a short delay to show the success message
            setTimeout(() => {
                navigation.navigate('MyStores');
            }, 2000);

        } catch (error) {
            if (error instanceof Error) {
                setMessage(error.message);
            } else {
                setMessage('Failed to create store. Please try again.');
            }
            console.error('Create store error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (checkingStore || authLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6c5ce7" />
                <Text style={styles.loadingText}>Checking your account...</Text>
            </View>
        );
    }

    if (hasStore) {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.headerGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                >
                    <View style={styles.headerContent}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Ionicons name="arrow-back" size={28} color="white" />
                        </TouchableOpacity>
                        <View style={styles.titleContainer}>
                            <Text style={styles.title}>My Stores</Text>
                        </View>
                        <View style={styles.headerRight} />
                    </View>
                </LinearGradient>

                <View style={styles.contentContainer}>
                    <View style={styles.messageContainer}>
                        <Ionicons name="checkmark-circle" size={48} color="#00b894" style={styles.messageIcon} />
                        <Text style={styles.message}>
                            You already have a store registered. You can view or edit it from your profile.
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => navigation.navigate('MyStores')}
                    >
                        <Text style={styles.buttonText}>Go to My Store</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <LinearGradient
                colors={['#6c5ce7', '#0984e3']}
                style={styles.headerGradient}
            >
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={28} color="white" />
                    </TouchableOpacity>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>Create New Store</Text>
                    </View>
                    <View style={styles.headerRight} />
                </View>
            </LinearGradient>

            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                keyboardShouldPersistTaps="handled"
            >
                {loading && (
                    <View style={styles.locationLoadingOverlay}>
                        <ActivityIndicator size="large" color="#6c5ce7" />
                        <Text style={styles.locationLoadingText}>Detecting your location...</Text>
                    </View>
                )}

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Store Name *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. My Awesome Store"
                        placeholderTextColor="#999"
                        value={form.name}
                        onChangeText={(text) => setForm({ ...form, name: text })}
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Store Address *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. 123 Main Street, City"
                        placeholderTextColor="#999"
                        value={form.address}
                        onChangeText={(text) => setForm({ ...form, address: text })}
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Description</Text>
                    <TextInput
                        style={[styles.input, styles.descriptionInput]}
                        placeholder="Tell customers about your store..."
                        placeholderTextColor="#999"
                        value={form.description}
                        onChangeText={(text) => setForm({ ...form, description: text })}
                        multiline
                        numberOfLines={4}
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Store Location *</Text>
                    <TouchableOpacity
                        style={styles.locationButton}
                        onPress={handleLocationSelect}
                        disabled={loading}
                    >
                        <Ionicons name="location" size={20} color="#fff" />
                        <Text style={styles.locationButtonText}>Use Current Location</Text>
                    </TouchableOpacity>

                    {locationAccuracy && (
                        <Text style={styles.accuracyText}>
                            Location accuracy: ~{Math.round(locationAccuracy)} meters
                        </Text>
                    )}

                    <View style={styles.mapContainer}>
                        <MapView
                            style={styles.map}
                            region={region}
                            onPress={handleMapPress}
                            showsUserLocation={true}
                            showsMyLocationButton={false}
                        >
                            {form.latitude && form.longitude && (
                                <Marker
                                    coordinate={{
                                        latitude: parseFloat(form.latitude),
                                        longitude: parseFloat(form.longitude)
                                    }}
                                >
                                    <View style={styles.marker}>
                                        <Ionicons name="location" size={24} color="#e74c3c" />
                                    </View>
                                </Marker>
                            )}
                        </MapView>
                        <Text style={styles.mapHelpText}>
                            Tap on the map or use current location to set your store position
                        </Text>
                    </View>
                </View>

                {message ? (
                    <View style={styles.errorContainer}>
                        <Ionicons name="warning" size={20} color="#e74c3c" />
                        <Text style={styles.errorText}>{message}</Text>
                        <TouchableOpacity
                            style={styles.retryButton}
                            onPress={handleLocationSelect}
                        >
                            <Ionicons name="refresh" size={16} color="#fff" />
                            <Text style={styles.retryButtonText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                ) : null}

                <TouchableOpacity
                    style={[
                        styles.primaryButton,
                        (loading || !form.name || !form.address || !form.latitude || !form.longitude) &&
                        styles.disabledButton
                    ]}
                    onPress={handleCreateStore}
                    disabled={loading || !form.name || !form.address || !form.latitude || !form.longitude}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Submit Store for Approval</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>

            <StyledAlert
                visible={alertVisible}
                title={alertTitle}
                message={alertMessage}
                onClose={() => setAlertVisible(false)}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f6fa',
    },
    headerGradient: {
        paddingTop: 50,
        paddingBottom: 30,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        padding: 10,
        borderRadius: 20,
        zIndex: 10,
    },
    titleContainer: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 10,
    },
    headerRight: {
        width: 48,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
        textAlign: 'center',
        textShadowColor: 'rgba(0,0,0,0.2)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    scrollContainer: {
        paddingHorizontal: 20,
        paddingBottom: 30,
        marginTop: 30,
    },
    contentContainer: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f6fa',
    },
    loadingText: {
        marginTop: 15,
        fontSize: 16,
        color: '#636e72',
    },
    loadingIndicator: {
        marginVertical: 20,
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2d3436',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        fontSize: 16,
        color: '#2d3436',
        borderWidth: 1,
        borderColor: '#dfe6e9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    descriptionInput: {
        minHeight: 120,
        textAlignVertical: 'top',
    },
    locationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#6c5ce7',
        padding: 15,
        borderRadius: 10,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    locationButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
        marginLeft: 10,
    },
    mapContainer: {
        height: 300,
        borderRadius: 10,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#dfe6e9',
    },
    map: {
        flex: 1,
        width: '100%',
    },
    mapHelpText: {
        fontSize: 12,
        color: '#636e72',
        textAlign: 'center',
        paddingVertical: 8,
        backgroundColor: '#f8f9fa',
    },
    marker: {
        backgroundColor: 'rgba(255,255,255,0.8)',
        padding: 5,
        borderRadius: 20,
    },
    primaryButton: {
        backgroundColor: '#6c5ce7',
        padding: 16,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    disabledButton: {
        backgroundColor: '#b2bec3',
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    messageContainer: {
        alignItems: 'center',
        marginBottom: 30,
        padding: 20,
        backgroundColor: '#fff',
        borderRadius: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    messageIcon: {
        marginBottom: 15,
    },
    message: {
        fontSize: 16,
        textAlign: 'center',
        color: '#636e72',
        lineHeight: 24,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffecec',
        padding: 15,
        borderRadius: 10,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#ffcdcd',
    },
    errorText: {
        color: '#e74c3c',
        marginLeft: 10,
        fontSize: 14,
        flex: 1,
    },
    accuracyText: {
        fontSize: 12,
        color: '#636e72',
        marginBottom: 10,
        textAlign: 'center',
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#6c5ce7',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 15,
        marginLeft: 10,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 12,
        marginLeft: 5,
    },
    locationLoadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    locationLoadingText: {
        marginTop: 10,
        color: '#6c5ce7',
        fontSize: 16,
    },
});