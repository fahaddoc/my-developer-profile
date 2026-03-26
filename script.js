// ========================================
// SHAH FAHAD PORTFOLIO
// Premium Interactive Experience
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    initNavigation();
    initScrollAnimations();
    initProjectFilter();
    initProjectModal();
    initContactForm();
    initSmoothScroll();
});

// ========================================
// THEME TOGGLE
// ========================================
function initThemeToggle() {
    const toggle = document.getElementById('themeToggle');
    const html = document.documentElement;

    // Check for saved preference or system preference
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme) {
        html.setAttribute('data-theme', savedTheme);
    } else if (systemPrefersDark) {
        html.setAttribute('data-theme', 'dark');
    }

    toggle.addEventListener('click', () => {
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);

        // Add animation
        toggle.style.transform = 'rotate(360deg) scale(1.1)';
        setTimeout(() => {
            toggle.style.transform = '';
        }, 300);
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

        // Add scrolled class
        if (currentScrollY > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }

        // Hide/show nav on scroll direction
        if (currentScrollY > lastScrollY && currentScrollY > 300) {
            nav.style.transform = 'translateY(-100%)';
        } else {
            nav.style.transform = 'translateY(0)';
        }

        lastScrollY = currentScrollY;
    });

    // Add transition
    nav.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
}

// ========================================
// SCROLL ANIMATIONS
// ========================================
function initScrollAnimations() {
    // Register GSAP plugins if available
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);

        // Animate section headers
        gsap.utils.toArray('.section-header').forEach(header => {
            gsap.from(header, {
                scrollTrigger: {
                    trigger: header,
                    start: 'top 80%',
                    toggleActions: 'play none none reverse'
                },
                y: 50,
                opacity: 0,
                duration: 0.8,
                ease: 'power3.out'
            });
        });

        // Animate bento cards
        gsap.utils.toArray('.bento-card').forEach((card, i) => {
            gsap.from(card, {
                scrollTrigger: {
                    trigger: card,
                    start: 'top 85%',
                    toggleActions: 'play none none reverse'
                },
                y: 60,
                opacity: 0,
                duration: 0.6,
                delay: i * 0.1,
                ease: 'power3.out'
            });
        });

        // Animate project cards
        gsap.utils.toArray('.project-card').forEach((card, i) => {
            gsap.from(card, {
                scrollTrigger: {
                    trigger: card,
                    start: 'top 85%',
                    toggleActions: 'play none none reverse'
                },
                y: 80,
                opacity: 0,
                duration: 0.7,
                delay: i * 0.15,
                ease: 'power3.out'
            });
        });

        // Animate timeline items
        gsap.utils.toArray('.timeline-item').forEach((item, i) => {
            gsap.from(item, {
                scrollTrigger: {
                    trigger: item,
                    start: 'top 85%',
                    toggleActions: 'play none none reverse'
                },
                x: -50,
                opacity: 0,
                duration: 0.6,
                delay: i * 0.1,
                ease: 'power3.out'
            });
        });

        // Animate contact links
        gsap.utils.toArray('.contact-link').forEach((link, i) => {
            gsap.from(link, {
                scrollTrigger: {
                    trigger: link,
                    start: 'top 90%',
                    toggleActions: 'play none none reverse'
                },
                x: -30,
                opacity: 0,
                duration: 0.5,
                delay: i * 0.1,
                ease: 'power3.out'
            });
        });

    } else {
        // Fallback: Use Intersection Observer
        const observerOptions = {
            root: null,
            rootMargin: '0px 0px -100px 0px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, observerOptions);

        // Add CSS for fallback animations
        const style = document.createElement('style');
        style.textContent = `
            .bento-card, .project-card, .timeline-item, .contact-link, .section-header {
                opacity: 0;
                transform: translateY(40px);
                transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .animate-in {
                opacity: 1 !important;
                transform: translateY(0) !important;
            }
        `;
        document.head.appendChild(style);

        document.querySelectorAll('.bento-card, .project-card, .timeline-item, .contact-link, .section-header')
            .forEach(el => observer.observe(el));
    }
}

