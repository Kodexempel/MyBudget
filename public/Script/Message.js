// Message.js

function showSuccessMessage(message, duration) {
    const successMessage = document.getElementById('success-message');
    successMessage.textContent = message;
    successMessage.style.display = 'block';
  
    setTimeout(() => {
      successMessage.style.display = 'none';
    }, 5000);
  }
  