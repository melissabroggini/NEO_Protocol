// --- COSTANTI DI SCALA REALE ---
const EARTH_RADIUS_VISUAL = 2;
const LUNAR_DISTANCE_VISUAL = 120;
const KM_TO_LD = 384400;
const EARTH_GRAV_MU = 398600;

let scene, camera, renderer, controls, composer;
let earth, moon, asteroidSwarm;
let realAsteroids = [];
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let clock = new THREE.Clock();

let trackedAsteroid = null;
let camStartPos = new THREE.Vector3();
let targetStartPos = new THREE.Vector3();
let isZooming = false;
let currentTween = null;

let isPlaying = true;
let simTimeStart = 0;
let simTimeEnd = 0;
let currentSimTime = 0;
const TIME_MULTIPLIER = 1000; // Real-time: 1 real second = 1 sim second
let currentMultiplierFactor = 5000; // Default: 5X speed

const NASA_API_KEY = 'QgMgvoTOhWkOdGyMmM6ksu79G6yrTR6P6jgg36FU';

// Variabili DOM
let loadingScreen, loadingText, infoPanel, closeBtn, resetBtn;
let timelineContainer, timeSlider, timeCurrentLabel, timeStartLabel, timeEndLabel, playPauseBtn;

init();

function init() {
    loadingScreen = document.getElementById('loading-screen');
    loadingText = document.getElementById('loading-text');
    infoPanel = document.getElementById('info-panel');
    closeBtn = document.getElementById('close-btn');
    resetBtn = document.getElementById('reset-cam-btn');
    timelineContainer = document.getElementById('timeline-container');
    timeSlider = document.getElementById('time-slider');
    timeCurrentLabel = document.getElementById('time-current');
    timeStartLabel = document.getElementById('time-start');
    timeEndLabel = document.getElementById('time-end');
    playPauseBtn = document.getElementById('play-pause-btn');

    setInterval(() => {
        document.getElementById('local-time').innerText = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }) + ' GMT';
    }, 1000);

    const container = document.getElementById('canvas-container');
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1.0, 500000);
    // Initial view zoomed on Earth
    camera.position.set(0, 5, 20);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1.5;
    container.appendChild(renderer.domElement);

    const renderScene = new THREE.RenderPass(scene, camera);
    const bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0.2;
    bloomPass.strength = 0.8;
    bloomPass.radius = 0.4;

    composer = new THREE.EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 3.5;
    controls.maxDistance = 300000;

    const ambientLight = new THREE.AmbientLight(0x0de3f2, 0.5); // Cyan tinted ambient
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff5e6, 3.5);
    sunLight.position.set(-1500, 500, 1000);
    scene.add(sunLight);

    createEarthAndMoon();
    createStarfield();

    timeSlider.addEventListener('input', () => {
        isPlaying = false;
        playPauseBtn.innerText = 'play_arrow';
        const progress = timeSlider.value / 1000;
        currentSimTime = simTimeStart + progress * (simTimeEnd - simTimeStart);
        updateTimelineUI();
    });

    playPauseBtn.addEventListener('click', () => {
        isPlaying = !isPlaying;
        playPauseBtn.innerText = isPlaying ? 'pause' : 'play_arrow';
    });

    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentMultiplierFactor = parseFloat(e.target.dataset.speed);
            document.querySelectorAll('.speed-btn').forEach(b => {
                b.classList.remove('text-primary', 'text-glow');
                b.classList.add('text-primary/40');
            });
            e.target.classList.remove('text-primary/40');
            e.target.classList.add('text-primary', 'text-glow');
        });
    });

    fetchNASAData();

    window.addEventListener('resize', onWindowResize);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    closeBtn.addEventListener('click', closePanel);
    resetBtn.addEventListener('click', resetCamera);

    animate();
}

