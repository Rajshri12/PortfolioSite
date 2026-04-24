const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dns = require('dns');

dns.setServers(['8.8.8.8']);

const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const MONGODB_URI = envFile.match(/MONGODB_URI=(.*)/)?.[1]?.trim();

const TaskSchema = new mongoose.Schema({
  text: { type: String, required: true },
  category: { type: String, enum: ['learning', 'job-search'], required: true },
  type: { type: String, enum: ['daily', 'custom'], default: 'daily' },
  url: { type: String },
  recurrence: {
    type: { type: String, enum: ['none', 'daily', 'weekly'], default: 'none' },
    days: [{ type: Number }]
  },
  completedDates: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
});

const Task = mongoose.models.Task || mongoose.model('Task', TaskSchema);

const TASKS = [
  { text: 'Naukri Daily Update', url: 'https://www.naukri.com/mnj/v2/home', category: 'job-search', type: 'daily', recurrence: { type: 'weekly', days: [1, 2, 3, 4, 5] } },
  { text: 'LinkedIn Networking', url: 'https://www.linkedin.com/jobs/', category: 'job-search', type: 'daily', recurrence: { type: 'daily', days: [] } },
  { text: 'Internshala Listings', url: 'https://internshala.com/internships', category: 'job-search', type: 'daily', recurrence: { type: 'weekly', days: [1, 2, 3, 4, 5] } },
  { text: 'Telegram Channels Check', category: 'job-search', type: 'daily', recurrence: { type: 'daily', days: [] } },
  { text: 'Naukri Profile Update', url: 'https://www.naukri.com/mnj/v2/home', category: 'job-search', type: 'daily', recurrence: { type: 'daily', days: [] } },
  { text: 'Daily Coding Practice (LeetCode/DS)', category: 'learning', type: 'daily', recurrence: { type: 'daily', days: [] } },
  { text: 'AI/ML Concepts Review', category: 'learning', type: 'daily', recurrence: { type: 'daily', days: [] } }
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to DB');
    
    for (const t of TASKS) {
      const exists = await Task.findOne({ text: t.text });
      if (!exists) {
        await Task.create(t);
        console.log(`Created: ${t.text}`);
      } else {
        console.log(`Exists: ${t.text}`);
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
