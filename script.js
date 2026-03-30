// ========================================
// SHAH FAHAD PORTFOLIO
// Artefakt.mov Inspired Premium Effects
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    initPreloader();
    initCustomCursor();
    initLenisSmoothScroll();
    initThreeJS();
    initThemeToggle();
    initNavigation();
    initProjects();
    initParallaxEffects();
    initTextAnimations();
    initScrollAnimations();
    initContactForm();
    initResume();
});

// ========================================
// PRELOADER
// ========================================
function initPreloader() {
    const preloader = document.getElementById('preloader');
    const progress = document.getElementById('preloaderProgress');
    if (!preloader || !progress) return;

    let loadProgress = 0;
    const interval = setInterval(() => {
        loadProgress += Math.random() * 15;
        if (loadProgress >= 100) {
            loadProgress = 100;
            clearInterval(interval);
            setTimeout(() => {
                preloader.classList.add('loaded');
                document.body.classList.add('page-loaded');
                // Trigger reveal animations after preloader
                setTimeout(triggerPageReveal, 300);
            }, 500);
        }
        progress.style.width = loadProgress + '%';
    }, 100);

    // Fallback: hide preloader after 3 seconds max
    setTimeout(() => {
        if (!preloader.classList.contains('loaded')) {
            preloader.classList.add('loaded');
            document.body.classList.add('page-loaded');
            triggerPageReveal();
        }
    }, 3000);
}

function triggerPageReveal() {
    // Add visible class to page reveal elements
    document.querySelectorAll('.page-reveal').forEach((el, i) => {
        setTimeout(() => el.classList.add('visible'), i * 100);
    });
    document.querySelectorAll('.stagger-reveal').forEach(el => {
        el.classList.add('visible');
    });
}