function createEarthAndMoon() {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin('anonymous');
    const earthSpecular = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg');

    const earthGeo = new THREE.SphereGeometry(EARTH_RADIUS_VISUAL, 64, 64);
    const continentMat = new THREE.ShaderMaterial({
        uniforms: { tSpecular: { value: earthSpecular }, color: { value: new THREE.Color(0x0de3f2) } },
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform sampler2D tSpecular; uniform vec3 color; varying vec2 vUv; void main() { float ocean = texture2D(tSpecular, vUv).r; if (1.0 - ocean < 0.5) discard; gl_FragColor = vec4(color, 0.45); }`,
        transparent: true, side: THREE.DoubleSide
    });
    earth = new THREE.Mesh(earthGeo, continentMat);

    const wireGeo = new THREE.SphereGeometry(EARTH_RADIUS_VISUAL * 1.01, 32, 32);
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x0de3f2, wireframe: true, transparent: true, opacity: 0.1 });
    earth.add(new THREE.Mesh(wireGeo, wireMat));

    const coreMat = new THREE.MeshBasicMaterial({ color: 0x02040A });
    earth.add(new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS_VISUAL * 0.99, 32, 32), coreMat));

    earth.rotation.z = 23.5 * Math.PI / 180;
    scene.add(earth);

    const moonGeo = new THREE.SphereGeometry(EARTH_RADIUS_VISUAL * 0.27, 32, 32);
    const moonMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 1.0 });
    moon = new THREE.Mesh(moonGeo, moonMat);
    scene.add(moon);

    const orbitGeo = new THREE.RingGeometry(LUNAR_DISTANCE_VISUAL - 0.1, LUNAR_DISTANCE_VISUAL + 0.1, 128);
    const orbitMat = new THREE.MeshBasicMaterial({ color: 0x0de3f2, transparent: true, opacity: 0.15, side: THREE.DoubleSide });
    const moonOrbit = new THREE.Mesh(orbitGeo, orbitMat);
    moonOrbit.rotation.x = Math.PI / 2;
    scene.add(moonOrbit);
}

function createStarfield() {
    const starCount = 6000;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    const colorPalette = [
        new THREE.Color(0x0de3f2), // Primary Cyan
        new THREE.Color(0xaaccff),
        new THREE.Color(0xffddaa),
        new THREE.Color(0x224455)
    ];

    const radius = 400000;
    for (let i = 0; i < starCount; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);

        const r = radius * (0.8 + Math.random() * 0.2);

        starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        starPos[i * 3 + 2] = r * Math.cos(phi);

        const col = colorPalette[Math.floor(Math.random() * colorPalette.length)];
        starColors[i * 3] = col.r;
        starColors[i * 3 + 1] = col.g;
        starColors[i * 3 + 2] = col.b;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
        size: 2.5, vertexColors: true, transparent: true, opacity: 0.5, sizeAttenuation: false
    });
    scene.add(new THREE.Points(starGeo, starMat));
}

async function fetchNASAData(useCachedVersion = true) {
    try {
        const fetchWeek = async (offsetStart) => {
            const start = new Date();
            start.setDate(start.getDate() + offsetStart);
            const end = new Date(start);
            end.setDate(end.getDate() + 6);
            const startStr = start.toISOString().split('T')[0];
            const endStr = end.toISOString().split('T')[0];
            const url = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${startStr}&end_date=${endStr}&api_key=${NASA_API_KEY}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error();
            return await res.json();
        };

        loadingText.innerText = "SYNCING NASA JPL PROTOCOL...";

        const promises = [fetchWeek(-7), fetchWeek(0), fetchWeek(7)];
        const results = await Promise.all(promises);

        let allNeos = [];
        results.forEach(data => {
            if (data && data.near_earth_objects) {
                Object.keys(data.near_earth_objects).forEach(date => allNeos = allNeos.concat(data.near_earth_objects[date]));
            }
        });

        const uniqueNeos = Array.from(new Map(allNeos.map(item => [item.id, item])).values());

        loadingText.innerText = `FETCHING ORBITAL ELEMENTS... [${uniqueNeos.length}]`;
        const detailedNeos = await Promise.all(
            uniqueNeos.map(async (neo) => {
                try {
                    const res = await fetch(`https://api.nasa.gov/neo/rest/v1/neo/${neo.id}?api_key=${NASA_API_KEY}`);
                    if (res.ok) {
                        const details = await res.json();
                        details.close_approach_data = neo.close_approach_data;
                        return details;
                    }
                } catch (e) { }
                return neo;
            })
        );

        const validDetailedNeos = detailedNeos.filter(n => n.orbital_data);

        setupTimelineAndAsteroids(validDetailedNeos);

    } catch (error) {
        loadingText.innerHTML = "NASA LIMIT REACHED.<br>INITIATING LOCAL MOCK SIMULATION...";
        setTimeout(() => setupTimelineAndAsteroids(generateMockData(150)), 2000);
    }
}

