/**
 * URL参数管理工具
 * 用于读取和更新URL中的模拟类型参数
 */

/**
 * 有效的模拟类型列表
 */
const VALID_SIMULATION_TYPES = [
    'solar-system',
    'orbital-mechanics',
    'gravity-well',
    'stellar-evolution',
    'star-map'
];

/**
 * 从URL查询参数中获取模拟类型
 * @returns {string|null} 模拟类型，如果无效或不存在则返回null
 */
export function getSimulationTypeFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const simulate = urlParams.get('simulate');
    
    if (simulate && VALID_SIMULATION_TYPES.includes(simulate)) {
        return simulate;
    }
    
    return null;
}

/**
 * 更新URL中的模拟类型参数
 * 使用history.pushState避免页面刷新
 * @param {string} simulationType - 模拟类型
 */
export function updateURLSimulationType(simulationType) {
    if (!VALID_SIMULATION_TYPES.includes(simulationType)) {
        console.warn(`Invalid simulation type: ${simulationType}`);
        return;
    }
    
    const url = new URL(window.location);
    url.searchParams.set('simulate', simulationType);
    
    window.history.pushState({ simulate: simulationType }, '', url);
}

/**
 * 初始化URL监听
 * 监听浏览器前进/后退按钮，同步更新模拟类型
 * @param {Function} onSimulationChange - 模拟类型改变时的回调函数
 */
export function initURLListener(onSimulationChange) {
    window.addEventListener('popstate', (event) => {
        const simulationType = getSimulationTypeFromURL();
        if (simulationType && onSimulationChange) {
            onSimulationChange(simulationType);
        }
    });
}

