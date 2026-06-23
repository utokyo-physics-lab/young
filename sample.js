import React, { useState, useEffect, useRef } from 'react';
import { Beaker, Waves, Zap, FastForward, Play } from 'lucide-react';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const SLIT_X = 350;
const SCREEN_X = 650;
const SLIT_Y1 = 150;
const SLIT_Y2 = 250;
const SLIT_WIDTH = 30;
const WAVE_K = 0.35;
const WAVE_W = 0.15;

const getInterferenceIntensity = (y) => {
  const r1 = Math.hypot(SCREEN_X - SLIT_X, y - SLIT_Y1);
  const r2 = Math.hypot(SCREEN_X - SLIT_X, y - SLIT_Y2);
  const phaseDiff = WAVE_K * (r1 - r2);
  const intensity = Math.pow(Math.cos(phaseDiff / 2), 2);
  const envelope = Math.exp(-Math.pow((y - CANVAS_HEIGHT / 2) / 120, 2));
  return intensity * envelope;
};

const drawSetup = (ctx) => {
  ctx.fillStyle = '#334155';
  ctx.fillRect(SLIT_X - 5, 0, 10, CANVAS_HEIGHT);
  ctx.clearRect(SLIT_X - 5, SLIT_Y1 - SLIT_WIDTH / 2, 10, SLIT_WIDTH);
  ctx.clearRect(SLIT_X - 5, SLIT_Y2 - SLIT_WIDTH / 2, 10, SLIT_WIDTH);

  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(SCREEN_X, 0, 4, CANVAS_HEIGHT);
};

