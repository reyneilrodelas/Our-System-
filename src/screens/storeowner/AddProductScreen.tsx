import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Keyboard
} from 'react-native';
import { StyledAlert } from '../../screens/components/StyledAlert';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { createClient } from '@supabase/supabase-js';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { BarcodeScanningResult } from 'expo-camera';

// Set up Supabase
import { supabase } from '../../lib/supabase';

// Category options
const CATEGORIES = [
    'School Supplies',
    'Food & Beverages',
    'Hygiene & Personal Care',
    'Cosmetics',
    'Household Supplies',
    'Motorcycle Accessories & Parts'
];

export default function AddProductScreen() {
    const [productName, setProductName] = useState('');
    const [productBarcode, setProductBarcode] = useState('');
    const [productDescription, setProductDescription] = useState('');
    const [productCategory, setProductCategory] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [messageType, setMessageType] = useState<'success' | 'error' | null>(null);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertTitle, setAlertTitle] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [alertCallback, setAlertCallback] = useState<(() => void) | undefined>();
    const [showScanner, setShowScanner] = useState(false);
    const [torchOn, setTorchOn] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [pendingProduct, setPendingProduct] = useState<any>(null);
    const navigation = useNavigation();
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const scrollViewRef = React.useRef<ScrollView>(null);
    const descriptionInputRef = React.useRef<TextInput>(null);

    useEffect(() => {
        // Request camera permissions when component mounts
        if (!permission) {
            (async () => {
                await requestPermission();
            })();
        }

        // Keyboard listeners
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            () => {
                setKeyboardVisible(true);
            }
        );
        const keyboardDidHideListener = Keyboard.addListener(
            'keyboardDidHide',
            () => {
                setKeyboardVisible(false);
            }
        );

        return () => {
            keyboardDidHideListener.remove();
            keyboardDidShowListener.remove();
        };
    }, []);

    useEffect(() => {
        // Turn off torch when scanner is closed
        if (!showScanner) {
            setTorchOn(false);
        }
    }, [showScanner]);

    // Auto-scroll to description input when focused
    const handleDescriptionFocus = () => {
        if (scrollViewRef.current) {
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    };

    const showAlert = (title: string, message: string, callback?: () => void, showCancel: boolean = false) => {
        setAlertTitle(title);
        setAlertMessage(message);
        setAlertCallback(() => callback);
        setAlertVisible(true);
    };

    const handleBarCodeScanned = (scanningResult: BarcodeScanningResult) => {
        const { data } = scanningResult;
        setProductBarcode(data);
        setShowScanner(false);
        showAlert('Barcode Scanned', `Successfully scanned barcode: ${data}`);
    };

    const toggleTorch = () => {
        setTorchOn(prev => !prev);
    };

    const checkProductExists = async (barcode: string): Promise<boolean> => {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('id, name')
                .eq('barcode', barcode.trim())
                .single();

            if (error && error.code !== 'PGRST116') {
                // PGRST116 is "not found" error, which is expected
                console.error('Error checking product:', error);
                return false;
            }

            return !!data; // Returns true if product exists, false otherwise
        } catch (error) {
            console.error('Error checking product existence:', error);
            return false;
        }
    };

    const handleAddProduct = async () => {
        // Validate inputs
        if (!productName || !productBarcode || !productDescription || !productCategory) {
            showAlert('Error', 'Please fill in all fields');
            return;
        }

        setIsLoading(true);
        setMessage('');
        setMessageType(null);

        try {
            // Check if product already exists
            const productExists = await checkProductExists(productBarcode);

            if (productExists) {
                showAlert(
                    'Product Already Exists',
                    'A product with this barcode already exists in the database. Please use a different barcode or update the existing product.',
                    undefined,
                    false
                );
                return;
            }

            // Store the product data for confirmation
            const productData = {
                name: productName.trim(),
                barcode: productBarcode.trim(),
                description: productDescription.trim(),
                category: productCategory,
            };

            setPendingProduct(productData);
            setShowConfirmation(true);

        } catch (error) {
            console.error('Error checking product:', error);
            showAlert('Error', 'Failed to check product existence. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const confirmAddProduct = async () => {
        if (!pendingProduct) return;

        setIsLoading(true);
        setShowConfirmation(false);

        try {
            const { error } = await supabase.from('products').insert([pendingProduct]);

            if (error) throw error;

            showAlert('Success', 'Product added successfully!', () => {
                // Reset form
                setProductName('');
                setProductBarcode('');
                setProductDescription('');
                setProductCategory('');
                setPendingProduct(null);
            });

        } catch (error) {
            console.error('Error adding product:', error);
            showAlert('Error', error instanceof Error ? error.message : 'Failed to add product');
        } finally {
            setIsLoading(false);
            setPendingProduct(null);
        }
    };

    const cancelAddProduct = () => {
        setShowConfirmation(false);
        setPendingProduct(null);
    };

    const renderCategoryItem = ({ item }: { item: string }) => (
        <TouchableOpacity
            style={styles.categoryItem}
            onPress={() => {
                setProductCategory(item);
                setShowCategoryModal(false);
            }}
        >
            <Text style={styles.categoryItemText}>{item}</Text>
        </TouchableOpacity>
    );

    if (showScanner) {
        return (
            <View style={styles.cameraContainer}>
                <CameraView
                    style={styles.camera}
                    enableTorch={torchOn}
                    onBarcodeScanned={handleBarCodeScanned}
                    barcodeScannerSettings={{
                        barcodeTypes: [
                            'aztec',
                            'ean13',
                            'ean8',
                            'qr',
                            'pdf417',
                            'upc_e',
                            'datamatrix',
                            'code39',
                            'code93',
                            'itf14',
                            'codabar',
                            'code128',
                            'upc_a'
                        ],
                    }}
                />
                <View style={styles.overlay}>
                    <View style={styles.overlayTop}>
                        <Text style={styles.overlayText}>Align the barcode within the frame to scan</Text>
                    </View>
                    <View style={styles.middleContainer}>
                        <View style={styles.unfocusedContainer}></View>
                        <View style={styles.focusedContainer}>
                            <View style={styles.cornerTopLeft}></View>
                            <View style={styles.cornerTopRight}></View>
                            <View style={styles.cornerBottomLeft}></View>
                            <View style={styles.cornerBottomRight}></View>
                        </View>
                        <View style={styles.unfocusedContainer}></View>
                    </View>
                    <View style={styles.overlayBottom}>
                        <TouchableOpacity
                            style={[styles.torchButton, torchOn && styles.torchButtonActive]}
                            onPress={toggleTorch}
                        >
                            <Ionicons
                                name={torchOn ? "flash" : "flash-off"}
                                size={28}
                                color={torchOn ? "#FFD700" : "white"}
                            />
                        </TouchableOpacity>
                    </View>
                </View>
                <TouchableOpacity
                    style={styles.closeScannerButton}
                    onPress={() => setShowScanner(false)}
                >
                    <Ionicons name="close" size={30} color="white" />
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
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

            {/* Confirmation Modal */}
            <Modal
                visible={showConfirmation}
                transparent={true}
                animationType="fade"
                onRequestClose={cancelAddProduct}
            >
                <View style={styles.confirmationModalContainer}>
                    <View style={styles.confirmationModalContent}>
                        <View style={styles.confirmationHeader}>
                            <Ionicons name="warning" size={40} color="#f39c12" />
                            <Text style={styles.confirmationTitle}>Confirm Add Product</Text>
                        </View>

                        <Text style={styles.confirmationMessage}>
                            Are you sure you want to add this product to the database?
                        </Text>

                        {pendingProduct && (
                            <View style={styles.productPreview}>
                                <Text style={styles.previewLabel}>Product Details:</Text>
                                <Text style={styles.previewText}><Text style={styles.previewBold}>Name:</Text> {pendingProduct.name}</Text>
                                <Text style={styles.previewText}><Text style={styles.previewBold}>Barcode:</Text> {pendingProduct.barcode}</Text>
                                <Text style={styles.previewText}><Text style={styles.previewBold}>Category:</Text> {pendingProduct.category}</Text>
                                <Text style={styles.previewText}><Text style={styles.previewBold}>Description:</Text> {pendingProduct.description}</Text>
                            </View>
                        )}

                        <View style={styles.confirmationButtons}>
                            <TouchableOpacity
                                style={[styles.confirmationButton, styles.cancelButton]}
                                onPress={cancelAddProduct}
                                disabled={isLoading}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmationButton, styles.confirmButton]}
                                onPress={confirmAddProduct}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.confirmButtonText}>Add Product</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <LinearGradient
                colors={['#6c5ce7', '#0984e3']}
                style={styles.headerGradient}
            >
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add New Product</Text>
                <Text style={styles.headerSubtitle}>Fill in the product details</Text>
            </LinearGradient>

            <ScrollView
                ref={scrollViewRef}
                contentContainerStyle={[
                    styles.scrollContainer,
                    isKeyboardVisible && styles.scrollContainerKeyboardOpen
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Product Name *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter product name"
                        placeholderTextColor="#999"
                        value={productName}
                        onChangeText={setProductName}
                        returnKeyType="next"
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Barcode *</Text>
                    <View style={styles.barcodeContainer}>
                        <TextInput
                            style={[styles.input, styles.barcodeInput]}
                            placeholder="Enter barcode number or scan"
                            placeholderTextColor="#999"
                            value={productBarcode}
                            onChangeText={setProductBarcode}
                            keyboardType="numeric"
                            returnKeyType="next"
                        />
                        <TouchableOpacity
                            style={styles.scanButton}
                            onPress={() => setShowScanner(true)}
                        >
                            <MaterialCommunityIcons name="barcode-scan" size={24} color="black" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Category *</Text>
                    <TouchableOpacity
                        style={styles.categorySelector}
                        onPress={() => setShowCategoryModal(true)}
                    >
                        <Text style={productCategory ? styles.categorySelectedText : styles.categoryPlaceholder}>
                            {productCategory || 'Select a category'}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color="#666" />
                    </TouchableOpacity>
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Description *</Text>
                    <TextInput
                        ref={descriptionInputRef}
                        style={[styles.input, styles.descriptionInput]}
                        placeholder="Enter product description"
                        placeholderTextColor="#999"
                        value={productDescription}
                        onChangeText={setProductDescription}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        onFocus={handleDescriptionFocus}
                        returnKeyType="default"
                    />
                </View>

                {message && (
                    <View style={[
                        styles.messageContainer,
                        messageType === 'success' && styles.successMessage,
                        messageType === 'error' && styles.errorMessage
                    ]}>
                        <Ionicons
                            name={messageType === 'success' ? "checkmark-circle" : "warning"}
                            size={20}
                            color="#fff"
                        />
                        <Text style={styles.messageText}>{message}</Text>
                    </View>
                )}

                <TouchableOpacity
                    style={[
                        styles.submitButton,
                        (!productName || !productBarcode || !productDescription || !productCategory) &&
                        styles.disabledButton
                    ]}
                    onPress={handleAddProduct}
                    disabled={!productName || !productBarcode || !productDescription || !productCategory || isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="add-circle" size={20} color="#fff" />
                            <Text style={styles.submitButtonText}>Add Product</Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* Add extra space when keyboard is open */}
                {isKeyboardVisible && <View style={styles.keyboardSpacer} />}
            </ScrollView>

            <Modal
                visible={showCategoryModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowCategoryModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Category</Text>
                        <FlatList
                            data={CATEGORIES}
                            renderItem={renderCategoryItem}
                            keyExtractor={(item) => item}
                        />
                        <TouchableOpacity
                            style={styles.modalCloseButton}
                            onPress={() => setShowCategoryModal(false)}
                        >
                            <Text style={styles.modalCloseText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f6fa',
    },
    cameraContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    camera: {
        flex: 1,
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlayTop: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    overlayBottom: {
        flex: 1,
        width: '100%',
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    unfocusedContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    middleContainer: {
        flexDirection: 'row',
        width: '100%',
        height: 200,
    },
    focusedContainer: {
        flex: 6,
        borderWidth: 2,
        borderColor: 'white',
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cornerTopLeft: {
        position: 'absolute',
        top: -2,
        left: -2,
        width: 20,
        height: 20,
        borderLeftWidth: 4,
        borderTopWidth: 4,
        borderColor: '#6c5ce7',
        borderRadius: 2,
    },
    cornerTopRight: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 20,
        height: 20,
        borderRightWidth: 4,
        borderTopWidth: 4,
        borderColor: '#6c5ce7',
        borderRadius: 2,
    },
    cornerBottomLeft: {
        position: 'absolute',
        bottom: -2,
        left: -2,
        width: 20,
        height: 20,
        borderLeftWidth: 4,
        borderBottomWidth: 4,
        borderColor: '#6c5ce7',
        borderRadius: 2,
    },
    cornerBottomRight: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 20,
        height: 20,
        borderRightWidth: 4,
        borderBottomWidth: 4,
        borderColor: '#6c5ce7',
        borderRadius: 2,
    },
    closeScannerButton: {
        position: 'absolute',
        top: 40,
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 20,
        padding: 5,
    },
    torchButton: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 25,
        padding: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    torchButtonActive: {
        backgroundColor: 'rgba(255,215,0,0.2)',
        borderColor: '#FFD700',
    },
    barcodeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    barcodeInput: {
        flex: 1,
        marginRight: 10,
    },
    scanButton: {
        backgroundColor: '#ffffffff',
        padding: 15,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlayText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
    },
    headerGradient: {
        paddingVertical: 25,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginTop: 18,
    },
    headerSubtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
        marginTop: 5,
    },
    scrollContainer: {
        paddingHorizontal: 20,
        paddingBottom: 30,
    },
    scrollContainerKeyboardOpen: {
        paddingBottom: 100, // Extra padding when keyboard is open
    },
    formGroup: {
        marginBottom: 20,
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    categorySelector: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#dfe6e9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    categoryPlaceholder: {
        color: '#999',
        fontSize: 16,
    },
    categorySelectedText: {
        color: '#2d3436',
        fontSize: 16,
    },
    descriptionInput: {
        minHeight: 120,
        textAlignVertical: 'top',
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#6c5ce7',
        padding: 16,
        borderRadius: 10,
        marginTop: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    disabledButton: {
        backgroundColor: '#b2bec3',
    },
    submitButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
        marginLeft: 10,
    },
    messageContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderRadius: 10,
        marginVertical: 15,
    },
    successMessage: {
        backgroundColor: '#00b894',
    },
    errorMessage: {
        backgroundColor: '#e74c3c',
    },
    messageText: {
        color: '#fff',
        marginLeft: 10,
        fontSize: 14,
        flex: 1,
    },
    backButton: {
        position: 'absolute',
        left: 20,
        top: 30,
        padding: 10,
        zIndex: 1,
        marginTop: 15,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        width: '80%',
        maxHeight: '60%',
    },
    categoryItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    categoryItemText: {
        fontSize: 16,
    },
    modalCloseButton: {
        marginTop: 15,
        padding: 10,
        backgroundColor: '#6c5ce7',
        borderRadius: 5,
        alignItems: 'center',
    },
    modalCloseText: {
        color: 'white',
        fontWeight: 'bold',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    // Confirmation Modal Styles
    confirmationModalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: 20,
    },
    confirmationModalContent: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 25,
        width: '90%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    confirmationHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    confirmationTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2d3436',
        marginTop: 10,
        textAlign: 'center',
    },
    confirmationMessage: {
        fontSize: 16,
        color: '#636e72',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 22,
    },
    productPreview: {
        backgroundColor: '#f8f9fa',
        borderRadius: 10,
        padding: 15,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    previewLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2d3436',
        marginBottom: 10,
    },
    previewText: {
        fontSize: 14,
        color: '#636e72',
        marginBottom: 5,
        lineHeight: 18,
    },
    previewBold: {
        fontWeight: '600',
        color: '#2d3436',
    },
    confirmationButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 15,
    },
    confirmationButton: {
        flex: 1,
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: '#e9ecef',
        borderWidth: 1,
        borderColor: '#dee2e6',
    },
    confirmButton: {
        backgroundColor: '#6c5ce7',
    },
    cancelButtonText: {
        color: '#495057',
        fontSize: 16,
        fontWeight: '600',
    },
    confirmButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    keyboardSpacer: {
        height: 50, // Extra space when keyboard is open
    },
});