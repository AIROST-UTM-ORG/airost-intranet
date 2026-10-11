# Run all server tests:

cd server 
npm test 

# Run unit tests:

cd server
npm run test:unit

# Run integration tests:

cd server 
npm run test:integration

# Run integration tests (specific test case):

cd server
npm run test:integration -- projects.test.js

# Run client tests:

cd client 
npm test

# Git 

1. Undo the latest local git commit (with keep the changes)
git reset --soft HEAD~1