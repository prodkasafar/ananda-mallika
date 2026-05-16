import express from 'express';
import cors from 'cors';
import pool, { initDb } from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Users API
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users', async (req, res) => {
    const { name, email, role } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO users (name, email, role) VALUES ($1, $2, $3) 
             ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name RETURNING *`,
            [name, email, role || 'Guest']
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/users/role', async (req, res) => {
    const { email, role } = req.body;
    try {
        const result = await pool.query(
            'UPDATE users SET role = $1 WHERE email = $2 RETURNING *',
            [role, email]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Properties API
app.get('/api/properties', async (req, res) => {
    try {
        const result = await pool.query('SELECT name FROM properties ORDER BY id');
        res.json(result.rows.map(r => r.name));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/properties', async (req, res) => {
    const { name } = req.body;
    try {
        const result = await pool.query('INSERT INTO properties (name) VALUES ($1) RETURNING name', [name]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/properties', async (req, res) => {
    const { oldName, newName } = req.body;
    try {
        await pool.query('UPDATE properties SET name = $1 WHERE name = $2', [newName, oldName]);
        await pool.query('UPDATE bookings SET property = $1 WHERE property = $2', [newName, oldName]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/properties/:name', async (req, res) => {
    try {
        await pool.query('DELETE FROM properties WHERE name = $1', [req.params.name]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Bookings API
app.get('/api/bookings', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM bookings ORDER BY created_at DESC');
        const camelCased = result.rows.map(b => ({
            id: b.id,
            userEmail: b.user_email,
            guestName: b.guest_name,
            property: b.property,
            checkIn: b.check_in.toISOString().split('T')[0],
            checkOut: b.check_out.toISOString().split('T')[0],
            countryCode: b.country_code,
            mobile: b.mobile,
            dob: b.dob ? b.dob.toISOString().split('T')[0] : null,
            gender: b.gender,
            guests: b.guests,
            status: b.status,
            createdAt: b.created_at
        }));
        res.json(camelCased);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/bookings', async (req, res) => {
    const b = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO bookings (id, user_email, guest_name, property, check_in, check_out, country_code, mobile, dob, gender, guests, status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
            [b.id, b.userEmail, b.guestName, b.property, b.checkIn, b.checkOut, b.countryCode, b.mobile, b.dob, b.gender, b.guests, b.status || 'Confirmed']
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/bookings/:id/cancel', async (req, res) => {
    try {
        const result = await pool.query(
            "UPDATE bookings SET status = 'Cancelled' WHERE id = $1 RETURNING *",
            [req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Sync local storage data endpoint
app.post('/api/sync', async (req, res) => {
    const { users, properties, bookings } = req.body;
    try {
        await pool.query('BEGIN');
        
        if (users && users.length > 0) {
            for (const u of users) {
                await pool.query(
                    'INSERT INTO users (name, email, role) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING',
                    [u.name, u.email, u.role]
                );
            }
        }

        if (properties && properties.length > 0) {
            for (const p of properties) {
                await pool.query(
                    'INSERT INTO properties (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
                    [p]
                );
            }
        }

        if (bookings && bookings.length > 0) {
            for (const b of bookings) {
                await pool.query(
                    `INSERT INTO bookings (id, user_email, guest_name, property, check_in, check_out, country_code, mobile, dob, gender, guests, status) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) ON CONFLICT (id) DO NOTHING`,
                    [b.id, b.userEmail, b.guestName, b.property, b.checkIn, b.checkOut, b.countryCode, b.mobile, b.dob, b.gender, b.guests, b.status || 'Confirmed']
                );
            }
        }

        await pool.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await pool.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
});

initDb().then(() => {
    app.listen(PORT, () => {
        console.log(`Backend server running on http://localhost:${PORT}`);
    });
});
