/* eslint-disable @typescript-eslint/no-explicit-any */
/* */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Modal, Form, Select, DatePicker, TimePicker, Button, Card, Spin, message, Popconfirm, Table, Tag } from 'antd';
const { RangePicker } = DatePicker;
import axiosClient from '@/apiservice/axiosClient';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { getMovies } from '@/apiservice/apiMovies';
import { getTheaters } from '@/apiservice/apiTheater';
import { createShowtime, updateShowtime, getShowtimesByRoomAndDateApi, checkEachShowtimeOccupiedSeatsApi } from '@/apiservice/apiShowTime';
import { getRegions } from '@/apiservice/apiRegion';
import { getActiveRoomsByTheaterApi } from '@/apiservice/apiRoom';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';

interface ShowtimeFormProps {
    onCancel: () => void;
    onSuccess: () => void;
    editData?: IShowtime;
}

// Function để chuyển đổi status phim thành text tiếng Việt
const getMovieStatusText = (status: string): string => {
    switch (status) {
        case 'Phim đang chiếu':
            return 'Phim Đang Chiếu';
        case 'Phim sắp chiếu':
            return 'Phim Sắp Chiếu';
        case 'Suất chiếu đặc biệt':
            return 'Suất Chiếu Đặc Biệt';
        case 'Đã kết thúc':
            return 'Phim Đã Kết Thúc';
        default:
            return 'Không Xác Định';
    }
};

