import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Pagination,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField
} from '@mui/material';
import {
  Send,
  CheckCircle,
  Cancel,
  Schedule,
  Visibility,
  Delete,
  FilterList,
  Search,
  TrendingUp
} from '@mui/icons-material';
import { api } from '../services/api';

const Applications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [stats, setStats] = useState({});

  useEffect(() => {
    fetchApplications();
    fetchStats();
  }, [page, searchTerm, filterStatus]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 10,
        search: searchTerm,
        status: filterStatus !== 'all' ? filterStatus : undefined
      };
      
      const response = await api.get('/applications', { params });
      setApplications(response.data.applications || []);
      setTotalPages(response.data.totalPages || 1);
    } catch (err) {
      setError('Failed to fetch applications');
      console.error('Error fetching applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/analytics/applications');
      setStats(response.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleViewApplication = (application) => {
    setSelectedApplication(application);
    setOpenDialog(true);
  };

  const handleDeleteApplication = async (applicationId) => {
    if (window.confirm('Are you sure you want to delete this application?')) {
      try {
        await api.delete(`/applications/${applicationId}`);
        fetchApplications();
        fetchStats();
      } catch (err) {
        setError('Failed to delete application');
      }
    }
  };

  const updateApplicationStatus = async (applicationId, newStatus) => {
    try {
      await api.patch(`/applications/${applicationId}`, { status: newStatus });
      fetchApplications();
      fetchStats();
    } catch (err) {
      setError('Failed to update application status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'applied': return 'info';
      case 'interview': return 'primary';
      case 'rejected': return 'error';
      case 'accepted': return 'success';
      case 'withdrawn': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Schedule />;
      case 'applied': return <Send />;
      case 'interview': return <TrendingUp />;
      case 'rejected': return <Cancel />;
      case 'accepted': return <CheckCircle />;
      default: return <Schedule />;
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString();
  };

  const calculateSuccessRate = () => {
    if (!stats.total || stats.total === 0) return 0;
    const successful = (stats.interview || 0) + (stats.accepted || 0);
    return ((successful / stats.total) * 100).toFixed(1);
  };

  if (loading && applications.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Job Applications
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Applications
              </Typography>
              <Typography variant="h4">
                {stats.total || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Pending
              </Typography>
              <Typography variant="h4" color="warning.main">
                {stats.pending || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Interviews
              </Typography>
              <Typography variant="h4" color="primary.main">
                {stats.interview || 0}
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
              <Typography variant="h4" color="success.main">
                {calculateSuccessRate()}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filter Bar */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Search applications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="applied">Applied</MenuItem>
                  <MenuItem value="interview">Interview</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                  <MenuItem value="accepted">Accepted</MenuItem>
                  <MenuItem value="withdrawn">Withdrawn</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                variant="outlined"
                startIcon={<FilterList />}
                fullWidth
              >
                More Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Applications Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Job Title</TableCell>
                <TableCell>Company</TableCell>
                <TableCell>Platform</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Applied Date</TableCell>
                <TableCell>Last Updated</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {applications.map((application) => (
                <TableRow key={application._id} hover>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {application.jobId?.title || 'Unknown Job'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {application.jobId?.company || 'Unknown Company'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={application.platform}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={getStatusIcon(application.status)}
                      label={application.status}
                      color={getStatusColor(application.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {formatDate(application.createdAt)}
                  </TableCell>
                  <TableCell>
                    {formatDate(application.updatedAt)}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleViewApplication(application)}
                      title="View Details"
                    >
                      <Visibility />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteApplication(application._id)}
                      title="Delete"
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {applications.length === 0 && !loading && (
          <Box textAlign="center" py={4}>
            <Typography variant="h6" color="textSecondary">
              No applications found
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Start applying to jobs to see your applications here
            </Typography>
          </Box>
        )}

        {/* Pagination */}
        <Box display="flex" justifyContent="center" p={2}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(event, value) => setPage(value)}
            color="primary"
          />
        </Box>
      </Card>

      {/* Application Details Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Application Details
        </DialogTitle>
        <DialogContent>
          {selectedApplication && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Job Title</Typography>
                  <Typography variant="body2" paragraph>
                    {selectedApplication.jobId?.title || 'Unknown Job'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Company</Typography>
                  <Typography variant="body2" paragraph>
                    {selectedApplication.jobId?.company || 'Unknown Company'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Platform</Typography>
                  <Typography variant="body2" paragraph>{selectedApplication.platform}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Current Status</Typography>
                  <FormControl size="small">
                    <Select
                      value={selectedApplication.status}
                      onChange={(e) => {
                        updateApplicationStatus(selectedApplication._id, e.target.value);
                        setSelectedApplication({
                          ...selectedApplication,
                          status: e.target.value
                        });
                      }}
                    >
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="applied">Applied</MenuItem>
                      <MenuItem value="interview">Interview</MenuItem>
                      <MenuItem value="rejected">Rejected</MenuItem>
                      <MenuItem value="accepted">Accepted</MenuItem>
                      <MenuItem value="withdrawn">Withdrawn</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>Application Timeline</Typography>
                  <Box>
                    <Typography variant="body2">
                      Applied: {formatDate(selectedApplication.createdAt)}
                    </Typography>
                    <Typography variant="body2">
                      Last Updated: {formatDate(selectedApplication.updatedAt)}
                    </Typography>
                  </Box>
                </Grid>
                {selectedApplication.notes && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>Notes</Typography>
                    <Typography variant="body2">{selectedApplication.notes}</Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Close</Button>
          <Button 
            variant="contained" 
            href={selectedApplication?.jobId?.url} 
            target="_blank"
            disabled={!selectedApplication?.jobId?.url}
          >
            View Job
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Applications;
