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
  AiTuningLog,
  CitizenReport
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
const PERSISTENT_STORE_FILE = path.join(__dirname, 'persistent_store.json');
const EMBEDDED_SQL_FILE = path.join(__dirname, 'resqcity_sqlite_db.json');

class DatabaseService {
  private pool: mysql.Pool | null = null;
  private isConnectedToMysql = false;

  // Embedded SQL Table Storage (Maintained locally and synced with MySQL when active)
  private tables = {
    users: new Map<string, DbUser>(),
    cases: new Map<string, HazardCase>(),
    reports: new Map<string, CitizenReport>(),
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
    this.seedInitialEntities();
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

      // Helper to populate tables from data object
      const populateData = (data: any) => {
        const users = data.users;
        if (users && Array.isArray(users)) {
          for (const u of users) {
            if (u && u.username) this.tables.users.set(u.username.toLowerCase().trim(), u);
          }
        }
        const cases = data.cases;
        if (cases && Array.isArray(cases)) {
          for (const c of cases) if (c && c.id) this.tables.cases.set(c.id, c);
        }
        const reports = data.reports;
        if (reports && Array.isArray(reports)) {
          for (const r of reports) if (r && r.id) this.tables.reports.set(r.id, r);
        }
        const tickets = data.tickets;
        if (tickets && Array.isArray(tickets)) {
          for (const t of tickets) if (t && t.id) this.tables.tickets.set(t.id, t);
        }
        const shelters = data.shelters;
        if (shelters && Array.isArray(shelters)) {
          for (const s of shelters) if (s && s.id) this.tables.shelters.set(s.id, s);
        }
        const fieldCrews = data.fieldCrews || data.field_crews;
        if (fieldCrews && Array.isArray(fieldCrews)) {
          for (const fc of fieldCrews) if (fc && fc.id) this.tables.field_crews.set(fc.id, fc);
        }
        const reliefRequests = data.reliefRequests || data.relief_requests;
        if (reliefRequests && Array.isArray(reliefRequests)) {
          for (const r of reliefRequests) if (r && r.id) this.tables.relief_requests.set(r.id, r);
        }
        const sensors = data.sensors;
        if (sensors && Array.isArray(sensors)) {
          for (const s of sensors) if (s && (s.id || s.stationId)) this.tables.sensors.set(s.id || s.stationId, s);
        }
        const aiTuningLogs = data.aiTuningLogs || data.ai_tuning_logs;
        if (aiTuningLogs && Array.isArray(aiTuningLogs)) {
          for (const l of aiTuningLogs) if (l && l.id) this.tables.ai_tuning_logs.set(l.id, l);
        }
        const bannedUsers = data.bannedUsers || data.banned_users;
        if (bannedUsers && Array.isArray(bannedUsers)) {
          this.tables.banned_users = new Set(bannedUsers);
        }
      };

      // 2. Load persistent_store.json file if available
      if (fs.existsSync(PERSISTENT_STORE_FILE)) {
        const raw = fs.readFileSync(PERSISTENT_STORE_FILE, 'utf-8');
        populateData(JSON.parse(raw));
        console.log(`[ResQCity SQL DB] Loaded database tables from persistent_store.json.`);
      } else if (fs.existsSync(EMBEDDED_SQL_FILE)) {
        const raw = fs.readFileSync(EMBEDDED_SQL_FILE, 'utf-8');
        populateData(JSON.parse(raw));
        console.log(`[ResQCity SQL DB] Loaded embedded database tables from resqcity_sqlite_db.json.`);
      }
    } catch (err: any) {
      console.warn('[ResQCity SQL DB] Error loading database file:', err.message);
    }
  }

  private seedInitialEntities() {
    if (this.tables.shelters.size === 0) {
      const defaultShelters: Shelter[] = [
        {
          id: 'shelter-01',
          name: 'Viharamahadevi Park Primary Relief Center',
          wardId: 'ward-01',
          totalCapacity: 200,
          currentOccupancy: 87,
          contactPhone: '+94 11 269 5121',
          availableBeds: 113,
          supplies: { foodPacks: 450, waterLitres: 2500, medicalKits: 45, blankets: 300 },
          status: 'OPEN'
        },
        {
          id: 'shelter-02',
          name: 'Kolonnawa Youth Center Evacuation Shelter',
          wardId: 'ward-02',
          totalCapacity: 150,
          currentOccupancy: 37,
          contactPhone: '+94 11 253 0892',
          availableBeds: 113,
          supplies: { foodPacks: 300, waterLitres: 1800, medicalKits: 30, blankets: 200 },
          status: 'OPEN'
        },
        {
          id: 'shelter-03',
          name: 'Kandy City Indoor Stadium Relief Camp',
          wardId: 'ward-09',
          totalCapacity: 300,
          currentOccupancy: 110,
          contactPhone: '+94 81 222 4444',
          availableBeds: 190,
          supplies: { foodPacks: 600, waterLitres: 4000, medicalKits: 60, blankets: 450 },
          status: 'OPEN'
        }
      ];
      for (const s of defaultShelters) this.tables.shelters.set(s.id, s);
    }

    if (this.tables.field_crews.size === 0) {
      const defaultCrews: FieldCrew[] = [
        {
          id: 'crew-01',
          name: 'Rapid Pump Squad 01 (Water Pumping & Drainage)',
          wardId: 'ward-02',
          specialization: 'FLOOD',
          status: 'AVAILABLE',
          contactPhone: '+94 71 888 9999'
        },
        {
          id: 'crew-02',
          name: 'Tree Clearance Heavy Chainsaw Squad 04',
          wardId: 'ward-01',
          specialization: 'FALLEN_TREE',
          status: 'AVAILABLE',
          contactPhone: '+94 71 777 6666'
        },
        {
          id: 'crew-03',
          name: 'Landslide Slope Stabilization Unit 03',
          wardId: 'ward-09',
          specialization: 'LANDSLIDE',
          status: 'AVAILABLE',
          contactPhone: '+94 81 555 1111'
        }
      ];
      for (const fc of defaultCrews) this.tables.field_crews.set(fc.id, fc);
    }

    if (this.tables.sensors.size === 0) {
      const defaultSensors: SensorTelemetry[] = [
        {
          id: 'sensor-kelani-01',
          type: 'WATER_LEVEL',
          wardId: 'ward-02',
          locationName: 'Kelani River Nagalagam Street Hydro Station',
          status: 'WARNING',
          lastReading: { timestamp: new Date().toISOString(), value: 4.8 },
          unit: 'm'
        },
        {
          id: 'sensor-colombo-rain-01',
          type: 'RAINFALL',
          wardId: 'ward-01',
          locationName: 'Colombo Ward Place Rain Telemetry Gauge',
          status: 'NORMAL',
          lastReading: { timestamp: new Date().toISOString(), value: 35.2 },
          unit: 'mm/h'
        },
        {
          id: 'sensor-kandy-river-01',
          type: 'WATER_LEVEL',
          wardId: 'ward-09',
          locationName: 'Mahaweli River Peradeniya Stream Sensor',
          status: 'DANGER',
          lastReading: { timestamp: new Date().toISOString(), value: 7.2 },
          unit: 'm'
        }
      ];
      for (const s of defaultSensors) this.tables.sensors.set(s.id, s);
    }

    if (this.tables.ai_tuning_logs.size === 0) {
      const defaultLogs: AiTuningLog[] = [
        {
          id: 'log-01',
          caseId: 'case-demo-01',
          officerId: 'usr-officer-01',
          officerAction: 'AGREED',
          originalAiConfidence: 0.92,
          timestamp: new Date().toISOString(),
          promptAdjustment: 'Standard baseline weights maintained.'
        }
      ];
      for (const l of defaultLogs) this.tables.ai_tuning_logs.set(l.id, l);
    }

    if (this.tables.banned_users.size === 0) {
      this.tables.banned_users.add('spammer-demo-01');
    }

    if (this.tables.cases.size === 0) {
      const demoCase: HazardCase = {
        id: 'case-demo-01',
        reportId: 'rep-demo-01',
        source: 'CITIZEN',
        createdAt: new Date().toISOString(),
        hazardType: 'FLOOD',
        status: 'DISPATCHED',
        location: {
          lat: 6.9344,
          lng: 79.8428,
          roadName: 'Baseline Road (A1)',
          roadHierarchy: 'ARTERIAL_A1',
          wardId: 'ward-01',
          wardName: 'Colombo Central & Fort'
        },
        imageUrl: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80',
        description: 'Flash flood water accumulation 2.5ft across Baseline Road main corridor',
        roadClosed: true,
        urgency: 'HIGH',
        verdictData: {
          verdict: 'CONFIRMED',
          confidenceScore: 0.92
        }
      };
      this.tables.cases.set(demoCase.id, demoCase);
    }

    if (this.tables.tickets.size === 0) {
      const demoTicket: CouncilTicket = {
        id: 'ticket-demo-01',
        caseId: 'case-demo-01',
        createdAt: new Date().toISOString(),
        wardId: 'ward-01',
        hazardType: 'FLOOD',
        urgency: 'HIGH',
        status: 'DISPATCHED',
        assignedCrewId: 'crew-01',
        assignedCrewName: 'Rapid Pump Squad 01 (Water Pumping & Drainage)'
      };
      this.tables.tickets.set(demoTicket.id, demoTicket);
    }
  }

  private saveEmbeddedSqlStore() {
    try {
      const payload = {
        users: Array.from(this.tables.users.values()),
        cases: Array.from(this.tables.cases.values()),
        reports: Array.from(this.tables.reports.values()),
        tickets: Array.from(this.tables.tickets.values()),
        shelters: Array.from(this.tables.shelters.values()),
        field_crews: Array.from(this.tables.field_crews.values()),
        relief_requests: Array.from(this.tables.relief_requests.values()),
        sensors: Array.from(this.tables.sensors.values()),
        ai_tuning_logs: Array.from(this.tables.ai_tuning_logs.values()),
        banned_users: Array.from(this.tables.banned_users),
      };
      fs.writeFileSync(PERSISTENT_STORE_FILE, JSON.stringify(payload, null, 2), 'utf-8');
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
          \`verification_status\` VARCHAR(32) DEFAULT 'PENDING',
          \`nic_number\` VARCHAR(64),
          \`nic_document_url\` LONGTEXT,
          \`official_details\` LONGTEXT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Column migrations for users
      const userColumns = [
        'verification_status VARCHAR(32) DEFAULT "PENDING"',
        'nic_number VARCHAR(64)',
        'nic_document_url LONGTEXT',
        'official_details LONGTEXT',
      ];
      for (const colDef of userColumns) {
        try { await this.pool.query(`ALTER TABLE \`users\` ADD COLUMN ${colDef}`); } catch (e) { }
      }

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
          \`confidence_score\` FLOAT,
          \`reporter_name\` VARCHAR(128),
          \`reporter_phone\` VARCHAR(64)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Column migrations for cases
      const caseColumns = [
        'reporter_name VARCHAR(128)',
        'reporter_phone VARCHAR(64)',
      ];
      for (const colDef of caseColumns) {
        try { await this.pool.query(`ALTER TABLE \`cases\` ADD COLUMN ${colDef}`); } catch (e) { }
      }

      // 2b. Table: reports
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS \`reports\` (
          \`id\` VARCHAR(128) PRIMARY KEY,
          \`created_at\` DATETIME,
          \`user_id\` VARCHAR(128),
          \`user_name\` VARCHAR(128),
          \`user_trust_score\` FLOAT,
          \`hazard_type\` VARCHAR(64),
          \`severity\` VARCHAR(32),
          \`road_name\` VARCHAR(255),
          \`ward_id\` VARCHAR(64),
          \`lat\` FLOAT,
          \`lng\` FLOAT,
          \`image_url\` LONGTEXT,
          \`description\` LONGTEXT,
          \`needs_rescue\` BOOLEAN DEFAULT FALSE,
          \`household_count\` INT DEFAULT 1,
          \`contact_phone\` VARCHAR(64),
          \`status\` VARCHAR(64)
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

      // Schema Migration for existing databases: ensure image/large text columns are LONGTEXT & columns match dump
      try {
        await this.pool.query('ALTER TABLE `users` MODIFY COLUMN `verification_status` VARCHAR(32) DEFAULT "PENDING"');
        await this.pool.query('ALTER TABLE `users` MODIFY COLUMN `nic_document_url` LONGTEXT');
        await this.pool.query('ALTER TABLE `users` MODIFY COLUMN `official_details` LONGTEXT');
        await this.pool.query('ALTER TABLE `cases` MODIFY COLUMN `image_url` LONGTEXT');
        await this.pool.query('ALTER TABLE `cases` MODIFY COLUMN `description` LONGTEXT');
        await this.pool.query('ALTER TABLE `tickets` MODIFY COLUMN `resolution_photo_url` LONGTEXT');
        await this.pool.query('ALTER TABLE `tickets` MODIFY COLUMN `resolution_notes` LONGTEXT');
        try { await this.pool.query('ALTER TABLE `cases` ADD COLUMN `reporter_name` VARCHAR(128) DEFAULT ""'); } catch (e) {}
        try { await this.pool.query('ALTER TABLE `cases` ADD COLUMN `reporter_phone` VARCHAR(64) DEFAULT ""'); } catch (e) {}
      } catch (alterErr: any) {
        console.warn('[ResQCity SQL DB] Schema alter warning (ignorable if columns up to date):', alterErr.message);
      }

      this.isConnectedToMysql = true;
      console.log('[ResQCity SQL DB] Successfully connected to MySQL Engine (localhost:3306 / resqcity_db)');

      // Sync all embedded table records into MySQL
      for (const u of this.tables.users.values()) {
        try {
          await this.pool.query(
            `INSERT INTO \`users\` (\`id\`, \`username\`, \`password_hash\`, \`full_name\`, \`email\`, \`role\`, \`phone\`, \`ward_id\`, \`trust_score\`, \`created_at\`, \`verification_status\`, \`nic_number\`, \`nic_document_url\`, \`official_details\`)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
               \`verification_status\` = VALUES(\`verification_status\`),
               \`nic_document_url\` = VALUES(\`nic_document_url\`),
               \`official_details\` = VALUES(\`official_details\`)`,
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
              u.verificationStatus || (u.role === 'SYSTEM_ADMIN' ? 'APPROVED' : 'PENDING'),
              u.nicNumber || '',
              u.nicDocumentUrl || '',
              u.officialDetails || '',
            ]
          );
        } catch (e) { }
      }

      for (const c of this.tables.cases.values()) {
        await this.saveCase(c);
      }
      for (const t of this.tables.tickets.values()) {
        await this.saveTicket(t);
      }
      for (const s of this.tables.shelters.values()) {
        await this.saveShelter(s);
      }
      for (const fc of this.tables.field_crews.values()) {
        await this.saveFieldCrew(fc);
      }
      for (const r of this.tables.relief_requests.values()) {
        await this.saveReliefRequest(r);
      }
      for (const s of this.tables.sensors.values()) {
        await this.saveSensor(s);
      }
      for (const l of this.tables.ai_tuning_logs.values()) {
        await this.saveAiLog(l);
      }
      for (const u of this.tables.banned_users) {
        await this.saveBannedUser(u);
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
            verificationStatus: r.verification_status || (r.role === 'SYSTEM_ADMIN' ? 'APPROVED' : 'PENDING'),
            nicNumber: r.nic_number || '',
            nicDocumentUrl: r.nic_document_url || '',
            officialDetails: r.official_details || '',
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
            verificationStatus: r.verification_status || (r.role === 'SYSTEM_ADMIN' ? 'APPROVED' : 'PENDING'),
            nicNumber: r.nic_number || '',
            nicDocumentUrl: r.nic_document_url || '',
            officialDetails: r.official_details || '',
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

  public async getUserByNic(nicNumber: string, excludeUserId?: string): Promise<DbUser | null> {
    if (!nicNumber || !nicNumber.trim()) return null;
    const cleanNic = nicNumber.trim().toUpperCase();

    if (this.isConnectedToMysql && this.pool) {
      try {
        let query = 'SELECT * FROM `users` WHERE UPPER(TRIM(`nic_number`)) = ?';
        const params: any[] = [cleanNic];
        if (excludeUserId) {
          query += ' AND `id` != ?';
          params.push(excludeUserId);
        }
        const [rows]: any = await this.pool.query(query, params);
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
        console.error('MySQL query error in getUserByNic:', err);
      }
    }

    for (const u of this.tables.users.values()) {
      if (excludeUserId && u.id === excludeUserId) continue;
      if (u.nicNumber && u.nicNumber.trim().toUpperCase() === cleanNic) {
        return u;
      }
    }
    return null;
  }

  public async getUserByEmail(email: string, excludeUserId?: string): Promise<DbUser | null> {
    if (!email || !email.trim()) return null;
    const cleanEmail = email.trim().toLowerCase();

    if (this.isConnectedToMysql && this.pool) {
      try {
        let query = 'SELECT * FROM `users` WHERE LOWER(TRIM(`email`)) = ?';
        const params: any[] = [cleanEmail];
        if (excludeUserId) {
          query += ' AND `id` != ?';
          params.push(excludeUserId);
        }
        const [rows]: any = await this.pool.query(query, params);
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
        console.error('MySQL query error in getUserByEmail:', err);
      }
    }

    for (const u of this.tables.users.values()) {
      if (excludeUserId && u.id === excludeUserId) continue;
      if (u.email && u.email.trim().toLowerCase() === cleanEmail) {
        return u;
      }
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
              verificationStatus: r.verification_status || (r.role === 'SYSTEM_ADMIN' ? 'APPROVED' : 'PENDING'),
              nicNumber: r.nic_number || '',
              nicDocumentUrl: r.nic_document_url || '',
              officialDetails: r.official_details || '',
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
    if (user.email) user.email = user.email.toLowerCase().trim();
    if (user.nicNumber) user.nicNumber = user.nicNumber.toUpperCase().trim();
    
    // Check for duplicate username
    const existingUser = await this.getUserByUsername(cleanUsername);
    if (existingUser && existingUser.id !== user.id) {
      throw new Error(`Username "${user.username}" is already taken. Please choose another.`);
    }

    // Check for duplicate NIC (CRITICAL: Every NIC must be unique across all users)
    if (user.nicNumber) {
      const existingNicUser = await this.getUserByNic(user.nicNumber, user.id);
      if (existingNicUser) {
        throw new Error(`NIC Number "${user.nicNumber}" is already registered to user "${existingNicUser.username}". NIC must be unique.`);
      }
    }

    // Check for duplicate email if provided
    if (user.email) {
      const existingEmailUser = await this.getUserByEmail(user.email, user.id);
      if (existingEmailUser) {
        throw new Error(`Email address "${user.email}" is already registered to user "${existingEmailUser.username}".`);
      }
    }

    // All registrations require Admin approval except Citizens and System Admins
    if (user.verificationStatus === undefined) {
      const isOfficialRole = user.role === 'COUNCIL_OFFICER' || user.role === 'FIELD_CREW' || user.role === 'RELIEF_DESK';
      user.verificationStatus = isOfficialRole ? 'PENDING' : 'APPROVED';
    }

    if (this.isConnectedToMysql && this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO \`users\` (\`id\`, \`username\`, \`password_hash\`, \`full_name\`, \`email\`, \`role\`, \`phone\`, \`ward_id\`, \`trust_score\`, \`created_at\`, \`verification_status\`, \`nic_number\`, \`nic_document_url\`, \`official_details\`)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             \`password_hash\` = VALUES(\`password_hash\`),
             \`full_name\` = VALUES(\`full_name\`),
             \`email\` = VALUES(\`email\`),
             \`role\` = VALUES(\`role\`),
             \`phone\` = VALUES(\`phone\`),
             \`verification_status\` = VALUES(\`verification_status\`),
             \`nic_number\` = VALUES(\`nic_number\`),
             \`nic_document_url\` = VALUES(\`nic_document_url\`),
             \`official_details\` = VALUES(\`official_details\`)`,
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
              nicNumber: r.nic_number || '',
              nicDocumentUrl: r.nic_document_url || '',
              officialDetails: r.official_details || '',
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
        await this.pool.query('UPDATE `users` SET `verification_status` = ? WHERE `id` = ? OR `username` = ?', [status, userId, userId]);
      } catch (err) {
        console.error('MySQL query error:', err);
      }
    }

    for (const u of this.tables.users.values()) {
      if (u.id === userId || u.username.toLowerCase() === userId.toLowerCase()) {
        u.verificationStatus = status;
        this.saveEmbeddedSqlStore();
        return true;
      }
    }
    return true;
  }

  // --- Entity Table Sync Methods ---

  public async saveCase(c: HazardCase) {
    this.tables.cases.set(c.id, c);
    this.saveEmbeddedSqlStore();
    if (this.isConnectedToMysql && this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO \`cases\` (\`id\`, \`report_id\`, \`source\`, \`created_at\`, \`hazard_type\`, \`status\`, \`road_name\`, \`ward_id\`, \`image_url\`, \`description\`, \`road_closed\`, \`urgency\`, \`confidence_score\`, \`reporter_name\`, \`reporter_phone\`)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE \`status\` = VALUES(\`status\`), \`image_url\` = VALUES(\`image_url\`), \`description\` = VALUES(\`description\`), \`road_closed\` = VALUES(\`road_closed\`), \`urgency\` = VALUES(\`urgency\`), \`confidence_score\` = VALUES(\`confidence_score\`), \`reporter_name\` = VALUES(\`reporter_name\`), \`reporter_phone\` = VALUES(\`reporter_phone\`)`,
          [
            c.id || `case-${Date.now()}`,
            c.reportId || '',
            c.source || 'CITIZEN',
            this.toMysqlDatetime(c.createdAt),
            c.hazardType || 'FLOOD',
            c.status || 'REPORTED',
            c.location?.roadName || 'Main Corridor',
            c.location?.wardId || 'ward-01',
            c.imageUrl || '',
            c.description || '',
            c.roadClosed ? 1 : 0,
            c.urgency || 'MEDIUM',
            c.verdictData?.confidenceScore ?? 0.85,
            (c as any).reporterName || (c as any).userName || '',
            (c as any).reporterPhone || (c as any).contactPhone || '',
          ]
        );
      } catch (err: any) {
        console.error('[ResQCity SQL DB] Failed to save case in MySQL:', err.message);
      }
    }
  }

  public async saveReport(r: CitizenReport) {
    this.tables.reports.set(r.id, r);
    this.saveEmbeddedSqlStore();
    if (this.isConnectedToMysql && this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO \`reports\` (\`id\`, \`created_at\`, \`user_id\`, \`user_name\`, \`user_trust_score\`, \`hazard_type\`, \`severity\`, \`road_name\`, \`ward_id\`, \`lat\`, \`lng\`, \`image_url\`, \`description\`, \`needs_rescue\`, \`household_count\`, \`contact_phone\`, \`status\`)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE \`status\` = VALUES(\`status\`)`,
          [
            r.id,
            this.toMysqlDatetime(r.createdAt),
            r.userId || '',
            r.userName || 'Citizen User',
            r.userTrustScore || 0.85,
            r.hazardType || 'FLOOD',
            r.severity || 'HIGH',
            r.location?.roadName || 'Main Corridor',
            r.location?.wardId || 'ward-01',
            r.location?.lat ?? 6.9344,
            r.location?.lng ?? 79.8428,
            r.imageUrl || '',
            r.description || '',
            r.needsRescue ? 1 : 0,
            r.householdCount || 1,
            r.contactPhone || '',
            r.status || 'PROCESSED'
          ]
        );
      } catch (err: any) {
        console.error('[ResQCity SQL DB] Failed to save report in MySQL:', err.message);
      }
    }
  }

  public async deleteCase(id: string) {
    this.tables.cases.delete(id);
    this.saveEmbeddedSqlStore();
    if (this.isConnectedToMysql && this.pool) {
      try {
        await this.pool.query('DELETE FROM `cases` WHERE `id` = ?', [id]);
      } catch (err: any) {
        console.error('[ResQCity SQL DB] Failed to delete case in MySQL:', err.message);
      }
    }
  }

  public async deleteTicket(id: string) {
    this.tables.tickets.delete(id);
    this.saveEmbeddedSqlStore();
    if (this.isConnectedToMysql && this.pool) {
      try {
        await this.pool.query('DELETE FROM `tickets` WHERE `id` = ?', [id]);
      } catch (err: any) {
        console.error('[ResQCity SQL DB] Failed to delete ticket in MySQL:', err.message);
      }
    }
  }

  public async deleteTicketByCaseId(caseId: string) {
    for (const [key, val] of this.tables.tickets.entries()) {
      if (val.caseId === caseId) {
        this.tables.tickets.delete(key);
      }
    }
    this.saveEmbeddedSqlStore();
    if (this.isConnectedToMysql && this.pool) {
      try {
        await this.pool.query('DELETE FROM `tickets` WHERE `case_id` = ?', [caseId]);
      } catch (err: any) {
        console.error('[ResQCity SQL DB] Failed to delete ticket by case_id in MySQL:', err.message);
      }
    }
  }

  public async deleteShelter(id: string) {
    this.tables.shelters.delete(id);
    this.saveEmbeddedSqlStore();
    if (this.isConnectedToMysql && this.pool) {
      try {
        await this.pool.query('DELETE FROM `shelters` WHERE `id` = ?', [id]);
      } catch (err: any) {
        console.error('[ResQCity SQL DB] Failed to delete shelter in MySQL:', err.message);
      }
    }
  }

  public async deleteFieldCrew(id: string) {
    this.tables.field_crews.delete(id);
    this.saveEmbeddedSqlStore();
    if (this.isConnectedToMysql && this.pool) {
      try {
        await this.pool.query('DELETE FROM `field_crews` WHERE `id` = ?', [id]);
      } catch (err: any) {
        console.error('[ResQCity SQL DB] Failed to delete field crew in MySQL:', err.message);
      }
    }
  }

  public async saveTicket(t: CouncilTicket) {
    this.tables.tickets.set(t.id, t);
    this.saveEmbeddedSqlStore();
    if (this.isConnectedToMysql && this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO \`tickets\` (\`id\`, \`case_id\`, \`created_at\`, \`ward_id\`, \`hazard_type\`, \`urgency\`, \`status\`, \`assigned_crew_id\`, \`assigned_crew_name\`, \`resolution_photo_url\`, \`resolution_notes\`)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE \`status\` = VALUES(\`status\`), \`assigned_crew_id\` = VALUES(\`assigned_crew_id\`), \`assigned_crew_name\` = VALUES(\`assigned_crew_name\`), \`resolution_photo_url\` = VALUES(\`resolution_photo_url\`), \`resolution_notes\` = VALUES(\`resolution_notes\`)`,
          [
            t.id || `ticket-${Date.now()}`,
            t.caseId || '',
            this.toMysqlDatetime(t.createdAt),
            t.wardId || 'ward-01',
            t.hazardType || 'FLOOD',
            t.urgency || 'MEDIUM',
            t.status || 'OPEN',
            t.assignedCrewId || '',
            t.assignedCrewName || '',
            t.resolutionPhotoUrl || '',
            t.resolutionNotes || '',
          ]
        );
      } catch (err: any) {
        console.error('[ResQCity SQL DB] Failed to save ticket in MySQL:', err.message);
      }
    }
  }

  public async saveShelter(s: Shelter) {
    this.tables.shelters.set(s.id, s);
    this.saveEmbeddedSqlStore();
    if (this.isConnectedToMysql && this.pool) {
      try {
        const occupancy = s.currentOccupancy ?? (s as any).occupied ?? 0;
        await this.pool.query(
          `INSERT INTO \`shelters\` (\`id\`, \`name\`, \`ward_id\`, \`total_capacity\`, \`occupied\`, \`contact_phone\`)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE \`name\` = VALUES(\`name\`), \`total_capacity\` = VALUES(\`total_capacity\`), \`occupied\` = VALUES(\`occupied\`), \`contact_phone\` = VALUES(\`contact_phone\`)`,
          [s.id, s.name || '', s.wardId || 'ward-01', s.totalCapacity || 100, occupancy, s.contactPhone || '']
        );
      } catch (err: any) {
        console.error('[ResQCity SQL DB] Failed to save shelter in MySQL:', err.message);
      }
    }
  }

  public async saveFieldCrew(fc: FieldCrew) {
    this.tables.field_crews.set(fc.id, fc);
    this.saveEmbeddedSqlStore();
    if (this.isConnectedToMysql && this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO \`field_crews\` (\`id\`, \`name\`, \`ward_id\`, \`specialization\`, \`status\`, \`contact_phone\`)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE \`name\` = VALUES(\`name\`), \`status\` = VALUES(\`status\`), \`contact_phone\` = VALUES(\`contact_phone\`)`,
          [fc.id, fc.name || '', fc.wardId || 'ward-01', fc.specialization || 'FLOOD', fc.status || 'AVAILABLE', fc.contactPhone || '']
        );
      } catch (err: any) {
        console.error('[ResQCity SQL DB] Failed to save field crew in MySQL:', err.message);
      }
    }
  }

  public async saveReliefRequest(req: ReliefRequest) {
    this.tables.relief_requests.set(req.id, req);
    this.saveEmbeddedSqlStore();
    if (this.isConnectedToMysql && this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO \`relief_requests\` (\`id\`, \`case_id\`, \`citizen_name\`, \`citizen_phone\`, \`household_count\`, \`status\`, \`created_at\`)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE \`status\` = VALUES(\`status\`)`,
          [req.id, req.caseId || '', req.citizenName || '', req.citizenPhone || '', req.householdCount || 1, req.status || 'PENDING', this.toMysqlDatetime(req.createdAt)]
        );
      } catch (err: any) {
        console.error('[ResQCity SQL DB] Failed to save relief request in MySQL:', err.message);
      }
    }
  }

  public async saveSensor(sensor: SensorTelemetry) {
    const sensorId = sensor.id || sensor.stationId || `sensor-${Date.now()}`;
    this.tables.sensors.set(sensorId, sensor);
    this.saveEmbeddedSqlStore();
    if (this.isConnectedToMysql && this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO \`sensors\` (\`id\`, \`type\`, \`ward_id\`, \`location_name\`, \`status\`, \`last_value\`, \`unit\`)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE \`status\` = VALUES(\`status\`), \`last_value\` = VALUES(\`last_value\`)`,
          [sensorId, sensor.type || 'WATER_LEVEL', sensor.wardId || 'ward-01', sensor.locationName || '', sensor.status || 'NORMAL', sensor.lastReading?.value ?? 0, sensor.unit || 'm']
        );
      } catch (err: any) {
        console.error('[ResQCity SQL DB] Failed to save sensor in MySQL:', err.message);
      }
    }
  }

  public async saveAiLog(log: AiTuningLog) {
    this.tables.ai_tuning_logs.set(log.id, log);
    this.saveEmbeddedSqlStore();
    if (this.isConnectedToMysql && this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO \`ai_tuning_logs\` (\`id\`, \`case_id\`, \`officer_id\`, \`officer_action\`, \`confidence_score\`, \`created_at\`)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [log.id || `log-${Date.now()}`, log.caseId || '', log.officerId || '', log.officerAction || '', log.confidenceScore ?? 0.85, this.toMysqlDatetime(log.createdAt)]
        );
      } catch (err: any) {
        console.error('[ResQCity SQL DB] Failed to save AI tuning log in MySQL:', err.message);
      }
    }
  }

  public async saveBannedUser(userId: string) {
    this.tables.banned_users.add(userId);
    this.saveEmbeddedSqlStore();
    if (this.isConnectedToMysql && this.pool) {
      try {
        await this.pool.query(
          `INSERT IGNORE INTO \`banned_users\` (\`user_id\`, \`banned_at\`) VALUES (?, ?)`,
          [userId, this.toMysqlDatetime(new Date().toISOString())]
        );
      } catch (err: any) {
        console.error('[ResQCity SQL DB] Failed to save banned user in MySQL:', err.message);
      }
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
        'reports',
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
        reports: this.tables.reports.size,
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
