const testWrapper = document.querySelector('.test-wrapper');
const testArea = document.querySelector('#test-area');
const origin = document.querySelector('#origin-text p');
const resetButton = document.querySelector('#reset');
const theTimer = document.querySelector('.timer');
const wpmDisplay = document.querySelector('#wpm');
const errorDisplay = document.querySelector('#errors');
const statusDisplay = document.querySelector('#status');
const scoreList = document.querySelector('#scores');

const paragraphs = [
    'The best way to learn a new skill is to practice a little every day. Small improvements can lead to great results over time.',
    'Technology connects people around the world. A simple idea can become a useful tool when creativity and patience come together.',
    'On a quiet morning, the sun rose above the mountains. Birds filled the air with music as the city slowly came to life.',
    'Writing clean code makes it easier to solve problems. Good habits include testing your work and giving variables meaningful names.',
    'Exploring a new place can change the way we see the world. Every journey offers a chance to discover something unexpected.'
];
const storageKey = 'typing-test-top-three-v1';
let paragraphIndex = 0;
let startTime = null;
let timerInterval = null;
let completed = false;
let errors = 0;
let previousInput = '';
let scores = [];

// Load saved results, even if storage is unavailable or contains invalid data.
try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (Array.isArray(saved)) {
        scores = saved.filter(score => score && Number.isFinite(score.wpm) && Number.isFinite(score.ms) && score.ms > 0 && score.wpm >= 0)
            .sort((a, b) => b.wpm - a.wpm || a.ms - b.ms).slice(0, 3);
    }
} catch (error) {
    console.warn('Saved scores could not be loaded.', error);
}

function leadingZero(number) {
    return String(number).padStart(2, '0');
}

// Derive elapsed time from the clock to avoid interval drift.
function formatTime(ms) {
    const hundredths = Math.floor(ms / 10);
    return `${leadingZero(Math.floor(hundredths / 6000))}:${leadingZero(Math.floor(hundredths / 100) % 60)}:${leadingZero(hundredths % 100)}`;
}

function calculateWpm(ms) {
    return ms > 0 ? (testArea.value.length / 5) / (ms / 60000) : 0;
}

function runTimer(ms = performance.now() - startTime) {
    theTimer.textContent = formatTime(ms);
    wpmDisplay.textContent = Math.round(calculateWpm(ms));
}

function startTimer() {
    if (startTime !== null) return;
    startTime = performance.now();
    timerInterval = setInterval(() => runTimer(), 10);
}

function renderScores() {
    scoreList.replaceChildren();
    for (const score of scores) {
        const item = document.createElement('li');
        item.textContent = `${Math.round(score.wpm)} WPM — ${formatTime(score.ms)}`;
        scoreList.appendChild(item);
    }
    if (!scores.length) {
        const item = document.createElement('li');
        item.textContent = 'Complete a test to save your first score.';
        scoreList.appendChild(item);
    }
}

function saveScore(ms) {
    scores.push({ wpm: calculateWpm(ms), ms: ms });
    scores.sort((a, b) => b.wpm - a.wpm || a.ms - b.ms);
    scores = scores.slice(0, 3);
    try {
        localStorage.setItem(storageKey, JSON.stringify(scores));
    } catch (error) {
        console.warn('Scores could not be saved permanently.', error);
        statusDisplay.textContent += ' Browser storage is unavailable.';
    }
    renderScores();
}

// Count newly inserted incorrect characters, not existing errors or deletions.
function countErrors(current, target) {
    let prefix = 0;
    while (prefix < previousInput.length && prefix < current.length && previousInput[prefix] === current[prefix]) prefix++;
    let suffix = 0;
    while (suffix < previousInput.length - prefix && suffix < current.length - prefix && previousInput[previousInput.length - 1 - suffix] === current[current.length - 1 - suffix]) suffix++;
    for (let i = prefix; i < current.length - suffix; i++) {
        if (current[i] !== target[i]) errors++;
    }
    previousInput = current;
    errorDisplay.textContent = errors;
}

function matchText() {
    if (completed) return;
    const current = testArea.value;
    const target = origin.textContent;
    if (startTime === null && current.length === 0) return;
    startTimer();
    countErrors(current, target);
    if (current === target) {
        const elapsed = Math.max(1, performance.now() - startTime);
        clearInterval(timerInterval);
        completed = true;
        testWrapper.dataset.state = 'complete';
        testArea.readOnly = true;
        runTimer(elapsed);
        statusDisplay.textContent = 'Test completed! Your score has been recorded.';
        saveScore(elapsed);
    } else if (target.startsWith(current)) {
        testWrapper.dataset.state = 'correct';
        statusDisplay.textContent = 'Keep going!';
    } else {
        testWrapper.dataset.state = 'incorrect';
        statusDisplay.textContent = 'Typo detected. Check your text.';
    }
}

function reset() {
    clearInterval(timerInterval);
    timerInterval = null;
    startTime = null;
    completed = false;
    errors = 0;
    previousInput = '';
    testArea.value = '';
    testArea.readOnly = false;
    theTimer.textContent = '00:00:00';
    wpmDisplay.textContent = '0';
    errorDisplay.textContent = '0';
    delete testWrapper.dataset.state;
    statusDisplay.textContent = 'Ready to type.';
    // Choose a random paragraph without immediately repeating the last one.
    paragraphIndex = (paragraphIndex + 1 + Math.floor(Math.random() * (paragraphs.length - 1))) % paragraphs.length;
    origin.textContent = paragraphs[paragraphIndex];
    testArea.focus();
}

origin.textContent = paragraphs[paragraphIndex];
renderScores();
// Input events support keyboard typing, deletion and mobile keyboards.
testArea.addEventListener('input', matchText);
// Prevent pasted text from producing artificial leaderboard scores.
testArea.addEventListener('paste', event => event.preventDefault());
testArea.addEventListener('drop', event => event.preventDefault());
resetButton.addEventListener('click', reset);
