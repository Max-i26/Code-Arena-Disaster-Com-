import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { UserRole } from '../types';

export interface DbUser {
  id: string;
  username: string;
  passwordHash: string;
  fullName: string;
  email: string;
  role: UserRole;
  phone: string;
  wardId: string;
  trustScore: number;
  createdAt: string;
  verificationStatus?: 'APPROVED' | 'PENDING' | 'REJECTED';
  nicNumber?: string;
  nicDocumentUrl?: string;
  officialDetails?: string;
}

class DatabaseService {
  private pool: mysql.Pool | null = null;
  private isConnectedToMysql = false;

  // Fallback persistent memory storage if XAMPP MySQL is offline
  private fallbackUsers: Map<string, DbUser> = new Map();

  constructor() {
    this.initDatabase();
  }

  public async initDatabase() {
    try {
      // Connect to XAMPP MySQL
      const tempConnection = await mysql.createConnection({
        host: process.env.MYSQL_HOST || 'localhost',
        port: Number(process.env.MYSQL_PORT) || 3306,
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
      });

      // Create database if not exists
      await tempConnection.query('CREATE DATABASE IF NOT EXISTS `resqcity_db`');
      await tempConnection.end();

      // Create pool
      this.pool = mysql.createPool({
        host: process.env.MYSQL_HOST || 'localhost',
        port: Number(process.env.MYSQL_PORT) || 3306,
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: 'resqcity_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });

      // Create users table schema
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS \`users\` (
          \`id\` VARCHAR(128) PRIMARY KEY,
          \`username\` VARCHAR(64) UNIQUE NOT NULL,
          \`password_hash\` VARCHAR(255) NOT NULL,
          \`full_name\` VARCHAR(128) NOT NULL,
          \`email\` VARCHAR(128) NOT NULL,
          \`role\` VARCHAR(64) NOT NULL,
          \`phone\` VARCHAR(32),
          \`ward_id\` VARCHAR(64),
          \`trust_score\` FLOAT DEFAULT 0.85,
          \`created_at\` DATETIME NOT NULL,
          \`verification_status\` VARCHAR(32) DEFAULT 'APPROVED',
          \`nic_number\` VARCHAR(64),
          \`nic_document_url\` TEXT,
          \`official_details\` TEXT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      this.isConnectedToMysql = true;
      console.log('[ResQCity DB] Successfully connected to XAMPP MySQL (localhost:3306 / resqcity_db)');
    } catch (err: any) {
      console.warn('[ResQCity DB] XAMPP MySQL offline or unavailable. Falling back to persistent store. Error:', err.message);
      this.isConnectedToMysql = false;
    }

    // Seed default demo accounts for all 5 roles
    await this.seedDefaultAccounts();
  }

  private async seedDefaultAccounts() {
    const defaultPassword = 'password123';
    const hash = await bcrypt.hash(defaultPassword, 10);
    const now = new Date().toISOString();

    const demoUsers: DbUser[] = [
      {
        id: 'usr-officer-01',
        username: 'officer_kasun',
        passwordHash: hash,
        fullName: 'Kasun Wickramasinghe (Council Officer)',
        email: 'officer.kasun@council.gov.lk',
        role: 'COUNCIL_OFFICER',
        phone: '+94 77 111 2222',
        wardId: 'ward-01',
        trustScore: 1.0,
        createdAt: now,
        verificationStatus: 'APPROVED',
        nicNumber: '199083740192V',
        officialDetails: 'CMC Command Division — Senior Officer ID #8841',
      },
      {
        id: 'usr-citizen-01',
        username: 'citizen_saman',
        passwordHash: hash,
        fullName: 'Saman Kumara (Citizen)',
        email: 'saman.k@gmail.com',
        role: 'CITIZEN',
        phone: '+94 77 345 6789',
        wardId: 'ward-02',
        trustScore: 0.88,
        createdAt: now,
        verificationStatus: 'APPROVED',
      },
      {
        id: 'usr-crew-01',
        username: 'crew_unit1',
        passwordHash: hash,
        fullName: 'Rapid Pump Squad 01 (Field Crew)',
        email: 'crew1@resqcity.lk',
        role: 'FIELD_CREW',
        phone: '+94 71 888 9999',
        wardId: 'ward-02',
        trustScore: 1.0,
        createdAt: now,
        verificationStatus: 'APPROVED',
        nicNumber: '198883740991V',
        officialDetails: 'Rapid Pump Squad 01 (Water Pumping & Drainage)',
      },
      {
        id: 'usr-relief-01',
        username: 'relief_agent',
        passwordHash: hash,
        fullName: 'Dilani Perera (Relief Coordinator)',
        email: 'dilani.p@shelters.org',
        role: 'RELIEF_DESK',
        phone: '+94 77 999 0000',
        wardId: 'ward-01',
        trustScore: 1.0,
        createdAt: now,
        verificationStatus: 'APPROVED',
        nicNumber: '199583740221V',
        officialDetails: 'Viharamahadevi Park Primary Relief Center',
      },
      {
        id: 'usr-admin-01',
        username: 'sys_admin',
        passwordHash: hash,
        fullName: 'System Administrator',
        email: 'admin@resqcity.gov.lk',
        role: 'SYSTEM_ADMIN',
        phone: '+94 11 200 0000',
        wardId: 'ward-01',
        trustScore: 1.0,
        createdAt: now,
        verificationStatus: 'APPROVED',
      },
    ];

    for (const u of demoUsers) {
      const existing = await this.getUserByUsername(u.username);
      if (!existing) {
        await this.createUser(u);
      }
    }
  }

  public async getUserByUsername(username: string): Promise<DbUser | null> {
    if (this.isConnectedToMysql && this.pool) {
      try {
        const [rows]: any = await this.pool.query('SELECT * FROM `users` WHERE `username` = ?', [username.toLowerCase().trim()]);
        if (rows && rows.length > 0) {
          const r = rows[0];
          return {
            id: r.id,
            username: r.username,
            passwordHash: r.password_hash,
            fullName: r.full_name,
            email: r.email,
            role: r.role as UserRole,
            phone: r.phone,
            wardId: r.ward_id,
            trustScore: r.trust_score,
            createdAt: r.created_at,
            verificationStatus: r.verification_status || 'APPROVED',
            nicNumber: r.nic_number,
            nicDocumentUrl: r.nic_document_url,
            officialDetails: r.official_details,
          };
        }
        return null;
      } catch (err) {
        console.error('MySQL query error:', err);
      }
    }

    // Fallback
    const u = this.fallbackUsers.get(username.toLowerCase().trim());
    return u || null;
  }

  public async getUserById(id: string): Promise<DbUser | null> {
    if (this.isConnectedToMysql && this.pool) {
      try {
        const [rows]: any = await this.pool.query('SELECT * FROM `users` WHERE `id` = ?', [id]);
        if (rows && rows.length > 0) {
          const r = rows[0];
          return {
            id: r.id,
            username: r.username,
            passwordHash: r.password_hash,
            fullName: r.full_name,
            email: r.email,
            role: r.role as UserRole,
            phone: r.phone,
            wardId: r.ward_id,
            trustScore: r.trust_score,
            createdAt: r.created_at,
            verificationStatus: r.verification_status || 'APPROVED',
            nicNumber: r.nic_number,
            nicDocumentUrl: r.nic_document_url,
            officialDetails: r.official_details,
          };
        }
        return null;
      } catch (err) {
        console.error('MySQL query error:', err);
      }
    }

    // Fallback
    for (const u of this.fallbackUsers.values()) {
      if (u.id === id) return u;
    }
    return null;
  }

  public async createUser(user: DbUser): Promise<DbUser> {
    const cleanUsername = user.username.toLowerCase().trim();
    user.username = cleanUsername;
    user.verificationStatus = user.verificationStatus || (user.role === 'CITIZEN' || user.role === 'SYSTEM_ADMIN' ? 'APPROVED' : 'PENDING');

    if (this.isConnectedToMysql && this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO \`users\` (\`id\`, \`username\`, \`password_hash\`, \`full_name\`, \`email\`, \`role\`, \`phone\`, \`ward_id\`, \`trust_score\`, \`created_at\`, \`verification_status\`, \`nic_number\`, \`nic_document_url\`, \`official_details\`)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            user.id,
            user.username,
            user.passwordHash,
            user.fullName,
            user.email,
            user.role,
            user.phone || '',
            user.wardId || 'ward-01',
            user.trustScore || 0.85,
            user.createdAt,
            user.verificationStatus,
            user.nicNumber || '',
            user.nicDocumentUrl || '',
            user.officialDetails || '',
          ]
        );
      } catch (err: any) {
        console.error('Failed to create user in MySQL:', err.message);
      }
    }

    this.fallbackUsers.set(cleanUsername, user);
    return user;
  }

  public async getPendingUsers(): Promise<DbUser[]> {
    const pendingUsers: DbUser[] = [];
    if (this.isConnectedToMysql && this.pool) {
      try {
        const [rows]: any = await this.pool.query('SELECT * FROM `users` WHERE `verification_status` = "PENDING"');
        if (rows) {
          for (const r of rows) {
            pendingUsers.push({
              id: r.id,
              username: r.username,
              passwordHash: r.password_hash,
              fullName: r.full_name,
              email: r.email,
              role: r.role as UserRole,
              phone: r.phone,
              wardId: r.ward_id,
              trustScore: r.trust_score,
              createdAt: r.created_at,
              verificationStatus: r.verification_status,
              nicNumber: r.nic_number,
              nicDocumentUrl: r.nic_document_url,
              officialDetails: r.official_details,
            });
          }
          return pendingUsers;
        }
      } catch (err) {
        console.error('MySQL pending query error:', err);
      }
    }

    // Fallback memory query
    for (const u of this.fallbackUsers.values()) {
      if (u.verificationStatus === 'PENDING') {
        pendingUsers.push(u);
      }
    }
    return pendingUsers;
  }

  public async updateUserVerification(userId: string, status: 'APPROVED' | 'REJECTED'): Promise<boolean> {
    if (this.isConnectedToMysql && this.pool) {
      try {
        await this.pool.query('UPDATE `users` SET `verification_status` = ? WHERE `id` = ?', [status, userId]);
      } catch (err) {
        console.error('MySQL verification update error:', err);
      }
    }

    // Fallback memory update
    for (const u of this.fallbackUsers.values()) {
      if (u.id === userId) {
        u.verificationStatus = status;
        return true;
      }
    }
    return true;
  }

  public getDbStatus() {
    return {
      connectedToMysql: this.isConnectedToMysql,
      host: 'localhost:3306',
      database: 'resqcity_db',
    };
  }
}

export const dbService = new DatabaseService();
