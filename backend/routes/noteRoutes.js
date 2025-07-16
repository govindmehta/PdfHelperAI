import express from 'express';
import { 
  generateNotes, 
  downloadNotesPDF, 
  downloadNote,
  createNote, 
  getNotes, 
  getNote, 
  updateNote, 
  deleteNote 
} from '../controllers/noteController.js';

const router = express.Router();

// CRUD operations for notes
router.post('/', createNote);           // POST /api/notes
router.get('/', getNotes);              // GET /api/notes?pdfId=xxx
router.get('/:id', getNote);            // GET /api/notes/:id
router.put('/:id', updateNote);         // PUT /api/notes/:id
router.delete('/:id', deleteNote);      // DELETE /api/notes/:id

// Additional note operations
router.post('/generate', generateNotes); // POST /api/notes/generate
router.get('/download', downloadNotesPDF); 
router.get('/:id/download', downloadNote); // GET /api/notes/:id/download

export default router;