function generateMockData(count) {
    const mocks = [];
    for (let i = 0; i < count; i++) {
        const km = 400000 + Math.random() * 40000000;
        const epochTime = Date.now() + (Math.random() * 14 - 7) * 86400000;
        mocks.push({
            id: 'mock-' + i, name: 'SIM-' + (1000 + i), is_potentially_hazardous_asteroid: Math.random() > 0.8,
            estimated_diameter: { meters: { estimated_diameter_min: 20, estimated_diameter_max: 100 + Math.random() * 400 } },
            close_approach_data: [{
                epoch_date_close_approach: epochTime,
                miss_distance: { kilometers: km.toString(), lunar: (km / KM_TO_LD).toString() },
                relative_velocity: { kilometers_per_second: (8 + Math.random() * 15).toString() },
                close_approach_date_full: new Date(epochTime).toLocaleString()
            }],
            orbital_data: {
                inclination: Math.random() * 30,
                ascending_node_longitude: Math.random() * 360,
                perihelion_argument: Math.random() * 360
            }
        });
    }
    return mocks;
}

function setupTimelineAndAsteroids(neos) {
    const epochs = neos.map(n => parseInt(n.close_approach_data[0].epoch_date_close_approach));
    simTimeStart = Math.min(...epochs) - (24 * 3600 * 1000);
    simTimeEnd = Math.max(...epochs) + (24 * 3600 * 1000);
    currentSimTime = Date.now();

    timeStartLabel.innerText = new Date(simTimeStart).toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
    timeEndLabel.innerText = new Date(simTimeEnd).toLocaleDateString('en-US', { day: '2-digit', month: 'short' });

    createInteractiveAsteroids(neos);

    setTimeout(() => {
        loadingScreen.style.opacity = '0';
        timelineContainer.classList.remove('opacity-0');
        timelineContainer.classList.add('opacity-100');
        setTimeout(() => loadingScreen.style.display = 'none', 1000);
    }, 1000);
}

function updateTimelineUI() {
    const dateObj = new Date(currentSimTime);
    timeCurrentLabel.innerText = dateObj.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) + " | " + dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }) + " GMT";
    if (isPlaying) timeSlider.value = ((currentSimTime - simTimeStart) / (simTimeEnd - simTimeStart)) * 1000;
}

function createProceduralAsteroidGeometry(baseRadius) {
    const geometry = new THREE.IcosahedronGeometry(baseRadius, 3);
    const pos = geometry.attributes.position;
    const v = new THREE.Vector3();
    const stretch = new THREE.Vector3(0.7 + Math.random() * 0.6, 0.7 + Math.random() * 0.6, 0.7 + Math.random() * 0.6);
    for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        const dir = v.clone().normalize();
        let noise = 1.0 + (Math.sin(dir.x * 3.0) * Math.cos(dir.y * 3.0) * 0.2) + (Math.sin(dir.z * 10.0) * 0.05);
        pos.setXYZ(i, dir.x * baseRadius * noise * stretch.x, dir.y * baseRadius * noise * stretch.y, dir.z * baseRadius * noise * stretch.z);
    }
    geometry.computeVertexNormals();
    return geometry;
}

