const mongoose = require('mongoose');
const uri = "mongodb+srv://kelawallamaluwa_db_user:UcXYnZuYyplnuZQb@restaurant-system.fzd5nqy.mongodb.net/restaurant-prod?appName=restaurant-system";
mongoose.connect(uri)
  .then(() => {
    console.log("Connected successfully!");
    process.exit(0);
  })
  .catch(err => {
    console.error("Connection failed:", err.message);
    process.exit(1);
  });
