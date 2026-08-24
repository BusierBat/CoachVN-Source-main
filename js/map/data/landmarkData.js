// js/map/data/landmarkData.js
export const landmarks = [
    {
        id: 'phuyen_station',
        type: 'bus_station',
        name: 'Bến xe Nam Tuy Hòa',
        position: { x: 0, y: 0, z: 0 },
        size: { width: 150, height: 18, depth: 100 },
        parkingSlots: 30
    },
    {
        id: 'mien_dong_station',
        type: 'bus_station',
        name: 'Bến xe Miền Đông (Siêu to)',
        position: { x: 10200, y: 0, z: -18600 },
        size: { width: 500, height: 25, depth: 300 },
        parkingSlots: 200
    },
    {
        id: 'dai_lanh_stop',
        type: 'rest_stop',
        name: 'Trạm dừng Đại Lãnh',
        position: { x: 1600, y: 0, z: -3700 },
        size: { width: 70, height: 10, depth: 45 }
    },
    {
        id: 'phan_rang_stop',
        type: 'rest_stop',
        name: 'Trạm dừng Phan Rang',
        position: { x: 6300, y: 0, z: -12500 },
        size: { width: 75, height: 10, depth: 50 }
    },
    {
        id: 'petrolimex_station',
        type: 'gas_station',
        name: 'Cây xăng Petrolimex',
        position: { x: 3800, y: 0, z: -8100 },
        size: { width: 45, height: 8, depth: 30 }
    },
    {
        id: 'saigon_gas_station',
        type: 'gas_station',
        name: 'Cây xăng Sài Gòn',
        position: { x: 8400, y: 0, z: -16200 },
        size: { width: 40, height: 8, depth: 25 }
    }
];

export function getLandmarks() { return landmarks; }
export function getLandmarkByType(type) { return landmarks.filter(l => l.type === type); }