// --- 🌟 ระบบจัดการเสียง (ยุบรวมมาไว้ในนี้เลย) 🌟 ---
const audioManager = {
    bgm: new Audio('sounds/bgm.mp3'),
    sfx: {
        start: new Audio('sounds/start.mp3'),
        place: new Audio('sounds/place.mp3'),
        error: new Audio('sounds/error.mp3'),
        effect: new Audio('sounds/effect.mp3'),
        evolve: new Audio('sounds/evolve.mp3'),
        tick: new Audio('sounds/tick.mp3'),
        win: new Audio('sounds/win.mp3'),
        lose: new Audio('sounds/lose.mp3')
    },
    isMuted: false,

    init() {
        this.bgm.loop = true;
        this.bgm.volume = 0.3;

        // ตั้งความดังเสียงเอฟเฟคทั่วไป
        Object.values(this.sfx).forEach(sound => sound.volume = 0.8);

        // 🌟 เพิ่มบรรทัดนี้: หรี่เสียงนาฬิกาติ๊กๆ ลงให้เบาที่สุด จะได้ไม่หนวกหู
        if (this.sfx['tick']) {
            this.sfx['tick'].volume = 0.2;
        }
    },
    playBGM() {
        if (!this.isMuted) {
            let playPromise = this.bgm.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log("Audio play failed, check path or interaction: ", error);
                });
            }
        }
    },
    stopBGM() { this.bgm.pause(); },
    playSFX(name) {
        if (!this.isMuted && this.sfx[name]) {
            this.sfx[name].currentTime = 0;
            let playPromise = this.sfx[name].play();
            if (playPromise !== undefined) {
                playPromise.catch(e => { /* ละเว้นถ้าหาไฟล์ไม่เจอ จะได้ไม่พัง */ });
            }
        }
    },
    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) this.bgm.pause();
        else this.playBGM();
        return this.isMuted;
    }
};

// สั่งให้ตั้งค่าเริ่มต้นเสียง
audioManager.init();

function toggleSound() {
    const isMuted = audioManager.toggleMute();
    document.getElementById('mute-btn').innerText = isMuted ? "🔇" : "🔊";
}

// --- Fallback Data ---
const FALLBACK_ORGS = [
    { id: "org_1", name: "Rhizobium", kingdom: "Monera", hp: 2, power: 2, desc: "แบคทีเรียปมรากถั่ว (+1 AP)", action: "gain_ap_1" },
    { id: "org_2", name: "Amoeba", kingdom: "Protista", hp: 2, power: 1, desc: "ผู้กลืนกิน", action: "none" },
    { id: "org_3", name: "Toxic Mushroom", kingdom: "Fungi", hp: 3, power: 2, desc: "สุ่มทำลายบอท 1 ตัว", action: "destroy_bot_random" },
    { id: "org_4", name: "Fern", kingdom: "Plantae", hp: 4, power: 2, desc: "พืชโบราณ", action: "none" },
    { id: "org_5", name: "Lion", kingdom: "Animalia", hp: 5, power: 5, desc: "นักล่า", action: "none" }
];
const FALLBACK_EFFS = [{ id: "eff_1", name: "Antibiotics", type: "Human", desc: "ทำลายแบคทีเรียบอท", action: "destroy_bot_monera" }];

const orgData = (typeof ORGANISM_DATA !== 'undefined' && ORGANISM_DATA.length > 0) ? ORGANISM_DATA : FALLBACK_ORGS;
const effData = (typeof EFFECT_DATA !== 'undefined' && EFFECT_DATA.length > 0) ? EFFECT_DATA : FALLBACK_EFFS;

// --- Territory Colors (Player=Green, Bot1=Orange, Bot2=Purple, Bot3=Cyan, Bot4=Pink) ---
const BOT_COLORS = ['#ff8c00', '#c84bff', '#00d2ff', '#ff2d78'];
const BOT_LABELS = ['🟠 Bot 1', '🟣 Bot 2', '🔵 Bot 3', '🩷 Bot 4'];

// --- Game State ---
let game = {
    ap: 3, turnCount: 1, isPlayerTurn: true, pConq: [], botConq: [[], [], [], []],
    dragData: null, dragEl: null, hasPlayedOrg: false, currentWeather: "Normal",
    timerInterval: null, timeLeft: 30,
    turnsUntilWeather: 3, // countdown to next weather change
    history: [] // full action history
};

// --- AI Difficulty System ---
let selectedDifficulty = 'normal';
let selectedBotCount = 1;

const AI_LEVELS = {
    easy: { label: '🟢 Easy (ง่าย)', effectChance: 0.10, smartPlacement: false },
    normal: { label: '🟡 Normal (ปานกลาง)', effectChance: 0.30, smartPlacement: false },
    hard: { label: '🟠 Hard (ยาก)', effectChance: 0.55, smartPlacement: true },
    expert: { label: '🔴 Expert (ผู้เชี่ยวชาญ)', effectChance: 0.75, smartPlacement: true }
};

function selectDifficulty(d) {
    selectedDifficulty = d;
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active-btn'));
    const btn = document.getElementById('diff-' + d);
    if (btn) btn.classList.add('active-btn');
}

function selectBotCount(n) {
    selectedBotCount = n;
    document.querySelectorAll('.bot-select-btn').forEach(b => b.classList.remove('active-btn'));
    document.querySelectorAll('.bot-select-btn').forEach(b => {
        if (b.textContent.trim().startsWith(String(n))) b.classList.add('active-btn');
    });
    const sb = document.getElementById('start-real-game-btn');
    if (sb) { sb.disabled = false; sb.style.opacity = '1'; }
}

// --- Pokedex ---
let discoveredCards = JSON.parse(localStorage.getItem('bio_pokedex')) || [];
function unlockCard(cardId) {
    if (!discoveredCards.includes(cardId) && cardId) {
        discoveredCards.push(cardId);
        localStorage.setItem('bio_pokedex', JSON.stringify(discoveredCards));
        pushLog(`📖 สารานุกรม: ค้นพบข้อมูลใหม่!`, "gold");
    }
}
function openEncyclopedia() {
    document.getElementById('encyclopedia-modal').classList.remove('hidden');
    const grid = document.getElementById('encyclopedia-grid');
    grid.innerHTML = '';
    document.getElementById('unlocked-count').innerText = discoveredCards.length;
    orgData.forEach(org => {
        const isUnlocked = discoveredCards.includes(org.id);
        const cardDiv = document.createElement('div');
        cardDiv.className = `poke-card ${isUnlocked ? 'unlocked' : 'locked'}`;
        if (isUnlocked && org.image) cardDiv.style.backgroundImage = `url('${org.image}')`;
        if (isUnlocked) cardDiv.title = `${org.name} (${org.kingdom})\nHP: ${org.hp} | POW: ${org.power}`;
        grid.appendChild(cardDiv);
    });
}
function closeEncyclopedia() { document.getElementById('encyclopedia-modal').classList.add('hidden'); }

// --- Game Control ---
let selectedMode = 'tutorial';

function showRealGameOptions() {
    document.getElementById('mode-selection').classList.add('hidden');
    document.getElementById('real-game-options').classList.remove('hidden');
}

function hideRealGameOptions() {
    document.getElementById('real-game-options').classList.add('hidden');
    document.getElementById('mode-selection').classList.remove('hidden');
}

function selectBotCount(count) {
    selectedBotCount = count;
    document.querySelectorAll('.bot-select-btn').forEach(btn => {
        btn.style.backgroundColor = 'transparent';
        btn.style.color = 'white';
    });
    const clickedBtn = event.target;
    clickedBtn.style.backgroundColor = 'var(--blue)';
    clickedBtn.style.color = 'black';

    document.getElementById('start-real-game-btn').disabled = false;
    document.getElementById('start-real-game-btn').style.opacity = '1';
}

// --- Game Control ---
function quitGame() {
    if (confirm("แน่ใจหรือไม่ที่จะยอมแพ้และออกจากเกมนี้?")) {
        stopTimer();
        document.getElementById('game-container').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
        audioManager.playSFX('lose'); // เล่นเสียงแพ้ตอนกดยอมแพ้
        pushLog("💥 คุณได้ยอมแพ้และออกจากเกม", "red");
    }
}