function createInteractiveAsteroids(neos) {
    let fastAsteroids = 0;
    let phaCount = 0;
    let nearestDist = Infinity;
    let nearestKm = Infinity;

    neos.forEach((neo) => {
        const isHazardous = neo.is_potentially_hazardous_asteroid;
        if (isHazardous) phaCount++;

        const approach = neo.close_approach_data[0];
        const d_km = parseFloat(approach.miss_distance.kilometers);
        const d_lunar = d_km / KM_TO_LD;
        const speedKps = parseFloat(approach.relative_velocity.kilometers_per_second);

        if (speedKps > fastAsteroids) fastAsteroids = speedKps;
        if (d_lunar < nearestDist) nearestDist = d_lunar;
        if (d_km < nearestKm) nearestKm = d_km;

        const visualRadius = Math.min(3.5, Math.max(0.6, neo.estimated_diameter.meters.estimated_diameter_max / 150));

        // J.A.R.V.I.S. specific colors
        const colorHex = isHazardous ? 0x550000 : 0x005500;
        const emissiveHex = 0x000000;

        const astMesh = new THREE.Mesh(createProceduralAsteroidGeometry(visualRadius), new THREE.MeshStandardMaterial({
            color: colorHex, emissive: emissiveHex, emissiveIntensity: 0.0, roughness: 0.9, flatShading: true
        }));

        const markerColorHex = isHazardous ? 0xFF0000 : 0x00FF00;
        const markerGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0)]);
        const markerMat = new THREE.PointsMaterial({
            color: markerColorHex, // Keep markers bright so they are visible from far away
            size: isHazardous ? 5.0 : 3.5,
            sizeAttenuation: false, transparent: true, opacity: 1.0
        });
        const marker = new THREE.Points(markerGeo, markerMat);
        astMesh.add(marker);

        let i_rad = 0, node_rad = 0, arg_p_rad = 0;
        if (neo.orbital_data) {
            i_rad = parseFloat(neo.orbital_data.inclination) * Math.PI / 180;
            node_rad = parseFloat(neo.orbital_data.ascending_node_longitude) * Math.PI / 180;
            arg_p_rad = parseFloat(neo.orbital_data.perihelion_argument) * Math.PI / 180;
        }

        const eulerPlane = new THREE.Euler(i_rad, node_rad, 0, 'YXZ');
        const normalDir = new THREE.Vector3(0, 1, 0).applyEuler(eulerPlane).normalize();
        const eulerPeri = new THREE.Euler(i_rad, node_rad + arg_p_rad, 0, 'YXZ');
        const periapsisDir = new THREE.Vector3(0, 0, 1).applyEuler(eulerPeri).normalize();
        const semiMinorDir = new THREE.Vector3().crossVectors(normalDir, periapsisDir).normalize();

        const e = 1 + (d_km * Math.pow(speedKps, 2)) / EARTH_GRAV_MU;
        const a_km = d_km / (1 - e);
        const a_visual = a_km / (KM_TO_LD / LUNAR_DISTANCE_VISUAL);
        const n_rad_s = Math.sqrt(EARTH_GRAV_MU / Math.pow(Math.abs(a_km), 3));
        const n_rad_hr = n_rad_s * 3600;

        const points = [];
        let hLimit = 0.5;
        while (hLimit < 25.0) {
            let rTest = Math.abs(a_visual * (1 - e * Math.cosh(hLimit)));
            if (rTest > 300000) break;
            hLimit += 0.5;
        }

        for (let i = -hLimit; i <= hLimit; i += 0.05) {
            let theta = 2 * Math.atan(Math.sqrt((e + 1) / (e - 1)) * Math.tanh(i / 2));
            let r = a_visual * (1 - e * Math.cosh(i));
            points.push(periapsisDir.clone().multiplyScalar(r * Math.cos(theta)).add(semiMinorDir.clone().multiplyScalar(r * Math.sin(theta))));
        }
        const trajMat = new THREE.LineBasicMaterial({
            color: colorHex, transparent: true, opacity: isHazardous ? 0.3 : 0.15, blending: THREE.AdditiveBlending
        });
        const traj = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), trajMat);
        scene.add(traj);

        const k_km = d_km / 1000;
        astMesh.userData = {
            name: neo.name, isHazardous,
            diameter: `${Math.round(neo.estimated_diameter.meters.estimated_diameter_min)}-${Math.round(neo.estimated_diameter.meters.estimated_diameter_max)}m`,
            speed: speedKps.toFixed(2), km: d_km.toLocaleString('it-IT'), k_km: k_km.toLocaleString('en-US', { maximumFractionDigits: 0 }),
            date: new Date(parseInt(approach.epoch_date_close_approach)).toLocaleString('it-IT'),
            approachTimestamp: parseInt(approach.epoch_date_close_approach),
            periapsisDir, semiMinorDir, e, a: a_visual, n: n_rad_hr, traj
        };

        updateAsteroidPosition(astMesh, currentSimTime);
        scene.add(astMesh);
        realAsteroids.push(astMesh);
    });

    // Set HUD Global stats correctly
    document.getElementById('stat-total').innerText = neos.length.toLocaleString();
    const thousandsKm = nearestKm / 1000;
    document.getElementById('stat-nearest').innerHTML = thousandsKm.toLocaleString('en-US', { maximumFractionDigits: 0 }) + 'K <span class="text-[10px] opacity-50">KM</span>';
    document.getElementById('stat-speed').innerHTML = fastAsteroids.toFixed(1) + ' <span class="text-[10px] opacity-50">KM/S</span>';
    document.getElementById('stat-threats').innerText = phaCount.toString().padStart(2, '0');

    // Generate Radar Blips
    const radarBlips = document.getElementById('radar-blips');
    if (radarBlips) radarBlips.innerHTML = '';
    realAsteroids.forEach(ast => {
        const blip = document.createElement('div');
        blip.className = `absolute rounded-full shadow-neon animate-pulse-cyan`;
        blip.style.width = ast.userData.isHazardous ? '6px' : '4px';
        blip.style.height = ast.userData.isHazardous ? '6px' : '4px';
        blip.style.backgroundColor = ast.userData.isHazardous ? '#FF0000' : '#00FF00';
        blip.style.boxShadow = `0 0 8px ${ast.userData.isHazardous ? 'rgba(255,0,0,0.8)' : 'rgba(0,255,0,0.8)'}`;
        blip.style.transform = 'translate(-50%, -50%)';
        if (radarBlips) radarBlips.appendChild(blip);
        ast.userData.radarBlip = blip;
    });

    // Populate Distance Chart
    const distancesKm = neos.map(neo => parseFloat(neo.close_approach_data[0].miss_distance.kilometers) / 1000);
    const bins = [0, 0, 0, 0, 0, 0]; // <5M, <10M, <15M, <20M, <25M, 25M+ KM (which is 5000 K KM steps)
    distancesKm.forEach(d => {
        if (d < 5000) bins[0]++;
        else if (d < 10000) bins[1]++;
        else if (d < 15000) bins[2]++;
        else if (d < 20000) bins[3]++;
        else if (d < 25000) bins[4]++;
        else bins[5]++;
    });
    const maxBin = Math.max(...bins) || 1;

    const chartContainer = document.getElementById('env-chart-container');
    if (chartContainer) {
        chartContainer.innerHTML = '';
        bins.forEach((count, i) => {
            const pct = (count / maxBin) * 80; // Max 80% to leave tooltip headroom
            const bar = document.createElement('div');
            const intensity = (count / maxBin); // 0.0 to 1.0
            bar.className = 'w-full relative group/bar cursor-pointer transition-all duration-300 group-hover/chart:opacity-30 hover:!opacity-100 hover:!bg-primary/50 hover:!shadow-[0_0_15px_rgba(13,227,242,0.8)] rounded-t-md';
            bar.style.height = `${pct}%`;
            bar.style.minHeight = count > 0 ? '4px' : '1px';
            bar.style.backgroundColor = `rgba(13, 227, 242, ${0.1 + intensity * 0.2})`;
            bar.style.borderTop = `1px solid rgba(13, 227, 242, ${0.3 + intensity * 0.5})`;
            if (intensity > 0.7) bar.style.boxShadow = '0 0 10px rgba(13,227,242,0.3)';

            const tooltip = document.createElement('div');
            tooltip.className = 'absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover/bar:flex items-center justify-center bg-[#02040A] border border-primary/50 text-[9px] font-mono px-1.5 py-0.5 text-primary whitespace-nowrap z-50';
            const labelRange = i === 5 ? '25000+' : `${i * 5000}-${i * 5000 + 5000}`;
            tooltip.innerText = `${labelRange} K KM: ${count}`;
            bar.appendChild(tooltip);

            chartContainer.appendChild(bar);
        });

    }
}

