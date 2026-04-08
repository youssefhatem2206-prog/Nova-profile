// project.js — loads project from Firebase Firestore
import { db } from '../firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

function getYoutubeEmbedUrl(url) {
    if (!url) return null;
    let m = url.match(/youtu\.be\/([^?&\s]+)/);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
    m = url.match(/[?&]v=([^&\s]+)/);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
    if (url.includes('/embed/')) return url;
    return null;
}

function show(id) { document.getElementById(id)?.classList.remove('d-none'); }
function hide(id) { document.getElementById(id)?.classList.add('d-none'); }

function renderProject(p) {
    document.title = `${p.title} – Noventiq Data & AI`;

    // Hero: video or image
    const vc = document.getElementById('video-container');
    const embedUrl = getYoutubeEmbedUrl(p.videoUrl);
    if (embedUrl) {
        vc.innerHTML = `<div class="video-wrapper">
            <iframe src="${embedUrl}" title="${p.title}" frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen></iframe></div>`;
    } else if (p.videoUrl && /\.(mp4|webm|ogg)(\?|$)/i.test(p.videoUrl)) {
        vc.innerHTML = `<div class="video-wrapper"><video controls><source src="${p.videoUrl}"></video></div>`;
    } else if (p.image) {
        vc.innerHTML = `<img src="${p.image}" alt="${p.title}" class="project-hero-img">`;
    }

    // Tags
    const tagsHtml = (p.tags || []).map(t => `<span class="project-tag">${t}</span>`).join('');
    document.getElementById('project-tags').innerHTML = tagsHtml;
    document.getElementById('meta-tags').textContent  = (p.tags || []).join(', ') || '—';

    document.getElementById('project-title').textContent = p.title;

    if (p.category) {
        document.getElementById('meta-category-val').textContent = p.category;
        show('meta-category');
    }

    if (p.projectUrl) {
        document.getElementById('btn-live').href      = p.projectUrl;
        document.getElementById('meta-btn-live').href = p.projectUrl;
        show('btn-live');
        show('meta-btn-live');
    }

    const descEl = document.getElementById('project-description');
    if (p.longDescription && window.marked) {
        descEl.innerHTML = marked.parse(p.longDescription);
    } else if (p.description) {
        descEl.innerHTML = `<p>${p.description}</p>`;
    }
}

async function init() {
    const params = new URLSearchParams(window.location.search);
    const id     = params.get('id');

    if (!id) { hide('loading-state'); show('error-state'); return; }

    try {
        const snap = await getDoc(doc(db, 'projects', id));
        hide('loading-state');
        if (!snap.exists()) { show('error-state'); return; }
        renderProject({ id: snap.id, ...snap.data() });
        show('project-content');
    } catch (err) {
        console.error(err);
        hide('loading-state');
        show('error-state');
    }
}

document.addEventListener('DOMContentLoaded', init);
