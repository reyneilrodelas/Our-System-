import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
    CameraView,
    CameraType,
    useCameraPermissions,
    BarcodeScanningResult,
    BarcodeType,
} from 'expo-camera';
import { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, AppState, AppStateStatus } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { StyledAlert } from '../components/StyledAlert';
import { createClient } from '@supabase/supabase-js';
import { CameraOverlay } from '../components/CameraOverlay';

type RootStackParamList = {
    ResultScreen: { productData: any };
    // Add other screens and their params here if needed
};

const SCAN_TIMEOUT = 20000;
const SUPPORTED_BARCODE_TYPES: BarcodeType[] = [
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
    'upc_a',
];

import { supabase } from '../../lib/supabase';

export default function App() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const isFocused = useIsFocused(); // Hook to check if screen is focused
    const [facing, setFacing] = useState<CameraType>('back');
    const [permission, requestPermission] = useCameraPermissions();
    const [torchEnabled, setTorchEnabled] = useState(false);
    const [isScanning, setIsScanning] = useState(true); // Start scanning automatically
    const [scanStatus, setScanStatus] = useState('Scanning...');
    const [hasSuccessfulScan, setHasSuccessfulScan] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertTitle, setAlertTitle] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [cameraKey, setCameraKey] = useState(0);
    const [cameraActive, setCameraActive] = useState(true);

    // Function to specifically turn off the torch
    const turnOffTorch = () => {
        setTorchEnabled(false);
    };

    // Reset function
    const resetScanner = () => {
        setIsScanning(true); // Keep scanning active
        setScanStatus('Scanning...');
        setFacing('back');
        setTorchEnabled(false);
        setHasSuccessfulScan(false);
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setCameraActive(true); // Ensure camera is active
        startScanTimeout(); // Start the scan timeout immediately
    };

    // Handle app state changes (background/foreground)
    useEffect(() => {
        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                // App came to foreground
                setCameraActive(true);
                resetScanner();
            } else if (nextAppState === 'background') {
                // App went to background
                setCameraActive(false);
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription.remove();
        };
    }, []);

    // Reset when screen comes into focus
    useEffect(() => {
        if (isFocused) {
            // Screen is focused, activate camera and reset
            setCameraActive(true);
            resetScanner();
            // Force camera reset by changing the key
            setCameraKey(prevKey => prevKey + 1);
        } else {
            // Screen is not focused, deactivate camera
            setCameraActive(false);
        }
    }, [isFocused]);

    // Start timeout for scanning
    const startScanTimeout = () => {
        timeoutRef.current = setTimeout(() => {
            setIsScanning(false);
            setScanStatus('No barcode found - Tap to retry');
            setAlertTitle('Scan Failed');
            setAlertMessage('No barcode detected. Would you like to try again?');
            setAlertVisible(true);
        }, SCAN_TIMEOUT);
    };

    const handleRetry = () => {
        setAlertVisible(false);
        setIsScanning(true);
        setScanStatus('Scanning...');
        startScanTimeout();
    };

    const handleBarcodeScanned = async (result: BarcodeScanningResult) => {
        if (!isScanning || !result?.data) return;  // Check if result or result.data is undefined

        // Immediately stop scanning to prevent multiple scans
        setIsScanning(false);
        setCameraActive(false);

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        if (!SUPPORTED_BARCODE_TYPES.includes(result.type as BarcodeType)) {
            setScanStatus('Unsupported barcode');
            setAlertTitle('Unsupported Barcode');
            setAlertMessage(`Type: ${result.type}`);
            setAlertVisible(true);
            setScanStatus('Press Icon to Scan');
            return;
        }

        setScanStatus('Barcode scanned');
        setHasSuccessfulScan(true); // Set successful scan flag

        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('barcode', result.data)
            .single();

        if (error) {
            setAlertTitle('Error');
            setAlertMessage('Product not found. Would you like to try again?');
            setAlertVisible(true);
            console.error('Supabase error:', error);
            setCameraActive(true); // Re-enable camera for retry
            return;
        }

        // Product found, navigate to results
        navigation.navigate('ResultScreen', { productData: data });
    };

    const toggleCameraFacing = () => {
        setFacing(current => (current === 'back' ? 'front' : 'back'));
    };

    const toggleTorch = () => {
        setTorchEnabled(current => !current);
    };

    const handleBackPress = () => {
        navigation.goBack();
    };

    // Ensure permission is granted
    if (!permission) return <View />;
    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={styles.scanText}>We need camera permission</Text>
                <TouchableOpacity onPress={requestPermission} style={styles.iconButton}>
                    <Text style={styles.scanButtonText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {cameraActive && (
                <CameraView
                    key={`camera-${cameraKey}`} // This is the key used to reset the camera
                    style={styles.camera}
                    facing={facing}
                    enableTorch={torchEnabled}
                    barcodeScannerSettings={{
                        barcodeTypes: SUPPORTED_BARCODE_TYPES,
                    }}
                    onBarcodeScanned={isScanning ? handleBarcodeScanned : undefined}
                >
                    {/* Back Button */}
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={handleBackPress}
                    >
                        <MaterialIcons name="arrow-back" size={28} color="white" />
                    </TouchableOpacity>

                    <CameraOverlay
                        scanStatus={scanStatus}
                        isScanning={isScanning}
                        onScanPress={() => {}} // Empty function since we don't need it
                        onTorchPress={toggleTorch}
                        onFlipPress={toggleCameraFacing}
                        torchEnabled={torchEnabled}
                        turnOffTorch={turnOffTorch}
                        hasSuccessfulScan={hasSuccessfulScan}
                    />
                </CameraView>
            )}

            <StyledAlert
                visible={alertVisible}
                title={alertTitle}
                message={alertMessage}
                onClose={() => setAlertVisible(false)}
                onOk={handleRetry}
                confirmText="Retry"
                showCancel={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
    },
    camera: {
        flex: 1,
    },
    backButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 50,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    scanText: {
        position: 'absolute',
        top: '20%',
        alignSelf: 'center',
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 10,
        borderRadius: 5,
    },
    iconButton: {
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 50,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanIconButton: {
        position: 'absolute',
        top: '75%',
        alignSelf: 'center',
        backgroundColor: '#007AFF',
        padding: 20,
        borderRadius: 50,
    },
    scanButtonDisabled: {
        backgroundColor: '#AAAAAA',
    },
    scanButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
});