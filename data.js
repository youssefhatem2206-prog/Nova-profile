// data.js — reads all data from Firebase Firestore (ES module)
import { db } from './firebase-config.js';
import {
    collection, getDocs, doc, getDoc, addDoc, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// ── Deploy badge helper ───────────────────────────────────
const DEPLOY_LABELS = { cloud: 'Cloud', onprem: 'On-Premises', hybrid: 'Hybrid' };

function deployBadge(type) {
    if (!type) return '';
    const label = DEPLOY_LABELS[type] || type;
    const icon  = type === 'cloud' ? 'fa-cloud' : type === 'onprem' ? 'fa-server' : 'fa-network-wired';
    return `<span class="badge-deploy ${type}"><i class="fas ${icon} me-1"></i>${label}</span>`;
}

// ── Site Info ─────────────────────────────────────────────
async function loadSiteInfo() {
    const snap = await getDoc(doc(db, 'config', 'site'));
    if (!snap.exists()) return;
    const s = snap.data();

    const set     = (id, val) => { const el = document.getElementById(id); if (el && val) el.textContent = val; };
    const setHref = (id, val) => { const el = document.getElementById(id); if (el && val) el.href = val; };

    set('hero-tagline',    s.tagline);
    set('about-team-name', `${s.teamName} · ${s.company}`);
    set('about-location',  s.location);
    set('about-email',     s.email);
    set('contact-location',s.location);
    set('contact-email',   s.email);

    const aboutDesc = document.getElementById('about-description');
    if (aboutDesc && s.about) {
        aboutDesc.innerHTML = s.about.split('\n\n').map(p => `<p>${p}</p>`).join('');
    }
    const linkedinEl = document.getElementById('contact-linkedin');
    if (linkedinEl && s.linkedin) {
        linkedinEl.href = s.linkedin;
        linkedinEl.textContent = s.company || 'Noventiq';
    }
    setHref('social-github',   s.github);
    setHref('social-linkedin', s.linkedin);
}

// ── Projects ──────────────────────────────────────────────
function projectCard(p) {
    const tags           = (p.tags || []).map(t => `<span class="project-tag">${t}</span>`).join('');
    const extLink        = p.projectUrl
        ? `<a href="${p.projectUrl}" target="_blank" class="portfolio-link" title="Live Demo"><i class="fas fa-external-link-alt"></i></a>` : '';
    const industryBadge  = p.industry ? `<span class="badge-industry">${p.industry}</span>` : '';
    const teamBadgeHtml  = p.team ? `<span class="badge-team">${p.team}</span>` : '';
    const deployBadgeHtml = deployBadge(p.deploymentType);

    return `
        <div class="col-lg-4 col-md-6 mb-4 portfolio-item"
             data-industry="${p.industry || ''}"
             data-deploy="${p.deploymentType || ''}"
             data-team="${p.team || ''}">
            <div class="portfolio-card">
                <div class="portfolio-img">
                    <img src="${p.image || 'images/placeholder.png'}" alt="${p.title}">
                    <div class="portfolio-overlay">
                        <div class="portfolio-links">${extLink}</div>
                    </div>
                </div>
                <div class="portfolio-content">
                    <h4>${p.title}</h4>
                    <div class="project-meta-badges">${teamBadgeHtml}${industryBadge}${deployBadgeHtml}</div>
                    ${tags ? `<div class="project-tags">${tags}</div>` : ''}
                    <p>${p.description}</p>
                    <a href="project.html?id=${p.id}" class="btn-portfolio">
                        <i class="fas fa-play-circle me-1"></i> View Project
                    </a>
                </div>
            </div>
        </div>`;
}

function buildFilters(projects, industries) {
    const filtersEl = document.getElementById('portfolio-filters');
    if (!filtersEl) return;

    const INDUSTRY_ICONS = {
        'Banking, Financial Services & Insurance (BFSI)': 'fa-university',
        'Healthcare & Life Sciences':                     'fa-heartbeat',
        'Retail & E-Commerce':                            'fa-shopping-cart',
        'Manufacturing & Industrial (Industry 4.0)':      'fa-industry',
        'Telecom & Media':                                'fa-satellite-dish',
        'Government & Public Sector':                     'fa-landmark',
        'Education & EdTech':                             'fa-graduation-cap',
        'Energy, Utilities & Oil & Gas':                  'fa-bolt',
        'IT & ITeS / Technology Providers':               'fa-microchip',
        'Logistics & Transportation':                     'fa-truck',
        'Agriculture & AgriTech':                         'fa-seedling',
        'Pharmaceuticals and Hospitality':                'fa-pills'
    };

    const TEAM_ORDER = ['Data and AI', 'Infrastructure', 'Cyber Security', 'MWP', 'Cloud and Devops'];
    const TEAM_ICONS = {
        'Data and AI':      'fa-brain',
        'Infrastructure':   'fa-network-wired',
        'Cyber Security':   'fa-shield-alt',
        'MWP':              'fa-laptop-code',
        'Cloud and Devops': 'fa-cloud'
    };

    const filteredTeams  = TEAM_ORDER;
    const usedIndustries = new Set(projects.map(p => p.industry).filter(Boolean));
    const filteredIndustries = (industries || []).filter(ind => usedIndustries.has(ind));
    const deploys = [...new Set(projects.map(p => p.deploymentType).filter(Boolean))];

    if (!filteredTeams.length && !filteredIndustries.length && !deploys.length) return;

    const DEPLOY_ICONS = { cloud: 'fa-cloud', onprem: 'fa-server', hybrid: 'fa-network-wired' };

    // ── Build bar HTML ────────────────────────────────────
    let html = `<div class="filter-bar">
        <button type="button" class="filter-pill active" data-filter="all">All</button>`;

    if (filteredTeams.length) {
        html += `
        <div class="filter-dropdown-wrap">
            <button type="button" class="filter-pill" data-dropdown="team">
                <i class="fas fa-users item-icon"></i> Team
                <i class="fas fa-chevron-down filter-chevron"></i>
            </button>
            <div class="filter-dropdown-menu" id="dd-team">
                <button type="button" class="filter-dropdown-item active" data-filter="all-team">
                    <i class="fas fa-th item-icon"></i> All Teams
                </button>`;
        filteredTeams.forEach(team => {
            const icon = TEAM_ICONS[team] || 'fa-users';
            html += `<button type="button" class="filter-dropdown-item" data-filter="team:${team}">
                <i class="fas ${icon} item-icon"></i>${team}
            </button>`;
        });
        html += `</div></div>`;
    }

    if (filteredIndustries.length) {
        html += `
        <div class="filter-dropdown-wrap">
            <button type="button" class="filter-pill" data-dropdown="industry">
                <i class="fas fa-industry item-icon"></i> Industry
                <i class="fas fa-chevron-down filter-chevron"></i>
            </button>
            <div class="filter-dropdown-menu" id="dd-industry">
                <button type="button" class="filter-dropdown-item active" data-filter="all-industry">
                    <i class="fas fa-th item-icon"></i> All Industries
                </button>`;
        filteredIndustries.forEach(ind => {
            const icon = INDUSTRY_ICONS[ind] || 'fa-building';
            html += `<button type="button" class="filter-dropdown-item" data-filter="industry:${ind}">
                <i class="fas ${icon} item-icon"></i>${ind}
            </button>`;
        });
        html += `</div></div>`;
    }

    if (deploys.length) {
        html += `
        <div class="filter-dropdown-wrap">
            <button type="button" class="filter-pill" data-dropdown="deploy">
                <i class="fas fa-server item-icon"></i> Deployment
                <i class="fas fa-chevron-down filter-chevron"></i>
            </button>
            <div class="filter-dropdown-menu" id="dd-deploy">
                <button type="button" class="filter-dropdown-item active" data-filter="all-deploy">
                    <i class="fas fa-th item-icon"></i> All Types
                </button>`;
        deploys.forEach(dep => {
            const icon  = DEPLOY_ICONS[dep] || 'fa-globe';
            const label = DEPLOY_LABELS[dep] || dep;
            html += `<button type="button" class="filter-dropdown-item" data-filter="deploy:${dep}">
                <i class="fas ${icon} item-icon"></i>${label}
            </button>`;
        });
        html += `</div></div>`;
    }

    html += `</div>`;
    filtersEl.innerHTML = html;
    filtersEl.classList.remove('d-none');

    // ── Filter logic ──────────────────────────────────────
    let activeTeam     = 'all';
    let activeIndustry = 'all';
    let activeDeploy   = 'all';

    function applyFilters() {
        document.querySelectorAll('.portfolio-item').forEach(item => {
            const matchTeam     = activeTeam     === 'all' || item.dataset.team     === activeTeam;
            const matchIndustry = activeIndustry === 'all' || item.dataset.industry === activeIndustry;
            const matchDeploy   = activeDeploy   === 'all' || item.dataset.deploy   === activeDeploy;
            item.classList.toggle('d-none', !(matchTeam && matchIndustry && matchDeploy));
        });
    }

    function closeAllDropdowns() {
        filtersEl.querySelectorAll('.filter-dropdown-menu').forEach(m => m.classList.remove('open'));
        filtersEl.querySelectorAll('[data-dropdown]').forEach(t => t.classList.remove('open'));
    }

    // Dropdown toggle triggers
    filtersEl.querySelectorAll('[data-dropdown]').forEach(trigger => {
        trigger.addEventListener('click', e => {
            e.stopPropagation();
            const menu   = document.getElementById('dd-' + trigger.dataset.dropdown);
            const isOpen = menu.classList.contains('open');
            closeAllDropdowns();
            if (!isOpen) { menu.classList.add('open'); trigger.classList.add('open'); }
        });
    });

    document.addEventListener('click', closeAllDropdowns);

    // "All" pill
    filtersEl.querySelector('[data-filter="all"]').addEventListener('click', () => {
        activeTeam = 'all'; activeIndustry = 'all'; activeDeploy = 'all';
        filtersEl.querySelectorAll('[data-dropdown]').forEach(t => t.classList.remove('active', 'has-selection'));
        filtersEl.querySelector('[data-filter="all"]').classList.add('active');
        filtersEl.querySelectorAll('.filter-dropdown-item').forEach(i => {
            i.classList.toggle('active', ['all-team','all-industry','all-deploy'].includes(i.dataset.filter));
        });
        applyFilters();
    });

    // Dropdown items
    filtersEl.querySelectorAll('.filter-dropdown-item').forEach(item => {
        item.addEventListener('click', e => {
            e.stopPropagation();
            const filter = item.dataset.filter;
            const menu   = item.closest('.filter-dropdown-menu');
            const type   = menu.id === 'dd-team' ? 'team' : menu.id === 'dd-industry' ? 'industry' : 'deploy';

            menu.querySelectorAll('.filter-dropdown-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            if      (type === 'team')     activeTeam     = filter.startsWith('team:')     ? filter.split(':').slice(1).join(':') : 'all';
            else if (type === 'industry') activeIndustry = filter.startsWith('industry:') ? filter.split(':').slice(1).join(':') : 'all';
            else                          activeDeploy   = filter.startsWith('deploy:')   ? filter.split(':')[1] : 'all';

            const trigger = filtersEl.querySelector(`[data-dropdown="${type}"]`);
            const val     = type === 'team' ? activeTeam : type === 'industry' ? activeIndustry : activeDeploy;
            trigger.classList.toggle('has-selection', val !== 'all');
            trigger.classList.remove('active');

            const anyActive = activeTeam !== 'all' || activeIndustry !== 'all' || activeDeploy !== 'all';
            filtersEl.querySelector('[data-filter="all"]').classList.toggle('active', !anyActive);

            closeAllDropdowns();
            applyFilters();
        });
    });
}

async function loadProjects() {
    const grid = document.getElementById('portfolio-grid');
    if (!grid) return;

    const [projectsSnap, industriesSnap] = await Promise.all([
        getDocs(query(collection(db, 'projects'), orderBy('order', 'asc'))),
        getDoc(doc(db, 'config', 'industries'))
    ]);

    const projects   = projectsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const industries = industriesSnap.exists() ? (industriesSnap.data().list || []) : [];

    const statEl = document.getElementById('stat-projects');
    if (statEl) statEl.textContent = projects.length;

    if (!projects.length) {
        grid.innerHTML = `<div class="col-12 text-center"><p class="text-muted">No projects yet.</p></div>`;
        return;
    }

    grid.innerHTML = projects.map(p => projectCard(p)).join('');
    buildFilters(projects, industries);
}

// ── Skills ────────────────────────────────────────────────
function skillCategory(cat, delay) {
    const isBar  = cat.type === 'bar';
    const inner  = isBar
        ? (cat.skills || []).map(s => `
            <div class="skill-item">
                <span class="skill-name">${s.name}</span>
                <div class="skill-bar">
                    <div class="skill-progress" data-level="${s.level || 80}" style="width:0%"></div>
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

async function loadSkills() {
    const container = document.getElementById('skills-container');
    if (!container) return;

    const snap = await getDocs(query(collection(db, 'skills'), orderBy('order', 'asc')));
    const cats  = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const total = cats.reduce((acc, c) => acc + (c.skills || []).length, 0);

    const statEl = document.getElementById('stat-skills');
    if (statEl) statEl.textContent = total + '+';

    if (!cats.length) {
        container.innerHTML = `<div class="col-12 text-center"><p class="text-muted">No skills yet.</p></div>`;
        return;
    }

    container.innerHTML = cats.map((cat, i) => skillCategory(cat, (i + 1) * 100)).join('');

    setTimeout(() => {
        document.querySelectorAll('.skill-progress').forEach(bar => {
            bar.style.width = bar.dataset.level + '%';
        });
    }, 400);

    if (window.AOS) AOS.refresh();
}

// ── Services ──────────────────────────────────────────────
async function loadServices() {
    const grid = document.getElementById('services-grid');
    if (!grid) return;

    const snap     = await getDocs(collection(db, 'services'));
    const services = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (!services.length) {
        grid.innerHTML = `<div class="col-12 text-center"><p class="text-muted">No services yet.</p></div>`;
        return;
    }

    grid.innerHTML = services.map((s, i) => `
        <div class="col-lg-4 col-md-6 mb-4" data-aos="zoom-in" data-aos-delay="${(i % 3 + 1) * 100}">
            <div class="service-card">
                <div class="service-icon"><i class="${s.icon || 'fas fa-star'}"></i></div>
                <h4>${s.title}</h4>
                <p>${s.description}</p>
            </div>
        </div>`).join('');

    if (window.AOS) AOS.refresh();
}

// ── Contact Form ──────────────────────────────────────────
window.sendContactMessage = async function () {
    const name    = document.getElementById('name').value.trim();
    const email   = document.getElementById('email').value.trim();
    const subject = document.getElementById('subject').value.trim();
    const comment = document.getElementById('comment').value.trim();
    const btn     = document.querySelector('#contactForm button[type="button"]');
    const origTxt = btn ? btn.innerHTML : '';

    if (!name || !email || !subject || !comment) {
        alert('Please fill in all fields');
        return;
    }

    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sending…'; }

    try {
        await addDoc(collection(db, 'contacts'), {
            name, email, subject, message: comment,
            read: false,
            sentAt: serverTimestamp()
        });
        document.getElementById('contactForm').reset();
        alert('✅ Your message has been sent successfully!');
    } catch (err) {
        console.error(err);
        alert('❌ Failed to send your message. Please try again.');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = origTxt; }
    }
};

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    Promise.all([
        loadSiteInfo(),
        loadProjects(),
        loadSkills(),
        loadServices()
    ]).catch(err => console.error('data.js error:', err));
});