const ShowtimeForm: React.FC<ShowtimeFormProps> = ({ onCancel, onSuccess, editData }) => {
    const [movies, setMovies] = useState<IMovie[]>([]);
    const [regions, setRegions] = useState<IRegion[]>([]);
    const [allTheaters, setAllTheaters] = useState<ITheater[]>([]);
    const [filteredTheaters, setFilteredTheaters] = useState<ITheater[]>([]);
    const [selectedRegionId, setSelectedRegionId] = useState<string>('');
    const [selectedMovie, setSelectedMovie] = useState<IMovie | null>(null);
    const [rooms, setRooms] = useState<{
        roomType: string;_id: string; name: string; theater: {_id: string}
}[]>([]);
    const [selectedTheaterId, setSelectedTheaterId] = useState<string>('');
    const [form] = Form.useForm();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [modalLoading, setModalLoading] = useState<boolean>(true);
    const [showSessions, setShowSessions] = useState<IShowSession[]>([]);
    const [hasOccupiedSeats, setHasOccupiedSeats] = useState(false);
    const [occupiedSeatsStatus, setOccupiedSeatsStatus] = useState<Record<number, boolean>>({});
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [duplicateShowtimes, setDuplicateShowtimes] = useState<Array<{
        date: dayjs.Dayjs;
        startTime: dayjs.Dayjs;
        endTime: dayjs.Dayjs;
        room: string;
        sessionId?: string;
        status: 'active' | 'inactive';
    }>>([]);
    const [validShowtimes, setValidShowtimes] = useState<Array<{
        date: dayjs.Dayjs;
        startTime: dayjs.Dayjs;
        endTime: dayjs.Dayjs;
        room: string;
        sessionId?: string;
        status: 'active' | 'inactive';
    }>>([]);
    const [pendingFormData, setPendingFormData] = useState<any>(null);


    useEffect(() => {
        const fetchData = async () => {
            try {
                setModalLoading(true);
                const [moviesRes, theatersRes, regionsRes, sessionsRes] = await Promise.all([
                    getMovies(),
                    getTheaters(),
                    getRegions(),
                    axiosClient.get('/show-sessions')
                ]);
                setMovies(Array.isArray(moviesRes) ? moviesRes : []);
                setAllTheaters(theatersRes || []);
                setRegions(regionsRes || []);
                setShowSessions((sessionsRes.data as { data: IShowSession[] }).data || []);
            } catch (error) {
                console.error('Error fetching data:', error);
                toast.error('Không thể tải dữ liệu phim, rạp và khu vực');
            } finally { setModalLoading(false); }
        };
        fetchData();
    }, []);

    // Effect để lọc rạp theo khu vực đã chọn
    useEffect(() => {
        if (selectedRegionId) {
            // Tìm tên khu vực từ ID
            const selectedRegion = regions.find(r => r._id === selectedRegionId);
            if (selectedRegion) {
                // Lọc rạp theo location.city khớp với tên khu vực
                const filtered = allTheaters.filter(theater => 
                    theater.location.city.toLowerCase().includes(selectedRegion.name.toLowerCase()) ||
                    selectedRegion.name.toLowerCase().includes(theater.location.city.toLowerCase())
                );
                setFilteredTheaters(filtered);
            }
        } else {
            setFilteredTheaters([]);
        }
        // Reset theater selection khi thay đổi khu vực
        form.setFieldValue('theaterId', undefined);
    }, [selectedRegionId, allTheaters, regions, form]);

    useEffect(() => {
        const loadEditData = async () => {
            if (editData) {
                // Kiểm tra từng suất chiếu có ghế đã đặt không
                try {
                    const eachOccupiedData = await checkEachShowtimeOccupiedSeatsApi(editData._id);
                    const statusMap: Record<number, boolean> = {};
                    let hasAnyOccupied = false;
                    eachOccupiedData.showtimes.forEach(st => {
                        statusMap[st.index] = st.hasOccupiedSeats;
                        if (st.hasOccupiedSeats) hasAnyOccupied = true;
                    });
                    setOccupiedSeatsStatus(statusMap);
                    setHasOccupiedSeats(hasAnyOccupied);
                } catch (error) {
                    console.error('Error checking occupied seats:', error);
                    setHasOccupiedSeats(false);
                    setOccupiedSeatsStatus({});
                }

                // Tìm khu vực của rạp được chọn khi edit
                const selectedTheater = allTheaters.find(t => t._id === editData.theaterId._id);
                if (selectedTheater) {
                    // Tìm khu vực phù hợp với location.city của rạp
                    const matchingRegion = regions.find(region => 
                        selectedTheater.location.city.toLowerCase().includes(region.name.toLowerCase()) ||
                        region.name.toLowerCase().includes(selectedTheater.location.city.toLowerCase())
                    );
                    if (matchingRegion) {
                        setSelectedRegionId(matchingRegion._id);
                    }
                }
                
                // Load rooms cho rạp khi edit
                try {
                    setModalLoading(true);
                    const theaterRooms = await getActiveRoomsByTheaterApi(editData.theaterId._id);
                    setRooms(theaterRooms);
                    setSelectedTheaterId(editData.theaterId._id);
                } catch (error) {
                    console.error('Error loading rooms for edit:', error);
                    setRooms([]);
                } finally { setModalLoading(false); }
            } else {
                // Set default showtime when creating new
                form.setFieldsValue({
                    showTimes: [{
                        dateRange: undefined,
                        startTime: undefined,
                        endTime: undefined,
                        room: undefined,
                        sessionId: undefined
                    }]
                });
            }
        };
        
        loadEditData();
    }, [editData, form, allTheaters, regions]);

    // Effect để set form values sau khi rooms đã được load
    useEffect(() => {
        if (editData && rooms.length > 0 && selectedTheaterId) {
            const selectedTheater = allTheaters.find(t => t._id === editData.theaterId._id);
            form.setFieldsValue({
                movieId: editData.movieId._id,
                regionId: regions.find(region => 
                    selectedTheater?.location.city.toLowerCase().includes(region.name.toLowerCase()) ||
                    region.name.toLowerCase().includes(selectedTheater?.location.city.toLowerCase() || '')
                )?._id,
                theaterId: editData.theaterId._id,
                showTimes: (editData.showTimes as Array<{ 
                    date: string; 
                    start: string; 
                    end: string; 
                    room: string | { _id: string; name: string }; 
                    showSessionId?: string | { _id: string; name: string };
                    status?: 'active' | 'inactive';
                }>).map((st) => ({
                    dateRange: [dayjs(st.date), dayjs(st.date)], // Khi edit, từ ngày và đến ngày giống nhau
                    startTime: dayjs(st.start),
                    endTime: dayjs(st.end),
                    room: typeof st.room === 'object' ? st.room._id : st.room,
                    sessionId: typeof st.showSessionId === 'object' ? st.showSessionId._id : st.showSessionId,
                    status: st.status || 'active' // Mặc định active nếu chưa có
                }))
            });
        }
    }, [editData, rooms, selectedTheaterId, allTheaters, regions, form]);

    // Effect để clear room values khi rooms thay đổi (khi đổi rạp)
    useEffect(() => {
        if (rooms.length > 0) {
            const currentShowTimes = form.getFieldValue('showTimes') || [];
            let hasInvalidRoom = false;
            
            const updatedShowTimes = currentShowTimes.map((showTime: { room?: string }) => {
                if (showTime.room) {
                    const roomExists = rooms.some(room => room._id === showTime.room);
                    if (!roomExists) {
                        hasInvalidRoom = true;
                        return {
                            ...showTime,
                            room: undefined,
                            sessionId: undefined,
                            startTime: undefined,
                            endTime: undefined
                        };
                    }
                }
                return showTime;
            });
            
            if (hasInvalidRoom) {
                form.setFieldValue('showTimes', updatedShowTimes);
            }
        }
    }, [rooms, form]);

    // Handler cho việc chọn khu vực
    const handleRegionChange = (regionId: string) => {
        setSelectedRegionId(regionId);
        // Reset theater và room khi chọn khu vực mới
        form.setFieldValue('theaterId', undefined);
        setSelectedTheaterId('');
        setRooms([]);
    };

    // Handler cho việc chọn phim
    const handleMovieChange = (movieId: string) => {
        const movie = movies.find(m => m._id === movieId);
        setSelectedMovie(movie || null);
    };

    // Set selectedMovie khi edit
    useEffect(() => {
        if (editData && movies.length > 0) {
            const movie = movies.find(m => m._id === editData.movieId._id);
            if (movie) {
                setSelectedMovie(movie);
            }
        }
    }, [editData, movies]);

    // Handler cho việc chọn rạp chiếu
    const handleTheaterChange = async (theaterId: string) => {
        setSelectedTheaterId(theaterId);
        
        // Reset room values khi đổi rạp (cả khi tạo mới và edit)
        const currentShowTimes = form.getFieldValue('showTimes') || [];
        const updatedShowTimes = currentShowTimes.map((showTime: {
            date?: dayjs.Dayjs;
            startTime?: dayjs.Dayjs;
            endTime?: dayjs.Dayjs;
            room?: string;
            sessionId?: string;
        }) => ({
            ...showTime,
            room: undefined, // Reset room value khi đổi rạp
            sessionId: undefined, // Reset session value khi đổi rạp
            startTime: undefined, // Reset start time khi đổi rạp
            endTime: undefined // Reset end time khi đổi rạp
        }));
        form.setFieldValue('showTimes', updatedShowTimes);
        
        // Force clear rooms array trước khi load rooms mới
        setRooms([]);
        
        try {
            // Load rooms cho rạp này sử dụng API chuyên biệt
            const theaterRooms = await getActiveRoomsByTheaterApi(theaterId);
            setRooms(theaterRooms);
        } catch (error) {
            console.error('Error loading rooms:', error);
            toast.error('Không thể tải danh sách phòng chiếu');
            setRooms([]);
        }
    };

    // Helper: tính time theo phút từ HH:mm hoặc ISO datetime
    const toMinutes = (t: string) => {
        if (t.includes('T')) {
            // Dùng local time để đối chiếu với ca chiếu (định nghĩa theo giờ địa phương)
            const d = dayjs(t);
            return d.hour() * 60 + d.minute();
        }
        const [h, m] = t.split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
    };
    const minutesToDayjs = (base: dayjs.Dayjs, minutes: number) => {
        const h = Math.floor(minutes / 60) % 24; const m = minutes % 60;
        return base.hour(h).minute(m).second(0).millisecond(0);
    };

    // Khi chọn ca chiếu cho 1 showTime item
    const onChangeSessionForRow = async (rowIndex: number, sessionId: string) => {
        const session = showSessions.find(s => s._id === sessionId) || null;
        // set selected session for the row
        const rows: Array<{ dateRange?: [dayjs.Dayjs, dayjs.Dayjs]; room?: string; startTime?: dayjs.Dayjs; endTime?: dayjs.Dayjs; sessionId?: string; minStartBoundary?: dayjs.Dayjs; }> = form.getFieldValue('showTimes') || [];
        const row = rows[rowIndex];
        if (!row?.dateRange || !row?.room || !session) {
            message.warning('Vui lòng chọn ngày và phòng trước');
            return;
        }
        // Sử dụng ngày đầu tiên trong khoảng để tính toán
        const dateStr = dayjs(row.dateRange[0]).format('YYYY-MM-DD');
        let existing = await getShowtimesByRoomAndDateApi(row.room, dateStr);
        // Khi sửa, loại bỏ các suất thuộc cùng document hiện tại để tránh đếm trùng (đã có trong form)
        if (editData) {
            existing = existing.filter((e: { showtimeId?: string }) => e.showtimeId !== (editData as unknown as { _id: string })._id);
        }
        // lọc suất trong cùng ca
        const sStart = toMinutes(session.startTime); const sEnd = toMinutes(session.endTime) + (session.endTime <= session.startTime ? 24*60 : 0);
        const listInSession = existing.filter(e => {
            const st = toMinutes(e.startTime as unknown as string); let en = toMinutes(e.endTime as unknown as string); if (en <= st) en += 24*60;
            return st >= sStart && st < sEnd;
        });
        // cộng thêm các suất đang có trong form thuộc cùng ca (chưa lưu DB)
        const inFormSameSession = rows
            .map((r, idx) => ({ r, idx }))
            .filter(({ r, idx }) =>
                idx !== rowIndex &&
                r.dateRange &&
                r.room &&
                r.sessionId === sessionId &&
                r.startTime && r.endTime &&
                r.room === row.room && // chỉ tính các dòng cùng phòng hiện tại
                dayjs(r.dateRange[0]).isSame(dayjs(row.dateRange![0]), 'day') // và cùng ngày hiện tại
            )
            .map(({ r }) => ({ startTime: r.startTime!.format('HH:mm'), endTime: r.endTime!.format('HH:mm') }));
        const combined: Array<{ startTime: string; endTime: string }> = [
            ...listInSession,
            ...inFormSameSession
        ];
        // giới hạn tối đa 2 suất/ca (áp dụng cho tất cả ca)
        if (combined.length >= 2) {
            message.error('Trong một ca chỉ được tối đa 2 suất chiếu.');
            rows[rowIndex].sessionId = undefined;
            form.setFieldValue('showTimes', rows);
            return;
        }
        let nextStartMin = sStart;
        // Tìm khoảng trống sớm nhất trong ca đủ chứa (duration + 20)
        if (!selectedMovie) {
            message.warning('Chưa chọn phim nên không thể tính tự động khoảng trống.');
        } else {
            const required = selectedMovie.duration + 20; // tổng thời lượng cần chiếm trong ca
            // Danh sách khoảng chiếm chỗ [startMin, endMinWithCleaning]
            const intervals: Array<{start: number; end: number}> = combined.map(it => {
                const st = toMinutes(it.startTime);
                let en = toMinutes(it.endTime);
                if (en <= st) en += 24 * 60;
                // Cộng 20' vệ sinh cho suất đã tồn tại
                en += 20;
                return { start: st, end: en };
            }).sort((a,b)=> a.start - b.start);

            // Thuật toán quét tìm gap
            let candidate = sStart;
            
            for (const iv of intervals) {
                if (iv.start > candidate) {
                    const gap = iv.start - candidate;
                    if (gap >= required) { 
                        nextStartMin = candidate; 
                        break; 
                    }
                }
                // Cập nhật candidate để tìm vị trí tiếp theo có thể đặt suất chiếu
                candidate = Math.max(candidate, iv.end);
            }
            
            // Nếu chưa chọn được, thử cuối ca
            if (nextStartMin === sStart) {
                let endGap;
                // Xử lý ca đêm (kéo dài qua ngày)
                if (sEnd <= sStart) {
                    // Ca đêm: sEnd = 0, sStart = 20:30, cần tính gap từ candidate đến 24:00 + từ 00:00 đến sEnd
                    const gapToMidnight = (24 * 60) - candidate;
                    const gapFromMidnight = sEnd;
                    endGap = gapToMidnight + gapFromMidnight;
                } else {
                    // Ca bình thường
                    endGap = sEnd - candidate;
                }
                
                const isNight = /đêm/i.test(session.name);
                
                if (endGap >= required) {
                    // đủ chỗ trong khung ca -> đặt ở candidate (sau suất trước)
                    nextStartMin = candidate;
                } else if (combined.length > 0) {
                    if (isNight) {
                        // QUAN TRỌNG: cho phép ca đêm lấn quá giờ ca
                        // vẫn xếp ngay SAU suất trước (candidate), dù endGap không đủ
                        nextStartMin = candidate;
                    } else {
                        // các ca khác giữ nguyên ràng buộc cũ
                        message.error('Không còn khoảng trống phù hợp trong ca này cho phim đã chọn, chọn ca khác hoặc phim có thời lượng ngắn hơn.');
                        rows[rowIndex].sessionId = undefined;
                        form.setFieldValue('showTimes', rows);
                        return;
                    }   
                }
            }
        }
        rows[rowIndex].startTime = minutesToDayjs(dayjs(row.dateRange[0]), nextStartMin);
        // auto compute end theo duration phim
        if (selectedMovie?.duration) {
            // Hiển thị giờ kết thúc theo duration phim (backend tự cộng thêm 20' khi lưu)
            const estimatedEnd = nextStartMin + selectedMovie.duration;
            let endTime = minutesToDayjs(dayjs(row.dateRange[0]), estimatedEnd % (24*60));
            
            // Xử lý trường hợp ca đêm qua ngày hôm sau
            const startHour = Math.floor(nextStartMin / 60);
            const endHour = Math.floor((estimatedEnd % (24*60)) / 60);
            
            // Nếu giờ bắt đầu >= 22:00 và giờ kết thúc < 6:00, coi như qua ngày
            if (startHour >= 22 && endHour < 6) {
                endTime = endTime.add(1, 'day');
            }
            
            rows[rowIndex].endTime = endTime;
            // Lưu ràng buộc min start để người dùng có thể chỉnh nhưng không thấp hơn
            rows[rowIndex].minStartBoundary = minutesToDayjs(dayjs(row.dateRange[0]), nextStartMin);
            // validate vượt ca (trừ ca đêm)
            if (!(session.name.includes('đêm'))) {
                const sessionEndBound = (sEnd % (24*60));
                // Khi kiểm tra vượt ca phải tính thêm 20' vệ sinh mà backend sẽ cộng
                const over = (estimatedEnd + 20) > sessionEndBound;
                if (over) {
                    message.error('Không đủ thời gian trong ca này để thêm suất chiếu (vượt quá thời gian ca). Hãy chọn phim ngắn hơn hoặc ca/ngày khác.');
                    rows[rowIndex].startTime = undefined;
                    rows[rowIndex].endTime = undefined;
                    rows[rowIndex].sessionId = undefined;
                    form.setFieldValue('showTimes', rows);
                    return;
                }
            }

            // Kiểm tra: endTime của suất mới có trùng với startTime của suất khác trong ca không
            const otherStarts = combined
                .map(it => toMinutes(it.startTime))
                .filter(st => st > nextStartMin);
            if (otherStarts.some(st => st === (estimatedEnd % (24*60)))) {
                message.warning('Thời gian kết thúc của suất mới trùng với thời gian bắt đầu của suất khác trong ca. Hệ thống đã tính 20 phút vệ sinh khi lưu, vui lòng kiểm tra lại nếu cần.');
            }
        } else {
            message.warning('Chưa chọn phim nên không thể tính thời lượng để gợi ý.');
        }
        rows[rowIndex].sessionId = sessionId;
        form.setFieldValue('showTimes', rows);
    };

    // Hàm kiểm tra trùng lặp suất chiếu - CHỈ return true/false, không hiển thị message
    const checkDuplicateShowtime = async (newShowtime: {
        dateRange: [dayjs.Dayjs, dayjs.Dayjs];
        startTime: dayjs.Dayjs;
        endTime: dayjs.Dayjs;
        room: string;
        sessionId?: string;
    }, checkDate: dayjs.Dayjs) => {
        try {
            const dateStr = checkDate.format('YYYY-MM-DD');
            const existing = await getShowtimesByRoomAndDateApi(newShowtime.room, dateStr);
            
            console.log('Checking duplicate for:', {
                date: dateStr,
                room: newShowtime.room,
                startTime: newShowtime.startTime.format('HH:mm'),
                endTime: newShowtime.endTime.format('HH:mm'),
                existingCount: existing.length
            });
            
            // Kiểm tra chồng chéo thời gian với suất chiếu hiện có
            const duplicates = existing.filter((existingSt: { startTime: string; endTime: string; showtimeId?: string; movieId?: string }) => {
                const existingStart = dayjs(existingSt.startTime);
                const existingEnd = dayjs(existingSt.endTime);
                const newStart = newShowtime.startTime;
                const newEnd = newShowtime.endTime;
                
                // Kiểm tra overlap: suất mới bắt đầu trước khi suất cũ kết thúc VÀ suất mới kết thúc sau khi suất cũ bắt đầu
                const isOverlap = newStart.isBefore(existingEnd) && newEnd.isAfter(existingStart);
                
                console.log('Comparing:', {
                    existing: `${existingStart.format('HH:mm')} - ${existingEnd.format('HH:mm')}`,
                    new: `${newStart.format('HH:mm')} - ${newEnd.format('HH:mm')}`,
                    isOverlap,
                    showtimeId: existingSt.showtimeId
                });
                
                return isOverlap;
            });
            
            if (duplicates.length > 0) {
                // Trường hợp sửa: cho phép nếu có ÍT NHẤT một bản ghi trùng thuộc đúng document đang sửa
                if (editData && duplicates.some(d => d.showtimeId === (editData as unknown as { _id: string })._id)) {
                    console.log('Overlap found but it is the same showtime being edited, allowing...');
                    return false; // Cho phép vì đây chính là suất đang sửa
                } else {
                    console.log('Time overlap found! Will show duplicate warning.');
                    return true; // Trùng lặp thực sự
                }
            }
            
            return false;
        } catch (error) {
            console.error('Error checking duplicate:', error);
            return false;
        }
    };

    const handleSubmit = async (values: {
        movieId: string;
        regionId: string;
        theaterId: string;
        showTimes: Array<{
            dateRange: [dayjs.Dayjs, dayjs.Dayjs];
            startTime: dayjs.Dayjs;
            endTime: dayjs.Dayjs;
            room: string;
            sessionId?: string;
            status: 'active' | 'inactive';
        }>;
    }) => {
        try {
            setIsLoading(true);
            
            // Expand các suất chiếu theo khoảng ngày
            const expandedShowtimes: Array<{
                date: dayjs.Dayjs;
                startTime: dayjs.Dayjs;
                endTime: dayjs.Dayjs;
                room: string;
                sessionId?: string;
                status: 'active' | 'inactive';
            }> = [];
            
            for (const showtime of values.showTimes) {
                const [startDate, endDate] = showtime.dateRange;
                let currentDate = startDate;
                
                // Lặp qua tất cả các ngày trong khoảng
                while (currentDate.isSameOrBefore(endDate, 'day')) {
                    // QUAN TRỌNG: Cập nhật ngày cho startTime và endTime để khớp với currentDate
                    // Giữ nguyên giờ và phút, chỉ thay đổi ngày
                    const adjustedStartTime = currentDate
                        .hour(showtime.startTime.hour())
                        .minute(showtime.startTime.minute())
                        .second(0)
                        .millisecond(0);
                    
                    // Xử lý endTime: nếu endTime qua ngày (ca đêm), cộng thêm 1 ngày
                    let adjustedEndTime = currentDate
                        .hour(showtime.endTime.hour())
                        .minute(showtime.endTime.minute())
                        .second(0)
                        .millisecond(0);
                    
                    // Nếu endTime < startTime, nghĩa là qua ngày hôm sau (ca đêm)
                    if (adjustedEndTime.isBefore(adjustedStartTime)) {
                        adjustedEndTime = adjustedEndTime.add(1, 'day');
                    }
                    
                    expandedShowtimes.push({
                        date: currentDate,
                        startTime: adjustedStartTime,
                        endTime: adjustedEndTime,
                        room: showtime.room,
                        sessionId: showtime.sessionId,
                        status: showtime.status
                    });
                    currentDate = currentDate.add(1, 'day');
                }
            }
            
            console.log('Expanded showtimes:', expandedShowtimes.map(st => ({
                date: st.date.format('DD/MM/YYYY'),
                startTime: st.startTime.format('DD/MM/YYYY HH:mm'),
                endTime: st.endTime.format('DD/MM/YYYY HH:mm')
            })));
            
            // Kiểm tra trùng lặp cho từng suất chiếu và phân loại
            const validShowtimes: typeof expandedShowtimes = [];
            const duplicateShowtimes: typeof expandedShowtimes = [];
            
            for (const showtime of expandedShowtimes) {
                const isDuplicate = await checkDuplicateShowtime(
                    {
                        dateRange: [showtime.date, showtime.date],
                        startTime: showtime.startTime,
                        endTime: showtime.endTime,
                        room: showtime.room,
                        sessionId: showtime.sessionId
                    },
                    showtime.date
                );
                
                if (isDuplicate) {
                    duplicateShowtimes.push(showtime);
                } else {
                    validShowtimes.push(showtime);
                }
            }
            
            // Hiển thị modal xác nhận nếu có suất trùng
            if (duplicateShowtimes.length > 0) {
                setDuplicateShowtimes(duplicateShowtimes);
                setValidShowtimes(validShowtimes);
                setPendingFormData(values);
                setShowDuplicateModal(true);
                setIsLoading(false);
                return; // Dừng lại để chờ người dùng xác nhận
            }
            
            // Nếu không có suất hợp lệ nào, dừng lại
            if (validShowtimes.length === 0) {
                toast.error('Tất cả suất chiếu đều bị trùng! Vui lòng kiểm tra lại.');
                setIsLoading(false);
                return;
            }
            
            // Backend sẽ khởi tạo ghế sau; không gửi mảng ghế từ frontend
            const formattedData = {
                movieId: values.movieId,
                theaterId: values.theaterId,
                showTimes: validShowtimes.map((st) => ({
                    date: st.date.toISOString(),
                    start: st.startTime.toISOString(),
                    end: st.endTime.toISOString(),
                    room: st.room,
                    // lưu kèm ca chiếu để backend có thể kiểm soát nếu cần
                    showSessionId: st.sessionId,
                    status: st.status
                }))
            };

            if (editData) {
                await updateShowtime(editData._id, formattedData as unknown as IShowtime);
                toast.success('Cập nhật suất chiếu thành công!');
            } else {
                await createShowtime(formattedData as unknown as IShowtime);
                const successMsg = duplicateShowtimes.length > 0
                    ? `Thêm thành công ${validShowtimes.length} suất chiếu! (Bỏ qua ${duplicateShowtimes.length} suất trùng)`
                    : `Thêm thành công ${validShowtimes.length} suất chiếu!`;
                toast.success(successMsg);
            }
            onSuccess();
        } catch (error) {
            console.error('Error saving showtime:', error);
            // Hiển thị lỗi chi tiết từ backend nếu có
            const err = error as { response?: { data?: { message?: string } }; message?: string };
            const errorMessage = err?.response?.data?.message || err?.message || (editData ? 'Cập nhật suất chiếu thất bại!' : 'Thêm suất chiếu thất bại!');
            console.log('Error details:', {
                response: err?.response?.data,
                message: err?.message,
                finalMessage: errorMessage
            });
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // Hàm xử lý khi admin xác nhận tiếp tục với suất trùng
    const handleConfirmWithDuplicates = async () => {
        try {
            setIsLoading(true);
            setShowDuplicateModal(false);
            
            // Backend sẽ khởi tạo ghế sau; không gửi mảng ghế từ frontend
            const formattedData = {
                movieId: pendingFormData.movieId,
                theaterId: pendingFormData.theaterId,
                showTimes: validShowtimes.map((st) => ({
                    date: st.date.toISOString(),
                    start: st.startTime.toISOString(),
                    end: st.endTime.toISOString(),
                    room: st.room,
                    // lưu kèm ca chiếu để backend có thể kiểm soát nếu cần
                    showSessionId: st.sessionId,
                    status: st.status
                }))
            };

            if (editData) {
                await updateShowtime(editData._id, formattedData as unknown as IShowtime);
                toast.success('Cập nhật suất chiếu thành công!');
            } else {
                await createShowtime(formattedData as unknown as IShowtime);
                const successMsg = duplicateShowtimes.length > 0
                    ? `Thêm thành công ${validShowtimes.length} suất chiếu! (Bỏ qua ${duplicateShowtimes.length} suất trùng)`
                    : `Thêm thành công ${validShowtimes.length} suất chiếu!`;
                toast.success(successMsg);
            }
            onSuccess();
        } catch (error) {
            console.error('Error saving showtime:', error);
            const err = error as { response?: { data?: { message?: string } }; message?: string };
            const errorMessage = err?.response?.data?.message || err?.message || (editData ? 'Cập nhật suất chiếu thất bại!' : 'Thêm suất chiếu thất bại!');
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // Hàm hủy khi admin không muốn tiếp tục
    const handleCancelWithDuplicates = () => {
        setShowDuplicateModal(false);
        setDuplicateShowtimes([]);
        setValidShowtimes([]);
        setPendingFormData(null);
    };

    // Validation cho khoảng ngày chiếu: phải nằm trong khoảng startDate và endDate của phim
    const validateMovieShowDateRange = (_: unknown, value: [dayjs.Dayjs, dayjs.Dayjs] | undefined) => {
        if (!value || !selectedMovie) {
            return Promise.resolve();
        }
        
        const [startDate, endDate] = value;
        const movieEndDate = dayjs(selectedMovie.endDate);
        
        // Khi cập nhật, bỏ tất cả ràng buộc về ngày bắt đầu
        if (!editData) {
            // Chỉ kiểm tra ràng buộc khi tạo mới
            const movieStartDate = dayjs(selectedMovie.startDate);
            if (startDate.isBefore(movieStartDate, 'day')) {
                return Promise.reject(new Error(`Ngày bắt đầu phải từ ${movieStartDate.format('DD/MM/YYYY')} (ngày khởi chiếu phim)`));
            }
            
            if (startDate.isBefore(dayjs(), 'day')) {
                return Promise.reject(new Error('Ngày bắt đầu không được là ngày đã qua'));
            }
        }
        
        if (endDate.isAfter(movieEndDate, 'day')) {
            return Promise.reject(new Error(`Ngày kết thúc phải trước ${movieEndDate.format('DD/MM/YYYY')} (ngày kết thúc chiếu phim)`));
        }
        
        if (endDate.isBefore(startDate, 'day')) {
            return Promise.reject(new Error('Ngày kết thúc phải sau ngày bắt đầu'));
        }
        
        return Promise.resolve();
    };


    return (
        <Modal
            open
            title={<div className="text-center text-xl font-semibold">{editData ? 'Sửa suất chiếu' : 'Thêm suất chiếu mới'}</div>}
            onCancel={onCancel}
            footer={null}
            width={900}
            centered
            destroyOnClose
            confirmLoading={modalLoading || isLoading}
            style={{ 
                marginTop: '2vh',
                marginBottom: '2vh',
                maxHeight: '96vh'
            }}
            bodyStyle={{
                maxHeight: 'calc(96vh - 110px)',
                overflowY: 'auto',
                scrollbarWidth: 'none', // Firefox
                msOverflowStyle: 'none', // IE và Edge
            }}
            className="hide-scrollbar"
        >
            <Spin spinning={modalLoading}>
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                autoComplete="off"
            >
                {hasOccupiedSeats && (
                    <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-yellow-800">
                                    Lưu ý khi chỉnh sửa
                                </h3>
                                <div className="mt-2 text-sm text-yellow-700">
                                    <p>Một số suất chiếu đã có ghế được đặt. Các suất chiếu này sẽ bị khóa và không thể chỉnh sửa hoặc xóa.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <Form.Item
                        name="movieId"
                        label="🎬 Phim"
                        rules={[
                            { required: true, message: 'Vui lòng chọn phim!' }
                        ]}
                    >
                        <Select
                            placeholder="Chọn phim"
                            size="large"
                            showSearch
                            disabled={hasOccupiedSeats}
                            optionFilterProp="children"
                            filterOption={(input, option) =>
                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                            onChange={handleMovieChange}
                            options={movies
                                .filter(movie => movie.status !== 'Đã kết thúc') // Lọc ra phim đã kết thúc
                                .map(movie => ({ 
                                    value: movie._id, 
                                    label: `${movie.title} (${getMovieStatusText(movie.status)})`
                                }))}
                        />
                    </Form.Item>

                    <Form.Item
                        name="regionId"
                        label="🌍 Khu vực"
                        rules={[
                            { required: true, message: 'Vui lòng chọn khu vực!' }
                        ]}
                    >
                        <Select
                            placeholder="Chọn khu vực"
                            size="large"
                            showSearch
                            disabled={hasOccupiedSeats}
                            optionFilterProp="children"
                            filterOption={(input, option) =>
                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                            onChange={handleRegionChange}
                            options={regions.map(region => ({ 
                                value: region._id, 
                                label: region.name 
                            }))}
                        />
                    </Form.Item>

                    <Form.Item
                        name="theaterId"
                        label="🏢 Rạp chiếu"
                        rules={[
                            { required: true, message: 'Vui lòng chọn rạp chiếu!' }
                        ]}
                    >
                        <Select
                            placeholder={selectedRegionId ? "Chọn rạp chiếu" : "Chọn khu vực trước"}
                            size="large"
                            showSearch
                            optionFilterProp="children"
                            filterOption={(input, option) =>
                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                            disabled={!selectedRegionId || hasOccupiedSeats}
                            onChange={handleTheaterChange}
                            options={filteredTheaters.map(theater => ({ 
                                value: theater._id, 
                                label: theater.name 
                            }))}
                            notFoundContent={selectedRegionId ? "Không có rạp nào trong khu vực này" : "Vui lòng chọn khu vực trước"}
                        />
                    </Form.Item>
                        </div>


                <div className="mb-6">
                    <h4 className="text-lg font-medium mb-4">Danh sách suất chiếu</h4>
                    <Form.List
                        name="showTimes"
                        rules={[
                            {
                                validator: async (_, showTimes) => {
                                    if (!showTimes || showTimes.length < 1) {
                                        return Promise.reject(new Error('Phải có ít nhất 1 suất chiếu!'));
                                    }
                                },
                            },
                        ]}
                    >
                        {(fields, { add, remove }, { errors }) => (
                            <>
                                {fields.map(({ key, name, ...restField }, index) => (
                                    <div key={key} className="mb-3">
                                        <Card
                                            size="small"
                                            title={
                                                <div className="flex items-center gap-2">
                                                    <span>Suất chiếu {index + 1}</span>
                                                    {occupiedSeatsStatus[name] && (
                                                        <Tag color="red">Đã có ghế đặt</Tag>
                                                    )}
                                                </div>
                                            }
                                            extra={
                                                fields.length > 1 && !occupiedSeatsStatus[name] ? (
                                                    <Popconfirm
                                                        title="Xác nhận xóa suất chiếu"
                                                        description={`Bạn có chắc muốn xóa Suất chiếu ${index + 1}?`}
                                                        okText="Xóa"
                                                        cancelText="Hủy"
                                                        okButtonProps={{ danger: true }}
                                                        onConfirm={() => {
                                                            remove(name);
                                                            message.success('Đã xóa suất chiếu');
                                                        }}
                                                    >
                                                    <Button
                                                        type="text"
                                                        danger
                                                        icon={<DeleteOutlined />}
                                                    >
                                                        Xóa
                                                    </Button>
                                                    </Popconfirm>
                                                ) : null
                                            }
                                        >
                                            <div className="space-y-4">
                                {/* Row 1: Khoảng ngày chiếu + Trạng thái */}
                                <div className="grid grid-cols-2 gap-4">
                                                    <Form.Item
                                                        {...restField}
                                                        name={[name, 'dateRange']}
                                                        label="Từ ngày - Đến ngày"
                                                        rules={[
                                                            { required: true, message: 'Vui lòng chọn khoảng ngày chiếu!' },
                                                            { validator: validateMovieShowDateRange }
                                                        ]}
                                                    >
                                                        <RangePicker
                                                            placeholder={['Từ ngày', 'Đến ngày']}
                                                            size="large"
                                                            style={{ width: '100%' }}
                                                            format="DD/MM/YYYY"
                                                            disabled={!selectedMovie || occupiedSeatsStatus[name]}
                                                            disabledDate={(current) => {
                                                                if (!selectedMovie) return true;
                                                                const movieEnd = dayjs(selectedMovie.endDate);
                                                                // Khi cập nhật, chỉ block ngày sau ngày kết thúc của phim
                                                                if (editData) {
                                                                    return current && current.isAfter(movieEnd, 'day');
                                                                }
                                                                // Khi tạo mới, vẫn kiểm tra tất cả ràng buộc
                                                                const movieStart = dayjs(selectedMovie.startDate);
                                                                return current && (current.isBefore(movieStart, 'day') || current.isAfter(movieEnd, 'day') || current.isBefore(dayjs(), 'day'));
                                                            }}
                                                            onChange={() => {
                                                                // Khi đổi ngày → reset room, session, start, end của dòng hiện tại
                                                                form.setFieldValue(['showTimes', name, 'room'], undefined);
                                                                form.setFieldValue(['showTimes', name, 'sessionId'], undefined);
                                                                form.setFieldValue(['showTimes', name, 'startTime'], undefined);
                                                                form.setFieldValue(['showTimes', name, 'endTime'], undefined);
                                                            }}
                                                        />
                                                    </Form.Item>

                                                    <Form.Item
                                                        {...restField}
                                                        name={[name, 'status']}
                                                        label="Trạng thái"
                                                        rules={[
                                                            { required: true, message: 'Vui lòng chọn trạng thái!' }
                                                        ]}
                                                        initialValue="active"
                                                    >
                                                        <Select
                                                            placeholder="Chọn trạng thái"
                                                            size="large"
                                                            disabled={occupiedSeatsStatus[name]}
                                                            options={[
                                                                { value: 'active', label: 'Hoạt động' },
                                                                { value: 'inactive', label: 'Không hoạt động' }
                                                            ]}
                                                        />
                                                    </Form.Item>
                                                </div>

                                                {/* Row 2: Phòng chiếu + Ca chiếu */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    <Form.Item
                                                        {...restField}
                                                        name={[name, 'room']}
                                                        label="Phòng chiếu"
                                                        rules={[
                                                            { required: true, message: 'Vui lòng chọn phòng chiếu!' }
                                                        ]}
                                                    >
                                                        <Select
                                                            key={`room-${selectedTheaterId}-${rooms.length}`}
                                                            size="large"
                                                            allowClear
                                                            showSearch
                                                            optionFilterProp="children"
                                                            filterOption={(input, option) =>
                                                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                                            }
                                                            disabled={!form.getFieldValue('theaterId') || occupiedSeatsStatus[name]}
                                                            value={
                                                                (() => {
                                                                    const hasTheater = !!form.getFieldValue('theaterId');
                                                                    if (!hasTheater) return undefined;
                                                                    const roomValue = form.getFieldValue(['showTimes', name, 'room']);
                                                                    // Kiểm tra xem room value có tồn tại trong rooms hiện tại không
                                                                    const roomExists = rooms.some(room => room._id === roomValue);
                                                                    return roomExists ? roomValue : undefined;
                                                                })()
                                                            }
                                                            options={(form.getFieldValue('theaterId') ? rooms : []).map(room => ({
                                                                value: room._id,
                                                                label: `🎬 ${room.name} - ${room.roomType || 'N/A'}`
                                                            }))}
                                                            loading={rooms.length === 0 && !!form.getFieldValue('theaterId')}
                                                            placeholder={
                                                                form.getFieldValue('theaterId') && form.getFieldValue(['showTimes', name, 'room']) && rooms.length > 0
                                                                    ? undefined
                                                                    : form.getFieldValue('theaterId') ? "Chọn phòng chiếu" : "Chọn rạp chiếu trước"
                                                            }
                                                            notFoundContent={form.getFieldValue('theaterId') ? "Không có phòng chiếu nào" : "Vui lòng chọn rạp chiếu trước"}
                                                            onChange={() => {
                                                                // Reset ca chiếu khi đổi phòng
                                                                form.setFieldValue(['showTimes', name, 'sessionId'], undefined);
                                                                form.setFieldValue(['showTimes', name, 'startTime'], undefined);
                                                                form.setFieldValue(['showTimes', name, 'endTime'], undefined);
                                                            }}
                                                        />
                                                    </Form.Item>

                                                    <Form.Item
                                                        // Re-render this block when dateRange or room in this row changes
                                                        shouldUpdate={(prev, cur) => {
                                                            const p = prev?.showTimes?.[name] || {};
                                                            const c = cur?.showTimes?.[name] || {};
                                                            return JSON.stringify(p.dateRange) !== JSON.stringify(c.dateRange) || p.room !== c.room;
                                                        }}
                                                        noStyle
                                                    >
                                                        {() => (
                                                            <Form.Item
                                                                {...restField}
                                                                name={[name, 'sessionId']}
                                                                label="Ca chiếu"
                                                                rules={[{ required: true, message: 'Vui lòng chọn ca chiếu!' }]}
                                                            >
                                                                <Select
                                                                    placeholder={
                                                                        form.getFieldValue(['showTimes', name, 'dateRange']) && form.getFieldValue(['showTimes', name, 'room'])
                                                                            ? 'Chọn ca chiếu'
                                                                            : 'Vui lòng chọn Ngày chiếu và Phòng trước'
                                                                    }
                                                                    size="large"
                                                                    showSearch
                                                                    optionFilterProp="children"
                                                                    filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                                                    value={form.getFieldValue(['showTimes', name, 'sessionId'])}
                                                                    options={showSessions.map(s => ({ value: s._id, label: `${s.name} (${s.startTime} - ${s.endTime})` }))}
                                                                    onChange={(val)=> onChangeSessionForRow(name, val)}
                                                                    disabled={
                                                                        occupiedSeatsStatus[name] ||
                                                                        !(
                                                                            form.getFieldValue(['showTimes', name, 'dateRange']) &&
                                                                            form.getFieldValue(['showTimes', name, 'room'])
                                                                        )
                                                                    }
                                                                />
                                                            </Form.Item>
                                                        )}
                                                    </Form.Item>
                                                </div>

                                                {/* Row 3: Thời gian bắt đầu + Thời gian kết thúc */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    <Form.Item
                                                        {...restField}
                                                        name={[name, 'startTime']}
                                                        label="Thời gian bắt đầu"
                                                        rules={[
                                                            { required: true, message: 'Vui lòng chọn thời gian bắt đầu!' }
                                                        ]}
                                                    >
                                                        <TimePicker
                                                            placeholder="Chọn giờ bắt đầu"
                                                            size="large"
                                                            style={{ width: '100%' }}
                                                            format="HH:mm"
                                                            minuteStep={15}
                                                            disabled={!selectedMovie || occupiedSeatsStatus[name]}
                                                            inputReadOnly={false}
                                                            // Khóa khung giờ theo ca đã chọn
                                                            disabledHours={() => {
                                                                const sessionId = form.getFieldValue(['showTimes', name, 'sessionId']);
                                                                const session = showSessions.find(s => s._id === sessionId);
                                                                if (!session) { return []; }
                                                                // Cho phép ca đêm tự do
                                                                if (/đêm/i.test(session.name)) { return []; }
                                                                const [sh] = session.startTime.split(':').map(Number);
                                                                const [eh, em] = session.endTime.split(':').map(Number);
                                                                const disabled: number[] = [];
                                                                const minStart: dayjs.Dayjs | undefined = form.getFieldValue(['showTimes', name, 'minStartBoundary']);
                                                                const minHour = minStart ? minStart.hour() : sh;
                                                                for (let h = 0; h < 24; h++) {
                                                                    if (h < Math.max(sh, minHour) || h > eh || (h === eh && em === 0)) {
                                                                        disabled.push(h);
                                                                    }
                                                                }
                                                                return disabled;
                                                            }}
                                                            disabledMinutes={(selectedHour) => {
                                                                const sessionId = form.getFieldValue(['showTimes', name, 'sessionId']);
                                                                const session = showSessions.find(s => s._id === sessionId);
                                                                if (!session) { return []; }
                                                                if (/đêm/i.test(session.name)) { return []; }
                                                                const [sh, sm] = session.startTime.split(':').map(Number);
                                                                const [eh, em] = session.endTime.split(':').map(Number);
                                                                const mins: number[] = [];
                                                                const minStart: dayjs.Dayjs | undefined = form.getFieldValue(['showTimes', name, 'minStartBoundary']);
                                                                const minHour = minStart ? minStart.hour() : sh;
                                                                const minMinute = minStart ? minStart.minute() : sm;
                                                                // Nếu giờ chọn là giờ bắt đầu ca → cấm phút < sm
                                                                const startHourBound = Math.max(sh, minHour);
                                                                const startMinuteBound = startHourBound === sh ? sm : minMinute;
                                                                if (selectedHour === startHourBound) {
                                                                    for (let m = 0; m < startMinuteBound; m++) mins.push(m);
                                                                }
                                                                // Nếu giờ chọn là giờ kết thúc ca → cấm phút >= em
                                                                if (selectedHour === eh) {
                                                                    for (let m = em; m < 60; m++) mins.push(m);
                                                                }
                                                                return mins;
                                                            }}
                                                            onChange={async (time) => {
                                                                if (time && selectedMovie) {
                                                                    // Validate nằm trong khoảng ca (nếu có session và không phải ca đêm)
                                                                    const sessionId = form.getFieldValue(['showTimes', name, 'sessionId']);
                                                                    const session = showSessions.find(s => s._id === sessionId);
                                                                    const minStart: dayjs.Dayjs | undefined = form.getFieldValue(['showTimes', name, 'minStartBoundary']);
                                                                    if (session && !/đêm/i.test(session.name)) {
                                                                        const [sh, sm] = session.startTime.split(':').map(Number);
                                                                        const [eh, em] = session.endTime.split(':').map(Number);
                                                                        const startBoundary = dayjs(time).hour(sh).minute(sm).second(0).millisecond(0);
                                                                        const endBoundary = dayjs(time).hour(eh).minute(em).second(0).millisecond(0);
                                                                        if (time.isBefore(startBoundary) || !time.isBefore(endBoundary)) {
                                                                            message.error('Thời gian bắt đầu phải nằm trong khoảng của ca chiếu đã chọn.');
                                                                            // Auto snap về giới hạn đầu ca
                                                                            time = startBoundary;
                                                                        }
                                                                        // Không cho phép kết thúc vượt quá thời gian ca
                                                                        const maxStart = endBoundary.subtract(selectedMovie.duration + 20, 'minute');
                                                                        if (time.isAfter(maxStart)) {
                                                                            message.error('Thời gian của suất chiếu vượt quá thời gian của ca chiếu. Vui lòng chọn ca khác hoặc phim có thời lượng ngắn hơn.');
                                                                            time = maxStart;
                                                                        }
                                                                    }
                                                                    if (minStart && time.isBefore(minStart)) {
                                                                        message.warning('Thời gian bắt đầu không thể sớm hơn suất trước trong ca. Đã điều chỉnh lên thời gian hợp lệ gần nhất.');
                                                                        time = minStart;
                                                                    }

                                                                    // Chống chồng chéo với các suất khác trong ca cùng ngày/phòng
                                                                    try {
                                                                        const rowDateRange = form.getFieldValue(['showTimes', name, 'dateRange']);
                                                                        const rowRoom = form.getFieldValue(['showTimes', name, 'room']);
                                                                        const dateStr = rowDateRange ? dayjs(rowDateRange[0]).format('YYYY-MM-DD') : undefined;
                                                                        if (rowRoom && dateStr && session) {
                                                                            let existing = await getShowtimesByRoomAndDateApi(rowRoom, dateStr);
                                                                            if (editData) {
                                                                                existing = existing.filter((e: { showtimeId?: string }) => e.showtimeId !== (editData as any)._id);
                                                                            }
                                                                            const rowsAll: Array<{ dateRange?: [dayjs.Dayjs, dayjs.Dayjs]; room?: string; startTime?: dayjs.Dayjs; endTime?: dayjs.Dayjs; sessionId?: string; }> = form.getFieldValue('showTimes') || [];
                                                                            const inFormSameSession = rowsAll
                                                                                .map((r, idx) => ({ r, idx }))
                                                                                .filter(({ r, idx }) => idx !== name && r.dateRange && r.room && r.sessionId === sessionId && r.startTime && r.endTime && r.room === rowRoom && dayjs(r.dateRange[0]).isSame(dayjs(rowDateRange[0]), 'day'))
                                                                                .map(({ r }) => ({ startTime: r.startTime!.format('HH:mm'), endTime: r.endTime!.format('HH:mm') }));
                                                                            const combinedOverlap = [
                                                                                ...existing,
                                                                                ...inFormSameSession
                                                                            ];
                                                                            const required = selectedMovie.duration + 20;
                                                                            let startMin = time.hour() * 60 + time.minute();
                                                                            const intervals = combinedOverlap.map((it: any) => {
                                                                                const st = toMinutes(it.startTime);
                                                                                let en = toMinutes(it.endTime);
                                                                                if (en <= st) en += 24 * 60;
                                                                                en += 20; // vệ sinh của suất đã tồn tại
                                                                                return { start: st, end: en };
                                                                            }).sort((a: any,b: any)=> a.start - b.start);
                                                                            // Nếu người dùng chọn thời điểm trước suất đầu tiên nhưng không đủ chỗ trước suất đầu tiên → snap về đầu ca
                                                                            if (intervals.length > 0) {
                                                                                const [sh3, sm3] = session.startTime.split(':').map(Number);
                                                                                const sessionStartMin2 = sh3 * 60 + sm3;
                                                                                const first = intervals[0];
                                                                                if (startMin < first.start && (startMin + required) > first.start) {
                                                                                    message.error('Thời gian bạn chọn bị lấn sang suất chiếu khác trong ca. Hệ thống đặt lại về đầu ca.');
                                                                                    startMin = sessionStartMin2;
                                                                                }
                                                                            }
                                                                            // Nếu chồng với các suất khác, tự đẩy tới đầu khoảng trống hợp lệ tiếp theo
                                                                            let adjusted = false;
                                                                            let changed = true;
                                                                            while (changed) {
                                                                                changed = false;
                                                                                for (const iv of intervals) {
                                                                                    const overlaps = !(startMin + required <= iv.start || startMin >= iv.end);
                                                                                    if (overlaps) {
                                                                                        // Đẩy tới sau interval bị chồng
                                                                                        startMin = iv.end;
                                                                                        changed = true;
                                                                                        adjusted = true;
                                                                                    }
                                                                                }
                                                                            }
                                                                            if (adjusted) {
                                                                                message.error('Thời gian trùng với suất chiếu khác trong ca. Hệ thống đã điều chỉnh tới khoảng trống hợp lệ kế tiếp.');
                                                                            }
                                                                            time = minutesToDayjs(dayjs(rowDateRange[0]), startMin);
                                                                        }
                                                                    } catch (err) { console.error(err); }
                                                                    // Tự động tính thời gian kết thúc
                                                            let endTime = time.add(selectedMovie.duration, 'minute');
                                                                    
                                                                    // Xử lý trường hợp ca đêm qua ngày hôm sau
                                                                    const startHour = time.hour();
                                                                    const endHour = endTime.hour();
                                                                    
                                                                    // Nếu giờ bắt đầu >= 22:00 và giờ kết thúc < 6:00, coi như qua ngày
                                                                    if (startHour >= 22 && endHour < 6) {
                                                                        endTime = endTime.add(1, 'day');
                                                                    }
                                                                    const currentShowTimes = form.getFieldValue('showTimes') || [];
                                                                    currentShowTimes[name] = {
                                                                        ...currentShowTimes[name],
                                                                        startTime: time,
                                                                        endTime: endTime
                                                                    };
                                                                    form.setFieldValue('showTimes', currentShowTimes);
                                                                    form.setFieldValue(['showTimes', name, 'endTime'], endTime);
                                                                }
                                                            }}
                                                        />
                                                    </Form.Item>

                                                    <Form.Item
                                                        {...restField}
                                                        name={[name, 'endTime']}
                                                        label={`Thời gian kết thúc ${selectedMovie ? `(+${selectedMovie.duration} phút)` : ''}`}
                                                    >
                                                        <TimePicker
                                                            placeholder="Tự động tính toán"
                                                            size="large"
                                                            style={{ width: '100%' }}
                                                            format="HH:mm"
                                                            disabled
                                                        />
                                                    </Form.Item>
                                    </div>
                                </div>
                                        </Card>
                            </div>
                        ))}
                                
                                <Form.Item className="mt-4">
                                    <Button
                                        type="dashed"
                                        onClick={async () => {
                                            // Kiểm tra các trường bắt buộc trước khi thêm
                                            const currentValues = form.getFieldsValue();
                                            if (!currentValues.movieId || !currentValues.theaterId) {
                                                message.error('Vui lòng chọn phim và rạp chiếu trước!');
                                                return;
                                            }
                                            
                                            // Thêm suất chiếu mới
                                            add();
                                        }}
                                        block
                                        icon={<PlusOutlined />}
                                        size="large"
                                    >
                                        Thêm suất chiếu
                                    </Button>
                                    <Form.ErrorList errors={errors} />
                                </Form.Item>
                            </>
                        )}
                    </Form.List>
                    </div>

                    <div className="flex justify-end gap-4 mt-6">
                        <motion.button
                            type="button"
                            onClick={onCancel}
                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 cursor-pointer"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            Hủy
                        </motion.button>
                        <motion.button
                            type="submit"
                            disabled={isLoading}
                            className={`px-4 py-2 text-white rounded cursor-pointer flex items-center gap-2 ${
                                isLoading
                                    ? 'bg-gray-400 cursor-not-allowed' 
                                    : 'bg-black hover:bg-gray-800'
                            }`}
                            whileHover={!isLoading ? { scale: 1.05 } : {}}
                            whileTap={!isLoading ? { scale: 0.95 } : {}}
                        >
                            {isLoading && <Spin size="small" />}
                            {isLoading 
                                ? (editData ? 'Đang cập nhật...' : 'Đang thêm...') 
                                : (editData ? 'Cập nhật' : 'Thêm suất chiếu')
                            }
                        </motion.button>
                    </div>
            </Form>
            </Spin>
            
            {/* Modal xác nhận suất trùng */}
            <Modal
                title={
                    <div className="flex items-center gap-2">
                        <span className="text-orange-500"></span>
                        <span>Xác nhận thêm suất chiếu</span>
                    </div>
                }
                open={showDuplicateModal}
                onCancel={handleCancelWithDuplicates}
                footer={[
                    <Button key="cancel" onClick={handleCancelWithDuplicates}>
                        Hủy
                    </Button>,
                    <Button 
                        key="confirm" 
                        type="primary" 
                        onClick={handleConfirmWithDuplicates}
                        loading={isLoading}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        Xác nhận thêm
                    </Button>
                ]}
                width={800}
                centered
                destroyOnClose
            >
                <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="font-medium">Sẽ thêm:</span>
                                <span className="ml-2 text-green-600 font-semibold">{validShowtimes.length} suất chiếu</span>
                            </div>
                            <div>
                                <span className="font-medium">Bỏ qua (trùng):</span>
                                <span className="ml-2 text-orange-600 font-semibold">{duplicateShowtimes.length} suất chiếu</span>
                            </div>
                        </div>
                    </div>

                    {duplicateShowtimes.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-orange-600 mb-3 flex items-center gap-2">
                                <span></span>
                                <span>Các suất chiếu bị trùng (sẽ bỏ qua):</span>
                            </h4>
                            <Table
                                dataSource={duplicateShowtimes.map((st, index) => {
                                    const roomName = rooms.find(room => room._id === st.room)?.name || st.room;
                                    return {
                                        key: index,
                                        date: st.date.format('DD/MM/YYYY'),
                                        time: `${st.startTime.format('HH:mm')} - ${st.endTime.format('HH:mm')}`,
                                        room: roomName,
                                        status: 'Trùng lặp'
                                    };
                                })}
                                pagination={false}
                                size="small"
                                columns={[
                                    {
                                        title: 'Ngày',
                                        dataIndex: 'date',
                                        key: 'date',
                                        width: 100
                                    },
                                    {
                                        title: 'Thời gian',
                                        dataIndex: 'time',
                                        key: 'time',
                                        width: 120
                                    },
                                    {
                                        title: 'Phòng',
                                        dataIndex: 'room',
                                        key: 'room',
                                        width: 100
                                    },
                                    {
                                        title: 'Trạng thái',
                                        dataIndex: 'status',
                                        key: 'status',
                                        width: 100,
                                        render: (status: string) => (
                                            <Tag color="orange">{status}</Tag>
                                        )
                                    }
                                ]}
                                scroll={{ y: 200 }}
                            />
                        </div>
                    )}

                    {validShowtimes.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-green-600 mb-3 flex items-center gap-2">
                                <span></span>
                                <span>Các suất chiếu sẽ được thêm:</span>
                            </h4>
                            <Table
                                dataSource={validShowtimes.map((st, index) => {
                                    const roomName = rooms.find(room => room._id === st.room)?.name || st.room;
                                    return {
                                        key: index,
                                        date: st.date.format('DD/MM/YYYY'),
                                        time: `${st.startTime.format('HH:mm')} - ${st.endTime.format('HH:mm')}`,
                                        room: roomName,
                                        status: 'Mới'
                                    };
                                })}
                                pagination={false}
                                size="small"
                                columns={[
                                    {
                                        title: 'Ngày',
                                        dataIndex: 'date',
                                        key: 'date',
                                        width: 100
                                    },
                                    {
                                        title: 'Thời gian',
                                        dataIndex: 'time',
                                        key: 'time',
                                        width: 120
                                    },
                                    {
                                        title: 'Phòng',
                                        dataIndex: 'room',
                                        key: 'room',
                                        width: 100
                                    },
                                    {
                                        title: 'Trạng thái',
                                        dataIndex: 'status',
                                        key: 'status',
                                        width: 100,
                                        render: (status: string) => (
                                            <Tag color="green">{status}</Tag>
                                        )
                                    }
                                ]}
                                scroll={{ y: 200 }}
                            />
                        </div>
                    )}

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                            <span className="text-yellow-600"></span>
                            <div className="text-sm text-yellow-800">
                                <p className="font-medium mb-1">Lưu ý:</p>
                                <p>• Các suất chiếu bị trùng sẽ được bỏ qua và giữ nguyên suất chiếu cũ</p>
                                <p>• Chỉ các suất chiếu mới (không trùng) sẽ được thêm vào hệ thống</p>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>
        </Modal>
    );
};

export default ShowtimeForm; 