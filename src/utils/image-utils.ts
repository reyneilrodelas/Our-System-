// utils/image-utils.ts
import { supabase } from '../lib/supabase';

export const getImageUrl = (path?: string) => {
    if (!path) return null;

    // If it's already a full URL, return it
    if (path.startsWith('http')) return path;

    // Otherwise, construct the URL using Supabase Storage API
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
};

export const uploadAvatar = async (fileUri: string, userId: string) => {
    try {
        // Extract file extension and create filename
        const fileExt = fileUri.split('.').pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        // Read the file
        const file = await fetch(fileUri);
        const blob = await file.blob();

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from('avatars')
            .upload(filePath, blob);

        if (error) throw error;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        return publicUrl;
    } catch (error) {
        console.error('Upload failed:', error);
        throw error;
    }
};