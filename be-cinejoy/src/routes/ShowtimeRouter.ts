import { Router } from "express";
import ShowtimeController from "../controllers/ShowtimeController";
import { verifyToken } from "../middlewares/AuthMiddleware";

const router = Router();
const showtimeController = new ShowtimeController();

router.get(
  "/filter",
  showtimeController.getShowtimesByTheaterMovie.bind(showtimeController)
);
router.get(
  "/theater/:theaterId",
  showtimeController.getShowtimesByTheater.bind(showtimeController)
);
// New: showtimes by room and date
router.get(
  "/by-room-date",
  showtimeController.getShowtimesByRoomAndDate.bind(showtimeController)
);
// Đặt các route cụ thể trước route /:id để tránh conflict
router.get(
  "/:id/seats",
  showtimeController.getSeatsForShowtime.bind(showtimeController)
);
router.post(
  "/:id/book-seats",
  showtimeController.bookSeats.bind(showtimeController)
);
router.post(
  "/book-seats",
  showtimeController.bookSeatsForFrontend.bind(showtimeController)
);
router.post(
  "/release-by-user",
  verifyToken,
  showtimeController.releaseSeatsByUser.bind(showtimeController)
);

// API mới cho seat reservation
router.get(
  "/seats-with-reservation",
  verifyToken,
  showtimeController.getSeatsWithReservationStatus.bind(showtimeController)
);
router.post(
  "/reserve-seats",
  verifyToken,
  showtimeController.reserveSeats.bind(showtimeController)
);
router.post(
  "/:id/initialize-seats",
  showtimeController.initializeSeats.bind(showtimeController)
);

// Release expired reserved seats
router.post(
  "/release-expired",
  showtimeController.releaseExpired.bind(showtimeController)
);

// Release all user reserved seats when selecting new showtime
router.post(
  "/release-user-seats",
  verifyToken,
  showtimeController.releaseUserReservedSeats.bind(showtimeController)
);

// TEST ENDPOINT: Update seats to occupied manually
router.post(
  "/test-update-occupied",
  showtimeController.testUpdateSeatsToOccupied.bind(showtimeController)
);

// Dev-only: backfill seats cho toàn bộ showtimes
router.post(
  "/backfill-seats",
  showtimeController.backfillSeats.bind(showtimeController)
);
// Route general
router.get("/", showtimeController.getShowtimes.bind(showtimeController));
router.post("/add", showtimeController.addShowtime.bind(showtimeController));
router.put(
  "/update/:id",
  showtimeController.updateShowtime.bind(showtimeController)
);
router.delete(
  "/delete/:id",
  showtimeController.deleteShowtime.bind(showtimeController)
);
router.get("/:id", showtimeController.getShowtimeById.bind(showtimeController));
// Route lấy suất chiếu theo rạp, phim và ngày
export default router;
