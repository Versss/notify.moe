'use strict'

let aero = require('aero')
let arn = require('./lib')
let fs = require('fs')
let path = require('path')
let bodyParser = require('body-parser')
let request = require('request-promise')

// Start the server
aero.run()

aero.use(function(request, response, next) {
	let start = new Date()
	next()
	let end = new Date()

	if(request.user && request.user.nick)
		console.log(request.url, '|', end - start, 'ms', '|', request.user.nick)
	else
		console.log(request.url, '|', end - start, 'ms')
})

// Rewrite URLs
aero.preRoute(function(request, response) {
	if(request.headers.host.indexOf('animereleasenotifier.com') !== -1) {
        response.redirect('https://notify.moe' + request.url)
        return true
    }

	if(request.url.startsWith('/+'))
		request.url = '/user/' + request.url.substring(2)
	else if(request.url.startsWith('/_/+'))
		request.url = '/_/user/' + request.url.substring(4)
})

// For POST requests
aero.use(bodyParser.json())

// Web app manifest
aero.get('manifest.json', (request, response) => {
	response.json({
		name: 'Anime Notifier',
		short_name: 'Anime Notifier',
		icons: [{
			src: 'images/characters/arn-waifu.png',
			sizes: '300x300',
			type: 'image/png'
		}],
		start_url: '/',
		display: 'standalone',
		gcm_sender_id: '941298467524'
	})
})

let serveFile = fileName => {
	return (request, response) => {
		let filePath = path.join(__dirname, fileName)
		let stat = fs.statSync(filePath)

		response.writeHead(200, {
			'Content-Type': 'application/javascript',
			'Content-Length': stat.size
		})

		fs.createReadStream(filePath).pipe(response)
	}
}

aero.get('service-worker.js', serveFile('worker/service-worker.js'))
aero.get('cache-polyfill.js', serveFile('worker/cache-polyfill.js'))

// Send slack messages
arn.on('new user', function(user) {
	// Ignore my own attempts on empty databases
	if(user.email === 'e.urbach@gmail.com')
		return

	let host = 'https://notify.moe'
	let webhook = 'https://hooks.slack.com/services/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'

	request.post({
		url: webhook,
		body: JSON.stringify({
			text: `<${host}/users|${user.firstName} ${user.lastName} (${user.email})>`
		})
	}).then(body => {
		console.log(`Sent slack message about the new user registration: ${user.email}`)
	}).catch(error => {
		console.error('Error sending slack message:', error, error.stack)
	})
})

arn.on('new forum reply', function(link, userName) {
	let webhook = 'https://hooks.slack.com/services/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'

	request.post({
		url: webhook,
		body: JSON.stringify({
			text: `<${link}|${userName}>`
		})
	}).then(body => {
		console.log(`Sent slack message about a new forum reply from ${userName}`)
	}).catch(error => {
		console.error('Error sending slack message:', error, error.stack)
	})
})

// Load all modules
fs.readdirSync('modules').forEach(mod => require('./modules/' + mod)(aero))