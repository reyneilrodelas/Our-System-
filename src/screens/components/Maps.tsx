import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableWithoutFeedback,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyledAlert } from './StyledAlert';
import MapView, { Marker, Circle, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';

interface Store {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    email?: string;
}

interface RouteParams {
    storeData?: Array<{ stores: Store } | Store>;
    userLocation?: { latitude: number; longitude: number };
    focusStoreId?: string;
}

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        0.5 -
        Math.cos(dLat) / 2 +
        Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        (1 - Math.cos(dLon)) / 2;
    const c = 2 * Math.asin(Math.sqrt(a));
    return R * c;
};

const MapScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const params = route.params as RouteParams;

    const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);
    const [selectedDistance, setSelectedDistance] = useState(1);
    const [selectedStore, setSelectedStore] = useState<Store | null>(null);
    const [storeDistance, setStoreDistance] = useState(0);
    const [mapType, setMapType] = useState<'standard' | 'satellite' | 'hybrid'>('standard');
    const [loading, setLoading] = useState(true);
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertTitle, setAlertTitle] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [pickerVisible, setPickerVisible] = useState(false);

    // Distance options
    const distances = [
        { label: '1 km', value: 1, icon: '📍', description: 'Very close' },
        { label: '3 km', value: 3, icon: '🗺️', description: 'Nearby area' },
        { label: '5 km', value: 5, icon: '🌍', description: 'Wider range' },
        { label: '10 km', value: 10, icon: '🌎', description: 'Extended area' },
    ];

    // Normalize store data
    const normalizedStores = (params?.storeData || [])
        .map(item => 'stores' in item ? item.stores : item)
        .filter(store =>
            store?.id &&
            typeof store.latitude === 'number' &&
            typeof store.longitude === 'number'
        );

    useEffect(() => {
        const getLocation = async () => {
            try {
                setLoading(true);

                // First, check if we have userLocation from params
                if (params?.userLocation) {
                    setUserLocation(params.userLocation);
                    setLoading(false);
                    return;
                }

                // Request location permission
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setAlertTitle('Permission Denied');
                    setAlertMessage('We need location access to show your position on the map.');
                    setAlertVisible(true);
                    setLoading(false);
                    return;
                }

                // Get current location
                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });

                setUserLocation(location.coords);

            } catch (error) {
                console.error('Error getting location:', error);
                setAlertTitle('Location Error');
                setAlertMessage('Could not get your current location. Showing available stores instead.');
                setAlertVisible(true);
            } finally {
                setLoading(false);
            }
        };

        getLocation();
    }, []);

    useEffect(() => {
        // Auto-select store if focusStoreId is provided
        if (params?.focusStoreId && normalizedStores.length > 0) {
            const store = normalizedStores.find(s => s.id === params.focusStoreId);
            if (store) {
                setSelectedStore(store);
                if (userLocation) {
                    const distance = getDistance(
                        userLocation.latitude,
                        userLocation.longitude,
                        store.latitude,
                        store.longitude
                    );
                    setStoreDistance(distance);
                }
            }
        }
    }, [params?.focusStoreId, normalizedStores, userLocation]);

    const adjustedDistance = selectedDistance < 1 ? 10 : selectedDistance;

    // Region calculation - PRIORITIZE USER LOCATION
    const region = userLocation
        ? {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: adjustedDistance / 60,
            longitudeDelta: adjustedDistance / 60,
        }
        : normalizedStores.length > 0
            ? {
                latitude: normalizedStores[0].latitude,
                longitude: normalizedStores[0].longitude,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
            }
            : {
                latitude: 12.6750,
                longitude: 123.8710,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
            };

    const filteredStores = normalizedStores.filter(store => {
        if (!userLocation) return true;
        const distance = getDistance(
            userLocation.latitude,
            userLocation.longitude,
            store.latitude,
            store.longitude
        );
        return distance <= adjustedDistance;
    });

    const handleMarkerPress = (store: Store) => {
        setSelectedStore(store);
        if (userLocation) {
            const distance = getDistance(
                userLocation.latitude,
                userLocation.longitude,
                store.latitude,
                store.longitude
            );
            setStoreDistance(distance);
        }
    };

    const handleMapPress = () => {
        setSelectedStore(null);
    };

    // Show loading until we have a location decision
    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Getting your location...</Text>
                <Text style={styles.loadingSubtext}>This may take a few seconds</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar
                backgroundColor="#FFFFFF"
                barStyle="dark-content"
                translucent={false}
            />
            <StyledAlert
                visible={alertVisible}
                title={alertTitle}
                message={alertMessage}
                onClose={() => setAlertVisible(false)}
            />

            {/* Header with SafeAreaView only for notched devices */}
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <View style={styles.mapHeader}>
                    {/* Left Section: Back Button */}
                    <View style={styles.leftSection}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.backButton}
                        >
                            <Ionicons name="arrow-back" size={24} color="#000" />
                        </TouchableOpacity>
                    </View>

                    {/* Center Section: Distance Picker */}
                    <View style={styles.centerSection}>
                        <TouchableOpacity
                            style={styles.customPickerButton}
                            onPress={() => setPickerVisible(true)}
                            activeOpacity={0.8}
                        >
                            <View style={styles.pickerButtonContent}>
                                <Text style={styles.pickerIcon}>
                                    {distances.find(d => d.value === selectedDistance)?.icon}
                                </Text>
                                <Text style={styles.pickerText}>
                                    {distances.find(d => d.value === selectedDistance)?.label}
                                </Text>
                            </View>
                            <Ionicons name="chevron-down" size={16} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {/* Right Section: Map Type and Store Count */}
                    <View style={styles.rightSection}>
                        <View style={styles.mapTypeContainer}>
                            <TouchableOpacity
                                onPress={() => setMapType('standard')}
                                style={styles.mapTypeButton}
                            >
                                <Ionicons
                                    name="map-outline"
                                    size={18}
                                    color={mapType === 'standard' ? '#007AFF' : '#777'}
                                />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setMapType('satellite')}
                                style={styles.mapTypeButton}
                            >
                                <Ionicons
                                    name="earth-outline"
                                    size={18}
                                    color={mapType === 'satellite' ? '#007AFF' : '#777'}
                                />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setMapType('hybrid')}
                                style={styles.mapTypeButton}
                            >
                                <Ionicons
                                    name="layers-outline"
                                    size={18}
                                    color={mapType === 'hybrid' ? '#007AFF' : '#777'}
                                />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.storeCountContainer}>
                            <Text style={styles.storeCountText}>
                                {filteredStores.length} {filteredStores.length === 1 ? 'store' : 'stores'}
                            </Text>
                        </View>
                    </View>
                </View>
            </SafeAreaView>

            {/* Distance Picker Modal */}
            <Modal
                visible={pickerVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setPickerVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setPickerVisible(false)}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Distance Range</Text>
                            <Text style={styles.modalSubtitle}>Choose your search radius</Text>
                        </View>

                        <View style={styles.optionsContainer}>
                            {distances.map((item, index) => {
                                const isSelected = selectedDistance === item.value;
                                return (
                                    <TouchableOpacity
                                        key={item.value}
                                        style={[
                                            styles.modalItem,
                                            isSelected && styles.modalItemSelected,
                                            index === distances.length - 1 && { marginBottom: 0 }
                                        ]}
                                        onPress={() => {
                                            setSelectedDistance(item.value);
                                            setPickerVisible(false);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.itemLeft}>
                                            <View style={[
                                                styles.iconContainer,
                                                isSelected && styles.iconContainerSelected
                                            ]}>
                                                <Text style={styles.modalItemIcon}>{item.icon}</Text>
                                            </View>
                                            <View style={styles.itemTextContainer}>
                                                <Text style={[
                                                    styles.modalItemText,
                                                    isSelected && styles.modalItemTextSelected
                                                ]}>
                                                    {item.label}
                                                </Text>
                                                <Text style={styles.itemDescription}>{item.description}</Text>
                                            </View>
                                        </View>
                                        {isSelected && (
                                            <Ionicons name="checkmark-circle" size={28} color="#007AFF" />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setPickerVisible(false)}
                        >
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            <TouchableWithoutFeedback onPress={handleMapPress}>
                <MapView
                    style={styles.map}
                    region={region}
                    showsUserLocation={!!userLocation}
                    mapType={mapType}
                    showsMyLocationButton={true}
                    zoomEnabled={true}
                    scrollEnabled={true}
                >
                    {userLocation && (
                        <Circle
                            center={{
                                latitude: userLocation.latitude,
                                longitude: userLocation.longitude,
                            }}
                            radius={adjustedDistance * 1000}
                            strokeWidth={1}
                            strokeColor="rgba(0, 122, 255, 0.5)"
                            fillColor="rgba(0, 122, 255, 0.1)"
                        />
                    )}

                    {filteredStores.map((store) => (
                        <Marker
                            key={store.id}
                            coordinate={{
                                latitude: store.latitude,
                                longitude: store.longitude
                            }}
                            title={store.name}
                            description={store.address}
                            onPress={() => handleMarkerPress(store)}
                        >
                            <Image
                                source={require('../../assets/images/marker.png')}
                                style={styles.customMarker}
                            />
                            <Callout>
                                <View style={styles.calloutContainer}>
                                    <Text style={styles.storeName}>{store.name}</Text>
                                    <Text style={styles.storeAddress}>{store.address}</Text>
                                    {store.email && <Text style={styles.storeEmail}>{store.email}</Text>}
                                    {userLocation && (
                                        <Text style={styles.storeDistance}>
                                            Distance: {getDistance(
                                                userLocation.latitude,
                                                userLocation.longitude,
                                                store.latitude,
                                                store.longitude
                                            ).toFixed(2)} km
                                        </Text>
                                    )}
                                </View>
                            </Callout>
                        </Marker>
                    ))}
                </MapView>
            </TouchableWithoutFeedback>

            {selectedStore && (
                <View style={styles.storeDetailsContainer}>
                    <View style={styles.storeDetailsHeader}>
                        <Ionicons name="storefront-outline" size={24} color="#fff" />
                        <Text style={styles.storeDetailsTitle}>Store Details</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Ionicons name="business-outline" size={20} color="#555" style={styles.detailIcon} />
                        <Text style={styles.detailText}>{selectedStore.name}</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Ionicons name="location-outline" size={20} color="#555" style={styles.detailIcon} />
                        <Text style={styles.detailText}>{selectedStore.address}</Text>
                    </View>

                    {selectedStore.email && (
                        <View style={styles.detailRow}>
                            <Ionicons name="mail-outline" size={20} color="#555" style={styles.detailIcon} />
                            <Text style={styles.detailText}>{selectedStore.email}</Text>
                        </View>
                    )}

                    <View style={styles.detailRow}>
                        <Ionicons name="navigate-outline" size={20} color="#555" style={styles.detailIcon} />
                        <Text style={styles.detailText}>
                            {storeDistance.toFixed(2)} km away
                            {userLocation && (
                                <Text style={styles.distanceSubtext}> from your location</Text>
                            )}
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    safeArea: {
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 20,
    },
    loadingText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginTop: 16,
        marginBottom: 8,
    },
    loadingSubtext: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
    map: {
        flex: 1,
    },
    mapHeader: {
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        minHeight: 56,
    },
    leftSection: {
        flex: 0.8,
        alignItems: 'flex-start',
        
    },
    centerSection: {
        flex: 1.2,
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingLeft: -150,
    },
    rightSection: {
        flex: 1.2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    backButton: {
        padding: 6,
    },
    // Custom Picker Button Styles
    customPickerButton: {
        height: 36,
        minWidth: 90,
        backgroundColor: '#007AFF',
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    pickerButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    pickerIcon: {
        fontSize: 16,
        marginRight: 4,
    },
    pickerText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    // Map Type Container
    mapTypeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: '#f8f8f8',
        borderRadius: 8,
        padding: 2,
        marginRight: 8,
    },
    mapTypeButton: {
        padding: 5,
        borderRadius: 5,
    },
    storeCountContainer: {
        backgroundColor: '#f0f8ff',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#007AFF',
    },
    storeCountText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#007AFF',
        textAlign: 'center',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    modalHeader: {
        marginBottom: 24,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 6,
    },
    modalSubtitle: {
        fontSize: 13,
        color: '#666',
    },
    optionsContainer: {
        marginBottom: 20,
    },
    modalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        borderRadius: 12,
        marginBottom: 10,
        backgroundColor: '#f8f9fa',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    modalItemSelected: {
        backgroundColor: '#e3f2fd',
        borderColor: '#007AFF',
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 2,
        borderColor: '#e0e0e0',
    },
    iconContainerSelected: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    modalItemIcon: {
        fontSize: 22,
    },
    itemTextContainer: {
        flex: 1,
    },
    modalItemText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    modalItemTextSelected: {
        color: '#007AFF',
        fontWeight: 'bold',
    },
    itemDescription: {
        fontSize: 12,
        color: '#888',
    },
    closeButton: {
        backgroundColor: '#f0f0f0',
        padding: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
    },
    calloutContainer: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 10,
        width: 200,
    },
    storeName: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    storeAddress: {
        fontSize: 14,
        color: '#444',
    },
    storeEmail: {
        fontSize: 12,
        color: '#007AFF',
    },
    storeDistance: {
        fontSize: 12,
        color: '#007AFF',
        marginTop: 5,
    },
    customMarker: {
        width: 30,
        height: 40,
        marginBottom: 40,
    },
    storeDetailsContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        margin: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
    },
    storeDetailsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#007AFF',
        padding: 10,
        borderRadius: 8,
        marginBottom: 15,
        marginLeft: -5,
        marginRight: -5,
        marginTop: -5,
    },
    storeDetailsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginLeft: 10,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    detailIcon: {
        marginRight: 12,
        width: 24,
        textAlign: 'center',
    },
    detailText: {
        fontSize: 16,
        color: '#333',
        flex: 1,
    },
    distanceSubtext: {
        fontSize: 14,
        color: '#777',
    },
});

export default MapScreen;