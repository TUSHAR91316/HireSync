/**
 * HireSync Centralized Environment Configuration Module
 * Single Source of Truth for all application settings.
 * Ensures NO ports, secrets, database URIs, scoring thresholds, or SLA windows are hardcoded.
 */

const path = require('path');

// Load .env file if available (development environment)
try {
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
} catch (e) {
  // dotenv optional if environment variables are injected directly by host
}

const config = {
  // Server Parameters
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT, 10) || 5000,
  host: process.env.HOST || '0.0.0.0',
  appName: process.env.APP_NAME || 'HireSync',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',

  // Authentication & Security
  jwt: {
    secret: process.env.JWT_SECRET || 'dev_fallback_secret_change_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    saltRounds: parseInt(process.env.SALT_ROUNDS, 10) || 10,
  },

  // Auth Policy
  auth: {
    passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH, 10) || 8,
    resetTokenExpiryMinutes: parseInt(process.env.RESET_TOKEN_EXPIRY_MINUTES, 10) || 60,
  },

  // Database Connection Parameters
  db: {
    url:
      process.env.DATABASE_URL ||
      'postgres://hiresync_user:hiresync_password@localhost:5432/hiresync_db',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME || 'hiresync_db',
    user: process.env.DB_USER || 'hiresync_user',
    password: process.env.DB_PASSWORD || 'hiresync_password',
    poolMin: parseInt(process.env.DB_POOL_MIN, 10) || 2,
    poolMax: parseInt(process.env.DB_POOL_MAX, 10) || 10,
  },

  // Redis & BullMQ Queue Services
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || '',
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // Email / SMTP (for Forgot Password transactional email and SLA notifications)
  mail: {
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'HireSync <noreply@hiresync.app>',
    fromName: process.env.MAIL_FROM_NAME || 'HireSync Automated SLA Engine',
    appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
    sendgridApiKey: process.env.SENDGRID_API_KEY || '',
  },

  // ATS Resume Parser Thresholds & Scoring Weights
  ats: {
    tier1Threshold: parseInt(process.env.ATS_TIER1_THRESHOLD, 10) || 80,
    tier2Threshold: parseInt(process.env.ATS_TIER2_THRESHOLD, 10) || 60,
    weights: {
      skills: parseFloat(process.env.ATS_WEIGHT_SKILLS) || 0.5,
      experience: parseFloat(process.env.ATS_WEIGHT_EXPERIENCE) || 0.3,
      education: parseFloat(process.env.ATS_WEIGHT_EDUCATION) || 0.2,
    },
    // Resume File Upload Parameters
    upload: {
      maxFileSizeBytes: parseInt(process.env.RESUME_MAX_FILE_SIZE_BYTES, 10) || 5242880, // 5 MB
      allowedMimeTypes: (process.env.RESUME_ALLOWED_MIME_TYPES || 'application/pdf').split(','),
      storageBackend: process.env.STORAGE_BACKEND || 'local', // 'local' | 's3'
      localUploadPath: process.env.LOCAL_UPLOAD_PATH || 'uploads/resumes',
      s3Bucket: process.env.S3_BUCKET_NAME || '',
      s3Region: process.env.S3_REGION || 'ap-south-1',
    },
    // Anti-Gaming & ATS Manipulation Defence Parameters
    antiGaming: {
      minFontSizePt: parseInt(process.env.ATS_MIN_FONT_SIZE_PT, 10) || 4,
      maxSkillCount: parseInt(process.env.ATS_MAX_SKILL_COUNT, 10) || 35,
      keywordDensityRatioThreshold: parseFloat(process.env.ATS_KEYWORD_DENSITY_THRESHOLD) || 0.25,
    },
  },

  // Candidate Upstream Gatekeeper & Skill Unlock
  gatekeeper: {
    skillUnlockBufferPercentage: parseFloat(process.env.SKILL_UNLOCK_BUFFER_PERCENTAGE) || 0.15,
    skillUnlockTestDurationMinutes:
      parseInt(process.env.SKILL_UNLOCK_TEST_DURATION_MINUTES, 10) || 15,
    passingScorePercentage: parseFloat(process.env.SKILL_UNLOCK_PASSING_SCORE) || 70.0,
  },

  // Anti-Cheating & AI Detection Settings
  antiCheating: {
    maxTabSwitchesAllowed: parseInt(process.env.MAX_TAB_SWITCHES, 10) || 2,
    aiDetectionThreshold: parseFloat(process.env.AI_DETECTION_THRESHOLD) || 0.75, // 75%
    testGracePeriodSeconds: parseInt(process.env.TEST_GRACE_PERIOD_SECONDS, 10) || 30,
    geminiApiKey: process.env.GEMINI_API_KEY || '',
  },

  // Recruiter Decision SLA Engine
  sla: {
    defaultSlaDays: parseInt(process.env.DEFAULT_SLA_DAYS, 10) || 7,
    warningFirstHours: parseInt(process.env.SLA_WARNING_FIRST_HOURS, 10) || 48,
    warningFinalHours: parseInt(process.env.SLA_WARNING_FINAL_HOURS, 10) || 24,
  },

  // WebRTC Real-Time Media Configuration
  webrtc: {
    stunServer: process.env.WEBRTC_STUN_SERVER || 'stun:stun.l.google.com:19302',
    turnServer: process.env.WEBRTC_TURN_SERVER || '',
    turnUsername: process.env.WEBRTC_TURN_USERNAME || '',
    turnCredential: process.env.WEBRTC_TURN_CREDENTIAL || '',
  },
};

// Validate critical secrets in production environment
if (config.isProduction) {
  if (config.jwt.secret === 'dev_fallback_secret_change_in_production') {
    throw new Error(
      'FATAL SECURITY ERROR: JWT_SECRET environment variable must be set in production!'
    );
  }
}

module.exports = config;
