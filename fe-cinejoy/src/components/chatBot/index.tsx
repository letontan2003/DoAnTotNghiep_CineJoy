import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import tuongtacIcon from 'assets/tuongtac.png';
import Logo from 'assets/CineJoyLogo.png'
import { FaFacebookF } from 'react-icons/fa';

interface Message {
    sender: 'user' | 'bot';
    text: string;
}

interface ChatResponse {
    reply: string;
}

const Chatbot: React.FC = () => {
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
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

    const handleSendMessage = async () => {
        if (!inputMessage.trim()) return;

        const userMessage = inputMessage;
        setInputMessage('');
        setMessages(prev => [...prev, { sender: 'user', text: userMessage }]);
        setIsLoading(true);

        try {
            const response = await axios.post<ChatResponse>('http://localhost:5000/chatbot/chat', {
                message: userMessage
            });

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

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
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
                    <div className="bg-white rounded-lg shadow-xl w-80 h-[400px] flex flex-col">
                        {/* Header */}
                        <div className="bg-blue-600 text-white px-2.5 py-1.5 rounded-t-lg flex justify-between items-center">
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
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map((message, index) => (
                                <div
                                    key={index}
                                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[90%] rounded-lg p-3 ${message.sender === 'user'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-800'
                                            }`}
                                    >
                                        {message.text}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-gray-100 text-gray-800 rounded-lg p-3">
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
                        <div className="border-t p-2">
                            <div className="flex space-x-2">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Nhập tin nhắn..."
                                    className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={isLoading}
                                    className="bg-blue-600 text-white px-2 py-1 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 cursor-pointer"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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