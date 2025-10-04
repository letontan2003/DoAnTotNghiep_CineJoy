import clsx from 'clsx';
import React, { useState, useMemo } from 'react';
import useAppStore from '@/store/app.store';
import img1 from '@/assets/lienhe1.jpg';
import img2 from '@/assets/lienhe2.jpg';
import img3 from '@/assets/lienhe3.jpg';
import img4 from '@/assets/lienhe4.jpg';
import bgContact5 from '@/assets/bg_contact_5.png';
import bgContact1 from '@/assets/bg_contact_1.png';
import bgContact2 from '@/assets/bg_contact_2.png';
import bgContact3 from '@/assets/bg_contact_3.png';
import bgContact4 from '@/assets/bg_contact_4.png';
import bgContact6 from '@/assets/bg_contact_6.png';
import bgContact7 from '@/assets/bg_contact_7.png';
import bgContact8 from '@/assets/bg_contact_8.png';

const ContactPage = () => {
  const { isDarkMode } = useAppStore();
  // Configurable layout variables for the service ticket block
  const SERVICE_TICKET_MAX_WIDTH_PX = 730; // width of the red ticket image area
  const SERVICE_TICKET_RIGHT_OFFSET_PX = 50; // extra right offset (px) when aligned right on desktop
  const SERVICE_TICKET_CONTENT_MAX_HEIGHT_PX = 260; // scroll height for the inner content

  // Selected service and display data
  type ServiceKey = 'group' | 'event' | 'ads' | 'gift';
  const [selectedService, setSelectedService] = useState<ServiceKey>('group');

  const serviceDisplay: Record<ServiceKey, { title: string; bg: string; content: string[] }> = {
    group: {
      title: 'Mua vé nhóm',
      bg: bgContact5,
      content: [
        'Áp dụng cho đoàn từ 20 khách trở lên, áp dụng chiết khấu cao với hợp đồng dài hạn của doanh nghiệp.',
        'Hoạt động gắn kết tinh thần tập thể, giúp các thành viên xích lại gần nhau hơn.',
        'Liên hệ ngay với CNJ Cinema để trải nghiệm dịch vụ: đặt chỗ như ý, ưu đãi khách đoàn, hỗ trợ sắp xếp phim và lịch chiếu phù hợp nhu cầu và lịch trình quý khách.',
        'Áp dụng ưu đãi cho các đoàn học sinh, sinh viên.',
        'Để được tư vấn vui lòng để thông tin ở phía dưới hoặc inbox fanpage CNJ Cinema.',
        'Chúng tôi sẽ liên hệ nhanh nhất có thể.'
      ]
    },
    event: {
      title: 'Thuê rạp tổ chức sự kiện',
      bg: bgContact6,
      content: [
        'Không gian sang trọng, phòng chiếu riêng biệt, hình ảnh và âm thanh vượt trội, CNJ Cinema cung cấp vị trí đẳng cấp để tổ chức sự kiện ra mắt sản phẩm, họp công ty, hội nghị khách hàng.',
        'Hỗ trợ sảnh rạp tổ chức đón khách, chụp hình thảm đỏ, tương tác với truyền thông tại chỗ.',
        'Có nhiều kinh nghiệm tổ chức họp báo ra mắt phim, ra mắt MV. CNJ Cinema sẽ giúp bạn đưa sản phẩm tới công chúng gần hơn.',
        'Liên hệ tư vấn vui lòng để thông tin ở bên dưới hoặc inbox fanpage CNJ Cinema.',
        'Chúng tôi sẽ liên hệ sớm nhất có thể.'
      ]
    },
    ads: {
      title: 'Quảng cáo tại rạp',
      bg: bgContact7,
      content: [
        'Tiếp cận tới đông đảo khách hàng xem phim tại rạp thông qua tiếp thị quảng cáo đa kênh tại rạp.',
        'CNJ Cinema cung cấp giải pháp truyền thông tại chỗ, quảng cáo trực tuyến giúp thương hiệu tới gần hơn tới người xem.',
        'Quảng cáo trên màn hình cực lớn, âm thanh sống động trong rạp trước mỗi suất chiếu phim.',
        'Quảng cáo trên các màn hình LED lớn tại sảnh chờ của rạp, với hàng chục địa điểm trên cả nước và hàng trăm màn hình hiển thị.',
        'Quảng cáo trên các sản phẩm in ấn, trưng bày tại rạp tiếp cận khách hàng tiềm năng.',
        'Quảng cáo trực tiếp tới từng khách xem phim tại rạp với sms, tin nhắn dịch vụ, phát phiếu quà tặng tận tay.',
        'Quảng cáo trên các kênh thông tin trực tuyến của rạp với hàng triệu lượt truy cập đặt vé xem phim mỗi tháng.'
      ]
    },
    gift: {
      title: 'Mua phiếu quà tặng / E-code',
      bg: bgContact8,
      content: [
        'Phiếu quà tặng dịch vụ tại rạp bao gồm: vé xem phim 2D, vé trải nghiệm các phòng chiếu đặc biệt Superplex (với màn hình lớn nhất Việt Nam), Cine Comfort (phòng chiếu có ghế duỗi chân, êm ái và rộng rãi hơn), CharVTI (phòng chiếu đẳng cấp riêng biệt, có phục vụ ăn uống miễn phí với không gian riêng tư), các combo bắp nước tại rạp.',
        'Có hai lựa chọn phiếu quà tặng giấy truyền thống và e-code điện tử tiện lợi.',
        'Hotline tư vấn: Ms Diệp 0913.003.864.',
        'Hãy sử dụng phiếu quà tặng tại CNJ Cinema để:',
        'Nâng cao chương trình Chăm Sóc Khách Hàng của Quý Đối Tác.',
        'Nâng tầm thương hiệu của Quý Đối Tác thông qua sản phẩm và dịch vụ của chúng tôi.',
        'Chăm sóc sức khỏe tinh thần khách hàng bằng sản phẩm giải trí tinh thần.',
        'Giải pháp về quà tặng cho các chiến dịch quảng bá, khuyến mại của Quý Đối Tác.',
        'Món quà sinh nhật ý nghĩa cho người thân và bạn bè.'
      ]
    }
  };

  return (
    <div className={clsx(isDarkMode ? 'bg-[#181c24]' : 'bg-white')}> 
      <div className="container mx-auto px-4 pb-14 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Left images */}
          <div className="md:col-span-5 flex flex-col items-center space-y-1 md:-ml-40">
            <img src={img1} alt="cinema-1" className="w-full max-w-[400px] rounded-lg shadow" />
            <img src={img2} alt="cinema-2" className="w-full max-w-[400px] rounded-lg shadow" />
          </div>

          {/* Right content */}
          <div className={clsx('md:col-span-7 mt-2 md:mt-10 md:-ml-20', isDarkMode ? 'text-white' : 'text-[#111]')}
               style={{ lineHeight: 1.9, fontSize: 18 }}>
            <h1
              className={clsx(
                'uppercase tracking-wide font-extrabold mb-6',
                'text-2xl md:text-3xl'
              )}
              style={{ color: '#d61f1f' }}
            >
              Liên hệ quảng cáo tại rạp / Mua vé nhóm
              <br />Thuê rạp tổ chức sự kiện / Mua phiếu quà tặng
            </h1>
            <p>
              Bạn có nhu cầu quảng cáo trên màn hình cỡ lớn tại rạp, tiếp cận đông đảo khách xem phim tại rạp.
            </p>
            <p>
              Bạn cần tăng cường nhận diện thương hiệu, tạo ra doanh thu lợi nhuận cho công ty.
            </p>
            <p>
              Bạn cần thưởng thức các bộ phim bom tấn riêng tư cùng gia đình, bạn bè, đồng nghiệp.
            </p>
            <p>
              Bạn cần một địa điểm tổ chức sự kiện, họp báo ra mắt dự án, tổ chức fan offline, đào tạo tập trung…
            </p>
            <p className="mt-2">
              Hãy liên hệ ngay với CNJ Cinema để được hỗ trợ ngay.
            </p>

            <div className="mt-6 p-5 rounded-lg border"
                 style={{
                   background: isDarkMode ? '#23272f' : '#f6f7fb',
                   borderColor: isDarkMode ? '#3a3f47' : '#e5e7eb'
                 }}>
              <div className="text-lg font-semibold mb-1">Email: <span className="font-normal">cinejoy@gmail.com</span></div>
              <div className="text-lg font-semibold">Hotline: <span className="font-normal">1900 1999</span></div>
            </div>
          </div>
        </div>

        {/* Dịch vụ của chúng tôi section */}
        <div className="mt-16 text-center">
          <h2 
            className={clsx(
              'text-3xl md:text-4xl font-bold uppercase mb-6',
              isDarkMode ? 'text-white' : 'text-gray-800'
            )}
          >
            Dịch vụ của chúng tôi
          </h2>
          
        {/* Services layout: left small tickets, right main ticket with text */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Left small tickets */}
          <div className="md:col-span-4 flex flex-col items-center gap-6">
            {[
              { key: 'group' as ServiceKey, img: bgContact1, label: 'Mua vé nhóm' },
              { key: 'event' as ServiceKey, img: bgContact2, label: 'Thuê rạp tổ chức\nSự kiện' },
              { key: 'ads' as ServiceKey, img: bgContact3, label: 'Quảng cáo tại rạp' },
              { key: 'gift' as ServiceKey, img: bgContact4, label: 'Mua phiếu quà tặng\n / E-code' }
            ].map((item, idx) => (
              <div key={idx} className="relative w-full cursor-pointer" style={{ maxWidth: 280 }} onClick={() => setSelectedService(item.key)}>
                <img src={item.img} alt={item.label} className="w-full h-auto rounded-md shadow" />
                <div className="absolute inset-0 flex items-center justify-center px-6">
                  <div className="text-center text-white font-extrabold uppercase" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.25)' }}>
                    {item.label.split('\n').map((line, i) => (
                      <div key={i} className="leading-tight">{line}</div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Timeline column */}
          <div className="hidden md:flex md:col-span-1 justify-center">
             <div className="relative w-8 flex items-stretch" style={{ minHeight: 5.8 * 150 }}>
              <div className="mx-auto border-l-2 border-dashed border-gray-500/70 w-0 h-full"></div>
              <div className="absolute inset-0 flex flex-col justify-center py-2" style={{ gap: '190px' }}>
                {(['group','event','ads','gift'] as ServiceKey[]).map((key, idx) => {
                  const color = key==='group'
                    ? 'bg-red-500 border-red-600'
                    : key==='event'
                    ? 'bg-green-500 border-green-600'
                    : key==='ads'
                    ? 'bg-pink-500 border-pink-600'
                    : 'bg-orange-500 border-orange-600';
                  const isActive = selectedService === key;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedService(key)}
                      className={`mx-auto rounded-full w-6 h-6 border-2 shadow ${isActive ? color : 'bg-white/90 border-gray-400'} transition transform hover:scale-110`}
                      aria-label={`timeline-${key}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

           {/* Right big ticket */}
           <div className="md:col-span-7 flex flex-col items-stretch md:items-end">
             <div
               className="relative w-full"
               style={{ maxWidth: SERVICE_TICKET_MAX_WIDTH_PX, marginRight: SERVICE_TICKET_RIGHT_OFFSET_PX }}
             >
               <img
                 src={serviceDisplay[selectedService].bg}
                 alt="Dịch vụ của chúng tôi"
                 className="w-full h-auto rounded-lg shadow-lg"
               />
               {/* Overlay text */}
               <div className="absolute inset-0 flex items-center">
                 <div className="w-full px-8 md:px-12">
                   <h3 className="text-center text-white text-2xl md:text-3xl font-bold mb-4 uppercase">{serviceDisplay[selectedService].title}</h3>
                   <div
                     className="text-white/95 text-base md:text-lg leading-relaxed overflow-auto pr-2 space-y-2 contact-ticket-scroll"
                     style={{ maxHeight: SERVICE_TICKET_CONTENT_MAX_HEIGHT_PX }}
                   >
                     {serviceDisplay[selectedService].content.map((t, i) => (
                       <p key={i}>{t}</p>
                     ))}
                   </div>
                 </div>
               </div>
             </div>
             
             {/* Contact form right below big ticket */}
             <div className="w-full mt-8" style={{ maxWidth: SERVICE_TICKET_MAX_WIDTH_PX, marginRight: SERVICE_TICKET_RIGHT_OFFSET_PX }}>
               <h3 className={clsx('text-xl md:text-2xl font-bold text-center mb-4', isDarkMode ? 'text-white' : 'text-gray-800')}>
                 Lập kế hoạch cùng CNJ Cinema ngay
               </h3>
               <ContactInquiryForm defaultServiceKey={selectedService} isDarkMode={isDarkMode} setSelectedService={setSelectedService} />
             </div>
           </div>
         </div>

         {/* Additional background images section */}
         <div className="mt-16 space-y-8">
           <div className="w-full">
             <img src={img3} alt="cinema-3" className="w-full h-auto rounded-lg shadow-lg" />
           </div>
           <div className="w-full">
             <img src={img4} alt="cinema-4" className="w-full h-auto rounded-lg shadow-lg" />
           </div>
         </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;



/* Inline form component to avoid new files */

type FormServiceKey = 'group' | 'event' | 'ads' | 'gift';

const ContactInquiryForm: React.FC<{ defaultServiceKey: FormServiceKey; isDarkMode: boolean; setSelectedService: (service: FormServiceKey) => void }> = ({ defaultServiceKey, isDarkMode, setSelectedService }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [service, setService] = useState<FormServiceKey>(defaultServiceKey);
  const [region, setRegion] = useState('');
  const [cinema, setCinema] = useState('');
  const [message, setMessage] = useState('');
  const [submitAttempt, setSubmitAttempt] = useState(false);

  const charLimit = 300;
  const serviceMap: Record<FormServiceKey, string> = useMemo(
    () => ({
      group: 'Mua vé nhóm',
      event: 'Thuê rạp tổ chức sự kiện',
      ads: 'Quảng cáo tại rạp',
      gift: 'Mua phiếu quà tặng / E-code',
    }),
    []
  );

  const isValidPhone = (val: string) => /^\d{9,11}$/.test(val.trim());
  const isValid = () => name.trim() && isValidPhone(phone) && cinema.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempt(true);
    if (!isValid()) return;
    // For now just log; can integrate API later
    console.log('Contact inquiry', { name, phone, email, service, region, cinema, message });
    alert('Đã gửi thông tin! Chúng tôi sẽ liên hệ sớm nhất.');
    setName('');
    setPhone('');
    setEmail('');
    setRegion('');
    setCinema('');
    setMessage('');
  };

  return (
    <form onSubmit={handleSubmit} className={clsx("max-w-3xl mx-auto rounded-xl p-4 md:p-6 shadow", isDarkMode ? 'bg-white' : 'bg-gray-200')}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Họ và Tên" className="w-full rounded-lg border px-3 py-3 outline-none bg-white dark:bg-[#181c24]" />
          {submitAttempt && !name.trim() && <div className="text-red-500 text-sm mt-1">Họ và tên không được để trống</div>}
        </div>
        <div>
          <input value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="Số điện thoại" className="w-full rounded-lg border px-3 py-3 outline-none bg-white dark:bg-[#181c24]" />
          {submitAttempt && !isValidPhone(phone) && <div className="text-red-500 text-sm mt-1">Số điện thoại không được để trống</div>}
        </div>
        <div>
          <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email" className="w-full rounded-lg border px-3 py-3 outline-none bg-white dark:bg-[#181c24]" />
        </div>
        <div>
          <select 
            value={service} 
            onChange={(e) => {
              const newService = e.target.value as FormServiceKey;
              setService(newService);
              setSelectedService(newService);
            }} 
            className="w-full rounded-lg border px-3 py-3 outline-none bg-white dark:bg-[#181c24]"
          >
            {(Object.keys(serviceMap) as FormServiceKey[]).map((k)=>(
              <option key={k} value={k}>{serviceMap[k]}</option>
            ))}
          </select>
        </div>
        <div>
          <select value={region} onChange={(e)=>setRegion(e.target.value)} className="w-full rounded-lg border px-3 py-3 outline-none bg-white dark:bg-[#181c24]">
            <option value="">Chọn khu vực</option>
            <option value="hn">Hà Nội</option>
            <option value="hcm">TP. Hồ Chí Minh</option>
            <option value="dn">Đà Nẵng</option>
          </select>
        </div>
        <div>
          <select value={cinema} onChange={(e)=>setCinema(e.target.value)} className="w-full rounded-lg border px-3 py-3 outline-none bg-white dark:bg-[#181c24]">
            <option value="">Chọn rạp</option>
            <option value="cnj-1">CNJ Cinema 1</option>
            <option value="cnj-2">CNJ Cinema 2</option>
            <option value="cnj-3">CNJ Cinema 3</option>
          </select>
          {submitAttempt && !cinema.trim() && <div className="text-red-500 text-sm mt-1">Vui lòng chọn rạp.</div>}
        </div>
      </div>

      <div className="mt-4">
        <textarea value={message} onChange={(e)=>setMessage(e.target.value.slice(0,charLimit))} rows={4} placeholder="Thông tin chi tiết" className="w-full rounded-lg border px-3 py-3 outline-none bg-white dark:bg-[#181c24]"></textarea>
        <div className={clsx("flex justify-end text-sm", isDarkMode ? 'text-gray-400' : 'text-gray-500')}>{message.length}/{charLimit}</div>
      </div>

      <div className={clsx("text-sm mt-2", isDarkMode ? 'text-gray-300' : 'text-gray-600')}>CNJ Cinema xin nhận một ít thông tin nhé!</div>
      <div className="mt-4">
        <button type="submit" className="w-full px-6 py-3 rounded-lg bg-[#061b4b] text-white font-semibold hover:opacity-90">Gửi thông tin</button>
      </div>
    </form>
  );
};

