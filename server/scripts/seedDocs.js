const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
require('dotenv').config();
const Doc = require('../models/docModel');

const docsData = [
  {
    image: 'https://img.freepik.com/free-photo/businesswoman-using-tablet-analysis-graph-company-finance-strategy-statistics-success-concept-planning-future-office-room_74952-1410.jpg?w=1060&t=st=1691826668~exp=1691827268~hmac=074b7b0f3383929795864d840cef6b6da5448db5da13581f9baa3d4e626b4c6c',
    title: 'Machine Learning Engineer Primer',
    profile: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    author: 'Sze Yuan',
    date: 'May 7,2022',
    type: 'AI Resources',
    description: 'Machine Learning Engineer is the most sought-after job now. Beyond the hype of being a Data Scientist, most companies require Machine Learning Engineer position to implement, execute and deliver machine learning solutions. This time we invite Dr Poo Kuan Hoong to conduct a machine learning technology workshop with the topic of "Machine Learning...',
    content: 'Machine Learning Engineer is the most sought-after job now. Beyond the hype of being a Data Scientist, most companies require Machine Learning Engineer position to implement, execute and deliver machine learning solutions. This time we invite Dr Poo Kuan Hoong to conduct a machine learning technology workshop with the topic of "Machine Learning Engineer Primer" on Saturday, 7th May 2022 from 8pm to 9pm (MYT).'
  },
  {
    image: 'https://assets-global.website-files.com/6046919f8276b876330735e2/6368fa5c46a4dc0a4cd05666_Top%20resources%20to%20level%20up%20your%20Flutter%20development%20skills.png',
    title: 'Writing a scalable Flutter application',
    profile: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    author: 'Sze Yuan',
    date: 'Apr 23 ,2022',
    type: 'Web & Apps',
    description: 'We are honored to invite Miss Chong Yong Shean to conduct a Flutter workshop and share her experience about "Writing a scalable Flutter application". Flutter is an open-source UI software development kit created by Google. It is used to develop cross platform applications for Android, iOS, Linux, macOS, Windows etc...',
    content: 'We are honored to invite Miss Chong Yong Shean to conduct a Flutter workshop and share her experience about "Writing a scalable Flutter application". Flutter is an open-source UI software development kit created by Google. It is used to develop cross platform applications for Android, iOS, Linux, macOS, Windows etc...'
  },
  {
    image: 'https://d1m75rqqgidzqn.cloudfront.net/wp-data/2019/09/11134058/What-is-data-science-2.jpg',
    title: 'Data Science Workshop that gets you a job after graduation',
    profile: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    author: 'Sze Yuan',
    date: 'Apr 30, 2022',
    type: 'AI Resources',
    description: 'Machine Learning Engineer is the most sought-after job now. Beyond the hype of being a Data Scientist, most companies require Machine Learning Engineer position to implement, execute and deliver machine learning solutions. This time we invite Dr Poo Kuan Hoong to conduct a machine learning technology workshop with the topic of "Machine Learning...',
    content: 'Machine Learning Engineer is the most sought-after job now. Beyond the hype of being a Data Scientist, most companies require Machine Learning Engineer position to implement, execute and deliver machine learning solutions.'
  },
  {
    image: 'https://www.globalsign.com/application/files/7416/3763/0034/General_Banner_WhatisIOT_4_APAC_2021_11_22.jpg',
    title: 'Internet of Things and Solidworks workshop',
    profile: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    author: 'Sze Yuan',
    date: 'Apr 16, 2022',
    type: 'IOT Resources',
    description: 'Machine Learning Engineer is the most sought-after job now. Beyond the hype of being a Data Scientist, most companies require Machine Learning Engineer position to implement, execute and deliver machine learning solutions. This time we invite Dr Poo Kuan Hoong to conduct a machine learning technology workshop with the topic of "Machine Learning...',
    content: 'Machine Learning Engineer is the most sought-after job now. Beyond the hype of being a Data Scientist, most companies require Machine Learning Engineer position to implement, execute and deliver machine learning solutions.'
  }
];

const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

mongoose.connect(uri)
  .then(async () => {
    const count = await Doc.countDocuments();
    if (count === 0) {
      await Doc.insertMany(docsData);
      console.log('Seeded 4 documentation articles successfully');
    } else {
      console.log('Docs already exist, count:', count);
    }
    process.exit(0);
  })
  .catch(err => {
    console.error('Seed error:', err);
    process.exit(1);
  });
