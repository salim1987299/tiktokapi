const Tiktok = require("./tiktok.js");

Tiktok.app.get('/get_qrcode', Tiktok.cors, async (req, res) => {

    var access_token = req.query.access_token;
    var instance_id = req.query.instance_id;

    await Tiktok.initialize(instance_id, access_token, res, function(session){

        Tiktok.qr(instance_id, res, function(qr){
            if(qr){
                res.json({ status: 'success', message: 'Get QR successed', data: qr });
            }else{
                res.json({ status: 'error', message: 'Cannot get QR Code' });
            }
        });

    });

});

Tiktok.app.get('/post', Tiktok.cors, async (req, res) => {
    var access_token = req.query.access_token;
    var instance_id = req.query.instance_id;
    var caption = "Hello there";
    var video_url = __dirname+'/video.mp4';

    await Tiktok.initialize(instance_id, access_token, res, function(session){

        var data = {
            video_url: video_url,
            caption: caption,
        };

        Tiktok.post(instance_id, data, res, function(qr){
            res.json({ status: 'success', message: 'Get QR successed', data: qr  });
        });

    });
});


Tiktok.app.post('/post', Tiktok.cors, async (req, res) => {
    var access_token = req.query.access_token;
    var instance_id = req.query.instance_id;
    var caption = req.body.caption;
    var video_url = req.body.video_url;

    await Tiktok.initialize(instance_id, access_token, res, function(session){

        var data = {
            video_url: video_url,
            caption: caption,
        };

        Tiktok.post(instance_id, data, res, function(qr){
            res.json({ status: 'success', message: 'Get QR successed', data: qr  });
        });

    });
});

Tiktok.server.listen(8008, () => {
    console.log("Server is live now");
});
