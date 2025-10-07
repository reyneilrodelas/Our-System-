import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    TextInput,
    RefreshControl
} from 'react-native';
import { StyledAlert } from '../../screens/components/StyledAlert';
import { Checkbox } from 'react-native-paper';
import { createClient } from '@supabase/supabase-js';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { supabase } from '../../lib/supabase';

export default function AssignProductScreen() {
    const { storeId } = useRoute().params as { storeId: string };
    const navigation = useNavigation();
    const [productList, setProductList] = useState<{
        barcode: string;
        name: string;
        description: string;
        category: string;
        isAssigned: boolean;
    }[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<{
        barcode: string;
        name: string;
        description: string;
        category: string;
        isAssigned: boolean;
    }[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertTitle, setAlertTitle] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [alertCallback, setAlertCallback] = useState<(() => void) | undefined>();

    // Filter products based on search query
    useEffect(() => {
        let filtered = productList;

        // Filter by search query
        if (searchQuery) {
            filtered = filtered.filter(product =>
                product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                product.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()))
            );
        }

        setFilteredProducts(filtered);
    }, [searchQuery, productList]);

    // Fetch available products and check assignment status
    const fetchProducts = async () => {
        setLoading(true);
        try {
            // Fetch all products
            const { data: products, error: productsError } = await supabase
                .from('products')
                .select('barcode, name, description, category')
                .order('name', { ascending: true });

            if (productsError) throw productsError;

            // Fetch already assigned products for this store
            const { data: assignedProducts, error: assignedError } = await supabase
                .from('store_products')
                .select('product_barcode')
                .eq('store_id', storeId);

            if (assignedError) throw assignedError;

            const assignedBarcodes = assignedProducts.map(p => p.product_barcode);

            // Merge products with assignment status
            const mergedProducts = (products || []).map(product => ({
                ...product,
                isAssigned: assignedBarcodes.includes(product.barcode)
            }));

            setProductList(mergedProducts);
            setFilteredProducts(mergedProducts);
        } catch (error) {
            console.error('Error fetching products:', error);
            showAlert('Error', 'Failed to fetch products. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, [storeId]);

    const showAlert = (title: string, message: string, callback?: () => void) => {
        setAlertTitle(title);
        setAlertMessage(message);
        setAlertCallback(() => callback);
        setAlertVisible(true);
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchProducts();
    };

    const handleAssignProducts = async () => {
        if (selectedProducts.size === 0) {
            showAlert('Selection Required', 'Please select at least one product to assign.');
            return;
        }

        setIsSubmitting(true);

        try {
            const { error } = await supabase
                .from('store_products')
                .insert(
                    Array.from(selectedProducts).map((barcode) => ({
                        store_id: storeId,
                        product_barcode: barcode,
                    }))
                );

            if (error) throw error;

            // Update the product list to mark these as assigned
            setProductList(prev =>
                prev.map(product =>
                    selectedProducts.has(product.barcode)
                        ? { ...product, isAssigned: true }
                        : product
                )
            );

            showAlert(
                'Success',
                `${selectedProducts.size} product(s) assigned successfully!`,
                () => setSelectedProducts(new Set())
            );
        } catch (error) {
            console.error('Error assigning products:', error);
            showAlert('Error', 'Failed to assign products. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Optimized toggle function using useCallback
    const toggleProductSelection = useCallback((barcode: string, isAssigned: boolean) => {
        if (isAssigned) return;

        setSelectedProducts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(barcode)) {
                newSet.delete(barcode);
            } else {
                newSet.add(barcode);
            }
            return newSet;
        });
    }, []);

    // Memoized calculations for select all status
    const selectAllData = useMemo(() => {
        const availableProducts = filteredProducts.filter(product => !product.isAssigned);
        const availableBarcodes = availableProducts.map(product => product.barcode);

        if (availableProducts.length === 0) {
            return {
                status: 'disabled' as const,
                selectableCount: 0,
                selectedCount: 0,
                availableBarcodes: [] as string[]
            };
        }

        const selectedCount = availableBarcodes.filter(barcode => selectedProducts.has(barcode)).length;
        const allSelected = selectedCount === availableBarcodes.length;
        const someSelected = selectedCount > 0;

        let status: 'checked' | 'indeterminate' | 'unchecked';
        if (allSelected) status = 'checked';
        else if (someSelected) status = 'indeterminate';
        else status = 'unchecked';

        return {
            status,
            selectableCount: availableProducts.length,
            selectedCount,
            availableBarcodes
        };
    }, [filteredProducts, selectedProducts]);

    // Select All functionality
    const handleSelectAll = useCallback(() => {
        const { status, availableBarcodes } = selectAllData;

        if (status === 'disabled') return;

        if (status === 'checked') {
            // Deselect all
            setSelectedProducts(prev => {
                const newSet = new Set(prev);
                availableBarcodes?.forEach(barcode => newSet.delete(barcode));
                return newSet;
            });
        } else {
            // Select all available
            setSelectedProducts(prev => {
                const newSet = new Set(prev);
                availableBarcodes?.forEach(barcode => newSet.add(barcode));
                return newSet;
            });
        }
    }, [selectAllData]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6c5ce7" />
                <Text style={styles.loadingText}>Loading products...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StyledAlert
                visible={alertVisible}
                title={alertTitle}
                message={alertMessage}
                onOk={() => {
                    if (alertCallback) alertCallback();
                    setAlertVisible(false);
                }}
                onClose={() => setAlertVisible(false)}
                showCancel={false}
            />
            <LinearGradient
                colors={['#6c5ce7', '#0984e3']}
                style={styles.headerGradient}
            >
                <View style={styles.headerRow}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.title}>Assign Products</Text>
                        <Text style={styles.subtitle}>Select products to add to your store</Text>
                    </View>
                </View>
            </LinearGradient>

            {/* Search Bar */}
            <View style={styles.searchWrapper}>
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#636e72" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search products by name, barcode, or description..."
                        placeholderTextColor="#636e72"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color="#636e72" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Enhanced Select All Header */}
            {filteredProducts.length > 0 && (
                <View style={styles.selectAllContainer}>
                    <TouchableOpacity
                        style={styles.selectAllButton}
                        onPress={handleSelectAll}
                        disabled={selectAllData.status === 'disabled'}
                        activeOpacity={0.7}
                    >
                        <View style={styles.checkboxWrapper}>
                            <Checkbox
                                status={selectAllData.status === 'disabled' ? 'unchecked' : selectAllData.status}
                                color="#6c5ce7"
                                uncheckedColor="#636e72"
                                disabled={selectAllData.status === 'disabled'}
                            />
                        </View>
                        <View style={styles.selectAllTextContainer}>
                            <View style={styles.selectAllMainRow}>
                                <Text style={[
                                    styles.selectAllText,
                                    selectAllData.status === 'disabled' && styles.selectAllTextDisabled
                                ]}>
                                    Select All Available
                                </Text>
                                <View style={styles.countBadge}>
                                    <Text style={styles.countBadgeText}>
                                        {selectAllData.selectedCount}/{selectAllData.selectableCount}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.selectAllSubText}>
                                {selectAllData.selectedCount === 0
                                    ? `Tap to select all ${selectAllData.selectableCount} available products`
                                    : selectAllData.selectedCount === selectAllData.selectableCount
                                        ? 'All available products selected'
                                        : `${selectAllData.selectableCount - selectAllData.selectedCount} more products available`
                                }
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>
            )}

            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        colors={['#6c5ce7']}
                        tintColor={'#6c5ce7'}
                    />
                }
            >
                {filteredProducts.length === 0 && !loading ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="search" size={48} color="#b2bec3" />
                        <Text style={styles.emptyText}>
                            {searchQuery ? `No products found for "${searchQuery}"` : 'No products available'}
                        </Text>
                        <Text style={styles.emptySubText}>
                            {searchQuery ? 'Try a different search term' : 'All products are already assigned to this store'}
                        </Text>
                    </View>
                ) : (
                    filteredProducts.map((product) => (
                        <View
                            key={product.barcode}
                            style={[
                                styles.productItemContainer,
                                selectedProducts.has(product.barcode) && styles.selectedProduct,
                                product.isAssigned && styles.assignedProduct
                            ]}
                        >
                            <TouchableOpacity
                                style={styles.productContent}
                                onPress={() => toggleProductSelection(product.barcode, product.isAssigned)}
                                activeOpacity={product.isAssigned ? 1 : 0.7}
                                disabled={product.isAssigned}
                            >
                                <Checkbox
                                    status={
                                        product.isAssigned ? 'checked' :
                                            selectedProducts.has(product.barcode) ? 'checked' : 'unchecked'
                                    }
                                    color="#6c5ce7"
                                    uncheckedColor="#636e72"
                                    disabled={product.isAssigned}
                                />
                                <View style={styles.productInfo}>
                                    <Text style={[styles.productName, product.isAssigned && styles.assignedText]}>
                                        {product.name}
                                    </Text>
                                    {product.description && (
                                        <Text
                                            style={[styles.productDescription, product.isAssigned && styles.assignedText]}
                                            numberOfLines={2}
                                        >
                                            {product.description}
                                        </Text>
                                    )}
                                    <View style={styles.productDetails}>
                                        <Text style={styles.barcode}>#{product.barcode}</Text>
                                        {product.category && (
                                            <Text style={styles.categoryTag}>
                                                {product.category}
                                            </Text>
                                        )}
                                    </View>
                                    {product.isAssigned && (
                                        <Text style={styles.assignedLabel}>Already assigned</Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                        </View>
                    ))
                )}
            </ScrollView>

            <View style={styles.footer}>
                <Text style={styles.selectionCount}>
                    {selectedProducts.size} product{selectedProducts.size !== 1 ? 's' : ''} selected
                </Text>

                <TouchableOpacity
                    style={[styles.assignButton, selectedProducts.size === 0 && styles.disabledButton]}
                    onPress={handleAssignProducts}
                    disabled={selectedProducts.size === 0 || isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle" size={20} color="#fff" />
                            <Text style={styles.assignButtonText}>Assign Products</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f6fa',
    },
    headerGradient: {
        paddingVertical: 20,
        paddingHorizontal: 15,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 30,
    },
    headerTextContainer: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
        marginTop: 4,
    },
    backButton: {
        padding: 8,
    },
    searchWrapper: {
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#f5f6fa',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 10,
        paddingHorizontal: 15,
        height: 50,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        height: '100%',
        fontSize: 16,
        color: '#2d3436',
    },
    // Enhanced Select All Styles
    selectAllContainer: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        marginBottom: -10,
        marginTop: -20,
    },
    selectAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        height: 45,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    checkboxWrapper: {
        marginRight: 0,
    },
    selectAllTextContainer: {
        flex: 1,
        marginLeft: 8,
    },
    selectAllMainRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    selectAllText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2d3436',
    },
    selectAllTextDisabled: {
        color: '#b2bec3',
    },
    countBadge: {
        backgroundColor: '#6c5ce7',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        minWidth: 45,
        alignItems: 'center',
    },
    countBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    selectAllSubText: {
        fontSize: 11,
        color: '#636e72',
        lineHeight: 14,
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
    scrollContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        paddingTop: 10,
    },
    productItemContainer: {
        backgroundColor: '#fff',
        borderRadius: 10,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
        overflow: 'hidden',
    },
    productContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
    },
    productInfo: {
        flex: 1,
    },
    productDetails: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        flexWrap: 'wrap',
    },
    selectedProduct: {
        backgroundColor: '#f0f3ff',
        borderWidth: 1,
        borderColor: '#6c5ce7',
    },
    assignedProduct: {
        backgroundColor: '#f5f5f5',
        opacity: 0.7,
    },
    productName: {
        fontSize: 16,
        color: '#2d3436',
        marginLeft: 10,
        fontWeight: '600',
    },
    productDescription: {
        fontSize: 14,
        color: '#636e72',
        marginLeft: 10,
        marginTop: 2,
        lineHeight: 18,
    },
    assignedText: {
        color: '#636e72',
    },
    barcode: {
        fontSize: 12,
        color: '#636e72',
        marginLeft: 10,
    },
    categoryTag: {
        fontSize: 12,
        color: '#6c5ce7',
        backgroundColor: '#f0f3ff',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        marginLeft: 10,
        overflow: 'hidden',
    },
    assignedLabel: {
        fontSize: 12,
        color: '#00b894',
        marginLeft: 10,
        marginTop: 4,
        fontWeight: '600',
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#dfe6e9',
        backgroundColor: '#fff',
    },
    selectionCount: {
        textAlign: 'center',
        color: '#636e72',
        marginBottom: 15,
        fontSize: 14,
    },
    assignButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#6c5ce7',
        padding: 16,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    disabledButton: {
        backgroundColor: '#b2bec3',
    },
    assignButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
        marginLeft: 10,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 16,
        color: '#636e72',
        marginTop: 15,
        textAlign: 'center',
        fontWeight: '600',
    },
    emptySubText: {
        fontSize: 14,
        color: '#b2bec3',
        textAlign: 'center',
        marginTop: 8,
    },
});