import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Modal,
    ScrollView,
    Animated,
    TouchableWithoutFeedback,
    Dimensions,
    Alert
} from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../types/navigation';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { emailConfig } from '../../config/emailConfig';
import { getCacheData, setCacheData, CACHE_DURATIONS } from '../../utils/cacheUtils';

const { width, height } = Dimensions.get('window');

interface Store {
    id: string;
    name: string;
    address: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    latitude?: number;
    longitude?: number;
    phone?: string;
    email?: string;
    description?: string;
    owner_id?: string;
}

interface User {
    id: string;
    email: string;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AllStoresScreen() {
    const navigation = useNavigation<NavigationProp>();

    const handleStorePress = (store: Store) => {
        navigation.navigate('StoreOwner', {
            screen: 'StoreDetails',
            params: { storeId: store.id }
        });
    };

    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const [selectedStore, setSelectedStore] = useState<Store | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [page, setPage] = useState(0);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const PAGE_SIZE = 20;
    const fadeAnim = new Animated.Value(0);
    const slideAnim = new Animated.Value(height);

    useEffect(() => {
        setPage(0);
        setStores([]);
        setHasMore(true);
        fetchStores(true);
    }, [filter]);

    const fetchStores = async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
            setPage(0);
        } else {
            setIsLoadingMore(true);
        }

        const currentPage = isRefresh ? 0 : page;
        const cacheKey = `stores_${filter}_page_${currentPage}`;

        // Try cache first (only on non-refresh)
        if (!isRefresh) {
            const cachedData = await getCacheData<Store[]>(cacheKey, CACHE_DURATIONS.MEDIUM);
            if (cachedData) {
                setStores(prev => isRefresh ? cachedData : [...prev, ...cachedData]);
                if (cachedData.length < PAGE_SIZE) {
                    setHasMore(false);
                }
                setIsLoadingMore(false);
                setRefreshing(false);
                return;
            }
        }

