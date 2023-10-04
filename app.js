const express = require('express');
const { engine } = require('express-handlebars');
const port = 1010;
const app = express();
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt'); 
const saltRounds = 10; 
app.use(bodyParser.urlencoded({ extended: true }));
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('My_database.db');

app.use(session({
    secret: 'Omer-ammo',
    resave: false,
    saveUninitialized: false,
  }));
app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');
app.use(express.static('public'));




app.get('/', (request, response) => {
    response.render('Login.handlebars');
  });
  // app.get('/login', (request, response) => {
  //   response.render('login');
  // });
//   app.get('/signup', (request, response) => {
//     response.render('signup');
// });
app.get('/Home', (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
      res.redirect('/');
      return;
    }
  
    
    db.get('SELECT email, userName FROM users WHERE id = ?', [userId], (err, user) => {
      if (err) {
        console.error(err.message);
        
        res.status(500).send('An error occurred while fetching user data.');
      } else if (user) {
        
        res.render('Home.handlebars', { user });
      } else {
       
        res.status(404).send('User not found.');
      }
    });
  });
  
  app.post('/login', (req, res) => {
    const { email, password } = req.body;
  
    console.log('Received login request for email:', email);
  
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
      if (err) {
        console.error(err.message);
        res.status(500).send('An error occurred.');
      } else if (user) {
        console.log('User found:', user);
  
       
        bcrypt.compare(password, user.password, (bcryptErr, result) => {
          if (bcryptErr) {
            console.error('Error comparing passwords:', bcryptErr.message);
            res.status(500).send('An error occurred.');
          } else if (result) {
            console.log('Login successful for user:', user);
            req.session.userId = user.id;
            // req.session.successMessage = 'Login successful! Welcome to the application.';
            res.redirect('/Home');
          } else {
            console.log('Invalid password for user:', user);
            res.render('login', { error: 'Invalid email or password.' });
          }
        });
      } else {
        console.log('User not found for email:', email);
        res.render('login', { error: 'Invalid email or password.' });
      }
    });
  });
  
  
  
  

app.post('/signup', (req, res) => {
  const { email, username, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    res.render('login', { error: 'Passwords do not match.' });
    return;
  }

  bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
    if (err) {
      console.error('Error hashing password:', err.message);
      res.status(500).send('An error occurred while signing up.');
      return;
    }

    db.get('SELECT * FROM users WHERE email = ?', [email], (err, existingUser) => {
      if (err) {
        console.error('Error checking for existing user:', err.message);
        res.status(500).send('An error occurred.');
      } else if (existingUser) {
        console.log('User with this email already exists:', email);
        res.render('signup.handlebars', { error: 'Email already exists. Please log in.' });
      } else {
        db.run('INSERT INTO users (email, username, password) VALUES (?, ?, ?)', [email, username, hashedPassword], (err) => {
          if (err) {
            console.error('Error inserting new user:', err.message);
            res.status(500).send('An error occurred while signing up.');
          } else {
            console.log('User signed up successfully:', email);

            
            db.get('SELECT id FROM users WHERE email = ?', [email], (err, user) => {
              if (err) {
                console.error('Error retrieving user ID:', err.message);
                res.status(500).send('An error occurred.');
              } else if (user) {
                req.session.userId = user.id;
                req.session.successMessage = 'Sign up successful! Wellcome to the application';
                res.redirect('/Home');
              }
            });
          }
        });
      }
    });
  });
});


app.get('/logout', (req, res) => {
  
  req.session.destroy((err) => {
      if (err) {
          console.error('Error destroying session:', err.message);
          res.status(500).send('An error occurred while logging out.');
      } else {
        
          res.redirect('/');
      }
  });
});

