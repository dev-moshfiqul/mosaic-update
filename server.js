const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Database connection
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mystery_mosaic',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// Disposable/demo email domains blocklist (extend as needed)
const DISPOSABLE_DOMAINS = new Set([
    'mailinator.com', 'yopmail.com', '10minutemail.com', 'guerrillamail.com', 'trashmail.com',
    'sharklasers.com', 'getnada.com', 'maildrop.cc', 'dispostable.com', 'mailnesia.com',
    'tempmail.com', 'tempmailo.com', 'throwawaymail.com', 'minuteinbox.com', 'moakt.com',
    'fakeinbox.com', 'temp-mail.org', 'emailondeck.com', 'mailcatch.com'
]);
const DISPOSABLE_KEYWORDS = [
    'mailinator','yopmail','tempmail','10min','guerrilla','trashmail','sharklasers','getnada','maildrop',
    'dispostable','mailnesia','throwaway','minuteinbox','moakt','fakeinbox','emailondeck','mailcatch','temp-mail'
];

const isValidEmailFormat = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase().trim());

const isDisposableEmail = (email) => {
    if (!email || typeof email !== 'string') return true;
    const match = email.toLowerCase().trim().match(/^[^@\s]+@([^@\s]+)$/);
    if (!match) return true; // invalid format treated as invalid
    const domain = match[1];
    // Strip common subdomains like mail.yopmail.com -> yopmail.com
    const parts = domain.split('.');
    const root = parts.length > 2 ? parts.slice(-2).join('.') : domain;
    if (DISPOSABLE_DOMAINS.has(root)) return true;
    // Keyword detection anywhere in the domain (covers subdomains and alt TLDs)
    return DISPOSABLE_KEYWORDS.some(k => domain.includes(k));
};

// JWT token verification middleware
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access token required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const [users] = await pool.execute(
            'SELECT id, email, subscribed, subscription_plan, credits_remaining, user_type, credits_reset_date FROM users WHERE id = ?',
            [decoded.userId]
        );
        
        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid token' });
        }

        req.user = users[0];
        next();
    } catch (error) {
        return res.status(403).json({ success: false, message: 'Invalid token' });
    }
};

