import { Router } from 'express';
import ShowSessionController from '../controllers/ShowSessionController';

const router = Router();

// Get all show sessions
router.get('/', ShowSessionController.getAllShowSessions);

// Get current active session
router.get('/current-active', ShowSessionController.getCurrentActiveSession);


// Get show session by ID
router.get('/:id', ShowSessionController.getShowSessionById);

// Create new show session
router.post('/', ShowSessionController.createShowSession);

// Update show session
router.put('/:id', ShowSessionController.updateShowSession);

// Delete show session
router.delete('/:id', ShowSessionController.deleteShowSession);

export default router;
