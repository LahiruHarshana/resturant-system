const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const uri = "mongodb+srv://kelawallamaluwa_db_user:UcXYnZuYyplnuZQb@restaurant-system.fzd5nqy.mongodb.net/restaurant-prod?appName=restaurant-system";

const RoleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  permissions: [{ type: String }],
});
const Role = mongoose.model('Role', RoleSchema, 'roles');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: String,
  passwordHash: String,
  roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
  isActive: Boolean,
  sessionVersion: Number,
  rolesVersion: Number,
  pinEnabled: Boolean,
});
const User = mongoose.model('User', UserSchema, 'users');

mongoose.connect(uri)
  .then(async () => {
    let superAdminRole = await Role.findOne({ name: 'super_admin' });
    if (!superAdminRole) {
      superAdminRole = await Role.create({
        name: 'super_admin',
        description: 'Super Administrator with all permissions',
        permissions: ['*']
      });
      console.log("Created super_admin role.");
    }
    
    let adminUser = await User.findOne({ email: 'admin@example.com' });
    if (!adminUser) {
      const passwordHash = await bcrypt.hash('password1234', 12);
      adminUser = await User.create({
        email: 'admin@example.com',
        name: 'System Admin',
        passwordHash,
        roles: [superAdminRole._id],
        isActive: true,
        sessionVersion: 1,
        rolesVersion: 1,
        pinEnabled: false,
      });
      console.log("Created admin@example.com user.");
    } else {
      console.log("User admin@example.com already exists.");
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
