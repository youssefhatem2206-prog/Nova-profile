import { auth, db, storage } from '../firebase-config.js';
import {
    onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
    collection, getDocs, addDoc, updateDoc, deleteDoc,
    doc, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import {
    ref as storageRef, uploadBytesResumable, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js";

// ─── Auth Guard ───────────────────────────────────────────────────────────────
onAuthStateChanged(auth, user => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    document.getElementById('admin-email-display').textContent = user.email;
    init();
});

document.getElementById('logout-btn').addEventListener('click', async (e) => {
    e.preventDefault();
    await signOut(auth);
    window.location.href = 'index.html';
});

// ─── Sidebar & Tabs ───────────────────────────────────────────────────────────
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
        document.getElementById('topbar-title').textContent =
            tab === 'projects' ? 'Projects' : 'Skills';
    });
});

// ─── Utility ──────────────────────────────────────────────────────────────────
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
    const btn = document.getElementById(btnId);
    const spinner = document.getElementById(spinnerId);
    const textEl = document.getElementById(textId);
    if (!btn) return;
    btn.disabled = loading;
    spinner?.classList.toggle('d-none', !loading);
    if (textEl && text) textEl.textContent = text;
}

function parseTags(str) {
    return str.split(',').map(t => t.trim()).filter(Boolean);
}

