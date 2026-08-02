const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }
    
    if (!user.isActive) {
      return res.status(403).json({ message: 'Tu cuenta ha sido suspendida. Por favor, contacta a soporte.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.systemRole, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.systemRole,
        canManageUsers: user.canManageUsers,
        canEditUsers: user.canEditUsers,
        canDeleteUsers: user.canDeleteUsers,
        isActive: user.isActive,
        createdAt: user.createdAt
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

module.exports = {
  login,
};
