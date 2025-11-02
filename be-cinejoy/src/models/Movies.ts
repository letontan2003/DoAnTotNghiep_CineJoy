import { Schema, model, Document } from "mongoose";

interface IReview {
  userName: string;
  comment: string;
  rating: number;
}

export interface IMovie extends Document {
  movieCode: string;
  title: string;
  releaseDate: Date;
  startDate: Date;
  endDate: Date;
  duration: number;
  genre: string[];
  director: string;
  actors: string[];
  language: string[];
  description: string;
  trailer: string;
  status: 'Phim đang chiếu' | 'Phim sắp chiếu' | 'Suất chiếu đặc biệt' | 'Đã kết thúc';
  image: string;
  posterImage: string;
  ageRating: string;
  reviews: IReview[];
  averageRating: number;
  titleNoAccent: string;
  isHidden?: boolean;
}

const MovieSchema = new Schema<IMovie>({
  movieCode: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  releaseDate: { type: Date, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  duration: { type: Number, required: true },
  genre: { type: [String], required: true },
  director: { type: String, required: true },
  actors: { type: [String], required: true },
  language: { type: [String], required: true },
  description: { type: String, required: true },
  trailer: { type: String },
  status: { 
    type: String, 
    required: true,
    enum: ['Phim đang chiếu', 'Phim sắp chiếu', 'Suất chiếu đặc biệt', 'Đã kết thúc']
  },
  image: { type: String, required: true },
  posterImage: { type: String, required: true },
  ageRating: { type: String, required: true },
  reviews: [
    {
      userName: { type: String, required: true },
      comment: { type: String, required: true },
      rating: { type: Number, required: true },
    },
  ],
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  titleNoAccent: { type: String },
  isHidden: { 
    type: Boolean, 
    default: false 
  },
});

export const Movie = model<IMovie>("Movie", MovieSchema);
