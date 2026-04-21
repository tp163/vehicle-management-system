const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); 

// MySQL Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '' ,                 // empty for default XAMPP
    database: 'vsms'
});

db.connect(err => {
    if (err) {
        console.error('Failed to connect to MySQL:', err.stack);
        process.exit(1);
    }
    console.log('Connected to MySQL database "vsms"');
    
    // Initialize booking_requests table if it doesn't exist
    const createTableSql = `CREATE TABLE IF NOT EXISTS booking_requests (
        booking_request_id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        vehicle_id INT NOT NULL,
        plate_no VARCHAR(20),
        service_date DATE,
        service_type VARCHAR(100),
        description TEXT,
        status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
        requested_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        approved_date DATETIME,
        rejected_date DATETIME,
        rejection_reason TEXT,
        service_id INT,
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;
    
    db.query(createTableSql, (err) => {
        if (err) {
            console.error('Error creating booking_requests table:', err.message);
        } else {
            console.log('booking_requests table is ready');
        }
    });

    const createActivityTableSql = `CREATE TABLE IF NOT EXISTS activity_logs (
        activity_id INT AUTO_INCREMENT PRIMARY KEY,
        action_type VARCHAR(80) NOT NULL,
        message VARCHAR(255) NOT NULL,
        severity ENUM('info', 'success', 'warning', 'danger') DEFAULT 'info',
        meta_json TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

    db.query(createActivityTableSql, (err) => {
        if (err) {
            console.error('Error creating activity_logs table:', err.message);
        } else {
            console.log('activity_logs table is ready');
        }
    });

    const createInvoicesTableSql = `CREATE TABLE IF NOT EXISTS invoices (
        invoice_id INT AUTO_INCREMENT PRIMARY KEY,
        invoice_no VARCHAR(50) NOT NULL UNIQUE,
        customer_id INT NOT NULL,
        vehicle_id INT NOT NULL,
        service_id INT,
        service_fee DECIMAL(10, 2) DEFAULT 0,
        parts_fee DECIMAL(10, 2) DEFAULT 0,
        total_amount DECIMAL(10, 2) DEFAULT 0,
        paid_amount DECIMAL(10, 2) DEFAULT 0,
        balance DECIMAL(10, 2) DEFAULT 0,
        status ENUM('Pending', 'Paid') DEFAULT 'Pending',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id),
        FOREIGN KEY (service_id) REFERENCES services(service_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

    db.query(createInvoicesTableSql, (err) => {
        if (err) {
            console.error('Error creating invoices table:', err.message);
        } else {
            console.log('invoices table is ready');
        }
    });

    // Backward-compatible migration for existing invoices tables.
    db.query('ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT 0', (err) => {
        if (err) console.error('Error ensuring invoices.paid_amount:', err.message);
    });
    db.query('ALTER TABLE invoices ADD COLUMN IF NOT EXISTS balance DECIMAL(10,2) DEFAULT 0', (err) => {
        if (err) console.error('Error ensuring invoices.balance:', err.message);
    });
    db.query(`
        UPDATE invoices
        SET paid_amount = COALESCE(paid_amount, 0),
            balance = GREATEST(COALESCE(total_amount, 0) - COALESCE(paid_amount, 0), 0),
            status = CASE WHEN GREATEST(COALESCE(total_amount, 0) - COALESCE(paid_amount, 0), 0) <= 0 THEN 'Paid' ELSE 'Pending' END
    `, (err) => {
        if (err) console.error('Error normalizing invoice balances:', err.message);
    });
});

function logActivity(actionType, message, severity = 'info', meta = null) {
    const sql = 'INSERT INTO activity_logs (action_type, message, severity, meta_json) VALUES (?, ?, ?, ?)';
    db.query(sql, [actionType, message, severity, meta ? JSON.stringify(meta) : null], (err) => {
        if (err) console.error('Activity log insert failed:', err.message);
    });
}

// ────────────────────────────────────────────────
// NEW: LOGIN ROUTE
// ────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    const sql = "SELECT * FROM customers WHERE email = ?";
    db.query(sql, [email], (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });

        if (results.length > 0) {
            const customer = results[0];
            // Check password (matches '123' from your table)
            if (password === customer.password || password === customer.phone) {
                res.status(200).json({ 
                    message: "Login Successful", 
                    user: customer 
                });
            } else {
                res.status(401).json({ message: "Incorrect password!" });
            }
        } else {
            res.status(404).json({ message: "Email not found. Please register." });
        }
    });
});

app.post('/api/customer-auth', (req, res) => {
    const { full_name, phone, email, address, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    db.query('SELECT * FROM customers WHERE LOWER(email) = ?', [normalizedEmail], (findErr, results) => {
        if (findErr) {
            return res.status(500).json({ message: 'Database error' });
        }

        if (results.length > 0) {
            const customer = results[0];
            if (password === customer.password || password === customer.phone) {
                return res.status(200).json({
                    message: 'Login Successful',
                    created: false,
                    user: customer
                });
            }

            return res.status(401).json({ message: 'Incorrect password!' });
        }

        if (!full_name || !phone) {
            return res.status(400).json({ message: 'Full name and phone are required for new customer registration.' });
        }

        db.query('SELECT MAX(customer_id) AS maxId FROM customers', (maxErr, maxRows) => {
            if (maxErr) {
                return res.status(500).json({ message: 'Database error' });
            }

            const nextIdNumber = (maxRows[0].maxId || 0) + 1;
            const reg_no = `CRN-${1000 + nextIdNumber}`;
            const insertSql = 'INSERT INTO customers (reg_no, full_name, phone, email, address, password) VALUES (?, ?, ?, ?, ?, ?)';
            const safeAddress = address || '';

            db.query(insertSql, [reg_no, full_name, phone, normalizedEmail, safeAddress, password], (insertErr, insertResult) => {
                if (insertErr) {
                    if (insertErr.code === 'ER_DUP_ENTRY') {
                        return res.status(409).json({ message: 'Email already exists. Please log in.' });
                    }
                    return res.status(500).json({ message: insertErr.message });
                }

                db.query('SELECT * FROM customers WHERE customer_id = ?', [insertResult.insertId], (readErr, insertedRows) => {
                    if (readErr) {
                        return res.status(500).json({ message: 'Customer created but failed to load profile.' });
                    }

                    const createdCustomer = insertedRows[0];
                    logActivity('customer_register', `Customer registered via booking: ${createdCustomer.full_name}`, 'success', {
                        customer_id: createdCustomer.customer_id,
                        email: createdCustomer.email
                    });

                    res.status(201).json({
                        message: 'Customer registered and logged in',
                        created: true,
                        user: createdCustomer
                    });
                });
            });
        });
    });
});

// ────────────────────────────────────────────────
// INVENTORY ROUTES
// ────────────────────────────────────────────────
app.get('/inventory', (req, res) => {
    db.query('SELECT * FROM inventory', (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(results);
    });
});

app.post('/inventory', (req, res) => {
    const { part_id, name, category, price, qty } = req.body;
    const sql = `INSERT INTO inventory (part_id, name, category, price, qty) VALUES (?, ?, ?, ?, ?)`;
    db.query(sql, [part_id, name, category, price, qty], (err, result) => {
        if (err) return res.status(500).json({ error: 'Failed' });
        logActivity('inventory_add', `Inventory item added: ${name}`, 'success', { id: result.insertId, part_id, qty });
        res.status(201).json({ id: result.insertId, message: 'Item added' });
    });
});

app.put('/inventory/:id', (req, res) => {
    const { qty } = req.body;
    db.query('UPDATE inventory SET qty = ? WHERE id = ?', [qty, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: 'Update failed' });
        logActivity('inventory_update', `Inventory #${req.params.id} quantity updated to ${qty}`, 'info', { id: Number(req.params.id), qty });
        res.json({ message: 'Stock updated' });
    });
});

