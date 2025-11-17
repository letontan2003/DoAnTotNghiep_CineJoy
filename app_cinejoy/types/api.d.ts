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

export interface IComboItem {
  productId: string;
  quantity: number;
}

export interface IFoodCombo {
  _id: string;
  code: string;
  name: string;
  type: "single" | "combo";
  description?: string;
  items?: IComboItem[];
  createdAt?: string;
  updatedAt?: string;
}

// Region types
export interface IRegion {
  _id: string;
  regionCode: string;
  name: string;
}

// Theater types
export interface ITheater {
  _id: string;
  theaterCode: string;
  name: string;
  regionId: string;
  location: {
    city: string;
    address: string;
  };
}

// Showtime types
export interface IShowtimeSeat {
  seat: string;
  status: "available" | "selected" | "maintenance" | "reserved" | "occupied";
  reservedUntil?: Date;
  reservedBy?: string;
}

export interface IShowtimeSession {
  date: Date;
  start: Date;
  end: Date;
  room:
    | string
    | {
        _id: string;
        name: string;
        roomType?: string;
      };
  showSessionId?:
    | string
    | { _id: string; name: string; startTime: string; endTime: string };
  status: "active" | "inactive";
  seats: IShowtimeSeat[];
}

export interface IShowtime {
  _id: string;
  movieId: string | IMovie;
  theaterId: string | ITheater;
  showTimes: IShowtimeSession[];
}
