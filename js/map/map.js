// js/map/map.js - SỬA SPAWN POINT LẤY SLOT THỨ 2 (hoặc slot không overlap)
import * as THREE from "three";
import { generateChunk } from "./chunkGenerator.js";
import { getSpawnPoint as getRouteSpawn, getRouteWaypoints, getMinimapData, getWorldBounds } from "./data/routeData.js";
import { roadNetwork } from "./data/roadNetworkData.js";

const CHUNK_SIZE = 256;
const RENDER_DISTANCE_CHUNKS = 4;
const WORLD_SEED = 20260817;

export function createMap({ scene, seed = WORLD_SEED, lighting } = {}) {
    const group = new THREE.Group();
    group.name = "map";
    scene.add(group);

    const chunks = new Map();
    const worldSeed = seed;
    let lastPlayerChunkX = null, lastPlayerChunkZ = null;
    const parkingSlots = [];

    function buildChunk(cx, cz) {
        const key = `${cx},${cz}`;
        if (chunks.has(key)) return;
        const chunkGroup = generateChunk({ chunkX: cx, chunkZ: cz, worldSeed, chunkSize: CHUNK_SIZE, parkingSlots });
        if (chunkGroup) {
            group.add(chunkGroup);
            chunks.set(key, { group: chunkGroup, x: cx, z: cz });
        }
    }

    function unloadChunk(cx, cz) {
        const key = `${cx},${cz}`;
        const entry = chunks.get(key);
        if (!entry) return;
        group.remove(entry.group);
        entry.group.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
        chunks.delete(key);
    }

    function updateChunks(playerX, playerZ) {
        const cx = Math.floor(playerX / CHUNK_SIZE);
        const cz = Math.floor(playerZ / CHUNK_SIZE);
        if (cx === lastPlayerChunkX && cz === lastPlayerChunkZ) return;
        lastPlayerChunkX = cx;
        lastPlayerChunkZ = cz;

        const needed = new Set();
        const dist = RENDER_DISTANCE_CHUNKS;
        for (let dx = -dist; dx <= dist; dx++) {
            for (let dz = -dist; dz <= dist; dz++) {
                const d = Math.sqrt(dx * dx + dz * dz);
                if (d <= dist + 0.5) {
                    needed.add(`${cx + dx},${cz + dz}`);
                }
            }
        }

        for (const [key, entry] of chunks) {
            if (!needed.has(key)) {
                unloadChunk(entry.x, entry.z);
            }
        }

        for (const key of needed) {
            if (!chunks.has(key)) {
                const parts = key.split(",");
                buildChunk(parseInt(parts[0]), parseInt(parts[1]));
            }
        }
    }

    // ===== SỬA HÀM SPAWN POINT: ƯU TIÊN SLOT THỨ 2 (NẾU CÓ) =====
    function getSpawnPoint() {
        // Lọc các slot không bị chiếm và có vị trí hợp lý
        const availableSlots = parkingSlots.filter(s => !s.occupied && s.position.x !== undefined && s.position.z !== undefined);
        if (availableSlots.length > 1) {
            // Chọn slot thứ 2 (hoặc bất kỳ slot nào khác ngoài slot đầu tiên)
            const slot = availableSlots[1] || availableSlots[0];
            return {
                x: slot.position.x,
                z: slot.position.z,
                y: 0.5,
                heading: slot.rotation || 0
            };
        }
        // Fallback: dùng spawn từ routeData (node phuyen_exit)
        const routeSpawn = getRouteSpawn();
        return {
            x: routeSpawn.x,
            z: routeSpawn.z,
            y: 0.5,
            heading: routeSpawn.heading || 0
        };
    }

    // Spawn ban đầu
    const spawn = getSpawnPoint();
    const cx0 = Math.floor(spawn.x / CHUNK_SIZE);
    const cz0 = Math.floor(spawn.z / CHUNK_SIZE);
    const distInit = 5;
    for (let dx = -distInit; dx <= distInit; dx++) {
        for (let dz = -distInit; dz <= distInit; dz++) {
            buildChunk(cx0 + dx, cz0 + dz);
        }
    }
    updateChunks(spawn.x, spawn.z);

    return {
        group,
        bounds: getWorldBounds(),
        ready: Promise.resolve(),
        setPlayerPosition: (x, z) => updateChunks(x, z),
        getHeight: () => 0,
        getRoadHeightAt: () => 0.1,
        getSpawnPoint,
        getRouteWaypoints,
        getRouteCurve: () => {
            const pts = getRouteWaypoints().map(p => new THREE.Vector3(p.x, p.y + 0.5, p.z));
            return new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.35);
        },
        getMinimapData,
        getColliders: () => [],
        getTunnels: () => [],
        isInTunnel: () => null,
        getBusSlots: () => parkingSlots,
        getShuttleLoops: () => [],
        getShoulderSpots: () => [],
        getTrafficLights: () => [],
        getTrafficLightPhase: () => "green",
        getRoadGraph: () => ({ nodes: new Map(), edges: [] }),
        getRoadAt: () => null,
        findNearestNode: () => null,
        getPointsOfInterest: () => getPOIs(),
        getPickupPoints: () => [],
        getDropPoints: () => [],
        getRestAreas: () => [],
        setNPCRefs: () => {},
        getNPCs: () => [],
        updateDayNight: () => {},
        dispose: () => {
            for (const entry of chunks.values()) {
                group.remove(entry.group);
                entry.group.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => m.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                });
            }
            chunks.clear();
            scene.remove(group);
        },
        getRoadNetwork: () => roadNetwork,
        getTotalRouteLength: () => {
            let totalLength = 0;
            const routeNodes = getRouteWaypoints();
            for (let i = 0; i < routeNodes.length - 1; i++) {
                const p1 = routeNodes[i];
                const p2 = routeNodes[i + 1];
                totalLength += Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.z - p1.z, 2));
            }
            return totalLength;
        },
        getParkingSlots: () => parkingSlots
    };
}

function getPOIs() {
    return roadNetwork.nodes.filter(n =>
        n.type === 'bus_station' ||
        n.type === 'rest_stop' ||
        n.type === 'gas_station'
    );
}