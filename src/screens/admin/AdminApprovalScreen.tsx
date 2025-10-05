import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '../../lib/supabase';

interface Store {
    id: string;
    name: string;
    address: string;
    status: string;
}

export default function AdminApprovalScreen() {
    const [pendingStores, setPendingStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchPendingStores();
    }, []);

    const fetchPendingStores = async () => {
        setRefreshing(true);
        const { data, error } = await supabase
            .from('stores')
            .select('*')
            .eq('status', 'pending');

        if (error) console.log(error);
        else setPendingStores(data);
        setLoading(false);
        setRefreshing(false);
    };

    const handleApprove = async (storeId: string) => {
        const { error } = await supabase
            .from('stores')
            .update({ status: 'approved' })
            .eq('id', storeId);

        if (!error) {
            setPendingStores(pendingStores.filter(store => store.id !== storeId));
            alert('Store approved successfully!');
        } else {
            alert('Failed to approve the store');
        }
    };

    const handleReject = async (storeId: string) => {
        const { error } = await supabase
            .from('stores')
            .update({ status: 'rejected' })
            .eq('id', storeId);

        if (!error) {
            setPendingStores(pendingStores.filter(store => store.id !== storeId));
            alert('Store rejected successfully!');
        } else {
            alert('Failed to reject the store');
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Pending Approvals</Text>
                <Ionicons name="business" size={24} color="#fff" />
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4A90E2" />
                    <Text style={styles.loadingText}>Loading stores...</Text>
                </View>
            ) : pendingStores.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="file-tray-outline" size={80} color="#ccc" />
                    <Text style={styles.emptyText}>No pending approvals</Text>
                    <Text style={styles.emptySubtext}>All stores have been processed</Text>
                    <TouchableOpacity onPress={fetchPendingStores} style={styles.refreshButton}>
                        <Text style={styles.refreshText}>Refresh</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={pendingStores}
                    keyExtractor={(item) => item.id}
                    refreshing={refreshing}
                    onRefresh={fetchPendingStores}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => (
                        <View style={styles.storeCard}>
                            <View style={styles.storeInfo}>
                                <Text style={styles.storeName}>{item.name}</Text>
                                <View style={styles.addressContainer}>
                                    <Ionicons name="location-sharp" size={16} color="#666" />
                                    <Text style={styles.storeAddress}>{item.address}</Text>
                                </View>
                            </View>
                            <View style={styles.actionsContainer}>
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.approveButton]}
                                    onPress={() => handleApprove(item.id)}
                                >
                                    <Text style={styles.actionText}>Approve</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.rejectButton]}
                                    onPress={() => handleReject(item.id)}
                                >
                                    <Text style={styles.actionText}>Reject</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                />
            )}
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
        padding: 20,
        backgroundColor: '#4A90E2',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
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
    storeName: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#333',
    },
    addressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    storeAddress: {
        fontSize: 14,
        color: '#666',
        marginLeft: 5,
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
});