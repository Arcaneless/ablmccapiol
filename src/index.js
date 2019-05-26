import ablmccapi from './ablmccapi'
var express = require('express')
const app = express()
const ABLMCCAPI = new ablmccapi()
const port = 3000

app.get('/', (req, res) => res.send('Hello World :)'))

app.get('/news', (req, res) => {
	ABLMCCAPI.getNormalNews(json => res.send(json))
})

app.get('/notices', (req, res) => {
	console.log(req.query.year);
	ABLMCCAPI.getNotices(req.query.year !== undefined ? req.query.year : 0, json => res.send(json))
})

app.get('/homework', (req, res) => {
	ABLMCCAPI.getHomework(req.query.class !== undefined ? req.query.class: '1A', json => res.send(json))
})

app.get('/contactinfo', (req, res) => {
	ABLMCCAPI.getContactInfo(json => res.send(json))
})

app.listen(port, () => console.log('Example App Built'))
