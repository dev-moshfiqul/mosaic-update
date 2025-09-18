const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mystery_mosaic',
    multipleStatements: true
};

async function migrateDatabase() {
    let connection;
    
    try {
        console.log('🔄 Starting database migration...');
        
        // Connect to MySQL
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to MySQL database');
        
        // Read the database schema
        const schemaPath = path.join(__dirname, 'database.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        // Execute the schema
        await connection.execute(schema);
        console.log('✅ Database schema executed successfully');
        
        // Check if we need to migrate existing data
        const [existingUsers] = await connection.execute(
            'SELECT COUNT(*) as count FROM users WHERE credits_remaining IS NULL'
        );
        
        if (existingUsers[0].count > 0) {
            console.log('🔄 Migrating existing user data...');
            
            // Update existing users to have default credits
            await connection.execute(
                'UPDATE users SET credits_remaining = 5, user_type = "free" WHERE credits_remaining IS NULL'
            );
            
            // Migrate existing usage_tracking to credit_transactions
            const [usageRecords] = await connection.execute(
                'SELECT user_id, action_type, created_at FROM usage_tracking ORDER BY created_at'
            );
            
            for (const record of usageRecords) {
                // Get user's current credits at the time of this usage
                const [userCredits] = await connection.execute(
                    'SELECT credits_remaining FROM users WHERE id = ?',
                    [record.user_id]
                );
                
                if (userCredits.length > 0) {
                    const currentCredits = userCredits[0].credits_remaining;
                    const cost = record.action_type === 'download_svg' ? 1 : 
                               record.action_type === 'download_png' ? 2 : 3;
                    
                    // Insert credit transaction
                    await connection.execute(
                        'INSERT INTO credit_transactions (user_id, transaction_type, action_type, credits_used, credits_remaining, description) VALUES (?, ?, ?, ?, ?, ?)',
                        [record.user_id, 'download', record.action_type, cost, currentCredits, `Migrated from usage_tracking`]
                    );
                }
            }
            
            console.log('✅ Existing data migrated successfully');
        }
        
        // Verify the migration
        const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM users');
        const [creditCount] = await connection.execute('SELECT COUNT(*) as count FROM credit_transactions');
        const [packageCount] = await connection.execute('SELECT COUNT(*) as count FROM credit_packages');
        
        console.log('\n📊 Migration Summary:');
        console.log(`   Users: ${userCount[0].count}`);
        console.log(`   Credit Transactions: ${creditCount[0].count}`);
        console.log(`   Credit Packages: ${packageCount[0].count}`);
        
        console.log('\n🎉 Database migration completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('   1. Start your server: npm start');
        console.log('   2. Visit http://localhost:3000');
        console.log('   3. Login as admin: admin@mysterymosaic.com / admin123');
        console.log('   4. Access admin panel: http://localhost:3000/admin');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run migration if this file is executed directly
if (require.main === module) {
    migrateDatabase();
}

module.exports = { migrateDatabase };




