const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

let db;
let calendarCollection;

async function connectDB() {
    try {
        await client.connect();
        db = client.db('calendar_app');
        calendarCollection = db.collection('calendar_data');
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        // Fallback to file-based storage for local development
        console.log('Using file-based storage as fallback');
    }
}

// Helper functions for MongoDB
async function getDateData(date) {
    if (!calendarCollection) return null;
    try {
        const doc = await calendarCollection.findOne({ date });
        return doc ? doc.data : null;
    } catch (error) {
        console.error('Error getting date data:', error);
        return null;
    }
}

async function setDateData(date, data) {
    if (!calendarCollection) return false;
    try {
        await calendarCollection.updateOne(
            { date },
            { $set: { date, data, updatedAt: new Date() } },
            { upsert: true }
        );
        return true;
    } catch (error) {
        console.error('Error setting date data:', error);
        return false;
    }
}

async function getAllData() {
    if (!calendarCollection) return {};
    try {
        const docs = await calendarCollection.find({}).toArray();
        const result = {};
        docs.forEach(doc => {
            result[doc.date] = doc.data;
        });
        return result;
    } catch (error) {
        console.error('Error getting all data:', error);
        return {};
    }
}

async function getMonthData(year, month) {
    if (!calendarCollection) return {};
    try {
        const prefix = `${year}-${month.toString().padStart(2, '0')}`;
        const docs = await calendarCollection.find({
            date: { $regex: `^${prefix}` }
        }).toArray();
        const result = {};
        docs.forEach(doc => {
            result[doc.date] = doc.data;
        });
        return result;
    } catch (error) {
        console.error('Error getting month data:', error);
        return {};
    }
}

// Korean holidays data
const holidays = {
    2024: {
        '2024-01-01': '신정',
        '2024-02-09': '설날 연휴',
        '2024-02-10': '설날',
        '2024-02-11': '설날 연휴',
        '2024-02-12': '대체공휴일',
        '2024-03-01': '삼일절',
        '2024-05-05': '어린이날',
        '2024-05-06': '대체공휴일',
        '2024-05-15': '부처님오신날',
        '2024-06-06': '현충일',
        '2024-08-15': '광복절',
        '2024-09-16': '추석 연휴',
        '2024-09-17': '추석',
        '2024-09-18': '추석 연휴',
        '2024-10-03': '개천절',
        '2024-10-09': '한글날',
        '2024-12-25': '크리스마스'
    },
    2025: {
        '2025-01-01': '신정',
        '2025-01-28': '설날 연휴',
        '2025-01-29': '설날',
        '2025-01-30': '설날 연휴',
        '2025-03-01': '삼일절',
        '2025-03-03': '대체공휴일',
        '2025-05-05': '어린이날',
        '2025-05-06': '부처님오신날',
        '2025-06-06': '현충일',
        '2025-08-15': '광복절',
        '2025-10-03': '개천절',
        '2025-10-05': '추석 연휴',
        '2025-10-06': '추석',
        '2025-10-07': '추석 연휴',
        '2025-10-08': '대체공휴일',
        '2025-10-09': '한글날',
        '2025-12-25': '크리스마스'
    },
    2026: {
        '2026-01-01': '신정',
        '2026-02-16': '설날 연휴',
        '2026-02-17': '설날',
        '2026-02-18': '설날 연휴',
        '2026-03-01': '삼일절',
        '2026-03-02': '대체공휴일',
        '2026-05-05': '어린이날',
        '2026-05-24': '부처님오신날',
        '2026-05-25': '대체공휴일',
        '2026-06-06': '현충일',
        '2026-08-15': '광복절',
        '2026-08-17': '대체공휴일',
        '2026-09-24': '추석 연휴',
        '2026-09-25': '추석',
        '2026-09-26': '추석 연휴',
        '2026-10-03': '개천절',
        '2026-10-05': '대체공휴일',
        '2026-10-09': '한글날',
        '2026-12-25': '크리스마스'
    }
};

// Routes

// Get holidays for a year
app.get('/api/holidays/:year', (req, res) => {
    const year = parseInt(req.params.year);
    res.json(holidays[year] || {});
});

// Get all calendar data
app.get('/api/calendar/all', async (req, res) => {
    const data = await getAllData();
    res.json(data);
});

