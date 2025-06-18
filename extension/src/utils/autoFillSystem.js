// Auto-Fill System for Job Application Forms
// Core filling logic with smart field detection and validation

import { StealthScraper } from './stealthScraper.js';
import { StealthUtils } from './stealthUtils.js';

class AutoFillSystem {
  constructor(options = {}) {
    this.config = {
      enableStealth: options.enableStealth !== false,
      validateFields: options.validateFields !== false,
      skipFilledFields: options.skipFilledFields !== false,
      fillDelay: options.fillDelay || 200,
      maxRetries: options.maxRetries || 3,
      scrollToField: options.scrollToField !== false
    };

    this.stealth = new StealthScraper({
      minActionDelay: 100,
      maxActionDelay: 300,
      enableMouseSimulation: this.config.enableStealth
    });

    // Field detection strategies
    this.fieldStrategies = new FieldDetectionStrategies();
    this.fieldMapper = new SmartFieldMapper();
    this.fieldValidator = new FieldValidator();
  }

  /**
   * Main auto-fill function
   * @param {Object} userData - User data to fill
   * @param {Object} options - Fill options
   */
  async autoFill(userData, options = {}) {
    const fillOptions = { ...this.config, ...options };
    const results = {
      filled: [],
      skipped: [],
      failed: [],
      validated: []
    };

    try {
      // Detect all fillable fields
      const detectedFields = await this.detectFields();
      console.log(`Detected ${detectedFields.length} fillable fields`);

      // Map fields to user data
      const fieldMappings = await this.mapFieldsToData(detectedFields, userData);
      console.log(`Mapped ${fieldMappings.length} fields to user data`);

      // Fill fields with validation
      for (const mapping of fieldMappings) {
        try {
          const fillResult = await this.fillField(mapping, fillOptions);
          
          if (fillResult.success) {
            results.filled.push(fillResult);
          } else if (fillResult.skipped) {
            results.skipped.push(fillResult);
          } else {
            results.failed.push(fillResult);
          }

          // Add delay between fields
          if (fillOptions.fillDelay && this.config.enableStealth) {
            await this.stealth.randomDelay(fillOptions.fillDelay, fillOptions.fillDelay * 2);
          }

        } catch (error) {
          console.error(`Failed to fill field ${mapping.fieldType}:`, error);
          results.failed.push({
            fieldType: mapping.fieldType,
            element: mapping.element,
            error: error.message
          });
        }
      }

      // Validate filled form
      if (fillOptions.validateFields) {
        const validation = await this.validateForm(results.filled);
        results.validated = validation;
      }

      return results;

    } catch (error) {
      console.error('Auto-fill failed:', error);
      throw error;
    }
  }

  /**
   * Detect all fillable fields on the page
   */
  async detectFields() {
    const fields = [];
    
    // Get all potential form elements
    const formElements = document.querySelectorAll('input, textarea, select');
    
    for (const element of formElements) {
      const fieldInfo = await this.fieldStrategies.analyzeField(element);
      
      if (fieldInfo.fillable) {
        fields.push({
          element,
          ...fieldInfo
        });
      }
    }

    // Sort by fill priority
    return fields.sort((a, b) => (a.priority || 0) - (b.priority || 0));
  }

  /**
   * Map detected fields to user data
   */
  async mapFieldsToData(fields, userData) {
    const mappings = [];

    for (const field of fields) {
      const mapping = await this.fieldMapper.mapField(field, userData);
      
      if (mapping.value !== null && mapping.value !== undefined) {
        mappings.push({
          element: field.element,
          fieldType: field.fieldType,
          value: mapping.value,
          confidence: mapping.confidence,
          fillMethod: mapping.fillMethod
        });
      }
    }

    return mappings;
  }