function updateAsteroidPosition(ast, ts) {
    const dtHrs = (ts - ast.userData.approachTimestamp) / 3600000;
    const M = ast.userData.n * dtHrs;
    const e = ast.userData.e;
    let H = M / e;
    for (let i = 0; i < 4; i++) {
        let f = e * Math.sinh(H) - H - M;
        let df = e * Math.cosh(H) - 1;
        H -= f / df;
    }
    const theta = 2 * Math.atan(Math.sqrt((e + 1) / (e - 1)) * Math.tanh(H / 2));
    const r = ast.userData.a * (1 - e * Math.cosh(H));
    ast.position.copy(ast.userData.periapsisDir.clone().multiplyScalar(r * Math.cos(theta)).add(ast.userData.semiMinorDir.clone().multiplyScalar(r * Math.sin(theta))));
}

function onPointerDown(e) {
    if (e.clientY > window.innerHeight - 100) return;
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(realAsteroids);
    if (intersects.length > 0) {
        focusOnAsteroid(intersects[0].object);
        return;
    }

    // Screen-space selection assistance (fall-back if exact raycast fails)
    const clickRadiusSq = 50 * 50; // 50px radius tolerance
    let closestAst = null;
    let minDistSq = clickRadiusSq;
    const projVec = new THREE.Vector3();

    realAsteroids.forEach(ast => {
        projVec.copy(ast.position);
        projVec.project(camera);
        if (projVec.z > 1.0 || projVec.z < -1.0) return; // Behind camera or outside frustum

        const astPixelX = (projVec.x * 0.5 + 0.5) * window.innerWidth;
        const astPixelY = -(projVec.y * 0.5 - 0.5) * window.innerHeight;

        const dx = astPixelX - e.clientX;
        const dy = astPixelY - e.clientY;
        const distSq = dx * dx + dy * dy;

        if (distSq < minDistSq) {
            minDistSq = distSq;
            closestAst = ast;
        }
    });

    if (closestAst) focusOnAsteroid(closestAst);
}