        try {
            let query = supabase
                .from('stores')
                .select('id, name, address, status, created_at, latitude, longitude, email, phone')
                .order('created_at', { ascending: false })
                .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

            if (filter !== 'all') {
                query = query.eq('status', filter);
            }

            const { data, error } = await query;

            if (error) {
                console.log('Error fetching stores:', error);
                Alert.alert('Error', 'Failed to fetch stores');
            } else {
                const newData = data || [];
                setStores(prev => isRefresh ? newData : [...prev, ...newData]);

                // Cache this page
                if (newData.length > 0) {
                    await setCacheData(cacheKey, newData);
                }

                // Check if there are more pages
                if (newData.length < PAGE_SIZE) {
                    setHasMore(false);
                } else {
                    setPage(prev => prev + 1);
                }
            }
        } catch (err) {
            console.error('Fetch error:', err);
            Alert.alert('Error', 'Failed to fetch stores');
        } finally {
            setLoading(false);
            setRefreshing(false);
            setIsLoadingMore(false);
        }
    };

    const openModal = (store: Store) => {
        setSelectedStore(store);
        setModalVisible(true);
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            })
        ]).start();
    };

    const closeModal = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: height,
                duration: 300,
                useNativeDriver: true,
            })
        ]).start(() => {
            setModalVisible(false);
            setSelectedStore(null);
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return '#4CAF50';
            case 'rejected': return '#F44336';
            case 'pending': return '#FFC107';
            default: return '#9E9E9E';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'approved': return 'checkmark-circle';
            case 'rejected': return 'close-circle';
            case 'pending': return 'time';
            default: return 'help-circle';
        }
    };

    // IMPROVED: Better email fetching with multiple fallback methods
    const getStoreOwnerEmail = async (ownerId: string): Promise<string | null> => {
        try {
            console.log('🔍 Fetching email for owner ID:', ownerId);

            // Method 1: Try using RPC function (most reliable if set up)
            try {
                const { data: rpcEmail, error: rpcError } = await supabase
                    .rpc('get_user_email', { user_id: ownerId });

                if (!rpcError && rpcEmail) {
                    console.log('✅ Found email via RPC:', rpcEmail);
                    return rpcEmail;
                }
                console.log('⚠️ RPC method failed or unavailable:', rpcError?.message);
            } catch (rpcError) {
                console.log('⚠️ RPC not available:', rpcError);
            }

            // Method 2: Try profiles table with email column
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('email')
                .eq('id', ownerId)
                .single();

            if (!profileError && profileData?.email) {
                console.log('✅ Found email from profiles table:', profileData.email);
                return profileData.email;
            }
            console.log('⚠️ Profile lookup failed:', profileError?.message);

            // Method 3: Try auth.users (requires admin privileges)
            try {
                const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(ownerId);

                if (!authError && user?.email) {
                    console.log('✅ Found email from auth.users:', user.email);
                    return user.email;
                }
                console.log('⚠️ Auth lookup failed:', authError?.message);
            } catch (authError) {
                console.log('⚠️ Auth admin not available:', authError);
            }

            console.error('❌ All email lookup methods failed');
            return null;
        } catch (error) {
            console.error('❌ Error in getStoreOwnerEmail:', error);
            return null;
        }
    };

    // IMPROVED: Better error handling and validation
    const sendStatusEmail = async (storeEmail: string, storeName: string, status: 'approved' | 'rejected') => {
        try {
            console.log('📧 Preparing to send email...');
            console.log('To:', storeEmail);
            console.log('Store:', storeName);
            console.log('Status:', status);

            // Validate email configuration
            if (!emailConfig.RESEND_API_KEY) {
                throw new Error('Missing RESEND_API_KEY in configuration');
            }
            if (!emailConfig.SENDER_EMAIL) {
                throw new Error('Missing SENDER_EMAIL in configuration');
            }

            // Validate recipient email
            if (!storeEmail || !storeEmail.includes('@')) {
                throw new Error('Invalid recipient email address');
            }

            console.log('✅ Email configuration validated');

            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${emailConfig.RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: emailConfig.SENDER_EMAIL,
                    to: storeEmail,
                    subject: `Store Registration ${status === 'approved' ? 'Approved!' : 'Status Update'}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <h2 style="color: ${status === 'approved' ? '#4CAF50' : '#F44336'}">
                                Store Registration ${status.charAt(0).toUpperCase() + status.slice(1)}
                            </h2>
                            <p>Dear Store Owner,</p>
                            <p>We are writing to inform you that your store "<strong>${storeName}</strong>" has been <strong>${status}</strong> by the administrator.</p>
                            ${status === 'approved'
                            ? `<div>
                                    <p>Congratulations! You can now:</p>
                                    <ul>
                                        <li>Access your store dashboard</li>
                                        <li>Add and manage your products</li>
                                        <li>Update your store information</li>
                                        <li>View store analytics</li>
                                    </ul>
                                    <p>Log in to your account to start managing your store!</p>
                                   </div>`
                            : `<div>
                                    <p>Unfortunately, your store registration has been rejected. This could be due to:</p>
                                    <ul>
                                        <li>Incomplete or incorrect information</li>
                                        <li>Unable to verify business credentials</li>
                                        <li>Violation of platform policies</li>
                                    </ul>
                                    <p>For more information about why your store was rejected or to appeal this decision, please contact our administrator at ${emailConfig.ADMIN_EMAIL || 'scanwizard@gmail.com'}.</p>
                                   </div>`
                        }
                            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                                <p>Best regards,<br>The Admin Team</p>
                            </div>
                        </div>
                    `
                })
            });

            console.log('📬 Email API Response Status:', response.status);

            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Email API Error:', errorData);
                throw new Error(errorData.message || `Email API returned status ${response.status}`);
            }

            const responseData = await response.json();
            console.log('✅ Email sent successfully:', responseData);
            return true;
        } catch (error) {
            console.error('❌ Error sending email:', error);
            throw error;
        }
    };

    // IMPROVED: Better status change handling with detailed feedback
    const handleStatusChange = async (storeId: string, newStatus: 'approved' | 'rejected', event?: any) => {
        if (event) {
            event.stopPropagation();
        }

        try {
            console.log('🔄 Starting status change for store:', storeId);

            // First, get the store details
            const { data: storeData, error: storeError } = await supabase
                .from('stores')
                .select('*')
                .eq('id', storeId)
                .single();

            if (storeError || !storeData) {
                console.error('❌ Error fetching store details:', storeError);
                Alert.alert('Error', 'Failed to fetch store details');
                return;
            }

            console.log('✅ Store data retrieved:', {
                name: storeData.name,
                owner_id: storeData.owner_id,
                email: storeData.email
            });

            // Update store status
            const { error: updateError } = await supabase
                .from('stores')
                .update({ status: newStatus })
                .eq('id', storeId);

            if (updateError) {
                console.error('❌ Error updating store status:', updateError);
                Alert.alert('Error', `Failed to ${newStatus} the store`);
                return;
            }

            console.log('✅ Store status updated successfully');

            // Update UI state
            setStores(stores.map(store =>
                store.id === storeId ? { ...store, status: newStatus } : store
            ));

            if (selectedStore && selectedStore.id === storeId) {
                setSelectedStore({ ...selectedStore, status: newStatus });
            }

            // Try to get owner's email and send notification
            let ownerEmail = null;
            let emailSource = '';

            // First try to get owner's email from profiles/auth
            if (storeData.owner_id) {
                ownerEmail = await getStoreOwnerEmail(storeData.owner_id);
                if (ownerEmail) {
                    emailSource = 'owner profile';
                }
            }

            // Fallback to store's direct email
            if (!ownerEmail && storeData.email) {
                ownerEmail = storeData.email;
                emailSource = 'store email';
                console.log('📧 Using store email as fallback:', ownerEmail);
            }

            // Send email notification if we found an email
            if (ownerEmail && ownerEmail.trim() !== '') {
                try {
                    console.log(`📧 Attempting to send email to: ${ownerEmail} (from ${emailSource})`);
                    await sendStatusEmail(ownerEmail, storeData.name, newStatus);

                    Alert.alert(
                        'Success',
                        `Store ${newStatus} successfully!\n\nEmail notification sent to:\n${ownerEmail}`,
                        [{ text: 'OK' }]
                    );
                } catch (emailError: any) {
                    console.error('❌ Email sending error:', emailError);

                    Alert.alert(
                        'Partial Success',
                        `Store status updated to ${newStatus}.\n\nHowever, email notification failed:\n${emailError.message}\n\nPlease check:\n• Resend API key is valid\n• Sender email is verified\n• Recipient email is correct`,
                        [{ text: 'OK' }]
                    );
                }
            } else {
                console.log('⚠️ No email address found for notification');
                Alert.alert(
                    'Success',
                    `Store ${newStatus} successfully!\n\nNote: No email address found for owner notification.\n\nOwner ID: ${storeData.owner_id || 'N/A'}\nStore Email: ${storeData.email || 'N/A'}`,
                    [{ text: 'OK' }]
                );
            }

            // Refresh the stores list
            fetchStores();

        } catch (error: any) {
            console.error('❌ Error in handleStatusChange:', error);
            Alert.alert('Error', `An unexpected error occurred: ${error.message}`);
        }
    };

    const renderStoreItem = ({ item }: { item: Store }) => (
        <TouchableOpacity
            style={styles.storeCard}
            onPress={() => handleStorePress(item)}
            activeOpacity={0.7}
        >
            <View style={styles.storeInfo}>
                <View style={styles.storeHeader}>
                    <Text style={styles.storeName}>{item.name}</Text>
                    <Ionicons
                        name={getStatusIcon(item.status)}
                        size={20}
                        color={getStatusColor(item.status)}
                    />
                </View>
                <View style={styles.addressContainer}>
                    <Ionicons name="location-sharp" size={16} color="#666" />
                    <Text style={styles.storeAddress}>{item.address}</Text>
                </View>
                <View style={styles.statusContainer}>
                    <View style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(item.status) }
                    ]}>
                        <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.dateText}>
                        {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                </View>
            </View>
            {item.status === 'pending' && (
                <View style={styles.actionsContainer}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.approveButton]}
                        onPress={(event) => handleStatusChange(item.id, 'approved', event)}
                    >
                        <Text style={styles.actionText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButton]}
                        onPress={(event) => handleStatusChange(item.id, 'rejected', event)}
                    >
                        <Text style={styles.actionText}>Reject</Text>
                    </TouchableOpacity>
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Header with Back Button */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>All Stores</Text>
                <Ionicons name="business" size={24} color="#fff" />
            </View>

            {/* Filter Buttons */}
            <View style={styles.filterContainer}>
                <TouchableOpacity
                    style={[styles.filterButton, filter === 'all' && styles.activeFilter]}
                    onPress={() => setFilter('all')}
                >
                    <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterButton, filter === 'pending' && styles.activeFilter]}
                    onPress={() => setFilter('pending')}
                >
                    <Text style={[styles.filterText, filter === 'pending' && styles.activeFilterText]}>Pending</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterButton, filter === 'approved' && styles.activeFilter]}
                    onPress={() => setFilter('approved')}
                >
                    <Text style={[styles.filterText, filter === 'approved' && styles.activeFilterText]}>Approved</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterButton, filter === 'rejected' && styles.activeFilter]}
                    onPress={() => setFilter('rejected')}
                >
                    <Text style={[styles.filterText, filter === 'rejected' && styles.activeFilterText]}>Rejected</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4A90E2" />
                    <Text style={styles.loadingText}>Loading stores...</Text>
                </View>
            ) : stores.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="file-tray-outline" size={80} color="#ccc" />
                    <Text style={styles.emptyText}>No stores found</Text>
                    <Text style={styles.emptySubtext}>
                        {filter === 'all'
                            ? 'No stores in the system'
                            : `No ${filter} stores`}
                    </Text>
                    <TouchableOpacity onPress={() => fetchStores(true)} style={styles.refreshButton}>
                        <Text style={styles.refreshText}>Refresh</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={stores}
                    keyExtractor={(item) => item.id}
                    refreshing={refreshing}
                    onRefresh={() => fetchStores(true)}
                    contentContainerStyle={styles.listContent}
                    renderItem={renderStoreItem}
                    onEndReached={() => {
                        if (hasMore && !isLoadingMore && !refreshing) {
                            fetchStores(false);
                        }
                    }}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                        isLoadingMore ? (
                            <View style={styles.loadingFooter}>
                                <ActivityIndicator size="small" color="#4A90E2" />
                            </View>
                        ) : null
                    }
                />
            )}

            {/* Store Details Modal */}
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="none"
                onRequestClose={closeModal}
            >
                <TouchableWithoutFeedback onPress={closeModal}>
                    <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
                        <TouchableWithoutFeedback>
                            <Animated.View style={[styles.modalContent, { transform: [{ translateY: slideAnim }] }]}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Store Details</Text>
                                    <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                                        <Ionicons name="close" size={24} color="#666" />
                                    </TouchableOpacity>
                                </View>

                                {selectedStore ? (
                                    <ScrollView style={styles.detailsContent} showsVerticalScrollIndicator={false}>
                                        {/* Store Basic Info */}
                                        <View style={styles.detailsSection}>
                                            <View style={styles.storeTitleContainer}>
                                                <Text style={styles.detailStoreName}>{selectedStore.name}</Text>
                                                <Ionicons
                                                    name={getStatusIcon(selectedStore.status)}
                                                    size={24}
                                                    color={getStatusColor(selectedStore.status)}
                                                />
                                            </View>
                                            <View style={[styles.statusBadge, styles.detailStatus,
                                            { backgroundColor: getStatusColor(selectedStore.status) }]}>
                                                <Text style={styles.statusText}>{selectedStore.status.toUpperCase()}</Text>
                                            </View>
                                        </View>

                                        {/* Store Address */}
                                        <View style={styles.detailsSection}>
                                            <Text style={styles.sectionTitle}>Address</Text>
                                            <View style={styles.detailRow}>
                                                <Ionicons name="location-sharp" size={18} color="#4A90E2" />
                                                <Text style={styles.detailText}>{selectedStore.address}</Text>
                                            </View>
                                        </View>

                                        {/* Contact Information */}
                                        {(selectedStore.phone || selectedStore.email || selectedStore.owner_id) && (
                                            <View style={styles.detailsSection}>
                                                <Text style={styles.sectionTitle}>Contact Information</Text>
                                                {selectedStore.phone && (
                                                    <View style={styles.detailRow}>
                                                        <Ionicons name="call" size={18} color="#4A90E2" />
                                                        <Text style={styles.detailText}>{selectedStore.phone}</Text>
                                                    </View>
                                                )}
                                                {selectedStore.email && (
                                                    <View style={styles.detailRow}>
                                                        <Ionicons name="mail" size={18} color="#4A90E2" />
                                                        <Text style={styles.detailText}>{selectedStore.email}</Text>
                                                    </View>
                                                )}
                                                {selectedStore.owner_id && (
                                                    <View style={styles.detailRow}>
                                                        <Ionicons name="person" size={18} color="#4A90E2" />
                                                        <Text style={styles.detailText}>Owner ID: {selectedStore.owner_id}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        )}

                                        {/* Description */}
                                        {selectedStore.description && (
                                            <View style={styles.detailsSection}>
                                                <Text style={styles.sectionTitle}>Description</Text>
                                                <Text style={styles.descriptionText}>{selectedStore.description}</Text>
                                            </View>
                                        )}

                                        {/* Store Information */}
                                        <View style={styles.detailsSection}>
                                            <Text style={styles.sectionTitle}>Store Information</Text>
                                            <View style={styles.metadataContainer}>
                                                <View style={styles.metadataItem}>
                                                    <Text style={styles.metadataLabel}>Created</Text>
                                                    <Text style={styles.metadataValue}>
                                                        {new Date(selectedStore.created_at).toLocaleDateString()}
                                                    </Text>
                                                </View>
                                                {selectedStore.latitude && selectedStore.longitude && (
                                                    <View style={styles.metadataItem}>
                                                        <Text style={styles.metadataLabel}>Coordinates</Text>
                                                        <Text style={styles.metadataValue}>
                                                            {selectedStore.latitude.toFixed(4)}, {selectedStore.longitude.toFixed(4)}
                                                        </Text>
                                                    </View>
                                                )}
                                                {selectedStore.owner_id && (
                                                    <View style={styles.metadataItem}>
                                                        <Text style={styles.metadataLabel}>Owner ID</Text>
                                                        <Text style={styles.metadataValue}>{selectedStore.owner_id}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>

                                        {/* Action Buttons for Pending Stores */}
                                        {selectedStore.status === 'pending' && (
                                            <View style={styles.detailsSection}>
                                                <Text style={styles.sectionTitle}>Store Approval</Text>
                                                <View style={styles.modalActions}>
                                                    <TouchableOpacity
                                                        style={[styles.modalActionButton, styles.modalApproveButton]}
                                                        onPress={() => {
                                                            handleStatusChange(selectedStore.id, 'approved');
                                                            closeModal();
                                                        }}
                                                    >
                                                        <Ionicons name="checkmark" size={20} color="#fff" />
                                                        <Text style={styles.modalActionText}>Approve Store</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={[styles.modalActionButton, styles.modalRejectButton]}
                                                        onPress={() => {
                                                            handleStatusChange(selectedStore.id, 'rejected');
                                                            closeModal();
                                                        }}
                                                    >
                                                        <Ionicons name="close" size={20} color="#fff" />
                                                        <Text style={styles.modalActionText}>Reject Store</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        )}

                                        {/* Additional Info for Approved/Rejected Stores */}
                                        {(selectedStore.status === 'approved' || selectedStore.status === 'rejected') && (
                                            <View style={styles.detailsSection}>
                                                <Text style={styles.sectionTitle}>Store Status</Text>
                                                <View style={styles.statusInfoContainer}>
                                                    <Ionicons
                                                        name={getStatusIcon(selectedStore.status)}
                                                        size={24}
                                                        color={getStatusColor(selectedStore.status)}
                                                    />
                                                    <Text style={[styles.statusInfoText, { color: getStatusColor(selectedStore.status) }]}>
                                                        This store has been {selectedStore.status}
                                                    </Text>
                                                </View>
                                            </View>
                                        )}
                                    </ScrollView>
                                ) : null}
                            </Animated.View>
                        </TouchableWithoutFeedback>
                    </Animated.View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7fb',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 30,
        backgroundColor: '#4A90E2',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    backButton: {
        padding: 5,
        marginTop: 10,
    },
    headerTitle: {
        fontSize: 25,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 10,
    },
    filterContainer: {
        flexDirection: 'row',
        padding: 10,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    filterButton: {
        flex: 1,
        padding: 8,
        marginHorizontal: 4,
        borderRadius: 20,
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
    },
    activeFilter: {
        backgroundColor: '#4A90E2',
    },
    filterText: {
        color: '#333',
        fontSize: 14,
        fontWeight: '500',
    },
    activeFilterText: {
        color: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: '#666',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        fontSize: 18,
        color: '#666',
        textAlign: 'center',
        marginTop: 20,
        fontWeight: '600',
    },
    emptySubtext: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        marginTop: 5,
        marginBottom: 20,
    },
    refreshButton: {
        backgroundColor: '#4A90E2',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 5,
    },
    refreshText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    listContent: {
        padding: 15,
    },
    storeCard: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    storeInfo: {
        marginBottom: 10,
    },
    storeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    storeName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
        marginRight: 10,
    },
    addressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    storeAddress: {
        fontSize: 14,
        color: '#666',
        marginLeft: 5,
        flex: 1,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        justifyContent: 'space-between',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    dateText: {
        fontSize: 12,
        color: '#999',
    },
    actionsContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    actionButton: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 5,
        marginLeft: 10,
        minWidth: 80,
        alignItems: 'center',
    },
    approveButton: {
        backgroundColor: '#4CAF50',
    },
    rejectButton: {
        backgroundColor: '#F44336',
    },
    actionText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: height * 0.85,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    closeButton: {
        padding: 5,
    },
    detailsLoading: {
        padding: 40,
        alignItems: 'center',
    },
    detailsLoadingText: {
        marginTop: 10,
        color: '#666',
    },
    detailsContent: {
        padding: 20,
    },
    detailsSection: {
        marginBottom: 25,
    },
    storeTitleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    detailStoreName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
        marginRight: 10,
    },
    detailStatus: {
        alignSelf: 'flex-start',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    detailText: {
        fontSize: 14,
        color: '#666',
        marginLeft: 10,
        flex: 1,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 10,
    },
    statItem: {
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#f8f9fa',
        borderRadius: 10,
        minWidth: 100,
    },
    statNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 5,
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    descriptionText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    metadataContainer: {
        backgroundColor: '#f8f9fa',
        borderRadius: 10,
        padding: 15,
    },
    metadataItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    metadataLabel: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    metadataValue: {
        fontSize: 14,
        color: '#666',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    modalActionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        borderRadius: 10,
        marginHorizontal: 5,
    },
    modalApproveButton: {
        backgroundColor: '#4CAF50',
    },
    modalRejectButton: {
        backgroundColor: '#F44336',
    },
    modalActionText: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 8,
    },
    statusInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        padding: 15,
        borderRadius: 10,
    },
    statusInfoText: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 10,
        textTransform: 'capitalize',
    },
    loadingFooter: {
        paddingVertical: 20,
        alignItems: 'center',
    },
});