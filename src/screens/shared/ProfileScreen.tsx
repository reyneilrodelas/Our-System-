import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    Animated,
    ScrollView,
    Dimensions,
    PanResponder
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StyledAlert } from '../components/StyledAlert';
import { MaterialIcons, FontAwesome, Ionicons, Feather } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { supabase } from '../../lib/supabase';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { debounce } from 'lodash';

type UserProfile = {
    username: string;
    email: string;
    address: string;
    avatar_url?: string;
    is_admin?: boolean;
};

// Avatar mapping for local assets
const avatarMap = {
    '1': require('../../assets/images/Avatars/Avatar1.jpg'),
    '2': require('../../assets/images/Avatars/Avatar2.jpg'),
    '3': require('../../assets/images/Avatars/Avatar3.jpg'),
    '4': require('../../assets/images/Avatars/Avatar4.jpg'),
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MENU_WIDTH = SCREEN_WIDTH * 0.75;

export default function ProfileScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastFetched, setLastFetched] = useState<number | null>(null);
    const [avatarLoading, setAvatarLoading] = useState(false);
    const [avatarError, setAvatarError] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [aboutExpanded, setAboutExpanded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showLogoutAlert, setShowLogoutAlert] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const menuAnimation = useRef(new Animated.Value(-MENU_WIDTH)).current;
    const overlayOpacity = useRef(new Animated.Value(0)).current;

    // Simple pan responder for swipe to close
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => isMenuOpen,
            onMoveShouldSetPanResponder: () => isMenuOpen,
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dx < 0) {
                    menuAnimation.setValue(Math.max(-MENU_WIDTH, gestureState.dx));
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dx < -50 || gestureState.vx < -0.5) {
                    closeMenu();
                } else {
                    openMenu();
                }
            },
        })
    ).current;

    // Function to hide tab bar
    const hideTabBar = () => {
        const parentNav = navigation.getParent();
        if (parentNav) {
            parentNav.setOptions({
                tabBarStyle: {
                    display: 'none',
                    backgroundColor: '#ffffff',
                    height: 70,
                    borderTopWidth: 0,
                    paddingBottom: 10,
                    paddingTop: 10,
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 12,
                    elevation: 10,
                    position: 'absolute',
                }
            });
        }
    };

    // Function to show tab bar
    const showTabBar = () => {
        const parentNav = navigation.getParent();
        if (parentNav) {
            parentNav.setOptions({
                tabBarStyle: {
                    display: 'flex',
                    backgroundColor: '#ffffff',
                    height: 70,
                    borderTopWidth: 0,
                    paddingBottom: 10,
                    paddingTop: 10,
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 12,
                    elevation: 10,
                    position: 'absolute',
                }
            });
        }
    };

    const toggleMenu = () => {
        if (isMenuOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    };

    const openMenu = () => {
        setIsMenuOpen(true);
        hideTabBar(); // Hide tab bar when opening menu
        Animated.parallel([
            Animated.timing(menuAnimation, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(overlayOpacity, {
                toValue: 0.5,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const closeMenu = () => {
        Animated.parallel([
            Animated.timing(menuAnimation, {
                toValue: -MENU_WIDTH,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(overlayOpacity, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setIsMenuOpen(false);
            showTabBar(); // Show tab bar when closing menu
        });
    };

    // Helper function to get the correct avatar source
    const getAvatarSource = (avatarUrl: string | undefined) => {
        if (!avatarUrl) return require('../../assets/images/default.png');
        if (avatarMap[avatarUrl as keyof typeof avatarMap]) {
            return avatarMap[avatarUrl as keyof typeof avatarMap];
        }
        return { uri: avatarUrl };
    };

    const toggleAbout = () => {
        setAboutExpanded(!aboutExpanded);
    };

    const cacheProfile = async (profileData: UserProfile) => {
        try {
            await AsyncStorage.setItem('profileCache', JSON.stringify(profileData));
        } catch (error) {
            console.error('Caching failed:', error);
        }
    };

    const getCachedProfile = async () => {
        try {
            const cached = await AsyncStorage.getItem('profileCache');
            return cached ? JSON.parse(cached) as UserProfile : null;
        } catch (error) {
            console.error('Cache read failed:', error);
            return null;
        }
    };

    const fetchProfile = async (force = false) => {
        try {
            setLoading(true);
            setError(null);

            if (force) {
                setRefreshKey(prev => prev + 1);
            }

            if (!force) {
                const cachedProfile = await getCachedProfile();
                if (cachedProfile) {
                    setProfile(cachedProfile);
                }
            }

            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) throw authError || new Error('No user logged in');

            const { data, error: profileError } = await supabase
                .from('profiles')
                .select('username, address, avatar_url, is_admin')
                .eq('id', user.id)
                .single();

            if (profileError) throw profileError;

            const profileData = {
                username: data.username || 'User',
                email: user.email || '',
                address: data.address || 'No address provided',
                avatar_url: data.avatar_url,
                is_admin: data.is_admin || false
            };

            setProfile(profileData);
            await cacheProfile(profileData);
            setLastFetched(Date.now());
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            console.error('Profile fetch error:', error);
            setError(errorMessage);
        } finally {
            setLoading(false);
            setAvatarLoading(false);
        }
    };

    const debouncedFetch = useRef(
        debounce(async (force: boolean) => {
            await fetchProfile(force);
        }, 500)
    ).current;

    useEffect(() => {
        const now = Date.now();
        const refreshed = (route as any)?.params?.refreshed;

        if (!lastFetched || refreshed || (lastFetched && now - lastFetched > 30000)) {
            debouncedFetch(!!refreshed);
        }

        return () => debouncedFetch.cancel();
    }, [(route as any)?.params?.refreshed]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            fetchProfile(true);
        });
        return unsubscribe;
    }, [navigation]);

    // Cleanup: ensure tab bar is shown when component unmounts
    useEffect(() => {
        return () => {
            showTabBar(); // Ensure tab bar is shown when leaving screen
        };
    }, [navigation]);

    const handleLogout = async () => {
        setShowLogoutAlert(true);
    };

    const performLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            setError(error.message);
        } else {
            navigation.replace('Login');
        }
        setShowLogoutAlert(false);
    };

    const handleShopPress = async () => {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (user) {
            navigation.navigate('StoreOwner', { screen: 'MyShop' });
        } else {
            console.log('User not logged in.');
        }
    };

    const handleEditProfile = () => {
        navigation.navigate('EditProfile');
    };

    // FIXED: Type-safe navigation
    const handleMenuNavigation = (screen: 'AboutUs' | 'ContactUs') => {
        closeMenu();
        setTimeout(() => {
            // Navigate to Root Stack screens (outside tab navigator)
            if (screen === 'AboutUs') {
                navigation.navigate('AboutUs');
            } else if (screen === 'ContactUs') {
                navigation.navigate('ContactUs');
            }
        }, 100);
    };

    // Alternative method if you prefer a more generic approach
    const handleMenuNavigationAlt = (screen: string) => {
        closeMenu();
        setTimeout(() => {
            // Use type assertion for dynamic screen names
            navigation.navigate(screen as any);
        }, 100);
    };

    if (loading && !profile) {
        return (
            <LinearGradient
                colors={['#f8faff', '#e8f2ff', '#dce7ff', '#f0e6ff']}
                style={styles.gradientContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <SafeAreaView style={styles.safeAreaContainer} edges={['top']}>
                    <View style={styles.mainContainer}>
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#7C3AED" />
                        </View>
                    </View>
                </SafeAreaView>
            </LinearGradient>
        );
    }

    if (error && !profile) {
        return (
            <LinearGradient
                colors={['#f8faff', '#e8f2ff', '#dce7ff', '#f0e6ff']}
                style={styles.gradientContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <SafeAreaView style={styles.safeAreaContainer} edges={['top']}>
                    <View style={styles.mainContainer}>
                        <View style={[styles.container, styles.errorContainer]}>
                            <Text style={styles.errorText}>{error}</Text>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.retryButton]}
                                onPress={() => fetchProfile(true)}
                            >
                                <Text style={styles.actionButtonText}>Try Again</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </LinearGradient>
        );
    }

    return (
        <LinearGradient
            colors={['#f8faff', '#e8f2ff', '#dce7ff', '#f0e6ff']}
            style={styles.gradientContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            <SafeAreaView style={styles.safeAreaContainer} edges={['top']}>
                <View style={styles.mainContainer}>
                    <StyledAlert
                        visible={showLogoutAlert}
                        title="Log Out"
                        message="Are you sure you want to log out?"
                        onOk={performLogout}
                        onClose={() => setShowLogoutAlert(false)}
                    />

                    <ScrollView
                        contentContainerStyle={styles.container}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Profile Header */}
                        <View style={styles.profileHeader}>
                            <View style={styles.avatarContainer}>
                                <Image
                                    key={`avatar-${refreshKey}`}
                                    source={getAvatarSource(profile?.avatar_url)}
                                    style={styles.avatar}
                                    resizeMode="cover"
                                    onLoadStart={() => setAvatarLoading(true)}
                                    onLoadEnd={() => setAvatarLoading(false)}
                                    onError={() => setAvatarError(true)}
                                />
                                {avatarLoading && (
                                    <ActivityIndicator
                                        style={styles.avatarLoadingIndicator}
                                        color="#7C3AED"
                                        size="large"
                                    />
                                )}
                                <TouchableOpacity
                                    style={styles.editAvatarButton}
                                    onPress={handleEditProfile}
                                >
                                    <MaterialIcons name="edit" size={18} color="#fff" />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.username}>{profile?.username}</Text>
                            <Text style={styles.email}>{profile?.email}</Text>
                        </View>

                        {/* User Info Card */}
                        <View style={styles.infoCard}>
                            <View style={styles.infoItem}>
                                <MaterialIcons name="location-on" size={20} color="#7C3AED" />
                                <Text style={styles.infoText}>{profile?.address || 'No address provided'}</Text>
                            </View>
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.actionsContainer}>
                            {profile?.is_admin && (
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.adminButton]}
                                    onPress={() => navigation.navigate('AdminDashboard')}
                                >
                                    <MaterialIcons name="admin-panel-settings" size={20} color="#fff" />
                                    <Text style={styles.actionButtonText}>Admin Dashboard</Text>
                                </TouchableOpacity>
                            )}

                            {profile?.is_admin ? null : (
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.shopButton]}
                                    onPress={handleShopPress}
                                >
                                    <FontAwesome name="shopping-bag" size={20} color="#fff" />
                                    <Text style={styles.actionButtonText}>My Shop</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={[styles.actionButton, styles.logoutButton]}
                                onPress={handleLogout}
                            >
                                <Ionicons name="log-out-outline" size={20} color="#fff" />
                                <Text style={styles.actionButtonText}>Log Out</Text>
                            </TouchableOpacity>
                        </View>

                        {/* About Section */}
                        <View style={styles.aboutContainer}>
                            <TouchableOpacity
                                style={styles.aboutHeader}
                                onPress={toggleAbout}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.sectionTitle}>About this app</Text>
                                <MaterialIcons
                                    name={aboutExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                                    size={24}
                                    color="#7C3AED"
                                />
                            </TouchableOpacity>

                            {aboutExpanded && (
                                <View style={styles.aboutContent}>
                                    <Text style={styles.aboutText}>
                                        Tired of searching multiple stores for products? ScanWizard solves this by combining barcode scanning with intelligent location tracking. Simply scan an item, set your distance preference, and instantly find which nearby stores have what you're looking for.
                                    </Text>
                                </View>
                            )}
                        </View>
                    </ScrollView>

                    {/* Overlay */}
                    {isMenuOpen && (
                        <Animated.View
                            style={[
                                styles.overlay,
                                { opacity: overlayOpacity }
                            ]}
                        >
                            <TouchableOpacity
                                style={StyleSheet.absoluteFill}
                                activeOpacity={1}
                                onPress={closeMenu}
                            />
                        </Animated.View>
                    )}

                    {/* Side Menu */}
                    <Animated.View
                        style={[
                            styles.menuContainer,
                            {
                                transform: [{ translateX: menuAnimation }],
                            },
                        ]}
                        {...panResponder.panHandlers}
                    >
                        {/* Menu Header */}
                        <View style={styles.menuHeader}>
                            <View style={styles.menuAvatarContainer}>
                                <Image
                                    source={getAvatarSource(profile?.avatar_url)}
                                    style={styles.menuAvatar}
                                    resizeMode="cover"
                                />
                            </View>
                            <View style={styles.menuUserInfo}>
                                <Text style={styles.menuUsername}>{profile?.username}</Text>
                                <Text style={styles.menuEmail}>{profile?.email}</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.closeMenuButton}
                                onPress={closeMenu}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <MaterialCommunityIcons name="menu-left" size={30} color="white" />
                            </TouchableOpacity>
                        </View>

                        {/* Menu Items */}
                        <View style={styles.menuItems}>
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => handleMenuNavigation('AboutUs')}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.menuIconContainer, { backgroundColor: 'rgba(124, 58, 237, 0.2)' }]}>
                                    <MaterialIcons name="info" size={22} color="#7C3AED" />
                                </View>
                                <Text style={styles.menuItemText}>About Us</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => handleMenuNavigation('ContactUs')}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.menuIconContainer, { backgroundColor: 'rgba(124, 58, 237, 0.2)' }]}>
                                    <MaterialIcons name="contact-support" size={22} color="#7C3AED" />
                                </View>
                                <Text style={styles.menuItemText}>Contact Us</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Menu Footer */}
                        <View style={styles.menuFooter}>
                            <Text style={styles.menuFooterText}>ScanWizard v1.3</Text>
                        </View>
                    </Animated.View>

                    {/* Hamburger Menu Button */}
                    <TouchableOpacity
                        style={styles.menuButton}
                        onPress={toggleMenu}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <View style={styles.menuButtonInner}>
                            <Ionicons name="menu-sharp" size={28} color="black" />
                        </View>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradientContainer: {
        flex: 1,
    },
    safeAreaContainer: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    mainContainer: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    menuButton: {
        position: 'absolute',
        top: 10,
        left: 10,
        zIndex: 99,
    },
    menuButtonInner: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#000',
        zIndex: 100,
    },
    menuContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: MENU_WIDTH,
        backgroundColor: '#1a1a2e',
        zIndex: 101,
        borderTopRightRadius: 20,
        borderBottomRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 2,
            height: 0,
        },
        shadowOpacity: 0.25,
        shadowRadius: 5,
        elevation: 10,
    },
    menuHeader: {
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 25,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuAvatarContainer: {
        marginRight: 12,
    },
    menuAvatar: {
        width: 45,
        height: 45,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: '#7C3AED',
    },
    menuUserInfo: {
        flex: 1,
    },
    menuUsername: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    menuEmail: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
    },
    closeMenuButton: {
        padding: 4,
    },
    menuItems: {
        paddingVertical: 15,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 20,
        marginHorizontal: 10,
        marginVertical: 2,
        borderRadius: 10,
    },
    menuIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    menuItemText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '500',
        flex: 1,
    },
    menuFooter: {
        position: 'absolute',
        bottom: 30,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    menuFooterText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
    },
    container: {
        flexGrow: 1,
        padding: 16,
        paddingBottom: 100,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        color: '#EF4444',
        fontSize: 16,
        marginBottom: 20,
        textAlign: 'center',
    },
    profileHeader: {
        alignItems: 'center',
        marginBottom: 24,
        marginTop: 10,
        paddingHorizontal: 16,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: '#EDE9FE',
    },
    avatarLoadingIndicator: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    editAvatarButton: {
        position: 'absolute',
        right: 0,
        bottom: 0,
        backgroundColor: '#7C3AED',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    username: {
        fontSize: 24,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    email: {
        fontSize: 16,
        color: '#6B7280',
    },
    infoCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    infoText: {
        fontSize: 16,
        color: '#374151',
        marginLeft: 12,
    },
    actionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 8,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 10,
        minWidth: '48%',
        flex: 1,
    },
    shopButton: {
        backgroundColor: '#7C3AED',
    },
    adminButton: {
        backgroundColor: '#10B981',
    },
    logoutButton: {
        backgroundColor: '#EF4444',
    },
    retryButton: {
        backgroundColor: '#7C3AED',
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
        marginLeft: 8,
    },
    aboutContainer: {
        marginBottom: 24,
    },
    aboutHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#EDE9FE',
        padding: 16,
        borderRadius: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#7C3AED',
    },
    aboutContent: {
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
    },
    aboutText: {
        fontSize: 15,
        lineHeight: 22,
        color: '#4B5563',
    },
});