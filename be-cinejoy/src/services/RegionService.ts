import { Region, IRegion } from "../models/Region";

export default class RegionService {
    getRegions(): Promise<IRegion[]> {
        return Region.find();
    }

    getRegionById(id: string): Promise<IRegion | null> {
        return Region.findById(id);
    }

    addRegion(data: IRegion): Promise<IRegion> {
        const region = new Region(data);
        return region.save();
    }

    updateRegion(id: string, data: Partial<IRegion>): Promise<IRegion | null> {
        return Region.findByIdAndUpdate(id, data, { new: true });
    }

    deleteRegion(id: string): Promise<IRegion | null> {
        return Region.findByIdAndDelete(id);
    }
}