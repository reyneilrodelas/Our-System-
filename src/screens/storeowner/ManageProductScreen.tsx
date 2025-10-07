import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Switch,
    KeyboardAvoidingView,
    Platform,
    RefreshControl,
} from 'react-native';
import { StyledAlert } from '../../screens/components/StyledAlert';
import { createClient } from '@supabase/supabase-js';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute, useNavigation } from '@react-navigation/native';

// Set up Supabase
import { supabase } from '../../lib/supabase';

export default function ManageProductScreen() {
    const route = useRoute();
    const navigation = useNavigation();
    const { storeId } = route.params as { storeId: string };

    const [assignedProducts, setAssignedProducts] = useState<any[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertTitle, setAlertTitle] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [alertCallback, setAlertCallback] = useState<(() => void) | undefined>();

    // Filter products based on search query
    useEffect(() => {
        if (searchQuery) {
            const filtered = assignedProducts.filter(product =>
                product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                product.barcode.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredProducts(filtered);
        } else {
            setFilteredProducts(assignedProducts);
        }
    }, [searchQuery, assignedProducts]);

    // Fetch assigned products and their details (price, stock, availability)
    const fetchAssignedProducts = async () => {
        setLoading(true);
        try {
            // Fetch assigned products for this store from the store_products table
            const { data: storeProducts, error: storeProductsError } = await supabase
                .from('store_products')
                .select('product_barcode, price, stock, availability')
                .eq('store_id', storeId);

            if (storeProductsError) throw storeProductsError;

            // If no assigned products, show empty state
            if (!storeProducts || storeProducts.length === 0) {
                setAssignedProducts([]);
                setLoading(false);
                return;
            }

            const barcodes = storeProducts.map((product: any) => product.product_barcode);

            // Fetch product details for the assigned products
            const { data: productDetails, error: productDetailsError } = await supabase
                .from('products')
                .select('barcode, name')
                .in('barcode', barcodes);

            if (productDetailsError) throw productDetailsError;

            // Merge the assigned products with their details
            const productsWithDetails = productDetails.map((product) => ({
                ...product,
                price: storeProducts.find((sp: any) => sp.product_barcode === product.barcode)?.price || 0,
                stock: storeProducts.find((sp: any) => sp.product_barcode === product.barcode)?.stock || 0,
                availability: storeProducts.find((sp: any) => sp.product_barcode === product.barcode)?.availability || true,
            }));

            setAssignedProducts(productsWithDetails);
            setFilteredProducts(productsWithDetails);
        } catch (error) {
            console.error('Error fetching assigned products:', error);
            showAlert('Error', 'Failed to fetch assigned products. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAssignedProducts();
    }, [storeId]);

    const showAlert = (title: string, message: string, callback?: () => void) => {
        setAlertTitle(title);
        setAlertMessage(message);
        setAlertCallback(() => callback);
        setAlertVisible(true);
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchAssignedProducts();
    };

    const handleSave = async (barcode: string, price: number, stock: number, availability: boolean) => {
        setSaving(barcode);
        try {
            // Update product details (price, stock, availability) for the assigned product in store_products table
            const { error } = await supabase
                .from('store_products')
                .update({ price, stock, availability })
                .eq('store_id', storeId)
                .eq('product_barcode', barcode);

            if (error) throw error;

            showAlert('Success', 'Product details updated successfully!');
        } catch (error) {
            console.error('Error saving product:', error);
            showAlert('Error', 'Failed to update product details.');
        } finally {
            setSaving(null);
        }
    };

    const handleDelete = async (barcode: string) => {
        setDeleting(barcode);
        try {
            // Delete the product from the store_products table
            const { error } = await supabase
                .from('store_products')
                .delete()
                .eq('store_id', storeId)
                .eq('product_barcode', barcode);

            if (error) throw error;

            // Remove the product from the UI
            setAssignedProducts(prevProducts =>
                prevProducts.filter(product => product.barcode !== barcode)
            );

            showAlert('Success', 'Product removed from store successfully!');
        } catch (error) {
            console.error('Error deleting product:', error);
            showAlert('Error', 'Failed to remove product from store.');
        } finally {
            setDeleting(null);
        }
    };

    const handleInputChange = (barcode: string, field: 'price' | 'stock' | 'availability', value: any) => {
        const updatedProducts = assignedProducts.map((product) => {
            if (product.barcode === barcode) {
                return {
                    ...product,
                    [field]: field === 'availability' ? value :
                        field === 'price' ? parseFloat(value) || 0 :
                            parseInt(value, 10) || 0
                };
            }
            return product;
        });
        setAssignedProducts(updatedProducts);
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6c5ce7" />
                <Text style={styles.loadingText}>Loading product details...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
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
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>Manage Store Products</Text>
                        <Text style={styles.headerSubtitle}>Update product details and availability</Text>
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
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        colors={['#6c5ce7']}
                        tintColor={'#6c5ce7'}
                    />
                }
            >
                {filteredProducts.length === 0 ? (
                    <View style={styles.emptyState}>
                        {searchQuery ? (
                            <>
                                <Ionicons name="search" size={48} color="#b2bec3" />
                                <Text style={styles.emptyStateText}>No products found for "{searchQuery}"</Text>
                                <Text style={styles.emptyStateSubText}>Try a different search term</Text>
                            </>
                        ) : (
                            <>
                                <Ionicons name="cube-outline" size={48} color="#b2bec3" />
                                <Text style={styles.emptyStateText}>No products assigned to this store yet.</Text>
                            </>
                        )}
                    </View>
                ) : (
                    filteredProducts.map((product) => (
                        <View key={product.barcode} style={styles.productCard}>
                            <Text style={styles.productName}>{product.name}</Text>
                            <Text style={styles.productBarcode}>Barcode: {product.barcode}</Text>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Price (₱)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={product.price.toString()}
                                    keyboardType="decimal-pad"
                                    onChangeText={(value) => handleInputChange(product.barcode, 'price', value)}
                                    placeholder="0.00"
                                    placeholderTextColor="#999"
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Stock</Text>
                                <TextInput
                                    style={styles.input}
                                    value={product.stock.toString()}
                                    keyboardType="numeric"
                                    onChangeText={(value) => handleInputChange(product.barcode, 'stock', value)}
                                    placeholder="0"
                                    placeholderTextColor="#999"
                                />
                            </View>

                            <View style={styles.switchContainer}>
                                <Text style={styles.label}>Available</Text>
                                <Switch
                                    value={product.availability}
                                    onValueChange={(value) => handleInputChange(product.barcode, 'availability', value)}
                                    trackColor={{ false: '#dfe6e9', true: '#81b0ff' }}
                                    thumbColor={product.availability ? '#6c5ce7' : '#f4f3f4'}
                                />
                            </View>

                            <View style={styles.buttonRow}>
                                <TouchableOpacity
                                    style={[styles.button, styles.saveButton]}
                                    onPress={() => handleSave(product.barcode, product.price, product.stock, product.availability)}
                                    disabled={saving === product.barcode}
                                >
                                    {saving === product.barcode ? (
                                        <ActivityIndicator color="white" size="small" />
                                    ) : (
                                        <>
                                            <Ionicons name="save" size={18} color="white" />
                                            <Text style={styles.buttonText}> Save</Text>
                                        </>
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.button, styles.deleteButton]}
                                    onPress={() => handleDelete(product.barcode)}
                                    disabled={deleting === product.barcode}
                                >
                                    {deleting === product.barcode ? (
                                        <ActivityIndicator color="white" size="small" />
                                    ) : (
                                        <>
                                            <Ionicons name="trash" size={18} color="white" />
                                            <Text style={styles.buttonText}> Remove</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
        </KeyboardAvoidingView>
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
    headerContent: {
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
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
        marginTop: 4,
    },
    backButton: {
        padding: 8,
    },
    refreshButton: {
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
    scrollContainer: {
        paddingHorizontal: 20,
        paddingBottom: 30,
    },
    productCard: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    productName: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#2d3436',
    },
    productBarcode: {
        fontSize: 12,
        color: '#636e72',
        marginBottom: 20,
    },
    formGroup: {
        marginBottom: 15,
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
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 10,
        minWidth: 120,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    saveButton: {
        backgroundColor: '#6c5ce7',
    },
    deleteButton: {
        backgroundColor: '#e74c3c',
    },
    buttonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
        marginLeft: 5,
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
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        backgroundColor: '#fff',
        borderRadius: 15,
        marginBottom: 20,
    },
    emptyStateText: {
        fontSize: 16,
        color: '#636e72',
        textAlign: 'center',
        marginTop: 16,
        fontWeight: '600',
    },
    emptyStateSubText: {
        fontSize: 14,
        color: '#b2bec3',
        textAlign: 'center',
        marginTop: 8,
    },
});