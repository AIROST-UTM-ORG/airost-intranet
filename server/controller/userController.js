const User = require('../models/User');
const VerifiedUser = require('../models/VerifiedUser');
const mongoose = require('mongoose');

// Get user
const getUsers = async (req, res) => {
    var verifiedUsers = await VerifiedUser.find();

    var loggedInUsers = await User.find();

    let allUsers = [];

    for (let loggedInUser of loggedInUsers){
        let verified = false;

        if (verifiedUsers.find(verUser => verUser.email == loggedInUser.email)){
            verified = true;
        }
        allUsers.push({
            email: loggedInUser.email,
            name: loggedInUser.name,
            photo: loggedInUser.photo,
            position: loggedInUser.position,
            course: loggedInUser.course,
            year: loggedInUser.year,
            description: loggedInUser.description,
            instagram: loggedInUser.instagram,
            loggedIn: true,
            verified: verified
        })
    }

    for (let verUser of verifiedUsers){
        if (allUsers.find(user => user.email == verUser.email)) continue;
        allUsers.push(
            {
                email: verUser.email,
                name: verUser.name,
                photo: '',
                position: verUser.position,
                loggedIn: false,
                verified: true,
            }
        )
    }
    res.json(allUsers)
}

//update a User
const updateUser = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'No such User' });
  }

  const user = await User.findByIdAndUpdate(
    { _id: id },
    { ...req.body },
    { new: true }
  );

  if (!user) {
    return res.status(404).json({ error: 'Not found' });
  }

  res.status(200).json(user);
};

module.exports = {
  updateUser,
  getUsers
};
