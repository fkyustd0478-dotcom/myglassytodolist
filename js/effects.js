/* effects.js */
const ParticleEngine = {
    petals: [],
    rain: [],
    activeEffect: 'none',
    container: null,

    init() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'effects-container';
            this.container.style.position = 'fixed';
            this.container.style.top = '0';
            this.container.style.left = '0';
            this.container.style.width = '100%';
            this.container.style.height = '100%';
            this.container.style.pointerEvents = 'none';
            this.container.style.zIndex = '1000';
            document.body.appendChild(this.container);
        }
    },

    setEffect(effect) {
        this.init();
        this.clear();
        this.activeEffect = effect;
        if (effect === 'cherry') this.startCherry();
        if (effect === 'rain') this.startRain();
        if (effect === 'snow') this.startSnow();
    },

    clear() {
        if (this.container) this.container.innerHTML = '';
        this.petals = [];
        this.rain = [];
        this.snow = [];
    },

    startCherry() {
        for (let i = 0; i < 30; i++) {
            this.createPetal();
        }
    },

    createPetal() {
        const petal = document.createElement('div');
        petal.className = 'petal';
        this.resetPetal(petal);
        this.container.appendChild(petal);
    },

    resetPetal(petal) {
        const left = Math.random() * 100;
        const duration = 10 + Math.random() * 15;
        const delay = Math.random() * -20;
        const drift = (Math.random() - 0.5) * 400;
        const rotation = Math.random() * 720;

        petal.style.left = `${left}%`;
        petal.style.animationDuration = `${duration}s`;
        petal.style.animationDelay = `${delay}s`;
        petal.style.setProperty('--drift', `${drift}px`);
        petal.style.setProperty('--rotation', `${rotation}deg`);
    },

    startRain() {
        for (let i = 0; i < 100; i++) {
            this.createRaindrop();
        }
    },

    createRaindrop() {
        const drop = document.createElement('div');
        drop.className = 'raindrop';
        this.resetRaindrop(drop);
        this.container.appendChild(drop);
    },

    resetRaindrop(drop) {
        const left = Math.random() * 100;
        const duration = 0.5 + Math.random() * 0.5;
        const delay = Math.random() * -1;

        drop.style.left = `${left}%`;
        drop.style.animationDuration = `${duration}s`;
        drop.style.animationDelay = `${delay}s`;
    },

    startSnow() {
        for (let i = 0; i < 50; i++) {
            this.createSnowflake();
        }
    },

    createSnowflake() {
        const flake = document.createElement('div');
        flake.className = 'snowflake';
        this.resetSnowflake(flake);
        this.container.appendChild(flake);
    },

    resetSnowflake(flake) {
        const left = Math.random() * 100;
        const duration = 5 + Math.random() * 10;
        const delay = Math.random() * -10;
        const size = 2 + Math.random() * 4;
        const drift = (Math.random() - 0.5) * 200;

        flake.style.left = `${left}%`;
        flake.style.width = `${size}px`;
        flake.style.height = `${size}px`;
        flake.style.animationDuration = `${duration}s`;
        flake.style.animationDelay = `${delay}s`;
        flake.style.setProperty('--drift', `${drift}px`);
    }
};

window.ParticleEngine = ParticleEngine;
