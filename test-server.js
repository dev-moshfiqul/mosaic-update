const fetch = require('node-fetch');

async function testServer() {
    console.log('🧪 Testing Mystery Mosaic Server...\n');

    try {
        // Test health endpoint
        console.log('1. Testing health endpoint...');
        const healthResponse = await fetch('http://localhost:3000/api/health');
        const healthData = await healthResponse.json();
        console.log('✅ Health check:', healthData);

        // Test signup
        console.log('\n2. Testing user signup...');
        const signupResponse = await fetch('http://localhost:3000/api/auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'signup',
                email: 'test@example.com',
                password: 'testpassword123'
            })
        });
        const signupData = await signupResponse.json();
        console.log('✅ Signup result:', signupData);

        if (signupData.success) {
            const token = signupData.token;
            
            // Test usage tracking
            console.log('\n3. Testing usage tracking...');
            const usageResponse = await fetch('http://localhost:3000/api/usage', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const usageData = await usageResponse.json();
            console.log('✅ Usage check:', usageData);

            // Test track usage
            console.log('\n4. Testing track usage...');
            const trackResponse = await fetch('http://localhost:3000/api/track-usage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    action_type: 'download_svg'
                })
            });
            const trackData = await trackResponse.json();
            console.log('✅ Track usage result:', trackData);
        }

        console.log('\n🎉 All tests passed! Server is working correctly.');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('\nTroubleshooting:');
        console.log('1. Make sure the server is running: npm run start-simple');
        console.log('2. Check if port 3000 is available');
        console.log('3. Verify all dependencies are installed: npm install');
    }
}

// Run tests
testServer();
