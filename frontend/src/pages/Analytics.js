import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Paper,
  CircularProgress,
  Alert,
  Tabs,
  Tab
} from '@mui/material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { api } from '../services/api';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [analytics, setAnalytics] = useState({});

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [applicationsRes, jobsRes, performanceRes] = await Promise.all([
        api.get('/analytics/applications'),
        api.get('/analytics/jobs'),
        api.get('/analytics/performance')
      ]);

      setAnalytics({
        applications: applicationsRes.data,
        jobs: jobsRes.data,
        performance: performanceRes.data
      });
    } catch (err) {
      setError('Failed to fetch analytics data');
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Sample data - replace with actual data from analytics
  const applicationTrendData = [
    { month: 'Jan', applications: 12, interviews: 3, offers: 1 },
    { month: 'Feb', applications: 18, interviews: 5, offers: 2 },
    { month: 'Mar', applications: 25, interviews: 7, offers: 1 },
    { month: 'Apr', applications: 22, interviews: 6, offers: 3 },
    { month: 'May', applications: 30, interviews: 8, offers: 2 },
    { month: 'Jun', applications: 28, interviews: 9, offers: 3 }
  ];

  const platformData = [
    { name: 'LinkedIn', value: 45, applications: 120 },
    { name: 'Indeed', value: 25, applications: 67 },
    { name: 'Glassdoor', value: 15, applications: 40 },
    { name: 'Google Jobs', value: 10, applications: 27 },
    { name: 'Other', value: 5, applications: 13 }
  ];

  const statusData = [
    { name: 'Pending', value: 35, count: 42 },
    { name: 'Applied', value: 30, count: 36 },
    { name: 'Interview', value: 20, count: 24 },
    { name: 'Rejected', value: 12, count: 14 },
    { name: 'Accepted', value: 3, count: 4 }
  ];

  const performanceData = [
    { day: 'Mon', applications: 8, success: 2 },
    { day: 'Tue', applications: 12, success: 3 },
    { day: 'Wed', applications: 15, success: 4 },
    { day: 'Thu', applications: 10, success: 2 },
    { day: 'Fri', applications: 18, success: 5 },
    { day: 'Sat', applications: 5, success: 1 },
    { day: 'Sun', applications: 3, success: 0 }
  ];

  const RAMP_BLUE = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Analytics Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Applications
              </Typography>
              <Typography variant="h4">
                {analytics.applications?.total || 267}
              </Typography>
              <Typography variant="body2" color="success.main">
                +12% from last month
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Response Rate
              </Typography>
              <Typography variant="h4">
                {analytics.applications?.responseRate || '18.5'}%
              </Typography>
              <Typography variant="body2" color="success.main">
                +3% from last month
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Interview Rate
              </Typography>
              <Typography variant="h4">
                {analytics.performance?.interviewRate || '12.3'}%
              </Typography>
              <Typography variant="body2" color="warning.main">
                -2% from last month
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Success Rate
              </Typography>
              <Typography variant="h4">
                {analytics.performance?.successRate || '4.2'}%
              </Typography>
              <Typography variant="body2" color="success.main">
                +1% from last month
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs for different analytics views */}
      <Card>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Application Trends" />
          <Tab label="Platform Performance" />
          <Tab label="Status Distribution" />
          <Tab label="Daily Performance" />
        </Tabs>

        <CardContent>
          {/* Application Trends Tab */}
          {tabValue === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Application Trends Over Time
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={applicationTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="applications"
                    stroke="#8884d8"
                    strokeWidth={2}
                    name="Applications"
                  />
                  <Line
                    type="monotone"
                    dataKey="interviews"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    name="Interviews"
                  />
                  <Line
                    type="monotone"
                    dataKey="offers"
                    stroke="#ffc658"
                    strokeWidth={2}
                    name="Offers"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          )}

          {/* Platform Performance Tab */}
          {tabValue === 1 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Applications by Platform
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={platformData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {platformData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={RAMP_BLUE[index % RAMP_BLUE.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Platform Performance
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={platformData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="applications" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </Grid>
            </Grid>
          )}

          {/* Status Distribution Tab */}
          {tabValue === 2 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Application Status Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={RAMP_BLUE[index % RAMP_BLUE.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Status Counts
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={statusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </Grid>
            </Grid>
          )}

          {/* Daily Performance Tab */}
          {tabValue === 3 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Daily Application Performance
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="applications" fill="#8884d8" name="Applications" />
                  <Bar dataKey="success" fill="#82ca9d" name="Positive Responses" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default Analytics;
