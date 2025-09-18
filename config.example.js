// Configuration file for Mystery Mosaic App
// Copy this to config.js and update with your settings

module.exports = {
    // Database Configuration
    database: {
        host: 'localhost',
        user: 'root',
        password: 'your_mysql_password', // Change this
        database: 'mystery_mosaic'
    },
    
    // JWT Secret (change this in production!)
    jwtSecret: 'your-super-secret-jwt-key-change-this-in-production',
    
    // Server Configuration
    port: 3000,
    
    // Demo Configuration
    maxFreeDemos: 5,
    
    // Subscription Plans
    subscriptionPlans: {
        monthly: {
            price: 15,
            name: 'Monthly Plan'
        },
        yearly: {
            price: 150,
            name: 'Yearly Plan'
        }
    }
};
