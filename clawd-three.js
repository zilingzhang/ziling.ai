/* =============================================================
   clawd-three.js — Three.js Claude Mascot with Idle Animations
   ============================================================= */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { animations } from './clawd-animations/index.js?v=4';

(function () {
    const container = document.getElementById('clawd-three');
    if (!container) return;

    /* ---- Renderer (canvas fills illustration container) ---- */
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    /* ---- Animation label overlay ---- */
    const animLabel = document.createElement('div');
    animLabel.style.cssText = 'position:absolute;bottom:12px;right:12px;font-family:"Inter",system-ui,sans-serif;font-size:13px;font-weight:600;letter-spacing:0.04em;color:#da7756;text-transform:lowercase;pointer-events:none;opacity:0;transition:opacity 0.4s ease;text-shadow:0 1px 4px rgba(0,0,0,0.3);z-index:4;';
    container.appendChild(animLabel);
    function showAnimLabel(text) { animLabel.textContent = text; animLabel.style.opacity = '1'; }
    function hideAnimLabel() { animLabel.style.opacity = '0'; }

    /* ---- "Learn about" link below animation container ---- */
    var learnLink = document.createElement('a');
    learnLink.style.cssText = 'position:absolute;bottom:-22px;right:0;font-family:"Inter",system-ui,sans-serif;font-size:12px;font-weight:500;letter-spacing:0.02em;color:rgba(218,119,86,0.7);text-decoration:none;opacity:0;transition:opacity 0.4s ease;pointer-events:none;white-space:nowrap;';
    learnLink.target = '_blank';
    learnLink.rel = 'noopener';
    learnLink.addEventListener('mouseenter', function () { learnLink.style.color = 'rgba(218,119,86,1)'; });
    learnLink.addEventListener('mouseleave', function () { learnLink.style.color = 'rgba(218,119,86,0.7)'; });
    // Absolutely positioned inside .code-illustration (which has position:relative)
    var illustrationWrap = container.closest('.code-illustration');
    if (illustrationWrap) {
        illustrationWrap.appendChild(learnLink);
    } else {
        container.parentNode.appendChild(learnLink);
    }

    var learnMap = {
        /* ── Original 18 ─────────────────────────────────────────── */
        'swarming':       { topic: 'Agent Swarms',            slug: 'the-triumph-of-connectionism' },
        'delegating':     { topic: 'Subagent Delegation',     slug: 'delegate-to-beat-context-rot' },
        'caching':        { topic: 'Prompt Caching',          slug: 'context-is-a-precious-resource' },
        'cloning':        { topic: 'Shadow Clones',           slug: 'the-triumph-of-connectionism' },
        'branching':      { topic: 'Vibe Coding',             slug: 'responsible-vibe-coding-in-production' },
        'compounding':    { topic: 'Compound Engineering',    slug: 'compound-engineering' },
        'forging':        { topic: 'Agent Tool Use',          slug: 'agent-good-old-software-engineering-matters-more-now' },
        'code-reviewing': { topic: 'The Human Eval Bottleneck', slug: 'the-human-eval-bottleneck' },
        'comboing':       { topic: 'Agent Evolution',         slug: 'from-workflow-graphs-to-stateful-agents' },
        'blasting':       { topic: 'Ask Not What Claude Can Do For You', slug: 'ask-not-what-claude-can-do-for-you' },
        'melting':        { topic: 'The Bitter Lesson',       slug: 'the-bitter-lesson-2019' },
        'absorbing':      { topic: 'The Network Effect',      slug: 'the-network-effect-of-data' },
        'portaling':      { topic: 'Reverse Elicitation',     slug: 'reverse-elicitation-prompt-engineering' },
        'glitching':      { topic: 'AI Psychosis',            slug: 'ai-psychosis' },
        'quaking':        { topic: 'Unhobble the Model',      slug: 'unhobble-the-model' },
        'beaming':        { topic: 'Machines of Loving Grace', slug: 'machines-of-loving-grace' },
        'floating':       { topic: 'Deep Thought',            slug: 'reverse-elicitation-prompt-engineering' },
        'octaslashing':   { topic: 'Vibe Checking',           slug: 'vibe-checking' },
        /* ── Round 1: Science & Elements ─────────────────────────── */
        'calculating':        { topic: 'Deep Compute',              slug: '1-4-million-rounds' },
        'crystallizing':      { topic: 'Vindication',               slug: 'vindication-25-years-in-the-making' },
        'ionizing':           { topic: 'The Bitter Lesson',         slug: 'the-bitter-lesson-2019' },
        'nebulizing':         { topic: 'AI Psychosis',              slug: 'ai-psychosis' },
        'nucleating':         { topic: 'Connectionism',             slug: 'the-triumph-of-connectionism' },
        'photosynthesizing':  { topic: 'The Network Effect',        slug: 'the-network-effect-of-data' },
        'sublimating':        { topic: 'The Bitter Lesson',         slug: 'the-bitter-lesson-2019' },
        /* ── Round 1: Dance & Movement ───────────────────────────── */
        'moonwalking':        { topic: 'Beginner\'s Mind',          slug: 'beginner-s-mind' },
        'jitterbugging':      { topic: 'Beginner\'s Mind',          slug: 'beginner-s-mind' },
        'gallivanting':       { topic: 'Beginner\'s Mind',          slug: 'beginner-s-mind' },
        'skedaddling':        { topic: 'The Fear of Missing Out',   slug: 'the-fear-of-missing-out' },
        'zigzagging':         { topic: 'Don\'t Trust the Process',  slug: 'don-t-trust-the-process' },
        'boogieing':          { topic: 'Beginner\'s Mind',          slug: 'beginner-s-mind' },
        'choreographing':     { topic: 'Workflow to Agents',        slug: 'from-workflow-graphs-to-stateful-agents' },
        /* ── Round 1: Weather & Nature ───────────────────────────── */
        'cascading':          { topic: 'The Scaling Law',           slug: 'the-scaling-law' },
        'drizzling':          { topic: 'Context Is Precious',       slug: 'context-is-a-precious-resource' },
        'thundering':         { topic: 'The Stakes',                slug: 'the-stakes' },
        'billowing':          { topic: 'The Stakes',                slug: 'the-stakes' },
        'sprouting':          { topic: 'The Network Effect',        slug: 'the-network-effect-of-data' },
        'pollinating':        { topic: 'The Network Effect',        slug: 'the-network-effect-of-data' },
        'swirling':           { topic: 'AI Psychosis',              slug: 'ai-psychosis' },
        /* ── Round 1: Magic & Fantasy ────────────────────────────── */
        'conjuring':          { topic: 'Unhobble the Model',        slug: 'unhobble-the-model' },
        'enchanting':         { topic: 'Reverse Elicitation',       slug: 'reverse-elicitation-prompt-engineering' },
        'prestidigitating':   { topic: 'Show & Tell',               slug: 'show-tell' },
        'transmuting':        { topic: 'Halftoner',                 slug: 'halftoner-translate-c-to-dsl-28x-faster' },
        'wizarding':          { topic: 'Unhobble the Model',        slug: 'unhobble-the-model' },
        'manifesting':        { topic: 'The New Bar',               slug: 'the-new-bar' },
        'divining':           { topic: 'Reverse Elicitation',       slug: 'reverse-elicitation-prompt-engineering' },
        /* ── Round 1: Culinary Arts ──────────────────────────────── */
        'baking':             { topic: 'Simple Things That Work',   slug: 'so-what-are-simple-things-that-work' },
        'brewing':            { topic: 'Compound Engineering',      slug: 'compound-engineering' },
        'caramelizing':       { topic: 'Simple Things That Work',   slug: 'so-what-are-simple-things-that-work' },
        'fermenting':         { topic: 'Compound Engineering',      slug: 'compound-engineering' },
        'julienning':         { topic: 'Simple Things That Work',   slug: 'so-what-are-simple-things-that-work' },
        'kneading':           { topic: 'Simple Things That Work',   slug: 'so-what-are-simple-things-that-work' },
        'zesting':            { topic: 'Simple Things That Work',   slug: 'so-what-are-simple-things-that-work' },
        /* ── Round 1: Space & Physics ────────────────────────────── */
        'catapulting':        { topic: 'The Stakes',                slug: 'the-stakes' },
        'hyperspacing':       { topic: 'The Scaling Law',           slug: 'the-scaling-law' },
        'levitating':         { topic: 'Machines of Loving Grace',  slug: 'machines-of-loving-grace' },
        'orbiting':           { topic: 'The Scaling Law',           slug: 'the-scaling-law' },
        'quantumizing':       { topic: 'The Virtually Impossible',  slug: 'the-easy-and-the-virtually-impossible' },
        'warping':            { topic: 'The Bitter Lesson',         slug: 'the-bitter-lesson-2019' },
        'bootstrapping':      { topic: 'Agent Tool Use',            slug: 'agent-good-old-software-engineering-matters-more-now' },
        /* ── Round 1: Mind & Craft ───────────────────────────────── */
        'cerebrating':        { topic: 'Inner Monologue',           slug: 'inner-monologue' },
        'contemplating':      { topic: 'Inner Monologue',           slug: 'inner-monologue' },
        'pondering':          { topic: 'Reverse Elicitation',       slug: 'reverse-elicitation-prompt-engineering' },
        'scheming':           { topic: '4D Framework',              slug: 'anthropic-s-4d-framework-of-ai-fluency' },
        'concocting':         { topic: 'Compound Engineering',      slug: 'compound-engineering' },
        'crafting':           { topic: 'The Renaissance Engineer',  slug: 'the-renaissance-engineer' },
        'reticulating':       { topic: 'Connectionism',             slug: 'the-triumph-of-connectionism' },
        /* ── Round 1: Whimsy & Nonsense ──────────────────────────── */
        'clauding':           { topic: 'Machines of Loving Grace',  slug: 'machines-of-loving-grace' },
        'combobulating':      { topic: 'Workflow to Agents',        slug: 'from-workflow-graphs-to-stateful-agents' },
        'discombobulating':   { topic: 'AI Psychosis',              slug: 'ai-psychosis' },
        'flibbertigibbeting': { topic: 'AI Psychosis',              slug: 'ai-psychosis' },
        'honking':            { topic: 'The Davos Conversation',    slug: 'the-davos-conversation' },
        'noodling':           { topic: 'Vibe Coding',               slug: 'vibe-coding' },
        'shenaniganing':      { topic: 'Don\'t Trust the Process',  slug: 'don-t-trust-the-process' },
        /* ── Round 2: Culinary Mastery ───────────────────────────── */
        'blanching':          { topic: 'Simple Things That Work',   slug: 'so-what-are-simple-things-that-work' },
        'cooking':            { topic: 'Simple Things That Work',   slug: 'so-what-are-simple-things-that-work' },
        'flambeing':          { topic: 'Show & Tell',               slug: 'show-tell' },
        'frosting':           { topic: 'Compound Engineering',      slug: 'compound-engineering' },
        'garnishing':         { topic: 'Show & Tell',               slug: 'show-tell' },
        'infusing':           { topic: 'Compound Engineering',      slug: 'compound-engineering' },
        'leavening':          { topic: 'The Scaling Law',           slug: 'the-scaling-law' },
        'marinating':         { topic: 'Context Is Precious',       slug: 'context-is-a-precious-resource' },
        'percolating':        { topic: 'Compound Engineering',      slug: 'compound-engineering' },
        'proofing':           { topic: 'Vibe Checking',             slug: 'vibe-checking' },
        'sauteing':           { topic: 'Simple Things That Work',   slug: 'so-what-are-simple-things-that-work' },
        'seasoning':          { topic: 'Vibe Checking',             slug: 'vibe-checking' },
        'simmering':          { topic: 'Compound Engineering',      slug: 'compound-engineering' },
        'stewing':            { topic: 'Compound Engineering',      slug: 'compound-engineering' },
        'tempering':          { topic: 'Responsible Vibe Coding',   slug: 'responsible-vibe-coding-in-production' },
        'whisking':           { topic: 'Simple Things That Work',   slug: 'so-what-are-simple-things-that-work' },
        /* ── Round 2: Deep Thought ───────────────────────────────── */
        'cogitating':         { topic: 'Context Is Precious',       slug: 'context-is-a-precious-resource' },
        'considering':        { topic: 'The Responsibility Model',  slug: 'the-responsibility-model' },
        'deciphering':        { topic: 'Reverse Elicitation',       slug: 'reverse-elicitation-prompt-engineering' },
        'deliberating':       { topic: 'The Responsibility Model',  slug: 'the-responsibility-model' },
        'determining':        { topic: 'The Virtually Impossible',  slug: 'the-easy-and-the-virtually-impossible' },
        'elucidating':        { topic: 'Reverse Elicitation',       slug: 'reverse-elicitation-prompt-engineering' },
        'inferring':          { topic: 'Inner Monologue',           slug: 'inner-monologue' },
        'mulling':            { topic: 'Context Is Precious',       slug: 'context-is-a-precious-resource' },
        'musing':             { topic: 'Beginner\'s Mind',          slug: 'beginner-s-mind' },
        'perusing':           { topic: 'Librarian vs Analyst',      slug: 'librarian-vs-analyst-rag-vs-agent' },
        'philosophising':     { topic: 'Beginner\'s Mind',          slug: 'beginner-s-mind' },
        'pontificating':      { topic: 'The Davos Conversation',    slug: 'the-davos-conversation' },
        'puzzling':           { topic: 'The NumPy Speed Trap',      slug: 'ai-slop-theatre-act-i-the-numpy-speed-trap' },
        'ruminating':         { topic: 'Context Is Precious',       slug: 'context-is-a-precious-resource' },
        'synthesizing':       { topic: 'Connectionism',             slug: 'the-triumph-of-connectionism' },
        'thinking':           { topic: 'Inner Monologue',           slug: 'inner-monologue' },
        /* ── Round 2: Creative Expression ────────────────────────── */
        'architecting':       { topic: '4D Framework',              slug: 'anthropic-s-4d-framework-of-ai-fluency' },
        'composing':          { topic: 'The Renaissance Engineer',  slug: 'the-renaissance-engineer' },
        'creating':           { topic: 'UI Without a Frontend Dev', slug: 'ui-without-a-frontend-developer' },
        'doodling':           { topic: 'Vibe Coding',               slug: 'vibe-coding' },
        'embellishing':       { topic: 'Show & Tell',               slug: 'show-tell' },
        'envisioning':        { topic: 'Fei-Fei Li\'s Vision',     slug: 'the-worlds-fei-fei-li-saw' },
        'forming':            { topic: '4D Framework',              slug: 'anthropic-s-4d-framework-of-ai-fluency' },
        'generating':         { topic: 'The Scaling Law',           slug: 'the-scaling-law' },
        'harmonizing':        { topic: 'Connectionism',             slug: 'the-triumph-of-connectionism' },
        'ideating':           { topic: 'Beginner\'s Mind',          slug: 'beginner-s-mind' },
        'imagining':          { topic: 'Fei-Fei Li\'s Vision',     slug: 'the-worlds-fei-fei-li-saw' },
        'improvising':        { topic: 'Vibe Coding',               slug: 'vibe-coding' },
        'orchestrating':      { topic: 'Workflow to Agents',        slug: 'from-workflow-graphs-to-stateful-agents' },
        'sketching':          { topic: 'UI Without a Frontend Dev', slug: 'ui-without-a-frontend-developer' },
        'tinkering':          { topic: 'The Renaissance Engineer',  slug: 'the-renaissance-engineer' },
        'vibing':             { topic: 'Vibe Coding',               slug: 'vibe-coding' },
        /* ── Round 2: Movement & Locomotion ──────────────────────── */
        'beboppin':           { topic: 'Beginner\'s Mind',          slug: 'beginner-s-mind' },
        'burrowing':          { topic: 'The Phantom Env Var',       slug: 'ai-slop-theatre-act-ii-the-phantom-env-var' },
        'frolicking':         { topic: 'Beginner\'s Mind',          slug: 'beginner-s-mind' },
        'galloping':          { topic: 'The Fear of Missing Out',   slug: 'the-fear-of-missing-out' },
        'grooving':           { topic: 'Vibe Coding',               slug: 'vibe-coding' },
        'meandering':         { topic: 'The Human Eval Bottleneck', slug: 'the-human-eval-bottleneck' },
        'moseying':           { topic: 'The Human Eval Bottleneck', slug: 'the-human-eval-bottleneck' },
        'perambulating':      { topic: 'The Human Eval Bottleneck', slug: 'the-human-eval-bottleneck' },
        'pouncing':           { topic: 'Ask Not What Claude Can Do', slug: 'ask-not-what-claude-can-do-for-you' },
        'scampering':         { topic: 'The Fear of Missing Out',   slug: 'the-fear-of-missing-out' },
        'scurrying':          { topic: 'The Fear of Missing Out',   slug: 'the-fear-of-missing-out' },
        'shimmying':          { topic: 'Beginner\'s Mind',          slug: 'beginner-s-mind' },
        'slithering':         { topic: 'The Invisible Sign Flip',   slug: 'ai-slop-theatre-act-iii-the-invisible-sign-flip' },
        'sock-hopping':       { topic: 'Beginner\'s Mind',          slug: 'beginner-s-mind' },
        'swooping':           { topic: 'Don\'t Trust the Process',  slug: 'don-t-trust-the-process' },
        'waddling':           { topic: 'The Human Eval Bottleneck', slug: 'the-human-eval-bottleneck' },
        /* ── Round 2: Nature & Elements ──────────────────────────── */
        'coalescing':         { topic: 'Connectionism',             slug: 'the-triumph-of-connectionism' },
        'cultivating':        { topic: 'The Network Effect',        slug: 'the-network-effect-of-data' },
        'ebbing':             { topic: 'The Bitter Lesson',         slug: 'the-bitter-lesson-2019' },
        'evaporating':        { topic: 'The Bitter Lesson',         slug: 'the-bitter-lesson-2019' },
        'flowing':            { topic: 'Machines of Loving Grace',  slug: 'machines-of-loving-grace' },
        'fluttering':         { topic: 'Machines of Loving Grace',  slug: 'machines-of-loving-grace' },
        'germinating':        { topic: 'The Network Effect',        slug: 'the-network-effect-of-data' },
        'gusting':            { topic: 'The Stakes',                slug: 'the-stakes' },
        'hatching':           { topic: 'The Network Effect',        slug: 'the-network-effect-of-data' },
        'incubating':         { topic: 'The Network Effect',        slug: 'the-network-effect-of-data' },
        'misting':            { topic: 'The Phantom Env Var',       slug: 'ai-slop-theatre-act-ii-the-phantom-env-var' },
        'nesting':            { topic: 'The Network Effect',        slug: 'the-network-effect-of-data' },
        'precipitating':      { topic: 'The Stakes',                slug: 'the-stakes' },
        'propagating':        { topic: 'The Network Effect',        slug: 'the-network-effect-of-data' },
        'roosting':           { topic: 'The Network Effect',        slug: 'the-network-effect-of-data' },
        'undulating':         { topic: 'Machines of Loving Grace',  slug: 'machines-of-loving-grace' },
        /* ── Round 2: Work & Force ───────────────────────────────── */
        'accomplishing':      { topic: 'Ask Not What Claude Can Do', slug: 'ask-not-what-claude-can-do-for-you' },
        'actioning':          { topic: 'Ask Not What Claude Can Do', slug: 'ask-not-what-claude-can-do-for-you' },
        'actualizing':        { topic: 'The New Bar',               slug: 'the-new-bar' },
        'channeling':         { topic: 'Unhobble the Model',        slug: 'unhobble-the-model' },
        'churning':           { topic: 'The Bitter Lesson',         slug: 'the-bitter-lesson-2019' },
        'computing':          { topic: 'Deep Compute',              slug: '1-4-million-rounds' },
        'crunching':          { topic: 'Deep Compute',              slug: '1-4-million-rounds' },
        'doing':              { topic: 'Ask Not What Claude Can Do', slug: 'ask-not-what-claude-can-do-for-you' },
        'effecting':          { topic: 'The New Bar',               slug: 'the-new-bar' },
        'hashing':            { topic: 'Agent Tool Use',            slug: 'agent-good-old-software-engineering-matters-more-now' },
        'mustering':          { topic: 'Delegate to Beat Context Rot', slug: 'delegate-to-beat-context-rot' },
        'processing':         { topic: 'Deep Compute',              slug: '1-4-million-rounds' },
        'spinning':           { topic: 'The Bitter Lesson',         slug: 'the-bitter-lesson-2019' },
        'twisting':           { topic: 'The Invisible Sign Flip',   slug: 'ai-slop-theatre-act-iii-the-invisible-sign-flip' },
        'unfurling':          { topic: 'Unhobble the Model',        slug: 'unhobble-the-model' },
        'unravelling':        { topic: 'Unhobble the Model',        slug: 'unhobble-the-model' },
        'working':            { topic: 'Agent Tool Use',            slug: 'agent-good-old-software-engineering-matters-more-now' },
        /* ── Round 2: Whimsy & Chaos ─────────────────────────────── */
        'befuddling':         { topic: 'AI Psychosis',              slug: 'ai-psychosis' },
        'bloviating':         { topic: 'The Davos Conversation',    slug: 'the-davos-conversation' },
        'boondoggling':       { topic: 'Don\'t Trust the Process',  slug: 'don-t-trust-the-process' },
        'booping':            { topic: 'Beginner\'s Mind',          slug: 'beginner-s-mind' },
        'canoodling':         { topic: 'Machines of Loving Grace',  slug: 'machines-of-loving-grace' },
        'dilly-dallying':     { topic: 'The Human Eval Bottleneck', slug: 'the-human-eval-bottleneck' },
        'fiddle-faddling':    { topic: 'Don\'t Trust the Process',  slug: 'don-t-trust-the-process' },
        'flummoxing':         { topic: 'AI Psychosis',              slug: 'ai-psychosis' },
        'hullaballooing':     { topic: 'The Davos Conversation',    slug: 'the-davos-conversation' },
        'lollygagging':       { topic: 'The Human Eval Bottleneck', slug: 'the-human-eval-bottleneck' },
        'razzle-dazzling':    { topic: 'Show & Tell',               slug: 'show-tell' },
        'razzmatazzing':      { topic: 'Show & Tell',               slug: 'show-tell' },
        'recombobulating':    { topic: 'Workflow to Agents',        slug: 'from-workflow-graphs-to-stateful-agents' },
        'tomfoolering':       { topic: 'AI Psychosis',              slug: 'ai-psychosis' },
        'topsy-turvying':     { topic: 'AI Psychosis',              slug: 'ai-psychosis' },
        'whatchamacalliting': { topic: 'AI Psychosis',              slug: 'ai-psychosis' },
        /* ── Round 2: Adventure & Oddity ─────────────────────────── */
        'finagling':          { topic: 'The NumPy Speed Trap',      slug: 'ai-slop-theatre-act-i-the-numpy-speed-trap' },
        'gitifying':          { topic: 'Agent Tool Use',            slug: 'agent-good-old-software-engineering-matters-more-now' },
        'herding':            { topic: 'Delegate to Beat Context Rot', slug: 'delegate-to-beat-context-rot' },
        'metamorphosing':     { topic: 'Workflow to Agents',        slug: 'from-workflow-graphs-to-stateful-agents' },
        'osmosing':           { topic: 'The Network Effect',        slug: 'the-network-effect-of-data' },
        'puttering':          { topic: 'The Human Eval Bottleneck', slug: 'the-human-eval-bottleneck' },
        'schlepping':         { topic: 'Delegate to Beat Context Rot', slug: 'delegate-to-beat-context-rot' },
        'smooshing':          { topic: 'The NumPy Speed Trap',      slug: 'ai-slop-theatre-act-i-the-numpy-speed-trap' },
        'spelunking':         { topic: 'The Phantom Env Var',       slug: 'ai-slop-theatre-act-ii-the-phantom-env-var' },
        'symbioting':         { topic: 'Connectionism',             slug: 'the-triumph-of-connectionism' },
        'transfiguring':      { topic: 'Vindication',               slug: 'vindication-25-years-in-the-making' },
        'wandering':          { topic: 'Beginner\'s Mind',          slug: 'beginner-s-mind' },
        'whirlpooling':       { topic: 'Machines of Loving Grace',  slug: 'machines-of-loving-grace' },
        'whirring':           { topic: 'The Bitter Lesson',         slug: 'the-bitter-lesson-2019' },
        'wibbling':           { topic: 'AI Psychosis',              slug: 'ai-psychosis' },
        'wrangling':          { topic: 'Delegate to Beat Context Rot', slug: 'delegate-to-beat-context-rot' }
    };
    var SWARM_BASE = window.SWARM_BASE || 'blog/swarm-mentality/index.html';
    function showLearnLink(label) {
        var entry = learnMap[label];
        if (!entry) { learnLink.style.opacity = '0'; learnLink.style.pointerEvents = 'none'; return; }
        learnLink.href = SWARM_BASE + '#' + entry.slug;
        learnLink.textContent = 'Learn about \u2192 ' + entry.topic;
        learnLink.style.opacity = '1';
        learnLink.style.pointerEvents = 'auto';
    }
    function hideLearnLink() { learnLink.style.opacity = '0'; learnLink.style.pointerEvents = 'none'; }

    /* ---- Animation picker handle (inconspicuous dot) ---- */
    const pickerDot = document.createElement('div');
    pickerDot.style.cssText = 'position:absolute;bottom:10px;left:10px;width:8px;height:8px;border-radius:50%;background:rgba(218,119,86,0.25);cursor:pointer;z-index:6;transition:background 0.3s ease,transform 0.2s ease;pointer-events:auto;';
    pickerDot.title = 'Pick animation';
    pickerDot.addEventListener('mouseenter', function () { pickerDot.style.background = 'rgba(218,119,86,0.7)'; pickerDot.style.transform = 'scale(1.5)'; });
    pickerDot.addEventListener('mouseleave', function () { if (!pickerMenu.classList.contains('_open')) { pickerDot.style.background = 'rgba(218,119,86,0.25)'; pickerDot.style.transform = 'scale(1)'; } });
    container.appendChild(pickerDot);

    const pickerMenu = document.createElement('div');
    pickerMenu.style.cssText = 'position:absolute;bottom:24px;left:10px;background:rgba(20,20,25,0.92);border:1px solid rgba(218,119,86,0.3);border-radius:6px;padding:4px 0;max-height:260px;overflow-y:auto;z-index:7;display:none;backdrop-filter:blur(8px);scrollbar-width:thin;scrollbar-color:rgba(218,119,86,0.3) transparent;pointer-events:auto;';
    container.appendChild(pickerMenu);

    pickerDot.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = pickerMenu.style.display !== 'none';
        pickerMenu.style.display = open ? 'none' : 'block';
        if (open) { pickerMenu.classList.remove('_open'); pickerDot.style.background = 'rgba(218,119,86,0.25)'; pickerDot.style.transform = 'scale(1)'; }
        else pickerMenu.classList.add('_open');
    });
    document.addEventListener('click', function () { pickerMenu.style.display = 'none'; pickerMenu.classList.remove('_open'); pickerDot.style.background = 'rgba(218,119,86,0.25)'; pickerDot.style.transform = 'scale(1)'; });

    /* ---- Scene ---- */
    const scene = new THREE.Scene();

    /* ---- Camera — nearly front-on to keep 2D-ish model looking good ---- */
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0.3, 0.6, 4.0);
    camera.lookAt(0, -0.2, 0);

    /* ---- Dynamic sizing to fill container ---- */
    function updateRendererSize() {
        var w = container.clientWidth || 200;
        var h = container.clientHeight || 200;
        if (w > 0 && h > 0) {
            renderer.setSize(w, h);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        }
    }
    updateRendererSize();
    var _resizeTimer;
    window.addEventListener('resize', function () {
        clearTimeout(_resizeTimer);
        _resizeTimer = setTimeout(updateRendererSize, 150);
    });

    /* ---- Lighting ---- */
    const ambient = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(2, 3, 4);
    scene.add(dirLight);
    const rimLight = new THREE.DirectionalLight(0x9999ff, 0.5);
    rimLight.position.set(-2, 1, -3);
    scene.add(rimLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-1, 0, 3);
    scene.add(fillLight);

    /* ---- Default model pose ---- */
    const DEFAULT_POS = new THREE.Vector3(0.0, -0.3, -0.5);
    const DEFAULT_SCALE = new THREE.Vector3(0.6, 0.6, 0.6);

    function resetModel(model) {
        model.position.copy(DEFAULT_POS);
        model.rotation.set(0, 0, 0);
        model.scale.copy(DEFAULT_SCALE);
        model.visible = true;
    }

    /* ---- Animation backdrop — dims IDE image via brightness filter ---- */
    const glassFrame = container.parentElement && container.parentElement.querySelector('.code-glass-frame');
    if (glassFrame) glassFrame.style.transition = 'filter 0.5s ease';
    function showBackdrop() { if (glassFrame) glassFrame.style.filter = 'brightness(0.55)'; }
    function hideBackdrop() { if (glassFrame) glassFrame.style.filter = ''; }

    /* ---- Animation Manager ---- */
    let model = null;
    let currentAnim = null;
    let currentIndex = -1;
    let animStart = 0;
    let idleUntil = 0;
    const IDLE_GAP = 3;
    const IDLE_SPIN = 0.15;

    /* Blend-back state: smoothly lerp from post-anim pose to default */
    let blending = false;
    let blendStart = 0;
    const BLEND_DUR = 0.6;          // seconds to ease back to default
    const blendFrom = { px: 0, py: 0, pz: 0, rx: 0, ry: 0, rz: 0, sx: 1, sy: 1, sz: 1 };

    function captureForBlend() {
        blendFrom.px = model.position.x;
        blendFrom.py = model.position.y;
        blendFrom.pz = model.position.z;
        blendFrom.rx = model.rotation.x;
        blendFrom.ry = model.rotation.y;
        blendFrom.rz = model.rotation.z;
        blendFrom.sx = model.scale.x;
        blendFrom.sy = model.scale.y;
        blendFrom.sz = model.scale.z;
    }

    function smoothstep(t) { return t * t * (3 - 2 * t); }

    // Shuffled non-repeating sequence
    var _shuffled = [];
    var _shuffledPos = 0;
    function _reshuffle() {
        _shuffled = [];
        for (var i = 0; i < animations.length; i++) _shuffled.push(i);
        // Fisher-Yates shuffle
        for (var j = _shuffled.length - 1; j > 0; j--) {
            var k = Math.floor(Math.random() * (j + 1));
            var tmp = _shuffled[j]; _shuffled[j] = _shuffled[k]; _shuffled[k] = tmp;
        }
        // Avoid starting the new deck with the same animation that ended the last deck
        if (_shuffled.length > 1 && _shuffled[0] === currentIndex) {
            var swap = 1 + Math.floor(Math.random() * (_shuffled.length - 1));
            var t = _shuffled[0]; _shuffled[0] = _shuffled[swap]; _shuffled[swap] = t;
        }
        _shuffledPos = 0;
    }
    function pickNext() {
        if (animations.length === 0) return -1;
        if (animations.length === 1) return 0;
        if (_shuffledPos >= _shuffled.length) _reshuffle();
        return _shuffled[_shuffledPos++];
    }

    function beginAnim(idx) {
        if (currentAnim) {
            try { currentAnim.cleanup(model, scene, THREE); } catch (_) {}
            resetModel(model);
        }
        blending = false;
        currentIndex = idx;
        currentAnim = animations[idx];
        animStart = clock.getElapsedTime();
        try { currentAnim.init(model, scene, THREE); } catch (_) {}
        if (currentAnim.label) { showAnimLabel(currentAnim.label); showLearnLink(currentAnim.label); }
        showBackdrop();
    }

    /* ---- Populate animation picker menu ---- */
    (function _buildPickerItems() {
        for (var i = 0; i < animations.length; i++) {
            (function (idx) {
                var item = document.createElement('div');
                item.textContent = animations[idx].name;
                item.style.cssText = 'padding:4px 12px;font-family:"Inter",system-ui,sans-serif;font-size:11px;color:rgba(255,255,255,0.7);cursor:pointer;white-space:nowrap;transition:background 0.15s ease,color 0.15s ease;';
                item.addEventListener('mouseenter', function () { item.style.background = 'rgba(218,119,86,0.25)'; item.style.color = '#fff'; });
                item.addEventListener('mouseleave', function () { item.style.background = 'transparent'; item.style.color = 'rgba(255,255,255,0.7)'; });
                item.addEventListener('click', function (e) {
                    e.stopPropagation();
                    pickerMenu.style.display = 'none';
                    pickerMenu.classList.remove('_open');
                    pickerDot.style.background = 'rgba(218,119,86,0.25)';
                    pickerDot.style.transform = 'scale(1)';
                    if (model) beginAnim(idx);
                });
                pickerMenu.appendChild(item);
            })(i);
        }
    })();

    /* ---- Clock & loop ---- */
    const clock = new THREE.Clock();
    let prevTime = 0;

    function loop() {
        requestAnimationFrame(loop);
        if (!model) return;

        const t = clock.getElapsedTime();
        const dt = Math.min(t - prevTime, 0.05);
        prevTime = t;

        if (currentAnim) {
            const elapsed = t - animStart;
            const progress = Math.min(elapsed / currentAnim.duration, 1);
            try { currentAnim.update(model, scene, progress, t, dt, THREE); } catch (_) {}
            if (progress >= 1) {
                try { currentAnim.cleanup(model, scene, THREE); } catch (_) {}
                /* Capture current pose, then blend back smoothly */
                hideAnimLabel();
                hideLearnLink();
                hideBackdrop();
                model.visible = true;
                captureForBlend();
                blending = true;
                blendStart = t;
                currentAnim = null;
            }
        } else if (blending) {
            /* Smooth ease back to default pose */
            const bp = Math.min((t - blendStart) / BLEND_DUR, 1);
            const e = smoothstep(bp);
            model.position.x = blendFrom.px + (DEFAULT_POS.x - blendFrom.px) * e;
            model.position.y = blendFrom.py + (DEFAULT_POS.y - blendFrom.py) * e;
            model.position.z = blendFrom.pz + (DEFAULT_POS.z - blendFrom.pz) * e;
            model.rotation.x = blendFrom.rx * (1 - e);
            model.rotation.y = blendFrom.ry * (1 - e);
            model.rotation.z = blendFrom.rz * (1 - e);
            model.scale.x = blendFrom.sx + (DEFAULT_SCALE.x - blendFrom.sx) * e;
            model.scale.y = blendFrom.sy + (DEFAULT_SCALE.y - blendFrom.sy) * e;
            model.scale.z = blendFrom.sz + (DEFAULT_SCALE.z - blendFrom.sz) * e;
            if (bp >= 1) {
                resetModel(model);
                blending = false;
                idleUntil = t + IDLE_GAP;
            }
        } else {
            // Gentle sway, never full rotation (2D-ish model)
            model.rotation.y = Math.sin(t * IDLE_SPIN) * 0.2;
            if (t >= idleUntil && animations.length > 0) {
                beginAnim(pickNext());
            }
        }

        renderer.render(scene, camera);
    }

    /* ---- Load model ---- */
    const gltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    dracoLoader.setDecoderConfig({ type: 'js' });
    gltfLoader.setDRACOLoader(dracoLoader);

    gltfLoader.load('clawd-compressed.glb', function (gltf) {
        model = gltf.scene;
        model.position.copy(DEFAULT_POS);
        model.scale.copy(DEFAULT_SCALE);
        scene.add(model);

        idleUntil = clock.getElapsedTime() + 2;
        loop();
    });
})();
