'use strict';
const fs = require('fs');
const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const md5 = require('md5');
const axios = require('axios');
const spintax = require('spintax');
const EventEmitter = require('events')
const { firefox } = require('playwright');
const Signer = require("tiktok-signature");
const config = require("./config.js");
const functions = require("./functions.js");
const app = express();
const server = http.createServer(app);
const con = functions.db_connect();
process.setMaxListeners(0);3
var instance_timeout = {};

app.use(bodyParser.urlencoded({
  	extended: true,
  	limit: '50mb'
}));

const sessions = {};

const Tiktok = {
	app: app,
	server: server,
	cors: cors(config.cors),
	options: {
		qrTimeoutMs: 10000,
		qrRefreshIntervalMs: 10000,
	},
	pupBrowser: null,
	pupPage: null,
	pupContext: null,
	qr: undefined,
	_qrRefreshInterval: undefined,
	events: new EventEmitter(),

	initialize: async function(instance_id, access_token, res, callback, focus_login) {
				if(sessions[instance_id]){
					return callback( sessions[instance_id] );
				}else{
					sessions[instance_id] = {};
					var COOKIE_FILE_PATH = __dirname+'/sessions/'+instance_id+'/cookies.json';
					var SESSION_FILE_PATH = __dirname+'/sessions/'+instance_id+'/sessions.json';
					var cookieData;

					if (fs.existsSync(COOKIE_FILE_PATH)) {
			        	cookieData = require(COOKIE_FILE_PATH);
			      	}

			      	var launchOptions = {
			            headless: true,
			            viewport: { width: 1920, height: 1080 },
			            defaultViewport: null,
			            args: [
			            	"--no-sandbox", 
			            	"--disable-features=site-per-process",
			            	"--disable-setuid-sandbox",
						    "--disable-blink-features",
						    "--disable-blink-features=AutomationControlled",
						    "--disable-infobars",
					    	"--start-maximized",
			            ],
			        };

			        var proxy = await Tiktok.get_proxy(instance_id);
			        if(proxy){
			        	launchOptions.proxy = proxy;
			        }

					const browser = await firefox.launch(launchOptions);
					const context = await browser.newContext();
					const page = await context.newPage();

					sessions[instance_id].pupBrowser = browser;
					sessions[instance_id].pupPage = page;
					sessions[instance_id].pupContext = context;

					sessions[instance_id].pupPage.on("close", () => {
						delete sessions[instance_id];
					});

			      	if (cookieData) {
						const cookiesString = await fs.readFileSync(COOKIE_FILE_PATH);
						const cookies = JSON.parse(cookiesString);
						context.addCookies(cookies);
						//sessions[instance_id].login_status = true;
					}

			      	return callback( sessions[instance_id] );
				}
	},

	qr: async function(instance_id, res, callback) {
		const EL_LOGGED = '[data-e2e="profile-icon"]';
		const EL_BTN_LOGIN = '#header-login-button';
		const EL_QR_IMAGE = '[data-e2e="qr-code"] > canvas';
		const EL_QR_IMAGE_PARENT = '[data-e2e="qr-code"]';
		const EL_QR_IMAGE_PARENT_LOADING = '[data-e2e="qr-code"] > div';
		const EL_LOGIN_MODAL = '#login-modal-title';
		const EL_CLOSE_LOGIN_MODAL = '[data-e2e="modal-close-inner-button"]';
		const EL_BTN_LOGIN_QR = '#login-modal-title + div > div';
		const EL_DATA_USER = '#__UNIVERSAL_DATA_FOR_REHYDRATION__';

		await sessions[instance_id].pupPage.goto('https://www.tiktok.com/?lang=en').catch( async (e) => {
			Tiktok.close_session(instance_id);
			await res.json({ status: 'error', message: "Unable to establish a connection with TikTok. If you're using a proxy, please verify your proxy settings, as this issue may be related to your proxy configuration." });
		});
    
        if (sessions[instance_id] == undefined) {
    		Tiktok.close_session(instance_id);
    		await res.json({ status: 'error', message: 'Instance ID does not exist.' });
        }else{
    		try{
    			// Check if session restore was successfull 
    			await sessions[instance_id].pupPage.waitForSelector(EL_BTN_LOGIN, {timeout: 10000}).then( async () => {
					clearTimeout(instance_timeout[instance_id]);
						instance_timeout[instance_id] = setTimeout(function(){ 
    					Tiktok.close_session(instance_id);
	 				}, 300000);

	 				const getQrCode = async () => {
	                	await sessions[instance_id].pupPage.$(EL_CLOSE_LOGIN_MODAL, {timeout: 10000}).then( async (btn) => {
                			await btn.click().catch(e => {});
	                	}).catch(e => {});
	                	
	                	await sessions[instance_id].pupPage.waitForSelector(EL_BTN_LOGIN, {timeout: 3000}).catch(e => {});
						const btnLogin = await sessions[instance_id].pupPage.$(EL_BTN_LOGIN).catch(e => {});
						await btnLogin.click().catch(e => {});

		                // Wait for QR Code
		                await sessions[instance_id].pupPage.waitForSelector(EL_LOGIN_MODAL, {timeout: 3000}).catch(e => {});

		                const login_popup = await sessions[instance_id].pupPage.$(EL_LOGIN_MODAL, {timeout: 3000}).then( async () => {
		                	/*await sessions[instance_id].pupPage.locator(':has-text("Use QR code")').click({ strict: false }).catch(e => { });*/

            				const box = await sessions[instance_id].pupPage.locator('#login-modal').boundingBox();
							await sessions[instance_id].pupPage.mouse.click(box.x + box.width / 2, 200).catch(e => {});
		                }).catch( async (e) => {
		                	/*
	                		await sessions[instance_id].pupPage.waitForSelector(EL_BTN_LOGIN).catch(e => {});
							const btnLogin = await sessions[instance_id].pupPage.$(EL_BTN_LOGIN).catch(e => {});
							await btnLogin.click().catch(e => {});
			
							await sessions[instance_id].pupPage.waitForSelector(EL_LOGIN_MODAL).catch(e => {});
							await sessions[instance_id].pupPage.locator(':has-text("Use QR code")').click({ strict: false }).catch(e => {});
							//await btnQRCode.click().catch(e => {});*/

							await sessions[instance_id].pupPage.waitForSelector(EL_BTN_LOGIN).catch(e => {});
							const btnLogin = await sessions[instance_id].pupPage.$(EL_BTN_LOGIN).catch(e => {});
							await btnLogin.click().catch(e => {});

							await sessions[instance_id].pupPage.waitForSelector(EL_LOGIN_MODAL).catch(e => {});

							const box = await sessions[instance_id].pupPage.locator('#login-modal').boundingBox();
							await sessions[instance_id].pupPage.mouse.click(box.x + box.width / 2, 200).catch(e => {});
		                });

						await sessions[instance_id].pupPage.waitForSelector(EL_QR_IMAGE, {timeout: 5000}).then( async () => {
							const qrcode = await sessions[instance_id].pupPage.evaluate(() => {
								const container = document.querySelector('[data-e2e="qr-code"]');
								const matches = container.querySelectorAll("canvas");
				    			var canvas = matches[0].toDataURL("image/png");
				    			return canvas;
							});
							
							await sessions[instance_id].pupPage.waitForTimeout(40000);

		                	await  res.json({ status: 'success', message: 'Success', qrcode: qrcode });
						}).catch( async (e) => {
							await  res.json({ status: 'error', message: 'The QR code cannot be retrieved at this moment. Please try again at a later time' });
						});
        			};

		            getQrCode();

		            //Wait and process add Tiktok account
		            await sessions[instance_id].pupPage.waitForSelector(EL_LOGGED, { timeout: 0 }).then( async () => {
						let jsData = await sessions[instance_id].pupPage.evaluate(el => el.innerText, await sessions[instance_id].pupPage.$(EL_DATA_USER))
						jsData = JSON.parse(jsData);
						let info = jsData.__DEFAULT_SCOPE__['webapp.app-context'].user;
						//console.log(info);

						Tiktok.set_coookies(instance_id);

					    var session_item = await Tiktok.db_query("SELECT * FROM sp_tiktok_sessions WHERE instance_id = '"+instance_id+"'");
					    //console.log(session_item);
				        if(session_item){
				        	var account_item = await Tiktok.db_query("SELECT * FROM sp_accounts WHERE token = '"+instance_id+"'");
							if(account_item){
				            	Tiktok.add_account(account_item, instance_id, info, session_item.team_id, false);
							}else{
								var account_item = await Tiktok.db_query("SELECT * FROM sp_accounts WHERE pid = '"+info.uid+"' AND team_id = '"+session_item.team_id+"'");
								if(account_item){
									Tiktok.add_account(account_item, instance_id, info, session_item.team_id, true);
								}else{
									Tiktok.add_account(false, instance_id, info, session_item.team_id, false);
								}
							}

							//sessions[instance_id].login_status = true;
							Tiktok.close_session(instance_id);
						}
		    		}).catch(e => {
		    		    
		    		    console.log(e);
		    		    
		    		});

				}).catch( async (e) => {
					await sessions[instance_id].pupPage.waitForSelector(EL_LOGGED, {timeout: 10000}).then( async () => {
						clearTimeout(instance_timeout[instance_id]);
						instance_timeout[instance_id] = setTimeout(function(){ 
				    		Tiktok.close_session(instance_id);
					 	}, 3000);
		        		//sessions[instance_id].login_status = true;

        				await Tiktok.db_query("UPDATE sp_tiktok_sessions SET status = 1 WHERE instance_id = '"+instance_id+"'");

        				/*var SESSION_PATH = session_dir + instance_id;
						if (fs.existsSync(SESSION_PATH)) {
			                rimraf.sync(SESSION_PATH);
			            }*/

						await res.json({ status: 'error', message: 'You have successfully logged in using this instance ID.' });
					}).catch( async (e) => {
						Tiktok.close_session(instance_id);
						await res.json({ status: 'error', message: 'The QR code cannot be retrieved at this moment. Please try again at a later time' });
					});
				});
        	}catch(e){
        		Tiktok.close_session(instance_id);
        		await res.json({ status: 'error', message: 'The QR code cannot be retrieved at this moment. Please try again at a later time' });
        	}
      	}

	},

	post: async function(instance_id, data, res, callback){
		const EL_BOX_UPLOAD = '.upload';
		const EL_BTN_SELECT_FILE = '.file-select-button';
		const EL_ERROR_SHOW = '.tiktok-toast-notice-content > div > span';
		const EL_CAPTION = '.public-DraftStyleDefault-block';
		const EL_CHECK_UPLOAD_COMPLETE = '.change-video-btn';
		const EL_BUTTON_PUBLISH_ONE = '.btn-post';
		const EL_BUTTON_PUBLISH_TWO = '.modal-btn';
		const EL_DATA_USER = '#SIGI_STATE';

		try{
			await sessions[instance_id].pupPage.goto('https://www.tiktok.com/creator#/upload?scene=creator_center').catch(e => {});
            await sessions[instance_id].pupPage.waitForTimeout(5000);
			const PAGE = await sessions[instance_id].pupPage;
			//const PAGE = await PAGE.frames().find(f => f.url().includes('creator'));
            //console.log(UPLOAD_IFRAME);

			await PAGE.waitForSelector(EL_BOX_UPLOAD, {timeout: 15000}).then( async () => {
				//Accept GDPR Cookies
            	await PAGE.getByRole('button', { name: 'Accept all' }).click({ timeout: 3500 }).catch(e => {});
            	
				//Upload Video
				const fileChooserPromise = PAGE.waitForEvent('filechooser').catch(e => {});
				await PAGE.locator(EL_BTN_SELECT_FILE).click();
				const fileChooser = await fileChooserPromise;
				await fileChooser.setFiles(data.video_url);

				//Add Caption

				await PAGE.waitForSelector(EL_CAPTION).catch(e => {});
				const caption = await PAGE.$(EL_CAPTION).catch(e => {});
				await caption.click();
				await caption.fill( spintax.unspin(data.caption) );

				//Error
				await sessions[instance_id].pupPage.waitForTimeout(3500);
				const error_alert = await PAGE.$$eval(EL_ERROR_SHOW, paragraphs => paragraphs.map(p => p.innerText.trim()))
				if(error_alert.length > 0){
					await res.json({ status: 'error', message: error_alert[0] });
					Tiktok.close_session(instance_id);
				}else{
					await PAGE.waitForSelector(EL_CHECK_UPLOAD_COMPLETE).then( async () => {
						const PUBLISHED_ONE = await PAGE.$$(EL_BUTTON_PUBLISH_ONE);
						if (PUBLISHED_ONE.length > 0) {
						    await PAGE.click(EL_BUTTON_PUBLISH_ONE, { force: true });
						}
				
						const ele = PAGE.getByText('Manage your posts');
						await ele.waitFor({state: "visible"});

						var default_link = 'https://www.tiktok.com/';
						var account_item = await Tiktok.db_query("SELECT * FROM sp_accounts WHERE token = '"+instance_id+"'");
						if(account_item){
							await PAGE.goto('https://www.tiktok.com/@'+account_item.username+'?lang=en').catch(e => {});
							try{
								let jsData = await PAGE.evaluate(el => el.innerText, await PAGE.$(EL_DATA_USER))
								jsData = JSON.parse(jsData);
								let item = jsData.ItemModule;
								item = item[ Object.keys(item)[0] ];
								let link = 'https://www.tiktok.com/@'+item.nickname+'/video/'+item.id
								await res.json({ status: 'success', message: 'Published', link: link, id: item.id });
								Tiktok.close_session(instance_id);
							}catch(e){
								res.json({ status: 'success', message: 'Published', link: default_link, id: '' });
								Tiktok.close_session(instance_id);
							};
						}else{
							res.json({ status: 'success', message: 'Published', link: default_link, id: '' });
							Tiktok.close_session(instance_id);
						}
	                   
					} ).catch(e => {
						console.log(45444, e);
						res.json({ status: 'error', message: "Unknown error!!" });
						Tiktok.close_session(instance_id);
					});
				}
            	
			}).catch( async (e) => {
				console.log(45, e);
				await PAGE.screenshot({ path: 'screenshot1.png', fullPage: true });
			    res.json({ status: 'error', message: "Unknown error!!!" });
			    Tiktok.close_session(instance_id);
			});
		}catch(e){
			console.log(e);
			await res.json({ status: 'error', message: "Your session may be expired. Please try to re-login again to continue." });
			Tiktok.close_session(instance_id);
        }
	},

	set_coookies: async function(instance_id){

		try{
			if(sessions[instance_id] != undefined){
				var DATA_PATH = __dirname + '/sessions/' + instance_id + '/';

				if (!fs.existsSync( DATA_PATH )){
				    fs.mkdirSync( DATA_PATH );
				}

				var COOKIE_FILE_PATH = DATA_PATH + 'cookies.json';
				var SESSION_FILE_PATH = DATA_PATH + 'sessions.json';

				const cookies = await sessions[instance_id].pupContext.cookies();
				fs.writeFile(COOKIE_FILE_PATH, JSON.stringify(cookies), function (err) {});


				// Get session tokens
		        const localStorage = JSON.parse(await sessions[instance_id].pupPage.evaluate(() => {
		            return JSON.stringify(window.localStorage);
		        }));

		        fs.writeFile(SESSION_FILE_PATH, JSON.stringify({ 'f': localStorage.f }), function (err) {});
		    }
		}catch(e){}
	},

	close_session: async function(instance_id){
		if(sessions[instance_id] != undefined && sessions[instance_id].pupBrowser != undefined){
			sessions[instance_id].pupBrowser.close();
			delete sessions[instance_id];
		}
	},

	get_proxy: async function(instance_id){
		var session_item = await Tiktok.db_query("SELECT * FROM sp_tiktok_sessions WHERE instance_id = '"+instance_id+"'");
        if(!session_item) return false;
        if(session_item.proxy == "") return false;

		var proxy_item = await Tiktok.db_query("SELECT * FROM sp_proxies WHERE id = '"+session_item.proxy+"'");
		if(!proxy_item) return false;

    	var proxy = proxy_item.proxy;
	    var proxy_arr = proxy.split("@");

	    if( proxy_arr.length == 2 ){
	        var server = proxy_arr[1];
	        var auth = proxy_arr[0].split(":");
	        var username = auth[0];
	        var password = auth[1];

	        return {
	            server: server,
	            username: username,
	            password: password
	        }
	    }else{
	        var server = proxy_arr[0];
	        return {
	            server: server
	        }
	    }
	},

	add_account: async function(account, instance_id, info, team_id, delete_old_session){
        var time_now = Math.floor(new Date().getTime() / 1000);
        var update_session  = { data: JSON.stringify(info), status: 1 };
        var query_update_session = "UPDATE sp_tiktok_sessions SET ? WHERE instance_id = '"+instance_id+"'";
        con.query(query_update_session, update_session, function (err, result) {});

		if(!account){
			con.connect(function(err) {
				var post  = {
					ids: md5( functions.now() ),
					module: 'tiktok_profiles',
					social_network: 'tiktok',
					category: 'profile',
					login_type: 2,
					can_post: 1,
					team_id: team_id,
					pid: info.uid,
					name: info.nickName,
					username: info.uid,
					token: instance_id,
					avatar: info.avatarUri[0],
					url: 'https://www.tiktok.com/@' + info.uid,
					data: JSON.stringify(info),
					status: 1,
					changed: time_now, 
					created: time_now
				};
                var sql = "INSERT INTO sp_accounts SET ?";
                con.query(sql, post, function (err, result) {
                    console.log(err);
                });
            });
		}else{
			con.connect(function(err) {
				var post  = {
					pid: info.uid,
					name: info.nickName,
					username: info.uid,
					token: instance_id,
					avatar: info.avatarUri[0],
					data: JSON.stringify(info),
					status: 1,
					changed: time_now
				};
                var sql_update_account = "UPDATE sp_accounts SET ? WHERE id = '"+account.id+"'";
	            
	            if(delete_old_session){
	                var sql = "DELETE sp_tiktok_sessions WHERE instance_id = '"+account.token+"'";
	                con.query(sql, function (err, result) {});
	            }

	            var sql = "DELETE sp_tiktok_sessions WHERE instance_id != '"+account.token+"' AND status = 0";
	            con.query(sql, function (err, result) {});
	            con.query(sql_update_account, post, function (err, result) {});
            });
		}
	},

	db_query: async function(query, row){
		var res = await new Promise( async (resolve, reject)=>{
	        con.query( query, (err, res)=>{
	            return resolve(res, true);
	        });
	    });

		return Tiktok.response(res, row);
	},

	response: async function(res, row){
		if(res != undefined && res.length > 0){
			if(row || row == undefined){
				return res[0];
			}else{
				return res;
			}
			
		} 
		return false;
	},
}

module.exports = Tiktok; 