// Admin authentication middleware
const authenticateAdmin = async (req, res, next) => {
    if (req.user.user_type !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    next();
};

// Credit cost configuration
const CREDIT_COSTS = {
    'download_svg': 1,
    'download_png': 2,
    'download_pdf': 3
};

// Helper function to check and update credits
const checkAndUpdateCredits = async (userId, actionType, description = '') => {
    const cost = CREDIT_COSTS[actionType] || 1;
    
    // Get current user credits
    const [users] = await pool.execute(
        'SELECT credits_remaining, subscribed FROM users WHERE id = ?',
        [userId]
    );
    
    if (users.length === 0) {
        throw new Error('User not found');
    }
    
    const user = users[0];
    
    // Subscribed users have unlimited access
    if (user.subscribed) {
        return { success: true, credits_remaining: user.credits_remaining, cost: 0 };
    }
    
    // Check if user has enough credits
    if (user.credits_remaining < cost) {
        return { success: false, credits_remaining: user.credits_remaining, cost };
    }
    
    // Deduct credits
    const newCredits = user.credits_remaining - cost;
    await pool.execute(
        'UPDATE users SET credits_remaining = ? WHERE id = ?',
        [newCredits, userId]
    );
    
    // Log transaction
    await pool.execute(
        'INSERT INTO credit_transactions (user_id, transaction_type, action_type, credits_used, credits_remaining, description) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, 'download', actionType, cost, newCredits, description]
    );
    
    return { success: true, credits_remaining: newCredits, cost };
};

// Routes

// Authentication routes
app.post('/api/auth', async (req, res) => {
    try {
        const { action, email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        if (action === 'signup') {
            // Validate email format and block disposable emails
            if (!isValidEmailFormat(email) || isDisposableEmail(email)) {
                return res.status(400).json({ success: false, message: 'Use a valid, non-disposable email address.' });
            }
            // Reject disposable/demo emails
            if (isDisposableEmail(email)) {
                return res.status(400).json({ success: false, message: 'Please use a valid, non-disposable email address.' });
            }
            // Check if user already exists
            const [existingUsers] = await pool.execute(
                'SELECT id FROM users WHERE email = ?',
                [email]
            );

            if (existingUsers.length > 0) {
                return res.status(400).json({ success: false, message: 'User already exists' });
            }

            // Hash password and create user
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(password, saltRounds);

            const [result] = await pool.execute(
                'INSERT INTO users (email, password_hash) VALUES (?, ?)',
                [email, passwordHash]
            );

            const userId = result.insertId;
            const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });

            // Store session
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
            await pool.execute(
                'INSERT INTO user_sessions (user_id, token, expires_at) VALUES (?, ?, ?)',
                [userId, token, expiresAt]
            );

            res.json({
                success: true,
                message: 'User created successfully',
                user: { 
                    id: userId, 
                    email, 
                    subscribed: false, 
                    credits_remaining: 5,
                    user_type: 'free'
                },
                token
            });

        } else if (action === 'login') {
            // Validate email format and block disposable emails
            if (!isValidEmailFormat(email) || isDisposableEmail(email)) {
                return res.status(400).json({ success: false, message: 'Use a valid, non-disposable email address.' });
            }
            // Reject disposable/demo emails
            if (isDisposableEmail(email)) {
                return res.status(400).json({ success: false, message: 'Please use a valid, non-disposable email address.' });
            }
            // Find user and verify password
            const [users] = await pool.execute(
                'SELECT id, email, password_hash, subscribed, subscription_plan, credits_remaining, user_type, credits_reset_date FROM users WHERE email = ?',
                [email]
            );

            if (users.length === 0) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }

            const user = users[0];
            const isValidPassword = await bcrypt.compare(password, user.password_hash);

            if (!isValidPassword) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }

            const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

            // Store session
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
            await pool.execute(
                'INSERT INTO user_sessions (user_id, token, expires_at) VALUES (?, ?, ?)',
                [user.id, token, expiresAt]
            );

            res.json({
                success: true,
                message: 'Login successful',
                user: { 
                    id: user.id, 
                    email: user.email, 
                    subscribed: user.subscribed,
                    subscription_plan: user.subscription_plan,
                    credits_remaining: user.credits_remaining,
                    user_type: user.user_type,
                    credits_reset_date: user.credits_reset_date
                },
                token
            });
        } else {
            res.status(400).json({ success: false, message: 'Invalid action' });
        }

    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Get user credits and usage info
app.get('/api/credits', authenticateToken, async (req, res) => {
    try {
        const [users] = await pool.execute(
            'SELECT credits_remaining, subscribed, user_type, credits_reset_date FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const user = users[0];
        
        // Get recent transactions
        const [transactions] = await pool.execute(
            'SELECT * FROM credit_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
            [req.user.id]
        );

        res.json({
            success: true,
            credits_remaining: user.credits_remaining,
            subscribed: user.subscribed,
            user_type: user.user_type,
            credits_reset_date: user.credits_reset_date,
            recent_transactions: transactions,
            credit_costs: CREDIT_COSTS
        });
    } catch (error) {
        console.error('Credits check error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Track usage with new credit system
app.post('/api/track-usage', authenticateToken, async (req, res) => {
    try {
        const { action_type } = req.body;
        const actionType = action_type || 'download_svg';
        
        // Check and update credits
        const result = await checkAndUpdateCredits(req.user.id, actionType, `Downloaded ${actionType}`);
        
        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient credits',
                credits_remaining: result.credits_remaining,
                cost: result.cost,
                action_type: actionType
            });
        }

        // Also insert legacy usage record for backward compatibility
        await pool.execute(
            'INSERT INTO usage_tracking (user_id, action_type) VALUES (?, ?)',
            [req.user.id, actionType]
        );

        res.json({
            success: true,
            credits_remaining: result.credits_remaining,
            cost: result.cost,
            action_type: actionType
        });
    } catch (error) {
        console.error('Usage tracking error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Get credit packages
app.get('/api/credit-packages', async (req, res) => {
    try {
        const [packages] = await pool.execute(
            'SELECT * FROM credit_packages WHERE is_active = TRUE ORDER BY credits ASC'
        );

        res.json({
            success: true,
            packages
        });
    } catch (error) {
        console.error('Credit packages error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Purchase credits
app.post('/api/purchase-credits', authenticateToken, async (req, res) => {
    try {
        const { package_id } = req.body;

        if (!package_id) {
            return res.status(400).json({ success: false, message: 'Package ID is required' });
        }

        // Get package details
        const [packages] = await pool.execute(
            'SELECT * FROM credit_packages WHERE id = ? AND is_active = TRUE',
            [package_id]
        );

        if (packages.length === 0) {
            return res.status(404).json({ success: false, message: 'Package not found' });
        }

        const packageData = packages[0];

        // In a real application, you would integrate with a payment processor here
        // For now, we'll simulate a successful payment
        const purchaseId = Date.now();

        // Record the purchase
        await pool.execute(
            'INSERT INTO user_credit_purchases (user_id, package_id, credits_purchased, amount_paid, payment_status) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, package_id, packageData.credits, packageData.price, 'completed']
        );

        // Add credits to user account
        const [users] = await pool.execute(
            'SELECT credits_remaining FROM users WHERE id = ?',
            [req.user.id]
        );

        const newCredits = users[0].credits_remaining + packageData.credits;
        
        await pool.execute(
            'UPDATE users SET credits_remaining = ? WHERE id = ?',
            [newCredits, req.user.id]
        );

        // Log transaction
        await pool.execute(
            'INSERT INTO credit_transactions (user_id, transaction_type, action_type, credits_added, credits_remaining, description) VALUES (?, ?, ?, ?, ?, ?)',
            [req.user.id, 'purchase', 'credit_purchase', packageData.credits, newCredits, `Purchased ${packageData.name}`]
        );

        res.json({
            success: true,
            message: 'Credits purchased successfully',
            credits_purchased: packageData.credits,
            credits_remaining: newCredits,
            purchase_id: purchaseId
        });
    } catch (error) {
        console.error('Credit purchase error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Get user transaction history
app.get('/api/transactions', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const [transactions] = await pool.execute(
            'SELECT * FROM credit_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
            [req.user.id, parseInt(limit), parseInt(offset)]
        );

        const [totalCount] = await pool.execute(
            'SELECT COUNT(*) as total FROM credit_transactions WHERE user_id = ?',
            [req.user.id]
        );

        res.json({
            success: true,
            transactions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalCount[0].total,
                pages: Math.ceil(totalCount[0].total / limit)
            }
        });
    } catch (error) {
        console.error('Transaction history error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Subscription route
app.post('/api/subscribe', authenticateToken, async (req, res) => {
    try {
        const { plan, price } = req.body;

        if (!plan || !price) {
            return res.status(400).json({ success: false, message: 'Plan and price are required' });
        }

        // Update user subscription
        await pool.execute(
            'UPDATE users SET subscribed = TRUE, subscription_plan = ?, subscription_date = NOW() WHERE id = ?',
            [plan, req.user.id]
        );

        res.json({
            success: true,
            message: 'Subscription updated successfully'
        });
    } catch (error) {
        console.error('Subscription error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Admin routes
// Get all users for admin panel
app.get('/api/admin/users', authenticateToken, authenticateAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '' } = req.query;
        const offset = (page - 1) * limit;
        
        let query = 'SELECT id, email, subscribed, subscription_plan, credits_remaining, user_type, created_at FROM users';
        let countQuery = 'SELECT COUNT(*) as total FROM users';
        let params = [];
        
        if (search) {
            query += ' WHERE email LIKE ?';
            countQuery += ' WHERE email LIKE ?';
            params.push(`%${search}%`);
        }
        
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const [users] = await pool.execute(query, params);
        const [totalCount] = await pool.execute(countQuery, search ? [`%${search}%`] : []);
        
        res.json({
            success: true,
            users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalCount[0].total,
                pages: Math.ceil(totalCount[0].total / limit)
            }
        });
    } catch (error) {
        console.error('Admin users error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Admin credit management
app.post('/api/admin/credits', authenticateToken, authenticateAdmin, async (req, res) => {
    try {
        const { user_id, action, amount, description } = req.body;
        
        if (!user_id || !action || !amount) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        
        // Get current user credits
        const [users] = await pool.execute(
            'SELECT credits_remaining FROM users WHERE id = ?',
            [user_id]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        const currentCredits = users[0].credits_remaining;
        let newCredits;
        let transactionType;
        
        if (action === 'add') {
            newCredits = currentCredits + amount;
            transactionType = 'bonus';
        } else if (action === 'remove') {
            newCredits = Math.max(0, currentCredits - amount);
            transactionType = 'expired';
        } else if (action === 'reset') {
            newCredits = 5; // Reset to default free credits
            transactionType = 'reset';
        } else {
            return res.status(400).json({ success: false, message: 'Invalid action' });
        }
        
        // Update user credits
        await pool.execute(
            'UPDATE users SET credits_remaining = ? WHERE id = ?',
            [newCredits, user_id]
        );
        
        // Log admin action
        await pool.execute(
            'INSERT INTO admin_actions (admin_user_id, target_user_id, action_type, credits_amount, description) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, user_id, `credit_${action}`, amount, description || `Admin ${action}ed ${amount} credits`]
        );
        
        // Log transaction
        await pool.execute(
            'INSERT INTO credit_transactions (user_id, transaction_type, action_type, credits_added, credits_used, credits_remaining, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [user_id, transactionType, 'promotional_bonus', action === 'add' ? amount : 0, action === 'remove' ? amount : 0, newCredits, description || `Admin ${action}ed ${amount} credits`]
        );
        
        res.json({
            success: true,
            message: `Credits ${action}ed successfully`,
            user_id,
            old_credits: currentCredits,
            new_credits: newCredits,
            amount
        });
    } catch (error) {
        console.error('Admin credit management error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Monthly credit reset (cron job endpoint)
app.post('/api/admin/reset-monthly-credits', authenticateToken, authenticateAdmin, async (req, res) => {
    try {
        const [users] = await pool.execute(
            'SELECT id, credits_remaining FROM users WHERE subscribed = FALSE AND user_type = "free"'
        );
        
        let resetCount = 0;
        const resetDate = new Date();
        
        for (const user of users) {
            // Reset to 5 credits for free users
            await pool.execute(
                'UPDATE users SET credits_remaining = 5, credits_reset_date = ? WHERE id = ?',
                [resetDate, user.id]
            );
            
            // Log transaction
            await pool.execute(
                'INSERT INTO credit_transactions (user_id, transaction_type, action_type, credits_added, credits_remaining, description) VALUES (?, ?, ?, ?, ?, ?)',
                [user.id, 'reset', 'monthly_reset', 5, 5, 'Monthly credit reset']
            );
            
            resetCount++;
        }
        
        res.json({
            success: true,
            message: `Monthly credit reset completed`,
            users_reset: resetCount,
            reset_date: resetDate
        });
    } catch (error) {
        console.error('Monthly reset error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Get admin dashboard stats
app.get('/api/admin/stats', authenticateToken, authenticateAdmin, async (req, res) => {
    try {
        const [totalUsers] = await pool.execute('SELECT COUNT(*) as count FROM users');
        const [subscribedUsers] = await pool.execute('SELECT COUNT(*) as count FROM users WHERE subscribed = TRUE');
        const [totalCredits] = await pool.execute('SELECT SUM(credits_remaining) as total FROM users');
        const [recentTransactions] = await pool.execute(
            'SELECT ct.*, u.email FROM credit_transactions ct JOIN users u ON ct.user_id = u.id ORDER BY ct.created_at DESC LIMIT 10'
        );
        
        res.json({
            success: true,
            stats: {
                total_users: totalUsers[0].count,
                subscribed_users: subscribedUsers[0].count,
                total_credits_in_circulation: totalCredits[0].total || 0,
                recent_transactions: recentTransactions
            }
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Logout route
app.post('/api/logout', authenticateToken, async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        // Remove session
        await pool.execute(
            'DELETE FROM user_sessions WHERE token = ?',
            [token]
        );

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Serve static files
app.get('/', (req, res) => {
    // Serve local auth page as the default index for local workflows
    res.sendFile(path.join(__dirname, 'test-local.html'));
});

app.get('/app', (req, res) => {
    res.sendFile(path.join(__dirname, 'app.html'));
});

app.get('/subscription', (req, res) => {
    res.sendFile(path.join(__dirname, 'subscription.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Database: ${dbConfig.database}`);
});

module.exports = app;
