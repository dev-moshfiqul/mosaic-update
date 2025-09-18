-- Mystery Mosaic Database Schema
CREATE DATABASE IF NOT EXISTS mystery_mosaic;
USE mystery_mosaic;

-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    subscribed BOOLEAN DEFAULT FALSE,
    subscription_plan ENUM('monthly', 'yearly') NULL,
    subscription_date DATETIME NULL,
    credits_remaining INT DEFAULT 5,
    credits_reset_date DATETIME NULL,
    user_type ENUM('free', 'premium', 'admin') DEFAULT 'free',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Credit transactions table
CREATE TABLE credit_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    transaction_type ENUM('download', 'purchase', 'bonus', 'reset', 'expired') NOT NULL,
    action_type ENUM('download_svg', 'download_png', 'download_pdf', 'credit_purchase', 'monthly_reset', 'promotional_bonus') NOT NULL,
    credits_used INT DEFAULT 0,
    credits_added INT DEFAULT 0,
    credits_remaining INT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Usage tracking table (legacy - keeping for backward compatibility)
CREATE TABLE usage_tracking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action_type ENUM('download_svg', 'download_png', 'download_pdf') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Credit packages table
CREATE TABLE credit_packages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    credits INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User credit purchases table
CREATE TABLE user_credit_purchases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    package_id INT NOT NULL,
    credits_purchased INT NOT NULL,
    amount_paid DECIMAL(10,2) NOT NULL,
    payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (package_id) REFERENCES credit_packages(id)
);

-- Sessions table for token management
CREATE TABLE user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Admin actions table
CREATE TABLE admin_actions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_user_id INT NOT NULL,
    target_user_id INT,
    action_type ENUM('credit_reset', 'credit_add', 'credit_remove', 'user_promote', 'user_demote') NOT NULL,
    credits_amount INT DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_usage_user_id ON usage_tracking(user_id);
CREATE INDEX idx_usage_created_at ON usage_tracking(created_at);
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX idx_credit_packages_active ON credit_packages(is_active);
CREATE INDEX idx_user_credit_purchases_user_id ON user_credit_purchases(user_id);
CREATE INDEX idx_admin_actions_admin_user_id ON admin_actions(admin_user_id);
CREATE INDEX idx_admin_actions_target_user_id ON admin_actions(target_user_id);
CREATE INDEX idx_sessions_token ON user_sessions(token);
CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);

-- Insert sample credit packages
INSERT INTO credit_packages (name, credits, price, description) VALUES
('Starter Pack', 10, 2.99, '10 credits for occasional users'),
('Power Pack', 25, 6.99, '25 credits for regular users'),
('Pro Pack', 50, 12.99, '50 credits for power users'),
('Mega Pack', 100, 24.99, '100 credits for heavy users'),
('Unlimited', 999, 49.99, 'Nearly unlimited credits');

-- Insert sample admin user (password: admin123)
INSERT INTO users (email, password_hash, user_type, credits_remaining, subscribed) VALUES
('admin@mysterymosaic.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 999, TRUE);
