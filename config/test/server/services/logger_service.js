exports.config = {
	"logger": {
		"level": "warn",
		"exitOnError": true
	},
	"transports": {
		"File1": {
			"name": "File",
			"level": "warn",
			"format": "json",
			"filename": "logs/twyr-web-application.log",
			"maxsize": 10485760,
			"maxFiles": 10,
			"tailable": true,
			"zippedArchive": false
		},
		"Console": {
			"name": "Console",
			"level": "warn",
			"format": [
				"prettyPrint",
				{
					"name": "printf",
					"options": "info.message = (typeof info.message === 'string') ? info.message : JSON.stringify(info.message, null, '\t'); return `${info.timestamp} - ${info.level} - ${info.message}${(info.metadata) ? (' - ' + JSON.stringify(info.metadata, null, '\t')) : ''}`;"
				}
			],
			"stderrLevels": [
				"warn",
				"error"
			]
		}
	}
};
