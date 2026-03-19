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
    password: '',                 // empty for default XAMPP
    database: 'vsms'
});

db.connect(err => {
    if (err) {
        console.error('Failed to connect to MySQL:', err.stack);
        process.exit(1);
    }
    console.log('Connected to MySQL database "vsms_db"');
});

// ────────────────────────────────────────────────
// INVENTORY ROUTES (Unchanged)
// ────────────────────────────────────────────────

app.get('/inventory', (req, res) => {
    db.query('SELECT * FROM inventory', (err, results) => {
        if (err) {
            console.error('GET /inventory error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
});

app.post('/inventory', (req, res) => {
    const { part_id, name, category, price, qty } = req.body;
    if (!name || !category || !price || !qty) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    const sql = `INSERT INTO inventory (part_id, name, category, price, qty) VALUES (?, ?, ?, ?, ?)`;
    db.query(sql, [part_id, name, category, price, qty], (err, result) => {
        if (err) return res.status(500).json({ error: 'Failed to add item' });
        res.status(201).json({ id: result.insertId, message: 'Item added' });
    });
});

app.put('/inventory/:id', (req, res) => {
    const { qty } = req.body;
    const { id } = req.params;
    const sql = 'UPDATE inventory SET qty = ? WHERE id = ?';
    db.query(sql, [qty, id], (err, result) => {
        if (err) return res.status(500).json({ error: 'Update failed' });
        res.json({ message: 'Stock updated' });
    });
});

app.delete('/inventory/:id', (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM inventory WHERE id = ?', [id], (err, result) => {
        if (err) return res.status(500).json({ error: 'Delete failed' });
        res.json({ message: 'Item deleted' });
    });
});

// ────────────────────────────────────────────────
// CUSTOMER ROUTES (Updated for Reliability)
// ────────────────────────────────────────────────

// 1. GET all customers
app.get('/customers', (req, res) => {
    db.query('SELECT * FROM customers ORDER BY customer_id DESC', (err, results) => {
        if (err) {
            console.error("Error fetching customers:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// 2. POST - Register new customer
app.post('/customers', (req, res) => {
    const { full_name, phone, email, address } = req.body;

    // Use MAX(customer_id) instead of COUNT to prevent duplicate CRN numbers if rows are deleted
    db.query('SELECT MAX(customer_id) as maxId FROM customers', (err, result) => {
        if (err) {
            console.error("Error checking ID count:", err);
            return res.status(500).json({ error: err.message });
        }

        const nextIdNumber = (result[0].maxId || 0) + 1;
        const reg_no = `CRN-${1000 + nextIdNumber}`;

        const sql = `INSERT INTO customers (reg_no, full_name, phone, email, address) VALUES (?, ?, ?, ?, ?)`;
        
        db.query(sql, [reg_no, full_name, phone, email, address], (err, insertResult) => {
            if (err) {
                console.error("SQL INSERT ERROR:", err.message);
                return res.status(500).json({ error: err.message });
            }
            console.log(`Successfully saved customer: ${reg_no}`);
            res.status(201).json({ message: 'Customer added', reg_no: reg_no });
        });
    });
});

// 3. DELETE customer
app.delete('/customers/:id', (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM customers WHERE customer_id = ?', [id], (err, result) => {
        if (err) {
            console.error("Delete Error:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Customer deleted' });
    });
});

// ────────────────────────────────────────────────
// START SERVER
// ────────────────────────────────────────────────
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});