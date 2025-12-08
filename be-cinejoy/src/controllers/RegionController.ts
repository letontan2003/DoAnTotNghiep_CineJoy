import { Request, Response } from "express";
import RegionService from "../services/RegionService";
const regionService = new RegionService();

export default class RegionController {
    async getRegions(req: Request, res: Response): Promise<void> {
        try {
            const regions = await regionService.getRegions();
            res.status(200).json(regions);
        } catch (error) {
            res.status(500).json({ message: "Error fetching regions", error });
        }
    }

    async getRegionById(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        try {
            const region = await regionService.getRegionById(id);
            if (!region) {
                res.status(404).json({ message: "Region not found" });
                return;
            }
            res.status(200).json(region);
        } catch (error) {
            res.status(500).json({ message: "Error fetching region", error });
        }
    }

    async addRegion(req: Request, res: Response): Promise<void> {
        try {
            const newRegion = await regionService.addRegion(req.body);
            res.status(201).json(newRegion);
        } catch (error) {
            res.status(500).json({ message: "Error adding region", error });
        }
    }

    async updateRegion(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        try {
            const updatedRegion = await regionService.updateRegion(id, req.body);
            if (!updatedRegion) {
                res.status(404).json({ message: "Region not found" });
                return;
            }
            res.status(200).json(updatedRegion);
        } catch (error) {
            res.status(500).json({ message: "Error updating region", error });
        }
    }

    async deleteRegion(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        try {
            const deletedRegion = await regionService.deleteRegion(id);
            if (!deletedRegion) {
                res.status(404).json({ message: "Region not found" });
                return;
            }
            res.status(200).json({ message: "Region deleted successfully" });
        } catch (error) {
            res.status(500).json({ message: "Error deleting region", error });
        }
    }
}