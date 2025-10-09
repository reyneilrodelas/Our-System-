import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
    CameraView,
    CameraType,
    useCameraPermissions,
    BarcodeScanningResult,
    BarcodeType,
} from 'expo-camera';
import { useState, useRef, useEffect, useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, AppState, AppStateStatus } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { StyledAlert } from '../components/StyledAlert';
import { CameraOverlay } from '../components/CameraOverlay';
import { supabase } from '../../lib/supabase';

type RootStackParamList = {
    ResultScreen: { productData: any };
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

export default function App() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const isFocused = useIsFocused();
    const [facing, setFacing] = useState<CameraType>('back');
    const [permission, requestPermission] = useCameraPermissions();
    const [torchEnabled, setTorchEnabled] = useState(false);
    const [isScanning, setIsScanning] = useState(true);
    const [scanStatus, setScanStatus] = useState('Scanning...');
    const [hasSuccessfulScan, setHasSuccessfulScan] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertTitle, setAlertTitle] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [cameraKey, setCameraKey] = useState(0);
    const [cameraActive, setCameraActive] = useState(true);
    const torchStateRef = useRef(false); // Use ref to track torch state for preservation
    const [alertType, setAlertType] = useState<'timeout' | 'error'>('timeout'); // Track alert type

    // Function to clear timeout
    const clearScanTimeout = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    // Start timeout for scanning - use ref to avoid stale closures
    const startScanTimeout = useCallback(() => {
        clearScanTimeout();

        timeoutRef.current = setTimeout(() => {
            if (!isFocused) return;

            // Store current torch state from ref (not from closure)
            // torchStateRef.current is already in sync with torchEnabled

            setIsScanning(false);
            setScanStatus('No barcode found - Tap to retry');
            setAlertTitle('Scan Failed');
            setAlertMessage('No barcode detected. Would you like to try again?');
            setAlertType('timeout');
            setAlertVisible(true);
            setCameraActive(true);
        }, SCAN_TIMEOUT);
    }, [clearScanTimeout, isFocused]);

    // Reset function - memoized and simplified
    const resetScanner = useCallback((restoreTorch: boolean = false) => {
        setIsScanning(true);
        setScanStatus('Scanning...');
        setHasSuccessfulScan(false);
        setCameraActive(true);
        setAlertVisible(false);
        clearScanTimeout();

        // Restore torch if needed, otherwise turn off
        if (restoreTorch) {
            setTorchEnabled(torchStateRef.current);
        } else {
            setTorchEnabled(false);
            torchStateRef.current = false;
        }
    }, [clearScanTimeout]);

    const handleRetry = useCallback(() => {
        setAlertVisible(false);

        if (alertType === 'timeout') {
            // For timeout: restore the torch state that was on before timeout
            const savedTorchState = torchStateRef.current;
            setTorchEnabled(savedTorchState);
        } else {
            // For errors: keep current torch state (it was already restored in error handler)
            // Just ensure the ref is in sync
            torchStateRef.current = torchEnabled;
        }

        // Reset scanner state
        setIsScanning(true);
        setScanStatus('Scanning...');
        setHasSuccessfulScan(false);
        setCameraActive(true);
        clearScanTimeout();

        // Reset camera key to force camera refresh
        setCameraKey(prevKey => (prevKey + 1) % 1000);

        // Start new timeout - small delay to ensure state is updated
        setTimeout(() => {
            startScanTimeout();
        }, 100);
    }, [alertType, torchEnabled, clearScanTimeout, startScanTimeout]);

    // Handle app state changes (background/foreground)
    useEffect(() => {
        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active' && isFocused) {
                setCameraActive(true);
                resetScanner();
                startScanTimeout();
            } else if (nextAppState === 'background') {
                setCameraActive(false);
                clearScanTimeout();
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription.remove();
        };
    }, [isFocused, resetScanner, startScanTimeout, clearScanTimeout]);

    // Reset when screen comes into focus
    useEffect(() => {
        if (isFocused) {
            setCameraActive(true);
            resetScanner();
            setCameraKey(prevKey => (prevKey + 1) % 1000);
            startScanTimeout();
        } else {
            setCameraActive(false);
            clearScanTimeout();
            setAlertVisible(false);
        }

        return () => {
            clearScanTimeout();
        };
    }, [isFocused, resetScanner, startScanTimeout, clearScanTimeout]);

    // Sync ref with state
    useEffect(() => {
        torchStateRef.current = torchEnabled;
    }, [torchEnabled]);

    const handleBarcodeScanned = async (result: BarcodeScanningResult) => {
        if (!isScanning || !result?.data || !cameraActive || !isFocused) return;

        // Immediately stop scanning to prevent multiple scans
        setIsScanning(false);
        clearScanTimeout();

        // Check if barcode type is supported
        if (!SUPPORTED_BARCODE_TYPES.includes(result.type as BarcodeType)) {
            setScanStatus('Unsupported barcode');
            setAlertTitle('Unsupported Barcode');
            setAlertMessage(`Type: ${result.type}`);
            setAlertType('error');
            setAlertVisible(true);
            setCameraActive(true);
            return;
        }

        setScanStatus('Barcode scanned - Processing...');
        setHasSuccessfulScan(true);

        // Store current torch state
        const currentTorchState = torchEnabled;
        torchStateRef.current = currentTorchState;

        // Turn off torch during processing
        if (torchEnabled) {
            setTorchEnabled(false);
        }

        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('barcode', result.data)
                .single();

            if (error) {
                setAlertTitle('Product Not Found');
                setAlertMessage('This product is not in our database. Would you like to try again?');
                setAlertType('error');
                setAlertVisible(true);
                console.error('Supabase error:', error);
                setHasSuccessfulScan(false);
                setScanStatus('Product not found');
                setCameraActive(true);
                // Restore torch state
                setTorchEnabled(currentTorchState);
                torchStateRef.current = currentTorchState;
                return;
            }

            // Product found, navigate to results
            clearScanTimeout();
            setCameraActive(false);
            navigation.navigate('ResultScreen', { productData: data });
        } catch (err) {
            console.error('Unexpected error:', err);
            setAlertTitle('Error');
            setAlertMessage('An unexpected error occurred. Please try again.');
            setAlertType('error');
            setAlertVisible(true);
            setHasSuccessfulScan(false);
            setScanStatus('Error occurred');
            setCameraActive(true);
            // Restore torch state
            setTorchEnabled(currentTorchState);
            torchStateRef.current = currentTorchState;
        }
    };

    const toggleCameraFacing = () => {
        setFacing(current => (current === 'back' ? 'front' : 'back'));
    };

    const toggleTorch = () => {
        setTorchEnabled(current => !current);
    };

    const handleBackPress = () => {
        clearScanTimeout();
        navigation.goBack();
    };

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
            {cameraActive ? (
                <CameraView
                    key={`camera-${cameraKey}`}
                    style={styles.camera}
                    facing={facing}
                    enableTorch={torchEnabled}
                    barcodeScannerSettings={{
                        barcodeTypes: SUPPORTED_BARCODE_TYPES,
                    }}
                    onBarcodeScanned={isScanning ? handleBarcodeScanned : undefined}
                >
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={handleBackPress}
                    >
                        <MaterialIcons name="arrow-back" size={28} color="white" />
                    </TouchableOpacity>

                    <CameraOverlay
                        scanStatus={scanStatus}
                        isScanning={isScanning}
                        onScanPress={() => { }}
                        onTorchPress={toggleTorch}
                        onFlipPress={toggleCameraFacing}
                        torchEnabled={torchEnabled}
                        turnOffTorch={() => setTorchEnabled(false)}
                        hasSuccessfulScan={hasSuccessfulScan}
                    />
                </CameraView>
            ) : (
                <View style={styles.cameraPlaceholder}>
                    <Text style={styles.placeholderText}>Camera inactive</Text>
                </View>
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
    cameraPlaceholder: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
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