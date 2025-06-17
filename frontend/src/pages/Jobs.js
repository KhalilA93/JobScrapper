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
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Pagination,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Work,
  LocationOn,
  Business,
  Visibility,
  Edit,
  Delete,
  Add,
  Search,
  FilterList
} from '@mui/icons-material';
import { api } from '../services/api';

const Jobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedJob, setSelectedJob] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openJobDialog, setOpenJobDialog] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, [page, searchTerm, filterStatus]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 10,
        search: searchTerm,
        status: filterStatus !== 'all' ? filterStatus : undefined
      };
      
      const response = await api.get('/jobs', { params });
      setJobs(response.data.jobs || []);
      setTotalPages(response.data.totalPages || 1);
    } catch (err) {
      setError('Failed to fetch jobs');
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewJob = (job) => {
    setSelectedJob(job);
    setOpenJobDialog(true);
  };

  const handleDeleteJob = async (jobId) => {
    if (window.confirm('Are you sure you want to delete this job?')) {
      try {
        await api.delete(`/jobs/${jobId}`);
        fetchJobs();
      } catch (err) {
        setError('Failed to delete job');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'applied': return 'info';
      case 'closed': return 'default';
      case 'expired': return 'warning';
      default: return 'default';
    }
  };

  const formatSalary = (salary) => {
    if (!salary) return 'Not specified';
    return `$${salary.toLocaleString()}`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString();
  };

  if (loading && jobs.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Job Listings
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Search and Filter Bar */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search jobs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="applied">Applied</MenuItem>
                  <MenuItem value="closed">Closed</MenuItem>
                  <MenuItem value="expired">Expired</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setOpenDialog(true)}
                fullWidth
              >
                Add Job
              </Button>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                variant="outlined"
                startIcon={<FilterList />}
                fullWidth
              >
                Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Jobs Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Job Title</TableCell>
                <TableCell>Company</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Salary</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Posted Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job._id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {job.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {job.platform}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <Business sx={{ mr: 1, fontSize: 16 }} />
                      {job.company}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <LocationOn sx={{ mr: 1, fontSize: 16 }} />
                      {job.location}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {formatSalary(job.salary)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={job.status}
                      color={getStatusColor(job.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {formatDate(job.datePosted)}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleViewJob(job)}
                      title="View Details"
                    >
                      <Visibility />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteJob(job._id)}
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

      {/* Job Details Dialog */}
      <Dialog open={openJobDialog} onClose={() => setOpenJobDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedJob?.title}
        </DialogTitle>
        <DialogContent>
          {selectedJob && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Company</Typography>
                  <Typography variant="body2" paragraph>{selectedJob.company}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Location</Typography>
                  <Typography variant="body2" paragraph>{selectedJob.location}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Salary</Typography>
                  <Typography variant="body2" paragraph>{formatSalary(selectedJob.salary)}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Status</Typography>
                  <Chip label={selectedJob.status} color={getStatusColor(selectedJob.status)} />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>Description</Typography>
                  <Typography variant="body2" paragraph>{selectedJob.description}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>Requirements</Typography>
                  <Typography variant="body2" paragraph>{selectedJob.requirements}</Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenJobDialog(false)}>Close</Button>
          <Button variant="contained" href={selectedJob?.url} target="_blank">
            View Original
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Jobs;
