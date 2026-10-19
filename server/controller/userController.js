const User = require('../models/User');
const mongoose = require('mongoose');

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
  updateUser
};
