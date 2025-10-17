// Backend response types
export interface IBackendResponse<T = any> {
  status: boolean;
  message: string;
  data: T;
  error?: string;
}

export interface IRefreshToken {
  accessToken: string;
  refreshToken: string;
}

export interface IUser {
  id: string;
  email: string;
  name: string;
  // Add other user fields as needed
}

// Auth types
export interface IRegister {
  email: string;
  password: string;
  fullName: string;
  dateOfBirth: string;
  avatar?: string;
  gender: string;
  role?: string;
  phoneNumber: string;
}

export interface ILogin {
  accessToken: string;
  refreshToken: string;
  user: IUser;
}

// Movie types
export interface IReview {
  userName: string;
  comment: string;
  rating: number;
  _id: string;
}

export interface IMovie {
  _id: string;
  title: string;
  releaseDate: string;
  duration: number;
  genre: string[];
  director: string;
  actors: string[];
  language: string[];
  description: string;
  trailer: string;
  status: string;
  image: string;
  posterImage: string;
  ageRating: string;
  reviews: IReview[];
  averageRating: number;
  __v: number;
  titleNoAccent: string;
  endDate: string;
  startDate: string;
  movieCode: string;
}
