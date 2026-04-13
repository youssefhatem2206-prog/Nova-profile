// admin.js — Firebase Firestore CRUD (Noventiq Data & AI Admin Panel)
import { auth, db, storage } from '../firebase-config.js';
import {
    onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
    collection, getDocs, addDoc, updateDoc, deleteDoc,
    doc, getDoc, setDoc, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import {
    ref as storageRef, uploadBytesResumable, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js";

// ── Auth Guard ────────────────────────────────────────────
onAuthStateChanged(auth, user => {
    if (!user) { window.location.href = 'index.html'; return; }
    document.getElementById('admin-email-display').textContent = user.email;
    init();
});

document.getElementById('logout-btn').addEventListener('click', async e => {
    e.preventDefault();
    await signOut(auth);
    window.location.href = 'index.html';
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
        const titles = { projects: 'Projects', skills: 'Skills', services: 'Services', about: 'About Team' };
        document.getElementById('topbar-title').textContent = titles[tab] || tab;
    });
});

// ── Utility ───────────────────────────────────────────────
function show(id) { document.getElementById(id)?.classList.remove('d-none'); }
function hide(id) { document.getElementById(id)?.classList.add('d-none'); }

function showMsg(id, msg, type = 'danger') {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = `alert alert-${type} py-2`;
    el.textContent = msg;
    el.classList.remove('d-none');
    setTimeout(() => el.classList.add('d-none'), 4000);
}

function setLoading(btnId, spinnerId, textId, loading, text = '') {
    const btn     = document.getElementById(btnId);
    const spinner = document.getElementById(spinnerId);
    const textEl  = document.getElementById(textId);
    if (!btn) return;
    btn.disabled = loading;
    spinner?.classList.toggle('d-none', !loading);
    if (textEl && text) textEl.textContent = text;
}

function parseTags(str) {
    return str.split(',').map(t => t.trim()).filter(Boolean);
}

// ── Delete Modal ──────────────────────────────────────────
const deleteModal   = new bootstrap.Modal(document.getElementById('deleteModal'));
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

// ── File Upload ───────────────────────────────────────────
function uploadFile(file, path, progressBarId) {
    return new Promise((resolve, reject) => {
        const sRef = storageRef(storage, path);
        const task = uploadBytesResumable(sRef, file);
        const progressWrap = document.getElementById(progressBarId)?.closest?.('.upload-progress');
        const bar = document.querySelector(`#${progressBarId} .progress-bar`);

        if (progressWrap) progressWrap.classList.remove('d-none');

        task.on('state_changed',
            snap => {
                const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
                if (bar) bar.style.width = pct + '%';
            },
            reject,
            async () => {
                const url = await getDownloadURL(task.snapshot.ref);
                if (progressWrap) progressWrap.classList.add('d-none');
                resolve(url);
            }
        );
    });
}

// ══════════════════════════════════════════════════════════
// PROJECTS
// ══════════════════════════════════════════════════════════
let editingProjectId = null;

async function loadProjects() {
    hide('projects-table-wrap'); hide('projects-empty'); show('projects-loading');
    try {
        const snap = await getDocs(query(collection(db, 'projects'), orderBy('order', 'asc')));
        hide('projects-loading');
        if (snap.empty) { show('projects-empty'); return; }
        show('projects-table-wrap');
        const tbody = document.getElementById('projects-tbody');
        tbody.innerHTML = '';
        snap.forEach(d => renderProjectRow({ id: d.id, ...d.data() }));
    } catch (err) {
        hide('projects-loading'); show('projects-empty');
        console.error('loadProjects:', err);
    }
}

