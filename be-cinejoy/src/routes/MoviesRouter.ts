import { Router } from "express";
import MoviesController from "../controllers/MoviesController";

const router = Router();
const moviesController = new MoviesController();

router.get("/", moviesController.getMovies.bind(moviesController));
router.get("/search", moviesController.searchMovies.bind(moviesController));
router.get("/:id", moviesController.getMovieById.bind(moviesController));
router.post("/add", moviesController.addMovie.bind(moviesController));
router.put("/update/:id", moviesController.updateMovie.bind(moviesController));
router.delete(
  "/delete/:id",
  moviesController.deleteMovie.bind(moviesController)
);
router.post(
  "/update-statuses",
  moviesController.updateMovieStatuses.bind(moviesController)
);
router.put(
  "/toggle-hide/:id",
  moviesController.toggleHideMovie.bind(moviesController)
);

export default router;
