const mongoose = require('mongoose');
const uri = "mongodb+srv://kelawallamaluwa_db_user:UcXYnZuYyplnuZQb@restaurant-system.fzd5nqy.mongodb.net/restaurant-prod?appName=restaurant-system";

const userSchema = new mongoose.Schema({ email: String });
const User = mongoose.model('User', userSchema, 'users');

mongoose.connect(uri)
  .then(async () => {
    const count = await User.countDocuments();
    console.log("Number of users:", count);
    const users = await User.find().select('email -_id');
    console.log("Users:", users);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
