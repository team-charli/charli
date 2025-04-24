// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Get form elements
  const waitlistForm = document.getElementById('waitlist-form');
  const emailInput = document.getElementById('email');
  const successMessage = document.getElementById('success-message');

  // Handle form submission
  waitlistForm.addEventListener('submit', (event) => {
    // Prevent actual form submission
    event.preventDefault();
    
    // Get email value
    const email = emailInput.value.trim();
    
    // Basic email validation
    if (email && isValidEmail(email)) {
      // Simulate form submission
      simulateFormSubmission(email);
      
      // Clear input
      emailInput.value = '';
      
      // Show success message
      successMessage.style.display = 'block';
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        successMessage.style.display = 'none';
      }, 5000);
    }
  });

  // Basic email validation function
  function isValidEmail(email) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  }

  // Simulate form submission (in a real app, this would send data to a server)
  function simulateFormSubmission(email) {
    console.log('Email submitted:', email);
    // In a real application, this would be an API call
  }
  
  // Add subtle animations on scroll (optional enhancement)
  const sections = document.querySelectorAll('section');
  
  const fadeInOnScroll = () => {
    sections.forEach(section => {
      const sectionTop = section.getBoundingClientRect().top;
      const windowHeight = window.innerHeight;
      
      if (sectionTop < windowHeight * 0.75) {
        section.style.opacity = '1';
        section.style.transform = 'translateY(0)';
      }
    });
  };
  
  // Initial setup for fade in effect
  sections.forEach(section => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(20px)';
    section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  });
  
  // Run on page load and scroll
  fadeInOnScroll();
  window.addEventListener('scroll', fadeInOnScroll);
});