app.get('/Budget', (request, response) => {
    const userId = request.session.userId; 
    db.all('SELECT * FROM budget WHERE userId = ?', [userId], (err, rows) => {
      if (err) {
        console.error(err.message);
        response.status(500).send('An error occurred.');
      } else {
        response.render('Budget.handlebars', { budgets: rows, userId });
      }
    });
  });
  
  app.post('/AddBudget', (req, res) => {
    const { budgetName, amount, budgetDate } = req.body; 
    const userId = req.session.userId;

    db.run('INSERT INTO budget (budgetName, amount, budgetDate, userId) VALUES (?, ?, ?, ?)', [budgetName, amount, budgetDate, userId], (err) => {
        if (err) {
            console.error(err.message);
            res.status(500).send('An error occurred.');
        } else {
            db.all('SELECT * FROM budget WHERE userId = ?', [userId], (err, rows) => {
                if (err) {
                    console.error(err.message);
                    res.status(500).send('An error occurred.');
                } else {
                  req.session.successMessage = 'Your saving added successfully!';
                    res.render('Budget.handlebars', { budgets: rows });
                }
            });
        }
    });
});

 
  app.post('/Budget/:id/delete', (req, res) => {
    console.log("ROUTE DELETE...")
    const budgetId = req.params.id;

    db.run('DELETE FROM budget WHERE id=?', budgetId, (err) => {
        if (err) {
            console.error(err.message);
            res.status(500).send('An error occurred.');
        } else {
            console.log('Deleted budget with ID:', budgetId); 
            res.redirect('/Budget');
        }
    });
});
app.post('/editBudget/:id', (req, res) => {
  console.log("Budget update")
  const budgetId = req.params.id;
  const editedBudgetName = req.body.editedBudgetName;
  const editedAmount = req.body.editedAmount;

  db.run('UPDATE budget SET budgetName = ?, amount = ? WHERE id = ?', [editedBudgetName, editedAmount, budgetId], (err) => {
      if (err) {
          console.error(err.message);
          res.status(500).send('An error occurred.');
      } else {
          res.redirect('/Budget');
      }
  });
});


app.get('/Category', (req, res) => {
  const userId = req.session.userId;
  db.all('SELECT * FROM Categories WHERE userId = ?', [userId], (err, rows) => {
    if (err) {
      console.error(err.message);
      res.status(500).send('An error occurred.');
    } else {
      res.render('Category.handlebars', { Categories: rows, userId });
    }
  });
});


app.post('/AddCategory', (req, res) => {
  const { CategoryName } = req.body;
  const userId = req.session.userId;

  db.run('INSERT INTO Categories (CategoryName, userId) VALUES (?, ?)', [CategoryName, userId], (err) => {
    if (err) {
      console.error(err.message);
      res.status(500).send('An error occurred.');
    } else {
      db.all('SELECT * FROM Categories WHERE userId = ?', [userId], (err, rows) => {
        if (err) {
          console.error(err.message);
          res.status(500).send('An error occurred.');
        } else {
          req.session.successMessage = 'Item added successfully!';
          res.render('Category.handlebars', { Categories: rows, successMessage: req.session.successMessage});
        }
      });
    } 
  });
});

app.post('/editCategory/:id', (req, res) => {
  const categoryId = req.params.id;
  const editedCategoryName = req.body.editedCategoryName;

  db.run('UPDATE Categories SET CategoryName = ? WHERE id = ?', [editedCategoryName, categoryId], (err) => {
      if (err) {
          console.error(err.message);
          res.status(500).send('An error occurred.');
      } else {
          res.redirect('/Category');
      }
  });
});
app.post('/Category/:id/delete', (req, res) => {
  const categoryId = req.params.id;

  db.run('DELETE FROM Categories WHERE id = ?', categoryId, (err) => {
      if (err) {
          console.error(err.message);
          res.status(500).send('An error occurred.');
      } else {
        
          res.redirect('/Category');
      }
  });
});



