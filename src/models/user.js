import { Sequelize } from 'sequelize';
import { sequelize } from '../../common/startup/db.psql.js';

const defineUserModel = () => {
  
  if (!sequelize) {
    throw new Error('Sequelize instance is not initialized');
  }

  return sequelize.define('user', {
    username: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: {
          args: [3, 30],
          msg: "Username must be between 3 and 30 characters long."
        }
      }
    },
    email: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: {
          msg: "Must be a valid email address."
        },
        notEmpty: true
      }
    },
    password: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: {
          args: [8, 100],
          msg: "Password must be at least 8 characters long."
        }
      }
    },
    role: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
      defaultValue: 'user',
      validate: {
        isIn: {
          args: [['user', 'admin']],
          msg: "Role must be either 'user' or 'admin'."
        }
      }
    },
  }, {
    timestamps: true,
  });
};

export default defineUserModel;