require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dns = require('node:dns');
const mongoose = require('mongoose');

dns.setServers(['1.1.1.1', '8.8.8.8']);

const tryGetURL = (str) => {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  }
  catch (err) {
    return null;
  }
};

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const addressSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    index: true
  },
  short_url: {
    type: Number,
    required: true,
    default: 1
  }
});
addressSchema.prototype
let Address = mongoose.model('Address', addressSchema);

const getShortUrl = async (shortUrl, done) => {
  const data = await Address.findOne({short_url: shortUrl});
  done(null, data);
};

const addAddress = async (url, done) => {
  let data = {};

  const doc = await Address.findOne({url});
  if (!doc) {
    const numDocs = await Address.countDocuments({});
    data = await (new Address({url, short_url: numDocs + 1})).save();
  }
  else {
    data = doc;
  }

  done(null, data);
};

const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

// Parses the POST body data and transforms it to JSON
app.use(bodyParser.urlencoded({extended: false}));

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

// Your first API endpoint
app.post('/api/shorturl', function(req, res) {
  const url = req.body.url;
  const urlo = tryGetURL(url);
  
  if (urlo !== null) {
    dns.lookup(urlo.host, (err, addr) => {
      if(err) {
        res.json({ error: 'invalid url' });
      }
      else {
        addAddress(url, (err, data) => {
          if (err) console.error(err);
          res.json({original_url: url, short_url: data.short_url});
        });
      }
    });
  }
  else {
    res.json({ error: 'invalid url' });
  }
});

// Your first API endpoint
app.get('/api/shorturl/:surl?', function(req, res) {
  const surl = req.params.surl;
  
  getShortUrl(surl, (err, doc) => {
    if (doc) {
      res.redirect(301, doc.url);
    }
  });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
