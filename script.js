// 竹斬り道場 - Ultimate Bamboo Cutting Game

class BambooCuttingGame {
    constructor() {
        this.setupCanvas();
        this.setupElements();
        this.setupEventListeners();
        this.initializeAudio();
        this.initializeGame();
        
        // ゲーム状態
        this.isPlaying = false;
        this.isPaused = false;
        this.isZenMode = false;
        this.gameStartTime = 0;
        
        // スコア系
        this.cutCount = 0;
        this.comboCount = 0;
        this.maxCombo = 0;
        this.highScore = this.loadHighScore();
        this.score = 0;
        
        // 竹管理
        this.bamboos = [];
        this.nextBambooId = 1;
        this.spawnTimer = null;
        this.lastSpawnTime = 0;
        
        // エフェクト
        this.particles = [];
        this.slashEffects = [];
        this.animationId = null;
        
        // 設定
        this.difficulty = 'normal';
        this.bambooSize = 60;
        this.spawnRate = 1500;
        this.soundEnabled = true;
        
        // 物理とタイミング
        this.comboTimer = 0;
        this.comboTimeLimit = 2000; // 2秒以内で連続斬り
        this.lastCutTime = 0;
        
        // マウス/タッチ追跡
        this.isSlashing = false;
        this.slashStartPos = null;
        this.slashCurrentPos = null;
        
        this.updateDisplay();
    }
    