// --- Tutorial System ---
const tutorialSteps = [
    { title: "🎯 ยินดีต้อนรับสู่ Kingdoms of Life!", content: `คุณคือนักชีววิทยาที่แข่งขันยึดครองอาณาจักรสิ่งมีชีวิตกับบอท AI!<br><br>🏆 <b>เป้าหมาย:</b> ยึดครอง <b>3 ใน 5 อาณาจักร</b> ให้ได้ก่อน<br>🔬 5 อาณาจักร: Monera · Protista · Fungi · Plantae · Animalia<br>⚔️ คุณจะแข่งกับ AI บอทที่มีกลยุทธ์ตามระดับความยาก<br><br><i style="color:#94a3b8">กดถัดไปเพื่อเรียนรู้วิธีเล่นทีละขั้น</i>` },
    { title: "🃏 การ์ดสิ่งมีชีวิต (Organism Cards)", content: `ด้านล่างจอคือ <b>มือของคุณ (Hand)</b> — มีการ์ดสิ่งมีชีวิต (กรอบเขียว) และเวทมนตร์ (กรอบน้ำเงิน)<br><br>🟢 <b>วิธีวาง:</b><br>&nbsp;&nbsp;1. คลิกค้างที่การ์ดกรอบเขียว<br>&nbsp;&nbsp;2. ลากไปวางบน Hexagon ในอาณาจักรที่ตรงกับการ์ด<br>&nbsp;&nbsp;3. ปล่อยเมาส์เพื่อวาง<br><br>⚠️ วางผิดอาณาจักร = เสีย 1 AP ทันที! ดูชื่ออาณาจักรบนการ์ดก่อนเสมอ` },
    { title: "❤️ HP และ ⚡ Power — หัวใจของการต่อสู้", content: `การ์ดทุกใบมีค่าสถิติ 2 ตัว:<br><br>❤️ <b>HP (พลังชีวิต)</b><br>&nbsp;&nbsp;• แสดงบน badge ใต้ Hexagon เมื่อวางแล้ว<br>&nbsp;&nbsp;• HP ลดเหลือ 0 → การ์ดถูกทำลาย ช่องว่างลงทันที<br><br>⚡ <b>Power (พลังโจมตี)</b><br>&nbsp;&nbsp;• ค่า Damage เมื่อ Skill หรือ Effect ทำงาน<br>&nbsp;&nbsp;• Power สูง = ทำลายการ์ดศัตรูได้เร็วกว่า` },
    { title: "✨ Skill พิเศษของสิ่งมีชีวิต", content: `การ์ดที่มี <span style="color:var(--gold)">✨ SKILL</span> จะเปิดใช้ทันทีเมื่อวาง:<br><br>💥 <b>damage_bot</b> — โจมตีการ์ดบอทด้วย Power ของตัวเอง<br>🛡️ <b>Shield</b> — ดูดซับ Damage ครั้งแรกอัตโนมัติ<br>💚 <b>Regen HP</b> — HP+1 ทุกสิ้นเทิร์น ตราบที่อยู่บนสนาม<br>⚡+ <b>Regen Power</b> — Power+1 ทุกเทิร์น<br>✨ <b>gain_ap</b> — ได้รับ AP คืนทันทีเมื่อวาง<br><br>Popup จะขึ้นแจ้งทุกครั้ง!` },
    { title: "🔮 เวทมนตร์ (Effect Cards)", content: `การ์ดกรอบน้ำเงินคือ <b>เวทมนตร์</b> — ผลทันทีเมื่อใช้:<br><br>🎮 <b>วิธีใช้:</b> คลิกที่การ์ด → กด "⚡ ร่ายการ์ดนี้"<br><br>ประเภทเวทมนตร์:<br>💥 <b>Damage</b> — โจมตีการ์ดบอทด้วย DMG ที่ระบุ<br>✨ <b>เพิ่ม AP</b> — ได้ AP เพิ่ม (+2 หรือ +3)<br>📖 <b>จั่วการ์ด</b> — เพิ่มการ์ดในมือ<br>🌿 <b>วางเพิ่ม</b> — วางสิ่งมีชีวิตได้เพิ่มอีก 1 ตัวในเทิร์นนี้` },
    { title: "💎 AP (Action Point) — ทรัพยากรสำคัญ", content: `ทุกการกระทำใช้ <b>AP</b> — คุณได้ 3 AP ต่อเทิร์น (Ice Age ให้แค่ 2)<br><br>ค่าใช้จ่าย:<br>🟢 วางสิ่งมีชีวิต 1 ตัว = <b>-1 AP</b><br>🔮 ใช้เวทมนตร์ = <b>-1 AP</b><br>❌ วางผิดอาณาจักร = <b>-1 AP</b> (เสียเปล่า!)<br><br>💡 ใช้เวทมนตร์เพิ่ม AP ก่อน เพื่อวางหลายตัวได้ในเทิร์นเดียว` },
    { title: "🏰 กฎการยึดครองอาณาจักร", content: `การยึดครองอาณาจักรมีเงื่อนไขดังนี้:<br><br>✅ <b>ต้องมีการ์ดฝ่ายเดียวกันอย่างน้อย 2 ใบ</b> ในอาณาจักรนั้น<br>✅ <b>ต้องมีมากกว่าฝ่ายอื่น</b> (Plurality Rule)<br>❌ 1 ใบ = ยังไม่ยึดครอง ต้องเพิ่มอีก!<br>⚖️ มีเท่ากัน = ไม่มีใครยึดครอง<br><br>สี Hexagon: 🟢 เขียว = คุณ | 🟠🟣🔵🩷 = บอทแต่ละตัว` },
    { title: "🌤️ ระบบสภาพอากาศ", content: `สภาพอากาศเปลี่ยนทุก 3 เทิร์น — กล่องตรงกลางบอกว่า อีกกี่เทิร์น:<br><br>🌍 <b>Normal</b> — ปกติ ไม่มีผลพิเศษ<br>☀️ <b>Sunny Day</b> — วาง Plantae ได้ +1 AP<br>🌧️ <b>Monsoon</b> — วาง Fungi/Protista ได้ +1 AP<br>❄️ <b>Ice Age</b> — ได้แค่ 2 AP + การ์ด HP≤2 โดน 1 dmg/เทิร์น<br><br>💡 วางตรงสภาพอากาศ = AP ฟรี!` },
    { title: "🚨 ภัยพิบัติทางธรรมชาติ", content: `ทุกเทิร์นมีโอกาส <b>15%</b> ที่จะเกิดภัยพิบัติสุ่ม:<br><br>🌋 <b>แผ่นดินไหว</b> — 2 dmg การ์ด HP≤3 ทุกอาณาจักร (ทั้งสองฝ่าย!)<br>⚡ <b>พายุฝน</b> — 1 dmg การ์ดใน Plantae/Fungi/Animalia<br>🌋 <b>ภูเขาไฟ</b> — 4 dmg ทุกการ์ดใน Plantae<br>🌵 <b>ภัยแล้ง</b> — 2 dmg ทุกการ์ดใน Fungi/Protista<br>☠️ <b>โรคระบาด</b> — 2 dmg ทุกการ์ดใน Monera/Protista<br><br>⚠️ ภัยพิบัติโจมตีทั้งสองฝ่าย ระวัง HP ต่ำ!` },
    { title: "⏱️ ระบบเวลา & ปุ่มควบคุม", content: `แต่ละเทิร์นมีเวลา <b>30 วินาที</b>:<br><br>⏳ นาฬิกาเปลี่ยนเป็นสีแดงเมื่อเหลือ 10 วินาที<br>🔴 หมดเวลา = จบเทิร์นอัตโนมัติ<br><br>ปุ่มควบคุม:<br>✅ <b>จบเทิร์น</b> — จบทันที ประหยัดเวลา<br>🔄 <b>เปลี่ยนไพ่</b> — ทิ้งทั้งหมด จั่วใหม่ (ข้ามเทิร์น!)<br>📜 <b>ปุ่มประวัติ (📜)</b> — ดูทุกสิ่งที่เกิดขึ้น<br>❌ <b>ปุ่มออก</b> — ยอมแพ้/ออกเกม` },
    { title: "🤖 ระดับความยากของ AI", content: `ตอนเล่นโหมดจริง คุณสามารถเลือกระดับ AI ได้:<br><br>🟢 <b>Easy (ง่าย)</b> — บอทวางสุ่ม ไม่ค่อยใช้ Effect (10%)<br>🟡 <b>Normal (ปานกลาง)</b> — บอทสุ่มอาณาจักร ใช้ Effect 30%<br>🟠 <b>Hard (ยาก)</b> — บอทเลือกอาณาจักรที่เกือบยึด ใช้ Effect 55%<br>🔴 <b>Expert (ผู้เชี่ยวชาญ)</b> — บอทเล่นอย่างเหมาะสมที่สุด ใช้ Effect 75% โจมตีการ์ดผู้เล่นที่อ่อนแอ<br><br>⚠️ Expert ยากมาก — ลองเริ่มที่ Normal ก่อน!` },
    { title: "🧠 กลยุทธ์ขั้นสูง", content: `เคล็ดลับจากผู้เชี่ยวชาญ:<br><br>🎯 เน้นยึด 2-3 อาณาจักรก่อน แทนกระจายทุกอาณาจักร<br>🛡️ Shield ดีมากใน Monera/Protista (HP ต่ำ)<br>💚 Regen HP ดีมากใน Ice Age (ไม่โดนแช่แข็ง)<br>⚡ เวทมนตร์ damage ใช้กับการ์ดบอท HP เหลือน้อย<br>📖 จั่วก่อนวาง เพื่อเลือกการ์ดที่เหมาะที่สุด<br>🌿 การ์ดวางเพิ่ม ใช้ตอนต้องยึด 2 อาณาจักรพร้อมกัน` },
    { title: "🚀 พร้อมแล้ว! ออกรบได้เลย!", content: `ตอนนี้คุณรู้ทุกอย่างแล้ว! สรุปสั้นๆ:<br><br>✅ วางการ์ดให้ถูกอาณาจักร<br>✅ ต้องมี ≥ 2 ใบ และมากกว่าบอท จึงยึดครองได้<br>✅ ใช้ Skill + เวทมนตร์อย่างชาญฉลาด<br>✅ ระวังสภาพอากาศและภัยพิบัติ<br>✅ ยึดครอง 3 อาณาจักร = ชนะ!<br><br><b style="color:var(--gold);font-size:1.1rem">เริ่มต้นเล่นได้เลย! 🧬</b>` }
];
let currentTutorialStep = 0;

