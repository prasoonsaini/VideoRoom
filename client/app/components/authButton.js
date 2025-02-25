'use client'

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getLoginUrl, logoutUser, getAuthStatus } from '@/utils/googleAuth';
// import { useLoader } from '@/context/loadingContext';
// import { useRoomContext } from '@/context/RoomContext';
// import { fetchProfile } from '@/utils/getProfile';

const AuthButtons = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [error, setError] = useState(null);
    const [showProfilePopup, setProfilePopup] = useState(false);
    const [profilePicture, setProfilePicture] = useState('');
    const [showLoginPopup, setShowLoginPopup] = useState(false);
    // const { showLoader, hideLoader } = useLoader();
    // const { room } = useRoomContext();

    useEffect(() => {
        async function fetchAuthStatus() {
            try {
                const userData = await getAuthStatus();
                console.log("user data: ------", userData)
                console.log("user profile picture: ------", userData?.photos[0]?.value)
                if (userData) {
                    setUser(userData);

                    // First try to get picture from localStorage
                    let picture = localStorage.getItem('userPicture');
                    // Set a default avatar if no picture is available
                    setProfilePicture(picture || '/default-avatar.png');

                    // Save other user data
                    const { displayName, emails } = userData;
                    const email = emails?.[0]?.value || '';
                    localStorage.setItem('userName', displayName);
                    localStorage.setItem('userEmail', email);
                    localStorage.setItem('userPicture', userData?.photos[0]?.value)
                } else {
                    clearLocalStorage();
                }
            } catch (error) {
                console.error('Failed to fetch auth status:', error);
                setError('Failed to fetch authentication status');
                clearLocalStorage();
            }
        }

        fetchAuthStatus();
    }, []);

    // Login function (unchanged)
    const handleLogin = async () => {
        try {
            // showLoader(true);
            setTimeout(() => {
                window.location.href = getLoginUrl();
            }, 500);
        } catch (error) {
            console.error('Login failed:', error);
            setError('Failed to login');
            // hideLoader(true);
        }
    };

    // Logout function (updated to clear localStorage)
    const handleLogout = async () => {
        try {
            // showLoader(true);
            await logoutUser();
            setUser(null);
            // setShowProfilePopup(false);

            // Clear localStorage on logout
            clearLocalStorage();
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            // hideLoader(true);
        }
    };

    // Utility function to clear user data from localStorage
    function clearLocalStorage() {
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userPicture');
        console.log('User data cleared from localStorage');
    }

    const toggleProfilePopup = () => {
        setProfilePopup(prevState => !prevState);
    };

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div className="auth-buttons relative z-50">
            {/* Popup for login */}
            {showPopup && !user && (
                <div className={`absolute top-0 right-2 mt-2 mr-4 py-2 px-2 bg-white shadow-md rounded-lg w-64 h-auto z-50 ${loading ? 'border-2 border-gray-900 animate-pulse' : 'border border-gray-300'}`}>
                    <div className="flex flex-col items-center relative w-full">
                        <div className="flex items-center justify-between w-full text-black border-b mb-3 p-2 text-sm">
                            <div className="flex-1 text-left font-normal">
                                Login with Google
                            </div>
                            <div className="flex-shrink-0">
                                <img
                                    src="./cancel.png"
                                    className="w-4 h-4 cursor-pointer"
                                    alt="Cancel"
                                    onClick={() => !loading && setShowPopup(false)}
                                />
                            </div>
                        </div>

                        {/* Login button */}
                        <div className="flex flex-col items-center space-y-3 text-sm w-full">
                            <button
                                onClick={handleLogin}
                                className={`w-full py-2 px-4 text-white ${loading
                                    ? 'bg-gray-900 cursor-not-allowed'
                                    : 'bg-gray-800 hover:bg-gray-800'} 
                                    text-white rounded-full shadow-md transition-colors duration-300`}
                                disabled={loading}
                            >
                                {loading ? 'Connecting...' : 'Login with Google'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* User avatar when logged in */}
            {user ? (
                <div className="flex items-center space-x-1">
                    <img
                        src={profilePicture}
                        alt={`${user.displayName}'s avatar`}
                        className="w-8 h-8 rounded-full cursor-pointer object-cover"
                        // onError={(e) => {
                        //     console.log("error loading image: ", e)
                        //     e.target.onerror = null; // Prevent infinite loop
                        //     e.target.src = './man.png'; // Fallback image
                        //     setProfilePicture('./man.png'); // Update state
                        // }}
                        onClick={toggleProfilePopup}
                    />
                </div>
            ) : (
                <div className="flex items-center space-x-1">
                    <button
                        onClick={handleLogin} // Assuming you have a handleLogin function for logging in
                        className="px-4 py-1 text-sm text-gray-700 border border-gray-300 rounded-md hover:border-blue-500 hover:text-blue-500 transition"
                    >
                        Login
                    </button>
                </div>
            )}


            {/* Profile popup for logged-in users */}
            {showProfilePopup && user && (
                <div className="absolute top-9 right-3 w-40 font-semibold bg-white p-2 border rounded-md">
                    <div className="flex flex-col items-center w-full">
                        <div className="text-md">{user.displayName}</div>
                        <button className='mt-2 py-2 px-4 text-white bg-blue-600 hover:bg-blue-800 border w-full rounded-full'>
                            <div className='flex justify-center gap-3'>
                                <Link href='/profile'>
                                    Profile
                                </Link>
                                <img src='./user.png' className='w-5 h-5 filter brightness-0 invert' />
                            </div>

                        </button>
                        <button
                            onClick={handleLogout}
                            className={`mt-1 py-2 px-4 text-black border w-full rounded-full ${loading
                                ? 'bg-white cursor-not-allowed'
                                : 'bg-white text-black hover:border-gray-900'} 
                                text-black transition-colors duration-300`}
                            disabled={loading}
                        >
                            <div className='flex justify-center gap-3'>
                                {loading ? 'Logging out...' : 'Logout'}
                                <img src='./user-logout.png' className='w-6 h-6' />
                            </div>

                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuthButtons;