'use client'

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getLoginUrl, logoutUser, getAuthStatus } from '@/utils/googleAuth';

const AuthButtons = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showProfilePopup, setProfilePopup] = useState(false);
    const [profilePicture, setProfilePicture] = useState('');

    useEffect(() => {
        async function fetchAuthStatus() {
            try {
                const userData = await getAuthStatus();
                if (userData) {
                    setUser(userData);

                    let picture = localStorage.getItem('userPicture');
                    setProfilePicture(picture || '/default-avatar.png');

                    const { displayName, emails } = userData;
                    const email = emails?.[0]?.value || '';
                    localStorage.setItem('userName', displayName);
                    localStorage.setItem('userEmail', email);
                    localStorage.setItem('userPicture', userData?.photos?.[0]?.value || '');
                } else {
                    clearLocalStorage();
                }
            } catch (error) {
                if (error.response?.status !== 401) {
                    console.error('Failed to fetch auth status:', error);
                    setError('Failed to fetch authentication status');
                }
                clearLocalStorage();
            }
        }

        fetchAuthStatus();
    }, []);

    const handleLogin = async () => {
        try {
            setLoading(true);
            setTimeout(() => {
                window.location.href = getLoginUrl();
            }, 300);
        } catch (error) {
            console.error('Login failed:', error);
            setError('Failed to login');
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            setLoading(true);
            await logoutUser();
            setUser(null);
            clearLocalStorage();
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            setLoading(false);
        }
    };

    function clearLocalStorage() {
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userPicture');
    }

    const toggleProfilePopup = () => {
        setProfilePopup((prev) => !prev);
    };

    if (error) {
        return <span className="text-xs text-[#F09595]">Auth unavailable</span>;
    }

    return (
        <div className="relative z-50">
            {user ? (
                <button onClick={toggleProfilePopup} className="block">
                    <img
                        src={profilePicture}
                        alt={`${user.displayName}'s avatar`}
                        className="h-8 w-8 cursor-pointer rounded-full border border-[#3A3658] object-cover transition hover:border-[#7C3AED]"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/default-avatar.png';
                        }}
                    />
                </button>
            ) : (
                <button
                    onClick={handleLogin}
                    disabled={loading}
                    className="rounded-full border border-[#7C3AED]/40 px-4 py-1.5 text-sm font-medium text-[#F5F3FF] transition hover:border-[#7C3AED] hover:bg-[#7C3AED]/10 disabled:opacity-60"
                >
                    {loading ? 'Connecting…' : 'Sign in'}
                </button>
            )}

            {/* Profile popup for logged-in users */}
            {showProfilePopup && user && (
                <div className="absolute right-0 top-11 w-44 rounded-xl border border-[#2A2747] bg-[#14112A] p-2 shadow-2xl">
                    <div className="px-2 py-2 text-sm font-medium text-[#F5F3FF]">
                        {user.displayName}
                    </div>
                    <div className="my-1 border-t border-[#2A2747]" />
                    <Link
                        href="/profile"
                        className="block rounded-lg px-2 py-2 text-sm text-[#A39FC9] transition hover:bg-[#1C1838] hover:text-[#F5F3FF]"
                    >
                        Profile
                    </Link>
                    <button
                        onClick={handleLogout}
                        disabled={loading}
                        className="block w-full rounded-lg px-2 py-2 text-left text-sm text-[#F09595] transition hover:bg-[#F09595]/10 disabled:opacity-60"
                    >
                        {loading ? 'Logging out…' : 'Log out'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default AuthButtons;