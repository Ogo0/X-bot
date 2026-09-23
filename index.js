const http = require('http');
const { TwitterApi } = require('twitter-api-v2');

const twitterClient = new TwitterApi({
  appKey: process.env.TWITTERAPIKEY,
  appSecret: process.env.TWITTERAPISECRET,
  accessToken: process.env.TWITTERACCESSTOKEN,
  accessSecret: process.env.TWITTERACCESSSECRET,
});

const rwClient = twitterClient.readWrite;

let lastSeenId = null;

async function getBotReply(userPrompt) {
  const response = await fetch('https://llm.bankr.bot', {
    method: 'POST',
    headers: {
      'Authorization': Bearer ${process.env.BANKRLLMKEY},
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4.6',
      messages: [
        {
          role: 'system',
          content: 'you are a witty crypto agent. reply concisely in lowercase with sharp improv banter. no emojis, no fluff.',
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    }),
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'gn';
}

async function checkMentions() {
  try {
    const me = await rwClient.v2.me();
    const mentions = await rwClient.v2.userMentionTimeline(me.data.id, {
      since_id: lastSeenId || undefined,
      max_results: 10,
    });

    if (mentions.data?.data) {
      for (const tweet of mentions.data.data) {
        lastSeenId = tweet.id;
        const text = tweet.text.replace(/@\w+/g, '').trim();
        const replyText = await getBotReply(text);

        await rwClient.v2.reply(replyText, tweet.id);
        console.log(replied to tweet ${tweet.id});
      }
    }
  } catch (err) {
    console.error('checkMentions error:', err.message);
  }
}

setInterval(checkMentions, 60000);

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('x-bot is alive');
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(server listening on port ${port});
});
