import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Image,
    ActivityIndicator,
    RefreshControl,
    Dimensions,
    StatusBar,
    Animated,
} from 'react-native';
import { StyledAlert } from './StyledAlert';
import { createClient } from '@supabase/supabase-js';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import type { HomeStackParamList } from '../../types/navigation';

import { supabase } from '../../lib/supabase';

const { width, height } = Dimensions.get('window');

interface Store {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    status: string;
}

interface StoreProduct {
    product_barcode: string;
    price: number | null;
    stock: number | null;
    availability: boolean;
    stores: Store[];
    distance?: number; // Add distance property
}

interface ProductData {
    barcode: string;
    name: string;
    image?: string;
    description?: string;
}

export default function ResultScreen({ route }: any) {
    const navigation = useNavigation<NavigationProp<HomeStackParamList>>();
    const { productData }: { productData: ProductData } = route.params;
    const [storeData, setStoreData] = useState<StoreProduct[]>([]);
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertTitle, setAlertTitle] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [fadeAnim] = useState(new Animated.Value(0));

    const getLocation = useCallback(async () => {
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setAlertTitle('Permission denied');
                setAlertMessage('We need location permission to show nearby stores.');
                setAlertVisible(true);
                return;
            }

            const location = await Location.getCurrentPositionAsync({});
            setUserLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });
        } catch (error) {
            console.error("Location Error: ", error);
            setAlertTitle('Error');
            setAlertMessage('Failed to get your location.');
            setAlertVisible(true);
        }
    }, []);

    useEffect(() => {
        fetchData();
        // Animate on mount
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();
    }, [productData]);

    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // Earth radius in km
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) *
            Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in km
    };

    const fetchData = async () => {
        try {
            setRefreshing(true);
            setLoading(true);

            // Fetch location first to ensure we have it for sorting
            let currentLocation = userLocation;
            if (!currentLocation) {
                await getLocation();
                // Get the updated location from state after getLocation completes
                const location = await Location.getCurrentPositionAsync({});
                currentLocation = {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                };
                setUserLocation(currentLocation);
            }

            // Fetch stores with the product
            const { data, error } = await supabase
                .from('store_products')
                .select(`
                    product_barcode,
                    price,
                    stock,
                    availability,
                    stores:store_id (
                        id,
                        name,
                        address,
                        latitude,
                        longitude,
                        status
                    )
                `)
                .eq('product_barcode', productData.barcode.trim())
                .eq('stores.status', 'approved')
                .not('store_id', 'is', null)
                .not('stores.id', 'is', null);

            if (error) throw error;

            const validatedData = (data || [])
                .map(item => {
                    const stores = Array.isArray(item.stores) ? item.stores : [item.stores];
                    const validStores = stores.filter(store =>
                        store?.id &&
                        store.latitude &&
                        store.longitude &&
                        store.status === 'approved'
                    );

                    // Calculate distance for sorting
                    let distance = Infinity;
                    if (currentLocation && validStores.length > 0 && validStores[0]) {
                        distance = getDistance(
                            currentLocation.latitude,
                            currentLocation.longitude,
                            validStores[0].latitude,
                            validStores[0].longitude
                        );
                    }

                    return {
                        product_barcode: item.product_barcode,
                        price: item.price,
                        stock: item.stock,
                        availability: item.availability !== undefined ? item.availability : (item.stock !== null && item.stock > 0),
                        stores: validStores,
                        distance: distance
                    };
                })
                .filter(item => item.stores.length > 0);

            // Sort by distance (nearest first)
            const sortedData = validatedData.sort((a, b) => {
                return (a.distance || Infinity) - (b.distance || Infinity);
            });

            setStoreData(sortedData);

        } catch (error) {
            console.error('Error fetching data:', error);
            setAlertTitle('Error');
            setAlertMessage('Failed to load store data. Please try again.');
            setAlertVisible(true);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleNavigateToMap = () => {
        if (storeData.length > 0 && userLocation) {
            const validStores = storeData.flatMap(item =>
                item.stores.filter(store => store?.id)
            );
            navigation.navigate('MapScreen', {
                storeData: validStores,
                userLocation
            });
        }
    };

    const handleBackButtonPress = () => {
        navigation.goBack();
    };

    const handleRefresh = () => {
        fetchData();
    };

    const renderStoreItem = ({ item, index }: { item: StoreProduct; index: number }) => {
        // Skip rendering if no valid stores
        if (!item.stores || item.stores.length === 0 || !item.stores[0]?.id) {
            return null;
        }

        const store = item.stores[0];
        const storeName = store.name || 'Unknown Store';
        const price = item.price ? `₱${item.price.toFixed(2)}` : 'Price not available' ;
        const address = store.address || 'Address not available';
        const isAvailable = item.availability;

        let distance = 'Distance not available';
        if (userLocation && store.latitude && store.longitude) {
            const dist = getDistance(
                userLocation.latitude,
                userLocation.longitude,
                store.latitude,
                store.longitude
            );
            distance = dist < 1 ?
                `${(dist * 1000).toFixed(0)}m away` :
                `${dist.toFixed(1)}km away`;
        }

        return (
            <TouchableOpacity
                style={[
                    styles.storeItem,
                    isAvailable ? styles.availableItem : styles.unavailableItem
                ]}
                activeOpacity={0.7}
                onPress={() => {
                    console.log('Navigating to store details with ID:', store.id);
                    navigation.navigate('StoreProductDetailsScreen', { storeId: store.id });
                }}
            >
                <View style={[
                    styles.storeIconContainer,
                    isAvailable ? styles.availableIcon : styles.unavailableIcon
                ]}>
                    <MaterialIcons
                        name={isAvailable ? "store" : "store-mall-directory"}
                        size={24}
                        color="#FFF"
                    />
                </View>

                <View style={styles.storeInfo}>
                    <View style={styles.storeHeader}>
                        <Text style={styles.storeName} numberOfLines={1}>{storeName}</Text>
                        <View style={[
                            styles.statusDot,
                            isAvailable ? styles.availableDot : styles.unavailableDot
                        ]} />
                    </View>

                    <View style={styles.addressRow}>
                        <MaterialIcons name="location-on" size={14} color="#9CA3AF" />
                        <Text style={styles.storeAddress} numberOfLines={1}>{address}</Text>
                    </View>

                    <View style={styles.detailsRow}>
                        <View style={styles.distanceContainer}>
                            <MaterialIcons name="directions-walk" size={14} color="#6366F1" />
                            <Text style={styles.distanceText}>{distance}</Text>
                        </View>
                        <Text
                            style={[
                                styles.priceText,
                                !item.price && { color: '#EF4444' } // red if price is missing
                            ]}
                        >
                            {item.price ? `₱${item.price.toFixed(2)}` : 'Price not available'}
                        </Text>
                    </View>

                    <View style={[
                        styles.availabilityBadge,
                        isAvailable ? styles.availableBadge : styles.unavailableBadge
                    ]}>
                        <MaterialIcons
                            name={isAvailable ? "check-circle" : "cancel"}
                            size={12}
                            color={isAvailable ? "#10B981" : "#EF4444"}
                        />
                        <Text style={[
                            styles.availabilityText,
                            isAvailable ? styles.availableText : styles.unavailableText
                        ]}>
                            {isAvailable ? 'In Stock' : 'Out of Stock'}
                        </Text>
                    </View>
                </View>

                <MaterialIcons name="keyboard-arrow-right" size={20} color="#D1D5DB" />
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <StatusBar barStyle="light-content" backgroundColor="#667eea" />
                <View style={styles.loadingContent}>
                    <ActivityIndicator size="large" color="#667eea" />
                    <Text style={styles.loadingText}>Finding stores near you...</Text>
                    <Text style={styles.loadingSubtext}>Please wait while we search</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#667eea" />
            <StyledAlert
                visible={alertVisible}
                title={alertTitle}
                message={alertMessage}
                onClose={() => setAlertVisible(false)}
            />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBackButtonPress} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Product Availability</Text>
                    <Text style={styles.headerSubtitle}>Find nearby stores</Text>
                </View>
            </View>

            {/* Product Card */}
            <Animated.View style={[styles.productCard, { opacity: fadeAnim }]}>
                <View style={styles.productContent}>
                    <View style={styles.productInfo}>
                        <Text style={styles.productName} numberOfLines={2}>
                            {productData.name || 'Product'}
                        </Text>

                        {productData.description && (
                            <Text style={styles.productDescription} numberOfLines={2}>
                                {productData.description}
                            </Text>
                        )}

                        <View style={styles.barcodeRow}>
                            <MaterialIcons name="qr-code" size={13} color="#6366F1" />
                            <Text style={styles.productBarcode}>{productData.barcode}</Text>
                        </View>
                    </View>
                </View>
            </Animated.View>

            {/* Results */}
            <View style={styles.resultsSection}>
                <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleRow}>
                        <View style={styles.sectionIcon}>
                            <MaterialIcons name="storefront" size={20} color="#6366F1" />
                        </View>
                        <Text style={styles.sectionTitle}>
                            {storeData.length} {storeData.length === 1 ? 'Store' : 'Stores'} Found
                        </Text>
                    </View>
                    <Text style={styles.sectionSubtitle}>Sorted by distance</Text>
                </View>

                <FlatList
                    data={storeData}
                    renderItem={renderStoreItem}
                    keyExtractor={(item, index) => `${item.stores[0]?.id || index}`}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            colors={['#6366F1']}
                            tintColor={'#6366F1'}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIcon}>
                                <MaterialIcons name="store-mall-directory" size={48} color="#D1D5DB" />
                            </View>
                            <Text style={styles.emptyTitle}>No stores found</Text>
                            <Text style={styles.emptyMessage}>
                                This product may not be available in nearby stores
                            </Text>
                            <TouchableOpacity onPress={handleRefresh} style={styles.retryButton}>
                                <MaterialIcons name="refresh" size={18} color="#FFF" />
                                <Text style={styles.retryText}>Try Again</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />

                {storeData.length > 0 && (
                    <View style={styles.mapButtonWrapper}>
                        <TouchableOpacity
                            onPress={handleNavigateToMap}
                            style={styles.mapButton}
                            activeOpacity={0.8}
                        >
                            <MaterialIcons name="map" size={22} color="#FFF" />
                            <Text style={styles.mapButtonText}>View on Map</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        backgroundColor: '#667eea',
        paddingTop: 50,
        paddingBottom: 30,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 25,
        fontWeight: '700',
        color: '#FFF',
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 2,
    },
    refreshButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
    },
    loadingContent: {
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 40,
        borderRadius: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    loadingText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginTop: 16,
        marginBottom: 4,
    },
    loadingSubtext: {
        fontSize: 14,
        color: '#6B7280',
    },
    productCard: {
        backgroundColor: '#FFF',
        marginHorizontal: 20,
        marginTop: -20,
        borderRadius: 16,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    productContent: {
        flexDirection: 'row',
        padding: 20,
    },
    imageContainer: {
        width: 80,
        height: 80,
        borderRadius: 12,
        backgroundColor: '#F9FAFB',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    productImage: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
    },
    placeholderImage: {
        borderStyle: 'dashed',
        borderColor: '#D1D5DB',
    },
    productInfo: {
        flex: 1,
    },
    productName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 8,
    },
    barcodeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    productBarcode: {
        fontSize: 12,
        color: '#4B5563',
        marginLeft: 4,
        paddingTop: 2,
        fontFamily: 'monospace',
    },
    productDescription: {
        fontSize: 14,
        fontWeight: '500',
        color: '#02270dff',
        lineHeight: 18,
    },
    resultsSection: {
        flex: 1,
        paddingTop: 24,
        paddingHorizontal: 20,
    },
    sectionHeader: {
        marginBottom: 16,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    sectionIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginLeft: 44,
    },
    listContainer: {
        paddingBottom: 100,
    },
    storeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 16,
        marginBottom: 12,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        borderWidth: 1,
    },
    availableItem: {
        borderColor: '#D1FAE5',
        backgroundColor: '#FEFFFE',
    },
    unavailableItem: {
        borderColor: '#FEE2E2',
        backgroundColor: '#FFFBFB',
    },
    storeIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    availableIcon: {
        backgroundColor: '#10B981',
    },
    unavailableIcon: {
        backgroundColor: '#EF4444',
    },
    storeInfo: {
        flex: 1,
    },
    storeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    storeName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        flex: 1,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginLeft: 8,
    },
    availableDot: {
        backgroundColor: '#10B981',
    },
    unavailableDot: {
        backgroundColor: '#EF4444',
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    storeAddress: {
        fontSize: 13,
        color: '#6B7280',
        marginLeft: 4,
        flex: 1,
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    distanceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    distanceText: {
        fontSize: 12,
        color: '#4338CA',
        marginLeft: 3,
        fontWeight: '600',
    },
    priceText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#059669',
    },
    availabilityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    availableBadge: {
        backgroundColor: '#D1FAE5',
    },
    unavailableBadge: {
        backgroundColor: '#FEE2E2',
    },
    availabilityText: {
        fontSize: 11,
        fontWeight: '600',
        marginLeft: 3,
    },
    availableText: {
        color: '#065F46',
    },
    unavailableText: {
        color: '#991B1B',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
        backgroundColor: '#FFF',
        marginHorizontal: 20,
        borderRadius: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F9FAFB',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        borderStyle: 'dashed',
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    emptyMessage: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 24,
        paddingHorizontal: 40,
        lineHeight: 20,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#6366F1',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 24,
    },
    retryText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 6,
    },
    mapButtonWrapper: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
    },
    mapButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#6366F1',
        paddingVertical: 16,
        borderRadius: 12,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    mapButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 8,
    },
});