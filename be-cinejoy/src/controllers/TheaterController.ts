import { Request, Response } from "express";
import TheaterService from "../services/TheaterService";
const theaterService = new TheaterService();

export default class TheaterController {
    async getTheaters(req: Request, res: Response): Promise<void> {
        try {
            const theaters = await theaterService.getTheaters();
            res.status(200).json(theaters);
        } catch (error) {
            res.status(500).json({ message: "Error fetching theaters", error });
        }
    }

    async getTheaterById(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        try {
            const theater = await theaterService.getTheaterById(id);
            if (!theater) {
                res.status(404).json({ message: "Theater not found" });
                return;
            }
            res.status(200).json(theater);
        } catch (error) {
            res.status(500).json({ message: "Error fetching theater", error });
        }
    }

    async addTheater(req: Request, res: Response): Promise<void> {
        try {
            const newTheater = await theaterService.addTheater(req.body);
            res.status(201).json(newTheater);
        } catch (error) {
            res.status(500).json({ message: "Error adding theater", error });
        }
    }

    async updateTheater(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        try {
            const updatedTheater = await theaterService.updateTheater(id, req.body);
            if (!updatedTheater) {
                res.status(404).json({ message: "Theater not found" });
                return;
            }
            res.status(200).json(updatedTheater);
        } catch (error) {
            res.status(500).json({ message: "Error updating theater", error });
        }
    }

    async deleteTheater(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        try {
            const deletedTheater = await theaterService.deleteTheater(id);
            if (!deletedTheater) {
                res.status(404).json({ message: "Theater not found" });
                return;
            }
            res.status(200).json({ message: "Theater deleted successfully" });
        } catch (error) {
            res.status(500).json({ message: "Error deleting theater", error });
        }
    }
}