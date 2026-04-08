// project.js — loads project from data.json (no Firebase)

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
    document.getElementById('meta-tags').textContent = (p.tags || []).join(', ') || '—';

    document.getElementById('project-title').textContent = p.title;

    if (p.category) {
        document.getElementById('meta-category-val').textContent = p.category;
        show('meta-category');
    }

    if (p.projectUrl) {
        document.getElementById('btn-live').href     = p.projectUrl;
        document.getElementById('meta-btn-live').href = p.projectUrl;
        document.getElementById('btn-live').classList.remove('d-none');
        document.getElementById('meta-btn-live').classList.remove('d-none');
    }
    if (p.githubUrl) {
        document.getElementById('btn-github').href     = p.githubUrl;
        document.getElementById('meta-btn-github').href = p.githubUrl;
        document.getElementById('btn-github').classList.remove('d-none');
        document.getElementById('meta-btn-github').classList.remove('d-none');
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
    const id = params.get('id');

    if (!id) { hide('loading-state'); show('error-state'); return; }

    try {
        const res  = await fetch('data.json?v=' + Date.now());
        const data = await res.json();
        const project = (data.projects || []).find(p => p.id === id);

        hide('loading-state');
        if (!project) { show('error-state'); return; }

        renderProject(project);
        show('project-content');
    } catch (err) {
        console.error(err);
        hide('loading-state');
        show('error-state');
    }
}

document.addEventListener('DOMContentLoaded', init);
