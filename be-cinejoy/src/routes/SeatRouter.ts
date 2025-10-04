import { Router } from 'express';
import SeatController from '../controllers/SeatController';
import { verifyToken } from '../middlewares/AuthMiddleware';

const router = Router();

// Get all seats
router.get('/', verifyToken, SeatController.getAllSeats);

// Get seats by room
router.get('/room/:roomId', verifyToken, SeatController.getSeatsByRoom);

// Get seat statistics for a room
router.get('/room/:roomId/statistics', verifyToken, SeatController.getSeatStatistics);

// Get unique seat types
router.get('/types', verifyToken, SeatController.getUniqueSeatTypes);

// Get seat by ID
router.get('/:id', verifyToken, SeatController.getSeatById);

// Create new seat
router.post('/', verifyToken, SeatController.createSeat);

// Create multiple seats at once
router.post('/bulk', verifyToken, SeatController.createMultipleSeats);

// Generate seat layout for a room
router.post('/room/:roomId/generate-layout', verifyToken, SeatController.generateSeatLayout);

// Update seat
router.put('/:id', verifyToken, SeatController.updateSeat);

// Delete seat
router.delete('/:id', verifyToken, SeatController.deleteSeat);

// Delete all seats in a room
router.delete('/room/:roomId/all', verifyToken, SeatController.deleteAllSeatsInRoom);

export default router;
