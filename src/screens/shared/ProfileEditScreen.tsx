import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    TextInput,
    ScrollView,
    ActivityIndicator
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

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const cachedProfile = await AsyncStorage.getItem('profileCache');
            const profileData = cachedProfile ? JSON.parse(cachedProfile) : null;
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
        // Store the avatar index as a string
        const avatarKey = String(avatarIndex + 1); // Using 1-based index to match your require statements

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

            // Update profile in Supabase
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    username: profile.username,
                    address: profile.address,
                    avatar_url: profile.avatar_url
                })
                .eq('id', user.id);

            if (updateError) throw updateError;

            // Update cache
            await AsyncStorage.setItem('profileCache', JSON.stringify(profile));

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

        // Check if it's one of our predefined avatars
        if (avatarMap[avatarUrl as keyof typeof avatarMap]) {
            return avatarMap[avatarUrl as keyof typeof avatarMap];
        }

        // Otherwise treat it as a URI
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

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#7C3AED" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView>
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
                    <Text style={styles.label}>Location</Text>
                    <TextInput
                        style={styles.input}
                        value={profile?.address || ''}
                        onChangeText={(value) => handleInputChange('address', value)}
                        placeholder="Enter your location"
                        multiline
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
            </ScrollView>

            <StyledAlert
                visible={alertVisible}
                title={alertTitle}
                message={alertMessage}
                onClose={() => setAlertVisible(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#e3f2ff79',
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
    label: {
        fontSize: 16,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 8,
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
        top: 5,
        left: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        borderRadius: 50,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
});