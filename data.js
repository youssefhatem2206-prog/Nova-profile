// data.js — loads everything from data.json (no Firebase)

async function loadData() {
    const res = await fetch('data.json?v=' + Date.now());
    if (!res.ok) throw new Error('Failed to load data.json');
    return res.json();
}

// ── Site info ────────────────────────────────────────────
function loadSiteInfo(data) {
    const s = data.site;
    if (!s) return;
    const set     = (id, val) => { const el = document.getElementById(id); if (el && val) el.textContent = val; };
    const setHref = (id, val) => { const el = document.getElementById(id); if (el && val) el.href = val; };

    set('hero-tagline',   s.tagline);
    set('about-team-name', `${s.teamName} · ${s.company}`);
    set('about-location', s.location);
    set('about-email',    s.email);
    set('contact-location', s.location);
    set('contact-email',  s.email);

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

// ── Projects + Filters ───────────────────────────────────
const DEPLOY_LABELS = { cloud: 'Cloud', onprem: 'On-Premises', hybrid: 'Hybrid' };

function deployBadge(type) {
    if (!type) return '';
    const label = DEPLOY_LABELS[type] || type;
    const icon  = type === 'cloud' ? 'fa-cloud' : type === 'onprem' ? 'fa-server' : 'fa-network-wired';
    return `<span class="badge-deploy ${type}"><i class="fas ${icon} me-1"></i>${label}</span>`;
}

function projectCard(p) {
    const tags       = (p.tags || []).map(t => `<span class="project-tag">${t}</span>`).join('');
    const extLink    = p.projectUrl
        ? `<a href="${p.projectUrl}" target="_blank" class="portfolio-link" title="Live Demo"><i class="fas fa-external-link-alt"></i></a>` : '';

    const industryBadge = p.industry
        ? `<span class="badge-industry">${p.industry}</span>` : '';
    const deployBadgeHtml = deployBadge(p.deploymentType);

    return `
        <div class="col-lg-4 col-md-6 mb-4 portfolio-item"
             data-industry="${p.industry || ''}"
             data-deploy="${p.deploymentType || ''}"
             data-aos="fade-up">
            <div class="portfolio-card">
                <div class="portfolio-img">
                    <img src="${p.image || 'images/placeholder.png'}" alt="${p.title}" loading="lazy">
                    <div class="portfolio-overlay">
                        <div class="portfolio-links">${extLink}</div>
                    </div>
                </div>
                <div class="portfolio-content">
                    <div class="project-meta-badges">${industryBadge}${deployBadgeHtml}</div>
                    ${tags ? `<div class="project-tags">${tags}</div>` : ''}
                    <h4>${p.title}</h4>
                    <p>${p.description}</p>
                    <a href="project.html?id=${p.id}" class="btn-portfolio">
                        <i class="fas fa-play-circle me-1"></i> View Project
                    </a>
                </div>
            </div>
        </div>`;
}

function buildFilters(projects, allIndustries) {
    const filtersEl = document.getElementById('portfolio-filters');
    if (!filtersEl) return;

    // industries: use master list from data.json, only show ones that have projects
    const usedIndustries = new Set(projects.map(p => p.industry).filter(Boolean));
    const industries = (allIndustries || []).filter(ind => usedIndustries.has(ind));

    // deploy types used in projects
    const deploys = [...new Set(projects.map(p => p.deploymentType).filter(Boolean))];

    if (!industries.length && !deploys.length) return;

    // build buttons
    let html = `<button type="button" class="filter-btn active" data-filter="all">All</button>`;
    if (industries.length) {
        html += `<span class="filter-separator">Industry:</span>`;
        industries.forEach(ind => {
            html += `<button type="button" class="filter-btn" data-filter="industry:${ind}">${ind}</button>`;
        });
    }
    if (deploys.length) {
        html += `<span class="filter-separator">Deployment:</span>`;
        deploys.forEach(dep => {
            const label = DEPLOY_LABELS[dep] || dep;
            html += `<button type="button" class="filter-btn" data-filter="deploy:${dep}">${label}</button>`;
        });
    }

    filtersEl.innerHTML = html;
    filtersEl.classList.remove('d-none');

    // filter logic
    filtersEl.addEventListener('click', e => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;

        filtersEl.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.dataset.filter;
        document.querySelectorAll('.portfolio-item').forEach(item => {
            if (filter === 'all') {
                item.classList.remove('d-none');
            } else if (filter.startsWith('industry:')) {
                const val = filter.split(':')[1];
                item.classList.toggle('d-none', item.dataset.industry !== val);
            } else if (filter.startsWith('deploy:')) {
                const val = filter.split(':')[1];
                item.classList.toggle('d-none', item.dataset.deploy !== val);
            }
        });
    });
}

function loadProjects(data) {
    const grid = document.getElementById('portfolio-grid');
    if (!grid) return;

    const projects = (data.projects || []).sort((a, b) => (a.order || 0) - (b.order || 0));

    const statEl = document.getElementById('stat-projects');
    if (statEl) statEl.textContent = projects.length;

    if (!projects.length) {
        grid.innerHTML = `<div class="col-12 text-center"><p class="text-muted">No projects yet.</p></div>`;
        return;
    }

    grid.innerHTML = projects.map(p => projectCard(p)).join('');
    buildFilters(projects, data._industries);
    if (window.AOS) AOS.refresh();
}

// ── Skills ───────────────────────────────────────────────
function loadSkills(data) {
    const container = document.getElementById('skills-container');
    if (!container) return;

    const cats  = (data.skills || []).sort((a, b) => (a.order || 0) - (b.order || 0));
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

function skillCategory(cat, delay) {
    const isBar = cat.type === 'bar';
    const inner = isBar
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

// ── Services ─────────────────────────────────────────────
function loadServices(data) {
    const grid = document.getElementById('services-grid');
    if (!grid) return;

    const services = data.services || [];
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

// ── Init ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const data = await loadData();
        // attach industries to data object for use in buildFilters
        data._industries = data.industries || [];
        loadSiteInfo(data);
        loadProjects(data);
        loadSkills(data);
        loadServices(data);
    } catch (err) {
        console.error('data.js error:', err);
    }
});