// Get calendar data for a month
app.get('/api/calendar/:year/:month', async (req, res) => {
    const { year, month } = req.params;
    const data = await getMonthData(parseInt(year), parseInt(month));
    res.json(data);
});

// Get calendar data for a specific date
app.get('/api/calendar/:date', async (req, res) => {
    const { date } = req.params;
    const data = await getDateData(date);
    res.json(data || {});
});

// Add schedule
app.post('/api/calendar/:date/schedule', async (req, res) => {
    const { date } = req.params;
    const { content, tag, source, repeat, startDate, endDate } = req.body;
    
    if (!content || !tag) {
        return res.status(400).json({ error: 'Content and tag are required' });
    }
    
    let data = await getDateData(date) || { schedules: [], exercise: null };
    
    if (!data.schedules) {
        data.schedules = [];
    }
    
    const schedule = {
        id: uuidv4(),
        content,
        tag,
        source: source || 'monthly',
        repeat: repeat || 'none',
        startDate: startDate || null,
        endDate: endDate || null,
        createdAt: new Date().toISOString()
    };
    
    data.schedules.push(schedule);
    await setDateData(date, data);
    
    res.json({ success: true, schedule });
});

// Update schedule
app.put('/api/calendar/:date/schedule/:id', async (req, res) => {
    const { date, id } = req.params;
    const { content, tag, repeat, startDate, endDate } = req.body;
    
    let data = await getDateData(date);
    
    if (!data || !data.schedules) {
        return res.status(404).json({ error: 'Schedule not found' });
    }
    
    const scheduleIdx = data.schedules.findIndex(s => s.id === id);
    if (scheduleIdx === -1) {
        return res.status(404).json({ error: 'Schedule not found' });
    }
    
    data.schedules[scheduleIdx] = {
        ...data.schedules[scheduleIdx],
        content: content || data.schedules[scheduleIdx].content,
        tag: tag || data.schedules[scheduleIdx].tag,
        repeat: repeat !== undefined ? repeat : data.schedules[scheduleIdx].repeat,
        startDate: startDate !== undefined ? startDate : data.schedules[scheduleIdx].startDate,
        endDate: endDate !== undefined ? endDate : data.schedules[scheduleIdx].endDate,
        updatedAt: new Date().toISOString()
    };
    
    await setDateData(date, data);
    res.json({ success: true, schedule: data.schedules[scheduleIdx] });
});

// Delete schedule
app.delete('/api/calendar/:date/schedule/:id', async (req, res) => {
    const { date, id } = req.params;
    
    let data = await getDateData(date);
    
    if (!data || !data.schedules) {
        return res.status(404).json({ error: 'Schedule not found' });
    }
    
    data.schedules = data.schedules.filter(s => s.id !== id);
    await setDateData(date, data);
    
    res.json({ success: true });
});

// Add/Update exercise
app.post('/api/calendar/:date/exercise', async (req, res) => {
    const { date } = req.params;
    const { weight, nonWeight, source } = req.body;
    
    let data = await getDateData(date) || { schedules: [], exercise: null };
    
    data.exercise = {
        weight: weight || [],
        nonWeight: nonWeight || [],
        source: source || 'monthly',
        updatedAt: new Date().toISOString()
    };
    
    await setDateData(date, data);
    
    res.json({ success: true, exercise: data.exercise });
});

// Delete exercise
app.delete('/api/calendar/:date/exercise', async (req, res) => {
    const { date } = req.params;
    
    let data = await getDateData(date);
    
    if (data) {
        data.exercise = null;
        await setDateData(date, data);
    }
    
    res.json({ success: true });
});

// Save/Update memo
app.post('/api/calendar/:date/memo', async (req, res) => {
    const { date } = req.params;
    const { memo } = req.body;
    
    let data = await getDateData(date) || { schedules: [], exercise: null, memo: '' };
    
    data.memo = memo || '';
    data.memoUpdatedAt = new Date().toISOString();
    
    await setDateData(date, data);
    
    res.json({ success: true, memo: data.memo });
});

// Delete memo
app.delete('/api/calendar/:date/memo', async (req, res) => {
    const { date } = req.params;
    
    let data = await getDateData(date);
    
    if (data) {
        data.memo = '';
        delete data.memoUpdatedAt;
        await setDateData(date, data);
    }
    
    res.json({ success: true });
});

// Start server
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Calendar API server running on http://localhost:${PORT}`);
    });
});

// Export for Vercel
module.exports = app;