function showTutorial() {
    currentTutorialStep = 0;
    updateTutorialUI();
    document.getElementById('tutorial-overlay').classList.remove('hidden');
}

function updateTutorialUI() {
    const step = tutorialSteps[currentTutorialStep];
    document.getElementById('tutorial-title').innerHTML = step.title;
    document.getElementById('tutorial-content').innerHTML = step.content;
    document.getElementById('tutorial-step-counter').innerText = `ขั้นตอนที่ ${currentTutorialStep + 1} / ${tutorialSteps.length}`;

    const btnNext = document.getElementById('tutorial-next-btn');
    if (currentTutorialStep === tutorialSteps.length - 1) {
        btnNext.innerText = "เริ่มต้นเล่น! 🚀";
        btnNext.classList.add('highlight-btn-pulse'); // เพิ่ม effect ถ้ามี
    } else {
        btnNext.innerText = "ถัดไป ➡️";
        btnNext.classList.remove('highlight-btn-pulse');
    }
}

function nextTutorialStep() {
    if (currentTutorialStep < tutorialSteps.length - 1) {
        currentTutorialStep++;
        updateTutorialUI();
    } else {
        document.getElementById('tutorial-overlay').classList.add('hidden');
        audioManager.playSFX('start'); // เริ่มเกมหลัง tutorial
        startTimer(); // เริ่มจับเวลาเกม
    }
}

// ----------------

function startGame(mode = 'tutorial', botCount = 1, difficulty = 'normal') {
    selectedDifficulty = difficulty;
    selectedMode = mode;
    game.botCount = botCount;

    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');
    game = { ap: 3, turnCount: 1, isPlayerTurn: true, pConq: [], botConq: [[], [], [], []], dragData: null, dragEl: null, hasPlayedOrg: false, currentWeather: "Normal", timerInterval: null, timeLeft: 30, botCount: botCount, turnsUntilWeather: 3, history: [] };

    audioManager.playBGM();

    setupDropZones();
    document.getElementById('player-hand').innerHTML = '';
    replenishHand();
    updateWeatherUI();
    updateUI();
    pushLog("🔬 เริ่มการทดลอง! คุณมีเวลา 30 วิ", "blue");

    // ถ้าเป็นโหมดฝึกสอน ให้โชว์ Tutorial ก่อน และยังไม่เดินเวลา
    if (selectedMode === 'tutorial') {
        showTutorial();
    } else {
        audioManager.playSFX('start');
        startTimer();
    }
}

// --- Timer ---
function startTimer() {
    clearInterval(game.timerInterval);
    game.timeLeft = 30; // ตั้งเวลา 30 วิ

    const timerText = document.getElementById('time-left');
    const timerBox = document.getElementById('timer-box');

    // รีเซ็ตหน้าตาตอนเริ่มเทิร์นใหม่
    timerText.innerText = game.timeLeft;
    timerBox.classList.remove('timer-danger');
    timerBox.style.display = "block";

    game.timerInterval = setInterval(() => {
        game.timeLeft--;
        timerText.innerText = game.timeLeft;

        // 🌟 1. เมื่อเวลาเหลือ 10 วินาที ให้กรอบแดงกระพริบ
        if (game.timeLeft <= 10) {
            timerBox.classList.add('timer-danger');
        }

        // 🌟 2. ล็อคให้เสียงติ๊กดังเฉพาะวินาทีที่ 10 ถึง 1 เท่านั้น (ไม่ให้เกินแน่นอน)
        if (game.timeLeft <= 10 && game.timeLeft > 0) {
            if (typeof audioManager !== 'undefined') {
                audioManager.playSFX('tick');
            }
        }

        // 🌟 3. เมื่อเวลาหมด (0 วิ)
        if (game.timeLeft <= 0) {
            clearInterval(game.timerInterval); // หยุดเวลาทันที

            if (typeof audioManager !== 'undefined') {
                audioManager.playSFX('error'); // เปลี่ยนเป็นเสียงออดเตือนหมดเวลาแทน
            }

            pushLog("⏳ หมดเวลา! ถูกบังคับจบเทิร์น", "red");
            endTurn();
        }
    }, 1000);
}

function stopTimer() {
    clearInterval(game.timerInterval);
    document.getElementById('timer-box').style.display = "none";
    // หยุดเสียง tick ทันทีเมื่อจบเทิร์น / หยุดเวลา
    if (typeof audioManager !== 'undefined' && audioManager.sfx['tick']) {
        audioManager.sfx['tick'].pause();
        audioManager.sfx['tick'].currentTime = 0;
    }
}

// --- Hand & Deck ---
function replenishHand() {
    const hand = document.getElementById('player-hand');
    const orgs = hand.querySelectorAll('.card.organism').length;
    const effs = hand.querySelectorAll('.card.effect').length;
    for (let i = orgs; i < 2; i++) drawCard(orgData, false);
    for (let i = effs; i < 2; i++) drawCard(effData, true);
}
function drawCard(deck, isEffect) {
    const data = deck[Math.floor(Math.random() * deck.length)];
    document.getElementById('player-hand').appendChild(createCard(data, isEffect));
}
function resetHand() {
    if (!game.isPlayerTurn) return;
    document.getElementById('player-hand').innerHTML = '';
    replenishHand();
    pushLog("🔄 สละเทิร์นเพื่อเปลี่ยนไพ่!", "gold");
    pushHistory('player', '🔄 เปลี่ยนไพ่ทั้งหมด');
    endTurn();
}

// --- Touch Drag Ghost ---
let touchGhost = null;
function createTouchGhost(card) {
    const ghost = card.cloneNode(true);
    ghost.id = 'touch-ghost';
    ghost.style.cssText = `position:fixed;pointer-events:none;z-index:9999;width:90px;height:130px;opacity:0.85;border-radius:8px;transition:none;transform:translate(-50%,-50%) scale(1.15);box-shadow:0 15px 35px rgba(0,0,0,0.6);`;
    document.body.appendChild(ghost);
    return ghost;
}
function removeTouchGhost() {
    const g = document.getElementById('touch-ghost');
    if (g) g.remove();
    touchGhost = null;
}

// --- Selected card state (tap-to-select for touch) ---
let selectedCardEl = null;
let selectedCardData = null;
let touchDragActive = false;
let touchStartX = 0;
let touchStartY = 0;
const TOUCH_DRAG_THRESHOLD = 8; // px before we treat as drag vs tap

function clearSelectedCard() {
    if (selectedCardEl) {
        selectedCardEl.classList.remove('card-selected');
        selectedCardEl = null;
        selectedCardData = null;
    }
    document.querySelectorAll('.kingdom-zone').forEach(z => z.classList.remove('zone-selectable'));
}

function setupDropZones() {
    const zones = document.querySelectorAll('.kingdom-zone');
    zones.forEach(zone => {
        const slots = zone.querySelector('.slots');
        slots.innerHTML = '';
        for (let i = 0; i < 5; i++) {
            const s = document.createElement('div');
            s.className = 'slot';
            slots.appendChild(s);
        }
        // Mouse drag-and-drop (Desktop)
        zone.addEventListener('dragover', (e) => { e.preventDefault(); if (game.isPlayerTurn && game.ap > 0) zone.classList.add('drag-over'); });
        zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
        zone.addEventListener('drop', (e) => { e.preventDefault(); zone.classList.remove('drag-over'); handleOrganismDrop(zone.id); });
        // Tap-to-place (Mobile tap on zone when a card is selected)
        zone.addEventListener('click', (e) => {
            if (selectedCardData && selectedCardEl && game.isPlayerTurn && game.ap > 0) {
                e.stopPropagation();
                game.dragData = selectedCardData;
                game.dragEl = selectedCardEl;
                handleOrganismDrop(zone.id);
                clearSelectedCard();
            }
        });
    });
    // Tap anywhere else → deselect
    document.addEventListener('click', (e) => {
        if (selectedCardEl && !e.target.closest('#player-hand')) {
            clearSelectedCard();
        }
    }, true);
}

