const express = require('express');
const { engine } = require('express-handlebars');
const port = 1024;
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
   const errorMessage = request.session.errorMessage;
   const successMessage = request.session.successMessage;
  request.session.errorMessage = null;
  request.session.successMessage = null; 

  response.render('Login.handlebars',  { errorMessage: errorMessage , successMessage: successMessage});
});

app.get('/login', (request, response) => {
  const errorMessage = request.session.errorMessage;
  request.session.errorMessage = null;

  response.render('login',  { errorMessage: errorMessage });
});

  


app.get('/Home', (req, res) => {
  const userId = req.session.userId;
  const successMessage = req.session.successMessage;
  const errorMessage = req.session.error;
  req.session.errorMessage= null;
  
  req.session.successMessage = null; 

  if (!userId) {
    res.redirect('/');
    return;
  }

  db.get('SELECT email, userName, Balance FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      console.error(err.message);
      res.status(500).send('An error occurred while fetching user data.');
    } else if (user) {
      res.render('Home.handlebars', { user ,  successMessage :successMessage,errorMessage :errorMessage });
    } else {
      res.status(404).send('User not found.');
    }
  });
});




  app.get('/About', (req, res) => {
    res.render('About.handlebars');
  });
  app.get('/Contact', (req, res) => {
    res.render('Contact.handlebars');
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
  
        
            if (user.isAdmin) {
              req.session.successMessage = 'Admin login successful';
              res.redirect('/admin');
            } else {
              req.session.successMessage = 'User login successful';
              res.redirect('/Home');
            }
          } else {
            req.session.errorMessage = 'Wrong password, please try again';
            console.log('Invalid password for user:', user);
            res.redirect('/login');
          }
        });
      } else {
        console.log('User not found for email:', email);
        req.session.errorMessage = 'Invalid email or password.';
        res.redirect('/login');
      }
    });
  });
  
  
  
  
  app.post('/signup', (req, res) => {
    const { email, username, password, confirmPassword } = req.body;
  
    if (password !== confirmPassword) {
      req.session.errorMessage = 'passwords do not match';
      res.redirect('/login');
      
      return;
    }
  
    bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
      if (err) {
        console.error('Error hashing password:', err.message);
        res.status(500).send('An error occurred while signing up.');
        return;
      }
  
      db.get('SELECT * FROM users WHERE email = ?', [email], (err, foundUser) => {
        if (err) {
          console.error('Error checking for existing user:', err.message);
          res.status(500).send('An error occurred.');
        } else if (foundUser) {
          console.log('User with this email already exists:', email);
          req.session.errorMessage = 'Email already exists. Please log in.';
          res.redirect('/login'); 
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
                  req.session.successMessage = 'Sign up successful! Welcome to the application please login ';
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

app.get('/Budget', (req, res) => {
  const userId = req.session.userId;
  const successMessage = req.session.successMessage;
  req.session.successMessage = null; 

  if (!userId) {
    res.redirect('/');
    return;
  }

  const numberPerPage = 3; 
  const page = req.query.page ? parseInt(req.query.page) : 1;

  if (page < 1) {
    res.redirect('/Budget');
    return;
  }

  const offset = (page - 1) * numberPerPage;

  db.get('SELECT COUNT(*) AS budgetCount FROM budget WHERE userId = ?', [userId], (err, result) => {
    if (err) {
      console.error(err.message);
      res.status(500).send('An error occurred while fetching budget count.');
    } else {
      const budgetCount = result.budgetCount;
      const lastPage = Math.ceil(budgetCount / numberPerPage);

      
      if (lastPage > 0 && page > lastPage) {
       
        const redirectToPageatleastone = Math.max(1, lastPage);
        res.redirect(`/Budget?page=${redirectToPageatleastone}`);
        return;
      }

      // const showPrevious = page > 1;
      // const showNext = page < lastPage;
      const previousPage = page > 1 ? page - 1 : null;
      const nextPage = page < lastPage ? page + 1 : null;

      db.all('SELECT * FROM budget WHERE userId = ? LIMIT ? OFFSET ?', [userId, numberPerPage, offset], (err, budgets) => {
        if (err) {
          console.error(err.message);
          res.status(500).send('An error occurred while fetching budgets.');
        } else {
          res.render('Budget.handlebars', {
            budgets,
            userId,
            currentPage: page,
            lastPage,
            showPrevious: previousPage !== null,
            showNext: nextPage !== null,
            previousPage,
            nextPage,
            successMessage,
          });
        }
      });
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
                    req.session.successMessage = "item added successfully!"
                    res.redirect('/Budget'); 
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
            req.session.successMessage = 'item deleted successfully! ';
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
        req.session.successMessage = 'item updeted successfully!';
          res.redirect('/Budget');
      }
  });
});


app.get('/Category', (req, res) => {
  const userId = req.session.userId;
  const successMessage = req.session.successMessage;

  if (!userId) {
    res.redirect('/');
    return;
  }

  const numberPerPage = 3; 
  const page = req.query.page ? parseInt(req.query.page) : 1;

  if (page < 1) {
    res.redirect('/Category');
    return;
  }

  const offset = (page - 1) * numberPerPage;

 
  db.get('SELECT COUNT(*) AS categoryCount FROM Categories WHERE userId = ?', [userId], (err, result) => {
    if (err) {
      console.error(err.message);
      res.status(500).send('An error occurred while fetching category count.');
    } else {
      const categoryCount = result.categoryCount;
      const lastPage = Math.ceil(categoryCount / numberPerPage);

      
   
      if (lastPage > 0 && page > lastPage) {
       
        const redirectToPageatleastone = Math.max(1, lastPage);
        res.redirect(`/Category?page=${redirectToPageatleastone}`);
        return;
      }

      // const showPrevious = page > 1;
      // const showNext = page < lastPage;
      const previousPage = page > 1 ? page - 1 : null;
      const nextPage = page < lastPage ? page + 1 : null;

     
      db.all('SELECT * FROM Categories WHERE userId = ? LIMIT ? OFFSET ?', [userId, numberPerPage, offset], (err, categories) => {
        if (err) {
          console.error(err.message);
          res.status(500).send('An error occurred while fetching categories.');
        } else {
          res.render('Category.handlebars', {
            Categories: categories,
            userId,
            currentPage: page,
            lastPage,
            showPrevious: previousPage !== null,
            showNext: nextPage !== null,
            previousPage,
            nextPage,
            successMessage: successMessage,
          });
        }
      });
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
          req.session.successMessage = 'item added successfully!';
         
          res.redirect('/Category');
        }
      });
    } 
  });
});

app.post('/editCategory/:id', (req, res) => {
  const categoryId = req.params.id;
  const editedCategoryName = req.body.editedCategoryName;
  req.session.successMessage="this is edited category";
  db.run('UPDATE Categories SET CategoryName = ? WHERE id = ?', [editedCategoryName, categoryId], (err) => {
      if (err) {
          console.error(err.message);
          res.status(500).send('An error occurred.');
      } else {
        req.session.successMessage = 'item updated successfully!';
          res.redirect('/Category');
      }
  });
});
app.post("/admin/edit/category/{{category.id}}", (req, res) => {
  const categoryId = req.params.id;
  const editedCategoryName = req.body.editedCategoryName;
  req.session.successMessage="this is edited category";
  db.run('UPDATE Categories SET CategoryName = ? WHERE id = ?', [editedCategoryName, categoryId], (err) => {
      if (err) {
          console.error(err.message);
          res.status(500).send('An error occurred.');
      } else {
        req.session.successMessage = 'item updated successfully!';
          res.redirect('/admin');
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
        req.session.successMessage = 'item deleted successfully!';
          res.redirect('/Category');
      }
  });
});


app.post('/admin/edit/budget/{{budget.id}}', (req, res) => {
  console.log("Budget update")
  const budgetId = req.params.id;
  const editedBudgetName = req.body.editedBudgetName;
  const editedAmount = req.body.editedAmount;

  db.run('UPDATE budget SET budgetName = ?, amount = ? WHERE id = ?', [editedBudgetName, editedAmount, budgetId], (err) => {
      if (err) {
          console.error(err.message);
          res.status(500).send('An error occurred.');
      } else {
        req.session.successMessage = 'item updeted successfully!';
          res.redirect('/admint');
      }
  });
});



app.get('/Purchase', (req, res) => {
  const userId = req.session.userId;
  const errorMessage = req.session.errorMessage;
  const successMessage = req.session.successMessage;
  req.session.successMessage= null;
  req.session.errorMessage = null;

  if (!userId) {
    res.redirect('/');
    return;
  }

  
  const MyBudgets = new Promise((resolve, reject) => {
    db.all('SELECT * FROM budget WHERE userId = ?', [userId], (err, budgetRows) => {
      if (err) {
        reject(err);
      } else {
        resolve(budgetRows);
      }
    });
  });

  const MyCategories = new Promise((resolve, reject) => {
    db.all('SELECT * FROM categories WHERE userId = ?', [userId], (err, categoryRows) => {
      if (err) {
        reject(err);
      } else {
        resolve(categoryRows);
      }
    });
  });

  
  const MyPurchases = new Promise((resolve, reject) => {
    db.all('SELECT * FROM purchases WHERE userId = ?', [userId], (err, rows) => {
      
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    
    });
  });

  Promise.all([MyBudgets, MyCategories, MyPurchases])
    .then(([budgetRows, categoryRows, purchaseRows]) => {
      res.render('Purchase.handlebars', {
        budgets: budgetRows,
        categories: categoryRows,
        Purchases: purchaseRows,
        errorMessage: errorMessage,
        successMessage : successMessage
      });
    })
    .catch((err) => {
      console.error(err.message);
      res.status(500).send('An error occurred while fetching data.');
    });
});


app.post('/AddPurchase', (req, res) => {
  const { PurchaseName, price, budget, category, purchaseDate } = req.body;
  const userId = req.session.userId;

  if (!userId) {
    res.redirect('/');
    return;
  }


  db.get('SELECT balance FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      console.error(err.message);
      res.status(500).send('An error occurred while fetching user data.');
      return;
    }

    if (!user) {
      res.status(404).send('User not found.');
      return;
    }

    const currentBalance = user.balance || 0;
    const purchaseAmount = parseFloat(price);

    if (currentBalance < purchaseAmount) {
      
      req.session.errorMessage = 'You do not have enough money for this purchase.';
      res.redirect('/Purchase');
    } else {
     
      const newBalance = currentBalance - purchaseAmount;

      db.run('INSERT INTO purchases (PurchaseName, price, budgetId, categoryId, purchaseDate, userId) VALUES (?, ?, ?, ?, ?, ?)', [PurchaseName, price, budget, category, purchaseDate, userId], (err) => {
        if (err) {
          console.error(err.message);
          res.status(500).send('An error occurred while inserting the purchase.');
          return;
        }

        
        db.run('UPDATE users SET balance = ? WHERE id = ?', [newBalance, userId], (updateErr) => {
          if (updateErr) {
            console.error(updateErr.message);
            res.status(500).send('Error updating balance.');
          } else {
            req.session.successMessage = 'item added succsessfully!';
            res.redirect('/Purchase');
          }
        });
      });
    }
  });
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
     
      console.log('the Current Password:', currentPassword);
      console.log(' Password:', user.password);

    
      bcrypt.compare(currentPassword, user.password, (bcryptErr, result) => {
        if (bcryptErr) {
          console.error('Error comparing passwords:', bcryptErr.message);
          res.status(500).send('An error occurred.');
        } else {
          console.log('Password Compare Result:', result);

         
          if (result) {
            if (newPassword === confirmnewPassword) {
              
              bcrypt.hash(newPassword, saltRounds, (errhash, hashedPassword) => {
                if (errhash) {
                  console.error('Error hashing new password:', errhash.message);
                  res.status(500).send('An error occurred.');
                } else {
                  
                  db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId], (updateErr) => {
                    if (updateErr) {
                      console.error('Error updating password:', updateErr.message);
                      res.status(500).send('An error occurred.');
                    } else {
                      req.session.successMessage = 'password changed succsessfully!';
                      res.redirect('/Home');
                    }
                  });
                }
              });
            } else {
             req.session.errorMessage ='New password and confirmation do not match.';
              res.redirect('/Home');
            }
          } else {
            req.session.errorMessage = 'wrong password try again';
            res.redirect('/Home');
          }
        }
      });
    }
  });
});
app.get('/deleteaccount', (req, res) => {
  res.render('deleteaccount');
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


app.post('/addBalance', (req, res) => {
  const amountToAdd = parseInt(req.body.amount); 
  
  if (isNaN(amountToAdd) || amountToAdd <= 0) {
    res.status(400).send('Invalid amount');
    return;
  }

  const userId = req.session.userId;

  if (!userId) {
    res.status(401).send('Unauthorized');
    return;
  }
  console.log('User ID:', userId);
  
  db.get('SELECT balance FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      console.error(err.message);
      res.status(500).send('An error occurred while fetching user data.');
    } else if (user) {
      console.log('User Data:', user);
      const currentBalance = user.balance || 0;
      const newBalance = currentBalance + amountToAdd;

      db.run('UPDATE users SET Balance = ? WHERE id = ?', [newBalance, userId], (updateErr) => {
        if (updateErr) {
          console.error(updateErr.message);
          res.status(500).send('Error updating balance.');
        } else {
          req.session.successMessage = 'your balance are updated';
          res.redirect('/Home');
        }
      });
    } else {
      res.status(404).send('User not found.');
    }
  });
});



