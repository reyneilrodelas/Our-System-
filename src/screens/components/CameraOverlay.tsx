import React, { useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    Text,
    Animated,
    Easing
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');

interface CameraOverlayProps {
    scanStatus: string;
    isScanning: boolean;
    onScanPress: () => void;
    onTorchPress: () => void;
    onFlipPress: () => void;
    torchEnabled: boolean;
    turnOffTorch: () => void;
    hasSuccessfulScan: boolean;
}

export const CameraOverlay: React.FC<CameraOverlayProps> = ({
    scanStatus,
    isScanning,
    onScanPress,
    onTorchPress,
    onFlipPress,
    torchEnabled,
    turnOffTorch,
    hasSuccessfulScan,
}) => {
    const scanLineAnim = useRef(new Animated.Value(0)).current;
    const breatheAnim = useRef(new Animated.Value(1)).current;
    const glowAnim = useRef(new Animated.Value(0.6)).current;
    const frameSize = width * 0.72;

    useEffect(() => {
        startAnimations();
    }, []);

    useEffect(() => {
        if (hasSuccessfulScan && torchEnabled) {
            turnOffTorch();
        }
    }, [hasSuccessfulScan, torchEnabled, turnOffTorch]);

    const startAnimations = () => {
        // Smooth scan line animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(scanLineAnim, {
                    toValue: 1,
                    duration: 2800,
                    easing: Easing.bezier(0.4, 0.0, 0.6, 1),
                    useNativeDriver: true,
                }),
                Animated.timing(scanLineAnim, {
                    toValue: 0,
                    duration: 2800,
                    easing: Easing.bezier(0.4, 0.0, 0.6, 1),
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Gentle breathing effect for the frame
        Animated.loop(
            Animated.sequence([
                Animated.timing(breatheAnim, {
                    toValue: 1.02,
                    duration: 2500,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
                Animated.timing(breatheAnim, {
                    toValue: 1,
                    duration: 2500,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Subtle glow effect
        Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnim, {
                    toValue: 1,
                    duration: 2000,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(glowAnim, {
                    toValue: 0.6,
                    duration: 2000,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
            ])
        ).start();
    };

    return (
        <View style={styles.container}>
            {/* Clean header */}
            <View style={styles.header}>
                <Text style={styles.title}>Scanner</Text>
                <View style={styles.statusDot}>
                    <View style={[styles.dot, isScanning && styles.activeDot]} />
                </View>
            </View>

            {/* Elegant control buttons */}
            <View style={styles.controls}>
                <TouchableOpacity
                    style={[styles.controlButton, torchEnabled && styles.activeControl]}
                    onPress={onTorchPress}
                >
                    <MaterialIcons
                        name={torchEnabled ? 'flash-on' : 'flash-off'}
                        size={22}
                        color={torchEnabled ? '#4A90E2' : 'rgba(255,255,255,0.9)'}
                    />
                </TouchableOpacity>

                <TouchableOpacity style={styles.controlButton} onPress={onFlipPress}>
                    <MaterialIcons
                        name="flip-camera-ios"
                        size={22}
                        color="rgba(255,255,255,0.9)"
                    />
                </TouchableOpacity>
            </View>

            {/* Aesthetic scan frame */}
            <View style={styles.scanArea}>
                <Animated.View
                    style={[
                        styles.scanFrame,
                        {
                            transform: [{ scale: breatheAnim }]
                        }
                    ]}
                >
                    {/* Elegant corners */}
                    <View style={[styles.corner, styles.topLeft]} />
                    <View style={[styles.corner, styles.topRight]} />
                    <View style={[styles.corner, styles.bottomLeft]} />
                    <View style={[styles.corner, styles.bottomRight]} />

                    {/* Beautiful scan line */}
                    <Animated.View
                        style={[
                            styles.scanLineWrapper,
                            {
                                opacity: glowAnim,
                                transform: [{
                                    translateY: scanLineAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0, frameSize - 8],
                                    }),
                                }],
                            }
                        ]}
                    >
                        <View style={styles.scanLine} />
                        <View style={styles.scanGlow} />
                    </Animated.View>

                    {/* Subtle inner glow */}
                    <Animated.View
                        style={[
                            styles.innerGlow,
                            {
                                opacity: glowAnim.interpolate({
                                    inputRange: [0.6, 1],
                                    outputRange: [0.1, 0.3],
                                }),
                            }
                        ]}
                    />
                </Animated.View>
            </View>

            {/* Clean status display */}
            <View style={styles.statusArea}>
                <View style={styles.statusContainer}>
                    <MaterialIcons name="qr-code-scanner" size={18} color="#4A90E2" />
                    <Text style={styles.statusText}>{scanStatus}</Text>
                </View>
            </View>

            {/* Simple instruction */}
            <View style={styles.instruction}>
                <Text style={styles.instructionText}>
                    Align QR code within the frame
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        position: 'absolute',
        top: 60,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    title: {
        color: 'white',
        fontSize: 20,
        fontWeight: '600',
        letterSpacing: 1,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
    },
    activeDot: {
        backgroundColor: '#4CAF50',
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
        elevation: 4,
    },
    controls: {
        position: 'absolute',
        top: 50,
        right: 24,
        gap: 16,
    },
    controlButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeControl: {
        backgroundColor: 'rgba(74, 144, 226, 0.2)',
        borderColor: 'rgba(74, 144, 226, 0.4)',
    },
    scanArea: {
        position: 'absolute',
        top: '32%',
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scanFrame: {
        width: width * 0.72,
        height: width * 0.72,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        position: 'relative',
        overflow: 'hidden',
    },
    corner: {
        position: 'absolute',
        width: 32,
        height: 32,
    },
    topLeft: {
        top: -2,
        left: -2,
        borderTopWidth: 4,
        borderLeftWidth: 4,
        borderColor: '#4A90E2',
        borderTopLeftRadius: 20,
    },
    topRight: {
        top: -2,
        right: -2,
        borderTopWidth: 4,
        borderRightWidth: 4,
        borderColor: '#4A90E2',
        borderTopRightRadius: 20,
    },
    bottomLeft: {
        bottom: -2,
        left: -2,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
        borderColor: '#4A90E2',
        borderBottomLeftRadius: 20,
    },
    bottomRight: {
        bottom: -2,
        right: -2,
        borderBottomWidth: 4,
        borderRightWidth: 4,
        borderColor: '#4A90E2',
        borderBottomRightRadius: 20,
    },
    scanLineWrapper: {
        position: 'absolute',
        width: '100%',
        height: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scanLine: {
        width: '100%',
        height: 4,
        backgroundColor: '#FF4444',
        borderRadius: 2,
        shadowColor: '#FF4444',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
        elevation: 8,
    },
    scanGlow: {
        position: 'absolute',
        width: '80%',
        height: 12,     
        borderRadius: 6,
        opacity: 0.4,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 16,
        elevation: 4,
    },
    innerGlow: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 18,
        backgroundColor: 'transparent',
    },
    statusArea: {
        position: 'absolute',
        bottom: 160,
        alignSelf: 'center',
    },
    statusContainer: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 12,
        paddingHorizontal: 20,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    statusText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '500',
    },
    instruction: {
        position: 'absolute',
        bottom: 80,
        alignSelf: 'center',
    },
    instructionText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 14,
        fontWeight: '400',
        textAlign: 'center',
    },
});