// admin.js — JSON-based admin (no Firebase)
// All edits modify a local copy of data.json.
// After editing, click "Download data.json", replace the file in the repo, then push.

// ── Auth (simple password) ────────────────────────────────
const ADMIN_PASS = 'noventiq2025'; // change this!

function checkAuth() {
    if (sessionStorage.getItem('admin_auth') !== '1') {
        window.location.href = 'index.html';
    }
}
checkAuth();

document.getElementById('admin-email-display').textContent = 'Admin';

document.getElementById('logout-btn').addEventListener('click', e => {
    e.preventDefault();
    sessionStorage.removeItem('admin_auth');
    window.location.href = 'index.html';
});

// ── Load data.json ────────────────────────────────────────
let DATA = null;
let dirty = false;

async function loadData() {
    const res = await fetch('../data.json?v=' + Date.now());
    DATA = await res.json();
}

function markDirty() {
    dirty = true;
    document.getElementById('save-banner').classList.add('visible');
}

// ── Download updated data.json ────────────────────────────
document.getElementById('download-btn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(DATA, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = 'data.json';
    a.click();
    URL.revokeObjectURL(url);
    dirty = false;
    document.getElementById('save-banner').classList.remove('visible');
});

// ── Sidebar & Tabs ────────────────────────────────────────
document.getElementById('sidebar-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('collapsed');
    document.getElementById('dashboard-main').classList.toggle('expanded');
});

document.querySelectorAll('.sidebar-nav .nav-item[data-tab]').forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        const tab = link.dataset.tab;
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        document.querySelectorAll('.tab-content-panel').forEach(p => p.classList.add('d-none'));
        document.getElementById(`tab-${tab}`).classList.remove('d-none');
        const titles = { projects:'Projects', skills:'Skills', services:'Services', about:'About Team' };
        document.getElementById('topbar-title').textContent = titles[tab] || tab;
    });
});

// ── Helpers ───────────────────────────────────────────────
function show(id) { document.getElementById(id)?.classList.remove('d-none'); }
function hide(id) { document.getElementById(id)?.classList.add('d-none'); }
function uid()    { return 'id_' + Math.random().toString(36).slice(2, 10); }

function showMsg(id, msg, type = 'danger') {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = `alert alert-${type} py-2`;
    el.textContent = msg;
    el.classList.remove('d-none');
    setTimeout(() => el.classList.add('d-none'), 3500);
}

const deleteModal  = new bootstrap.Modal(document.getElementById('deleteModal'));
let pendingDeleteFn = null;
document.getElementById('confirm-delete-btn').addEventListener('click', () => {
    if (pendingDeleteFn) pendingDeleteFn();
    deleteModal.hide();
});
function confirmDelete(msg, fn) {
    document.getElementById('delete-modal-text').textContent = msg;
    pendingDeleteFn = fn;
    deleteModal.show();
}

// ══════════════════════════════════════════════════════════
// PROJECTS
// ══════════════════════════════════════════════════════════
let editingProjectId = null;

function renderProjects() {
    const projects = (DATA.projects || []).sort((a, b) => (a.order||0)-(b.order||0));
    hide('projects-loading');
    if (!projects.length) { show('projects-empty'); hide('projects-table-wrap'); return; }
    show('projects-table-wrap'); hide('projects-empty');
    const tbody = document.getElementById('projects-tbody');
    tbody.innerHTML = '';
    projects.forEach(p => {
        const tr = document.createElement('tr');
        const deployLabels = { cloud:'Cloud', onprem:'On-Prem', hybrid:'Hybrid' };
        tr.innerHTML = `
            <td>${p.image ? `<img src="../${p.image}" alt="" class="table-thumb" onerror="this.style.display='none'">` : '<i class="fas fa-image text-muted"></i>'}</td>
            <td><strong>${p.title}</strong><br><small class="text-muted">${p.industry||''}</small></td>
            <td>${p.category || '–'}</td>
            <td>
                <small class="text-muted">${(p.tags||[]).join(', ')||'–'}</small><br>
                ${p.deploymentType ? `<span class="badge bg-secondary">${deployLabels[p.deploymentType]||p.deploymentType}</span>` : ''}
            </td>
            <td class="text-center">${p.order||1}</td>
            <td>
                <button type="button" class="btn btn-sm btn-outline-primary me-1" title="Edit"><i class="fas fa-edit"></i></button>
                <button type="button" class="btn btn-sm btn-outline-danger" title="Delete"><i class="fas fa-trash"></i></button>
            </td>`;
        tr.querySelectorAll('button')[0].addEventListener('click', () => openProjectForm(p));
        tr.querySelectorAll('button')[1].addEventListener('click', () => {
            confirmDelete(`Delete project "${p.title}"?`, () => {
                DATA.projects = DATA.projects.filter(x => x.id !== p.id);
                markDirty(); renderProjects();
            });
        });
        tbody.appendChild(tr);
    });
}

