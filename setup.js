const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
    console.log('🚀 Setting up Mystery Mosaic Database...\n');

    try {
        // Read database schema
        const schema = fs.readFileSync(path.join(__dirname, 'database.sql'), 'utf8');
        
        // Connect to MySQL (without specifying database first)
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || ''
        });

        console.log('✅ Connected to MySQL server');

        // Execute the schema
        const statements = schema.split(';').filter(stmt => stmt.trim());
        
        for (const statement of statements) {
            if (statement.trim()) {
                await connection.execute(statement);
            }
        }

        console.log('✅ Database and tables created successfully');
        console.log('✅ Indexes created for optimal performance');
        
        await connection.end();
        console.log('\n🎉 Database setup completed successfully!');
        console.log('\nNext steps:');
        console.log('1. Run: npm start');
        console.log('2. Open: http://localhost:3000');
        console.log('3. Sign up for a new account');
        console.log('4. Start creating mosaics!');

    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        console.log('\nTroubleshooting:');
        console.log('1. Make sure MySQL is running');
        console.log('2. Check your database credentials');
        console.log('3. Ensure you have permission to create databases');
        process.exit(1);
    }
}

// Run setup
setupDatabase();
