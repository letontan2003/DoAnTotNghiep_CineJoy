import { Router } from 'express';
import RoomController from '../controllers/RoomController';
import { verifyToken } from '../middlewares/AuthMiddleware';

const router = Router();

// Get all rooms
router.get('/', verifyToken, RoomController.getAllRooms);

// Get rooms by theater
router.get('/theater/:theaterId', verifyToken, RoomController.getRoomsByTheater);

// Get active rooms by theater (for dropdown selections)
router.get('/theater/:theaterId/active', RoomController.getActiveRoomsByTheater);

// Get room by ID
router.get('/:id', verifyToken, RoomController.getRoomById);

// Create new room
router.post('/', verifyToken, RoomController.createRoom);

// Update room
router.put('/:id', verifyToken, RoomController.updateRoom);

// Delete room
router.delete('/:id', verifyToken, RoomController.deleteRoom);

export default router;
