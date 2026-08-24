// js/map/data/routeData.js - SỬA SPAWN POINT RA ĐƯỜNG CHÍNH
import {
    roadNetwork,
    getRouteNodes,
    getRouteSegments,
    getTotalRouteLength,
    getPOIs as getNetworkPOIs
} from './roadNetworkData.js';

export const route = {
    id: 'phuyen-saigon',
    name: 'Phú Yên → Bến xe Miền Đông',
    totalLength: getTotalRouteLength(),
    nodes: getRouteNodes(),
    segments: getRouteSegments(),
    network: roadNetwork
};

// ===== SỬA SPAWN POINT: dùng node 'phuyen_exit' thay vì 'phuyen_station' =====
export function getSpawnPoint() {
    // Tìm node 'phuyen_exit' (junction trên đường chính)
    const spawnNode = roadNetwork.nodes.find(n => n.id === 'phuyen_exit');
    if (spawnNode) {
        return {
            x: spawnNode.position.x,
            z: spawnNode.position.z,
            y: 0.5,
            heading: 0
        };
    }
    // Fallback an toàn
    const firstNode = roadNetwork.nodes[0];
    return {
        x: firstNode.position.x,
        z: firstNode.position.z,
        y: 0.5,
        heading: 0
    };
}

export function getRouteWaypoints() {
    return getRouteNodes().map((node, i) => ({
        id: node.id,
        name: node.name || node.type,
        x: node.position.x,
        z: node.position.z,
        y: 0.5,
        type: node.type
    }));
}

export function getWorldBounds() {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const node of roadNetwork.nodes) {
        minX = Math.min(minX, node.position.x);
        maxX = Math.max(maxX, node.position.x);
        minZ = Math.min(minZ, node.position.z);
        maxZ = Math.max(maxZ, node.position.z);
    }
    const padding = 1500;
    return {
        minX: minX - padding,
        maxX: maxX + padding,
        minZ: minZ - padding,
        maxZ: maxZ + padding
    };
}

export function getMinimapData() {
    const pois = getNetworkPOIs().map(p => ({
        id: p.id,
        type: p.type,
        name: p.name || p.id,
        x: p.position.x,
        z: p.position.z
    }));
    return {
        bounds: getWorldBounds(),
        nodes: roadNetwork.nodes.map(n => ({
            id: n.id,
            type: n.type,
            name: n.name || n.id,
            x: n.position.x,
            z: n.position.z
        })),
        segments: roadNetwork.segments.map(s => {
            const fromNode = getNode(s.from);
            const toNode = getNode(s.to);
            return {
                from: { x: fromNode.position.x, z: fromNode.position.z },
                to: { x: toNode.position.x, z: toNode.position.z },
                type: s.type,
                width: s.width
            };
        }),
        route: getRouteWaypoints(),
        pois: pois
    };
}

export function getChunkSeed(cx, cz, worldSeed) {
    return worldSeed + cx * 9999 + cz * 7777;
}

export const getPOIs = getNetworkPOIs;

function getNode(id) {
    return roadNetwork.nodes.find(n => n.id === id);
}

export const roadDataSegments = roadNetwork.segments.map(seg => {
    const fromNode = getNode(seg.from);
    const toNode = getNode(seg.to);
    return {
        points: [
            { x: fromNode.position.x, z: fromNode.position.z },
            { x: toNode.position.x, z: toNode.position.z }
        ],
        width: seg.width,
        type: seg.type
    };
});