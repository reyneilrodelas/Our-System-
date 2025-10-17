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
    FlatList,
} from 'react-native';
import { StyledAlert } from '../components/StyledAlert';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { decode as atob } from 'base-64';
import { getCacheData, setCacheData, CACHE_DURATIONS } from '../../utils/cacheUtils';
import { useAuth } from '../../context/AuthContext';

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
    id: string;
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
    permit_images?: string[]; // Changed to array
};

type RootStackParamList = {
    StoreDetails: { storeId: number };
};

const { width: screenWidth } = Dimensions.get('window');

const StoreDetailsScreen = () => {
    const navigation = useNavigation();
    const route = useRoute<RouteProp<RootStackParamList, 'StoreDetails'>>();
    const { user } = useAuth();
    const { storeId } = route.params;
    const [store, setStore] = useState<Store | null>(null);
    const [loading, setLoading] = useState(true);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [permitImageUrls, setPermitImageUrls] = useState<string[]>([]); // Changed to array
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '',
        address: '',
        description: '',
        image: null as string | null,
        permitImages: [] as string[] // Changed to array
    });
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertTitle, setAlertTitle] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [imageViewerVisible, setImageViewerVisible] = useState(false);
    const [currentImage, setCurrentImage] = useState<string | null>(null);

    useEffect(() => {
        const fetchStoreDetails = async () => {
            try {
                const { data, error } = await supabase
                    .from('stores')
                    .select('*')
                    .eq('id', storeId)
                    .single();

                if (error) throw error;
                setStore(data);
                setEditForm({
                    name: data.name,
                    address: data.address,
                    description: data.description || '',
                    image: data.image_url || null,
                    permitImages: data.permit_images || []
                });

                if (data.image_url) {
                    const { data: imageData } = await supabase
                        .storage
                        .from('store-images')
                        .getPublicUrl(data.image_url);
                    setImageUrl(imageData.publicUrl);
                }

                // Load multiple permit images
                if (data.permit_images && Array.isArray(data.permit_images)) {
                    const permitUrls = await Promise.all(
                        data.permit_images.map(async (permitPath: string) => {
                            const { data: permitData } = await supabase
                                .storage
                                .from('store-images')
                                .getPublicUrl(permitPath);
                            return permitData.publicUrl;
                        })
                    );
                    setPermitImageUrls(permitUrls);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchStoreDetails();
    }, [storeId]);

    const pickImage = async (imageType: 'store' | 'permit') => {
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
            aspect: [4, 3],
            quality: 0.8,
            exif: false,
            allowsMultipleSelection: imageType === 'permit', // Allow multiple for permits
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            if (imageType === 'store') {
                const uri = result.assets[0].uri;
                setImageUrl(uri);
                setEditForm(prev => ({ ...prev, image: uri }));
            } else {
                // Add multiple permit images
                const newPermitUris = result.assets.map(asset => asset.uri);
                setEditForm(prev => ({
                    ...prev,
                    permitImages: [...prev.permitImages, ...newPermitUris]
                }));
            }
        }
    };

    const removePermitImage = (index: number) => {
        setEditForm(prev => ({
            ...prev,
            permitImages: prev.permitImages.filter((_, i) => i !== index)
        }));
    };

    const uploadImage = async (uri: string) => {
        try {
            if (!store?.id) {
                throw new Error('Store ID is required for uploading images');
            }

            const manipulatedImage = await ImageManipulator.manipulateAsync(
                uri,
                [{ resize: { width: 1200 } }],
                {
                    compress: 0.8,
                    format: ImageManipulator.SaveFormat.JPEG,
                    base64: true
                }
            );

            if (!manipulatedImage.base64) {
                throw new Error('Failed to process image');
            }

            const timestamp = Date.now().toString();
            const random = Math.random().toString(36).substring(7);
            const fileName = `store_${store.id}_${timestamp}_${random}.jpg`;
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
            permit_images?: string[];
        } = {
            name: editForm.name.trim(),
            address: editForm.address.trim(),
            description: editForm.description.trim()
        };

        try {
            // Upload store image
            if (editForm.image && editForm.image !== store.image_url) {
                const fileName = await uploadImage(editForm.image);
                if (!fileName) throw new Error('Failed to get uploaded file name');
                updatedFields.image_url = fileName;
            }

            // Upload multiple permit images
            const uploadedPermitNames: string[] = [];
            const existingPermits = store.permit_images || [];

            // Parallelize permit uploads instead of sequential
            const permitUploadPromises = editForm.permitImages.map(async (permitUri) => {
                if (permitUri.startsWith('file://') || permitUri.startsWith('content://')) {
                    return await uploadImage(permitUri);
                } else {
                    const existingFileName = existingPermits.find(path =>
                        permitUri.includes(path)
                    );
                    return existingFileName || null;
                }
            });

            const permitResults = await Promise.all(permitUploadPromises);
            uploadedPermitNames.push(...permitResults.filter((name) => name !== null));

            if (uploadedPermitNames.length > 0) {
                updatedFields.permit_images = uploadedPermitNames;
            }

            // Update database
            const { data, error } = await supabase
                .from('stores')
                .update(updatedFields)
                .eq('id', store.id)
                .select();

            if (error) throw error;
            if (!data || data.length === 0) throw new Error('No data returned after update');

            // Update local state immediately
            setStore({ ...store, ...updatedFields });
            setEditModalVisible(false);

            // Show success message immediately (no wait for image URLs)
            setAlertTitle('Success');
            setAlertMessage('Store updated successfully');
            setAlertVisible(true);

            // Fetch image URLs in background (don't await - let it happen asynchronously)
            updateImageUrlsInBackground(updatedFields);

            // Update cache in background
            if (user) {
                updateStoreInCache(updatedFields);
            }
        } catch (err: any) {
            console.error('Store update error:', err);
            setAlertTitle('Error');
            setAlertMessage(err.message || 'Failed to update store. Please try again.');
            setAlertVisible(true);
        }
    };

    const updateImageUrlsInBackground = async (updatedFields: any) => {
        try {
            // Update store image URL
            if (updatedFields.image_url) {
                const { data: imageData } = await supabase
                    .storage
                    .from('store-images')
                    .getPublicUrl(updatedFields.image_url);
                if (imageData) setImageUrl(imageData.publicUrl);
            }

            // Update permit image URLs in parallel
            if (updatedFields.permit_images && updatedFields.permit_images.length > 0) {
                const permitUrls = await Promise.all(
                    updatedFields.permit_images.map(async (permitPath: string) => {
                        const { data: permitData } = await supabase
                            .storage
                            .from('store-images')
                            .getPublicUrl(permitPath);
                        return permitData.publicUrl;
                    })
                );
                setPermitImageUrls(permitUrls);
            }
        } catch (err) {
            console.error('Error updating image URLs in background:', err);
        }
    };

    const updateStoreInCache = async (updatedFields: any) => {
        try {
            const cacheKey = `user_stores_${user?.id}`;
            const cachedStores = await getCacheData<any[]>(cacheKey, CACHE_DURATIONS.MEDIUM);
            
            if (cachedStores) {
                // Update the store in cache
                const updatedCachedStores = cachedStores.map(s =>
                    s.id === store?.id ? { ...s, ...updatedFields } : s
                );
                await setCacheData(cacheKey, updatedCachedStores);
            }
        } catch (err) {
            console.error('Error updating cache:', err);
        }
    };

    const handleDeleteStore = async () => {
        try {
            // Delete from database
            const { error: storeError } = await supabase
                .from('stores')
                .delete()
                .eq('id', storeId);

            if (storeError) throw storeError;

            // Update cache to remove deleted store
            if (user) {
                const cacheKey = `user_stores_${user.id}`;
                const cachedStores = await getCacheData<any[]>(cacheKey, CACHE_DURATIONS.MEDIUM);
                
                if (cachedStores) {
                    // Filter out the deleted store
                    const updatedStores = cachedStores.filter(store => store.id !== storeId);
                    // Update the cache
                    await setCacheData(cacheKey, updatedStores);
                }
            }

            setDeleteModalVisible(false);
            
            // Navigate back with success notification
            setTimeout(() => {
                navigation.goBack();
                setAlertTitle('Success');
                setAlertMessage('Store deleted successfully');
                setAlertVisible(true);
            }, 300);
        } catch (err) {
            console.error('Delete store error:', err);
            setAlertTitle('Error');
            setAlertMessage('Failed to delete store');
            setAlertVisible(true);
        }
    };

    const openImageViewer = (imageUri: string) => {
        setCurrentImage(imageUri);
        setImageViewerVisible(true);
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
                    style={styles.errorBackButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.errorBackButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.headerBackButton}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Store Details</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Store Image */}
                <View style={styles.imageSection}>
                    {imageUrl ? (
                        <TouchableOpacity
                            style={styles.storeImageContainer}
                            onPress={() => openImageViewer(imageUrl)}
                            activeOpacity={0.9}
                        >
                            <Image
                                source={{ uri: imageUrl }}
                                style={styles.storeImage}
                                resizeMode="cover"
                            />
                            <View style={styles.imageOverlay}>
                                <View style={styles.imageBadge}>
                                    <Ionicons name="expand" size={14} color="#fff" />
                                    <Text style={styles.imageBadgeText}>Tap to enlarge</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.imagePlaceholder}>
                            <View style={styles.placeholderContent}>
                                <Ionicons name="storefront" size={60} color="#b2bec3" />
                                <Text style={styles.placeholderText}>No Store Image</Text>
                                <Text style={styles.placeholderSubtext}>Add a photo in edit mode</Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* Content Container */}
                <View style={styles.contentContainer}>
                    {/* Store Name */}
                    <View style={styles.nameSection}>
                        <Text style={styles.storeName}>{store.name}</Text>
                        <View style={styles.statusBadge}>
                            <View style={[styles.statusDot, store.status === 'active' && styles.statusDotActive]} />
                            <Text style={styles.statusText}>{store.status || 'Pending'}</Text>
                        </View>
                    </View>

                    {/* Address Section */}
                    <View style={styles.infoCard}>
                        <View style={styles.infoHeader}>
                            <View style={styles.iconCircle}>
                                <Ionicons name="location" size={18} color="#6c5ce7" />
                            </View>
                            <Text style={styles.infoTitle}>Address</Text>
                        </View>
                        <Text style={styles.infoContent}>{store.address}</Text>
                    </View>

                    {/* Description Section */}
                    {store.description && (
                        <View style={styles.infoCard}>
                            <View style={styles.infoHeader}>
                                <View style={styles.iconCircle}>
                                    <Ionicons name="information-circle" size={18} color="#6c5ce7" />
                                </View>
                                <Text style={styles.infoTitle}>About</Text>
                            </View>
                            <Text style={styles.infoContent}>{store.description}</Text>
                        </View>
                    )}

                    {/* Business Permits Section - Multiple Images */}
                    <View style={styles.infoCard}>
                        <View style={styles.infoHeader}>
                            <View style={styles.iconCircle}>
                                <Ionicons name="document-text" size={18} color="#6c5ce7" />
                            </View>
                            <Text style={styles.infoTitle}>Business Permits</Text>
                            {permitImageUrls.length > 0 && (
                                <View style={styles.permitCount}>
                                    <Text style={styles.permitCountText}>{permitImageUrls.length}</Text>
                                </View>
                            )}
                        </View>
                        {permitImageUrls.length > 0 ? (
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.permitScrollView}
                            >
                                {permitImageUrls.map((url, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={styles.permitPreviewItem}
                                        onPress={() => openImageViewer(url)}
                                        activeOpacity={0.8}
                                    >
                                        <Image
                                            source={{ uri: url }}
                                            style={styles.permitImageThumbnail}
                                            resizeMode="cover"
                                        />
                                        <View style={styles.permitOverlay}>
                                            <Ionicons name="eye" size={20} color="#fff" />
                                        </View>
                                        <View style={styles.permitNumber}>
                                            <Text style={styles.permitNumberText}>{index + 1}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        ) : (
                            <View style={styles.noPermitBox}>
                                <Ionicons name="document-outline" size={40} color="#b2bec3" />
                                <Text style={styles.noPermitText}>No permits uploaded</Text>
                            </View>
                        )}
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionSection}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.editButton]}
                            onPress={() => setEditModalVisible(true)}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="create-outline" size={20} color="#fff" />
                            <Text style={styles.actionButtonText}>Edit Store</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.deleteButton]}
                            onPress={() => setDeleteModalVisible(true)}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="trash-outline" size={20} color="#fff" />
                            <Text style={styles.actionButtonText}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* Image Viewer Modal */}
            <Modal
                visible={imageViewerVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setImageViewerVisible(false)}
            >
                <View style={styles.imageViewerContainer}>
                    <TouchableOpacity
                        style={styles.imageViewerClose}
                        onPress={() => setImageViewerVisible(false)}
                    >
                        <Ionicons name="close" size={28} color="#fff" />
                    </TouchableOpacity>
                    {currentImage && (
                        <Image
                            source={{ uri: currentImage }}
                            style={styles.fullScreenImage}
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>

            {/* Edit Modal */}
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
                            <TouchableOpacity
                                onPress={() => setEditModalVisible(false)}
                                style={styles.modalClose}
                            >
                                <Ionicons name="close" size={24} color="#636e72" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.modalScroll}
                            contentContainerStyle={styles.modalScrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Store Name *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter store name"
                                    placeholderTextColor="#b2bec3"
                                    value={editForm.name}
                                    onChangeText={(text) => setEditForm({ ...editForm, name: text })}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Address *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter store address"
                                    placeholderTextColor="#b2bec3"
                                    value={editForm.address}
                                    onChangeText={(text) => setEditForm({ ...editForm, address: text })}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Description</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Enter store description"
                                    placeholderTextColor="#b2bec3"
                                    value={editForm.description}
                                    onChangeText={(text) => setEditForm({ ...editForm, description: text })}
                                    multiline
                                    numberOfLines={4}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Store Image</Text>
                                <TouchableOpacity
                                    style={styles.imagePickerButton}
                                    onPress={() => pickImage('store')}
                                >
                                    <Ionicons name="camera" size={22} color="#6c5ce7" />
                                    <Text style={styles.imagePickerText}>
                                        {editForm.image ? 'Change Image' : 'Upload Image'}
                                    </Text>
                                </TouchableOpacity>
                                {editForm.image && (
                                    <View style={styles.imagePreviewBox}>
                                        <Image
                                            source={{ uri: editForm.image }}
                                            style={styles.imagePreview}
                                            resizeMode="cover"
                                        />
                                        <View style={styles.imageCheck}>
                                            <Ionicons name="checkmark-circle" size={28} color="#00b894" />
                                        </View>
                                    </View>
                                )}
                            </View>

                            <View style={styles.inputGroup}>
                                <View style={styles.permitHeader}>
                                    <Text style={styles.inputLabel}>Business Permits</Text>
                                    {editForm.permitImages.length > 0 && (
                                        <View style={styles.permitCountBadge}>
                                            <Text style={styles.permitCountBadgeText}>
                                                {editForm.permitImages.length}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                                <TouchableOpacity
                                    style={styles.imagePickerButton}
                                    onPress={() => pickImage('permit')}
                                >
                                    <Ionicons name="document" size={22} color="#6c5ce7" />
                                    <Text style={styles.imagePickerText}>
                                        {editForm.permitImages.length > 0 ? 'Add More Permits' : 'Upload Permits'}
                                    </Text>
                                </TouchableOpacity>
                                {editForm.permitImages.length > 0 && (
                                    <View style={styles.permitImagesGrid}>
                                        {editForm.permitImages.map((uri, index) => (
                                            <View key={index} style={styles.permitGridItem}>
                                                <Image
                                                    source={{ uri }}
                                                    style={styles.permitGridImage}
                                                    resizeMode="cover"
                                                />
                                                <TouchableOpacity
                                                    style={styles.removePermitButton}
                                                    onPress={() => removePermitImage(index)}
                                                >
                                                    <Ionicons name="close-circle" size={24} color="#ff7675" />
                                                </TouchableOpacity>
                                                <View style={styles.permitIndexBadge}>
                                                    <Text style={styles.permitIndexText}>{index + 1}</Text>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
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
                                style={[
                                    styles.modalButton,
                                    styles.saveButton,
                                    (!editForm.name || !editForm.address) && styles.disabledButton
                                ]}
                                onPress={handleUpdateStore}
                                disabled={!editForm.name || !editForm.address}
                            >
                                <Text style={styles.saveButtonText}>Save Changes</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={deleteModalVisible}
                onRequestClose={() => setDeleteModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.deleteModalContainer}>
                        <View style={styles.deleteModalContent}>
                            <View style={styles.deleteIconBox}>
                                <Ionicons name="warning" size={48} color="#ff7675" />
                            </View>
                            <Text style={styles.deleteModalTitle}>Delete Store?</Text>
                            <Text style={styles.deleteModalText}>
                                This action cannot be undone. All products and data associated with this store will be permanently deleted.
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
                                style={[styles.modalButton, styles.confirmDeleteButton]}
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
        backgroundColor: '#f8f9fa',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#636e72',
        fontWeight: '500',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        padding: 20,
    },
    errorText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#2d3436',
        marginTop: 16,
        marginBottom: 24,
    },
    errorBackButton: {
        backgroundColor: '#6c5ce7',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    errorBackButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 45,
        paddingBottom: 16,
        backgroundColor: '#6c5ce7',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    headerBackButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
    },
    headerSpacer: {
        width: 40,
    },

    // ScrollView
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 24,
    },

    // Image Section
    imageSection: {
        backgroundColor: '#fff',
    },
    storeImageContainer: {
        width: '100%',
        height: 280,
        position: 'relative',
    },
    storeImage: {
        width: '100%',
        height: '100%',
    },
    imageOverlay: {
        position: 'absolute',
        bottom: 12,
        right: 12,
    },
    imageBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    imageBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },
    imagePlaceholder: {
        width: '100%',
        height: 200,
        backgroundColor: '#e9ecef',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderContent: {
        alignItems: 'center',
    },
    placeholderText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#636e72',
        marginTop: 12,
    },
    placeholderSubtext: {
        fontSize: 14,
        color: '#b2bec3',
        marginTop: 4,
    },

    // Content Container
    contentContainer: {
        padding: 20,
        backgroundColor: '#fff',
    },

    // Name Section
    nameSection: {
        marginBottom: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    storeName: {
        fontSize: 26,
        fontWeight: '700',
        color: '#2d3436',
        marginBottom: 8,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: '#f8f9fa',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#097100ff',
        marginRight: 6,
    },
    statusDotActive: {
        backgroundColor: '#00b894',
    },
    statusText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#636e72',
        textTransform: 'capitalize',
    },

    // Info Cards
    infoCard: {
        marginBottom: 16,
        padding: 16,
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    infoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    iconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    infoTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#2d3436',
    },
    infoContent: {
        fontSize: 15,
        color: '#636e72',
        lineHeight: 22,
    },

    // Permit Section - Multiple Images
    permitCount: {
        marginLeft: 'auto',
        backgroundColor: '#6c5ce7',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    permitCountText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    permitScrollView: {
        marginTop: 12,
    },
    permitPreviewItem: {
        marginRight: 12,
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
    },
    permitImageThumbnail: {
        width: 140,
        height: 180,
    },
    permitOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    permitNumber: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: '#6c5ce7',
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    permitNumberText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    noPermitBox: {
        marginTop: 12,
        padding: 24,
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#dfe6e9',
        borderStyle: 'dashed',
        alignItems: 'center',
    },
    noPermitText: {
        fontSize: 14,
        color: '#b2bec3',
        marginTop: 8,
    },

    // Action Section
    actionSection: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 14,
        borderRadius: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    editButton: {
        backgroundColor: '#6c5ce7',
    },
    deleteButton: {
        backgroundColor: '#ff7675',
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
        marginLeft: 6,
    },

    // Image Viewer Modal
    imageViewerContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageViewerClose: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 20,
    },
    fullScreenImage: {
        width: screenWidth,
        height: '80%',
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContainer: {
        width: '90%',
        maxHeight: '85%',
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#2d3436',
    },
    modalClose: {
        padding: 4,
    },
    modalScroll: {
        maxHeight: 400,
    },
    modalScrollContent: {
        padding: 20,
    },

    // Input Styles
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2d3436',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#dfe6e9',
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        color: '#2d3436',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
        paddingTop: 12,
    },

    // Image Picker
    imagePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#6c5ce7',
        borderRadius: 10,
        paddingVertical: 14,
        borderStyle: 'dashed',
    },
    imagePickerText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#6c5ce7',
        marginLeft: 8,
    },
    imagePreviewBox: {
        marginTop: 12,
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
    },
    imagePreview: {
        width: '100%',
        height: 140,
    },
    imageCheck: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#fff',
        borderRadius: 14,
    },

    // Permit Images Grid
    permitHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    permitCountBadge: {
        marginLeft: 8,
        backgroundColor: '#6c5ce7',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    permitCountBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    permitImagesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 12,
        gap: 8,
    },
    permitGridItem: {
        width: '48%',
        aspectRatio: 3 / 4,
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
    },
    permitGridImage: {
        width: '100%',
        height: '100%',
    },
    removePermitButton: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: '#fff',
        borderRadius: 12,
    },
    permitIndexBadge: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        backgroundColor: 'rgba(108, 92, 231, 0.9)',
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    permitIndexText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },

    // Modal Footer
    modalFooter: {
        flexDirection: 'row',
        gap: 12,
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#e9ecef',
    },
    modalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#dfe6e9',
    },
    cancelButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#636e72',
    },
    saveButton: {
        backgroundColor: '#6c5ce7',
    },
    saveButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
    },
    disabledButton: {
        backgroundColor: '#b2bec3',
        opacity: 0.6,
    },

    // Delete Modal
    deleteModalContainer: {
        width: '85%',
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
    },
    deleteModalContent: {
        padding: 24,
        alignItems: 'center',
    },
    deleteIconBox: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#fff5f5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    deleteModalTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#2d3436',
        marginBottom: 12,
    },
    deleteModalText: {
        fontSize: 15,
        color: '#636e72',
        textAlign: 'center',
        lineHeight: 22,
    },
    confirmDeleteButton: {
        backgroundColor: '#ff7675',
    },
    deleteButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
    },
});

export default StoreDetailsScreen;