function renderProjectRow(p) {
    const tbody = document.getElementById('projects-tbody');
    const tr    = document.createElement('tr');
    const deployLabels = { cloud: 'Cloud', onprem: 'On-Prem', hybrid: 'Hybrid' };
    tr.innerHTML = `
        <td>${p.image ? `<img src="${p.image}" alt="" class="table-thumb" onerror="this.style.display='none'">` : '<i class="fas fa-image text-muted"></i>'}</td>
        <td><strong>${p.title}</strong><br><small class="text-muted">${p.industry || ''}</small></td>
        <td>${p.category || '–'}</td>
        <td>
            <small class="text-muted">${(p.tags || []).join(', ') || '–'}</small><br>
            ${p.deploymentType ? `<span class="badge bg-secondary">${deployLabels[p.deploymentType] || p.deploymentType}</span>` : ''}
        </td>
        <td class="text-center">${p.order || 1}</td>
        <td>
            <button type="button" class="btn btn-sm btn-outline-primary me-1" title="Edit"><i class="fas fa-edit"></i></button>
            <button type="button" class="btn btn-sm btn-outline-danger" title="Delete"><i class="fas fa-trash"></i></button>
        </td>`;
    tr.querySelectorAll('button')[0].addEventListener('click', () => openProjectForm(p));
    tr.querySelectorAll('button')[1].addEventListener('click', () => {
        confirmDelete(`Delete project "${p.title}"?`, async () => {
            await deleteDoc(doc(db, 'projects', p.id));
            tr.remove();
            if (!document.getElementById('projects-tbody').children.length) {
                hide('projects-table-wrap'); show('projects-empty');
            }
        });
    });
    tbody.appendChild(tr);
}

document.getElementById('btn-add-project').addEventListener('click', () => openProjectForm(null));
document.getElementById('project-cancel-btn').addEventListener('click', closeProjectForm);

function openProjectForm(p) {
    editingProjectId = p?.id || null;
    document.getElementById('project-form-title').textContent  = p ? 'Edit Project' : 'Add New Project';
    document.getElementById('project-submit-text').textContent = p ? 'Update Project' : 'Save Project';
    document.getElementById('project-id').value           = p?.id || '';
    document.getElementById('p-title').value              = p?.title || '';
    document.getElementById('p-category').value           = p?.category || '';
    document.getElementById('p-order').value              = p?.order || 1;
    document.getElementById('p-description').value        = p?.description || '';
    document.getElementById('p-long-description').value   = p?.longDescription || '';
    document.getElementById('p-tags').value               = (p?.tags || []).join(', ');
    document.getElementById('p-deploy').value             = p?.deploymentType || '';
    document.getElementById('p-url').value                = p?.projectUrl || '';
    document.getElementById('p-image-url').value          = p?.image || '';
    document.getElementById('p-video-url').value          = p?.videoUrl || '';
    document.getElementById('p-image-file').value         = '';
    document.getElementById('p-video-file').value         = '';

    populateIndustryDropdown();
    document.getElementById('p-industry').value = p?.industry || '';

    if (p?.image) {
        document.getElementById('p-image-preview-img').src = p.image;
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
        document.getElementById('p-image-preview-img').src = this.value;
        show('p-image-preview');
    } else { hide('p-image-preview'); }
});

document.getElementById('p-image-file').addEventListener('change', function () {
    if (this.files[0]) {
        document.getElementById('p-image-preview-img').src = URL.createObjectURL(this.files[0]);
        show('p-image-preview');
        document.getElementById('p-image-url').value = '';
    }
});

