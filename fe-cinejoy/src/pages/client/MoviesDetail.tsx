import CardInfMovie from "@/components/movies/CardInfMovie";
import useAppStore from "@/store/app.store";

const MoviesDetail = () => {
    const { isDarkMode } = useAppStore();
    return (
        <div className={`${isDarkMode ? "bg-[#191b21]" : ""} pt-5`}>
            <CardInfMovie />
        </div>
    );
}

export default MoviesDetail;