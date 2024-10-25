// add class navbarDark on navbar scroll
const header = document.querySelector('.navbar');

window.onscroll = function() {
    var top = window.scrollY;
    if(top >=100) {
        header.classList.add('navbarDark');
    }
    else {
        header.classList.remove('navbarDark');
    }
}
window.addEventListener('scroll', function() {
    const contactSection = document.getElementById('contact');
    const footer = document.getElementById('footer');
    
    const rect = contactSection.getBoundingClientRect();
    
    if (rect.top <= window.innerHeight && rect.bottom >= 0) {
        footer.style.display = 'block'; // إظهار الفوتر
    } else {
        footer.style.display = 'none'; // إخفاء الفوتر
    }
});