// ========================================
// CUSTOM CURSOR SYSTEM
// ========================================
function initCustomCursor() {
    // Check for touch device
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        return; // Don't init cursor on touch devices
    }

    const cursor = document.getElementById('cursor');
    const cursorTrail = document.getElementById('cursorTrail');
    if (!cursor || !cursorTrail) return;

    const dot = cursor.querySelector('.cursor-dot');
    const ring = cursor.querySelector('.cursor-ring');

    let mouseX = 0, mouseY = 0;
    let dotX = 0, dotY = 0;
    let ringX = 0, ringY = 0;

    // Create trail particles
    const trailCount = 20;
    const trailParticles = [];
    for (let i = 0; i < trailCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'trail-particle';
        particle.style.cssText = `
            position: absolute;
            width: ${4 - (i * 0.15)}px;
            height: ${4 - (i * 0.15)}px;
            background: var(--accent);
            border-radius: 50%;
            opacity: 0;
            transform: translate(-50%, -50%);
            pointer-events: none;
        `;
        cursorTrail.appendChild(particle);
        trailParticles.push({
            el: particle,
            x: 0,
            y: 0
        });
    }

    // Track mouse position
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    // Animate cursor
    function animateCursor() {
        // Smooth dot following
        dotX += (mouseX - dotX) * 0.2;
        dotY += (mouseY - dotY) * 0.2;

        // Smoother ring following (more delay)
        ringX += (mouseX - ringX) * 0.1;
        ringY += (mouseY - ringY) * 0.1;

        // Apply transforms
        dot.style.transform = `translate(${dotX}px, ${dotY}px) translate(-50%, -50%)`;
        ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;

        // Animate trail
        for (let i = trailParticles.length - 1; i > 0; i--) {
            trailParticles[i].x = trailParticles[i - 1].x;
            trailParticles[i].y = trailParticles[i - 1].y;
        }
        trailParticles[0].x = dotX;
        trailParticles[0].y = dotY;

        trailParticles.forEach((p, i) => {
            p.el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`;
            p.el.style.opacity = (1 - i / trailCount) * 0.4;
        });

        requestAnimationFrame(animateCursor);
    }
    animateCursor();

    // Hover effects on interactive elements
    const hoverElements = document.querySelectorAll('a, button, .project-card, .bento-card, .filter-btn, .tech-item');
    hoverElements.forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
    });

    // Text hover effect on headings
    const textElements = document.querySelectorAll('h1, h2, .hero-title');
    textElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            cursor.classList.remove('hover');
            cursor.classList.add('text');
        });
        el.addEventListener('mouseleave', () => cursor.classList.remove('text'));
    });

    // Hide cursor when leaving window
    document.addEventListener('mouseleave', () => cursor.classList.add('hidden'));
    document.addEventListener('mouseenter', () => cursor.classList.remove('hidden'));

    // Magnetic effect on buttons
    const magneticElements = document.querySelectorAll('.btn-primary, .btn-secondary, .nav-cta');
    magneticElements.forEach(el => {
        el.addEventListener('mousemove', (e) => {
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            el.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
        });
        el.addEventListener('mouseleave', () => {
            el.style.transform = '';
        });
    });
}

// ========================================
// LENIS SMOOTH SCROLL
// ========================================
let lenis = null;

function initLenisSmoothScroll() {
    // Don't init on mobile for performance
    if (window.innerWidth < 768 || 'ontouchstart' in window) {
        return;
    }

    if (typeof Lenis === 'undefined') return;

    lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 2,
        infinite: false
    });

    // Connect Lenis to GSAP ScrollTrigger
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        lenis.on('scroll', ScrollTrigger.update);

        gsap.ticker.add((time) => {
            lenis.raf(time * 1000);
        });

        gsap.ticker.lagSmoothing(0);
    }

    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Handle anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                lenis.scrollTo(target, { offset: -100 });
            }
        });
    });
}

// ========================================
// PARALLAX EFFECTS
// ========================================
function initParallaxEffects() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    gsap.registerPlugin(ScrollTrigger);

    // Hero title parallax
    const heroTitleLines = document.querySelectorAll('.title-line[data-parallax]');
    heroTitleLines.forEach((line) => {
        const speed = parseFloat(line.dataset.parallax) || 0.1;
        gsap.to(line, {
            y: () => window.innerHeight * speed,
            ease: 'none',
            scrollTrigger: {
                trigger: '.hero',
                start: 'top top',
                end: 'bottom top',
                scrub: true
            }
        });
    });

    // Section fade-in on scroll
    gsap.utils.toArray('section').forEach(section => {
        gsap.from(section, {
            opacity: 0.8,
            y: 50,
            scrollTrigger: {
                trigger: section,
                start: 'top 80%',
                end: 'top 50%',
                scrub: 1
            }
        });
    });

    // Project cards scale on scroll
    gsap.utils.toArray('.project-card').forEach((card, i) => {
        gsap.from(card, {
            scale: 0.9,
            opacity: 0,
            y: 60,
            scrollTrigger: {
                trigger: card,
                start: 'top 85%',
                end: 'top 60%',
                scrub: 1
            }
        });
    });

    // Bento cards staggered reveal
    const bentoCards = gsap.utils.toArray('.bento-card');
    bentoCards.forEach((card, i) => {
        gsap.from(card, {
            opacity: 0,
            y: 80,
            scale: 0.95,
            duration: 0.8,
            delay: i * 0.1,
            scrollTrigger: {
                trigger: card,
                start: 'top 85%',
                toggleActions: 'play none none reverse'
            }
        });
    });

    // Timeline items
    gsap.utils.toArray('.timeline-item').forEach((item, i) => {
        gsap.from(item, {
            opacity: 0,
            x: -50,
            duration: 0.6,
            delay: i * 0.15,
            scrollTrigger: {
                trigger: item,
                start: 'top 80%',
                toggleActions: 'play none none reverse'
            }
        });
    });
}

// ========================================
// TEXT ANIMATIONS
// ========================================
function initTextAnimations() {
    // Text scramble effect on nav links
    const navLinks = document.querySelectorAll('.nav-links a');

    navLinks.forEach(link => {
        const originalText = link.textContent;
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';

        link.addEventListener('mouseenter', () => {
            let iteration = 0;
            const interval = setInterval(() => {
                link.textContent = originalText
                    .split('')
                    .map((char, index) => {
                        if (index < iteration) {
                            return originalText[index];
                        }
                        return chars[Math.floor(Math.random() * chars.length)];
                    })
                    .join('');

                if (iteration >= originalText.length) {
                    clearInterval(interval);
                }
                iteration += 1 / 3;
            }, 30);
        });

        link.addEventListener('mouseleave', () => {
            link.textContent = originalText;
        });
    });

    // Hero title character animation with SplitType
    if (typeof SplitType !== 'undefined') {
        const heroTitle = document.querySelector('.hero-title');
        if (heroTitle) {
            // Wait for fonts to load
            setTimeout(() => {
                const split = new SplitType(heroTitle, { types: 'chars' });

                gsap.from(split.chars, {
                    opacity: 0,
                    y: 50,
                    rotateX: -90,
                    stagger: 0.02,
                    duration: 0.8,
                    ease: 'back.out(1.7)',
                    delay: 0.5 // After preloader
                });
            }, 100);
        }
    }

    // Section titles reveal animation
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.utils.toArray('.section-title').forEach(title => {
            gsap.from(title, {
                opacity: 0,
                y: 30,
                duration: 0.8,
                scrollTrigger: {
                    trigger: title,
                    start: 'top 85%',
                    toggleActions: 'play none none reverse'
                }
            });
        });

        // Section numbers animation
        gsap.utils.toArray('.section-number').forEach(num => {
            gsap.from(num, {
                opacity: 0,
                x: -30,
                duration: 0.6,
                scrollTrigger: {
                    trigger: num,
                    start: 'top 85%',
                    toggleActions: 'play none none reverse'
                }
            });
        });
    }
}

// ========================================
// THREE.JS HERO ANIMATION
// ========================================
function initThreeJS() {
    const canvas = document.getElementById('heroCanvas');
    if (!canvas || typeof THREE === 'undefined') return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Get theme colors
    const getAccentColor = () => {
        return document.documentElement.getAttribute('data-theme') === 'dark' ? 0xfb923c : 0xf97316;
    };

    // Particles
    const particlesCount = 1500;
    const positions = new Float32Array(particlesCount * 3);
    const colors = new Float32Array(particlesCount * 3);
    const sizes = new Float32Array(particlesCount);

    for (let i = 0; i < particlesCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 15;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 15;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 15;

        // Orange to blue gradient
        const t = Math.random();
        colors[i * 3] = 0.98 * (1 - t) + 0.23 * t;     // R
        colors[i * 3 + 1] = 0.45 * (1 - t) + 0.51 * t; // G
        colors[i * 3 + 2] = 0.09 * (1 - t) + 0.96 * t; // B

        sizes[i] = Math.random() * 3 + 1;
    }

    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particlesGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.02,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
    });

    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);

    // Floating geometric shapes
    const shapes = [];
    const geometries = [
        new THREE.OctahedronGeometry(0.3, 0),
        new THREE.TetrahedronGeometry(0.3, 0),
        new THREE.IcosahedronGeometry(0.25, 0),
        new THREE.TorusGeometry(0.2, 0.08, 8, 16),
        new THREE.BoxGeometry(0.3, 0.3, 0.3)
    ];

    for (let i = 0; i < 8; i++) {
        const geometry = geometries[i % geometries.length];
        const material = new THREE.MeshBasicMaterial({
            color: i % 2 === 0 ? 0xf97316 : 0x3b82f6,
            wireframe: true,
            transparent: true,
            opacity: 0.3
        });
        const mesh = new THREE.Mesh(geometry, material);

        mesh.position.x = (Math.random() - 0.5) * 12;
        mesh.position.y = (Math.random() - 0.5) * 12;
        mesh.position.z = (Math.random() - 0.5) * 8 - 2;

        mesh.rotation.x = Math.random() * Math.PI;
        mesh.rotation.y = Math.random() * Math.PI;

        shapes.push({
            mesh,
            rotationSpeed: { x: (Math.random() - 0.5) * 0.01, y: (Math.random() - 0.5) * 0.01 },
            floatSpeed: Math.random() * 0.5 + 0.3,
            floatOffset: Math.random() * Math.PI * 2,
            originalY: mesh.position.y
        });

        scene.add(mesh);
    }

    // Large torus in background
    const torusGeometry = new THREE.TorusGeometry(3, 0.02, 16, 100);
    const torusMaterial = new THREE.MeshBasicMaterial({
        color: 0xf97316,
        transparent: true,
        opacity: 0.15
    });
    const torus = new THREE.Mesh(torusGeometry, torusMaterial);
    torus.position.z = -5;
    torus.rotation.x = Math.PI / 4;
    scene.add(torus);

    // Second torus
    const torus2Geometry = new THREE.TorusGeometry(2, 0.015, 16, 100);
    const torus2Material = new THREE.MeshBasicMaterial({
        color: 0x3b82f6,
        transparent: true,
        opacity: 0.1
    });
    const torus2 = new THREE.Mesh(torus2Geometry, torus2Material);
    torus2.position.z = -4;
    torus2.rotation.x = -Math.PI / 6;
    scene.add(torus2);

    camera.position.z = 5;

    // Mouse interaction
    let mouseX = 0, mouseY = 0;
    let targetX = 0, targetY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    // Scroll effect
    let scrollY = 0;
    window.addEventListener('scroll', () => {
        scrollY = window.scrollY;
    });

    // Animation
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);

        const elapsedTime = clock.getElapsedTime();

        // Smooth mouse following
        targetX += (mouseX - targetX) * 0.02;
        targetY += (mouseY - targetY) * 0.02;

        // Rotate particles
        particles.rotation.x = targetY * 0.2;
        particles.rotation.y = targetX * 0.2 + elapsedTime * 0.02;

        // Scroll parallax
        particles.position.y = -scrollY * 0.001;

        // Animate torus
        torus.rotation.x = Math.PI / 4 + elapsedTime * 0.05;
        torus.rotation.y = elapsedTime * 0.03;
        torus2.rotation.x = -Math.PI / 6 - elapsedTime * 0.04;
        torus2.rotation.y = -elapsedTime * 0.02;

        // Animate shapes
        shapes.forEach((shape) => {
            shape.mesh.rotation.x += shape.rotationSpeed.x;
            shape.mesh.rotation.y += shape.rotationSpeed.y;
            shape.mesh.position.y = shape.originalY + Math.sin(elapsedTime * shape.floatSpeed + shape.floatOffset) * 0.5;
        });

        renderer.render(scene, camera);
    }

    animate();

    // Resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// ========================================
// THEME TOGGLE
// ========================================
function initThemeToggle() {
    const toggle = document.getElementById('themeToggle');
    const html = document.documentElement;

    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme) {
        html.setAttribute('data-theme', savedTheme);
    } else if (systemPrefersDark) {
        html.setAttribute('data-theme', 'dark');
    }

    toggle?.addEventListener('click', () => {
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });
}

// ========================================
// NAVIGATION
// ========================================
function initNavigation() {
    const nav = document.querySelector('.nav');
    let lastScrollY = window.scrollY;

    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;

        if (currentScrollY > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }

        if (currentScrollY > lastScrollY && currentScrollY > 300) {
            nav.style.transform = 'translateY(-100%)';
        } else {
            nav.style.transform = 'translateY(0)';
        }

        lastScrollY = currentScrollY;
    });

    nav.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
}

// ========================================
// PROJECTS - Dynamic Loading from LocalStorage
// ========================================

// Default projects
const defaultProjects = [
    {
        id: 'eocean',
        title: 'WhatsApp ChatBot Simulator',
        company: 'E-OCEAN',
        category: 'web',
        year: '2024',
        featured: true,
        description: 'Developed a sophisticated ChatBot Simulator with visual Flow Builder to design, preview and test WhatsApp chatbot flows. Features real-time state viewer, drag-and-drop flow creation, and live WhatsApp preview for testing user interactions.',
        tech: ['React.js', 'Redux', 'Tailwind CSS', 'Node.js'],
        image: 'assets/projects/chatbot.jpg',
        color: '#f97316',
        icon: '🤖',
        liveUrl: null,
        githubUrl: null,
        gallery: [{ type: 'image', url: 'assets/projects/chatbot.jpg', alt: 'ChatBot Flow Builder' }]
    },
    {
        id: 'konnect',
        title: 'Konnect.im - Video Conferencing',
        company: 'MILETAP',
        category: 'realtime',
        year: '2024',
        featured: true,
        description: 'Enterprise-grade video conferencing platform supporting multi-participant calls with real-time chat integration. Features screen sharing, participant management, and seamless WebRTC-powered communication.',
        tech: ['React.js', 'SignalR', 'WebRTC', 'Redux'],
        image: 'assets/projects/konnect.im.jpg',
        color: '#3b82f6',
        icon: '📹',
        liveUrl: null,
        githubUrl: null,
        gallery: [{ type: 'image', url: 'assets/projects/konnect.im.jpg', alt: 'Konnect Video Call' }]
    },
    {
        id: 'helpers',
        title: 'Helpers - Service Booking App',
        company: 'Freelance',
        category: 'mobile',
        year: '2024',
        featured: false,
        description: 'Mobile app connecting users with skilled professionals for home services. Features include service categories (Plumbing, Cleaning, Electrician, AC Repair), helper ratings, real-time booking status, and in-app messaging.',
        tech: ['Flutter', 'Firebase', 'Google Maps', 'Stripe'],
        image: 'assets/projects/helpers.jpg',
        color: '#f97316',
        icon: '🔧',
        liveUrl: null,
        githubUrl: null,
        gallery: [{ type: 'image', url: 'assets/projects/helpers.jpg', alt: 'Helpers App' }]
    },
    {
        id: 'khawateen',
        title: 'Khawateen Rozgar Services',
        company: 'EXACT',
        category: 'web',
        year: '2023',
        featured: false,
        description: 'Women empowerment job portal connecting female candidates with employers. Features job search, candidate profiles, workshops, and resources for women re-entering the workforce across IT, Healthcare, Teaching, and Marketing sectors.',
        tech: ['React.js', 'Node.js', 'MongoDB', 'Express'],
        image: 'assets/projects/khawateen.jpg',
        color: '#ec4899',
        icon: '👩‍💼',
        liveUrl: null,
        githubUrl: null,
        gallery: [
            { type: 'image', url: 'assets/projects/khawateen.jpg', alt: 'Khawateen Portal' },
            { type: 'image', url: 'assets/projects/khawateen_rozgar_services_cover.jpeg', alt: 'Khawateen Logo' }
        ]
    },
    {
        id: 'kistpay',
        title: 'Kistpay Admin Portal',
        company: 'KISTPAY',
        category: 'web',
        year: '2023',
        featured: false,
        description: 'Installment management system for tracking customer payments. Dashboard with analytics for total installments, active customers, pending payments (8.4M PKR), payment graphs, and role-based access control.',
        tech: ['React.js', 'Redux', 'Chart.js', 'REST API'],
        image: 'assets/projects/kistpay-portal.jpg',
        color: '#14b8a6',
        icon: '💳',
        liveUrl: null,
        githubUrl: null,
        gallery: [{ type: 'image', url: 'assets/projects/kistpay-portal.jpg', alt: 'Kistpay Dashboard' }]
    },
    {
        id: 'opd',
        title: 'OPD Entry Software',
        company: 'KHADIM-E-INSANIYAT',
        category: 'mobile',
        year: '2023',
        featured: false,
        description: 'Healthcare OPD management app for patient registration and tracking. Features daily patient count, pending cases, patient search, new entry forms, and full offline support with local database sync.',
        tech: ['Flutter', 'Floor ORM', 'SQLite', 'Dart'],
        image: 'assets/projects/opd-entry.jpg',
        color: '#22c55e',
        icon: '🏥',
        liveUrl: null,
        githubUrl: null,
        gallery: [{ type: 'image', url: 'assets/projects/opd-entry.jpg', alt: 'OPD Entry App' }]
    },
    {
        id: 'reapagro',
        title: 'Reap Agro - Loan Management',
        company: 'REAP AGRO',
        category: 'web',
        year: '2023',
        featured: false,
        description: 'Agricultural loan management system for farmers. Track total loans, active loans, document uploads, land records, agreements, and repayment schedules with intuitive dashboard interface.',
        tech: ['React.js', 'Node.js', 'PostgreSQL', 'AWS'],
        image: 'assets/projects/reap-agro.jpg',
        color: '#84cc16',
        icon: '🌾',
        liveUrl: null,
        githubUrl: null,
        gallery: [{ type: 'image', url: 'assets/projects/reap-agro.jpg', alt: 'Reap Agro Dashboard' }]
    },
    {
        id: 'screening',
        title: 'Digital Display Manager',
        company: 'SCREENING',
        category: 'web',
        year: '2022',
        featured: false,
        description: 'Content management system for digital signage displays. Features playlist builder, live preview, zone management, content scheduling with calendar, and multi-display support for corporate environments.',
        tech: ['React.js', 'Electron', 'Node.js', 'WebSocket'],
        image: 'assets/projects/screening.jpg',
        color: '#f59e0b',
        icon: '🖥️',
        liveUrl: null,
        githubUrl: null,
        gallery: [{ type: 'image', url: 'assets/projects/screening.jpg', alt: 'Screening Dashboard' }]
    },
    {
        id: 'leavesystem',
        title: 'Leave Management System',
        company: 'DR. RUTH K.M. PFAU CIVIL HOSPITAL',
        category: 'web',
        year: '2019',
        featured: false,
        description: 'Employee leave application and management system for Civil Hospital Karachi. Features pending requests, leave history, application submission, approval workflow, and department-wise tracking.',
        tech: ['PHP', 'jQuery', 'MySQL', 'Bootstrap'],
        image: 'assets/projects/leave-applications-system.jpg',
        color: '#0ea5e9',
        icon: '📋',
        liveUrl: null,
        githubUrl: null,
        gallery: [{ type: 'image', url: 'assets/projects/leave-applications-system.jpg', alt: 'Leave System' }]
    }
];

function getProjects() {
    // Always use defaultProjects for consistent data
    // Update localStorage with latest projects
    localStorage.setItem('portfolio_projects', JSON.stringify(defaultProjects));
    return defaultProjects;
}

function generateProjectImage(project) {
    // Generate SVG placeholder with project colors
    const color = project.color || '#f97316';
    const icon = project.icon || '📁';

    return `
        <svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg" class="project-svg">
            <defs>
                <linearGradient id="grad-${project.id}" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:${color};stop-opacity:0.2" />
                    <stop offset="100%" style="stop-color:${color};stop-opacity:0.05" />
                </linearGradient>
                <pattern id="grid-${project.id}" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="${color}" stroke-width="0.5" opacity="0.3"/>
                </pattern>
            </defs>
            <rect width="400" height="250" fill="url(#grad-${project.id})"/>
            <rect width="400" height="250" fill="url(#grid-${project.id})"/>
            <circle cx="200" cy="100" r="60" fill="${color}" opacity="0.15"/>
            <circle cx="200" cy="100" r="40" fill="${color}" opacity="0.2"/>
            <text x="200" y="115" text-anchor="middle" font-size="50">${icon}</text>
            <text x="200" y="200" text-anchor="middle" font-family="system-ui" font-size="14" fill="${color}" font-weight="600">${project.company}</text>
        </svg>
    `;
}

function renderProjects() {
    const grid = document.getElementById('projectsGrid');
    if (!grid) return;

    const projects = getProjects();

    grid.innerHTML = projects.map(project => `
        <article class="project-card ${project.featured ? 'featured' : ''}" data-category="${project.category}" data-project="${project.id}">
            <div class="project-media">
                <div class="project-thumbnail">
                    ${project.image ? `<img src="${project.image}" alt="${project.title}" loading="lazy">` : generateProjectImage(project)}
                </div>
                <div class="project-badges">
                    ${project.featured ? '<span class="badge">Featured</span>' : ''}
                    <span class="badge">${project.year}</span>
                </div>
                <button class="project-play" aria-label="View details" onclick="openProjectModal('${project.id}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                </button>
            </div>
            <div class="project-content">
                <span class="project-company">${project.company}</span>
                <h3 class="project-title">${project.title}</h3>
                <p class="project-desc">${project.description.length > 120 ? project.description.substring(0, 120) + '...' : project.description}</p>
                <div class="project-tech">
                    ${project.tech.slice(0, 4).map(t => `<span>${t}</span>`).join('')}
                </div>
                <div class="project-actions">
                    <button class="btn-view" onclick="openProjectModal('${project.id}')">
                        View Details
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                    </button>
                </div>
            </div>
        </article>
    `).join('');
}

function initProjects() {
    renderProjects();
    initProjectFilter();
    initProjectModal();
}

function initProjectFilter() {
    const filterBtns = document.querySelectorAll('.filter-btn');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.dataset.filter;
            const projects = document.querySelectorAll('.project-card');

            projects.forEach((project, index) => {
                const category = project.dataset.category;
                const shouldShow = filter === 'all' || category === filter || !category;

                if (shouldShow) {
                    project.style.display = '';
                    project.style.animation = `fadeInUp 0.5s ease ${index * 0.1}s both`;
                } else {
                    project.style.display = 'none';
                }
            });
        });
    });
}

// ========================================
// PROJECT MODAL
// ========================================
function initProjectModal() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeProjectModal();
    });
}

function openProjectModal(projectId) {
    const projects = getProjects();
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const modal = document.getElementById('projectModal');

    document.getElementById('modalCompany').textContent = project.company;
    document.getElementById('modalTitle').textContent = project.title;

    document.getElementById('modalDescription').innerHTML = `
        <h3>About this project</h3>
        <p>${project.description}</p>
    `;

    document.getElementById('modalTech').innerHTML = project.tech.map(t => `<span>${t}</span>`).join('');

    // Gallery
    const gallery = document.getElementById('modalGallery');
    if (project.gallery && project.gallery.length > 0) {
        gallery.innerHTML = `<div class="gallery-grid">${project.gallery.map(item => {
            if (item.type === 'video') {
                return `<div class="gallery-item"><video controls src="${item.url}"></video></div>`;
            }
            return `<div class="gallery-item"><img src="${item.url}" alt="${item.alt || project.title}" loading="lazy"></div>`;
        }).join('')}</div>`;
    } else if (project.image) {
        gallery.innerHTML = `<div class="gallery-item"><img src="${project.image}" alt="${project.title}"></div>`;
    } else {
        gallery.innerHTML = `
            <div class="gallery-placeholder">
                ${generateProjectImage(project)}
                <p style="margin-top: 20px;">Screenshots coming soon</p>
            </div>
        `;
    }

    // Links
    const links = document.getElementById('modalLinks');
    let linksHtml = '';
    if (project.liveUrl) {
        linksHtml += `<a href="${project.liveUrl}" target="_blank" class="modal-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Live Demo
        </a>`;
    }
    if (project.githubUrl) {
        linksHtml += `<a href="${project.githubUrl}" target="_blank" class="modal-link">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            Source Code
        </a>`;
    }
    links.innerHTML = linksHtml || '<p style="color: var(--text-muted); font-size: 13px;">Links coming soon...</p>';

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeProjectModal() {
    document.getElementById('projectModal')?.classList.remove('active');
    document.body.style.overflow = '';
}

window.openProjectModal = openProjectModal;
window.closeProjectModal = closeProjectModal;

// ========================================
// SCROLL ANIMATIONS (Enhanced)
// ========================================
function initScrollAnimations() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    gsap.registerPlugin(ScrollTrigger);

    // Contact links
    gsap.utils.toArray('.contact-link').forEach((el, i) => {
        gsap.from(el, {
            scrollTrigger: {
                trigger: el,
                start: 'top 85%',
                toggleActions: 'play none none reverse'
            },
            x: -40,
            opacity: 0,
            duration: 0.6,
            delay: i * 0.1,
            ease: 'power3.out'
        });
    });

    // Contact form
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        gsap.from(contactForm, {
            scrollTrigger: {
                trigger: contactForm,
                start: 'top 80%',
                toggleActions: 'play none none reverse'
            },
            y: 60,
            opacity: 0,
            duration: 0.8,
            ease: 'power3.out'
        });
    }

    // Stats counter animation
    const stats = document.querySelectorAll('.stat-num');
    stats.forEach(stat => {
        const finalValue = parseInt(stat.textContent);
        if (!isNaN(finalValue)) {
            gsap.from(stat, {
                textContent: 0,
                duration: 2,
                snap: { textContent: 1 },
                scrollTrigger: {
                    trigger: stat,
                    start: 'top 80%',
                    toggleActions: 'play none none none'
                },
                onUpdate: function() {
                    stat.textContent = Math.ceil(this.targets()[0].textContent) + '+';
                }
            });
        }
    });

    // Hero elements stagger
    const heroElements = document.querySelectorAll('.hero-tag, .hero-subtitle, .hero-actions, .hero-stats');
    gsap.from(heroElements, {
        opacity: 0,
        y: 40,
        stagger: 0.15,
        duration: 0.8,
        delay: 1, // After preloader and title animation
        ease: 'power3.out'
    });

    // Floating cards in hero
    const floatCards = document.querySelectorAll('.float-card');
    floatCards.forEach((card, i) => {
        gsap.from(card, {
            opacity: 0,
            scale: 0.5,
            duration: 0.6,
            delay: 1.5 + (i * 0.1),
            ease: 'back.out(1.7)'
        });
    });
}

// ========================================
// CONTACT FORM (EmailJS Integration)
// ========================================
// EmailJS Configuration - Replace with your credentials
const EMAILJS_CONFIG = {
    publicKey: '35TUGIzR3rDAsxanA',
    serviceId: 'service_o38uddm',
    templateId: 'template_vrueasq'
};

function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    // Initialize EmailJS
    if (typeof emailjs !== 'undefined') {
        emailjs.init(EMAILJS_CONFIG.publicKey);
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        const btnText = btn.querySelector('span');
        const originalText = btnText.textContent;

        btn.disabled = true;
        btnText.textContent = 'Sending...';

        try {
            // Send email using EmailJS
            await emailjs.send(
                EMAILJS_CONFIG.serviceId,
                EMAILJS_CONFIG.templateId,
                {
                    from_name: form.querySelector('#name').value,
                    from_email: form.querySelector('#email').value,
                    subject: form.querySelector('#subject').value,
                    message: form.querySelector('#message').value,
                    to_name: 'Shah Fahad'
                }
            );

            btnText.textContent = 'Message Sent!';
            btn.style.background = '#22c55e';
            form.reset();

            setTimeout(() => {
                btn.disabled = false;
                btnText.textContent = originalText;
                btn.style.background = '';
            }, 3000);

        } catch (error) {
            console.error('EmailJS Error:', error);
            btnText.textContent = 'Failed! Try Again';
            btn.style.background = '#ef4444';

            setTimeout(() => {
                btn.disabled = false;
                btnText.textContent = originalText;
                btn.style.background = '';
            }, 3000);
        }
    });
}

// ========================================
// SMOOTH SCROLL (Fallback for non-Lenis)
// ========================================
function initSmoothScroll() {
    // Only init if Lenis is not active
    if (lenis) return;

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const top = target.getBoundingClientRect().top + window.scrollY - 100;
                window.scrollTo({ top, behavior: 'smooth' });
            }
        });
    });
}

// ========================================
// STYLES
// ========================================
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .project-svg {
        width: 100%;
        height: 100%;
    }
    .gallery-item {
        border-radius: 12px;
        overflow: hidden;
        margin-bottom: 16px;
    }
    .gallery-item img, .gallery-item video {
        width: 100%;
        display: block;
    }
    .gallery-placeholder {
        text-align: center;
        padding: 20px;
    }
    .gallery-placeholder .project-svg {
        max-width: 300px;
        margin: 0 auto;
        border-radius: 12px;
        overflow: hidden;
    }
`;
document.head.appendChild(style);

// ========================================
// RESUME DOWNLOAD (JSONBin.io)
// ========================================
const JSONBIN_BIN_ID = 'YOUR_BIN_ID';  // Same as admin panel
let resumeUrl = null;

async function initResume() {
    const resumeBtn = document.getElementById('downloadResumeBtn');
    if (!resumeBtn) return;

    try {
        // Fetch resume URL from JSONBin (public read)
        const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
            headers: { 'X-Access-Key': '$2a$10$xxxxxxxx' } // Will be replaced with actual key
        });
        const data = await response.json();

        if (data.record && data.record.resumeUrl) {
            resumeUrl = data.record.resumeUrl;
            resumeBtn.style.display = 'inline-flex';
        }
    } catch (error) {
        // Fallback to local file
        try {
            const localResponse = await fetch('assets/Shah_Fahad_Resume.pdf', { method: 'HEAD' });
            if (localResponse.ok) {
                resumeUrl = 'assets/Shah_Fahad_Resume.pdf';
                resumeBtn.style.display = 'inline-flex';
            }
        } catch (e) {
            resumeBtn.style.display = 'none';
        }
    }
}

function downloadResume() {
    if (resumeUrl) {
        const link = document.createElement('a');
        link.href = resumeUrl;
        link.download = 'Shah_Fahad_Resume.pdf';
        link.target = '_blank';
        link.click();
    }
}

// Console
console.log('%c👋 Hey there!', 'font-size: 24px; font-weight: bold; color: #f97316;');
console.log('%cAdmin Panel: /admin.html', 'font-size: 14px; color: #888;');
