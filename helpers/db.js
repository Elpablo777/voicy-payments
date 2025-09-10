// Dependencies
const fs = require('fs')
const readline = require('readline')
const { Voice, Chat, Word, Stats, MessageStats } = require('../models')

/**
 * Searches for chat by it's id
 * @param {Telegram:ChatId} id Id of the chat to search
 */
function findChat(id) {
  return Chat.findOne({ id })
}

function findChats(query) {
  return Chat.find(query)
}

function countChats() {
  return Chat.estimatedDocumentCount();
}

function findVoices(query) {
  return Voice.find(query)
}

function getDuration() {
  return Voice.aggregate([
    {
      $group: {
        _id: null,
        duration: { $sum: '$duration' },
      },
    },
  ]).then(result => {
    return parseInt(result[0]?.duration || '0', 10);
  });
}

async function generateWordCount() {
  const start = new Date();
  
  try {
    console.log('Starting word count generation...');
    
    // Remove existing word count data
    await Word.deleteMany({});
    
    console.log('Fetching voices for word count generation...');
    const voices = await Voice.find({}).lean(); // Use lean() for better performance
    
    const words = {};

    voices.forEach((voice) => {
      if (voice.text && voice.text.length > 3) {
        voice.text
          .toLowerCase()
          .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
          .split(' ')
          .forEach((word) => {
            if (word.length > 3) {
              words[word] = (words[word] || 0) + 1;
            }
          });
      }
    });

    console.log(`Processing ${Object.keys(words).length} unique words...`);
    
    // Use insertMany for better performance instead of individual saves
    const wordDocuments = Object.entries(words).map(([word, count]) => ({
      word: String(word),
      count: count
    }));
    
    // Insert in batches to avoid memory issues
    const batchSize = 1000;
    for (let i = 0; i < wordDocuments.length; i += batchSize) {
      const batch = wordDocuments.slice(i, i + batchSize);
      await Word.insertMany(batch);
    }

    const end = new Date() - start;
    console.log(`Word count generation completed in: ${end}ms`);
    
  } catch (err) {
    console.error(`Word count generation failed: ${err.message}`);
    throw err;
  }
}

function getWordCount() {
  return Word.find({}).sort({ count: -1 }).limit(20)
}

async function getStats() {
  try {
    const stats = await Stats.findOne();
    if (!stats) {
      throw new Error('No stats found in database');
    }
    
    const messageStats = await MessageStats.find();
    const json = JSON.parse(stats.json);
    json.messageStats = messageStats.filter((stat) => stat.count > 50000);
    
    return json;
  } catch (err) {
    console.error('Error getting stats:', err);
    throw err;
  }
}

async function getNewStats() {
  try {
    console.log('Generating new stats...');
    
    // Extra numbers of records that don't exist anymore after the cleanup but still contribute to the stats
    const extraVoiceCount =
      16472966 + 140155 + 10228067 + 24327202 + 23724547 + 48066867;
    const extraDuration =
      185936897 +
      2245600 +
      147045183 +
      344688480 +
      7780507 +
      352478725 +
      297266368;
    
    // Get result dummy variable
    const result = {};
    
    // Get response stats
    if (fs.existsSync(`${__dirname}/../../voicy/updates.log`)) {
      try {
        result.responseTime = await getAvgResponseTime();
      } catch (err) {
        console.warn('Failed to get response time stats:', err.message);
        result.responseTime = null;
      }
    }
    
    // Get chats count
    result.chatCount = await Chat.countDocuments({});
    
    // Get voice count
    result.voiceCount = (await Voice.countDocuments({})) + extraVoiceCount;
    
    // Get hourly stats
    const hourlyStats = (await getHourlyStats()).filter((s) => !!s.count);
    const temp = hourlyStats.map((v) => v._id);
    for (var i = 0; i <= 29; i++) {
      if (!temp.includes(i)) {
        hourlyStats.push({ _id: i, count: 0 });
      }
    }
    hourlyStats.sort((a, b) => a._id - b._id);
    result.hourlyStats = hourlyStats.reverse();
    
    // Get duration
    result.duration = (await getDuration()) + extraDuration;
    
    // Get chat daily stats
    result.chatDailyStats = await getChatDailyStats();
    
    // Overwrite stats
    let stats = await Stats.findOne({});
    if (!stats) {
      const newStats = new Stats({
        json: JSON.stringify(result),
      });
      stats = await newStats.save();
    } else {
      stats.json = JSON.stringify(result);
      stats = await stats.save();
    }
    
    console.log('New stats generated successfully');
    return stats;
    
  } catch (err) {
    console.error('Error generating new stats:', err);
    throw err;
  }
}