function focusOnAsteroid(ast) {
    const d = ast.userData;
    document.getElementById('neo-name').innerText = d.name;
    document.getElementById('neo-size').innerText = d.diameter;
    document.getElementById('neo-speed').innerText = d.speed + " km/s";
    document.getElementById('neo-distance').innerText = d.km;
    document.getElementById('neo-lunar').innerText = "(" + d.k_km + " K KM)";
    document.getElementById('neo-date').innerText = d.date;

    const b = document.getElementById('neo-hazard-badge');
    b.innerText = d.isHazardous ? "PHA THREAT" : "SAFE";
    b.className = `inline-block px-2 py-1 rounded-xl text-center font-bold uppercase tracking-widest text-[#02040A] ${d.isHazardous ? 'bg-[#FF0000] shadow-neon-amber' : 'bg-[#00FF00] shadow-neon'}`;

    document.getElementById('target-placeholder').classList.add('hidden');
    document.getElementById('target-details').classList.remove('hidden');
    document.getElementById('target-details').classList.add('flex');

    infoPanel.classList.remove('opacity-30', 'opacity-40');
    infoPanel.classList.add('opacity-100');
    closeBtn.classList.remove('hidden');

    if (currentTween) currentTween.stop();
    if (trackedAsteroid) trackedAsteroid.userData.traj.material.opacity = trackedAsteroid.userData.isHazardous ? 0.3 : 0.15;
    trackedAsteroid = ast;
    trackedAsteroid.userData.traj.material.opacity = 0.9;

    camStartPos.copy(camera.position);
    targetStartPos.copy(controls.target);

    let dir = camStartPos.clone().sub(ast.position).normalize();
    if (dir.lengthSq() < 0.1) dir.set(0, 0, 1);

    const startOffset = camStartPos.clone().sub(targetStartPos);
    const idealOffset = dir.clone().multiplyScalar(15);

    isZooming = true;
    controls.enabled = false;

    currentTween = new TWEEN.Tween({ t: 0 }).to({ t: 1 }, 1500).easing(TWEEN.Easing.Cubic.InOut)
        .onUpdate((obj) => {
            const astPos = trackedAsteroid.position;
            const currentTarget = targetStartPos.clone().lerp(astPos, obj.t);
            const currentOffset = startOffset.clone().lerp(idealOffset, obj.t);

            controls.target.copy(currentTarget);
            camera.position.copy(currentTarget).add(currentOffset);
        })
        .onComplete(() => { isZooming = false; controls.enabled = true; controls.minDistance = 1; })
        .start();
}

