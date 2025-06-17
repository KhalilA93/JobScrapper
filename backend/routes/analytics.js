const express = require('express');
const router = express.Router();
const Application = require('../models/Application');
const Job = require('../models/Job');

// GET /api/analytics - Get analytics overview
router.get('/', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Application trend over time
    const applicationTrend = await Application.aggregate([
      {
        $match: {
          appliedAt: { $gte: since }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$appliedAt' },
            month: { $month: '$appliedAt' },
            day: { $dayOfMonth: '$appliedAt' }
          },
          applications: { $sum: 1 },
          responses: {
            $sum: {
              $cond: [{ $gt: [{ $size: '$responses' }, 0] }, 1, 0]
            }
          }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      },
      {
        $project: {
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: {
                $dateFromParts: {
                  year: '$_id.year',
                  month: '$_id.month',
                  day: '$_id.day'
                }
              }
            }
          },
          applications: 1,
          responses: 1
        }
      }
    ]);

    // Platform statistics
    const platformStats = await Application.aggregate([
      {
        $group: {
          _id: '$platform',
          applications: { $sum: 1 },
          responses: {
            $sum: {
              $cond: [{ $gt: [{ $size: '$responses' }, 0] }, 1, 0]
            }
          },
          successRate: {
            $avg: {
              $cond: [
                { $in: ['$status', ['offered', 'accepted']] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          platform: '$_id',
          applications: 1,
          responses: 1,
          successRate: { $multiply: ['$successRate', 100] }
        }
      }
    ]);

    // Status breakdown
    const statusBreakdown = await Application.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          status: '$_id',
          count: 1
        }
      }
    ]);

    // Response time analysis
    const responseTimeStats = await Application.aggregate([
      {
        $match: {
          'responses.0': { $exists: true }
        }
      },
      {
        $project: {
          responseTime: {
            $subtract: [
              { $arrayElemAt: ['$responses.receivedAt', 0] },
              '$appliedAt'
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgResponseTime: { $avg: '$responseTime' },
          minResponseTime: { $min: '$responseTime' },
          maxResponseTime: { $max: '$responseTime' }
        }
      }
    ]);

    // Job matching effectiveness
    const matchingStats = await Job.aggregate([
      {
        $match: {
          matchScore: { $exists: true }
        }
      },
      {
        $bucket: {
          groupBy: '$matchScore',
          boundaries: [0, 25, 50, 75, 100],
          default: 'other',
          output: {
            count: { $sum: 1 },
            avgScore: { $avg: '$matchScore' }
          }
        }
      }
    ]);

    res.json({
      applicationTrend,
      platformStats,
      statusBreakdown,
      responseTimeStats: responseTimeStats[0] || null,
      matchingStats,
      period: {
        days: parseInt(days),
        startDate: since.toISOString(),
        endDate: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// GET /api/analytics/trends - Get trend analysis
router.get('/trends', async (req, res) => {
  try {
    const { period = 'daily', days = 30 } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - days);

    let groupBy;
    switch (period) {
      case 'hourly':
        groupBy = {
          year: { $year: '$appliedAt' },
          month: { $month: '$appliedAt' },
          day: { $dayOfMonth: '$appliedAt' },
          hour: { $hour: '$appliedAt' }
        };
        break;
      case 'weekly':
        groupBy = {
          year: { $year: '$appliedAt' },
          week: { $week: '$appliedAt' }
        };
        break;
      case 'monthly':
        groupBy = {
          year: { $year: '$appliedAt' },
          month: { $month: '$appliedAt' }
        };
        break;
      default: // daily
        groupBy = {
          year: { $year: '$appliedAt' },
          month: { $month: '$appliedAt' },
          day: { $dayOfMonth: '$appliedAt' }
        };
    }

    const trends = await Application.aggregate([
      {
        $match: {
          appliedAt: { $gte: since }
        }
      },
      {
        $group: {
          _id: groupBy,
          applications: { $sum: 1 },
          automated: {
            $sum: {
              $cond: [{ $eq: ['$automatedApplication', true] }, 1, 0]
            }
          },
          manual: {
            $sum: {
              $cond: [{ $eq: ['$automatedApplication', false] }, 1, 0]
            }
          },
          responses: {
            $sum: {
              $cond: [{ $gt: [{ $size: '$responses' }, 0] }, 1, 0]
            }
          },
          interviews: {
            $sum: {
              $cond: [{ $eq: ['$status', 'interview'] }, 1, 0]
            }
          },
          offers: {
            $sum: {
              $cond: [{ $in: ['$status', ['offered', 'accepted']] }, 1, 0]
            }
          }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    res.json({
      trends,
      period,
      totalDays: parseInt(days)
    });
  } catch (error) {
    console.error('Error fetching trend analysis:', error);
    res.status(500).json({ error: 'Failed to fetch trend analysis' });
  }
});

// GET /api/analytics/performance - Get performance metrics
router.get('/performance', async (req, res) => {
  try {
    // Application success rate by platform
    const platformPerformance = await Application.aggregate([
      {
        $group: {
          _id: '$platform',
          totalApplications: { $sum: 1 },
          responses: {
            $sum: {
              $cond: [{ $gt: [{ $size: '$responses' }, 0] }, 1, 0]
            }
          },
          interviews: {
            $sum: {
              $cond: [{ $eq: ['$status', 'interview'] }, 1, 0]
            }
          },
          offers: {
            $sum: {
              $cond: [{ $in: ['$status', ['offered', 'accepted']] }, 1, 0]
            }
          },
          avgProcessingTime: { $avg: '$processingTime' }
        }
      },
      {
        $project: {
          platform: '$_id',
          totalApplications: 1,
          responses: 1,
          interviews: 1,
          offers: 1,
          responseRate: {
            $multiply: [
              { $divide: ['$responses', '$totalApplications'] },
              100
            ]
          },
          interviewRate: {
            $multiply: [
              { $divide: ['$interviews', '$totalApplications'] },
              100
            ]
          },
          offerRate: {
            $multiply: [
              { $divide: ['$offers', '$totalApplications'] },
              100
            ]
          },
          avgProcessingTime: 1
        }
      }
    ]);

    // Time-based performance (best times to apply)
    const timePerformance = await Application.aggregate([
      {
        $group: {
          _id: {
            hour: { $hour: '$appliedAt' },
            dayOfWeek: { $dayOfWeek: '$appliedAt' }
          },
          applications: { $sum: 1 },
          responses: {
            $sum: {
              $cond: [{ $gt: [{ $size: '$responses' }, 0] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          hour: '$_id.hour',
          dayOfWeek: '$_id.dayOfWeek',
          applications: 1,
          responses: 1,
          responseRate: {
            $multiply: [
              { $divide: ['$responses', '$applications'] },
              100
            ]
          }
        }
      }
    ]);

    // Job title performance
    const titlePerformance = await Application.aggregate([
      {
        $group: {
          _id: '$jobTitle',
          applications: { $sum: 1 },
          responses: {
            $sum: {
              $cond: [{ $gt: [{ $size: '$responses' }, 0] }, 1, 0]
            }
          }
        }
      },
      {
        $match: {
          applications: { $gte: 5 } // Only show titles with 5+ applications
        }
      },
      {
        $project: {
          jobTitle: '$_id',
          applications: 1,
          responses: 1,
          responseRate: {
            $multiply: [
              { $divide: ['$responses', '$applications'] },
              100
            ]
          }
        }
      },
      {
        $sort: { responseRate: -1 }
      },
      {
        $limit: 10
      }
    ]);

    res.json({
      platformPerformance,
      timePerformance,
      titlePerformance
    });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    res.status(500).json({ error: 'Failed to fetch performance metrics' });
  }
});

// GET /api/analytics/insights - Get AI-powered insights
router.get('/insights', async (req, res) => {
  try {
    // Generate insights based on data patterns
    const insights = [];

    // Best performing platform
    const bestPlatform = await Application.aggregate([
      {
        $group: {
          _id: '$platform',
          responseRate: {
            $avg: {
              $cond: [{ $gt: [{ $size: '$responses' }, 0] }, 1, 0]
            }
          },
          applications: { $sum: 1 }
        }
      },
      {
        $match: {
          applications: { $gte: 10 } // At least 10 applications
        }
      },
      {
        $sort: { responseRate: -1 }
      },
      {
        $limit: 1
      }
    ]);

    if (bestPlatform.length > 0) {
      insights.push({
        type: 'success',
        title: 'Best Performing Platform',
        message: `${bestPlatform[0]._id} has your highest response rate at ${Math.round(bestPlatform[0].responseRate * 100)}%`,
        actionable: `Focus more applications on ${bestPlatform[0]._id}`
      });
    }

    // Peak application times
    const peakTimes = await Application.aggregate([
      {
        $group: {
          _id: { $hour: '$appliedAt' },
          responses: {
            $sum: {
              $cond: [{ $gt: [{ $size: '$responses' }, 0] }, 1, 0]
            }
          },
          applications: { $sum: 1 }
        }
      },
      {
        $match: {
          applications: { $gte: 5 }
        }
      },
      {
        $project: {
          hour: '$_id',
          responseRate: {
            $divide: ['$responses', '$applications']
          }
        }
      },
      {
        $sort: { responseRate: -1 }
      },
      {
        $limit: 1
      }
    ]);

    if (peakTimes.length > 0) {
      const hour = peakTimes[0].hour;
      const timeString = hour === 0 ? '12 AM' : 
                       hour < 12 ? `${hour} AM` : 
                       hour === 12 ? '12 PM' : `${hour - 12} PM`;
      
      insights.push({
        type: 'info',
        title: 'Optimal Application Time',
        message: `Applications sent around ${timeString} have the highest response rate`,
        actionable: `Schedule your applications around ${timeString} for better results`
      });
    }

    // Application frequency recommendation
    const avgDaily = await Application.aggregate([
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$appliedAt'
            }
          },
          dailyApplications: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: null,
          avgDailyApplications: { $avg: '$dailyApplications' }
        }
      }
    ]);

    if (avgDaily.length > 0) {
      const avg = Math.round(avgDaily[0].avgDailyApplications);
      if (avg < 5) {
        insights.push({
          type: 'warning',
          title: 'Low Application Volume',
          message: `You're averaging ${avg} applications per day`,
          actionable: 'Consider increasing your daily application target to 10-15 for better results'
        });
      }
    }

    res.json({
      insights,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating insights:', error);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

module.exports = router;
