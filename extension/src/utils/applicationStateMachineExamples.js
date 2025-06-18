// Application State Machine Usage Examples
// Demonstrates how to use the multi-step application state machine

import { ApplicationStateMachine } from './applicationStateMachine.js';

/**
 * LinkedIn Easy Apply Example
 */
async function linkedinEasyApplyExample() {
  const stateMachine = new ApplicationStateMachine({
    maxRetries: 3,
    stepTimeout: 30000,
    enableStealth: true,
    debugMode: true
  });

  const userData = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1-555-0123',
    coverLetter: 'I am excited to apply for this Software Engineer position...',
    yearsExperience: '5',
    expectedSalary: 'Negotiable',
    customAnswers: {
      'sponsorship': 'No',
      'remote': 'Yes',
      'relocate': 'Yes'
    }
  };

  const applicationConfig = {
    platform: 'linkedin',
    jobId: 'job-123456',
    autoSubmit: false, // Review before submitting
    skipOptionalFields: true
  };

  try {
    console.log('🚀 Starting LinkedIn Easy Apply...');
    
    const result = await stateMachine.startApplication(userData, applicationConfig);
    
    if (result.success) {
      console.log('✅ Application completed successfully!');
      console.log(`Duration: ${(result.duration / 1000).toFixed(2)}s`);
      console.log(`Steps completed: ${result.currentStep}/${result.totalSteps}`);
    } else {
      console.log('❌ Application failed');
      console.log('Errors:', result.errors);
    }

    return result;

  } catch (error) {
    console.error('Application process error:', error);
    throw error;
  }
}

/**
 * Indeed Application Example
 */
async function indeedApplicationExample() {
  const stateMachine = new ApplicationStateMachine({
    maxRetries: 2,
    enableStealth: true,
    autoAdvance: true
  });

  const userData = {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    phone: '(555) 123-4567',
    coverLetter: 'Dear Hiring Manager,\n\nI am writing to express my interest...',
    resumeFile: { name: 'jane_smith_resume.pdf' }
  };

  console.log('🚀 Starting Indeed application...');
  
  const result = await stateMachine.startApplication(userData, {
    platform: 'indeed',
    validateEachStep: true
  });

  console.log('Indeed Application Result:', {
    success: result.success,
    steps: `${result.currentStep}/${result.totalSteps}`,
    duration: `${(result.duration / 1000).toFixed(2)}s`
  });

  return result;
}

/**
 * Generic Multi-Step Form Example
 */
async function genericMultiStepExample() {
  const stateMachine = new ApplicationStateMachine({
    maxRetries: 3,
    enableStealth: false, // Faster for testing
    debugMode: true
  });

  const userData = {
    firstName: 'Mike',
    lastName: 'Johnson',
    email: 'mike.johnson@example.com',
    phone: '555-987-6543',
    location: 'San Francisco, CA',
    experience: '3 years',
    skills: ['JavaScript', 'React', 'Node.js']
  };

  console.log('🚀 Starting generic multi-step application...');
  
  const result = await stateMachine.startApplication(userData, {
    platform: 'generic',
    customFieldMapping: {
      'full_name': `${userData.firstName} ${userData.lastName}`,
      'years_exp': userData.experience
    }
  });

  return result;
}

/**
 * Application with Error Recovery Example
 */
async function errorRecoveryExample() {
  const stateMachine = new ApplicationStateMachine({
    maxRetries: 5, // Higher retry count for demo
    stepTimeout: 15000,
    enableStealth: true,
    debugMode: true
  });

  // Intentionally problematic data to trigger recovery
  const problematicUserData = {
    firstName: 'Test',
    lastName: 'User',
    email: 'invalid-email', // Will trigger validation error
    phone: '123', // Invalid phone
    coverLetter: ''
  };

  console.log('🧪 Testing error recovery mechanisms...');

  try {
    const result = await stateMachine.startApplication(problematicUserData);
    
    console.log('Error Recovery Test Results:');
    console.log(`- Final state: ${result.state}`);
    console.log(`- Errors encountered: ${result.errors.length}`);
    console.log(`- Recovery attempts: ${result.stepHistory.filter(h => h.to === 'ERROR_RECOVERY').length}`);
    
    // Show error types and recovery strategies
    result.errors.forEach((error, index) => {
      console.log(`Error ${index + 1}: ${error.error} (at step ${error.step})`);
    });

    return result;

  } catch (error) {
    console.log('Expected error during recovery testing:', error.message);
  }
}

/**
 * Progress Monitoring Example
 */
async function progressMonitoringExample() {
  const stateMachine = new ApplicationStateMachine({
    enableStealth: true,
    debugMode: false // Clean output for progress monitoring
  });

  const userData = {
    firstName: 'Sarah',
    lastName: 'Wilson',
    email: 'sarah.wilson@example.com',
    phone: '+1-555-456-7890',
    coverLetter: 'I am passionate about this role...'
  };

  console.log('📊 Application with Progress Monitoring');
  console.log('=====================================');

  // Monitor progress during application
  const progressInterval = setInterval(() => {
    const progress = stateMachine.progressTracker.getProgress();
    
    if (progress.phase !== 'initialized') {
      console.log(`📈 Progress: ${progress.percentage}% | Phase: ${progress.phase} | Step: ${progress.step + 1}/${progress.totalSteps}`);
    }
  }, 2000);

  try {
    const result = await stateMachine.startApplication(userData);
    
    clearInterval(progressInterval);
    
    console.log('\n🎯 Final Progress Report:');
    console.log(`- Success: ${result.success}`);
    console.log(`- Duration: ${(result.duration / 1000).toFixed(2)}s`);
    console.log(`- Steps: ${result.currentStep}/${result.totalSteps}`);
    console.log(`- Phases completed: ${result.progress.phases.length}`);
    
    // Show phase timeline
    console.log('\n⏱️ Phase Timeline:');
    result.progress.phases.forEach((phase, index) => {
      const duration = index > 0 
        ? phase.timestamp - result.progress.phases[index - 1].timestamp
        : phase.timestamp - result.context.startTime;
      
      console.log(`  ${index + 1}. ${phase.phase}: ${duration}ms`);
    });

    return result;

  } finally {
    clearInterval(progressInterval);
  }
}