async function getHourlyStats() {
  return Voice.aggregate([
    {
      $match: {
        createdAt: {
          $lt: new Date(),
          $gte: new Date(new Date().setDate(new Date().getDate() - 30)),
        },
      },
    },
    {
      $project: {
        _id: '$_id',
        time: {
          $divide: [
            {
              $subtract: [
                { $subtract: [new Date(), '$createdAt'] },
                {
                  $mod: [
                    { $subtract: [new Date(), '$createdAt'] },
                    24 * 60 * 60 * 1000,
                  ],
                },
              ],
            },
            24 * 60 * 60 * 1000,
          ],
        },
      },
    },
    {
      $group: { _id: '$time', count: { $sum: 1 } },
    },
    { $sort: { _id: -1 } },
  ])
}

async function getChatDailyStats() {
  return Chat.aggregate(
    {
      $project: {
        _id: '$_id',
        time: {
          $divide: [
            {
              $subtract: [
                { $subtract: [new Date(), '$createdAt'] },
                {
                  $mod: [
                    { $subtract: [new Date(), '$createdAt'] },
                    24 * 60 * 60 * 1000,
                  ],
                },
              ],
            },
            24 * 60 * 60 * 1000,
          ],
        },
      },
    },
    {
      $group: { _id: '$time', count: { $sum: 1 } },
    },
    { $sort: { _id: -1 } }
  )
}

function getAvg(numbers) {
  if (!Array.isArray(numbers) || numbers.length === 0) {
    return 0;
  }
  
  const validNumbers = numbers
    .map(n => parseFloat(n))
    .filter(n => !isNaN(n));
    
  if (validNumbers.length === 0) {
    return 0;
  }
  
  return validNumbers.reduce((sum, num) => sum + num, 0) / validNumbers.length;
}

function getAvgResponseTime() {
  return new Promise((resolve, reject) => {
    const filePath = `${__dirname}/../../voicy/updates.log`;
    
    if (!fs.existsSync(filePath)) {
      return reject(new Error('Updates log file not found'));
    }

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });
    
    const timeReceivedMap = {};
    let lineCount = 0;
    
    fileStream.on('error', (err) => {
      reject(new Error(`Failed to read log file: ${err.message}`));
    });

    rl.on('line', (line) => {
      if (!line) {
        return;
      }
      
      try {
        lineCount++;
        const parts = line.replace('s', '').split(' — ');
        if (parts.length >= 3) {
          const [timeReceived, _, age] = parts;
          const timeReceivedNum = parseInt(timeReceived, 10);
          const ageNum = parseFloat(age);
          
          if (!isNaN(timeReceivedNum) && !isNaN(ageNum)) {
            if (timeReceivedNum > Date.now() / 1000 - 60 * 60 * 24) {
              // only last 24 hours
              const timeKey = timeReceivedNum - (timeReceivedNum % 60);
              if (timeReceivedMap[timeKey]) {
                timeReceivedMap[timeKey].push(ageNum);
              } else {
                timeReceivedMap[timeKey] = [ageNum];
              }
            }
          }
        }
      } catch (err) {
        console.warn(`Error parsing line ${lineCount}:`, err.message);
      }
    });
    
    rl.on('close', () => {
      try {
        for (const key of Object.keys(timeReceivedMap)) {
          timeReceivedMap[key] = getAvg(timeReceivedMap[key]);
        }
        console.log(`Processed ${lineCount} log lines, found ${Object.keys(timeReceivedMap).length} time buckets`);
        resolve(timeReceivedMap);
      } catch (err) {
        reject(new Error(`Error processing response time data: ${err.message}`));
      }
    });
    
    rl.on('error', (err) => {
      reject(new Error(`Error reading log file: ${err.message}`));
    });
  });
}

/** Exports */
module.exports = {
  findChat,
  getStats,
  generateWordCount,
  findChats,
  findVoices,
  countChats,
  getNewStats,
}
