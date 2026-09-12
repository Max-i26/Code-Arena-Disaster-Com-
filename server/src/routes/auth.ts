import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbService, DbUser } from '../db/databaseService';

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'resqcity-disaster-response-secret-key-2026';

// 1. REGISTER
authRouter.post('/register', async (req, res) => {
  try {
    const { 
      username, 
      password, 
      fullName, 
      email, 
      role = 'CITIZEN', 
      phone = '', 
      wardId = 'ward-01',
      nicNumber = '',
      nicDocumentUrl = '',
      officialDetails = ''
    } = req.body;

    if (!username || !password || !fullName) {
      return res.status(400).json({ error: 'Username, password, and full name are required.' });
    }

    // Admin registration protection
    if (role === 'SYSTEM_ADMIN') {
      return res.status(403).json({ error: 'System Admin accounts cannot be created via public registration. Admin accounts can only be created by an existing System Administrator.' });
    }

    // Official personnel NIC & document verification check
    const isOfficialRole = role === 'COUNCIL_OFFICER' || role === 'FIELD_CREW' || role === 'RELIEF_DESK';
    if (isOfficialRole) {
      if (!nicNumber.trim() || !nicDocumentUrl.trim()) {
        return res.status(400).json({ error: 'NIC (National Identity Card) Number and uploaded NIC Document proof are required for official personnel account registration.' });
      }
    }

    // Check existing user
    const existing = await dbService.getUserByUsername(username);
    if (existing) {
      return res.status(400).json({ error: `Username "${username}" is already taken. Please log in or choose another.` });
    }

    const hash = await bcrypt.hash(password, 10);
    const userId = `usr-${role.toLowerCase()}-${Date.now()}`;
    const verificationStatus = isOfficialRole ? 'PENDING' : 'APPROVED';

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
      verificationStatus,
      nicNumber: nicNumber.trim(),
      nicDocumentUrl: nicDocumentUrl.trim(),
      officialDetails: officialDetails.trim(),
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
      message: isOfficialRole
        ? 'Account registered successfully! Verification status: PENDING. System Administrator must review your NIC and employee credentials before portal access is activated.'
        : 'Citizen account created successfully!',
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

    if (user.verificationStatus === 'REJECTED') {
      return res.status(403).json({ error: 'Verification Rejected: Your official registration was not approved by the system administrator.' });
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

// 4. ADMIN: GET PENDING VERIFICATION QUEUE
authRouter.get('/pending-verifications', async (req, res) => {
  try {
    const pendingUsers = await dbService.getPendingUsers();
    const safeUsers = pendingUsers.map(({ passwordHash, ...rest }) => rest);
    res.json({ success: true, pendingUsers: safeUsers });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch pending verifications.' });
  }
});

// 5. ADMIN: VERIFY / APPROVE USER ACCOUNT
authRouter.post('/verify-user', async (req, res) => {
  try {
    const { userId, status } = req.body;
    if (!userId || (status !== 'APPROVED' && status !== 'REJECTED')) {
      return res.status(400).json({ error: 'User ID and valid status (APPROVED or REJECTED) are required.' });
    }

    await dbService.updateUserVerification(userId, status);
    res.json({ success: true, message: `User verification updated to ${status}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update user verification status.' });
  }
});

// 6. ADMIN: CREATE NEW SYSTEM ADMIN ACCOUNT
authRouter.post('/create-admin', async (req, res) => {
  try {
    const { username, password, fullName, email = '', phone = '' } = req.body;

    if (!username || !password || !fullName) {
      return res.status(400).json({ error: 'Username, password, and full name are required to create an Admin.' });
    }

    const existing = await dbService.getUserByUsername(username);
    if (existing) {
      return res.status(400).json({ error: `Username "${username}" is already taken.` });
    }

    const hash = await bcrypt.hash(password, 10);
    const userId = `usr-admin-${Date.now()}`;

    const newAdmin: DbUser = {
      id: userId,
      username: username.toLowerCase().trim(),
      passwordHash: hash,
      fullName: fullName.trim(),
      email: email || `${username}@resqcity.gov.lk`,
      role: 'SYSTEM_ADMIN',
      phone,
      wardId: 'ward-01',
      trustScore: 1.0,
      createdAt: new Date().toISOString(),
      verificationStatus: 'APPROVED',
    };

    await dbService.createUser(newAdmin);
    const { passwordHash, ...userPayload } = newAdmin;

    res.json({
      success: true,
      message: `System Admin account "${username}" created successfully!`,
      user: userPayload,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create System Admin account.' });
  }
});

// 7. LOGOUT
authRouter.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});
