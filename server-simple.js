const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// In-memory storage for demo purposes
let users = [];
let usageTracking = [];

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// JWT token verification middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access token required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = users.find(u => u.id === decoded.userId);
        
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid token' });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(403).json({ success: false, message: 'Invalid token' });
    }
};

// Routes

// Authentication routes
app.post('/api/auth', async (req, res) => {
    try {
        const { action, email, password } = req.body;

        console.log('Auth request:', { action, email, password: password ? '***' : 'empty' });

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        if (action === 'signup') {
            // Check if user already exists
            const existingUser = users.find(u => u.email === email);

            if (existingUser) {
                return res.status(400).json({ success: false, message: 'User already exists' });
            }

            // Hash password and create user
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(password, saltRounds);

            const newUser = {
                id: users.length + 1,
                email,
                password_hash: passwordHash,
                subscribed: false,
                subscription_plan: null,
                created_at: new Date()
            };

            users.push(newUser);

            const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '7d' });

            res.json({
                success: true,
                message: 'User created successfully',
                user: { 
                    id: newUser.id, 
                    email: newUser.email, 
                    subscribed: newUser.subscribed,
                    subscription_plan: newUser.subscription_plan
                },
                token
            });

        } else if (action === 'login') {
            // Find user and verify password
            const user = users.find(u => u.email === email);

            if (!user) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }

            const isValidPassword = await bcrypt.compare(password, user.password_hash);

            if (!isValidPassword) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }

            const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

            res.json({
                success: true,
                message: 'Login successful',
                user: { 
                    id: user.id, 
                    email: user.email, 
                    subscribed: user.subscribed,
                    subscription_plan: user.subscription_plan
                },
                token
            });
        } else {
            res.status(400).json({ success: false, message: 'Invalid action' });
        }

    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({ success: false, message: 'Internal server error: ' + error.message });
    }
});

// Get user usage count
app.get('/api/usage', authenticateToken, (req, res) => {
    try {
        const userUsage = usageTracking.filter(u => u.user_id === req.user.id);
        
        res.json({
            success: true,
            demoCount: userUsage.length
        });
    } catch (error) {
        console.error('Usage check error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Track usage
app.post('/api/track-usage', authenticateToken, (req, res) => {
    try {
        const { action_type } = req.body;
        
        // Add usage record
        usageTracking.push({
            id: usageTracking.length + 1,
            user_id: req.user.id,
            action_type: action_type || 'download_svg',
            created_at: new Date()
        });

        // Get updated count
        const userUsage = usageTracking.filter(u => u.user_id === req.user.id);

        res.json({
            success: true,
            demoCount: userUsage.length
        });
    } catch (error) {
        console.error('Usage tracking error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Subscription route
app.post('/api/subscribe', authenticateToken, (req, res) => {
    try {
        const { plan, price } = req.body;

        if (!plan || !price) {
            return res.status(400).json({ success: false, message: 'Plan and price are required' });
        }

        // Update user subscription
        const userIndex = users.findIndex(u => u.id === req.user.id);
        if (userIndex !== -1) {
            users[userIndex].subscribed = true;
            users[userIndex].subscription_plan = plan;
            users[userIndex].subscription_date = new Date();
        }

        res.json({
            success: true,
            message: 'Subscription updated successfully'
        });
    } catch (error) {
        console.error('Subscription error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Logout route
app.post('/api/logout', authenticateToken, (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Server is running',
        users: users.length,
        usage: usageTracking.length
    });
});

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/app', (req, res) => {
    res.sendFile(path.join(__dirname, 'app.html'));
});

app.get('/subscription', (req, res) => {
    res.sendFile(path.join(__dirname, 'subscription.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ 
        success: false, 
        message: 'Internal server error',
        error: error.message 
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Open: http://localhost:${PORT}`);
    console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📊 Users in memory: ${users.length}`);
});

module.exports = app;
