import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
    Platform,
    ScrollView,
    RefreshControl,
    Keyboard,
    StatusBar,
    Animated,
    Image,
    FlatList,
} from 'react-native';
import { StyledAlert } from '../components/StyledAlert';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { createClient } from '@supabase/supabase-js';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');
import { supabase } from '../../lib/supabase';

type RootStackParamList = {
    ResultScreen: { productData: any; storesData: any[]; loadingStores: boolean };
};

interface Product {
    id: string;
    name: string;
    barcode: string;
    description?: string;
    image?: string;
    brand?: string;
    category?: string;
}

export default function SearchScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const [storesCache, setStoresCache] = useState<Record<string, any[]>>({});
    const [refreshing, setRefreshing] = useState(false);
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertTitle, setAlertTitle] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [searchHistory, setSearchHistory] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState<Product[]>([]);
    const [recentSearches, setRecentSearches] = useState<Product[]>([]);
    const [searchMode, setSearchMode] = useState<'idle' | 'searching' | 'results'>('idle');

    // Animation refs
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const headerHeightAnim = useRef(new Animated.Value(0)).current;
    const searchSectionHeightAnim = useRef(new Animated.Value(0)).current;
    const searchInputRef = useRef<TextInput>(null);

    // Debounce timer ref
    const suggestionTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Animation on mount
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: false,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 50,
                friction: 8,
                useNativeDriver: false,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 50,
                friction: 8,
                useNativeDriver: false,
            }),
        ]).start();
    }, []);

    // Load recent searches
    useEffect(() => {
        loadRecentSearches();
    }, []);

    // Search suggestions with debouncing
    useEffect(() => {
        // Clear previous timer
        if (suggestionTimerRef.current) {
            clearTimeout(suggestionTimerRef.current);
        }

        if (searchQuery.length > 2) {
            // Debounce the suggestion fetch
            suggestionTimerRef.current = setTimeout(() => {
                fetchSuggestions();
            }, 300);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }

        // Cleanup
        return () => {
            if (suggestionTimerRef.current) {
                clearTimeout(suggestionTimerRef.current);
            }
        };
    }, [searchQuery]);

    // Animate header when showing results
    useEffect(() => {
        if (searchMode === 'results') {
            Animated.parallel([
                Animated.spring(headerHeightAnim, {
                    toValue: 1,
                    tension: 80,
                    friction: 10,
                    useNativeDriver: false,
                }),
                Animated.spring(searchSectionHeightAnim, {
                    toValue: 1,
                    tension: 80,
                    friction: 10,
                    useNativeDriver: false,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.spring(headerHeightAnim, {
                    toValue: 0,
                    tension: 80,
                    friction: 10,
                    useNativeDriver: false,
                }),
                Animated.spring(searchSectionHeightAnim, {
                    toValue: 0,
                    tension: 80,
                    friction: 10,
                    useNativeDriver: false,
                }),
            ]).start();
        }
    }, [searchMode]);

    const loadRecentSearches = async () => {
        try {
            const { data: recent, error } = await supabase
                .from('products')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5);

            if (!error && recent) {
                setRecentSearches(recent);
            }
        } catch (error) {
            console.error('Failed to load recent searches:', error);
        }
    };

    const fetchSuggestions = async () => {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .or(`name.ilike.%${searchQuery}%,brand.ilike.%${searchQuery}%`)
                .limit(5);

            if (!error && data) {
                setSuggestions(data);
                setShowSuggestions(data.length > 0);
            }
        } catch (error) {
            console.error('Failed to fetch suggestions:', error);
        }
    };

    const searchProduct = useCallback(async (query?: string) => {
        const trimmedQuery = (query || searchQuery).trim();

        if (!trimmedQuery) {
            setAlertTitle('Input Required');
            setAlertMessage('Please enter a product name or barcode to search');
            setAlertVisible(true);
            return;
        }

        setIsLoading(true);
        setSearchMode('searching');
        setSearchResults([]);
        setSelectedProduct(null);
        setShowSuggestions(false);
        Keyboard.dismiss();

        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .or(`name.ilike.%${trimmedQuery}%,barcode.eq.${trimmedQuery}`)
                .limit(20);

            if (error || !data || data.length === 0) {
                setAlertTitle('No Results');
                setAlertMessage('No products found. Please try a different search term.');
                setAlertVisible(true);
                setSearchMode('idle');
                return;
            }

            if (data) {
                setSearchResults(data);
                setSearchMode('results');
                // Add to search history
                setSearchHistory(prev => [trimmedQuery, ...prev.filter(h => h !== trimmedQuery)].slice(0, 5));
            }
        } catch (error) {
            console.error('Search error:', error);
            setAlertTitle('Error');
            setAlertMessage('An error occurred while searching. Please try again.');
            setAlertVisible(true);
            setSearchMode('idle');
        } finally {
            setIsLoading(false);
        }
    }, [searchQuery]);

    const navigateToResultScreen = useCallback(async (product: Product) => {
        if (product && !isNavigating) {
            setIsNavigating(true);
            setSelectedProduct(product);

            try {
                const minimalProductData = {
                    id: product.id,
                    name: product.name,
                    barcode: product.barcode,
                    description: product.description,
                    image: product.image,
                    brand: product.brand
                };

                // Check if we have cached stores
                const cachedStores = storesCache[product.id];

                // Navigate immediately with cached data or empty array
                navigation.navigate('ResultScreen', {
                    productData: minimalProductData,
                    storesData: cachedStores || [],
                    loadingStores: !cachedStores
                });

                // If no cached data, fetch fresh data in the background
                if (!cachedStores) {
                    const { data: stores } = await supabase
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
                        .eq('product_barcode', product.barcode)
                        .eq('stores.status', 'approved')
                        .limit(20);

                    // Cache the result for future use
                    setStoresCache(prev => ({
                        ...prev,
                        [product.id]: stores || []
                    }));
                }
            } catch (error) {
                console.error('Navigation error:', error);
                setAlertTitle('Loading Error');
                setAlertMessage('Failed to load store information. Please try again.');
                setAlertVisible(true);
            } finally {
                setIsNavigating(false);
            }
        }
    }, [isNavigating, storesCache, navigation]);

    const refreshData = useCallback(async () => {
        setRefreshing(true);
        setSearchResults([]);
        setSelectedProduct(null);
        setSearchQuery('');
        setSearchMode('idle');
        setShowSuggestions(false);
        await loadRecentSearches();
        setRefreshing(false);
    }, []);

    const selectSuggestion = useCallback((product: Product) => {
        setSearchQuery(product.name);
        setShowSuggestions(false);
        searchProduct(product.name);
    }, [searchProduct]);

    const clearSearch = useCallback(() => {
        setSearchQuery('');
        setSearchResults([]);
        setSelectedProduct(null);
        setSearchMode('idle');
        setShowSuggestions(false);
        searchInputRef.current?.focus();
    }, []);

    const handleSearchQueryChange = useCallback((text: string) => {
        setSearchQuery(text);
    }, []);

    const handleSubmitEditing = useCallback(() => {
        searchProduct();
    }, [searchProduct]);

    const handleFocus = useCallback(() => {
        if (suggestions.length > 0) {
            setShowSuggestions(true);
        }
    }, [suggestions.length]);

    const renderProductItem = useCallback(({ item, index }: { item: Product; index: number }) => (
        <Animatable.View
            animation="fadeInUp"
            duration={400}
            delay={index * 100}
            style={styles.productItem}
        >
            <TouchableOpacity
                style={styles.productItemContent}
                onPress={() => navigateToResultScreen(item)}
                disabled={isNavigating}
                activeOpacity={0.7}
            >
                <View style={styles.productImageContainer}>
                    {item.image ? (
                        <Image
                            source={{ uri: item.image }}
                            style={styles.productItemImage}
                            resizeMode="contain"
                        />
                    ) : (
                        <View style={styles.productItemPlaceholder}>
                            <MaterialIcons name="inventory" size={24} color="#9CA3AF" />
                        </View>
                    )}
                </View>

                <View style={styles.productItemInfo}>
                    <Text style={styles.productItemName} numberOfLines={2}>
                        {item.name}
                    </Text>

                    {item.brand && (
                        <View style={styles.productItemBrandContainer}>
                            <MaterialIcons name="business" size={12} color="#6366F1" />
                            <Text style={styles.productItemBrand}>{item.brand}</Text>
                        </View>
                    )}

                    {item.description && (
                        <Text style={styles.productItemDescription} numberOfLines={2}>
                            {item.description}
                        </Text>
                    )}
                   
                    <View style={styles.productItemBarcodeContainer}>
                        <MaterialIcons name="qr-code" size={12} color="#6B7280" />
                        <Text style={styles.productItemBarcode}>{item.barcode}</Text>
                    </View>

                   
                </View>

                <View style={styles.productItemArrow}>
                    <MaterialIcons name="chevron-right" size={20} color="#D1D5DB" />
                </View>
            </TouchableOpacity>
        </Animatable.View>
    ), [navigateToResultScreen, isNavigating]);

    const renderEmptyState = useCallback(() => (
        <Animatable.View
            animation="fadeIn"
            duration={600}
            style={styles.emptyState}
        >
            <View style={styles.emptyStateIcon}>
                <MaterialIcons name="search-off" size={48} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyStateTitle}>No Products Found</Text>
            <Text style={styles.emptyStateMessage}>
                Try searching with different keywords or check the spelling
            </Text>
        </Animatable.View>
    ), []);

    const ListHeaderComponent = useMemo(() => (
        <>
            {/* Search Input */}
            <View style={styles.searchInputContainer}>
                <View style={styles.searchWrapper}>
                    <MaterialIcons name="search" size={24} color="#9CA3AF" style={styles.searchIcon} />
                    <TextInput
                        ref={searchInputRef}
                        style={styles.searchInput}
                        placeholder="Search by product name, brand, or barcode"
                        placeholderTextColor="#9CA3AF"
                        value={searchQuery}
                        onChangeText={handleSearchQueryChange}
                        onSubmitEditing={handleSubmitEditing}
                        onFocus={handleFocus}
                        autoCorrect={false}
                        autoCapitalize="none"
                        returnKeyType="search"
                        blurOnSubmit={false}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                            <MaterialIcons name="clear" size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Search Button */}
                <TouchableOpacity
                    style={[
                        styles.searchButton,
                        (isLoading || !searchQuery.trim()) && styles.disabledButton
                    ]}
                    onPress={handleSubmitEditing}
                    disabled={isLoading || !searchQuery.trim()}
                    activeOpacity={0.8}
                >
                    {isLoading ? (
                        <ActivityIndicator color="white" size="small" />
                    ) : (
                        <View style={styles.searchButtonContent}>
                            <MaterialIcons name="search" size={20} color="white" />
                            <Text style={styles.searchButtonText}>Search</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* Search Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
                <Animatable.View
                    animation="fadeInUp"
                    duration={300}
                    style={styles.suggestionsContainer}
                >
                    <Text style={styles.suggestionsTitle}>Suggestions</Text>
                    {suggestions.map((product) => (
                        <TouchableOpacity
                            key={product.id}
                            style={styles.suggestionItem}
                            onPress={() => selectSuggestion(product)}
                            activeOpacity={0.7}
                        >
                            <MaterialIcons name="history" size={16} color="#6B7280" />
                            <Text style={styles.suggestionText} numberOfLines={1}>
                                {product.name}
                            </Text>
                            {product.brand && (
                                <Text style={styles.suggestionBrand}>• {product.brand}</Text>
                            )}
                        </TouchableOpacity>
                    ))}
                </Animatable.View>
            )}

            {/* Recent Searches - Show only when not in search mode */}
            {searchMode === 'idle' && recentSearches.length > 0 && (
                <Animatable.View
                    animation="fadeIn"
                    duration={500}
                    style={styles.recentContainer}
                >
                    <Text style={styles.recentTitle}>Recently Searched</Text>
                    <View style={styles.recentGrid}>
                        {recentSearches.map((product) => (
                            <TouchableOpacity
                                key={product.id}
                                style={styles.recentItem}
                                onPress={() => selectSuggestion(product)}
                                activeOpacity={0.7}
                            >
                                <MaterialIcons name="history" size={16} color="#6366F1" />
                                <Text style={styles.recentText} numberOfLines={1}>
                                    {product.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </Animatable.View>
            )}

            {/* Loading State */}
            {isLoading && (
                <Animatable.View
                    animation="fadeIn"
                    duration={300}
                    style={styles.loadingContainer}
                >
                    <ActivityIndicator size="large" color="#6366F1" />
                    <Text style={styles.loadingText}>Searching products...</Text>
                </Animatable.View>
            )}

            {/* Results Header */}
            {searchMode === 'results' && (
                <View style={styles.resultsHeader}>
                    <Text style={styles.resultsTitle}>
                        Found {searchResults.length} product{searchResults.length !== 1 ? 's' : ''}
                    </Text>
                    <TouchableOpacity onPress={clearSearch} style={styles.clearResultsButton}>
                        <Text style={styles.clearResultsText}>Clear</Text>
                    </TouchableOpacity>
                </View>
            )}
        </>
    ), [
        searchQuery,
        isLoading,
        showSuggestions,
        suggestions,
        searchMode,
        recentSearches,
        searchResults.length,
        handleSearchQueryChange,
        handleSubmitEditing,
        handleFocus,
        clearSearch,
        selectSuggestion
    ]);

    const keyExtractor = useCallback((item: Product) => item.id, []);

    return (
        <>
            <StatusBar barStyle="light-content" backgroundColor="#667eea" />
            <LinearGradient
                colors={['#667eea', '#764ba2', '#667eea']}
                style={styles.container}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                {/* Enhanced Header */}
                <Animated.View
                    style={[
                        styles.header,
                        {
                            height: headerHeightAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [height * 0.35, height * 0.12],
                            }),
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }],
                        }
                    ]}
                >
                    <Animated.View
                        style={[
                            styles.headerContent,
                            {
                                opacity: headerHeightAnim.interpolate({
                                    inputRange: [0, 0.3, 1],
                                    outputRange: [1, 0.8, 0],
                                }),
                                transform: [{
                                    scale: headerHeightAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [1, 0.5],
                                    })
                                }]
                            }
                        ]}
                    >
                        <Animated.View
                            style={[
                                styles.iconContainer,
                                {
                                    transform: [{ scale: scaleAnim }]
                                }
                            ]}
                        >
                            <MaterialIcons name="search" size={48} color="rgba(255,255,255,0.9)" />
                        </Animated.View>
                        <Text style={styles.title}>Product Finder</Text>
                        <Text style={styles.subtitle}>
                            Discover products and find the best deals near you
                        </Text>
                    </Animated.View>
                </Animated.View>

                {/* Enhanced Search Section */}
                <Animated.View
                    style={[
                        styles.searchSection,
                        {
                            height: searchSectionHeightAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [height * 0.65, height * 0.88],
                            }),
                            opacity: fadeAnim,
                            transform: [{ scale: scaleAnim }],
                        }
                    ]}
                >
                    <BlurView intensity={20} tint="light" style={styles.searchBlur}>
                        <FlatList
                            data={searchMode === 'results' ? searchResults : []}
                            renderItem={renderProductItem}
                            keyExtractor={keyExtractor}
                            ListHeaderComponent={ListHeaderComponent}
                            ListEmptyComponent={searchMode === 'results' ? renderEmptyState : null}
                            contentContainerStyle={styles.flatListContent}
                            showsVerticalScrollIndicator={false}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={refreshData}
                                    tintColor="#667eea"
                                />
                            }
                            keyboardShouldPersistTaps="handled"
                            removeClippedSubviews={false}
                        />
                    </BlurView>
                </Animated.View>
            </LinearGradient>

            <StyledAlert
                visible={alertVisible}
                title={alertTitle}
                message={alertMessage}
                onClose={() => setAlertVisible(false)}
                showCancel={false}
            />
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
    },
    headerContent: {
        alignItems: 'center',
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    title: {
        color: 'white',
        fontSize: 32,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    subtitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 20,
    },
    searchSection: {
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        overflow: 'hidden',
    },
    searchBlur: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
    },
    flatListContent: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingVertical: 30,
    },
    searchInputContainer: {
        marginBottom: 24,
    },
    searchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#1F2937',
        fontWeight: '500',
    },
    clearButton: {
        padding: 4,
    },
    searchButton: {
        borderRadius: 16,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#6366F1',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            },
            android: {
                elevation: 6,
            },
        }),
    },
    searchButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#6366F1',
        paddingVertical: 16,
        paddingHorizontal: 24,
    },
    searchButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 8,
    },
    disabledButton: {
        opacity: 0.6,
    },
    suggestionsContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginBottom: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    suggestionsTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    suggestionText: {
        flex: 1,
        fontSize: 15,
        color: '#1F2937',
        marginLeft: 10,
        fontWeight: '500',
    },
    suggestionBrand: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500',
    },
    recentContainer: {
        marginBottom: 24,
    },
    recentTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 16,
    },
    recentGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -6,
    },
    recentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F4FF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        margin: 6,
        maxWidth: width * 0.4,
    },
    recentText: {
        fontSize: 13,
        color: '#4338CA',
        marginLeft: 6,
        fontWeight: '600',
        flex: 1,
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6B7280',
        fontWeight: '500',
    },
    resultsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        marginTop: 8,
    },
    resultsTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    clearResultsButton: {
        padding: 8,
    },
    clearResultsText: {
        color: '#6366F1',
        fontWeight: '600',
        fontSize: 14,
    },
    productItem: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    productItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    productImageContainer: {
        width: 60,
        height: 60,
        borderRadius: 8,
        backgroundColor: '#F9FAFB',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    productItemImage: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
    },
    productItemPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    productItemInfo: {
        flex: 1,
    },
    productItemName: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1F2937',
        marginBottom: 4,
        lineHeight: 20,
    },
    productItemBrandContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    productItemBrand: {
        fontSize: 12,
        color: '#6366F1',
        fontWeight: '500',
        marginLeft: 4,
    },
    productItemBarcodeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    productItemBarcode: {
        fontSize: 11,
        color: '#6B7280',
        fontWeight: '500',
        marginLeft: 4,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    productItemDescription: {
        fontSize: 13,
        fontWeight: '500',
        color: '#0c420aff',
        lineHeight: 16,
    },
    productItemArrow: {
        marginLeft: 8,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    emptyStateIcon: {
        marginBottom: 16,
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyStateMessage: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
        lineHeight: 20,
    },
});