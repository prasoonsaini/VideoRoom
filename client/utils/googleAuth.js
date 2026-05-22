import axios from 'axios';

const API_URL = 'http://localhost:9090';

export const getLoginUrl = () => {
    return `${API_URL}/auth/google`;
};

export let username;
export let displayName;

export const getAuthStatus = async () => {
    try {
        const response = await axios.get(`${API_URL}/auth/status`, {
            withCredentials: true,
            timeout: 5000
        });

        if (!response.data?.user) {
            throw new Error('Invalid user data received');
        }
        username = response.data.user.emails[0].value;
        displayName = response.data.user.displayName;
        return response.data.user;
    } catch (error) {
        if (error.response?.status === 401) {
            return null; // ← normal, user not logged in
        }
        if (error.code === 'ECONNABORTED') {
            throw new Error('Authentication request timed out');
        }
        // Only log unexpected errors
        if (error.response?.status !== 401) {
            console.error('Error fetching authentication status:', error);
        }
        throw error;
    }
};

export const logoutUser = async () => {
    try {
        await axios.get(`${API_URL}/auth/logout`, {
            withCredentials: true
        });
        // Force reload the page to clear any client-side state
        window.location.href = '/';
        return true;
    } catch (error) {
        console.error('Error logging out:', error);
        throw error; // Propagate error to component
    }
};