// --- Card Engine & Inspector ---
function createCard(data, isEffect) {
    const card = document.createElement('div');
    card.className = `card ${isEffect ? 'effect' : 'organism'}`;
    card._data = data; // store reference for skill lookups

    if (isEffect) {
        const pwrLabel = (data.power > 0) ? `<span style="color:var(--red);font-size:9px">DMG: ${data.power}</span>` : '';
        card.innerHTML = `<div class="card-name">${data.name}</div><div class="card-desc">${data.description || data.desc}</div>${pwrLabel}
            <button class="btn-use-mobile" onclick="event.stopPropagation();useMobileEffect(this)" style="display:none">⚡ ใช้</button>`;
        card._effectData = data;
    } else {
        const bg = data.image ? `background-image:url('${data.image}')` : '';
        const skillBadge = (data.action && data.action !== 'none') ? `<span class="skill-badge">✨ SKILL</span>` : '';
        card.innerHTML = `<div class="card-img" style="${bg}"></div><div class="card-name">${data.name}</div>
                          ${skillBadge}
                          <div class="card-stats"><span class="hp-display">❤️<span class="hp-current">${data.hp}</span></span><span>⚡${data.power}</span></div>`;
        card.draggable = true;

        // ── Desktop: HTML5 drag-and-drop ──
        card.addEventListener('dragstart', (e) => {
            if (!game.isPlayerTurn || game.ap <= 0) { e.preventDefault(); return; }
            clearSelectedCard();
            game.dragData = data; game.dragEl = card;
            setTimeout(() => card.classList.add('dragging'), 0);
        });
        card.addEventListener('dragend', () => { card.classList.remove('dragging'); });

        // ── Mobile: Touch drag-and-drop ──
        card.addEventListener('touchstart', (e) => {
            if (!game.isPlayerTurn || game.ap <= 0) return;
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchDragActive = false;
        }, { passive: true });

        card.addEventListener('touchmove', (e) => {
            if (!game.isPlayerTurn || game.ap <= 0) return;
            const dx = e.touches[0].clientX - touchStartX;
            const dy = e.touches[0].clientY - touchStartY;
            if (!touchDragActive && Math.sqrt(dx * dx + dy * dy) > TOUCH_DRAG_THRESHOLD) {
                touchDragActive = true;
                clearSelectedCard();
                game.dragData = data; game.dragEl = card;
                card.classList.add('dragging');
                touchGhost = createTouchGhost(card);
            }
            if (touchDragActive) {
                e.preventDefault();
                if (touchGhost) {
                    touchGhost.style.left = e.touches[0].clientX + 'px';
                    touchGhost.style.top = e.touches[0].clientY + 'px';
                }
                // Highlight zone under finger
                document.querySelectorAll('.kingdom-zone').forEach(z => z.classList.remove('drag-over'));
                const el = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
                const zone = el ? el.closest('.kingdom-zone') : null;
                if (zone && game.ap > 0) zone.classList.add('drag-over');
            }
        }, { passive: false });

        card.addEventListener('touchend', (e) => {
            card.classList.remove('dragging');
            if (touchDragActive) {
                // Drop on zone under finger
                const touch = e.changedTouches[0];
                removeTouchGhost();
                document.querySelectorAll('.kingdom-zone').forEach(z => z.classList.remove('drag-over'));
                const el = document.elementFromPoint(touch.clientX, touch.clientY);
                const zone = el ? el.closest('.kingdom-zone') : null;
                if (zone && game.dragData && game.dragEl) {
                    handleOrganismDrop(zone.id);
                }
                game.dragData = null; game.dragEl = null;
                touchDragActive = false;
            } else {
                // Treat as TAP → select card for tap-to-place
                const isInHand = card.closest('#player-hand') !== null;
                if (isInHand && game.isPlayerTurn && game.ap > 0) {
                    e.preventDefault();
                    if (selectedCardEl === card) {
                        clearSelectedCard();
                    } else {
                        clearSelectedCard();
                        selectedCardEl = card;
                        selectedCardData = data;
                        game.dragData = data; game.dragEl = card;
                        card.classList.add('card-selected');
                        // Highlight all zones as tappable
                        document.querySelectorAll('.kingdom-zone').forEach(z => z.classList.add('zone-selectable'));
                        showMobilePlaceHint();
                    }
                }
            }
        });
    }

    // Click handler — only fires on desktop (touch uses touchend above)
    card.addEventListener('click', (e) => {
        // On touch devices, only open card info if not doing tap-to-select
        if (touchDragActive) return;
        const isInHand = card.closest('#player-hand') !== null;
        if (!isInHand || isEffect) {
            openCardInfo(data, isEffect, isInHand, card);
        }
    });

    return card;
}

function showMobilePlaceHint() {
    let hint = document.getElementById('mobile-place-hint');
    if (!hint) {
        hint = document.createElement('div');
        hint.id = 'mobile-place-hint';
        hint.style.cssText = `position:fixed;bottom:200px;left:50%;transform:translateX(-50%);background:rgba(0,210,255,0.92);color:#020617;padding:10px 22px;border-radius:30px;font-weight:bold;font-size:15px;z-index:8000;pointer-events:none;animation:popIn 0.3s;box-shadow:0 4px 20px rgba(0,210,255,0.5);`;
        hint.textContent = '👆 แตะที่อาณาจักรเพื่อวางการ์ด';
        document.body.appendChild(hint);
    }
    hint.style.display = 'block';
    clearTimeout(hint._t);
    hint._t = setTimeout(() => { if (hint) hint.style.display = 'none'; }, 3000);
}

function useMobileEffect(btn) {
    const card = btn.closest('.card');
    if (!card || !card._effectData || !game.isPlayerTurn || game.ap <= 0) return;
    const data = card._effectData;
    pushLog(`⚡ ร่ายเอฟเฟค: ${data.name}! (DMG: ${data.power || 0})`, 'blue');
    audioManager.playSFX('effect');
    game.ap--; card.remove(); triggerScreenFlash();
    executeSkill(data.action, data);
    updateUI();
}

function openCardInfo(data, isEffect, isInHand, cardElement) {
    const modal = document.getElementById('card-info-modal');
    document.getElementById('info-title').innerText = data.name;
    document.getElementById('info-desc').innerText = data.description || data.desc || "ไม่มีข้อมูลพิเศษ";

    const showcase = document.getElementById('info-visual');
    const statsBox = document.getElementById('info-stats');
    const btnUse = document.getElementById('btn-use-effect');

    if (isEffect) {
        document.getElementById('info-type').innerText = "⚡ MAGIC CARD";
        document.getElementById('info-type').style.color = "var(--gold)";
        showcase.style.backgroundImage = 'none';
        showcase.style.border = "3px dashed var(--blue)";
        statsBox.classList.add('hidden');

        if (isInHand && game.isPlayerTurn && game.ap > 0) {
            btnUse.classList.remove('hidden');
            btnUse.onclick = () => {
                closeCardInfo();
                pushLog(`⚡ ร่ายเอฟเฟค: ${data.name}! (DMG: ${data.power || 0})`, "blue");
                audioManager.playSFX('effect');
                game.ap--; cardElement.remove(); triggerScreenFlash();
                executeSkill(data.action, data); // ส่ง sourceData เพื่อใช้ power
                updateUI();
            };
        } else { btnUse.classList.add('hidden'); }
    } else {
        document.getElementById('info-type').innerText = "🧬 ORGANISM CARD";
        document.getElementById('info-type').style.color = "var(--green)";
        showcase.style.backgroundImage = data.image ? `url('${data.image}')` : 'none';
        showcase.style.border = "3px solid var(--green)";
        statsBox.classList.remove('hidden');

        // อ่าน HP/Power ปัจจุบันจาก slot ถ้าการ์ดวางบนกระดานแล้ว
        const parentSlot = cardElement ? cardElement.closest('.slot') : null;
        const currentHp = parentSlot ? (parseInt(parentSlot.dataset.hp) ?? data.hp) : data.hp;
        const currentPow = parentSlot ? (parseInt(parentSlot.dataset.power) ?? data.power) : data.power;
        const shieldTxt = parentSlot && parentSlot.dataset.shielded === '1' ? '  🛡️ Shield' : '';
        const regenTxt = parentSlot && parentSlot.dataset.regen === '1' ? '  💚 Regen HP' : '';
        const pwrRegen = parentSlot && parentSlot.dataset.powerRegen === '1' ? '  ⚡+ Regen POW' : '';
        statsBox.innerHTML = `<b>❤️ HP: ${currentHp}</b> | <b>⚡ POW: ${currentPow}</b>${shieldTxt}${regenTxt}${pwrRegen}`;

        btnUse.classList.add('hidden');
    }
    modal.classList.remove('hidden');
}

