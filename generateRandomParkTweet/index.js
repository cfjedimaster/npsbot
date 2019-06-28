const fetch = require('node-fetch');
const Twit = require('twit')


const T = new Twit({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token: process.env.TWITTER_ACCESS_TOKEN,
    access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    timeout_ms: 60 * 1000,  // optional HTTP request timeout to apply to all requests.
    strictSSL: true,     // optional - requires SSL certificates to be valid.
});

const states = {
    "AL": "Alabama",
    "AK": "Alaska",
    "AZ": "Arizona",
    "AR": "Arkansas",
    "CA": "California",
    "CO": "Colorado",
    "CT": "Connecticut",
    "DE": "Delaware",
    "FL": "Florida",
    "GA": "Georgia",
    "HI": "Hawaii",
    "ID": "Idaho",
    "IL": "Illinois",
    "IN": "Indiana",
    "IA": "Iowa",
    "KS": "Kansas",
    "KY": "Kentucky",
    "LA": "Louisiana",
    "ME": "Maine",
    "MD": "Maryland",
    "MA": "Massachusetts",
    "MI": "Michigan",
    "MN": "Minnesota",
    "MS": "Mississippi",
    "MO": "Missouri",
    "MT": "Montana",
    "NE": "Nebraska",
    "NV": "Nevada",
    "NH": "New Hampshire",
    "NJ": "New Jersey",
    "NM": "New Mexico",
    "NY": "New York",
    "NC": "North Carolina",
    "ND": "North Dakota",
    "OH": "Ohio",
    "OK": "Oklahoma",
    "OR": "Oregon",
    "PA": "Pennsylvania",
    "RI": "Rhode Island",
    "SC": "South Carolina",
    "SD": "South Dakota",
    "TN": "Tennessee",
    "TX": "Texas",
    "UT": "Utah",
    "VT": "Vermont",
    "VA": "Virginia",
    "WA": "Washington",
    "WV": "West Virginia",
    "WI": "Wisconsin",
    "WY": "Wyoming"
}

const NPS_KEY = process.env.NPS_KEY;

// Credit: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min; 
}

module.exports = async function (context, req) {

    let stateAbbrs = Object.keys(states);
    let chosenState = stateAbbrs[getRandomIntInclusive(0, stateAbbrs.length)];

    context.log(`I chose ${chosenState}`);

    let httpResult = await fetch(`https://developer.nps.gov/api/v1/parks?stateCode=${chosenState}&limit=100&fields=images&api_key=${NPS_KEY}`);
    let results = await httpResult.json();
    data = results.data.filter(r => r.images.length);

    // now select a random park
    let selectedPark = data[getRandomIntInclusive(0, data.length - 1)];
    // now select a random image
    let selectedImage = selectedPark.images[getRandomIntInclusive(0, selectedPark.images.length - 1)];

    context.log(JSON.stringify(selectedPark));

    let imageRequest = await fetch(selectedImage.url, { headers: { 'user-agent': 'Chrome' } });
    let image = await imageRequest.buffer();
    image = image.toString('base64');

    let mediaResult = await new Promise((resolve, reject) => {

        T.post('media/upload', { media_data: image }, (err, data, response) => {
            if(err) {
                console.log(err);
                reject(err);
            }
            resolve(data.media_id_string);
        });

    });
    
    context.log('mediaResult', mediaResult);
    let text = `Picture from ${selectedPark.fullName}. More information at ${selectedPark.url}`;

    let params = { status: text, media_ids: [mediaResult] }

    let tweetResult = await new Promise((resolve, reject) => {
        T.post('statuses/update', params, function (err, data, response) {
            resolve(data);
        })
    });

    context.res = {
        body: `Tweet ID: ${tweetResult.id}`
    };
    context.done();

};