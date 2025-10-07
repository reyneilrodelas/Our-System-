import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    TextInput,
    ScrollView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Keyboard
} from 'react-native';
import { StyledAlert } from '../components/StyledAlert';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useNavigation } from '@react-navigation/native';

type UserProfile = {
    username: string;
    email: string;
    address: string;
    avatar_url?: string;
    is_admin?: boolean;
};

// Create a mapping between avatar numbers and their actual source
const avatarMap = {
    '1': require('../../assets/images/Avatars/Avatar1.jpg'),
    '2': require('../../assets/images/Avatars/Avatar2.jpg'),
    '3': require('../../assets/images/Avatars/Avatar3.jpg'),
    '4': require('../../assets/images/Avatars/Avatar4.jpg'),
};

export default function ProfileEditScreen() {
    const navigation = useNavigation();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [avatarError, setAvatarError] = useState(false);
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertTitle, setAlertTitle] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    useEffect(() => {
        fetchProfile();

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

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const cachedProfile = await AsyncStorage.getItem('profileCache');
            let profileData = cachedProfile ? JSON.parse(cachedProfile) : null;

            // If address is "No address provided", set it to empty string
            if (profileData && profileData.address === "No address provided") {
                profileData.address = "";
            }

            setProfile(profileData);
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field: keyof UserProfile, value: string) => {
        setProfile(prevProfile => {
            if (prevProfile) {
                return { ...prevProfile, [field]: value };
            }
            return prevProfile;
        });
    };

    const handleAvatarSelect = (avatarIndex: number) => {
        const avatarKey = String(avatarIndex + 1);
        setProfile((prevProfile) => {
            if (prevProfile) {
                const updatedProfile = { ...prevProfile, avatar_url: avatarKey };
                AsyncStorage.setItem('profileCache', JSON.stringify(updatedProfile));
                return updatedProfile;
            }
            return prevProfile;
        });
    };

    const handleBackPress = () => {
        navigation.goBack();
    };

    const handleSave = async () => {
        if (!profile) return;

        setSaving(true);
        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) throw authError || new Error('No user logged in');

            // Prepare data for update - don't save empty address as "No address provided"
            const updateData = {
                username: profile.username,
                avatar_url: profile.avatar_url,
                address: profile.address.trim() || null // Save empty addresses as null
            };

            // Update profile in Supabase
            const { error: updateError } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', user.id);

            if (updateError) throw updateError;

            // Update cache - don't store "No address provided"
            const profileToCache = {
                ...profile,
                address: profile.address.trim() || "" // Store empty string instead of "No address provided"
            };
            await AsyncStorage.setItem('profileCache', JSON.stringify(profileToCache));

            setAlertTitle('Success');
            setAlertMessage('Profile updated successfully');
            setAlertVisible(true);
            navigation.goBack();

        } catch (error) {
            console.error('Error updating profile:', error);
            setAlertTitle('Error');
            setAlertMessage('Failed to update profile');
            setAlertVisible(true);
        } finally {
            setSaving(false);
        }
    };

    const getAvatarSource = (avatarUrl: string | undefined) => {
        if (!avatarUrl) return require('../../assets/images/default.png');

        if (avatarMap[avatarUrl as keyof typeof avatarMap]) {
            return avatarMap[avatarUrl as keyof typeof avatarMap];
        }

        return { uri: avatarUrl };
    };

    const renderPredefinedAvatars = () => {
        return Object.entries(avatarMap).map(([key, avatarSource], index) => (
            <TouchableOpacity
                key={key}
                onPress={() => handleAvatarSelect(index)}
                style={[
                    styles.avatarPreviewContainer,
                    profile?.avatar_url === key && styles.selectedAvatar
                ]}
            >
                <Image source={avatarSource} style={styles.avatarPreview} />
            </TouchableOpacity>
        ));
    };

    // Function to clear the address field
    const clearAddress = () => {
        handleInputChange('address', '');
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#7C3AED" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
        >
            <ScrollView
                contentContainerStyle={[
                    styles.scrollContainer,
                    isKeyboardVisible && styles.scrollContainerKeyboardOpen
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={handleBackPress}
                >
                    <MaterialIcons name="arrow-back" size={28} color="black" />
                </TouchableOpacity>

                <Text style={styles.title}>Edit Profile</Text>

                <View style={styles.profileHeader}>
                    <View style={styles.avatarContainer}>
                        <Image
                            source={getAvatarSource(profile?.avatar_url)}
                            style={styles.avatar}
                        />
                        <TouchableOpacity style={styles.editAvatarButton}>
                            <MaterialIcons name="edit" size={18} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Choose Your Avatar</Text>
                <View style={styles.avatarsContainer}>
                    {renderPredefinedAvatars()}
                </View>

                <View style={styles.formContainer}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Name</Text>
                        <TextInput
                            style={styles.input}
                            value={profile?.username || ''}
                            onChangeText={(value) => handleInputChange('username', value)}
                            placeholder="Enter your name"
                            returnKeyType="next"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={[styles.input, styles.disabledInput]}
                            value={profile?.email || ''}
                            editable={false}
                            placeholder="Email"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <View style={styles.addressHeader}>
                            <Text style={styles.label}>Location</Text>
                            {profile?.address && (
                                <TouchableOpacity onPress={clearAddress} style={styles.clearButton}>
                                    <Text style={styles.clearButtonText}>Clear</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        <TextInput
                            style={styles.input}
                            value={profile?.address || ''}
                            onChangeText={(value) => handleInputChange('address', value)}
                            placeholder="Enter your location"
                            multiline
                            textAlignVertical="top"
                            returnKeyType="default"
                        />
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                    )}
                </TouchableOpacity>

                {/* Add extra space when keyboard is open */}
                {isKeyboardVisible && <View style={styles.keyboardSpacer} />}
            </ScrollView>

            <StyledAlert
                visible={alertVisible}
                title={alertTitle}
                message={alertMessage}
                onClose={() => setAlertVisible(false)}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#e3f2ff79',
    },
    scrollContainer: {
        padding: 20,
        paddingBottom: 30,
    },
    scrollContainerKeyboardOpen: {
        paddingBottom: 100,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 20,
        textAlign: 'center',
        marginTop: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 15,
        marginTop: 10,
    },
    profileHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 10,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: '#EDE9FE',
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
    avatarsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 25,
        flexWrap: 'wrap',
    },
    avatarPreviewContainer: {
        padding: 5,
        borderRadius: 35,
        margin: 5,
    },
    selectedAvatar: {
        backgroundColor: '#EDE9FE',
        borderWidth: 2,
        borderColor: '#7C3AED',
    },
    avatarPreview: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    formContainer: {
        marginBottom: 30,
    },
    inputGroup: {
        marginBottom: 20,
    },
    addressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
        color: '#374151',
    },
    clearButton: {
        backgroundColor: '#EF4444',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    clearButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '500',
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 10,
        padding: 15,
        fontSize: 16,
        color: '#1F2937',
    },
    disabledInput: {
        backgroundColor: '#F3F4F6',
        color: '#6B7280',
    },
    saveButton: {
        backgroundColor: '#7C3AED',
        paddingVertical: 16,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 30,
    },
    saveButtonDisabled: {
        backgroundColor: '#9CA3AF',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    backButton: {
        position: 'absolute',
        top: 40,
        left: 5,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    keyboardSpacer: {
        height: 150,
    },
});