// ==========================================
// 実験1：粒
// ==========================================
const ParticleMode = () => {
  const canvasRef = useRef(null);
  const [isFastForward, setIsFastForward] = useState(false);
  const particlesRef = useRef([]);
  const hitsRef = useRef(new Array(CANVAS_HEIGHT).fill(0));
  const maxHitsRef = useRef(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationId;

    const render = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      drawSetup(ctx);

      const spawnCount = isFastForward ? 8 : 1;
      const speedMult = isFastForward ? 4 : 1;

      for (let i = 0; i < spawnCount; i++) {
        if (Math.random() < 0.6) {
          particlesRef.current.push({
            x: 20,
            y: Math.random() * CANVAS_HEIGHT,
            vx: (5 + Math.random() * 2) * speedMult,
            vy: 0,
            active: true
          });
        }
      }

      ctx.fillStyle = '#fbbf24';
      particlesRef.current.forEach(p => {
        if (!p.active) return;
        const nextX = p.x + p.vx;
        const nextY = p.y + p.vy;

        if (p.x <= SLIT_X && nextX > SLIT_X) {
          const ratio = (SLIT_X - p.x) / (nextX - p.x);
          const crossY = p.y + (nextY - p.y) * ratio;

          const inSlit1 = Math.abs(crossY - SLIT_Y1) <= SLIT_WIDTH / 2;
          const inSlit2 = Math.abs(crossY - SLIT_Y2) <= SLIT_WIDTH / 2;
          if (inSlit1 || inSlit2) {
            p.vy = (Math.random() - 0.5) * 1.5 * speedMult;
          } else {
            p.active = false;
          }
        }

        if (p.active && nextX >= SCREEN_X) {
          p.active = false;
          const ratio = (SCREEN_X - p.x) / (nextX - p.x);
          const hitY = p.y + (nextY - p.y) * ratio;
          const floorY = Math.max(0, Math.min(CANVAS_HEIGHT - 1, Math.floor(hitY)));
          hitsRef.current[floorY]++;
          if (hitsRef.current[floorY] > maxHitsRef.current) {
            maxHitsRef.current = hitsRef.current[floorY];
          }
        }

        p.x = nextX;
        p.y = nextY;

        if (p.active) {
          ctx.beginPath();
          if (isFastForward) {
            ctx.fillRect(p.x, p.y - 1, Math.min(p.vx, 20), 2);
          } else {
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });

      particlesRef.current = particlesRef.current.filter(p => p.x < CANVAS_WIDTH && p.active);

      ctx.fillStyle = '#fbbf24';
      for (let y = 0; y < CANVAS_HEIGHT; y += 3) {
        let count = hitsRef.current[y] + hitsRef.current[y + 1] + hitsRef.current[y + 2];
        if (count > 0) {
          const width = (count / (maxHitsRef.current * 3)) * 120;
          ctx.fillRect(SCREEN_X + 10, y, width, 2);
        }
      }

      animationId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animationId);
  }, [isFastForward]);

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative">
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="bg-gray-900 rounded-lg shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-gray-800" />
      </div>
      <div className="mt-4 flex gap-4">
        <button onClick={() => setIsFastForward(false)} className={`flex items-center px-6 py-2 rounded-full font-bold transition-colors ${!isFastForward ? 'bg-yellow-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
          <Play className="w-4 h-4 mr-2" /> 通常
        </button>
        <button onClick={() => setIsFastForward(true)} className={`flex items-center px-6 py-2 rounded-full font-bold transition-colors ${isFastForward ? 'bg-yellow-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
          <FastForward className="w-4 h-4 mr-2" /> 早送り
        </button>
      </div>
    </div>
  );
};

// ==========================================
// 実験2：波
// ==========================================
const WaveMode = () => {
  const canvasRef = useRef(null);
  const offCanvasRef = useRef(null);

  useEffect(() => {
    if (!offCanvasRef.current) {
      offCanvasRef.current = document.createElement('canvas');
      offCanvasRef.current.width = CANVAS_WIDTH / 2;
      offCanvasRef.current.height = CANVAS_HEIGHT / 2;
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const offCtx = offCanvasRef.current.getContext('2d');
    let animationId;
    let time = 0;

    const render = () => {
      time += 1;
      const w = offCanvasRef.current.width;
      const h = offCanvasRef.current.height;
      const imgData = offCtx.createImageData(w, h);
      const data = imgData.data;

      const scale = 2;
      const slitX = SLIT_X / scale;
      const s1y = SLIT_Y1 / scale;
      const s2y = SLIT_Y2 / scale;

      const k = WAVE_K * scale;
      const omega = WAVE_W;

      // 波の先端のX座標
      const waveFrontX = (omega / k) * time;

      let i = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let val = 0;

          if (x < slitX) {
            // 左側の入射波（波の先端まで）
            if (x <= waveFrontX) {
              val = Math.sin(k * x - omega * time);
            }
          } else {
            // スリットからの回折波（スリット到達後から広がる）
            const r1 = Math.hypot(x - slitX, y - s1y);
            const r2 = Math.hypot(x - slitX, y - s2y);

            let val1 = 0, val2 = 0;
            // スリットでの位相 k*slitX を初期位相として足すことで連続させる
            if (r1 <= waveFrontX - slitX) {
              val1 = (1 / (1 + r1 * 0.03)) * Math.sin(k * r1 + k * slitX - omega * time);
            }
            if (r2 <= waveFrontX - slitX) {
              val2 = (1 / (1 + r2 * 0.03)) * Math.sin(k * r2 + k * slitX - omega * time);
            }
            val = val1 + val2;
          }

          const intensity = (val + 1) / 2;
          const c = intensity * 255;
          data[i++] = 0;
          data[i++] = c * 0.5;
          data[i++] = c * 0.8;
          data[i++] = 255;
        }
      }
      offCtx.putImageData(imgData, 0, 0);
      ctx.drawImage(offCanvasRef.current, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      drawSetup(ctx);

      // 干渉縞の理論グラフ
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let y = 0; y < CANVAS_HEIGHT; y += 4) {
        const intensity = getInterferenceIntensity(y);
        const graphX = SCREEN_X + 10 + intensity * 100;
        if (y === 0) ctx.moveTo(graphX, y);
        else ctx.lineTo(graphX, y);
      }
      ctx.stroke();

      animationId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative">
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="bg-gray-900 rounded-lg shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-gray-800" />
      </div>
      <div className="mt-4 h-10"></div> {/* レイアウト合わせのスペース */}
    </div>
  );
};

// ==========================================
// 実験3：量子（確率波）
// ==========================================
const QuantumMode = () => {
  const fgCanvasRef = useRef(null);
  const bgCanvasRef = useRef(null);
  const [isFastForward, setIsFastForward] = useState(false);

  const photonsRef = useRef([]);
  const hitsRef = useRef(new Array(CANVAS_HEIGHT).fill(0));
  const maxHitsRef = useRef(1);

  const generateTargetY = () => {
    while (true) {
      const y = Math.random() * CANVAS_HEIGHT;
      const prob = getInterferenceIntensity(y);
      if (Math.random() < prob) {
        return y;
      }
    }
  };

  const drawDotOnBg = (y) => {
    const ctx = bgCanvasRef.current.getContext('2d');
    ctx.fillStyle = 'rgba(168, 85, 247, 0.6)';
    const x = SCREEN_X + 2 + Math.random() * 40;
    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
    ctx.fill();
  };

  useEffect(() => {
    const bgCtx = bgCanvasRef.current.getContext('2d');
    bgCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawSetup(bgCtx);
    hitsRef.current.fill(0);
    maxHitsRef.current = 1;
    photonsRef.current = [];
  }, []);

  useEffect(() => {
    const fgCanvas = fgCanvasRef.current;
    const fgCtx = fgCanvas.getContext('2d');
    let animationId;

    const render = () => {
      fgCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const spawnChance = isFastForward ? 0.8 : 0.03;
      const spawnsPerFrame = isFastForward ? 8 : 1;
      const speed = isFastForward ? 0.06 : 0.015;

      for (let i = 0; i < spawnsPerFrame; i++) {
        if (Math.random() < spawnChance) {
          const slitY = Math.random() < 0.5 ? SLIT_Y1 : SLIT_Y2;
          photonsRef.current.push({
            progress: 0,
            targetY: generateTargetY(),
            slitY: slitY,
            active: true
          });
        }
      }

      photonsRef.current.forEach(photon => {
        if (!photon.active) return;

        photon.progress += speed;

        if (photon.progress >= 1) {
          photon.active = false;
          hitsRef.current[Math.floor(photon.targetY)]++;
          if (hitsRef.current[Math.floor(photon.targetY)] > maxHitsRef.current) {
            maxHitsRef.current = hitsRef.current[Math.floor(photon.targetY)];
          }
          drawDotOnBg(photon.targetY);

          if (!isFastForward) {
            fgCtx.fillStyle = 'white';
            fgCtx.shadowColor = 'white';
            fgCtx.shadowBlur = 15;
            fgCtx.beginPath();
            fgCtx.arc(SCREEN_X, photon.targetY, 4, 0, Math.PI * 2);
            fgCtx.fill();
            fgCtx.shadowBlur = 0;
          }
        } else {
          const p = photon.progress;
          let curX, curY;

          if (p < 0.5) {
            const p1 = p * 2;
            curX = 20 + (SLIT_X - 20) * p1;
            curY = (CANVAS_HEIGHT / 2) + (photon.slitY - CANVAS_HEIGHT / 2) * p1;
          } else {
            const p2 = (p - 0.5) * 2;
            curX = SLIT_X + (SCREEN_X - SLIT_X) * p2;
            curY = photon.slitY + (photon.targetY - photon.slitY) * p2;
          }

          fgCtx.fillStyle = isFastForward ? 'rgba(168, 85, 247, 0.8)' : 'white';
          if (!isFastForward) {
            fgCtx.shadowColor = '#a855f7';
            fgCtx.shadowBlur = 10;
          }

          fgCtx.beginPath();
          if (isFastForward) {
            fgCtx.fillRect(curX, curY - 1, 8, 2);
          } else {
            fgCtx.arc(curX, curY, 3, 0, Math.PI * 2);
            fgCtx.fill();
          }
          fgCtx.shadowBlur = 0;
        }
      });

      photonsRef.current = photonsRef.current.filter(p => p.active);

      fgCtx.fillStyle = '#a855f7';
      for (let y = 0; y < CANVAS_HEIGHT; y += 4) {
        let count = hitsRef.current[y] + hitsRef.current[y + 1] + hitsRef.current[y + 2] + hitsRef.current[y + 3];
        if (count > 0) {
          const width = (count / (maxHitsRef.current * 4)) * 100;
          fgCtx.fillRect(SCREEN_X + 50, y, width, 3);
        }
      }

      animationId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animationId);
  }, [isFastForward]);

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative">
        <canvas ref={bgCanvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="bg-gray-900 rounded-lg shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-gray-800 absolute top-0 left-0" />
        <canvas ref={fgCanvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="rounded-lg relative z-10" />
      </div>

      <div className="mt-4 flex gap-4">
        <button onClick={() => setIsFastForward(false)} className={`flex items-center px-6 py-2 rounded-full font-bold transition-colors ${!isFastForward ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
          <Play className="w-4 h-4 mr-2" /> 通常
        </button>
        <button onClick={() => setIsFastForward(true)} className={`flex items-center px-6 py-2 rounded-full font-bold transition-colors ${isFastForward ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
          <FastForward className="w-4 h-4 mr-2" /> 早送り
        </button>
      </div>
    </div>
  );
};

// ==========================================
// メインアプリ
// ==========================================
export default function App() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col items-center pt-8">
      <nav className="flex gap-2 mb-6">
        <button onClick={() => setActiveTab(0)} className={`flex items-center px-6 py-3 rounded-full font-bold transition-all ${activeTab === 0 ? 'bg-yellow-600 text-white' : 'bg-gray-900 text-gray-500 hover:bg-gray-800'}`}>
          <Zap className="w-5 h-5 mr-2" /> 粒
        </button>
        <button onClick={() => setActiveTab(1)} className={`flex items-center px-6 py-3 rounded-full font-bold transition-all ${activeTab === 1 ? 'bg-green-600 text-white' : 'bg-gray-900 text-gray-500 hover:bg-gray-800'}`}>
          <Waves className="w-5 h-5 mr-2" /> 波
        </button>
        <button onClick={() => setActiveTab(2)} className={`flex items-center px-6 py-3 rounded-full font-bold transition-all ${activeTab === 2 ? 'bg-purple-600 text-white' : 'bg-gray-900 text-gray-500 hover:bg-gray-800'}`}>
          <Beaker className="w-5 h-5 mr-2" /> 量子
        </button>
      </nav>

      <div className="w-full max-w-[850px]">
        {activeTab === 0 && <ParticleMode />}
        {activeTab === 1 && <WaveMode />}
        {activeTab === 2 && <QuantumMode />}
      </div>
    </div>
  );
}