app.get('/Purchase', (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    res.redirect('/');
    return;
  }

  db.all('SELECT * FROM purchases', (err, rows) => {
    if (err) {
      console.error(err.message);
      res.status(500).send('An error occurred while fetching purchases.');
      return;
    }

    db.all('SELECT * FROM budget', (err, budgetRows) => {
      if (err) {
        console.error(err.message);
        res.status(500).send('An error occurred while fetching budgets.');
        return;
      }

      db.all('SELECT * FROM categories', (err, categoryRows) => {
        if (err) {
          console.error(err.message);
          res.status(500).send('An error occurred while fetching categories.');
          return;
        }

        res.render('Purchase.handlebars', { budgets: budgetRows, categories: categoryRows });
      });
    });
  });
});


app.post('/AddPurchase', (req, res) => {
  const { PurchaseName, price, budget, category, purchaseDate } = req.body;
  const userId = req.session.userId;

  if (!userId) {
    res.redirect('/');
    return;
  }

  db.run(
    'INSERT INTO purchases (PurchaseName, price, budgetId, categoryId, purchaseDate, userId) VALUES (?, ?, ?, ?, ?, ?)',
    [PurchaseName, price, budget, category, purchaseDate, userId],
    (err) => {
      if (err) {
        console.error(err.message);
        res.status(500).send('An error occurred while inserting the purchase.');
      } else {
       
        db.all('SELECT * FROM purchases WHERE userId = ?', [userId], (err, rows) => {
          if (err) {
            console.error(err.message);
            res.status(500).send('An error occurred while fetching purchases.');
          } else {
            req.session.successMessage = 'Item added successfully!';
            res.render('Purchase.handlebars', { Purchases: rows });
          }
        });
      }
    }
  );
});


app.get('/changePassword', (req, res) => {
  res.render('changePassword.handlebars');
});

app.post('/changePassword', (req, res) => {
  const userId = req.session.userId;
  const { currentPassword, newPassword, confirmnewPassword } = req.body;

 
  db.get('SELECT password FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      console.error(err.message);
      res.status(500).send('An error occurred.');
    } else if (!user) {
      res.redirect('/');
    } else {
     
      console.log('Input Current Password:', currentPassword);
      console.log('Stored Password:', user.password);

    
      bcrypt.compare(currentPassword, user.password, (bcryptErr, result) => {
        if (bcryptErr) {
          console.error('Error comparing passwords:', bcryptErr.message);
          res.status(500).send('An error occurred.');
        } else {
          console.log('Password Comparison Result:', result);

         
          if (result) {
            if (newPassword === confirmnewPassword) {
              
              bcrypt.hash(newPassword, saltRounds, (hashErr, hashedPassword) => {
                if (hashErr) {
                  console.error('Error hashing new password:', hashErr.message);
                  res.status(500).send('An error occurred.');
                } else {
                  
                  db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId], (updateErr) => {
                    if (updateErr) {
                      console.error('Error updating password:', updateErr.message);
                      res.status(500).send('An error occurred.');
                    } else {
                      res.redirect('/Home');
                    }
                  });
                }
              });
            } else {
              res.render('changePassword.handlebars', { error: 'New password and confirmation do not match.' });
            }
          } else {
            res.render('changePassword.handlebars', { error: 'Current password is incorrect.' });
          }
        }
      });
    }
  });
});
app.get('/Deleteaccount', (req, res) => {
  res.render('Deleteaccount.handlebars');
});

app.get('/deleteAccount', (req, res) => {
  res.render('deleteAccount');
});

app.post('/deleteAccount', (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
      res.redirect('/');
      return;
  }

  db.run('DELETE FROM users WHERE id = ?', [userId], (err) => {
      if (err) {
          console.error('Error deleting user:', err.message);
          res.status(500).send('An error occurred while deleting the account.');
      } else {
          
          req.session.destroy((sessionErr) => {
              if (sessionErr) {
                  console.error('Error destroying session:', sessionErr.message);
              }

             
              res.redirect('/'); 
          });
      }
  });
});

app.get('/footer', (req, res) => {
  res.render('footer.handlebars');
});

app.use((req, res) => {
  res.status(404).render('404.handlebars');
});

app.listen(port, () => {
  console.log(`Server running and listening on port ${port}...`);
});

