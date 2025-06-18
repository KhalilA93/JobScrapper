// Form filling utilities for job applications with stealth techniques
import { StealthScraper } from './stealthScraper.js';
import { StealthUtils, StealthInteractions } from './stealthUtils.js';

// Initialize stealth instance for form filling
const stealth = new StealthScraper({
  minActionDelay: 300,
  maxActionDelay: 1200,
  enableMouseSimulation: true
});

export const formFiller = {
  // LinkedIn form filler with stealth
  linkedin: {
    async fillForm(userProfile) {
      const fields = {
        // Common LinkedIn Easy Apply fields
        'input[name*="firstName"], input[id*="firstName"]': userProfile.firstName,
        'input[name*="lastName"], input[id*="lastName"]': userProfile.lastName,
        'input[name*="email"], input[type="email"]': userProfile.email,
        'input[name*="phone"], input[type="tel"]': userProfile.phone,
        'textarea[name*="coverLetter"], textarea[id*="coverLetter"]': userProfile.coverLetter
      };      await this.fillFieldsStealth(fields);
      await this.handleFileUploads(userProfile);
    },

    async fillFieldsStealth(fields) {
      for (const [selector, value] of Object.entries(fields)) {
        if (!value) continue;
        
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          await this.fillFieldStealth(element, value);
        }
      }
    },

    async fillFieldStealth(element, value) {
      if (!element || !value) return;

      // Use stealth typing instead of direct value assignment
      await StealthInteractions.naturalClick(element);
      await stealth.simulateTyping(element, value, {
        minDelay: 80,
        maxDelay: 250,
        mistakes: 0.01 // 1% chance of typos
      });
      
      // Add visual feedback
      element.classList.add('jobscrapper-filled');
      await StealthUtils.microDelay();
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
  // Indeed form filler with stealth
  indeed: {
    async fillForm(userProfile) {
      const fields = {
        'input[name="applicant.name"]': `${userProfile.firstName} ${userProfile.lastName}`,
        'input[name="applicant.emailAddress"]': userProfile.email,
        'input[name="applicant.phoneNumber"]': userProfile.phone,
        'textarea[name="applicant.coverLetter"]': userProfile.coverLetter
      };

      await this.fillFieldsStealth(fields);
    },

    async fillFieldsStealth(fields) {
      for (const [selector, value] of Object.entries(fields)) {
        if (!value) continue;
        
        const element = document.querySelector(selector);
        if (element) {
          await this.fillFieldStealth(element, value);
        }
      }
    },

    async fillFieldStealth(element, value) {
      if (!element || !value) return;

      await StealthInteractions.naturalClick(element);
      await stealth.simulateTyping(element, value, {
        minDelay: 100,
        maxDelay: 300,
        mistakes: 0.015 // Slightly higher error rate for Indeed
      });
      
      element.classList.add('jobscrapper-filled');
      await StealthUtils.microDelay();
    }
  },
  // Generic form filler with stealth
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
            await this.fillFieldStealth(element, field.value);
          }
        }
      }
    },

    async fillFieldStealth(element, value) {
      if (!element || !value) return;

      // Skip if field is already filled
      if (element.value && element.value.trim()) return;

      // Handle different input types
      if (element.type === 'checkbox' || element.type === 'radio') {
        await StealthInteractions.naturalClick(element);
        element.checked = Boolean(value);
        element.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        // Use stealth typing for text inputs
        await StealthInteractions.naturalClick(element);
        await stealth.simulateTyping(element, value, {
          minDelay: 90,
          maxDelay: 280,
          mistakes: 0.012
        });
      }
      
      // Visual feedback
      element.classList.add('jobscrapper-filled');
      await StealthUtils.microDelay();
    }
  }
};
