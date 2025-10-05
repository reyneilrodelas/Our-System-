import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions, Platform } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AdminStackParamList } from '../../types/navigation';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { fontFamily } from '../../Styles/fontFamily';

type AdminDashboardScreenProps = {
    navigation: NativeStackNavigationProp<AdminStackParamList, 'AdminDashboard'>;
};

export default function AdminDashboardScreen({ navigation }: AdminDashboardScreenProps) {
    const [stats, setStats] = useState({
        totalStores: 0,
        pendingApprovals: 0,
        activeStores: 0
    });

    useEffect(() => {
        fetchDashboardStats();
    }, []);

    const fetchDashboardStats = async () => {
        try {
            // Get total stores
            const { count: totalStores } = await supabase
                .from('stores')
                .select('*', { count: 'exact' });

            // Get pending approvals
            const { count: pendingApprovals } = await supabase
                .from('stores')
                .select('*', { count: 'exact' })
                .eq('status', 'pending');

            // Get active stores
            const { count: activeStores } = await supabase
                .from('stores')
                .select('*', { count: 'exact' })
                .eq('status', 'approved');

            setStats({
                totalStores: totalStores || 0,
                pendingApprovals: pendingApprovals || 0,
                activeStores: activeStores || 0
            });
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        }
    };

    return (
        <ScrollView style={styles.scrollView}>
            <LinearGradient
                colors={['#4F46E5', '#7C3AED']}
                style={styles.headerGradient}
            >
                <View style={styles.headerTop}>
                    <TouchableOpacity 
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                    >
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Admin Dashboard</Text>
                    <Text style={styles.headerSubtitle}>Welcome back, Admin</Text>
                </View>
            </LinearGradient>

            <View style={styles.statsContainer}>
                <View style={styles.statsCard}>
                    <View style={styles.statsIconContainer}>
                        <Ionicons name="business" size={24} color="#4F46E5" />
                    </View>
                    <Text style={styles.statsNumber}>{stats.totalStores}</Text>
                    <Text style={styles.statsLabel}>Total Stores</Text>
                </View>

                <View style={styles.statsCard}>
                    <View style={[styles.statsIconContainer, { backgroundColor: '#FEF3C7' }]}>
                        <Ionicons name="time" size={24} color="#D97706" />
                    </View>
                    <Text style={styles.statsNumber}>{stats.pendingApprovals}</Text>
                    <Text style={styles.statsLabel}>Pending Approvals</Text>
                </View>

                <View style={styles.statsCard}>
                    <View style={[styles.statsIconContainer, { backgroundColor: '#DCFCE7' }]}>
                        <Ionicons name="checkmark-circle" size={24} color="#059669" />
                    </View>
                    <Text style={styles.statsNumber}>{stats.activeStores}</Text>
                    <Text style={styles.statsLabel}>Active Stores</Text>
                </View>
            </View>

            <View style={styles.menuContainer}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>

                <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => navigation.navigate("AllStores")}
                >
                    <LinearGradient
                        colors={['#DBEAFE', '#E0F2FE']}
                        style={styles.menuIconContainer}
                    >
                        <MaterialIcons name="dashboard" size={24} color="#2563EB" />
                    </LinearGradient>
                    <View style={styles.menuContent}>
                        <Text style={styles.menuText}>View All Stores</Text>
                        <Text style={styles.menuSubtext}>Manage and monitor stores</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color="#6B7280" />
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    headerGradient: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 40,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        marginTop: 8,
    },
    headerTitle: {
        fontSize: 32,
        color: '#FFFFFF',
        fontFamily: fontFamily.bold,
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#E0E7FF',
        fontFamily: fontFamily.medium,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginTop: -30,
    },
    statsCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 6,
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    statsIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    statsNumber: {
        fontSize: 24,
        fontFamily: fontFamily.bold,
        color: '#1F2937',
        marginBottom: 4,
    },
    statsLabel: {
        fontSize: 12,
        fontFamily: fontFamily.medium,
        color: '#6B7280',
        textAlign: 'center',
    },
    menuContainer: {
        paddingHorizontal: 20,
        paddingTop: 32,
    },
    sectionTitle: {
        fontSize: 20,
        fontFamily: fontFamily.semiBold,
        color: '#1F2937',
        marginBottom: 16,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    menuIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuContent: {
        flex: 1,
        marginLeft: 16,
    },
    menuText: {
        fontSize: 16,
        fontFamily: fontFamily.semiBold,
        color: '#1F2937',
        marginBottom: 4,
    },
    menuSubtext: {
        fontSize: 13,
        fontFamily: fontFamily.regular,
        color: '#6B7280',
    },
});