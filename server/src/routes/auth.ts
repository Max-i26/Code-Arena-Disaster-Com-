import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbService, DbUser } from '../db/databaseService';

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'resqcity-disaster-response-secret-key-2026';

// 1. REGISTER
authRouter.post('/register', async (req, res) => {
  try {
    const { username, password, fullName, email, role = 'CITIZEN', phone = '', wardId = 'ward-01' } = req.body;

    if (!username || !password || !fullName) {
      return res.status(400).json({ error: 'Username, password, and full name are required.' });
    }

    // Check existing user
    const existing = await dbService.getUserByUsername(username);
    if (existing) {
      return res.status(400).json({ error: `Username "${username}" is already taken. Please log in or choose another.` });
    }

    const hash = await bcrypt.hash(password, 10);
    const userId = `usr-${role.toLowerCase()}-${Date.now()}`;

    const newUser: DbUser = {
      id: userId,
      username: username.toLowerCase().trim(),
      passwordHash: hash,
      fullName: fullName.trim(),
      email: email || `${username}@resqcity.lk`,
      role,
      phone,
      wardId,
      trustScore: role === 'CITIZEN' ? 0.85 : 1.0,
      createdAt: new Date().toISOString(),
    };

    await dbService.createUser(newUser);

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id, username: newUser.username, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { passwordHash, ...userPayload } = newUser;

    res.json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: userPayload,
      dbStatus: dbService.getDbStatus(),
    });
  } catch (err: any) {
    console.error('Registration Error:', err);
    res.status(500).json({ error: err.message || 'Internal server error during registration.' });
  }
});

// 2. LOGIN
authRouter.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const user = await dbService.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { passwordHash, ...userPayload } = user;

    res.json({
      success: true,
      token,
      user: userPayload,
      dbStatus: dbService.getDbStatus(),
    });
  } catch (err: any) {
    console.error('Login Error:', err);
    res.status(500).json({ error: err.message || 'Internal server error during login.' });
  }
});

// 3. GET CURRENT LOGGED-IN USER PROFILE
authRouter.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded: any = jwt.verify(token, JWT_SECRET);

    const user = await dbService.getUserById(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: 'User account not found' });
    }

    const { passwordHash, ...userPayload } = user;
    res.json({ user: userPayload, dbStatus: dbService.getDbStatus() });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
});

// 4. LOGOUT
authRouter.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});
