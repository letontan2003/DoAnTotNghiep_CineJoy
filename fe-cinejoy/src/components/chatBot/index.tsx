import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import tuongtacIcon from 'assets/tuongtac.png';
import Logo from 'assets/CineJoyLogo.png'
import { FaFacebookF } from 'react-icons/fa';

interface Message {
    sender: 'user' | 'bot';
    text: string;
    image?: string; // Base64 image URL for display
}

interface ChatResponse {
    reply: string;
}

interface PosterUploadResponse {
    success: boolean;
    reply: string;
    movie?: any;
    showtimes?: any[];
    movieTitle?: string;
}

const Chatbot: React.FC = () => {
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [pendingImage, setPendingImage] = useState<{
        file: File;
        preview: string; // base64 data url for display
    } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    
    const defaultBotMessage: Message = {
        sender: 'bot',
        text: 'CineJoy xin chào! Bạn cần thông tin gì về phim, lịch chiếu, giá vé hay các dịch vụ của rạp không ạ?',
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([defaultBotMessage]);
        }
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 200) {
            setShowScrollTop(true);
            } else {
            setShowScrollTop(false);
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleScrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const convertFileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const sendTextMessage = async (userMessage: string) => {
        setMessages(prev => [...prev, { sender: 'user', text: userMessage }]);
        setIsLoading(true);

        try {
            const token = localStorage.getItem('accessToken');
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
                console.log('🔑 Sending token with chatbot request');
            } else {
                console.log('⚠️ No token found in localStorage');
            }

            const response = await axios.post<ChatResponse>(
                'http://localhost:5000/chatbot/chat',
                {
                    message: userMessage
                },
                { headers }
            );

            setMessages(prev => [...prev, { sender: 'bot', text: response.data.reply }]);
        } catch (error) {
            console.error('Error sending message:', error);
            setMessages(prev => [...prev, {
                sender: 'bot',
                text: 'Xin lỗi, tôi không thể trả lời ngay lúc này. Vui lòng thử lại sau.'
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const sendImageMessage = async (caption: string) => {
        if (!pendingImage) return;

        const captionText = caption.trim() || 'Mình vừa gửi poster này, bạn hỗ trợ giúp nhé!';
        const file = pendingImage.file;
        const preview = pendingImage.preview;

        setMessages(prev => [...prev, { sender: 'user', text: captionText, image: preview }]);
        setPendingImage(null);
        setInputMessage('');
        setIsLoading(true);

        try {
            const dataUrl = await convertFileToBase64(file);
            const base64String = dataUrl.split(',')[1];
            const token = localStorage.getItem('accessToken');
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await axios.post<PosterUploadResponse>(
                'http://localhost:5000/chatbot/upload-poster',
                {
                    imageBase64: base64String,
                    mimeType: file.type || 'image/jpeg',
                    userMessage: captionText
                },
                { headers }
            );

            setMessages(prev => [...prev, { 
                sender: 'bot', 
                text: response.data.reply 
            }]);
        } catch (error: any) {
            console.error('Error uploading image:', error);
            setMessages(prev => [...prev, {
                sender: 'bot',
                text: error.response?.data?.error || 'Xin lỗi, đã có lỗi xảy ra khi xử lý poster. Vui lòng thử lại sau.'
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if (isLoading) return;

        const trimmedMessage = inputMessage.trim();

        if (pendingImage) {
            await sendImageMessage(trimmedMessage);
            return;
        }

        if (!trimmedMessage) return;

        setInputMessage('');
        await sendTextMessage(trimmedMessage);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Vui lòng chọn file hình ảnh!');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Kích thước file không được vượt quá 5MB!');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setPendingImage({
                file,
                preview: reader.result as string,
            });
            inputRef.current?.focus();
        };
        reader.onerror = () => {
            alert('Lỗi khi đọc file!');
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleRemovePendingImage = () => {
        setPendingImage(null);
    };

    return (
        <>
            <div className="fixed bottom-8 right-5 flex flex-col items-center z-9999">
                {/* Các nút nhỏ, chỉ hiện khi menu mở */}
                {isMenuOpen && (
                    <div className="relative mt-4 flex flex-col items-center space-y-4">
                        {/* Nút Facebook */}
                        <a
                            href="https://www.facebook.com/profile.php?id=61577387097700"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-blue-600 text-white rounded-full p-3 shadow-md hover:bg-blue-800 transition-transform transform active:scale-90"
                            title="Đến fanpage Facebook"
                        >
                            <FaFacebookF size={28} />
                        </a>
                        {/* Nút Chat web */}
                        <button
                            onClick={() => { setIsOpen(true); setIsMenuOpen(false); }}
                            className="bg-blue-500 text-white rounded-full p-3 shadow-lg hover:bg-blue-700 transition-colors cursor-pointer"
                            title="Chat trên web"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                                <path d="M8 12h8M8 16h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Khung chat web */}
                {isOpen && (
                    <div className="bg-white rounded-xl shadow-2xl w-96 h-[500px] flex flex-col border border-gray-200">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 rounded-t-xl flex justify-between items-center shadow-md">
                            <div className='flex items-center gap-1'>
                                <img className='w-15 object-cover' src={Logo} alt="avatar" />
                                <h3 className="font-semibold select-none">CineJoy Assistant</h3>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-white hover:text-gray-200 cursor-pointer"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-gray-50">
                            {messages.map((message, index) => {
                                const isUser = message.sender === 'user';
                                const hasImage = Boolean(message.image);
                                const bubbleClasses = hasImage
                                    ? 'bg-gray-100 text-gray-800 border border-gray-200 px-2 py-2'
                                    : isUser
                                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3'
                                        : 'bg-white text-gray-800 border border-gray-200 px-4 py-3';

                                return (
                                    <div
                                        key={index}
                                        className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[85%] rounded-2xl shadow-sm ${bubbleClasses}`}
                                        >
                                            {hasImage && (
                                                <div className="mb-2 rounded-2xl overflow-hidden bg-black/5">
                                                    <img 
                                                        src={message.image} 
                                                        alt="Uploaded poster" 
                                                        className="w-full h-full object-cover"
                                                        style={{ maxHeight: '320px' }}
                                                    />
                                                </div>
                                            )}
                                            <div className={`whitespace-pre-line leading-relaxed ${hasImage ? 'text-gray-700 font-medium' : ''}`}>
                                                {message.text}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white text-gray-800 rounded-2xl px-4 py-3 shadow-sm border border-gray-200">
                                        <div className="flex space-x-2">
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="border-t border-gray-200 bg-gray-50 p-4 rounded-b-xl">
                        {pendingImage && (
    <div className="mb-3 p-3 rounded-2xl bg-white border border-gray-200 shadow-sm">
        <div className="flex gap-3">
            {/* Ảnh preview */}
            <div className="w-24 h-24 rounded-xl overflow-hidden shadow-inner bg-gray-100">
                <img
                    src={pendingImage.preview}
                    alt="Poster preview"
                    className="w-full h-full object-cover"
                />
            </div>

            {/* Text + nút X bên ngoài */}
            <div className="text-sm text-gray-600 flex-1">
                <div className="flex items-start justify-between">
                    <p className="font-semibold text-gray-800">
                        Hình ảnh đính kèm
                    </p>
                    <button
                        onClick={handleRemovePendingImage}
                        className="ml-2 text-gray-500 hover:text-gray-700 cursor-pointer"
                        aria-label="Xóa hình đính kèm"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>
                <p>Nhập câu hỏi hoặc yêu cầu cho poster này trước khi gửi.</p>
                <p className="text-gray-400 text-xs mt-1">
                    Hệ thống sẽ tự động phân tích và trả lời dựa trên hình ảnh.
                </p>
            </div>
        </div>
    </div>
)}

                            <div className="flex items-center space-x-2">
                                {/* Nút upload image */}
                                <input
                                    type="file"
                                    accept="image/*"
                                    id="poster-upload"
                                    className="hidden"
                                    onChange={handleImageUpload}
                                    disabled={isLoading || !!pendingImage}
                                />
                                <label
                                    htmlFor="poster-upload"
                                    className="bg-gray-200 text-gray-700 px-3 py-3 rounded-xl hover:bg-gray-300 transition-all cursor-pointer shadow-sm hover:shadow-md active:scale-95 flex items-center justify-center min-w-[48px] disabled:opacity-50"
                                    title="Upload poster phim"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </label>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder={pendingImage ? "Nhập câu hỏi cho poster..." : "Nhập tin nhắn..."}
                                    className="flex-1 bg-white border border-gray-300 rounded-xl px-5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all"
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={isLoading}
                                    className="bg-blue-600 text-white px-4 py-3 rounded-xl hover:bg-blue-700 transition-all disabled:bg-blue-400 cursor-pointer shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center min-w-[48px]"
                                    title="Gửi tin nhắn"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Nút menu chính */}
                {!isOpen && (
                    <button
                        onClick={() => setIsMenuOpen((prev) => !prev)}
                        className="bg-blue-400 text-white rounded-full p-2.5 shadow-lg hover:bg-blue-700 transition-colors cursor-pointer mt-4"
                    >
                        <img
                            src={tuongtacIcon}
                            alt="Chat with CineJoy"
                            className="h-8 w-8 object-contain"
                        />
                    </button>
                )}
            </div>

            {showScrollTop && (
                <button
                    onClick={handleScrollToTop}
                    className={`fixed ${isMenuOpen ? "bottom-60" : "bottom-40"} right-5 ${isOpen ? "z-[9998]" : "z-[9999]"} bg-blue-600 hover:bg-blue-800 text-white p-3.5 rounded-full shadow-lg transition-all duration-300 cursor-pointer`}
                    title="Lên đầu trang"
                >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                </button>
            )}
        </>
    );
};

export default Chatbot; 