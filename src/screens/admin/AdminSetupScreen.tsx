import React, { useState } from 'react';
import { View, Text, Button, ActivityIndicator } from 'react-native';
import { StyledAlert } from '../components/StyledAlert';
import { createAdminUser } from '../../utils/adminSignup';

export default function AdminSetupScreen() {
    const [loading, setLoading] = useState(false);
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertTitle, setAlertTitle] = useState('');
    const [alertMessage, setAlertMessage] = useState('');

    const setupAdmin = async () => {
        setLoading(true);
        try {
            const admin = await createAdminUser('reyneilrodelas29@gmail.com', 'AdImIn@_26');
            if (admin) {
                setAlertTitle('Admin Created');
                setAlertMessage(`Successfully created admin account for ${admin.email}`);
                setAlertVisible(true);
            }
        } catch (error) {
            setAlertTitle('Error');
            setAlertMessage('Failed to create admin account');
            setAlertVisible(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
            <StyledAlert
                visible={alertVisible}
                title={alertTitle}
                message={alertMessage}
                onClose={() => setAlertVisible(false)}
            />
            <Text style={{ fontSize: 18, marginBottom: 20, textAlign: 'center' }}>
                Admin Account Setup
            </Text>
            <Button
                title={loading ? "Creating..." : "Create Admin Account"}
                onPress={setupAdmin}
                disabled={loading}
            />
            {loading && <ActivityIndicator style={{ marginTop: 20 }} />}
        </View>
    );
}