document.getElementById('btn-add-project').addEventListener('click', () => openProjectForm(null));
document.getElementById('project-cancel-btn').addEventListener('click', closeProjectForm);

function openProjectForm(p) {
    editingProjectId = p?.id || null;
    document.getElementById('project-form-title').textContent   = p ? 'Edit Project' : 'Add New Project';
    document.getElementById('project-submit-text').textContent  = p ? 'Update Project' : 'Save Project';
    document.getElementById('project-id').value                 = p?.id || '';
    document.getElementById('p-title').value                    = p?.title || '';
    document.getElementById('p-category').value                 = p?.category || '';
    document.getElementById('p-order').value                    = p?.order || 1;
    document.getElementById('p-description').value              = p?.description || '';
    document.getElementById('p-long-description').value         = p?.longDescription || '';
    document.getElementById('p-tags').value                     = (p?.tags||[]).join(', ');
    document.getElementById('p-industry').value                 = p?.industry || '';
    document.getElementById('p-deploy').value                   = p?.deploymentType || '';
    document.getElementById('p-url').value                      = p?.projectUrl || '';
    document.getElementById('p-image-url').value                = p?.image || '';
    document.getElementById('p-video-url').value                = p?.videoUrl || '';

    if (p?.image) {
        document.getElementById('p-image-preview-img').src = '../' + p.image;
        show('p-image-preview');
    } else { hide('p-image-preview'); }

    hide('project-form-error'); hide('project-form-success');
    show('project-form-panel');
    document.getElementById('project-form-panel').scrollIntoView({ behavior: 'smooth' });
}

function closeProjectForm() {
    hide('project-form-panel');
    editingProjectId = null;
    document.getElementById('project-form').reset();
}

document.getElementById('p-image-url').addEventListener('input', function () {
    if (this.value) {
        const src = this.value.startsWith('http') ? this.value : '../' + this.value;
        document.getElementById('p-image-preview-img').src = src;
        show('p-image-preview');
    } else { hide('p-image-preview'); }
});

document.getElementById('project-form').addEventListener('submit', e => {
    e.preventDefault();
    const title       = document.getElementById('p-title').value.trim();
    const description = document.getElementById('p-description').value.trim();
    if (!title || !description) { showMsg('project-form-error', 'Title and short description are required.'); return; }

    const project = {
        id:              editingProjectId || uid(),
        title,
        category:        document.getElementById('p-category').value.trim(),
        order:           parseInt(document.getElementById('p-order').value) || 1,
        description,
        longDescription: document.getElementById('p-long-description').value.trim(),
        tags:            document.getElementById('p-tags').value.split(',').map(t=>t.trim()).filter(Boolean),
        industry:        document.getElementById('p-industry').value.trim(),
        deploymentType:  document.getElementById('p-deploy').value,
        projectUrl:      document.getElementById('p-url').value.trim(),
        image:           document.getElementById('p-image-url').value.trim(),
        videoUrl:        document.getElementById('p-video-url').value.trim(),
    };

    if (editingProjectId) {
        const idx = DATA.projects.findIndex(x => x.id === editingProjectId);
        if (idx > -1) DATA.projects[idx] = project;
    } else {
        DATA.projects = DATA.projects || [];
        DATA.projects.push(project);
    }

    markDirty();
    showMsg('project-form-success', editingProjectId ? 'Project updated!' : 'Project added!', 'success');
    setTimeout(() => { closeProjectForm(); renderProjects(); }, 800);
});

// ══════════════════════════════════════════════════════════
// SKILLS
// ══════════════════════════════════════════════════════════
let editingSkillId = null;

