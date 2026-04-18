// --- COSTANTI DI SCALA REALE ---
const EARTH_RADIUS_VISUAL = 2;
const LUNAR_DISTANCE_VISUAL = 120;
const KM_TO_LD = 384400;
const EARTH_GRAV_MU = 398600;

// Helper per formattare i numeri con apostrofo svizzero (es: 3'278'833)
function formatSwiss(num, decimals = 0) {
    if (num === null || num === undefined || isNaN(num)) return "--";
    const parts = Number(num).toFixed(decimals).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, "'");
    return parts.join('.');
}

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
let currentMultiplierFactor = 10000; // Default: 10X speed

const NASA_API_KEY = 'QgMgvoTOhWkOdGyMmM6ksu79G6yrTR6P6jgg36FU';

// Variabili DOM
let loadingScreen, loadingText, infoPanel, closeBtn, resetBtn, prevAstBtn, nextAstBtn;
let timelineContainer, timeSlider, timeCurrentLabel, timeStartLabel, timeEndLabel, playPauseBtn;

init();

function init() {
    loadingScreen = document.getElementById('loading-screen');
    loadingText = document.getElementById('loading-text');
    infoPanel = document.getElementById('info-panel');
    closeBtn = document.getElementById('close-btn');
    resetBtn = document.getElementById('reset-cam-btn');
    prevAstBtn = document.getElementById('prev-ast-btn');
    nextAstBtn = document.getElementById('next-ast-btn');
    timelineContainer = document.getElementById('timeline-container');
    timeSlider = document.getElementById('time-slider');
    timeCurrentLabel = document.getElementById('time-current');
    timeStartLabel = document.getElementById('time-start');
    timeEndLabel = document.getElementById('time-end');
    playPauseBtn = document.getElementById('play-pause-btn');

    setInterval(() => {
        document.getElementById('local-time').innerText = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', timeZone: 'Europe/Zurich', timeZoneName: 'short' });
    }, 1000);

    const container = document.getElementById('canvas-container');
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1.0, 500000);
    // Initial view zoomed on Earth
    camera.position.set(0, 5, 20);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    container.appendChild(renderer.domElement);

    const renderScene = new THREE.RenderPass(scene, camera);
    const bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0.2;
    bloomPass.strength = 0; // Glow disabled
    bloomPass.radius = 0.4;

    composer = new THREE.EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 3.5;
    controls.maxDistance = 7000;

    // Luce d'ambiente sferica aumentata per riempire le ombre e renderle blu scuro/grigie invece che nere
    const hemiLight = new THREE.HemisphereLight(0x36486b, 0x24344d, 1.5);
    scene.add(hemiLight);

    // Luce "solare" meno forte e leggermente meno calda per evitare bruciature sui materiali
    const sunLight = new THREE.DirectionalLight(0xfffaea, 1.0);
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
    if (closeBtn) closeBtn.addEventListener('click', closePanel);
    resetBtn.addEventListener('click', resetCamera);
    if (prevAstBtn) prevAstBtn.addEventListener('click', focusPrevAsteroid);
    if (nextAstBtn) nextAstBtn.addEventListener('click', focusNextAsteroid);

    animate();
}

