# Mystery Mosaic - Color-By-Number App

A beautiful web application for creating color-by-number mosaics with user authentication, subscription system, and demo tracking.

## Features

- 🎨 **Beautiful UI**: Modern, responsive design with glassmorphism effects
- 🔐 **User Authentication**: Sign up and login system with JWT tokens
- 📊 **Demo Tracking**: 5 free demos per email address
- 💳 **Subscription System**: Monthly ($15) and Yearly ($150) plans
- 🖼️ **Mosaic Creator**: Upload images and create color-by-number art
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🔒 **Secure**: Password hashing and token-based authentication

## Tech Stack

- **Frontend**: HTML, CSS (Tailwind), React (CDN)
- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Authentication**: JWT tokens with bcrypt password hashing

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- MySQL (v5.7 or higher)
- npm or yarn

### Installation

1. **Clone or download the project files**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the database**
   ```bash
   # Create the database and tables
   mysql -u root -p < database.sql
   ```

4. **Configure environment variables** (optional)
   Create a `.env` file in the root directory:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=mystery_mosaic
   JWT_SECRET=your-super-secret-jwt-key
   PORT=3000
   ```

5. **Start the server**
   ```bash
   npm start
   ```

   For development with auto-restart:
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## Usage

### For Users

1. **Sign Up**: Create an account with your email and password
2. **Login**: Access your account
3. **Create Mosaics**: Upload an image and customize your mosaic
4. **Free Demos**: Get 5 free downloads per email address
5. **Subscribe**: Choose a plan to continue after 5 demos

### For Developers

#### API Endpoints

- `POST /api/auth` - User authentication (signup/login)
- `GET /api/usage` - Get user's demo count
- `POST /api/track-usage` - Track usage when downloading
- `POST /api/subscribe` - Update user subscription
- `POST /api/logout` - Logout user

#### Database Schema

- **users**: User accounts and subscription info
- **usage_tracking**: Track demo usage per user
- **user_sessions**: JWT token management

## File Structure

```
├── index.html          # Authentication page
├── app.html           # Main mosaic creator app
├── subscription.html  # Subscription plans page
├── server.js          # Node.js backend server
├── database.sql       # MySQL database schema
├── package.json       # Node.js dependencies
└── README.md         # This file
```

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- SQL injection prevention with prepared statements
- CORS configuration
- Input validation

## Subscription Plans

- **Monthly Plan**: $15/month
- **Yearly Plan**: $150/year (Save $30!)

## Demo System

- Each email gets 5 free demo downloads
- Usage is tracked per user
- Subscription popup appears after 5th demo
- No duplicate free demos per email

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## License

MIT License - feel free to use this project for your own purposes.

## Support

If you encounter any issues, please check:
1. MySQL is running
2. Database is created and tables exist
3. All dependencies are installed
4. Port 3000 is available

## Contributing

Feel free to submit issues and enhancement requests!
