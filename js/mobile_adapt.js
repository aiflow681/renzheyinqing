// 移动端屏幕适配脚本 - 简化版
(function() {
    // 初始化适配
    function initMobileAdaptation() {
        // 更新viewport设置，确保移动设备正确显示
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1, user-scalable=no, viewport-fit=cover, maximum-scale=1.0, minimum-scale=1.0');
        }
        
        // 调整body样式以适应全屏
        document.body.style.margin = '0';
        document.body.style.padding = '0';
        document.body.style.overflow = 'hidden';
        document.body.style.backgroundColor = '#1d1d1d';
        document.body.style.width = '100%';
        document.body.style.height = '100%';
        document.body.style.position = 'relative';
        
        // 确保HTML元素也正确设置
        document.documentElement.style.margin = '0';
        document.documentElement.style.padding = '0';
        document.documentElement.style.overflow = 'hidden';
        document.documentElement.style.width = '100%';
        document.documentElement.style.height = '100%';
        
        // 让游戏自身的canvas处理逻辑运行，不干预canvas大小
    }
    
    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMobileAdaptation);
    } else {
        initMobileAdaptation();
    }
})();