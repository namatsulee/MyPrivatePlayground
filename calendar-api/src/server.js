const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// JSONBin.io configuration
const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY;
const JSONBIN_BIN_ID = process.env.JSONBIN_BIN_ID;

// Helper functions for JSONBin.io
async function getAllData() {
    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
            headers: {
                'X-Master-Key': JSONBIN_API_KEY
            }
        });
        const result = await response.json();
        return result.record || {};
    } catch (error) {
        console.error('Error getting data:', error);
        return {};
    }
}

async function saveAllData(data) {
    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': JSONBIN_API_KEY
            },
            body: JSON.stringify(data)
        });
        return response.ok;
    } catch (error) {
        console.error('Error saving data:', error);
        return false;
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

// Debug: Check env vars
app.get('/api/debug', (req, res) => {
    res.json({
        hasApiKey: !!JSONBIN_API_KEY,
        hasBinId: !!JSONBIN_BIN_ID,
        binIdLength: JSONBIN_BIN_ID ? JSONBIN_BIN_ID.length : 0
    });
});

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
    const allData = await getAllData();
    const prefix = `${year}-${month.toString().padStart(2, '0')}`;
    
    const monthData = {};
    Object.keys(allData).forEach(date => {
        if (date.startsWith(prefix)) {
            monthData[date] = allData[date];
        }
    });
    
    res.json(monthData);
});

// Get calendar data for a specific date
app.get('/api/calendar/:date', async (req, res) => {
    const { date } = req.params;
    const allData = await getAllData();
    res.json(allData[date] || {});
});

// Add schedule
app.post('/api/calendar/:date/schedule', async (req, res) => {
    const { date } = req.params;
    const { content, tag, source, repeat, startDate, endDate } = req.body;
    
    if (!content || !tag) {
        return res.status(400).json({ error: 'Content and tag are required' });
    }
    
    const allData = await getAllData();
    
    if (!allData[date]) {
        allData[date] = { schedules: [], exercise: null };
    }
    
    if (!allData[date].schedules) {
        allData[date].schedules = [];
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
    
    allData[date].schedules.push(schedule);
    await saveAllData(allData);
    
    res.json({ success: true, schedule });
});

// Update schedule
app.put('/api/calendar/:date/schedule/:id', async (req, res) => {
    const { date, id } = req.params;
    const { content, tag, repeat, startDate, endDate } = req.body;
    
    const allData = await getAllData();
    
    if (!allData[date] || !allData[date].schedules) {
        return res.status(404).json({ error: 'Schedule not found' });
    }
    
    const scheduleIdx = allData[date].schedules.findIndex(s => s.id === id);
    if (scheduleIdx === -1) {
        return res.status(404).json({ error: 'Schedule not found' });
    }
    
    allData[date].schedules[scheduleIdx] = {
        ...allData[date].schedules[scheduleIdx],
        content: content || allData[date].schedules[scheduleIdx].content,
        tag: tag || allData[date].schedules[scheduleIdx].tag,
        repeat: repeat !== undefined ? repeat : allData[date].schedules[scheduleIdx].repeat,
        startDate: startDate !== undefined ? startDate : allData[date].schedules[scheduleIdx].startDate,
        endDate: endDate !== undefined ? endDate : allData[date].schedules[scheduleIdx].endDate,
        updatedAt: new Date().toISOString()
    };
    
    await saveAllData(allData);
    res.json({ success: true, schedule: allData[date].schedules[scheduleIdx] });
});

// Delete schedule
app.delete('/api/calendar/:date/schedule/:id', async (req, res) => {
    const { date, id } = req.params;
    
    const allData = await getAllData();
    
    if (!allData[date] || !allData[date].schedules) {
        return res.status(404).json({ error: 'Schedule not found' });
    }
    
    allData[date].schedules = allData[date].schedules.filter(s => s.id !== id);
    await saveAllData(allData);
    
    res.json({ success: true });
});

// Add/Update exercise
app.post('/api/calendar/:date/exercise', async (req, res) => {
    const { date } = req.params;
    const { weight, nonWeight, source } = req.body;
    
    const allData = await getAllData();
    
    if (!allData[date]) {
        allData[date] = { schedules: [], exercise: null };
    }
    
    allData[date].exercise = {
        weight: weight || [],
        nonWeight: nonWeight || [],
        source: source || 'monthly',
        updatedAt: new Date().toISOString()
    };
    
    await saveAllData(allData);
    
    res.json({ success: true, exercise: allData[date].exercise });
});

// Delete exercise
app.delete('/api/calendar/:date/exercise', async (req, res) => {
    const { date } = req.params;
    
    const allData = await getAllData();
    
    if (allData[date]) {
        allData[date].exercise = null;
        await saveAllData(allData);
    }
    
    res.json({ success: true });
});

// Save/Update memo
app.post('/api/calendar/:date/memo', async (req, res) => {
    const { date } = req.params;
    const { memo } = req.body;
    
    const allData = await getAllData();
    
    if (!allData[date]) {
        allData[date] = { schedules: [], exercise: null, memo: '' };
    }
    
    allData[date].memo = memo || '';
    allData[date].memoUpdatedAt = new Date().toISOString();
    
    await saveAllData(allData);
    
    res.json({ success: true, memo: allData[date].memo });
});

// Delete memo
app.delete('/api/calendar/:date/memo', async (req, res) => {
    const { date } = req.params;
    
    const allData = await getAllData();
    
    if (allData[date]) {
        allData[date].memo = '';
        delete allData[date].memoUpdatedAt;
        await saveAllData(allData);
    }
    
    res.json({ success: true });
});

// Start server
app.listen(PORT, () => {
    console.log(`Calendar API server running on http://localhost:${PORT}`);
});

// Export for Vercel
module.exports = app;





