import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'antd';
import useAppStore from '@/store/app.store';
import error from 'assets/error.gif';
import 'styles/error.css';

const random = (min: number, max: number) => {
  return Math.random() * (max - min) + min;
}

const NUM_STARS = 32;

const ErrorPage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useAppStore();

  const starConfigs = useMemo(() => (
    Array.from({ length: NUM_STARS }).map((_, i) => {
      return {
        top: random(0, 95),
        left: random(0, 95),
        size: random(1, 2.5),
        duration: random(6, 18),
        delay: random(0, 10),
        anim: `star-move-${(i % 6) + 1}`,
        opacity: random(0.5, 1),
      };
    })
  ), []);

  return (
    <div className={isDarkMode ? "error-bg-stars min-h-screen w-full flex flex-col items-center justify-center" : "error-bg-day min-h-screen w-full flex flex-col items-center justify-center"}>
      {isDarkMode && (
        <>
          {starConfigs.map((cfg, i) => (
            <div
              key={i}
              className={`star ${cfg.anim}`}
              style={{
                top: `${cfg.top}%`,
                left: `${cfg.left}%`,
                width: `${cfg.size}px`,
                height: `${cfg.size}px`,
                animationDuration: `${cfg.duration}s`,
                animationDelay: `${cfg.delay}s`,
                opacity: cfg.opacity,
              }}
            />
          ))}
        </>
      )}
      {!isDarkMode && (
        <>
          <div className="sun"></div>
          <div className="cloud cloud-1"></div>
          <div className="cloud cloud-2"></div>
          <div className="cloud cloud-3"></div>
          <div className="cloud cloud-4"></div>
          <div className="cloud cloud-5"></div>
        </>
      )}
      <img
        src={error}
        alt="404"
        className="z-10"
        style={{ maxWidth: 250, width: '90vw', height: 'auto' }}
      />
      <div className="z-10 flex flex-col items-center">
        <h2 className="text-2xl font-semibold mb-2 text-white drop-shadow" style={!isDarkMode ? { color: '#222', textShadow: '0 2px 8px #fff8' } : {}}>Trang bạn tìm kiếm không tồn tại hoặc đã bị di chuyển</h2>
        <Button
          type="primary"
          size="large"
          style={
            isDarkMode
              ? {
                  background: 'linear-gradient(90deg, #1976d2 0%, #21a1ff 100%)',
                  borderColor: '#1976d2',
                  color: '#fff',
                  fontWeight: 600,
                  borderRadius: 10,
                  padding: '0 25px',
                  fontSize: 18,
                  marginTop: 12,
                }
              : {
                  background: 'linear-gradient(90deg, #ffe259 0%, #ffa751 100%)',
                  borderColor: '#ffe259',
                  color: '#fff',
                  fontWeight: 600,
                  borderRadius: 10,
                  padding: '0 25px',
                  fontSize: 18,
                  marginTop: 12,
                }
          }
          onClick={() => navigate('/')}
        >
          Quay về trang chủ
        </Button>
      </div>
    </div>
  );
};

export default ErrorPage; 