document.getElementById('project-form').addEventListener('submit', async e => {
    e.preventDefault();
    setLoading('project-submit-btn', 'project-submit-spinner', 'project-submit-text', true, 'Saving…');
    try {
        let imageUrl = document.getElementById('p-image-url').value.trim();
        let videoUrl = document.getElementById('p-video-url').value.trim();
        const imageFile = document.getElementById('p-image-file').files[0];
        const videoFile = document.getElementById('p-video-file').files[0];

        if (imageFile) {
            imageUrl = await uploadFile(imageFile, `projects/images/${Date.now()}_${imageFile.name}`, 'p-image-progress');
        }
        if (videoFile) {
            videoUrl = await uploadFile(videoFile, `projects/videos/${Date.now()}_${videoFile.name}`, 'p-video-progress');
        }

        const title       = document.getElementById('p-title').value.trim();
        const description = document.getElementById('p-description').value.trim();
        if (!title || !description) throw new Error('Title and short description are required.');

        const data = {
            title,
            category:        document.getElementById('p-category').value.trim(),
            order:           parseInt(document.getElementById('p-order').value) || 1,
            description,
            longDescription: document.getElementById('p-long-description').value.trim(),
            tags:            parseTags(document.getElementById('p-tags').value),
            industry:        document.getElementById('p-industry').value,
            deploymentType:  document.getElementById('p-deploy').value,
            projectUrl:      document.getElementById('p-url').value.trim(),
            image:           imageUrl,
            videoUrl,
            updatedAt:       serverTimestamp()
        };

        if (editingProjectId) {
            await updateDoc(doc(db, 'projects', editingProjectId), data);
            showMsg('project-form-success', 'Project updated!', 'success');
        } else {
            data.createdAt = serverTimestamp();
            await addDoc(collection(db, 'projects'), data);
            showMsg('project-form-success', 'Project added!', 'success');
        }
        closeProjectForm();
        await loadProjects();
    } catch (err) {
        console.error(err);
        showMsg('project-form-error', err.message || 'Something went wrong.');
    } finally {
        setLoading('project-submit-btn', 'project-submit-spinner', 'project-submit-text', false,
            editingProjectId ? 'Update Project' : 'Save Project');
    }
});

// ══════════════════════════════════════════════════════════
// SKILLS
// ══════════════════════════════════════════════════════════
let editingSkillId = null;

async function loadSkills() {
    hide('skills-table-wrap'); hide('skills-empty'); show('skills-loading');
    try {
        const snap = await getDocs(query(collection(db, 'skills'), orderBy('order', 'asc')));
        hide('skills-loading');
        if (snap.empty) { show('skills-empty'); return; }
        show('skills-table-wrap');
        const tbody = document.getElementById('skills-tbody');
        tbody.innerHTML = '';
        snap.forEach(d => renderSkillRow({ id: d.id, ...d.data() }));
    } catch (err) {
        hide('skills-loading'); show('skills-empty');
        console.error('loadSkills:', err);
    }
}

