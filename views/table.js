const sqlite3 = require('sqlite3').verbose();

// Open a connection to the database
const db = new sqlite3.Database('mydatabase.db');

// Insert data into the purchases table
const purchaseName = 'Example Purchase';
const purchasePrice = 20.99;
db.run('INSERT INTO purchases (purchaseName, purchasePrice) VALUES (?, ?)', [purchaseName, purchasePrice], (err) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log('Data inserted successfully.');
    }
});

// Query data from the purchases table
db.all('SELECT * FROM purchases', (err, rows) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log('Query result:');
        rows.forEach((row) => {
            console.log(row);
        });
    }
});

// Close the database connection
db.close();