function resetCamera() {
    closePanel();
    if (currentTween) currentTween.stop();
    if (trackedAsteroid) trackedAsteroid.userData.traj.material.opacity = trackedAsteroid.userData.isHazardous ? 0.3 : 0.15;
    trackedAsteroid = null; isZooming = true; controls.enabled = false;
    camStartPos.copy(camera.position); targetStartPos.copy(controls.target);
    currentTween = new TWEEN.Tween({ t: 0 }).to({ t: 1 }, 1500).easing(TWEEN.Easing.Cubic.InOut)
        .onUpdate((obj) => {
            camera.position.lerpVectors(camStartPos, new THREE.Vector3(0, LUNAR_DISTANCE_VISUAL * 1.5, LUNAR_DISTANCE_VISUAL * 2.5), obj.t);
            controls.target.lerpVectors(targetStartPos, new THREE.Vector3(0, 0, 0), obj.t);
        })
        .onComplete(() => { isZooming = false; controls.enabled = true; controls.minDistance = 3.5; })
        .start();
}

function closePanel() {
    document.getElementById('target-placeholder').classList.remove('hidden');
    document.getElementById('target-details').classList.add('hidden');
    document.getElementById('target-details').classList.remove('flex');
    infoPanel.classList.add('opacity-40');
    infoPanel.classList.remove('opacity-100');
    closeBtn.classList.add('hidden');
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

function animate(time) {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    TWEEN.update(time);
    // Real Earth rotation: 1 full rotation (2PI) every 24 hours (86,400,000 ms)
    if (earth) earth.rotation.y = (currentSimTime / 86400000) * Math.PI * 2;
    if (moon) {
        const angle = currentSimTime * ((2 * Math.PI) / (27.3 * 86400000));
        moon.position.set(Math.cos(angle) * LUNAR_DISTANCE_VISUAL, 0, Math.sin(angle) * LUNAR_DISTANCE_VISUAL);
    }
    if (isPlaying && simTimeEnd > 0) {
        currentSimTime += delta * TIME_MULTIPLIER * currentMultiplierFactor;
        if (currentSimTime > simTimeEnd) currentSimTime = simTimeStart;
        updateTimelineUI();
    }
    let oldAstPos = new THREE.Vector3();
    if (trackedAsteroid) oldAstPos.copy(trackedAsteroid.position);
    realAsteroids.forEach(ast => {
        ast.rotation.x += 0.2 * delta;
        updateAsteroidPosition(ast, currentSimTime);
    });
    if (trackedAsteroid) {
        let diff = new THREE.Vector3().subVectors(trackedAsteroid.position, oldAstPos);
        camStartPos.add(diff); targetStartPos.add(diff);
        if (!isZooming) { camera.position.add(diff); controls.target.add(diff); }
    }
    controls.update();
    composer.render();

    // Update Radar UI
    const RADAR_RANGE = 4000; // max visual radius corresponding to radar edge
    realAsteroids.forEach(ast => {
        if (!ast.userData.radarBlip) return;
        const pos = ast.position;
        const nx = (pos.x / (RADAR_RANGE * 2)) + 0.5;
        const nz = (pos.z / (RADAR_RANGE * 2)) + 0.5;

        const cx = nx - 0.5;
        const cz = nz - 0.5;
        const distSq = cx * cx + cz * cz;

        if (distSq > 0.25) {
            ast.userData.radarBlip.style.display = 'none';
        } else {
            ast.userData.radarBlip.style.display = 'block';
            ast.userData.radarBlip.style.left = `${nx * 100}%`;
            ast.userData.radarBlip.style.top = `${nz * 100}%`;
        }
    });
}