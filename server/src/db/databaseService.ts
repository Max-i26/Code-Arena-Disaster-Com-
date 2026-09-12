import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { 
  UserRole, 
  HazardCase, 
  CouncilTicket, 
  Shelter, 
  FieldCrew, 
  ReliefRequest, 
  SensorTelemetry, 
  AiTuningLog 
} from '../types';

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
const EMBEDDED_SQL_FILE = path.join(__dirname, 'resqcity_sqlite_db.json');

class DatabaseService {
  private pool: mysql.Pool | null = null;
  private isConnectedToMysql = false;

  // Embedded SQL Table Storage (Maintained locally and synced with MySQL when active)
  private tables = {
    users: new Map<string, DbUser>(),
    cases: new Map<string, HazardCase>(),
    tickets: new Map<string, CouncilTicket>(),
    shelters: new Map<string, Shelter>(),
    field_crews: new Map<string, FieldCrew>(),
    relief_requests: new Map<string, ReliefRequest>(),
    sensors: new Map<string, SensorTelemetry>(),
    ai_tuning_logs: new Map<string, AiTuningLog>(),
    banned_users: new Set<string>(),
  };

  constructor() {
    this.loadEmbeddedSqlStore();
    this.initDatabase();
  }

  private loadEmbeddedSqlStore() {
    try {
      // 1. Load users legacy file if available
      if (fs.existsSync(PERSISTENT_USERS_FILE)) {
        const raw = fs.readFileSync(PERSISTENT_USERS_FILE, 'utf-8');
        const list: DbUser[] = JSON.parse(raw);
        if (Array.isArray(list)) {
          for (const u of list) {
            if (u && u.username) {
              this.tables.users.set(u.username.toLowerCase().trim(), u);
            }
          }
        }
      }

      // 2. Load embedded SQL database file if available
      if (fs.existsSync(EMBEDDED_SQL_FILE)) {
        const raw = fs.readFileSync(EMBEDDED_SQL_FILE, 'utf-8');
        const data = JSON.parse(raw);
        if (data.users && Array.isArray(data.users)) {
          for (const u of data.users) {
            if (u && u.username) this.tables.users.set(u.username.toLowerCase().trim(), u);
          }
        }
        if (data.cases && Array.isArray(data.cases)) {
          for (const c of data.cases) if (c && c.id) this.tables.cases.set(c.id, c);
        }
        if (data.tickets && Array.isArray(data.tickets)) {
          for (const t of data.tickets) if (t && t.id) this.tables.tickets.set(t.id, t);
        }
        if (data.shelters && Array.isArray(data.shelters)) {
          for (const s of data.shelters) if (s && s.id) this.tables.shelters.set(s.id, s);
        }
        if (data.field_crews && Array.isArray(data.field_crews)) {
          for (const fc of data.field_crews) if (fc && fc.id) this.tables.field_crews.set(fc.id, fc);
        }
        if (data.relief_requests && Array.isArray(data.relief_requests)) {
          for (const r of data.relief_requests) if (r && r.id) this.tables.relief_requests.set(r.id, r);
        }
        if (data.sensors && Array.isArray(data.sensors)) {
          for (const s of data.sensors) if (s && (s.id || s.stationId)) this.tables.sensors.set(s.id || s.stationId, s);
        }
        if (data.ai_tuning_logs && Array.isArray(data.ai_tuning_logs)) {
          for (const l of data.ai_tuning_logs) if (l && l.id) this.tables.ai_tuning_logs.set(l.id, l);
        }
        if (data.banned_users && Array.isArray(data.banned_users)) {
          this.tables.banned_users = new Set(data.banned_users);
        }
        console.log(`[ResQCity SQL DB] Loaded embedded database tables from disk.`);
      }
    } catch (err: any) {
      console.warn('[ResQCity SQL DB] Error loading database file:', err.message);
    }
  }

