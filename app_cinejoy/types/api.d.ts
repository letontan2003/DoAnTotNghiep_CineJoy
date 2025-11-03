// Backend response types
export interface IBackendResponse<T = any> {
  status: boolean;
  error?: number;
  message: string;
  data?: T | null;
}

export interface IRefreshToken {
  accessToken: string;
  refreshToken?: string;
}

export interface IUser {
  _id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  gender: string;
  avatar: string;
  dateOfBirth: string;
  role: string;
  isActive: boolean;
  settings: {
    darkMode: boolean;
  };
  point?: number;
  createdAt: Date;
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
  user: IUser;
  accessToken: string;
}

export interface IFetchAccount {
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