app.get('/footer', (req, res) => {
  res.render('footer.handlebars');
});

app.get('/admin', (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    res.redirect('/');
    return;
  }

  db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      console.error(err.message);
      res.status(500).send('An error occurred while fetching user data.');
    } else if (user) {
      if (user.isAdmin) {
      
        db.all('SELECT * FROM users', (err, users) => {
          if (err) {
            console.error(err.message);
            res.status(500).send('An error occurred while fetching user data.');
          } else {
            res.render('admin.handlebars', { user, users });
          }
        });
      } else {
        res.redirect('/Home');
      }
    } else {
      res.status(404).send('User not found.');
    }
  });
});



app.post('/admin/delete/user', (req, res) => {
  const userIdToDelete = req.body.userId;

  db.run('DELETE FROM users WHERE id = ?', userIdToDelete, (err) => {
    if (err) {
      console.error(err.message);
      res.status(500).send('An error occurred while deleting the user account.');
    } else {
    
      req.session.successMessage = 'User account deleted successfully!';
      res.redirect('/admin');
    }
  });
});

app.post('/admin/edit/user', (req, res) => {
  const { userId, email, username, isAdmin } = req.body;

  db.run('UPDATE users SET email = ?, username = ?, isAdmin = ? WHERE id = ?', [email, username, isAdmin, userId], (err) => {
    if (err) {
      console.error(err.message);
      res.status(500).send('An error occurred while updating user data.');
    } else {
   
      req.session.successMessage = 'User information updated successfully!';
      res.redirect('/admin');
    }
  });
});
app.get('/admin/logout', (req, res) => {
  
  req.session.destroy((err) => {
      if (err) {
          console.error('Error destroying session:', err.message);
          res.status(500).send('An error occurred while logging out.');
      } else {
        
          res.redirect('/');
      }
  });
});


app.use((req, res) => {
  res.status(404).render('404.handlebars');
});

app.listen(port, () => {
  console.log(`Server running and listening on port ${port}...`);
});