  private saveEmbeddedSqlStore() {
    try {
      const payload = {
        users: Array.from(this.tables.users.values()),
        cases: Array.from(this.tables.cases.values()),
        tickets: Array.from(this.tables.tickets.values()),
        shelters: Array.from(this.tables.shelters.values()),
        field_crews: Array.from(this.tables.field_crews.values()),
        relief_requests: Array.from(this.tables.relief_requests.values()),
        sensors: Array.from(this.tables.sensors.values()),
        ai_tuning_logs: Array.from(this.tables.ai_tuning_logs.values()),
        banned_users: Array.from(this.tables.banned_users),
      };
      fs.writeFileSync(EMBEDDED_SQL_FILE, JSON.stringify(payload, null, 2), 'utf-8');
      fs.writeFileSync(PERSISTENT_USERS_FILE, JSON.stringify(payload.users, null, 2), 'utf-8');
    } catch (err: any) {
      console.error('[ResQCity SQL DB] Error saving database tables:', err.message);
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
      const tempConnection = await mysql.createConnection({
        host: process.env.MYSQL_HOST || 'localhost',
        port: Number(process.env.MYSQL_PORT) || 3306,
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
      });

      await tempConnection.query('CREATE DATABASE IF NOT EXISTS `resqcity_db`');
      await tempConnection.end();

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

      // 1. Table: users
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
          \`nic_document_url\` LONGTEXT,
          \`official_details\` LONGTEXT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 2. Table: cases
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
          \`image_url\` LONGTEXT,
          \`description\` LONGTEXT,
          \`road_closed\` BOOLEAN DEFAULT FALSE,
          \`urgency\` VARCHAR(32),
          \`confidence_score\` FLOAT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 3. Table: tickets
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
          \`resolution_photo_url\` LONGTEXT,
          \`resolution_notes\` LONGTEXT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 4. Table: shelters
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

      // 5. Table: field_crews
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

      // 6. Table: relief_requests
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS \`relief_requests\` (
          \`id\` VARCHAR(128) PRIMARY KEY,
          \`case_id\` VARCHAR(128),
          \`citizen_name\` VARCHAR(128),
          \`citizen_phone\` VARCHAR(64),
          \`household_count\` INT,
          \`status\` VARCHAR(64),
          \`created_at\` DATETIME
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 7. Table: sensors
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS \`sensors\` (
          \`id\` VARCHAR(128) PRIMARY KEY,
          \`type\` VARCHAR(64),
          \`ward_id\` VARCHAR(64),
          \`location_name\` VARCHAR(255),
          \`status\` VARCHAR(32),
          \`last_value\` FLOAT,
          \`unit\` VARCHAR(32)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 8. Table: ai_tuning_logs
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS \`ai_tuning_logs\` (
          \`id\` VARCHAR(128) PRIMARY KEY,
          \`case_id\` VARCHAR(128),
          \`officer_id\` VARCHAR(128),
          \`officer_action\` VARCHAR(64),
          \`confidence_score\` FLOAT,
          \`created_at\` DATETIME
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 9. Table: banned_users
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS \`banned_users\` (
          \`user_id\` VARCHAR(128) PRIMARY KEY,
          \`banned_at\` DATETIME
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Schema Migration for existing databases: ensure image/large text columns are LONGTEXT
      try {
        await this.pool.query('ALTER TABLE `users` MODIFY COLUMN `nic_document_url` LONGTEXT;');
        await this.pool.query('ALTER TABLE `users` MODIFY COLUMN `official_details` LONGTEXT;');
        await this.pool.query('ALTER TABLE `cases` MODIFY COLUMN `image_url` LONGTEXT;');
        await this.pool.query('ALTER TABLE `cases` MODIFY COLUMN `description` LONGTEXT;');
        await this.pool.query('ALTER TABLE `tickets` MODIFY COLUMN `resolution_photo_url` LONGTEXT;');
        await this.pool.query('ALTER TABLE `tickets` MODIFY COLUMN `resolution_notes` LONGTEXT;');
      } catch (alterErr: any) {
        console.warn('[ResQCity SQL DB] Schema alter warning (ignorable if columns up to date):', alterErr.message);
      }

      this.isConnectedToMysql = true;
      console.log('[ResQCity SQL DB] Successfully connected to MySQL Engine (localhost:3306 / resqcity_db)');

      // Sync all embedded table records into MySQL
      for (const u of this.tables.users.values()) {
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

      for (const c of this.tables.cases.values()) {
        this.saveCase(c);
      }
      for (const t of this.tables.tickets.values()) {
        this.saveTicket(t);
      }
      for (const s of this.tables.shelters.values()) {
        this.saveShelter(s);
      }
      for (const fc of this.tables.field_crews.values()) {
        this.saveFieldCrew(fc);
      }
      for (const r of this.tables.relief_requests.values()) {
        this.saveReliefRequest(r);
      }
      for (const s of this.tables.sensors.values()) {
        this.saveSensor(s);
      }
      for (const l of this.tables.ai_tuning_logs.values()) {
        this.saveAiLog(l);
      }
      for (const u of this.tables.banned_users) {
        this.saveBannedUser(u);
      }

    } catch (err: any) {
      console.warn('[ResQCity SQL DB] MySQL Engine offline. Using Embedded SQL Engine (resqcity_sqlite_db.json). Details:', err.message);
      this.isConnectedToMysql = false;
    }

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
        verificationStatus: 'PENDING',
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
        verificationStatus: 'PENDING',
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
        verificationStatus: 'PENDING',
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

    return this.tables.users.get(cleanUsername) || null;
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

    for (const u of this.tables.users.values()) {
      if (u.id === id) return u;
    }
    return null;
  }

  public async getAllUsers(): Promise<DbUser[]> {
    const allUsers: DbUser[] = [];
    if (this.isConnectedToMysql && this.pool) {
      try {
        const [rows]: any = await this.pool.query('SELECT * FROM `users` ORDER BY `created_at` DESC');
        if (rows) {
          for (const r of rows) {
            allUsers.push({
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
          return allUsers;
        }
      } catch (err) {
        console.error('MySQL query error:', err);
      }
    }

    return Array.from(this.tables.users.values());
  }

  public async createUser(user: DbUser): Promise<DbUser> {
    const cleanUsername = user.username.toLowerCase().trim();
    user.username = cleanUsername;
    
    // All registrations require Admin approval except System Admins
    if (user.verificationStatus === undefined) {
      user.verificationStatus = (user.role === 'SYSTEM_ADMIN') ? 'APPROVED' : 'PENDING';
    }

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
        console.log(`[ResQCity SQL DB] Inserted user "${user.username}" into MySQL table "users"`);
      } catch (err: any) {
        console.error('[ResQCity SQL DB] Failed to insert user into MySQL:', err.message);
      }
    }

    this.tables.users.set(cleanUsername, user);
    this.saveEmbeddedSqlStore();
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

    for (const u of this.tables.users.values()) {
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

    for (const u of this.tables.users.values()) {
      if (u.id === userId) {
        u.verificationStatus = status;
        this.saveEmbeddedSqlStore();
        return true;
      }
    }
    return true;
  }

  // --- Entity Table Sync Methods ---

  public saveCase(c: HazardCase) {
    this.tables.cases.set(c.id, c);
    this.saveEmbeddedSqlStore();
    if (this.isConnectedToMysql && this.pool) {
      this.pool.query(
        `INSERT INTO \`cases\` (\`id\`, \`report_id\`, \`source\`, \`created_at\`, \`hazard_type\`, \`status\`, \`road_name\`, \`ward_id\`, \`image_url\`, \`description\`, \`road_closed\`, \`urgency\`, \`confidence_score\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE \`status\` = VALUES(\`status\`), \`road_closed\` = VALUES(\`road_closed\`), \`urgency\` = VALUES(\`urgency\`), \`confidence_score\` = VALUES(\`confidence_score\`)`,
        [
          c.id,
          c.reportId || '',
          c.source || 'CITIZEN',
          this.toMysqlDatetime(c.createdAt),
          c.hazardType,
          c.status,
          c.location?.roadName || 'Main Corridor',
          c.location?.wardId || 'ward-01',
          c.imageUrl || '',
          c.description || '',
          c.roadClosed ? 1 : 0,
          c.urgency,
          c.verdictData?.confidenceScore || 0.85,
        ]
      ).catch(() => {});
    }
  }

  public saveTicket(t: CouncilTicket) {
    this.tables.tickets.set(t.id, t);
    this.saveEmbeddedSqlStore();
    if (this.isConnectedToMysql && this.pool) {
      this.pool.query(
        `INSERT INTO \`tickets\` (\`id\`, \`case_id\`, \`created_at\`, \`ward_id\`, \`hazard_type\`, \`urgency\`, \`status\`, \`assigned_crew_id\`, \`assigned_crew_name\`, \`resolution_photo_url\`, \`resolution_notes\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE \`status\` = VALUES(\`status\`), \`assigned_crew_id\` = VALUES(\`assigned_crew_id\`), \`assigned_crew_name\` = VALUES(\`assigned_crew_name\`), \`resolution_photo_url\` = VALUES(\`resolution_photo_url\`), \`resolution_notes\` = VALUES(\`resolution_notes\`)`,
        [
          t.id,
          t.caseId,
          this.toMysqlDatetime(t.createdAt),
          t.wardId,
          t.hazardType,
          t.urgency,
          t.status,
          t.assignedCrewId || '',
          t.assignedCrewName || '',
          t.resolutionPhotoUrl || '',
          t.resolutionNotes || '',
        ]
      ).catch(() => {});
    }
  }

  public saveShelter(s: Shelter) {
    this.tables.shelters.set(s.id, s);
    this.saveEmbeddedSqlStore();
    if (this.isConnectedToMysql && this.pool) {
      this.pool.query(
        `INSERT INTO \`shelters\` (\`id\`, \`name\`, \`ward_id\`, \`total_capacity\`, \`occupied\`, \`contact_phone\`)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE \`name\` = VALUES(\`name\`), \`total_capacity\` = VALUES(\`total_capacity\`), \`occupied\` = VALUES(\`occupied\`), \`contact_phone\` = VALUES(\`contact_phone\`)`,
        [s.id, s.name, s.wardId, s.totalCapacity, s.currentOccupancy, s.contactPhone || '']
      ).catch(() => {});
    }
  }

  public saveFieldCrew(fc: FieldCrew) {
    this.tables.field_crews.set(fc.id, fc);
    this.saveEmbeddedSqlStore();
    if (this.isConnectedToMysql && this.pool) {
      this.pool.query(
        `INSERT INTO \`field_crews\` (\`id\`, \`name\`, \`ward_id\`, \`specialization\`, \`status\`, \`contact_phone\`)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE \`name\` = VALUES(\`name\`), \`status\` = VALUES(\`status\`), \`contact_phone\` = VALUES(\`contact_phone\`)`,
        [fc.id, fc.name, fc.wardId, fc.specialization, fc.status, fc.contactPhone || '']
      ).catch(() => {});
    }
  }

  public saveReliefRequest(req: ReliefRequest) {
    this.tables.relief_requests.set(req.id, req);
    this.saveEmbeddedSqlStore();
    if (this.isConnectedToMysql && this.pool) {
      this.pool.query(
        `INSERT INTO \`relief_requests\` (\`id\`, \`case_id\`, \`citizen_name\`, \`citizen_phone\`, \`household_count\`, \`status\`, \`created_at\`)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE \`status\` = VALUES(\`status\`)`,
        [req.id, req.caseId || '', req.citizenName, req.citizenPhone, req.householdCount, req.status, this.toMysqlDatetime(req.createdAt)]
      ).catch(() => {});
    }
  }

  public saveSensor(sensor: SensorTelemetry) {
    const sensorId = sensor.id || sensor.stationId;
    this.tables.sensors.set(sensorId, sensor);
    this.saveEmbeddedSqlStore();
    if (this.isConnectedToMysql && this.pool) {
      this.pool.query(
        `INSERT INTO \`sensors\` (\`id\`, \`type\`, \`ward_id\`, \`location_name\`, \`status\`, \`last_value\`, \`unit\`)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE \`status\` = VALUES(\`status\`), \`last_value\` = VALUES(\`last_value\`)`,
        [sensorId, sensor.type, sensor.wardId, sensor.locationName, sensor.status, sensor.lastReading?.value || 0, sensor.unit]
      ).catch(() => {});
    }
  }

  public saveAiLog(log: AiTuningLog) {
    this.tables.ai_tuning_logs.set(log.id, log);
    this.saveEmbeddedSqlStore();
    if (this.isConnectedToMysql && this.pool) {
      this.pool.query(
        `INSERT INTO \`ai_tuning_logs\` (\`id\`, \`case_id\`, \`officer_id\`, \`officer_action\`, \`confidence_score\`, \`created_at\`)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE \`officer_action\` = VALUES(\`officer_action\`)`,
        [log.id, log.caseId, log.officerAction || 'AGREED', log.officerAction, log.originalAiConfidence || 0.85, this.toMysqlDatetime(log.timestamp)]
      ).catch(() => {});
    }
  }

  public saveBannedUser(userId: string) {
    this.tables.banned_users.add(userId);
    this.saveEmbeddedSqlStore();
    if (this.isConnectedToMysql && this.pool) {
      this.pool.query(
        `INSERT IGNORE INTO \`banned_users\` (\`user_id\`, \`banned_at\`) VALUES (?, ?)`,
        [userId, this.toMysqlDatetime()]
      ).catch(() => {});
    }
  }

  public removeBannedUser(userId: string) {
    this.tables.banned_users.delete(userId);
    this.saveEmbeddedSqlStore();
    if (this.isConnectedToMysql && this.pool) {
      this.pool.query(
        `DELETE FROM \`banned_users\` WHERE \`user_id\` = ?`,
        [userId]
      ).catch(() => {});
    }
  }

  public getDbStatus() {
    return {
      connectedToMysql: this.isConnectedToMysql,
      engine: this.isConnectedToMysql ? 'MySQL Relational Database Engine' : 'Embedded SQL Database File Engine',
      host: this.isConnectedToMysql ? 'localhost:3306' : 'resqcity_sqlite_db.json',
      databaseName: 'resqcity_db',
      activeTables: [
        'users',
        'cases',
        'tickets',
        'shelters',
        'field_crews',
        'relief_requests',
        'sensors',
        'ai_tuning_logs',
        'banned_users',
      ],
      tableCounts: {
        users: this.tables.users.size,
        cases: this.tables.cases.size,
        tickets: this.tables.tickets.size,
        shelters: this.tables.shelters.size,
        field_crews: this.tables.field_crews.size,
        relief_requests: this.tables.relief_requests.size,
        sensors: this.tables.sensors.size,
        ai_tuning_logs: this.tables.ai_tuning_logs.size,
        banned_users: this.tables.banned_users.size,
      },
    };
  }
}

export const dbService = new DatabaseService();