// ─── File Upload ──────────────────────────────────────────────────────────────
function uploadFile(file, path, progressBarId) {
    return new Promise((resolve, reject) => {
        const sRef = storageRef(storage, path);
        const task = uploadBytesResumable(sRef, file);
        const progressWrap = document.getElementById(progressBarId)?.closest('.upload-progress');
        const bar = document.getElementById(progressBarId)?.querySelector?.('.progress-bar')
            ?? document.querySelector(`#${progressBarId} .progress-bar`);

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

// ══════════════════════════════════════════════════════════════════════════════
// PROJECTS
// ══════════════════════════════════════════════════════════════════════════════

let editingProjectId = null;
const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
let pendingDeleteFn = null;

document.getElementById('confirm-delete-btn').addEventListener('click', () => {
    if (pendingDeleteFn) pendingDeleteFn();
    deleteModal.hide();
});

function confirmDelete(message, fn) {
    document.getElementById('delete-modal-text').textContent = message;
    pendingDeleteFn = fn;
    deleteModal.show();
}

// Load projects
async function loadProjects() {
    hide('projects-table-wrap');
    hide('projects-empty');
    show('projects-loading');

    try {
        const q = query(collection(db, 'projects'), orderBy('order', 'asc'));
        const snap = await getDocs(q);
        hide('projects-loading');

        if (snap.empty) { show('projects-empty'); return; }

        show('projects-table-wrap');
        const tbody = document.getElementById('projects-tbody');
        tbody.innerHTML = '';
        snap.forEach(d => renderProjectRow({ id: d.id, ...d.data() }));
    } catch (err) {
        hide('projects-loading');
        console.error(err);
        show('projects-empty');
    }
}

function renderProjectRow(p) {
    const tbody = document.getElementById('projects-tbody');
    const tr = document.createElement('tr');
    tr.dataset.id = p.id;
    tr.innerHTML = `
        <td>
            ${p.image ? `<img src="${p.image}" alt="" class="table-thumb">` : '<i class="fas fa-image text-muted"></i>'}
        </td>
        <td><strong>${p.title}</strong></td>
        <td>${p.category || '–'}</td>
        <td><small class="text-muted">${(p.tags || []).join(', ') || '–'}</small></td>
        <td class="text-center">${p.order || 1}</td>
        <td>
            <button class="btn btn-sm btn-outline-primary me-1 btn-edit-project" title="Edit">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger btn-delete-project" title="Delete">
                <i class="fas fa-trash"></i>
            </button>
        </td>`;
    tbody.appendChild(tr);

    tr.querySelector('.btn-edit-project').addEventListener('click', () => openProjectForm(p));
    tr.querySelector('.btn-delete-project').addEventListener('click', () => {
        confirmDelete(`Delete project "${p.title}"? This cannot be undone.`, async () => {
            await deleteDoc(doc(db, 'projects', p.id));
            tr.remove();
            if (!document.getElementById('projects-tbody').children.length) {
                hide('projects-table-wrap');
                show('projects-empty');
            }
        });
    });
}

// Open form
document.getElementById('btn-add-project').addEventListener('click', () => openProjectForm(null));
document.getElementById('project-cancel-btn').addEventListener('click', closeProjectForm);

function openProjectForm(project) {
    editingProjectId = project?.id || null;
    document.getElementById('project-form-title').textContent = project ? 'Edit Project' : 'Add New Project';
    document.getElementById('project-submit-text').textContent = project ? 'Update Project' : 'Save Project';

    // Fill fields
    document.getElementById('project-id').value            = project?.id || '';
    document.getElementById('p-title').value               = project?.title || '';
    document.getElementById('p-category').value            = project?.category || '';
    document.getElementById('p-order').value               = project?.order || 1;
    document.getElementById('p-description').value         = project?.description || '';
    document.getElementById('p-long-description').value    = project?.longDescription || '';
    document.getElementById('p-tags').value                = (project?.tags || []).join(', ');
    document.getElementById('p-github').value              = project?.githubUrl || '';
    document.getElementById('p-url').value                 = project?.projectUrl || '';
    document.getElementById('p-image-url').value           = project?.image || '';
    document.getElementById('p-video-url').value           = project?.videoUrl || '';
    document.getElementById('p-image-file').value          = '';
    document.getElementById('p-video-file').value          = '';

    // Image preview
    if (project?.image) {
        document.getElementById('p-image-preview-img').src = project.image;
        show('p-image-preview');
    } else {
        hide('p-image-preview');
    }

    hide('project-form-error');
    hide('project-form-success');
    show('project-form-panel');
    document.getElementById('project-form-panel').scrollIntoView({ behavior: 'smooth' });
}

function closeProjectForm() {
    hide('project-form-panel');
    editingProjectId = null;
    document.getElementById('project-form').reset();
}

// Image URL preview
document.getElementById('p-image-url').addEventListener('input', function () {
    if (this.value) {
        document.getElementById('p-image-preview-img').src = this.value;
        show('p-image-preview');
    } else {
        hide('p-image-preview');
    }
});

document.getElementById('p-image-file').addEventListener('change', function () {
    if (this.files[0]) {
        document.getElementById('p-image-preview-img').src = URL.createObjectURL(this.files[0]);
        show('p-image-preview');
        document.getElementById('p-image-url').value = '';
    }
});

// Submit project
document.getElementById('project-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    setLoading('project-submit-btn', 'project-submit-spinner', 'project-submit-text', true, 'Saving…');

    try {
        let imageUrl  = document.getElementById('p-image-url').value.trim();
        let videoUrl  = document.getElementById('p-video-url').value.trim();
        const imageFile = document.getElementById('p-image-file').files[0];
        const videoFile = document.getElementById('p-video-file').files[0];

        // Upload image if file selected
        if (imageFile) {
            imageUrl = await uploadFile(
                imageFile,
                `projects/images/${Date.now()}_${imageFile.name}`,
                'p-image-progress'
            );
        }

        // Upload video if file selected
        if (videoFile) {
            videoUrl = await uploadFile(
                videoFile,
                `projects/videos/${Date.now()}_${videoFile.name}`,
                'p-video-progress'
            );
        }

        const data = {
            title:           document.getElementById('p-title').value.trim(),
            category:        document.getElementById('p-category').value.trim(),
            order:           parseInt(document.getElementById('p-order').value) || 1,
            description:     document.getElementById('p-description').value.trim(),
            longDescription: document.getElementById('p-long-description').value.trim(),
            tags:            parseTags(document.getElementById('p-tags').value),
            githubUrl:       document.getElementById('p-github').value.trim(),
            projectUrl:      document.getElementById('p-url').value.trim(),
            image:           imageUrl,
            videoUrl:        videoUrl,
            updatedAt:       serverTimestamp()
        };

        if (!data.title || !data.description) {
            throw new Error('Title and short description are required.');
        }

        if (editingProjectId) {
            await updateDoc(doc(db, 'projects', editingProjectId), data);
            showMsg('project-form-success', 'Project updated successfully!', 'success');
        } else {
            data.createdAt = serverTimestamp();
            await addDoc(collection(db, 'projects'), data);
            showMsg('project-form-success', 'Project added successfully!', 'success');
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

// ══════════════════════════════════════════════════════════════════════════════
// SKILLS
// ══════════════════════════════════════════════════════════════════════════════

let editingSkillId = null;

async function loadSkillCategories() {
    hide('skills-table-wrap');
    hide('skills-empty');
    show('skills-loading');

    try {
        const q = query(collection(db, 'skills'), orderBy('order', 'asc'));
        const snap = await getDocs(q);
        hide('skills-loading');

        if (snap.empty) { show('skills-empty'); return; }

        show('skills-table-wrap');
        const tbody = document.getElementById('skills-tbody');
        tbody.innerHTML = '';
        snap.forEach(d => renderSkillRow({ id: d.id, ...d.data() }));
    } catch (err) {
        hide('skills-loading');
        console.error(err);
        show('skills-empty');
    }
}

function renderSkillRow(cat) {
    const tbody = document.getElementById('skills-tbody');
    const tr = document.createElement('tr');
    tr.dataset.id = cat.id;
    tr.innerHTML = `
        <td><strong>${cat.name}</strong></td>
        <td><i class="${cat.icon || ''}"></i> <small class="text-muted">${cat.icon || '–'}</small></td>
        <td><span class="badge ${cat.type === 'bar' ? 'bg-primary' : 'bg-success'}">${cat.type}</span></td>
        <td>${(cat.skills || []).length} skills</td>
        <td class="text-center">${cat.order || 1}</td>
        <td>
            <button class="btn btn-sm btn-outline-primary me-1 btn-edit-skill" title="Edit">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger btn-delete-skill" title="Delete">
                <i class="fas fa-trash"></i>
            </button>
        </td>`;
    tbody.appendChild(tr);

    tr.querySelector('.btn-edit-skill').addEventListener('click', () => openSkillForm(cat));
    tr.querySelector('.btn-delete-skill').addEventListener('click', () => {
        confirmDelete(`Delete skill category "${cat.name}"?`, async () => {
            await deleteDoc(doc(db, 'skills', cat.id));
            tr.remove();
            if (!document.getElementById('skills-tbody').children.length) {
                hide('skills-table-wrap');
                show('skills-empty');
            }
        });
    });
}

// Skill type toggle (show/hide level input)
document.getElementById('s-type').addEventListener('change', updateSkillItemInputs);

function updateSkillItemInputs() {
    const isBar = document.getElementById('s-type').value === 'bar';
    document.querySelectorAll('.skill-level-wrap').forEach(el => {
        el.classList.toggle('d-none', !isBar);
    });
}

// Add skill item row
document.getElementById('add-skill-item').addEventListener('click', () => addSkillItemRow());

function addSkillItemRow(name = '', level = 80) {
    const isBar = document.getElementById('s-type').value === 'bar';
    const list = document.getElementById('skills-list');
    const row = document.createElement('div');
    row.className = 'skill-input-row';
    row.innerHTML = `
        <input type="text" class="form-control skill-name-input" placeholder="Skill name" value="${name}">
        <div class="skill-level-wrap ${isBar ? '' : 'd-none'}">
            <input type="number" class="form-control skill-level-input" placeholder="%" value="${level}" min="1" max="100" style="width:80px">
            <span class="text-muted">%</span>
        </div>
        <button type="button" class="btn btn-sm btn-outline-danger remove-skill-row">
            <i class="fas fa-times"></i>
        </button>`;
    row.querySelector('.remove-skill-row').addEventListener('click', () => row.remove());
    list.appendChild(row);
}

// Open skill form
document.getElementById('btn-add-skill').addEventListener('click', () => openSkillForm(null));
document.getElementById('skill-cancel-btn').addEventListener('click', closeSkillForm);

function openSkillForm(cat) {
    editingSkillId = cat?.id || null;
    document.getElementById('skill-form-title').textContent = cat ? 'Edit Skill Category' : 'Add Skill Category';
    document.getElementById('skill-submit-text').textContent = cat ? 'Update Category' : 'Save Category';

    document.getElementById('skill-id').value  = cat?.id || '';
    document.getElementById('s-name').value    = cat?.name || '';
    document.getElementById('s-icon').value    = cat?.icon || '';
    document.getElementById('s-type').value    = cat?.type || 'bar';
    document.getElementById('s-order').value   = cat?.order || 1;

    // Render existing skills
    document.getElementById('skills-list').innerHTML = '';
    (cat?.skills || []).forEach(s => addSkillItemRow(s.name, s.level || 80));
    if (!cat?.skills?.length) addSkillItemRow();

    hide('skill-form-error');
    hide('skill-form-success');
    show('skill-form-panel');
    document.getElementById('skill-form-panel').scrollIntoView({ behavior: 'smooth' });
}

function closeSkillForm() {
    hide('skill-form-panel');
    editingSkillId = null;
    document.getElementById('skill-form').reset();
    document.getElementById('skills-list').innerHTML = '';
}

// Submit skill
document.getElementById('skill-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    setLoading('skill-submit-btn', 'skill-submit-spinner', 'skill-submit-text', true, 'Saving…');

    try {
        const name  = document.getElementById('s-name').value.trim();
        const icon  = document.getElementById('s-icon').value.trim();
        const type  = document.getElementById('s-type').value;
        const order = parseInt(document.getElementById('s-order').value) || 1;
        const isBar = type === 'bar';

        if (!name) throw new Error('Category name is required.');

        const skills = [];
        document.querySelectorAll('.skill-input-row').forEach(row => {
            const skillName = row.querySelector('.skill-name-input').value.trim();
            if (!skillName) return;
            const entry = { name: skillName };
            if (isBar) {
                entry.level = parseInt(row.querySelector('.skill-level-input')?.value) || 80;
            }
            skills.push(entry);
        });

        const data = { name, icon, type, order, skills, updatedAt: serverTimestamp() };

        if (editingSkillId) {
            await updateDoc(doc(db, 'skills', editingSkillId), data);
            showMsg('skill-form-success', 'Category updated successfully!', 'success');
        } else {
            data.createdAt = serverTimestamp();
            await addDoc(collection(db, 'skills'), data);
            showMsg('skill-form-success', 'Category added successfully!', 'success');
        }

        closeSkillForm();
        await loadSkillCategories();

    } catch (err) {
        console.error(err);
        showMsg('skill-form-error', err.message || 'Something went wrong.');
    } finally {
        setLoading('skill-submit-btn', 'skill-submit-spinner', 'skill-submit-text', false,
            editingSkillId ? 'Update Category' : 'Save Category');
    }
});

// ─── Init ─────────────────────────────────────────────────────────────────────
function init() {
    loadProjects();
    loadSkillCategories();
}
