import React from 'react';
import { useQuery } from 'react-query';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Button
} from '@mui/material';
import {
  Work as WorkIcon,
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { fetchDashboardStats, fetchRecentApplications } from '../services/api';

const StatCard = ({ title, value, icon, color = 'primary', subtitle }) => (
  <Card>
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography color="textSecondary" gutterBottom variant="body2">
            {title}
          </Typography>
          <Typography variant="h4" component="div" color={color}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="textSecondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Avatar sx={{ bgcolor: `${color}.main`, width: 56, height: 56 }}>
          {icon}
        </Avatar>
      </Box>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const { data: stats, isLoading: statsLoading } = useQuery(
    'dashboardStats',
    fetchDashboardStats,
    { refetchInterval: 30000 } // Refetch every 30 seconds
  );

  const { data: recentApplications, isLoading: applicationsLoading } = useQuery(
    'recentApplications',
    fetchRecentApplications
  );

  // Mock data for charts (replace with real data from API)
  const applicationTrend = [
    { date: '2024-01-01', applications: 5 },
    { date: '2024-01-02', applications: 8 },
    { date: '2024-01-03', applications: 12 },
    { date: '2024-01-04', applications: 6 },
    { date: '2024-01-05', applications: 15 },
    { date: '2024-01-06', applications: 10 },
    { date: '2024-01-07', applications: 18 }
  ];

  const statusData = [
    { name: 'Applied', value: 45, color: '#4caf50' },
    { name: 'Pending', value: 25, color: '#ff9800' },
    { name: 'Interview', value: 15, color: '#2196f3' },
    { name: 'Rejected', value: 15, color: '#f44336' }
  ];

  if (statsLoading) {
    return (
      <Container maxWidth="lg">
        <LinearProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Jobs Found"
            value={stats?.totalJobs || 0}
            icon={<WorkIcon />}
            color="primary"
            subtitle="Last 30 days"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Applications Sent"
            value={stats?.totalApplications || 0}
            icon={<AssignmentIcon />}
            color="success"
            subtitle={`${stats?.automatedApplications || 0} automated`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Response Rate"
            value={`${stats?.responseRate || 0}%`}
            icon={<TrendingUpIcon />}
            color="info"
            subtitle="Above industry average"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Today"
            value={stats?.applicationsToday || 0}
            icon={<ScheduleIcon />}
            color="warning"
            subtitle="Applications sent"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Application Trend Chart */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Application Trend (Last 7 Days)
              </Typography>
              <Box height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={applicationTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="applications" 
                      stroke="#0073b1" 
                      strokeWidth={3}
                      dot={{ fill: '#0073b1', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Status Breakdown */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Application Status
              </Typography>
              <Box height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <Box mt={2}>
                {statusData.map((item) => (
                  <Box key={item.name} display="flex" alignItems="center" mb={1}>
                    <Box
                      width={12}
                      height={12}
                      bgcolor={item.color}
                      borderRadius="50%"
                      mr={1}
                    />
                    <Typography variant="body2" flex={1}>
                      {item.name}
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {item.value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Applications */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Recent Applications
                </Typography>
                <Button size="small" color="primary">
                  View All
                </Button>
              </Box>
              <List>
                {applicationsLoading ? (
                  <LinearProgress />
                ) : (
                  recentApplications?.slice(0, 5).map((app) => (
                    <ListItem key={app._id} disablePadding>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {app.company.charAt(0)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={app.jobTitle}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="textSecondary">
                              {app.company} • {new Date(app.appliedAt).toLocaleDateString()}
                            </Typography>
                            <Chip
                              label={app.status}
                              size="small"
                              color={
                                app.status === 'applied' ? 'success' :
                                app.status === 'interview' ? 'info' :
                                app.status === 'rejected' ? 'error' : 'default'
                              }
                              sx={{ mt: 0.5 }}
                            />
                          </Box>
                        }
                      />
                    </ListItem>
                  ))
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<WorkIcon />}
                    sx={{ mb: 1 }}
                  >
                    Start Job Scraping
                  </Button>
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<AssignmentIcon />}
                    sx={{ mb: 1 }}
                  >
                    Review Applications
                  </Button>
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<TrendingUpIcon />}
                    sx={{ mb: 1 }}
                  >
                    View Analytics
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* System Status */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Status
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box display="flex" alignItems="center">
                    <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                    <Typography variant="body2">
                      Chrome Extension: Active
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box display="flex" alignItems="center">
                    <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                    <Typography variant="body2">
                      Backend API: Connected
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box display="flex" alignItems="center">
                    <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                    <Typography variant="body2">
                      Database: Online
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box display="flex" alignItems="center">
                    <ScheduleIcon color="warning" sx={{ mr: 1 }} />
                    <Typography variant="body2">
                      Last Sync: 2 min ago
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;