function closeCardInfo() { document.getElementById('card-info-modal').classList.add('hidden'); }

// --- Board Logic & Evolution ---
function handleOrganismDrop(targetKingdomId) {
    const data = game.dragData; const cardEl = game.dragEl;
    if (!data || !cardEl || !game.isPlayerTurn) return;

    if (game.hasPlayedOrg) { pushLog(`⚠️ ลงสิ่งมีชีวิตได้แค่เทิร์นละ 1 ตัว!`, "red"); return; }
    const zone = document.getElementById(targetKingdomId);

    if (data.kingdom === targetKingdomId) {
        const emptySlot = Array.from(zone.querySelectorAll('.slot')).find(s => s.children.length === 0);
        if (emptySlot) {
            emptySlot.appendChild(cardEl);
            emptySlot.dataset.owner = 'player';
            emptySlot.dataset.hp = data.hp;
            emptySlot.dataset.power = data.power;
            if (data.action === 'shield_1') emptySlot.dataset.shielded = '1';
            if (data.action === 'regen_hp') emptySlot.dataset.regen = '1';
            if (data.action === 'regen_power') emptySlot.dataset.powerRegen = '1';
            emptySlot.classList.add('slot-player');
            cardEl.draggable = false; cardEl.classList.remove('organism'); cardEl.classList.add('placed');
            cardEl.style.borderColor = '#39ff14';
            game.ap--; game.hasPlayedOrg = true;
            updateSlotBadge(emptySlot); // แสดง badge HP/POW บน hexagon

            audioManager.playSFX('place');
            pushLog(`✅ ${data.name} ลงสู่ ${targetKingdomId}`, "green");
            pushHistory('player', `✅ วาง ${data.name} ใน ${targetKingdomId} (HP:${data.hp} POW:${data.power})`);

            unlockCard(data.id);
            // ยิง Skill พิเศษ (พร้อม popup)
            if (data.action && data.action !== 'none' && data.action !== 'shield_1' && data.action !== 'regen_hp') {
                showSkillPopup(data);
                executeSkill(data.action, data);
            } else if (data.action === 'shield_1') {
                showSkillPopup(data, '🛡️ Shield ใช้งาน! ดูดซับ Damage ครั้งแรก');
            } else if (data.action === 'regen_hp') {
                showSkillPopup(data, '💚 Regen ใช้งาน! HP +1 ทุกเทิร์น');
            }
            applyWeatherEffect(targetKingdomId);
            checkConquest(targetKingdomId);
            updateUI();
        } else { pushLog(`⚠️ ${targetKingdomId} ไม่มีที่ว่างแล้ว!`, "red"); }
    } else {
        zone.classList.add('zone-error'); setTimeout(() => zone.classList.remove('zone-error'), 400);
        audioManager.playSFX('error'); // เสียงเออเร่อ
        game.ap--; updateUI(); pushLog(`❌ ผิดอาณาจักร! (เสีย 1 AP)`, "red");
    }
}

function checkEvolution(kingdomId) {
    checkConquest(kingdomId);
}

// --- ล้าง slot เมื่อการ์ดถูกทำลาย ---
const SLOT_CLASSES = ['slot-player', 'slot-bot-1', 'slot-bot-2', 'slot-bot-3', 'slot-bot-4'];
function clearSlot(cardEl) {
    const slot = cardEl ? cardEl.parentElement : null;
    if (cardEl) cardEl.remove();
    if (slot && slot.classList.contains('slot')) {
        delete slot.dataset.owner; delete slot.dataset.hp; delete slot.dataset.power;
        delete slot.dataset.shielded; delete slot.dataset.regen; delete slot.dataset.powerRegen;
        slot.classList.remove(...SLOT_CLASSES);
        const badge = slot.querySelector('.slot-badge');
        if (badge) badge.remove();
    }
}

// --- Slot stat badge: always-visible HP/POW overlay on the hexagon ---
function updateSlotBadge(slot) {
    if (!slot || !slot.dataset.owner) return;
    let badge = slot.querySelector('.slot-badge');
    if (!badge) {
        badge = document.createElement('div');
        badge.className = 'slot-badge';
        slot.appendChild(badge);
    }
    const hp = parseInt(slot.dataset.hp) || 0;
    const pow = parseInt(slot.dataset.power) || 0;
    const shieldIcon = slot.dataset.shielded === '1' ? '🛡️' : '';
    const regenIcon = slot.dataset.regen === '1' ? '💚' : '';
    const powRegenIcon = slot.dataset.powerRegen === '1' ? '⚡+' : '';
    badge.innerHTML = `<span class="sb-hp">❤️${hp}</span><span class="sb-pow">⚡${pow}</span>${shieldIcon}${regenIcon}${powRegenIcon}`;
}

// --- ดีล Damage ให้การ์ดใน slot (ตรวจ shield, อัปเดต HP badge, ทำลายถ้า HP≤0) ---
function damageSlotCard(slot, dmg) {
    if (!slot || slot.children.length === 0) return false;
    // Shield ดูดซับ damage ครั้งแรก
    if (slot.dataset.shielded === '1') {
        slot.dataset.shielded = '0';
        updateSlotBadge(slot);
        showFloatingText(slot, '🛡️ BLOCK!', '#94a3b8');
        pushLog(`🛡️ Shield ดูดซับ ${dmg} dmg!`, 'blue');
        return false;
    }
    let hp = parseInt(slot.dataset.hp) || 0;
    hp = Math.max(0, hp - dmg);
    slot.dataset.hp = hp;
    updateSlotBadge(slot); // อัปเดต badge
    showFloatingText(slot, `-${dmg}`, '#ff4444');
    if (hp <= 0) {
        const cardEl = slot.firstElementChild;
        const zoneEl = slot.closest('.kingdom-zone');
        if (cardEl && !cardEl.classList.contains('slot-badge')) clearSlot(cardEl);
        if (zoneEl) recalculateConquest(zoneEl.id);
        return true;
    }
    return false;
}

