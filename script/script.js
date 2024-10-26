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
        footer.style.display = 'block'; 
    } else {
        footer.style.display = 'none'; 
    }
});

function sendEmail() {
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const subject = document.getElementById('subject').value;
    const comment = document.getElementById('comment').value;
    
    emailjs.send("service_g4pd0uf","template_obwymbh",{
        from_name: "Youssef",
        to_name: name,
        message: subject,
        email: email,
        reply_to:comment,
        })
        .then((response) => {
            console.log('SUCCESS!', response.status, response.text);
            alert('Your message has been sent!'); // Confirmation message
        }, (error) => {
            console.log('FAILED...', error);
            alert('Failed to send your message. Please try again later.');
        });
}