const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dns = require('dns');

dns.setServers(['8.8.8.8']);


const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const MONGODB_URI = envFile.match(/MONGODB_URI=(.*)/)?.[1]?.trim();

if (!MONGODB_URI) {
    console.error('MONGODB_URI not found');
    process.exit(1);
}

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

const SITES = [
    { text: 'SimplyHired Daily', url: 'https://www.simplyhired.co.in' },
    { text: 'Jobspresso Remote', url: 'https://jobspresso.co/remote-software-jobs/' },
    { text: 'SkipTheDrive Remote', url: 'https://www.skipthedrive.com' },
    { text: 'NoDesk Remote', url: 'https://nodesk.co/remote-jobs/' },
    { text: 'Wellfound (AngelList)', url: 'https://wellfound.com/' },
    { text: 'Instahyre Search', url: 'https://www.instahyre.com/' },
    { text: 'WorkingNomads Daily', url: 'https://www.workingnomads.com' },
    { text: 'Brian\'s Job Search', url: 'https://briansjobsearch.com/' },
];

async function seed() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to DB');

        const tasks = SITES.map(site => ({
            text: site.text,
            url: site.url,
            category: 'job-search',
            type: 'daily',
            recurrence: {
                type: 'weekly',
                days: [1, 2, 3, 4, 5, 6] // Mon-Sat
            },
            completedDates: []
        }));

        await Task.insertMany(tasks);
        console.log(`Successfully added ${tasks.length} site missions!`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seed();
