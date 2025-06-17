import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Divider,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Save,
  Delete,
  Add,
  Edit,
  Notifications,
  Security,
  AccountCircle,
  Work,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { api } from '../services/api';

const Settings = () => {
  const [settings, setSettings] = useState({
    profile: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      linkedinUrl: '',
      githubUrl: '',
      portfolioUrl: '',
      bio: ''
    },
    preferences: {
      jobTypes: [],
      locations: [],
      salaryRange: { min: 0, max: 200000 },
      experienceLevel: '',
      industries: [],
      autoApply: false,
      dailyApplicationLimit: 10
    },
    notifications: {
      emailNotifications: true,
      pushNotifications: true,
      newJobAlerts: true,
      applicationUpdates: true,
      weeklyReports: true
    },
    automation: {
      autoApplyEnabled: false,
      autoApplyFilters: {
        salaryMin: 50000,
        experienceMatch: true,
        locationMatch: true
      },
      dailyLimit: 5,
      pauseOnWeekends: false
    }
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [openSkillDialog, setOpenSkillDialog] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [skills, setSkills] = useState([]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      // In a real app, this would fetch user settings from the API
      // For now, we'll use local storage or default values
      const savedSettings = localStorage.getItem('jobscrapperSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError('');
      
      // In a real app, this would save to the API
      // For now, we'll save to local storage
      localStorage.setItem('jobscrapperSettings', JSON.stringify(settings));
      
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (section, field, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleNestedSettingChange = (section, field, subField, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: {
          ...prev[section][field],
          [subField]: value
        }
      }
    }));
  };

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
      setOpenSkillDialog(false);
    }
  };

  const removeSkill = (skillToRemove) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  const addLocation = (location) => {
    if (location && !settings.preferences.locations.includes(location)) {
      handleSettingChange('preferences', 'locations', [...settings.preferences.locations, location]);
    }
  };

  const removeLocation = (locationToRemove) => {
    const updatedLocations = settings.preferences.locations.filter(loc => loc !== locationToRemove);
    handleSettingChange('preferences', 'locations', updatedLocations);
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Profile Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <AccountCircle sx={{ mr: 1 }} />
                <Typography variant="h6">Profile Information</Typography>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="First Name"
                    value={settings.profile.firstName}
                    onChange={(e) => handleSettingChange('profile', 'firstName', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Last Name"
                    value={settings.profile.lastName}
                    onChange={(e) => handleSettingChange('profile', 'lastName', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={settings.profile.email}
                    onChange={(e) => handleSettingChange('profile', 'email', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Phone"
                    value={settings.profile.phone}
                    onChange={(e) => handleSettingChange('profile', 'phone', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="LinkedIn URL"
                    value={settings.profile.linkedinUrl}
                    onChange={(e) => handleSettingChange('profile', 'linkedinUrl', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Bio"
                    multiline
                    rows={3}
                    value={settings.profile.bio}
                    onChange={(e) => handleSettingChange('profile', 'bio', e.target.value)}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Job Preferences */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Work sx={{ mr: 1 }} />
                <Typography variant="h6">Job Preferences</Typography>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Experience Level</InputLabel>
                    <Select
                      value={settings.preferences.experienceLevel}
                      onChange={(e) => handleSettingChange('preferences', 'experienceLevel', e.target.value)}
                      label="Experience Level"
                    >
                      <MenuItem value="entry">Entry Level</MenuItem>
                      <MenuItem value="mid">Mid Level</MenuItem>
                      <MenuItem value="senior">Senior Level</MenuItem>
                      <MenuItem value="executive">Executive</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Min Salary"
                    type="number"
                    value={settings.preferences.salaryRange.min}
                    onChange={(e) => handleNestedSettingChange('preferences', 'salaryRange', 'min', parseInt(e.target.value))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Max Salary"
                    type="number"
                    value={settings.preferences.salaryRange.max}
                    onChange={(e) => handleNestedSettingChange('preferences', 'salaryRange', 'max', parseInt(e.target.value))}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Daily Application Limit"
                    type="number"
                    value={settings.preferences.dailyApplicationLimit}
                    onChange={(e) => handleSettingChange('preferences', 'dailyApplicationLimit', parseInt(e.target.value))}
                    inputProps={{ min: 1, max: 50 }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Preferred Locations
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={1} mb={1}>
                    {settings.preferences.locations.map((location, index) => (
                      <Chip
                        key={index}
                        label={location}
                        onDelete={() => removeLocation(location)}
                        size="small"
                      />
                    ))}
                  </Box>
                  <TextField
                    size="small"
                    placeholder="Add location and press Enter"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addLocation(e.target.value);
                        e.target.value = '';
                      }
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.preferences.autoApply}
                        onChange={(e) => handleSettingChange('preferences', 'autoApply', e.target.checked)}
                      />
                    }
                    label="Enable Auto Apply"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Notification Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Notifications sx={{ mr: 1 }} />
                <Typography variant="h6">Notifications</Typography>
              </Box>
              
              <List>
                <ListItem>
                  <ListItemText primary="Email Notifications" />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.notifications.emailNotifications}
                      onChange={(e) => handleSettingChange('notifications', 'emailNotifications', e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                
                <ListItem>
                  <ListItemText primary="Push Notifications" />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.notifications.pushNotifications}
                      onChange={(e) => handleSettingChange('notifications', 'pushNotifications', e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                
                <ListItem>
                  <ListItemText primary="New Job Alerts" />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.notifications.newJobAlerts}
                      onChange={(e) => handleSettingChange('notifications', 'newJobAlerts', e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                
                <ListItem>
                  <ListItemText primary="Application Updates" />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.notifications.applicationUpdates}
                      onChange={(e) => handleSettingChange('notifications', 'applicationUpdates', e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                
                <ListItem>
                  <ListItemText primary="Weekly Reports" />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.notifications.weeklyReports}
                      onChange={(e) => handleSettingChange('notifications', 'weeklyReports', e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Automation Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <SettingsIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Automation</Typography>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.automation.autoApplyEnabled}
                        onChange={(e) => handleSettingChange('automation', 'autoApplyEnabled', e.target.checked)}
                      />
                    }
                    label="Enable Auto Apply"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Daily Auto Apply Limit"
                    type="number"
                    value={settings.automation.dailyLimit}
                    onChange={(e) => handleSettingChange('automation', 'dailyLimit', parseInt(e.target.value))}
                    inputProps={{ min: 1, max: 20 }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Minimum Salary for Auto Apply"
                    type="number"
                    value={settings.automation.autoApplyFilters.salaryMin}
                    onChange={(e) => handleNestedSettingChange('automation', 'autoApplyFilters', 'salaryMin', parseInt(e.target.value))}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.automation.pauseOnWeekends}
                        onChange={(e) => handleSettingChange('automation', 'pauseOnWeekends', e.target.checked)}
                      />
                    }
                    label="Pause on Weekends"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.automation.autoApplyFilters.experienceMatch}
                        onChange={(e) => handleNestedSettingChange('automation', 'autoApplyFilters', 'experienceMatch', e.target.checked)}
                      />
                    }
                    label="Only apply to experience-matched jobs"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Save Button */}
      <Box display="flex" justifyContent="center" mt={3}>
        <Button
          variant="contained"
          size="large"
          startIcon={<Save />}
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
      </Box>

      {/* Skills Dialog */}
      <Dialog open={openSkillDialog} onClose={() => setOpenSkillDialog(false)}>
        <DialogTitle>Add Skill</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Skill"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                addSkill();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSkillDialog(false)}>Cancel</Button>
          <Button onClick={addSkill}>Add</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings;
