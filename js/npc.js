// js/npc.js - OPTIMIZED: GIẢM 30% XE BẾN PHÚ YÊN, ĐẬU RẢI RÁC NGĂN NẮP
import * as THREE from "three";
import { clamp, randomFloat, pick, createSeededRandom, disposeObject3D } from "./utils.js";
import { createNpcBus, pickNpcSkinPath, pickLedColor, loadNpcSkinList, BUS_DIMENSIONS } from "./bus.js";

const TWO_PI = Math.PI * 2;

function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= TWO_PI; while (d < -Math.PI) d += TWO_PI; return d; }
function easeInOut(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
function lerpAngle(a, b, t) { let diff = b - a; while (diff > Math.PI) diff -= TWO_PI; while (diff < -Math.PI) diff += TWO_PI; return a + diff * clamp(t, 0, 1); }

// ===== QUẢN LÝ BẾN XE =====
export class BusStationManager {
    constructor(scene, map, parkingSlots, playerSpawnPos) {
        this.scene = scene;
        this.map = map;
        this.parkingSlots = parkingSlots || [];
        this.playerSpawnPos = playerSpawnPos || null;
        this.stationBuses = [];
        this.busGroup = new THREE.Group();
        this.scene.add(this.busGroup);
        this.spawnStationBuses();
    }

    spawnStationBuses() {
        // Xác định bến Phú Yên
        let isPhuYen = false;
        if (this.parkingSlots.length > 0) {
            const firstSlot = this.parkingSlots[0];
            if (Math.abs(firstSlot.position.x) < 100 && Math.abs(firstSlot.position.z) < 100) {
                isPhuYen = true;
            }
        }

        const availableSlots = this.parkingSlots.filter(s => !s.occupied);
        let baseFillRate = 0.50 + Math.random() * 0.10;
        if (isPhuYen) {
            baseFillRate = baseFillRate * 0.70;
        }
        const fillRate = Math.max(0.25, Math.min(0.65, baseFillRate));
        const count = Math.floor(availableSlots.length * fillRate);
        const shuffled = availableSlots.sort(() => Math.random() - 0.5);
        const selectedSlots = shuffled.slice(0, count);

        // Lọc bỏ slot gần spawn chính (khoảng cách > 7)
        let filteredSlots = selectedSlots;
        if (this.playerSpawnPos) {
            const spawnX = this.playerSpawnPos.x;
            const spawnZ = this.playerSpawnPos.z;
            filteredSlots = selectedSlots.filter(slot => {
                const dx = slot.position.x - spawnX;
                const dz = slot.position.z - spawnZ;
                return Math.hypot(dx, dz) > 7.0;
            });
        }
        if (filteredSlots.length < 2) {
            filteredSlots = selectedSlots;
        }

        for (const slot of filteredSlots) {
            this._spawnBus(slot.position.x, slot.position.z, slot.rotation || 0);
            slot.occupied = true;
        }

        // Đậu rải rác xung quanh (cách spawn ít nhất 8m)
        let basePos = { x: 0, z: 0 };
        if (this.parkingSlots.length > 0) {
            basePos.x = this.parkingSlots[0].position.x;
            basePos.z = this.parkingSlots[0].position.z;
        }

        const extraCountBase = Math.floor(availableSlots.length * 0.12);
        const extraCount = isPhuYen ? Math.floor(extraCountBase * 0.70) : extraCountBase;
        const extraPositions = [];

        const directions = [
            { dx: 1, dz: 0 },
            { dx: -1, dz: 0 },
            { dx: 0, dz: 1 },
            { dx: 0, dz: -1 },
            { dx: 1, dz: 1 },
            { dx: -1, dz: -1 },
            { dx: 1, dz: -1 },
            { dx: -1, dz: 1 }
        ];

        for (let i = 0; i < extraCount && i < directions.length * 2; i++) {
            const dirIdx = i % directions.length;
            const dir = directions[dirIdx];
            const dist = 8 + Math.random() * 6;
            const x = basePos.x + dir.dx * dist + (Math.random() - 0.5) * 1.5;
            const z = basePos.z + dir.dz * dist + (Math.random() - 0.5) * 1.5;

            if (this.playerSpawnPos) {
                const dx = x - this.playerSpawnPos.x;
                const dz = z - this.playerSpawnPos.z;
                if (Math.hypot(dx, dz) < 8.0) continue;
            }

            let overlap = false;
            for (const slot of filteredSlots) {
                const dx = slot.position.x - x;
                const dz = slot.position.z - z;
                if (Math.hypot(dx, dz) < 4.0) { overlap = true; break; }
            }
            for (const pos of extraPositions) {
                const dx = pos.x - x;
                const dz = pos.z - z;
                if (Math.hypot(dx, dz) < 4.0) { overlap = true; break; }
            }
            if (!overlap) {
                const rot = Math.atan2(dir.dx, dir.dz) + (Math.random() - 0.5) * 0.3;
                extraPositions.push({ x, z, rot });
            }
        }

        for (const pos of extraPositions) {
            this._spawnBus(pos.x, pos.z, pos.rot);
        }
    }

    _spawnBus(x, z, rot) {
        const skin = pickNpcSkinPath();
        const ledColor = pickLedColor();
        const bus = createNpcBus({ skinPath: skin, ledColor: ledColor });
        bus.group.position.set(x, 0.5, z);
        bus.group.rotation.y = rot;
        bus.setDoor(0);
        bus.setInteriorLed(Math.random() > 0.5);
        bus.setHeadlights(Math.random() > 0.7);
        this.busGroup.add(bus.group);

        this.stationBuses.push({
            bus: bus,
            state: 'PARKED',
            timer: Math.random() * 10,
            targetPos: new THREE.Vector3(x, 0.5, z),
            targetRot: rot,
            speed: 0,
            skin: skin,
            ledColor: ledColor
        });
    }

    update(deltaTime) {
        if (Math.random() > 0.5) return;

        for (const busData of this.stationBuses) {
            busData.timer += deltaTime;
            const bus = busData.bus;

            if (busData.state === 'PARKED' && busData.timer > 20 + Math.random() * 30) {
                if (Math.random() < 0.3) {
                    busData.state = 'LOADING';
                    busData.timer = 0;
                    const pos = busData.targetPos.clone();
                    pos.z += 4;
                    busData.targetPos = pos;
                }
            } else if (busData.state === 'LOADING' && busData.timer > 10 + Math.random() * 8) {
                if (Math.random() < 0.5) {
                    busData.state = 'PARKED';
                    busData.timer = 0;
                    busData.targetPos = new THREE.Vector3(
                        busData.targetPos.x,
                        0.5,
                        busData.targetPos.z - 4
                    );
                }
            }

            const pos = bus.group.position;
            const target = busData.targetPos;
            if (target) {
                pos.x += (target.x - pos.x) * Math.min(1, 2 * deltaTime);
                pos.z += (target.z - pos.z) * Math.min(1, 2 * deltaTime);
            }
            if (busData.targetRot !== undefined) {
                let diff = angDiff(busData.targetRot, bus.group.rotation.y);
                bus.group.rotation.y += diff * Math.min(1, 2 * deltaTime);
            }
        }
    }

    getColliders() {
        const colliders = [];
        for (const busData of this.stationBuses) {
            if (busData.bus.group.visible) {
                colliders.push({
                    x: busData.bus.group.position.x,
                    z: busData.bus.group.position.z,
                    r: 1.5
                });
            }
        }
        return colliders;
    }

    dispose() {
        this.scene.remove(this.busGroup);
    }
}

// ===== HÀM TẠO NPC CHÍNH =====
export function createNPC({ scene, map, seed = 2027, playerBus = null, playerSpawnPos = null } = {}) {
    if (!map || typeof map.getRoadGraph !== "function") {
        const g = new THREE.Group();
        return {
            group: g,
            update() {},
            dispose() { if (g.parent) g.parent.remove(g); },
            getWaitingPassengers: () => [],
            pickUpPassenger: () => false,
            dropOffPassenger: () => false,
            getMovingVehicleCount: () => 0,
            getColliders: () => [],
            setPlayerBus() {},
            setTrafficDensity() {},
            getBusStationManager: () => null
        };
    }

    const random = createSeededRandom(seed);
    const group = new THREE.Group();
    group.name = "npc";
    group.matrixAutoUpdate = false;

    const graph = map.getRoadGraph();
    const edges = graph.edges;
    const nodes = graph.nodes;

    let edgePaths = [];
    function rebuildEdgePaths() {
        if (edgePaths.length === edges.length) return;
        edgePaths = edges.map((e) => {
            const cum = new Float32Array(e.points.length);
            let total = 0;
            for (let i = 1; i < e.points.length; i++) {
                total += Math.hypot(e.points[i].x - e.points[i - 1].x, e.points[i].z - e.points[i - 1].z);
                cum[i] = total;
            }
            return { cum, total: total || 1 };
        });
    }
    rebuildEdgePaths();

    const adjacency = new Map();
    edges.forEach((e, i) => {
        for (const [nid, other] of [[e.from, e.to], [e.to, e.from]]) {
            if (!adjacency.has(nid)) adjacency.set(nid, []);
            adjacency.get(nid).push({ edgeIndex: i, other });
        }
    });

    const trafficNodes = new Set();
    if (typeof map.getTrafficLights === "function")
        for (const l of map.getTrafficLights()) trafficNodes.add(l.id);

    const pose = { x: 0, y: 0, z: 0, heading: 0 };
    const playerScratch = { x: 0, z: 0 };
    let elapsed = 0;
    let playerRef = playerBus || null;

    function getPlayerPos() {
        if (!playerRef && scene) {
            for (const c of scene.children)
                if (c.name === "bus") { playerRef = c; break; }
        }
        if (playerRef && playerRef.position) {
            playerScratch.x = playerRef.position.x;
            playerScratch.z = playerRef.position.z;
            return true;
        }
        return false;
    }

    function samplePose(ei, dir, s, lane, out) {
        rebuildEdgePaths();
        const e = edges[ei], p = edgePaths[ei];
        if (!e || !p || e.points.length < 2) {
            out.x = 0; out.y = 0; out.z = 0; out.heading = 0;
            return out;
        }
        const abs = dir === 1 ? s : p.total - s;
        let i = 1;
        while (i < e.points.length - 1 && p.cum[i] < abs) i++;
        const a = e.points[i - 1], b = e.points[i];
        const seg = p.cum[i] - p.cum[i - 1] || 1;
        const t = (abs - p.cum[i - 1]) / seg;
        let tx = (b.x - a.x) / seg, tz = (b.z - a.z) / seg;
        if (dir === -1) { tx = -tx; tz = -tz; }
        out.x = a.x + (b.x - a.x) * t - tz * lane;
        out.y = a.y + (b.y - a.y) * t;
        out.z = a.z + (b.z - a.z) * t + tx * lane;
        out.heading = Math.atan2(tx, tz);
        return out;
    }

    function endNode(v) { const e = edges[v.edgeIndex]; return v.dir === 1 ? e.to : e.from; }

    function chooseNext(v, allowed) {
        const nid = endNode(v);
        const opts = (adjacency.get(nid) || []).filter((o) => o.edgeIndex !== v.edgeIndex && allowed(edges[o.edgeIndex].type));
        if (!opts.length) { v.dir *= -1; v.s = 0; v.turning = false; return; }
        const o = pick(random, opts);
        const e = edges[o.edgeIndex];
        v.edgeIndex = o.edgeIndex;
        v.dir = e.from === nid ? 1 : -1;
        v.s = 0;
        v.laneOffset = clamp(e.width * 0.23, 0.7, 3.4);
        if (v.laneTarget !== undefined) { v.laneTarget = v.laneOffset; v.laneCurrent = v.laneOffset; }
        v.targetSpeed = Math.min(e.speed * 0.2778, v.maxSpeed) * randomFloat(random, 0.85, 1.05);
        v.turning = true;
        v.turnProgress = 0;
        v.oldHeading = v.heading || 0;
        const newPose = { x: 0, y: 0, z: 0, heading: 0 };
        samplePose(v.edgeIndex, v.dir, Math.min(v.s + 3, edgePaths[v.edgeIndex].total * 0.1), v.laneOffset, newPose);
        v.targetHeading = newPose.heading;
    }

    function applyTraffic(v) {
        const nid = endNode(v);
        if (!trafficNodes.has(nid)) return Infinity;
        const dist = edgePaths[v.edgeIndex].total - v.s;
        if (dist > 32) return Infinity;
        const ph = map.getTrafficLightPhase(nid, elapsed);
        if (ph === "red" || (ph === "yellow" && dist > 7)) {
            if (dist <= 3.8) return 0;
            return Math.min(v.targetSpeed, Math.max(0, (dist - 3.8) * 0.65));
        }
        return Infinity;
    }

    function checkObstacleAvoidance(v, obstacles) {
        if (!obstacles.length) return null;
        const lookAhead = 12;
        const vx = Math.sin(v.heading || 0);
        const vz = Math.cos(v.heading || 0);
        let closest = null, closestDist = Infinity;
        for (const obs of obstacles) {
            const dx = obs.x - v.collider.x;
            const dz = obs.z - v.collider.z;
            const dist = Math.hypot(dx, dz);
            if (dist > lookAhead) continue;
            const dot = dx * vx + dz * vz;
            if (dot < 0) continue;
            const perp = -dx * vz + dz * vx;
            const halfWidth = 1.2;
            if (Math.abs(perp) > halfWidth + obs.r) continue;
            if (dist < closestDist) { closestDist = dist; closest = obs; }
        }
        return closest;
    }

    function getVehicleAhead(v, allVehicles, maxDist = 50) {
        let best = null, bestDist = maxDist;
        const vx = Math.sin(v.heading || 0);
        const vz = Math.cos(v.heading || 0);
        for (const other of allVehicles) {
            if (other === v) continue;
            if (!other.collider) continue;
            const dx = other.collider.x - v.collider.x;
            const dz = other.collider.z - v.collider.z;
            const dist = Math.hypot(dx, dz);
            if (dist > maxDist) continue;
            const dot = dx * vx + dz * vz;
            if (dot < 0) continue;
            const perp = -dx * vz + dz * vx;
            const laneWidth = 1.8;
            if (Math.abs(perp) > laneWidth * 2) continue;
            if (dist < bestDist) { bestDist = dist; best = other; }
        }
        return best;
    }

    const colliders = [];

    // === XE CHẠY TRÊN ĐƯỜNG ===
    const runningBuses = [];
    const RUNNING_COUNT = 20;

    function spawnRunningBus() {
        const allowed = edges.map((e, idx) => ({ e, idx })).filter((o) =>
            o.e.type === 'highway' || o.e.type === 'road' || o.e.type === 'urban' || o.e.type === 'mountain'
        );
        if (!allowed.length) return;
        const o = pick(random, allowed);
        if (!edgePaths[o.idx]) return;
        const lane = clamp(o.e.width * 0.23, 0.7, 3.4);
        const s = randomFloat(random, 5, Math.max(6, edgePaths[o.idx].total - 5));
        const dir = random() < 0.5 ? 1 : -1;
        const skin = pickNpcSkinPath();
        const bus = createNpcBus({ skinPath: skin, ledColor: pickLedColor() });
        const v = {
            bus,
            edgeIndex: o.idx,
            dir,
            s,
            speed: randomFloat(random, 5, 11),
            maxSpeed: 14,
            laneOffset: lane,
            laneCurrent: lane,
            laneTarget: lane,
            targetSpeed: randomFloat(random, 7, 12),
            heading: 0,
            turning: false,
            turnProgress: 0,
            oldHeading: 0,
            targetHeading: 0,
            collider: { x: 0, z: 0, r: 1.4 },
            active: true,
            obstacleDetected: false,
            obstacleAngle: 0,
            laneChangeTimer: 0,
            isLaneChanging: false,
        };
        samplePose(v.edgeIndex, v.dir, v.s, v.laneOffset, pose);
        v.heading = pose.heading;
        v.collider.x = pose.x;
        v.collider.z = pose.z;
        bus.group.position.set(pose.x, pose.y + 0.5, pose.z);
        bus.group.rotation.y = pose.heading;
        bus.setDoor(0);
        bus.setHeadlights(false);
        bus.setInteriorLed(random() < 0.3);
        group.add(bus.group);
        runningBuses.push(v);
        colliders.push(v.collider);
    }

    for (let i = 0; i < RUNNING_COUNT; i++) {
        spawnRunningBus();
    }

    // === QUẢN LÝ BẾN XE ===
    let stationManager = null;
    const parkingSlots = (map.getParkingSlots && map.getParkingSlots()) || [];
    if (parkingSlots.length > 0) {
        try {
            stationManager = new BusStationManager(scene, map, parkingSlots, playerSpawnPos);
            for (const bus of stationManager.stationBuses) {
                if (bus.bus.group.visible) {
                    colliders.push({ x: bus.bus.group.position.x, z: bus.bus.group.position.z, r: 1.5 });
                }
            }
        } catch (e) {
            console.warn("BusStationManager init failed:", e);
        }
    }

    // ===== UPDATE =====
    function update(dt, t = 0) {
        elapsed = t;
        rebuildEdgePaths();
        if (!edges.length) return;

        if (stationManager) {
            stationManager.update(dt);
        }

        let obstacles = [];
        if (typeof map.getStaticObstacles === "function") {
            obstacles = map.getStaticObstacles() || [];
        }

        const allVehicles = [
            ...runningBuses,
            ...(stationManager ? stationManager.stationBuses.map(b => ({ collider: { x: b.bus.group.position.x, z: b.bus.group.position.z, r: 1.5 }, speed: 0 })) : [])
        ];

        const pp = getPlayerPos();
        for (const v of runningBuses) {
            if (!v.active) continue;
            if (pp) {
                const dx = v.collider.x - pp.x;
                const dz = v.collider.z - pp.z;
                if (Math.hypot(dx, dz) > 700) {
                    v.active = false;
                    group.remove(v.bus.group);
                    continue;
                }
            }

            const obs = checkObstacleAvoidance(v, obstacles);
            let desired = v.targetSpeed;
            let avoidForce = 0;

            if (obs) {
                const dist = Math.hypot(obs.x - v.collider.x, obs.z - v.collider.z);
                if (dist < 3.5) {
                    const dx = obs.x - v.collider.x;
                    const dz = obs.z - v.collider.z;
                    const angleToObs = Math.atan2(dx, dz);
                    const heading = v.heading || 0;
                    let diff = angDiff(angleToObs, heading);
                    const steerSign = diff > 0 ? -1 : 1;
                    avoidForce = steerSign * 0.8;
                    if (dist < 3) desired *= 0.3;
                    v.obstacleDetected = true;
                    v.obstacleAngle = heading + steerSign * 0.5;
                } else {
                    v.obstacleDetected = false;
                }
            } else {
                v.obstacleDetected = false;
            }

            const lightCap = applyTraffic(v);
            if (lightCap < desired) desired = lightCap;

            const ahead = getVehicleAhead(v, allVehicles, 50);
            if (ahead) {
                const dx = ahead.collider.x - v.collider.x;
                const dz = ahead.collider.z - v.collider.z;
                const dist = Math.hypot(dx, dz);
                if (dist < 6 + v.speed * 0.3) {
                    const safeSpeed = Math.max(0, (dist - 4) * 0.4);
                    desired = Math.min(desired, safeSpeed);
                }
            }

            v.speed += clamp(desired - v.speed, -4 * dt, 2.5 * dt);
            v.speed = Math.max(0, v.speed);

            if (v.obstacleDetected && !v.isLaneChanging) {
                v.isLaneChanging = true;
                v.laneChangeTimer = 0;
                const newLane = v.laneOffset + (v.obstacleAngle > 0 ? 0.6 : -0.6);
                v.laneTarget = clamp(newLane, 0.5, 4.0);
            }

            if (v.isLaneChanging) {
                v.laneChangeTimer += dt;
                const progress = clamp(v.laneChangeTimer / 1.2, 0, 1);
                v.laneCurrent = lerpAngle(v.laneOffset, v.laneTarget, easeInOut(progress));
                if (progress >= 1) {
                    v.isLaneChanging = false;
                    v.laneOffset = v.laneTarget;
                    v.laneCurrent = v.laneTarget;
                }
            } else {
                if (Math.abs(v.laneCurrent - v.laneOffset) > 0.05) {
                    v.laneCurrent += (v.laneOffset - v.laneCurrent) * 0.02;
                }
            }

            v.s += v.speed * dt;
            if (v.s >= edgePaths[v.edgeIndex].total - 0.3) {
                chooseNext(v, (type) => type === 'highway' || type === 'road' || type === 'urban' || type === 'mountain');
                v.laneOffset = clamp(edges[v.edgeIndex]?.width * 0.23 || 0.7, 0.7, 3.4);
                v.laneTarget = v.laneOffset;
                v.isLaneChanging = false;
            }

            if (v.turning) {
                v.turnProgress = Math.min(1, v.turnProgress + dt * 0.8);
                const angle = angDiff(v.targetHeading, v.oldHeading);
                v.heading = v.oldHeading + angle * easeInOut(v.turnProgress);
                if (v.turnProgress >= 1) { v.turning = false; v.heading = v.targetHeading; }
            }

            const lane = v.laneCurrent !== undefined ? v.laneCurrent : v.laneOffset;
            samplePose(v.edgeIndex, v.dir, v.s, lane, pose);
            if (!v.turning) v.heading = lerpAngle(v.heading || pose.heading, pose.heading, Math.min(1, dt * 2.5));

            if (v.obstacleDetected && !v.isLaneChanging) {
                v.heading += avoidForce * dt * 0.5;
            }

            v.collider.x = pose.x;
            v.collider.z = pose.z;
            v.bus.group.position.set(pose.x, pose.y + 0.5, pose.z);
            v.bus.group.rotation.y = v.heading || pose.heading;
        }
    }

    function getColliders() {
        const all = [...colliders];
        if (stationManager) {
            for (const bus of stationManager.stationBuses) {
                if (bus.bus.group.visible) {
                    all.push({ x: bus.bus.group.position.x, z: bus.bus.group.position.z, r: 1.5 });
                }
            }
        }
        return all;
    }

    function getBusStationManager() {
        return stationManager;
    }

    return {
        group,
        update,
        dispose() { if (scene) scene.remove(group); disposeObject3D(group); if (stationManager) stationManager.dispose(); },
        getWaitingPassengers: () => [],
        pickUpPassenger: () => false,
        dropOffPassenger: () => false,
        getMovingVehicleCount: () => runningBuses.filter(v => v.active).length,
        getColliders,
        setPlayerBus(b) { playerRef = b; },
        setTrafficDensity() {},
        getBusStationManager
    };
}