/**
 * Batch Application Processing Example
 */
async function batchApplicationExample() {
  const jobApplications = [
    {
      platform: 'linkedin',
      jobId: 'job-001',
      userData: {
        firstName: 'Alex',
        lastName: 'Brown',
        email: 'alex.brown@example.com',
        phone: '555-001-0001',
        coverLetter: 'Tailored cover letter for Job 1...'
      }
    },
    {
      platform: 'indeed',
      jobId: 'job-002',
      userData: {
        firstName: 'Alex',
        lastName: 'Brown',
        email: 'alex.brown@example.com',
        phone: '555-001-0001',
        coverLetter: 'Tailored cover letter for Job 2...'
      }
    }
  ];

  const results = [];

  console.log(`🔄 Processing ${jobApplications.length} job applications...`);

  for (let i = 0; i < jobApplications.length; i++) {
    const job = jobApplications[i];
    
    console.log(`\n📋 Application ${i + 1}/${jobApplications.length} - ${job.platform.toUpperCase()}`);
    
    const stateMachine = new ApplicationStateMachine({
      maxRetries: 2,
      enableStealth: true
    });

    try {
      const result = await stateMachine.startApplication(job.userData, {
        platform: job.platform,
        jobId: job.jobId
      });
      
      results.push({
        jobId: job.jobId,
        platform: job.platform,
        success: result.success,
        duration: result.duration,
        errors: result.errors.length
      });

      console.log(`${result.success ? '✅' : '❌'} Job ${job.jobId}: ${result.success ? 'Success' : 'Failed'}`);

      // Rate limiting between applications
      if (i < jobApplications.length - 1) {
        console.log('⏳ Waiting before next application...');
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
      }

    } catch (error) {
      console.error(`❌ Job ${job.jobId} failed:`, error.message);
      
      results.push({
        jobId: job.jobId,
        platform: job.platform,
        success: false,
        error: error.message
      });
    }
  }

  // Summary report
  console.log('\n📊 Batch Application Summary:');
  console.log('===============================');
  
  const successful = results.filter(r => r.success).length;
  const failed = results.length - successful;
  
  console.log(`✅ Successful: ${successful}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  
  const avgDuration = results
    .filter(r => r.duration)
    .reduce((sum, r) => sum + r.duration, 0) / successful;
  
  if (successful > 0) {
    console.log(`⏱️ Average Duration: ${(avgDuration / 1000).toFixed(2)}s`);
  }

  return results;
}

/**
 * State Machine Testing Example
 */
async function stateMachineTestingExample() {
  console.log('🧪 State Machine Testing Suite');
  console.log('==============================');

  const tests = [
    {
      name: 'Basic State Transitions',
      test: async () => {
        const stateMachine = new ApplicationStateMachine({ debugMode: false });
        
        // Test basic initialization
        if (stateMachine.currentState !== 'INITIALIZED') {
          throw new Error('Initial state should be INITIALIZED');
        }
        
        // Test transition
        await stateMachine.transition('DETECTING_STEPS');
        
        if (stateMachine.currentState !== 'DETECTING_STEPS') {
          throw new Error('State transition failed');
        }
        
        return { passed: true };
      }
    },
    {
      name: 'Error Handling',
      test: async () => {
        const stateMachine = new ApplicationStateMachine({ 
          maxRetries: 1,
          debugMode: false 
        });
        
        // Simulate error
        stateMachine.context = { errors: [] };
        await stateMachine.handleError(new Error('Test error'));
        
        if (stateMachine.context.errors.length === 0) {
          throw new Error('Error was not recorded');
        }
        
        return { passed: true };
      }
    },
    {
      name: 'Progress Tracking',
      test: async () => {
        const stateMachine = new ApplicationStateMachine();
        
        stateMachine.progressTracker.updateProgress({
          phase: 'test',
          step: 1,
          totalSteps: 3
        });
        
        const progress = stateMachine.progressTracker.getProgress();
        
        if (progress.phase !== 'test' || progress.step !== 1) {
          throw new Error('Progress tracking failed');
        }
        
        return { passed: true };
      }
    }
  ];

  const results = [];

  for (const test of tests) {
    try {
      console.log(`🔬 Running: ${test.name}`);
      const result = await test.test();
      results.push({ name: test.name, passed: true });
      console.log(`✅ ${test.name}: PASSED`);
    } catch (error) {
      results.push({ name: test.name, passed: false, error: error.message });
      console.log(`❌ ${test.name}: FAILED - ${error.message}`);
    }
  }

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  console.log(`\n📊 Test Results: ${passed}/${total} passed`);
  
  return results;
}

// Utility function to wait for user interaction (for demos)
async function waitForUserInteraction(message) {
  console.log(`⏸️ ${message}`);
  console.log('Press Enter to continue...');
  
  // In a real implementation, this could wait for user input
  // For now, just add a delay
  await new Promise(resolve => setTimeout(resolve, 2000));
}

// Export examples for use
export {
  linkedinEasyApplyExample,
  indeedApplicationExample,
  genericMultiStepExample,
  errorRecoveryExample,
  progressMonitoringExample,
  batchApplicationExample,
  stateMachineTestingExample,
  waitForUserInteraction
};