function renderSkillRow(cat) {
    const tbody = document.getElementById('skills-tbody');
    const tr    = document.createElement('tr');
    tr.innerHTML = `
        <td><strong>${cat.name}</strong></td>
        <td><i class="${cat.icon || ''}"></i> <small class="text-muted">${cat.icon || '–'}</small></td>
        <td><span class="badge ${cat.type === 'bar' ? 'bg-primary' : 'bg-success'}">${cat.type}</span></td>
        <td>${(cat.skills || []).length} skills</td>
        <td class="text-center">${cat.order || 1}</td>
        <td>
            <button type="button" class="btn btn-sm btn-outline-primary me-1" title="Edit"><i class="fas fa-edit"></i></button>
            <button type="button" class="btn btn-sm btn-outline-danger" title="Delete"><i class="fas fa-trash"></i></button>
        </td>`;
    tr.querySelectorAll('button')[0].addEventListener('click', () => openSkillForm(cat));
    tr.querySelectorAll('button')[1].addEventListener('click', () => {
        confirmDelete(`Delete skill category "${cat.name}"?`, async () => {
            await deleteDoc(doc(db, 'skills', cat.id));
            tr.remove();
            if (!document.getElementById('skills-tbody').children.length) {
                hide('skills-table-wrap'); show('skills-empty');
            }
        });
    });
    tbody.appendChild(tr);
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
            <input type="number" class="form-control skill-level-input" placeholder="%" value="${level}" min="1" max="100" style="width:80px" aria-label="Skill level">
            <span class="text-muted">%</span>
        </div>
        <button type="button" class="btn btn-sm btn-outline-danger remove-skill-row" title="Remove"><i class="fas fa-times"></i></button>`;
    row.querySelector('.remove-skill-row').addEventListener('click', () => row.remove());
    list.appendChild(row);
}

function openSkillForm(cat) {
    editingSkillId = cat?.id || null;
    document.getElementById('skill-form-title').textContent  = cat ? 'Edit Skill Category' : 'Add Skill Category';
    document.getElementById('skill-submit-text').textContent = cat ? 'Update Category' : 'Save Category';
    document.getElementById('skill-id').value  = cat?.id || '';
    document.getElementById('s-name').value    = cat?.name || '';
    document.getElementById('s-icon').value    = cat?.icon || '';
    document.getElementById('s-type').value    = cat?.type || 'bar';
    document.getElementById('s-order').value   = cat?.order || 1;
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

document.getElementById('skill-form').addEventListener('submit', async e => {
    e.preventDefault();
    setLoading('skill-submit-btn', 'skill-submit-spinner', 'skill-submit-text', true, 'Saving…');
    try {
        const name  = document.getElementById('s-name').value.trim();
        if (!name) throw new Error('Category name is required.');
        const type  = document.getElementById('s-type').value;
        const isBar = type === 'bar';
        const skills = [];
        document.querySelectorAll('.skill-input-row').forEach(row => {
            const skillName = row.querySelector('.skill-name-input').value.trim();
            if (!skillName) return;
            const entry = { name: skillName };
            if (isBar) entry.level = parseInt(row.querySelector('.skill-level-input')?.value) || 80;
            skills.push(entry);
        });

        const data = {
            name,
            icon:  document.getElementById('s-icon').value.trim(),
            type,
            order: parseInt(document.getElementById('s-order').value) || 1,
            skills,
            updatedAt: serverTimestamp()
        };

        if (editingSkillId) {
            await updateDoc(doc(db, 'skills', editingSkillId), data);
            showMsg('skill-form-success', 'Category updated!', 'success');
        } else {
            data.createdAt = serverTimestamp();
            await addDoc(collection(db, 'skills'), data);
            showMsg('skill-form-success', 'Category added!', 'success');
        }
        closeSkillForm();
        await loadSkills();
    } catch (err) {
        console.error(err);
        showMsg('skill-form-error', err.message || 'Something went wrong.');
    } finally {
        setLoading('skill-submit-btn', 'skill-submit-spinner', 'skill-submit-text', false,
            editingSkillId ? 'Update Category' : 'Save Category');
    }
});

// ══════════════════════════════════════════════════════════
// SERVICES
// ══════════════════════════════════════════════════════════
let editingServiceId = null;

async function loadServices() {
    hide('services-table-wrap'); hide('services-empty'); show('services-loading');
    try {
        const snap     = await getDocs(collection(db, 'services'));
        hide('services-loading');
        if (snap.empty) { show('services-empty'); return; }
        show('services-table-wrap');
        const tbody = document.getElementById('services-tbody');
        tbody.innerHTML = '';
        snap.forEach(d => renderServiceRow({ id: d.id, ...d.data() }));
    } catch (err) {
        hide('services-loading'); show('services-empty');
        console.error('loadServices:', err);
    }
}

function renderServiceRow(s) {
    const tbody = document.getElementById('services-tbody');
    const tr    = document.createElement('tr');
    tr.innerHTML = `
        <td><i class="${s.icon || 'fas fa-star'} fa-lg" style="color:var(--accent)"></i></td>
        <td><strong>${s.title}</strong></td>
        <td><small class="text-muted">${s.description.substring(0, 80)}…</small></td>
        <td>
            <button type="button" class="btn btn-sm btn-outline-primary me-1" title="Edit"><i class="fas fa-edit"></i></button>
            <button type="button" class="btn btn-sm btn-outline-danger" title="Delete"><i class="fas fa-trash"></i></button>
        </td>`;
    tr.querySelectorAll('button')[0].addEventListener('click', () => openServiceForm(s));
    tr.querySelectorAll('button')[1].addEventListener('click', () => {
        confirmDelete(`Delete service "${s.title}"?`, async () => {
            await deleteDoc(doc(db, 'services', s.id));
            tr.remove();
            if (!document.getElementById('services-tbody').children.length) {
                hide('services-table-wrap'); show('services-empty');
            }
        });
    });
    tbody.appendChild(tr);
}

document.getElementById('btn-add-service').addEventListener('click', () => openServiceForm(null));
document.getElementById('service-cancel-btn').addEventListener('click', closeServiceForm);

function openServiceForm(s) {
    editingServiceId = s?.id || null;
    document.getElementById('service-form-title').textContent  = s ? 'Edit Service' : 'Add Service';
    document.getElementById('service-submit-text').textContent = s ? 'Update Service' : 'Save Service';
    document.getElementById('service-id').value      = s?.id || '';
    document.getElementById('sv-title').value        = s?.title || '';
    document.getElementById('sv-icon').value         = s?.icon || '';
    document.getElementById('sv-description').value  = s?.description || '';
    hide('service-form-error'); hide('service-form-success');
    show('service-form-panel');
    document.getElementById('service-form-panel').scrollIntoView({ behavior: 'smooth' });
}

function closeServiceForm() {
    hide('service-form-panel');
    editingServiceId = null;
    document.getElementById('service-form').reset();
}

document.getElementById('service-form').addEventListener('submit', async e => {
    e.preventDefault();
    setLoading('service-submit-btn', 'service-submit-spinner', 'service-submit-text', true, 'Saving…');
    try {
        const title       = document.getElementById('sv-title').value.trim();
        const description = document.getElementById('sv-description').value.trim();
        if (!title || !description) throw new Error('Title and description are required.');

        const data = {
            icon: document.getElementById('sv-icon').value.trim() || 'fas fa-star',
            title, description, updatedAt: serverTimestamp()
        };

        if (editingServiceId) {
            await updateDoc(doc(db, 'services', editingServiceId), data);
            showMsg('service-form-success', 'Service updated!', 'success');
        } else {
            data.createdAt = serverTimestamp();
            await addDoc(collection(db, 'services'), data);
            showMsg('service-form-success', 'Service added!', 'success');
        }
        closeServiceForm();
        await loadServices();
    } catch (err) {
        console.error(err);
        showMsg('service-form-error', err.message || 'Something went wrong.');
    } finally {
        setLoading('service-submit-btn', 'service-submit-spinner', 'service-submit-text', false,
            editingServiceId ? 'Update Service' : 'Save Service');
    }
});

// ══════════════════════════════════════════════════════════
// ABOUT TEAM
// ══════════════════════════════════════════════════════════
async function loadAboutForm() {
    try {
        const snap = await getDoc(doc(db, 'config', 'site'));
        if (!snap.exists()) return;
        const s = snap.data();
        document.getElementById('a-teamname').value = s.teamName || '';
        document.getElementById('a-company').value  = s.company  || '';
        document.getElementById('a-tagline').value  = s.tagline  || '';
        document.getElementById('a-about').value    = s.about    || '';
        document.getElementById('a-location').value = s.location || '';
        document.getElementById('a-email').value    = s.email    || '';
        document.getElementById('a-linkedin').value = s.linkedin || '';
        document.getElementById('a-github').value   = s.github   || '';
    } catch (err) {
        console.error('loadAboutForm:', err);
    }
}

document.getElementById('btn-save-about').addEventListener('click', async () => {
    setLoading('btn-save-about', 'about-submit-spinner', null, true);
    try {
        await setDoc(doc(db, 'config', 'site'), {
            teamName: document.getElementById('a-teamname').value.trim(),
            company:  document.getElementById('a-company').value.trim(),
            tagline:  document.getElementById('a-tagline').value.trim(),
            about:    document.getElementById('a-about').value.trim(),
            location: document.getElementById('a-location').value.trim(),
            email:    document.getElementById('a-email').value.trim(),
            linkedin: document.getElementById('a-linkedin').value.trim(),
            github:   document.getElementById('a-github').value.trim(),
            updatedAt: serverTimestamp()
        });
        showMsg('about-form-success', 'About info saved successfully!', 'success');
    } catch (err) {
        console.error(err);
        showMsg('about-form-success', 'Failed to save. Try again.', 'danger');
    } finally {
        setLoading('btn-save-about', 'about-submit-spinner', null, false);
    }
});

// ══════════════════════════════════════════════════════════
// INDUSTRIES  (config/industries → { list: [...] })
// ══════════════════════════════════════════════════════════
const DEFAULT_INDUSTRIES = [
    'Banking, Financial Services & Insurance (BFSI)',
    'Healthcare & Life Sciences',
    'Retail & E-Commerce',
    'Manufacturing & Industrial (Industry 4.0)',
    'Telecom & Media',
    'Government & Public Sector',
    'Education & EdTech',
    'Energy, Utilities & Oil & Gas',
    'IT & ITeS / Technology Providers',
    'Logistics & Transportation',
    'Agriculture & AgriTech',
    'Pharmaceuticals and Hospitality'
];

// Cached in memory — populated once on init, used everywhere
let cachedIndustries = [];

function populateIndustryDropdown() {
    const sel = document.getElementById('p-industry');
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">— Not specified —</option>';
    cachedIndustries.forEach(ind => {
        const opt = document.createElement('option');
        opt.value = ind;
        opt.textContent = ind;
        if (ind === current) opt.selected = true;
        sel.appendChild(opt);
    });
}

function industryRow(name) {
    const div = document.createElement('div');
    div.className = 'industry-row';
    div.innerHTML = `
        <input type="text" class="form-control industry-input" value="${name}" aria-label="Industry name" placeholder="Industry name">
        <button type="button" class="btn btn-sm btn-outline-danger" title="Remove industry"><i class="fas fa-times"></i></button>`;
    div.querySelector('button').addEventListener('click', () => div.remove());
    return div;
}

async function loadIndustries() {
    const list = document.getElementById('industries-list');
    try {
        const snap = await getDoc(doc(db, 'config', 'industries'));
        if (snap.exists() && (snap.data().list || []).length > 0) {
            cachedIndustries = snap.data().list;
        } else {
            // First time: seed Firestore with defaults
            cachedIndustries = DEFAULT_INDUSTRIES;
            await setDoc(doc(db, 'config', 'industries'), {
                list: DEFAULT_INDUSTRIES,
                updatedAt: serverTimestamp()
            });
        }
    } catch (err) {
        console.error('loadIndustries:', err);
        cachedIndustries = DEFAULT_INDUSTRIES;
    }
    // Populate the admin form list
    if (list) {
        list.innerHTML = '';
        cachedIndustries.forEach(ind => list.appendChild(industryRow(ind)));
    }
    // Populate the project form dropdown
    populateIndustryDropdown();
}

document.getElementById('btn-add-industry').addEventListener('click', () => {
    const list = document.getElementById('industries-list');
    const row  = industryRow('');
    list.appendChild(row);
    row.querySelector('.industry-input').focus();
});

document.getElementById('btn-save-industries').addEventListener('click', async () => {
    setLoading('btn-save-industries', 'industries-submit-spinner', null, true);
    try {
        const inputs     = document.querySelectorAll('#industries-list .industry-input');
        const industries = [...inputs].map(i => i.value.trim()).filter(Boolean);
        await setDoc(doc(db, 'config', 'industries'), { list: industries, updatedAt: serverTimestamp() });
        // Update cache and refresh dropdown
        cachedIndustries = industries;
        populateIndustryDropdown();
        showMsg('industries-success', 'Industries saved successfully!', 'success');
    } catch (err) {
        console.error(err);
        showMsg('industries-success', 'Failed to save. Try again.', 'danger');
    } finally {
        setLoading('btn-save-industries', 'industries-submit-spinner', null, false);
    }
});

// ── Init ──────────────────────────────────────────────────
async function init() {
    await Promise.all([
        loadProjects(),
        loadSkills(),
        loadServices(),
        loadAboutForm(),
        loadIndustries()
    ]);
}
