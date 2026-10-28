import { Router } from 'express';
import { getProfile, updateProfile } from '../controllers/profileController.js';
import { getLogs, upsertLog, deleteLog } from '../controllers/logController.js';
import { getQuestions, updateQuestions } from '../controllers/questionController.js';
import { getSafetyEvents, createSafetyEvent } from '../controllers/safetyController.js';
import { exportProfile, importProfileData, deleteProfileData } from '../controllers/exportController.js';
import { getInsights, getCycleSummary } from '../controllers/insightController.js';
import { getVisitBrief, createShareLink } from '../controllers/briefController.js';
import { requireAuth, requireProfileOwnership } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  profileIdParamSchema,
  profileDateParamSchema,
  profileUpdateSchema,
  symptomLogSchema,
  customQuestionsSchema,
  safetyEventSchema
} from '../validators/schemas.js';

const router = Router();

// Profile Details
router.get(
  '/:id',
  validate(profileIdParamSchema, 'params'),
  requireAuth,
  requireProfileOwnership,
  getProfile
);

router.put(
  '/:id',
  validate(profileIdParamSchema, 'params'),
  requireAuth,
  requireProfileOwnership,
  validate(profileUpdateSchema, 'body'),
  updateProfile
);

// Symptom Logs
router.get(
  '/:id/logs',
  validate(profileIdParamSchema, 'params'),
  requireAuth,
  requireProfileOwnership,
  getLogs
);

router.put(
  '/:id/logs/:date',
  validate(profileDateParamSchema, 'params'),
  requireAuth,
  requireProfileOwnership,
  validate(symptomLogSchema, 'body'),
  upsertLog
);

router.delete(
  '/:id/logs/:date',
  validate(profileDateParamSchema, 'params'),
  requireAuth,
  requireProfileOwnership,
  deleteLog
);

// Clinical Pattern Insights & Cycle Metrics
router.get(
  '/:id/insights',
  validate(profileIdParamSchema, 'params'),
  requireAuth,
  requireProfileOwnership,
  getInsights
);

router.get(
  '/:id/cycle-summary',
  validate(profileIdParamSchema, 'params'),
  requireAuth,
  requireProfileOwnership,
  getCycleSummary
);

// Doctor Visit Preparation & Clinician Sharing
router.get(
  '/:id/visit-brief',
  validate(profileIdParamSchema, 'params'),
  requireAuth,
  requireProfileOwnership,
  getVisitBrief
);

router.post(
  '/:id/share-link',
  validate(profileIdParamSchema, 'params'),
  requireAuth,
  requireProfileOwnership,
  createShareLink
);

// Discussion Questions
router.get(
  '/:id/questions',
  validate(profileIdParamSchema, 'params'),
  requireAuth,
  requireProfileOwnership,
  getQuestions
);

router.put(
  '/:id/questions',
  validate(profileIdParamSchema, 'params'),
  requireAuth,
  requireProfileOwnership,
  validate(customQuestionsSchema, 'body'),
  updateQuestions
);

// Safety Red-Flag Events
router.get(
  '/:id/safety-events',
  validate(profileIdParamSchema, 'params'),
  requireAuth,
  requireProfileOwnership,
  getSafetyEvents
);

router.post(
  '/:id/safety-events',
  validate(profileIdParamSchema, 'params'),
  requireAuth,
  requireProfileOwnership,
  createSafetyEvent
);

// Backup Export, Import & Right-to-be-Forgotten Data Purge
router.get(
  '/:id/export',
  validate(profileIdParamSchema, 'params'),
  requireAuth,
  requireProfileOwnership,
  exportProfile
);

router.post(
  '/:id/import',
  validate(profileIdParamSchema, 'params'),
  requireAuth,
  requireProfileOwnership,
  importProfileData
);

router.delete(
  '/:id/data',
  validate(profileIdParamSchema, 'params'),
  requireAuth,
  requireProfileOwnership,
  deleteProfileData
);

export default router;