  /**
   * Fill a single field with proper validation and events
   */
  async fillField(mapping, options = {}) {
    const { element, fieldType, value, fillMethod } = mapping;

    try {
      // Skip if field is already filled
      if (options.skipFilledFields && this.isFieldFilled(element)) {
        return {
          success: false,
          skipped: true,
          fieldType,
          reason: 'already_filled'
        };
      }

      // Scroll to field if needed
      if (options.scrollToField) {
        await this.scrollToField(element);
      }

      // Pre-fill validation
      const preValidation = await this.fieldValidator.validateField(element, value);
      if (!preValidation.valid) {
        return {
          success: false,
          fieldType,
          error: preValidation.error
        };
      }

      // Fill the field using appropriate method
      const fillResult = await this.executeFill(element, value, fillMethod, options);

      // Post-fill validation
      if (options.validateFields) {
        const postValidation = await this.fieldValidator.validateFilledField(element);
        fillResult.validation = postValidation;
      }

      return {
        success: true,
        fieldType,
        value: fillResult.actualValue,
        method: fillMethod,
        validation: fillResult.validation
      };

    } catch (error) {
      return {
        success: false,
        fieldType,
        error: error.message
      };
    }
  }

  /**
   * Execute the actual field filling
   */
  async executeFill(element, value, method, options) {
    let actualValue = value;

    switch (method) {
      case 'stealth_typing':
        if (this.config.enableStealth) {
          await this.stealthFill(element, value);
        } else {
          await this.directFill(element, value);
        }
        break;

      case 'direct_fill':
        await this.directFill(element, value);
        break;

      case 'select_option':
        actualValue = await this.selectOption(element, value);
        break;

      case 'file_upload':
        actualValue = await this.handleFileUpload(element, value);
        break;

      case 'checkbox_toggle':
        actualValue = await this.toggleCheckbox(element, value);
        break;

      default:
        await this.directFill(element, value);
    }

    return { actualValue };
  }

  /**
   * Stealth fill with human-like typing
   */
  async stealthFill(element, value) {
    // Focus on element
    await this.focusElement(element);
    
    // Clear existing content
    if (element.value) {
      element.select();
      await StealthUtils.microDelay();
    }

    // Type with stealth
    await this.stealth.simulateTyping(element, value.toString(), {
      minDelay: 80,
      maxDelay: 200,
      mistakes: 0.01 // 1% chance of typos
    });

    // Trigger events
    await this.triggerEvents(element, ['input', 'change']);
  }

  /**
   * Direct fill for non-stealth mode
   */
  async directFill(element, value) {
    await this.focusElement(element);
    
    element.value = value.toString();
    
    await this.triggerEvents(element, ['input', 'change', 'blur']);
    await StealthUtils.microDelay();
  }

  /**
   * Select option from dropdown
   */
  async selectOption(element, value) {
    await this.focusElement(element);

    // Find matching option
    const option = Array.from(element.options).find(opt => 
      opt.value === value || 
      opt.text.toLowerCase().includes(value.toString().toLowerCase())
    );

    if (option) {
      element.value = option.value;
      await this.triggerEvents(element, ['input', 'change']);
      return option.value;
    } else {
      throw new Error(`Option not found: ${value}`);
    }
  }

  /**
   * Handle file upload fields
   */
  async handleFileUpload(element, fileInfo) {
    // Note: File uploads require user interaction in browsers
    // This is a placeholder for file upload handling
    console.warn('File upload detected but requires manual user interaction');
    
    // Add visual indicator
    element.style.border = '2px dashed #007bff';
    element.title = `Upload required: ${fileInfo.name || 'Resume/CV'}`;
    
    return 'upload_required';
  }

  /**
   * Toggle checkbox/radio buttons
   */
  async toggleCheckbox(element, value) {
    await this.focusElement(element);
    
    const shouldCheck = Boolean(value);
    
    if (element.checked !== shouldCheck) {
      if (this.config.enableStealth) {
        // Simulate click
        await this.stealth.simulateClick(element);
      } else {
        element.checked = shouldCheck;
        await this.triggerEvents(element, ['change']);
      }
    }

    return element.checked;
  }

  /**
   * Focus on element with proper event handling
   */
  async focusElement(element) {
    if (document.activeElement !== element) {
      element.focus();
      await this.triggerEvents(element, ['focus']);
      await StealthUtils.microDelay();
    }
  }