app.delete('/inventory/:id', (req, res) => {
    db.query('DELETE FROM inventory WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: 'Delete failed' });
        logActivity('inventory_delete', `Inventory #${req.params.id} deleted`, 'warning', { id: Number(req.params.id) });
        res.json({ message: 'Item deleted' });
    });
});

// ────────────────────────────────────────────────
// CUSTOMER ROUTES
// ────────────────────────────────────────────────
app.get('/customers', (req, res) => {
    db.query('SELECT * FROM customers ORDER BY customer_id DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/customers', (req, res) => {
    const { full_name, phone, email, address } = req.body;

    db.query('SELECT MAX(customer_id) as maxId FROM customers', (err, result) => {
        if (err) return res.status(500).json({ error: err.message });

        const nextIdNumber = (result[0].maxId || 0) + 1;
        const reg_no = `CRN-${1000 + nextIdNumber}`;
        
        // CHANGE IS HERE: We save the 'phone' into the 'password' column by default
        const sql = `INSERT INTO customers (reg_no, full_name, phone, email, address, password) VALUES (?, ?, ?, ?, ?, ?)`;
        
        db.query(sql, [reg_no, full_name, phone, email, address, phone], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            logActivity('customer_add', `Customer added: ${full_name}`, 'success', { reg_no, email });
            res.status(201).json({ message: 'Customer added', reg_no: reg_no });
        });
    });
});

// UPDATE CUSTOMER PROFILE
app.put('/customers/:id', (req, res) => {
    const { full_name, phone, email, address, password } = req.body;
    const customerId = req.params.id;

    const sql = `UPDATE customers SET full_name = ?, phone = ?, email = ?, address = ?, password = ? WHERE customer_id = ?`;
    
    db.query(sql, [full_name, phone, email, address, password || phone, customerId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        logActivity('customer_update', `Customer profile updated (#${customerId})`, 'info', { customer_id: Number(customerId), full_name, email });
        res.json({ message: 'Customer profile updated successfully' });
    });
});

// ────────────────────────────────────────────────
// REPORTS
// ────────────────────────────────────────────────
app.post('/reports/save', (req, res) => {
    const { report_type, from_date, to_date, summary_data } = req.body;
    const sql = `INSERT INTO reports_history (report_type, from_date, to_date, summary_data) VALUES (?, ?, ?, ?)`;
    db.query(sql, [report_type, from_date, to_date, JSON.stringify(summary_data)], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Report snapshot saved' });
    });
});

