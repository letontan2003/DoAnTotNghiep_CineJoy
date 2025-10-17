import useAppStore from "@/store/app.store";

interface IProps {
    image: string;
    title: string;
    description: React.ReactNode;
    member?: boolean;
}

const NewsCard  = (props: IProps) => {
  const { isDarkMode } = useAppStore();
  return (
    <div className={`${isDarkMode ? "bg-[#282a36] shadow-lg" : "bg-white shadow-md"} rounded-xl overflow-hidden h-full flex flex-col`}>
      <img src={props.image} alt={props.title} className={`w-full ${props.member ? "h-40" : "h-50"} object-cover`} />
      <div className="p-4 flex flex-col flex-1">
        <h3 className={`${isDarkMode ? "text-white" : "text-gray-800"} font-semibold text-lg mb-2 line-clamp-2 leading-tight`}>{props.title}</h3>
        <p className={`${isDarkMode ? "text-gray-400" : "text-gray-600"} text-sm flex-1 line-clamp-3`}>{props.description}</p>
      </div>
    </div>
  );
};

export default NewsCard;