function createEarthAndMoon() {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin('anonymous');
    const earthSpecular = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg');

    const earthGeo = new THREE.SphereGeometry(EARTH_RADIUS_VISUAL, 64, 64);
    const continentMat = new THREE.ShaderMaterial({
        uniforms: { tSpecular: { value: earthSpecular }, color: { value: new THREE.Color(0xffffff) } },
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform sampler2D tSpecular; uniform vec3 color; varying vec2 vUv; void main() { float ocean = texture2D(tSpecular, vUv).r; if (1.0 - ocean < 0.5) discard; gl_FragColor = vec4(color, 0.45); }`,
        transparent: true, side: THREE.DoubleSide
    });
    earth = new THREE.Mesh(earthGeo, continentMat);

    const wireGeo = new THREE.SphereGeometry(EARTH_RADIUS_VISUAL * 1.01, 32, 32);
    const wireMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.1 });
    earth.add(new THREE.Mesh(wireGeo, wireMat));

    const coreMat = new THREE.MeshBasicMaterial({ color: 0x131313 });
    earth.add(new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS_VISUAL * 0.99, 32, 32), coreMat));

    earth.rotation.z = 23.5 * Math.PI / 180;
    scene.add(earth);

    const moonGeo = new THREE.SphereGeometry(EARTH_RADIUS_VISUAL * 0.27, 32, 32);
    const moonMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 1.0 });
    moon = new THREE.Mesh(moonGeo, moonMat);
    scene.add(moon);

    const orbitGeo = new THREE.RingGeometry(LUNAR_DISTANCE_VISUAL - 0.1, LUNAR_DISTANCE_VISUAL + 0.1, 128);
    const orbitMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15, side: THREE.DoubleSide });
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
        new THREE.Color(0xffffff), // Primary Cyan
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
        size: 1.5, vertexColors: true, transparent: true, opacity: 0.25, sizeAttenuation: false
    });
    scene.add(new THREE.Points(starGeo, starMat));
}

async function fetchNASAData(useCachedVersion = true) {
    try {
        loadingText.innerText = "LOADING LOCAL SNAPSHOT...";
        const res = await fetch('snapshot.json');
        if (!res.ok) throw new Error();
        const data = await res.json();

        let allNeos = [];
        if (data && data.near_earth_objects) {
            Object.keys(data.near_earth_objects).forEach(date => allNeos = allNeos.concat(data.near_earth_objects[date]));
        }

        const uniqueNeos = Array.from(new Map(allNeos.map(item => [item.id, item])).values());

        // Add mock orbital data to avoid hitting individual NEO endpoints
        const validDetailedNeos = uniqueNeos.map(neo => {
            neo.orbital_data = {
                inclination: Math.random() * 30,
                ascending_node_longitude: Math.random() * 360,
                perihelion_argument: Math.random() * 360
            };
            return neo;
        });

        setupTimelineAndAsteroids(validDetailedNeos);

    } catch (error) {
        loadingText.innerHTML = "SNAPSHOT ERROR.<br>INITIATING LOCAL MOCK SIMULATION...";
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
    timeCurrentLabel.innerText = dateObj.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Europe/Zurich' }) + " | " + dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', timeZone: 'Europe/Zurich', timeZoneName: 'short' });
    if (isPlaying) timeSlider.value = ((currentSimTime - simTimeStart) / (simTimeEnd - simTimeStart)) * 1000;
}

function createProceduralAsteroidGeometry(baseRadius) {
    // Alzo il livello di dettaglio da 4 a 8: i poligoni passano da circa 500 a oltre 1600!
    // Questo ci dà tutta la geometria necessaria per ricavare rocce spigolose e micro-porosità.
    const geometry = new THREE.IcosahedronGeometry(baseRadius, 8);
    const pos = geometry.attributes.position;
    const v = new THREE.Vector3();

    // Reintroduciamo uno stretch assi per creare forme allungate o schiacciate,
    // ma usiamo limiti MODERATI per non "stirare" i poligoni in modo sgraziato.
    let sx = 1.0, sy = 1.0, sz = 1.0;
    const baseShape = Math.random();

    if (baseShape > 0.6) {
        // Forma allungata (sigaro) - Proporzione max ~2.5x per evitare poligoni troppo stirati
        sx = 1.4 + Math.random() * 0.4; // 1.4 -> 1.8
        sy = 0.7 + Math.random() * 0.2; // 0.7 -> 0.9
        sz = 0.7 + Math.random() * 0.2;
    } else if (baseShape > 0.3) {
        // Forma schiacciata (focaccia)
        sx = 1.1 + Math.random() * 0.3; // 1.1 -> 1.4
        sy = 1.1 + Math.random() * 0.3;
        sz = 0.6 + Math.random() * 0.2; // 0.6 -> 0.8
    } else {
        // Forma irregolare "a patata"
        sx = 0.85 + Math.random() * 0.3;
        sy = 0.85 + Math.random() * 0.3;
        sz = 0.85 + Math.random() * 0.3;
    }

    // Mescoliamo gli assi casualmente in modo che le forme allungate non puntino tutte nella stessa direzione
    const assi = [sx, sy, sz];
    for (let k = assi.length - 1; k > 0; k--) {
        const j = Math.floor(Math.random() * (k + 1));
        [assi[k], assi[j]] = [assi[j], assi[k]];
    }
    const stretchX = assi[0], stretchY = assi[1], stretchZ = assi[2];

    // Sommiamo diverse frequenze per distruggere la sfericità di base creando grandi "lobi" e "valli"
    const f1A = 0.5 + Math.random() * 1.5;
    const f2A = 0.5 + Math.random() * 1.5;
    const f3A = 0.5 + Math.random() * 1.5;

    const f1B = 2.0 + Math.random() * 2.0;
    const f2B = 2.0 + Math.random() * 2.0;
    const f3B = 2.0 + Math.random() * 2.0;

    const macroAmp1 = 0.15 + Math.random() * 0.25; // Lobi strutturali compatti (allungati o irregolari ma solidi)
    const macroAmp2 = 0.08 + Math.random() * 0.12; // Dossi e avvallamenti naturali fluidi

    // Dettagli di superficie (micro-rilievi). Ammorbiditi per evitare l'effetto "scaglioso" o spinoso
    const microF1 = 5.0 + Math.random() * 5.0;
    const microF2 = 5.0 + Math.random() * 5.0;
    const microAmp = 0.02 + Math.random() * 0.03;
    const superMicroF = 15.0 + Math.random() * 10.0; // Strato aggiuntivo per ruvidezza
    const superMicroAmp = 0.005 + Math.random() * 0.01; // Lievissimo, serve solo a non far brillare la roccia come plastica

    // Aggiungi probabilità che l'asteroide abbia grossi crateri visibili
    const hasCrater = Math.random() > 0.2; // Più frequenti per compensare la minore rugosità
    const craterDir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    const craterSize = 0.25 + Math.random() * 0.35; // ampiezza del cratere
    const craterDepth = 0.1 + Math.random() * 0.2; // profondità più moderata

    for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        const dir = v.clone().normalize();

        // Creiamo enormi bozzi e cavità simili a Perlin 3D tramite onde sovrapposte
        let macroNoise =
            Math.sin(dir.x * f1A) * macroAmp1 +
            Math.cos(dir.y * f2A) * macroAmp1 +
            Math.sin(dir.z * f3A) * macroAmp1 +
            Math.sin(dir.x * f1B + dir.y * f2B) * macroAmp2 +
            Math.cos(dir.z * f3B + dir.x * f1B) * macroAmp2;

        // Sommiamo sia i micro-dettagli medi che la porosità superficiale ad altissima frequenza ammorbidita
        let noise = 1.0 + macroNoise
            + (Math.sin(dir.x * microF1) * Math.cos(dir.z * microF2) * microAmp)
            + (Math.sin(dir.x * superMicroF) * Math.cos(dir.y * superMicroF) * superMicroAmp);

        // Evitiamo auto-intersezioni della mesh limitando il restringimento minimo
        if (noise < 0.2) noise = 0.2;

        // Deformazione scavata per simulare crateri da impatto
        if (hasCrater) {
            const dot = dir.dot(craterDir);
            if (dot > 1.0 - craterSize) {
                const t = (dot - (1.0 - craterSize)) / craterSize;
                noise -= Math.sin(t * Math.PI) * craterDepth;
            }
        }

        pos.setXYZ(i,
            dir.x * baseRadius * noise * stretchX,
            dir.y * baseRadius * noise * stretchY,
            dir.z * baseRadius * noise * stretchZ
        );
    }
    geometry.computeVertexNormals();
    return geometry;
}

function createInteractiveAsteroids(neos) {
    let fastAsteroids = 0;
    let phaCount = 0;
    let nearestDist = Infinity;
    let nearestKm = Infinity;

    // --- CREATE HALO TEXTURES ONCE ---
    const createHaloTexture = (isHazard) => {
        const c = document.createElement('canvas');
        c.width = 128; c.height = 128;
        const ctx = c.getContext('2d');
        const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
        if (isHazard) {
            grad.addColorStop(0, 'rgba(255, 42, 42, 0.85)');
            grad.addColorStop(0.3, 'rgba(255, 42, 42, 0.45)');
            grad.addColorStop(1, 'rgba(255, 42, 42, 0.0)');
        } else {
            grad.addColorStop(0, 'rgba(16, 229, 96, 0.85)');
            grad.addColorStop(0.3, 'rgba(16, 229, 96, 0.45)');
            grad.addColorStop(1, 'rgba(16, 229, 96, 0.0)');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 128, 128);
        return new THREE.CanvasTexture(c);
    };
    const texHazard = createHaloTexture(true);
    const texSafe = createHaloTexture(false);

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

        // Scala le dimensioni a schermo proporzionalmente in base alla stima massima NASA
        const actualDiameter = neo.estimated_diameter.meters.estimated_diameter_max;

        // Moltiplichiamo proporzionalmente permettendo estrema variazione.
        // Cap minimo = 0.15 (non deve sparire)
        // Cap massimo = 12.0 (asteroide abnorme)
        const visualRadius = Math.min(12.0, Math.max(0.15, (actualDiameter / 100) * 0.7));

        // J.A.R.V.I.S. specific colors
        const colorHex = isHazardous ? 0xBB1111 : 0x117733;
        const emissiveHex = 0x000000;

        const astMesh = new THREE.Mesh(createProceduralAsteroidGeometry(visualRadius), new THREE.MeshStandardMaterial({
            color: colorHex, emissive: emissiveHex, emissiveIntensity: 0.0, roughness: 0.9, flatShading: true
        }));

        const markerColorHex = isHazardous ? 0xFF2A2A : 0x10E560;
        const markerGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0)]);
        const markerMat = new THREE.PointsMaterial({
            color: markerColorHex, // Keep markers bright so they are visible from far away
            size: isHazardous ? 5.0 : 3.5,
            sizeAttenuation: false, transparent: true, opacity: 1.0
        });
        const marker = new THREE.Points(markerGeo, markerMat);
        astMesh.add(marker);

        // --- HALO / AUREOLA PULSANTE ---
        // L'alone si scala in modo proporzionale per adattarsi anche agli asteroidi enormi
        const haloBaseScale = (isHazardous ? 30 : 20) + (visualRadius * 4);
        const haloMat = new THREE.PointsMaterial({
            map: isHazardous ? texHazard : texSafe,
            transparent: true, opacity: 0.75,
            blending: THREE.AdditiveBlending, depthWrite: false,
            sizeAttenuation: false, size: haloBaseScale
        });
        const haloPoints = new THREE.Points(markerGeo, haloMat);
        // Give each halo a random phase offset so they don't all pulse in sync
        haloPoints.userData.pulseOffset = Math.random() * Math.PI * 2;
        haloPoints.userData.baseScale = haloBaseScale;
        astMesh.add(haloPoints);
        astMesh.userData.halo = haloPoints;

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
        const colors = [];
        const baseColor = new THREE.Color(colorHex);
        const blackColor = new THREE.Color(0x000000);
        
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
            
            // Fade out smoothly towards the ends
            let fraction = Math.abs(i) / hLimit; 
            let fadeFactor = 1.0 - Math.pow(fraction, 2.0); 
            let mixedColor = baseColor.clone().lerp(blackColor, 1.0 - fadeFactor);
            colors.push(mixedColor.r, mixedColor.g, mixedColor.b);
        }
        
        const trajGeo = new THREE.BufferGeometry().setFromPoints(points);
        trajGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const trajMat = new THREE.LineBasicMaterial({
            vertexColors: true, color: 0xffffff, transparent: true, opacity: isHazardous ? 0.4 : 0.2, blending: THREE.AdditiveBlending
        });
        const traj = new THREE.Line(trajGeo, trajMat);
        scene.add(traj);

        const k_km = d_km / 1000;
        astMesh.userData = {
            name: neo.name, isHazardous,
            diameter: `${Math.round(neo.estimated_diameter.meters.estimated_diameter_min)}-${Math.round(neo.estimated_diameter.meters.estimated_diameter_max)}m`,
            speed: speedKps.toFixed(2), km: formatSwiss(d_km), k_km: formatSwiss(k_km),
            date: new Date(parseInt(approach.epoch_date_close_approach)).toLocaleString('it-IT', { timeZone: 'Europe/Zurich', timeZoneName: 'short' }).replace(/\//g, '.'),
            approachTimestamp: parseInt(approach.epoch_date_close_approach),
            periapsisDir, semiMinorDir, e, a: a_visual, n: n_rad_hr, traj
        };

        updateAsteroidPosition(astMesh, currentSimTime);
        scene.add(astMesh);
        realAsteroids.push(astMesh);
    });

    // Set HUD Global stats correctly
    document.getElementById('stat-total').innerText = formatSwiss(neos.length);
    const thousandsKm = nearestKm / 1000;
    document.getElementById('stat-nearest').innerText = formatSwiss(thousandsKm) + 'K';
    document.getElementById('stat-speed').innerText = fastAsteroids.toFixed(1);
    document.getElementById('stat-threats').innerText = phaCount.toString().padStart(2, '0');

    // Generate Radar Blips
    const radarBlips = document.getElementById('radar-blips');
    if (radarBlips) radarBlips.innerHTML = '';
    realAsteroids.forEach(ast => {
        const blip = document.createElement('div');
        blip.className = `absolute rounded-full shadow-neon animate-pulse-cyan`;
        blip.style.width = ast.userData.isHazardous ? '6px' : '4px';
        blip.style.height = ast.userData.isHazardous ? '6px' : '4px';
        blip.style.backgroundColor = ast.userData.isHazardous ? '#FF2A2A' : '#10E560';
        blip.style.boxShadow = `0 0 8px ${ast.userData.isHazardous ? 'rgba(255,42,42,0.8)' : 'rgba(16,229,96,0.8)'}`;
        blip.style.transform = 'translate(-50%, -50%)';
        if (radarBlips) radarBlips.appendChild(blip);
        ast.userData.radarBlip = blip;
    });

    // Populate Velocity Chart
    const speeds = neos.map(neo => parseFloat(neo.close_approach_data[0].relative_velocity.kilometers_per_second));
    const maxSpeed = Math.ceil(Math.max(...speeds)) || 1;

    // Creiamo 7 barre, dividendo la velocità massima in 7 intervalli
    const binSize = maxSpeed / 7;
    const bins = [0, 0, 0, 0, 0, 0, 0];

    speeds.forEach(v => {
        let index = Math.floor(v / binSize);
        if (index > 6) index = 6;
        bins[index]++;
    });
    const maxBin = 75;

    // Aggiorna l'asse Y (che rappresenta il numero/quantità di asteroidi)
    const y100 = document.getElementById('stat-y-100');
    const y66 = document.getElementById('stat-y-66');
    const y33 = document.getElementById('stat-y-33');
    if (y100) y100.innerText = "75";
    if (y66) y66.innerText = "50";
    if (y33) y33.innerText = "25";

    // Aggiorna l'asse X (prepara il contenitore per allineare i label alle barre)
    const xAxisContainer = document.getElementById('chart-x-axis');
    if (xAxisContainer) {
        xAxisContainer.innerHTML = '';
        // Riflette il flex gap e padding del grafico per un allineamento colonna-etichetta perfetto
        xAxisContainer.className = 'flex-1 grid grid-cols-7 gap-1 px-1 text-[8px] font-mono text-primary/50 pt-1';
    }

    const chartContainer = document.getElementById('env-chart-container');
    if (chartContainer) {
        chartContainer.innerHTML = '';
        bins.forEach((count, i) => {
            const pct = Math.min((count / maxBin) * 100, 100); // Il massimo tocca perfettamente il MAX in y-axis
            const bar = document.createElement('div');
            const intensity = (count / maxBin); // 0.0 to 1.0

            bar.className = 'w-full relative group/bar cursor-pointer transition-all duration-300 group-hover/chart:opacity-30 hover:!opacity-100 hover:!bg-on-surface hover:!text-on-primary border border-primary bg-transparent backdrop-blur-md';
            // Animazione dell'altezza
            bar.style.height = `0%`;
            setTimeout(() => { bar.style.height = `${pct}%`; }, 100 + i * 50);

            bar.style.minHeight = count > 0 ? '4px' : '1px';
            const startVal = Math.round(i * binSize);
            const endVal = Math.round((i + 1) * binSize);
            const labelRange = i === 6 ? `${startVal}+` : `${startVal}-${endVal}`;

            // Aggiungo il testo sulla riga dell'Asse X, allineato visivamente sotto la barra appropriata
            if (xAxisContainer) {
                const labelSpan = document.createElement('span');
                labelSpan.className = 'w-full flex-1 text-center truncate';
                labelSpan.innerText = labelRange;
                xAxisContainer.appendChild(labelSpan);
            }

            const tooltip = document.createElement('div');
            // Tooltip visibile con opacità per non sovrapporsi in modo sporco
            tooltip.className = 'absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity flex items-center justify-center bg-surface border border-outline-variant/40 text-[9px] font-[\'Inter\'] px-2 py-1 text-white whitespace-nowrap z-50 pointer-events-none rounded shadow-none';

            tooltip.innerHTML = `<span class="font-bold text-[11px]">${count} AST.</span>`;
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
    document.getElementById('neo-speed').innerText = d.speed + " KM/S";
    document.getElementById('neo-distance').innerText = d.km + " KM";

    document.getElementById('neo-date').innerText = d.date;

    const b = document.getElementById('neo-hazard-badge');
    b.innerText = d.isHazardous ? "ACTIVE THREAT" : "SAFE";
    b.className = `inline-block text-2xl text-center font-bold uppercase tracking-widest ${d.isHazardous ? 'text-[#FF2A2A]' : 'text-[#10E560]'}`;

    const infoTitle = document.getElementById('info-panel-title');
    if (infoTitle) infoTitle.innerText = "Target Locked";

    document.getElementById('target-placeholder').classList.add('hidden');
    document.getElementById('target-details').classList.remove('hidden');
    document.getElementById('target-details').classList.add('flex');


    if (closeBtn) closeBtn.classList.remove('hidden');

    if (currentTween) currentTween.stop();
    if (trackedAsteroid) trackedAsteroid.userData.traj.material.opacity = trackedAsteroid.userData.isHazardous ? 0.8 : 0.5;
    trackedAsteroid = ast;
    trackedAsteroid.userData.traj.material.opacity = 1.0;

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

const INITIAL_CAM_POS = new THREE.Vector3(0, 5, 20);
const INITIAL_CAM_TARGET = new THREE.Vector3(0, 0, 0);

function resetCamera() {
    closePanel();
    if (currentTween) currentTween.stop();
    if (trackedAsteroid) trackedAsteroid.userData.traj.material.opacity = trackedAsteroid.userData.isHazardous ? 0.8 : 0.5;
    trackedAsteroid = null; isZooming = true; controls.enabled = false;
    camStartPos.copy(camera.position); targetStartPos.copy(controls.target);
    currentTween = new TWEEN.Tween({ t: 0 }).to({ t: 1 }, 1500).easing(TWEEN.Easing.Cubic.InOut)
        .onUpdate((obj) => {
            camera.position.lerpVectors(camStartPos, INITIAL_CAM_POS, obj.t);
            controls.target.lerpVectors(targetStartPos, INITIAL_CAM_TARGET, obj.t);
        })
        .onComplete(() => { isZooming = false; controls.enabled = true; controls.minDistance = 3.5; })
        .start();
}

function closePanel() {
    document.getElementById('target-placeholder').classList.remove('hidden');
    document.getElementById('target-details').classList.add('hidden');
    document.getElementById('target-details').classList.remove('flex');

    const infoTitle = document.getElementById('info-panel-title');
    if (infoTitle) infoTitle.innerText = "Select Target";

    if (closeBtn) closeBtn.classList.add('hidden');
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

        // Pulse the halo:
        if (ast.userData.halo) {
            const t = performance.now() / 1000;
            // Oscilla fluidamente tra -1 e 1
            const oscillator = Math.sin(t * 1.8 + ast.userData.halo.userData.pulseOffset);

            // Amplifica la pulsazione della grandezza in maniera molto lieve (da 0.95x a 1.05x)
            const pulse = 1.0 + 0.05 * oscillator;

            // Calcola la distanza dalla telecamera per scalare gli aloni e prevenire l'effetto "miasma" da lontano
            const dist = camera.position.distanceTo(ast.position);
            const zoomFactor = Math.max(0.18, Math.min(1.0, 50.0 / dist));

            const s = ast.userData.halo.userData.baseScale * pulse * zoomFactor;
            ast.userData.halo.material.size = s;

            // Sincronizza l'opacità per renderla più stabile (da 0.6 a 0.8)
            const baseOp = 0.7 + 0.1 * oscillator;
            ast.userData.halo.material.opacity = baseOp * Math.max(0.6, zoomFactor);
        }
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

function focusNextAsteroid() {
    if (realAsteroids.length === 0) return;
    if (!trackedAsteroid) {
        focusOnAsteroid(realAsteroids[0]);
        return;
    }
    let idx = realAsteroids.indexOf(trackedAsteroid);
    idx = (idx + 1) % realAsteroids.length;
    focusOnAsteroid(realAsteroids[idx]);
}

function focusPrevAsteroid() {
    if (realAsteroids.length === 0) return;
    if (!trackedAsteroid) {
        focusOnAsteroid(realAsteroids[realAsteroids.length - 1]);
        return;
    }
    let idx = realAsteroids.indexOf(trackedAsteroid);
    idx = (idx - 1 + realAsteroids.length) % realAsteroids.length;
    focusOnAsteroid(realAsteroids[idx]);
}