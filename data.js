import { db } from './firebase-config.js';
import {
    collection, getDocs, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// ─── Projects ───────────────────────────────────────────────────────────────

async function loadProjects() {
    const grid = document.getElementById('portfolio-grid');
    if (!grid) return;

    grid.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border" style="color:var(--accent-color)" role="status"></div>
        </div>`;

    try {
        const q = query(collection(db, 'projects'), orderBy('order', 'asc'));
        const snap = await getDocs(q);

        if (snap.empty) {
            grid.innerHTML = `<div class="col-12 text-center"><p class="text-muted">No projects added yet.</p></div>`;
            return;
        }

        grid.innerHTML = '';
        snap.forEach(doc => {
            grid.insertAdjacentHTML('beforeend', projectCard({ id: doc.id, ...doc.data() }));
        });

        if (window.AOS) AOS.refresh();

    } catch (err) {
        console.error('loadProjects:', err);
        grid.innerHTML = `<div class="col-12 text-center"><p class="text-danger">Failed to load projects.</p></div>`;
    }
}

function projectCard(p) {
    const tags = (p.tags || []).map(t => `<span class="project-tag">${t}</span>`).join('');
    const extLink = p.projectUrl
        ? `<a href="${p.projectUrl}" target="_blank" class="portfolio-link" title="Live Demo"><i class="fas fa-external-link-alt"></i></a>`
        : '';
    const ghLink = p.githubUrl
        ? `<a href="${p.githubUrl}" target="_blank" class="portfolio-link" title="GitHub"><i class="fab fa-github"></i></a>`
        : '';

    return `
        <div class="col-lg-4 col-md-6 mb-4" data-aos="fade-up">
            <div class="portfolio-card">
                <div class="portfolio-img">
                    <img src="${p.image || 'images/placeholder.png'}" alt="${p.title}" loading="lazy">
                    <div class="portfolio-overlay">
                        <div class="portfolio-links">${extLink}${ghLink}</div>
                    </div>
                </div>
                <div class="portfolio-content">
                    ${tags ? `<div class="project-tags mb-2">${tags}</div>` : ''}
                    <h4>${p.title}</h4>
                    <p>${p.description}</p>
                    <a href="project.html?id=${p.id}" class="btn-portfolio">
                        <i class="fas fa-play-circle me-1"></i> View Project
                    </a>
                </div>
            </div>
        </div>`;
}

// ─── Skills ─────────────────────────────────────────────────────────────────

async function loadSkills() {
    const container = document.getElementById('skills-container');
    if (!container) return;

    container.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border" style="color:var(--accent-color)" role="status"></div>
        </div>`;

    try {
        const q = query(collection(db, 'skills'), orderBy('order', 'asc'));
        const snap = await getDocs(q);

        if (snap.empty) {
            container.innerHTML = `<div class="col-12 text-center"><p class="text-muted">No skills added yet.</p></div>`;
            return;
        }

        container.innerHTML = '';
        let delay = 100;
        snap.forEach(doc => {
            container.insertAdjacentHTML('beforeend', skillCategory({ id: doc.id, ...doc.data() }, delay));
            delay += 100;
        });

        // Animate bars after render
        setTimeout(() => {
            document.querySelectorAll('.skill-progress').forEach(bar => {
                bar.style.width = bar.dataset.level + '%';
            });
        }, 300);

        if (window.AOS) AOS.refresh();

    } catch (err) {
        console.error('loadSkills:', err);
        container.innerHTML = `<div class="col-12 text-center"><p class="text-danger">Failed to load skills.</p></div>`;
    }
}

function skillCategory(cat, delay) {
    const isBar = cat.type === 'bar';
    const inner = isBar
        ? (cat.skills || []).map(s => `
            <div class="skill-item">
                <span class="skill-name">${s.name}</span>
                <div class="skill-bar">
                    <div class="skill-progress" data-level="${s.level}" style="width:0%"></div>
                </div>
            </div>`).join('')
        : (cat.skills || []).map(s => `<span class="skill-tag">${s.name}</span>`).join('');

    return `
        <div class="col-lg-6 mb-5" data-aos="fade-up" data-aos-delay="${delay}">
            <div class="skill-category">
                <div class="skill-header">
                    <i class="${cat.icon || 'fas fa-star'} skill-category-icon"></i>
                    <h4>${cat.name}</h4>
                </div>
                <div class="${isBar ? 'skills-grid' : 'skills-list-tags'}">${inner}</div>
            </div>
        </div>`;
}

// ─── Init ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    loadProjects();
    loadSkills();
});
