// js/map/roadGenerator.js
import * as THREE from "three";
import { roadDataSegments } from "./data/roadData.js";

export function generateRoadForChunk({ chunkX, chunkZ, worldX, worldZ, chunkSize, seed }) {
    const group = new THREE.Group();
    const half = chunkSize / 2;
    const minX = worldX - half;
    const maxX = worldX + half;
    const minZ = worldZ - half;
    const maxZ = worldZ + half;

    for (const seg of roadDataSegments) {
        const p0 = seg.points[0];
        const p1 = seg.points[1];
        if ((p0.x < minX && p1.x < minX) || (p0.x > maxX && p1.x > maxX) ||
            (p0.z < minZ && p1.z < minZ) || (p0.z > maxZ && p1.z > maxZ)) {
            continue;
        }

        const midX = (p0.x + p1.x) / 2;
        const midZ = (p0.z + p1.z) / 2;
        const length = Math.hypot(p1.x - p0.x, p1.z - p0.z);
        const angle = Math.atan2(p1.x - p0.x, p1.z - p0.z);
        const width = seg.width || 10;
        const isHighway = seg.type === 'highway' || seg.type === 'highway_ramp';

        // Mặt đường
        const roadMat = new THREE.MeshStandardMaterial({ color: isHighway ? 0x2a2a2a : 0x3a3a3a, roughness: 0.9 });
        const road = new THREE.Mesh(new THREE.BoxGeometry(width, 0.2, length), roadMat);
        road.position.set(midX, 0.1, midZ);
        road.rotation.y = angle;
        road.receiveShadow = true;
        group.add(road);

        // Vạch kẻ giữa
        const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, length), stripeMat);
        stripe.position.set(midX, 0.21, midZ);
        stripe.rotation.y = angle;
        group.add(stripe);

        // Nếu highway, thêm làn khẩn cấp
        if (isHighway && width > 16) {
            const shoulderMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 });
            const shoulderWidth = 1.2;
            const shoulderOffset = width/2 - shoulderWidth/2;
            const shoulderGeo = new THREE.BoxGeometry(shoulderWidth, 0.2, length);
            const shoulderL = new THREE.Mesh(shoulderGeo, shoulderMat);
            shoulderL.position.set(midX - shoulderOffset * Math.sin(-angle), 0.1, midZ + shoulderOffset * Math.cos(-angle));
            shoulderL.rotation.y = angle;
            group.add(shoulderL);
            const shoulderR = new THREE.Mesh(shoulderGeo, shoulderMat);
            shoulderR.position.set(midX + shoulderOffset * Math.sin(-angle), 0.1, midZ - shoulderOffset * Math.cos(-angle));
            shoulderR.rotation.y = angle;
            group.add(shoulderR);
        }
    }
    return group;
}