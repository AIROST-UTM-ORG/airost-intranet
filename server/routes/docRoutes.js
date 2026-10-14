const express = require('express');
const {
  // New Documentation Space & Document Handlers
  listSpaces,
  createSpace,
  getSpace,
  updateSpace,
  deleteSpace,
  listDocuments,
  createDocument,
  updateDocument,
  archiveDocument,
  deleteDocumentPermanent,
  // Legacy Handlers
  getDocs,
  getDoc,
  createDoc,
  deleteDoc,
  updateDoc,
} = require('../controller/docController');

const router = express.Router();

/* ========================================================================== */
/*                NEW DOCUMENTATION SPACE & DOCUMENT ROUTES                  */
/* ========================================================================== */

// Spaces CRUD
router.get('/spaces', listSpaces);
router.post('/spaces', createSpace);
router.get('/spaces/:spaceId', getSpace);
router.patch('/spaces/:spaceId', updateSpace);
router.delete('/spaces/:spaceId', deleteSpace);

// Documents within Space
router.get('/spaces/:spaceId/documents', listDocuments);
router.post('/spaces/:spaceId/documents', createDocument);

// Individual Document routes
router.patch('/documents/:documentId', updateDocument);
router.delete('/documents/:documentId/permanent', deleteDocumentPermanent);
router.delete('/documents/:documentId', archiveDocument);

/* ========================================================================== */
/*                   LEGACY DOC ROUTES (PRESERVED)                           */
/* ========================================================================== */

// GET all Docs
router.get('/', getDocs);

// GET a single Doc
router.get('/:id', getDoc);

// POST a new Doc
router.post('/', createDoc);

// DELETE a Doc
router.delete('/:id', deleteDoc);

// UPDATE a Doc
router.patch('/:id', updateDoc);

module.exports = router;