import { Router } from "express";
import TheaterController from "../controllers/TheaterController";

const router = Router();
const theaterController = new TheaterController();

router.get("/", theaterController.getTheaters.bind(theaterController));
router.get("/:id", theaterController.getTheaterById.bind(theaterController));
router.post("/add", theaterController.addTheater.bind(theaterController));
router.put("/update/:id", theaterController.updateTheater.bind(theaterController));
router.delete("/delete/:id", theaterController.deleteTheater.bind(theaterController));

export default router;