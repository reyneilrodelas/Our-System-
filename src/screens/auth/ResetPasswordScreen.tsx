import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { RootStackParamList } from '../../types/navigation';
import { fontFamily } from '../../Styles/fontFamily';
import { StyledAlert } from '../components/StyledAlert';

type Props = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;

export default function ResetPasswordScreen({ route, navigation }: Props) {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [styledAlertVisible, setStyledAlertVisible] = useState(false);
    const [styledAlertTitle, setStyledAlertTitle] = useState('');
    const [styledAlertMessage, setStyledAlertMessage] = useState('');

    const showStyledAlert = (title: string, message: string, onOk?: () => void) => {
        setStyledAlertTitle(title);
        setStyledAlertMessage(message);
        setStyledAlertVisible(true);
    };

    const handleResetPassword = async () => {
        if (newPassword !== confirmPassword) {
            showStyledAlert('Error', 'Passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            showStyledAlert('Error', 'Password must be at least 6 characters long');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            showStyledAlert(
                'Success',
                'Your password has been reset successfully. Please log in with your new password.',
                () => {
                    navigation.replace('Login');
                }
            );
        } catch (error: any) {
            showStyledAlert('Error', error.message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Reset Password</Text>
            <TextInput
                style={styles.input}
                placeholder="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoCapitalize="none"
            />
            <TextInput
                style={styles.input}
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
            />
            <TouchableOpacity
                style={styles.button}
                onPress={handleResetPassword}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#ffffff" />
                ) : (
                    <Text style={styles.buttonText}>Reset Password</Text>
                )}
            </TouchableOpacity>

            <StyledAlert
                visible={styledAlertVisible}
                title={styledAlertTitle}
                message={styledAlertMessage}
                onOk={() => setStyledAlertVisible(false)}
                onClose={() => setStyledAlertVisible(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 24,
        marginBottom: 30,
        fontFamily: fontFamily.bold,
    },
    input: {
        width: '100%',
        height: 50,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 15,
        marginBottom: 15,
        fontFamily: fontFamily.regular,
    },
    button: {
        width: '100%',
        height: 50,
        backgroundColor: '#000',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: fontFamily.semiBold,
    },
});