function renderSkills() {
    const cats = (DATA.skills || []).sort((a, b) => (a.order||0)-(b.order||0));
    hide('skills-loading');
    if (!cats.length) { show('skills-empty'); hide('skills-table-wrap'); return; }
    show('skills-table-wrap'); hide('skills-empty');
    const tbody = document.getElementById('skills-tbody');
    tbody.innerHTML = '';
    cats.forEach(cat => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${cat.name}</strong></td>
            <td><i class="${cat.icon||''}"></i> <small class="text-muted">${cat.icon||'–'}</small></td>
            <td><span class="badge ${cat.type==='bar'?'bg-primary':'bg-success'}">${cat.type}</span></td>
            <td>${(cat.skills||[]).length} skills</td>
            <td class="text-center">${cat.order||1}</td>
            <td>
                <button type="button" class="btn btn-sm btn-outline-primary me-1" title="Edit"><i class="fas fa-edit"></i></button>
                <button type="button" class="btn btn-sm btn-outline-danger" title="Delete"><i class="fas fa-trash"></i></button>
            </td>`;
        tr.querySelectorAll('button')[0].addEventListener('click', () => openSkillForm(cat));
        tr.querySelectorAll('button')[1].addEventListener('click', () => {
            confirmDelete(`Delete skill category "${cat.name}"?`, () => {
                DATA.skills = DATA.skills.filter(x => x.id !== cat.id);
                markDirty(); renderSkills();
            });
        });
        tbody.appendChild(tr);
    });
}

document.getElementById('btn-add-skill').addEventListener('click', () => openSkillForm(null));
document.getElementById('skill-cancel-btn').addEventListener('click', closeSkillForm);
document.getElementById('s-type').addEventListener('change', updateSkillLevelVisibility);
document.getElementById('add-skill-item').addEventListener('click', () => addSkillItemRow());

function updateSkillLevelVisibility() {
    const isBar = document.getElementById('s-type').value === 'bar';
    document.querySelectorAll('.skill-level-wrap').forEach(el => el.classList.toggle('d-none', !isBar));
}

function addSkillItemRow(name = '', level = 80) {
    const isBar = document.getElementById('s-type').value === 'bar';
    const list  = document.getElementById('skills-list');
    const row   = document.createElement('div');
    row.className = 'skill-input-row';
    row.innerHTML = `
        <input type="text" class="form-control skill-name-input" placeholder="Skill name" value="${name}" aria-label="Skill name">
        <div class="skill-level-wrap ${isBar ? '' : 'd-none'}">
            <input type="number" class="form-control skill-level-input" placeholder="%" value="${level}" min="1" max="100" style="width:80px" aria-label="Skill level percentage">
            <span class="text-muted">%</span>
        </div>
        <button type="button" class="btn btn-sm btn-outline-danger remove-skill-row" title="Remove skill"><i class="fas fa-times"></i></button>`;
    row.querySelector('.remove-skill-row').addEventListener('click', () => row.remove());
    list.appendChild(row);
}

function openSkillForm(cat) {
    editingSkillId = cat?.id || null;
    document.getElementById('skill-form-title').textContent  = cat ? 'Edit Skill Category' : 'Add Skill Category';
    document.getElementById('skill-submit-text').textContent = cat ? 'Update Category' : 'Save Category';
    document.getElementById('skill-id').value   = cat?.id || '';
    document.getElementById('s-name').value     = cat?.name || '';
    document.getElementById('s-icon').value     = cat?.icon || '';
    document.getElementById('s-type').value     = cat?.type || 'bar';
    document.getElementById('s-order').value    = cat?.order || 1;
    document.getElementById('skills-list').innerHTML = '';
    (cat?.skills || []).forEach(s => addSkillItemRow(s.name, s.level || 80));
    if (!cat?.skills?.length) addSkillItemRow();
    hide('skill-form-error'); hide('skill-form-success');
    show('skill-form-panel');
    document.getElementById('skill-form-panel').scrollIntoView({ behavior: 'smooth' });
}

function closeSkillForm() {
    hide('skill-form-panel');
    editingSkillId = null;
    document.getElementById('skill-form').reset();
    document.getElementById('skills-list').innerHTML = '';
}

document.getElementById('skill-form').addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('s-name').value.trim();
    if (!name) { showMsg('skill-form-error', 'Category name is required.'); return; }

    const type   = document.getElementById('s-type').value;
    const isBar  = type === 'bar';
    const skills = [];
    document.querySelectorAll('.skill-input-row').forEach(row => {
        const skillName = row.querySelector('.skill-name-input').value.trim();
        if (!skillName) return;
        const entry = { name: skillName };
        if (isBar) entry.level = parseInt(row.querySelector('.skill-level-input')?.value) || 80;
        skills.push(entry);
    });

    const cat = {
        id:    editingSkillId || uid(),
        name,
        icon:  document.getElementById('s-icon').value.trim(),
        type,
        order: parseInt(document.getElementById('s-order').value) || 1,
        skills
    };

    if (editingSkillId) {
        const idx = DATA.skills.findIndex(x => x.id === editingSkillId);
        if (idx > -1) DATA.skills[idx] = cat;
    } else {
        DATA.skills = DATA.skills || [];
        DATA.skills.push(cat);
    }

    markDirty();
    showMsg('skill-form-success', editingSkillId ? 'Category updated!' : 'Category added!', 'success');
    setTimeout(() => { closeSkillForm(); renderSkills(); }, 800);
});

// ══════════════════════════════════════════════════════════
// SERVICES
// ══════════════════════════════════════════════════════════
let editingServiceId = null;

function renderServices() {
    const services = DATA.services || [];
    hide('services-loading');
    if (!services.length) { show('services-empty'); hide('services-table-wrap'); return; }
    show('services-table-wrap'); hide('services-empty');
    const tbody = document.getElementById('services-tbody');
    tbody.innerHTML = '';
    services.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><i class="${s.icon||'fas fa-star'} fa-lg" style="color:var(--accent)"></i></td>
            <td><strong>${s.title}</strong></td>
            <td><small class="text-muted">${s.description.substring(0, 80)}…</small></td>
            <td>
                <button type="button" class="btn btn-sm btn-outline-primary me-1" title="Edit"><i class="fas fa-edit"></i></button>
                <button type="button" class="btn btn-sm btn-outline-danger" title="Delete"><i class="fas fa-trash"></i></button>
            </td>`;
        tr.querySelectorAll('button')[0].addEventListener('click', () => openServiceForm(s));
        tr.querySelectorAll('button')[1].addEventListener('click', () => {
            confirmDelete(`Delete service "${s.title}"?`, () => {
                DATA.services = DATA.services.filter(x => x.id !== s.id);
                markDirty(); renderServices();
            });
        });
        tbody.appendChild(tr);
    });
}

