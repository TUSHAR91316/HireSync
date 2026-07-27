/**
 * HireSync — Resume Upload Middleware
 *
 * Multer-based file upload middleware with multi-layer security validation:
 *   1. MIME type whitelist check (application/pdf only)
 *   2. PDF magic bytes validation (first 4 bytes must be "%PDF")
 *   3. File size limit enforcement (from config)
 *   4. UUID-randomized filename (original filename never trusted or stored)
 *
 * All configuration parameters are loaded from src/config/index.js.
 * No file limits, paths, or MIME types are hardcoded here.
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

// Ensure the local upload directory exists at startup
const uploadDir = path.resolve(config.ats.upload.localUploadPath);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ─────────────────────────────────────────────
// 1. Storage Strategy
// ─────────────────────────────────────────────
const localStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, _file, cb) => {
    // Always use a UUID filename — never trust or preserve original filename
    const safeFilename = `${uuidv4()}.pdf`;
    cb(null, safeFilename);
  },
});

// ─────────────────────────────────────────────
// 2. MIME Type Filter (Pre-Storage Check)
// ─────────────────────────────────────────────
/**
 * Checks the declared MIME type from the client against the whitelist.
 * NOTE: This is a first-pass check only. Magic bytes are validated
 * post-upload in validateMagicBytes() before the file is processed.
 */
function mimeTypeFilter(_req, file, cb) {
  const allowed = config.ats.upload.allowedMimeTypes;
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error('INVALID_FILE_TYPE');
    err.code = 'INVALID_FILE_TYPE';
    cb(err, false);
  }
}

// ─────────────────────────────────────────────
// 3. Multer Instance
// ─────────────────────────────────────────────
const upload = multer({
  storage: localStorage,
  limits: {
    fileSize: config.ats.upload.maxFileSizeBytes,
    files: 1, // Only one resume at a time
  },
  fileFilter: mimeTypeFilter,
});

// ─────────────────────────────────────────────
// 4. Magic Bytes Validator (Post-Storage Check)
// ─────────────────────────────────────────────
/**
 * Reads the first 4 bytes of the stored file to verify it is a genuine PDF.
 * The PDF specification requires all valid PDFs to begin with the byte
 * sequence: 0x25 0x50 0x44 0x46 ("%PDF").
 *
 * Defends against:
 * - Renaming malicious files (e.g., malware.exe → resume.pdf)
 * - MIME type spoofing from the client
 *
 * @param {string} filePath - Absolute path to the stored uploaded file.
 * @returns {boolean} True if the file has valid PDF magic bytes.
 */
function validateMagicBytes(filePath) {
  const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]); // "%PDF"
  try {
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(4);
    fs.readSync(fd, buf, 0, 4, 0);
    fs.closeSync(fd);
    return buf.equals(PDF_MAGIC);
  } catch {
    return false;
  }
}

/**
 * Deletes a file from disk safely (used when validation fails after storage).
 * @param {string} filePath - Absolute path to the file to remove.
 */
function deleteUploadedFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Non-fatal — log in production monitoring
  }
}

// ─────────────────────────────────────────────
// 5. Composed Middleware
// ─────────────────────────────────────────────
/**
 * Express middleware that:
 *   1. Accepts a single PDF file uploaded under the field name "resume".
 *   2. Validates MIME type (Multer filter).
 *   3. Enforces file size limit.
 *   4. Validates PDF magic bytes.
 *   5. Attaches `req.uploadedFilePath` and `req.uploadedFileName` on success.
 *
 * On any validation failure, deletes the partially stored file and calls
 * `next(error)` with a structured error object.
 */
function resumeUploadMiddleware(req, res, next) {
  const multerSingle = upload.single('resume');

  multerSingle(req, res, (err) => {
    // Handle Multer errors
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next({
          status: 413,
          code: 'FILE_TOO_LARGE',
          message: 'Resume file exceeds 5MB limit.',
        });
      }
      if (err.code === 'INVALID_FILE_TYPE') {
        return next({
          status: 400,
          code: 'INVALID_FILE_TYPE',
          message: 'Only PDF resumes are accepted.',
        });
      }
      return next({ status: 400, code: 'UPLOAD_ERROR', message: err.message });
    }

    // No file attached at all
    if (!req.file) {
      return next({
        status: 400,
        code: 'NO_FILE_UPLOADED',
        message: 'No resume file was provided.',
      });
    }

    const filePath = req.file.path;

    // Validate PDF magic bytes (second-pass security check)
    if (!validateMagicBytes(filePath)) {
      deleteUploadedFile(filePath);
      return next({
        status: 400,
        code: 'INVALID_FILE_TYPE',
        message: 'Uploaded file is not a valid PDF (magic bytes mismatch).',
      });
    }

    // Attach file info to request for downstream handlers
    req.uploadedFilePath = filePath;
    req.uploadedFileName = req.file.filename;

    next();
  });
}

module.exports = {
  resumeUploadMiddleware,
  validateMagicBytes,
  deleteUploadedFile,
};
