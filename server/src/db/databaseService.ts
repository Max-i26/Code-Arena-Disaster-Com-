import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
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

const PERSISTENT_USERS_FILE = path.join(__dirname, 'persistent_users.json');

class DatabaseService {
  private pool: mysql.Pool | null = null;
  private isConnectedToMysql = false;

  // Fallback persistent memory storage if XAMPP MySQL is offline
  private fallbackUsers: Map<string, DbUser> = new Map();

  constructor() {
    this.loadPersistentUsers();
    this.initDatabase();
  }

  private loadPersistentUsers() {
    try {
      if (fs.existsSync(PERSISTENT_USERS_FILE)) {
        const raw = fs.readFileSync(PERSISTENT_USERS_FILE, 'utf-8');
        const list: DbUser[] = JSON.parse(raw);
        if (Array.isArray(list)) {
          for (const u of list) {
            if (u && u.username) {
              this.fallbackUsers.set(u.username.toLowerCase().trim(), u);
            }
          }
          console.log(`[ResQCity DB] Loaded ${list.length} persistent user accounts from disk.`);
        }
      }
    } catch (err: any) {
      console.warn('[ResQCity DB] Error loading persistent users file:', err.message);
    }
  }

  private savePersistentUsers() {
    try {
      const list = Array.from(this.fallbackUsers.values());
      fs.writeFileSync(PERSISTENT_USERS_FILE, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err: any) {
      console.error('[ResQCity DB] Error saving persistent users to disk:', err.message);
    }
  }

  private toMysqlDatetime(isoOrDate?: string | Date): string {
    try {
      const d = isoOrDate ? new Date(isoOrDate) : new Date();
      if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 19).replace('T', ' ');
      return d.toISOString().slice(0, 19).replace('T', ' ');
    } catch (e) {
      return new Date().toISOString().slice(0, 19).replace('T', ' ');
    }
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

      // Create cases table schema
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS \`cases\` (
          \`id\` VARCHAR(128) PRIMARY KEY,
          \`report_id\` VARCHAR(128),
          \`source\` VARCHAR(64),
          \`created_at\` DATETIME,
          \`hazard_type\` VARCHAR(64),
          \`status\` VARCHAR(64),
          \`road_name\` VARCHAR(255),
          \`ward_id\` VARCHAR(64),
          \`image_url\` TEXT,
          \`description\` TEXT,
          \`road_closed\` BOOLEAN DEFAULT FALSE,
          \`urgency\` VARCHAR(32),
          \`confidence_score\` FLOAT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Create tickets table schema
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS \`tickets\` (
          \`id\` VARCHAR(128) PRIMARY KEY,
          \`case_id\` VARCHAR(128),
          \`created_at\` DATETIME,
          \`ward_id\` VARCHAR(64),
          \`hazard_type\` VARCHAR(64),
          \`urgency\` VARCHAR(32),
          \`status\` VARCHAR(32),
          \`assigned_crew_id\` VARCHAR(128),
          \`assigned_crew_name\` VARCHAR(128),
          \`resolution_photo_url\` TEXT,
          \`resolution_notes\` TEXT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Create shelters table schema
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS \`shelters\` (
          \`id\` VARCHAR(128) PRIMARY KEY,
          \`name\` VARCHAR(128),
          \`ward_id\` VARCHAR(64),
          \`total_capacity\` INT,
          \`occupied\` INT,
          \`contact_phone\` VARCHAR(64)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Create field_crews table schema
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS \`field_crews\` (
          \`id\` VARCHAR(128) PRIMARY KEY,
          \`name\` VARCHAR(128),
          \`ward_id\` VARCHAR(64),
          \`specialization\` VARCHAR(64),
          \`status\` VARCHAR(64),
          \`contact_phone\` VARCHAR(64)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      this.isConnectedToMysql = true;
      console.log('[ResQCity DB] Successfully connected to XAMPP MySQL (localhost:3306 / resqcity_db)');

      // Sync disk users to MySQL
      for (const u of this.fallbackUsers.values()) {
        try {
          await this.pool.query(
            `INSERT IGNORE INTO \`users\` (\`id\`, \`username\`, \`password_hash\`, \`full_name\`, \`email\`, \`role\`, \`phone\`, \`ward_id\`, \`trust_score\`, \`created_at\`, \`verification_status\`, \`nic_number\`, \`nic_document_url\`, \`official_details\`)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              u.id,
              u.username,
              u.passwordHash,
              u.fullName,
              u.email,
              u.role,
              u.phone || '',
              u.wardId || 'ward-01',
              u.trustScore || 0.85,
              this.toMysqlDatetime(u.createdAt),
              u.verificationStatus || 'APPROVED',
              u.nicNumber || '',
              u.nicDocumentUrl || '',
              u.officialDetails || '',
            ]
          );
        } catch (e) { }
      }
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
    const cleanUsername = username.toLowerCase().trim();
    if (this.isConnectedToMysql && this.pool) {
      try {
        const [rows]: any = await this.pool.query('SELECT * FROM `users` WHERE `username` = ?', [cleanUsername]);
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
      } catch (err) {
        console.error('MySQL query error:', err);
      }
    }

    // Fallback disk memory store
    const u = this.fallbackUsers.get(cleanUsername);
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
      } catch (err) {
        console.error('MySQL query error:', err);
      }
    }

    // Fallback disk memory store
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
            this.toMysqlDatetime(user.createdAt),
            user.verificationStatus,
            user.nicNumber || '',
            user.nicDocumentUrl || '',
            user.officialDetails || '',
          ]
        );
        console.log(`[ResQCity DB] Successfully inserted user "${user.username}" into MySQL database (resqcity_db.users)`);
      } catch (err: any) {
        console.error('[ResQCity DB] Failed to insert user into MySQL:', err.message);
      }
    }

    this.fallbackUsers.set(cleanUsername, user);
    this.savePersistentUsers();
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
              verificationStatus: r.verification_status || 'PENDING',
              nicNumber: r.nic_number,
              nicDocumentUrl: r.nic_document_url,
              officialDetails: r.official_details,
            });
          }
          return pendingUsers;
        }
      } catch (err) {
        console.error('MySQL query error:', err);
      }
    }

    // Fallback disk memory store
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
        console.error('MySQL query error:', err);
      }
    }

    // Fallback memory update & disk sync
    for (const u of this.fallbackUsers.values()) {
      if (u.id === userId) {
        u.verificationStatus = status;
        this.savePersistentUsers();
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
      persistentUserCount: this.fallbackUsers.size,
    };
  }
}

export const dbService = new DatabaseService();
