import Slider from '@/components/carousel/Carousel';
import MovieList from '@/components/movies/MovieList';
import useAppStore from '@/store/app.store';

// const movies = [
//     {
//         id: 1,
//         title: "Movie 1",
//         actors: "Katyy Nguyen, John Doe",
//         duration: 120,
//         imageUrl: "https://res.cloudinary.com/ddia5yfia/image/upload/v1740883582/21_Nha_gia_tien_rp2jfd.jpg"
//     },
//     {
//         id: 2,
//         title: "Movie 1",
//         actors: "Katyy Nguyen, John Doe",
//         duration: 120,
//         imageUrl: "https://res.cloudinary.com/ddia5yfia/image/upload/v1740883582/21_Nha_gia_tien_rp2jfd.jpg"
//     },
//     {
//         id: 3,
//         title: "Movie 1",
//         actors: "Katyy Nguyen, John Doe",
//         duration: 120,
//         imageUrl: "https://res.cloudinary.com/ddia5yfia/image/upload/v1740883582/21_Nha_gia_tien_rp2jfd.jpg"
//     },
//     {
//         id: 4,
//         title: "Movie 1",
//         actors: "Katyy Nguyen, John Doe",
//         duration: 120,
//         imageUrl: "https://res.cloudinary.com/ddia5yfia/image/upload/v1740883582/21_Nha_gia_tien_rp2jfd.jpg"
//     },
//     {
//         id: 5,
//         title: "Movie 1",
//         actors: "Katyy Nguyen, John Doe",
//         duration: 120,
//         imageUrl: "https://res.cloudinary.com/ddia5yfia/image/upload/v1740883582/21_Nha_gia_tien_rp2jfd.jpg"
//     },

// ]



const Movies = () => {
    const { isDarkMode } = useAppStore();

    return (
        <div className={`${isDarkMode ? "bg-[#191b21]" : ""} pb-12`}>
            <Slider />
            <MovieList  />
        </div>
    );
};

export default Movies;