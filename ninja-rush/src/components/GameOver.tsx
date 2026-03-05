import React from 'react';
import { RotateCcw, Trophy, Home } from 'lucide-react';
import { motion } from 'motion/react';

interface GameOverProps {
    score: number;
    highScore: number;
    onRestart: () => void;
    onHome: () => void;
}

export function GameOver({ score, highScore, onRestart, onHome }: GameOverProps) {
    const isNewRecord = score > 0 && score >= highScore;

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md z-50"
        >
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className="flex flex-col items-center"
            >
                <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-red-400 to-red-600 mb-8 tracking-tighter drop-shadow-[0_0_15px_rgba(220,38,38,0.5)] py-2">
                    游戏结束
                </h2>
                
                <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 w-[300px] mb-10 border border-white/10 shadow-2xl relative overflow-hidden flex flex-col items-center">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                    
                    {isNewRecord && (
                        <motion.div 
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="absolute top-0 left-0 right-0 bg-gradient-to-r from-yellow-600/80 via-yellow-500/80 to-yellow-600/80 text-white text-xs font-bold py-1.5 text-center tracking-widest uppercase"
                        >
                            新纪录!
                        </motion.div>
                    )}

                    <div className="text-center mt-4 mb-6">
                        <p className="text-white/50 text-xs font-bold uppercase tracking-[0.2em] mb-2">本次得分</p>
                        <motion.p 
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2, type: 'spring' }}
                            className="text-6xl font-black text-white tracking-tighter"
                        >
                            {score}
                        </motion.p>
                    </div>
                    
                    <div className="h-px w-full bg-white/10 mb-6"></div>
                    
                    <div className="flex items-center justify-center gap-3 text-yellow-500/90 bg-yellow-500/10 px-6 py-3 rounded-2xl border border-yellow-500/20">
                        <Trophy size={20} />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-500/70 leading-none mb-1">最高分</span>
                            <span className="font-black text-lg leading-none">{highScore}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-4 w-[300px]">
                    <motion.button 
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 20 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => { e.stopPropagation(); onRestart(); }}
                        className="group relative flex items-center justify-center gap-3 bg-white text-black px-10 py-4 rounded-full font-bold text-xl overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.3)] w-full"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 to-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        <RotateCcw size={24} className="relative z-10" />
                        <span className="relative z-10">再玩一次</span>
                    </motion.button>

                    <motion.button 
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4, type: 'spring', stiffness: 200, damping: 20 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => { e.stopPropagation(); onHome(); }}
                        className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-10 py-3 rounded-full font-bold text-lg transition-colors border border-white/10 w-full"
                    >
                        <Home size={20} />
                        <span>返回大厅</span>
                    </motion.button>
                </div>
            </motion.div>
        </motion.div>
    );
}
