const User = require('../models/User');

class UserRepository {
  async findByEmail(email) {
    if (!email || typeof email !== 'string') return null;
    try {
      return await User.findOne({ email: email.toLowerCase() }).select('+password');
    } catch (e) {
      return null;
    }
  }

  async findById(id) {
    return User.findById(id);
  }

  async create(userData) {
    return User.create(userData);
  }
}

module.exports = new UserRepository();
