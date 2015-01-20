/**
 * Recieve a POST from Amazon SNS
 */
exports.index = function(req, res){
    var request = require('request');

    var sns = JSON.parse(req.text);
    console.log(req.text);

    // Is this a subscribe message?
    if (sns.Type == 'SubscriptionConfirmation') {
        request(sns.SubscribeURL, function (err, result, body) {
            if (err || body.match(/Error/)) {
                console.log("Error subscribing to Amazon SNS Topic", body);
                return res.send('Error', 500);
            }

            console.log("Subscribed to Amazon SNS Topic: " + sns.TopicArn);
            res.send('Ok');
        });
    } else if (sns.Type == 'Notification') {
        var message = '';
        var color = 'yellow';
        // only print out these fields from the message
        var field_whitelist = [
            'NewStateReason',
            'Event Message',
            'Event Source',
            'Event ID',
            //'StateChangeTime',
            //'Region',
            'OldStateValue'
        ];
        if (sns.Subject !== undefined) {
            message += '<b>' + sns.Subject + '</b>';
            if (sns.Subject.match(/^OK/)) {
                color = 'green';
            } else if (sns.Subject.match(/^ALARM/)) {
                color = 'red';
            }
        }
        if (sns.Message !== undefined) {
            try {
                var messages = JSON.parse(sns.Message);
                if (typeof(messages) === 'object') {
                    for (var key in messages) {
                        // skip fields that aren't in the whitelist
                        if (field_whitelist.indexOf(key)) === -1) { continue; }
                        var val = messages[key];
                        if (typeof(val) === 'object') { continue; }
                        message += "\n<b>" + key.toString() + ":</b> " + val.toString();
                    }
                } else {
                    message += messages.toString();
                }
            } catch(error) {
                message += sns.Message;
            }
        }
        message = message.replace(/\n/g, '<br>');

        var hipchatUrl = 'https://api.hipchat.com/v1/rooms/message?' +
                    'auth_token=' + process.env.HIPCHAT_API_TOKEN + '&' +
                    'room_id=' + process.env.HIPCHAT_ROOM_ID + '&' +
                    'from=' + process.env.HIPCHAT_FROM_NAME + '&' +
                    'message=' + message + '&' +
                    'notify=1&' +
                    'color=' + color + '&' +
                    'format=json';

        request(hipchatUrl, function (err, result, body) {
            if (err) {
                console.log("Error sending message to HipChat", err, hipChatUrl, body);
                return res.send('Error', 500);
            }

            console.log("Sent message to HipChat", hipchatUrl);

            res.send('Ok');
        });
    }
};
