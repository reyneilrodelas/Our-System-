import React from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
} from 'react-native';

interface StyledAlertProps {
    visible: boolean;
    title: string;
    message: string;
    onOk?: () => void;
    onCancel?: () => void;
    onClose: () => void;
    showCancel?: boolean;
    confirmText?: string;
    cancelText?: string;
}

export const StyledAlert: React.FC<StyledAlertProps> = ({
    visible,
    title,
    message,
    onOk,
    onCancel,
    onClose,
    showCancel = true, // Default to showing cancel button
    confirmText = 'OK',
    cancelText = 'Cancel',
}) => {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <Animated.View style={styles.modalContainer}>
                    <Text style={styles.modalTitle}>{title}</Text>
                    <Text style={styles.modalMessage}>{message}</Text>
                    <View style={styles.buttonContainer}>
                        {showCancel && (
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => {
                                    if (onCancel) onCancel();
                                    onClose();
                                }}
                            >
                                <Text style={[styles.modalButtonText, styles.cancelButtonText]}>{cancelText}</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[styles.modalButton, styles.okButton, !showCancel && styles.fullWidthButton]}
                            onPress={() => {
                                if (onOk) onOk();
                                onClose();
                            }}
                        >
                            <Text style={styles.modalButtonText}>{confirmText}</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
        color: '#111',
        textAlign: 'center',
    },
    modalMessage: {
        fontSize: 15,
        color: '#444',
        textAlign: 'center',
        marginBottom: 20,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        width: '100%',
    },
    modalButton: {
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 24,
        minWidth: 100,
        alignItems: 'center',
    },
    okButton: {
        backgroundColor: '#000000ff',
        flex: 1,
    },
    cancelButton: {
        backgroundColor: '#edededff',
        borderWidth: 1,
        borderColor: '#ddd',
        flex: 1,
    },
    modalButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
    },
    cancelButtonText: {
        color: '#666',
    },
    fullWidthButton: {
        width: '100%',
    },
});