// ────────────────────────────────────────────────
// VEHICLES (Converted to callbacks to prevent crashes)
// ────────────────────────────────────────────────
// 1. GET ALL VEHICLES (JOIN with customers to get the name)
app.get('/api/vehicles', (req, res) => {
    const sql = `
        SELECT v.*, c.full_name AS owner_name
        FROM vehicles v
        LEFT JOIN customers c ON v.customer_id = c.customer_id
        ORDER BY v.vehicle_id DESC
    `;

    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 2. CREATE VEHICLE
app.post('/api/vehicles', (req, res) => {
    const { plate_no, brand, model, customer_id, year, status } = req.body;
    const sql = `
        INSERT INTO vehicles (plate_no, brand, model, customer_id, year, status)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [plate_no, brand, model, customer_id, year, status], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        logActivity('vehicle_add', `Vehicle added: ${plate_no} (${brand} ${model})`, 'success', { vehicle_id: result.insertId, customer_id, status });
        res.status(201).json({ message: 'Vehicle added', id: result.insertId });
    });
});

// 3. UPDATE VEHICLE STATUS
app.put('/api/vehicles/:id', (req, res) => {
    const { status } = req.body;
    const sql = 'UPDATE vehicles SET status = ? WHERE vehicle_id = ?';

    db.query(sql, [status, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        logActivity('vehicle_update', `Vehicle #${req.params.id} status changed to ${status}`, 'info', { vehicle_id: Number(req.params.id), status });
        res.json({ message: 'Vehicle updated' });
    });
});

// 4. DELETE VEHICLE
app.delete('/api/vehicles/:id', (req, res) => {
    const sql = 'DELETE FROM vehicles WHERE vehicle_id = ?';

    db.query(sql, [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        logActivity('vehicle_delete', `Vehicle #${req.params.id} deleted`, 'warning', { vehicle_id: Number(req.params.id) });
        res.json({ message: 'Vehicle deleted' });
    });
});


// ────────────────────────────────────────────────
// SERVICE ROUTES
// ────────────────────────────────────────────────

