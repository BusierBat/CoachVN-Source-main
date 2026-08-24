// js/map/landmarkGenerator.js
import * as THREE from 'three';
import { getLandmarks } from './data/landmarkData.js';
import { createBusStation } from './stationGenerator.js';

export function generateLandmarksForChunk({ chunkX, chunkZ, worldX, worldZ, chunkSize, seed, parkingSlots }) {
    const group = new THREE.Group();
    const half = chunkSize / 2;
    const padding = 300;
    const minX = worldX - half - padding;
    const maxX = worldX + half + padding;
    const minZ = worldZ - half - padding;
    const maxZ = worldZ + half + padding;

    const pois = getLandmarks();
    for (const poi of pois) {
        if (poi.position.x >= minX && poi.position.x <= maxX &&
            poi.position.z >= minZ && poi.position.z <= maxZ) {
            if (poi.type === 'bus_station') {
                createBusStation(poi, group, parkingSlots);
            } else if (poi.type === 'rest_stop') {
                createRestStop(poi, group);
            } else if (poi.type === 'gas_station') {
                createGasStation(poi, group);
            }
        }
    }
    return group;
}

function createRestStop(poi, parentGroup) {
    const group = new THREE.Group();
    group.name = poi.id;
    group.position.set(poi.position.x, 0, poi.position.z);
    const w = poi.size.width || 40, h = poi.size.height || 8, d = poi.size.depth || 25;
    const ground = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.9 }));
    ground.position.y = 0.1;
    group.add(ground);
    const building = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, h, d * 0.5), new THREE.MeshStandardMaterial({ color: 0xddccbb, roughness: 0.7 }));
    building.position.set(0, h/2, -d * 0.1);
    group.add(building);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.3, d * 0.6), new THREE.MeshStandardMaterial({ color: 0xcc5533, roughness: 0.6 }));
    roof.position.set(0, h * 0.8, 0);
    group.add(roof);
    parentGroup.add(group);
}

function createGasStation(poi, parentGroup) {
    const group = new THREE.Group();
    group.name = poi.id;
    group.position.set(poi.position.x, 0, poi.position.z);
    const w = poi.size.width || 35, h = poi.size.height || 8, d = poi.size.depth || 20;
    const ground = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.9 }));
    ground.position.y = 0.1;
    group.add(ground);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.3, d * 0.6), new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: 0.5 }));
    roof.position.set(0, h, 0);
    group.add(roof);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0xa4b36b, roughness: 0.6 });
    const positions = [[-w*0.25, -d*0.2], [w*0.25, -d*0.2], [-w*0.25, d*0.2], [w*0.25, d*0.2]];
    for (const pos of positions) {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, h, 6), pillarMat);
        pillar.position.set(pos[0], h/2, pos[1]);
        group.add(pillar);
    }
    const pumpMat = new THREE.MeshStandardMaterial({ color: 0xff4444, roughness: 0.5 });
    for (let i = -1; i <= 1; i++) {
        const pump = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.5, 0.7), pumpMat);
        pump.position.set(i*3, 0.75, 0);
        group.add(pump);
    }
    parentGroup.add(group);
}