document.getElementById('btn-add-service').addEventListener('click', () => openServiceForm(null));
document.getElementById('service-cancel-btn').addEventListener('click', closeServiceForm);

function openServiceForm(s) {
    editingServiceId = s?.id || null;
    document.getElementById('service-form-title').textContent  = s ? 'Edit Service' : 'Add Service';
    document.getElementById('service-submit-text').textContent = s ? 'Update Service' : 'Save Service';
    document.getElementById('service-id').value           = s?.id || '';
    document.getElementById('sv-title').value             = s?.title || '';
    document.getElementById('sv-icon').value              = s?.icon || '';
    document.getElementById('sv-description').value       = s?.description || '';
    hide('service-form-error'); hide('service-form-success');
    show('service-form-panel');
    document.getElementById('service-form-panel').scrollIntoView({ behavior: 'smooth' });
}

function closeServiceForm() {
    hide('service-form-panel');
    editingServiceId = null;
    document.getElementById('service-form').reset();
}

document.getElementById('service-form').addEventListener('submit', e => {
    e.preventDefault();
    const title       = document.getElementById('sv-title').value.trim();
    const description = document.getElementById('sv-description').value.trim();
    if (!title || !description) { showMsg('service-form-error', 'Title and description are required.'); return; }

    const service = {
        id:          editingServiceId || uid(),
        icon:        document.getElementById('sv-icon').value.trim() || 'fas fa-star',
        title,
        description
    };

    if (editingServiceId) {
        const idx = DATA.services.findIndex(x => x.id === editingServiceId);
        if (idx > -1) DATA.services[idx] = service;
    } else {
        DATA.services = DATA.services || [];
        DATA.services.push(service);
    }

    markDirty();
    showMsg('service-form-success', editingServiceId ? 'Service updated!' : 'Service added!', 'success');
    setTimeout(() => { closeServiceForm(); renderServices(); }, 800);
});

// ══════════════════════════════════════════════════════════
// ABOUT TEAM
// ══════════════════════════════════════════════════════════
function loadAboutForm() {
    const s = DATA.site || {};
    document.getElementById('a-teamname').value  = s.teamName || '';
    document.getElementById('a-company').value   = s.company  || '';
    document.getElementById('a-tagline').value   = s.tagline  || '';
    document.getElementById('a-about').value     = s.about    || '';
    document.getElementById('a-location').value  = s.location || '';
    document.getElementById('a-email').value     = s.email    || '';
    document.getElementById('a-linkedin').value  = s.linkedin || '';
    document.getElementById('a-github').value    = s.github   || '';
}

document.getElementById('btn-save-about').addEventListener('click', () => {
    DATA.site = {
        teamName: document.getElementById('a-teamname').value.trim(),
        company:  document.getElementById('a-company').value.trim(),
        tagline:  document.getElementById('a-tagline').value.trim(),
        about:    document.getElementById('a-about').value.trim(),
        location: document.getElementById('a-location').value.trim(),
        email:    document.getElementById('a-email').value.trim(),
        linkedin: document.getElementById('a-linkedin').value.trim(),
        github:   document.getElementById('a-github').value.trim(),
    };
    markDirty();
    showMsg('about-form-success', 'About info saved! Download data.json to apply changes.', 'success');
});

// ── Init ──────────────────────────────────────────────────
(async () => {
    await loadData();
    renderProjects();
    renderSkills();
    renderServices();
    loadAboutForm();
})();
