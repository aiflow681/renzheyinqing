import React from 'react';
import { Play, MousePointerClick, Zap, ShieldPlus, Flame } from 'lucide-react';
import { motion } from 'motion/react';

interface MainMenuProps {
    onStart: () => void;
}

export function MainMenu({ onStart }: MainMenuProps) {
    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md z-50"
        >
            {/* Title Section */}
            <motion.div 
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 20 }}
                className="text-center mb-10"
            >
                <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500 tracking-tighter italic drop-shadow-[0_0_15px_rgba(239,68,68,0.5)] py-2 px-4">
                    忍者突袭
                </h1>
                <p className="text-red-400/80 font-medium tracking-[0.3em] uppercase text-sm mt-2">Ninja Rush</p>
            </motion.div>
            
            {/* Instructions Card */}
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 20 }}
                className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 mb-10 max-w-[320px] w-full shadow-2xl relative overflow-hidden"
            >
                {/* Subtle inner glow */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                
                <h3 className="text-white/90 font-bold text-sm tracking-widest text-center mb-6 uppercase">操作指南</h3>
                
                <ul className="space-y-5">
                    <li className="flex items-start gap-4">
                        <div className="bg-yellow-500/20 p-2 rounded-xl text-yellow-400 shrink-0">
                            <MousePointerClick size={20} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-white font-bold text-sm">点击转向</span>
                            <span className="text-white/50 text-xs leading-relaxed mt-0.5">空中瞬间反向，无限Z字走位躲避障碍</span>
                        </div>
                    </li>
                    <li className="flex items-start gap-4">
                        <div className="bg-cyan-500/20 p-2 rounded-xl text-cyan-400 shrink-0">
                            <Zap size={20} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-white font-bold text-sm">长按冲刺</span>
                            <span className="text-white/50 text-xs leading-relaxed mt-0.5">消耗能量进行无敌冲刺，击碎一切</span>
                        </div>
                    </li>
                    <li className="flex items-start gap-4">
                        <div className="bg-purple-500/20 p-2 rounded-xl text-purple-400 shrink-0">
                            <ShieldPlus size={20} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-white font-bold text-sm">强力道具</span>
                            <span className="text-white/50 text-xs leading-relaxed mt-0.5">拾取磁铁吸附金币，拾取护盾抵挡伤害</span>
                        </div>
                    </li>
                    <li className="flex items-start gap-4">
                        <div className="bg-red-500/20 p-2 rounded-xl text-red-400 shrink-0">
                            <Flame size={20} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-white font-bold text-sm">狂热模式</span>
                            <span className="text-white/50 text-xs leading-relaxed mt-0.5">15连击触发狂热，满屏金币+绝对无敌</span>
                        </div>
                    </li>
                </ul>
            </motion.div>

            {/* Start Button */}
            <motion.button 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 20 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => { e.stopPropagation(); onStart(); }}
                className="group relative flex items-center justify-center gap-3 bg-white text-black px-10 py-4 rounded-full font-bold text-xl overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.3)]"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-gray-200 to-white opacity-0 group-hover:opacity-100 transition-opacity" />
                <Play size={24} fill="currentColor" className="relative z-10" />
                <span className="relative z-10">开始游戏</span>
            </motion.button>
        </motion.div>
    );
}
