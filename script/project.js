import { db } from '../firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getYoutubeEmbedUrl(url) {
    if (!url) return null;
    // youtu.be/ID
    let m = url.match(/youtu\.be\/([^?&\s]+)/);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
    // youtube.com/watch?v=ID
    m = url.match(/[?&]v=([^&\s]+)/);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
    // already an embed URL
    if (url.includes('/embed/')) return url;
    return null;
}

function isVideoFile(url) {
    if (!url) return false;
    return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
}

function show(id) { document.getElementById(id).classList.remove('d-none'); }
function hide(id) { document.getElementById(id).classList.add('d-none'); }

// ─── Render ──────────────────────────────────────────────────────────────────

function renderProject(project) {
    // Page title
    document.title = `${project.title} – Youssef Hatem`;

    // Video / Image hero
    const vc = document.getElementById('video-container');
    const embedUrl = getYoutubeEmbedUrl(project.videoUrl);

    if (embedUrl) {
        vc.innerHTML = `
            <div class="video-wrapper">
                <iframe src="${embedUrl}"
                    title="${project.title}"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen>
                </iframe>
            </div>`;
    } else if (project.videoUrl && isVideoFile(project.videoUrl)) {
        vc.innerHTML = `
            <div class="video-wrapper">
                <video controls>
                    <source src="${project.videoUrl}">
                    Your browser does not support the video tag.
                </video>
            </div>`;
    } else if (project.image) {
        vc.innerHTML = `<img src="${project.image}" alt="${project.title}" class="project-hero-img">`;
    }

    // Tags
    const tagsHtml = (project.tags || []).map(t => `<span class="project-tag">${t}</span>`).join('');
    document.getElementById('project-tags').innerHTML = tagsHtml;
    document.getElementById('meta-tags').textContent = (project.tags || []).join(', ') || '—';

    // Title
    document.getElementById('project-title').textContent = project.title;

    // Category
    if (project.category) {
        document.getElementById('meta-category-val').textContent = project.category;
        show('meta-category');
    }

    // Live demo button
    if (project.projectUrl) {
        const btn = document.getElementById('btn-live');
        const metaBtn = document.getElementById('meta-btn-live');
        btn.href = project.projectUrl;
        metaBtn.href = project.projectUrl;
        btn.classList.remove('d-none');
        metaBtn.classList.remove('d-none');
    }

    // GitHub button
    if (project.githubUrl) {
        const btn = document.getElementById('btn-github');
        const metaBtn = document.getElementById('meta-btn-github');
        btn.href = project.githubUrl;
        metaBtn.href = project.githubUrl;
        btn.classList.remove('d-none');
        metaBtn.classList.remove('d-none');
    }

    // Long description (markdown)
    const descEl = document.getElementById('project-description');
    if (project.longDescription) {
        descEl.innerHTML = marked.parse(project.longDescription);
    } else if (project.description) {
        descEl.innerHTML = `<p>${project.description}</p>`;
    }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) {
        hide('loading-state');
        show('error-state');
        return;
    }

    try {
        const ref = doc(db, 'projects', id);
        const snap = await getDoc(ref);

        hide('loading-state');

        if (!snap.exists()) {
            show('error-state');
            return;
        }

        renderProject({ id: snap.id, ...snap.data() });
        show('project-content');

    } catch (err) {
        console.error('loadProject:', err);
        hide('loading-state');
        show('error-state');
    }
}

document.addEventListener('DOMContentLoaded', init);
