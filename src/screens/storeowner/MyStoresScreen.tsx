import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    Alert,
    RefreshControl,
    Dimensions,
    Animated,
    Easing,
    ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '../../context/AuthContext';
import { Ionicons, AntDesign, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

type Store = {
    id: string;
    name: string;
    address: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    owner_id: string;
    description?: string;
};

type StoreOwnerStackParamList = {
    StoreDetails: { storeId: string };
    AddProduct: undefined;
    AssignProducts: { storeId: string };
    CreateStore: undefined;
    ManageProduct: { storeId: string };
};

import { supabase } from '../../lib/supabase';

export default function MyStoresScreen() {
    const { user } = useAuth();
    const navigation = useNavigation<StackNavigationProp<StoreOwnerStackParamList>>();

    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [scaleAnim] = useState(new Animated.Value(0.9));
    const [fadeAnim] = useState(new Animated.Value(0));

    const fetchStores = async (retryCount = 0) => {
        if (!user) {
            setError('User not authenticated');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const { data: storesData, error: storesError } = await supabase
                .from('stores')
                .select('*')
                .eq('owner_id', user.id)
                .order('created_at', { ascending: false });

            if (storesError) {
                console.error('Stores fetch error:', storesError);
                throw new Error(`Failed to fetch stores: ${storesError.message}`);
            }

            if (!storesData) {
                throw new Error('No stores data returned');
            }

            setStores(storesData);

            // Animate in the content
            Animated.parallel([
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 600,
                    easing: Easing.out(Easing.back(1.2)),
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                })
            ]).start();
        } catch (err) {
            console.error('Fetch error:', err);

            if (retryCount < 2) {
                setTimeout(() => fetchStores(retryCount + 1), 1000);
                return;
            }

            setError(err instanceof Error ? err.message : 'Failed to fetch data. Please try again later.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchStores();
    };

    useEffect(() => {
        fetchStores();
    }, [user]);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'approved':
                return <Ionicons name="checkmark-circle" size={20} color="#10b981" />;
            case 'pending':
                return <Ionicons name="time-outline" size={20} color="#f59e0b" />;
            case 'rejected':
                return <Ionicons name="close-circle" size={20} color="#ef4444" />;
            default:
                return <Ionicons name="help-circle" size={20} color="#6b7280" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved':
                return '#10b981';
            case 'pending':
                return '#f59e0b';
            case 'rejected':
                return '#ef4444';
            default:
                return '#6b7280';
        }
    };

    const renderStoreItem = ({ item, index }: { item: Store; index: number }) => (
        <Animated.View
            style={[
                styles.storeCard,
                {
                    opacity: fadeAnim,
                    transform: [
                        {
                            scale: scaleAnim.interpolate({
                                inputRange: [0.9, 1],
                                outputRange: [0.9, 1]
                            })
                        },
                        {
                            translateY: fadeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [50, 0]
                            })
                        }
                    ]
                }
            ]}
        >
            <LinearGradient
                colors={['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.storeHeaderGradient}
            >
                <View style={styles.storeHeader}>
                    <View style={styles.storeTitleContainer}>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('StoreDetails', { storeId: item.id })}
                            style={styles.storeNameButton}
                        >
                            <Text style={styles.storeName} numberOfLines={1} ellipsizeMode="tail">
                                {item.name}
                            </Text>
                        </TouchableOpacity>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                            {getStatusIcon(item.status)}
                            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                                {item.status.toUpperCase()}
                            </Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>

            <View style={styles.storeContent}>
                {/* Pending Store Notice */}
                {item.status === 'pending' && (
                    <View style={styles.pendingNoticeCard}>
                        <View style={styles.noticeHeader}>
                            <Ionicons name="alert-circle" size={22} color="#f59e0b" />
                            <Text style={styles.noticeTitle}>Action Required</Text>
                        </View>
                        <Text style={styles.noticeText}>
                            In order to approve your store, you need to upload a picture of your store and complete other store details.
                        </Text>
                        <View style={styles.requirementsList}>
                            <View style={styles.requirementItem}>
                                <Ionicons name="image" size={18} color="#ef4444" />
                                <Text style={styles.requirementTextRequired}>Upload store picture (Required)</Text>
                            </View>
                            <View style={styles.requirementItem}>
                                <Ionicons name="image" size={18} color="#ef4444" />
                                <Text style={styles.requirementTextRequired}>Upload business permit (Required)</Text>
                            </View>
                            <View style={styles.requirementItem}>
                                <Ionicons name="information-circle-outline" size={18} color="#64748b" />
                                <Text style={styles.requirementText}>Complete store details</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.uploadButton}
                            onPress={() => navigation.navigate('StoreDetails', { storeId: item.id })}
                        >
                            <Ionicons name="cloud-upload" size={18} color="white" />
                            <Text style={styles.uploadButtonText}>Upload Details</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.storeInfo}>
                    <Ionicons name="location-outline" size={20} color="#667eea" style={styles.infoIcon} />
                    <Text style={styles.storeAddress} numberOfLines={2}>{item.address}</Text>
                </View>

                {item.description && (
                    <View style={styles.storeInfo}>
                        <Ionicons name="information-circle-outline" size={20} color="#667eea" style={styles.infoIcon} />
                        <Text style={styles.storeDescription} numberOfLines={3}>{item.description}</Text>
                    </View>
                )}

                <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity
                        style={[styles.actionButton, item.status !== 'approved' && styles.disabledButton]}
                        onPress={() => item.status === 'approved' && navigation.navigate('AssignProducts', { storeId: item.id })}
                        disabled={item.status !== 'approved'}
                    >
                        <LinearGradient
                            colors={item.status === 'approved' ? ['#4CAF50', '#2E7D32'] : ['#cbd5e1', '#94a3b8']}
                            style={styles.buttonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <FontAwesome5 name="box-open" size={16} color="white" />
                            <Text style={styles.actionButtonText}>Assign</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, item.status !== 'approved' && styles.disabledButton]}
                        onPress={() => item.status === 'approved' && navigation.navigate('AddProduct')}
                        disabled={item.status !== 'approved'}
                    >
                        <LinearGradient
                            colors={item.status === 'approved' ? ['#FF9800', '#F57C00'] : ['#cbd5e1', '#94a3b8']}
                            style={styles.buttonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <AntDesign name="plus-circle" size={16} color="white" />
                            <Text style={styles.actionButtonText}>Add</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, item.status !== 'approved' && styles.disabledButton]}
                        onPress={() => item.status === 'approved' && navigation.navigate('ManageProduct', { storeId: item.id })}
                        disabled={item.status !== 'approved'}
                    >
                        <LinearGradient
                            colors={item.status === 'approved' ? ['#2196F3', '#1976D2'] : ['#cbd5e1', '#94a3b8']}
                            style={styles.buttonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <MaterialIcons name="edit" size={16} color="white" />
                            <Text style={styles.actionButtonText}>Manage</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </Animated.View>
    );

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            >
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={28} color="white" />
                    </TouchableOpacity>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>My Stores</Text>
                        <Text style={styles.subtitle}>Manage your business locations</Text>
                    </View>
                    <View style={styles.headerRight} />
                </View>
            </LinearGradient>

            {error ? (
                <View style={styles.errorContainer}>
                    <Ionicons name="warning-outline" size={60} color="#ef4444" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={() => fetchStores()}
                    >
                        <LinearGradient
                            colors={['#667eea', '#764ba2']}
                            style={styles.retryButtonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Ionicons name="refresh" size={20} color="white" />
                            <Text style={styles.retryButtonText}>Try Again</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            ) : loading && !refreshing ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#667eea" />
                    <Text style={styles.loadingText}>Loading your stores...</Text>
                </View>
            ) : stores.length === 0 ? (
                <ScrollView
                    contentContainerStyle={styles.emptyContainer}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#667eea']}
                            tintColor="#667eea"
                        />
                    }
                >
                    <Animated.View
                        style={[
                            styles.emptyContent,
                            {
                                opacity: fadeAnim,
                                transform: [{ scale: scaleAnim }]
                            }
                        ]}
                    >
                        <Ionicons name="storefront-outline" size={100} color="#667eea" />
                        <Text style={styles.emptyTitle}>No Stores Yet</Text>
                        <Text style={styles.emptySubtitle}>
                            You haven't created any stores yet. Start by adding your first store to manage products and inventory.
                        </Text>
                        <TouchableOpacity
                            style={styles.addStoreButton}
                            onPress={() => navigation.navigate('CreateStore')}
                        >
                            <LinearGradient
                                colors={['#667eea', '#764ba2']}
                                style={styles.addStoreButtonGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <Ionicons name="add" size={24} color="white" />
                                <Text style={styles.addStoreButtonText}>Create Your First Store</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
                </ScrollView>
            ) : (
                <FlatList
                    data={stores}
                    renderItem={renderStoreItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#667eea']}
                            tintColor="#667eea"
                        />
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    headerGradient: {
        paddingTop: 50,
        paddingBottom: 30,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        padding: 10,
        borderRadius: 20,
    },
    titleContainer: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 10,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: 'white',
        textAlign: 'center',
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 1, height: 2 },
        textShadowRadius: 4,
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 5,
        textAlign: 'center',
    },
    headerRight: {
        width: 48,
    },
    storeCard: {
        backgroundColor: 'white',
        borderRadius: 20,
        marginHorizontal: 10,
        marginBottom: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 8,
    },
    storeHeaderGradient: {
        paddingVertical: 20,
        paddingHorizontal: 25,
    },
    storeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    storeTitleContainer: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    storeNameButton: {
        flex: 1,
        marginRight: 15,
    },
    storeName: {
        fontSize: 22,
        fontWeight: '700',
        color: 'white',
        textShadowColor: 'rgba(0,0,0,0.2)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    storeContent: {
        padding: 25,
    },
    pendingNoticeCard: {
        backgroundColor: '#fef3c7',
        borderLeftWidth: 4,
        borderLeftColor: '#f59e0b',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },
    noticeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    noticeTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#92400e',
        marginLeft: 8,
    },
    noticeText: {
        fontSize: 14,
        color: '#78350f',
        lineHeight: 20,
        marginBottom: 12,
    },
    requirementsList: {
        marginBottom: 12,
    },
    requirementItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        paddingLeft: 4,
    },
    requirementText: {
        fontSize: 13,
        color: '#78350f',
        marginLeft: 10,
    },
    requirementTextRequired: {
        fontSize: 13,
        color: '#ef4444',
        fontWeight: '600',
        marginLeft: 10,
    },
    uploadButton: {
        backgroundColor: '#f59e0b',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginTop: 4,
    },
    uploadButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
        marginLeft: 8,
    },
    storeInfo: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 15,
    },
    infoIcon: {
        marginRight: 12,
        marginTop: 2,
    },
    storeAddress: {
        fontSize: 16,
        color: '#475569',
        flex: 1,
        lineHeight: 22,
    },
    storeDescription: {
        fontSize: 15,
        color: '#64748b',
        flex: 1,
        lineHeight: 21,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
        marginLeft: 5,
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        gap: 10,
    },
    actionButton: {
        flex: 1,
        borderRadius: 15,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 15,
    },
    actionButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
        marginLeft: 8,
    },
    disabledButton: {
        opacity: 0.6,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 20,
        fontSize: 16,
        color: '#64748b',
        fontWeight: '500',
    },
    emptyContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    emptyContent: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#334155',
        marginTop: 20,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 16,
        color: '#64748b',
        marginTop: 10,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 30,
        maxWidth: '80%',
    },
    addStoreButton: {
        borderRadius: 25,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },
    addStoreButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 30,
        paddingVertical: 15,
    },
    addStoreButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
        marginLeft: 10,
    },
    listContainer: {
        paddingBottom: 30,
        paddingTop: 20,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    errorText: {
        color: '#ef4444',
        textAlign: 'center',
        marginVertical: 20,
        fontSize: 16,
        fontWeight: '500',
        maxWidth: '80%',
        lineHeight: 24,
    },
    retryButton: {
        borderRadius: 25,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    retryButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 25,
        paddingVertical: 12,
    },
    retryButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
        marginLeft: 8,
    }
}); 