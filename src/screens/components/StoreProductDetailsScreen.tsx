import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
    Image,
    TouchableOpacity,
    TextInput,
    Modal,
    Pressable,
    Dimensions,
} from 'react-native';
import { StyledAlert } from '../components/StyledAlert';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { createClient } from '@supabase/supabase-js';
import { Ionicons } from '@expo/vector-icons';
import type { HomeStackParamList } from '../../types/navigation';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import type { RouteProp } from '@react-navigation/native';

import { supabase } from '../../lib/supabase';
import { decode as atob } from 'base-64';

// Polyfill for base64 decoding
function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

type Store = {
    id: string; // Changed from number to string since it's a UUID
    name: string;
    address: string;
    description?: string;
    latitude: number;
    longitude: number;
    owner_id: string;
    status: string;
    created_at: string;
    updated_at?: string;
    image_url?: string;
};

type RootStackParamList = {
    StoreDetails: { storeId: number };
    MapScreen: {
        storeData: Store[];
        userLocation: null;
        focusStoreId: string;
    };
};

const StoreDetailsScreen = () => {
    const navigation = useNavigation<NavigationProp<HomeStackParamList>>();
    const route = useRoute<RouteProp<RootStackParamList, 'StoreDetails'>>();
    const { storeId } = route.params;
    const [store, setStore] = useState<Store | null>(null);
    const [loading, setLoading] = useState(true);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '',
        address: '',
        description: '',
        image: null as string | null
    });
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertTitle, setAlertTitle] = useState('');
    const [alertMessage, setAlertMessage] = useState('');

    useEffect(() => {
        const fetchStoreDetails = async () => {
            try {
                const { data, error } = await supabase
                    .from('stores')
                    .select('*')
                    .eq('id', storeId)
                    .single();

                if (error) throw error;
                console.log('Store data received:', data);
                console.log('Available columns:', Object.keys(data));
                setStore(data);
                setEditForm({
                    name: data.name,
                    address: data.address,
                    description: data.description || '',
                    image: data.image_url || null
                });

            if (data.image_url) {
                const { data: imageData } = await supabase
                    .storage
                    .from('store-images')
                    .getPublicUrl(data.image_url);                    setImageUrl(imageData.publicUrl);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchStoreDetails();
    }, [storeId]);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (status !== 'granted') {
            setAlertTitle('Permission Required');
            setAlertMessage('Please grant camera roll permissions to upload images.');
            setAlertVisible(true);
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.5, // Reduce initial quality to 50%
            exif: false, // Don't include EXIF data to reduce size
        });

        if (!result.canceled) {
            const uri = result.assets[0].uri;
            setImageUrl(uri);
            setEditForm(prev => ({ ...prev, image: uri }));
        }
    };

    const uploadImage = async (uri: string) => {
        try {
            if (!store?.id) {
                throw new Error('Store ID is required for uploading images');
            }

            // First compress and resize the image
            const manipulatedImage = await ImageManipulator.manipulateAsync(
                uri,
                [
                    { resize: { width: 800 } } // Resize to reasonable dimensions
                ],
                {
                    compress: 0.7, // 70% quality
                    format: ImageManipulator.SaveFormat.JPEG,
                    base64: true
                }
            );

            if (!manipulatedImage.base64) {
                throw new Error('Failed to process image');
            }

            // Create a simple unique file path
            const timestamp = Date.now().toString();
            const fileName = `store_${store.id}_${timestamp}.jpg`;

            // Convert base64 to binary data
            const base64Str = manipulatedImage.base64;
            const base64Data = base64Str.replace(/^data:image\/\w+;base64,/, '');
            
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('store-images')
                .upload(fileName, decode(base64Data), {
                    contentType: 'image/jpeg',
                    upsert: true
                });

            if (uploadError) {
                console.error('Upload error details:', uploadError);
                if (uploadError.message.includes('Unauthorized') || uploadError.message.includes('security policy')) {
                    throw new Error('Permission denied. Please contact support if this persists.');
                }
                throw uploadError;
            }
            
            return fileName;
        } catch (error: any) {
            if (error.message.includes('OutOfMemoryError')) {
                throw new Error('Image is too large. Please try a smaller image.');
            }
            console.error('Error uploading image:', error);
            throw error;
        }
    };

    const handleUpdateStore = async () => {
        if (!store) {
            setAlertTitle('Error');
            setAlertMessage('Store information not found');
            setAlertVisible(true);
            return;
        }

        // Validate required fields
        if (!editForm.name.trim() || !editForm.address.trim()) {
            setAlertTitle('Error');
            setAlertMessage('Store name and address are required');
            setAlertVisible(true);
            return;
        }

        let updatedFields: { 
            name: string; 
            address: string; 
            description: string;
            image_url?: string;
        } = {
            name: editForm.name.trim(),
            address: editForm.address.trim(),
            description: editForm.description.trim()
        };
        
        try {
            // Handle image upload if there's a new image
            if (editForm.image && editForm.image !== store.image_url) {
                console.log('Uploading new image...');
                const fileName = await uploadImage(editForm.image);
                if (!fileName) {
                    throw new Error('Failed to get uploaded file name');
                }
                updatedFields.image_url = fileName;
                console.log('Image uploaded successfully:', fileName);
            }

            console.log('Updating store with fields:', updatedFields);
            const { data, error } = await supabase
                .from('stores')
                .update(updatedFields)
                .eq('id', store.id)
                .select();

            if (error) {
                console.error('Store update error:', error);
                throw error;
            }

            if (!data || data.length === 0) {
                throw new Error('No data returned after update');
            }

            setStore({ ...store, ...updatedFields });
            setEditModalVisible(false);
            setAlertTitle('Success');
            setAlertMessage('Store updated successfully');
            setAlertVisible(true);
            
            // Refresh the image URL if a new image was uploaded
            if (updatedFields.image_url) {
                const { data: imageData } = await supabase
                    .storage
                    .from('store-images')
                    .getPublicUrl(updatedFields.image_url);
                
                if (imageData) {
                    setImageUrl(imageData.publicUrl);
                } else {
                    console.error('Failed to get image URL');
                }
            }
        } catch (err: any) {
            console.error('Store update error:', err);
            setAlertTitle('Error');
            setAlertMessage(err.message || 'Failed to update store. Please try again.');
            setAlertVisible(true);
        }
    };

    const handleDeleteStore = async () => {
        setAlertTitle('Delete Store');
        setAlertMessage('Are you sure you want to delete this store? All products will also be deleted.');
        setAlertVisible(true);

        try {
            const { error: storeError } = await supabase
                .from('stores')
                .delete()
                .eq('id', storeId);

            if (storeError) throw storeError;

            navigation.goBack();
            setAlertTitle('Success');
            setAlertMessage('Store deleted successfully');
            setAlertVisible(true);
        } catch (err) {
            setAlertTitle('Error');
            setAlertMessage('Failed to delete store');
            setAlertVisible(true);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6c5ce7" />
                <Text style={styles.loadingText}>Loading store details...</Text>
            </View>
        );
    }

    if (!store) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={48} color="#ff7675" />
                <Text style={styles.errorText}>Store not found</Text>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header with back button */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                >
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Store Details</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Store Image */}
                {imageUrl ? (
                    <Image
                        source={{ uri: imageUrl }}
                        style={styles.storeImage}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={styles.imagePlaceholder}>
                        <Ionicons name="storefront" size={48} color="#a5b1c2" />
                        <Text style={styles.placeholderText}>No Image Available</Text>
                    </View>
                )}

                {/* Store Info */}
                <View style={styles.contentContainer}>
                    <Text style={styles.storeName}>{store.name}</Text>

                    <View style={styles.divider} />

                    {/* Address Section */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="location-sharp" size={20} color="#6c5ce7" />
                            <Text style={styles.sectionTitle}>Address</Text>
                        </View>
                        <Text style={styles.sectionContent}>{store.address}</Text>
                    </View>

                    {/* Description Section */}
                    {store.description && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="information-circle" size={20} color="#6c5ce7" />
                                <Text style={styles.sectionTitle}>About</Text>
                            </View>
                            <Text style={styles.sectionContent}>{store.description}</Text>
                        </View>
                    )}

                    {/* Map Button */}
                    <TouchableOpacity
                        style={styles.mapButton}
                        onPress={() => {
                            if (store) {
                                navigation.navigate('MapScreen', {
                                    storeData: [{
                                        id: store.id,
                                        name: store.name,
                                        address: store.address,
                                        latitude: store.latitude,
                                        longitude: store.longitude
                                    }],
                                    userLocation: null,
                                    focusStoreId: store.id
                                });
                            }
                        }}
                    >
                        <Ionicons name="map" size={24} color="#FFFFFF" />
                        <Text style={styles.mapButtonText}>View on Map</Text>
                    </TouchableOpacity>

                </View>
            </ScrollView>

            {/* Edit Store Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={editModalVisible}
                onRequestClose={() => setEditModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Store</Text>
                            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#636e72" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={styles.modalContent}>
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Store Name</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter store name"
                                    value={editForm.name}
                                    onChangeText={(text) => setEditForm({ ...editForm, name: text })}
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Address</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter store address"
                                    value={editForm.address}
                                    onChangeText={(text) => setEditForm({ ...editForm, address: text })}
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Description</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Enter store description"
                                    value={editForm.description}
                                    onChangeText={(text) => setEditForm({ ...editForm, description: text })}
                                    multiline
                                    numberOfLines={4}
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Store Image</Text>
                                <TouchableOpacity
                                    style={styles.imagePickerButton}
                                    onPress={pickImage}
                                >
                                    <Ionicons name="camera" size={24} color="#6c5ce7" />
                                    <Text style={styles.imagePickerText}>
                                        {editForm.image ? 'Change Image' : 'Upload Image'}
                                    </Text>
                                </TouchableOpacity>
                                {editForm.image && (
                                    <Image
                                        source={{ uri: editForm.image }}
                                        style={styles.imagePreview}
                                        resizeMode="cover"
                                    />
                                )}
                            </View>
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <Pressable
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setEditModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.modalButton, styles.saveButton]}
                                onPress={handleUpdateStore}
                                disabled={!editForm.name || !editForm.address}
                            >
                                <Text style={styles.saveButtonText}>Save Changes</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Delete Store Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={deleteModalVisible}
                onRequestClose={() => setDeleteModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { width: '90%' }]}>
                        <View style={styles.deleteModalContent}>
                            <View style={styles.deleteIconContainer}>
                                <Ionicons name="warning" size={48} color="#ff7675" />
                            </View>
                            <Text style={styles.deleteModalTitle}>Delete Store</Text>
                            <Text style={styles.deleteModalText}>
                                Are you sure you want to delete this store? This action cannot be undone.
                            </Text>
                        </View>

                        <View style={styles.modalFooter}>
                            <Pressable
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setDeleteModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.modalButton, styles.deleteModalButton]}
                                onPress={handleDeleteStore}
                            >
                                <Text style={styles.deleteButtonText}>Delete</Text>
                            </Pressable>
                        </View>
                    </View>
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
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f6fa',
    },
    mapButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#6c5ce7',
        padding: 12,
        borderRadius: 8,
        marginVertical: 16,
        marginHorizontal: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    mapButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f6fa',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#636e72',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f6fa',
        padding: 20,
    },
    errorText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#2d3436',
        marginTop: 16,
        marginBottom: 24,
    },
    backButton: {
        padding: 8,
    },
    backButtonText: {
        color: '#6c5ce7',
        fontSize: 16,
        fontWeight: '600',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#6c5ce7',
        elevation: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    storeImage: {
        width: '100%',
        height: 220,
    },
    imagePlaceholder: {
        width: '100%',
        height: 220,
        backgroundColor: '#dfe6e9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        marginTop: 8,
        color: '#636e72',
        fontSize: 14,
    },
    contentContainer: {
        padding: 20,
        backgroundColor: '#fff',
        marginTop: -20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        elevation: 2,
    },
    storeName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2d3436',
        marginBottom: 8,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ratingText: {
        marginLeft: 4,
        fontSize: 14,
        fontWeight: '600',
        color: '#2d3436',
    },
    ratingCount: {
        marginLeft: 4,
        fontSize: 12,
        color: '#636e72',
    },
    categoryBadge: {
        backgroundColor: '#dfe6e9',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    categoryText: {
        fontSize: 12,
        color: '#2d3436',
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: '#dfe6e9',
        marginVertical: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2d3436',
        marginLeft: 8,
    },
    sectionContent: {
        fontSize: 15,
        color: '#636e72',
        lineHeight: 22,
        marginLeft: 28,
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 24,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        borderRadius: 12,
        flex: 1,
    },
    editButton: {
        backgroundColor: '#00b894',
        marginRight: 12,
    },
    deleteButton: {
        backgroundColor: '#ff7675',
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginLeft: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '85%',
        maxHeight: '80%',
        backgroundColor: 'white',
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#dfe6e9',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2d3436',
    },
    modalContent: {
        padding: 20,
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#dfe6e9',
    },
    inputContainer: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        color: '#636e72',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#f5f6fa',
        borderRadius: 10,
        padding: 14,
        fontSize: 16,
        color: '#2d3436',
        borderWidth: 1,
        borderColor: '#dfe6e9',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    modalButton: {
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 24,
    },
    cancelButton: {
        backgroundColor: '#f5f6fa',
    },
    cancelButtonText: {
        color: '#636e72',
        fontWeight: '600',
        fontSize: 16,
    },
    saveButton: {
        backgroundColor: '#6c5ce7',
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    deleteModalContent: {
        padding: 24,
        alignItems: 'center',
    },
    deleteIconContainer: {
        marginBottom: 16,
    },
    deleteModalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2d3436',
        marginBottom: 8,
    },
    deleteModalText: {
        fontSize: 16,
        color: '#636e72',
        textAlign: 'center',
        lineHeight: 24,
    },
    deleteModalButton: {
        backgroundColor: '#ff7675',
    },
    deleteButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    imagePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f6fa',
        padding: 16,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#dfe6e9',
        marginBottom: 10,
    },
    imagePickerText: {
        marginLeft: 10,
        fontSize: 16,
        color: '#6c5ce7',
        fontWeight: '500',
    },
    imagePreview: {
        width: '100%',
        height: 200,
        borderRadius: 10,
        marginTop: 10,
    },
});

export default StoreDetailsScreen;