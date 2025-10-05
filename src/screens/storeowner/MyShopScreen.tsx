import React from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Dimensions,
    Animated,
    Easing,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';


type RootStackParamList = {
    AddProduct: undefined;
    CreateStore: undefined;
    ViewStore: { storeId: number };
    MyStores: undefined;
    // Add your previous screen here if needed
    // Example: Home: undefined;
};

const { width } = Dimensions.get('window');
const buttonWidth = width * 0.8;

const MyShopScreen = () => {
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
    const scaleValue = new Animated.Value(1);
    const opacityValue = new Animated.Value(0);
    const translateYValue = new Animated.Value(30);

    React.useEffect(() => {
        // Entry animation
        Animated.parallel([
            Animated.timing(opacityValue, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(translateYValue, {
                toValue: 0,
                duration: 800,
                easing: Easing.out(Easing.exp),
                useNativeDriver: true,
            })
        ]).start();
    }, []);

    const handlePressIn = () => {
        Animated.spring(scaleValue, {
            toValue: 0.95,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleValue, {
            toValue: 1,
            friction: 3,
            tension: 40,
            useNativeDriver: true,
        }).start();
    };

    const handleGoBack = () => {
        navigation.goBack();
    };

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <LinearGradient
                colors={['#f3f4f6', '#e0e7ff']}
                style={styles.container}
            >
                {/* Back Button */}
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={handleGoBack}
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={24} color="#4f46e5" />
                </TouchableOpacity>

                <Animated.View
                    style={[
                        styles.header,
                        {
                            opacity: opacityValue,
                            transform: [{ translateY: translateYValue }]
                        }
                    ]}
                >
                    <Ionicons name="storefront" size={48} color="#4f46e5" />
                    <Text style={styles.title}>My Shop Dashboard</Text>
                    <Text style={styles.subtitle}>Manage your stores and products</Text>
                </Animated.View>

                <View style={styles.buttonContainer}>
                    <Animated.View
                        style={{
                            opacity: opacityValue,
                            transform: [
                                {
                                    translateY: translateYValue.interpolate({
                                        inputRange: [0, 30],
                                        outputRange: [0, 10]
                                    })
                                }
                            ]
                        }}
                    >
                        <Animated.View
                            style={{
                                transform: [{ scale: scaleValue }]
                            }}
                        >
                            <TouchableOpacity
                                style={[styles.button, styles.myStoresButton]}
                                onPress={() => navigation.navigate('MyStores')}
                                onPressIn={handlePressIn}
                                onPressOut={handlePressOut}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="business" size={24} color="white" style={styles.buttonIcon} />
                                <Text style={styles.buttonText}>My Stores</Text>
                                <Ionicons name="chevron-forward" size={20} color="white" />
                            </TouchableOpacity>
                        </Animated.View>
                    </Animated.View>

                    <View style={styles.spacer} />

                    <Animated.View
                        style={{
                            opacity: opacityValue,
                            transform: [
                                {
                                    translateY: translateYValue.interpolate({
                                        inputRange: [0, 30],
                                        outputRange: [0, 20]
                                    })
                                }
                            ]
                        }}
                    >
                        <Animated.View
                            style={{
                                transform: [{ scale: scaleValue }]
                            }}
                        >
                            <TouchableOpacity
                                style={[styles.button, styles.createStoreButton]}
                                onPress={() => navigation.navigate('CreateStore')}
                                onPressIn={handlePressIn}
                                onPressOut={handlePressOut}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="add-circle" size={24} color="white" style={styles.buttonIcon} />
                                <Text style={styles.buttonText}>Create New Store</Text>
                                <Ionicons name="chevron-forward" size={20} color="white" />
                            </TouchableOpacity>
                        </Animated.View>
                    </Animated.View>
                </View>
            </LinearGradient>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    backButton: {
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 10,
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.7)',
    },
    header: {
        alignItems: 'center',
        marginBottom: 48,
        marginTop: 40, // Added space for back button
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1e293b',
        textAlign: 'center',
        marginTop: 16,
        fontFamily: 'Inter_700Bold',
    },
    subtitle: {
        fontSize: 16,
        color: '#64748b',
        textAlign: 'center',
        marginTop: 8,
        fontFamily: 'Inter_400Regular',
    },
    buttonContainer: {
        width: '100%',
        alignItems: 'center',
    },
    button: {
        width: buttonWidth,
        paddingVertical: 18,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 5,
    },
    myStoresButton: {
        backgroundColor: '#4f46e5',
        borderWidth: 1,
        borderColor: 'rgba(79, 70, 229, 0.2)',
    },
    createStoreButton: {
        backgroundColor: '#7c3aed',
        borderWidth: 1,
        borderColor: 'rgba(124, 58, 237, 0.2)',
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
        fontFamily: 'Inter_600SemiBold',
        flex: 1,
        marginLeft: 16,
    },
    buttonIcon: {
        marginRight: 8,
    },
    spacer: {
        height: 24,
    },
});

export default MyShopScreen;