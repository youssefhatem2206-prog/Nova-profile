// script/script.js
// add class navbarDark on navbar scroll
const header = document.querySelector('.navbar-custom');
const backToTop = document.querySelector('.back-to-top');

window.onscroll = function() {
    var top = window.scrollY;
    if(top >=100) {
        header.classList.add('scrolled');
        backToTop.classList.add('active');
    }
    else {
        header.classList.remove('scrolled');
        backToTop.classList.remove('active');
    }
}

// Smooth scrolling for navigation links (section anchors only)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        // Skip bare "#" or any link that's been updated to a real URL at runtime
        if (!href || href === '#' || !href.startsWith('#')) return;
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// Contact form submission
function sendEmail() {
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const subject = document.getElementById('subject').value;
    const comment = document.getElementById('comment').value;
    
    // Basic validation
    if (!name || !email || !subject || !comment) {
        alert('Please fill in all fields');
        return;
    }
    
    emailjs.send("service_g4pd0uf","template_obwymbh",{
        from_name: name,
        to_name: "Youssef",
        message: subject,
        email: email,
        reply_to: email,
        comment: comment
        })
        .then((response) => {
            console.log('SUCCESS!', response.status, response.text);
            alert('Your message has been sent successfully!');
            document.getElementById('contactForm').reset();
        }, (error) => {
            console.log('FAILED...', error);
            alert('Failed to send your message. Please try again later.');
        });
}

// Add active class to current navigation item
const sections = document.querySelectorAll('section');
const navLinks = document.querySelectorAll('.navbar-nav .nav-link');

window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (scrollY >= (sectionTop - 100)) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});

// Ensure social icons bar is always visible
window.addEventListener('load', function() {
    const socialIcons = document.querySelector('.social-icons');
    if (socialIcons) {
        socialIcons.style.display = 'block';
    }
});