// ========================================
// PROJECT FILTER
// ========================================
function initProjectFilter() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const projects = document.querySelectorAll('.project-card');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active button
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.dataset.filter;

            // Filter projects
            projects.forEach((project, index) => {
                const category = project.dataset.category;
                const shouldShow = filter === 'all' || category === filter;

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

// Add fadeInUp animation
const filterStyles = document.createElement('style');
filterStyles.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(filterStyles);

// ========================================
// PROJECT MODAL
// ========================================
// Project data - Add your screenshots and videos here
const projectData = {
    eocean: {
        company: 'E-OCEAN',
        title: 'WhatsApp ChatBot System',
        description: `
            <p>Developed a sophisticated ChatBot System to preview chatbot flows and guide WhatsApp users engaging with e-Ocean's services.</p>
            <p>The system was designed to simulate chatbot interactions, providing a seamless and user-friendly experience for testing and user engagement.</p>
            <h4>Key Features:</h4>
            <ul>
                <li>Visual flow builder for chatbot conversations</li>
                <li>Real-time preview of WhatsApp messages</li>
                <li>User engagement analytics dashboard</li>
                <li>Integration with WhatsApp Business API</li>
            </ul>
        `,
        tech: ['React.js', 'Redux', 'Tailwind CSS', 'jQuery', 'REST API'],
        gallery: [
            // Add your screenshots here:
            // { type: 'image', src: 'projects/eocean/screenshot1.png', alt: 'Dashboard View' },
            // { type: 'image', src: 'projects/eocean/screenshot2.png', alt: 'Chat Flow Builder' },
            // { type: 'video', src: 'projects/eocean/demo.mp4', poster: 'projects/eocean/poster.png' },
        ],
        links: {
            live: null, // Add live demo URL
            github: null // Add GitHub URL
        }
    },
    konnect: {
        company: 'MILETAP',
        title: 'Konnect - Real-Time Communication Platform',
        description: `
            <p>Built a real-time communication platform designed to facilitate seamless interactions through messaging and video conferencing.</p>
            <p>The project emphasized high performance, low latency, and scalability to support a broad user base.</p>
            <h4>Key Features:</h4>
            <ul>
                <li>Real-time messaging with SignalR</li>
                <li>Video conferencing using WebRTC</li>
                <li>Screen sharing capabilities</li>
                <li>User presence and typing indicators</li>
                <li>Message encryption for security</li>
            </ul>
        `,
        tech: ['React.js', 'SignalR', 'WebRTC', 'Redux', 'React Hooks'],
        gallery: [
            // Add your screenshots here
        ],
        links: {
            live: null,
            github: null
        }
    },
    opd: {
        company: 'KHADIM-E-INSANIYAT',
        title: 'OPD Entry Software',
        description: `
            <p>Developed a robust and user-friendly OPD Entry Software designed to streamline outpatient department operations.</p>
            <p>The application was built using Flutter for a cross-platform interface, ensuring compatibility across Android and iOS devices.</p>
            <h4>Key Features:</h4>
            <ul>
                <li>Patient registration and management</li>
                <li>Appointment scheduling system</li>
                <li>Medical history tracking</li>
                <li>Offline functionality with local database</li>
                <li>Report generation and analytics</li>
            </ul>
        `,
        tech: ['Flutter', 'Floor ORM', 'SQLite', 'Dart'],
        gallery: [
            // Add your screenshots here
        ],
        links: {
            live: null,
            github: null
        }
    }
};

function initProjectModal() {
    const modal = document.getElementById('projectModal');

    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeProjectModal();
        }
    });
}

