var config = {
	debug: false,
	database: {
		connectionLimit : 10,
		host: "sp_config_host",
	    user: "sp_config_username",
	    password: "sp_config_password",
	    database: "sp_config_database",
		charset : "utf8mb4"
	},
	cors: {
		origin: '*',
 		optionsSuccessStatus: 200
	}
}

module.exports = config; 