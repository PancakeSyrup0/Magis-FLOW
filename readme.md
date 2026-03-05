# Magis Canteen Management System

A web-based canteen pre-ordering system designed for St. Joseph's University. It allows faculty to pre-order meals for specific time slots and rooms, while providing kitchen staff with a real-time queue management system.

## Key Features

### Faculty Portal
* **Secure Login:** Access via email/password.
* **Smart Menu:** Browse food items with real-time prices.
* **Time Slot Booking:** Select delivery time slots (e.g., 9:00 AM - 10:00 AM).
    * Constraint: Slots automatically lock when they hit max capacity (Default: 3 orders/slot).
* **Room Selection:** Choose delivery location from a dynamic list managed by Admin.
* **Live Tracking:** Watch order status change from Pending -> Preparing -> Ready.
* **Notifications:** Browser alert when food is "Ready".
* **Order History:** Separate tab for Past/Completed orders.

### Staff/Kitchen Portal
* **Live Queue:** Auto-refreshing list of incoming orders sorted by Time Slot.
* **Tabbed Interface:** Separate views for "Active Orders" and "Past History".
* **Status Control:** Update status to Preparing, Ready, Delivered, or Cancelled.
* **Order Details:** View items, quantities, delivery room, and time slot at a glance.

### Admin Portal
* **User Management:** View all users, change roles (Faculty/Staff/Admin), or delete users.
* **Menu Management:** Add, delete, or toggle availability of food items.
* **Room Management:** Add or remove rooms available for delivery.
* **Time Slot Management:**
    * Create new time slots (Start Time, End Time).
    * Set maximum order capacity per slot.
    * Delete old slots.

---

## Tech Stack

* **Frontend:** HTML5, CSS3, Vanilla JavaScript (Fetch API).
* **Backend:** Node.js, Express.js.
* **Database:** MySQL.
* **Authentication:** Bcrypt (Password Hashing).

---

## Project Structure

MAGIS-CANTEEN/
├── .env                  # Database credentials
├── server.js             # Main entry point
├── db.js                 # Database connection pool
├── package.json          # Dependencies
├── routes/
│   ├── authRoutes.js     # Login & Register
│   ├── facultyRoutes.js  # Faculty ordering logic
│   ├── staffRoutes.js    # Kitchen queue logic
│   └── adminRoutes.js    # Admin management logic
└── public/
    ├── index.html        # Login Page
    ├── admin-dashboard.html
    ├── faculty-dashboard.html
    ├── staff-dashboard.html
    ├── css/
    │   ├── auth.css      # Login styles
    │   └── dashboard.css # Dashboard layout
    └── js/
        ├── auth.js       # Login logic
        ├── faculty.js    # Faculty frontend logic
        ├── staff.js      # Staff frontend logic
        └── admin.js      # Admin frontend logic

---

## Installation & Setup

### 1. Prerequisites
* Node.js (v14+)
* MySQL Server

### 2. Install Dependencies
npm init -y
npm install express mysql2 dotenv bcrypt
npm install --save-dev nodemon

### 3. Database Setup
Run the following SQL in MySQL Workbench to create the schema:

CREATE DATABASE magis_canteen;
USE magis_canteen;

-- Users Table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('faculty', 'staff', 'admin') DEFAULT 'faculty',
    department VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Menu Table
CREATE TABLE menu (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(50),
    available BOOLEAN DEFAULT 1
);

-- Rooms Table
CREATE TABLE rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

-- Time Slots Table
CREATE TABLE timeslots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    start_time VARCHAR(10) NOT NULL,
    end_time VARCHAR(10) NOT NULL,
    max_orders INT DEFAULT 3
);

-- Orders Table
CREATE TABLE orders (
    order_id VARCHAR(50) PRIMARY KEY,
    user_id INT,
    faculty_email VARCHAR(100),
    items JSON NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status ENUM('Pending', 'Preparing', 'Ready', 'Delivered', 'Cancelled') DEFAULT 'Pending',
    room VARCHAR(50),
    time_slot_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Seed Data (Defaults)
INSERT INTO rooms (name) VALUES ('Staff Room'), ('AV Room');
INSERT INTO menu (name, price, category) VALUES ('Veg Sandwich', 50, 'Snacks'), ('Tea', 15, 'Drinks');
INSERT INTO timeslots (start_time, end_time, max_orders) VALUES 
('09:00', '10:00', 3), 
('10:00', '11:00', 3),
('11:00', '12:00', 3);

### 4. Configuration (.env)
Create a .env file in the root directory:

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=magis_canteen
PORT=3000

### 5. Run Server
node server.js

Visit http://localhost:3000 to start using the app.

---

## Admin Credentials (Default)
You must manually insert the first admin user into the database via SQL (since there is no public registration for admins).

1. Go to https://bcrypt-generator.com/ and hash a password (e.g., admin123).
2. Run this SQL:

INSERT INTO users (name, email, password, role) 
VALUES ('Super Admin', 'admin@magis.com', 'YOUR_HASHED_PASSWORD_HERE', 'admin');

---

## License
Developed for St. Joseph's University, Bangalore.