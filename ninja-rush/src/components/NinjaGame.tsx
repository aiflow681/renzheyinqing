import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from '../game/Engine';
import { GameRenderer } from '../game/Renderer';
import { MainMenu } from './MainMenu';
import { GameOver } from './GameOver';
import { AnimatePresence } from 'motion/react';

export default function NinjaGame() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);

    const engineRef = useRef<GameEngine | null>(null);
    const rendererRef = useRef<GameRenderer | null>(null);
    const animationFrameId = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);

    // 初始化游戏引擎和渲染器
    useEffect(() => {
        if (!containerRef.current || !canvasRef.current) return;
        
        const { clientWidth, clientHeight } = containerRef.current;
        canvasRef.current.width = clientWidth;
        canvasRef.current.height = clientHeight;

        const engine = new GameEngine(clientWidth, clientHeight);
        engineRef.current = engine;
        
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
            rendererRef.current = new GameRenderer(ctx);
            rendererRef.current.draw(engine.state);
        }

        // 绑定游戏结束回调
        engine.onGameOver = (finalScore) => {
            setGameState('gameover');
            setScore(finalScore);
            setHighScore(prev => Math.max(prev, finalScore));
        };

    }, []);

    // 处理窗口尺寸变化
    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current && canvasRef.current && engineRef.current && rendererRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                canvasRef.current.width = clientWidth;
                canvasRef.current.height = clientHeight;
                engineRef.current.resize(clientWidth, clientHeight);
                
                if (engineRef.current.state.status !== 'playing') {
                    rendererRef.current.draw(engineRef.current.state);
                }
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // 游戏主循环
    const loop = useCallback((time: number) => {
        if (!engineRef.current || !rendererRef.current) return;
        
        if (engineRef.current.state.status === 'playing') {
            const dt = time - lastTimeRef.current;
            lastTimeRef.current = time;

            // 限制最大 dt 防止切后台回来后出现穿模
            if (dt < 100) {
                engineRef.current.update(dt);
                rendererRef.current.draw(engineRef.current.state);
            }
            
            animationFrameId.current = requestAnimationFrame(loop);
        }
    }, []);

    // 根据游戏状态启动/停止循环
    useEffect(() => {
        if (gameState === 'playing') {
            lastTimeRef.current = performance.now();
            animationFrameId.current = requestAnimationFrame(loop);
        }
        return () => {
            cancelAnimationFrame(animationFrameId.current);
        };
    }, [gameState, loop]);

    // 开始游戏处理函数
    const handleStart = () => {
        if (engineRef.current) {
            engineRef.current.reset();
            setGameState('playing');
        }
    };

    // 返回大厅处理函数
    const handleHome = () => {
        setGameState('menu');
    };

    // 玩家按下屏幕
    const handlePointerDown = (e: React.PointerEvent) => {
        e.preventDefault();
        if (gameState === 'playing' && engineRef.current) {
            engineRef.current.handlePointerDown();
        }
    };

    // 玩家松开屏幕
    const handlePointerUp = (e: React.PointerEvent) => {
        e.preventDefault();
        if (gameState === 'playing' && engineRef.current) {
            engineRef.current.handlePointerUp();
        }
    };

    return (
        <div className="w-full h-screen bg-gray-950 flex items-center justify-center overflow-hidden font-sans select-none touch-none">
            <div 
                ref={containerRef}
                className="relative w-full h-full max-w-md bg-gray-900 shadow-2xl overflow-hidden cursor-pointer"
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onPointerLeave={handlePointerUp}
            >
                <canvas ref={canvasRef} className="block w-full h-full" />

                <AnimatePresence>
                    {gameState === 'menu' && <MainMenu key="menu" onStart={handleStart} />}
                    
                    {gameState === 'gameover' && (
                        <GameOver 
                            key="gameover"
                            score={score} 
                            highScore={highScore} 
                            onRestart={handleStart} 
                            onHome={handleHome}
                        />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