  /**
   * Scroll to field if not visible
   */
  async scrollToField(element) {
    const rect = element.getBoundingClientRect();
    const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;

    if (!isVisible) {
      if (this.config.enableStealth) {
        await this.stealth.scrollToElement(element);
      } else {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  }

  /**
   * Trigger events on element
   */
  async triggerEvents(element, eventTypes) {
    for (const eventType of eventTypes) {
      const event = new Event(eventType, { bubbles: true, cancelable: true });
      element.dispatchEvent(event);
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  /**
   * Check if field is already filled
   */
  isFieldFilled(element) {
    if (element.type === 'checkbox' || element.type === 'radio') {
      return element.checked;
    }
    
    return element.value && element.value.trim().length > 0;
  }

  /**
   * Validate entire form after filling
   */
  async validateForm(filledFields) {
    const validationResults = [];

    for (const field of filledFields) {
      const validation = await this.fieldValidator.validateFilledField(field.element);
      validationResults.push({
        fieldType: field.fieldType,
        valid: validation.valid,
        error: validation.error
      });
    }

    return validationResults;
  }
}

/**
 * Field Detection Strategies
 */
class FieldDetectionStrategies {
  /**
   * Analyze a form field to determine its type and fillability
   */
  async analyzeField(element) {
    const strategies = [
      this.detectByType.bind(this),
      this.detectByName.bind(this),
      this.detectByPlaceholder.bind(this),
      this.detectByLabel.bind(this),
      this.detectByAutocomplete.bind(this),
      this.detectByParentContext.bind(this)
    ];

    let fieldInfo = {
      fillable: false,
      fieldType: 'unknown',
      confidence: 0,
      priority: 100
    };

    // Run all detection strategies
    for (const strategy of strategies) {
      const result = await strategy(element);
      
      if (result.confidence > fieldInfo.confidence) {
        fieldInfo = { ...fieldInfo, ...result };
      }
    }

    return fieldInfo;
  }

  /**
   * Detect field type by input type attribute
   */
  async detectByType(element) {
    const typeMap = {
      'email': { fieldType: 'email', confidence: 90, priority: 10 },
      'tel': { fieldType: 'phone', confidence: 90, priority: 20 },
      'text': { fieldType: 'text', confidence: 30, priority: 50 },
      'file': { fieldType: 'file', confidence: 95, priority: 5 },
      'checkbox': { fieldType: 'checkbox', confidence: 80, priority: 30 },
      'radio': { fieldType: 'radio', confidence: 80, priority: 30 }
    };

    const type = element.type?.toLowerCase();
    const mapping = typeMap[type];

    if (mapping) {
      return {
        fillable: true,
        ...mapping
      };
    }

    return { fillable: false, confidence: 0 };
  }

  /**
   * Detect field type by name attribute
   */
  async detectByName(element) {
    const name = (element.name || '').toLowerCase();
    
    const patterns = {
      email: /email|e-mail|mail/,
      firstName: /first.*name|fname|given.*name/,
      lastName: /last.*name|lname|family.*name|surname/,
      fullName: /^name$|full.*name|complete.*name/,
      phone: /phone|tel|mobile|cell/,
      resume: /resume|cv|curriculum/,
      coverLetter: /cover.*letter|motivation|message/,
      experience: /experience|years|exp/,
      salary: /salary|wage|compensation|pay/,
      location: /location|city|address|zip|postal/
    };

    for (const [fieldType, pattern] of Object.entries(patterns)) {
      if (pattern.test(name)) {
        return {
          fillable: true,
          fieldType,
          confidence: 85,
          priority: this.getPriority(fieldType)
        };
      }
    }

    return { fillable: false, confidence: 0 };
  }

  /**
   * Detect field type by placeholder text
   */
  async detectByPlaceholder(element) {
    const placeholder = (element.placeholder || '').toLowerCase();
    
    const patterns = {
      email: /email|e-mail/,
      firstName: /first.*name/,
      lastName: /last.*name/,
      phone: /phone|mobile/,
      coverLetter: /cover.*letter|why.*interested/,
      experience: /years.*experience/,
      salary: /salary|expected.*pay/
    };

    for (const [fieldType, pattern] of Object.entries(patterns)) {
      if (pattern.test(placeholder)) {
        return {
          fillable: true,
          fieldType,
          confidence: 75,
          priority: this.getPriority(fieldType)
        };
      }
    }

    return { fillable: false, confidence: 0 };
  }

  /**
   * Detect field type by associated label
   */
  async detectByLabel(element) {
    const label = this.findLabel(element);
    if (!label) return { fillable: false, confidence: 0 };

    const labelText = label.textContent.toLowerCase();
    
    const patterns = {
      email: /email|e-mail/,
      firstName: /first.*name/,
      lastName: /last.*name/,
      fullName: /^name$|full.*name/,
      phone: /phone|telephone|mobile/,
      resume: /resume|cv/,
      coverLetter: /cover.*letter|message/,
      experience: /experience|years/,
      salary: /salary|compensation/
    };

    for (const [fieldType, pattern] of Object.entries(patterns)) {
      if (pattern.test(labelText)) {
        return {
          fillable: true,
          fieldType,
          confidence: 80,
          priority: this.getPriority(fieldType)
        };
      }
    }

    return { fillable: false, confidence: 0 };
  }

  /**
   * Detect field type by autocomplete attribute
   */
  async detectByAutocomplete(element) {
    const autocomplete = (element.autocomplete || '').toLowerCase();
    
    const autocompleteMap = {
      'email': { fieldType: 'email', confidence: 95, priority: 10 },
      'given-name': { fieldType: 'firstName', confidence: 95, priority: 15 },
      'family-name': { fieldType: 'lastName', confidence: 95, priority: 16 },
      'name': { fieldType: 'fullName', confidence: 95, priority: 14 },
      'tel': { fieldType: 'phone', confidence: 95, priority: 20 }
    };

    const mapping = autocompleteMap[autocomplete];
    if (mapping) {
      return {
        fillable: true,
        ...mapping
      };
    }

    return { fillable: false, confidence: 0 };
  }

  /**
   * Detect field type by parent context
   */
  async detectByParentContext(element) {
    const parentText = this.getParentText(element, 2);
    
    if (parentText.includes('upload') && parentText.includes('resume')) {
      return {
        fillable: true,
        fieldType: 'resume',
        confidence: 70,
        priority: 5
      };
    }

    return { fillable: false, confidence: 0 };
  }

  /**
   * Find associated label for an element
   */
  findLabel(element) {
    // Direct label association
    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`);
      if (label) return label;
    }

    // Parent label
    const parentLabel = element.closest('label');
    if (parentLabel) return parentLabel;

    // Previous sibling label
    let sibling = element.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === 'LABEL') return sibling;
      sibling = sibling.previousElementSibling;
    }

    return null;
  }

  /**
   * Get parent context text
   */
  getParentText(element, levels = 2) {
    let parent = element.parentElement;
    let text = '';
    
    for (let i = 0; i < levels && parent; i++) {
      text += parent.textContent || '';
      parent = parent.parentElement;
    }
    
    return text.toLowerCase();
  }

  /**
   * Get fill priority for field type
   */
  getPriority(fieldType) {
    const priorities = {
      email: 10,
      firstName: 15,
      lastName: 16,
      fullName: 14,
      phone: 20,
      resume: 5,
      coverLetter: 40,
      experience: 30,
      salary: 35,
      location: 25
    };

    return priorities[fieldType] || 50;
  }
}

/**
 * Smart Field Mapper
 */
class SmartFieldMapper {
  /**
   * Map a detected field to user data
   */
  async mapField(fieldInfo, userData) {
    const { fieldType } = fieldInfo;
    
    const mappings = {
      email: () => ({ value: userData.email, confidence: 100, fillMethod: 'stealth_typing' }),
      firstName: () => ({ value: userData.firstName, confidence: 100, fillMethod: 'stealth_typing' }),
      lastName: () => ({ value: userData.lastName, confidence: 100, fillMethod: 'stealth_typing' }),
      fullName: () => ({ value: `${userData.firstName} ${userData.lastName}`, confidence: 100, fillMethod: 'stealth_typing' }),
      phone: () => ({ value: userData.phone, confidence: 100, fillMethod: 'stealth_typing' }),
      coverLetter: () => ({ value: userData.coverLetter, confidence: 90, fillMethod: 'stealth_typing' }),
      resume: () => ({ value: userData.resumeFile, confidence: 95, fillMethod: 'file_upload' }),
      experience: () => this.mapExperience(userData),
      salary: () => this.mapSalary(userData),
      location: () => ({ value: userData.location, confidence: 80, fillMethod: 'stealth_typing' })
    };

    const mapper = mappings[fieldType];
    if (mapper) {
      return mapper();
    }

    return { value: null, confidence: 0, fillMethod: 'direct_fill' };
  }

  /**
   * Map experience field
   */
  mapExperience(userData) {
    if (userData.experience) {
      return { value: userData.experience, confidence: 85, fillMethod: 'stealth_typing' };
    }
    
    if (userData.yearsExperience) {
      return { value: userData.yearsExperience.toString(), confidence: 90, fillMethod: 'stealth_typing' };
    }

    return { value: null, confidence: 0, fillMethod: 'direct_fill' };
  }

  /**
   * Map salary field
   */
  mapSalary(userData) {
    if (userData.expectedSalary) {
      return { value: userData.expectedSalary, confidence: 80, fillMethod: 'stealth_typing' };
    }

    if (userData.salaryRange) {
      return { value: userData.salaryRange, confidence: 75, fillMethod: 'stealth_typing' };
    }

    return { value: null, confidence: 0, fillMethod: 'direct_fill' };
  }
}

/**
 * Field Validator
 */
class FieldValidator {
  /**
   * Validate field before filling
   */
  async validateField(element, value) {
    // Check if element is fillable
    if (element.disabled || element.readOnly) {
      return { valid: false, error: 'Field is disabled or readonly' };
    }

    // Check if element is visible
    if (!this.isVisible(element)) {
      return { valid: false, error: 'Field is not visible' };
    }

    // Type-specific validation
    const typeValidation = await this.validateByType(element, value);
    if (!typeValidation.valid) {
      return typeValidation;
    }

    return { valid: true };
  }

  /**
   * Validate field after filling
   */
  async validateFilledField(element) {
    const value = element.value;

    // Check if required field is filled
    if (element.required && (!value || value.trim() === '')) {
      return { valid: false, error: 'Required field is empty' };
    }

    // HTML5 validation
    if (!element.checkValidity()) {
      return { valid: false, error: element.validationMessage };
    }

    return { valid: true };
  }

  /**
   * Validate by field type
   */
  async validateByType(element, value) {
    const type = element.type?.toLowerCase();

    switch (type) {
      case 'email':
        return this.validateEmail(value);
      case 'tel':
        return this.validatePhone(value);
      case 'number':
        return this.validateNumber(value, element);
      default:
        return { valid: true };
    }
  }

  /**
   * Validate email format
   */
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Invalid email format' };
    }

    return { valid: true };
  }

  /**
   * Validate phone format
   */
  validatePhone(phone) {
    const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/;
    
    if (!phoneRegex.test(phone)) {
      return { valid: false, error: 'Invalid phone format' };
    }

    return { valid: true };
  }

  /**
   * Validate number field
   */
  validateNumber(value, element) {
    const num = parseFloat(value);
    
    if (isNaN(num)) {
      return { valid: false, error: 'Invalid number format' };
    }

    if (element.min && num < parseFloat(element.min)) {
      return { valid: false, error: `Value must be at least ${element.min}` };
    }

    if (element.max && num > parseFloat(element.max)) {
      return { valid: false, error: `Value must be at most ${element.max}` };
    }

    return { valid: true };
  }

  /**
   * Check if element is visible
   */
  isVisible(element) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    
    return rect.width > 0 && 
           rect.height > 0 && 
           style.visibility !== 'hidden' && 
           style.display !== 'none';
  }
}

export { AutoFillSystem, FieldDetectionStrategies, SmartFieldMapper, FieldValidator };