function openProjectModal(projectId) {
    const modal = document.getElementById('projectModal');
    const project = projectData[projectId];

    if (!project) return;

    // Populate modal content
    document.getElementById('modalCompany').textContent = project.company;
    document.getElementById('modalTitle').textContent = project.title;
    document.getElementById('modalDescription').innerHTML = `<h3>About this project</h3>${project.description}`;

    // Populate tech tags
    const techContainer = document.getElementById('modalTech');
    techContainer.innerHTML = project.tech.map(t => `<span>${t}</span>`).join('');

    // Populate gallery
    const galleryContainer = document.getElementById('modalGallery');
    if (project.gallery && project.gallery.length > 0) {
        galleryContainer.innerHTML = project.gallery.map(item => {
            if (item.type === 'image') {
                return `<div class="gallery-item"><img src="${item.src}" alt="${item.alt}" loading="lazy"></div>`;
            } else if (item.type === 'video') {
                return `
                    <div class="gallery-item video">
                        <video controls poster="${item.poster || ''}">
                            <source src="${item.src}" type="video/mp4">
                        </video>
                    </div>
                `;
            }
        }).join('');
    } else {
        galleryContainer.innerHTML = `
            <div class="gallery-placeholder">
                <p>Add screenshots and videos to showcase your project</p>
                <span>Add images to: projects/${projectId}/</span>
            </div>
        `;
    }

    // Populate links
    const linksContainer = document.getElementById('modalLinks');
    linksContainer.innerHTML = '';
    if (project.links.live) {
        linksContainer.innerHTML += `
            <a href="${project.links.live}" target="_blank" class="modal-link">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                    <polyline points="15 3 21 3 21 9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                Live Demo
            </a>
        `;
    }
    if (project.links.github) {
        linksContainer.innerHTML += `
            <a href="${project.links.github}" target="_blank" class="modal-link">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                Source Code
            </a>
        `;
    }
    if (!project.links.live && !project.links.github) {
        linksContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 13px;">Links coming soon...</p>';
    }

    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeProjectModal() {
    const modal = document.getElementById('projectModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// Make functions globally available
window.openProjectModal = openProjectModal;
window.closeProjectModal = closeProjectModal;

// ========================================
// CONTACT FORM
// ========================================
function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = form.querySelector('button[type="submit"]');
        const btnText = btn.querySelector('span');
        const originalText = btnText.textContent;

        // Loading state
        btn.disabled = true;
        btnText.textContent = 'Sending...';
        btn.style.opacity = '0.7';

        // Simulate sending (replace with actual API call)
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Success state
        btnText.textContent = 'Message Sent!';
        btn.style.background = '#22c55e';
        btn.style.opacity = '1';

        // Reset form
        form.reset();

        // Reset button after delay
        setTimeout(() => {
            btn.disabled = false;
            btnText.textContent = originalText;
            btn.style.background = '';
        }, 3000);
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
                const offset = 100;
                const top = target.getBoundingClientRect().top + window.scrollY - offset;
                window.scrollTo({
                    top,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ========================================
// UTILITY: Add hover effects
// ========================================
document.querySelectorAll('.btn-primary, .btn-secondary, .btn-outline, .btn-view').forEach(btn => {
    btn.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-2px)';
    });
    btn.addEventListener('mouseleave', function() {
        this.style.transform = '';
    });
});

// ========================================
// CONSOLE MESSAGE
// ========================================
console.log('%c👋 Hey there!', 'font-size: 24px; font-weight: bold; color: #f97316;');
console.log('%cWelcome to my portfolio. Looking to hire?', 'font-size: 14px; color: #888;');
console.log('%cEmail: fahaddoc600@gmail.com', 'font-size: 14px; color: #f97316;');
console.log('%cPhone: +92 304 2186009', 'font-size: 14px; color: #f97316;');

// ========================================
// GALLERY STYLES (for modal)
// ========================================
const galleryStyles = document.createElement('style');
galleryStyles.textContent = `
    .gallery-item {
        border-radius: 12px;
        overflow: hidden;
        margin-bottom: 16px;
    }
    .gallery-item img {
        width: 100%;
        height: auto;
        display: block;
    }
    .gallery-item video {
        width: 100%;
        height: auto;
        display: block;
    }
    .gallery-item.video {
        position: relative;
    }
    #modalDescription h4 {
        font-size: 16px;
        font-weight: 600;
        margin: 20px 0 12px;
    }
    #modalDescription ul {
        padding-left: 20px;
        color: var(--text-secondary);
    }
    #modalDescription li {
        margin-bottom: 8px;
    }
    #modalDescription p {
        margin-bottom: 12px;
    }
`;
document.head.appendChild(galleryStyles);