// 0. GET ALL MECHANICS (for Services form dropdown)
app.get('/api/mechanics', (req, res) => {
    const sql = 'SELECT mechanic_id, full_name FROM mechanics ORDER BY full_name ASC';
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 1. GET ALL SERVICES (JOIN to get Plate No and Mechanic Name)
app.get('/api/services', (req, res) => {
    const sql = `
        SELECT s.*, v.plate_no, m.full_name AS mechanic_name 
        FROM services s
        LEFT JOIN vehicles v ON s.vehicle_id = v.vehicle_id
        LEFT JOIN mechanics m ON s.mechanic_id = m.mechanic_id
        ORDER BY s.service_id DESC
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 2. CREATE NEW SERVICE JOB
app.post('/api/services', (req, res) => {
    const { job_no, vehicle_id, mechanic_id, mechanic_name, service_type, status, cost } = req.body;

    if (!job_no || !vehicle_id || !service_type || !status) {
        return res.status(400).json({ error: 'Missing required fields for service job' });
    }

    const insertService = (resolvedMechanicId) => {
        const sql = `INSERT INTO services (job_no, vehicle_id, mechanic_id, service_type, status, cost, service_date) 
                    VALUES (?, ?, ?, ?, ?, ?, NOW())`;

        db.query(sql, [job_no, vehicle_id, resolvedMechanicId, service_type, status, cost], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            logActivity('service_create', `Service job ${job_no} created (${service_type})`, 'success', { service_id: result.insertId, vehicle_id });
            res.status(201).json({ message: "Job Started", id: result.insertId });
        });
    };

    if (mechanic_id) {
        insertService(mechanic_id);
        return;
    }

    if (!mechanic_name) {
        return res.status(400).json({ error: 'Please select a mechanic' });
    }

    const findMechanicSql = 'SELECT mechanic_id FROM mechanics WHERE full_name = ? LIMIT 1';
    db.query(findMechanicSql, [mechanic_name], (findErr, rows) => {
        if (findErr) return res.status(500).json({ error: findErr.message });

        if (rows.length > 0) {
            insertService(rows[0].mechanic_id);
            return;
        }

        const insertMechanicSql = 'INSERT INTO mechanics (full_name, specialization, experience_years, phone_no, status) VALUES (?, ?, ?, ?, ?)';
        db.query(insertMechanicSql, [mechanic_name, 'General', 0, '-', 'Available'], (insertErr, mechanicResult) => {
            if (insertErr) return res.status(500).json({ error: insertErr.message });
            insertService(mechanicResult.insertId);
        });
    });
});

// 3. UPDATE SERVICE STATUS/COST
app.put('/api/services/:id', (req, res) => {
    const { status, cost } = req.body;
    const sql = "UPDATE services SET status = ?, cost = ? WHERE service_id = ?";
    db.query(sql, [status, cost, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        logActivity('service_update', `Service #${req.params.id} updated to ${status}`, 'info', { service_id: Number(req.params.id), status, cost });
        res.json({ message: "Service Updated" });
    });
});

// 4. DELETE SERVICE
app.delete('/api/services/:id', (req, res) => {
    db.query("DELETE FROM services WHERE service_id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        logActivity('service_delete', `Service #${req.params.id} deleted`, 'warning', { service_id: Number(req.params.id) });
        res.json({ message: "Job Deleted" });
    });
});


// ────────────────────────────────────────────────
// BOOKING REQUESTS ROUTES
// ────────────────────────────────────────────────

// 1. CREATE NEW BOOKING REQUEST (from customer)
app.post('/api/booking-requests', (req, res) => {
    const { customer_id, vehicle_id, plate_no, service_date, service_type, description } = req.body;

    if (!customer_id || !vehicle_id || !service_date || !service_type) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const sql = `INSERT INTO booking_requests (customer_id, vehicle_id, plate_no, service_date, service_type, description, status, requested_date) 
                 VALUES (?, ?, ?, ?, ?, ?, 'Pending', NOW())`;

    db.query(sql, [customer_id, vehicle_id, plate_no, service_date, service_type, description || ''], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        logActivity('booking_request', `New booking request from customer #${customer_id} for ${plate_no}`, 'info', { booking_request_id: result.insertId, customer_id, vehicle_id, service_type });
        res.status(201).json({ message: 'Booking request submitted', id: result.insertId });
    });
});