// Floating damage text helper
function showFloatingText(slot, text, color) {
    const rect = slot.getBoundingClientRect();
    const el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = `position:fixed;left:${rect.left + rect.width / 2}px;top:${rect.top}px;
        color:${color};font-weight:bold;font-size:1rem;pointer-events:none;z-index:9999;
        animation:floatUp 1s ease-out forwards;transform:translateX(-50%)`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

// Skill activation popup
function showSkillPopup(data, customMsg) {
    const msg = customMsg || `✨ ${data.name} — ${data.description || data.desc || ''}`;
    const popup = document.createElement('div');
    popup.className = 'skill-popup';
    popup.innerHTML = msg;
    document.getElementById('game-container').appendChild(popup);
    setTimeout(() => popup.remove(), 2200);
}

// --- dealDamage helpers ---
function dealDamageToBot(target, dmg, sourceName) {
    const KINGDOMS = ["Monera", "Protista", "Fungi", "Plantae", "Animalia"];
    let kId;
    if (target === 'random') {
        const withBots = KINGDOMS.filter(k => Array.from(document.getElementById(k).querySelectorAll('.slot'))
            .some(s => s.dataset.owner && s.dataset.owner !== 'player'));
        if (!withBots.length) { pushLog(`💨 วืด! ไม่มีเป้าหมาย`, 'blue'); return; }
        kId = withBots[Math.floor(Math.random() * withBots.length)];
    } else {
        kId = target.charAt(0).toUpperCase() + target.slice(1);
    }
    const zone = document.getElementById(kId);
    const botSlots = Array.from(zone.querySelectorAll('.slot'))
        .filter(s => s.dataset.owner && s.dataset.owner !== 'player' && s.children.length > 0);
    if (!botSlots.length) { pushLog(`💨 วืด! ไม่มีเป้าหมายใน ${kId}`, 'blue'); return; }
    // โจมตีการ์ด HP ต่ำสุด
    const t = botSlots.reduce((a, b) => parseInt(a.dataset.hp || 99) <= parseInt(b.dataset.hp || 99) ? a : b);
    const destroyed = damageSlotCard(t, dmg);
    pushLog(`💥 ${sourceName || 'skill'} ดีล ${dmg} dmg ใน ${kId}${destroyed ? ' — ทำลายแล้ว!' : ''}`, 'blue');
}

function dealDamageAllBotKingdom(kId, dmg, sourceName) {
    const zone = document.getElementById(kId);
    const botSlots = Array.from(zone.querySelectorAll('.slot'))
        .filter(s => s.dataset.owner && s.dataset.owner !== 'player' && s.children.length > 0);
    if (!botSlots.length) { pushLog(`💨 ไม่มีเป้าหมายใน ${kId}`, 'blue'); return; }
    let killed = 0;
    botSlots.forEach(s => { if (damageSlotCard(s, dmg)) killed++; });
    pushLog(`🔥 ${sourceName} ดีล ${dmg} dmg ทุกการ์ดใน ${kId}${killed ? ` ทำลาย ${killed} ใบ` : ''}`, 'red');
}

// --- Skill & Weather Execution ---
function executeSkill(action, sourceData) {
    if (!action || action === 'none') return;
    const dmg = (sourceData && sourceData.power) ? sourceData.power : 1;
    const name = sourceData ? sourceData.name : 'Skill';

    if (action === 'gain_ap_1') { game.ap += 1; pushLog(`✨ +1 AP (${name})`, 'green'); }
    else if (action === 'gain_ap_2') { game.ap += 2; pushLog(`✨ +2 AP (${name})`, 'green'); }
    else if (action === 'gain_ap_3') { game.ap += 3; pushLog(`✨ +3 AP (${name})`, 'green'); }
    else if (action === 'regen_hp' || action === 'shield_1' || action === 'regen_power') { /* handled on placement & end-of-turn */ }
    else if (action === 'boost_hp_1') {
        // เพิ่ม HP ของการ์ดที่เพิ่งวาง
        const justPlaced = document.querySelector('.slot-player:last-of-type');
        if (justPlaced && justPlaced.dataset.hp) {
            justPlaced.dataset.hp = parseInt(justPlaced.dataset.hp) + 1;
            updateSlotBadge(justPlaced);
            showFloatingText(justPlaced, '+1 HP!', '#39ff14');
        }
    }
    else if (action === 'boost_power_1') {
        // เพิ่ม Power ของการ์ดที่เพิ่งวาง
        const justPlaced = document.querySelector('.slot-player:last-of-type');
        if (justPlaced && justPlaced.dataset.power) {
            justPlaced.dataset.power = parseInt(justPlaced.dataset.power) + 1;
            updateSlotBadge(justPlaced);
            showFloatingText(justPlaced, '+1 POW!', '#fbbf24');
        }
    }
    else if (action === 'draw_org_1') {
        drawCard(orgData, false);
        pushLog(`📖 จั่วสิ่งมีชีวิต 1 ใบ! (${name})`, 'green');
    }
    else if (action === 'draw_org_2') {
        drawCard(orgData, false); drawCard(orgData, false);
        pushLog(`📖 จั่วสิ่งมีชีวิต 2 ใบ! (${name})`, 'green');
    }
    else if (action === 'draw_eff_1') {
        drawCard(effData, true);
        pushLog(`📖 จั่วเวทมนตร์ 1 ใบ! (${name})`, 'blue');
    }
    else if (action === 'draw_combo') {
        drawCard(orgData, false); drawCard(effData, true);
        pushLog(`📖 จั่วสิ่งมีชีวิต + เวทมนตร์! (${name})`, 'blue');
    }
    else if (action === 'extra_org_play') {
        game.hasPlayedOrg = false; // allow placing one more organism
        pushLog(`🌿 วางสิ่งมีชีวิตได้เพิ่มอีก 1 ตัว! (${name})`, 'green');
        showSkillPopup({ name, desc: 'วางสิ่งมีชีวิตเพิ่มได้อีก 1 ตัวในเทิร์นนี้' });
    }
    else if (action === 'extra_org_and_draw') {
        game.hasPlayedOrg = false;
        drawCard(orgData, false);
        pushLog(`🌿 วางเพิ่ม 1 ตัว + จั่ว 1 ใบ! (${name})`, 'green');
        showSkillPopup({ name, desc: 'วางสิ่งมีชีวิตเพิ่ม 1 ตัว และจั่วการ์ดสิ่งมีชีวิต 1 ใบ' });
    }
    else if (action.startsWith('damage_bot_')) {
        const tgt = action.replace('damage_bot_', '');
        dealDamageToBot(tgt, dmg, name);
    }
    else if (action === 'extra_org_draw2') {
        game.hasPlayedOrg = false;
        drawCard(orgData, false); drawCard(orgData, false);
        pushLog(`🌿 วางเพิ่ม 1 ตัว + จั่ว 2 ใบ! (${name})`, 'green');
        showSkillPopup({ name, desc: 'วางเพิ่ม 1 ตัว และจั่วสิ่งมีชีวิต 2 ใบ' });
    }
    else if (action === 'damage_all_plantae') {
        dealDamageAllBotKingdom('Plantae', dmg, name);
    }
    // legacy fallback
    else if (action.startsWith('destroy_bot_')) {
        const tgt = action.replace('destroy_bot_', '');
        dealDamageToBot(tgt, 99, name);
    }
}

function applyWeatherEffect(kingdomId) {
    if (game.currentWeather === 'Sunny Day' && kingdomId === 'Plantae') {
        game.ap++; pushLog('☀️ Sunny Day: Plantae +1 AP!', 'gold');
    } else if (game.currentWeather === 'Monsoon' && (kingdomId === 'Fungi' || kingdomId === 'Protista')) {
        game.ap++; pushLog('🌧️ Monsoon: น้ำหล่อเลี้ยง +1 AP!', 'blue');
    } else if (game.currentWeather === 'Ice Age') {
        pushLog('❄️ Ice Age: การ์ด HP ต่ำเสี่ยงถูกแช่แข็ง!', 'blue');
    }
}

// ❄️ Ice Age กระทบการ์ด HP≤2 ทุกเทิร์น + Regen tick
function applyEndOfTurnEffects() {
    document.querySelectorAll('.slot').forEach(slot => {
        if (!slot.dataset.owner) return;
        // Regen HP
        if (slot.dataset.regen === '1') {
            let hp = parseInt(slot.dataset.hp) || 0;
            hp++;
            slot.dataset.hp = hp;
            updateSlotBadge(slot); // badge บน hexagon อัปเดตทันที
            showFloatingText(slot, '+1 HP 💚', '#39ff14');
        }
        // Regen Power
        if (slot.dataset.powerRegen === '1') {
            let pow = parseInt(slot.dataset.power) || 0;
            pow++;
            slot.dataset.power = pow;
            updateSlotBadge(slot);
            showFloatingText(slot, '+1 POW ⚡', '#fbbf24');
        }
    });
    // Ice Age: ดีล 1 dmg การ์ด HP≤2 ของบอท
    if (game.currentWeather === 'Ice Age') {
        document.querySelectorAll('.slot').forEach(slot => {
            if (slot.dataset.owner && slot.dataset.owner !== 'player' && parseInt(slot.dataset.hp) <= 2) {
                damageSlotCard(slot, 1);
            }
        });
    }
}

// --- ภัยพิบัติทางธรรมชาติ (Natural Disasters) ---
const DISASTERS = [
    {
        id: 'earthquake', name: '🌋 แผ่นดินไหว',
        desc: 'แรงสั่นสะเทือน เดีย 2 dmg การ์ด HP ต่ำทุกอาณาจักร (ทั้งผู้เล่นและบอท)',
        apply() {
            const KINGDOMS = ['Monera', 'Protista', 'Fungi', 'Plantae', 'Animalia'];
            KINGDOMS.forEach(k => {
                document.getElementById(k).querySelectorAll('.slot').forEach(slot => {
                    if (slot.dataset.owner && parseInt(slot.dataset.hp) <= 3) damageSlotCard(slot, 2);
                });
            });
            pushHistory('weather', '🌋 แผ่นดินไหวเดีย 2 dmg การ์ด HP≤3 ทุกอาณาจักร');
        }
    },
    {
        id: 'storm', name: '⚡ พายุฝน',
        desc: 'พืชด ตัธยด และตัวสัตว์ขนาดเล็กโดนสุด 1 dmg ทุกอาณาจักร',
        apply() {
            ['Plantae', 'Fungi', 'Animalia'].forEach(k => {
                document.getElementById(k).querySelectorAll('.slot').forEach(slot => {
                    if (slot.dataset.owner) damageSlotCard(slot, 1);
                });
            });
            pushHistory('weather', '⚡ พายุฝนเดีย 1 dmg พืช/เห็ด/สัตว์ ทุกอาณาจักร');
        }
    },
    {
        id: 'volcano', name: '🌋 ภูเขาไฟระเบิด',
        desc: 'ลาวา๒ไหล๒ ทำลายทุกการ์ดใน Plantae (4 dmg)',
        apply() {
            dealDamageAllBotKingdom('Plantae', 4, '🌋 Volcano');
            document.getElementById('Plantae').querySelectorAll('.slot').forEach(s => {
                if (s.dataset.owner === 'player') damageSlotCard(s, 4);
            });
            pushHistory('weather', '🌋 ภูเขาไฟระเบิด ทำลายการ์ด Plantae ทั้งหมด');
        }
    },
    {
        id: 'drought', name: '🌵 ภัยแล้ง',
        desc: 'ความแห้งแล้งกระทบ Fungi และ Protista (2 dmg ทุกการ์ด)',
        apply() {
            ['Fungi', 'Protista'].forEach(k => {
                document.getElementById(k).querySelectorAll('.slot').forEach(slot => {
                    if (slot.dataset.owner) damageSlotCard(slot, 2);
                });
            });
            pushHistory('weather', '🌵 ภัยแล้งเดีย 2 dmg Fungi/Protista ทุกการ์ด');
        }
    },
    {
        id: 'pandemic', name: '☠️ มหันตรายระบาด',
        desc: 'โรคระบาดกระทบ Monera และ Protista (2 dmg)',
        apply() {
            ['Monera', 'Protista'].forEach(k => {
                document.getElementById(k).querySelectorAll('.slot').forEach(slot => {
                    if (slot.dataset.owner) damageSlotCard(slot, 2);
                });
            });
            pushHistory('weather', '☠️ มหันตรายระบาดเดีย 2 dmg Monera/Protista ทุกการ์ด');
        }
    }
];

function maybeTriggerDisaster() {
    if (Math.random() > 0.15) return; // 15% chance per bot turn
    const d = DISASTERS[Math.floor(Math.random() * DISASTERS.length)];
    pushLog(`🚨 ภัยพิบัติ! ${d.name} — ${d.desc}`, 'red');
    triggerScreenFlash();
    showSkillPopup({ name: d.name, desc: d.desc });
    d.apply();
    // Recalculate all kingdoms after disaster
    ['Monera', 'Protista', 'Fungi', 'Plantae', 'Animalia'].forEach(k => recalculateConquest(k));
}

// --- Win Condition ---
// Recalculate who controls a kingdom after a card is removed
function recalculateConquest(kingdomId) {
    checkConquest(kingdomId);
    updateUI();
}

// Count cards per faction in a kingdom, award control to plurality leader
function checkConquest(kId) {
    const zone = document.getElementById(kId);
    const slots = Array.from(zone.querySelectorAll('.slot'));

    // Tally cards per faction using data-owner (ownership tracking)
    let counts = { player: 0 };
    for (let b = 1; b <= 4; b++) counts[`bot${b}`] = 0;
    slots.forEach(slot => {
        const owner = slot.dataset.owner;
        if (owner === 'player') counts.player++;
        else if (owner) counts[owner] = (counts[owner] || 0) + 1;
    });

    // Plurality+: find faction with strictly the most cards AND at least 2
    let controller = null;
    let topCount = 0;
    let tied = false;
    for (const [faction, count] of Object.entries(counts)) {
        if (count > topCount) { topCount = count; controller = faction; tied = false; }
        else if (count === topCount && count > 0) { tied = true; }
    }
    // ต้องมี ≥ 2 ใบถึงจะยึดครองได้, และต้องไม่เพี (tied)
    if (tied || topCount < 2) controller = null;

    // Update conquest lists
    game.pConq = game.pConq.filter(k => k !== kId);
    for (let b = 0; b < 4; b++) {
        if (game.botConq[b]) game.botConq[b] = game.botConq[b].filter(k => k !== kId);
    }

    // Apply kingdom zone border color (shows overall controller, individual hexes keep their own color)
    if (controller === 'player') {
        game.pConq.push(kId);
        zone.style.borderColor = '#39ff14';
        zone.style.boxShadow = '0 0 32px rgba(57,255,20,0.65), inset 0 0 0 1px rgba(57,255,20,0.35)';
        pushLog(`🟢 คุณยึดครอง ${kId} แล้ว! (${game.pConq.length}/3)`, 'green');
    } else if (controller && controller.startsWith('bot')) {
        const botIdx = parseInt(controller.replace('bot', '')) - 1;
        game.botConq[botIdx].push(kId);
        const c = BOT_COLORS[botIdx];
        zone.style.borderColor = c;
        zone.style.boxShadow = `0 0 32px ${c}aa, inset 0 0 0 1px ${c}55`;
        pushLog(`⚠️ ${BOT_LABELS[botIdx]} ยึดครอง ${kId}! (${game.botConq[botIdx].length}/3)`, 'red');
    } else {
        zone.style.borderColor = 'rgba(255,255,255,0.76)';
        zone.style.boxShadow = 'inset 0 0 0 1px rgba(255,255,255,0.12), 0 10px 22px rgba(0,0,0,0.12)';
    }

    checkGameOverCondition();
}

// First faction to control 3 kingdoms wins
function checkGameOverCondition() {
    const winTxt = document.getElementById('winner-text');

    if (game.pConq.length >= 3) {
        stopTimer();
        winTxt.innerText = '🏆 คุณยึดครองได้ 3 อาณาจักร — ชัยชนะเป็นของคุณ!';
        winTxt.style.color = '#39ff14';
        audioManager.playSFX('win');
        document.getElementById('game-over').classList.remove('hidden');
        return true;
    }

    for (let b = 0; b < 4; b++) {
        if ((game.botConq[b] || []).length >= 3) {
            stopTimer();
            winTxt.innerText = `💀 ${BOT_LABELS[b]} ยึดครองได้ 3 อาณาจักร — คุณพ่ายแพ้!`;
            winTxt.style.color = BOT_COLORS[b];
            audioManager.playSFX('lose');
            document.getElementById('game-over').classList.remove('hidden');
            return true;
        }
    }
    return false;
}

// --- Bot Turn ---
function endTurn() {
    if (!game.isPlayerTurn) return;
    stopTimer();
    game.isPlayerTurn = false; game.ap = 0;
    updateUI(); pushLog("🤖 บอทกำลังแทรกแซง...", "blue");
    setTimeout(executeBotTurn, 1000);
}

async function executeBotTurn() {
    await new Promise(r => setTimeout(r, 1000));

    // วนลูปตามจำนวนบอท
    const botCountToPlay = game.botCount || 1;

    for (let i = 0; i < botCountToPlay; i++) {
        if (checkGameOverCondition()) return; // ถ้าจบเกมแล้วออกลูปเลย

        // 1. โอกาสที่บอทจะใช้การ์ดเอฟเฟค ตามระดับความยาก
        const aiLevel = AI_LEVELS[selectedDifficulty] || AI_LEVELS.normal;
        if (Math.random() < aiLevel.effectChance) {
            // บอทชอบใช้ effect ที่โจมตีผู้เล่น — สุ่มเลือก effect ที่กระทบผู้เล่น
            const damageEffects = effData.filter(e => e.action.startsWith('damage_') || e.action.startsWith('destroy_'));
            const pool = damageEffects.length > 0 ? damageEffects : effData;
            const randomEffect = pool[Math.floor(Math.random() * pool.length)];
            pushLog(`${['🟠', '🟣', '🔵', '🩷'][i]} ${BOT_LABELS[i]} ร่ายเอฟเฟค: ${randomEffect.name}!`, "blue");
            audioManager.playSFX('effect');
            // บอทโจมตีการ์ดผู้เล่นแทน
            executeBotEffect(randomEffect, i);
            await new Promise(r => setTimeout(r, 600));
            if (checkGameOverCondition()) return;
        }

        // 2. การลงการ์ดสิ่งมีชีวิต — Smart placement for Hard/Expert
        const ALL_K = ["Monera", "Protista", "Fungi", "Plantae", "Animalia"];
        let sortedK = ALL_K;
        if (aiLevel.smartPlacement) {
            // Hard/Expert: prefer kingdoms where bot already has cards (closer to conquest)
            sortedK = [...ALL_K].sort((ka, kb) => {
                const ca = document.getElementById(ka).querySelectorAll(`.slot[data-owner="bot${i + 1}"]`).length;
                const cb = document.getElementById(kb).querySelectorAll(`.slot[data-owner="bot${i + 1}"]`).length;
                return cb - ca;
            });
        }
        const available = sortedK.filter(k => {
            const z = document.getElementById(k);
            return Array.from(z.querySelectorAll('.slot')).some(s => s.children.length === 0);
        });

        if (available.length > 0) {
            const targetK = available[Math.floor(Math.random() * available.length)];
            const validCards = orgData.filter(c => c.kingdom === targetK);
            if (validCards.length > 0) {
                const botData = validCards[Math.floor(Math.random() * validCards.length)];
                const emptySlot = Array.from(document.getElementById(targetK).querySelectorAll('.slot')).find(s => s.children.length === 0);
                if (emptySlot) {
                    const botEl = createCard(botData, false);
                    botEl.draggable = false;
                    botEl.classList.remove('organism');
                    botEl.classList.add('placed', 'bot-card');
                    botEl.style.borderColor = BOT_COLORS[i];
                    emptySlot.appendChild(botEl);
                    emptySlot.dataset.owner = `bot${i + 1}`;
                    emptySlot.dataset.hp = botData.hp;
                    emptySlot.dataset.power = botData.power;
                    if (botData.action === 'shield_1') emptySlot.dataset.shielded = '1';
                    if (botData.action === 'regen_hp') emptySlot.dataset.regen = '1';
                    if (botData.action === 'regen_power') emptySlot.dataset.powerRegen = '1';
                    emptySlot.classList.add(`slot-bot-${i + 1}`);
                    updateSlotBadge(emptySlot); // แสดง badge HP/POW บน hexagon
                    audioManager.playSFX('place');
                    pushLog(`${['🟠', '🟣', '🔵', '🩷'][i]} ${BOT_LABELS[i]} ส่ง ${botData.name} (HP:${botData.hp}) → ${targetK}`, "red");
                    pushHistory('bot', `${BOT_LABELS[i]} วาง ${botData.name} (HP:${botData.hp} POW:${botData.power}) → ${targetK}`);
                    unlockCard(botData.id);
                    checkConquest(targetK);
                }
            }
        }

        // รอแปบนึงก่อนบอทตัวต่อไปวาง (ให้ดูสมจริงนิดนึงแบบมี Delay)
        if (i < botCountToPlay - 1) {
            await new Promise(r => setTimeout(r, 800));
        }
    }

    // Bot uses effect cards AGAINST the player (attacks player's placed cards)
    function executeBotEffect(effect, botIdx) {
        const dmg = effect.power || 2;
        const action = effect.action;
        // Find all player-owned slots with cards
        const KINGDOMS = ['Monera', 'Protista', 'Fungi', 'Plantae', 'Animalia'];
        let targetSlots = [];
        if (action.includes('monera')) targetSlots = Array.from(document.getElementById('Monera').querySelectorAll('.slot')).filter(s => s.dataset.owner === 'player' && s.children.length > 0);
        else if (action.includes('protista')) targetSlots = Array.from(document.getElementById('Protista').querySelectorAll('.slot')).filter(s => s.dataset.owner === 'player' && s.children.length > 0);
        else if (action.includes('fungi')) targetSlots = Array.from(document.getElementById('Fungi').querySelectorAll('.slot')).filter(s => s.dataset.owner === 'player' && s.children.length > 0);
        else if (action.includes('plantae')) targetSlots = Array.from(document.getElementById('Plantae').querySelectorAll('.slot')).filter(s => s.dataset.owner === 'player' && s.children.length > 0);
        else if (action.includes('animalia')) targetSlots = Array.from(document.getElementById('Animalia').querySelectorAll('.slot')).filter(s => s.dataset.owner === 'player' && s.children.length > 0);
        else {
            // random or all_plantae — pick any player slot
            KINGDOMS.forEach(k => {
                Array.from(document.getElementById(k).querySelectorAll('.slot'))
                    .filter(s => s.dataset.owner === 'player' && s.children.length > 0)
                    .forEach(s => targetSlots.push(s));
            });
        }
        if (!targetSlots.length) { pushLog(`💨 ${BOT_LABELS[botIdx]}'s effect — วืด! ไม่มีการ์ดผู้เล่น`, 'blue'); return; }
        // Damage lowest-HP player card
        const t = targetSlots.reduce((a, b) => parseInt(a.dataset.hp || 99) <= parseInt(b.dataset.hp || 99) ? a : b);
        const destroyed = damageSlotCard(t, dmg);
        pushLog(`💢 ${BOT_LABELS[botIdx]} โจมตีการ์ดคุณด้วย ${effect.name} (${dmg} dmg)${destroyed ? ' — ทำลายแล้ว!' : ''}`, 'red');
    }



    if (!checkGameOverCondition()) {
        game.turnCount++;
        maybeTriggerDisaster(); // โอกาส 15% ภัยพิบัติทางธรรมชาติ
        applyEndOfTurnEffects();

        // Decrement weather countdown
        game.turnsUntilWeather--;
        if (game.turnsUntilWeather <= 0) {
            const WEATHER_TYPES = [
                { name: "Normal", icon: "🌍", color: "white" },
                { name: "Sunny Day", icon: "☀️", color: "#fbbf24" },
                { name: "Monsoon", icon: "🌧️", color: "#3b82f6" },
                { name: "Ice Age", icon: "❄️", color: "#00d2ff" }
            ];
            const w = WEATHER_TYPES[Math.floor(Math.random() * WEATHER_TYPES.length)];
            game.currentWeather = w.name;
            game.turnsUntilWeather = 3; // reset countdown
            pushLog(`🌤️ สภาพอากาศเปลี่ยน: ${w.name}!`, 'gold');
            pushHistory('weather', `🌤️ สภาพอากาศเปลี่ยนเป็น ${w.name}`);
            updateWeatherUI();
        } else {
            updateWeatherUI(); // update countdown display even if weather didn't change
        }

        game.isPlayerTurn = true; game.hasPlayedOrg = false;
        game.ap = game.currentWeather === 'Ice Age' ? 2 : 3;
        replenishHand();
        pushLog('🧬 เทิร์นของคุณ!', 'green');
        updateUI();
        startTimer();
    }
}

// --- Utils ---
function triggerScreenFlash() {
    const container = document.getElementById('game-container');
    container.classList.add('fx-flash');
    setTimeout(() => container.classList.remove('fx-flash'), 600);
}

function updateWeatherUI() {
    const wBox = document.getElementById('weather-box');
    const wData = [{ name: "Normal", icon: "🌍", color: "white" }, { name: "Sunny Day", icon: "☀️", color: "#fbbf24" }, { name: "Monsoon", icon: "🌧️", color: "#3b82f6" }, { name: "Ice Age", icon: "❄️", color: "#00d2ff" }].find(w => w.name === game.currentWeather);
    document.getElementById('weather-icon').innerText = wData.icon;
    const countdown = game.turnsUntilWeather;
    document.getElementById('weather-text').innerText = `${wData.name} (${countdown}เทิร์น)`;
    wBox.style.borderColor = wData.color;
}

function updateUI() {
    document.getElementById('ap-count').innerText = game.ap;
    document.getElementById('p-score').innerText = game.pConq.length;
    const maxBotConq = game.botConq ? Math.max(...game.botConq.map(b => b.length), 0) : 0;
    document.getElementById('b-score').innerText = maxBotConq;
    document.getElementById('turn-indicator').innerText = game.isPlayerTurn ? `DAY ${game.turnCount}` : `BOT TURN`;
    document.getElementById('turn-indicator').style.color = game.isPlayerTurn ? "var(--green)" : "var(--red)";
    document.getElementById('end-turn-btn').disabled = !game.isPlayerTurn;
    document.getElementById('reset-hand-btn').disabled = !game.isPlayerTurn;
}

// --- History System ---
function pushHistory(faction, message) {
    const timestamp = `T${game.turnCount}`;
    game.history.push({ turn: game.turnCount, faction, message, time: timestamp });
    renderHistory();
}
function renderHistory() {
    const panel = document.getElementById('history-content');
    if (!panel) return;
    panel.innerHTML = game.history.slice(-30).reverse().map(h => {
        const color = h.faction === 'player' ? '#39ff14'
            : h.faction === 'bot' ? '#ff8c00'
                : h.faction === 'weather' ? '#fbbf24' : '#94a3b8';
        return `<div class="hist-row"><span class="hist-turn" style="color:${color}">[${h.time}]</span> <span>${h.message}</span></div>`;
    }).join('');
}
function openHistory() {
    const panel = document.getElementById('history-panel');
    if (panel) panel.classList.toggle('hidden');
}

function pushLog(msg, color) {
    const log = document.getElementById('battle-log');
    const item = document.createElement('div');
    item.className = 'log-item';
    item.style.borderLeftColor = color === 'red' ? 'var(--red)' : (color === 'green' ? 'var(--green)' : (color === 'gold' ? 'var(--gold)' : 'var(--blue)'));
    item.innerText = msg;
    log.appendChild(item);
    setTimeout(() => item.remove(), 4000);
}