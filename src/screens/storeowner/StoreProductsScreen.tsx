import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    Modal,
    TextInput,
    Pressable,
    Image,
    ScrollView
} from 'react-native';
import { StyledAlert } from '../components/StyledAlert';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '../../context/AuthContext';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

// Define types
type Product = {
    id: string;
    name: string;
    description: string;
    price: number;
    image_url: string;
    store_id: string;
    created_at: string;
};

type RootStackParamList = {
    StoreProducts: { storeId: string };
    // Add other routes as needed
};

type StoreProductsRouteProp = {
    params: {
        storeId: string;
    };
    key: string;
    name: string;
};

// Supabase client
import { supabase } from '../../lib/supabase';

export default function StoreProductsScreen() {
    const route = useRoute<StoreProductsRouteProp>();
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
    const { storeId } = route.params;
    const { user } = useAuth();

    // State management
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
    const [image, setImage] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertTitle, setAlertTitle] = useState('');
    const [alertMessage, setAlertMessage] = useState('');

    // Form state
    const [form, setForm] = useState({
        name: '',
        description: '',
        price: '',
    });

    // Fetch products
    const fetchProducts = async () => {
        try {
            setRefreshing(true);
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('store_id', storeId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProducts(data || []);
        } catch (err) {
            setError('Failed to fetch products');
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, [storeId]);

    // Handle product deletion
    const handleDeleteProduct = async (productId: string) => {
        setAlertTitle('Delete Product');
        setAlertMessage('Are you sure you want to delete this product?');
        setAlertVisible(true);
        
        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', productId);

            if (error) throw error;

            setProducts(products.filter(product => product.id !== productId));
            setAlertTitle('Success');
            setAlertMessage('Product deleted successfully');
            setAlertVisible(true);
        } catch (err) {
            setAlertTitle('Error');
            setAlertMessage('Failed to delete product');
            setAlertVisible(true);
            console.error(err);
        }
    };

    // Open modal for add/edit
    const openModal = (product: Product | null = null) => {
        setCurrentProduct(product);
        setForm({
            name: product?.name || '',
            description: product?.description || '',
            price: product?.price.toString() || '',
        });
        setImage(product?.image_url || null);
        setModalVisible(true);
    };

    // Upload image to Supabase storage
    const uploadImage = async (uri: string) => {
        setUploading(true);
        try {
            const response = await fetch(uri);
            const blob = await response.blob();
            const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${user?.id}/${fileName}`;

            const { data, error } = await supabase.storage
                .from('product-images')
                .upload(filePath, blob, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('product-images')
                .getPublicUrl(data.path);

            return publicUrl;
        } catch (err) {
            setAlertTitle('Error');
            setAlertMessage('Failed to upload image');
            setAlertVisible(true);
            console.error(err);
            return null;
        } finally {
            setUploading(false);
        }
    };

    // Pick image from library
    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            setAlertTitle('Permission required');
            setAlertMessage('We need camera roll permissions to upload images');
            setAlertVisible(true);
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled && result.assets.length > 0) {
            setImage(result.assets[0].uri);
        }
    };

    // Handle form submission
    const handleSubmit = async () => {
        if (!form.name || !form.price) {
            setAlertTitle('Error');
            setAlertMessage('Name and price are required');
            setAlertVisible(true);
            return;
        }

        if (isNaN(parseFloat(form.price))) {
            setAlertTitle('Error');
            setAlertMessage('Please enter a valid price');
            setAlertVisible(true);
            return;
        }

        try {
            let imageUrl = currentProduct?.image_url || null;

            // Upload new image if selected
            if (image && !image.startsWith('http')) {
                const uploadedUrl = await uploadImage(image);
                if (uploadedUrl) {
                    imageUrl = uploadedUrl;
                }
            }

            if (currentProduct) {
                // Update existing product
                const { data, error } = await supabase
                    .from('products')
                    .update({
                        name: form.name,
                        description: form.description,
                        price: parseFloat(form.price),
                        image_url: imageUrl,
                    })
                    .eq('id', currentProduct.id)
                    .select();

                if (error) throw error;

                setProducts(products.map(p =>
                    p.id === currentProduct.id ? data[0] : p
                ));
                setAlertTitle('Success');
                setAlertMessage('Product updated successfully');
                setAlertVisible(true);
            } else {
                // Create new product
                const { data, error } = await supabase
                    .from('products')
                    .insert({
                        name: form.name,
                        description: form.description,
                        price: parseFloat(form.price),
                        image_url: imageUrl,
                        store_id: storeId,
                    })
                    .select();

                if (error) throw error;

                setProducts([data[0], ...products]);
                setAlertTitle('Success');
                setAlertMessage('Product added successfully');
                setAlertVisible(true);
            }

            setModalVisible(false);
        } catch (err) {
            setAlertTitle('Error');
            setAlertMessage('Failed to save product');
            setAlertVisible(true);
            console.error(err);
        }
    };

    // Render each product item
    const renderProductItem = ({ item }: { item: Product }) => (
        <View style={styles.productCard}>
            {item.image_url ? (
                <Image
                    source={{ uri: item.image_url }}
                    style={styles.productImage}
                    resizeMode="cover"
                />
            ) : (
                <View style={[styles.productImage, styles.emptyImage]}>
                    <Ionicons name="image-outline" size={32} color="#ccc" />
                </View>
            )}

            <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.productPrice}>${item.price.toFixed(2)}</Text>
                {item.description && (
                    <Text style={styles.productDescription} numberOfLines={2}>
                        {item.description}
                    </Text>
                )}
            </View>

            <View style={styles.productActions}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => openModal(item)}
                >
                    <Feather name="edit" size={20} color="#2196F3" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteProduct(item.id)}
                >
                    <MaterialIcons name="delete-outline" size={20} color="#F44336" />
                </TouchableOpacity>
            </View>
        </View>
    );

    if (loading && !refreshing) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6200ee" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Manage Products</Text>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => openModal()}
                >
                    <Ionicons name="add" size={24} color="white" />
                </TouchableOpacity>
            </View>

            {error ? (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={fetchProducts}
                    >
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : products.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="pricetags-outline" size={60} color="#6200ee" />
                    <Text style={styles.emptyTitle}>No Products Found</Text>
                    <Text style={styles.emptySubtitle}>Add your first product to get started</Text>
                    <TouchableOpacity
                        style={styles.addFirstButton}
                        onPress={() => openModal()}
                    >
                        <Text style={styles.addFirstButtonText}>Add Product</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={products}
                    renderItem={renderProductItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    refreshing={refreshing}
                    onRefresh={fetchProducts}
                />
            )}

            {/* Product Form Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <ScrollView
                        contentContainerStyle={styles.modalScrollContainer}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.modalContainer}>
                            <Text style={styles.modalTitle}>
                                {currentProduct ? 'Edit Product' : 'Add New Product'}
                            </Text>

                            <TouchableOpacity
                                style={styles.imagePicker}
                                onPress={pickImage}
                                disabled={uploading}
                            >
                                {image ? (
                                    <Image
                                        source={{ uri: image }}
                                        style={styles.selectedImage}
                                    />
                                ) : (
                                    <View style={styles.imagePlaceholder}>
                                        <Ionicons
                                            name="image-outline"
                                            size={40}
                                            color="#6200ee"
                                        />
                                        <Text style={styles.imagePlaceholderText}>Select Image</Text>
                                    </View>
                                )}
                                {uploading && (
                                    <View style={styles.uploadingOverlay}>
                                        <ActivityIndicator color="#fff" />
                                    </View>
                                )}
                            </TouchableOpacity>

                            <TextInput
                                style={styles.input}
                                placeholder="Product Name *"
                                placeholderTextColor="#999"
                                value={form.name}
                                onChangeText={(text) => setForm({ ...form, name: text })}
                                editable={!uploading}
                            />

                            <TextInput
                                style={styles.input}
                                placeholder="Price *"
                                placeholderTextColor="#999"
                                value={form.price}
                                onChangeText={(text) => setForm({ ...form, price: text })}
                                keyboardType="decimal-pad"
                                editable={!uploading}
                            />

                            <TextInput
                                style={[styles.input, styles.descriptionInput]}
                                placeholder="Description"
                                placeholderTextColor="#999"
                                value={form.description}
                                onChangeText={(text) => setForm({ ...form, description: text })}
                                multiline
                                numberOfLines={4}
                                editable={!uploading}
                            />

                            <View style={styles.modalButtons}>
                                <Pressable
                                    style={[styles.modalButton, styles.cancelButton]}
                                    onPress={() => setModalVisible(false)}
                                    disabled={uploading}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </Pressable>

                                <Pressable
                                    style={[styles.modalButton, styles.saveButton]}
                                    onPress={handleSubmit}
                                    disabled={uploading || !form.name || !form.price}
                                >
                                    {uploading ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <Text style={styles.saveButtonText}>
                                            {currentProduct ? 'Update' : 'Save'}
                                        </Text>
                                    )}
                                </Pressable>
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </Modal>

            <StyledAlert
                visible={alertVisible}
                title={alertTitle}
                message={alertMessage}
                onClose={() => setAlertVisible(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    addButton: {
        backgroundColor: '#6200ee',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    },
    productCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    productImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 16,
    },
    emptyImage: {
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#eee',
    },
    productInfo: {
        flex: 1,
        marginRight: 8,
    },
    productName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    productPrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#6200ee',
        marginBottom: 4,
    },
    productDescription: {
        fontSize: 14,
        color: '#666',
    },
    productActions: {
        flexDirection: 'row',
    },
    actionButton: {
        padding: 8,
        marginLeft: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        color: 'red',
        fontSize: 16,
        marginBottom: 16,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: '#6200ee',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: 'white',
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
    },
    addFirstButton: {
        backgroundColor: '#6200ee',
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 8,
    },
    addFirstButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
    },
    listContainer: {
        paddingBottom: 20,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
    },
    modalScrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    modalContainer: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 24,
        marginHorizontal: 20,
        maxWidth: '100%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 24,
        color: '#333',
        textAlign: 'center',
    },
    imagePicker: {
        marginBottom: 20,
        alignItems: 'center',
    },
    imagePlaceholder: {
        width: 150,
        height: 150,
        borderRadius: 8,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderStyle: 'dashed',
    },
    imagePlaceholderText: {
        marginTop: 8,
        color: '#666',
    },
    selectedImage: {
        width: 150,
        height: 150,
        borderRadius: 8,
    },
    uploadingOverlay: {
        position: 'absolute',
        width: 150,
        height: 150,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    input: {
        height: 50,
        borderColor: '#ddd',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 16,
        marginBottom: 16,
        backgroundColor: '#fff',
        fontSize: 16,
    },
    descriptionInput: {
        height: 120,
        textAlignVertical: 'top',
        paddingTop: 16,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: '#f1f1f1',
        marginRight: 8,
    },
    saveButton: {
        backgroundColor: '#6200ee',
        marginLeft: 8,
    },
    cancelButtonText: {
        color: '#333',
        fontWeight: '600',
        fontSize: 16,
    },
    saveButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
    },
});