// DASHBOARD ACTIVITY FEED
app.get('/api/dashboard/activity', (req, res) => {
    const limit = Number(req.query.limit) > 0 ? Math.min(Number(req.query.limit), 25) : 10;
    const sql = 'SELECT activity_id, action_type, message, severity, created_at FROM activity_logs ORDER BY created_at DESC LIMIT ?';
    db.query(sql, [limit], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 2. GET ALL BOOKING REQUESTS (with customer and vehicle details)
app.get('/api/booking-requests', (req, res) => {
    const sql = `
        SELECT br.*, c.full_name, c.email, c.phone, v.brand, v.model, v.year
        FROM booking_requests br
        LEFT JOIN customers c ON br.customer_id = c.customer_id
        LEFT JOIN vehicles v ON br.vehicle_id = v.vehicle_id
        ORDER BY br.requested_date DESC
    `;

    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 2.1 GET BOOKING REQUESTS FOR A SPECIFIC CUSTOMER
app.get('/api/booking-requests/customer/:customerId', (req, res) => {
    const customerId = req.params.customerId;
    const sql = `
        SELECT br.*, v.brand, v.model, v.year
        FROM booking_requests br
        LEFT JOIN vehicles v ON br.vehicle_id = v.vehicle_id
        WHERE br.customer_id = ?
        ORDER BY br.requested_date DESC
    `;

    db.query(sql, [customerId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 3. GET PENDING BOOKING REQUESTS ONLY
app.get('/api/booking-requests/pending', (req, res) => {
    const sql = `
        SELECT br.*, c.full_name, c.email, c.phone, v.brand, v.model, v.year
        FROM booking_requests br
        LEFT JOIN customers c ON br.customer_id = c.customer_id
        LEFT JOIN vehicles v ON br.vehicle_id = v.vehicle_id
        WHERE br.status = 'Pending'
        ORDER BY br.requested_date DESC
    `;

    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 4. APPROVE BOOKING REQUEST (convert to service job)
app.put('/api/booking-requests/:id/approve', (req, res) => {
    const { mechanic_id } = req.body;
    const bookingId = req.params.id;

    // First, get the booking request details
    db.query('SELECT * FROM booking_requests WHERE booking_request_id = ?', [bookingId], (err, bookings) => {
        if (err) return res.status(500).json({ error: err.message });
        if (bookings.length === 0) return res.status(404).json({ error: 'Booking request not found' });

        const booking = bookings[0];

        // Create a service job
        const jobNo = `JOB-${Date.now()}`;
        const createServiceSql = `INSERT INTO services (job_no, vehicle_id, mechanic_id, service_type, status, service_date, cost)
                                  VALUES (?, ?, ?, ?, 'Pending', ?, 0)`;

        db.query(createServiceSql, [jobNo, booking.vehicle_id, mechanic_id || null, booking.service_type, booking.service_date], (serviceErr, result) => {
            if (serviceErr) return res.status(500).json({ error: serviceErr.message });

            // Update booking request status to 'Approved'
            db.query('UPDATE booking_requests SET status = ?, service_id = ?, approved_date = NOW() WHERE booking_request_id = ?',
                     ['Approved', result.insertId, bookingId], (updateErr) => {
                if (updateErr) return res.status(500).json({ error: updateErr.message });
                logActivity('booking_approve', `Booking request #${bookingId} approved`, 'success', { booking_request_id: Number(bookingId), service_id: result.insertId, mechanic_id: mechanic_id || null });
                res.json({ message: 'Booking approved and service job created', service_id: result.insertId });
            });
        });
    });
});

// 5. REJECT BOOKING REQUEST (with reason/note)
app.put('/api/booking-requests/:id/reject', (req, res) => {
    const { rejection_reason } = req.body;
    const bookingId = req.params.id;

    if (!rejection_reason) {
        return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const sql = `UPDATE booking_requests SET status = 'Rejected', rejection_reason = ?, rejected_date = NOW() WHERE booking_request_id = ?`;

    db.query(sql, [rejection_reason, bookingId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        logActivity('booking_reject', `Booking request #${bookingId} rejected`, 'danger', { booking_request_id: Number(bookingId), rejection_reason });
        res.json({ message: 'Booking request rejected' });
    });
});


// ────────────────────────────────────────────────
// INVOICES ROUTES
// ────────────────────────────────────────────────

// 1. GET ALL INVOICES (with optional filters)
app.get('/api/invoices', (req, res) => {
    const { customer_id, status } = req.query;
    let sql = `
        SELECT i.*, c.full_name AS customer_name, v.plate_no, v.brand, v.model
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.customer_id
        LEFT JOIN vehicles v ON i.vehicle_id = v.vehicle_id
    `;
    let params = [];

    if (customer_id) {
        sql += ' WHERE i.customer_id = ?';
        params.push(customer_id);
        if (status) {
            sql += ' AND i.status = ?';
            params.push(status);
        }
    } else if (status) {
        sql += ' WHERE i.status = ?';
        params.push(status);
    }

    sql += ' ORDER BY i.created_at DESC';

    db.query(sql, params, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 2. GET INVOICES FOR SPECIFIC CUSTOMER
app.get('/api/invoices/customer/:customerId', (req, res) => {
    const sql = `
        SELECT i.*, c.full_name AS customer_name, v.plate_no, v.brand, v.model
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.customer_id
        LEFT JOIN vehicles v ON i.vehicle_id = v.vehicle_id
        WHERE i.customer_id = ?
        ORDER BY i.created_at DESC
    `;
    db.query(sql, [req.params.customerId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 3. GET SINGLE INVOICE
app.get('/api/invoices/:invoiceId', (req, res) => {
    const sql = `
        SELECT i.*, c.full_name AS customer_name, v.plate_no, v.brand, v.model
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.customer_id
        LEFT JOIN vehicles v ON i.vehicle_id = v.vehicle_id
        WHERE i.invoice_id = ?
    `;
    db.query(sql, [req.params.invoiceId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: 'Invoice not found' });
        res.json(results[0]);
    });
});

// 4. CREATE NEW INVOICE
app.post('/api/invoices', (req, res) => {
    const {
        invoice_no, customer_id, vehicle_id, service_id,
        service_fee, parts_fee, paid_amount, description, status
    } = req.body;

    if (!invoice_no || !customer_id || !vehicle_id) {
        return res.status(400).json({ error: 'Missing required fields: invoice_no, customer_id, vehicle_id' });
    }

    const serviceFee = parseFloat(service_fee || 0);
    const partsFee = parseFloat(parts_fee || 0);
    const totalAmount = serviceFee + partsFee;
    const paidAmountRaw = parseFloat(paid_amount || 0);
    const paidAmount = Math.max(paidAmountRaw, 0);
    const balance = Math.abs(totalAmount - paidAmount);
    const invoiceStatus = status || (paidAmount >= totalAmount ? 'Paid' : 'Pending');

    const sql = `INSERT INTO invoices 
        (invoice_no, customer_id, vehicle_id, service_id, service_fee, parts_fee, total_amount, paid_amount, balance, status, description) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.query(sql, [
        invoice_no, customer_id, vehicle_id, service_id || null, 
        serviceFee, partsFee, totalAmount, paidAmount, balance, invoiceStatus, description || null
    ], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'Invoice with this job number already exists' });
            }
            return res.status(500).json({ error: err.message });
        }
        logActivity('invoice_create', `Invoice ${invoice_no} created for customer ${customer_id}`, 'success', { invoice_id: result.insertId });
        res.status(201).json({ message: 'Invoice created', invoice_id: result.insertId });
    });
});

// 5. UPDATE INVOICE (mark as paid, update amount)
app.put('/api/invoices/:invoiceId', (req, res) => {
    const { status, service_fee, parts_fee, paid_amount, description } = req.body;
    const invoiceId = req.params.invoiceId;

    const getSql = 'SELECT * FROM invoices WHERE invoice_id = ?';
    
    db.query(getSql, [invoiceId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: 'Invoice not found' });

        const currentInvoice = results[0];
        const serviceFee = parseFloat(service_fee !== undefined ? service_fee : currentInvoice.service_fee) || 0;
        const partsFee = parseFloat(parts_fee !== undefined ? parts_fee : currentInvoice.parts_fee) || 0;
        const totalAmount = serviceFee + partsFee;
        const paidAmountRaw = parseFloat(paid_amount !== undefined ? paid_amount : currentInvoice.paid_amount) || 0;
        const paidAmount = Math.max(paidAmountRaw, 0);
        const balance = Math.abs(totalAmount - paidAmount);
        const newStatus = status || (paidAmount >= totalAmount ? 'Paid' : 'Pending');
        const newDescription = description !== undefined ? description : currentInvoice.description;

        const updateSql = 'UPDATE invoices SET service_fee = ?, parts_fee = ?, total_amount = ?, paid_amount = ?, balance = ?, status = ?, description = ? WHERE invoice_id = ?';
        db.query(updateSql, [serviceFee, partsFee, totalAmount, paidAmount, balance, newStatus, newDescription, invoiceId], (updateErr) => {
            if (updateErr) return res.status(500).json({ error: updateErr.message });
            logActivity('invoice_update', `Invoice #${invoiceId} updated to ${newStatus}`, 'info', { invoice_id: Number(invoiceId), total_amount: totalAmount, paid_amount: paidAmount, balance });
            res.json({ message: 'Invoice updated', invoice_id: invoiceId, total_amount: totalAmount, paid_amount: paidAmount, balance, status: newStatus });
        });
    });
});

// 6. DELETE INVOICE
app.delete('/api/invoices/:invoiceId', (req, res) => {
    const sql = 'DELETE FROM invoices WHERE invoice_id = ?';
    db.query(sql, [req.params.invoiceId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        logActivity('invoice_delete', `Invoice #${req.params.invoiceId} deleted`, 'warning', { invoice_id: Number(req.params.invoiceId) });
        res.json({ message: 'Invoice deleted' });
    });
});


// ────────────────────────────────────────────────
// START SERVER
// ────────────────────────────────────────────────
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});