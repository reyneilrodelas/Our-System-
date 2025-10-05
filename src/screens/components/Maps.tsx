import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableWithoutFeedback,
    Image,
    TouchableOpacity,
    ActivityIndicator
} from 'react-native';
import { StyledAlert } from './StyledAlert';
import { Picker } from '@react-native-picker/picker';
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

    const [userLocation, setUserLocation] = useState(params?.userLocation || null);
    const [selectedDistance, setSelectedDistance] = useState(1);
    const [selectedStore, setSelectedStore] = useState<Store | null>(null);
    const [storeDistance, setStoreDistance] = useState(0);
    const [mapType, setMapType] = useState<'standard' | 'satellite' | 'hybrid'>('standard');
    const [loading, setLoading] = useState(!params?.userLocation);
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertTitle, setAlertTitle] = useState('');
    const [alertMessage, setAlertMessage] = useState('');

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
            if (params?.userLocation) return;

            try {
                setLoading(true);
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setAlertTitle('Permission Denied');
                    setAlertMessage('We need location access to show your position on the map.');
                    setAlertVisible(true);
                    return;
                }

                const location = await Location.getCurrentPositionAsync({});
                setUserLocation(location.coords);
            } catch (error) {
                console.error('Error getting location:', error);
                setAlertTitle('Error');
                setAlertMessage('Could not get your current location');
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

    const region = userLocation
        ? {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: adjustedDistance / 80,
            longitudeDelta: adjustedDistance / 80,
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

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text>Getting your location...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StyledAlert
                visible={alertVisible}
                title={alertTitle}
                message={alertMessage}
                onClose={() => setAlertVisible(false)}
            />
            <View style={styles.mapHeader}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>

                <Picker
                    selectedValue={selectedDistance}
                    style={styles.picker}
                    onValueChange={(itemValue) => setSelectedDistance(itemValue)}
                >
                    <Picker.Item label="1 km" value={1} />
                    <Picker.Item label="3 km" value={3} />
                    <Picker.Item label="5 km" value={5} />
                    <Picker.Item label="10 km" value={10} />
                </Picker>

                <View style={styles.mapTypeContainer}>
                    <TouchableOpacity onPress={() => setMapType('standard')}>
                        <Ionicons
                            name="map-outline"
                            size={24}
                            color={mapType === 'standard' ? '#007AFF' : '#777'}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setMapType('satellite')}>
                        <Ionicons
                            name="earth-outline"
                            size={24}
                            color={mapType === 'satellite' ? '#007AFF' : '#777'}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setMapType('hybrid')}>
                        <Ionicons
                            name="layers-outline"
                            size={24}
                            color={mapType === 'hybrid' ? '#007AFF' : '#777'}
                        />
                    </TouchableOpacity>
                </View>

                <Text style={styles.storeCountText}>
                    {filteredStores.length} {filteredStores.length === 1 ? 'store' : 'stores'}
                </Text>
            </View>

            <TouchableWithoutFeedback onPress={handleMapPress}>
                <MapView
                    style={styles.map}
                    region={region}
                    showsUserLocation={!!userLocation}
                    mapType={mapType}
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
        paddingTop: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    map: {
        flex: 1,
    },
    mapHeader: {
        backgroundColor: '#fff',
        marginTop: 15,
        padding: 5,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 5,
        marginLeft: 10,
    },
    picker: {
        height: 50,
        width: '30%',
        backgroundColor: '#877f7f',
        color: '#FFFFFF',
        paddingHorizontal: 10,
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 10,
        marginRight: 10,
    },
    mapTypeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: 120,
        marginRight: 10,
    },
    storeCountText: {
        fontSize: 16,
        fontWeight: 'bold',
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
    storeDetails: {
        backgroundColor: '#e3e1efec',
        padding: 20,
        marginTop: 10,
        borderRadius: 10,
        margin: 10,
    },
    storeDetailTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    storeDetailText: {
        fontSize: 18,
        marginBottom: 5,
        fontWeight: 'bold',
    },
    customMarker: {
            // Adjust these values based on your marker image
            width: 30,        // Width of your marker image
            height: 40,       // Height of your marker image
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