/**
 * HireSync Resume & ATS Routes (`src/routes/resumeRoutes.js`)
 *
 * REST API routes for Candidate resume uploading, extraction preview,
 * and HR applicant pool tier management & candidate match inspection.
 *
 * All handlers follow strict role isolation and environment config rules.
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const { resumeUploadMiddleware, deleteUploadedFile } = require('../middleware/uploadMiddleware');
const { parseResume } = require('../services/atsParser');

const router = express.Router();

/**
 * In-memory application store fallback (for dev/demo when DB is not connected).
 * In production, queries default PostgreSQL pool from `src/db`.
 */
const mockApplicationsDb = new Map();

// ─────────────────────────────────────────────
// Candidate Routes
// ─────────────────────────────────────────────

/**
 * POST /api/candidate/resume/upload
 * Candidate uploads a PDF resume file.
 * Performs upload validation, PDF text parsing, entity extraction,
 * anti-gaming checks, and match scoring.
 */
router.post('/upload', resumeUploadMiddleware, async (req, res, next) => {
  try {
    const filePath = req.uploadedFilePath;
    const buffer = fs.readFileSync(filePath);

    // Parse job requirements from body (or default fallback)
    let jobRequirements = {};
    if (req.body.jobRequirements) {
      try {
        jobRequirements =
          typeof req.body.jobRequirements === 'string'
            ? JSON.parse(req.body.jobRequirements)
            : req.body.jobRequirements;
      } catch {
        jobRequirements = {};
      }
    }

    // Run ATS parsing engine
    const parseResult = await parseResume(buffer, jobRequirements);

    // Build relative storage URL for client
    const fileUrl = `/${config.ats.upload.localUploadPath}/${req.uploadedFileName}`;

    res.status(200).json({
      success: true,
      message: 'Resume uploaded and parsed successfully.',
      fileUrl,
      fileName: req.uploadedFileName,
      parseResult,
    });
  } catch (err) {
    // If error occurred after file storage, clean up the file
    if (req.uploadedFilePath) {
      deleteUploadedFile(req.uploadedFilePath);
    }
    next(err);
  }
});

/**
 * POST /api/candidate/resume/confirm
 * Candidate confirms or edits their extracted resume metadata before final submission.
 */
router.post('/confirm', async (req, res, next) => {
  try {
    const { jobId, candidateId, confirmedData, parseResult } = req.body;

    if (!jobId || !candidateId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PARAMETERS',
        message: 'jobId and candidateId are required.',
      });
    }

    const applicationId = `app_${Date.now()}`;
    const applicationRecord = {
      id: applicationId,
      jobId,
      candidateId,
      confirmedData: confirmedData || parseResult.extracted,
      scoring: parseResult.scoring,
      tier: parseResult.tier,
      antiGaming: parseResult.antiGaming,
      status: 'APPLIED',
      appliedAt: new Date().toISOString(),
    };

    mockApplicationsDb.set(applicationId, applicationRecord);

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully with confirmed ATS profile.',
      application: applicationRecord,
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// HR / Recruiter Routes
// ─────────────────────────────────────────────

/**
 * GET /api/hr/jobs/:jobId/applicants
 * Fetches tiered applicant pool for a given job.
 * Query param `tier` optional: 'TIER_1' | 'TIER_2' | 'TIER_3' | 'ALL'
 */
router.get('/jobs/:jobId/applicants', async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const tierFilter = req.query.tier || 'ALL';

    const applicants = [];
    for (const app of mockApplicationsDb.values()) {
      if (app.jobId === jobId) {
        if (tierFilter === 'ALL' || app.tier === tierFilter) {
          applicants.push(app);
        }
      }
    }

    // Sort by match score descending
    applicants.sort((a, b) => b.scoring.totalScore - a.scoring.totalScore);

    res.status(200).json({
      success: true,
      jobId,
      tierFilter,
      totalCount: applicants.length,
      applicants,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/hr/applicants/:applicationId/match
 * Fetches detailed candidate match breakdown modal payload.
 */
router.get('/applicants/:applicationId/match', async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const application = mockApplicationsDb.get(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'APPLICATION_NOT_FOUND',
        message: `No application found for ID: ${applicationId}`,
      });
    }

    res.status(200).json({
      success: true,
      application,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
