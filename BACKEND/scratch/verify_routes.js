const axios = require('axios');

const testApi = async () => {
    try {
        // We can't use the exact JWT, but we can check if it returns 404 vs 401
        // If it's 404, it means my app.js fix didn't work.
        // If it's 401, it means the route exists but needs auth.
        const baseUrl = 'http://localhost:5000/api';
        
        console.log('Testing /api/cab...');
        try {
            await axios.get(`${baseUrl}/cab`);
        } catch (err) {
            console.log('Status /cab:', err.response?.status);
        }

        console.log('Testing /api/users/by-role/MEMBRE_CAB...');
        try {
            await axios.get(`${baseUrl}/users/by-role/MEMBRE_CAB`);
        } catch (err) {
            console.log('Status /by-role:', err.response?.status);
        }

    } catch (err) {
        console.error('Test failed:', err.message);
    }
};

testApi();
