// ========================================
// SHAH FAHAD PORTFOLIO
// Three.js + Dynamic Projects
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    initThreeJS();
    initThemeToggle();
    initNavigation();
    initProjects();
    initScrollAnimations();
    initContactForm();
    initSmoothScroll();
    initResume();
});

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
        title: 'WhatsApp ChatBot System',
        company: 'E-OCEAN',
        category: 'web',
        year: '2024',
        featured: true,
        description: 'Developed a sophisticated ChatBot System to preview chatbot flows and guide WhatsApp users engaging with e-Ocean\'s services. The system simulates chatbot interactions for testing and engagement.',
        tech: ['React.js', 'Redux', 'Tailwind CSS', 'jQuery'],
        image: null,
        color: '#f97316',
        icon: '🤖',
        liveUrl: null,
        githubUrl: null,
        gallery: []
    },
    {
        id: 'konnect',
        title: 'Konnect - Communication Platform',
        company: 'MILETAP',
        category: 'realtime',
        year: '2024',
        featured: false,
        description: 'Real-time communication platform with messaging and video conferencing. Built with emphasis on high performance, low latency, and scalability.',
        tech: ['React.js', 'SignalR', 'WebRTC', 'Redux'],
        image: null,
        color: '#3b82f6',
        icon: '📹',
        liveUrl: null,
        githubUrl: null,
        gallery: []
    },
    {
        id: 'opd',
        title: 'OPD Entry Software',
        company: 'KHADIM-E-INSANIYAT',
        category: 'mobile',
        year: '2023',
        featured: false,
        description: 'Healthcare OPD management software built with Flutter. Cross-platform compatibility for Android and iOS with offline support.',
        tech: ['Flutter', 'Floor ORM', 'SQLite', 'Dart'],
        image: null,
        color: '#22c55e',
        icon: '🏥',
        liveUrl: null,
        githubUrl: null,
        gallery: []
    }
];

function getProjects() {
    const stored = localStorage.getItem('portfolio_projects');
    if (stored) {
        return JSON.parse(stored);
    }
    // Initialize with defaults
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
                    ${project.image ? `<img src="${project.image}" alt="${project.title}">` : generateProjectImage(project)}
                </div>
                <div class="project-badges">
                    ${project.featured ? '<span class="badge">Featured</span>' : ''}
                    <span class="badge">${project.year}</span>
                </div>
                ${project.gallery && project.gallery.length > 0 ? `
                    <button class="project-play" aria-label="View gallery">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21 15 16 10 5 21"/>
                        </svg>
                    </button>
                ` : ''}
            </div>
            <div class="project-content">
                <span class="project-company">${project.company}</span>
                <h3 class="project-title">${project.title}</h3>
                <p class="project-desc">${project.description}</p>
                <div class="project-tech">
                    ${project.tech.map(t => `<span>${t}</span>`).join('')}
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

    // Add "More coming" card
    grid.innerHTML += `
        <article class="project-card add-project">
            <div class="add-content">
                <div class="add-icon">+</div>
                <span>More projects coming soon...</span>
            </div>
        </article>
    `;
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
        gallery.innerHTML = project.gallery.map(item => {
            if (item.type === 'video') {
                return `<div class="gallery-item"><video controls src="${item.url}"></video></div>`;
            }
            return `<div class="gallery-item"><img src="${item.url}" alt="${item.alt || project.title}"></div>`;
        }).join('');
    } else {
        gallery.innerHTML = `
            <div class="gallery-placeholder">
                ${generateProjectImage(project)}
                <p style="margin-top: 20px;">Screenshots and videos coming soon</p>
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
// SCROLL ANIMATIONS
// ========================================
function initScrollAnimations() {
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);

        gsap.utils.toArray('.section-header, .bento-card, .timeline-item, .contact-link').forEach((el, i) => {
            gsap.from(el, {
                scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' },
                y: 60, opacity: 0, duration: 0.7, delay: i * 0.05, ease: 'power3.out'
            });
        });
    }
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
// SMOOTH SCROLL
// ========================================
function initSmoothScroll() {
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
// RESUME DOWNLOAD
// ========================================
function initResume() {
    const resumeBtn = document.getElementById('downloadResumeBtn');
    if (!resumeBtn) return;

    const resumeData = localStorage.getItem('portfolio_resume');
    if (resumeData) {
        resumeBtn.style.display = 'inline-flex';
    }
}

function downloadResume() {
    const resumeData = localStorage.getItem('portfolio_resume');
    if (resumeData) {
        const resume = JSON.parse(resumeData);
        const link = document.createElement('a');
        link.href = resume.data;
        link.download = resume.name || 'Shah_Fahad_Resume.pdf';
        link.click();
    }
}

// Console
console.log('%c👋 Hey there!', 'font-size: 24px; font-weight: bold; color: #f97316;');
console.log('%cAdmin Panel: /admin.html', 'font-size: 14px; color: #888;');
