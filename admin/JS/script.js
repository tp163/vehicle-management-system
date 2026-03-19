const sections = document.querySelectorAll('.fade-in');

function revealSections(){

sections.forEach(section => {

const sectionTop = section.getBoundingClientRect().top;

if(sectionTop < window.innerHeight - 100){

section.classList.add('show');

}

});

}

window.addEventListener('scroll', revealSections);