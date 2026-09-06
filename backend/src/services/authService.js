const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');

class AuthService {
  generateToken(user) {
    const secret = process.env.JWT_SECRET || 'dev_secret_key_orphan_cleanup_2026_super_secure';
    return jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      },
      secret,
      { expiresIn: '24h' }
    );
  }

  async login(email, password) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw { status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' };
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw { status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' };
    }

    const token = this.generateToken(user);
    return { user, token };
  }
}

module.exports = new AuthService();
