import React, { useState, useEffect } from 'react';
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
        category: string;
        isAssigned: boolean;
    }[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<{
        barcode: string;
        name: string;
        category: string;
        isAssigned: boolean;
    }[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
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
                product.barcode.toLowerCase().includes(searchQuery.toLowerCase())
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
                .select('barcode, name, category')
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
        if (selectedProducts.length === 0) {
            showAlert('Selection Required', 'Please select at least one product to assign.');
            return;
        }

        setIsSubmitting(true);

        try {
            const { error } = await supabase
                .from('store_products')
                .insert(
                    selectedProducts.map((barcode) => ({
                        store_id: storeId,
                        product_barcode: barcode,
                    }))
                );

            if (error) throw error;

            // Update the product list to mark these as assigned
            setProductList(prev =>
                prev.map(product =>
                    selectedProducts.includes(product.barcode)
                        ? { ...product, isAssigned: true }
                        : product
                )
            );

            showAlert(
                'Success',
                `${selectedProducts.length} product(s) assigned successfully!`,
                () => setSelectedProducts([])
            );
        } catch (error) {
            console.error('Error assigning products:', error);
            showAlert('Error', 'Failed to assign products. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleProductSelection = (barcode: string, isAssigned: boolean) => {
        if (isAssigned) return; // Don't allow selection if already assigned

        setSelectedProducts(prev =>
            prev.includes(barcode)
                ? prev.filter(item => item !== barcode)
                : [...prev, barcode]
        );
    };

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
                        placeholder="Search products by name or barcode..."
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
                            No products found for "{searchQuery}"
                        </Text>
                        <Text style={styles.emptySubText}>Try a different search term</Text>
                    </View>
                ) : (
                    filteredProducts.map((product) => (
                        <TouchableOpacity
                            key={product.barcode}
                            style={[
                                styles.productItem,
                                selectedProducts.includes(product.barcode) && styles.selectedProduct,
                                product.isAssigned && styles.assignedProduct
                            ]}
                            onPress={() => toggleProductSelection(product.barcode, product.isAssigned)}
                            activeOpacity={product.isAssigned ? 1 : 0.7}
                            disabled={product.isAssigned}
                        >
                            <Checkbox
                                status={
                                    product.isAssigned ? 'checked' :
                                        selectedProducts.includes(product.barcode) ? 'checked' : 'unchecked'
                                }
                                color="#6c5ce7"
                                uncheckedColor="#636e72"
                                disabled={product.isAssigned}
                            />
                            <View style={styles.productInfo}>
                                <Text style={[styles.productName, product.isAssigned && styles.assignedText]}>
                                    {product.name}
                                </Text>
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
                    ))
                )}
            </ScrollView>

            <View style={styles.footer}>
                <Text style={styles.selectionCount}>
                    {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
                </Text>

                <TouchableOpacity
                    style={[styles.assignButton, selectedProducts.length === 0 && styles.disabledButton]}
                    onPress={handleAssignProducts}
                    disabled={selectedProducts.length === 0 || isSubmitting}
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
        fontSize: 22,
        fontWeight: 'bold',
        color: 'white',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
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
    },
    productItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
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
