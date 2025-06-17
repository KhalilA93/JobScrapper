// Form filling utilities for job applications
export const formFiller = {
  // LinkedIn form filler
  linkedin: {
    async fillForm(userProfile) {
      const fields = {
        // Common LinkedIn Easy Apply fields
        'input[name*="firstName"], input[id*="firstName"]': userProfile.firstName,
        'input[name*="lastName"], input[id*="lastName"]': userProfile.lastName,
        'input[name*="email"], input[type="email"]': userProfile.email,
        'input[name*="phone"], input[type="tel"]': userProfile.phone,
        'textarea[name*="coverLetter"], textarea[id*="coverLetter"]': userProfile.coverLetter
      };

      await this.fillFields(fields);
      await this.handleFileUploads(userProfile);
    },

    async fillFields(fields) {
      for (const [selector, value] of Object.entries(fields)) {
        if (!value) continue;
        
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          await this.fillField(element, value);
        }
      }
    },

    async fillField(element, value) {
      if (!element || !value) return;

      element.focus();
      element.value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Add visual feedback
      element.classList.add('jobscrapper-filled');
    },

    async handleFileUploads(userProfile) {
      // Handle resume upload if available
      if (userProfile.resumeUrl) {
        const fileInputs = document.querySelectorAll('input[type="file"]');
        for (const input of fileInputs) {
          // Note: File uploads require user interaction in most browsers
          // This would need to be handled differently in a real implementation
          console.log('File upload field found, manual upload required');
        }
      }
    }
  },

  // Indeed form filler
  indeed: {
    async fillForm(userProfile) {
      const fields = {
        'input[name="applicant.name"]': `${userProfile.firstName} ${userProfile.lastName}`,
        'input[name="applicant.emailAddress"]': userProfile.email,
        'input[name="applicant.phoneNumber"]': userProfile.phone,
        'textarea[name="applicant.coverLetter"]': userProfile.coverLetter
      };

      await this.fillFields(fields);
    },

    async fillFields(fields) {
      for (const [selector, value] of Object.entries(fields)) {
        if (!value) continue;
        
        const element = document.querySelector(selector);
        if (element) {
          await this.fillField(element, value);
        }
      }
    },

    async fillField(element, value) {
      element.focus();
      element.value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.classList.add('jobscrapper-filled');
    }
  },

  // Generic form filler
  generic: {
    async fillForm(userProfile) {
      const commonFields = [
        // Name fields
        { selectors: ['input[name*="first"], input[id*="first"], input[placeholder*="first"]'], value: userProfile.firstName },
        { selectors: ['input[name*="last"], input[id*="last"], input[placeholder*="last"]'], value: userProfile.lastName },
        { selectors: ['input[name*="name"]:not([name*="first"]):not([name*="last"])'], value: `${userProfile.firstName} ${userProfile.lastName}` },
        
        // Contact fields
        { selectors: ['input[type="email"], input[name*="email"], input[id*="email"]'], value: userProfile.email },
        { selectors: ['input[type="tel"], input[name*="phone"], input[id*="phone"]'], value: userProfile.phone },
        
        // Cover letter / message
        { selectors: ['textarea[name*="cover"], textarea[name*="message"], textarea[id*="cover"]'], value: userProfile.coverLetter }
      ];

      for (const field of commonFields) {
        if (!field.value) continue;
        
        for (const selector of field.selectors) {
          const elements = document.querySelectorAll(selector);
          for (const element of elements) {
            await this.fillField(element, field.value);
          }
        }
      }
    },

    async fillField(element, value) {
      if (!element || !value) return;

      // Skip if field is already filled
      if (element.value && element.value.trim()) return;

      element.focus();
      
      // Handle different input types
      if (element.type === 'checkbox' || element.type === 'radio') {
        element.checked = Boolean(value);
      } else {
        element.value = value;
      }

      // Trigger events
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new Event('blur', { bubbles: true }));
      
      // Visual feedback
      element.classList.add('jobscrapper-filled');
      
      // Small delay to ensure the form processes the input
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
};