    setupCanvas() {
        this.gameCanvas = document.getElementById('gameCanvas');
        this.particleCanvas = document.getElementById('particleCanvas');
        this.effectCanvas = document.getElementById('effectCanvas');
        
        this.gameCtx = this.gameCanvas.getContext('2d');
        this.particleCtx = this.particleCanvas.getContext('2d');
        this.effectCtx = this.effectCanvas.getContext('2d');
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    resizeCanvas() {
        const container = document.querySelector('.game-area');
        const rect = container.getBoundingClientRect();
        
        [this.gameCanvas, this.particleCanvas, this.effectCanvas].forEach(canvas => {
            canvas.width = rect.width;
            canvas.height = rect.height;
        });
    }
    
    setupElements() {
        this.cutCountElement = document.getElementById('cutCount');
        this.comboCountElement = document.getElementById('comboCount');
        this.highScoreElement = document.getElementById('highScore');
        
        this.difficultySelect = document.getElementById('difficultySelect');
        this.bambooSizeSlider = document.getElementById('bambooSize');
        this.spawnRateSlider = document.getElementById('spawnRate');
        this.soundCheckbox = document.getElementById('soundEnabled');
        
        this.sizeValue = document.getElementById('sizeValue');
        this.rateValue = document.getElementById('rateValue');
        
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.zenModeBtn = document.getElementById('zenModeBtn');
        
        this.bambooContainer = document.getElementById('bambooContainer');
        this.slashEffectsContainer = document.getElementById('slashEffects');
    }
    
    setupEventListeners() {
        // ボタン
        this.startBtn.addEventListener('click', () => this.startGame());
        this.pauseBtn.addEventListener('click', () => this.togglePause());
        this.resetBtn.addEventListener('click', () => this.resetGame());
        this.zenModeBtn.addEventListener('click', () => this.toggleZenMode());
        
        // コントロール
        this.difficultySelect.addEventListener('change', (e) => {
            this.difficulty = e.target.value;
        });
        
        this.bambooSizeSlider.addEventListener('input', (e) => {
            this.bambooSize = parseInt(e.target.value);
            this.sizeValue.textContent = e.target.value;
        });
        
        this.spawnRateSlider.addEventListener('input', (e) => {
            this.spawnRate = parseInt(e.target.value);
            this.rateValue.textContent = (e.target.value / 1000).toFixed(1) + '秒';
        });
        
        this.soundCheckbox.addEventListener('change', (e) => {
            this.soundEnabled = e.target.checked;
        });
        
        // マウスイベント
        this.gameCanvas.addEventListener('mousedown', (e) => this.startSlash(e));
        this.gameCanvas.addEventListener('mousemove', (e) => this.updateSlash(e));
        this.gameCanvas.addEventListener('mouseup', (e) => this.endSlash(e));
        
        // タッチイベント
        this.gameCanvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startSlash(e.touches[0]);
        });
        this.gameCanvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.updateSlash(e.touches[0]);
        });
        this.gameCanvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.endSlash();
        });
    }
    
    initializeAudio() {
        this.audioContext = null;
        this.sounds = {
            cut: [],
            perfect: null,
            combo: null,
            whoosh: null
        };
        
        // 最初のユーザーインタラクション時にオーディオ初期化
        document.addEventListener('click', () => {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.createSounds();
            }
        }, { once: true });
    }
    
    createSounds() {
        // 竹を切る音
        for (let i = 0; i < 5; i++) {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filterNode = this.audioContext.createBiquadFilter();
            
            oscillator.type = 'sawtooth';
            oscillator.frequency.value = 200 + Math.random() * 300;
            filterNode.type = 'highpass';
            filterNode.frequency.value = 1000;
            gainNode.gain.value = 0;
            
            oscillator.connect(filterNode);
            filterNode.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            this.sounds.cut.push({ oscillator, gainNode, filterNode });\n        }\n    }\n    \n    playSound(type, intensity = 1) {\n        if (!this.soundEnabled || !this.audioContext) return;\n        \n        const now = this.audioContext.currentTime;\n        \n        switch (type) {\n            case 'cut':\n                const sound = this.sounds.cut[Math.floor(Math.random() * this.sounds.cut.length)];\n                sound.gainNode.gain.setValueAtTime(0, now);\n                sound.gainNode.gain.linearRampToValueAtTime(0.3 * intensity, now + 0.01);\n                sound.gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);\n                sound.filterNode.frequency.setValueAtTime(1000, now);\n                sound.filterNode.frequency.linearRampToValueAtTime(3000, now + 0.1);\n                break;\n                \n            case 'perfect':\n                // パーフェクトカット音\n                const perfectOsc = this.audioContext.createOscillator();\n                const perfectGain = this.audioContext.createGain();\n                perfectOsc.type = 'sine';\n                perfectOsc.frequency.setValueAtTime(880, now);\n                perfectOsc.frequency.linearRampToValueAtTime(1320, now + 0.1);\n                perfectGain.gain.setValueAtTime(0, now);\n                perfectGain.gain.linearRampToValueAtTime(0.2, now + 0.05);\n                perfectGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);\n                perfectOsc.connect(perfectGain);\n                perfectGain.connect(this.audioContext.destination);\n                perfectOsc.start(now);\n                perfectOsc.stop(now + 0.3);\n                break;\n                \n            case 'combo':\n                // コンボ音\n                for (let i = 0; i < 3; i++) {\n                    const comboOsc = this.audioContext.createOscillator();\n                    const comboGain = this.audioContext.createGain();\n                    comboOsc.type = 'triangle';\n                    comboOsc.frequency.value = 440 * (1 + i * 0.5);\n                    comboGain.gain.setValueAtTime(0, now + i * 0.1);\n                    comboGain.gain.linearRampToValueAtTime(0.1, now + i * 0.1 + 0.05);\n                    comboGain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.2);\n                    comboOsc.connect(comboGain);\n                    comboGain.connect(this.audioContext.destination);\n                    comboOsc.start(now + i * 0.1);\n                    comboOsc.stop(now + i * 0.1 + 0.2);\n                }\n                break;\n        }\n    }\n    \n    initializeGame() {\n        this.resizeCanvas();\n    }\n    \n    startGame() {\n        if (this.isPlaying) return;\n        \n        this.isPlaying = true;\n        this.isPaused = false;\n        this.gameStartTime = Date.now();\n        this.lastSpawnTime = 0;\n        \n        this.startBtn.textContent = '🎋 修行中...';\n        this.startBtn.disabled = true;\n        \n        this.spawnBamboo();\n        this.animate();\n        \n        // 定期的な竹生成\n        this.spawnTimer = setInterval(() => {\n            if (!this.isPaused) {\n                this.spawnBamboo();\n            }\n        }, this.spawnRate);\n    }\n    \n    togglePause() {\n        if (!this.isPlaying) return;\n        \n        this.isPaused = !this.isPaused;\n        \n        if (this.isPaused) {\n            this.pauseBtn.textContent = '▶️ 再開';\n            if (this.spawnTimer) {\n                clearInterval(this.spawnTimer);\n                this.spawnTimer = null;\n            }\n        } else {\n            this.pauseBtn.textContent = '⏸️ 一時停止';\n            this.spawnTimer = setInterval(() => {\n                if (!this.isPaused) {\n                    this.spawnBamboo();\n                }\n            }, this.spawnRate);\n        }\n    }\n    \n    resetGame() {\n        this.isPlaying = false;\n        this.isPaused = false;\n        \n        if (this.spawnTimer) {\n            clearInterval(this.spawnTimer);\n            this.spawnTimer = null;\n        }\n        \n        if (this.animationId) {\n            cancelAnimationFrame(this.animationId);\n            this.animationId = null;\n        }\n        \n        // スコアリセット\n        this.cutCount = 0;\n        this.comboCount = 0;\n        this.score = 0;\n        \n        // 竹とエフェクトクリア\n        this.bamboos = [];\n        this.particles = [];\n        this.slashEffects = [];\n        this.bambooContainer.innerHTML = '';\n        this.slashEffectsContainer.innerHTML = '';\n        \n        // キャンバスクリア\n        this.clearCanvas();\n        \n        // UI更新\n        this.startBtn.textContent = '🎋 修行開始';\n        this.startBtn.disabled = false;\n        this.pauseBtn.textContent = '⏸️ 一時停止';\n        \n        this.updateDisplay();\n    }\n    \n    toggleZenMode() {\n        this.isZenMode = !this.isZenMode;\n        \n        if (this.isZenMode) {\n            document.body.classList.add('zen-mode');\n            this.zenModeBtn.textContent = '🧘 禅モード ON';\n            // 禅モードでは難易度を最低に\n            this.difficulty = 'easy';\n            this.difficultySelect.value = 'easy';\n        } else {\n            document.body.classList.remove('zen-mode');\n            this.zenModeBtn.textContent = '🧘 禅モード';\n        }\n    }\n    \n    spawnBamboo() {\n        if (this.bamboos.length >= 8) return; // 最大8本まで\n        \n        const bamboo = {\n            id: this.nextBambooId++,\n            x: Math.random() * (this.gameCanvas.width - this.bambooSize),\n            y: -this.bambooSize,\n            width: this.bambooSize + Math.random() * 20 - 10,\n            height: this.bambooSize * 2 + Math.random() * this.bambooSize,\n            speed: this.getDifficultySettings().speed,\n            rotation: (Math.random() - 0.5) * 20, // -10 ~ 10度\n            health: this.getDifficultySettings().health,\n            maxHealth: this.getDifficultySettings().health,\n            isCut: false,\n            cutLine: null,\n            fallSpeed: 0,\n            rotationSpeed: (Math.random() - 0.5) * 5\n        };\n        \n        this.bamboos.push(bamboo);\n        this.createBambooElement(bamboo);\n    }\n    \n    getDifficultySettings() {\n        const settings = {\n            easy: { speed: 1, health: 1 },\n            normal: { speed: 2, health: 2 },\n            hard: { speed: 3, health: 3 },\n            extreme: { speed: 4, health: 5 }\n        };\n        return settings[this.difficulty] || settings.normal;\n    }\n    \n    createBambooElement(bamboo) {\n        const element = document.createElement('div');\n        element.className = 'bamboo';\n        element.id = `bamboo-${bamboo.id}`;\n        element.style.left = bamboo.x + 'px';\n        element.style.top = bamboo.y + 'px';\n        element.style.width = bamboo.width + 'px';\n        element.style.height = bamboo.height + 'px';\n        element.style.transform = `rotate(${bamboo.rotation}deg)`;\n        \n        this.bambooContainer.appendChild(element);\n    }\n    \n    startSlash(event) {\n        this.isSlashing = true;\n        const rect = this.gameCanvas.getBoundingClientRect();\n        this.slashStartPos = {\n            x: (event.clientX || event.pageX) - rect.left,\n            y: (event.clientY || event.pageY) - rect.top\n        };\n        this.slashCurrentPos = { ...this.slashStartPos };\n    }\n    \n    updateSlash(event) {\n        if (!this.isSlashing) return;\n        \n        const rect = this.gameCanvas.getBoundingClientRect();\n        this.slashCurrentPos = {\n            x: (event.clientX || event.pageX) - rect.left,\n            y: (event.clientY || event.pageY) - rect.top\n        };\n        \n        // リアルタイム斬撃線描画\n        this.drawSlashLine();\n    }\n    \n    endSlash() {\n        if (!this.isSlashing) return;\n        \n        this.isSlashing = false;\n        \n        if (this.slashStartPos && this.slashCurrentPos) {\n            this.performSlash();\n            this.createSlashEffect();\n        }\n        \n        this.slashStartPos = null;\n        this.slashCurrentPos = null;\n    }\n    \n    drawSlashLine() {\n        if (!this.slashStartPos || !this.slashCurrentPos) return;\n        \n        this.effectCtx.clearRect(0, 0, this.effectCanvas.width, this.effectCanvas.height);\n        \n        this.effectCtx.strokeStyle = 'rgba(255, 215, 0, 0.8)';\n        this.effectCtx.lineWidth = 3;\n        this.effectCtx.lineCap = 'round';\n        this.effectCtx.shadowColor = 'rgba(255, 215, 0, 0.6)';\n        this.effectCtx.shadowBlur = 10;\n        \n        this.effectCtx.beginPath();\n        this.effectCtx.moveTo(this.slashStartPos.x, this.slashStartPos.y);\n        this.effectCtx.lineTo(this.slashCurrentPos.x, this.slashCurrentPos.y);\n        this.effectCtx.stroke();\n    }\n    \n    performSlash() {\n        const slashLine = {\n            x1: this.slashStartPos.x,\n            y1: this.slashStartPos.y,\n            x2: this.slashCurrentPos.x,\n            y2: this.slashCurrentPos.y\n        };\n        \n        let cutsThisSlash = 0;\n        const now = Date.now();\n        \n        this.bamboos.forEach(bamboo => {\n            if (bamboo.isCut) return;\n            \n            if (this.lineIntersectsBamboo(slashLine, bamboo)) {\n                this.cutBamboo(bamboo, slashLine);\n                cutsThisSlash++;\n            }\n        });\n        \n        // コンボ判定\n        if (cutsThisSlash > 0) {\n            if (now - this.lastCutTime < this.comboTimeLimit) {\n                this.comboCount += cutsThisSlash;\n            } else {\n                this.comboCount = cutsThisSlash;\n            }\n            \n            this.lastCutTime = now;\n            this.cutCount += cutsThisSlash;\n            \n            if (this.comboCount > this.maxCombo) {\n                this.maxCombo = this.comboCount;\n            }\n            \n            // コンボボーナス音\n            if (this.comboCount >= 3) {\n                this.playSound('combo');\n            }\n            \n            this.updateDisplay();\n        }\n    }\n    \n    lineIntersectsBamboo(line, bamboo) {\n        // 簡単な矩形との交差判定\n        const bambooRect = {\n            x: bamboo.x,\n            y: bamboo.y,\n            width: bamboo.width,\n            height: bamboo.height\n        };\n        \n        return this.lineIntersectsRect(line, bambooRect);\n    }\n    \n    lineIntersectsRect(line, rect) {\n        // 線分と矩形の交差判定\n        const { x1, y1, x2, y2 } = line;\n        const { x: rx, y: ry, width: rw, height: rh } = rect;\n        \n        // 線分の両端が矩形内にある場合\n        if ((x1 >= rx && x1 <= rx + rw && y1 >= ry && y1 <= ry + rh) ||\n            (x2 >= rx && x2 <= rx + rw && y2 >= ry && y2 <= ry + rh)) {\n            return true;\n        }\n        \n        // 線分が矩形の辺と交差する場合の判定\n        const rectLines = [\n            { x1: rx, y1: ry, x2: rx + rw, y2: ry },         // 上辺\n            { x1: rx + rw, y1: ry, x2: rx + rw, y2: ry + rh }, // 右辺\n            { x1: rx + rw, y1: ry + rh, x2: rx, y2: ry + rh }, // 下辺\n            { x1: rx, y1: ry + rh, x2: rx, y2: ry }          // 左辺\n        ];\n        \n        return rectLines.some(rectLine => this.linesIntersect(line, rectLine));\n    }\n    \n    linesIntersect(line1, line2) {\n        const { x1: x1, y1: y1, x2: x2, y2: y2 } = line1;\n        const { x1: x3, y1: y3, x2: x4, y2: y4 } = line2;\n        \n        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);\n        if (Math.abs(denom) < 1e-10) return false; // 平行\n        \n        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;\n        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;\n        \n        return t >= 0 && t <= 1 && u >= 0 && u <= 1;\n    }\n    \n    cutBamboo(bamboo, slashLine) {\n        bamboo.health--;\n        \n        if (bamboo.health <= 0) {\n            bamboo.isCut = true;\n            bamboo.cutLine = slashLine;\n            bamboo.fallSpeed = 2 + Math.random() * 3;\n            \n            // 完全カット音\n            this.playSound('cut', 1);\n            \n            // パーフェクトカット判定（中心近くを切った場合）\n            const centerX = bamboo.x + bamboo.width / 2;\n            const centerY = bamboo.y + bamboo.height / 2;\n            const slashMidX = (slashLine.x1 + slashLine.x2) / 2;\n            const slashMidY = (slashLine.y1 + slashLine.y2) / 2;\n            const distance = Math.sqrt((centerX - slashMidX) ** 2 + (centerY - slashMidY) ** 2);\n            \n            if (distance < bamboo.width * 0.3) {\n                this.playSound('perfect');\n                this.createPerfectEffect(centerX, centerY);\n            }\n            \n            // パーティクル生成\n            this.createCutParticles(bamboo);\n            \n            // DOM要素にカットクラス追加\n            const element = document.getElementById(`bamboo-${bamboo.id}`);\n            if (element) {\n                element.classList.add('cutting');\n            }\n        } else {\n            // 部分カット音\n            this.playSound('cut', 0.5);\n        }\n    }\n    \n    createSlashEffect() {\n        const effect = document.createElement('div');\n        effect.className = 'slash-line';\n        \n        const length = Math.sqrt(\n            (this.slashCurrentPos.x - this.slashStartPos.x) ** 2 + \n            (this.slashCurrentPos.y - this.slashStartPos.y) ** 2\n        );\n        const angle = Math.atan2(\n            this.slashCurrentPos.y - this.slashStartPos.y,\n            this.slashCurrentPos.x - this.slashStartPos.x\n        ) * 180 / Math.PI;\n        \n        effect.style.left = this.slashStartPos.x + 'px';\n        effect.style.top = this.slashStartPos.y + 'px';\n        effect.style.width = length + 'px';\n        effect.style.transform = `rotate(${angle}deg)`;\n        effect.style.transformOrigin = '0 50%';\n        \n        this.slashEffectsContainer.appendChild(effect);\n        \n        // エフェクト自動削除\n        setTimeout(() => {\n            if (effect.parentNode) {\n                effect.parentNode.removeChild(effect);\n            }\n        }, 500);\n    }\n    \n    createCutParticles(bamboo) {\n        const particleCount = 15 + Math.random() * 10;\n        \n        for (let i = 0; i < particleCount; i++) {\n            const particle = {\n                x: bamboo.x + Math.random() * bamboo.width,\n                y: bamboo.y + Math.random() * bamboo.height,\n                vx: (Math.random() - 0.5) * 8,\n                vy: (Math.random() - 0.5) * 8 - 2,\n                life: 1,\n                decay: 0.02 + Math.random() * 0.02,\n                size: 2 + Math.random() * 4,\n                color: this.getParticleColor()\n            };\n            \n            this.particles.push(particle);\n        }\n    }\n    \n    createPerfectEffect(x, y) {\n        const perfectEffect = document.createElement('div');\n        perfectEffect.textContent = 'PERFECT!';\n        perfectEffect.style.position = 'absolute';\n        perfectEffect.style.left = x + 'px';\n        perfectEffect.style.top = y + 'px';\n        perfectEffect.style.color = '#ffd700';\n        perfectEffect.style.fontSize = '20px';\n        perfectEffect.style.fontWeight = 'bold';\n        perfectEffect.style.pointerEvents = 'none';\n        perfectEffect.style.animation = 'perfectFade 1s ease-out forwards';\n        perfectEffect.style.textShadow = '0 0 10px rgba(255, 215, 0, 0.8)';\n        perfectEffect.style.transform = 'translate(-50%, -50%)';\n        \n        this.slashEffectsContainer.appendChild(perfectEffect);\n        \n        setTimeout(() => {\n            if (perfectEffect.parentNode) {\n                perfectEffect.parentNode.removeChild(perfectEffect);\n            }\n        }, 1000);\n    }\n    \n    getParticleColor() {\n        const colors = [\n            '#4a7c59', '#6b9b78', '#ffd700', \n            '#ffed4e', '#2d4a3a', '#ffffff'\n        ];\n        return colors[Math.floor(Math.random() * colors.length)];\n    }\n    \n    updateBamboos() {\n        this.bamboos = this.bamboos.filter(bamboo => {\n            if (bamboo.isCut) {\n                // カットされた竹は落下\n                bamboo.y += bamboo.fallSpeed;\n                bamboo.fallSpeed += 0.2; // 重力\n                bamboo.rotation += bamboo.rotationSpeed;\n                \n                const element = document.getElementById(`bamboo-${bamboo.id}`);\n                if (element) {\n                    element.style.top = bamboo.y + 'px';\n                    element.style.transform = `rotate(${bamboo.rotation}deg)`;\n                }\n                \n                // 画面外に落ちたら削除\n                if (bamboo.y > this.gameCanvas.height + 100) {\n                    if (element && element.parentNode) {\n                        element.parentNode.removeChild(element);\n                    }\n                    return false;\n                }\n            } else {\n                // 通常の竹は下に移動\n                bamboo.y += bamboo.speed;\n                \n                const element = document.getElementById(`bamboo-${bamboo.id}`);\n                if (element) {\n                    element.style.top = bamboo.y + 'px';\n                }\n                \n                // 画面下に到達したら削除（ペナルティ）\n                if (bamboo.y > this.gameCanvas.height) {\n                    if (element && element.parentNode) {\n                        element.parentNode.removeChild(element);\n                    }\n                    // コンボリセット\n                    this.comboCount = 0;\n                    this.updateDisplay();\n                    return false;\n                }\n            }\n            \n            return true;\n        });\n    }\n    \n    updateParticles() {\n        this.particles = this.particles.filter(particle => {\n            particle.x += particle.vx;\n            particle.y += particle.vy;\n            particle.vy += 0.1; // 重力\n            particle.life -= particle.decay;\n            \n            return particle.life > 0;\n        });\n    }\n    \n    clearCanvas() {\n        this.gameCtx.clearRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);\n        this.particleCtx.clearRect(0, 0, this.particleCanvas.width, this.particleCanvas.height);\n        this.effectCtx.clearRect(0, 0, this.effectCanvas.width, this.effectCanvas.height);\n    }\n    \n    render() {\n        this.clearCanvas();\n        \n        // パーティクル描画\n        this.particles.forEach(particle => {\n            this.particleCtx.globalAlpha = particle.life;\n            this.particleCtx.fillStyle = particle.color;\n            this.particleCtx.fillRect(\n                particle.x - particle.size / 2,\n                particle.y - particle.size / 2,\n                particle.size,\n                particle.size\n            );\n        });\n        \n        this.particleCtx.globalAlpha = 1;\n    }\n    \n    updateDisplay() {\n        this.cutCountElement.textContent = this.cutCount;\n        this.comboCountElement.textContent = this.comboCount;\n        \n        // スコア計算\n        this.score = this.cutCount * 10 + this.maxCombo * 50;\n        \n        // ハイスコア更新\n        if (this.score > this.highScore) {\n            this.highScore = this.score;\n            this.saveHighScore();\n        }\n        \n        this.highScoreElement.textContent = this.highScore;\n    }\n    \n    loadHighScore() {\n        return parseInt(localStorage.getItem('bambooHighScore') || '0');\n    }\n    \n    saveHighScore() {\n        localStorage.setItem('bambooHighScore', this.highScore.toString());\n    }\n    \n    animate() {\n        if (!this.isPlaying) return;\n        \n        if (!this.isPaused) {\n            this.updateBamboos();\n            this.updateParticles();\n        }\n        \n        this.render();\n        \n        this.animationId = requestAnimationFrame(() => this.animate());\n    }\n}\n\n// パーフェクトエフェクト用CSS追加\nconst style = document.createElement('style');\nstyle.textContent = `\n    @keyframes perfectFade {\n        0% {\n            opacity: 1;\n            transform: translate(-50%, -50%) scale(1);\n        }\n        50% {\n            opacity: 1;\n            transform: translate(-50%, -50%) scale(1.2);\n        }\n        100% {\n            opacity: 0;\n            transform: translate(-50%, -50%) scale(0.8) translateY(-30px);\n        }\n    }\n`;\ndocument.head.appendChild(style);\n\n// ゲーム初期化\ndocument.addEventListener('DOMContentLoaded', () => {\n    new BambooCuttingGame();\n});