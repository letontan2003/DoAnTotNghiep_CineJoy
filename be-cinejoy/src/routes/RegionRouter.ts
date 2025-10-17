import { Router } from "express";
import RegionController from "../controllers/RegionController";

const router = Router();
const regionController = new RegionController();

router.get("/", regionController.getRegions.bind(regionController));
router.get("/:id", regionController.getRegionById.bind(regionController));
router.post("/add", regionController.addRegion.bind(regionController));
router.put("/update/:id", regionController.updateRegion.bind(regionController));
router.delete("/delete/:id", regionController.deleteRegion.bind(regionController));

export default router;