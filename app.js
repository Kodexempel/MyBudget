const express = require('express');
const { engine } = require('express-handlebars');
const port = 1010;
const app = express();
const session = require('express-session');
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('My_database.db');

app.use(session({
    secret: 'Omer-ammo',
    resave: false,
    saveUninitialized: false
  }));


app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');
app.use(express.static('public'));




app.get('/', (request, response) => {
    response.render('Login.handlebars');
  });
  
  app.post('/login', (req, res) => {
    const { email, password } = req.body;
  
    db.get('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], (err, user) => {
      if (err) {
        console.error(err.message);
        res.status(500).send('An error occurred.');
      } else if (user) {
       
        req.session.userId = user.id;
        res.redirect('/Budget'); 
      } else {
        res.render('login', { error: 'Invalid email or password.' });
      }
    });
  });
  
  app.post('/signup', (req, res) => {
    const { email, password } = req.body;

    db.get('SELECT * FROM users WHERE email = ?', [email], (err, existingUser) => {
        if (err) {
            console.error(err.message);
            res.status(500).send('An error occurred.');
        } else if (existingUser) {
            res.render('login', { error: 'Email already exists. Please log in.' });
        } else {
            db.run('INSERT INTO users (email, password) VALUES (?, ?)', [email, password], (err) => {
                if (err) {
                    console.error(err.message);
                    res.status(500).send('An error occurred while signing up.'); 
                } else {
                    res.redirect('/Budget');
                }
            });
        }
    });
});



app.get('/Budget', (request, response) => {
    const userId = request.session.userId; 
  
    if (!userId) {
      
      response.status(401).send('Unauthorized');
      return;
    }
  
    db.all('SELECT * FROM budget WHERE userId = ?', [userId], (err, rows) => {
      if (err) {
        console.error(err.message);
        response.status(500).send('An error occurred.');
      } else {
        response.render('Budget.handlebars', { budgets: rows });
      }
    });
  });
  
  app.post('/AddBudget', (req, res) => {
    const { budgetName, amount } = req.body;
    const userId = req.session.userId; 
  
    if (!userId) {
      res.status(401).send('Unauthorized');
      return;
    }
  
    db.run('INSERT INTO budget (budgetName, amount, userId) VALUES (?, ?, ?)', [budgetName, amount, userId], (err) => {
      if (err) {
        console.error(err.message);
        res.status(500).send('An error occurred.');
      } else {
        db.all('SELECT * FROM budget WHERE userId = ?', [userId], (err, rows) => {
          if (err) {
            console.error(err.message);
            res.status(500).send('An error occurred.');
          } else {
            res.render('Budget.handlebars', { budgets: rows });
          }
        });
      }
    });
  });
  
  
  app.delete('/Budget/:id', (req, res) => {
    const budgetId = req.params.id;

    db.run('DELETE FROM budget WHERE id = ?', budgetId, (err) => {
        if (err) {
            console.error(err.message);
            res.status(500).send('An error occurred.');
        } else {
            res.redirect('/Budget'); 
        }
    });
});

app.put('/Budget/:id', (req, res) => {
    const budgetId = req.params.id;
    const { editedBudgetName, editedAmount } = req.body;

    db.run('UPDATE budget SET budgetName = ?, amount = ? WHERE id = ?', [editedBudgetName, editedAmount, budgetId], (err) => {
        if (err) {
            console.error(err.message);
            res.status(500).send('An error occurred.');
        } else {
            res.redirect('/Budget');
        }
    });
});

  
  
app.use((req, res) => {
  res.status(404).render('404.handlebars');
});

app.listen(port, () => {
  console.log(`Server running and listening on port ${port}...`);
});


