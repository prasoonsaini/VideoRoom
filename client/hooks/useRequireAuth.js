'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthStatus, getLoginUrl } from '@/utils/googleAuth';

export function useRequireAuth() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function checkAuth() {
            try {
                const userData = await getAuthStatus();
                if (!userData) {
                    // Not logged in — redirect to Google login
                    window.location.href = getLoginUrl();
                } else {
                    setUser(userData);
                }
            } catch (error) {
                window.location.href = getLoginUrl();
            } finally {
                setLoading(false);
            }
        }
        checkAuth();
    }, []);

    return { user, loading };
}